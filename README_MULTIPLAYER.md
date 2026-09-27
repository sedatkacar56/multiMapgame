# MultiMapGame

This repository is the separate online version of the campaign game. The original local project is not modified.

## Current multiplayer foundation

- Three player slots per room.
- Host creates a room and receives a six-character code.
- Other players join with that code.
- The host can fill open slots with AI commanders.
- The server owns the room and exposes a revisioned shared state channel.
- Human map clicks and End Turn actions are relayed to the host.
- The host broadcasts the authoritative map, battle, and turn state to every client.

## Run locally

```sh
npm install
npm start
```

Open `http://localhost:4173`. Create a room in one browser and join it from other browsers using the displayed code.
