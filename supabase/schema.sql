-- DiwaliVerse Supabase setup. Run once in Supabase SQL Editor.
-- Enable Authentication > Providers > Anonymous before using the app.

create table if not exists public.rooms(
 room_code text primary key, mode text not null check(mode in('friends','couple')),
 owner_id uuid not null references auth.users(id) on delete cascade, created_at timestamptz not null default now()
);
create table if not exists public.room_members(
 room_code text not null references public.rooms(room_code) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null default 'Friend', hue integer not null default 0, joined_at timestamptz not null default now(),
 primary key(room_code,user_id)
);
create table if not exists public.room_state(
 room_code text not null references public.rooms(room_code) on delete cascade,
 state_key text not null, value jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now(),
 primary key(room_code,state_key)
);
create table if not exists public.room_events(
 id bigint generated always as identity primary key,
 room_code text not null references public.rooms(room_code) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 event_type text not null check(event_type in('chat','rangoli','fire')),
 payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists room_events_room_created_idx on public.room_events(room_code,created_at);

-- Couple rooms allow 2 people; Friends rooms allow 12.
create or replace function public.diwali_check_capacity() returns trigger
language plpgsql security invoker set search_path=public as $$
declare
  m text;
  n integer;
  room_limit integer;
begin
  perform pg_advisory_xact_lock(hashtext(new.room_code));
  select mode into m from public.rooms where room_code = new.room_code;
  select count(*) into n from public.room_members where room_code = new.room_code;
  if m = 'couple' then room_limit := 2; else room_limit := 12; end if;
  if not exists (select 1 from public.room_members where room_code = new.room_code and user_id = new.user_id)
     and n >= room_limit then
    raise exception 'This room is full.';
  end if;
  return new;
end $$;
drop trigger if exists diwali_room_capacity on public.room_members;
create trigger diwali_room_capacity before insert or update of room_code,user_id on public.room_members
for each row execute function public.diwali_check_capacity();

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_state enable row level security;
alter table public.room_events enable row level security;

drop policy if exists "rooms readable by guests" on public.rooms;
create policy "rooms readable by guests" on public.rooms for select to authenticated using(true);
drop policy if exists "guests create rooms" on public.rooms;
create policy "guests create rooms" on public.rooms for insert to authenticated with check(owner_id=auth.uid());

-- Members list is needed for room discovery/scoreboard. Room codes are high-entropy invite codes.
drop policy if exists "members readable" on public.room_members;
create policy "members readable" on public.room_members for select to authenticated using(true);
drop policy if exists "join as self" on public.room_members;
create policy "join as self" on public.room_members for insert to authenticated with check(user_id=auth.uid());
drop policy if exists "update own membership" on public.room_members;
create policy "update own membership" on public.room_members for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "leave own membership" on public.room_members;
create policy "leave own membership" on public.room_members for delete to authenticated using(user_id=auth.uid());

drop policy if exists "members read state" on public.room_state;
create policy "members read state" on public.room_state for select to authenticated using(exists(
 select 1 from public.room_members m where m.room_code=room_state.room_code and m.user_id=auth.uid()
));
drop policy if exists "members write state" on public.room_state;
create policy "members write state" on public.room_state for all to authenticated
using(exists(select 1 from public.room_members m where m.room_code=room_state.room_code and m.user_id=auth.uid()))
with check(exists(select 1 from public.room_members m where m.room_code=room_state.room_code and m.user_id=auth.uid()));

drop policy if exists "members read events" on public.room_events;
create policy "members read events" on public.room_events for select to authenticated using(exists(
 select 1 from public.room_members m where m.room_code=room_events.room_code and m.user_id=auth.uid()
));
drop policy if exists "members insert events" on public.room_events;
create policy "members insert events" on public.room_events for insert to authenticated with check(
 sender_id=auth.uid() and exists(select 1 from public.room_members m where m.room_code=room_events.room_code and m.user_id=auth.uid())
);

-- Atomic diya and sprint updates.
create or replace function public.diwali_update_lit(p_room_code text,p_user_id uuid,p_set_to bigint default null,p_add bigint default 0)
returns void language plpgsql security invoker set search_path=public as $$
declare v bigint;
begin
 if p_user_id<>auth.uid() or not exists(select 1 from public.room_members where room_code=p_room_code and user_id=auth.uid()) then raise exception 'not a room member'; end if;
 insert into public.room_state(room_code,state_key,value) values(p_room_code,'players','{}'::jsonb) on conflict do nothing;
 select coalesce((value #>> array[p_user_id::text,'lit'])::bigint,0) into v from public.room_state
 where room_code=p_room_code and state_key='players' for update;
 v:=greatest(0,least(1000000000000,case when p_set_to is null then v+greatest(0,p_add) else p_set_to end));
 update public.room_state set value=jsonb_set(value,array[p_user_id::text],coalesce(value->p_user_id::text,'{}'::jsonb)||jsonb_build_object('lit',v),true),updated_at=now()
 where room_code=p_room_code and state_key='players';
end $$;

create or replace function public.diwali_blow_lit(p_room_code text,p_target_id uuid,p_amount bigint default null)
returns bigint language plpgsql security invoker set search_path=public as $$
declare v bigint; removed bigint;
begin
 if not exists(select 1 from public.room_members where room_code=p_room_code and user_id=auth.uid())
 or not exists(select 1 from public.room_members where room_code=p_room_code and user_id=p_target_id) then raise exception 'not a room member'; end if;
 insert into public.room_state(room_code,state_key,value) values(p_room_code,'players','{}'::jsonb) on conflict do nothing;
 select coalesce((value #>> array[p_target_id::text,'lit'])::bigint,0) into v from public.room_state
 where room_code=p_room_code and state_key='players' for update;
 removed:=least(v,case when p_amount is null then v else greatest(0,p_amount) end); v:=greatest(0,v-removed);
 update public.room_state set value=jsonb_set(value,array[p_target_id::text],coalesce(value->p_target_id::text,'{}'::jsonb)||jsonb_build_object('lit',v),true),updated_at=now()
 where room_code=p_room_code and state_key='players';
 return removed;
end $$;

create or replace function public.diwali_race_tap(p_room_code text,p_user_id uuid)
returns void language plpgsql security invoker set search_path=public as $$
declare s jsonb;
begin
 if p_user_id<>auth.uid() or not exists(select 1 from public.room_members where room_code=p_room_code and user_id=auth.uid()) then raise exception 'not a room member'; end if;
 insert into public.room_state(room_code,state_key,value) values(p_room_code,'raceScores','{}'::jsonb) on conflict do nothing;
 select value into s from public.room_state where room_code=p_room_code and state_key='raceScores' for update;
 update public.room_state set value=jsonb_set(s,array[p_user_id::text],to_jsonb(coalesce((s->>p_user_id::text)::bigint,0)+1),true),updated_at=now()
 where room_code=p_room_code and state_key='raceScores';
 perform public.diwali_update_lit(p_room_code,p_user_id,null,1);
end $$;

grant usage on schema public to authenticated;
grant select,insert on public.rooms to authenticated;
grant select,insert,update,delete on public.room_members to authenticated;
grant select,insert,update,delete on public.room_state to authenticated;
grant select,insert on public.room_events to authenticated;
grant execute on function public.diwali_update_lit(text,uuid,bigint,bigint) to authenticated;
grant execute on function public.diwali_blow_lit(text,uuid,bigint) to authenticated;
grant execute on function public.diwali_race_tap(text,uuid) to authenticated;

do $$ begin alter publication supabase_realtime add table public.room_members;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.room_state;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.room_events;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- Restrict room-member visibility to people already in that room without recursive RLS.
create or replace function public.diwali_is_room_member(p_room_code text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.room_members where room_code=p_room_code and user_id=auth.uid())
$$;
grant execute on function public.diwali_is_room_member(text) to authenticated;

create or replace function public.diwali_check_capacity() returns trigger
language plpgsql security definer set search_path=public as $$
declare
  m text;
  n integer;
  room_limit integer;
begin
  perform pg_advisory_xact_lock(hashtext(new.room_code));
  select mode into m from public.rooms where room_code = new.room_code;
  select count(*) into n from public.room_members where room_code = new.room_code;
  if m = 'couple' then room_limit := 2; else room_limit := 12; end if;
  if not exists (select 1 from public.room_members where room_code = new.room_code and user_id = new.user_id)
     and n >= room_limit then
    raise exception 'This room is full.';
  end if;
  return new;
end $$;

drop policy if exists "members readable" on public.room_members;
create policy "members readable" on public.room_members for select to authenticated
using(public.diwali_is_room_member(room_code));
drop policy if exists "members read state" on public.room_state;
create policy "members read state" on public.room_state for select to authenticated
using(public.diwali_is_room_member(room_code));
drop policy if exists "members write state" on public.room_state;
create policy "members write state" on public.room_state for all to authenticated
using(public.diwali_is_room_member(room_code)) with check(public.diwali_is_room_member(room_code));
drop policy if exists "members read events" on public.room_events;
create policy "members read events" on public.room_events for select to authenticated
using(public.diwali_is_room_member(room_code));
drop policy if exists "members insert events" on public.room_events;
create policy "members insert events" on public.room_events for insert to authenticated
with check(sender_id=auth.uid() and public.diwali_is_room_member(room_code));


-- Allow either participant in a Couple room to light their partner's diya board.
-- Friends rooms remain unchanged: this cross-board action is Couple-only.
create or replace function public.diwali_partner_update_lit(
  p_room_code text,
  p_target_id uuid,
  p_set_to bigint default null,
  p_add bigint default 0
)
returns void
language plpgsql
security invoker
set search_path=public
as $$
declare
  v bigint;
begin
  if p_target_id = auth.uid()
     or not exists (select 1 from public.rooms r where r.room_code=p_room_code and r.mode='couple')
     or not exists (select 1 from public.room_members m where m.room_code=p_room_code and m.user_id=auth.uid())
     or not exists (select 1 from public.room_members m where m.room_code=p_room_code and m.user_id=p_target_id) then
    raise exception 'Partner diya actions are available only to your partner in a Couple room.';
  end if;

  insert into public.room_state(room_code,state_key,value) values(p_room_code,'players','{}'::jsonb)
  on conflict do nothing;

  select coalesce((value #>> array[p_target_id::text,'lit'])::bigint,0) into v
  from public.room_state where room_code=p_room_code and state_key='players' for update;

  v := greatest(0, least(1000000000000,
    case when p_set_to is null then v + greatest(0,coalesce(p_add,0))
    else greatest(0,p_set_to) end
  ));

  update public.room_state
  set value=jsonb_set(value,array[p_target_id::text],
    coalesce(value->p_target_id::text,'{}'::jsonb)||jsonb_build_object('lit',v),true),
    updated_at=now()
  where room_code=p_room_code and state_key='players';
end;
$$;

grant execute on function public.diwali_partner_update_lit(text,uuid,bigint,bigint) to authenticated;


-- Individual diya control + persisted flame styles.
-- Run once in Supabase SQL Editor after schema.sql / partner_diya.sql.

create or replace function public.diwali_diya_action(
  p_room_code text,
  p_target_id uuid,
  p_index bigint default null,
  p_action text default 'light',
  p_flame text default null
)
returns jsonb
language plpgsql
security invoker
set search_path=public
as $$
declare
  v jsonb;
  holes jsonb;
  extras jsonb;
  p bigint;
  idx bigint;
  k text;
  lit_count bigint;
  m text;
  result jsonb;
begin
  if p_action not in ('light','blow','flame') then
    raise exception 'Invalid diya action.';
  end if;
  if not exists(select 1 from public.room_members where room_code=p_room_code and user_id=auth.uid()) then
    raise exception 'You are not a member of this room.';
  end if;
  if not exists(select 1 from public.room_members where room_code=p_room_code and user_id=p_target_id) then
    raise exception 'That player is not in this room.';
  end if;
  if p_target_id <> auth.uid() and p_action <> 'blow' then
    select mode into m from public.rooms where room_code=p_room_code;
    if m <> 'couple' then
      raise exception 'Only Couple room partners can change each other’s diya board.';
    end if;
  end if;

  insert into public.room_state(room_code,state_key,value)
  values(p_room_code,'players','{}'::jsonb) on conflict do nothing;
  select coalesce(value->p_target_id::text,'{}'::jsonb) into v
  from public.room_state where room_code=p_room_code and state_key='players' for update;

  if p_action='flame' then
    if p_flame not in ('natural','rainbow','blue','pink','green','violet') then
      raise exception 'Invalid flame style.';
    end if;
    result := v || jsonb_build_object('flame',p_flame);
  else
    if p_index is null or p_index < 0 or p_index > 1000000000000 then
      raise exception 'Invalid diya number.';
    end if;
    idx := p_index;
    k := idx::text;
    p := greatest(0,coalesce((v->>'p')::bigint,(v->>'lit')::bigint,0));
    holes := coalesce(v->'holes','{}'::jsonb);
    extras := coalesce(v->'extras','{}'::jsonb);

    if p_action='light' then
      if idx < p then
        holes := holes - k;
      elsif idx = p then
        p := p + 1;
        while extras ? p::text loop
          extras := extras - p::text;
          p := p + 1;
        end loop;
      else
        extras := jsonb_set(extras,array[k],'true'::jsonb,true);
      end if;
    else
      if idx < p then
        holes := jsonb_set(holes,array[k],'true'::jsonb,true);
        while p > 0 and holes ? (p-1)::text loop
          holes := holes - (p-1)::text;
          p := p - 1;
        end loop;
      else
        extras := extras - k;
      end if;
    end if;

    lit_count := greatest(0,p - jsonb_object_length(holes) + jsonb_object_length(extras));
    result := v || jsonb_build_object('p',p,'lit',lit_count,'holes',holes,'extras',extras);
  end if;

  update public.room_state
  set value=jsonb_set(value,array[p_target_id::text],result,true),updated_at=now()
  where room_code=p_room_code and state_key='players';
  return result;
end;
$$;

grant execute on function public.diwali_diya_action(text,uuid,bigint,text,text) to authenticated;

-- Keep older bulk controls compatible with the sparse individual-diya model.
create or replace function public.diwali_update_lit(p_room_code text,p_user_id uuid,p_set_to bigint default null,p_add bigint default 0)
returns void language plpgsql security invoker set search_path=public as $$
declare v bigint;
begin
 if p_user_id<>auth.uid() or not exists(select 1 from public.room_members where room_code=p_room_code and user_id=auth.uid()) then raise exception 'not a room member'; end if;
 insert into public.room_state(room_code,state_key,value) values(p_room_code,'players','{}'::jsonb) on conflict do nothing;
 select coalesce((value #>> array[p_user_id::text,'lit'])::bigint,0) into v from public.room_state
 where room_code=p_room_code and state_key='players' for update;
 v:=greatest(0,least(1000000000000,case when p_set_to is null then v+greatest(0,p_add) else p_set_to end));
 update public.room_state set value=jsonb_set(value,array[p_user_id::text],
   (coalesce(value->p_user_id::text,'{}'::jsonb) - 'holes' - 'extras' - 'p') || jsonb_build_object('p',v,'lit',v,'holes','{}'::jsonb,'extras','{}'::jsonb),true),
   updated_at=now()
 where room_code=p_room_code and state_key='players';
end $$;

create or replace function public.diwali_partner_update_lit(
 p_room_code text,p_target_id uuid,p_set_to bigint default null,p_add bigint default 0
) returns void language plpgsql security invoker set search_path=public as $$
declare v bigint;
begin
 if p_target_id=auth.uid()
 or not exists(select 1 from public.rooms where room_code=p_room_code and mode='couple')
 or not exists(select 1 from public.room_members where room_code=p_room_code and user_id=auth.uid())
 or not exists(select 1 from public.room_members where room_code=p_room_code and user_id=p_target_id)
 then raise exception 'Partner diya actions are available only to your partner in a Couple room.'; end if;
 insert into public.room_state(room_code,state_key,value) values(p_room_code,'players','{}'::jsonb) on conflict do nothing;
 select coalesce((value #>> array[p_target_id::text,'lit'])::bigint,0) into v from public.room_state
 where room_code=p_room_code and state_key='players' for update;
 v:=greatest(0,least(1000000000000,case when p_set_to is null then v+greatest(0,p_add) else p_set_to end));
 update public.room_state set value=jsonb_set(value,array[p_target_id::text],
   (coalesce(value->p_target_id::text,'{}'::jsonb) - 'holes' - 'extras' - 'p') || jsonb_build_object('p',v,'lit',v,'holes','{}'::jsonb,'extras','{}'::jsonb),true),
   updated_at=now()
 where room_code=p_room_code and state_key='players';
end $$;
grant execute on function public.diwali_partner_update_lit(text,uuid,bigint,bigint) to authenticated;

create or replace function public.diwali_blow_lit(p_room_code text,p_target_id uuid,p_amount bigint default null)
returns bigint language plpgsql security invoker set search_path=public as $$
declare v bigint; removed bigint;
begin
 if not exists(select 1 from public.room_members where room_code=p_room_code and user_id=auth.uid())
 or not exists(select 1 from public.room_members where room_code=p_room_code and user_id=p_target_id) then raise exception 'not a room member'; end if;
 insert into public.room_state(room_code,state_key,value) values(p_room_code,'players','{}'::jsonb) on conflict do nothing;
 select coalesce((value #>> array[p_target_id::text,'lit'])::bigint,0) into v from public.room_state
 where room_code=p_room_code and state_key='players' for update;
 removed:=least(v,case when p_amount is null then v else greatest(0,p_amount) end); v:=greatest(0,v-removed);
 update public.room_state set value=jsonb_set(value,array[p_target_id::text],
   (coalesce(value->p_target_id::text,'{}'::jsonb) - 'holes' - 'extras' - 'p') || jsonb_build_object('p',v,'lit',v,'holes','{}'::jsonb,'extras','{}'::jsonb),true),
   updated_at=now()
 where room_code=p_room_code and state_key='players';
 return removed;
end $$;
grant execute on function public.diwali_blow_lit(text,uuid,bigint) to authenticated;
