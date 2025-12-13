-- RPC for atomic increment of contacts_count
CREATE OR REPLACE FUNCTION increment_listing_contacts(listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.listings
  SET contacts_count = COALESCE(contacts_count, 0) + 1
  WHERE id = listing_id;
END;
$$;
