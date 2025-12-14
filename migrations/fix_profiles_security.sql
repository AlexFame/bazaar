-- Security Fix: Lock down profiles update policy
-- Previously: USING (true) -> Allowed ANYONE to update ANY profile (Identity Theft)
-- New: Disable updates via Client RLS entirely (must use API) OR restrict to self-auth if using Supabase Auth (but we use Telegram mostly).
-- Since our users are authenticated via Telegram InitData which doesn't map to Supabase Auth UID in RLS easily without custom claims,
-- we will DISALLOW public updates via RLS and force usage of the secure Server-Side API.

-- 1. Drop existing permissive policies
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can update profiles" ON public.profiles;

-- 2. Create restrictive policy (Service Role only, effectively)
-- We DO NOT add a policy for public updates. 
-- Adding NO policy for UPDATE means Deny All by default for anon/authenticated roles.

-- 3. Ensure SELECT is still public (so people can see seller profiles)
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT USING (true);

-- 4. Ensure INSERT is restricted or handled via logic (Sign-up flow usually handles this via function or service role)
-- Checking existing insert policy... usually "profiles_insert_self" with (true).
-- We should probably restrict INSERT too, but sign-up might rely on it if done from client. 
-- For now, focused on UPDATE (Identity Theft). 
-- Let's leave INSERT as is if it exists, or check it.
-- Actually, let's verify INSERT. If I can INSERT a profile with existing tg_user_id, I might crash or hijack?
-- tg_user_id is UNIQUE, so INSERT would fail if exists.

-- OPTIONAL: IF we want to allow Supabase Auth users to update themselves (if you use Email/Pass)
-- CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
