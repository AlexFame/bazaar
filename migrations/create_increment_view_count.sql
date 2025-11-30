-- Create function to increment view count
CREATE OR REPLACE FUNCTION increment_view_count(listing_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE listings
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = listing_id;
END
$$;
