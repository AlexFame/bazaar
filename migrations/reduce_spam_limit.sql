-- Reduce spam limit for new users (< 7 days) from 10 to 3 listings per day

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
    
    -- Limit: 3 listings per day for new users (Reduced from 10)
    IF listings_today >= 3 THEN
      RAISE EXCEPTION 'Spam protection: New users can create maximum 3 listings per day. Please try again tomorrow.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
