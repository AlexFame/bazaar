create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null, -- 'question', 'offer', 'system'
  title text,
  message text,
  data jsonb default '{}'::jsonb,
  is_read boolean default false,
  created_at timestamptz default now()
);

create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);

alter table public.notifications enable row level security;

do $$ begin
  create policy notifications_select_own on public.notifications for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

-- Allow users to update their own notifications (e.g. mark as read)
do $$ begin
  create policy notifications_update_own on public.notifications for update using (user_id = auth.uid());
exception when duplicate_object then null; end $$;
