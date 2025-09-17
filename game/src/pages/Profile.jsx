// src/pages/Profile.jsx
import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";

export default function Profile() {
  const { user, logout, updateUser } = useContext(AuthContext);
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [uploading, setUploading] = useState(false);

  if (!user) return <div>Please login first.</div>;

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      setUploading(true);
      const res = await api.put("/auth/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAvatar(res.data.avatar);

      // update AuthContext and localStorage
      const updatedUser = { ...user, avatar: res.data.avatar };
      updateUser(updatedUser);
    } catch (err) {
      alert(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app">
      <div className="bg-card p-6 rounded-lg shadow-soft w-96 text-center">
        <h2 className="text-2xl font-bold text-white">Profile</h2>

        <div className="mt-4">
          <img
            src={avatar || "https://i.pravatar.cc/150?u=" + user.email}
            alt="Avatar"
            className="w-24 h-24 rounded-full mx-auto object-cover"
          />
          <label className="block mt-3">
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
            />
            <span className="cursor-pointer px-3 py-1 text-sm bg-rose-500 text-white rounded-lg">
              {uploading ? "Uploading..." : "Change Avatar"}
            </span>
          </label>
        </div>

        <p className="mt-4 text-white">
          <b>Name:</b> {user.name}
        </p>
        <p className="text-white">
          <b>Email:</b> {user.email}
        </p>

        <button onClick={logout} className="mt-4 w-full btn-primary py-2 rounded">
          Logout
        </button>
      </div>
    </div>
  );
}
