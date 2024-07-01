const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());

// Set up storage engine for multer
const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });

// Handle multiple image uploads
app.post("/upload", upload.array("images", 10), (req, res) => {
  if (!req.files) {
    return res.status(400).send("No files uploaded.");
  }
  res.send(
    req.files.map((file) => ({
      fileName: file.filename,
      filePath: `/uploads/${file.filename}`,
    }))
  );
});

// Serve static files from the uploads directory
app.use("/uploads", express.static("uploads"));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
