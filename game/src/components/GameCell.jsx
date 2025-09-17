// src/components/GameCell.jsx
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

/**
 * GameCell.jsx
 *
 * Props:
 * - value: null | "X" | "O"
 * - onClick: () => void
 * - index: number
 * - isHighlighted: boolean
 * - cellPx: number | null  // optional: exact pixel size for the cell
 */

export default function GameCell({ value, onClick, index, isHighlighted, cellPx }) {
  // responsive font sizing: scale with cellPx when provided
  const fontSize = cellPx ? Math.max(20, Math.floor(cellPx * 0.35)) : undefined;

  return (
    <motion.button
      layout
      initial={{ scale: 0.98, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      onClick={onClick}
      className={clsx(
        "flex items-center justify-center font-extrabold select-none",
        "bg-transparent border rounded-lg",
        "border-transparent hover:border-white/6",
        "focus:outline-none",
        isHighlighted ? "ring-4 ring-rose-400 transform-gpu" : "hover:scale-[1.01] transition-transform"
      )}
      style={{
        width: cellPx ? `${cellPx}px` : "100%",
        height: cellPx ? `${cellPx}px` : "100%",
        boxSizing: "border-box",
        // subtle cell background so grid looks consistent
        background: "linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.005))",
        borderColor: "rgba(255,255,255,0.04)",
        WebkitTapHighlightColor: "transparent",
      }}
      aria-label={`cell-${index}`}
    >
      <AnimatePresence mode="popLayout">
        {value && (
          <motion.span
            key={value}
            initial={{ scale: 0.45, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.16 }}
            className={value === "X" ? "text-rose-600" : "text-sky-600"}
            style={{ userSelect: "none", fontSize: fontSize ? `${fontSize}px` : undefined }}
          >
            {value}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
