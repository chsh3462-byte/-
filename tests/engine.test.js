import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  act,
  tileAt,
  key,
  options,
  makeUnit,
  score,
  damage,
  aiAction,
  roll,
  UNITS,
  TERRAIN,
} from "../public/engine.js";
const game = () => createGame("local", () => 0.3);

test("37 unique hexes, two legal armies and initial victory scores", () => {
  const s = game();
  assert.equal(s.tiles.length, 37);
  assert.equal(new Set(s.tiles.map(key)).size, 37);
  assert.equal(score(s, "blue").vp, 2);
  assert.equal(score(s, "red").vp, 2);
  assert.equal(s.tiles.filter((t) => t.unit).length, 4);
  assert.equal(s.tiles.filter((t) => t.terrain === "water").length, 2);
});
test("knight captures a reachable tile, receives loot, and cannot move twice", () => {
  const s = game(),
    dest = "-1,0",
    target = tileAt(s, dest);
  const res = TERRAIN[target.terrain].resource,
    before = s.resources.blue[res];
  assert.ok(options(s, "-2,0").moves.includes(dest));
  assert.equal(act(s, { type: "move", from: "-2,0", to: dest }).ok, true);
  assert.equal(target.owner, "blue");
  assert.equal(target.unit.type, "knight");
  assert.equal(s.resources.blue[res], before + 1);
  const snapshot = JSON.stringify(s);
  assert.equal(act(s, { type: "move", from: dest, to: "0,0" }).ok, false);
  assert.equal(JSON.stringify(s), snapshot);
});
test("water, occupied destinations, out of range and wrong-side actions cannot mutate state", () => {
  const s = game();
  for (const a of [
    { type: "move", from: "-2,0", to: "-1,-1" },
    { type: "move", from: "-2,0", to: "-3,0" },
    { type: "move", from: "-2,0", to: "3,0" },
    { type: "attack", from: "-2,0", to: "2,0" },
  ]) {
    const old = JSON.stringify(s);
    assert.equal(act(s, a).ok, false);
    assert.equal(JSON.stringify(s), old);
  }
  assert.equal(act(s, { type: "end" }, "red").ok, false);
  assert.equal(s.current, "blue");
});
test("knight cannot jump over a full wall of enemies or water", () => {
  const s = game(),
    start = tileAt(s, "-2,0");
  for (const t of s.tiles)
    if (
      t !== start &&
      Math.max(
        Math.abs(t.q - start.q),
        Math.abs(t.r - start.r),
        Math.abs(t.q + t.r - start.q - start.r),
      ) === 1
    ) {
      t.unit = makeUnit("infantry", "red");
      t.owner = "red";
    }
  assert.equal(options(s, "-2,0").moves.length, 0);
});
test("ranged archer damage includes matchup and terrain; no distant retaliation", () => {
  const s = game(),
    a = tileAt(s, "0,-2"),
    d = tileAt(s, "0,0");
  a.unit = makeUnit("archer", "blue");
  d.unit = makeUnit("infantry", "red");
  d.terrain = "forest";
  assert.equal(damage(a, d), 5);
  assert.equal(act(s, { type: "attack", from: key(a), to: key(d) }).ok, true);
  assert.equal(d.unit.hp, 5);
  assert.equal(a.unit.hp, 8);
  assert.equal(a.unit.attacked, true);
  assert.equal(a.unit.moved, true);
});
test("melee victory occupies defeated enemy territory and awards resource", () => {
  const s = game(),
    d = tileAt(s, "-1,0");
  d.unit = makeUnit("archer", "red");
  d.unit.hp = 1;
  d.owner = "red";
  assert.equal(act(s, { type: "attack", from: "-2,0", to: "-1,0" }).ok, true);
  assert.equal(d.owner, "blue");
  assert.equal(d.unit.type, "knight");
  assert.equal(tileAt(s, "-2,0").unit, null);
});
test("surviving adjacent defender retaliates and can destroy attacker", () => {
  const s = game(),
    a = tileAt(s, "-2,0"),
    d = tileAt(s, "-1,0");
  a.unit.hp = 1;
  d.unit = makeUnit("infantry", "red");
  d.owner = "red";
  assert.equal(act(s, { type: "attack", from: key(a), to: key(d) }).ok, true);
  assert.equal(a.unit, null);
  assert.ok(d.unit.hp > 0);
});
test("recruitment charges exact costs and rejects unsupported units or insufficient resources", () => {
  const s = game(),
    before = { ...s.resources.blue };
  const r = act(s, { type: "recruit", unit: "archer" });
  assert.equal(r.ok, true);
  assert.equal(tileAt(s, r.selected).unit.type, "archer");
  assert.equal(s.resources.blue.food, before.food - 1);
  assert.equal(s.resources.blue.wood, before.wood - 2);
  assert.equal(act(s, { type: "recruit", unit: "__proto__" }).ok, false);
  s.resources.blue.food = 0;
  assert.equal(act(s, { type: "recruit", unit: "infantry" }).ok, false);
});
test("construction adds a VP and doubles resource production", () => {
  const s = game();
  tileAt(s, "-2,0").number = 2;
  assert.equal(act(s, { type: "build", tile: "-2,0" }).ok, true);
  assert.equal(score(s, "blue").vp, 3);
  const before = s.resources.blue.wood;
  roll(s, () => 0);
  assert.equal(s.resources.blue.wood, before + 2);
  assert.equal(act(s, { type: "build", tile: "-2,0" }).ok, false);
});
test("trade uses explicitly selected resources; healing caps HP and consumes food", () => {
  const s = game(),
    wood = s.resources.blue.wood,
    gold = s.resources.blue.gold;
  assert.equal(act(s, { type: "trade", resource: "wood" }).ok, true);
  assert.equal(s.resources.blue.wood, wood - 3);
  assert.equal(s.resources.blue.gold, gold + 1);
  assert.equal(act(s, { type: "trade", resource: "gold" }).ok, false);
  const u = tileAt(s, "-2,0").unit;
  u.hp = 11;
  const food = s.resources.blue.food;
  assert.equal(act(s, { type: "heal", tile: "-2,0" }).ok, true);
  assert.equal(u.hp, 12);
  assert.equal(s.resources.blue.food, food - 1);
  assert.equal(act(s, { type: "heal", tile: "-2,0" }).ok, false);
});
test("ending turns restores only active units and advances the round after red", () => {
  const s = game();
  tileAt(s, "-2,0").unit.moved = true;
  tileAt(s, "2,0").unit.moved = true;
  act(s, { type: "end" });
  assert.equal(s.current, "red");
  assert.equal(s.turn, 1);
  assert.equal(tileAt(s, "2,0").unit.moved, false);
  assert.equal(tileAt(s, "-2,0").unit.moved, true);
  act(s, { type: "end" });
  assert.equal(s.turn, 2);
  assert.equal(s.current, "blue");
  assert.equal(tileAt(s, "-2,0").unit.moved, false);
});
test("capturing an enemy citadel ends the game and freezes all further actions", () => {
  const s = game(),
    a = tileAt(s, "2,0"),
    base = tileAt(s, "3,0");
  a.unit = makeUnit("knight", "blue");
  a.owner = "blue";
  base.unit = null;
  assert.equal(act(s, { type: "move", from: "2,0", to: "3,0" }).ok, true);
  assert.equal(s.winner, "blue");
  const old = JSON.stringify(s);
  assert.equal(act(s, { type: "end" }).ok, false);
  assert.equal(JSON.stringify(s), old);
});
test("ten victory points also end a campaign", () => {
  const s = game();
  for (const t of s.tiles)
    if (t.terrain !== "water" && !t.unit && !t.building) t.owner = "blue";
  assert.ok(score(s, "blue").vp >= 10);
  act(s, { type: "trade", resource: "wood" });
  assert.equal(s.winner, "blue");
});
test("AI completes an entire campaign with legal actions and finite resources", () => {
  const s = game();
  let count = 0;
  while (!s.winner && count < 800) {
    const result = act(s, aiAction(s));
    assert.equal(result.ok, true, result.error);
    for (const resources of Object.values(s.resources))
      for (const value of Object.values(resources))
        assert.ok(Number.isInteger(value) && value >= 0);
    for (const t of s.tiles)
      if (t.unit)
        assert.ok(t.unit.hp > 0 && t.unit.hp <= UNITS[t.unit.type].hp);
    count++;
  }
  assert.ok(s.winner, `No winner after ${count} AI actions`);
  assert.ok(s.turn > 1);
});
