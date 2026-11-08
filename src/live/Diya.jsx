import React, { useEffect, useRef, useState } from 'react'
import { PER_PAGE, drawDiya, fit, flick, floorPattern, fmt, rnd } from './common.js'

export default function DiyaBoard({ users, players, me, online, live, couple = false, act, race, scores, offset }) {
  const cv = useRef(null)
  const lay = useRef({ cols: 7, cw: 100, ch: 100, sc: 1, x0: 0, y0: 0 })
  const st = useRef({ lit: 0, pg: 0, view: me })
  const cool = useRef(false)
  const [coolUi, setCoolUi] = useState(false)
  const [view, setView] = useState(me)
  const [page, setPage] = useState(0)
  const [bulk, setBulk] = useState('')
  const [jump, setJump] = useState('')
  const [now, setNow] = useState(Date.now())
  const [seen, setSeen] = useState(0)

  useEffect(() => { setView(v => users.some(u => u.id === v) ? v : me) }, [users, me])
  const lit = players[view]?.lit || 0
  const mine = view === me
  const pages = Math.max(1, Math.ceil((lit + 1) / PER_PAGE))
  const pg = Math.min(page, pages - 1)
  const front = Math.floor(lit / PER_PAGE)
  useEffect(() => { setPage(front) }, [view, front])
  st.current = { lit, pg, view }

  useEffect(() => {
    if (!race) return
    const id = setInterval(() => { const n = Date.now(); setNow(n); if (n + offset > race.start + race.dur + 500) clearInterval(id) }, 250)
    return () => clearInterval(id)
  }, [race, offset])

  const t0 = now + offset
  const phase = !race ? 'none' : t0 < race.start ? 'count' : t0 < race.start + race.dur ? 'run' : 'done'
  const remain = race ? Math.max(0, Math.ceil((race.start + race.dur - t0) / 1000)) : 0
  const cd = race ? Math.max(0, Math.ceil((race.start - t0) / 1000)) : 0
  const phaseRef = useRef(phase); phaseRef.current = phase

  useEffect(() => {
    const c = cv.current, ctx = c.getContext('2d')
    const pat = ctx.createPattern(floorPattern(), 'repeat')
    const smoke = [], embers = [], prev = { view: null, pg: -1, lit: 0 }
    let raf = 0
    const frame = t => {
      const [W, H] = fit(c, ctx)
      const cols = W < 700 ? 4 : 7, rows = Math.ceil(PER_PAGE / cols)
      const cw = W * .92 / cols, ch = H * .62 / rows, sc = Math.max(.3, Math.min(cw / 165, ch / 150))
      const L = lay.current = { cols, cw, ch, sc, x0: W * .04, y0: H * (W < 700 ? .3 : .24) }
      const { lit: N, pg: P, view: V } = st.current
      const pos = i => [L.x0 + (i % cols + .5) * cw, L.y0 + (Math.floor(i / cols) + .5) * ch + 8 * sc]
      if (prev.view === V && prev.pg === P && prev.lit > N) {
        for (let a = N; a < prev.lit; a++) { const i = a - P * PER_PAGE; if (i >= 0 && i < PER_PAGE && smoke.length < 300) { const [x, y] = pos(i); for (let k = 0; k < 6; k++) smoke.push({ x: x + rnd(-4, 4) * sc, y: y - 20 * sc, vx: rnd(-.2, .2), vy: -rnd(.4, 1), life: 1, r: rnd(8, 16) * sc }) } }
      }
      prev.view = V; prev.pg = P; prev.lit = N
      const on = i => P * PER_PAGE + i < N

      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H)
      const vg = ctx.createRadialGradient(W / 2, H * .6, H * .2, W / 2, H * .6, Math.max(W, H) * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.78)')
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H)

      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < PER_PAGE; i++) {
        if (!on(i)) continue
        const [x, y] = pos(i), fl = flick(t, i), R = 230 * sc
        const g = ctx.createRadialGradient(x, y + 30 * sc, 8, x, y + 30 * sc, R); g.addColorStop(0, `rgba(255,140,50,${.3 * fl})`); g.addColorStop(1, 'rgba(255,90,20,0)')
        ctx.fillStyle = g; ctx.fillRect(x - R, y + 30 * sc - R, R * 2, R * 2)
        if (embers.length < 150 && Math.random() < .03) embers.push({ x: x + rnd(-5, 5) * sc, y: y - 40 * sc, vx: rnd(-.3, .3), vy: -rnd(.6, 1.6), life: 1 })
      }
      ctx.globalCompositeOperation = 'source-over'
      for (let i = 0; i < PER_PAGE; i++) {
        const [x, y] = pos(i)
        drawDiya(ctx, x, y, sc, on(i), t, i)
        ctx.fillStyle = 'rgba(246,236,214,.38)'; ctx.font = `${Math.max(9, 12 * sc * 1.4)}px Inter,sans-serif`; ctx.textAlign = 'center'
        ctx.fillText(fmt(P * PER_PAGE + i + 1), x, y + 74 * sc)
      }
      ctx.globalCompositeOperation = 'lighter'
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i]; e.x += e.vx; e.y += e.vy; e.vx += rnd(-.03, .03); e.life -= .008
        if (e.life <= 0) { embers.splice(i, 1); continue }
        ctx.fillStyle = `rgba(255,170,70,${e.life})`; ctx.fillRect(e.x, e.y, 2, 2)
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

  const viewName = users.find(u => u.id === view)?.name || 'Them'
  // blow out someone else's diyas; short cooldown so it stays a prank, not a wipe
  const puff = (n, all, ms) => {
    if (cool.current || mine || !live) return
    cool.current = true; setCoolUi(true)
    act.blow(view, n, all, viewName)
    setTimeout(() => { cool.current = false; setCoolUi(false) }, ms)
  }
  const tap = idx => {
    if (phaseRef.current === 'count') return
    if (!mine) { if (idx < lit) puff(1, false, 350); else if (couple && live) act.partnerSet(view, idx + 1); return }
    if (phaseRef.current === 'run') { if (idx === lit) act.tap(); return }
    act.set(idx >= lit ? idx + 1 : idx)
  }
  const hit = e => {
    const b = cv.current.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top, L = lay.current
    for (let i = 0; i < PER_PAGE; i++) {
      const cx = L.x0 + (i % L.cols + .5) * L.cw, cy = L.y0 + (Math.floor(i / L.cols) + .5) * L.ch + 8 * L.sc
      if (Math.abs(x - cx) < L.cw / 2 && Math.abs(y - cy) < L.ch / 2) { tap(pg * PER_PAGE + i); return }
    }
  }

  const n = Math.min(1e12, Math.floor(Number(bulk) || 0))
  const free = mine && phase !== 'run' && phase !== 'count'
  const ranked = users.map(u => ({ ...u, lit: players[u.id]?.lit || 0, sc: scores[u.id] || 0 })).sort((a, b) => b.lit - a.lit)
  const top = Math.max(1, ranked[0]?.lit || 0)
  const other = ranked.find(u => u.id !== me)
  const myLit = players[me]?.lit || 0
  const d = other ? myLit - other.lit : 0
  const msg = !live || !other ? '' : d > 0 ? `You lead ${other.name} by ${fmt(d)}` : d < 0 ? `${other.name} leads by ${fmt(-d)}` : 'Dead heat'
  const rr = ranked.map(u => ({ id: u.id, name: u.name, n: u.sc })).sort((a, b) => b.n - a.n)
  const tie = rr.length > 1 && rr[0].n === rr[1].n

  return <div className="lv-pane">
    <canvas ref={cv} className="lv-diya" onPointerDown={hit} />
    <div className="lv-cap"><span className="lv-eye">{mine ? 'TAP A DIYA TO LIGHT UP TO IT' : 'TAP THEIR LIT DIYAS TO PUFF THEM OUT'}</span><h2>Diya <em>World</em></h2><p>{fmt(lit)} lit · {mine ? 'your board' : viewName + "'s board"}</p></div>

    <div className="lv-score">
      <div className="lv-score-head"><b>Scoreboard</b>{msg && <span>{msg}</span>}</div>
      {ranked.map((u, i) => <div key={u.id} className={'lv-srow' + (u.id === view ? ' on' : '')} onClick={() => setView(u.id)}>
        <i style={{ '--h': u.hue }}>{(u.name[0] || '?').toUpperCase()}</i>
        <div><div className="lv-sname">{i === 0 && u.lit > 0 && ranked.length > 1 && u.lit > ranked[1].lit ? '👑 ' : ''}{u.name}{u.id === me ? ' (you)' : ''}{online[u.id] ? <em className="lv-dot" /> : null}</div><div className="lv-bar"><span style={{ width: (u.lit / top * 100) + '%' }} /></div></div>
        <b>{fmt(u.lit)}</b>
      </div>)}
      {live && (phase === 'none' || phase === 'done') && <button className="lv-btn gold" onClick={act.startRace}>⚡ 60s sprint</button>}
      {phase === 'count' && <div className="lv-race">Starting in {cd}…</div>}
      {phase === 'run' && <div className="lv-race">{remain}s left · sprint {fmt(scores[me] || 0)} · tap only the next unlit diya</div>}
    </div>

    <div className="lv-hud lv-hud-col">
      {users.length > 1 && <div className="lv-switch">{ranked.map(u => <button key={u.id} className={'lv-chipbtn' + (u.id === view ? ' on' : '')} onClick={() => setView(u.id)}>{u.id === me ? 'My diyas' : u.name + "'s diyas"} · {fmt(u.lit)}</button>)}</div>}
      <div className="lv-pager">
        <button className="lv-btn" disabled={pg <= 0} onClick={() => setPage(pg - 1)}>‹</button>
        <span>Page {fmt(pg + 1)} / {fmt(pages)}</span>
        <button className="lv-btn" disabled={pg >= pages - 1} onClick={() => setPage(pg + 1)}>›</button>
        <input className="lv-mini" inputMode="numeric" placeholder="go to page" value={jump} onChange={e => setJump(e.target.value.replace(/[^0-9]/g, '').slice(0, 12))} onKeyDown={e => { if (e.key === 'Enter' && jump) { setPage(Math.max(0, Math.min(pages - 1, Number(jump) - 1))); setJump('') } }} />
        <button className="lv-btn" onClick={() => setPage(front)}>latest</button>
      </div>
      {mine ? <div className="lv-bulk">
        <input inputMode="numeric" placeholder="type any number, e.g. 500" value={bulk} disabled={!free} onChange={e => setBulk(e.target.value.replace(/[^0-9]/g, '').slice(0, 13))} />
        <button className="lv-btn gold" disabled={!free || !n} onClick={() => act.add(n)}>Light +{fmt(n)}</button>
        <button className="lv-btn" disabled={!free || !bulk} onClick={() => act.set(n)}>Set total</button>
        {[1, 10, 100, 1000].map(v => <button key={v} className="lv-btn" disabled={!free} onClick={() => act.add(v)}>+{fmt(v)}</button>)}
        <button className="lv-btn" disabled={!free} onClick={() => act.set((pg + 1) * PER_PAGE)}>Light this page</button>
        <button className="lv-btn" disabled={!free} onClick={() => act.set(0)}>Blow out all</button>
      </div> : <div className="lv-bulk">
        <span>{viewName}'s diyas:</span>
        {couple && <><input inputMode="numeric" placeholder="partner diya total" value={bulk} onChange={e => setBulk(e.target.value.replace(/[^0-9]/g, '').slice(0, 13))} />
          <button className="lv-btn gold" disabled={!n || !live} onClick={() => act.partnerAdd(view, n)}>🪔 Light +{fmt(n)}</button>
          <button className="lv-btn" disabled={!bulk || !live} onClick={() => act.partnerSet(view, n)}>Set total</button>
          {[1, 10, 100, 1000].map(v => <button key={v} className="lv-btn" disabled={!live} onClick={() => act.partnerAdd(view, v)}>+{fmt(v)}</button>)}
          <button className="lv-btn" disabled={!live} onClick={() => act.partnerSet(view, (pg + 1) * PER_PAGE)}>Light this page</button>
        </>}
        <button className="lv-btn" disabled={coolUi || !lit} onClick={() => puff(1, false, 400)}>💨 Blow 1</button>
        <button className="lv-btn" disabled={coolUi || !lit} onClick={() => puff(10, false, 1500)}>💨 Blow 10</button>
        <button className="lv-btn" disabled={coolUi || !lit} onClick={() => puff(100, false, 1500)}>💨 Blow 100</button>
        <button className="lv-btn gold" disabled={coolUi || !lit} onClick={() => puff(0, true, 2500)}>🌬️ Blow all</button>
        <button className="lv-btn" onClick={() => { setBulk(""); setView(me) }}>back to mine</button>
      </div>}
    </div>

    {phase === 'done' && race && seen !== race.start && <div className="lv-lobby"><div className="lv-card">
      <span className="lv-eye">SPRINT OVER</span>
      <h2>{rr.length > 1 && !tie ? <>{rr[0].name} <em>wins</em></> : tie ? <>It's a <em>tie</em></> : <>Your <em>sprint</em></>}</h2>
      {rr.map(r => <p key={r.id}>{r.name}: <b>{fmt(r.n)}</b> diyas in 60 seconds</p>)}
      <button className="lv-btn gold big" onClick={() => setSeen(race.start)}>Nice</button>
    </div></div>}
  </div>
}
