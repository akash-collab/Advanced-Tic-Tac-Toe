const express = require("express");
const { upload } = require("../config/cloudinary");

const router = express.Router();

router.post("/", upload.single("file"), (req, res) => {
  if (!req.file || !req.file.path) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  res.json({ url: req.file.path });
});

module.exports = router;
