-- Migration: Migrate Stars to Stripe (EUR)
-- Description: Updates premium_services table for Stripe/EUR support and seeds new pricing tiers.

-- 1. Alter table to support currency and cents
ALTER TABLE premium_services 
ADD COLUMN IF NOT EXISTS price INTEGER, -- Price in cents (e.g., 199 = €1.99)
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'eur',
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- 2. Update payment_transactions table to store real money data
ALTER TABLE payment_transactions
ADD COLUMN IF NOT EXISTS amount INTEGER, -- in cents
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'eur',
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'telegram_stars', -- or 'stripe'
ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

-- 3. Archive and Rename old services to free up the 'service_type' unique constraint
-- We append '_archived' to the service_type so we can reuse the clean names (e.g. 'urgent_sticker')
UPDATE premium_services 
SET 
  is_active = false,
  service_type = service_type || '_archived_' || floor(extract(epoch from now()))
WHERE is_active = true OR service_type IN ('urgent_sticker', 'top_1d', 'top_3d', 'top_7d', 'top_30d');

-- 4. Insert new services with psychological pricing
INSERT INTO premium_services (service_type, name_ru, name_ua, name_en, description_ru, description_ua, description_en, price, currency, duration_days, features, is_active) VALUES
(
  'urgent_sticker',
  'Стикер "Срочно"',
  'Стікер "Терміново"',
  'Urgent Sticker',
  'Яркий красный стикер выделит ваше объявление в ленте.',
  'Яскравий червоний стікер виділить ваше оголошення в стрічці.',
  'Bright red sticker highlights your listing in the feed.',
  199, -- €1.99
  'eur',
  NULL, -- Permanent for the listing until sold? Or maybe just a badge.
  '{"badge": "urgent", "color": "red", "icon": "🔥"}'::jsonb,
  true
),
(
  'top_1d',
  'Топ на 1 день',
  'Топ на 1 день',
  'Top 1 Day',
  'Ваше объявление будет закреплено в топе категории на 24 часа + стикер "Топ".',
  'Ваше оголошення буде закріплено в топі категорії на 24 години + стікер "Топ".',
  'Your listing will be pinned to the top of the category for 24 hours + "Top" sticker.',
  299, -- €2.99
  'eur',
  1,
  '{"priority": 2, "highlight": true}'::jsonb,
  true
),
(
  'top_3d',
  'Топ на 3 дня',
  'Топ на 3 дні',
  'Top 3 Days',
  'Выгоднее! 3 дня в топе категории. Идеально для быстрой продажи.',
  'Вигідніше! 3 дні в топі категорії. Ідеально для швидкого продажу.',
  'Better value! 3 days in the top of the category. Ideal for quick sales.',
  399, -- €3.99 (vs 2.99 for 1 day -> Killer deal)
  'eur',
  3,
  '{"priority": 3, "highlight": true, "recommended": true}'::jsonb,
  true
),
(
  'top_7d',
  'Топ на 7 дней',
  'Топ на 7 днів',
  'Top 7 Days',
  'Неделя в топе. Максимальный охват для важных продаж.',
  'Тиждень в топі. Максимальне охоплення для важливих продажів.',
  'A week in the top. Maximum reach for important sales.',
  699, -- €6.99
  'eur',
  7,
  '{"priority": 5, "highlight": true}'::jsonb,
  true
),
(
  'top_30d',
  'Топ на 30 дней',
  'Топ на 30 днів',
  'Top 30 Days',
  'Премиум размещение на целый месяц. Самая низкая цена за день.',
  'Преміум розміщення на цілий місяць. Найнижча ціна за день.',
  'Premium placement for a whole month. Lowest price per day.',
  1999, -- €19.99
  'eur',
  30,
  '{"priority": 10, "highlight": true, "featured": true}'::jsonb,
  true
);

-- 4. Deprecate price_stars (optional: drop column later, for now just ignore it)
-- ALTER TABLE premium_services DROP COLUMN price_stars;
