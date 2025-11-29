-- Migration: Add Premium Features Tables
-- Description: Creates tables for Telegram Stars payment system

-- Premium services catalog
CREATE TABLE IF NOT EXISTS premium_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL UNIQUE, -- 'urgent_sticker', 'boost_1d', 'boost_3d', 'pin_7d', 'combo_7d'
  name_ru TEXT NOT NULL,
  name_ua TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ru TEXT,
  description_ua TEXT,
  description_en TEXT,
  price_stars INTEGER NOT NULL,
  duration_days INTEGER,
  features JSONB DEFAULT '{}', -- Additional features like priority, highlighting, etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Listing boosts/promotions
CREATE TABLE IF NOT EXISTS listing_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  service_id UUID REFERENCES premium_services(id),
  user_id UUID REFERENCES profiles(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  listing_id UUID REFERENCES listings(id),
  service_id UUID REFERENCES premium_services(id),
  telegram_payment_charge_id TEXT UNIQUE,
  amount_stars INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  invoice_payload TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_listing_boosts_listing ON listing_boosts(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_boosts_active ON listing_boosts(listing_id, is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_telegram_id ON payment_transactions(telegram_payment_charge_id);

-- RLS Policies

-- Premium services: Public read access
ALTER TABLE premium_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Premium services are viewable by everyone" ON premium_services
  FOR SELECT USING (is_active = true);

-- Listing boosts: Public read for active boosts
ALTER TABLE listing_boosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active boosts are viewable by everyone" ON listing_boosts
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view their own boosts" ON listing_boosts
  FOR SELECT USING (auth.uid() = user_id);

-- Payment transactions: Users can only see their own
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own transactions" ON payment_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions" ON payment_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to automatically deactivate expired boosts
CREATE OR REPLACE FUNCTION deactivate_expired_boosts()
RETURNS void AS $$
BEGIN
  UPDATE listing_boosts
  SET is_active = false
  WHERE is_active = true
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Comment for documentation
COMMENT ON TABLE premium_services IS 'Catalog of available premium services for listing promotion';
COMMENT ON TABLE listing_boosts IS 'Active and historical boosts applied to listings';
COMMENT ON TABLE payment_transactions IS 'Payment history for Telegram Stars transactions';
