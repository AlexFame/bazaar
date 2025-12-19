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
    let serviceQuery = supabase.from("premium_services").select("*").eq("is_active", true);
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(serviceId);
    if (isUUID) {
      serviceQuery = serviceQuery.eq("id", serviceId);
    } else {
      serviceQuery = serviceQuery.eq("service_type", serviceId);
    }

    const { data: service, error: serviceError } = await serviceQuery.single();

    if (serviceError || !service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Get listing details
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Verify ownership
    let isOwner = false;
    let finalUserId = user?.id;

    if (user && listing.created_by === user.id) isOwner = true;
    if (!isOwner && tgUser) {
        const { data: profileByTg } = await supabase
            .from('profiles')
            .select('id')
            .eq('tg_user_id', tgUser.id)
            .single();
        if (profileByTg && listing.created_by === profileByTg.id) {
            isOwner = true;
            finalUserId = profileByTg.id;
        }
    }

    if (!isOwner) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Create transaction (use admin client)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from("payment_transactions")
      .insert({
        user_id: finalUserId, 
        listing_id: listing.id,
        service_id: service.id,
        amount_stars: service.price_stars,
        status: "pending",
        invoice_payload: JSON.stringify({
          serviceId: service.service_type, 
          listingId: listing.id,
          userId: finalUserId,
        }),
      })
      .select()
      .single();

    if (transactionError || !transaction) {
      return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
    }

    // --- PAYMENT CONFIGURATION ---
    // Hardcoded fallback for the TEST token to ensure it works even if .env loading is buggy
    const providerToken = process.env.TG_PAYMENT_PROVIDER_TOKEN || "1877036958:TEST:dd340747aebc3a884b524b99a88ff0970ce7322e";
    const isStars = !providerToken;

    const payloadObj = {
      tid: transaction.id, 
    };

    const invoiceData = {
      title: service.name_ru,
      description: service.description_ru || `Продвижение объявления "${listing.title}"`,
      payload: JSON.stringify(payloadObj), 
      provider_token: providerToken || "", 
      currency: isStars ? "XTR" : "UAH",
      prices: [
        {
          label: service.name_ru,
          amount: isStars ? service.price_stars : service.price_stars * 100,
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
      return NextResponse.json({ error: "Failed to create invoice", details: result }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      invoiceLink: result.result,
      transactionId: transaction.id,
      paymentMethod: providerToken ? 'card' : 'stars',
      currency: isStars ? 'XTR' : 'UAH',
      debug: {
        hasToken: !!providerToken,
        tokenPrefix: providerToken ? providerToken.substring(0, 5) : null
      }
    });
  } catch (error) {
    console.error("Create invoice error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
