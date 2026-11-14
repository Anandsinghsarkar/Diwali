export const TAU = Math.PI * 2
export const PER_PAGE = 14
export const PALETTE = ['#ff9d0a', '#e8321e', '#d81b78', '#f4efe4', '#2aa84a', '#2f6fe0', '#ffd21f', '#7a3fc0', '#00c2a8', '#ff6b35', '#a8e10c', '#ff4fa3', '#8c7bff', '#38d5ff', '#b7ff5a', '#ffb7d5']
export const FLOOR = '#1a141c'
export const MAX_LIT = 1e12

export const rnd = (a, b) => a + Math.random() * (b - a)
export const pick = a => a[(Math.random() * a.length) | 0]
export const mulberry32 = a => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
export const clean = s => String(s || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24)
export const genCode = mode => {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''
  for (let i = 0; i < 8; i++) s += A[(Math.random() * A.length) | 0]
  return (mode === 'couple' ? 'LOVE-' : 'DIWALI-') + s
}
export const fmt = n => Number(n || 0).toLocaleString('en-IN')
export const clampLit = n => Math.max(0, Math.min(MAX_LIT, Math.floor(Number(n) || 0)))

/* ───────── per-diya state ───────── */
const norm = cur => ({ p: cur && cur.p != null ? cur.p : (cur && cur.lit) || 0, holes: { ...(cur && cur.holes) }, extras: { ...(cur && cur.extras) }, flame: cur && cur.flame })
const fin = s => {
  const hk = Object.keys(s.holes).length, ek = Object.keys(s.extras).length
  const o = { p: s.p, lit: Math.max(0, s.p - hk + ek) }
  if (hk) o.holes = s.holes
  if (ek) o.extras = s.extras
  if (s.flame) o.flame = s.flame
  return o
}
export const pOf = s => (s ? (s.p != null ? s.p : s.lit || 0) : 0)
export const isOn = (s, i) => (!s ? false : i < pOf(s) ? !(s.holes && s.holes[i]) : !!(s.extras && s.extras[i]))
export const extentOf = s => { if (!s) return 0; let e = pOf(s); if (s.extras) for (const k in s.extras) if (+k + 1 > e) e = +k + 1; return e }

const lightOne = (s, i) => {
  if (i < s.p) delete s.holes[i]
  else if (i === s.p) { s.p++; while (s.extras[s.p]) { delete s.extras[s.p]; s.p++ } }
  else s.extras[i] = true
}
const blowOne = (s, i) => {
  if (i < s.p) { s.holes[i] = true; while (s.p > 0 && s.holes[s.p - 1]) { delete s.holes[s.p - 1]; s.p-- } }
  else delete s.extras[i]
}

export function applyOp(cur, op) {
  const s = norm(cur)
  switch (op.k) {
    case 'light': lightOne(s, op.i); break
    case 'blow': blowOne(s, op.i); break
    case 'range': for (let i = op.a; i < op.b; i++) lightOne(s, i); break
    case 'add': {
      let n = Math.max(0, Math.floor(op.n || 0))
      const hs = Object.keys(s.holes).map(Number).sort((a, b) => a - b)
      for (const h of hs) { if (n <= 0) break; delete s.holes[h]; n-- }
      s.p = Math.min(MAX_LIT, s.p + n)
      for (const k of Object.keys(s.extras)) if (+k < s.p) delete s.extras[k]
      while (s.extras[s.p]) { delete s.extras[s.p]; s.p++ }
      break
    }
    case 'set': return fin({ p: Math.min(MAX_LIT, Math.max(0, Math.floor(op.n || 0))), holes: {}, extras: {}, flame: s.flame })
    case 'clear': return fin({ p: 0, holes: {}, extras: {}, flame: s.flame })
    case 'blowLast': {
      let r = Math.min(1000, Math.max(0, Math.floor(op.n || 0)))
      const ex = Object.keys(s.extras).map(Number).sort((a, b) => b - a)
      for (const e of ex) { if (r <= 0) break; delete s.extras[e]; r-- }
      while (r > 0 && s.p > 0) { if (s.holes[s.p - 1]) { delete s.holes[s.p - 1]; s.p-- } else { s.p--; r-- } }
      break
    }
    case 'flame': s.flame = op.f === 'natural' ? undefined : op.f; break
    default: break
  }
  return fin(s)
}

export function fit(c, ctx) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2), W = c.clientWidth, H = c.clientHeight
  const bw = Math.round(W * dpr), bh = Math.round(H * dpr)
  if (c.width !== bw || c.height !== bh) { c.width = bw; c.height = bh }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return [W, H]
}

export const flick = (t, i, wind = 0) => {
  const base = .94 + Math.sin(t * .009 + i * 2.3) * .04 + Math.sin(t * .031 + i) * .025
  return Math.max(0.55, Math.min(1.15, base + wind * 0.08))
}

/* ───────── flame colours ───────── */
export const fhue = (fh, t, i) => (fh === 'rainbow' ? (t * .06 + i * 47) % 360 : ({ blue: 210, pink: 325, green: 135, violet: 275 }[fh] ?? null))
export const glow = (fh, t, i, a) => { const h = fhue(fh, t, i); return h == null ? `rgba(255,140,50,${a})` : `hsla(${h},100%,58%,${a})` }
export const glow0 = (fh, t, i) => { const h = fhue(fh, t, i); return h == null ? 'rgba(255,90,20,0)' : `hsla(${h},100%,50%,0)` }

/* ───────── small sounds ───────── */
let _ac
const audio = () => { try { _ac = _ac || new (window.AudioContext || window.webkitAudioContext)(); if (_ac.state === 'suspended') _ac.resume(); return _ac } catch { return null } }
const noiseBurst = (dur, type, f, q, gain, delay = 0) => {
  const a = audio(); if (!a) return
  const n = Math.max(1, (a.sampleRate * dur) | 0), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2)
  const s = a.createBufferSource(); s.buffer = b
  const fl = a.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q
  const g = a.createGain(); g.gain.value = gain
  s.connect(fl); fl.connect(g); g.connect(a.destination); s.start(a.currentTime + delay)
}
export const puffSound = () => noiseBurst(.35, 'bandpass', 900, .6, .18)
export const lightSound = () => { noiseBurst(.08, 'highpass', 4000, .7, .12); noiseBurst(.3, 'lowpass', 600, .7, .08, .06) }

export function floorPattern() {
  const p = document.createElement('canvas'); p.width = p.height = 160
  const x = p.getContext('2d'), r = mulberry32(11)
  x.fillStyle = '#120d14'; x.fillRect(0, 0, 160, 160)
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${r() < .5 ? 255 : 120},${r() < .5 ? 220 : 120},${r() < .5 ? 190 : 120},${.02 + r() * .05})`; x.fillRect(r() * 160, r() * 160, 1 + r() * 2, 1 + r() * 2) }
  return p
}

/** Advanced diya renderer with wind influence and richer multi-layer flame */
export function drawDiya(ctx, x, y, sc, lit, t, i, fh, wind = 0) {
  const fl = flick(t, i, wind)
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc)

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.ellipse(5 + wind * 2, 50, 76, 14, 0, 0, TAU); ctx.fill()

  // handle
  ctx.fillStyle = '#7d3416'; ctx.beginPath(); ctx.moveTo(-58, -10); ctx.quadraticCurveTo(-82, -14, -88, -6); ctx.quadraticCurveTo(-76, 6, -56, 10); ctx.closePath(); ctx.fill()

  // body gradient
  const g = ctx.createLinearGradient(-66, 0, 66, 0)
  g.addColorStop(0, '#4a1d0d'); g.addColorStop(.28, '#c0602f'); g.addColorStop(.6, '#9a4220'); g.addColorStop(1, '#341409')
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-66, 0); ctx.bezierCurveTo(-62, 36, -34, 52, 0, 52); ctx.bezierCurveTo(34, 52, 62, 36, 66, 0); ctx.ellipse(0, 0, 66, 19, 0, 0, Math.PI, true); ctx.closePath(); ctx.fill()

  // gold dots
  ctx.fillStyle = '#e2b04e'
  for (let d = -4; d <= 4; d++) {
    const dx = d * 12, dy = 31 * Math.sqrt(1 - (dx / 66) ** 2)
    ctx.beginPath(); ctx.ellipse(dx, dy, 2.6, 1.9, 0, 0, TAU); ctx.fill()
  }
  ctx.strokeStyle = '#e08a52'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, 66, 19, 0, 0, TAU); ctx.stroke()

  // oil surface
  const o = ctx.createRadialGradient(0, -2, 4, 0, 0, 56); o.addColorStop(0, '#3a1a0a'); o.addColorStop(1, '#0f0503')
  ctx.fillStyle = o; ctx.beginPath(); ctx.ellipse(0, 1, 56, 14, 0, 0, TAU); ctx.fill()
  ctx.fillStyle = 'rgba(255,210,170,.16)'; ctx.beginPath(); ctx.ellipse(-30, 22, 14, 7, -.5, 0, TAU); ctx.fill()

  // wick
  ctx.fillStyle = '#1b0e08'; ctx.fillRect(-2.5, -14, 5, 15)

  if (lit) {
    const H = fhue(fh, t, i), nat = H == null
    ctx.globalCompositeOperation = 'lighter'

    // base glow on oil
    let r = ctx.createRadialGradient(0, -2, 2, 0, -2, 54)
    r.addColorStop(0, nat ? `rgba(255,170,70,${.72 * fl})` : `hsla(${H},100%,60%,${.72 * fl})`)
    r.addColorStop(1, nat ? 'rgba(255,100,20,0)' : `hsla(${H},100%,50%,0)`)
    ctx.fillStyle = r; ctx.beginPath(); ctx.ellipse(0, 1, 56, 14, 0, 0, TAU); ctx.fill()

    // wide ambient glow
    r = ctx.createRadialGradient(0, 0, 10, 0, 0, 120)
    r.addColorStop(0, nat ? `rgba(255,140,50,${.38 * fl})` : `hsla(${H},100%,55%,${.38 * fl})`)
    r.addColorStop(1, nat ? 'rgba(255,100,20,0)' : `hsla(${H},100%,50%,0)`)
    ctx.fillStyle = r; ctx.fillRect(-130, -90, 260, 180)

    // multi-layer flame with wind sway
    const h = 68 * fl
    const w = 16
    const sway = Math.sin(t * .0042 + i * 1.7) * 3.8 + Math.sin(t * .0113 + i) * 2.1 + wind * 9

    const drop = (s, c0, c1, extraSway = 0) => {
      ctx.save(); ctx.translate(0, -13); ctx.scale(s, s)
      const gr = ctx.createLinearGradient(0, 0, 0, -h)
      gr.addColorStop(0, c0); gr.addColorStop(1, c1)
      ctx.fillStyle = gr
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.bezierCurveTo(-w * 1.2, -h * .2, -w * .75, -h * .58, sway + extraSway, -h)
      ctx.bezierCurveTo(w * .75, -h * .58, w * 1.2, -h * .2, 0, 0)
      ctx.fill()
      ctx.restore()
    }

    if (nat) {
      drop(1.05, 'rgba(255,90,8,.92)', 'rgba(255,160,35,.08)', wind * 1.5)
      drop(0.82, 'rgba(255,175,45,1)', 'rgba(255,230,130,.22)')
      drop(0.52, 'rgba(255,245,200,1)', 'rgba(255,255,255,.28)')
      drop(0.28, 'rgba(255,255,250,.95)', 'rgba(255,255,255,.15)')
    } else {
      drop(1.05, `hsla(${H},100%,48%,.92)`, `hsla(${H + 18},100%,58%,.08)`, wind * 1.5)
      drop(0.82, `hsla(${H + 8},100%,60%,1)`, `hsla(${H + 22},100%,78%,.22)`)
      drop(0.52, `hsla(${H + 22},100%,92%,1)`, `hsla(${H + 28},100%,96%,.28)`)
      drop(0.28, `hsla(${H + 30},100%,97%,.9)`, `hsla(${H + 30},100%,98%,.12)`)
    }

    // blue core
    ctx.fillStyle = nat ? 'rgba(70,110,255,.55)' : `hsla(${H + 200},100%,65%,.55)`
    ctx.beginPath(); ctx.ellipse(0, -18, 5, 8, 0, 0, TAU); ctx.fill()

    // top plume
    r = ctx.createRadialGradient(0, -50, 4, 0, -50, 160)
    r.addColorStop(0, nat ? `rgba(255,170,70,${.42 * fl})` : `hsla(${H},100%,60%,${.42 * fl})`)
    r.addColorStop(1, nat ? 'rgba(255,100,20,0)' : `hsla(${H},100%,50%,0)`)
    ctx.fillStyle = r; ctx.fillRect(-170, -220, 340, 340)

    ctx.globalCompositeOperation = 'source-over'
  }
  ctx.restore()
}
