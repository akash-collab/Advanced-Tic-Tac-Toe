// src/context/AuthContext.jsx
import { createContext, useState, useEffect } from "react";
import api from "../services/api";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        if (parsed?.token) {
          api.defaults.headers.common["Authorization"] = `Bearer ${parsed.token}`;
        }
      } catch (e) {
        console.warn("Failed to parse stored user:", e);
        localStorage.removeItem("user");
      }
    }
  }, []);

  const persistUser = (userObj) => {
    setUser(userObj);
    if (userObj && userObj.token) {
      localStorage.setItem("user", JSON.stringify(userObj));
      api.defaults.headers.common["Authorization"] = `Bearer ${userObj.token}`;
    } else {
      localStorage.removeItem("user");
      delete api.defaults.headers.common["Authorization"];
    }
  };

  const login = async (email, password) => {
    try {
      const res = await api.post("/auth/login", { email, password });
      const userObj = res.data;
      persistUser(userObj);
      return { ok: true, data: userObj };
    } catch (err) {
      console.error("login error:", err?.response?.data || err.message || err);
      const message = err?.response?.data?.message || err?.message || "Login failed";
      return { ok: false, message };
    }
  };

  const register = async (name, email, password) => {
    try {
      const res = await api.post("/auth/register", { name, email, password });
      const userObj = res.data;
      persistUser(userObj);
      return { ok: true, data: userObj };
    } catch (err) {
      console.error("register error:", err?.response?.data || err.message || err);
      const message = err?.response?.data?.message || err?.message || "Registration failed";
      return { ok: false, message };
    }
  };

  const logout = () => {
    persistUser(null);
  };

  
  function updateUser(partialOrFullUser) {
    if (!partialOrFullUser) {
      persistUser(null);
      return;
    }

    const merged =
      partialOrFullUser && partialOrFullUser.token
        ? partialOrFullUser
        : { ...(user || {}), ...partialOrFullUser };

    persistUser(merged);
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
