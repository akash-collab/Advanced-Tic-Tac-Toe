const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const routes = require("./src/routes/index");
const attachRoomSockets = require("./src/sockets/roomsSocket");


const app = express();
app.use(cors());
app.use(express.json());

// HTTP routes (health checks, optional REST endpoints)
app.use("/", routes);

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // for dev allow all origins; restrict in production
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

// Attach socket handlers (keeps socket logic modular)
attachRoomSockets(io);

// Start server
const PORT = process.env.PORT || 5050;
server.listen(PORT, () => {
  console.log(`Tic-Tac-Rose Socket.IO server listening on port ${PORT}`);
});
