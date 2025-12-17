-- Safely add 'draft' to the enum if it doesn't exist
DO $$
BEGIN
    ALTER TYPE public.listing_status ADD VALUE IF NOT EXISTS 'draft';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
