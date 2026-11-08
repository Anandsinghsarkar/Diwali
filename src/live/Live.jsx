import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const WS_URL = import.meta.env.VITE_WS_URL || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.hostname}:8787`
const N_DIYA = 7
const PALETTE = ['#ff9d0a', '#e8321e', '#d81b78', '#f4efe4', '#2aa84a', '#2f6fe0', '#ffd21f', '#7a3fc0']
const FLOOR = '#1a141c'
const S = 900
const TAU = Math.PI * 2
const rnd = (a, b) => a + Math.random() * (b - a)
const pick = a => a[(Math.random() * a.length) | 0]
const mulberry32 = a => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const clean = s => String(s || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24)
const genRoom = () => 'DIWALI-' + Math.random().toString(36).slice(2, 6).toUpperCase()
const timeOf = at => new Date(at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

function fit(c, ctx) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2), W = c.clientWidth, H = c.clientHeight
  const bw = Math.round(W * dpr), bh = Math.round(H * dpr)
  if (c.width !== bw || c.height !== bh) { c.width = bw; c.height = bh }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return [W, H]
}

/* ───────────── network ───────────── */
function useRoom(cfg, onMsg) {
  const [status, setStatus] = useState('idle')
  const [users, setUsers] = useState([])
  const [me, setMe] = useState(null)
  const [err, setErr] = useState('')
  const [fails, setFails] = useState(0)
  const ws = useRef(null)
  const cb = useRef(onMsg); cb.current = onMsg
  useEffect(() => {
    setErr(''); setFails(0)
    if (!cfg) { setStatus('idle'); setUsers([]); setMe(null); return }
    let stop = false, tries = 0, timer, cur
    const open = () => {
      setStatus(tries ? 'reconnecting' : 'connecting')
      try { cur = new WebSocket(WS_URL) } catch { setErr('bad server url'); return }
      const s = cur; ws.current = s
      s.onopen = () => s.send(JSON.stringify({ t: 'join', room: cfg.room, name: cfg.name, mode: cfg.mode }))
      s.onmessage = ev => {
        let m; try { m = JSON.parse(ev.data) } catch { return }
        if (m.t === 'init') { tries = 0; setFails(0); setStatus('live'); setMe(m.id); setUsers(m.users) }
        else if (m.t === 'users') setUsers(m.users)
        else if (m.t === 'error') { stop = true; setErr(m.msg) }
        cb.current(m)
      }
      s.onclose = () => {
        if (stop) { setStatus('idle'); return }
        tries++; setFails(tries); setStatus('reconnecting')
        timer = setTimeout(open, Math.min(800 * 2 ** tries, 8000))
      }
    }
    open()
    return () => { stop = true; clearTimeout(timer); if (cur) { cur.onclose = null; cur.onmessage = null; cur.close() } ws.current = null }
  }, [cfg])
  const send = useCallback(o => { const s = ws.current; if (s && s.readyState === 1) s.send(JSON.stringify(o)) }, [])
  return { status, users, me, err, fails, send }
}

/* ───────────── diya (clay + real flame) ───────────── */
const flick = (t, i) => .94 + Math.sin(t * .009 + i * 2.3) * .04 + Math.sin(t * .031 + i) * .025

function floorPattern() {
  const p = document.createElement('canvas'); p.width = p.height = 160
  const x = p.getContext('2d'), r = mulberry32(11)
  x.fillStyle = '#120d14'; x.fillRect(0, 0, 160, 160)
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${r() < .5 ? 255 : 120},${r() < .5 ? 220 : 120},${r() < .5 ? 190 : 120},${.02 + r() * .05})`; x.fillRect(r() * 160, r() * 160, 1 + r() * 2, 1 + r() * 2) }
  return p
}

function drawDiya(ctx, x, y, sc, lit, t, i) {
  const fl = flick(t, i)
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc)
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.ellipse(4, 48, 74, 13, 0, 0, TAU); ctx.fill()
  ctx.fillStyle = '#7d3416'; ctx.beginPath(); ctx.moveTo(-58, -10); ctx.quadraticCurveTo(-82, -14, -88, -6); ctx.quadraticCurveTo(-76, 6, -56, 10); ctx.closePath(); ctx.fill()
  const g = ctx.createLinearGradient(-66, 0, 66, 0)
  g.addColorStop(0, '#4a1d0d'); g.addColorStop(.3, '#c0602f'); g.addColorStop(.62, '#9a4220'); g.addColorStop(1, '#341409')
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-66, 0); ctx.bezierCurveTo(-62, 36, -34, 52, 0, 52); ctx.bezierCurveTo(34, 52, 62, 36, 66, 0); ctx.ellipse(0, 0, 66, 19, 0, 0, Math.PI, true); ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#e2b04e'
  for (let d = -4; d <= 4; d++) { const dx = d * 12, dy = 31 * Math.sqrt(1 - (dx / 66) ** 2); ctx.beginPath(); ctx.ellipse(dx, dy, 2.6, 1.9, 0, 0, TAU); ctx.fill() }
  ctx.strokeStyle = '#e08a52'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, 66, 19, 0, 0, TAU); ctx.stroke()
  const o = ctx.createRadialGradient(0, -2, 4, 0, 0, 56); o.addColorStop(0, '#3a1a0a'); o.addColorStop(1, '#0f0503')
  ctx.fillStyle = o; ctx.beginPath(); ctx.ellipse(0, 1, 56, 14, 0, 0, TAU); ctx.fill()
  ctx.fillStyle = 'rgba(255,210,170,.14)'; ctx.beginPath(); ctx.ellipse(-30, 22, 14, 7, -.5, 0, TAU); ctx.fill()
  ctx.fillStyle = '#1b0e08'; ctx.fillRect(-2.5, -14, 5, 15)
  if (lit) {
    ctx.globalCompositeOperation = 'lighter'
    let r = ctx.createRadialGradient(0, -2, 2, 0, -2, 54); r.addColorStop(0, `rgba(255,170,70,${.7 * fl})`); r.addColorStop(1, 'rgba(255,100,20,0)')
    ctx.fillStyle = r; ctx.beginPath(); ctx.ellipse(0, 1, 56, 14, 0, 0, TAU); ctx.fill()
    r = ctx.createRadialGradient(0, 0, 10, 0, 0, 110); r.addColorStop(0, `rgba(255,140,50,${.35 * fl})`); r.addColorStop(1, 'rgba(255,100,20,0)')
    ctx.fillStyle = r; ctx.fillRect(-120, -80, 240, 160)
    const h = 62 * fl, w = 15, sway = Math.sin(t * .0042 + i * 1.7) * 3.4 + Math.sin(t * .0113 + i) * 1.9
    const drop = (s, c0, c1) => {
      ctx.save(); ctx.translate(0, -13); ctx.scale(s, s)
      const gr = ctx.createLinearGradient(0, 0, 0, -h); gr.addColorStop(0, c0); gr.addColorStop(1, c1); ctx.fillStyle = gr
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-w * 1.15, -h * .22, -w * .7, -h * .62, sway, -h); ctx.bezierCurveTo(w * .7, -h * .62, w * 1.15, -h * .22, 0, 0); ctx.fill(); ctx.restore()
    }
    drop(1, 'rgba(255,100,10,.9)', 'rgba(255,170,40,.1)'); drop(.74, 'rgba(255,185,50,1)', 'rgba(255,235,140,.25)'); drop(.42, 'rgba(255,248,215,1)', 'rgba(255,255,255,.2)')
    ctx.fillStyle = 'rgba(80,120,255,.5)'; ctx.beginPath(); ctx.ellipse(0, -17, 4.5, 7, 0, 0, TAU); ctx.fill()
    r = ctx.createRadialGradient(0, -45, 4, 0, -45, 150); r.addColorStop(0, `rgba(255,170,70,${.4 * fl})`); r.addColorStop(1, 'rgba(255,100,20,0)')
    ctx.fillStyle = r; ctx.fillRect(-160, -200, 320, 320)
    ctx.globalCompositeOperation = 'source-over'
  }
  ctx.restore()
}

function DiyaStage({ diyas, onToggle, onAll, couple }) {
  const cv = useRef(null), lay = useRef({ sc: 1, pts: [] })
  const st = useRef({}); st.current = { diyas, couple }
  useEffect(() => {
    const c = cv.current, ctx = c.getContext('2d')
    const pat = ctx.createPattern(floorPattern(), 'repeat')
    const prev = st.current.diyas.slice(), smoke = [], embers = []
    let raf = 0
    const frame = t => {
      const [W, H] = fit(c, ctx)
      const sc = Math.max(.5, Math.min(W / 1000, H / 560))
      const pts = Array.from({ length: N_DIYA }, (_, i) => { const u = (i - (N_DIYA - 1) / 2) / ((N_DIYA - 1) / 2); return [W * (.5 + u * .42), H * (.56 + .08 * (1 - u * u))] })
      lay.current = { sc, pts }
      const { diyas: D, couple: cp } = st.current
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H)
      const v = ctx.createRadialGradient(W / 2, H * .6, H * .2, W / 2, H * .6, Math.max(W, H) * .75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.78)')
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
      D.forEach((on, i) => {
        if (prev[i] && !on) for (let k = 0; k < 14; k++) smoke.push({ x: pts[i][0] + rnd(-4, 4) * sc, y: pts[i][1] - 20 * sc, vx: rnd(-.2, .2), vy: -rnd(.4, 1), life: 1, r: rnd(8, 16) * sc })
        prev[i] = on
      })
      ctx.globalCompositeOperation = 'lighter'
      D.forEach((on, i) => {
        if (!on) return
        const [x, y] = pts[i], fl = flick(t, i)
        const g = ctx.createRadialGradient(x, y + 30 * sc, 10, x, y + 30 * sc, 300 * sc); g.addColorStop(0, `rgba(255,140,50,${.3 * fl})`); g.addColorStop(1, 'rgba(255,90,20,0)')
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
        if (embers.length < 200 && Math.random() < .06) embers.push({ x: x + rnd(-5, 5) * sc, y: y - 40 * sc, vx: rnd(-.3, .3), vy: -rnd(.6, 1.6), life: 1 })
      })
      ctx.globalCompositeOperation = 'source-over'
      pts.forEach(([x, y], i) => drawDiya(ctx, x, y, sc, D[i], t, i))
      ctx.globalCompositeOperation = 'lighter'
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i]; e.x += e.vx; e.y += e.vy; e.vx += rnd(-.03, .03); e.life -= .008
        if (e.life <= 0) { embers.splice(i, 1); continue }
        if (cp) { ctx.fillStyle = `rgba(255,110,150,${e.life})`; ctx.font = `${12 * sc}px sans-serif`; ctx.fillText('♥', e.x, e.y) }
        else { ctx.fillStyle = `rgba(255,170,70,${e.life})`; ctx.fillRect(e.x, e.y, 2, 2) }
      }
      ctx.globalCompositeOperation = 'source-over'
      for (let i = smoke.length - 1; i >= 0; i--) {
        const s = smoke[i]; s.x += s.vx + Math.sin(t * .003 + i) * .2; s.y += s.vy; s.r += .35; s.life -= .012
        if (s.life <= 0) { smoke.splice(i, 1); continue }
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r); g.addColorStop(0, `rgba(190,180,175,${.22 * s.life})`); g.addColorStop(1, 'rgba(190,180,175,0)')
        ctx.fillStyle = g; ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])
  const hit = e => {
    const b = cv.current.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top, { sc, pts } = lay.current
    for (let i = 0; i < pts.length; i++) if (Math.abs(x - pts[i][0]) < 80 * sc && y > pts[i][1] - 110 * sc && y < pts[i][1] + 60 * sc) { onToggle(i); break }
  }
  const n = diyas.filter(Boolean).length
  return <div className="lv-pane">
    <canvas ref={cv} className="lv-diya" onPointerDown={hit} />
    <div className="lv-cap"><span className="lv-eye">{couple ? 'LIGHT THEM TOGETHER' : 'TAP A DIYA'}</span><h2>Diya <em>World</em></h2><p>{n} of {N_DIYA} lit</p></div>
    <div className="lv-hud"><button className="lv-btn gold" onClick={() => onAll(true)}>Light all</button><button className="lv-btn" onClick={() => onAll(false)}>Blow out all</button></div>
  </div>
}

/* ───────────── rangoli (powder grains, symmetry, shared) ───────────── */
function Rangoli({ send, live, stampsRef, sub }) {
  const cv = useRef(null), pending = useRef([]), last = useRef(null), gen = useRef(0)
  const [col, setCol] = useState(0), [size, setSize] = useState(9), [sym, setSym] = useState(8), [mir, setMir] = useState(true), [erase, setErase] = useState(false)
  const opt = useRef({}); opt.current = { col, size, sym, mir, erase }
  const sendRef = useRef(send); sendRef.current = send
  const liveRef = useRef(live); liveRef.current = live

  const base = useCallback(() => {
    const ctx = cv.current.getContext('2d'), r = mulberry32(7)
    ctx.globalAlpha = 1; ctx.fillStyle = FLOOR; ctx.fillRect(0, 0, S, S)
    for (let i = 0; i < 5000; i++) { ctx.fillStyle = r() < .5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.18)'; ctx.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2) }
    ctx.fillStyle = 'rgba(255,255,255,.22)'
    for (let gy = 50; gy < S; gy += 50) for (let gx = 50; gx < S; gx += 50) if (Math.hypot(gx - S / 2, gy - S / 2) < 420) { ctx.beginPath(); ctx.arc(gx, gy, 2.2, 0, TAU); ctx.fill() }
  }, [])

  const apply = useCallback(s => {
    const ctx = cv.current.getContext('2d'), [nx, ny, c, r, sy, mi, seed] = s
    const px = nx * S - S / 2, py = ny * S - S / 2
    ctx.fillStyle = c < 0 ? FLOOR : PALETTE[c]
    const n = Math.max(6, Math.round(r * 1.3))
    for (let k = 0; k < sy; k++) {
      const a = TAU * k / sy, ca = Math.cos(a), sa = Math.sin(a)
      const copies = [[px * ca - py * sa, px * sa + py * ca]]
      if (mi) copies.push([px * ca + py * sa, px * sa - py * ca])
      for (const [qx, qy] of copies) {
        const rng = mulberry32(seed)
        for (let j = 0; j < n; j++) {
          const ang = rng() * TAU, d = r * Math.sqrt(rng()), w = .7 + rng() * 1.6
          ctx.globalAlpha = .72 + rng() * .28
          ctx.fillRect(S / 2 + qx + Math.cos(ang) * d, S / 2 + qy + Math.sin(ang) * d, w, w)
        }
      }
    }
    ctx.globalAlpha = 1
  }, [])

  const replay = useCallback(() => {
    const g = ++gen.current; base()
    const list = stampsRef.current.slice(); let i = 0
    const step = () => { if (g !== gen.current) return; for (let k = 0; k < 100 && i < list.length; k++) apply(list[i++]); if (i < list.length) requestAnimationFrame(step) }
    step()
  }, [base, apply, stampsRef])

  useEffect(() => {
    replay()
    const off = sub(m => {
      if (m.t === 'stamps') m.list.forEach(apply)
      else if (m.t === 'rclear') { gen.current++; base() }
      else if (m.t === 'init') replay()
    })
    const id = setInterval(() => {
      const p = pending.current; if (!p.length) return
      if (!liveRef.current) { p.length = 0; return }
      sendRef.current({ t: 'stamps', list: p.splice(0, 150) })
    }, 60)
    return () => { off(); clearInterval(id); gen.current++ }
  }, [replay, sub, apply, base])

  const add = s => { apply(s); stampsRef.current.push(s); pending.current.push(s) }
  const stampAt = (x, y) => { const o = opt.current; add([+x.toFixed(4), +y.toFixed(4), o.erase ? -1 : o.col, o.erase ? o.size * 1.6 : o.size, o.sym, o.mir ? 1 : 0, (Math.random() * 2 ** 31) | 0]) }
  const pos = e => { const b = cv.current.getBoundingClientRect(); return [(e.clientX - b.left) / b.width, (e.clientY - b.top) / b.height] }
  const down = e => { e.currentTarget.setPointerCapture(e.pointerId); const p = pos(e); last.current = p; stampAt(p[0], p[1]) }
  const move = e => {
    if (!last.current) return
    const [x, y] = pos(e), [lx, ly] = last.current
    const d = Math.hypot((x - lx) * S, (y - ly) * S), step = Math.max(2, opt.current.size * .45), n = Math.floor(d / step)
    if (!n) return
    for (let k = 1; k <= n; k++) stampAt(lx + (x - lx) * k / n, ly + (y - ly) * k / n)
    last.current = [x, y]
  }
  const clear = () => { gen.current++; base(); stampsRef.current = []; if (live) send({ t: 'rclear' }) }
  const preset = () => {
    const pts = [], seed = () => (Math.random() * 2 ** 31) | 0
    ;[[78, 6, 0], [150, 8, 1], [225, 10, 6], [300, 12, 2]].forEach(([R, k, c]) => { for (let a = 0; a < TAU; a += .025) { const rr = R * (.62 + .38 * Math.cos(k * a)); pts.push([.5 + rr * Math.cos(a) / S, .5 + rr * Math.sin(a) / S, c, 7, 1, 0, seed()]) } })
    pts.push([.5, .5, 3, 22, 1, 0, seed()])
    let i = 0; const tick = () => { pts.slice(i, i + 40).forEach(add); i += 40; if (i < pts.length) requestAnimationFrame(tick) }; tick()
  }
  const download = () => cv.current.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'my-rangoli.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000) })

  return <div className="lv-pane lv-rg">
    <div className="lv-rg-board"><canvas ref={cv} width={S} height={S} onPointerDown={down} onPointerMove={move} onPointerUp={() => { last.current = null }} onPointerCancel={() => { last.current = null }} /></div>
    <div className="lv-tools">
      <div><span className="lv-eye">RANGOLI</span><h2 style={{ fontFamily: 'Georgia,serif', fontWeight: 400, margin: '4px 0' }}>Pour the <em style={{ color: '#e8b95c' }}>colour</em></h2></div>
      <div className="lv-sw">{PALETTE.map((c, i) => <button key={c} style={{ background: c, color: c }} className={!erase && col === i ? 'on' : ''} onClick={() => { setCol(i); setErase(false) }} aria-label={'colour ' + (i + 1)} />)}</div>
      <label>Powder size {size}<input type="range" min="3" max="30" value={size} onChange={e => setSize(+e.target.value)} /></label>
      <label>Symmetry<select value={sym} onChange={e => setSym(+e.target.value)}>{[[1, 'Off'], [4, '4-fold'], [6, '6-fold'], [8, '8-fold'], [12, '12-fold']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <button className={'lv-btn' + (mir ? ' on' : '')} onClick={() => setMir(v => !v)}>Mirror {mir ? 'on' : 'off'}</button>
      <button className={'lv-btn' + (erase ? ' on' : '')} onClick={() => setErase(v => !v)}>Eraser</button>
      <button className="lv-btn" onClick={preset}>Auto-pour a mandala</button>
      <button className="lv-btn" onClick={clear}>Clear floor</button>
      <button className="lv-btn gold" onClick={download}>Download PNG</button>
    </div>
  </div>
}

/* ───────────── fireworks + ground crackers ───────────── */
const SHELLS = ['peony', 'chrys', 'willow', 'ring', 'heart', 'crackle', 'palm']
const GROUND = ['anar', 'chakri']
const KIND_LABEL = { random: 'Random', peony: 'Peony', chrys: 'Chrysanthemum', willow: 'Willow', ring: 'Ring', heart: 'Heart', crackle: 'Crackle', palm: 'Palm', anar: 'Anar', chakri: 'Chakri' }
const HUE_CHOICES = [['Random', -1], ['Multi', -2], ['Gold', 42], ['Red', 2], ['Green', 130], ['Blue', 212], ['Pink', 325]]

function Fireworks({ send, sub, couple }) {
  const cv = useRef(null), skyRef = useRef(null), api = useRef({})
  const [kind, setKind] = useState(couple ? 'heart' : 'random'), [hue, setHue] = useState(-1), [auto, setAuto] = useState(false), [sound, setSound] = useState(true)
  const opt = useRef({}); opt.current = { kind, hue, sound }
  const sendRef = useRef(send); sendRef.current = send

  useEffect(() => {
    const c = cv.current, ctx = c.getContext('2d'), sk = skyRef.current, sctx = sk.getContext('2d')
    let W = 0, H = 0, f = 1, dpr = 1, raf = 0, last = performance.now(), idle = 0, actx = null, noise = null
    const rockets = [], parts = [], flashes = [], emitters = []

    const ensureAudio = () => {
      if (actx || !opt.current.sound) return
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return
      actx = new AC(); const n = actx.sampleRate; noise = actx.createBuffer(1, n, n)
      const d = noise.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
    }
    const hit = (delay, { dur = .8, f0 = 900, f1 = 80, gain = .35, type = 'lowpass', thump = true } = {}) => {
      if (!actx || !opt.current.sound) return
      if (actx.state === 'suspended') actx.resume()
      const t = actx.currentTime + delay
      const s = actx.createBufferSource(); s.buffer = noise
      const fl = actx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + dur)
      const g = actx.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur)
      s.connect(fl); fl.connect(g); g.connect(actx.destination); s.start(t, Math.random() * .1, dur + .05)
      if (thump) {
        const o = actx.createOscillator(), og = actx.createGain()
        o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(38, t + .35)
        og.gain.setValueAtTime(gain * .9, t); og.gain.exponentialRampToValueAtTime(.0001, t + .4)
        o.connect(og); og.connect(actx.destination); o.start(t); o.stop(t + .45)
      }
    }

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2); W = c.clientWidth; H = c.clientHeight; f = Math.max(.6, Math.min(1.6, H / 650))
      for (const k of [c, sk]) { k.width = Math.round(W * dpr); k.height = Math.round(H * dpr) }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); sctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const g = sctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#02030a'); g.addColorStop(.7, '#0b1230'); g.addColorStop(1, '#2a1630')
      sctx.fillStyle = g; sctx.fillRect(0, 0, W, H)
      const r = mulberry32(5); sctx.fillStyle = '#fff'
      for (let i = 0; i < 140; i++) { sctx.globalAlpha = .15 + r() * .6; sctx.fillRect(r() * W, r() * H * .75, r() < .9 ? 1 : 2, r() < .9 ? 1 : 2) }
      sctx.globalAlpha = 1
      let x = -10; sctx.fillStyle = '#04050b'
      while (x < W) {
        const w = 24 + r() * 50, h = H * (.07 + r() * .17)
        sctx.fillRect(x, H - h, w, h); sctx.fillStyle = 'rgba(255,200,110,.55)'
        for (let wy = H - h + 8; wy < H - 6; wy += 12) for (let wx = x + 5; wx < x + w - 6; wx += 10) if (r() < .22) sctx.fillRect(wx, wy, 3, 4)
        sctx.fillStyle = '#04050b'; x += w + r() * 6
      }
    }

    const addP = (x, y, vx, vy, o) => parts.push({ x, y, px: x, py: y, vx, vy, life: 1, decay: .012, drag: .97, g: .035, size: 1.6, h: 40, s: 100, tw: false, crackle: false, ...o })

    const burst = (x, y, kind, hue) => {
      const base = hue >= 0 ? hue : rnd(0, 360), alt = (base + rnd(70, 180)) % 360
      const col = () => hue === -2 ? pick([base, alt, 42, 0]) : base + rnd(-10, 10)
      const sph = () => { const th = rnd(0, TAU), ph = Math.acos(rnd(-1, 1)); return [Math.sin(ph) * Math.cos(th), Math.sin(ph) * Math.sin(th)] }
      let sp = rnd(3.4, 4.4) * f
      if (kind === 'peony') {
        for (let i = 0; i < 110; i++) { const [a, b] = sph(); addP(x, y, a * sp, b * sp, { h: col(), decay: rnd(.011, .016) }) }
        for (let i = 0; i < 28; i++) { const [a, b] = sph(); addP(x, y, a * sp * .4, b * sp * .4, { h: alt, decay: .02, size: 1.3 }) }
      } else if (kind === 'chrys') {
        for (let i = 0; i < 95; i++) { const [a, b] = sph(); addP(x, y, a * sp, b * sp, { h: col(), decay: rnd(.007, .01), drag: .975, tw: true, size: 1.9 }) }
      } else if (kind === 'willow') {
        sp = rnd(2.6, 3.2) * f
        for (let i = 0; i < 100; i++) { const [a, b] = sph(); addP(x, y, a * sp, b * sp, { h: hue >= 0 ? hue : 40, s: 90, decay: rnd(.0035, .005), drag: .978, g: .05, size: 1.8, tw: true }) }
      } else if (kind === 'ring') {
        const tilt = rnd(0, 3.14), k = rnd(.3, .9), ct = Math.cos(tilt), st = Math.sin(tilt)
        for (let i = 0; i < 72; i++) { const a = i / 72 * TAU, ex = Math.cos(a) * sp, ey = Math.sin(a) * sp * k; addP(x, y, ex * ct - ey * st, ex * st + ey * ct, { h: col(), decay: .013, size: 2 }) }
      } else if (kind === 'heart') {
        const h0 = hue >= 0 ? hue : 340
        for (let i = 0; i < 100; i++) { const t = i / 100 * TAU, hx = 16 * Math.pow(Math.sin(t), 3), hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)); addP(x, y, hx / 16 * sp * .95, hy / 16 * sp * .95, { h: h0 + rnd(-8, 8), decay: .012, size: 2.1, drag: .965 }) }
      } else if (kind === 'crackle') {
        for (let i = 0; i < 110; i++) { const [a, b] = sph(); addP(x, y, a * sp, b * sp, { h: hue >= 0 ? hue : 45, s: 80, decay: rnd(.012, .018), crackle: true, size: 1.8 }) }
      } else {
        for (let arm = 0; arm < 14; arm++) { const a = arm / 14 * TAU + rnd(-.05, .05); for (let j = 0; j < 7; j++) { const s2 = sp * (.55 + j * .09); addP(x, y, Math.cos(a) * s2, Math.sin(a) * s2, { h: hue >= 0 ? hue : 40, s: 85, decay: .009 + j * .0008, g: .06, size: 2 }) } }
      }
      flashes.push({ x, y, life: 1, h: base })
      const dly = .25 + (1 - y / H) * .35
      hit(dly, { gain: kind === 'heart' || kind === 'ring' ? .28 : .4 })
      if (kind === 'crackle') for (let i = 0; i < 9; i++) hit(dly + .5 + i * rnd(.05, .2), { dur: .08, f0: 6000, f1: 800, gain: .12, thump: false, type: 'highpass' })
    }

    const launch = (xn, yn, kind, hue) => {
      if (kind === 'random') kind = pick(SHELLS)
      if (GROUND.includes(kind)) {
        emitters.push({ x: xn * W, y: H - 18, kind, t: 0, a: 0 })
        hit(0, { dur: 3, f0: 5000, f1: 2500, gain: .06, type: 'highpass', thump: false })
        return
      }
      const ty = Math.min(yn, .75) * H, dist = H - ty
      rockets.push({ x: xn * W, y: H + 6, vx: rnd(-.25, .25), vy: -(1.6 + .015 * dist), kind, hue })
      hit(0, { dur: .6, f0: 500, f1: 3500, gain: .1, type: 'highpass', thump: false })
    }
    api.current = { launch, ensureAudio }

    const frame = now => {
      const dt = Math.min(now - last, 50); last = now
      const k = dt / 16.667
      ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.fillRect(0, 0, W, H)
      ctx.globalCompositeOperation = 'lighter'
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i]; r.vy *= Math.pow(.985, k); r.x += r.vx * k; r.y += r.vy * k
        for (let j = 0; j < 2; j++) addP(r.x, r.y, rnd(-.3, .3), rnd(.2, .8), { h: 35, s: 90, decay: .07, drag: .95, g: .02, size: 1.2 })
        ctx.fillStyle = '#fff3c8'; ctx.beginPath(); ctx.arc(r.x, r.y, 1.8, 0, TAU); ctx.fill()
        if (r.vy > -1.6) { burst(r.x, r.y, r.kind, r.hue); rockets.splice(i, 1) }
      }
      for (let i = emitters.length - 1; i >= 0; i--) {
        const e = emitters[i]; e.t += dt
        if (e.kind === 'anar') {
          for (let j = 0; j < 5; j++) { const a = -1.5708 + rnd(-.28, .28), s = rnd(5, 9.5) * f; addP(e.x, e.y, Math.cos(a) * s, Math.sin(a) * s, { h: pick([32, 40, 48]), decay: rnd(.018, .03), drag: .985, g: .13, size: 1.5, tw: true }) }
        } else {
          e.a += .55 * k
          for (let j = 0; j < 3; j++) { const a = e.a + j * 2.094; addP(e.x + Math.cos(a) * 6, e.y - 10 + Math.sin(a) * 3, Math.cos(a) * rnd(3, 5) * f, Math.sin(a) * rnd(1.2, 2.4) * f - .8, { h: pick([45, 200, 30]), s: 70, decay: rnd(.03, .05), drag: .96, g: .08, size: 1.4 }) }
        }
        const gl = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, 80); gl.addColorStop(0, 'rgba(255,170,70,.28)'); gl.addColorStop(1, 'rgba(255,120,30,0)')
        ctx.fillStyle = gl; ctx.fillRect(e.x - 80, e.y - 80, 160, 160)
        if (e.t > (e.kind === 'anar' ? 3200 : 3600)) emitters.splice(i, 1)
      }
      for (let i = flashes.length - 1; i >= 0; i--) {
        const fl = flashes[i]; fl.life -= .06 * k
        if (fl.life <= 0) { flashes.splice(i, 1); continue }
        const R = 260 * f, g = ctx.createRadialGradient(fl.x, fl.y, 0, fl.x, fl.y, R)
        g.addColorStop(0, `hsla(${fl.h},90%,70%,${.35 * fl.life})`); g.addColorStop(1, `hsla(${fl.h},90%,50%,0)`)
        ctx.fillStyle = g; ctx.fillRect(fl.x - R, fl.y - R, R * 2, R * 2)
      }
      if (parts.length > 5000) parts.splice(0, parts.length - 5000)
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]
        p.px = p.x; p.py = p.y
        const d = Math.pow(p.drag, k)
        p.vx *= d; p.vy = p.vy * d + p.g * k; p.x += p.vx * k; p.y += p.vy * k; p.life -= p.decay * k
        if (p.life <= 0 || p.y > H + 20) {
          if (p.crackle && p.life <= 0) for (let j = 0; j < 3; j++) addP(p.x, p.y, rnd(-1.4, 1.4), rnd(-1.4, 1.4), { h: 50, s: 20, decay: .09, size: 1.2, g: .02 })
          parts.splice(i, 1); continue
        }
        const a = p.life, fl = p.tw && Math.random() < .3 ? .3 : 1
        ctx.strokeStyle = `hsla(${p.h},${p.s}%,${50 + 40 * a * a * a}%,${Math.pow(a, .6) * fl})`
        ctx.lineWidth = p.size * (.5 + .5 * a); ctx.lineCap = 'round'
        ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke()
      }
      if (!rockets.length && !parts.length && !flashes.length && !emitters.length) { if (++idle === 90) ctx.clearRect(0, 0, W, H) } else idle = 0
      raf = requestAnimationFrame(frame)
    }

    resize(); window.addEventListener('resize', resize)
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); if (actx) actx.close() }
  }, [])

  useEffect(() => sub(m => { if (m.t === 'fire') api.current.launch?.(m.x, m.y, m.kind, m.hue) }), [sub])

  const fire = (xn, yn, k = opt.current.kind, h = opt.current.hue) => {
    if (k === 'random') k = pick(SHELLS)
    if (h === -1) h = Math.floor(rnd(0, 360))
    api.current.launch?.(xn, yn, k, h)
    sendRef.current({ t: 'fire', x: xn, y: yn, kind: k, hue: h })
  }
  const fireAt = e => {
    api.current.ensureAudio?.()
    const b = cv.current.getBoundingClientRect()
    fire((e.clientX - b.left) / b.width, (e.clientY - b.top) / b.height)
  }
  useEffect(() => {
    if (!auto) return
    let t
    const loop = () => { fire(rnd(.1, .9), rnd(.12, .5), pick(SHELLS), opt.current.hue); t = setTimeout(loop, rnd(500, 1500)) }
    loop()
    return () => clearTimeout(t)
  }, [auto])
  const finale = () => { api.current.ensureAudio?.(); for (let i = 0; i < 14; i++) setTimeout(() => fire(rnd(.08, .92), rnd(.1, .45), pick(SHELLS), -2), i * 180) }

  const kinds = couple ? ['heart', 'random', ...SHELLS.filter(s => s !== 'heart'), ...GROUND] : ['random', ...SHELLS, ...GROUND]
  return <div className="lv-fw">
    <canvas ref={skyRef} />
    <canvas ref={cv} className="lv-fw-top" onPointerDown={fireAt} />
    <div className="lv-cap"><span className="lv-eye">TAP THE SKY · SOUND {sound ? 'ON' : 'OFF'}</span><h2>Night <em>sky</em></h2><p>Anar and chakri light up from the ground where you tap.</p></div>
    <div className="lv-hud">
      {kinds.map(k => <button key={k} className={'lv-btn' + (kind === k ? ' on' : '')} onClick={() => setKind(k)}>{KIND_LABEL[k]}</button>)}
      <span style={{ width: '100%' }} />
      {HUE_CHOICES.map(([l, v]) => <button key={l} className={'lv-btn' + (hue === v ? ' on' : '')} onClick={() => setHue(v)}>{l}</button>)}
      <span style={{ width: '100%' }} />
      <button className={'lv-btn' + (auto ? ' on' : '')} onClick={() => { api.current.ensureAudio?.(); setAuto(v => !v) }}>Auto show</button>
      <button className="lv-btn gold" onClick={finale}>Grand finale</button>
      <button className="lv-btn" onClick={() => setSound(v => !v)}>Sound {sound ? 'on' : 'off'}</button>
    </div>
  </div>
}

/* ───────────── chat (memory only — refresh wipes it) ───────────── */
function Side({ users, me, msgs, live, send, couple, room, open, onClose }) {
  const [d, setD] = useState(''), end = useRef(null)
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [msgs, open])
  const go = (text, kind) => { const t = (text ?? d).trim(); if (!t || !live) return; send({ t: 'chat', text: t, kind }); if (text == null) setD('') }
  const quick = couple ? ['💗 thinking of you', '🪔 light yours too', '✨ look at the sky'] : ['🪔 Shubh Deepawali!', '✨ look at the sky', '🎆 more crackers!']
  return <aside className={'lv-side' + (open ? ' open' : '')}>
    <div className="lv-side-head"><b>{couple ? 'Just us' : 'In this room'}</b><span>{room || 'solo'}</span><button className="lv-btn lv-x" onClick={onClose}>✕</button></div>
    <div className="lv-people">{users.length ? users.map(u => <span key={u.id} className="lv-chip" style={{ '--h': u.hue }}><i>{(u.name[0] || '?').toUpperCase()}</i>{u.name}{u.id === me ? ' (you)' : ''}</span>) : <small>You are playing solo. Join a room to play together.</small>}</div>
    <div className="lv-msgs">{msgs.map(m => m.kind === 'sys'
      ? <div key={m.id} className="lv-sys">{m.name} {m.text}</div>
      : <div key={m.id} className={'lv-msg' + (m.from === me ? ' me' : '') + (m.kind === 'love' ? ' love' : '')}><small>{m.from === me ? 'You' : m.name} · {timeOf(m.at)}</small><p>{m.text}</p></div>)}<div ref={end} /></div>
    <div className="lv-quick">{quick.map(q => <button key={q} disabled={!live} onClick={() => go(q, couple ? 'love' : 'msg')}>{q}</button>)}</div>
    <form className="lv-compose" onSubmit={e => { e.preventDefault(); go() }}><input value={d} maxLength={400} onChange={e => setD(e.target.value)} placeholder={live ? 'say something…' : 'join a room to chat'} disabled={!live} /><button disabled={!live || !d.trim()}>Send</button></form>
    <p className="lv-note">Chat is kept in memory only. Refresh and it's gone.</p>
  </aside>
}

function Lobby({ name, setName, room, setRoom, mode, setMode, onJoin, onSolo, err }) {
  return <div className="lv-lobby"><div className="lv-card">
    <span className="lv-eye">PLAY TOGETHER</span>
    <h2>Light it up <em>with someone.</em></h2>
    <p>Same room code, same sky, same diyas, same rangoli floor. No account needed.</p>
    {err && <div className="lv-err">{err}</div>}
    <label>Your name<input value={name} maxLength={20} onChange={e => setName(e.target.value)} placeholder="your name" /></label>
    <div className="lv-seg"><button className={mode === 'friends' ? 'on' : ''} onClick={() => setMode('friends')}>👥 Friends</button><button className={mode === 'couple' ? 'on' : ''} onClick={() => setMode('couple')}>💞 Couple (2)</button></div>
    <label>Room code<div className="lv-row"><input value={room} onChange={e => setRoom(clean(e.target.value))} /><button type="button" className="lv-btn" onClick={() => setRoom(genRoom())}>🎲</button></div></label>
    <button className="lv-btn gold big" disabled={!name.trim() || !room} onClick={onJoin}>Join room</button>
    <button className="lv-link" onClick={onSolo}>or play solo</button>
  </div></div>
}

/* ───────────── shell ───────────── */
export default function Live({ onExit }) {
  const hp = useMemo(() => { const q = new URLSearchParams(location.hash.split('?')[1] || ''); return { room: clean(q.get('room')), mode: q.get('mode') === 'couple' ? 'couple' : 'friends' } }, [])
  const [name, setName] = useState(() => localStorage.getItem('dv-name') || '')
  const [roomIn, setRoomIn] = useState(hp.room || genRoom())
  const [mode, setMode] = useState(hp.mode)
  const [roomMode, setRoomMode] = useState(hp.mode)
  const [cfg, setCfg] = useState(null)
  const [solo, setSolo] = useState(false)
  const [tab, setTab] = useState('diya')
  const [chatOpen, setChatOpen] = useState(false)
  const [diyas, setDiyas] = useState(() => Array(N_DIYA).fill(false))
  const [msgs, setMsgs] = useState([])
  const [copied, setCopied] = useState(false)
  const stampsRef = useRef([]), subs = useRef(new Set())
  const sub = useCallback(fn => { subs.current.add(fn); return () => subs.current.delete(fn) }, [])

  const onMsg = useCallback(m => {
    if (m.t === 'init') { setDiyas(m.diyas); stampsRef.current = m.stamps; setRoomMode(m.mode) }
    else if (m.t === 'diya') setDiyas(m.diyas)
    else if (m.t === 'stamps') { for (const s of m.list) stampsRef.current.push(s) }
    else if (m.t === 'rclear') stampsRef.current = []
    else if (m.t === 'chat') setMsgs(a => [...a, m].slice(-200))
    subs.current.forEach(fn => fn(m))
  }, [])
  const { status, users, me, err, fails, send } = useRoom(cfg, onMsg)
  const live = status === 'live'
  const couple = live && roomMode === 'couple'

  const toggleDiya = i => { if (live) send({ t: 'diya', i, v: !diyas[i] }); else setDiyas(a => a.map((x, j) => j === i ? !x : x)) }
  const allDiya = v => { if (live) send({ t: 'diyaAll', v }); else setDiyas(Array(N_DIYA).fill(v)) }
  const join = () => { const n = name.trim(); if (!n) return; localStorage.setItem('dv-name', n); setMsgs([]); setRoomMode(mode); setCfg({ room: clean(roomIn) || genRoom(), name: n.slice(0, 20), mode, n: Date.now() }) }
  const leave = () => { setCfg(null); setSolo(true); setMsgs([]) }
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
        <span className={'lv-pill' + (live ? ' on' : '')}>{live ? `● ${users.length} online${couple ? ' · couple' : ''}` : cfg ? (fails >= 2 ? 'server unreachable' : status) : 'solo'}</span>
        {live && <button className="lv-btn" onClick={invite}>{copied ? 'copied ✓' : 'invite link'}</button>}
        {!cfg && <button className="lv-btn gold" onClick={() => setSolo(false)}>join room</button>}
        {cfg && <button className="lv-btn" onClick={leave}>leave</button>}
        <button className="lv-btn lv-chat-toggle" onClick={() => setChatOpen(v => !v)}>chat</button>
      </div>
    </header>
    <div className="lv-body">
      <main className="lv-stage">
        {tab === 'diya' && <DiyaStage diyas={diyas} onToggle={toggleDiya} onAll={allDiya} couple={couple} />}
        {tab === 'rangoli' && <Rangoli send={send} live={live} stampsRef={stampsRef} sub={sub} />}
        {tab === 'fw' && <Fireworks send={send} sub={sub} couple={couple} />}
      </main>
      <Side users={users} me={me} msgs={msgs} live={live} send={send} couple={couple} room={cfg?.room} open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
    {showLobby && <Lobby name={name} setName={setName} room={roomIn} setRoom={setRoomIn} mode={mode} setMode={setMode} onJoin={join} onSolo={() => setSolo(true)} err={err} />}
    {cfg && !live && fails >= 2 && !err && <div className="lv-warn">can't reach the server. run <code>npm run server</code> or set VITE_WS_URL.</div>}
  </div>
}
