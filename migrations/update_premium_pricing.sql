-- Update premium services with realistic Telegram Stars pricing
-- Based on official Telegram Stars packages (250, 500, 1000, 2500 stars)

-- Clear existing services
DELETE FROM premium_services;

-- Insert new services aligned with Telegram Stars packages
INSERT INTO premium_services (service_type, name_ru, name_ua, name_en, description_ru, description_ua, description_en, price_stars, duration_days, features, is_active) VALUES

-- Boost 1 day - Uses 250 stars package (€5.29)
('boost_1d',
 'Поднятие на 1 день',
 'Підняття на 1 день',
 '1-Day Boost',
 'Поднимите объявление в топ на 1 день. Ваше объявление увидят больше людей',
 'Підніміть оголошення в топ на 1 день. Ваше оголошення побачать більше людей',
 'Boost your listing to the top for 1 day. More people will see your listing',
 249,
 1,
 '{"priority": 1}',
 true),

-- Boost 3 days - Uses 500 stars package (€10.90) - RECOMMENDED
('boost_3d',
 'Поднятие на 3 дня',
 'Підняття на 3 дні',
 '3-Day Boost',
 'Поднимите объявление в топ на 3 дня. Максимальный охват аудитории',
 'Підніміть оголошення в топ на 3 дні. Максимальне охоплення аудиторії',
 'Boost your listing to the top for 3 days. Maximum audience reach',
 499,
 3,
 '{"priority": 2, "recommended": true}',
 true),

-- Pin for 7 days - Uses 1000 stars package (€20.99)
('pin_7d',
 'Закрепление на 7 дней',
 'Закріплення на 7 днів',
 '7-Day Pin',
 'Закрепите объявление в самом верху на неделю. Гарантированная видимость',
 'Закріпіть оголошення на самому верху на тиждень. Гарантована видимість',
 'Pin your listing at the very top for a week. Guaranteed visibility',
 999,
 7,
 '{"priority": 3, "pinned": true}',
 true),

-- Combo 14 days - Uses 2500 stars package (€52.99) - Premium
('combo_14d',
 'Премиум на 14 дней',
 'Преміум на 14 днів',
 '14-Day Premium',
 'Максимальное продвижение: закрепление + выделение + стикер "Срочно" на 2 недели',
 'Максимальне просування: закріплення + виділення + стікер "Терміново" на 2 тижні',
 'Maximum promotion: pin + highlight + urgent sticker for 2 weeks',
 2499,
 14,
 '{"priority": 4, "urgent_badge": true, "pinned": true, "highlighted": true}',
 true);
