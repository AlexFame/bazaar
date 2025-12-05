-- Revoke all open access to modifications on listings
-- We are moving to API-based mutations with server-side validation.

DROP POLICY IF EXISTS listings_insert ON public.listings;
DROP POLICY IF EXISTS listings_update_own ON public.listings;
DROP POLICY IF EXISTS listings_delete_own ON public.listings;

-- Create restrictive policies (effectively disabling client-side writes)
CREATE POLICY listings_insert ON public.listings FOR INSERT WITH CHECK (false);
CREATE POLICY listings_update_own ON public.listings FOR UPDATE USING (false);
CREATE POLICY listings_delete_own ON public.listings FOR DELETE USING (false);

-- Select policy remains open for reading active listings
-- (Already exists as listings_select)
