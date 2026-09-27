# MultiMapGame

This repository is the separate online version of the campaign game. The original local project is not modified.

## Current multiplayer foundation

- Three player slots per room.
- Host creates a room and receives a six-character code.
- Other players join with that code.
- The host can fill open slots with AI commanders.
- The server owns the room and exposes a revisioned shared state channel.

## Run locally

```sh
npm install
npm start
```

Open `http://localhost:4173`. The game client and lobby integration will be connected to the shared state in the next multiplayer pass.
