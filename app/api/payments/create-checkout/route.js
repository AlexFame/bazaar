import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supaAdmin } from "@/lib/supabaseAdmin";
import { getUserIdFromCookie } from "@/lib/auth";
import { withRateLimit } from '@/lib/ratelimit';
import { paymentCheckoutSchema, validateBody } from '@/lib/validation';

async function checkoutHandler(request) {
  try {
    const body = await request.json();
    const v = validateBody(paymentCheckoutSchema, body);
    if (!v.ok) return v.error;
    const { listingId, amount } = v.data;

    if (!listingId || !amount) {
      return NextResponse.json(
        { error: "listingId and amount are required" },
        { status: 400 }
      );
    }

    if (!stripe) {
      return NextResponse.json(
        { error: "Payment system is not configured" },
        { status: 503 }
      );
    }

    // Get current user from cookie
    const userId = getUserIdFromCookie(request.headers);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = supaAdmin();

    // Get listing details
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("*, profiles:created_by(*)")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: listing.title,
              description: listing.description?.substring(0, 200),
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/listing/${listingId}`,
      metadata: {
        listingId,
        buyerId: userId,
        sellerId: listing.created_by,
      },
    });

    // Create payment record
    const { error: paymentError } = await supabase
      .from("payments")
      .insert({
        listing_id: listingId,
        buyer_id: userId,
        seller_id: listing.created_by,
        amount,
        currency: "EUR",
        status: "pending",
        stripe_session_id: session.id,
      });

    if (paymentError) {
      console.error("Error creating payment record:", paymentError);
    }

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(checkoutHandler, { limit: 5, window: '1 m' });
