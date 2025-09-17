// src/components/Leaderboard.jsx
import React from "react";
import clsx from "clsx";

/**
 * Leaderboard
 * props:
 * - players: array of { socketId, symbol, name }
 * - scores: { X: number, O: number }
 * - highlightSymbol: optional "X"|"O" to highlight current player
 */
export default function Leaderboard({ players = [], scores = { X: 0, O: 0 }, highlightSymbol = null }) {
  // map symbol to name (fallback to symbol)
  const nameFor = (symbol) => {
    const p = players.find((x) => x.symbol === symbol);
    return (p && (p.name || symbol)) || symbol;
  };

  return (
    <div className="bg-card p-3 rounded-xl shadow-soft w-full max-w-sm">
      <div className="text-sm text-muted mb-2">Leaderboard</div>
      <div className="flex flex-col gap-2">
        {["X", "O"].map((s) => (
          <div
            key={s}
            className={clsx(
              "flex items-center justify-between px-3 py-2 rounded-md",
              highlightSymbol === s ? "ring-2 ring-rose-400 bg-white/3" : "bg-transparent"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm" style={{ background: s === "X" ? "rgba(236,72,153,0.12)" : "rgba(96,165,250,0.08)" }}>
                {s}
              </div>
              <div>
                <div className="text-sm font-semibold">{nameFor(s)}</div>
                <div className="text-xs text-muted">Symbol: {s}</div>
              </div>
            </div>
            <div className="text-lg font-bold">{scores[s] || 0}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
