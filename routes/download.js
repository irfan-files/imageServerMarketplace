const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

const router = express.Router();
const downloadDir = path.join(__dirname, "../downloads");
const baseDir = path.join(__dirname, "../downloadSelectedImage");

const ensureDirectoryExistence = (filePath) => {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  fs.mkdirSync(dirname, { recursive: true });
  return true;
};

const manageDirectoryPartitioning = (baseDir, maxFiles) => {
  let part = 1;
  while (true) {
    const currentDir = path.join(baseDir, `part${part}`);
    if (!fs.existsSync(currentDir)) {
      fs.mkdirSync(currentDir);
      return currentDir;
    }
    const fileCount = fs
      .readdirSync(currentDir)
      .filter((file) =>
        fs.statSync(path.join(currentDir, file)).isFile()
      ).length;
    if (fileCount < maxFiles) {
      return currentDir;
    }
    part += 1;
  }
};

const getAllFiles = async (dirPath, fileList = []) => {
  const files = await fs.promises.readdir(dirPath);
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = await fs.promises.stat(filePath);
    if (stats.isDirectory()) {
      await getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
};

router.post("/download", async (req, res) => {
  const { url, filename } = req.body;

  try {
    const response = await axios.get(url, { responseType: "stream" });
    const filePath = path.join(downloadDir, filename);

    ensureDirectoryExistence(filePath);

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    writer.on("finish", () => {
      res
        .status(200)
        .json({ message: "File downloaded successfully", filePath });
    });
    writer.on("error", (err) => {
      res
        .status(500)
        .json({ message: "Error downloading file", error: err.message });
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching file", error: error.message });
  }
});

router.get("/downloads", (req, res) => {
  try {
    if (!fs.existsSync(downloadDir)) {
      return res.status(200).json({ files: [] });
    }

    const files = fs
      .readdirSync(downloadDir)
      .filter(
        (file) =>
          fs.statSync(path.join(downloadDir, file)).isFile() &&
          file !== ".DS_Store"
      );

    res.status(200).json({ files });
  } catch (error) {
    res.status(500).json({
      message: "Error reading downloads directory",
      error: error.message,
    });
  }
});

router.get("/downloads/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(downloadDir, filename);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: "File not found" });
  }
});

router.post("/downloadSelectedImage", async (req, res) => {
  const { url, filename } = req.body;
  const maxFiles = 50;

  try {
    // Ensure base directory exists
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    const targetDir = manageDirectoryPartitioning(baseDir, maxFiles);
    const filePath = path.join(targetDir, filename);

    const response = await axios.get(url, { responseType: "stream" });

    ensureDirectoryExistence(filePath);

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    writer.on("finish", () => {
      res
        .status(200)
        .json({ message: "File downloaded successfully", filePath });
    });
    writer.on("error", (err) => {
      res
        .status(500)
        .json({ message: "Error downloading file", error: err.message });
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching file", error: error.message });
  }
});

router.get("/downloadAllImages", async (req, res) => {
  const zipFilePath = path.join(__dirname, "../allImages.zip");

  try {
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      console.log(archive.pointer() + " total bytes");
      console.log("File ZIP berhasil dibuat");
      res.download(zipFilePath, "allImages.zip", (err) => {
        if (err) {
          res
            .status(500)
            .json({ message: "Gagal mengunduh ZIP", error: err.message });
        }
        fs.unlinkSync(zipFilePath);
      });
    });

    archive.pipe(output);

    const files = await getAllFiles(baseDir);
    files.forEach((file) => {
      const relativePath = path.relative(baseDir, file);
      archive.file(file, { name: relativePath });
    });

    const subDirs = await fs.promises.readdir(baseDir);
    subDirs.forEach((subDir) => {
      const dirPath = path.join(baseDir, subDir);
      if (!files.some((file) => file.startsWith(dirPath))) {
        archive.append("", { name: path.relative(baseDir, dirPath) + "/" });
      }
    });

    await archive.finalize();
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error saat membuat ZIP", error: error.message });
  }
});

module.exports = router;
