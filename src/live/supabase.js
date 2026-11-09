import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { clampLit } from './common.js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabaseReady = Boolean(url && key)
export const supabase = supabaseReady ? createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
  realtime: { params: { eventsPerSecond: 20 } }
}) : null

const hueOf = uid => Math.abs([...uid].reduce((a,c)=>(a*31+c.charCodeAt(0))|0,7))%360
const safe = p => p?.catch?.(e => console.warn('[diwali]', e.message || e))
const explain = e => {
  const m = String(e?.message || e || '')
  if (!supabaseReady) return 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel, then redeploy.'
  if (/anonymous|signups not allowed/i.test(m)) return 'Enable Anonymous sign-ins in Supabase Authentication settings. ' + m
  // Keep the real Postgres/PostgREST error visible instead of replacing every
  // RLS/permission failure with a misleading instruction to rerun the schema.
  const details = [e?.code && `Code: ${e.code}`, e?.details && `Details: ${e.details}`, e?.hint && `Hint: ${e.hint}`]
    .filter(Boolean).join(' | ')
  return [m, details].filter(Boolean).join(' — ') || 'Could not connect to Supabase.'
}
async function guest() {
  if (!supabase) throw new Error(explain())
  const { data:{session}, error } = await supabase.auth.getSession()
  if (error) throw error
  if (!session?.user) throw new Error('Please login or register before entering a Diya room.')
  return session.user
}
async function event(room, uid, type, payload) {
  const { error } = await supabase.from('room_events').insert({ room_code:room, sender_id:uid, event_type:type, payload })
  if (error) throw error
}
async function state(room, key, value) {
  const { error } = await supabase.from('room_state').upsert({ room_code:room, state_key:key, value }, { onConflict:'room_code,state_key' })
  if (error) throw error
}

export function useRoom(cfg, onMsg) {
  const [status,setStatus]=useState('idle'), [users,setUsers]=useState([]), [online,setOnline]=useState({})
  const [me,setMe]=useState(null), [err,setErr]=useState(''), [fails,setFails]=useState(0), [offset]=useState(0)
  const cb=useRef(onMsg); cb.current=onMsg
  const ctx=useRef(null)
  // Serialize room mutations so rapid diya taps cannot race each other or
  // overwrite a newer board snapshot with an older in-flight update.
  const actionQueue=useRef(Promise.resolve())

  useEffect(()=>{
    let dead=false, channel=null, heartbeat=0
    setErr(''); setFails(0); ctx.current=null
    if(!cfg){setStatus('idle');setUsers([]);setOnline({});setMe(null);return}
    const emit=m=>{if(!dead)cb.current(m)}
    const loadMembers=async()=>{
      const {data,error}=await supabase.from('room_members').select('user_id,name,hue').eq('room_code',cfg.room)
      if(error)throw error
      if(!dead)setUsers((data||[]).map(x=>({id:x.user_id,name:x.name||'Friend',hue:x.hue||0})))
    }
    ;(async()=>{
      try{
        setStatus('connecting')
        const user=await guest(), uid=user.id, room=cfg.room
        const {data:existing,error:findError}=await supabase.from('rooms').select('room_code,mode').eq('room_code',room).maybeSingle()
        if(findError)throw findError
        let roomRow=existing
        if(!roomRow){
          if(cfg.intent==='join')throw new Error('No room found with this code. Ask the host to create it first.')
          const {data,error}=await supabase.from('rooms').insert({room_code:room,mode:cfg.mode,owner_id:uid}).select().single()
          if(error)throw error
          roomRow=data
        }
        const {error:memberError}=await supabase.from('room_members').upsert({room_code:room,user_id:uid,name:cfg.name,hue:hueOf(uid)},{onConflict:'room_code,user_id'})
        if(memberError)throw memberError
        if(dead)return
        ctx.current={room,uid,name:cfg.name,channel:null}
        await supabase.from('profiles').update({current_room:room,updated_at:new Date().toISOString()}).eq('id',uid)
        setMe(uid); emit({t:'init',id:uid,mode:roomRow.mode})
        await loadMembers()
        const {data:rows,error:stateError}=await supabase.from('room_state').select('state_key,value').eq('room_code',room)
        if(stateError)throw stateError
        const values=Object.fromEntries((rows||[]).map(x=>[x.state_key,x.value]))
        emit({t:'players',players:values.players||{}})
        emit({t:'race',race:values.race||null})
        emit({t:'raceScores',scores:values.raceScores||{}})
        const {data:rangoliRows,error:rangoliError}=await supabase.from('room_events').select('payload')
          .eq('room_code',room).eq('event_type','rangoli').order('id',{ascending:true}).limit(500)
        if(rangoliError)throw rangoliError
        for(const row of rangoliRows||[])if(Array.isArray(row.payload?.list))emit({t:'stamps',list:row.payload.list})
        const since=new Date().toISOString()
        const {data:chats,error:chatError}=await supabase.from('room_events').select('id,sender_id,payload,created_at')
          .eq('room_code',room).eq('event_type','chat').gte('created_at',since).order('id').limit(200)
        if(chatError)throw chatError
        for(const x of chats||[]){const p=x.payload||{};emit({t:'chat',id:String(x.id),from:x.sender_id,name:p.name,text:p.text,kind:p.kind||'msg',to:p.to,at:new Date(x.created_at).getTime()})}

        channel=supabase.channel('diwali-room-'+room,{config:{presence:{key:uid},broadcast:{self:false}}})
        const typing={}
        channel.on('presence',{event:'sync'},()=>{
          const next={};Object.entries(channel.presenceState()).forEach(([id,list])=>next[id]=Boolean(list?.length))
          if(!dead)setOnline(next)
        })
        channel.on('broadcast',{event:'typing'},({payload})=>{
          if(payload.value)typing[payload.id]=true;else delete typing[payload.id]
          emit({t:'typing',typing:{...typing}})
        })
        channel.on('postgres_changes',{event:'*',schema:'public',table:'room_members',filter:'room_code=eq.'+room},()=>safe(loadMembers()))
        channel.on('postgres_changes',{event:'*',schema:'public',table:'room_state',filter:'room_code=eq.'+room},({new:row,old})=>{
          const k=row?.state_key||old?.state_key,v=row?.value
          if(k==='players')emit({t:'players',players:v||{}})
          if(k==='race')emit({t:'race',race:v||null})
          if(k==='raceScores')emit({t:'raceScores',scores:v||{}})
          if(k==='rangoli_epoch')emit({t:'rclear'})
        })
        channel.on('postgres_changes',{event:'INSERT',schema:'public',table:'room_events',filter:'room_code=eq.'+room},({new:row})=>{
          const p=row.payload||{}
          if(row.event_type==='chat')emit({t:'chat',id:String(row.id),from:row.sender_id,name:p.name,text:p.text,kind:p.kind||'msg',to:p.to,at:new Date(row.created_at).getTime()})
          if(row.event_type==='rangoli'&&Array.isArray(p.list))emit({t:'stamps',list:p.list})
          if(row.event_type==='fire'&&row.sender_id!==uid&&Date.now()-new Date(row.created_at).getTime()<5000)emit({t:'fire',x:p.x,y:p.y,kind:p.kind,hue:p.hue})
        })
        channel.subscribe(async s=>{
          if(s==='SUBSCRIBED'){
            await channel.track({name:cfg.name,hue:hueOf(uid),online_at:new Date().toISOString()})
            if(!dead){setStatus('live');setFails(0)}
          }else if(s==='CHANNEL_ERROR'||s==='TIMED_OUT'){if(!dead){setStatus('reconnecting');setFails(v=>v+1)}}
          else if(s==='CLOSED'&&!dead)setStatus('reconnecting')
        })
        ctx.current.channel=channel
      }catch(e){if(!dead){setErr(explain(e));setStatus('idle')}}
    })()
    return ()=>{
      dead=true
      clearInterval(heartbeat)
      if(channel){safe(channel.untrack());safe(supabase.removeChannel(channel))}
      const c=ctx.current
      if(c){safe(supabase.from('room_members').delete().eq('room_code',c.room).eq('user_id',c.uid));safe(supabase.from('profiles').update({current_room:null,updated_at:new Date().toISOString()}).eq('id',c.uid))}
      ctx.current=null
    }
  },[cfg])

  const send=useCallback(m=>{
    const c=ctx.current;if(!c)return
    const {room,uid,name,channel}=c
    const run=async()=>{
      switch(m.t){
        case 'stamps': await event(room,uid,'rangoli',{list:m.list});break
        case 'rclear': {
          const {data,error}=await supabase.from('room_state').select('value').eq('room_code',room).eq('state_key','rangoli_epoch').maybeSingle()
          if(error)throw error
          await state(room,'rangoli_epoch',Number(data?.value||0)+1);break
        }
        case 'fire': await event(room,uid,'fire',{x:m.x,y:m.y,kind:m.kind,hue:m.hue});break
        case 'chat': await event(room,uid,'chat',{name,text:String(m.text||'').slice(0,400),kind:m.kind||'msg',to:m.to||null});break
        case 'typing': if(channel)await channel.send({type:'broadcast',event:'typing',payload:{id:uid,value:Boolean(m.v)}});break
        case 'lit': {
          const {error}=await supabase.rpc('diwali_update_lit',{p_room_code:room,p_user_id:uid,p_set_to:m.set==null?null:clampLit(m.set),p_add:m.set==null?clampLit(m.add):0})
          if(error)throw error;break
        }
        case 'blow': {
          const {data,error}=await supabase.rpc('diwali_blow_lit',{p_room_code:room,p_target_id:m.target,p_amount:m.all?null:clampLit(m.n)})
          if(error)throw error
          if(Number(data)>0)await event(room,uid,'chat',{name,to:m.target,kind:'sys',text:`blew out ${Number(data).toLocaleString('en-IN')} of ${m.targetName||'their'}'s diyas 💨`})
          break
        }
        case 'diya': {
          const {error}=await supabase.rpc('diwali_diya_action',{
            p_room_code:room,p_target_id:m.target,p_index:m.index??null,
            p_action:m.action,p_flame:m.flame??null
          })
          if(error)throw error;break
        }
        case 'partnerLit': {
          const {error}=await supabase.rpc('diwali_partner_update_lit',{
            p_room_code:room,p_target_id:m.target,
            p_set_to:m.set==null?null:clampLit(m.set),
            p_add:m.set==null?clampLit(m.add):0
          })
          if(error)throw error
          break
        }
        case 'raceTap': {
          const {error}=await supabase.rpc('diwali_race_tap',{p_room_code:room,p_user_id:uid})
          if(error)throw error;break
        }
        case 'race': await state(room,'race',{start:Date.now()+3000,dur:60000,by:uid});await state(room,'raceScores',{});break
        case 'quit': await supabase.from('room_members').delete().eq('room_code',room).eq('user_id',uid);break
        default:break
      }
    }
    // Chat, typing, fireworks and Rangoli inserts must not wait behind a
    // long queue of diya mutations or bulk actions.
    if (m.t === 'chat' || m.t === 'typing' || m.t === 'fire' || m.t === 'stamps') {
      const task = Promise.resolve().then(run)
      safe(task)
      return task
    }
    const task=actionQueue.current.then(run,run)
    actionQueue.current=task.catch(()=>{})
    safe(task)
    return task
  },[])
  return {status,users,online,me,err,fails,offset,send}
}
