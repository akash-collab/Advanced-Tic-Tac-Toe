import React, { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { io as ioClient } from "socket.io-client";
import clsx from "clsx";

import GameCell from "./GameCell";
import Controls from "./Controls";
import BACKEND_URL from "../config";

/**
 * GameBoard.jsx
 *
 * - Dynamic NxN board (3..10)
 * - Configurable win length (3..N)
 * - Local 2-player play on same device
 * - Optional online multiplayer using Socket.IO (client-side wiring included)
 * - Animated cells + win highlight
 */

/* ---------------------- Helper utilities ---------------------- */

function checkWinner(board, size, winLen) {
  const idx = (r, c) => r * size + c;
  const dirs = [
    [0, 1], // right
    [1, 0], // down
    [1, 1], // diag down-right
    [-1, 1], // diag up-right
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

/* ---------------------- Main GameBoard ---------------------- */

export default function GameBoard() {
  const [size, setSize] = useState(3);
  const [winLen, setWinLen] = useState(3);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [xTurn, setXTurn] = useState(true);
  const [history, setHistory] = useState([]);
  const [statusMsg, setStatusMsg] = useState("X to move");
  const [winnerInfo, setWinnerInfo] = useState({ winner: null, line: null });

  // multiplayer state
  const [multiplayerMode, setMultiplayerMode] = useState(false);
  const socketRef = useRef(null);
  const [roomId, setRoomId] = useState("");
  const [connectedRoom, setConnectedRoom] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [playerSymbol, setPlayerSymbol] = useState(null);

  // initialize board when size changes
  useEffect(() => {
    const len = size * size;
    setBoard(Array(len).fill(null));
    setHistory([]);
    setXTurn(true);
    setWinnerInfo({ winner: null, line: null });
    setStatusMsg("X to move");
    setWinLen((prev) => Math.min(Math.max(prev, 3), size));
    // disconnect any existing socket connection when changing board size? no — keep connection
  }, [size]);

  // recompute winner when board or winLen changes
  useEffect(() => {
    const w = checkWinner(board, size, winLen);
    setWinnerInfo(w);
    if (w.winner === "X") setStatusMsg("🎉 X wins!");
    else if (w.winner === "O") setStatusMsg("🎉 O wins!");
    else if (w.winner === "draw") setStatusMsg("It's a draw");
    else setStatusMsg(xTurn ? "X to move" : "O to move");
  }, [board, size, winLen, xTurn]);

  // Clean up socket on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        try {
          socketRef.current.disconnect();
        } catch (e) { }
        socketRef.current = null;
      }
    };
  }, []);

  /* ---------------------- Socket helpers ---------------------- */

  /**
   * initSocket - lazily create socket client if not present
   * Replace 'http://localhost:5050' with your server URL in production.
   */
  function initSocket() {
    if (socketRef.current && socketRef.current.connected) return socketRef.current;

    try {
      socketRef.current = ioClient(BACKEND_URL, {
        autoConnect: false,
        transports: ["websocket", "polling"],
      });


      // core handlers
      socketRef.current.on("connect", () => {
        setSocketConnected(true);
        console.log("socket connected:", socketRef.current.id);
      });

      socketRef.current.on("disconnect", (reason) => {
        setSocketConnected(false);
        console.log("socket disconnected:", reason);
        setConnectedRoom(null);
      });

      socketRef.current.on("board-update", (payload) => {
        // server should send { board, xTurn } or similar
        if (payload?.board) {
          setBoard(payload.board);
        }
        if (typeof payload?.xTurn === "boolean") {
          setXTurn(payload.xTurn);
        }
      });

      socketRef.current.on("joined", (payload) => {
        setConnectedRoom(payload?.room || null);
        setPlayerSymbol(payload?.symbol || null); // ✅ keep track of assigned symbol
        alert(`Joined room: ${payload?.room || "unknown"} as ${payload?.symbol}`);
        if (payload?.board) {
          setBoard(payload.board);
          setXTurn(typeof payload.xTurn === "boolean" ? payload.xTurn : true);
        }
      });

      socketRef.current.on("join-error", (payload) => {
        alert("Failed to join room: " + (payload?.message || "unknown error"));
      });

      socketRef.current.on("error", (err) => {
        console.warn("socket error:", err);
      });
    } catch (e) {
      console.warn("Socket init failed:", e);
    }
    return socketRef.current;
  }

  /**
   * connectToRoom - used as the onConnect prop for Controls
   */
  function connectToRoom(room = "") {
    if (!multiplayerMode) {
      alert("Enable Online Mode toggle first to connect.");
      return;
    }
    const socket = initSocket();
    if (!socket) {
      alert("Failed to create socket client.");
      return;
    }
    if (!socket.connected) {
      socket.open();
    }

    // wait for connection and then emit join-room
    if (socket.connected) {
      socket.emit("join-room", { room });
    } else {
      // if not connected yet, listen for connect once, then join
      const onConnectOnce = () => {
        socket.emit("join-room", { room });
        socket.off("connect", onConnectOnce);
      };
      socket.on("connect", onConnectOnce);
    }
  }

  /**
   * leaveRoom - disconnects from socket and leaves room
   */
  function leaveRoom() {
    if (socketRef.current) {
      try {
        socketRef.current.emit("leave-room", { room: connectedRoom });
      } catch (e) { }
      try {
        socketRef.current.disconnect();
      } catch (e) { }
      socketRef.current = null;
    }
    setConnectedRoom(null);
    setSocketConnected(false);
    alert("Disconnected from room");
  }

  /* ---------------------- Actions ---------------------- */

  const idx = (r, c) => r * size + c;

  function handleCellClick(index) {
    if (multiplayerMode && !socketConnected) {
      alert("Not connected to online server. Connect to a room first.");
      return;
    }
    if (winnerInfo.winner) return;
    if (board[index]) return;

    if (multiplayerMode) {
      // Online mode → don’t update optimistically, let server confirm
      socketRef.current.emit("move", { index, symbol: playerSymbol, room: connectedRoom || roomId });
      return;
    }

    // Local play fallback
    setHistory((h) => [...h, board.slice()]);
    setBoard((prev) => {
      const copy = prev.slice();
      copy[index] = xTurn ? "X" : "O";
      return copy;
    });
    setXTurn((v) => !v);
  }


  function newGame() {
    if (multiplayerMode && socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("reset", { room: connectedRoom || roomId });
      return;
    }
    // local mode
    setBoard(Array(size * size).fill(null));
    setHistory([]);
    setXTurn(true);
    setWinnerInfo({ winner: null, line: null });
    setStatusMsg("X to move");
  }


  function undo() {
    if (!history.length) return;
    // Undo should be local only (server authoritative games probably shouldn't allow local undo)
    if (multiplayerMode && socketRef.current && socketRef.current.connected) {
      alert("Undo is disabled in online mode (server should handle state).");
      return;
    }
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setBoard(prev);
    setXTurn((t) => !t);
    setWinnerInfo({ winner: null, line: null });
  }

  /* ---------------------- UI helpers ---------------------- */

  const winningIndices = useMemo(() => {
    if (!winnerInfo.line || winnerInfo.winner === "draw") return new Set();
    return new Set(winnerInfo.line.map((p) => idx(p.r, p.c)));
  }, [winnerInfo, size]);

  /* ---------------------- Render ---------------------- */

  return (
    <div className="max-w-4xl mx-auto">
      {/* Controls */}
      <Controls
        size={size}
        setSize={(v) => {
          // if changing size while connected online, warn
          if (multiplayerMode && socketConnected) {
            if (!confirm("Changing board size while connected will reset local board. Proceed?")) return;
          }
          setSize(v);
        }}
        winLen={winLen}
        setWinLen={setWinLen}
        newGame={newGame}
        undo={undo}
        canUndo={history.length > 0}
        multiplayerMode={multiplayerMode}
        setMultiplayerMode={(val) => {
          // toggle multiplayer mode: if turning off, disconnect socket
          if (!val) {
            leaveRoom();
          }
          setMultiplayerMode(val);
        }}
        roomId={roomId}
        setRoomId={setRoomId}
        onConnect={(r) => connectToRoom(r)}
        statusMsg={
          multiplayerMode
            ? socketConnected
              ? `Online — room: ${connectedRoom || roomId}, you are ${playerSymbol || "?"}`
              : "Online — not connected"
            : statusMsg
        }

      />

      {/* Board */}
      <section
        className="bg-gradient-to-br from-white to-rose-50 p-4 rounded-2xl shadow-glow"
        aria-live="polite"
      >
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          }}
        >
          {board.map((val, i) => (
            <GameCell
              key={i}
              index={i}
              value={val}
              onClick={() => handleCellClick(i)}
              isHighlighted={winningIndices.has(i)}
            />
          ))}
        </div>

        {/* Overlay message when game finished */}
        <AnimatePresence>
          {winnerInfo.winner && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-4 p-4 rounded-lg bg-white/90 border border-slate-100 shadow-soft flex items-center justify-between"
            >
              <div>
                {winnerInfo.winner === "draw" ? (
                  <div className="text-lg font-semibold">It's a draw</div>
                ) : (
                  <div className="text-lg font-semibold">{winnerInfo.winner} wins!</div>
                )}
                <div className="text-sm text-slate-500">Change board or start a new game.</div>
              </div>
              <div className="flex gap-2">
                <button onClick={newGame} className="px-3 py-2 bg-rose-500 text-white rounded-lg">
                  New Game
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Tips */}
      <section className="mt-4 text-sm text-slate-500">
        Tip: Use a larger win length to make larger boards more interesting. For 3×3 standard rules, set win length to 3.
      </section>
    </div>
  );
}
