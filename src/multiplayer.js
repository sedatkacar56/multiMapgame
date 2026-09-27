const root = document.querySelector('#root')
const $ = selector => document.querySelector(selector)
const socketUrl = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`
let socket
let room
let playerId
window.MultiSync = { active: false, isHost: false, applyingRemote: false, lobbyConfiguring: false, sendAction(action) { send('action', { action }) } }

function send(type, payload = {}) { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type, ...payload })) }
function html(value) { return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character])) }
function mount() {
  if (document.querySelector('#multiplayer-lobby')) return
  root.insertAdjacentHTML('beforeend', `<div id="multiplayer-lobby" class="multiplayer-lobby"><div class="multiplayer-card"><span class="eyebrow">ONLINE CAMPAIGN</span><h2>Command together.</h2><p class="multi-status">Create a room for three commanders or join a friend with a code.</p><div class="multi-home"><label>Your name<input id="multi-name" maxlength="24" placeholder="Commander" /></label><button class="primary" id="multi-create">Create room</button><div class="multi-divider">OR JOIN</div><label>Room code<input id="multi-code" maxlength="6" placeholder="ABC123" /></label><button class="secondary" id="multi-join">Join room</button></div><div class="multi-lobby-view" hidden></div></div></div>`)
  $('#multi-create').onclick = () => { const name = $('#multi-name').value.trim() || 'Commander 1'; connect(); send('create', { name }) }
  $('#multi-join').onclick = () => { const name = $('#multi-name').value.trim() || 'Commander'; const code = $('#multi-code').value.trim().toUpperCase(); if (!code) return setStatus('Enter a room code first.'); connect(); send('join', { name, code }) }
}
function setStatus(message) { const status = document.querySelector('.multi-status'); if (status) status.textContent = message }
function connect() {
  if (socket && socket.readyState <= WebSocket.OPEN) return
  socket = new WebSocket(socketUrl)
  socket.onopen = () => setStatus('Connected. Joining the room…')
  socket.onerror = () => setStatus('Could not connect to the multiplayer server.')
  socket.onclose = () => { if (room && !room.started) setStatus('Connection closed. Refresh to try again.') }
  socket.onmessage = event => { const message = JSON.parse(event.data); if (message.type === 'error') setStatus(message.message); if (message.type === 'created' || message.type === 'joined') { playerId = message.playerId; showLobby(message.room) } if (message.type === 'lobby') showLobby(message.room); if (message.type === 'remote-action') window.dispatchEvent(new CustomEvent('multiplayer-action', { detail: { ...message.action, playerId: message.playerId } })); if (message.type === 'state' && !window.MultiSync.isHost) { window.MultiSync.applyingRemote = true; window.BorderlineGame?.applyRemote(message.state); window.MultiSync.applyingRemote = false } if (message.type === 'started') { room = message.room; window.MultiSync.active = true; window.MultiSync.isHost = room.hostId === playerId; window.MultiSync.playerIndexById = Object.fromEntries(room.slots.filter(Boolean).map((slot, index) => [slot.id, index])); window.MultiSync.playerIndex = window.MultiSync.playerIndexById[playerId]; window.BorderlineGame?.prepareMultiplayer(room); setStatus('The campaign is starting…'); setTimeout(() => { document.querySelector('#multiplayer-lobby')?.remove(); document.querySelector('#begin')?.click(); showAudioPrompt() }, 250) } }
}
function showLobby(nextRoom) {
  room = nextRoom
  const home = document.querySelector('.multi-home'), view = document.querySelector('.multi-lobby-view')
  if (!home || !view) return
  home.hidden = true; view.hidden = false
  const isHost = room.hostId === playerId
  const occupied = room.slots.filter(Boolean).length, aiCount = room.slots.filter(slot => slot?.type === 'ai').length
  const ownSlot = room.slots.find(slot => slot?.id === playerId)
  view.innerHTML = `<div class="room-code-label">ROOM CODE</div><div class="room-code">${html(room.code)}</div><p class="multi-status">Share this code with the other commanders.</p><div class="multi-empire-name"><label>Your empire name<input id="multi-empire-name" maxlength="24" value="${html(ownSlot?.name || '')}" /></label><button class="secondary" id="multi-save-name">Save name</button></div><div class="slot-list">${room.slots.filter(Boolean).map((slot, index) => `<div class="multi-slot"><span>${index + 1}</span><b>${html(slot.name)}</b><small>${slot.type === 'ai' ? 'AI commander' : slot.connected ? 'Connected' : 'Disconnected'}</small></div>`).join('')}</div>${isHost ? `<div class="multi-lobby-actions"><button class="secondary" id="multi-configure">Configure campaign</button><button class="secondary" id="multi-add-ai" ${aiCount >= 30 || occupied >= 33 ? 'disabled' : ''}>Add AI (${aiCount}/30)</button><button class="primary" id="multi-start" ${occupied < 2 ? 'disabled' : ''}>Start campaign</button></div>` : '<p class="multi-wait">Waiting for the host to start…</p>'}`
  $('#multi-save-name').onclick = () => send('rename', { name: $('#multi-empire-name').value.trim() })
  if (isHost) { $('#multi-configure').onclick = configureCampaign; $('#multi-add-ai').onclick = () => send('add-ai', { name: `AI Commander ${room.slots.filter(Boolean).length + 1}` }); $('#multi-start').onclick = () => send('start') }
}
function configureCampaign() { const lobby = document.querySelector('#multiplayer-lobby'); if (!lobby) return; window.MultiSync.lobbyConfiguring = true; lobby.classList.add('multi-configuring'); root.insertAdjacentHTML('beforeend', '<button id="multi-return-lobby" class="multi-return-lobby">Return to room lobby</button>'); $('#multi-return-lobby').onclick = () => { window.MultiSync.lobbyConfiguring = false; lobby.classList.remove('multi-configuring'); $('#multi-return-lobby')?.remove() } }
function showAudioPrompt() { if (document.querySelector('#multi-audio-prompt')) return; root.insertAdjacentHTML('beforeend', '<div id="multi-audio-prompt" class="multi-audio-prompt"><span>Music is muted by this device until you tap.</span><button class="secondary" id="multi-enable-audio">Enable music</button></div>'); $('#multi-enable-audio').onclick = () => { window.BorderlineGame?.enableMusic(); $('#multi-audio-prompt')?.remove() } }
window.addEventListener('borderline-rendered', () => { if (window.MultiSync.active && window.MultiSync.isHost && room?.started && window.BorderlineGame) send('state', { state: window.BorderlineGame.state }) })
mount()
