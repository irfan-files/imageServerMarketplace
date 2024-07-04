const fs = require("fs");
const path = require("path");

const ensureDirectoryExistence = (filePath) => {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  fs.mkdirSync(dirname, { recursive: true });
  return true;
};

const getNumberOfFiles = (dirPath) => {
  return fs
    .readdirSync(dirPath)
    .filter((file) => fs.statSync(path.join(dirPath, file)).isFile()).length;
};

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

module.exports = {
  ensureDirectoryExistence,
  getNumberOfFiles,
  moveFilesToSubfolder,
  manageDirectoryPartitioning,
  getAllFiles,
  getUniqueFileName,
};
