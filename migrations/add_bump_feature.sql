-- Add bumped_at column for "Up" feature
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS bumped_at TIMESTAMPTZ;

-- Update index for Feed sorting (VIP first, then Bumped/Newest)
DROP INDEX IF EXISTS listings_type_status_created_at_idx;
CREATE INDEX listings_feed_sort_idx ON public.listings (type, status, is_vip DESC, COALESCE(bumped_at, created_at) DESC);

-- Function to Bump a listing (securely)
CREATE OR REPLACE FUNCTION public.bump_listing(listing_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.listings
  SET bumped_at = now()
  WHERE id = listing_uuid
  AND (created_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
END;
$$;

-- Function to Pin a listing (VIP)
CREATE OR REPLACE FUNCTION public.pin_listing(listing_uuid uuid, duration_days int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.listings
  SET is_vip = true,
      vip_until = now() + (duration_days || ' days')::interval
  WHERE id = listing_uuid
  AND (created_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
END;
$$;
