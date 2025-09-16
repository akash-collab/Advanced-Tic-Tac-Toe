import React from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

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
}) {
  return (
    <section className="mb-4 grid gap-3 grid-cols-1 sm:grid-cols-2 items-center">
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
        <div className="text-sm text-slate-600 mr-2 hidden sm:block">{statusMsg}</div>

        <button
          onClick={newGame}
          className="px-3 py-2 bg-rose-500 text-white rounded-lg shadow-soft hover:bg-rose-600 transition"
          title="Start a new game"
        >
          New Game
        </button>

        <button
          onClick={undo}
          disabled={!canUndo}
          className={clsx(
            "px-3 py-2 rounded-lg border",
            canUndo ? "bg-white hover:bg-slate-50" : "bg-slate-100 text-slate-400 cursor-not-allowed"
          )}
          title="Undo last move"
        >
          Undo
        </button>
      </motion.div>

      {/* Multiplayer row */}
      <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={multiplayerMode}
              onChange={(e) => setMultiplayerMode(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Online Mode</span>
          </label>

          <div className="text-xs text-slate-500">Enable to connect to a Socket.IO server (optional)</div>
        </div>

        {multiplayerMode && (
          <div className="flex gap-2 items-center justify-end">
            <input
              placeholder="room id (optional)"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="px-2 py-1 rounded-lg border text-sm focus:outline-none"
            />
            <button
              onClick={() => onConnect && onConnect(roomId)}
              className="px-3 py-1 bg-sky-600 text-white rounded-lg text-sm"
            >
              Connect
            </button>
          </div>
        )}
      </div>

      {/* Mobile status */}
      <div className="sm:col-span-2 block sm:hidden mt-1 text-sm text-slate-600">{statusMsg}</div>
    </section>
  );
}
