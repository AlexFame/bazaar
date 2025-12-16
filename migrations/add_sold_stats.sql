-- Add sold_count to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS sold_count INTEGER DEFAULT 0;

-- Function to update sold_count on listing status change
CREATE OR REPLACE FUNCTION update_profile_sold_count()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changed to 'closed' (sold)
  IF (OLD.status != 'closed' AND NEW.status = 'closed') THEN
    UPDATE profiles 
    SET sold_count = sold_count + 1 
    WHERE id = NEW.created_by;
  END IF;

  -- If status changed FROM 'closed' (re-opened)
  IF (OLD.status = 'closed' AND NEW.status != 'closed') THEN
    UPDATE profiles 
    SET sold_count = GREATEST(sold_count - 1, 0) -- prevent negative
    WHERE id = NEW.created_by;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trg_update_sold_count ON listings;
CREATE TRIGGER trg_update_sold_count
AFTER UPDATE OF status ON listings
FOR EACH ROW
EXECUTE FUNCTION update_profile_sold_count();

-- Optional: Recalculate for existing data
WITH sold_counts AS (
  SELECT created_by, COUNT(*) as cnt
  FROM listings
  WHERE status = 'closed'
  GROUP BY created_by
)
UPDATE profiles p
SET sold_count = sc.cnt
FROM sold_counts sc
WHERE p.id = sc.created_by;
