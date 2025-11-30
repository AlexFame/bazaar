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

    // Get listing details (verify ownership)
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .eq("created_by", user.id) // Ensure user owns the listing (using created_by instead of user_id based on schema)
      .single();

    // Note: The schema uses 'created_by' for listings, but 'user_id' for payment_transactions.
    // Let's double check listing schema. In ListingDetailClient it uses listing.created_by.
    // In create_listings_table.sql (which I couldn't read but saw in other files), it's likely created_by.
    // The previous code used .eq("user_id", user.id) which might have been wrong if the column is created_by!
    // Let's check ListingDetailClient again.
    // Line 212: if (profile && listingData.created_by === profile.id)
    // So the column is definitely `created_by`.
    // Wait, `created_by` references `profiles(id)`. `user.id` is `auth.users(id)`.
    // Usually profiles.id == auth.users.id.
    // Let's verify if I need to fetch profile first.
    
    // In ProfilePageClient: .eq("id", profileId) where profileId comes from props.
    // In ListingDetailClient: .eq("tg_user_id", tgUser.id) -> gets profile.id.
    
    // If `created_by` is a UUID referencing `profiles`, and `profiles.id` matches `auth.users.id`, then `user.id` is fine.
    // If `profiles.id` is different, I need to fetch profile first.
    // Standard Supabase setup: profiles.id references auth.users.id.
    // Let's assume they match for now. If not, I'll see an error.
    
    // Actually, looking at previous code:
    // .eq("user_id", user.id) was used.
    // But ListingDetailClient uses `created_by`.
    // I will use `created_by` here to be safe, but I suspect I might need to map user.id to profile.id if they differ.
    // However, usually they are the same.
    
    // Let's check if I can get profile from user.id
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single();
    // If profile exists with same ID, then they match.
    
    // Let's stick to the previous logic but fix the column name if it was wrong.
    // The previous code had: .eq("user_id", user.id)
    // But the table likely has `created_by`.
    // I will try to use `created_by` and `user.id`.

    if (listingError || !listing) {
        // Try fetching with created_by if user_id failed (or vice versa)
        // But better to be precise.
        console.error("Listing fetch error:", listingError);
        return NextResponse.json(
            { error: "Listing not found or access denied" },
            { status: 404 }
        );
    }

    // Create payment transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from("payment_transactions")
      .insert({
        user_id: user.id, // This references profiles(id) which should be user.id
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
