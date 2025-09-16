// sockets/roomsSocket.js
const roomsController = require("../controllers/roomsController");

/**
 * Attach room-related socket handlers to a Socket.IO server instance.
 * @param {import('socket.io').Server} io
 */
function attachRoomSockets(io) {
  // map socketId -> roomId (helps with cleanup)
  const socketRoomMap = new Map();

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    /* ---------------------- join-room ---------------------- */
    socket.on("join-room", async (payload = {}) => {
      try {
        const roomId = String(payload.room || "default");
        const options = {
          size: payload.size,
          winLen: payload.winLen,
        };

        // Try to add player to room via controller (may throw if full)
        const { symbol, room } = await roomsController.addPlayerToRoom(roomId, socket.id, options);

        // Track mapping
        socketRoomMap.set(socket.id, roomId);

        // Join socket.io room
        socket.join(roomId);

        // Acknowledge the joining socket with assigned symbol and current room state
        socket.emit("joined", {
          room: room.id,
          symbol,
          board: room.board,
          xTurn: room.xTurn,
          size: room.size,
          winLen: room.winLen,
        });

        // Notify other sockets in the room that a player joined
        socket.to(roomId).emit("player-joined", { id: socket.id, symbol });

        console.log(`Socket ${socket.id} joined room ${roomId} as ${symbol}`);
      } catch (err) {
        console.warn("join-room error for socket", socket.id, err);
        socket.emit("join-error", { message: err.message || "Failed to join room" });
      }
    });

    /* ---------------------- move ---------------------- */
    socket.on("move", async (payload = {}) => {
      try {
        const { room: roomId, index, symbol } = payload;
        if (!roomId) {
          socket.emit("error", { message: "Missing room id" });
          return;
        }
        // Controller will validate and throw on invalid moves
        const updatedRoom = await roomsController.applyMove(roomId, index, symbol);

        // Broadcast updated board to everyone in the room
        io.in(roomId).emit("board-update", {
          board: updatedRoom.board,
          xTurn: updatedRoom.xTurn,
        });
      } catch (err) {
        console.warn("move error:", err);
        socket.emit("error", { message: err.message || "Move failed" });
      }
    });

    /* ---------------------- reset ---------------------- */
    socket.on("reset", async (payload = {}) => {
      try {
        const roomId = String(payload.room || socketRoomMap.get(socket.id) || "default");
        const updated = await roomsController.resetRoom(roomId);

        io.in(roomId).emit("board-update", { board: updated.board, xTurn: updated.xTurn });
      } catch (err) {
        console.warn("reset error:", err);
        socket.emit("error", { message: err.message || "Reset failed" });
      }
    });

    /* ---------------------- leave-room ---------------------- */
    socket.on("leave-room", async (payload = {}) => {
      try {
        const roomId = String(payload.room || socketRoomMap.get(socket.id));
        if (!roomId) return;

        // Remove mapping and remove player from model
        socketRoomMap.delete(socket.id);
        socket.leave(roomId);

        const roomAfter = await roomsController.removePlayer(roomId, socket.id);

        // Notify others
        socket.to(roomId).emit("player-left", { id: socket.id });

        // If roomAfter is null, room was cleaned up (no players)
        if (!roomAfter) {
          console.log(`Room ${roomId} removed (empty)`);
        }
      } catch (err) {
        console.warn("leave-room error:", err);
      }
    });

    /* ---------------------- disconnect ---------------------- */
    socket.on("disconnect", async (reason) => {
      try {
        const roomId = socketRoomMap.get(socket.id);
        socketRoomMap.delete(socket.id);
        if (roomId) {
          // remove player and notify room
          const roomAfter = await roomsController.removePlayer(roomId, socket.id);
          socket.to(roomId).emit("player-left", { id: socket.id });

          if (!roomAfter) {
            console.log(`Deleted empty room ${roomId} after socket disconnect ${socket.id}`);
          }
        }
        console.log("Socket disconnected:", socket.id, "reason:", reason);
      } catch (err) {
        console.warn("disconnect handler error:", err);
      }
    });
  });
}

module.exports = attachRoomSockets;
