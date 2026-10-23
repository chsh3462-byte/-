import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import "../scripts/build-standalone.js";

const html = await readFile(new URL("../dist/HEXA-CROWN.html", import.meta.url), "utf8");
assert.ok(!/<script[^>]+(?:src=|type="module")/.test(html));
assert.ok(!/<link[^>]+rel="stylesheet"/.test(html));
assert.ok(html.includes("data-standalone"));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const context = await browser.newContext({ offline: true, viewport: { width: 1365, height: 950 } });
  const page = await context.newPage();
  const errors = [], requests = [], sockets = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => requests.push(request.url()));
  page.on("websocket", socket => sockets.push(socket.url()));
  // The opaque document exercises the same no-server/no-import requirements
  // without relying on file:// navigation, which the managed browser blocks.
  await page.evaluate(() => {
    for (const storage of ["localStorage", "sessionStorage"])
      Object.defineProperty(window, storage, { configurable: true, get() { throw new DOMException("Storage denied", "SecurityError"); } });
  });
  await page.setContent(html, { waitUntil: "load" });
  assert.equal(await page.locator("[data-tile]").count(), 37);
  assert.match(await page.locator("#saveStatus").textContent(), /이번 창/);
  await page.locator('[data-tile="-1,0"]').click();
  assert.match(await page.locator("#boardCaption").textContent(), /이동 완료/);
  await page.locator('[data-command="build"]').click();
  assert.match(await page.locator("#logs").textContent(), /전초기지 건설/);
  await page.locator('[data-recruit="infantry"]').click();
  assert.equal(await page.locator(".unit-name h2").textContent(), "보병 연대");
  await page.locator("#endTurn").click();
  await page.waitForFunction(() => document.querySelector(".turn-number strong").textContent === "02", {}, { timeout: 20000 });
  assert.equal(await page.locator("#endTurn").isEnabled(), true);
  console.log("PASS standalone: starts offline with blocked storage; capture, building, recruitment and AI turn work");
  await page.locator("#onlineButton").click();
  assert.equal(await page.locator("#localMatch").isVisible(), true);
  assert.equal(await page.locator("#createRoom").count(), 0);
  await page.locator("#localMatch").click();
  await page.locator("#endTurn").click();
  assert.match(await page.locator("#commander").textContent(), /붉은 독수리 군단/);
  assert.equal(await page.locator("#endTurn").isEnabled(), true);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  assert.deepEqual(requests.filter(url => !url.startsWith("data:")), []);
  assert.deepEqual(sockets, []);
  console.log("PASS standalone: local multiplayer, mobile layout, no external requests, no WebSockets, no JavaScript errors");
} finally {
  await browser.close();
}
