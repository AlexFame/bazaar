-- Allow users to update conversations they are part of (e.g. to mark as deleted for themselves)
create policy "Users can update their own conversations"
  on public.conversations for update
  using (auth.uid() = buyer_id or auth.uid() = seller_id);
