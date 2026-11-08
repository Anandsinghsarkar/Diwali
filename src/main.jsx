import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import Live from './live/Live.jsx'
import './styles.css'
import './live/live.css'

const isLive = () => location.hash.startsWith('#live')

function Root() {
  const [live, setLive] = useState(isLive)
  useEffect(() => {
    const f = () => setLive(isLive())
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  if (live) return <Live onExit={() => { history.replaceState(null, '', location.pathname + location.search); setLive(false) }} />
  return <><App /><a className="lv-fab" href="#live">🪔 Live Together</a></>
}

createRoot(document.getElementById('root')).render(<Root />)
