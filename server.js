import http from 'node:http'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocketServer } from 'ws'

const root = fileURLToPath(new URL('.', import.meta.url))
const port = Number(process.env.PORT || 4173)
const rooms = new Map()
const MAX_PLAYERS = 33
const MAX_HUMANS = 3
const MAX_AI = 30
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4' }

function send(socket, message) { if (socket.readyState === 1) socket.send(JSON.stringify(message)) }
function publicRoom(room) { return { code: room.code, hostId: room.hostId, started: room.started, slots: room.slots.map(slot => slot && ({ id: slot.id, name: slot.name, type: slot.type, connected: Boolean(slot.socket) })) } }
function broadcast(room, message) { room.clients.forEach(client => send(client, message)) }
function createRoom(hostName) {
  let code
  do code = Math.random().toString(36).slice(2, 8).toUpperCase(); while (rooms.has(code))
  const room = { code, hostId: randomUUID(), started: false, clients: new Set(), slots: Array(MAX_PLAYERS).fill(null), state: null }
  room.slots[0] = { id: room.hostId, name: hostName || 'Commander 1', type: 'human', socket: null }
  rooms.set(code, room)
  return room
}
function joinRoom(room, name, type = 'human') {
  if (type !== 'ai' && room.slots.filter(slot => slot?.type === 'human').length >= MAX_HUMANS) return null
  const index = room.slots.findIndex(slot => !slot)
  if (index < 0) return null
  const player = { id: randomUUID(), name: name || `Commander ${index + 1}`, type: type === 'ai' ? 'ai' : 'human', socket: null }
  room.slots[index] = player
  return player
}

const server = http.createServer(async (request, response) => {
  const requested = request.url === '/' ? '/index.html' : request.url.split('?')[0]
  const file = normalize(join(root, requested))
  if (!file.startsWith(root)) { response.writeHead(403); response.end('Forbidden'); return }
  try { const body = await readFile(file); response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' }); response.end(body) }
  catch { response.writeHead(404); response.end('Not found') }
})
const websocket = new WebSocketServer({ server })
websocket.on('connection', socket => {
  socket.on('message', raw => {
    let message
    try { message = JSON.parse(raw) } catch { send(socket, { type: 'error', message: 'Invalid message.' }); return }
    if (message.type === 'create') {
      const room = createRoom(message.name); room.slots[0].socket = socket; socket.room = room; socket.playerId = room.hostId; room.clients.add(socket); send(socket, { type: 'created', room: publicRoom(room), playerId: socket.playerId }); return
    }
    if (message.type === 'join') {
      const room = rooms.get(String(message.code || '').toUpperCase()); if (!room || room.started) { send(socket, { type: 'error', message: 'That room is unavailable.' }); return }
      if (room.slots.filter(Boolean).length >= MAX_PLAYERS) { send(socket, { type: 'error', message: 'This room has reached 33 commanders.' }); return }
      if (room.slots.filter(slot => slot?.type === 'human').length >= MAX_HUMANS) { send(socket, { type: 'error', message: 'This room already has the maximum of 3 human commanders.' }); return }
      const player = joinRoom(room, message.name, 'human'); if (!player) { send(socket, { type: 'error', message: 'This room cannot accept another human commander.' }); return }
      player.socket = socket; socket.room = room; socket.playerId = player.id; room.clients.add(socket); send(socket, { type: 'joined', playerId: socket.playerId, room: publicRoom(room) }); broadcast(room, { type: 'lobby', room: publicRoom(room) }); return
    }
    const room = socket.room, player = room?.slots.find(slot => slot?.id === socket.playerId)
    if (!room || !player) { send(socket, { type: 'error', message: 'Join a room first.' }); return }
    if (message.type === 'add-ai') {
      if (socket.playerId !== room.hostId || room.started) return
      if (room.slots.filter(slot => slot?.type === 'ai').length >= MAX_AI || room.slots.filter(Boolean).length >= MAX_PLAYERS) { send(socket, { type: 'error', message: 'Maximum reached: 30 AI or 33 total commanders.' }); return }
      const ai = joinRoom(room, message.name, 'ai'); if (!ai) { send(socket, { type: 'error', message: 'No commander slot is available.' }); return }
      broadcast(room, { type: 'lobby', room: publicRoom(room) }); return
    }
    if (message.type === 'rename') {
      const nextName = String(message.name || '').trim().slice(0, 24)
      if (!nextName || room.started) return
      player.name = nextName
      broadcast(room, { type: 'lobby', room: publicRoom(room) }); return
    }
    if (message.type === 'remove-ai') {
      if (socket.playerId !== room.hostId || room.started) return
      const index = room.slots.findIndex(slot => slot?.type === 'ai'); if (index >= 0) room.slots[index] = null
      broadcast(room, { type: 'lobby', room: publicRoom(room) }); return
    }
    if (message.type === 'start') {
      if (socket.playerId !== room.hostId || room.started || room.slots.filter(Boolean).length < 2) return
      room.started = true; room.slots = room.slots.filter(Boolean); room.state = { turn: 0, phase: 'claim', revision: 0 }; broadcast(room, { type: 'started', room: publicRoom(room), state: room.state }); return
    }
    if (message.type === 'state') {
      if (socket.playerId !== room.hostId || !message.state) return
      room.state = { ...message.state, revision: (room.state?.revision || 0) + 1 }; broadcast(room, { type: 'state', state: room.state });
    }
    if (message.type === 'action') {
      if (socket.playerId === room.hostId || !message.action) return
      const hostSocket = room.slots.find(slot => slot?.id === room.hostId)?.socket
      if (hostSocket) send(hostSocket, { type: 'remote-action', action: message.action, playerId: socket.playerId })
    }
  })
  socket.on('close', () => { const room = socket.room; if (!room) return; const slot = room.slots.find(player => player?.id === socket.playerId); if (slot) slot.socket = null; room.clients.delete(socket); if (!room.clients.size) rooms.delete(room.code); else broadcast(room, { type: 'lobby', room: publicRoom(room) }) })
})
server.listen(port, '0.0.0.0', () => console.log(`MultiMapGame server listening on port ${port}`))
