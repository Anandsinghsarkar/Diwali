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

export function fit(c, ctx) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2), W = c.clientWidth, H = c.clientHeight
  const bw = Math.round(W * dpr), bh = Math.round(H * dpr)
  if (c.width !== bw || c.height !== bh) { c.width = bw; c.height = bh }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return [W, H]
}

export const flick = (t, i) => .94 + Math.sin(t * .009 + i * 2.3) * .04 + Math.sin(t * .031 + i) * .025

export function floorPattern() {
  const p = document.createElement('canvas'); p.width = p.height = 160
  const x = p.getContext('2d'), r = mulberry32(11)
  x.fillStyle = '#120d14'; x.fillRect(0, 0, 160, 160)
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${r() < .5 ? 255 : 120},${r() < .5 ? 220 : 120},${r() < .5 ? 190 : 120},${.02 + r() * .05})`; x.fillRect(r() * 160, r() * 160, 1 + r() * 2, 1 + r() * 2) }
  return p
}

export function drawDiya(ctx, x, y, sc, lit, t, i) {
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
