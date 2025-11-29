-- Migration: Fix listing_type enum
-- Description: Adds missing values 'service' and 'free' to the listing_type enum

-- Add 'service' to listing_type enum if it doesn't exist
ALTER TYPE listing_type ADD VALUE IF NOT EXISTS 'service';

-- Add 'free' to listing_type enum if it doesn't exist
ALTER TYPE listing_type ADD VALUE IF NOT EXISTS 'free';
