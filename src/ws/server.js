import { WebSocket, WebSocketServer } from "ws";
import { wsArcjet } from "../arcjet.js";

const matchSubscribers = new Map();

function subscribe(matchId, socket) {
  if (!matchSubscribers.has(matchId)) {
    matchSubscribers.set(matchId, new Set());
  }

  matchSubscribers.get(matchId).add(socket);
}

function unsubscribe(matchId, socket) {
  const subscribers = matchSubscribers.get(matchId);

  if (!subscribers) return;

  subscribers.delete(socket);

  if (subscribers.size === 0) matchSubscribers.delete(matchId);
}

function cleanupSubscriptions(socket) {
  for (const matchId of socket.subscribtions) {
    unsubscribe(matchId, socket);
  }
}

function broadcastToMatch(matchId, payload) {
  const subscribers = matchSubscribers.get(matchId);

  if (!subscribers || subscribers.size === 0) return;

  const message = JSON.stringify(payload);

  for (const socket of subscribers) {
    if (socket.readyState === WebSocket.OPEN) socket.send(message);
  }
}

function handleMessage(socket, data) {
  let message;

  try {
    message = JSON.parse(data.toString());
  } catch (err) {
    sendJSON(socket, {
      type: "error",
      data: { message: "Invalid JSON data." },
    });
    return;
  }

  if (message.type === "subscribe" && Number.isInteger(message.data.matchId)) {
    subscribe(message.data.matchId, socket);
    socket.subscribtions.add(message.data.matchId);
    sendJSON(socket, {
      type: "subscribed",
      data: { matchId: message.data.matchId },
    });
    return;
  }

  if (
    message.type === "unsubscribe" &&
    Number.isInteger(message.data.matchId)
  ) {
    unsubscribe(message.data.matchId, socket);
    socket.subscribtions.delete(message.data.matchId);
    sendJSON(socket, {
      type: "unsubscribed",
      data: { matchId: message.data.matchId },
    });
    return;
  }
}

function sendJSON(socket, payload) {
  if (socket.readyState !== WebSocket.OPEN) return;

  socket.send(JSON.stringify(payload));
}

function broadcastToAll(wss, payload) {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;

    client.send(JSON.stringify(payload));
  }
}

export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024,
  });

  wss.on("connection", async (socket, req) => {
    if (wsArcjet) {
      try {
        const decision = await wsArcjet.protect(req);

        if (decision.isDenied()) {
          const code = decision.reason.isRateLimit ? 1013 : 1008;
          const reason = decision.reason.isRateLimit
            ? "Rate limit exceeded."
            : "Access denied.";
          return socket.close(code, reason);
        }
      } catch (err) {
        console.error("WS connection error: ", err);
        socket.close(1011, "Internal server security error.");
        return;
      }
    }
    sendJSON(socket, { type: "welcome" });

    socket.isAlive = true;

    socket.subscribtions = new Set();

    socket.on("message", (data) => handleMessage(socket, data));

    socket.on("error", (err) => {
      console.error("WS connection error: ", err);
      socket.terminate();
    });

    socket.on("close", () => cleanupSubscriptions(socket));

    socket.on("pong", () => {
      socket.isAlive = true;
    });
  });

  const heartbeatInterval = setInterval(() => {
    for (const client of wss.clients) {
      if (client.isAlive === false) {
        client.terminate();
        continue;
      }
      client.isAlive = false;
      client.ping();
    }
  }, 30000);

  wss.on("close", () => clearInterval(heartbeatInterval));

  function broadcastMatchCreated(match) {
    broadcastToAll(wss, { type: "match_created", data: match });
  }

  function broadcastCommentaryCreated(matchId, commentary) {
    broadcastToMatch(matchId, { type: "commentary_created", data: commentary });
  }

  return { broadcastMatchCreated, broadcastCommentaryCreated };
}
