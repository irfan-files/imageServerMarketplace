const express = require("express");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors()); // Ensure CORS is enabled

const downloadRouter = require("./routes/download");
const uploadRouter = require("./routes/upload");
const deleteRouter = require("./routes/delete");

app.use("/", downloadRouter);
app.use("/", uploadRouter);
app.use("/", deleteRouter);

module.exports = app;
