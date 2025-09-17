const express = require("express");
const { register, login, getProfile, updateAvatar } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { upload } = require("../config/cloudinary");


const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getProfile);
router.put("/avatar", protect, upload.single("avatar"), updateAvatar);

module.exports = router;