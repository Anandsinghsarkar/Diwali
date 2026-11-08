import React,{useEffect,useState} from 'react'
import {createRoot} from 'react-dom/client'
import App from './App.jsx'
import Live from './live/Live.jsx'
import SocialHub from './live/SocialHub.jsx'
import './styles.css'
import './live/live.css'

const route=()=>location.hash.startsWith('#live')
const roomRoute=()=>new URLSearchParams(location.hash.split('?')[1]||'').has('room')
function Root(){
 const [live,setLive]=useState(route)
 useEffect(()=>{const f=()=>setLive(route());window.addEventListener('hashchange',f);return()=>window.removeEventListener('hashchange',f)},[])
 if(live)return roomRoute()?<Live onExit={()=>{location.hash='live';setLive(true)}}/>:<SocialHub/>
 return <><App/><a className="lv-fab" href="#live">🪔 Live Together</a></>
}
createRoot(document.getElementById('root')).render(<Root/>)
