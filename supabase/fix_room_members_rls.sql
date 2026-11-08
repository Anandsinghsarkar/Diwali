-- Definitive repair for room_members RLS error 42501.
-- Run the ENTIRE file in Supabase Dashboard > SQL Editor as project owner.

alter table public.room_members enable row level security;

-- SECURITY DEFINER prevents recursive RLS when checking whether a user is in a room.
create or replace function public.diwali_is_room_member(p_room_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.room_members
    where room_code = p_room_code and user_id = auth.uid()
  );
$$;
grant execute on function public.diwali_is_room_member(text) to authenticated;

-- Remove every existing room_members policy to avoid stale/overly restrictive rules.
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'room_members'
  loop
    execute format('drop policy if exists %I on public.room_members', p.policyname);
  end loop;
end $$;

-- Own membership is always readable; other members are visible only inside a shared room.
create policy "diwali_members_select"
on public.room_members for select to authenticated
using (user_id = auth.uid() or public.diwali_is_room_member(room_code));

-- INSERT path of INSERT ... ON CONFLICT DO UPDATE (upsert).
create policy "diwali_members_insert_self"
on public.room_members for insert to authenticated
with check (auth.uid() is not null and user_id = auth.uid());

-- UPDATE path of upsert when the user's membership row already exists.
create policy "diwali_members_update_self"
on public.room_members for update to authenticated
using (auth.uid() is not null and user_id = auth.uid())
with check (auth.uid() is not null and user_id = auth.uid());

create policy "diwali_members_delete_self"
on public.room_members for delete to authenticated
using (auth.uid() is not null and user_id = auth.uid());

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.room_members to authenticated;

-- Diagnostic output: verify the four policies are present.
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'room_members'
order by policyname;
