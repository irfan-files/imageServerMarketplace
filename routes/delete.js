const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const downloadDir = path.join(__dirname, "../downloads");
const selectedImageDir = path.join(__dirname, "../downloadSelectedImage");
const uploadDir = path.join(__dirname, "../uploads");

router.delete("/delete/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(downloadDir, filename);

  if (fs.existsSync(filePath)) {
    fs.unlink(filePath, (err) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Error deleting file", error: err.message });
      }
      res.status(200).json({ message: "File deleted successfully" });
    });
  } else {
    res.status(404).json({ message: "File not found" });
  }
});

router.delete("/deleteupload", (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      ç;
      return res
        .status(500)
        .json({ message: "Unable to scan directory", error: err.message });
    }

    if (files.length === 0) {
      return res.status(200).json({ message: "No files to delete" });
    }

    files.forEach((file) => {
      const filePath = path.join(uploadDir, file);
      fs.unlink(filePath, (err) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Error deleting file", error: err.message });
        }
      });
    });

    res.status(200).json({ message: "All files deleted successfully" });
  });
});

router.delete("/delete-all", (req, res) => {
  fs.readdir(downloadDir, (err, files) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Unable to scan directory", error: err.message });
    }

    if (files.length === 0) {
      return res.status(200).json({ message: "No files to delete" });
    }

    files.forEach((file) => {
      const filePath = path.join(downloadDir, file);
      fs.unlink(filePath, (err) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Error deleting file", error: err.message });
        }
      });
    });

    res.status(200).json({ message: "All files deleted successfully" });
  });
});

const deleteFolderRecursive = (directoryPath) => {
  if (fs.existsSync(directoryPath)) {
    fs.readdirSync(directoryPath).forEach((file) => {
      const curPath = path.join(directoryPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // Recursively delete the contents of the subdirectory
        deleteFolderRecursive(curPath);
      } else {
        // Delete file
        fs.unlinkSync(curPath);
      }
    });
    // Delete now empty directory
    fs.rmdirSync(directoryPath);
  }
};

router.delete("/delete-all-selected-images", (req, res) => {
  try {
    deleteFolderRecursive(selectedImageDir);
    res
      .status(200)
      .json({ message: "All files and subfolders deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting files and subfolders",
      error: error.message,
    });
  }
});

module.exports = router;
