# MultiMapGame / Borderline Dominion — Project Handoff

This file is the handoff summary for any future Codex/AI agent working on the projects.

## Two separate projects

### 1. Original local campaign game

- Local folder: `/Users/nutfah/mapgame`
- GitHub repository: `https://github.com/sedatkacar56/mapgame.git`
- Branch: `main`
- Latest campaign changes were pushed before multiplayer development.
- This project is the original single-browser campaign game. It must remain separate from the multiplayer project.
- Do not edit, reset, or copy changes into this folder when working on multiplayer unless the user explicitly asks.

The local campaign includes the Europe/North Africa/Western Asia map, Russia regions, AI turns, human players, diplomacy, alliances/ceasefires, rebels, fog of war, strengths, music, saves/loads, JSON export, nuclear mode, last-territory defense, kill records, and up to 33 players.

### 2. Multiplayer project

- Repository: `https://github.com/sedatkacar56/multiMapgame.git`
- Working checkout used during development: `/private/tmp/multiMapgame`
- Branch: `main`
- Public deployment: `https://multimapgame.onrender.com`
- Render service deploys from the GitHub `main` branch.

The multiplayer repository started as a separate copy of the local game and adds a Node/WebSocket room server and browser lobby.

## Current multiplayer features

- Public Render URL for worldwide access.
- Create a room with a six-character code.
- Join a room using that code.
- Exactly three total player slots per room.
- Host can fill empty slots with AI commanders.
- Host can start once all three slots are occupied.
- Host owns the authoritative game state.
- Human map clicks and End Turn actions from other clients are relayed to the host.
- Host broadcasts map, battle, territory, rebel, and turn state to clients.

The current multiplayer room system is code-based. There is not yet a public directory where players browse all open games.

## Important files in `multiMapgame`

- `server.js` — HTTP static-file server and WebSocket room server.
- `package.json` — Node package configuration; start command is `node server.js`.
- `src/multiplayer.js` — Create/join lobby, room code UI, AI slot controls, WebSocket client, and state/action bridge.
- `src/app.js` — Map game client plus multiplayer hooks (`window.BorderlineGame`, `window.MultiSync`, remote action handling, state rendering events).
- `src/styles.css` — Campaign and multiplayer lobby styling.
- `index.html` — Loads the game and multiplayer client.
- `data/russia-regions.geojson` — Russia regional map data.
- `assets/music/` — Campaign music assets.

## Local development for multiplayer

The multiplayer server requires Node.js and npm:

```sh
git clone https://github.com/sedatkacar56/multiMapgame.git
cd multiMapgame
npm install
npm start
```

Then open `http://localhost:4173`. For a two-browser test, create a room in one browser, copy the room code, join from an incognito window, add an AI from the host window, and start the campaign.

## Cloud deployment

The Render service uses:

- Runtime: Node
- Branch: `main`
- Build command: `npm install` (normally detected from `package.json`)
- Start command: `npm start`
- Public URL: `https://multimapgame.onrender.com`

`server.js` binds to `0.0.0.0` and uses Render's `PORT` environment variable. Render's free service can sleep after inactivity, so the first request may take a little longer.

After pushing changes to `main`, Render should deploy the new commit automatically. Check the Render logs if the service is not live.

## Safe change policy

- Multiplayer changes belong in `multiMapgame`, not `/Users/nutfah/mapgame`.
- Do not use destructive resets on either repository.
- Preserve the local campaign repository and its existing behavior.
- Before changing multiplayer synchronization, keep the server authoritative: clients send actions; the host validates/applies them; the host broadcasts the resulting state.
- Avoid putting credentials, API keys, or private account information in either repository.

## Next recommended work

1. Test three browser clients against the Render URL.
2. Improve player identity so each browser controls only its assigned commander.
3. Add disconnect/reconnect handling and room cleanup.
4. Add a public room list only if the user wants discoverable open games.
5. Add a proper production data store if persistent accounts, rankings, or long-lived rooms are needed.
