import React, { useCallback, useEffect, useRef, useState } from 'react'
import { FLOOR, PALETTE, TAU, drawDiya, fit, flick, mulberry32 } from './common.js'

const S = 900

export default function Rangoli({ send, live, stampsRef, sub, lights }) {
  const cv = useRef(null), ov = useRef(null)
  const pending = useRef([]), last = useRef(null)
  const q = useRef({ list: [], i: 0, raf: 0 })
  const [col, setCol] = useState(0), [size, setSize] = useState(9), [sym, setSym] = useState(8), [mir, setMir] = useState(true), [erase, setErase] = useState(false)
  const opt = useRef({}); opt.current = { col, size, sym, mir, erase }
  const sendRef = useRef(send); sendRef.current = send
  const liveRef = useRef(live); liveRef.current = live
  const lightsRef = useRef(lights); lightsRef.current = lights

  const base = useCallback(() => {
    const ctx = cv.current.getContext('2d'), r = mulberry32(7)
    ctx.globalAlpha = 1; ctx.fillStyle = FLOOR; ctx.fillRect(0, 0, S, S)
    for (let i = 0; i < 6000; i++) { ctx.fillStyle = r() < .5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.2)'; ctx.fillRect(r() * S, r() * S, 1 + r() * 2.2, 1 + r() * 2.2) }
    ctx.fillStyle = 'rgba(255,255,255,.22)'
    for (let gy = 50; gy < S; gy += 50) for (let gx = 50; gx < S; gx += 50) if (Math.hypot(gx - S / 2, gy - S / 2) < 420) { ctx.beginPath(); ctx.arc(gx, gy, 2.2, 0, TAU); ctx.fill() }
  }, [])

  // powder: each grain gets a tiny shadow and an occasional bright speck so it reads as raised dust
  const apply = useCallback(s => {
    const ctx = cv.current.getContext('2d'), [nx, ny, c, r, sy, mi, seed] = s
    const px = nx * S - S / 2, py = ny * S - S / 2
    const color = c < 0 ? FLOOR : PALETTE[Math.max(0, Math.min(7, c))]
    const n = Math.max(6, Math.round(r * 1.15))
    for (let k = 0; k < sy; k++) {
      const a = TAU * k / sy, ca = Math.cos(a), sa = Math.sin(a)
      const copies = [[px * ca - py * sa, px * sa + py * ca]]
      if (mi) copies.push([px * ca + py * sa, px * sa - py * ca])
      for (const [qx, qy] of copies) {
        const rng = mulberry32(seed)
        for (let j = 0; j < n; j++) {
          const ang = rng() * TAU, d = r * Math.sqrt(rng()), w = .7 + rng() * 1.6, al = .72 + rng() * .28, sh = rng()
          const gx = S / 2 + qx + Math.cos(ang) * d, gy = S / 2 + qy + Math.sin(ang) * d
          if (c >= 0 && sh < .45) { ctx.globalAlpha = .35; ctx.fillStyle = '#000'; ctx.fillRect(gx + .8, gy + 1, w, w) }
          ctx.globalAlpha = al; ctx.fillStyle = color; ctx.fillRect(gx, gy, w, w)
          if (c >= 0 && sh > .82) { ctx.globalAlpha = .4; ctx.fillStyle = '#fff'; ctx.fillRect(gx, gy, w * .5, w * .5) }
        }
      }
    }
    ctx.globalAlpha = 1
  }, [])

  const drain = useCallback(() => {
    const Q = q.current; Q.raf = 0
    let n = 0
    while (Q.i < Q.list.length && n < 70) { apply(Q.list[Q.i++]); n++ }
    if (Q.i < Q.list.length) Q.raf = requestAnimationFrame(drain); else { Q.list = []; Q.i = 0 }
  }, [apply])
  const enqueue = useCallback(list => { const Q = q.current; for (const s of list) Q.list.push(s); if (!Q.raf) Q.raf = requestAnimationFrame(drain) }, [drain])
  const resetQ = useCallback(() => { const Q = q.current; cancelAnimationFrame(Q.raf); Q.raf = 0; Q.list = []; Q.i = 0 }, [])

  useEffect(() => {
    base(); enqueue(stampsRef.current.slice())
    const off = sub(m => {
      if (m.t === 'stamps') enqueue(m.list)
      else if (m.t === 'rclear') { resetQ(); base() }
    })
    const id = setInterval(() => {
      const p = pending.current; if (!p.length) return
      if (!liveRef.current) { p.length = 0; return }
      sendRef.current({ t: 'stamps', list: p.splice(0, 200) })
    }, 100)
    return () => { off(); clearInterval(id); resetQ() }
  }, [base, enqueue, resetQ, stampsRef, sub])

  // warm light that flickers over the floor; corner diyas light up as the room's total grows
  useEffect(() => {
    const c = ov.current, ctx = c.getContext('2d'); let raf = 0
    const frame = t => {
      const [W, H] = fit(c, ctx); ctx.clearRect(0, 0, W, H)
      const L = lightsRef.current, sc = Math.max(.3, W / 900) * .6
      const corners = [[.1, .1], [.9, .1], [.1, .9], [.9, .9]]
      ctx.globalCompositeOperation = 'lighter'
      corners.forEach(([u, v], i) => {
        if (i >= L) return
        const x = W * u, y = H * v, R = W * .6, g = ctx.createRadialGradient(x, y, 4, x, y, R)
        g.addColorStop(0, `rgba(255,150,60,${.2 * flick(t, i)})`); g.addColorStop(1, 'rgba(255,100,20,0)')
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
      })
      ctx.globalCompositeOperation = 'source-over'
      corners.forEach(([u, v], i) => drawDiya(ctx, W * u, H * v, sc, i < L, t, i))
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

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
  const clear = () => { resetQ(); base(); stampsRef.current = []; if (live) send({ t: 'rclear' }) }
  const preset = () => {
    const pts = [], seed = () => (Math.random() * 2 ** 31) | 0
    ;[[78, 6, 0], [150, 8, 1], [225, 10, 6], [300, 12, 2]].forEach(([R, k, c]) => { for (let a = 0; a < TAU; a += .025) { const rr = R * (.62 + .38 * Math.cos(k * a)); pts.push([.5 + rr * Math.cos(a) / S, .5 + rr * Math.sin(a) / S, c, 7, 1, 0, seed()]) } })
    pts.push([.5, .5, 3, 22, 1, 0, seed()])
    let i = 0; const tick = () => { pts.slice(i, i + 40).forEach(add); i += 40; if (i < pts.length) requestAnimationFrame(tick) }; tick()
  }
  const download = () => cv.current.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'my-rangoli.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000) })
  const end = () => { last.current = null }

  return <div className="lv-pane lv-rg">
    <div className="lv-rg-board"><div className="lv-rg-wrap">
      <canvas ref={cv} width={S} height={S} onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={end} />
      <canvas ref={ov} className="lv-rg-ov" />
    </div></div>
    <div className="lv-tools">
      <div><span className="lv-eye">RANGOLI · {live ? 'LIVE' : 'SOLO'}</span><h2 style={{ fontFamily: 'Georgia,serif', fontWeight: 400, margin: '4px 0' }}>Pour the <em style={{ color: '#e8b95c' }}>colour</em></h2></div>
      <div className="lv-sw">{PALETTE.map((c, i) => <button key={c} style={{ background: c, color: c }} className={!erase && col === i ? 'on' : ''} onClick={() => { setCol(i); setErase(false) }} aria-label={'colour ' + (i + 1)} />)}</div>
      <label>Powder size {size}<input type="range" min="3" max="30" value={size} onChange={e => setSize(+e.target.value)} /></label>
      <label>Symmetry<select value={sym} onChange={e => setSym(+e.target.value)}>{[[1, 'Off'], [4, '4-fold'], [6, '6-fold'], [8, '8-fold'], [12, '12-fold']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <button className={'lv-btn' + (mir ? ' on' : '')} onClick={() => setMir(v => !v)}>Mirror {mir ? 'on' : 'off'}</button>
      <button className={'lv-btn' + (erase ? ' on' : '')} onClick={() => setErase(v => !v)}>Eraser</button>
      <button className="lv-btn" onClick={preset}>Auto-pour a mandala</button>
      <button className="lv-btn" onClick={clear}>Clear floor</button>
      <button className="lv-btn gold" onClick={download}>Download PNG</button>
      <small style={{ color: '#a99f8a' }}>Corner diyas light up as the room's total diyas grow: 1, 10, 100, 1000.</small>
    </div>
  </div>
}
