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
-- Speeds up: WHERE category = 'electronics'
CREATE INDEX IF NOT EXISTS idx_listings_category 
ON listings(category);

-- Index for location-based search
-- Speeds up: WHERE location = 'Berlin'
CREATE INDEX IF NOT EXISTS idx_listings_location 
ON listings(location);

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
-- Speeds up: WHERE user_id = X ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_favorites_user_created 
ON favorites(user_id, created_at DESC);

-- Index for listing's favorite count
-- Speeds up: WHERE listing_id = X
CREATE INDEX IF NOT EXISTS idx_favorites_listing 
ON favorites(listing_id);

-- Composite index for checking if user favorited listing
-- Speeds up: WHERE user_id = X AND listing_id = Y
CREATE INDEX IF NOT EXISTS idx_favorites_user_listing 
ON favorites(user_id, listing_id);

-- ============================================
-- PROFILES TABLE INDEXES
-- ============================================

-- Index for Telegram user lookup
-- Speeds up: WHERE tg_user_id = X
CREATE INDEX IF NOT EXISTS idx_profiles_tg_user 
ON profiles(tg_user_id);

-- ============================================
-- ANALYTICS INDEXES (if analytics tables exist)
-- ============================================

-- Index for listing views
CREATE INDEX IF NOT EXISTS idx_listing_views_listing_created 
ON listing_views(listing_id, created_at DESC);

-- Index for user's view history
CREATE INDEX IF NOT EXISTS idx_listing_views_user_created 
ON listing_views(user_id, created_at DESC);

-- ============================================
-- VERIFICATION
-- ============================================

-- Show all indexes created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Show index sizes (helpful for monitoring)
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND indexrelname LIKE 'idx_%'
ORDER BY pg_relation_size(indexrelid) DESC;
