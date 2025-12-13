-- Add deleted_by_buyer and deleted_by_seller columns to conversations
alter table public.conversations 
add column if not exists deleted_by_buyer boolean default false,
add column if not exists deleted_by_seller boolean default false;

-- Index for performance (optional but good for filtering)
create index if not exists conversations_deleted_buyer_idx on public.conversations(deleted_by_buyer);
create index if not exists conversations_deleted_seller_idx on public.conversations(deleted_by_seller);
