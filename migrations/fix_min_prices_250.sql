-- Fix minimum prices to be at least 250 stars (Telegram Stars requirement/policy)

-- Update 'urgent_sticker' if it exists and is < 250
UPDATE premium_services
SET price_stars = 250
WHERE service_type = 'urgent_sticker' AND price_stars < 250;

-- Update 'boost_1d' if it exists and is < 250
UPDATE premium_services
SET price_stars = 250
WHERE service_type = 'boost_1d' AND price_stars < 250;

-- Ensure any active service has min price 250
UPDATE premium_services
SET price_stars = 250
WHERE is_active = true AND price_stars < 250;
