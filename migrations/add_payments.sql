-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  status VARCHAR(20) DEFAULT 'pending',
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_payments_buyer_id ON payments(buyer_id);
CREATE INDEX IF NOT EXISTS idx_payments_seller_id ON payments(seller_id);
CREATE INDEX IF NOT EXISTS idx_payments_listing_id ON payments(listing_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_session_id ON payments(stripe_session_id);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own payments as buyer"
  ON payments FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "Users can view their own payments as seller"
  ON payments FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "System can insert payments"
  ON payments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update payments"
  ON payments FOR UPDATE
  USING (true);

-- Comments
COMMENT ON TABLE payments IS 'Stores payment transactions between buyers and sellers';
COMMENT ON COLUMN payments.status IS 'Payment status: pending, completed, failed, refunded';
