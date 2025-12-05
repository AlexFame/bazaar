-- Performance Indexes Migration
-- Purpose: Add indexes to speed up common queries for scalability
-- Safe: Only adds indexes, doesn't modify or delete any data
-- Rollback: Can drop indexes without affecting data

-- ============================================
-- LISTINGS TABLE INDEXES
-- ============================================

-- Index for feed sorting (most common query)
-- Speeds up: ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_listings_created_at 
ON listings(created_at DESC);

-- Index for category filtering
-- Speeds up: WHERE category_key = 'electronics'
CREATE INDEX IF NOT EXISTS idx_listings_category 
ON listings(category_key);

-- Index for location-based search
-- Speeds up: WHERE location_text = 'Berlin'
CREATE INDEX IF NOT EXISTS idx_listings_location 
ON listings(location_text);

-- Composite index for active listings feed
-- Speeds up: WHERE status = 'active' ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_listings_status_created 
ON listings(status, created_at DESC);

-- Index for user's own listings
-- Speeds up: WHERE created_by = user_id
CREATE INDEX IF NOT EXISTS idx_listings_created_by 
ON listings(created_by);

-- Index for price range queries
-- Speeds up: WHERE price BETWEEN min AND max
CREATE INDEX IF NOT EXISTS idx_listings_price 
ON listings(price);

-- ============================================
-- MESSAGES TABLE INDEXES
-- ============================================

-- Index for loading conversation messages
-- Speeds up: WHERE conversation_id = X ORDER BY created_at
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON messages(conversation_id, created_at);

-- Index for sender queries
-- Speeds up: WHERE sender_id = user_id
CREATE INDEX IF NOT EXISTS idx_messages_sender 
ON messages(sender_id);

-- ============================================
-- CONVERSATIONS TABLE INDEXES
-- ============================================

-- Index for buyer's conversations
-- Speeds up: WHERE buyer_id = user_id
CREATE INDEX IF NOT EXISTS idx_conversations_buyer 
ON conversations(buyer_id);

-- Index for seller's conversations
-- Speeds up: WHERE seller_id = user_id
CREATE INDEX IF NOT EXISTS idx_conversations_seller 
ON conversations(seller_id);

-- Index for listing's conversations
-- Speeds up: WHERE listing_id = X
CREATE INDEX IF NOT EXISTS idx_conversations_listing 
ON conversations(listing_id);

-- ============================================
-- FAVORITES TABLE INDEXES
-- ============================================

-- Index for user's favorites
-- Speeds up: WHERE profile_id = X ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_favorites_user_created 
ON favorites(profile_id, created_at DESC);

-- Index for listing's favorite count
-- Speeds up: WHERE listing_id = X
CREATE INDEX IF NOT EXISTS idx_favorites_listing 
ON favorites(listing_id);

-- Composite index for checking if user favorited listing
-- Speeds up: WHERE profile_id = X AND listing_id = Y
CREATE INDEX IF NOT EXISTS idx_favorites_user_listing 
ON favorites(profile_id, listing_id);

-- ============================================
-- PROFILES TABLE INDEXES
-- ============================================

-- Index for Telegram user lookup
-- Speeds up: WHERE tg_user_id = X
CREATE INDEX IF NOT EXISTS idx_profiles_tg_user 
ON profiles(tg_user_id);

-- ============================================
-- REVIEWS TABLE INDEXES
-- ============================================

-- Index for reviews received by a user (target)
-- Speeds up: WHERE target_id = X
CREATE INDEX IF NOT EXISTS idx_reviews_target 
ON reviews(target_id);

-- Index for reviews written by a user
-- Speeds up: WHERE reviewer_id = X
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer 
ON reviews(reviewer_id);

-- Index for reviews on a specific listing
-- Speeds up: WHERE listing_id = X
CREATE INDEX IF NOT EXISTS idx_reviews_listing 
ON reviews(listing_id);

-- ============================================
-- ANALYTICS INDEXES (Table listing_views doesn't exist yet)
-- ============================================
-- Skipping listing_views indexes until table is fully implemented
-- (Current implementation uses atomic counter in listings table)

-- ============================================
-- VERIFICATION
-- ============================================

-- Indexes created! 
-- You can verify them in Supabase Dashboard -> Database -> Indexes
