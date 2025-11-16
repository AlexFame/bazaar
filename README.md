# OLX Mini — Starter

Minimal Next.js (App Router) + Supabase starter for a Telegram mini‑app classifieds MVP.

## Quick start

1) Install deps
```
npm install
```

2) Create Supabase project
- Run SQL from `schema.sql` in Supabase SQL Editor.
- Create Storage bucket: `listing-images` (private).

3) Fill environment variables
- Copy `.env.example` to `.env.local` and set all values.
- For local dev keep `APP_BASE_URL=http://localhost:3000`.

4) Run
```
npm run dev
```

Open http://localhost:3000

## Telegram Mini‑app
- Create bot via @BotFather and get `TG_BOT_TOKEN`.
- Open your app from bot's WebApp button so Telegram injects `initData`.
- Auth endpoint: `/api/auth/tg/verify` sets cookie `app_session`.

## Notes
- Image uploads use Supabase signed upload URLs (MVP). You may store file paths in `listing_images` after upload (webhook or client call).
