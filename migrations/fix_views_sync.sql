-- 1. Create the RPC function that matches the API call name (increment_listing_views)
CREATE OR REPLACE FUNCTION increment_listing_views(listing_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- We use 'views_count' column (plural) as per add_views_counter.sql
  UPDATE listings
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = listing_id;
END;
$$;

-- 2. Create the RPC function for contacts (increment_listing_contacts)
CREATE OR REPLACE FUNCTION increment_listing_contacts(listing_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE listings
  SET contacts_count = COALESCE(contacts_count, 0) + 1
  WHERE id = listing_id;
END;
$$;

-- 3. Sync the 'views_count' column with the actual 'view' events count
-- This fixes the "2 vs 45" discrepancy by making the card counter match the analytics log
WITH view_counts AS (
  SELECT listing_id, COUNT(*) as actual_views
  FROM listing_analytics_events
  WHERE event_type = 'view'
  GROUP BY listing_id
)
UPDATE listings l
SET views_count = vc.actual_views
FROM view_counts vc
WHERE l.id = vc.listing_id;

-- 4. Sync 'contacts_count' as well
WITH contact_counts AS (
  SELECT listing_id, COUNT(*) as actual_contacts
  FROM listing_analytics_events
  WHERE event_type = 'contact_click'
  GROUP BY listing_id
)
UPDATE listings l
SET contacts_count = cc.actual_contacts
FROM contact_counts cc
WHERE l.id = cc.listing_id;
