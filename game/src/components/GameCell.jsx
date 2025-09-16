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
 */

export default function GameCell({ value, onClick, index, isHighlighted }) {
  return (
    <motion.button
      layout
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      onClick={onClick}
      className={clsx(
        "aspect-square flex items-center justify-center text-2xl sm:text-3xl md:text-4xl font-extrabold select-none",
        "bg-white/85 border border-slate-200 rounded-lg shadow-soft",
        "focus:outline-none",
        isHighlighted
          ? "ring-4 ring-rose-300 scale-[1.02] transform-gpu"
          : "hover:scale-[1.01] transition-transform"
      )}
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
          >
            {value}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
