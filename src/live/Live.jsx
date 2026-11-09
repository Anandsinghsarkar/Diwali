import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './live2.css'
import { useRoom, supabase } from './supabase.js'
import DiyaBoard from './Diya.jsx'
import Rangoli from './Rangoli.jsx'
import Crackers from './Crackers.jsx'
import { clean, clampLit, genCode, applyOp } from './common.js'

const SAVE = 'dv-room'
const loadSaved = () => { try { return JSON.parse(localStorage.getItem(SAVE) || 'null') } catch { return null } }
const timeOf = at => new Date(at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
const extractCode = s => { const m = String(s || '').match(/room=([A-Za-z0-9-]+)/); return clean(m ? m[1] : s) }

let ac
const blip = () => {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)()
    if (ac.state === 'suspended') ac.resume()
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime
    o.frequency.value = 880; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.07, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + .18)
    o.connect(g); g.connect(ac.destination); o.start(); o.stop(t + .2)
  } catch { /* audio blocked */ }
}

const EMOJI = ['🪔', '🎆', '❤️', '😂', '🔥', '💨', '✨', '🙏']

function Side({ users, me, online, typing, msgs, live, send, couple, room, open, onClose, onQuit, onType }) {
  const [d, setD] = useState(''), [chatError, setChatError] = useState(''), [sending, setSending] = useState(false), end = useRef(null)
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [msgs, open])
  const go = async (text, kind) => {
    const t = (text ?? d).trim(); if (!t || !live || sending) return
    setChatError(''); setSending(true)
    try {
      await send({ t: 'chat', text: t, kind })
      send({ t: 'typing', v: false })
      if (text == null) setD('')
    } catch (e) {
      setChatError(e?.message || 'Message send nahi hua. Connection check karke dobara try karo.')
    } finally { setSending(false) }
  }
  const who = users.filter(u => u.id !== me && typing[u.id]).map(u => u.name)
  const quick = couple ? ['💗 thinking of you', '🪔 light yours too', '✨ look at the sky'] : ['🪔 Shubh Deepawali!', '✨ look at the sky', '🎆 more crackers!']
  return <aside className={'lv-side' + (open ? ' open' : '')}>
    <div className="lv-side-head"><b>{couple ? 'Just us' : 'In this room'}</b><span>{room || 'solo'}</span><button className="lv-btn lv-x" onClick={onClose}>✕</button></div>
    <div className="lv-people">{users.length ? users.map(u => <span key={u.id} className="lv-chip" style={{ '--h': u.hue }}><i>{(u.name[0] || '?').toUpperCase()}</i>{u.name}{u.id === me ? ' (you)' : ''}{online[u.id] ? <em className="lv-dot" /> : <small> offline</small>}</span>) : <small>You are playing solo. Create or join a room to play together.</small>}</div>
    <div className="lv-msgs">{msgs.map(m => m.kind === 'sys'
      ? <div key={m.id} className="lv-sys">{m.name} {m.text}</div>
      : <div key={m.id} className={'lv-msg' + (m.from === me ? ' me' : '') + (m.kind === 'love' ? ' love' : '')}><small>{m.from === me ? 'You' : m.name} · {timeOf(m.at)}</small><p>{m.text}</p></div>)}<div ref={end} /></div>
    <div className="lv-typing">{who.length ? `${who.join(', ')} ${who.length > 1 ? 'are' : 'is'} typing…` : ''}</div>
    <div className="lv-quick">{[...EMOJI.map(e => [e, 'msg']), ...quick.map(q => [q, couple ? 'love' : 'msg'])].map(([q, k]) => <button key={q} disabled={!live} onClick={() => go(q, k)}>{q}</button>)}</div>
    <form className="lv-compose" onSubmit={e => { e.preventDefault(); go() }}><input value={d} maxLength={400} onChange={e => { setD(e.target.value); onType() }} placeholder={live ? 'say something…' : 'join a room to chat'} disabled={!live} /><button disabled={!live || !d.trim() || sending}>{sending ? "Sending…" : "Send"}</button></form>\n    {chatError && <div className="lv-chat-error" role="alert">{chatError}</div>}
    <p className="lv-note">Your chat view starts when you open the page. Refresh and it clears.</p>
    {live && <button className="lv-link lv-quit" onClick={onQuit}>disconnect from this room for good</button>}
  </aside>
}

function Lobby({ name, setName, tab, setTab, mode, setMode, createCode, setCreateCode, joinCode, setJoinCode, onCreate, onJoin, onSolo, err }) {
  const paste = async () => { try { setJoinCode(extractCode(await navigator.clipboard.readText())) } catch { /* denied */ } }
  const choose = m => { setMode(m); setCreateCode(genCode(m)) }
  const nameOk = !!name.trim()
  return <div className="lv-lobby"><div className="lv-card">
    <span className="lv-eye">LIVE TOGETHER</span>
    <h2>Light it up <em>together.</em></h2>
    {err && <div className="lv-err">{err}</div>}
    <label>Your name<input value={name} maxLength={20} onChange={e => setName(e.target.value)} placeholder="your name" /></label>
    <div className="lv-seg"><button className={tab === 'create' ? 'on' : ''} onClick={() => setTab('create')}>✨ Generate code</button><button className={tab === 'join' ? 'on' : ''} onClick={() => setTab('join')}>🔑 Join with code</button></div>
    {tab === 'create' ? <>
      <div className="lv-seg"><button className={mode === 'couple' ? 'on' : ''} onClick={() => choose('couple')}>💞 Couple (2)</button><button className={mode === 'friends' ? 'on' : ''} onClick={() => choose('friends')}>👥 Friends (up to 12)</button></div>
      <div className="lv-bigcode"><span>{createCode}</span><button type="button" className="lv-btn" onClick={() => setCreateCode(genCode(mode))}>🎲 new</button></div>
      <p>Create the room, then send this code (or the invite link) to your {mode === 'couple' ? 'partner' : 'friends'}.</p>
      <button className="lv-btn gold big" disabled={!nameOk} onClick={onCreate}>Create room and enter</button>
    </> : <>
      <label>Code or invite link<div className="lv-row"><input value={joinCode} onChange={e => setJoinCode(extractCode(e.target.value))} placeholder="LOVE-XXXXXXXX" /><button type="button" className="lv-btn" onClick={paste}>paste</button></div></label>
      <p>The code is created by whoever opens the room first. Same code, same room, every time.</p>
      <button className="lv-btn gold big" disabled={!nameOk || joinCode.length < 4} onClick={onJoin}>Join room</button>
    </>}
    <button className="lv-link" onClick={onSolo}>or play solo</button>
  </div></div>
}

export default function Live({ onExit }) {
  const hp = useMemo(() => { const q = new URLSearchParams(location.hash.split('?')[1] || ''); return { room: clean(q.get('room')), mode: q.get('mode') === 'couple' ? 'couple' : 'friends' } }, [])
  const saved = useMemo(loadSaved, [])
  const [name, setName] = useState(() => localStorage.getItem('dv-name') || saved?.name || '')
  const [mode, setMode] = useState(saved?.mode || 'couple')
  const [tab, setTab] = useState(hp.room ? 'join' : 'create')
  const [createCode, setCreateCode] = useState(() => genCode(saved?.mode || 'couple'))
  const [joinCode, setJoinCode] = useState(hp.room)
  const [roomMode, setRoomMode] = useState(saved?.mode || 'couple')
  const [cfg, setCfg] = useState(() => {
    const n = localStorage.getItem('dv-name') || saved?.name
    if (!n) return null
    if (hp.room) return { room: hp.room, name: n, mode: hp.mode, intent: 'join', n: Date.now() }
    if (saved?.room) return { room: saved.room, name: n, mode: saved.mode || 'friends', intent: 'join', n: Date.now() }
    return null
  })
  const [solo, setSolo] = useState(false)
  const [tabId, setTabId] = useState('diya')
  const [chatOpen, setChatOpen] = useState(false)
  const [msgs, setMsgs] = useState([])
  const [typing, setTyping] = useState({})
  const [unread, setUnread] = useState(0)
  const [toast, setToast] = useState('')
  const [players, setPlayers] = useState({})
  const [race, setRace] = useState(null)
  const [scores, setScores] = useState({})
  const [soloBoard, setSoloBoard] = useState({ p: 0, lit: 0, holes: {}, extras: {}, flame: 'natural' })
  const [copied, setCopied] = useState('')
  const stampsRef = useRef([]), subs = useRef(new Set()), meRef = useRef(null), openRef = useRef(false)
  const typingT = useRef(0), typingOff = useRef(0), toastT = useRef(0)
  openRef.current = chatOpen
  const sub = useCallback(fn => { subs.current.add(fn); return () => subs.current.delete(fn) }, [])

  const onMsg = useCallback(m => {
    if (m.t === 'init') { setRoomMode(m.mode); stampsRef.current = [] }
    else if (m.t === 'players') setPlayers(m.players)
    else if (m.t === 'race') setRace(m.race)
    else if (m.t === 'raceScores') setScores(m.scores)
    else if (m.t === 'typing') setTyping(m.typing)
    else if (m.t === 'stamps') { for (const s of m.list) stampsRef.current.push(s) }
    else if (m.t === 'rclear') stampsRef.current = []
    else if (m.t === 'chat') {
      setMsgs(a => [...a, m].slice(-200))
      const mine = m.from && m.from === meRef.current
      if (m.kind === 'sys' && m.to && m.to === meRef.current && !mine) {
        setToast(`💨 ${m.name} ${m.text}`); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(''), 3800)
      } else if (m.kind !== 'sys' && !mine) {
        blip()
        if (window.innerWidth <= 900 && !openRef.current) setUnread(u => u + 1)
      }
    }
    subs.current.forEach(fn => fn(m))
  }, [])
  const { status, users, online, me, err, fails, offset, send } = useRoom(cfg, onMsg)
  meRef.current = me
  const live = status === 'live'
  const couple = live && roomMode === 'couple'

  useEffect(() => { if (live && cfg) localStorage.setItem(SAVE, JSON.stringify({ room: cfg.room, name: cfg.name, mode: roomMode })) }, [live, cfg, roomMode])
  useEffect(() => { if (chatOpen) setUnread(0) }, [chatOpen])

  const act = useMemo(() => ({
    set: n => { n = clampLit(n); if (live) send({ t: 'lit', set: n }); else setSoloBoard(v => applyOp(v, { k: 'set', n })) },
    add: n => { if (live) send({ t: 'lit', add: n }); else setSoloBoard(v => applyOp(v, { k: 'add', n })) },
    diya: (target, index, action) => { if (live) send({ t: 'diya', target, index, action }); else setSoloBoard(v => applyOp(v, { k: action, i: index })) },
    flame: (target, flame) => { if (live) send({ t: 'diya', target, action: 'flame', flame }); else setSoloBoard(v => applyOp(v, { k: 'flame', f: flame })) },
    tap: () => send({ t: 'raceTap' }),
    startRace: () => send({ t: 'race' }),
    blow: (target, n, all, targetName) => send({ t: 'blow', target, n, all, targetName }),
    partnerSet: (target, n) => send({ t: 'partnerLit', target, set: n }),
    partnerAdd: (target, n) => send({ t: 'partnerLit', target, add: n }),
  }), [live, send])

  const onType = useCallback(() => {
    const t = Date.now()
    if (t - typingT.current > 1500) { typingT.current = t; send({ t: 'typing', v: true }) }
    clearTimeout(typingOff.current)
    typingOff.current = setTimeout(() => send({ t: 'typing', v: false }), 2200)
  }, [send])

  const effUsers = live ? users : [{ id: 'solo', name: name.trim() || 'You', hue: 40 }]
  const effPlayers = live ? players : { solo: soloBoard }
  const effMe = live ? me : 'solo'
  const totalLit = Object.values(effPlayers).reduce((a, p) => a + (p?.lit || 0), 0)
  const lights = totalLit >= 1000 ? 4 : totalLit >= 100 ? 3 : totalLit >= 10 ? 2 : totalLit >= 1 ? 1 : 0
  const onlineCount = Object.values(online).filter(Boolean).length

  const enter = (intent, code, m) => {
    const n = name.trim(); if (!n) return
    localStorage.setItem('dv-name', n)
    setMsgs([]); setPlayers({}); setRace(null); setScores({}); setTyping({}); setRoomMode(m)
    onMsg({ t: 'rclear' })
    setCfg({ room: clean(code) || genCode(m), name: n.slice(0, 20), mode: m, intent, n: Date.now() })
  }
  const leave = async () => {
    if (cfg && me && supabase) {
      const { error } = await supabase.from('room_members').delete().eq('room_code', cfg.room).eq('user_id', me)
      if (error) { setToast(error.message || 'Could not leave room yet.'); return }
      await supabase.from('profiles').update({ current_room: null, updated_at: new Date().toISOString() }).eq('id', me)
    }
    localStorage.removeItem(SAVE)
    setCfg(null); setSolo(false); setMsgs([]); setPlayers({}); setRace(null); setScores({}); setTyping({})
    setToast('You left the room.')
  }
  const quit = async () => { if (!window.confirm('Leave this room permanently? Your slot is freed.')) return; await leave() }
  const inviteUrl = cfg ? `${location.origin}${location.pathname}#live?room=${cfg.room}&mode=${roomMode}` : ''
  const copy = (txt, key) => { navigator.clipboard?.writeText(txt).then(() => { setCopied(key); setTimeout(() => setCopied(''), 1500) }).catch(() => {}) }
  const showLobby = (!cfg && !solo) || !!err
  const waiting = live && users.length < 2

  return <div className="lv">
    <header className="lv-top">
      <button className="lv-brand" onClick={onExit}>← <span>🪔 Diwali<b>Live</b></span></button>
      <nav className="lv-tabs">{[['diya', 'Diya'], ['rangoli', 'Rangoli'], ['fw', 'Crackers']].map(([id, l]) => <button key={id} className={'lv-tab' + (tabId === id ? ' on' : '')} onClick={() => setTabId(id)}>{l}</button>)}</nav>
      <div className="lv-right">
        <span className={'lv-pill' + (live ? ' on' : '')}>{live ? `● ${onlineCount}/${users.length} online${couple ? ' · couple' : ''}` : cfg ? (fails >= 2 ? 'offline' : status) : 'solo'}</span>
        {cfg && <button className="lv-btn lv-codebtn" onClick={() => copy(cfg.room, 'code')}>{copied === 'code' ? 'copied ✓' : cfg.room}</button>}
        {live && <button className="lv-btn" onClick={() => copy(inviteUrl, 'link')}>{copied === 'link' ? 'copied ✓' : 'invite link'}</button>}
        {!cfg && <button className="lv-btn gold" onClick={() => setSolo(false)}>create / join</button>}
        {cfg && <button className="lv-btn" onClick={leave}>leave</button>}
        <button className="lv-btn lv-chat-toggle" onClick={() => setChatOpen(v => !v)}>chat{unread > 0 && <b className="lv-badge">{unread}</b>}</button>
      </div>
    </header>
    <div className="lv-body">
      <main className="lv-stage">
        {tabId === 'diya' && <DiyaBoard users={effUsers} players={effPlayers} me={effMe} online={online} live={live} couple={couple} act={act} race={live ? race : null} scores={scores} offset={offset} />}
        {tabId === 'rangoli' && <Rangoli send={send} live={live} stampsRef={stampsRef} sub={sub} lights={lights} />}
        {tabId === 'fw' && <Crackers send={send} sub={sub} couple={couple} />}
        {waiting && <div className="lv-wait">
          <b>{roomMode === 'couple' ? 'Waiting for your partner…' : 'Waiting for friends…'}</b>
          <span>Code <code>{cfg.room}</code></span>
          <button className="lv-btn" onClick={() => copy(cfg.room, 'code2')}>{copied === 'code2' ? 'copied ✓' : 'copy code'}</button>
          <button className="lv-btn" onClick={() => copy(inviteUrl, 'link2')}>{copied === 'link2' ? 'copied ✓' : 'copy link'}</button>
          <a className="lv-btn gold" href={`https://wa.me/?text=${encodeURIComponent('Join me on Diwali Live 🪔 ' + inviteUrl + '  (code: ' + cfg.room + ')')}`} target="_blank" rel="noreferrer">WhatsApp</a>
        </div>}
        {toast && <div className="lv-toast">{toast}</div>}
      </main>
      <Side users={users} me={me} online={online} typing={typing} msgs={msgs} live={live} send={send} couple={couple} room={cfg?.room} open={chatOpen} onClose={() => setChatOpen(false)} onQuit={quit} onType={onType} />
    </div>
    {showLobby && <Lobby name={name} setName={setName} tab={tab} setTab={setTab} mode={mode} setMode={setMode} createCode={createCode} setCreateCode={setCreateCode} joinCode={joinCode} setJoinCode={setJoinCode}
      onCreate={() => enter('create', createCode, mode)} onJoin={() => enter('join', joinCode, mode)} onSolo={() => { setCfg(null); setSolo(true) }} err={err} />}
    {cfg && !live && fails >= 2 && !err && <div className="lv-warn">connection lost, retrying…</div>}
  </div>
}
