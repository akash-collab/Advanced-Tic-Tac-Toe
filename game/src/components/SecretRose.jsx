import React from "react";
import { motion } from "framer-motion";

export default function SecretRose({ onClose }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="p-6 rounded-2xl bg-white shadow-soft border"
      >
        <motion.div
          initial={{ y: -6 }}
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
          className="text-6xl"
        >
          🌹
        </motion.div>
        <div className="mt-3 text-lg font-semibold text-rose-600">Secret Garden</div>
        <p className="text-slate-600 max-w-sm mt-1">
          You found the secret! A full animated rose experience is coming next. 🌸
        </p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition"
        >
          Back to Game
        </button>
      </motion.div>
    </div>
  );
}
