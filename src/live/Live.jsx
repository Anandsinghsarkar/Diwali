import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './live2.css'
import { useRoom } from './fb.js'
import DiyaBoard from './Diya.jsx'
import Rangoli from './Rangoli.jsx'
import Crackers from './Crackers.jsx'
import { clean, clampLit, fmt, genCode } from './common.js'

const SAVE = 'dv-room'
const loadSaved = () => { try { return JSON.parse(localStorage.getItem(SAVE) || 'null') } catch { return null } }
const timeOf = at => new Date(at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

function Side({ users, me, online, msgs, live, send, couple, room, open, onClose, onQuit }) {
  const [d, setD] = useState(''), end = useRef(null)
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [msgs, open])
  const go = (text, kind) => { const t = (text ?? d).trim(); if (!t || !live) return; send({ t: 'chat', text: t, kind }); if (text == null) setD('') }
  const quick = couple ? ['💗 thinking of you', '🪔 light yours too', '✨ look at the sky'] : ['🪔 Shubh Deepawali!', '✨ look at the sky', '🎆 more crackers!']
  return <aside className={'lv-side' + (open ? ' open' : '')}>
    <div className="lv-side-head"><b>{couple ? 'Just us' : 'In this room'}</b><span>{room || 'solo'}</span><button className="lv-btn lv-x" onClick={onClose}>✕</button></div>
    <div className="lv-people">{users.length ? users.map(u => <span key={u.id} className="lv-chip" style={{ '--h': u.hue }}><i>{(u.name[0] || '?').toUpperCase()}</i>{u.name}{u.id === me ? ' (you)' : ''}{online[u.id] ? <em className="lv-dot" /> : <small> offline</small>}</span>) : <small>You are playing solo. Join a room to play together.</small>}</div>
    <div className="lv-msgs">{msgs.map(m => m.kind === 'sys'
      ? <div key={m.id} className="lv-sys">{m.name} {m.text}</div>
      : <div key={m.id} className={'lv-msg' + (m.from === me ? ' me' : '') + (m.kind === 'love' ? ' love' : '')}><small>{m.from === me ? 'You' : m.name} · {timeOf(m.at)}</small><p>{m.text}</p></div>)}<div ref={end} /></div>
    <div className="lv-quick">{quick.map(q => <button key={q} disabled={!live} onClick={() => go(q, couple ? 'love' : 'msg')}>{q}</button>)}</div>
    <form className="lv-compose" onSubmit={e => { e.preventDefault(); go() }}><input value={d} maxLength={400} onChange={e => setD(e.target.value)} placeholder={live ? 'say something…' : 'join a room to chat'} disabled={!live} /><button disabled={!live || !d.trim()}>Send</button></form>
    <p className="lv-note">Your chat view starts when you open the page. Refresh and it clears.</p>
    {live && <button className="lv-link lv-quit" onClick={onQuit}>disconnect from this room for good</button>}
  </aside>
}

function Lobby({ name, setName, room, setRoom, mode, setMode, onJoin, onSolo, err }) {
  const choose = m => { setMode(m); if (/^(DIWALI|LOVE)-/.test(room) || !room) setRoom(genCode(m)) }
  return <div className="lv-lobby"><div className="lv-card">
    <span className="lv-eye">PLAY TOGETHER</span>
    <h2>Light it up <em>with someone.</em></h2>
    <p>Share the room code. Once you connect, this browser remembers the room and reconnects by itself next time.</p>
    {err && <div className="lv-err">{err}</div>}
    <label>Your name<input value={name} maxLength={20} onChange={e => setName(e.target.value)} placeholder="your name" /></label>
    <div className="lv-seg"><button className={mode === 'friends' ? 'on' : ''} onClick={() => choose('friends')}>👥 Friends</button><button className={mode === 'couple' ? 'on' : ''} onClick={() => choose('couple')}>💞 Couple (2)</button></div>
    <label>Room code<div className="lv-row"><input value={room} onChange={e => setRoom(clean(e.target.value))} /><button type="button" className="lv-btn" onClick={() => setRoom(genCode(mode))}>🎲</button></div></label>
    <button className="lv-btn gold big" disabled={!name.trim() || !room} onClick={onJoin}>Join room</button>
    <button className="lv-link" onClick={onSolo}>or play solo</button>
  </div></div>
}

export default function Live({ onExit }) {
  const hp = useMemo(() => { const q = new URLSearchParams(location.hash.split('?')[1] || ''); return { room: clean(q.get('room')), mode: q.get('mode') === 'couple' ? 'couple' : 'friends' } }, [])
  const saved = useMemo(loadSaved, [])
  const [name, setName] = useState(() => localStorage.getItem('dv-name') || saved?.name || '')
  const [mode, setMode] = useState(hp.room ? hp.mode : (saved?.mode || 'friends'))
  const [roomIn, setRoomIn] = useState(hp.room || saved?.room || genCode(hp.mode))
  const [roomMode, setRoomMode] = useState(mode)
  const [cfg, setCfg] = useState(() => {
    const n = localStorage.getItem('dv-name') || saved?.name
    if (!n) return null
    if (hp.room) return { room: hp.room, name: n, mode: hp.mode, n: Date.now() }
    if (saved?.room) return { room: saved.room, name: n, mode: saved.mode || 'friends', n: Date.now() }
    return null
  })
  const [solo, setSolo] = useState(false)
  const [tab, setTab] = useState('diya')
  const [chatOpen, setChatOpen] = useState(false)
  const [msgs, setMsgs] = useState([])
  const [players, setPlayers] = useState({})
  const [race, setRace] = useState(null)
  const [scores, setScores] = useState({})
  const [soloLit, setSoloLit] = useState(0)
  const [copied, setCopied] = useState(false)
  const stampsRef = useRef([]), subs = useRef(new Set())
  const sub = useCallback(fn => { subs.current.add(fn); return () => subs.current.delete(fn) }, [])

  const onMsg = useCallback(m => {
    if (m.t === 'init') { setRoomMode(m.mode); stampsRef.current = [] }
    else if (m.t === 'players') setPlayers(m.players)
    else if (m.t === 'race') setRace(m.race)
    else if (m.t === 'raceScores') setScores(m.scores)
    else if (m.t === 'stamps') { for (const s of m.list) stampsRef.current.push(s) }
    else if (m.t === 'rclear') stampsRef.current = []
    else if (m.t === 'chat') setMsgs(a => [...a, m].slice(-200))
    subs.current.forEach(fn => fn(m))
  }, [])
  const { status, users, online, me, err, fails, offset, send } = useRoom(cfg, onMsg)
  const live = status === 'live'
  const couple = live && roomMode === 'couple'

  useEffect(() => { if (live && cfg) localStorage.setItem(SAVE, JSON.stringify({ room: cfg.room, name: cfg.name, mode: roomMode })) }, [live, cfg, roomMode])

  const act = useMemo(() => ({
    set: n => { n = clampLit(n); if (live) send({ t: 'lit', set: n }); else setSoloLit(n) },
    add: n => { if (live) send({ t: 'lit', add: n }); else setSoloLit(v => clampLit(v + n)) },
    tap: () => send({ t: 'raceTap' }),
    startRace: () => send({ t: 'race' }),
  }), [live, send])

  const effUsers = live ? users : [{ id: 'solo', name: name.trim() || 'You', hue: 40 }]
  const effPlayers = live ? players : { solo: { lit: soloLit } }
  const effMe = live ? me : 'solo'
  const totalLit = Object.values(effPlayers).reduce((a, p) => a + (p?.lit || 0), 0)
  const lights = totalLit >= 1000 ? 4 : totalLit >= 100 ? 3 : totalLit >= 10 ? 2 : totalLit >= 1 ? 1 : 0
  const onlineCount = Object.values(online).filter(Boolean).length

  const join = () => {
    const n = name.trim(); if (!n) return
    localStorage.setItem('dv-name', n)
    setMsgs([]); setPlayers({}); setRace(null); setScores({}); setRoomMode(mode)
    onMsg({ t: 'rclear' })
    setCfg({ room: clean(roomIn) || genCode(mode), name: n.slice(0, 20), mode, n: Date.now() })
  }
  const leave = () => { localStorage.removeItem(SAVE); setCfg(null); setSolo(true); setMsgs([]) }
  const quit = () => { if (!window.confirm('Leave this room permanently? Your slot is freed.')) return; send({ t: 'quit' }); leave() }
  const invite = () => {
    const url = `${location.origin}${location.pathname}#live?room=${cfg.room}&mode=${roomMode}`
    navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }).catch(() => {})
  }
  const showLobby = (!cfg && !solo) || !!err

  return <div className="lv">
    <header className="lv-top">
      <button className="lv-brand" onClick={onExit}>← <span>🪔 Diwali<b>Live</b></span></button>
      <nav className="lv-tabs">{[['diya', 'Diya'], ['rangoli', 'Rangoli'], ['fw', 'Crackers']].map(([id, l]) => <button key={id} className={'lv-tab' + (tab === id ? ' on' : '')} onClick={() => setTab(id)}>{l}</button>)}</nav>
      <div className="lv-right">
        <span className={'lv-pill' + (live ? ' on' : '')}>{live ? `● ${onlineCount}/${users.length} online${couple ? ' · couple' : ''}` : cfg ? (fails >= 2 ? 'offline' : status) : 'solo'}</span>
        {live && <button className="lv-btn" onClick={invite}>{copied ? 'copied ✓' : 'invite link'}</button>}
        {!cfg && <button className="lv-btn gold" onClick={() => setSolo(false)}>join room</button>}
        {cfg && <button className="lv-btn" onClick={leave}>leave</button>}
        <button className="lv-btn lv-chat-toggle" onClick={() => setChatOpen(v => !v)}>chat</button>
      </div>
    </header>
    <div className="lv-body">
      <main className="lv-stage">
        {tab === 'diya' && <DiyaBoard users={effUsers} players={effPlayers} me={effMe} online={online} live={live} act={act} race={live ? race : null} scores={scores} offset={offset} />}
        {tab === 'rangoli' && <Rangoli send={send} live={live} stampsRef={stampsRef} sub={sub} lights={lights} />}
        {tab === 'fw' && <Crackers send={send} sub={sub} couple={couple} />}
      </main>
      <Side users={users} me={me} online={online} msgs={msgs} live={live} send={send} couple={couple} room={cfg?.room} open={chatOpen} onClose={() => setChatOpen(false)} onQuit={quit} />
    </div>
    {showLobby && <Lobby name={name} setName={setName} room={roomIn} setRoom={setRoomIn} mode={mode} setMode={setMode} onJoin={join} onSolo={() => { setCfg(null); setSolo(true) }} err={err} />}
    {cfg && !live && fails >= 2 && !err && <div className="lv-warn">connection lost, retrying…</div>}
    <span hidden>{fmt(totalLit)}</span>
  </div>
}
