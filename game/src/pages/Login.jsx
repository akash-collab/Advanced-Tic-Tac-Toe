import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function Login() {
  const { login, register } = useContext(AuthContext);
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!form.email || !form.password || (isRegister && !form.name)) {
      setMessage({ type: "error", text: "Please fill all required fields." });
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        const res = await register(form.name, form.email, form.password);
        if (!res.ok) {
          setMessage({ type: "error", text: res.message || "Registration failed" });
        } else {
          setMessage({ type: "success", text: "Registered successfully — redirecting..." });
          setTimeout(() => window.location.reload(), 700);
        }
      } else {
        const res = await login(form.email, form.password);
        if (!res.ok) {
          setMessage({ type: "error", text: res.message || "Login failed" });
        } else {
          setMessage({ type: "success", text: "Logged in — redirecting..." });
          setTimeout(() => window.location.reload(), 700);
        }
      }
    } catch (err) {
      console.error("auth submission error:", err);
      setMessage({ type: "error", text: "Unexpected error. Check console." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-4">

      <form
        onSubmit={handleSubmit}
        className="bg-card p-6 rounded-lg shadow-soft w-full max-w-sm space-y-4"
        aria-live="polite"
      >
        <h2 className="text-xl font-bold text-center">{isRegister ? "Register" : "Login"}</h2>

        {message && (
          <div
            role="status"
            className={message.type === "error" ? "text-red-600 text-sm" : "text-green-600 text-sm"}
          >
            {message.text}
          </div>
        )}

        {isRegister && (
          <input
            type="text"
            placeholder="Name"
            className="w-full border border-transparent bg-transparent p-2 rounded text-white placeholder:text-slate-500"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            disabled={loading}
            required
          />
        )}

        <input
          type="email"
          placeholder="Email"
          className="w-full border p-2 rounded"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          disabled={loading}
          required
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border p-2 rounded"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          disabled={loading}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 rounded text-white ${loading ? "bg-rose-300" : "bg-rose-500 hover:bg-rose-600"}`}
        >
          {loading ? (isRegister ? "Registering..." : "Logging in...") : isRegister ? "Register" : "Login"}
        </button>

        <p className="text-sm text-center">
          {isRegister ? "Already have an account?" : "New user?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setMessage(null);
            }}
            className={`w-full py-2 rounded text-white ${loading ? "bg-rose-300" : "btn-primary"}`}
            disabled={loading}
          >
            {isRegister ? "Login" : "Register"}
          </button>
        </p>
      </form>
    </div>
  );
}
