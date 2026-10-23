import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { WebSocket } from "ws";
import { createServer } from "../server.js";

function client(url) {
  const ws = new WebSocket(url),
    queue = [],
    waiters = [];
  ws.on("message", (raw) => {
    const data = JSON.parse(raw.toString());
    const i = waiters.findIndex((w) => w.predicate(data));
    if (i >= 0) {
      const w = waiters.splice(i, 1)[0];
      clearTimeout(w.timer);
      w.resolve(data);
    } else queue.push(data);
  });
  const next = (predicate) => {
    const i = queue.findIndex(predicate);
    if (i >= 0) return Promise.resolve(queue.splice(i, 1)[0]);
    return new Promise((resolve, reject) => {
      const w = {
        predicate,
        resolve,
        timer: setTimeout(
          () => reject(new Error("WebSocket message timeout")),
          4000,
        ),
      };
      waiters.push(w);
    });
  };
  return {
    ws,
    next,
    send: (m) => ws.send(JSON.stringify(m)),
    ready: once(ws, "open"),
  };
}
test("HTTP serves app; WebSocket rooms synchronize, authorize and reconnect", async (t) => {
  const { server, wss } = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => {
    for (const c of wss.clients) c.terminate();
    server.close();
  });
  const port = server.address().port,
    url = `ws://127.0.0.1:${port}/play`;
  const page = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /HEXA CROWN/);
  const health = await fetch(`http://127.0.0.1:${port}/healthz`);
  assert.equal((await health.json()).ok, true);
  const a = client(url),
    b = client(url),
    c = client(url);
  await Promise.all([a.ready, b.ready, c.ready]);
  a.send({ type: "create" });
  const seat = await a.next((m) => m.type === "seat");
  assert.match(seat.code, /^[A-F0-9]{6}$/);
  await a.next((m) => m.type === "state");
  a.send({ type: "action", action: { type: "end" } });
  assert.match((await a.next((m) => m.type === "error")).message, /접속/);
  b.send({ type: "join", code: seat.code });
  const redSeat = await b.next((m) => m.type === "seat");
  assert.equal(redSeat.side, "red");
  await b.next((m) => m.type === "state");
  await a.next((m) => m.type === "state" && m.connected.red);
  b.send({ type: "action", action: { type: "end" } });
  assert.match((await b.next((m) => m.type === "error")).message, /차례/);
  c.send({ type: "join", code: seat.code });
  assert.match((await c.next((m) => m.type === "error")).message, /두 명/);
  a.send({
    type: "action",
    action: { type: "move", from: "-2,0", to: "-1,0" },
  });
  const sa = await a.next(
      (m) => m.type === "state" && m.action?.type === "move",
    ),
    sb = await b.next((m) => m.type === "state" && m.action?.type === "move");
  assert.deepEqual(sa.state, sb.state);
  assert.equal(
    sa.state.tiles.find((t) => t.q === -1 && t.r === 0).owner,
    "blue",
  );
  a.send({ type: "action", action: { type: "end" } });
  assert.equal(
    (await b.next((m) => m.type === "state" && m.state.current === "red")).state
      .current,
    "red",
  );
  b.ws.close();
  await once(b.ws, "close");
  await a.next((m) => m.type === "state" && !m.connected.red);
  c.send({ type: "resume", code: seat.code, token: "wrong" });
  assert.equal((await c.next((m) => m.type === "error")).resumeFailed, true);
  c.send({ type: "resume", code: seat.code, token: redSeat.token });
  assert.equal((await c.next((m) => m.type === "seat")).side, "red");
  const resumed = await c.next((m) => m.type === "state");
  assert.equal(resumed.state.current, "red");
  assert.equal(
    resumed.state.tiles.find((t) => t.q === -1 && t.r === 0).owner,
    "blue",
  );
  c.send({ type: "action", action: { type: "end" } });
  const after = await c.next((m) => m.type === "state" && m.state.turn === 2);
  assert.equal(after.state.current, "blue");
});
