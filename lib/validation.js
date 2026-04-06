/**
 * Centralized Zod validation schemas for all API routes.
 * Import the schema you need in each route file.
 */
import { z } from 'zod';

// ──────────────────────────────────────────
// Re-usable primitives
// ──────────────────────────────────────────
const uuid = z.string().uuid();
const initDataField = z.string().min(1);

// ──────────────────────────────────────────
// Auth
// ──────────────────────────────────────────
export const authVerifySchema = z.object({
  initData: initDataField,
});

// ──────────────────────────────────────────
// Comments
// ──────────────────────────────────────────
export const commentCreateSchema = z.object({
  initData: initDataField,
  listingId: uuid,
  content: z.string().min(1).max(2000),
});

// ──────────────────────────────────────────
// Offers
// ──────────────────────────────────────────
export const offerMakeSchema = z.object({
  initData: initDataField,
  listing_id: uuid,
  price: z.number().nonnegative().max(10_000_000),
});

// ──────────────────────────────────────────
// Conversations
// ──────────────────────────────────────────
export const conversationCreateSchema = z.object({
  initData: initDataField,
  listingId: uuid,
  sellerId: uuid,
});

export const messageSendSchema = z.object({
  initData: initDataField,
  conversationId: uuid,
  content: z.string().min(1).max(5000),
});

// ──────────────────────────────────────────
// Profile
// ──────────────────────────────────────────
export const profileUpdateSchema = z.object({
  initData: initDataField,
  full_name: z.string().max(100).optional(),
  email: z.string().email().max(200).optional(),
  notification_preferences: z.record(z.boolean()).optional(),
}).passthrough(); // allow extra keys (they are filtered by whitelist in route)

// ──────────────────────────────────────────
// Listings — actions
// ──────────────────────────────────────────
export const listingActionSchema = z.object({
  initData: initDataField,
  listingId: uuid,
});

// listings/pin has an optional durationDays
export const listingPinSchema = z.object({
  initData: initDataField,
  listingId: uuid,
  durationDays: z.number().int().min(1).max(365).optional().default(7),
});

// listings/delete (uses `id` not `listingId`)
export const listingDeleteSchema = z.object({
  initData: initDataField,
  id: uuid,
});

// listings/[id]/delete — body only has initData, id comes from params
export const listingDeleteByIdSchema = z.object({
  initData: initDataField,
});

// ──────────────────────────────────────────
// Admin
// ──────────────────────────────────────────
export const adminBanSchema = z.object({
  initData: initDataField,
  userId: uuid,
  reason: z.string().max(500).optional(),
  action: z.enum(['ban', 'unban']),
});

// ──────────────────────────────────────────
// Notifications
// ──────────────────────────────────────────
export const notificationSendSchema = z.object({
  initData: initDataField,
  recipientId: uuid,
  message: z.string().min(1).max(5000),
  listingTitle: z.string().max(200).optional(),
});

export const notificationTelegramSchema = z.object({
  initData: initDataField,
  recipientId: uuid,
  message: z.string().min(1).max(5000),
  type: z.string().max(50).optional().default('general'),
  data: z.record(z.unknown()).optional().nullable(),
});

// ──────────────────────────────────────────
// Payments
// ──────────────────────────────────────────
export const paymentCheckoutSchema = z.object({
  listingId: uuid,
  amount: z.number().positive().max(100_000),
});

export const paymentSessionSchema = z.object({
  serviceId: uuid,
  listingId: uuid,
  initData: z.string().optional(),
});

// ──────────────────────────────────────────
// Analytics
// ──────────────────────────────────────────
export const analyticsTrackSchema = z.object({
  listingId: uuid,
  eventType: z.enum([
    'view', 'contact_click', 'message_click',
    'favorite_add', 'share', 'impression', 'search_appearance', 'make_offer',
  ]),
  eventData: z.record(z.unknown()).optional(),
});

export const productAnalyticsTrackSchema = z.object({
  eventType: z.enum([
    'home_open',
    'repeat_visit',
    'swipe_open',
    'swipe_like',
    'swipe_skip',
    'swipe_open_listing',
    'create_listing_start',
    'create_listing_success',
  ]),
  eventData: z.record(z.unknown()).optional(),
});

// ──────────────────────────────────────────
// Saved searches
// ──────────────────────────────────────────
export const savedSearchSchema = z.object({
  query: z.string().max(200).optional(),
  initData: z.string().optional(),
  tgUserId: z.number().optional(),
}).passthrough(); // allows filters

// ──────────────────────────────────────────
// Reviews
// ──────────────────────────────────────────
export const reviewCreateSchema = z.object({
  initData: initDataField,
  targetUserId: uuid,
  listingId: uuid.optional().nullable(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

// ──────────────────────────────────────────
// Subscriptions
// ──────────────────────────────────────────
export const subscriptionToggleSchema = z.object({
  initData: initDataField,
  targetUserId: uuid,
});

// ──────────────────────────────────────────
// Images
// ──────────────────────────────────────────
export const imageSignSchema = z.object({
  listingId: uuid,
  fileName: z.string().min(1).max(200),
});

// ──────────────────────────────────────────
// Translate
// ──────────────────────────────────────────
export const translateSchema = z.object({
  text: z.string().max(2000).optional().default(''),
  targetLang: z.string().max(5).optional(),
});

// ──────────────────────────────────────────
// Listings main route POST (already has schema in-file, kept for reference)
// ──────────────────────────────────────────
export const listingCreateMainSchema = z.object({
  title: z.string().min(3).max(120),
  type: z.enum(['buy', 'sell', 'free']),
  price: z.number().nonnegative().optional().nullable(),
  description: z.string().max(4000).optional().nullable(),
  contacts: z.string().max(200).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  photos: z.array(z.string()).optional().nullable(),
});

// ──────────────────────────────────────────
// Helper: validate and return parsed data or error Response
// ──────────────────────────────────────────
export function validateBody(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      ok: false,
      error: new Response(
        JSON.stringify({ error: 'Validation failed', details: result.error.flatten() }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }
  return { ok: true, data: result.data };
}
