// src/components/SecretRose.jsx
import React, { useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { AuthContext } from "../context/AuthContext";
import BACKEND_URL from "../config";
import { motion } from "framer-motion";

export default function SecretRose({ onClose, roomId }) {
  const { user } = useContext(AuthContext);
  const socketRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const fileInputRef = useRef(null);
  const msgIdsRef = useRef(new Set()); // dedupe

  useEffect(() => {
    if (!roomId) return;

  // allow polling fallback and enable diagnostics
  const socket = io(BACKEND_URL, {
    transports: ["websocket", "polling"],
    autoConnect: true,
  });
  socketRef.current = socket;

  // debug logs
  socket.on("connect", () => {
    console.log("Socket connected", socket.id);
    // emit join only when connected, with an ACK callback
    socket.emit("join-room", { room: roomId, name: user?.name || "Player" }, (res) => {
      if (!res) {
        console.warn("No ack received for join-room");
        return;
      }
      if (!res.ok) {
        console.warn("Join failed (ack):", res.error);
        alert("Failed to join room: " + (res.error || "unknown"));
        return;
      }
      // optional: you can process res.data (joined payload)
      console.log("Join succeeded:", res.data);
    });
  });

  socket.on("connect_error", (err) => {
    console.error("Socket connect_error:", err);
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
  });

    // initial chat history
    socket.on("chat-history", (history = []) => {
      // dedupe and set
      const filtered = history.filter((m) => {
        if (!m || !m.id) return false;
        if (msgIdsRef.current.has(m.id)) return false;
        msgIdsRef.current.add(m.id);
        return true;
      });
      setMessages(filtered);
    });

    // incoming messages from *other* clients
    socket.on("chat-message", (msg) => {
      if (!msg || !msg.id) return;
      if (msgIdsRef.current.has(msg.id)) return;
      msgIdsRef.current.add(msg.id);
      setMessages((prev) => [...prev, msg]);
    });

    // ack for messages sent by this socket
    socket.on("chat-message-ack", (msg) => {
      if (!msg || !msg.id) return;
      if (msgIdsRef.current.has(msg.id)) return;
      msgIdsRef.current.add(msg.id);
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("joined", (payload) => {
      { console.log("joined event", payload); }
    });

    // errors
    socket.on("error", (err) => {
      console.warn("socket error:", err);
    });

    return () => {
      try {
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit("leave-room", { room: roomId });
        }
      } catch (e) {}
      try {
        socketRef.current?.disconnect();
      } catch (e) {}
      socketRef.current = null;
      msgIdsRef.current.clear();
    };
  }, [roomId, user?.name]);

  function sendMessage(text, mediaUrl = null) {
    if (!socketRef.current || !socketRef.current.connected) {
      alert("Not connected to room.");
      return;
    }
    if (!text && !mediaUrl) return;

    const payload = { sender: user?.name || "You", text: text || null, mediaUrl: mediaUrl || null };
    socketRef.current.emit("chat-message", payload);
    setInput("");
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    try {
      // upload to backend route: /api/upload
      const res = await fetch(`${BACKEND_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      // the backend responds { url: ... }
      if (data?.url) {
        sendMessage("", data.url);
      } else {
        throw new Error("No url returned");
      }
    } catch (err) {
      console.error("upload error", err);
      alert("Upload failed");
    }
  }

  function formatTime(ts) {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString();
    } catch {
      return "";
    }
  }

  // if no roomId or not in a multiplayer session, show hint
  if (!roomId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-900 via-purple-900 to-black flex items-center justify-center">
        <div className="bg-card p-6 rounded-2xl text-center">
          <div className="text-lg font-semibold mb-2">Secret Garden — Chat</div>
          <div className="text-sm text-muted">This chat opens only when you're connected to an online room.</div>
          <button onClick={onClose} className="mt-4 btn-primary px-4 py-2 rounded-lg">Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-900 via-purple-900 to-black flex flex-col">
      <div className="p-4 bg-black/40 flex justify-between items-center">
        <h2 className="text-xl font-bold text-rose-300">Secret Garden Chat — {roomId}</h2>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="px-3 py-1 bg-rose-500 text-white rounded-lg">Back to Game</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`max-w-xs px-3 py-2 rounded-lg ${m.sender === user?.name ? "bg-rose-600 text-white ml-auto" : "bg-gray-800 text-gray-200"}`}
          >
            <div className="text-xs opacity-70 flex items-center justify-between">
              <span>{m.sender}</span>
              <span className="ml-2 text-[10px] opacity-60">{formatTime(m.createdAt)}</span>
            </div>
            {m.text && <div className="mt-1 break-words">{m.text}</div>}
            {m.mediaUrl && (
              <div className="mt-2">
                {/\.(jpg|jpeg|png|gif|webp)$/i.test(m.mediaUrl) ? (
                  <img src={m.mediaUrl} alt="media" className="rounded-lg max-h-64 object-contain" />
                ) : /\.(mp4|webm)$/i.test(m.mediaUrl) ? (
                  <video controls className="rounded-lg max-h-64 w-full">
                    <source src={m.mediaUrl} />
                  </video>
                ) : (
                  <a href={m.mediaUrl} target="_blank" rel="noreferrer" className="underline">Open file</a>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="p-4 bg-black/50 flex gap-2 items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          placeholder="Type a message... 💌"
          className="flex-1 px-3 py-2 rounded-lg bg-gray-900 text-white border border-gray-700 focus:outline-none"
        />
        <button onClick={() => sendMessage(input)} className="px-3 py-2 bg-rose-500 text-white rounded-lg">Send</button>
        <button onClick={() => fileInputRef.current.click()} className="px-3 py-2 bg-purple-500 text-white rounded-lg">📎</button>
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
      </div>
    </div>
  );
}
