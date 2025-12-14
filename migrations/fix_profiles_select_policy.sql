-- Ensure public read access to profiles
-- This fixes the issue where users cannot view other sellers' profiles

-- Build the policy
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

DO $$ BEGIN
  CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Verify RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
