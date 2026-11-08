-- DiwaliVerse account + friend connection system.
-- Run once in Supabase SQL Editor. Keep the existing rooms/room_members tables for the live Diya experience.

create table if not exists public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default 'Diwali Friend',
 current_room text,
 updated_at timestamptz not null default now(),
 created_at timestamptz not null default now()
);
alter table public.profiles drop column if exists email;
create table if not exists public.connection_requests(
 id bigint generated always as identity primary key,
 sender_id uuid not null references auth.users(id) on delete cascade,
 receiver_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending' check(status in('pending','accepted','rejected')),
 created_at timestamptz not null default now(),
 constraint no_self_request check(sender_id<>receiver_id),
 constraint unique_connection_request unique(sender_id,receiver_id)
);
alter table public.connection_requests drop constraint if exists unique_connection_request;
create unique index if not exists unique_pending_connection_request on public.connection_requests(sender_id,receiver_id) where status='pending';
create table if not exists public.connections(
 id bigint generated always as identity primary key,
 user_a uuid not null references auth.users(id) on delete cascade,
 user_b uuid not null references auth.users(id) on delete cascade,
 room_code text not null unique references public.rooms(room_code) on delete cascade,
 created_at timestamptz not null default now(),
 constraint ordered_connection check(user_a<user_b),
 constraint unique_connection_pair unique(user_a,user_b)
);
alter table public.profiles enable row level security;
alter table public.connection_requests enable row level security;
alter table public.connections enable row level security;
drop policy if exists "profiles visible to members" on public.profiles;
create policy "profiles visible to members" on public.profiles for select to authenticated using(true);
drop policy if exists "profile insert self" on public.profiles;
create policy "profile insert self" on public.profiles for insert to authenticated with check(id=auth.uid());
drop policy if exists "profile update self" on public.profiles;
create policy "profile update self" on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
drop policy if exists "requests visible to participants" on public.connection_requests;
create policy "requests visible to participants" on public.connection_requests for select to authenticated using(sender_id=auth.uid() or receiver_id=auth.uid());
drop policy if exists "send own request" on public.connection_requests;
create policy "send own request" on public.connection_requests for insert to authenticated with check(sender_id=auth.uid() and receiver_id<>auth.uid() and status='pending');
drop policy if exists "recipient responds" on public.connection_requests;
create policy "recipient responds" on public.connection_requests for update to authenticated using(receiver_id=auth.uid() and status='pending') with check(receiver_id=auth.uid() and status in('accepted','rejected'));
drop policy if exists "connections visible to participants" on public.connections;
create policy "connections visible to participants" on public.connections for select to authenticated using(user_a=auth.uid() or user_b=auth.uid());
grant usage on schema public to authenticated;
grant select,insert,update on public.profiles to authenticated;
grant select,insert,update on public.connection_requests to authenticated;
grant select on public.connections to authenticated;

create or replace function public.diwali_accept_connection(p_request_id bigint)
returns text language plpgsql security definer set search_path=public as $$
declare r public.connection_requests%rowtype; a uuid; b uuid; code text;
begin
 select * into r from public.connection_requests where id=p_request_id for update;
 if not found or r.receiver_id<>auth.uid() or r.status<>'pending' then raise exception 'Request not available'; end if;
 a:=least(r.sender_id,r.receiver_id); b:=greatest(r.sender_id,r.receiver_id);
 select room_code into code from public.connections where user_a=a and user_b=b;
 if code is null then
   code:='DV-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
   insert into public.rooms(room_code,mode,owner_id) values(code,'couple',auth.uid());
   insert into public.connections(user_a,user_b,room_code) values(a,b,code);
 end if;
 update public.connection_requests set status='accepted' where id=p_request_id;
 return code;
end $$;
grant execute on function public.diwali_accept_connection(bigint) to authenticated;

-- Make profiles discoverable in realtime and show when a member is currently in a Diya room.
do $$ begin alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.connection_requests;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.connections;
exception when duplicate_object then null; when undefined_object then null; end $$;
