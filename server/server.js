import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { WebSocketServer } from 'ws'

const PORT = process.env.PORT || 8787
const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.ico': 'image/x-icon' }
const N_DIYA = 7, MAX_STAMPS = 8000, COUPLE_MAX = 2, FRIENDS_MAX = 12
const KINDS = new Set(['random', 'peony', 'chrys', 'willow', 'ring', 'heart', 'crackle', 'palm', 'anar', 'chakri'])

// static host for the built app (npm run build) + health check
const server = http.createServer((req, res) => {
  let url = '/'
  try { url = decodeURIComponent((req.url || '/').split('?')[0]) } catch { /* keep / */ }
  if (url === '/health') return res.end('ok')
  let file = path.join(DIST, url)
  if (!file.startsWith(DIST)) { res.writeHead(403); return res.end() }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html')
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('run `npm run build` first') }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' })
    res.end(buf)
  })
})

const wss = new WebSocketServer({ server, maxPayload: 64 * 1024 })
const rooms = new Map()
let uid = 1, mid = 1

const clean = s => String(s || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24)
const num = (v, lo, hi, d = 0) => { v = Number(v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d }
const send = (ws, o) => { if (ws.readyState === 1) ws.send(JSON.stringify(o)) }
const everyone = (r, o, except) => { const s = JSON.stringify(o); for (const c of r.clients) if (c !== except && c.readyState === 1) c.send(s) }
const roster = r => [...r.clients].map(c => ({ id: c.id, name: c.name, hue: c.hue }))
const chat = (ws, text, kind = 'msg') => ({ t: 'chat', id: mid++, from: ws.id, name: ws.name, text, kind, at: Date.now() })

function join(ws, m) {
  const code = clean(m.room) || 'DIWALI'
  const mode = m.mode === 'couple' ? 'couple' : 'friends'
  let r = rooms.get(code)
  if (!r) { r = { code, mode, clients: new Set(), diyas: Array(N_DIYA).fill(false), stamps: [] }; rooms.set(code, r) }
  const max = r.mode === 'couple' ? COUPLE_MAX : FRIENDS_MAX
  if (r.clients.size >= max) {
    send(ws, { t: 'error', msg: r.mode === 'couple' ? 'this couple room already has two people' : 'room is full' })
    return ws.close()
  }
  ws.id = uid++; ws.name = String(m.name || 'Friend').slice(0, 20); ws.hue = (ws.id * 67) % 360; ws.room = r
  r.clients.add(ws)
  send(ws, { t: 'init', id: ws.id, mode: r.mode, diyas: r.diyas, stamps: r.stamps, users: roster(r) })
  everyone(r, { t: 'users', users: roster(r) }, ws)
  everyone(r, chat(ws, 'joined', 'sys'))
}

function leave(ws) {
  const r = ws.room; if (!r) return
  r.clients.delete(ws); ws.room = null
  if (!r.clients.size) { rooms.delete(r.code); return } // empty room = everything gone
  everyone(r, { t: 'users', users: roster(r) })
  everyone(r, chat(ws, 'left', 'sys'))
}

wss.on('connection', ws => {
  ws.isAlive = true; ws.room = null; ws.bucket = 100
  ws.on('pong', () => { ws.isAlive = true })
  ws.on('message', raw => {
    if (--ws.bucket < 0) return
    let m; try { m = JSON.parse(raw) } catch { return }
    if (m.t === 'join' && !ws.room) return join(ws, m)
    const r = ws.room; if (!r) return
    switch (m.t) {
      case 'diya': { const i = Math.trunc(num(m.i, 0, N_DIYA - 1, 0)); r.diyas[i] = !!m.v; everyone(r, { t: 'diya', diyas: r.diyas }); break }
      case 'diyaAll': r.diyas.fill(!!m.v); everyone(r, { t: 'diya', diyas: r.diyas }); break
      case 'stamps': {
        if (!Array.isArray(m.list)) break
        const list = []
        for (const s of m.list.slice(0, 200)) {
          if (!Array.isArray(s) || s.length !== 7) continue
          list.push([num(s[0], 0, 1), num(s[1], 0, 1), Math.trunc(num(s[2], -1, 7, 0)), num(s[3], 1, 60, 8), Math.trunc(num(s[4], 1, 16, 1)), s[5] ? 1 : 0, Math.trunc(num(s[6], 0, 2 ** 31 - 1))])
        }
        if (!list.length) break
        r.stamps.push(...list)
        if (r.stamps.length > MAX_STAMPS) r.stamps.splice(0, r.stamps.length - MAX_STAMPS)
        everyone(r, { t: 'stamps', list }, ws)
        break
      }
      case 'rclear': r.stamps = []; everyone(r, { t: 'rclear' }, ws); break
      case 'fire': if (KINDS.has(m.kind)) everyone(r, { t: 'fire', x: num(m.x, 0, 1, .5), y: num(m.y, 0, 1, .3), kind: m.kind, hue: Math.trunc(num(m.hue, -2, 360, -1)) }, ws); break
      case 'chat': { const text = String(m.text || '').trim().slice(0, 400); if (text) everyone(r, chat(ws, text, m.kind === 'love' ? 'love' : 'msg')); break }
    }
  })
  ws.on('close', () => leave(ws))
  ws.on('error', () => {})
})

setInterval(() => { for (const ws of wss.clients) ws.bucket = 100 }, 1000)
setInterval(() => { for (const ws of wss.clients) { if (!ws.isAlive) { ws.terminate(); continue } ws.isAlive = false; ws.ping() } }, 25000)

server.listen(PORT, () => console.log(`diwali live server on :${PORT}`))
