-- 1. FIX SUPER PERMISSIVE RLS POLICIES

-- FAVORITES
drop policy if exists "favorites_delete_own" on public.favorites;
drop policy if exists "favorites_insert_own" on public.favorites;

create policy "favorites_delete_own"
on public.favorites
for delete
using ( profile_id = auth.uid() );

create policy "favorites_insert_own"
on public.favorites
for insert
with check ( profile_id = auth.uid() );


-- PROFILES
drop policy if exists "profiles_insert_allow_all" on public.profiles;
drop policy if exists "profiles_update_allow_all" on public.profiles;

-- Allow insert only if the id matches authed user (on signup)
create policy "profiles_insert_self" 
on public.profiles 
for insert 
with check ( id = auth.uid() );

-- Allow update only if user is updating their own profile
create policy "profiles_update_self" 
on public.profiles 
for update 
using ( id = auth.uid() );


-- ANALYTICS
-- Drop the overly permissive "System can manage daily stats" if it exists.
-- Assuming service_role handles this, we don't need a public policy.
drop policy if exists "System can manage daily stats" on public.listing_daily_stats;


-- 2. FIX FUNCTION SEARCH PATHS (Corrected Signatures)

-- Simple no-arg functions
ALTER FUNCTION public.update_last_seen() SET search_path = public;
ALTER FUNCTION public.deactivate_expired_boosts() SET search_path = public;
ALTER FUNCTION public.sync_listing_premium_status() SET search_path = public;
ALTER FUNCTION public.trigger_update_badges() SET search_path = public;
ALTER FUNCTION public.handle_new_message() SET search_path = public;
ALTER FUNCTION public.update_profile_sold_count() SET search_path = public;

-- Single arg functions (UUID)
ALTER FUNCTION public.increment_listing_views(uuid) SET search_path = public;
ALTER FUNCTION public.bump_listing(uuid) SET search_path = public;
ALTER FUNCTION public.get_listing_analytics(uuid) SET search_path = public;
ALTER FUNCTION public.increment_view_count(uuid) SET search_path = public;
ALTER FUNCTION public.increment_listing_contacts(uuid) SET search_path = public;

-- Single arg functions (Date)
ALTER FUNCTION public.aggregate_daily_stats(date) SET search_path = public;

-- Multi-arg functions
ALTER FUNCTION public.pin_listing(uuid, int) SET search_path = public;

-- Complex signature for search_listings
-- (search_query, filter_category, min_price, max_price, limit_count, offset_count)
ALTER FUNCTION public.search_listings(text, text, numeric, numeric, int, int) SET search_path = public;
