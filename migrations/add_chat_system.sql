-- Create conversations table
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete set null,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(listing_id, buyer_id, seller_id)
);

-- Create messages table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) > 0),
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists conversations_buyer_id_idx on public.conversations(buyer_id);
create index if not exists conversations_seller_id_idx on public.conversations(seller_id);
create index if not exists conversations_listing_id_idx on public.conversations(listing_id);
create index if not exists messages_conversation_id_idx on public.messages(conversation_id);

-- Enable RLS
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- RLS Policies for Conversations
create policy "Users can view their own conversations"
  on public.conversations for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "Users can insert conversations they are part of"
  on public.conversations for insert
  with check (auth.uid() = buyer_id);

-- RLS Policies for Messages
create policy "Users can view messages in their conversations"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations
      where id = conversation_id
      and (buyer_id = auth.uid() or seller_id = auth.uid())
    )
  );

create policy "Users can insert messages in their conversations"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations
      where id = conversation_id
      and (buyer_id = auth.uid() or seller_id = auth.uid())
    )
  );

-- Function to update updated_at on new message
create or replace function public.handle_new_message()
returns trigger as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$ language plpgsql;

-- Trigger for updated_at
create trigger on_new_message
  after insert on public.messages
  for each row execute procedure public.handle_new_message();
