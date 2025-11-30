import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const BOT_TOKEN = process.env.TG_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

export async function POST(request) {
  try {
    const { serviceId, listingId } = await request.json();

    // Create authenticated Supabase client
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
        return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get service details
    const { data: service, error: serviceError } = await supabase
      .from("premium_services")
      .select("*")
      .eq("id", serviceId)
      .eq("is_active", true)
      .single();

    if (serviceError || !service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    // Get listing details
    // First, fetch the listing to see if it exists
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      console.error("Listing fetch error:", listingError);
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    // We check if created_by matches user.id OR if there's a profile linked to user.id that matches
    let isOwner = listing.created_by === user.id;

    if (!isOwner) {
        // Try to fetch profile to see if ID differs (e.g. if profiles table uses different IDs)
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id) // Assuming 1:1 mapping on ID
            .single();
        
        if (profile && listing.created_by === profile.id) {
            isOwner = true;
        } else {
             // Fallback: check by tg_user_id if available in user_metadata
             // This handles cases where profiles are linked via Telegram ID
             const tgUserId = user.user_metadata?.tg_user_id || user.user_metadata?.sub; // 'sub' is sometimes used for TG ID in some auth providers
             if (tgUserId) {
                 const { data: profileByTg } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('tg_user_id', tgUserId)
                    .single();
                 
                 if (profileByTg && listing.created_by === profileByTg.id) {
                     isOwner = true;
                 }
             }
        }
    }

    if (!isOwner) {
        console.error("Ownership mismatch:", { 
            listingCreator: listing.created_by, 
            userId: user.id 
        });
        return NextResponse.json(
            { error: "Access denied: You are not the owner of this listing" },
            { status: 403 }
        );
    }

    // Create payment transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from("payment_transactions")
      .insert({
        user_id: user.id, 
        listing_id: listingId,
        service_id: serviceId,
        amount_stars: service.price_stars,
        status: "pending",
        invoice_payload: JSON.stringify({
          serviceId,
          listingId,
          userId: user.id,
        }),
      })
      .select()
      .single();

    if (transactionError) {
      console.error("Transaction creation error:", transactionError);
      return NextResponse.json(
        { error: "Failed to create transaction", details: transactionError },
        { status: 500 }
      );
    }

    // Create invoice link via Telegram Bot API
    const invoiceData = {
      title: service.name_ru,
      description: service.description_ru || `Продвижение объявления "${listing.title}"`,
      payload: JSON.stringify({
        transactionId: transaction.id,
        listingId,
        serviceId,
      }),
      provider_token: "", // Empty for Telegram Stars
      currency: "XTR", // Telegram Stars
      prices: [
        {
          label: service.name_ru,
          amount: service.price_stars,
        },
      ],
    };

    const response = await fetch(`${TELEGRAM_API}/createInvoiceLink`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invoiceData),
    });

    const result = await response.json();

    if (!result.ok) {
      console.error("Telegram API error:", result);
      return NextResponse.json(
        { error: "Failed to create invoice", details: result },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      invoiceLink: result.result,
      transactionId: transaction.id,
    });
  } catch (error) {
    console.error("Create invoice error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
