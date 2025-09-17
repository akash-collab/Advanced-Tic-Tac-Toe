// src/sockets/roomsSocket.js
const roomsController = require("../controllers/roomsController");

/**
 * Attach room-related socket handlers to a Socket.IO server instance.
 * @param {import('socket.io').Server} io
 */
function attachRoomSockets(io) {
  const socketRoomMap = new Map(); // socketId -> roomId

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);


socket.on("join-room", async (payload = {}, ack) => {
  try {
    const roomId = String(payload.room || "default");
    const options = {
      size: payload.size,
      winLen: payload.winLen,
      name: payload.name || null,
    };

    const { symbol, room } = await roomsController.addPlayerToRoom(roomId, socket.id, options);

    socketRoomMap.set(socket.id, roomId);
    socket.join(roomId);

    const joinedPayload = {
      room: room.id,
      symbol,
      board: room.board,
      xTurn: room.xTurn,
      size: room.size,
      winLen: room.winLen,
      players: room.players,
      scores: room.scores,
      creatorId: room.creatorId,
    };

    if (typeof ack === "function") ack({ ok: true, data: joinedPayload });
    socket.emit("joined", joinedPayload);

    const history = await roomsController.getMessages(roomId);
    if (history && history.length) socket.emit("chat-history", history);

    socket.to(roomId).emit("player-joined", { id: socket.id, symbol, name: options.name || null });
    io.in(roomId).emit("players-updated", { players: room.players, scores: room.scores, creatorId: room.creatorId });

    console.log(`Socket ${socket.id} joined room ${roomId} as ${symbol}`);
  } catch (err) {
    console.warn("join-room error for socket", socket.id, err);
    if (typeof ack === "function") ack({ ok: false, error: err.message || "Failed to join" });
    socket.emit("join-error", { message: err.message || "Failed to join room" });
  }
});

    socket.on("move", async (payload = {}) => {
      try {
        const { room: roomId, index, symbol } = payload;
        if (!roomId) {
          socket.emit("error", { message: "Missing room id" });
          return;
        }
        // Controller will validate using socket.id
        const { room: updatedRoom, winner, line } = await roomsController.applyMove(roomId, socket.id, index, symbol);

        // Broadcast updated board to everyone in the room
        io.in(roomId).emit("board-update", {
          board: updatedRoom.board,
          xTurn: updatedRoom.xTurn,
        });

        // If a winner (X or O) or draw occurred, broadcast game-ended and players-updated (scores changed for X/O only)
        if (winner) {
          io.in(roomId).emit("game-ended", {
            winner,
            line,
            scores: updatedRoom.scores,
            players: updatedRoom.players,
          });
          // also emit players-updated for UI scoreboard
          io.in(roomId).emit("players-updated", { players: updatedRoom.players, scores: updatedRoom.scores, creatorId: updatedRoom.creatorId });
        }
      } catch (err) {
        console.warn("move error:", err?.message || err);
        socket.emit("error", { message: err.message || "Move failed" });
      }
    });

    socket.on("reset", async (payload = {}) => {
      try {
        const roomId = String(payload.room || socketRoomMap.get(socket.id) || "default");
        const room = await roomsController.getRoom(roomId);
        if (!room) {
          socket.emit("error", { message: "Room not found" });
          return;
        }
        if (room.creatorId && room.creatorId !== socket.id) {
          socket.emit("error", { message: "Only the room creator can start a new game" });
          return;
        }
        const updated = await roomsController.resetRoom(roomId);
        io.in(roomId).emit("board-update", { board: updated.board, xTurn: updated.xTurn });
        io.in(roomId).emit("players-updated", { players: updated.players, scores: updated.scores, creatorId: updated.creatorId });
      } catch (err) {
        console.warn("reset error:", err);
        socket.emit("error", { message: err.message || "Reset failed" });
      }
    });

    // Chat: persist server-side then emit
    socket.on("chat-message", async (payload = {}) => {
      const roomId = socketRoomMap.get(socket.id);
      if (!roomId) return;

      // Basic validation: ensure sender is a player in the room (prevents spamming other rooms)
      const room = await roomsController.getRoom(roomId);
      const isPlayer = room && room.players && Object.values(room.players).some((p) => p.socketId === socket.id);
      if (!isPlayer) {
        // ignore or reply with error
        socket.emit("error", { message: "You are not a player in this room" });
        return;
      }

      const msg = {
        id: `${socket.id}-${Date.now()}`,
        sender: payload.sender || "Anonymous",
        text: payload.text || null,
        mediaUrl: payload.mediaUrl || null,
        createdAt: new Date(),
      };

      // persist
      await roomsController.addMessage(roomId, msg);

      // Emit to everyone else in room (so sender doesn't get a duplicate if they optimistically appended)
      socket.to(roomId).emit("chat-message", msg);

      // Send an ack to the sender (so client has a single canonical place to append outgoing message)
      socket.emit("chat-message-ack", msg);
    });

    socket.on("leave-room", async (payload = {}) => {
      try {
        const roomId = String(payload.room || socketRoomMap.get(socket.id));
        if (!roomId) return;

        socketRoomMap.delete(socket.id);
        socket.leave(roomId);

        const roomAfter = await roomsController.removePlayer(roomId, socket.id);

        // Notify others and, if possible, send updated players list
        socket.to(roomId).emit("player-left", { id: socket.id });
        if (roomAfter) {
          io.in(roomId).emit("players-updated", { players: roomAfter.players, scores: roomAfter.scores, creatorId: roomAfter.creatorId });
        } else {
          console.log(`Room ${roomId} removed (empty)`);
        }
      } catch (err) {
        console.warn("leave-room error:", err);
      }
    });

    socket.on("disconnect", async (reason) => {
      try {
        const roomId = socketRoomMap.get(socket.id);
        socketRoomMap.delete(socket.id);
        if (roomId) {
          const roomAfter = await roomsController.removePlayer(roomId, socket.id);
          socket.to(roomId).emit("player-left", { id: socket.id });
          if (roomAfter) {
            io.in(roomId).emit("players-updated", { players: roomAfter.players, scores: roomAfter.scores, creatorId: roomAfter.creatorId });
          } else {
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
