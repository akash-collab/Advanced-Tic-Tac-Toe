import React, { useState } from "react";
import GameBoard from "./components/Gameboard";
import SecretRose from "./components/SecretRose";

export default function App() {
  const [showSecret, setShowSecret] = useState(false);
  const [keyInput, setKeyInput] = useState("");

  const handleKeySubmit = (e) => {
    e.preventDefault();
    if (keyInput.trim().toLowerCase() === "bristi") {
      setShowSecret(true);
    } else {
      alert("❌ Wrong key!");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-sky-100 via-white to-rose-100">
      {/* Navbar */}
      <header className="shadow-soft bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl sm:text-2xl font-bold text-rose-600">Tic Tac Rose</h1>
          <form onSubmit={handleKeySubmit} className="flex gap-2">
            <input
              type="password"
              placeholder="Enter key..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="px-2 py-1 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
            <button
              type="submit"
              className="px-3 py-1 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition"
            >
              Unlock
            </button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 fade-in">
        {!showSecret ? (
          <GameBoard />
        ) : (
          <SecretRose onClose={() => setShowSecret(false)} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white/70 backdrop-blur-sm text-center py-3 text-sm text-slate-500">
        Made with ❤️
      </footer>
    </div>
  );
}
