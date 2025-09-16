// controllers/roomsController.js
const roomModel = require("../models/roomModel");

/**
 * Get room data for HTTP or socket responses.
 * Returns a sanitized copy (no internal sockets map keys).
 * @param {string} roomId
 * @returns {Object|null}
 */
async function getRoom(roomId) {
  const room = roomModel.getRoom(roomId);
  if (!room) return null;

  return sanitizeRoom(room);
}

/**
 * Create a room with options or return existing.
 * @param {string} roomId
 * @param {Object} options - { size, winLen }
 * @returns {Object} room
 */
async function createOrGetRoom(roomId, options = {}) {
  const room = roomModel.createRoom(roomId, options);
  return sanitizeRoom(room);
}

/**
 * Add a player (socket) to a room and return assigned symbol and room snapshot.
 * Throws on error (e.g. room full).
 * @param {string} roomId
 * @param {string} socketId
 * @param {Object} options - optional { size, winLen } used when creating room
 * @returns {{ symbol: string, room: Object }}
 */
async function addPlayerToRoom(roomId, socketId, options = {}) {
  // ensure room exists
  roomModel.createRoom(roomId, options);
  const symbol = roomModel.addPlayer(roomId, socketId);
  const room = roomModel.getRoom(roomId);
  return { symbol, room: sanitizeRoom(room) };
}

/**
 * Apply a move in the room.
 * Throws on validation errors from the model.
 * Returns updated sanitized room.
 * @param {string} roomId
 * @param {number} index
 * @param {"X"|"O"} symbol
 * @returns {Object} room
 */
async function applyMove(roomId, index, symbol) {
  const updated = roomModel.applyMove(roomId, index, symbol);
  return sanitizeRoom(updated);
}

/**
 * Reset a room board.
 * @param {string} roomId
 * @returns {Object} room
 */
async function resetRoom(roomId) {
  const r = roomModel.resetRoom(roomId);
  return sanitizeRoom(r);
}

/**
 * Remove a player from a room and cleanup empty room.
 * @param {string} roomId
 * @param {string} socketId
 */
async function removePlayer(roomId, socketId) {
  roomModel.removePlayer(roomId, socketId);
  roomModel.cleanupEmptyRoom(roomId);
  const room = roomModel.getRoom(roomId);
  return room ? sanitizeRoom(room) : null;
}

/**
 * List all rooms (summary view)
 * @returns {Array<Object>}
 */
async function listRooms() {
  return roomModel.listRooms();
}

/* ---------------------- Helpers ---------------------- */

/**
 * Remove sensitive/internal details and return a shallow copy suitable for clients.
 */
function sanitizeRoom(room) {
  if (!room) return null;
  return {
    id: room.id,
    size: room.size,
    winLen: room.winLen,
    board: room.board.slice(),
    players: Object.values(room.players), // returns array like ["X","O"]
    xTurn: room.xTurn,
  };
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
};
