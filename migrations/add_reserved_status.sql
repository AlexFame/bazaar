-- Add 'reserved' value to listing_status enum safely
DO $$
BEGIN
    ALTER TYPE public.listing_status ADD VALUE IF NOT EXISTS 'reserved';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
