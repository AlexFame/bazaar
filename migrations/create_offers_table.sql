-- Create offer status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'offer_status') THEN
        CREATE TYPE offer_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');
    END IF;
END $$;

-- Create offers table
CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    price NUMERIC(12,2) NOT NULL CHECK (price > 0),
    status offer_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS offers_listing_id_idx ON public.offers(listing_id);
CREATE INDEX IF NOT EXISTS offers_buyer_id_idx ON public.offers(buyer_id);
CREATE INDEX IF NOT EXISTS offers_status_idx ON public.offers(status);

-- Unique constraint: A buyer can only have one pending offer per listing
CREATE UNIQUE INDEX IF NOT EXISTS unique_pending_offer 
ON public.offers(listing_id, buyer_id) 
WHERE status = 'pending';

-- RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Policies
-- Buyers can read their own offers
DO $$ BEGIN
  CREATE POLICY offers_read_own ON public.offers
    FOR SELECT USING (auth.uid() = buyer_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Sellers can read offers for their listings
DO $$ BEGIN
  CREATE POLICY offers_read_seller ON public.offers
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.listings 
        WHERE id = listing_id AND created_by = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Buyers can insert offers
DO $$ BEGIN
  CREATE POLICY offers_insert_buyer ON public.offers
    FOR INSERT WITH CHECK (auth.uid() = buyer_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Sellers can update offers (accept/reject)
DO $$ BEGIN
  CREATE POLICY offers_update_seller ON public.offers
    FOR UPDATE USING (
      EXISTS (
        SELECT 1 FROM public.listings 
        WHERE id = listing_id AND created_by = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Buyers can cancel (update status) their own pending offers
DO $$ BEGIN
  CREATE POLICY offers_update_buyer ON public.offers
    FOR UPDATE USING (auth.uid() = buyer_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;
