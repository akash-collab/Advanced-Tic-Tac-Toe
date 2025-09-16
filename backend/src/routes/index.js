// routes/index.js
const express = require("express");
const router = express.Router();

// Controllers (we'll implement these next)
let roomsController;
try {
  roomsController = require("../controllers/roomsController");
} catch (err) {
  // If the controller isn't created yet, routes will return 501 until implemented.
  roomsController = null;
}

/**
 * Health check
 * GET /
 */
router.get("/", (req, res) => {
  res.send("Tic-Tac-Rose Socket.IO server is running.");
});

/**
 * Simple health endpoint
 * GET /health
 */
router.get("/health", (req, res) => {
  res.json({ ok: true, timestamp: Date.now() });
});

/**
 * Get room metadata
 * GET /rooms/:roomId
 *
 * Returns basic room state for debugging/testing (not exposed to clients in production).
 */
router.get("/rooms/:roomId", async (req, res) => {
  if (!roomsController || !roomsController.getRoom) {
    return res.status(501).json({ error: "roomsController.getRoom not implemented yet" });
  }

  try {
    const room = await roomsController.getRoom(req.params.roomId);
    if (!room) return res.status(404).json({ error: "Room not found" });
    res.json({ room });
  } catch (err) {
    console.error("GET /rooms/:roomId error:", err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * Admin reset room
 * POST /rooms/:roomId/reset
 *
 * Resets the board in the given room (useful for testing).
 */
router.post("/rooms/:roomId/reset", async (req, res) => {
  if (!roomsController || !roomsController.resetRoom) {
    return res.status(501).json({ error: "roomsController.resetRoom not implemented yet" });
  }

  try {
    await roomsController.resetRoom(req.params.roomId);
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /rooms/:roomId/reset error:", err);
    res.status(500).json({ error: String(err) });
  }
});

module.exports = router;
