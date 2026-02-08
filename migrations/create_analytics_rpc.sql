-- RPC for incrementing view counts safely
create or replace function increment_listing_views(listing_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update listings
  set views_count = coalesce(views_count, 0) + 1
  where id = listing_id;
end;
$$;

-- RPC for incrementing contact click counts safely
create or replace function increment_listing_contacts(listing_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update listings
  set contacts_count = coalesce(contacts_count, 0) + 1
  where id = listing_id;
end;
$$;
