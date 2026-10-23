export const FACTIONS = {
  blue: { name: "푸른 사자", title: "푸른 사자 군단", color: "#4e9eaa" },
  red: { name: "붉은 독수리", title: "붉은 독수리 군단", color: "#b96552" },
};
export const RESOURCES = {
  food: "식량",
  wood: "목재",
  iron: "철광",
  gold: "황금",
};
export const TERRAIN = {
  plains: {
    name: "황금빛 평원",
    resource: "food",
    defense: 0,
    color: "#b6bb78",
    desc: "비옥한 들판에서 군단을 위한 식량을 생산합니다.",
  },
  forest: {
    name: "오래된 수림",
    resource: "wood",
    defense: 1,
    color: "#719575",
    desc: "울창한 숲이 목재와 방어 보너스 +1을 제공합니다.",
  },
  hills: {
    name: "회색빛 산맥",
    resource: "iron",
    defense: 2,
    color: "#9ca79c",
    desc: "철광이 풍부한 고지대. 방어 보너스 +2를 받습니다.",
  },
  gold: {
    name: "왕의 황금 광산",
    resource: "gold",
    defense: 1,
    color: "#c8aa64",
    desc: "황금을 생산하는 전략적 요충지. 점령 시 승리 점수 +1.",
  },
  water: {
    name: "고요한 호수",
    resource: null,
    defense: 0,
    color: "#568e99",
    desc: "깊은 호수는 군단이 통과할 수 없습니다.",
  },
};
export const UNITS = {
  infantry: {
    name: "보병 연대",
    english: "INFANTRY",
    hp: 10,
    attack: 4,
    move: 1,
    range: 1,
    cost: { food: 2, iron: 1 },
    desc: "견고한 방패와 장창으로 전선을 지키는 군단의 중심.",
  },
  archer: {
    name: "장궁병 부대",
    english: "LONGBOWMEN",
    hp: 8,
    attack: 4,
    move: 1,
    range: 2,
    cost: { food: 1, wood: 2 },
    desc: "두 칸 너머의 적을 겨냥합니다. 보병에게 추가 피해 +2.",
  },
  knight: {
    name: "왕실 기병대",
    english: "ROYAL CAVALRY",
    hp: 12,
    attack: 5,
    move: 2,
    range: 1,
    cost: { food: 2, iron: 2, gold: 1 },
    desc: "두 칸을 가로지르는 기동력. 궁병과 공성 병기에 돌격 피해 +2.",
  },
  siege: {
    name: "공성 투석기",
    english: "TREBUCHET",
    hp: 9,
    attack: 6,
    move: 1,
    range: 2,
    cost: { wood: 2, iron: 2, gold: 2 },
    desc: "견고한 성벽을 무너뜨립니다. 건물에 주둔한 적에게 피해 +3.",
  },
};
export const OUTPOST_COST = { wood: 2, iron: 1, gold: 1 };
export const key = (t) => `${t.q},${t.r}`;
export const tileAt = (s, k) => s.tiles.find((t) => key(t) === k);
export const distance = (a, b) =>
  (Math.abs(a.q - b.q) +
    Math.abs(a.r - b.r) +
    Math.abs(a.q + a.r - b.q - b.r)) /
  2;
export const neighbors = (s, t) => s.tiles.filter((n) => distance(n, t) === 1);
export const makeUnit = (type, owner) => ({
  type,
  owner,
  hp: UNITS[type].hp,
  moved: false,
  attacked: false,
});
export function addLog(s, text, owner = "system") {
  s.logs.unshift({ text, owner, turn: s.turn, id: ++s.logId });
  s.logs = s.logs.slice(0, 60);
}
export function createGame(mode = "ai", random = Math.random) {
  const s = {
    version: 1,
    mode,
    turn: 1,
    current: "blue",
    winner: null,
    reason: "",
    dice: [3, 4],
    tiles: [],
    logs: [],
    logId: 0,
    resources: {
      blue: { food: 4, wood: 3, iron: 2, gold: 2 },
      red: { food: 4, wood: 3, iron: 2, gold: 2 },
    },
  };
  const numbers = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 5, 6, 8, 9];
  for (let r = -3; r <= 3; r++)
    for (let q = Math.max(-3, -r - 3); q <= Math.min(3, -r + 3); q++) {
      const roll = random();
      s.tiles.push({
        q,
        r,
        terrain: roll < 0.38 ? "plains" : roll < 0.72 ? "forest" : "hills",
        number: numbers[Math.floor(random() * numbers.length)],
        owner: null,
        building: null,
        unit: null,
      });
    }
  for (const k of ["0,0", "-2,2", "2,-2"])
    Object.assign(tileAt(s, k), {
      terrain: "gold",
      number: k === "0,0" ? 7 : 6,
    });
  for (const k of ["-1,-1", "1,1"])
    Object.assign(tileAt(s, k), { terrain: "water", number: null });
  for (const owner of ["blue", "red"]) {
    const sign = owner === "blue" ? -1 : 1;
    Object.assign(tileAt(s, `${3 * sign},0`), {
      terrain: "plains",
      number: owner === "blue" ? 6 : 8,
      owner,
      building: "citadel",
      unit: makeUnit("infantry", owner),
    });
    Object.assign(tileAt(s, `${2 * sign},0`), {
      terrain: "forest",
      number: owner === "blue" ? 8 : 6,
      owner,
      unit: makeUnit("knight", owner),
    });
  }
  addLog(s, "아르덴의 왕관을 위한 원정이 시작되었습니다.");
  roll(s, random);
  return s;
}
export function score(s, owner) {
  const owned = s.tiles.filter((t) => t.owner === owner);
  return {
    territory: owned.length,
    vp:
      Math.floor(owned.length / 3) +
      owned.reduce(
        (v, t) =>
          v +
          (t.building === "citadel" ? 2 : t.building === "outpost" ? 1 : 0) +
          (t.terrain === "gold" ? 1 : 0),
        0,
      ),
    army: owned.filter((t) => t.unit?.owner === owner).length,
  };
}
export function options(s, from) {
  const moves = [],
    attacks = [];
  const t = tileAt(s, from),
    u = t?.unit;
  if (!u || u.owner !== s.current || s.winner) return { moves, attacks };
  const spec = UNITS[u.type];
  if (!u.moved) {
    const visited = new Set([from]),
      queue = [[t, 0]];
    while (queue.length) {
      const [at, d] = queue.shift();
      if (d >= spec.move) continue;
      for (const n of neighbors(s, at)) {
        const k = key(n);
        if (
          visited.has(k) ||
          n.terrain === "water" ||
          (n.unit && n.unit.owner !== u.owner)
        )
          continue;
        visited.add(k);
        queue.push([n, d + 1]);
        if (!n.unit) moves.push(k);
      }
    }
  }
  if (!u.attacked)
    for (const n of s.tiles)
      if (n.unit && n.unit.owner !== u.owner && distance(t, n) <= spec.range)
        attacks.push(key(n));
  return { moves, attacks };
}
export const canAfford = (s, owner, cost) =>
  Object.entries(cost).every(([k, v]) => s.resources[owner][k] >= v);
function pay(s, owner, cost) {
  for (const [k, v] of Object.entries(cost)) s.resources[owner][k] -= v;
}
function capture(s, t, owner, loot = true) {
  if (t.owner !== owner) {
    t.owner = owner;
    const res = TERRAIN[t.terrain].resource;
    if (loot && res) s.resources[owner][res]++;
    addLog(
      s,
      `${TERRAIN[t.terrain].name} 점령${loot && res ? ` · ${RESOURCES[res]} +1` : ""}`,
      owner,
    );
  }
}
export function damage(from, to) {
  const a = from.unit.type,
    b = to.unit.type;
  let n = UNITS[a].attack;
  if (a === "archer" && b === "infantry") n += 2;
  if (a === "knight" && ["archer", "siege"].includes(b)) n += 2;
  if (a === "siege" && to.building) n += 3;
  return Math.max(2, n - TERRAIN[to.terrain].defense - (to.building ? 1 : 0));
}
function victory(s) {
  for (const p of ["blue", "red"]) {
    const base = tileAt(s, p === "blue" ? "3,0" : "-3,0");
    if (base.owner === p || score(s, p).vp >= 10) {
      s.winner = p;
      s.reason =
        base.owner === p
          ? "상대의 본성을 함락했습니다."
          : "승리 점수 10점에 도달했습니다.";
      addLog(s, `${FACTIONS[p].name}의 승리 · ${s.reason}`, p);
      return;
    }
  }
}
export function roll(s, random = Math.random) {
  s.dice = [1 + Math.floor(random() * 6), 1 + Math.floor(random() * 6)];
  const sum = s.dice[0] + s.dice[1];
  const gains = { blue: 0, red: 0 };
  if (sum === 7)
    for (const p of ["blue", "red"]) {
      s.resources[p].food++;
      s.resources[p].wood++;
      gains[p] += 2;
    }
  for (const t of s.tiles)
    if (t.owner && t.number === sum && TERRAIN[t.terrain].resource) {
      const n = t.building ? 2 : 1;
      s.resources[t.owner][TERRAIN[t.terrain].resource] += n;
      gains[t.owner] += n;
    }
  addLog(
    s,
    `생산 주사위 ${sum} · 푸른 사자 +${gains.blue} / 붉은 독수리 +${gains.red}`,
  );
}
export function spawnTile(s, owner, selected) {
  const valid = (t) => t && t.owner === owner && t.building && !t.unit;
  const picked = tileAt(s, selected);
  if (valid(picked)) return picked;
  return (
    s.tiles.find(valid) ||
    s.tiles
      .filter((t) => t.owner === owner && t.building === "citadel")
      .flatMap((t) => neighbors(s, t))
      .find(
        (t) =>
          !t.unit && t.terrain !== "water" && (!t.owner || t.owner === owner),
      )
  );
}
export function act(s, a, actor = s.current, random = Math.random) {
  if (s.winner) return { ok: false, error: "이미 종료된 전투입니다." };
  if (actor !== s.current)
    return { ok: false, error: "상대 군단의 차례입니다." };
  const from = tileAt(s, a.from),
    to = tileAt(s, a.to),
    t = tileAt(s, a.tile);
  let selected = a.from;
  switch (a.type) {
    case "move": {
      if (!options(s, a.from).moves.includes(a.to))
        return { ok: false, error: "이동할 수 없는 영토입니다." };
      to.unit = from.unit;
      from.unit = null;
      to.unit.moved = true;
      capture(s, to, actor);
      selected = a.to;
      addLog(s, `${UNITS[to.unit.type].name} 진군 · ${a.to}`, actor);
      break;
    }
    case "attack": {
      if (!options(s, a.from).attacks.includes(a.to))
        return { ok: false, error: "공격할 수 없는 대상입니다." };
      const n = damage(from, to),
        u = from.unit;
      u.moved = true;
      u.attacked = true;
      to.unit.hp -= n;
      addLog(s, `${UNITS[u.type].name} 공격 · 적 피해 ${n}`, actor);
      if (to.unit.hp <= 0) {
        to.unit = null;
        if (distance(from, to) === 1) {
          to.unit = u;
          from.unit = null;
          capture(s, to, actor);
          selected = a.to;
        }
        addLog(s, "적 부대를 격파했습니다.", actor);
      } else if (distance(from, to) === 1) {
        u.hp -= Math.max(1, Math.floor(UNITS[to.unit.type].attack * 0.6));
        if (u.hp <= 0) from.unit = null;
      }
      break;
    }
    case "recruit": {
      if (!Object.hasOwn(UNITS, a.unit))
        return { ok: false, error: "알 수 없는 병종입니다." };
      if (!canAfford(s, actor, UNITS[a.unit].cost))
        return { ok: false, error: "모집에 필요한 자원이 부족합니다." };
      const target = spawnTile(s, actor, a.tile);
      if (!target)
        return {
          ok: false,
          error: "본성 인접 영토나 전초기지에 빈자리가 필요합니다.",
        };
      pay(s, actor, UNITS[a.unit].cost);
      target.unit = makeUnit(a.unit, actor);
      capture(s, target, actor, false);
      selected = key(target);
      addLog(s, `${UNITS[a.unit].name} 모집 완료`, actor);
      break;
    }
    case "build":
      if (!t || t.owner !== actor || t.building || t.terrain === "water")
        return { ok: false, error: "건물이 없는 아군 영토를 선택하세요." };
      if (!canAfford(s, actor, OUTPOST_COST))
        return { ok: false, error: "목재 2 · 철광 1 · 황금 1이 필요합니다." };
      pay(s, actor, OUTPOST_COST);
      t.building = "outpost";
      selected = a.tile;
      addLog(s, "전초기지 건설 · 승리 점수 +1", actor);
      break;
    case "heal":
      if (
        !t?.unit ||
        t.unit.owner !== actor ||
        t.unit.hp === UNITS[t.unit.type].hp
      )
        return { ok: false, error: "회복이 필요한 아군 부대를 선택하세요." };
      if (s.resources[actor].food < 1)
        return { ok: false, error: "식량 1이 필요합니다." };
      s.resources[actor].food--;
      t.unit.hp = Math.min(UNITS[t.unit.type].hp, t.unit.hp + 4);
      selected = a.tile;
      addLog(s, "부대 재보급 · 체력 +4", actor);
      break;
    case "trade":
      if (
        !["food", "wood", "iron"].includes(a.resource) ||
        s.resources[actor][a.resource] < 3
      )
        return { ok: false, error: "교역할 자원이 3개 이상 필요합니다." };
      s.resources[actor][a.resource] -= 3;
      s.resources[actor].gold++;
      addLog(s, `${RESOURCES[a.resource]} 3 → 황금 1 교역`, actor);
      break;
    case "end":
      s.current = actor === "blue" ? "red" : "blue";
      if (s.current === "blue") s.turn++;
      for (const tile of s.tiles)
        if (tile.unit?.owner === s.current) {
          tile.unit.moved = false;
          tile.unit.attacked = false;
        }
      roll(s, random);
      selected = key(
        s.tiles.find((tile) => tile.unit?.owner === s.current) || s.tiles[0],
      );
      break;
    default:
      return { ok: false, error: "알 수 없는 명령입니다." };
  }
  victory(s);
  return { ok: true, selected };
}
export function aiAction(s) {
  const p = s.current,
    enemy = p === "blue" ? "red" : "blue";
  for (const t of s.tiles.filter((t) => t.unit?.owner === p)) {
    const o = options(s, key(t));
    if (o.attacks.length)
      return {
        type: "attack",
        from: key(t),
        to: o.attacks.sort(
          (a, b) => tileAt(s, a).unit.hp - tileAt(s, b).unit.hp,
        )[0],
      };
    if (o.moves.length) {
      const base =
        s.tiles.find((t) => t.building === "citadel" && t.owner === enemy) ||
        s.tiles[0];
      const value = (k) => {
        const n = tileAt(s, k);
        return (
          (n.owner !== p ? 16 : 0) +
          (n.terrain === "gold" && n.owner !== p ? 12 : 0) +
          (n.building && n.owner !== p ? 40 : 0) -
          distance(n, base) * 3
        );
      };
      return {
        type: "move",
        from: key(t),
        to: o.moves.sort((a, b) => value(b) - value(a))[0],
      };
    }
  }
  const count = s.tiles.filter((t) => t.unit?.owner === p).length;
  if (count < 5)
    for (const type of ["knight", "archer", "infantry"])
      if (canAfford(s, p, UNITS[type].cost) && spawnTile(s, p))
        return { type: "recruit", unit: type };
  const site = s.tiles.find((t) => t.owner === p && !t.building);
  if (site && canAfford(s, p, OUTPOST_COST))
    return { type: "build", tile: key(site) };
  return { type: "end" };
}
