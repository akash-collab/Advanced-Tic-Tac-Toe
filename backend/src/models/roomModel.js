// models/roomModel.js
/**
 * In-memory Room Model
 *
 * Room shape:
 * {
 *   id: string,
 *   size: number,
 *   winLen: number,
 *   board: Array(size*size).fill(null),
 *   players: { socketId: "X"|"O", ... },
 *   xTurn: boolean
 * }
 *
 * This module is intentionally synchronous and simple for local development.
 */

const DEFAULT_SIZE = 3;
const MIN_WIN_LEN = 3;
const MAX_PLAYERS = 2;

const rooms = new Map();

/* ---------------------- Helpers ---------------------- */

/**
 * Create an empty board array for given size
 * @param {number} size
 * @returns {Array<null>}
 */
function makeEmptyBoard(size) {
  const n = Number(size) || DEFAULT_SIZE;
  return Array(n * n).fill(null);
}

/* ---------------------- Model API ---------------------- */

/**
 * Create a new room or return existing one if present.
 * @param {string} roomId
 * @param {Object} options { size, winLen }
 * @returns {Object} room
 */
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
    players: {}, // socketId -> symbol
    xTurn: true,
  };

  rooms.set(id, room);
  return room;
}

/**
 * Get a room by id
 * @param {string} roomId
 * @returns {Object|null}
 */
function getRoom(roomId) {
  if (!roomId) return null;
  return rooms.get(String(roomId)) || null;
}

/**
 * Add a player (socket) to the room. Assigns a symbol ("X" or "O").
 * Returns assigned symbol or throws if room is full.
 * @param {string} roomId
 * @param {string} socketId
 * @returns {string} assignedSymbol
 */
function addPlayer(roomId, socketId) {
  const room = getRoom(roomId) || createRoom(roomId);
  if (room.players[socketId]) {
    // already in room → return existing symbol
    return room.players[socketId];
  }

  const currentCount = Object.keys(room.players).length;
  if (currentCount >= MAX_PLAYERS) {
    throw new Error("Room full");
  }

  const assignedSymbol = currentCount === 0 ? "X" : "O";
  room.players[String(socketId)] = assignedSymbol;
  return assignedSymbol;
}


/**
 * Remove a player from the room by socketId.
 * If the room becomes empty, it remains present — caller may choose to cleanup.
 * @param {string} roomId
 * @param {string} socketId
 */
function removePlayer(roomId, socketId) {
  const room = getRoom(roomId);
  if (!room) return;
  delete room.players[String(socketId)];
}

/**
 * Apply a move to the room board after basic validation.
 * Throws on invalid moves.
 * Returns the updated room object.
 *
 * @param {string} roomId
 * @param {number} index
 * @param {"X"|"O"} symbol
 * @returns {Object} updated room
 */
function applyMove(roomId, index, symbol) {
  const room = getRoom(roomId);
  if (!room) throw new Error("Room not found");
  const idx = Number(index);
  if (!Number.isInteger(idx) || idx < 0 || idx >= room.board.length) {
    throw new Error("Invalid index");
  }

  // Check symbol belongs to a player (optional; sockets layer should enforce)
  const symbolicOwner = Object.entries(room.players).find(([, s]) => s === symbol);
  if (!symbolicOwner) {
    throw new Error("Symbol not assigned in this room");
  }

  // Check turn
  if ((room.xTurn && symbol !== "X") || (!room.xTurn && symbol !== "O")) {
    throw new Error("Not your turn");
  }

  // Check empty cell
  if (room.board[idx]) {
    throw new Error("Cell already occupied");
  }

  // Apply move
  room.board[idx] = symbol;
  room.xTurn = !room.xTurn;
  return room;
}

/**
 * Reset the board for a room (sets empty board, xTurn = true)
 * If room doesn't exist, creates it with defaults.
 * @param {string} roomId
 * @returns {Object} room
 */
function resetRoom(roomId) {
  let room = getRoom(roomId);
  if (!room) {
    room = createRoom(roomId);
  }
  room.board = makeEmptyBoard(room.size);
  room.xTurn = true;
  return room;
}

/**
 * Delete a room entirely (useful when empty).
 * @param {string} roomId
 */
function deleteRoom(roomId) {
  rooms.delete(String(roomId));
}

/**
 * If a room exists and has no players, delete it.
 * @param {string} roomId
 */
function cleanupEmptyRoom(roomId) {
  const room = getRoom(roomId);
  if (!room) return;
  if (!Object.keys(room.players).length) {
    rooms.delete(roomId);
  }
}

/**
 * Get a snapshot of all rooms (for monitoring)
 * @returns {Array<Object>}
 */
function listRooms() {
  return Array.from(rooms.values()).map((r) => ({
    id: r.id,
    size: r.size,
    winLen: r.winLen,
    players: Object.values(r.players),
    xTurn: r.xTurn,
    boardPreview: r.board.slice(0, Math.min(25, r.board.length)),
  }));
}

/* ---------------------- Exports ---------------------- */

module.exports = {
  // constants
  DEFAULT_SIZE,
  MIN_WIN_LEN,
  MAX_PLAYERS,

  // helpers
  makeEmptyBoard,

  // model API
  createRoom,
  getRoom,
  addPlayer,
  removePlayer,
  applyMove,
  resetRoom,
  deleteRoom,
  cleanupEmptyRoom,
  listRooms,
};
