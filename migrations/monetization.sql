-- Add VIP fields to listings
ALTER TABLE listings 
ADD COLUMN is_vip BOOLEAN DEFAULT FALSE,
ADD COLUMN vip_until TIMESTAMP WITH TIME ZONE;

-- Add Business fields to profiles
ALTER TABLE profiles 
ADD COLUMN account_type TEXT DEFAULT 'personal', -- 'personal' or 'business'
ADD COLUMN business_info JSONB DEFAULT '{}'::jsonb; -- { "website": "...", "address": "...", "hours": "..." }

-- Create index for faster sorting by VIP status
CREATE INDEX idx_listings_is_vip ON listings(is_vip);
