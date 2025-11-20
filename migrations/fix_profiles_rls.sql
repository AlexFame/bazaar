-- Fix RLS policies for profiles table to allow inserts without auth
-- This is needed because we use Telegram authentication, not Supabase Auth

-- Drop existing insert policy
DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;

-- Create new insert policy that allows all inserts
-- In production, you might want to add more specific checks
DO $$ BEGIN
  CREATE POLICY profiles_insert_allow_all ON public.profiles 
    FOR INSERT 
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Also update the update policy to be more permissive
DROP POLICY IF EXISTS profiles_update_self ON public.profiles;

DO $$ BEGIN
  CREATE POLICY profiles_update_allow_all ON public.profiles 
    FOR UPDATE 
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
