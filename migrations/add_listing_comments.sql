-- Create listing_comments table for Q&A functionality
CREATE TABLE IF NOT EXISTS public.listing_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_listing_comments_listing_id ON public.listing_comments(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_comments_user_id ON public.listing_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_listing_comments_created_at ON public.listing_comments(created_at);

-- Enable RLS
ALTER TABLE public.listing_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can read comments
CREATE POLICY "Anyone can read comments"
ON public.listing_comments
FOR SELECT
USING (true);

-- Authenticated users can insert comments
CREATE POLICY "Authenticated users can insert comments"
ON public.listing_comments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
ON public.listing_comments
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
ON public.listing_comments
FOR DELETE
USING (auth.uid() = user_id);
