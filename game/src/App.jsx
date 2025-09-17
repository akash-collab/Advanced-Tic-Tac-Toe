// src/App.jsx
import React, { useState, useContext } from "react";
import GameBoard from "../src/components/Gameboard";
import SecretRose from "./components/ChatRoom";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import Login from "../src/pages/Login";
import Profile from "../src/pages/Profile";
import { FiUser } from "react-icons/fi";

/**
 * AppInner
 *
 * This component consumes AuthContext to:
 * - show Login/Profile buttons
 * - hide Secret and Online features for unauthenticated users
 * - switch between views ('home' | 'login' | 'profile')
 */
function AppInner() {
  const [showSecret, setShowSecret] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [view, setView] = useState("home"); // 'home' | 'login' | 'profile'
  const { user, logout } = useContext(AuthContext);

  // inside AppInner
const handleKeySubmit = (e) => {
  e.preventDefault();
  if (keyInput.trim().toLowerCase() === "bristi") {
    if (!user) {
      alert("Please login to unlock the secret.");
      return;
    }
    setShowSecret(true);
    setView("home");
    setKeyInput("");
  } else {
    alert("❌ Wrong key!");
  }
};


  return (
    <div className="flex flex-col min-h-screen bg-app">
      {/* Navbar */}
      <header className="shadow-soft bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-xl sm:text-2xl font-bold text-rose-600">Tic Tac Rose</h1>

            {/* Quick nav */}
            <nav className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => {
                  setView("home");
                  setShowSecret(false);
                }}
                className="text-sm text-slate-600 hover:text-slate-800"
              >
                Play
              </button>

              {/* Secret nav should only be visible when logged in */}
              {user ? (
                <button
                  onClick={() => {
                    setView("home");
                    setShowSecret(true);
                  }}
                  className="text-sm text-slate-600 hover:text-slate-800"
                >
                  Secret
                </button>
              ) : (
                <button
                  onClick={() => alert("Login to access the secret")}
                  className="text-sm text-slate-400 cursor-not-allowed"
                  title="Login to access"
                >
                  Secret
                </button>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* auth controls */}
            {!user ? (
              <button
                onClick={() => setView("login")}
                className="px-3 py-1 bg-rose-500 text-white rounded-lg hover:bg-rose-600 text-sm"
              >
                Login / Register
              </button>
            ) : (
              <>
                <div className="text-sm text-slate-700 hidden sm:block">
                  Signed in as <span className="font-semibold">{user.name}</span>
                </div>
                    <button onClick={() => setView("profile")} className="p-2 rounded-lg bg-transparent border border-transparent"><FiUser className="text-white" /></button>

                <button
                  onClick={() => {
                    logout();
                    setView("home");
                    setShowSecret(false);
                  }}
                  className="px-3 py-1 bg-rose-100 text-rose-600 rounded-lg text-sm"
                >
                  Logout
                </button>
              </>
            )}

            {/* secret key */}
            <form onSubmit={handleKeySubmit} className="flex gap-2">
              <input
                type="password"
                placeholder="Enter key..."
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="px-2 py-1 rounded-lg border border-transparent bg-transparent text-sm text-muted placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
              <button
                type="submit"
                className="px-3 py-1 btn-primary rounded-lg text-sm"
              >
                Unlock
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 fade-in">
        {view === "login" ? (
          <Login />
        ) : view === "profile" ? (
          <Profile />
        ) : !showSecret ? (
          // Pass user down via context; GameBoard itself will gate multiplayer/secret features.
          <GameBoard />
        ) : (
          <SecretRose onClose={() => setShowSecret(false)} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-card text-muted text-center py-3 text-sm">
        Made with ❤️
      </footer>
    </div>
  );
}

/**
 * Root App — wrap with AuthProvider
 */
export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
