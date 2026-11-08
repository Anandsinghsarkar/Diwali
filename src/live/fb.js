import { useCallback, useEffect, useRef, useState } from 'react'
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getDatabase, ref, child, get, set, push, update, remove, onValue, onChildAdded, onDisconnect, runTransaction, serverTimestamp, query, orderByChild, startAt, limitToLast } from 'firebase/database'
import { clampLit } from './common.js'

// Web config is public by design. Access is controlled by database.rules.json, not by hiding this.
const firebaseConfig = {
  apiKey: 'AIzaSyAGkL7KHdJTpJYZRpV5QzLs2mmnb2Fk2Sk',
  authDomain: 'store-database-7.firebaseapp.com',
  databaseURL: 'https://store-database-7-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'store-database-7',
  storageBucket: 'store-database-7.firebasestorage.app',
  messagingSenderId: '589656994548',
  appId: '1:589656994548:web:dec75d223a6cb57f0c64a1',
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getDatabase(app)

const hueOf = uid => Math.abs([...uid].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)) % 360
const safe = p => { if (p && p.catch) p.catch(e => console.warn('[diwali]', e.code || e.message)) }
const arr = a => Object.values(a || {}).map(x => (Array.isArray(x) ? x : Object.values(x)))

function explain(e) {
  const code = String(e?.code || ''), msg = String(e?.message || '')
  if (/operation-not-allowed|admin-restricted/.test(code)) return 'Anonymous sign-in is off. Firebase console, Authentication, Sign-in method, Anonymous, Enable.'
  if (/unauthorized-domain/.test(code)) return 'This domain is not authorised. Firebase console, Authentication, Settings, Authorized domains, add it.'
  if (/permission[_ -]?denied/i.test(code + msg)) return 'Permission denied. The room may be full, or the rules are not published yet (firebase/database.rules.json).'
  if (/network/i.test(code + msg)) return 'No network. Check your connection.'
  return msg || 'could not connect'
}

export function useRoom(cfg, onMsg) {
  const [status, setStatus] = useState('idle')
  const [users, setUsers] = useState([])
  const [online, setOnline] = useState({})
  const [me, setMe] = useState(null)
  const [err, setErr] = useState('')
  const [fails, setFails] = useState(0)
  const [offset, setOffset] = useState(0)
  const cb = useRef(onMsg); cb.current = onMsg
  const ctx = useRef(null)

  useEffect(() => {
    setErr(''); setFails(0); ctx.current = null
    if (!cfg) { setStatus('idle'); setUsers([]); setOnline({}); setMe(null); return }
    let dead = false, failTimer
    const offs = []
    const emit = m => { if (!dead) cb.current(m) }

    ;(async () => {
      try {
        setStatus('connecting')
        await auth.authStateReady()
        const user = auth.currentUser || (await signInAnonymously(auth)).user
        if (dead) return
        const uid = user.uid, base = ref(db, `rooms/${cfg.room}`)
        const off = (await get(ref(db, '.info/serverTimeOffset'))).val() || 0
        if (dead) return

        const metaRef = child(base, 'meta')
        let meta = (await get(metaRef)).val()
        if (!meta) {
          const fresh = { mode: cfg.mode, max: cfg.mode === 'couple' ? 2 : 12, createdAt: Date.now() }
          try { await set(metaRef, fresh); meta = fresh } catch { meta = (await get(metaRef)).val() }
          if (!meta) throw new Error('could not create room')
        }
        await set(child(base, `members/${uid}`), { name: cfg.name, hue: hueOf(uid), at: serverTimestamp() })
        if (dead) return

        ctx.current = { base, uid, name: cfg.name, off, mine: new Set() }
        const joinAt = Date.now() + off
        setMe(uid); setOffset(off)
        emit({ t: 'init', id: uid, mode: meta.mode })

        offs.push(onValue(ref(db, '.info/serverTimeOffset'), s => { const v = s.val() || 0; if (ctx.current) ctx.current.off = v; setOffset(v) }))

        const pr = child(base, `presence/${uid}`)
        offs.push(onValue(ref(db, '.info/connected'), s => {
          if (s.val()) { clearTimeout(failTimer); setFails(0); setStatus('live'); safe(onDisconnect(pr).set(false).then(() => set(pr, true))) }
          else { setStatus('reconnecting'); clearTimeout(failTimer); failTimer = setTimeout(() => setFails(2), 6000) }
        }))
        offs.push(onValue(child(base, 'presence'), s => setOnline(s.val() || {})))

        let prevM = null
        offs.push(onValue(child(base, 'members'), s => {
          const v = s.val() || {}
          setUsers(Object.entries(v).map(([id, m]) => ({ id, name: m.name || 'Friend', hue: m.hue ?? 0 })))
          if (prevM) {
            for (const id of Object.keys(v)) if (!prevM[id]) emit({ t: 'chat', kind: 'sys', id: 's' + Math.random(), name: v[id].name || 'Someone', text: 'joined' })
            for (const id of Object.keys(prevM)) if (!v[id]) emit({ t: 'chat', kind: 'sys', id: 's' + Math.random(), name: prevM[id].name || 'Someone', text: 'left for good' })
          }
          prevM = v
        }))

        offs.push(onValue(child(base, 'players'), s => emit({ t: 'players', players: s.val() || {} })))
        offs.push(onValue(child(base, 'race'), s => emit({ t: 'race', race: s.val() })))
        offs.push(onValue(child(base, 'raceScores'), s => emit({ t: 'raceScores', scores: s.val() || {} })))

        let first = true, last
        offs.push(onValue(child(base, 'meta/epoch'), s => {
          const v = s.val()
          if (first) { first = false; last = v; return }
          if (v !== last) { last = v; emit({ t: 'rclear' }) }
        }))

        offs.push(onChildAdded(child(base, 'rangoli'), s => {
          if (ctx.current?.mine.has(s.key)) return
          const v = s.val()
          if (v && v.list) emit({ t: 'stamps', list: arr(v.list) })
        }))

        offs.push(onChildAdded(query(child(base, 'fire'), limitToLast(5)), s => {
          const v = s.val()
          if (!v || v.by === uid) return
          if (Date.now() + (ctx.current?.off || 0) - (v.at || 0) > 5000) return
          emit({ t: 'fire', x: v.x, y: v.y, kind: v.kind, hue: v.hue })
        }))

        offs.push(onChildAdded(query(child(base, 'chat'), orderByChild('at'), startAt(joinAt)), s => {
          const v = s.val(); if (!v) return
          emit({ t: 'chat', id: s.key, from: v.from, name: v.name, text: v.text, kind: v.kind || 'msg', at: v.at || Date.now() })
        }))
      } catch (e) {
        if (dead) return
        setErr(explain(e)); setStatus('idle')
      }
    })()

    return () => {
      dead = true; clearTimeout(failTimer)
      offs.forEach(f => { try { f() } catch { /* ignore */ } })
      const c = ctx.current
      if (c) safe(set(child(c.base, `presence/${c.uid}`), false))
      ctx.current = null
    }
  }, [cfg])

  const send = useCallback(m => {
    const c = ctx.current; if (!c) return
    const { base, uid, mine } = c
    switch (m.t) {
      case 'stamps': { const r = push(child(base, 'rangoli')); mine.add(r.key); safe(set(r, { by: uid, list: m.list })); break }
      case 'rclear': safe(update(base, { 'meta/epoch': Date.now(), rangoli: null })); break
      case 'fire': { const r = push(child(base, 'fire')); safe(set(r, { by: uid, x: m.x, y: m.y, kind: m.kind, hue: m.hue, at: serverTimestamp() })); setTimeout(() => safe(remove(r)), 8000); break }
      case 'chat': safe(push(child(base, 'chat'), { from: uid, name: c.name, text: m.text, kind: m.kind || 'msg', at: serverTimestamp() })); break
      case 'lit': safe(runTransaction(child(base, `players/${uid}/lit`), v => clampLit(m.set != null ? m.set : (v || 0) + m.add))); break
      case 'raceTap':
        safe(runTransaction(child(base, `players/${uid}/lit`), v => clampLit((v || 0) + 1)))
        safe(runTransaction(child(base, `raceScores/${uid}`), v => (v || 0) + 1))
        break
      case 'race': safe(update(base, { race: { start: Date.now() + c.off + 3000, dur: 60000, by: uid }, raceScores: null })); break
      case 'quit': safe(remove(child(base, `members/${uid}`))); break
      default: break
    }
  }, [])

  return { status, users, online, me, err, fails, offset, send }
}
