-- Add 'draft' status to listing_status enum
DO $$
BEGIN
    BEGIN
        ALTER TYPE public.listing_status ADD VALUE IF NOT EXISTS 'draft';
    EXCEPTION
        WHEN duplicate_object THEN null;
    END;
END $$;
