import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Handle pre_checkout_query (always approve)
    if (body.pre_checkout_query) {
      const { id } = body.pre_checkout_query;
      
      // Answer pre-checkout query (required by Telegram)
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
      const payload = JSON.parse(payment.invoice_payload);
      const { transactionId, listingId, serviceId } = payload;

      console.log("Processing payment:", {
        transactionId,
        listingId,
        serviceId,
        charge_id: payment.telegram_payment_charge_id,
      });

      // Update transaction status
      const { error: updateError } = await supabase
        .from("payment_transactions")
        .update({
          status: "completed",
          telegram_payment_charge_id: payment.telegram_payment_charge_id,
          completed_at: new Date().toISOString(),
        })
        .eq("id", transactionId);

      if (updateError) {
        console.error("Failed to update transaction:", updateError);
        return NextResponse.json(
          { error: "Failed to update transaction" },
          { status: 500 }
        );
      }

      // Get service details
      const { data: service } = await supabase
        .from("premium_services")
        .select("*")
        .eq("id", serviceId)
        .single();

      if (!service) {
        console.error("Service not found:", serviceId);
        return NextResponse.json(
          { error: "Service not found" },
          { status: 404 }
        );
      }

      // Get transaction details for user_id
      const { data: transaction } = await supabase
        .from("payment_transactions")
        .select("user_id")
        .eq("id", transactionId)
        .single();

      if (!transaction) {
        console.error("Transaction not found:", transactionId);
        return NextResponse.json(
          { error: "Transaction not found" },
          { status: 404 }
        );
      }

      // Create listing boost if service has duration
      if (service.duration_days) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + service.duration_days);

        const { error: boostError } = await supabase
          .from("listing_boosts")
          .insert({
            listing_id: listingId,
            service_id: serviceId,
            user_id: transaction.user_id,
            expires_at: expiresAt.toISOString(),
            is_active: true,
          });

        if (boostError) {
          console.error("Failed to create boost:", boostError);
        }
      }

      // Update listing's updated_at to push it to top
      await supabase
        .from("listings")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", listingId);

      // Send confirmation notification to user
      const { data: profile } = await supabase
        .from("profiles")
        .select("tg_user_id")
        .eq("id", transaction.user_id)
        .single();

      if (profile?.tg_user_id) {
        const BOT_TOKEN = process.env.TG_BOT_TOKEN;
        const expiresAt = service.duration_days ? new Date(Date.now() + service.duration_days * 24 * 60 * 60 * 1000) : null;
        
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: profile.tg_user_id,
            text: `✅ Оплата успешна!\n\n🚀 Услуга "${service.name_ru}" активирована.\n${service.duration_days ? `⏰ Действует до: ${expiresAt.toLocaleDateString()}` : ""}`,
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
