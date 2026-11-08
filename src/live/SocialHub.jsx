import React,{useCallback,useEffect,useState} from 'react'
import {supabaseReady,supabase} from './supabase.js'
import './social.css'

const msg=e=>e?.message||'Something went wrong.'
const goRoom=(room,name)=>{localStorage.setItem('dv-name',name);localStorage.removeItem('dv-room');location.hash='live?room='+encodeURIComponent(room)+'&mode=couple'}
const makeCode=()=> 'DV-'+Math.random().toString(36).slice(2,10).toUpperCase()

export default function SocialHub(){
 const [session,setSession]=useState(null),[loading,setLoading]=useState(true),[mode,setMode]=useState('login')
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState('')
 const [error,setError]=useState(''),[notice,setNotice]=useState('')
 const [profile,setProfile]=useState(null),[people,setPeople]=useState([]),[requests,setRequests]=useState([]),[connections,setConnections]=useState([])
 const [busy,setBusy]=useState(''),[search,setSearch]=useState('')
 const uid=session?.user?.id
 const load=useCallback(async()=>{
  if(!uid)return
  const [me,p,r,c]=await Promise.all([
   supabase.from('profiles').select('*').eq('id',uid).maybeSingle(),
   supabase.from('profiles').select('*').neq('id',uid).order('created_at',{ascending:false}).limit(200),
   supabase.from('connection_requests').select('id,sender_id,receiver_id,status,created_at').or('sender_id.eq.'+uid+',receiver_id.eq.'+uid).order('created_at',{ascending:false}),
   supabase.from('connections').select('id,user_a,user_b,room_code,created_at').or('user_a.eq.'+uid+',user_b.eq.'+uid)
  ])
  for(const x of [me,p,r,c])if(x.error)throw x.error
  setProfile(me.data);setPeople(p.data||[]);setRequests(r.data||[]);setConnections(c.data||[])
 },[uid])
 useEffect(()=>{let alive=true;supabase?.auth.getSession().then(({data})=>{if(alive){setSession(data.session);setLoading(false)}});const {data}=supabase?.auth.onAuthStateChange((_e,s)=>{setSession(s);setLoading(false)})||{data:{subscription:null}};return()=>{alive=false;data.subscription?.unsubscribe()}},[])
 useEffect(()=>{if(!uid)return;let alive=true;load().catch(e=>setError(msg(e)));const ch=supabase.channel('social-'+uid).on('postgres_changes',{event:'*',schema:'public',table:'profiles'},()=>alive&&load().catch(e=>setError(msg(e)))).on('postgres_changes',{event:'*',schema:'public',table:'connection_requests'},()=>alive&&load().catch(e=>setError(msg(e)))).on('postgres_changes',{event:'*',schema:'public',table:'connections'},()=>alive&&load().catch(e=>setError(msg(e)))).subscribe();return()=>{alive=false;supabase.removeChannel(ch)}},[uid,load])
 const submit=async e=>{e.preventDefault();setError('');setNotice('');setBusy('auth');try{
  if(mode==='register'){
   const {data,error}=await supabase.auth.signUp({email:email.trim(),password,options:{data:{display_name:name.trim()}}});if(error)throw error
   if(data.session){await supabase.from('profiles').upsert({id:data.user.id,display_name:name.trim()},{onConflict:'id'});setNotice('Account created. Welcome!')}
   else setNotice('Registration successful. Email confirmation required ho sakta hai; inbox check karke login karo.')
  }else{const {data,error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;await supabase.from('profiles').upsert({id:data.user.id,display_name:data.user.user_metadata?.display_name||email.split('@')[0]},{onConflict:'id'})}
 }catch(e){setError(msg(e))}finally{setBusy('')}
 }
 const act=async(key,fn)=>{setBusy(key);setError('');setNotice('');try{await fn();await load()}catch(e){setError(msg(e))}finally{setBusy('')}}
 const sendRequest=id=>act(id,async()=>{const {error}=await supabase.from('connection_requests').insert({sender_id:uid,receiver_id:id,status:'pending'});if(error)throw error;setNotice('Connection request sent.')})
 const accept=id=>act(id,async()=>{const {data,error}=await supabase.rpc('diwali_accept_connection',{p_request_id:id});if(error)throw error;setNotice('Connected! Ab dono users room join kar sakte hain.')})
 const reject=id=>act(id,async()=>{const {error}=await supabase.from('connection_requests').update({status:'rejected'}).eq('id',id).eq('receiver_id',uid);if(error)throw error})
 const logout=async()=>{await supabase.auth.signOut();setProfile(null);setPeople([]);setConnections([]);setRequests([])}
 const createCustom=()=>act('custom',async()=>{const room=makeCode();const {error}=await supabase.from('rooms').insert({room_code:room,mode:'couple',owner_id:uid});if(error)throw error;goRoom(room,profile?.display_name||'Friend')})
 if(!supabaseReady)return <div className="social-shell"><div className="social-card"><h1>DiwaliVerse</h1><p>Supabase configuration missing. Vercel environment variables check karo.</p></div></div>
 if(loading)return <div className="social-shell"><div className="social-card">Loading…</div></div>
 if(!session)return <div className="social-shell"><form className="social-card auth-card" onSubmit={submit}><span className="social-kicker">DIWALIVERSE COMMUNITY</span><h1>{mode==='login'?'Welcome back':'Create your account'}</h1><p>Register karo, friends discover karo aur Diwali ek saath celebrate karo.</p>
  {mode==='register'&&<label>Display name<input required maxLength="30" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/></label>}
  <label>Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
  <label>Password<input required type="password" minLength="6" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters"/></label>
  {error&&<div className="social-error">{error}</div>}{notice&&<div className="social-notice">{notice}</div>}
  <button className="social-primary" disabled={!!busy}>{busy?'Please wait…':mode==='login'?'Login':'Register'}</button>
  <button type="button" className="social-switch" onClick={()=>{setMode(mode==='login'?'register':'login');setError('');setNotice('')}}>{mode==='login'?"Don't have an account? Register":"Already registered? Login"}</button>
 </form></div>
 const incoming=requests.filter(r=>r.receiver_id===uid&&r.status==='pending'),outgoing=requests.filter(r=>r.sender_id===uid&&r.status==='pending')
 const connectedIds=new Set(connections.map(c=>c.user_a===uid?c.user_b:c.user_a))
 const pendingIds=new Set(requests.filter(r=>r.status==='pending').map(r=>r.sender_id===uid?r.receiver_id:r.sender_id))
 const filtered=people.filter(p=>(p.display_name||'').toLowerCase().includes(search.toLowerCase())&&!connectedIds.has(p.id))
 const display=p=>p?.display_name||p?.email?.split('@')[0]||'Diwali friend'
 return <div className="social-shell"><header className="social-header"><div className="social-logo">🪔 Diwali<span>Verse</span></div><div className="social-header-right"><span>{display(profile)}</span><button onClick={logout}>Logout</button></div></header>
 <main className="social-main"><section className="social-welcome"><div><span className="social-kicker">YOUR FESTIVAL COMMUNITY</span><h1>Celebrate <em>together.</em></h1><p>Discover everyone, send a connection request, and enter the same live Diya room after they accept.</p></div><button className="social-primary custom-room" onClick={createCustom} disabled={!!busy}>{busy==='custom'?'Creating…':'＋ Create custom room'}</button></section>
 {error&&<div className="social-error">{error}</div>}{notice&&<div className="social-notice">{notice}</div>}
 <div className="social-grid"><section className="social-panel"><div className="social-panel-head"><div><h2>People</h2><small>{people.length} registered users</small></div><input className="social-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search people"/></div>
 <div className="social-list">{filtered.map(p=><article className="social-person" key={p.id}><div className="social-avatar">{display(p).slice(0,1).toUpperCase()}</div><div className="social-person-info"><b>{display(p)}</b><small>{p.current_room&&Date.now()-new Date(p.updated_at).getTime()<90000?'🟢 In a Diya room now':'⚪ Not in a room'}</small></div>{connectedIds.has(p.id)?null:pendingIds.has(p.id)?<button disabled className="social-muted-btn">Request pending</button>:<button className="social-connect" disabled={!!busy} onClick={()=>sendRequest(p.id)}>Connect</button>}</article>)}{!filtered.length&&<p className="social-empty">No other members found yet.</p>}</div></section>
 <aside className="social-side"><section className="social-panel"><h2>Connection requests <small className="social-count">{incoming.length}</small></h2>{incoming.length?incoming.map(r=><article className="social-request" key={r.id}><b>{display(people.find(p=>p.id===r.sender_id))}</b><div><button className="social-primary mini" disabled={!!busy} onClick={()=>accept(r.id)}>Accept & connect</button><button className="social-muted-btn" onClick={()=>reject(r.id)}>Decline</button></div></article>):<p className="social-empty">No incoming requests.</p>}{outgoing.length>0&&<p className="social-subtle">{outgoing.length} request(s) waiting for acceptance.</p>}</section>
 <section className="social-panel"><h2>Your connections</h2>{connections.length?connections.map(c=>{const id=c.user_a===uid?c.user_b:c.user_a,p=people.find(x=>x.id===id);return <article className="social-request" key={c.id}><div><b>{display(p)}</b><small>{p?.current_room?'🟢 In a Diya room':'Connected'}</small></div><button className="social-primary mini" onClick={()=>goRoom(c.room_code,profile?.display_name||'Friend')}>Connect to Diya</button></article>}):<p className="social-empty">Accepted connections yahan show honge.</p>}</section></aside></div>
 <p className="social-foot">Connection accept hone ke baad same private room dono ko milega. Room link sirf connected users ke saath share karo.</p></main></div>
}
