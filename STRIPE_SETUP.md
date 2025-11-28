# Stripe Payment Integration Setup

## Prerequisites

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from the Stripe Dashboard

## Configuration

Add the following to your `.env.local` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database Migration

Run the payment migration in Supabase:

```sql
-- Run the contents of migrations/add_payments.sql
```

## Webhook Setup

1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Login: `stripe login`
3. Forward webhooks to local: `stripe listen --forward-to localhost:3000/api/payments/webhook`
4. Copy the webhook signing secret to `.env.local`

For production:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/payments/webhook`
3. Select events: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`
4. Copy the signing secret to your production environment variables

## Usage

Import and use the `PaymentButton` component:

```jsx
import PaymentButton from "@/components/PaymentButton";

<PaymentButton 
  listingId={listing.id}
  amount={listing.price}
  listingTitle={listing.title}
/>
```

## Testing

Use Stripe test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

Any future date for expiry, any 3 digits for CVC, any postal code.

## Features

- ✅ Secure checkout with Stripe
- ✅ Payment tracking in database
- ✅ Webhook handling for payment events
- ✅ Automatic seller notifications
- ✅ Support for EUR currency
- ✅ RLS policies for data security
