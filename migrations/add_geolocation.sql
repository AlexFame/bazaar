-- Add geolocation columns to listings table
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS earthdistance CASCADE;

-- Add spatial index for fast distance queries
-- Using earth_distance for PostgreSQL
CREATE INDEX IF NOT EXISTS listings_location_idx 
ON listings (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
