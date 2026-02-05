-- Enable RLS on the table
alter table public.listing_images enable row level security;

-- 1. Allow public read access (everyone can see images)
create policy "Public can view listing images"
  on public.listing_images
  for select
  using (true);

-- 2. Allow listing owners to insert images
-- Checks if the user is the creator of the listing they are adding images to
create policy "Users can insert images for their own listings"
  on public.listing_images
  for insert
  with check (
    exists (
      select 1 from public.listings
      where id = listing_images.listing_id
      and created_by = auth.uid()
    )
  );

-- 3. Allow listing owners to delete images
create policy "Users can delete images for their own listings"
  on public.listing_images
  for delete
  using (
    exists (
      select 1 from public.listings
      where id = listing_images.listing_id
      and created_by = auth.uid()
    )
  );
