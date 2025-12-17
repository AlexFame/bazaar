-- Add before_after_images column to listings table
-- It will store a JSON object: { before: "path/to/img1.jpg", after: "path/to/img2.jpg" }

ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS before_after_images JSONB DEFAULT NULL;
