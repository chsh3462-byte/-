import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";
import { createServer } from "../server.js";
import { createGame } from "../public/engine.js";

const { server, wss } = createServer();
server.listen(0, "127.0.0.1");
await once(server, "listening");
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
const errors = [],
  external = [];
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  let seedNumber = 123456;
  const seed = createGame("ai", () => {
    seedNumber = (Math.imul(1664525, seedNumber) + 1013904223) >>> 0;
    return seedNumber / 4294967296;
  });
  await context.addInitScript((s) => {
    if (!localStorage.getItem("hexa-crown-save"))
      localStorage.setItem("hexa-crown-save", JSON.stringify(s));
  }, seed);
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (!r.url().startsWith(base)) external.push(r.url());
  });
  await page.goto(base);
  await page.locator('[data-tile="-2,0"]').waitFor();
  assert.equal(await page.locator("[data-tile]").count(), 37);
  assert.equal(
    await page.locator(".unit-name h2").textContent(),
    "왕실 기병대",
  );
  await mkdir("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  await page.locator('[data-tile="-1,0"]').click();
  assert.match(await page.locator("#boardCaption").textContent(), /이동 완료/);
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("hexa-crown-save")).tiles.find(
          (t) => t.q === -1 && t.r === 0,
        ).owner,
    ),
    "blue",
  );
  await page.locator('[data-command="build"]').click();
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("hexa-crown-save")).tiles.find(
          (t) => t.q === -1 && t.r === 0,
        ).building,
    ),
    "outpost",
  );
  await page.locator('[data-recruit="infantry"]').click();
  assert.match(await page.locator(".unit-name h2").textContent(), /보병/);
  await page.reload();
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("hexa-crown-save")).tiles.filter(
          (t) => t.unit?.owner === "blue",
        ).length,
    ),
    3,
  );
  await page.locator("#endTurn").click();
  await page.waitForFunction(
    () => JSON.parse(localStorage.getItem("hexa-crown-save")).turn === 2,
    {},
    { timeout: 20000 },
  );
  assert.equal(await page.locator("#endTurn").isEnabled(), true);
  console.log(
    "PASS browser: selection, capture, build, recruit, reload, AI turn",
  );

  await page.locator("#guideButton").click();
  assert.equal(await page.locator("#modal").isVisible(), true);
  await page.keyboard.press("Escape");
  await page.locator("#modeButton").click();
  await page.locator('[data-mode="local"]').click();
  await page.locator("#endTurn").click();
  assert.match(
    await page.locator("#commander").textContent(),
    /붉은 독수리 군단/,
  );
  assert.equal(await page.locator("#endTurn").isEnabled(), true);
  await page.locator("#tradeButton").click();
  await page.locator('[data-trade="wood"]').click();
  await page.locator("#closeDialog").click();
  const local = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hexa-crown-save")),
  );
  assert.ok(local.logs.some((l) => l.text.includes("목재 3 → 황금 1")));
  const old = await page.locator("#zoomValue").textContent();
  await page.locator("#zoomIn").click();
  assert.notEqual(await page.locator("#zoomValue").textContent(), old);
  console.log("PASS browser: rules, local two-player, resource trade, zoom");

  await page.locator("#modeButton").click();
  await page.locator('[data-mode="ai"]').click();
  for (const width of [390, 768, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(150);
    const dimensions = await page.evaluate(() => ({
      viewport: innerWidth,
      content: document.documentElement.scrollWidth,
    }));
    assert.ok(
      dimensions.content <= dimensions.viewport,
      `Horizontal overflow at ${width}: ${dimensions.content}`,
    );
    if (width === 390) {
      assert.equal(await page.locator("#tradeButton").isVisible(), true);
      assert.equal(await page.locator("#mobileScore").isVisible(), true);
      await page.screenshot({
        path: "test-results/mobile.png",
        fullPage: true,
      });
    }
  }
  console.log(
    "PASS browser: 390px, 768px, 1024px layouts; mobile score and trade",
  );

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator("#onlineButton").click();
  await page.locator("#createRoom").click();
  await page.locator(".room-code").waitFor();
  const code = (await page.locator(".room-code").textContent()).trim();
  await page.locator("#returnBattle").click();
  assert.equal(await page.locator("#endTurn").isEnabled(), false);
  const second = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    opponent = await second.newPage();
  opponent.on("pageerror", (e) => errors.push(e.message));
  await opponent.goto(`${base}/?room=${code}`);
  assert.equal(await opponent.locator("#roomInput").inputValue(), code);
  await opponent.locator("#joinForm button").click();
  await opponent.locator("#returnBattle").waitFor();
  await opponent.locator("#returnBattle").click();
  await page.waitForFunction(
    () => !document.querySelector("#endTurn").disabled,
  );
  assert.equal(await opponent.locator("#endTurn").isEnabled(), false);
  await page.locator('[data-tile="-1,0"]').click();
  await opponent.waitForFunction(() =>
    document
      .querySelector('[data-tile="-1,0"]')
      .getAttribute("aria-label")
      .includes("푸른 사자"),
  );
  await page.locator("#endTurn").click();
  await opponent.waitForFunction(
    () => !document.querySelector("#endTurn").disabled,
  );
  await opponent.reload();
  await opponent.waitForFunction(() =>
    document.querySelector("#modeLabel").textContent.includes("온라인"),
  );
  await opponent.waitForFunction(
    () => !document.querySelector("#endTurn").disabled,
  );
  assert.match(
    await opponent.locator('[data-tile="-1,0"]').getAttribute("aria-label"),
    /푸른 사자/,
  );
  await opponent.locator("#endTurn").click();
  await page.waitForFunction(
    () => document.querySelector(".turn-number strong").textContent === "02",
  );
  assert.equal(await page.locator("#endTurn").isEnabled(), true);
  await page.screenshot({ path: "test-results/online.png", fullPage: true });
  console.log(
    "PASS browser: room invite, two clients, authoritative turns, synchronized capture, reconnect",
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log("PASS browser: no JavaScript errors or external asset requests");
} finally {
  await browser?.close();
  for (const client of wss.clients) client.terminate();
  await new Promise((resolve) => server.close(resolve));
}
