import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabaseClient";
import { headers } from "next/headers";

export async function POST(request) {
  const body = await request.text();
  const signature = headers().get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object;
      
      // Update payment status
      await supabase
        .from("payments")
        .update({
          status: "completed",
          stripe_payment_intent_id: session.payment_intent,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_session_id", session.id);

      // Send notification to seller
      const { listingId, sellerId } = session.metadata;
      
      if (sellerId) {
        fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/telegram`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientId: sellerId,
            message: `💰 Платеж получен! Товар продан.`,
            type: "listing_sold",
          }),
        }).catch(err => console.error("Notification error:", err));
      }

      break;

    case "checkout.session.expired":
    case "payment_intent.payment_failed":
      const failedSession = event.data.object;
      
      await supabase
        .from("payments")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_session_id", failedSession.id);

      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
