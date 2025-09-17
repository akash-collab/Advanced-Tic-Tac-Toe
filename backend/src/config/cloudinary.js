// src/config/cloudinary.js
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.warn(
    "⚠️  CLOUDINARY env vars not set. Image/video uploads will fail. " +
      "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in your .env"
  );
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const folder = "tic-tac-rose";
    const mimetype = (file && file.mimetype) || "";
    const isVideo = mimetype.startsWith("video/");
    
    const resource_type = isVideo ? "video" : "image";
    
    return {
      folder,
      resource_type,
      allowed_formats: ["jpg", "jpeg", "png", "gif", "webp", "mp4", "webm"],
    };
  },
});

const upload = multer({ storage });

module.exports = { cloudinary, upload };
