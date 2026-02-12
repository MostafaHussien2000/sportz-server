import express from "express";
import http from "http";
import { createMatchRouter } from "./routes/matches.js";
import { attachWebSocketServer } from "./ws/server.js";

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";

const app = express();

const server = http.createServer(app);

// Attach WebSocket server to the HTTP server
const { broadcastMatchCreated } = attachWebSocketServer(server);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello world!");
});

// Pass dependencies to the router
app.use("/matches", createMatchRouter({ broadcastMatchCreated }));

server.listen(PORT, HOST, () => {
  const baseUrl =
    HOST === "0.0.0.0" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;

  console.log(`Server is running on ${baseUrl}`);
  console.log(`WebSockets is running on ${baseUrl.replace("http", "ws")}/ws`);
});
