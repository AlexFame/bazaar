import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const BOT_TOKEN = process.env.TG_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Helper to validate Telegram initData
function validateTelegramWebAppData(initData) {
  if (!initData) return null;
  if (!BOT_TOKEN) return null;

  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get("hash");
    urlParams.delete("hash");

    const params = [];
    for (const [key, value] of urlParams.entries()) {
      params.push(`${key}=${value}`);
    }
    params.sort();

    const dataCheckString = params.join("\n");
    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(BOT_TOKEN)
      .digest();
    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    if (calculatedHash === hash) {
      const userStr = urlParams.get("user");
      if (userStr) {
        return JSON.parse(userStr);
      }
    }
  } catch (e) {
    console.error("Telegram validation error:", e);
  }
  return null;
}

export async function POST(request) {
  try {
    const { serviceId, listingId, initData } = await request.json();

    // Create authenticated Supabase client
    const authHeader = request.headers.get('Authorization');
    
    // We allow missing auth header if initData is present and valid
    // But we still need a supabase client. If no auth header, use anon client.
    
    const supabaseOptions = authHeader ? {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    } : {};

    const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseOptions);

    // Get authenticated user (Supabase Auth)
    let user = null;
    if (authHeader) {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (!authError && authUser) {
            user = authUser;
        }
    }

    // Validate Telegram initData
    const tgUser = validateTelegramWebAppData(initData);
    
    if (!user && !tgUser) {
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
    let isOwner = false;
    let finalUserId = user?.id; // This will be used for the transaction record

    // 1. Check via Supabase Auth
    if (user && listing.created_by === user.id) {
        isOwner = true;
    }

    // 2. Check via Profile linked to Supabase Auth
    if (!isOwner && user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single();
        
        if (profile && listing.created_by === profile.id) {
            isOwner = true;
        }
    }

    // 3. Check via Telegram InitData (The most reliable for WebApp users)
    if (!isOwner && tgUser) {
        const { data: profileByTg } = await supabase
            .from('profiles')
            .select('id')
            .eq('tg_user_id', tgUser.id)
            .single();
            
        if (profileByTg && listing.created_by === profileByTg.id) {
            isOwner = true;
            // If we found the user via TG but not Supabase Auth, we should use the profile ID for the transaction
            // But payment_transactions.user_id references profiles(id).
            finalUserId = profileByTg.id;
        }
    }

    if (!isOwner) {
        console.error("Ownership mismatch:", { 
            listingCreator: listing.created_by, 
            userId: user?.id,
            tgUserId: tgUser?.id
        });
        return NextResponse.json(
            { error: "Access denied: You are not the owner of this listing" },
            { status: 403 }
        );
    }

    if (!finalUserId) {
        return NextResponse.json(
            { error: "Could not identify user for transaction" },
            { status: 500 }
        );
    }

    // Create payment transaction record
    // MUST use service role key to bypass RLS when using Telegram auth
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceRoleKey) {
        console.error("SUPABASE_SERVICE_ROLE is not configured");
        return NextResponse.json(
            { error: "Server configuration error" },
            { status: 500 }
        );
    }
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from("payment_transactions")
      .insert({
        user_id: finalUserId, 
        listing_id: listingId,
        service_id: serviceId,
        amount_stars: service.price_stars,
        status: "pending",
        invoice_payload: JSON.stringify({
          serviceId,
          listingId,
          userId: finalUserId,
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
      payload: transaction.id, // Just the transaction ID (max 128 bytes)
      currency: "XTR", // Telegram Stars
      prices: [
        {
          label: service.name_ru,
          amount: service.price_stars, // For XTR, amount is the number of stars directly
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
