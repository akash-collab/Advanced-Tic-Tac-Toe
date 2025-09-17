// src/controllers/roomsController.js
const roomModel = require("../models/roomModel");

/**
 * Helper: server-side winner check (same logic as client)
 */
function checkWinner(board, size, winLen) {
  const idx = (r, c) => r * size + c;
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [-1, 1],
  ];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const start = board[idx(r, c)];
      if (!start) continue;
      for (const [dr, dc] of dirs) {
        const line = [{ r, c }];
        let rr = r,
          cc = c;
        for (let k = 1; k < winLen; k++) {
          rr += dr;
          cc += dc;
          if (rr < 0 || rr >= size || cc < 0 || cc >= size) break;
          if (board[idx(rr, cc)] === start) {
            line.push({ r: rr, c: cc });
          } else break;
        }
        if (line.length === winLen) {
          return { winner: start, line };
        }
      }
    }
  }

  if (board.every(Boolean)) {
    return { winner: "draw", line: null };
  }
  return { winner: null, line: null };
}

/**
 * Sanitize room for client consumption
 */
function sanitizeRoom(room) {
  if (!room) return null;
  return {
    id: room.id,
    size: room.size,
    winLen: room.winLen,
    board: room.board.slice(),
    players: Object.values(room.players).map((p) => ({ socketId: p.socketId, symbol: p.symbol, name: p.name })),
    xTurn: room.xTurn,
    creatorId: room.creatorId || null,
    lastStarter: room.lastStarter || null,
    scores: Object.assign({}, room.scores || { X: 0, O: 0 }),
  };
}

/* ---------------------- Controller API ---------------------- */

async function getRoom(roomId) {
  const room = roomModel.getRoom(roomId);
  if (!room) return null;
  return sanitizeRoom(room);
}

async function createOrGetRoom(roomId, options = {}) {
  const room = roomModel.createRoom(roomId, options);
  return sanitizeRoom(room);
}

/**
 * Add a player and return symbol + room snapshot
 */
async function addPlayerToRoom(roomId, socketId, options = {}) {
  roomModel.createRoom(roomId, options);
  const entry = roomModel.addPlayer(roomId, socketId, options.name || null);
  const room = roomModel.getRoom(roomId);
  return { symbol: entry.symbol, room: sanitizeRoom(room) };
}

/**
 * Apply a move: validate + apply, then compute winner. If winner X/O -> increment score.
 *
 * Returns: { room: sanitizedRoom, winner: "X"|"O"|"draw"|null, line: Array|null }
 */
async function applyMove(roomId, socketId, index, symbol) {
  const updated = roomModel.applyMove(roomId, socketId, index, symbol);
  // compute winner
  const result = checkWinner(updated.board, updated.size, updated.winLen);
  if (result.winner === "X" || result.winner === "O") {
    // increment score for winner
    roomModel.incrementScore(roomId, result.winner);
  }
  const room = roomModel.getRoom(roomId);
  return { room: sanitizeRoom(room), winner: result.winner, line: result.line };
}

/**
 * Reset a room board (keeps scores)
 */
async function resetRoom(roomId) {
  const r = roomModel.resetRoom(roomId);
  return sanitizeRoom(r);
}

async function removePlayer(roomId, socketId) {
  roomModel.removePlayer(roomId, socketId);
  roomModel.cleanupEmptyRoom(roomId);
  const room = roomModel.getRoom(roomId);
  return room ? sanitizeRoom(room) : null;
}

async function listRooms() {
  return roomModel.listRooms();
}

async function addMessage(roomId, msg) {
  return roomModel.addMessage(roomId, msg);
}
async function getMessages(roomId) {
  return roomModel.getMessages(roomId);
}

/* ---------------------- Exports ---------------------- */

module.exports = {
  getRoom,
  createOrGetRoom,
  addPlayerToRoom,
  applyMove,
  resetRoom,
  removePlayer,
  listRooms,
  addMessage,
  getMessages,
};
