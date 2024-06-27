const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const archiver = require("archiver");
const WebSocket = require("ws");
const http = require("http");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const downloadDir = path.join(__dirname, "downloads");
const baseDir = path.join(__dirname, "downloadSelectedImage");

const port = 3001;

wss.on("connection", (ws) => {
  console.log("Client connected");
  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

app.use(express.json());
app.use(cors());

// Ensure directory existence
const ensureDirectoryExistence = (filePath) => {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  fs.mkdirSync(dirname, { recursive: true });
  return true;
};

// Helper function to get the number of files in a directory
const getNumberOfFiles = (dirPath) => {
  return fs
    .readdirSync(dirPath)
    .filter((file) => fs.statSync(path.join(dirPath, file)).isFile()).length;
};

// Helper function to move files to a subfolder
const moveFilesToSubfolder = (dirPath, subfolderName) => {
  const subfolderPath = path.join(dirPath, subfolderName);
  if (!fs.existsSync(subfolderPath)) {
    fs.mkdirSync(subfolderPath);
  }
  fs.readdirSync(dirPath).forEach((file) => {
    const currentPath = path.join(dirPath, file);
    if (fs.statSync(currentPath).isFile()) {
      const newPath = path.join(subfolderPath, file);
      fs.renameSync(currentPath, newPath);
    }
  });
};

// Helper function to manage directory partitioning
const manageDirectoryPartitioning = (baseDir, maxFiles) => {
  let part = 1;
  while (true) {
    const currentDir = path.join(baseDir, `part${part}`);
    if (!fs.existsSync(currentDir)) {
      fs.mkdirSync(currentDir);
      return currentDir;
    }
    const fileCount = getNumberOfFiles(currentDir);
    if (fileCount < maxFiles) {
      return currentDir;
    }
    part += 1;
  }
};

async function getAllFiles(dirPath, fileList = []) {
  const files = await fs.promises.readdir(dirPath);
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = await fs.promises.stat(filePath);
    if (stats.isDirectory()) {
      await getAllFiles(filePath, fileList); // Rekursif untuk subfolder
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
}

app.post("/download", async (req, res) => {
  const { url, filename } = req.body;

  try {
    const response = await axios.get(url, { responseType: "stream" });
    const filePath = path.join(__dirname, "downloads", filename);

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

app.get("/downloads", (req, res) => {
  const downloadsDir = path.join(__dirname, "downloads");

  try {
    if (!fs.existsSync(downloadsDir)) {
      return res.status(200).json({ files: [] });
    }

    const files = fs
      .readdirSync(downloadsDir)
      .filter(
        (file) =>
          fs.statSync(path.join(downloadsDir, file)).isFile() &&
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

app.get("/downloads/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, "downloads", filename);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: "File not found" });
  }
});

app.post("/downloadSelectedImage", async (req, res) => {
  const { url, filename } = req.body;
  const baseDir = path.join(__dirname, "downloadSelectedImage");
  const maxFiles = 50;

  try {
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

app.get("/downloadAllImages", async (req, res) => {
  const baseDir = path.join(__dirname, "downloadSelectedImage");
  const zipFilePath = path.join(__dirname, "allImages.zip");
  const maxFiles = 50;

  try {
    // Buat file ZIP baru
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Kompresi level maksimum
    });

    // Event listener untuk menangani jika proses kompresi selesai
    output.on("close", () => {
      console.log(archive.pointer() + " total bytes");
      console.log("File ZIP berhasil dibuat");
      res.download(zipFilePath, "allImages.zip", (err) => {
        if (err) {
          res
            .status(500)
            .json({ message: "Gagal mengunduh ZIP", error: err.message });
        }
        // Hapus file ZIP setelah diunduh
        fs.unlinkSync(zipFilePath);
      });
    });

    // Pipe archive data ke output file
    archive.pipe(output);

    // Ambil semua file dari direktori dan subdirektori dan tambahkan ke dalam ZIP
    const files = await getAllFiles(baseDir);
    files.forEach((file) => {
      const relativePath = path.relative(baseDir, file); // Path relatif untuk mempertahankan struktur folder dalam ZIP
      archive.file(file, { name: relativePath });
    });

    // Jika tidak ada file, tambahkan sebuah file kosong untuk setiap subfolder yang ada
    const subDirs = await fs.promises.readdir(baseDir);
    subDirs.forEach((subDir) => {
      const dirPath = path.join(baseDir, subDir);
      if (!files.some((file) => file.startsWith(dirPath))) {
        archive.append("", { name: path.relative(baseDir, dirPath) + "/" });
      }
    });

    // Finalisasi archive (menulis data dan menutup output stream)
    await archive.finalize();
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error saat membuat ZIP", error: error.message });
  }
});

app.get("/downloadAllImages", async (req, res) => {
  const baseDir = path.join(__dirname, "downloadSelectedImage");
  const zipFilePath = path.join(__dirname, "allImages.zip");
  const maxFiles = 50;

  try {
    // Buat file ZIP baru
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Kompresi level maksimum
    });

    // Event listener untuk menangani jika proses kompresi selesai
    output.on("close", () => {
      console.log(archive.pointer() + " total bytes");
      console.log("File ZIP berhasil dibuat");
      res.download(zipFilePath, "allImages.zip", (err) => {
        if (err) {
          res
            .status(500)
            .json({ message: "Gagal mengunduh ZIP", error: err.message });
        }
        // Hapus file ZIP setelah diunduh
        fs.unlinkSync(zipFilePath);
      });
    });

    // Pipe archive data ke output file
    archive.pipe(output);

    // Ambil semua file dalam direktori dan tambahkan ke dalam ZIP
    const files = await fs.promises.readdir(baseDir);
    files.forEach((file) => {
      const filePath = path.join(baseDir, file);
      archive.file(filePath, { name: file });
    });

    // Finalisasi archive (menulis data dan menutup output stream)
    await archive.finalize();
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error saat membuat ZIP", error: error.message });
  }
});

app.get("/downloads", (req, res) => {
  fs.readdir(downloadDir, (err, files) => {
    if (err) {
      return res.status(500).send("Unable to scan directory");
    }
    res.json({ files });
  });
});

app.get("/download-all", (req, res) => {
  const zip = archiver("zip", { zlib: { level: 9 } });
  res.attachment("images.zip");

  zip.on("error", (err) => {
    throw err;
  });

  zip.pipe(res);

  fs.readdir(downloadDir, (err, files) => {
    if (err) {
      return res.status(500).send("Unable to scan directory");
    }

    files.forEach((file) => {
      const filePath = path.join(downloadDir, file);
      zip.file(filePath, { name: file });
    });

    zip.finalize();
  });
});

function notifyClients() {
  fs.readdir(downloadDir, (err, files) => {
    if (err) {
      return console.error("Unable to scan directory", err);
    }
    const data = JSON.stringify({ files });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });
}

app.post("/upload", (req, res) => {
  // Simulated image upload logic
  // Save file to downloadDir, then notify clients
  notifyClients();
  res.status(200).send("Image uploaded");
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
