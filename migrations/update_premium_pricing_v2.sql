-- Round prices to match Telegram Stars packages exactly (250, 500, 1000, 2500)
-- This avoids user having 1 leftover star.

UPDATE premium_services
SET price_stars = 250
WHERE service_type = 'boost_1d'; -- Was 249

UPDATE premium_services
SET price_stars = 500
WHERE service_type = 'boost_3d'; -- Was 499

UPDATE premium_services
SET price_stars = 1000
WHERE service_type = 'pin_7d'; -- Was 999

UPDATE premium_services
SET price_stars = 2500
WHERE service_type = 'combo_14d'; -- Was 2499

-- Ensure combo_7d is also updated if it exists
UPDATE premium_services
SET price_stars = 2500
WHERE service_type = 'combo_7d';
