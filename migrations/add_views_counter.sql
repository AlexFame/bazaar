-- Add views_count column to listings table
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

-- Create index for sorting by views (useful for "Popular" filters later)
CREATE INDEX IF NOT EXISTS listings_views_count_idx 
ON listings (views_count DESC);

-- Function to safely increment view count
-- SECURITY DEFINER allows anyone to call this function without needing update permissions on the table
CREATE OR REPLACE FUNCTION increment_view_count(listing_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE listings
  SET views_count = views_count + 1
  WHERE id = listing_id;
END;
$$;
