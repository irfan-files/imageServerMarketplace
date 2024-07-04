const fs = require("fs");
const path = require("path");
const downloadDir = path.join(__dirname, "..", "downloads");

const notifyClients = (wss) => {
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
};

module.exports = { notifyClients };
