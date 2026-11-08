-- Repair room_members RLS policies for DiwaliVerse.
-- Run this in Supabase SQL Editor. It preserves RLS and does NOT grant public/anon access.

alter table public.room_members enable row level security;

do $$
declare p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'room_members'
  loop
    execute format('drop policy if exists %I on public.room_members', p.policyname);
  end loop;
end $$;

-- A signed-in (including Supabase anonymous-auth) user can only add/update/delete
-- their own membership. Room membership lists remain visible only to room members.
create policy "diwali_members_select" on public.room_members
  for select to authenticated
  using (public.diwali_is_room_member(room_code));

create policy "diwali_members_insert_self" on public.room_members
  for insert to authenticated
  with check (auth.uid() is not null and user_id = auth.uid());

create policy "diwali_members_update_self" on public.room_members
  for update to authenticated
  using (auth.uid() is not null and user_id = auth.uid())
  with check (auth.uid() is not null and user_id = auth.uid());

create policy "diwali_members_delete_self" on public.room_members
  for delete to authenticated
  using (auth.uid() is not null and user_id = auth.uid());

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.room_members to authenticated;
grant execute on function public.diwali_is_room_member(text) to authenticated;
