const http = require("http");
const WebSocket = require("ws");

const port = process.env.PORT || 10000;

const ALLOWED_ROOMS = [
"Tn51room001","Tn51room002","Tn51room003","Tn51room004","Tn51room005",
"Tx42room001","Tx42room002","Tx42room003","Tx42room004","Tx42room005",
"Moonroom001","Moonroom002","Moonroom003","Moonroom004","Moonroom005"
];

const ALLOWED_SET = new Set(ALLOWED_ROOMS);

function maxForRoom(room) {
if (room.startsWith("Tn51")) return 6;
if (room.startsWith("Tx42")) return 4;
if (room.startsWith("Moon")) return 3;
return 2;
}

const roomMembers = new Map();
const roomObservers = new Map();   // room -> Set of observer ws
const lobbyClients = new Set();    // connected clients not yet in a room

function getMembers(room) {
let set = roomMembers.get(room);
if (!set) {
set = new Set();
roomMembers.set(room, set);
}
return set;
}

function countObservers(room) {
const obs = roomObservers.get(room);
return obs ? obs.size : 0;
}

function playerCount(room) {
const total = roomMembers.has(room) ? roomMembers.get(room).size : 0;
return total - countObservers(room);
}

// Send room_update to all lobby clients for a specific room
function broadcastLobbyUpdate(changedRoom) {
const count = playerCount(changedRoom);
const max = maxForRoom(changedRoom);
const obs = countObservers(changedRoom);
const msg = JSON.stringify({ type: 'room_update', room: changedRoom, count, max, observers: obs });
for (const client of lobbyClients) {
  if (client.readyState === WebSocket.OPEN) {
    client.send(msg);
  }
}
}

function leaveRoom(ws) {
const room = ws.room;
if (!room) return;

const isObs = ws.isObserver;

const set = roomMembers.get(room);
if (set) {
set.delete(ws);

// Remove from observer tracking
if (isObs) {
  const obs = roomObservers.get(room);
  if (obs) {
    obs.delete(ws);
    if (obs.size === 0) roomObservers.delete(room);
  }
}

// Broadcast peer_left to remaining room members (with updated player count)
const pc = playerCount(room);
for (const client of set) {
  safeSend(client, { type: 'peer_left', room, playerCount: pc });
}

if (set.size === 0) {
  roomMembers.delete(room);
}
}

ws.room = null;
ws.isObserver = false;

// Return to lobby (can query room status again)
lobbyClients.add(ws);

// Notify lobby clients about this room's updated count
broadcastLobbyUpdate(room);
}

function safeSend(ws, obj) {
if (ws.readyState === WebSocket.OPEN) {
ws.send(JSON.stringify(obj));
}
}

const server = http.createServer((req, res) => {
if (req.url === "/health") {
res.writeHead(200, { "Content-Type": "text/plain" });
res.end("ok");
return;
}

res.writeHead(200, { "Content-Type": "text/plain" });
res.end("tn51/tx42 relay running");
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
ws.room = null;
ws.isObserver = false;

// New connections start in lobby
lobbyClients.add(ws);

safeSend(ws, {
type: "info",
message: "connected",
allowedRooms: ALLOWED_ROOMS
});

ws.on("message", (raw) => {
let msg;

try {
  msg = JSON.parse(raw);
} catch {
  return;
}

// Room status query — works before joining a room
if (msg.type === 'room_status') {
  const rooms = ALLOWED_ROOMS.map(room => ({
    room,
    count: playerCount(room),
    max: maxForRoom(room),
    observers: countObservers(room)
  }));
  safeSend(ws, { type: 'room_status', rooms });
  return;
}

// Observer join — join room as read-only spectator (doesn't count toward capacity)
if (msg.type === 'observe') {
  const room = String(msg.room || '');
  if (!ALLOWED_SET.has(room)) {
    safeSend(ws, { type: 'error', code: 'room_not_allowed', room });
    return;
  }

  leaveRoom(ws);  // leave any current position
  lobbyClients.delete(ws);

  // Add to room members (so they receive broadcasts)
  const members = getMembers(room);
  members.add(ws);
  ws.room = room;
  ws.isObserver = true;

  // Track as observer
  let obs = roomObservers.get(room);
  if (!obs) { obs = new Set(); roomObservers.set(room, obs); }
  obs.add(ws);

  safeSend(ws, {
    type: 'observing',
    room,
    max: maxForRoom(room),
    playerCount: playerCount(room)
  });

  // Notify lobby clients about updated observer count
  broadcastLobbyUpdate(room);
  return;
}

if (msg.type === "join") {
  const room = String(msg.room || "");

  if (!ALLOWED_SET.has(room)) {
    safeSend(ws, {
      type: "error",
      code: "room_not_allowed",
      room
    });
    return;
  }

  leaveRoom(ws);
  lobbyClients.delete(ws);

  const members = getMembers(room);
  const max = maxForRoom(room);
  const pc = playerCount(room);  // current players (excluding observers)

  if (pc >= max) {
    safeSend(ws, {
      type: "error",
      code: "room_full",
      room,
      max
    });
    // Back to lobby
    lobbyClients.add(ws);
    return;
  }

  members.add(ws);
  ws.room = room;
  ws.isObserver = false;

  safeSend(ws, {
    type: "joined",
    room,
    max
  });

  // Broadcast peer_joined with updated player count
  const newPc = playerCount(room);
  for (const client of members) {
    if (client !== ws) {
      safeSend(client, {
        type: "peer_joined",
        room,
        playerCount: newPc
      });
    }
  }

  // Notify lobby clients
  broadcastLobbyUpdate(room);

  return;
}

// V10_113: Handle ping/pong heartbeat — respond directly, don't relay
if (msg.type === 'ping') {
  safeSend(ws, { type: 'pong', t: msg.t });
  return;
}

// Block observers from sending game messages
if (ws.isObserver) {
  return;
}

if (!ws.room) {
  safeSend(ws, {
    type: "error",
    code: "not_in_room"
  });
  return;
}

const members = roomMembers.get(ws.room);
if (!members) return;

const outgoing = JSON.stringify({
  ...msg,
  room: ws.room
});

for (const client of members) {
  if (client !== ws && client.readyState === WebSocket.OPEN) {
    client.send(outgoing);
  }
}

});

ws.on("close", () => {
lobbyClients.delete(ws);
leaveRoom(ws);
});

ws.on("error", () => {
lobbyClients.delete(ws);
leaveRoom(ws);
});
});

server.listen(port, () => {
console.log("Relay listening on port", port);
});
