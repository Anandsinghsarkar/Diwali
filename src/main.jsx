import React,{useEffect,useRef,useState} from 'react'
import {createRoot} from 'react-dom/client'
import App from './App.jsx'
import Live from './live/Live.jsx'
import SocialHub from './live/SocialHub.jsx'
import {supabase,supabaseReady} from './live/supabase.js'
import './styles.css'
import './live/live.css'

const route=()=>location.hash.startsWith('#live')
const roomRoute=()=>new URLSearchParams(location.hash.split('?')[1]||'').has('room')

function Root(){
 const [live,setLive]=useState(route)
 const [session,setSession]=useState(null)
 const [authLoading,setAuthLoading]=useState(true)
 const wasInRoom=useRef(roomRoute())

 useEffect(()=>{
  let alive=true
  const syncRoute=()=>{setLive(route());wasInRoom.current=roomRoute()}
  const handleBack=()=>{if(wasInRoom.current&&!roomRoute()){history.replaceState(history.state,'',location.pathname+location.search+'#live');wasInRoom.current=false;setLive(true)}}
  window.addEventListener('hashchange',syncRoute)
  window.addEventListener('popstate',handleBack)
  if(!supabaseReady||!supabase){
   setAuthLoading(false)
  }else{
   supabase.auth.getSession().then(({data,error})=>{
    if(!alive)return
    if(error)console.error('[auth]',error)
    setSession(data?.session||null)
    setAuthLoading(false)
   }).catch(error=>{
    if(alive){console.error('[auth]',error);setAuthLoading(false)}
   })
   const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,nextSession)=>{
    if(alive)setSession(nextSession||null)
   })
   return ()=>{
    alive=false
    window.removeEventListener('hashchange',syncRoute)
    window.removeEventListener('popstate',handleBack)
    subscription.unsubscribe()
   }
  }
  return ()=>{
   alive=false
   window.removeEventListener('hashchange',syncRoute)
   window.removeEventListener('popstate',handleBack)
  }
 },[])

 if(authLoading)return <div className="social-shell"><div className="social-card">Checking your account…</div></div>
 // Require a registered account before showing the home page or any live room.
 if(!session)return <SocialHub/>

 if(live){
  return roomRoute()
   ? <Live onExit={()=>{location.hash='live';setLive(true)}}/>
   : <SocialHub/>
 }
 return <><App/><a className="lv-fab" href="#live">🪔 Live Together</a></>
}

createRoot(document.getElementById('root')).render(<Root/>)
