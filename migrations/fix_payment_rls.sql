-- Fix RLS policies for payment_transactions table
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Users can create their own transactions" ON payment_transactions;

-- Re-create policies with correct permissions
CREATE POLICY "Users can view their own transactions" ON payment_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions" ON payment_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add policy for service role (if needed for admin tasks, though usually bypasses RLS)
-- But ensuring authenticated users can definitely insert is key.
-- The issue might be that the insert in the API route happens with the user's session, 
-- and the RLS check fails if the user_id in the payload doesn't match auth.uid().
-- The code does: user_id: user.id, so it should match.

-- Let's also ensure the table exists and has the right columns (idempotent)
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  listing_id UUID REFERENCES listings(id),
  service_id UUID REFERENCES premium_services(id),
  telegram_payment_charge_id TEXT UNIQUE,
  amount_stars INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  invoice_payload TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
