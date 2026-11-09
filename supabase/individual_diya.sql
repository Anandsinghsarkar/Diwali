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
  action_to_apply text;
begin
  if p_action not in ('light','blow','toggle','flame') then
    raise exception 'Invalid diya action.';
  end if;
  if not exists(select 1 from public.room_members where room_code=p_room_code and user_id=auth.uid()) then
    raise exception 'You are not a member of this room.';
  end if;
  if not exists(select 1 from public.room_members where room_code=p_room_code and user_id=p_target_id) then
    raise exception 'That player is not in this room.';
  end if;
  if p_target_id <> auth.uid() and p_action not in ('blow') then
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

    -- Decide toggle from the locked, latest database state, not a possibly
    -- stale browser snapshot. This makes rapid taps reliably reversible.
    action_to_apply := p_action;
    if p_action='toggle' then
      if (idx < p and not (holes ? k)) or (idx >= p and extras ? k) then
        action_to_apply := 'blow';
      else
        action_to_apply := 'light';
      end if;
    end if;

    if action_to_apply='light' then
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
