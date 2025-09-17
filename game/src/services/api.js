// src/services/api.js
import axios from "axios";

function buildBaseURL() {
  // Accept either VITE_BACKEND_URL set to "http://host:5050" or "http://host:5050/api"
  const env = import.meta.env.VITE_BACKEND_URL;
  if (!env) return "http://localhost:5050/api";
  // If user provided a URL without /api, append it
  try {
    const url = new URL(env);
    // keep path if already contains "/api"
    if (url.pathname && url.pathname.includes("/api")) return env.replace(/\/+$/, "");
    return env.replace(/\/+$/, "") + "/api";
  } catch {
    // fallback if env is not a full URL
    return env;
  }
}

const api = axios.create({
  baseURL: buildBaseURL(),
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach token from localStorage if available (keeps in sync across tabs if they update localStorage)
function attachAuthHeader() {
  const stored = localStorage.getItem("user");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed?.token) {
        api.defaults.headers.common["Authorization"] = `Bearer ${parsed.token}`;
        return;
      }
    } catch (e) {
      // ignore parse errors
    }
  }
  delete api.defaults.headers.common["Authorization"];
}
attachAuthHeader();

// Also listen for storage events (other tabs) to keep header in sync
if (typeof window !== "undefined" && window.addEventListener) {
  window.addEventListener("storage", (e) => {
    if (e.key === "user") attachAuthHeader();
  });
}

// Optional: response interceptor to normalize errors
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Normalize the error shape: { message, status, data }
    const payload = {
      message:
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Request failed",
      status: err?.response?.status,
      data: err?.response?.data,
    };
    return Promise.reject(payload);
  }
);

export default api;
