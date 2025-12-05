alter table public.profiles
add column if not exists notification_preferences jsonb default '{"messages": true, "price_drops": true, "news": true}'::jsonb;
