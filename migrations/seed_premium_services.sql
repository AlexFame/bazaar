-- Migration: Seed Premium Services
-- Description: Inserts the 5 premium services with pricing

INSERT INTO premium_services (service_type, name_ru, name_ua, name_en, description_ru, description_ua, description_en, price_stars, duration_days, features) VALUES
(
  'urgent_sticker',
  'Стикер "Срочно / Топ"',
  'Стікер "Терміново / Топ"',
  'Urgent Sticker',
  'Импульсная покупка: Самый низкий чек. Мгновенное визуальное выделение и психологический триггер для покупателей.',
  'Імпульсна покупка: Найнижчий чек. Миттєве візуальне виділення та психологічний тригер для покупців.',
  'Impulse purchase: Lowest price. Instant visual highlighting and psychological trigger for buyers.',
  199,
  NULL,
  '{"badge": "urgent", "color": "red", "icon": "🔥"}'::jsonb
),
(
  'boost_1d',
  'Поднятие в Топ (1 день)',
  'Підняття в Топ (1 день)',
  'Boost to Top (1 day)',
  'Пробник (Tripwire): Позволяет протестировать эффективность топа с минимальным риском. Низкая приверженность, быстрый результат.',
  'Пробник (Tripwire): Дозволяє протестувати ефективність топу з мінімальним ризиком. Низька прихильність, швидкий результат.',
  'Trial (Tripwire): Test top placement effectiveness with minimal risk. Low commitment, fast results.',
  299,
  1,
  '{"priority": 2, "highlight": true}'::jsonb
),
(
  'boost_3d',
  'Поднятие в Топ (3 дня)',
  'Підняття в Топ (3 дні)',
  'Boost to Top (3 days)',
  'Оптимальный выбор: Золотая середина. Обеспечивает видимость, достаточную для продажи дорогих товаров (авто, жилье).',
  'Оптимальний вибір: Золота середина. Забезпечує видимість, достатню для продажу дорогих товарів (авто, житло).',
  'Optimal choice: Golden middle. Provides sufficient visibility for selling expensive items (cars, real estate).',
  499,
  3,
  '{"priority": 3, "highlight": true, "recommended": true}'::jsonb
),
(
  'pin_7d',
  'Закреп вверху (7 дней)',
  'Закріплення вгорі (7 днів)',
  'Pin to Top (7 days)',
  'Максимальный охват: Фиксирует объявление на первой позиции. Идеально для важных объявлений (поиск работы, аренда).',
  'Максимальне охоплення: Фіксує оголошення на першій позиції. Ідеально для важливих оголошень (пошук роботи, оренда).',
  'Maximum reach: Fixes listing at first position. Ideal for important listings (job search, rentals).',
  999,
  7,
  '{"priority": 5, "pinned": true, "highlight": true}'::jsonb
),
(
  'combo_7d',
  'Премиум-турбо (Combo 7 дней)',
  'Преміум-турбо (Combo 7 днів)',
  'Premium Turbo (Combo 7 days)',
  'Максимальная выгода: Самый высокий чек. Полный пакет для самого быстрого результата.',
  'Максимальна вигода: Найвищий чек. Повний пакет для найшвидшого результату.',
  'Maximum value: Highest price. Full package for fastest results.',
  2499,
  7,
  '{"priority": 10, "pinned": true, "highlight": true, "urgent_badge": true, "featured": true}'::jsonb
)
ON CONFLICT (service_type) DO UPDATE SET
  name_ru = EXCLUDED.name_ru,
  name_ua = EXCLUDED.name_ua,
  name_en = EXCLUDED.name_en,
  description_ru = EXCLUDED.description_ru,
  description_ua = EXCLUDED.description_ua,
  description_en = EXCLUDED.description_en,
  price_stars = EXCLUDED.price_stars,
  duration_days = EXCLUDED.duration_days,
  features = EXCLUDED.features;
