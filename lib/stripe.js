import Stripe from "stripe";

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-11-20.acacia",
      typescript: true,
    })
  : null;

if (!process.env.STRIPE_SECRET_KEY && process.env.NODE_ENV !== "production") {
  console.warn("STRIPE_SECRET_KEY is not set. Payment features will not work.");
}
