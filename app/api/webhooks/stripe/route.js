import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req) {
  const body = await req.text();
  const signature = headers().get("Stripe-Signature");

  let event;

  try {
    if (!stripe) {
        throw new Error("Stripe not initialized");
    }
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    
    const transactionId = session.metadata?.transactionId;
    const userId = session.metadata?.userId;
    const listingId = session.metadata?.listingId;
    const serviceId = session.metadata?.serviceId;

    console.log(`Processing successful payment for transaction: ${transactionId}`);

    if (transactionId) {
        // 1. Update Transaction Status
        const { error: txError } = await supabase
            .from("payment_transactions")
            .update({ 
                status: "completed",
                completed_at: new Date().toISOString(),
                invoice_payload: JSON.stringify(session) // Store full session info for record
            })
            .eq("id", transactionId);

        if (txError) {
            console.error("Error updating transaction:", txError);
            return new NextResponse("Database Error", { status: 500 });
        }

        // 2. Activate Service (Insert into listing_boosts)
        if (serviceId && listingId && userId) {
            // Get service duration
            const { data: service } = await supabase
                .from("premium_services")
                .select("duration_days")
                .eq("id", serviceId)
                .single();
            
            if (service) {
                // Calculate expiry
                const durationDays = service.duration_days || 36500; // Default to 100 years if null (permanent)
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + durationDays);

                const { error: boostError } = await supabase
                    .from("listing_boosts")
                    .insert({
                        listing_id: listingId,
                        service_id: serviceId,
                        user_id: userId,
                        expires_at: expiresAt.toISOString(),
                        is_active: true
                    });

                if (boostError) {
                    console.error("Error creating boost:", boostError);
                    // Don't fail the webhook response, as payment is already captured. 
                    // Should probably alert admin or retry.
                } else {
                    console.log(`Boost activated for listing ${listingId}`);
                }
            }
        }
    }
  }

  return new NextResponse(null, { status: 200 });
}
