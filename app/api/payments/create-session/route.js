import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

import { validateTelegramWebAppData } from "@/lib/telegram-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const BOT_TOKEN = process.env.TG_BOT_TOKEN;

export async function POST(request) {
  try {
    const { serviceId, listingId, initData } = await request.json();

    // 1. Auth check
    let user = null;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    // Initialize public client for everyone (needed for fetching services/listings later)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader || '' } },
    });

    if (authHeader) {
      const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();
      if (!authError && supabaseUser) {
        user = supabaseUser;
      }
    }

    // Fallback to Telegram InitData
    if (!user && initData) {
       console.log("Attempting Telegram InitData Auth...");
       
       if (!BOT_TOKEN) {
         console.error("TG_BOT_TOKEN is missing in environment variables!");
       }

       const tgUser = validateTelegramWebAppData(initData, BOT_TOKEN);
       
       if (tgUser) {
          console.log("Telegram Validated User:", tgUser.id);
          
          // Find user by telegram_id in profiles
          const { data: profile, error: profileError } = await supabaseAdmin
             .from('profiles')
             .select('id')
             .eq('tg_user_id', tgUser.id)
             .single();
          
          if (profileError) {
            console.error("Profile lookup error:", profileError);
          }

          if (profile) {
             console.log("Found profile:", profile.id);
             user = { id: profile.id };
          } else {
             console.log("Profile not found for tg_user_id:", tgUser.id);
          }
       } else {
         console.error("Telegram initData validation failed");
       }
    }

    if (!user) {
      console.log("Authorization failed. Headers:", !!authHeader, "InitData present:", !!initData);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get Service Details
    const { data: service, error: serviceError } = await supabase
      .from("premium_services")
      .select("*")
      .eq("id", serviceId)
      .eq("is_active", true)
      .single();

    if (serviceError || !service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // 3. Get Listing Details
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // 4. Create Transaction Record (Pending)

    const { data: transaction, error: txError } = await supabaseAdmin
      .from("payment_transactions")
      .insert({
        user_id: user.id,
        listing_id: listing.id,
        service_id: service.id,
        amount_stars: 0, // Deprecated
        amount: service.price, // New column
        currency: service.currency || 'eur', // New column
        status: "pending",
        provider: "stripe",
      })
      .select()
      .single();

    if (txError) {
      console.error("Transaction creation failed:", txError);
      return NextResponse.json({ error: "Failed to init transaction" }, { status: 500 });
    }

    // 5. Create Stripe Checkout Session
    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: service.currency || "eur",
            product_data: {
              name: service.name_ru || service.name_en, // Default to RU for now as per user pref
              description: service.description_ru,
              metadata: {
                service_type: service.service_type,
              },
            },
            unit_amount: service.price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${SITE_URL}/listings/${listing.id}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/listings/${listing.id}?payment=cancelled`,
      metadata: {
        transactionId: transaction.id,
        listingId: listing.id,
        userId: user.id,
        serviceId: service.id,
      },
      client_reference_id: transaction.id,
    });

    // Update transaction with session ID
    await supabaseAdmin
      .from("payment_transactions")
      .update({ stripe_session_id: session.id })
      .eq("id", transaction.id);

    return NextResponse.json({ 
      success: true, 
      url: session.url 
    });

  } catch (error) {
    console.error("Stripe session error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
