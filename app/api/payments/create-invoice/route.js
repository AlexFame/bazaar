import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

const BOT_TOKEN = process.env.TG_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

export async function POST(request) {
  try {
    const { serviceId, listingId } = await request.json();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
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
      .eq("user_id", user.id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: "Listing not found or access denied" },
        { status: 404 }
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
        { error: "Failed to create transaction" },
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
