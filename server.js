import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";
import { createGame, act } from "./public/engine.js";

const root = path.resolve(fileURLToPath(new URL("./public/", import.meta.url)));
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
};
export function createServer() {
  const rooms = new Map();
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      if (pathname === "/healthz") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      const file = path.resolve(
        root,
        `.${pathname === "/" ? "/index.html" : pathname}`,
      );
      if (!file.startsWith(root + path.sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      const data = await readFile(file);
      res.writeHead(200, {
        "Content-Type": mime[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy":
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });
  const wss = new WebSocketServer({
    server,
    path: "/play",
    maxPayload: 4096,
    verifyClient: ({ origin, req }) => {
      try {
        return !origin || new URL(origin).host === req.headers.host;
      } catch {
        return false;
      }
    },
  });
  const send = (ws, data) => {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
  };
  const broadcast = (room, extra = {}) => {
    room.updated = Date.now();
    for (const [side, seat] of Object.entries(room.seats))
      send(seat?.ws, {
        type: "state",
        code: room.code,
        side,
        state: room.state,
        connected: {
          blue: room.seats.blue?.ws?.readyState === WebSocket.OPEN,
          red: room.seats.red?.ws?.readyState === WebSocket.OPEN,
        },
        ...extra,
      });
  };
  function leave(ws) {
    const room = rooms.get(ws.room);
    if (room && room.seats[ws.side]?.ws === ws) {
      room.seats[ws.side].ws = null;
      broadcast(room);
    }
    ws.room = null;
    ws.side = null;
  }
  wss.on("connection", (ws) => {
    ws.windowStart = Date.now();
    ws.messages = 0;
    ws.on("error", () => {});
    ws.on("message", (raw) => {
      try {
        if (Date.now() - ws.windowStart > 10000) {
          ws.windowStart = Date.now();
          ws.messages = 0;
        }
        if (++ws.messages > 100) {
          send(ws, { type: "error", message: "잠시 후 다시 시도하세요." });
          return;
        }
        const m = JSON.parse(raw.toString());
        if (!m || typeof m !== "object") return;
        if (m.type === "create") {
          if (rooms.size >= 500) {
            send(ws, {
              type: "error",
              message: "현재 새 방을 만들 수 없습니다.",
            });
            return;
          }
          leave(ws);
          let code;
          do {
            code = randomBytes(3).toString("hex").toUpperCase();
          } while (rooms.has(code));
          const token = randomUUID();
          const room = {
            code,
            state: createGame("online"),
            seats: { blue: { token, ws }, red: null },
            updated: Date.now(),
          };
          rooms.set(code, room);
          ws.room = code;
          ws.side = "blue";
          send(ws, { type: "seat", code, side: "blue", token });
          broadcast(room);
          return;
        }
        if (m.type === "join" || m.type === "resume") {
          const code = typeof m.code === "string" ? m.code.toUpperCase() : "";
          const room = rooms.get(code);
          if (!room) {
            send(ws, {
              type: "error",
              message: "방을 찾을 수 없습니다. 코드를 확인하세요.",
              resumeFailed: m.type === "resume",
            });
            return;
          }
          let side =
            m.type === "resume" && typeof m.token === "string"
              ? Object.keys(room.seats).find(
                  (p) => room.seats[p] && room.seats[p].token === m.token,
                )
              : m.type === "join" && !room.seats.red
                ? "red"
                : null;
          if (!side) {
            send(ws, {
              type: "error",
              message:
                m.type === "resume"
                  ? "저장된 접속 정보를 확인할 수 없습니다."
                  : "이미 두 명이 참여한 방입니다.",
              resumeFailed: m.type === "resume",
            });
            return;
          }
          leave(ws);
          const token = room.seats[side]?.token || randomUUID();
          const previous = room.seats[side]?.ws;
          if (previous && previous !== ws) {
            previous.room = null;
            previous.close(4000, "Session replaced");
          }
          room.seats[side] = { token, ws };
          ws.room = code;
          ws.side = side;
          send(ws, { type: "seat", code, side, token });
          broadcast(room);
          return;
        }
        if (m.type === "leave") {
          leave(ws);
          return;
        }
        if (m.type === "action") {
          const room = rooms.get(ws.room);
          if (!room || room.seats[ws.side]?.ws !== ws) {
            send(ws, { type: "error", message: "먼저 대전방에 참가하세요." });
            return;
          }
          if (
            !Object.values(room.seats).every(
              (seat) => seat?.ws?.readyState === WebSocket.OPEN,
            )
          ) {
            send(ws, {
              type: "error",
              message: "상대의 접속을 기다리고 있습니다.",
            });
            return;
          }
          if (!m.action || typeof m.action !== "object") {
            send(ws, { type: "error", message: "올바르지 않은 명령입니다." });
            return;
          }
          const result = act(room.state, m.action, ws.side);
          if (!result.ok) {
            send(ws, { type: "error", message: result.error });
            return;
          }
          broadcast(room, {
            action: m.action,
            actor: ws.side,
            selected: result.selected,
          });
        }
      } catch {
        send(ws, { type: "error", message: "요청을 처리할 수 없습니다." });
      }
    });
    ws.on("close", () => leave(ws));
  });
  const cleanup = setInterval(() => {
    for (const [code, room] of rooms)
      if (
        Date.now() - room.updated > 2 * 60 * 60 * 1000 &&
        !Object.values(room.seats).some(
          (seat) => seat?.ws?.readyState === WebSocket.OPEN,
        )
      )
        rooms.delete(code);
  }, 60000);
  cleanup.unref();
  server.on("close", () => {
    clearInterval(cleanup);
    for (const c of wss.clients) c.terminate();
    wss.close();
  });
  return { server, wss, rooms };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { server } = createServer();
  const port = Number(process.env.PORT) || 3000;
  server.listen(port, "0.0.0.0", () =>
    console.log(`HEXA CROWN server listening on port ${port}`),
  );
}
