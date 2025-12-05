-- Add missing values to listing_type enum
ALTER TYPE public.listing_type ADD VALUE IF NOT EXISTS 'service';
ALTER TYPE public.listing_type ADD VALUE IF NOT EXISTS 'exchange';

-- Add missing value to listing_status enum
ALTER TYPE public.listing_status ADD VALUE IF NOT EXISTS 'draft';
