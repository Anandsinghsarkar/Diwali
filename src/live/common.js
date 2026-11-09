export const TAU = Math.PI * 2
export const PER_PAGE = 14
export const PALETTE = ['#ff9d0a', '#e8321e', '#d81b78', '#f4efe4', '#2aa84a', '#2f6fe0', '#ffd21f', '#7a3fc0']
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

/* ───────── per-diya state ─────────
   A player's board is { p, holes, extras, lit, flame }:
   - every index below p is lit, except the ones listed in holes
   - indices at/after p are unlit, except the ones listed in extras
   - lit is the running count (kept in sync by applyOp, so scores stay atomic)
   Lighting or blowing ONE diya only touches that one diya. */
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

export const flick = (t, i) => .94 + Math.sin(t * .009 + i * 2.3) * .04 + Math.sin(t * .031 + i) * .025

/* ───────── flame colours (natural, rainbow, blue, pink, green, violet) ───────── */
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

export function drawDiya(ctx, x, y, sc, lit, t, i, fh) {
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
    const H = fhue(fh, t, i), nat = H == null
    ctx.globalCompositeOperation = 'lighter'
    let r = ctx.createRadialGradient(0, -2, 2, 0, -2, 54); r.addColorStop(0, nat ? `rgba(255,170,70,${.7 * fl})` : `hsla(${H},100%,60%,${.7 * fl})`); r.addColorStop(1, nat ? 'rgba(255,100,20,0)' : `hsla(${H},100%,50%,0)`)
    ctx.fillStyle = r; ctx.beginPath(); ctx.ellipse(0, 1, 56, 14, 0, 0, TAU); ctx.fill()
    r = ctx.createRadialGradient(0, 0, 10, 0, 0, 110); r.addColorStop(0, nat ? `rgba(255,140,50,${.35 * fl})` : `hsla(${H},100%,55%,${.35 * fl})`); r.addColorStop(1, nat ? 'rgba(255,100,20,0)' : `hsla(${H},100%,50%,0)`)
    ctx.fillStyle = r; ctx.fillRect(-120, -80, 240, 160)
    const h = 62 * fl, w = 15, sway = Math.sin(t * .0042 + i * 1.7) * 3.4 + Math.sin(t * .0113 + i) * 1.9
    const drop = (s, c0, c1) => {
      ctx.save(); ctx.translate(0, -13); ctx.scale(s, s)
      const gr = ctx.createLinearGradient(0, 0, 0, -h); gr.addColorStop(0, c0); gr.addColorStop(1, c1); ctx.fillStyle = gr
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-w * 1.15, -h * .22, -w * .7, -h * .62, sway, -h); ctx.bezierCurveTo(w * .7, -h * .62, w * 1.15, -h * .22, 0, 0); ctx.fill(); ctx.restore()
    }
    if (nat) { drop(1, 'rgba(255,100,10,.9)', 'rgba(255,170,40,.1)'); drop(.74, 'rgba(255,185,50,1)', 'rgba(255,235,140,.25)'); drop(.42, 'rgba(255,248,215,1)', 'rgba(255,255,255,.2)') }
    else { drop(1, `hsla(${H},100%,50%,.9)`, `hsla(${H + 15},100%,60%,.1)`); drop(.74, `hsla(${H + 10},100%,62%,1)`, `hsla(${H + 20},100%,80%,.25)`); drop(.42, `hsla(${H + 25},100%,94%,1)`, `hsla(${H + 25},100%,96%,.2)`) }
    ctx.fillStyle = nat ? 'rgba(80,120,255,.5)' : `hsla(${H + 200},100%,65%,.5)`; ctx.beginPath(); ctx.ellipse(0, -17, 4.5, 7, 0, 0, TAU); ctx.fill()
    r = ctx.createRadialGradient(0, -45, 4, 0, -45, 150); r.addColorStop(0, nat ? `rgba(255,170,70,${.4 * fl})` : `hsla(${H},100%,60%,${.4 * fl})`); r.addColorStop(1, nat ? 'rgba(255,100,20,0)' : `hsla(${H},100%,50%,0)`)
    ctx.fillStyle = r; ctx.fillRect(-160, -200, 320, 320)
    ctx.globalCompositeOperation = 'source-over'
  }
  ctx.restore()
}
