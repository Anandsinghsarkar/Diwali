import React, { useEffect, useRef, useState } from 'react'
import { TAU, mulberry32, pick, rnd } from './common.js'

const SHELLS = ['peony', 'chrys', 'willow', 'ring', 'heart', 'crackle', 'palm', 'multibreak']
const GROUND = ['anar', 'chakri', 'ladi', 'bomb', 'sparkler']
const LABEL = { random: 'Random', peony: 'Peony', chrys: 'Chrysanthemum', willow: 'Willow', ring: 'Ring', heart: 'Heart', crackle: 'Crackle', palm: 'Palm', multibreak: 'Multi-Break', anar: 'Anar', chakri: 'Chakri', ladi: 'Ladi', bomb: 'Atom bomb', sparkler: 'Phuljhadi' }
const HUES = [['Random', -1], ['Multi', -2], ['Rainbow', -3], ['Gold', 42], ['Red', 2], ['Green', 130], ['Blue', 212], ['Pink', 325], ['Violet', 275], ['Cyan', 185], ['Orange', 28]]

export default function Crackers({ send, sub, couple }) {
  const cv = useRef(null), skyRef = useRef(null), api = useRef({})
  const [kind, setKind] = useState(couple ? 'heart' : 'random'), [hue, setHue] = useState(-1), [auto, setAuto] = useState(false), [sound, setSound] = useState(true), [controlsVisible, setControlsVisible] = useState(true)
  const opt = useRef({}); opt.current = { kind, hue, sound }
  const sendRef = useRef(send); sendRef.current = send

  useEffect(() => {
    const c = cv.current, ctx = c.getContext('2d'), sk = skyRef.current, sctx = sk.getContext('2d')
    let W = 0, H = 0, f = 1, dpr = 1, raf = 0, last = performance.now(), idle = 0, actx = null, noise = null, shakeUntil = 0
    const rockets = [], parts = [], flashes = [], emitters = [], shocks = []

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
    const crack = (gain = .22) => hit(0, { dur: .1, f0: 7000, f1: 1200, gain, thump: false, type: 'highpass' })

    const vibrate = (pattern = 40) => {
      try { if (navigator.vibrate) navigator.vibrate(pattern) } catch {}
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

    const burst = (x, y, kind, hue, isSub = false) => {
      const base = hue >= 0 ? hue : rnd(0, 360), alt = (base + rnd(70, 180)) % 360
      const col = () => hue === -2 ? pick([base, alt, 42, 0]) : hue === -3 ? rnd(0, 360) : base + rnd(-10, 10)
      const sph = () => { const th = rnd(0, TAU), ph = Math.acos(rnd(-1, 1)); return [Math.sin(ph) * Math.cos(th), Math.sin(ph) * Math.sin(th)] }
      let sp = rnd(3.4, 4.4) * f
      if (kind === 'peony' || kind === 'multibreak') {
        for (let i = 0; i < 110; i++) { const [a, b] = sph(); addP(x, y, a * sp, b * sp, { h: col(), decay: rnd(.011, .016) }) }
        for (let i = 0; i < 28; i++) { const [a, b] = sph(); addP(x, y, a * sp * .4, b * sp * .4, { h: alt, decay: .02, size: 1.3 }) }
        if (kind === 'multibreak' && !isSub) {
          // secondary breaks
          for (let k = 0; k < 5; k++) {
            setTimeout(() => {
              const [a, b] = sph()
              const nx = x + a * 40, ny = y + b * 40
              burst(nx, ny, 'peony', hue, true)
            }, 280 + k * 90)
          }
        }
      } else if (kind === 'chrys') {
        for (let i = 0; i < 95; i++) { const [a, b] = sph(); addP(x, y, a * sp, b * sp, { h: col(), decay: rnd(.007, .01), drag: .975, tw: true, size: 1.9 }) }
      } else if (kind === 'willow') {
        sp = rnd(2.6, 3.2) * f
        for (let i = 0; i < 100; i++) { const [a, b] = sph(); addP(x, y, a * sp, b * sp, { h: hue === -3 ? rnd(0, 360) : hue >= 0 ? hue : 40, s: 90, decay: rnd(.0035, .005), drag: .978, g: .05, size: 1.8, tw: true }) }
      } else if (kind === 'ring') {
        const tilt = rnd(0, 3.14), k = rnd(.3, .9), ct = Math.cos(tilt), st = Math.sin(tilt)
        for (let i = 0; i < 72; i++) { const a = i / 72 * TAU, ex = Math.cos(a) * sp, ey = Math.sin(a) * sp * k; addP(x, y, ex * ct - ey * st, ex * st + ey * ct, { h: col(), decay: .013, size: 2 }) }
      } else if (kind === 'heart') {
        const h0 = hue === -3 ? rnd(0, 360) : hue >= 0 ? hue : 340
        for (let i = 0; i < 100; i++) { const t = i / 100 * TAU, hx = 16 * Math.pow(Math.sin(t), 3), hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)); addP(x, y, hx / 16 * sp * .95, hy / 16 * sp * .95, { h: h0 + rnd(-8, 8), decay: .012, size: 2.1, drag: .965 }) }
      } else if (kind === 'crackle') {
        for (let i = 0; i < 110; i++) { const [a, b] = sph(); addP(x, y, a * sp, b * sp, { h: hue === -3 ? rnd(0, 360) : hue >= 0 ? hue : 45, s: 80, decay: rnd(.012, .018), crackle: true, size: 1.8 }) }
      } else {
        for (let arm = 0; arm < 14; arm++) { const a = arm / 14 * TAU + rnd(-.05, .05); for (let j = 0; j < 7; j++) { const s2 = sp * (.55 + j * .09); addP(x, y, Math.cos(a) * s2, Math.sin(a) * s2, { h: hue === -3 ? rnd(0, 360) : hue >= 0 ? hue : 40, s: 85, decay: .009 + j * .0008, g: .06, size: 2 }) } }
      }
      flashes.push({ x, y, life: 1, h: base, R: 260 })
      const dly = .25 + (1 - y / H) * .35
      hit(dly, { gain: kind === 'heart' || kind === 'ring' ? .28 : .4 })
      if (kind === 'crackle') for (let i = 0; i < 9; i++) hit(dly + .5 + i * rnd(.05, .2), { dur: .08, f0: 6000, f1: 800, gain: .12, thump: false, type: 'highpass' })
      if (kind === 'multibreak' || kind === 'bomb') vibrate([30, 40, 60])
    }

    const pop = (x, y) => {
      flashes.push({ x, y, life: .8, h: 30, R: 90 })
      for (let i = 0; i < 10; i++) addP(x, y, rnd(-3, 3) * f, rnd(-4, -.5) * f, { h: rnd(20, 50), decay: .06, g: .12, size: 1.4 })
      for (let i = 0; i < 6; i++) addP(x, y, rnd(-2, 2), rnd(-3.5, -1), { h: 0, s: 90, decay: .02, g: .15, size: 2.4, drag: .95 })
      crack(.2)
      vibrate(25)
    }

    const launch = (xn, yn, kind, hue) => {
      if (kind === 'random') kind = pick(SHELLS)
      if (!SHELLS.includes(kind) && !GROUND.includes(kind)) kind = 'peony'
      if (GROUND.includes(kind)) {
        const e = { x: xn * W, y: H - 18, kind, t: 0, a: 0, n: 0, next: 0, boom: false, dir: xn > .5 ? -1 : 1 }
        if (kind === 'sparkler') e.y = H * .6
        emitters.push(e)
        if (kind === 'anar' || kind === 'chakri') hit(0, { dur: 3, f0: 5000, f1: 2500, gain: .06, type: 'highpass', thump: false })
        if (kind === 'sparkler') hit(0, { dur: 6, f0: 6000, f1: 4000, gain: .05, type: 'highpass', thump: false })
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
        const e = emitters[i]; e.t += dt; let done = false
        if (e.kind === 'anar') {
          for (let j = 0; j < 5; j++) { const a = -1.5708 + rnd(-.28, .28), s = rnd(5, 9.5) * f; addP(e.x, e.y, Math.cos(a) * s, Math.sin(a) * s, { h: pick([32, 40, 48]), decay: rnd(.018, .03), drag: .985, g: .13, size: 1.5, tw: true }) }
          done = e.t > 3200
        } else if (e.kind === 'chakri') {
          e.a += .55 * k
          for (let j = 0; j < 3; j++) { const a = e.a + j * 2.094; addP(e.x + Math.cos(a) * 6, e.y - 10 + Math.sin(a) * 3, Math.cos(a) * rnd(3, 5) * f, Math.sin(a) * rnd(1.2, 2.4) * f - .8, { h: pick([45, 200, 30]), s: 70, decay: rnd(.03, .05), drag: .96, g: .08, size: 1.4 }) }
          done = e.t > 3600
        } else if (e.kind === 'ladi') {
          while (e.t >= e.next && e.n < 44) { pop(e.x + e.dir * e.n * 14 * f, H - 16); e.n++; e.next += rnd(40, 90) }
          done = e.n >= 44
        } else if (e.kind === 'bomb') {
          if (e.t < 700) addP(e.x + rnd(-2, 2), e.y - 14, rnd(-1, 1), rnd(-2, -.5), { h: 40, decay: .08, size: 1.2 })
          else if (!e.boom) {
            e.boom = true
            flashes.push({ x: e.x, y: e.y, life: 1, h: 40, R: 520 })
            shocks.push({ x: e.x, y: e.y, r: 10, life: 1 })
            for (let j = 0; j < 50; j++) addP(e.x, e.y, rnd(-6, 6) * f, rnd(-9, -1) * f, { h: rnd(15, 45), s: 60, decay: rnd(.02, .04), g: .22, size: 2 })
            shakeUntil = performance.now() + 350
            hit(0, { dur: 1.3, f0: 1800, f1: 45, gain: .9 })
            vibrate([80, 30, 120])
          }
          done = e.t > 900
        } else {
          for (let j = 0; j < 12; j++) { const a = rnd(0, TAU), s = rnd(.8, 4) * f; addP(e.x, e.y, Math.cos(a) * s, Math.sin(a) * s, { h: pick([42, 48, 55]), s: 80, decay: rnd(.06, .1), g: .04, size: 1.2, tw: true, drag: .93 }) }
          ctx.strokeStyle = 'rgba(170,150,130,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x - 10, e.y + 80 * f); ctx.stroke()
          const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, 40); g.addColorStop(0, 'rgba(255,240,200,.8)'); g.addColorStop(1, 'rgba(255,170,60,0)')
          ctx.fillStyle = g; ctx.fillRect(e.x - 40, e.y - 40, 80, 80)
          done = e.t > 9000
        }
        if (e.kind === 'anar' || e.kind === 'chakri') {
          const gl = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, 80); gl.addColorStop(0, 'rgba(255,170,70,.28)'); gl.addColorStop(1, 'rgba(255,120,30,0)')
          ctx.fillStyle = gl; ctx.fillRect(e.x - 80, e.y - 80, 160, 160)
        }
        if (done) emitters.splice(i, 1)
      }

      for (let i = shocks.length - 1; i >= 0; i--) ext: {
        const s = shocks[i]; s.r += 16 * k * f; s.life -= .05 * k
        if (s.life <= 0) { shocks.splice(i, 1); continue }
        ctx.strokeStyle = `rgba(255,220,170,${s.life * .5})`; ctx.lineWidth = 3 * s.life; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.stroke()
      }

      for (let i = flashes.length - 1; i >= 0; i--) {
        const fl = flashes[i]; fl.life -= .06 * k
        if (fl.life <= 0) { flashes.splice(i, 1); continue }
        const R = fl.R * f, g = ctx.createRadialGradient(fl.x, fl.y, 0, fl.x, fl.y, R)
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

      if (now < shakeUntil) { const tr = `translate(${rnd(-4, 4)}px,${rnd(-4, 4)}px)`; c.style.transform = tr; sk.style.transform = tr }
      else if (c.style.transform) { c.style.transform = ''; sk.style.transform = '' }

      if (!rockets.length && !parts.length && !flashes.length && !emitters.length && !shocks.length) { if (++idle === 90) ctx.clearRect(0, 0, W, H) } else idle = 0
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
  const finale = () => { api.current.ensureAudio?.(); for (let i = 0; i < 16; i++) setTimeout(() => fire(rnd(.08, .92), rnd(.1, .45), pick(SHELLS), -2), i * 160) }

  const kinds = couple ? ['heart', 'random', ...SHELLS.filter(s => s !== 'heart'), ...GROUND] : ['random', ...SHELLS, ...GROUND]
  return <div className="lv-fw">
    <canvas ref={skyRef} />
    <canvas ref={cv} className="lv-fw-top" onPointerDown={fireAt} />
    <div className="lv-cap"><span className="lv-eye">TAP THE SKY · HAPTIC ON HEAVY CRACKERS</span><div className="lv-fw-title-row"><h2>Night <em>sky</em></h2><button className="lv-fw-toggle" onClick={() => setControlsVisible(v => !v)} aria-expanded={controlsVisible}>{controlsVisible ? "Hide controls" : "Show controls"}</button></div><p>Ground crackers go off where you tap. Multi-Break shells explode twice. Everyone in the room sees yours.</p></div>
    {controlsVisible && <div className="lv-hud">
      {kinds.map(k => <button key={k} className={'lv-btn' + (kind === k ? ' on' : '')} onClick={() => setKind(k)}>{LABEL[k]}</button>)}
      <span style={{ width: '100%' }} />
      {HUES.map(([l, v]) => <button key={l} className={'lv-btn' + (hue === v ? ' on' : '')} onClick={() => setHue(v)}>{l}</button>)}
      <span style={{ width: '100%' }} />
      <button className={'lv-btn' + (auto ? ' on' : '')} onClick={() => { api.current.ensureAudio?.(); setAuto(v => !v) }}>Auto show</button>
      <button className="lv-btn gold" onClick={finale}>Grand finale</button>
      <button className="lv-btn" onClick={() => setSound(v => !v)}>Sound {sound ? 'on' : 'off'}</button>
    </div>}
  </div>
}
