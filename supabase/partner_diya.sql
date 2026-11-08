
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
