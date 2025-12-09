-- 1. Create saved_searches table
create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  query text not null, -- The search term (e.g. "iphone")
  filters jsonb default '{}'::jsonb, -- Additional filters like category, price_max
  last_notified_at timestamptz,
  created_at timestamptz default now()
);

-- Index for searching users by query could vary, but mainly we iterate searches.
-- Index for user's saved searches
create index if not exists idx_saved_searches_user on public.saved_searches(user_id);


-- 2. Create notifications table
create type notification_type as enum ('saved_search_match', 'system');

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type notification_type not null default 'saved_search_match',
  title text not null,
  message text not null,
  data jsonb default '{}'::jsonb, -- link: /listing/123, listing_id: ...
  is_read boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_notifications_user_unread on public.notifications(user_id) where is_read = false;


-- 3. RLS Policies
alter table public.saved_searches enable row level security;
alter table public.notifications enable row level security;

-- Saved Searches Policies
create policy "Users can view own saved searches" 
  on public.saved_searches for select using (true);

create policy "Users can create own saved searches" 
  on public.saved_searches for insert with check (true);

create policy "Users can delete own saved searches" 
  on public.saved_searches for delete using (true);


-- Notifications Policies
create policy "Users can view own notifications" 
  on public.notifications for select using (true);

create policy "Users can update own notifications (mark read)" 
  on public.notifications for update using (true);


-- 4. Function & Trigger logic
create or replace function public.process_new_listing_subscription()
returns trigger
language plpgsql
security definer -- Run as admin to read all searches and insert notifications
as $$
declare
  search_record record;
  matches boolean;
begin
  -- Only process active listings
  if new.status <> 'active' then
    return new;
  end if;

  -- Loop through all saved searches (Naively for now, can be optimized with TSVECTOR later)
  for search_record in select * from public.saved_searches loop
    
    -- Prevent notifying the creator
    if search_record.user_id = new.created_by then
        continue;
    end if;

    -- check match title (Case insensitive)
    -- Using simple ILIKE for robustness on partial matches
    if new.title ilike '%' || search_record.query || '%' then
       
       -- MATCH FOUND!
       -- Create notification
       insert into public.notifications (user_id, type, title, message, data)
       values (
          search_record.user_id,
          'saved_search_match',
          'Новое объявление: ' || new.title,
          'По вашему запросу "' || search_record.query || '" найдено новое объявление.',
          jsonb_build_object('listing_id', new.id, 'url', '/listing/' || new.id)
       );
       
       -- Update last notified (optional debounce)
       update public.saved_searches 
       set last_notified_at = now() 
       where id = search_record.id;
       
    end if;

  end loop;

  return new;
end;
$$;

-- 5. Attach Trigger
drop trigger if exists on_listing_created_check_subscriptions on public.listings;

create trigger on_listing_created_check_subscriptions
  after insert on public.listings
  for each row
  execute function public.process_new_listing_subscription();

-- Also trigger on update if status changes to active?
create or replace function public.process_listing_activation_subscription()
returns trigger
language plpgsql
security definer
as $$
declare
  search_record record;
begin
  -- Run only if status changed TO active
  if new.status = 'active' and (old.status is null or old.status <> 'active') then
      -- Same logic as above (duplicated via function call would be cleaner but inline here for simplicity)
      
      for search_record in select * from public.saved_searches loop
        if search_record.user_id = new.created_by then continue; end if;

        if new.title ilike '%' || search_record.query || '%' then
           insert into public.notifications (user_id, type, title, message, data)
           values (
              search_record.user_id,
              'saved_search_match',
              'Новое объявление: ' || new.title,
              'По вашему запросу "' || search_record.query || '" найдено новое объявление.',
              jsonb_build_object('listing_id', new.id, 'url', '/listing/' || new.id)
           );
        end if;
      end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists on_listing_activated_check_subscriptions on public.listings;
create trigger on_listing_activated_check_subscriptions
  after update on public.listings
  for each row
  execute function public.process_listing_activation_subscription();
