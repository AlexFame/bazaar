-- Ensure listing_status enum has all required values
DO $$
BEGIN
    -- Add 'sold' if not exists
    BEGIN
        ALTER TYPE public.listing_status ADD VALUE IF NOT EXISTS 'sold';
    EXCEPTION
        WHEN duplicate_object THEN null;
    END;

    -- Add 'reserved' if not exists
    BEGIN
        ALTER TYPE public.listing_status ADD VALUE IF NOT EXISTS 'reserved';
    EXCEPTION
        WHEN duplicate_object THEN null;
    END;

    -- Add 'archived' if not exists (for future use)
    BEGIN
        ALTER TYPE public.listing_status ADD VALUE IF NOT EXISTS 'archived';
    EXCEPTION
        WHEN duplicate_object THEN null;
    END;
END $$;
