// src/components/Gameboard.jsx
import React, { useEffect, useMemo, useState, useRef, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { io as ioClient } from "socket.io-client";
import clsx from "clsx";

import Leaderboard from "./Leaderboard";
import GameCell from "./GameCell";
import Controls from "./Controls";
import BACKEND_URL from "../config";
import { AuthContext } from "../context/AuthContext";
import SecretRose from "./ChatRoom";

/* ---------------------- Helper: winner detection ---------------------- */

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

  if (board.every(Boolean)) return { winner: "draw", line: null };
  return { winner: null, line: null };
}

/* ---------------------- Component ---------------------- */

export default function GameBoard() {
  const { user } = useContext(AuthContext);

  // core local state
  const [size, setSize] = useState(3);
  const [winLen, setWinLen] = useState(3);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [xTurn, setXTurn] = useState(true);
  const [history, setHistory] = useState([]);
  const [winnerInfo, setWinnerInfo] = useState({ winner: null, line: null });
  const [statusMsg, setStatusMsg] = useState("X to move");

  // multiplayer state
  const [multiplayerMode, setMultiplayerMode] = useState(false);
  const socketRef = useRef(null);
  const [roomId, setRoomId] = useState("");
  const [connectedRoom, setConnectedRoom] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [playerSymbol, setPlayerSymbol] = useState(null);
  const [playerNames, setPlayerNames] = useState({ X: null, O: null });
  const [scores, setScores] = useState({ X: 0, O: 0 });
  const [roomCreatorId, setRoomCreatorId] = useState(null);
  const [isCreator, setIsCreator] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // layout refs + responsive board sizing
  const controlsRef = useRef(null);
  const [boardPx, setBoardPx] = useState(null);

  /* ---------------------- Initialize / reset when size changes ---------------------- */

  useEffect(() => {
    const len = size * size;
    setBoard(Array(len).fill(null));
    setHistory([]);
    setXTurn(true);
    setWinnerInfo({ winner: null, line: null });
    setStatusMsg("X to move");
    setWinLen((prev) => Math.min(Math.max(prev, 3), size));
  }, [size]);

  /* ---------------------- Winner detection ---------------------- */

  useEffect(() => {
    const w = checkWinner(board, size, winLen);
    setWinnerInfo(w);

    if (w.winner === "X") setStatusMsg("🎉 X wins!");
    else if (w.winner === "O") setStatusMsg("🎉 O wins!");
    else if (w.winner === "draw") setStatusMsg("It's a draw");
    else setStatusMsg(xTurn ? "X to move" : "O to move");
  }, [board, size, winLen, xTurn]);

  /* ---------------------- Responsive board sizing & no-scroll on mobile ---------------------- */

  function computeBoardSize() {
    try {
      const vh = window.innerHeight;
      const vw = window.innerWidth;

      // measure header/footer if any
      const header = document.querySelector("header");
      const footer = document.querySelector("footer");
      const headerH = header ? header.getBoundingClientRect().height : 0;
      const footerH = footer ? footer.getBoundingClientRect().height : 0;

      // controls available space (estimated)
      const controlsEl = controlsRef.current;
      const controlsH = controlsEl ? controlsEl.getBoundingClientRect().height : 0;

      // breathing room so buttons / leaderboard still visible
      const verticalPadding = 28;
      const availableHeight = Math.max(120, vh - headerH - controlsH - footerH - verticalPadding);

      // width constraints with side paddings
      const horizontalPadding = 48;
      const maxWidthAvailable = Math.max(120, vw - horizontalPadding);

      // choose the limiting dimension and cap to a comfortable max (900px)
      const sizePx = Math.floor(Math.min(availableHeight, maxWidthAvailable, 900));
      setBoardPx(sizePx);
    } catch (e) {
      setBoardPx(Math.min(window.innerWidth - 48, 480));
    }
  }

  useEffect(() => {
    // if mobile, prevent body scroll so board fits fully on viewport
    const smallScreen = typeof window !== "undefined" && window.innerWidth <= 640;
    if (smallScreen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      computeBoardSize();
      window.addEventListener("resize", computeBoardSize);
      return () => {
        document.body.style.overflow = prev || "";
        window.removeEventListener("resize", computeBoardSize);
      };
    } else {
      computeBoardSize();
      window.addEventListener("resize", computeBoardSize);
      return () => {
        window.removeEventListener("resize", computeBoardSize);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------- Socket helpers (kept similar to your existing logic) ---------------------- */

  function initSocket() {
    if (socketRef.current && socketRef.current.connected) return socketRef.current;

    try {
      socketRef.current = ioClient(BACKEND_URL, {
        autoConnect: false,
        transports: ["websocket", "polling"],
      });

      socketRef.current.on("connect", () => {
        setSocketConnected(true);
        if (roomCreatorId) setIsCreator(roomCreatorId === socketRef.current.id);
      });

      socketRef.current.on("disconnect", () => {
        setSocketConnected(false);
        setConnectedRoom(null);
        setPlayerSymbol(null);
      });

      socketRef.current.on("board-update", (payload) => {
        if (payload?.board) setBoard(payload.board);
        if (typeof payload?.xTurn === "boolean") setXTurn(payload.xTurn);
      });

      socketRef.current.on("players-updated", (payload) => {
        // payload: { players: [...], scores: { X, O }, creatorId }
        if (payload?.players) {
          const map = { X: null, O: null };
          for (const p of payload.players) {
            if (p && p.symbol) map[p.symbol] = p.name || null;
          }
          setPlayerNames(map);
        }
        if (payload?.scores) setScores(payload.scores);
        if (payload?.creatorId) {
          setRoomCreatorId(payload.creatorId);
          setIsCreator(payload.creatorId === (socketRef.current && socketRef.current.id));
        }
      });

      socketRef.current.on("game-ended", (payload) => {
        if (payload?.winner) setWinnerInfo({ winner: payload.winner, line: payload.line || null });
        if (payload?.scores) setScores(payload.scores);
        if (Array.isArray(payload?.players)) {
          const map = { X: null, O: null };
          for (const p of payload.players) {
            if (p && p.symbol) map[p.symbol] = p.name || null;
          }
          setPlayerNames(map);
        }
      });

      socketRef.current.on("joined", (payload) => {
        setConnectedRoom(payload?.room || null);
        setPlayerSymbol(payload?.symbol || null);

        if (Array.isArray(payload?.players)) {
          const map = { X: null, O: null };
          for (const p of payload.players) {
            if (p && p.symbol) map[p.symbol] = p.name || null;
          }
          setPlayerNames(map);
        }
        if (payload?.board) {
          setBoard(payload.board);
          setXTurn(typeof payload.xTurn === "boolean" ? payload.xTurn : true);
        }
        if (payload?.scores) setScores(payload.scores);
        if (payload?.creatorId) {
          setRoomCreatorId(payload.creatorId);
          setIsCreator(payload.creatorId === (socketRef.current && socketRef.current.id));
        } else {
          setRoomCreatorId(null);
          setIsCreator(false);
        }
      });

      socketRef.current.on("player-joined", (payload) => {
        if (payload?.symbol) {
          setPlayerNames((prev) => ({ ...prev, [payload.symbol]: payload.name || prev[payload.symbol] || null }));
        }
      });

      socketRef.current.on("player-left", (payload) => {
        // handled by players-updated where possible
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

  function connectToRoom(room = "") {
    if (!multiplayerMode) {
      alert("Enable Online Mode toggle first to connect.");
      return;
    }
    if (!user) {
      alert("Please login before joining an online room.");
      return;
    }

    const socket = initSocket();
    if (!socket) {
      alert("Failed to create socket client.");
      return;
    }
    if (!socket.connected) socket.open();

    const joinPayload = { room, name: user.name };
    if (socket.connected) socket.emit("join-room", joinPayload);
    else {
      const onConnectOnce = () => {
        socket.emit("join-room", joinPayload);
        socket.off("connect", onConnectOnce);
      };
      socket.on("connect", onConnectOnce);
    }
  }

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
    setPlayerSymbol(null);
    setPlayerNames({ X: null, O: null });
    setScores({ X: 0, O: 0 });
    setRoomCreatorId(null);
    setIsCreator(false);
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
      if (!playerSymbol) {
        alert("You are not assigned a symbol yet.");
        return;
      }
      socketRef.current.emit("move", {
        index,
        symbol: playerSymbol,
        room: connectedRoom || roomId,
      });
      return;
    }

    // local play
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
      if (!isCreator) {
        alert("Only the room creator can start a new game.");
        return;
      }
      socketRef.current.emit("reset", { room: connectedRoom || roomId });
      return;
    }
    setBoard(Array(size * size).fill(null));
    setHistory([]);
    setXTurn(true);
    setWinnerInfo({ winner: null, line: null });
    setStatusMsg("X to move");
  }

  function undo() {
    if (!history.length) return;
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

  const symbolToName = (symbol) => {
    if (!symbol || symbol === "draw") return null;
    return playerNames[symbol] || null;
  };

  const isSmall = typeof window !== "undefined" && window.innerWidth <= 420;
  const gapPx = isSmall ? 8 : 12; const borderPx = 2; // total border (1px each side) used in cells
  const ringExtra = 6; // extra visual for ring/highlight, we'll allow a small inset

  // compute cellPx when boardPx is available
  // subtract border widths and a small allowance so ring doesn't overflow
  const cellPx = boardPx
    ? Math.floor((boardPx - gapPx * (size - 1) - borderPx * size - Math.ceil(ringExtra / 2)) / size)
    : null;

  const boardInnerWidth = cellPx ? cellPx * size + gapPx * (size - 1) + borderPx * size : null;

  const boardContainerStyle = boardPx
    ? {
      // fix board outer dimension to boardPx (cells will be exact)
      width: `${boardInnerWidth}px`,
      margin: "0 auto",
      display: "grid",
      gridTemplateColumns: `repeat(${size}, ${cellPx}px)`,
      gridAutoRows: `${cellPx}px`,
      gap: `${gapPx}px`,
      justifyContent: "center",
      alignItems: "center",
      boxSizing: "border-box",
      padding: 0, // keep paddings out of width calculation
    }
    : {
      display: "grid",
      gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
      gap: `${gapPx}px`,
    };

  const playersArr = [
    { symbol: "X", name: playerNames.X },
    { symbol: "O", name: playerNames.O },
  ];

  /* ---------------------- Render ---------------------- */

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main column: controls + board */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div ref={controlsRef}>
            <Controls
              size={size}
              setSize={(v) => {
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
                    ? `Online — room: ${connectedRoom || roomId}, you are ${user?.name || "?"} (${playerSymbol || "?"})`
                    : "Online — not connected"
                  : statusMsg
              }
              isCreator={isCreator}
            />
          </div>

          <section className="bg-card p-2 sm:p-4 rounded-2xl shadow-soft" aria-live="polite">
            <div style={boardContainerStyle}>
              {board.map((val, i) => (
                <GameCell
                  key={i}
                  index={i}
                  value={val}
                  onClick={() => handleCellClick(i)}
                  isHighlighted={winningIndices.has(i)}
                  cellPx={cellPx}
                />
              ))}
            </div>

            <AnimatePresence>
              {winnerInfo.winner && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 p-4 rounded-lg bg-card border border-transparent shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div>
                    {winnerInfo.winner === "draw" ? (
                      <div className="text-lg font-semibold">It's a draw</div>
                    ) : (
                      <>
                        <div className="text-lg font-semibold">
                          {symbolToName(winnerInfo.winner) || winnerInfo.winner} wins!
                        </div>
                        {winnerInfo.winner && symbolToName(winnerInfo.winner) && (
                          <div className="text-sm text-muted">
                            Defeated:{" "}
                            {symbolToName(winnerInfo.winner === "X" ? "O" : "X") ||
                              (winnerInfo.winner === "X" ? "O" : "X")}
                          </div>
                        )}
                        {scores && typeof scores[winnerInfo.winner] !== "undefined" && (
                          <div className="text-sm text-muted mt-1">
                            {symbolToName(winnerInfo.winner) || winnerInfo.winner} now has{" "}
                            {scores[winnerInfo.winner]} point{scores[winnerInfo.winner] !== 1 ? "s" : ""}.
                          </div>
                        )}
                      </>
                    )}
                    <div className="text-sm text-muted mt-1">Change board or start a new game.</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={newGame} className="px-3 py-2 btn-primary rounded-lg">
                      New Game
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <section className="mt-4 text-sm text-muted">
            Tip: Use a larger win length to make larger boards more interesting. For 3×3 standard rules, set win length to 3.
          </section>
        </div>
        <div className="flex gap-2 items-center mt-2">
          {multiplayerMode && connectedRoom ? (
            <button
              onClick={() => setShowSecret(true)}
              className="px-3 py-2 rounded-lg bg-rose-500 text-white"
            >
              Open Secret Chat
            </button>
          ) : (
            <div className="text-sm text-muted">Connect to an online room to open secret chat.</div>
          )}
        </div>

        {/* Right column: leaderboard */}
        <aside className="hidden lg:block">
          {multiplayerMode && connectedRoom ? (
            <Leaderboard players={playersArr} scores={scores} highlightSymbol={playerSymbol} />
          ) : (
            <div className="bg-card p-4 rounded-xl shadow-soft text-sm text-muted">
              Leaderboard will appear here when you connect to a room.
            </div>
          )}
        </aside>
      </div>

      {/* Mobile leaderboard (under board) */}
      {multiplayerMode && connectedRoom && (
        <div className="mt-4 block lg:hidden">
          <Leaderboard players={playersArr} scores={scores} highlightSymbol={playerSymbol} />
        </div>
      )}

      {showSecret && connectedRoom && (
        <div className="fixed inset-0 z-50 p-6">
          <div className="max-w-4xl mx-auto">
            <SecretRose roomId={connectedRoom || roomId} onClose={() => setShowSecret(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
