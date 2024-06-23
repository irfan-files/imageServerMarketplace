// const express = require("express");
// const axios = require("axios");
// const fs = require("fs");
// const path = require("path");
// const cors = require("cors");

// const app = express();
// const port = 3001;

// app.use(express.json());
// app.use(cors());

// app.post("/download", async (req, res) => {
//   const { url, filename } = req.body;

//   try {
//     const response = await axios.get(url, { responseType: "stream" });
//     const filePath = path.join(__dirname, "downloads", filename);

//     if (!fs.existsSync(path.dirname(filePath))) {
//       fs.mkdirSync(path.dirname(filePath), { recursive: true });
//     }

//     const writer = fs.createWriteStream(filePath);
//     response.data.pipe(writer);

//     writer.on("finish", () => {
//       res
//         .status(200)
//         .json({ message: "File downloaded successfully", filePath });
//     });
//     writer.on("error", (err) => {
//       res
//         .status(500)
//         .json({ message: "Error downloading file", error: err.message });
//     });
//   } catch (error) {
//     res
//       .status(500)
//       .json({ message: "Error fetching file", error: error.message });
//   }
// });

// app.post("/downloadSelectedImage", async (req, res) => {
//   const { url, filename } = req.body;

//   try {
//     const response = await axios.get(url, { responseType: "stream" });
//     const filePath = path.join(__dirname, "downloadSelectedImage", filename);

//     if (!fs.existsSync(path.dirname(filePath))) {
//       fs.mkdirSync(path.dirname(filePath), { recursive: true });
//     }

//     const writer = fs.createWriteStream(filePath);
//     response.data.pipe(writer);

//     writer.on("finish", () => {
//       res
//         .status(200)
//         .json({ message: "File downloaded successfully", filePath });
//     });
//     writer.on("error", (err) => {
//       res
//         .status(500)
//         .json({ message: "Error downloading file", error: err.message });
//     });
//   } catch (error) {
//     res
//       .status(500)
//       .json({ message: "Error fetching file", error: error.message });
//   }
// });

// app.listen(port, () => {
//   console.log(`Server running at http://localhost:${port}`);
// });

//

const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const port = 3001;

app.use(express.json());
app.use(cors());

// Helper function to create directories if they don't exist
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

// New GET endpoint to serve individual files
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

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
