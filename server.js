const http = require("http");
const app = require("./app");
const { setupWebSocket } = require("./routes/websocket");

const port = 3001;
const server = http.createServer(app);
const wss = setupWebSocket(server);

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
