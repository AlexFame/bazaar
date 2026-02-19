import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role key to bypass RLS for webhook processing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request) {
  try {
    // Validate webhook authenticity via secret token
    // Set this via Telegram Bot API setWebhook with secret_token parameter
    const secretToken = request.headers.get('x-telegram-bot-api-secret-token');
    const expectedToken = process.env.TG_WEBHOOK_SECRET;
    
    if (expectedToken && secretToken !== expectedToken) {
      console.error('Telegram webhook: invalid secret token');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    
    // Handle pre_checkout_query (always approve)
    if (body.pre_checkout_query) {
      const { id } = body.pre_checkout_query;
      
      const BOT_TOKEN = process.env.TG_BOT_TOKEN;
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pre_checkout_query_id: id,
          ok: true,
        }),
      });

      return NextResponse.json({ success: true });
    }

    // Handle successful_payment
    if (body.message?.successful_payment) {
      const payment = body.message.successful_payment;
      let payload;
      try {
          payload = JSON.parse(payment.invoice_payload);
      } catch (e) {
          console.error("Payload parse error:", e);
          return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
      }

      // Handle both old and new payload formats
      const transactionId = payload.tid || payload.transactionId;
      
      if (!transactionId) {
          console.error("No transactionId in payload:", payload);
          return NextResponse.json({ error: "No transactionId" }, { status: 400 });
      }

      console.log("Processing payment for transaction:", transactionId);

      // Fetch transaction details (listing, service, user) from DB
      const { data: transaction, error: transError } = await supabaseAdmin
        .from("payment_transactions")
        .select("*, service:premium_services(*)")
        .eq("id", transactionId)
        .single();

      if (transError || !transaction) {
        console.error("Transaction not found:", transactionId);
        return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
      }

      // Update transaction status
      await supabaseAdmin
        .from("payment_transactions")
        .update({
          status: "completed",
          telegram_payment_charge_id: payment.telegram_payment_charge_id,
          completed_at: new Date().toISOString(),
        })
        .eq("id", transactionId);

      const service = transaction.service;
      const listingId = transaction.listing_id;
      const userId = transaction.user_id;

      // Create listing boost if service has duration
      if (service?.duration_days) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + service.duration_days);

        const { error: boostError } = await supabaseAdmin
          .from("listing_boosts")
          .insert({
            listing_id: listingId,
            service_id: service.id,
            user_id: userId,
            expires_at: expiresAt.toISOString(),
            is_active: true,
          });

        if (boostError) {
          console.error("Failed to create boost:", boostError);
        }
      }

      // Update listing's updated_at to push it to top
      await supabaseAdmin
        .from("listings")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", listingId);

      // Send confirmation notification to user
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("tg_user_id")
        .eq("id", userId)
        .single();

      if (profile?.tg_user_id) {
        const BOT_TOKEN = process.env.TG_BOT_TOKEN;
        const formattedExpires = service?.duration_days ? new Date(Date.now() + service.duration_days * 24 * 60 * 60 * 1000).toLocaleDateString() : "";
        
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: profile.tg_user_id,
            text: `✅ Оплата успешна!\n\n🚀 Услуга "${service?.name_ru || 'Продвижение'}" активирована.\n${service?.duration_days ? `⏰ Действует до: ${formattedExpires}` : ""}`,
            parse_mode: "HTML",
          }),
        }).catch((err) => console.error("Notification error:", err));
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
