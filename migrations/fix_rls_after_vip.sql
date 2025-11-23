-- Fix RLS policies after adding is_vip and vip_until columns
-- Run this in Supabase SQL Editor

-- Drop and recreate the SELECT policy for listings to include new columns
DROP POLICY IF EXISTS "Anyone can view active listings" ON listings;

CREATE POLICY "Anyone can view active listings"
ON listings
FOR SELECT
USING (true);

-- Ensure INSERT policy allows setting is_vip (defaults to false anyway)
DROP POLICY IF EXISTS "Users can create their own listings" ON listings;

CREATE POLICY "Users can create their own listings"
ON listings
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Ensure UPDATE policy allows updating is_vip for admins or owners
DROP POLICY IF EXISTS "Users can update their own listings" ON listings;

CREATE POLICY "Users can update their own listings"
ON listings
FOR UPDATE
USING (
  auth.uid() = created_by 
  OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Ensure DELETE policy works
DROP POLICY IF EXISTS "Users can delete their own listings" ON listings;

CREATE POLICY "Users can delete their own listings"
ON listings
FOR DELETE
USING (
  auth.uid() = created_by 
  OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);
