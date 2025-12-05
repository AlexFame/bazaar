-- Spam protection: limit listings for new users
-- New users (< 7 days) can create max 10 listings per day

CREATE OR REPLACE FUNCTION check_listing_spam_limit()
RETURNS TRIGGER AS $$
DECLARE
  user_age INTERVAL;
  listings_today INTEGER;
BEGIN
  -- Get user account age
  SELECT NOW() - created_at INTO user_age
  FROM profiles
  WHERE id = NEW.created_by;
  
  -- Only check for users younger than 7 days
  IF user_age < INTERVAL '7 days' THEN
    -- Count listings created today
    SELECT COUNT(*) INTO listings_today
    FROM listings
    WHERE created_by = NEW.created_by
      AND created_at > NOW() - INTERVAL '1 day';
    
    -- Limit: 10 listings per day for new users
    IF listings_today >= 10 THEN
      RAISE EXCEPTION 'Spam protection: New users can create maximum 10 listings per day. Please try again tomorrow.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS enforce_listing_spam_limit ON listings;
CREATE TRIGGER enforce_listing_spam_limit
  BEFORE INSERT ON listings
  FOR EACH ROW
  EXECUTE FUNCTION check_listing_spam_limit();

-- Add is_banned field to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_banned ON profiles(is_banned) WHERE is_banned = TRUE;

-- Function to check if user is banned
CREATE OR REPLACE FUNCTION check_user_banned()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = NEW.created_by
      AND is_banned = TRUE
  ) THEN
    RAISE EXCEPTION 'Your account has been banned. Please contact support.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent banned users from creating listings
DROP TRIGGER IF EXISTS prevent_banned_user_listings ON listings;
CREATE TRIGGER prevent_banned_user_listings
  BEFORE INSERT ON listings
  FOR EACH ROW
  EXECUTE FUNCTION check_user_banned();

-- Trigger to prevent banned users from sending messages
DROP TRIGGER IF EXISTS prevent_banned_user_messages ON messages;
CREATE TRIGGER prevent_banned_user_messages
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION check_user_banned();
