-- Allow users to update messages in their conversations (e.g. to mark as read)
create policy "Users can update messages in their conversations"
  on public.messages for update
  using (
    exists (
      select 1 from public.conversations
      where id = conversation_id
      and (buyer_id = auth.uid() or seller_id = auth.uid())
    )
  );
