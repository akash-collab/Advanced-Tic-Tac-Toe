// src/components/Controls.jsx
import React, { useContext } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { AuthContext } from "../context/AuthContext";

/**
 * Controls.jsx
 *
 * Props expected:
 * - size (number)
 * - setSize (fn)
 * - winLen (number)
 * - setWinLen (fn)
 * - newGame (fn)
 * - undo (fn)
 * - canUndo (bool)
 * - multiplayerMode (bool)
 * - setMultiplayerMode (fn)
 * - roomId (string)
 * - setRoomId (fn)
 * - onConnect (fn)  // invoked when user clicks "Connect"
 * - statusMsg (string)
 *
 * Behavior change:
 * - Online Mode toggle + Connect input/button are disabled for unauthenticated users.
 */

export default function Controls({
  size,
  setSize,
  winLen,
  setWinLen,
  newGame,
  undo,
  canUndo,
  multiplayerMode,
  setMultiplayerMode,
  roomId,
  setRoomId,
  onConnect,
  statusMsg,
  isCreator = false,
}) {
  const { user } = useContext(AuthContext);
  const loggedIn = Boolean(user && user.token);

  // When user tries to toggle multiplayer on while not logged in, show an alert
  function handleToggleMultiplayer(checked) {
    if (checked && !loggedIn) {
      // polite UX: quick alert — you can replace with a nicer toast
      alert("You must be logged in to use Online Mode.");
      return;
    }
    setMultiplayerMode(checked);
  }

  return (
    <section className="mb-4 grid gap-3 grid-cols-1 sm:grid-cols-2 items-center bg-card p-3 rounded-xl shadow-soft">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="flex flex-col gap-2"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-500">Board size</div>
            <div className="font-semibold">{size} × {size}</div>
          </div>
          <input
            aria-label="board-size"
            type="range"
            min="3"
            max="10"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-44"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-500">Win length</div>
            <div className="font-semibold">{winLen}</div>
          </div>
          <input
            aria-label="win-length"
            type="range"
            min="3"
            max={size}
            value={winLen}
            onChange={(e) => setWinLen(Number(e.target.value))}
            className="w-44"
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36 }}
        className="flex gap-2 justify-end items-center"
      >
        <div className="text-sm text-muted mr-2 hidden sm:block">{statusMsg}</div>

        <button
          onClick={newGame}
          className={clsx(
            "px-4 py-2 rounded-lg",
            multiplayerMode
              ? (isCreator ? "btn-primary" : "bg-slate-700 text-slate-400 cursor-not-allowed")
              : "btn-primary"
          )}
          title={multiplayerMode ? (isCreator ? "Start a new game" : "Only room creator can start a new game") : "Start a new game"}
          disabled={multiplayerMode && !isCreator}
        >
          New Game
        </button>

        {/* <button
          onClick={undo}
          disabled={!canUndo}
          className={clsx(
            "px-3 py-2 rounded-lg border",
            canUndo ? "bg-white hover:bg-slate-50" : "bg-slate-100 text-slate-400 cursor-not-allowed"
          )}
          title="Undo last move"
        >
          Undo
        </button> */}
      </motion.div>

      {/* Multiplayer row */}
      <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 justify-end">
            <input
              type="checkbox"
              checked={multiplayerMode}
              onChange={(e) => handleToggleMultiplayer(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Online Mode</span>
          </label>

        </div>

        {/* If user is not logged in, disable connect controls and show hint */}
        <div className="flex gap-2 items-center justify-end">
          <input
            placeholder={loggedIn ? "room id (optional)" : "Login to use online mode"} value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className={clsx(
              "px-3 py-2 rounded-lg border bg-transparent text-sm",
              !loggedIn ? "bg-slate-800 text-slate-500 cursor-not-allowed" : ""
            )}
            disabled={!loggedIn || !multiplayerMode}
          />
          <button
            onClick={() => {
              if (!loggedIn) {
                alert("Please login to connect to online rooms.");
                return;
              }
              if (!multiplayerMode) {
                alert("Enable Online Mode first.");
                return;
              }
              onConnect && onConnect(roomId);
            }}
            className={clsx("px-4 py-2 rounded-lg text-sm", loggedIn && multiplayerMode ? "bg-sky-600 text-white" : "bg-slate-700 text-slate-400 cursor-not-allowed")}
            disabled={!loggedIn || !multiplayerMode}
          >
            Connect
          </button>
        </div>
      </div>

      {/* Mobile status */}
      <div className="sm:col-span-2 block sm:hidden mt-1 text-sm text-muted">{statusMsg}</div>
    </section>
  );
}
