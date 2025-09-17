// src/models/roomModel.js
/**
 * In-memory Room Model (improved)
 *
 * Room shape:
 * {
 *   id: string,
 *   size: number,
 *   winLen: number,
 *   board: Array(size*size).fill(null),
 *   players: { [socketId]: { symbol: "X"|"O", name: string|null, socketId } },
 *   scores: { X: number, O: number },
 *   xTurn: boolean,
 *   creatorId: string|null,
 *   lastStarter: "X"|"O"|null
 * }
 *
 * Synchronous in-memory model intended for local development.
 */

const DEFAULT_SIZE = 3;
const MIN_WIN_LEN = 3;
const MAX_PLAYERS = 2;

const rooms = new Map();

/* ---------------------- Helpers ---------------------- */

function makeEmptyBoard(size) {
  const n = Number(size) || DEFAULT_SIZE;
  return Array(n * n).fill(null);
}

/* ---------------------- Model API ---------------------- */

function createRoom(roomId, options = {}) {
  const id = String(roomId || "default");
  let room = rooms.get(id);
  if (room) return room;

  const size = Math.max(3, Number(options.size) || DEFAULT_SIZE);
  const winLenCandidate = Number(options.winLen) || MIN_WIN_LEN;
  const winLen = Math.min(Math.max(winLenCandidate, MIN_WIN_LEN), size);

  room = {
    id,
    size,
    winLen,
    board: makeEmptyBoard(size),
    players: {}, // socketId -> { symbol, name, socketId }
    scores: { X: 0, O: 0 },
    xTurn: true,
    creatorId: null,
    lastStarter: null,
    messages: [],
  };

  rooms.set(id, room);
  return room;
}

function getRoom(roomId) {
  if (!roomId) return null;
  return rooms.get(String(roomId)) || null;
}

/**
 * Add a player (socket) to the room.
 * Accepts optional `name`.
 */
function addPlayer(roomId, socketId, name = null) {
  const room = getRoom(roomId) || createRoom(roomId);
  if (room.players[String(socketId)]) {
    return room.players[String(socketId)];
  }

  const currentCount = Object.keys(room.players).length;
  if (currentCount >= MAX_PLAYERS) {
    throw new Error("Room full");
  }

  const assignedSymbol = currentCount === 0 ? "X" : "O";
  const entry = { symbol: assignedSymbol, name: name || null, socketId: String(socketId) };
  room.players[String(socketId)] = entry;

  if (currentCount === 0) {
    room.creatorId = String(socketId);
    if (!room.lastStarter) room.lastStarter = null;
  }
  return entry;
}

function removePlayer(roomId, socketId) {
  const room = getRoom(roomId);
  if (!room) return;
  delete room.players[String(socketId)];
  // If creator left, pick another creator (first player) or null
  const ids = Object.keys(room.players);
  room.creatorId = ids.length ? room.players[ids[0]].socketId : null;
}

/**
 * Validate and apply move. Throws on invalid move.
 *
 * Signature: applyMove(roomId, socketId, index, symbol)
 * Returns updated room object.
 */
function applyMove(roomId, socketId, index, symbol) {
  const room = getRoom(roomId);
  if (!room) throw new Error("Room not found");

  const idx = Number(index);
  if (!Number.isInteger(idx) || idx < 0 || idx >= room.board.length) {
    throw new Error("Invalid index");
  }

  const playerEntry = room.players[String(socketId)];
  if (!playerEntry) {
    throw new Error("You are not a player in this room");
  }
  if (playerEntry.symbol !== symbol) {
    throw new Error("Symbol mismatch for this socket");
  }

  if ((room.xTurn && symbol !== "X") || (!room.xTurn && symbol !== "O")) {
    throw new Error("Not your turn");
  }

  if (room.board[idx]) {
    throw new Error("Cell already occupied");
  }

  room.board[idx] = symbol;
  room.xTurn = !room.xTurn;
  return room;
}

/**
 * Increment the score for symbol in a room
 */
function incrementScore(roomId, symbol) {
  const room = getRoom(roomId);
  if (!room) return;
  if (!["X", "O"].includes(symbol)) return;
  room.scores[symbol] = (room.scores[symbol] || 0) + 1;
  return room.scores;
}

function resetRoom(roomId) {
  let room = getRoom(roomId);
  if (!room) {
    room = createRoom(roomId);
  }
  // alternate starter
  const nextStarter = room.lastStarter === "X" ? "O" : "X";
  room.board = makeEmptyBoard(room.size);
  room.xTurn = nextStarter === "X";
  room.lastStarter = nextStarter;
  return room;
}

function deleteRoom(roomId) {
  rooms.delete(String(roomId));
}

function cleanupEmptyRoom(roomId) {
  const room = getRoom(roomId);
  if (!room) return;
  if (!Object.keys(room.players).length) {
    rooms.delete(roomId);
  }
}

function listRooms() {
  return Array.from(rooms.values()).map((r) => ({
    id: r.id,
    size: r.size,
    winLen: r.winLen,
    players: Object.values(r.players).map((p) => p.symbol),
    xTurn: r.xTurn,
    boardPreview: r.board.slice(0, Math.min(25, r.board.length)),
    scores: r.scores,
  }));
}

function addMessage(roomId, msg) {
  const room = getRoom(roomId);
  if (!room) return null;
  room.messages.push(msg);
  if (room.messages.length > 200) room.messages.shift();
  return msg;
}

function getMessages(roomId) {
  const room = getRoom(roomId);
  return room ? room.messages : [];
}


/* ---------------------- Exports ---------------------- */

module.exports = {
  DEFAULT_SIZE,
  MIN_WIN_LEN,
  MAX_PLAYERS,

  makeEmptyBoard,

  createRoom,
  getRoom,
  addPlayer,
  removePlayer,
  applyMove,
  resetRoom,
  incrementScore,
  deleteRoom,
  cleanupEmptyRoom,
  listRooms,

  addMessage,
  getMessages,
};
