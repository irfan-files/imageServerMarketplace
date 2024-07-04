const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const router = express.Router();
const uploadDir = path.join(__dirname, "../uploads");

const getUniqueFileName = (directory, originalName) => {
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext);
  let uniqueName = originalName;
  let counter = 1;

  while (fs.existsSync(path.join(directory, uniqueName))) {
    uniqueName = `${baseName}-${counter}${ext}`;
    counter++;
  }

  return uniqueName;
};

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const uniqueFileName = getUniqueFileName(uploadDir, file.originalname);
    cb(null, uniqueFileName);
  },
});

const upload = multer({ storage: storage });

router.post("/upload", upload.array("images", 1000), (req, res) => {
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

router.get("/uploads", (req, res) => {
  try {
    if (!fs.existsSync(uploadDir)) {
      return res.status(200).json({ files: [] });
    }

    const files = fs
      .readdirSync(uploadDir)
      .filter(
        (file) =>
          fs.statSync(path.join(uploadDir, file)).isFile() &&
          file !== ".DS_Store"
      );

    res.status(200).json({ files });
  } catch (error) {
    res.status(500).json({
      message: "Error reading uploads directory",
      error: error.message,
    });
  }
});

router.get("/uploads/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(uploadDir, filename);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: "File not found" });
  }
});

router.use("/uploads", express.static(uploadDir));

module.exports = router;
