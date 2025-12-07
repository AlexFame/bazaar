-- Fix missing RLS policies for listing_images
-- 1. Enable RLS (just in case)
alter table public.listing_images enable row level security;

-- 2. Drop existing policies to avoid conflicts
drop policy if exists "listing_images_select_public" on public.listing_images;
drop policy if exists "listing_images_insert_own" on public.listing_images;
drop policy if exists "listing_images_delete_own" on public.listing_images;

-- 3. Create SELECT policy (Public)
create policy "listing_images_select_public" 
on public.listing_images for select 
using (true);

-- 4. Create INSERT policy (Owner only)
create policy "listing_images_insert_own" 
on public.listing_images for insert 
with check (
    auth.uid() = (select created_by from public.listings where id = listing_id)
);

-- 5. Create DELETE policy (Owner only)
create policy "listing_images_delete_own" 
on public.listing_images for delete 
using (
    auth.uid() = (select created_by from public.listings where id = listing_id)
);
