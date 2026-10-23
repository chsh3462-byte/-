import {
  FACTIONS,
  RESOURCES,
  TERRAIN,
  UNITS,
  OUTPOST_COST,
  key,
  tileAt,
  score,
  options,
  canAfford,
  createGame,
  act,
  aiAction,
  damage,
  spawnTile,
} from "./engine.js";
import {
  icon,
  crest,
  defs,
  unitSvg,
  unitArt,
  castleArt,
  terrainArt,
  diceSvg,
} from "./art.js";

const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const serverMode = /^https?:$/.test(location.protocol) && !document.documentElement.hasAttribute("data-standalone");
const memoryStore = new Map();
let lastSavePersisted = true;
const readStore = (k, storageName = "localStorage") => {
  try {
    return JSON.parse(window[storageName].getItem(k));
  } catch {
    return memoryStore.get(`${storageName}:${k}`) ?? null;
  }
};
const writeStore = (k, v, storageName = "localStorage") => {
  memoryStore.set(`${storageName}:${k}`, v);
  try {
    window[storageName].setItem(k, JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
};
const saved = readStore("hexa-crown-save");
function validSave(s) {
  return (
    s?.version === 1 &&
    ["ai", "local"].includes(s.mode) &&
    ["blue", "red"].includes(s.current) &&
    Array.isArray(s.tiles) &&
    s.tiles.length === 37 &&
    s.tiles.every(
      (t) => TERRAIN[t.terrain] && (!t.unit || UNITS[t.unit.type]),
    ) &&
    s.resources?.blue &&
    s.resources?.red &&
    Array.isArray(s.logs)
  );
}
let state = validSave(saved) ? saved : createGame(),
  selected = "-2,0",
  zoom = 1,
  soundEnabled = readStore("hexa-crown-sound") ?? false;
let toastTimer,
  aiTimer,
  audioContext,
  network = null,
  socket = null,
  retryTimer,
  retries = 0,
  dialogKind = "",
  lastWinner = null;
const modal = $("#modal");
const ownSide = () =>
  state.mode === "online"
    ? network?.side
    : state.mode === "ai"
      ? "blue"
      : state.current;
const canControl = () =>
  !state.winner &&
  state.current === ownSide() &&
  (state.mode !== "online" ||
    (network?.connected?.blue &&
      network?.connected?.red &&
      socket?.readyState === WebSocket.OPEN));
const costText = (cost) =>
  Object.entries(cost)
    .map(([r, n]) => `<span>${icon(r)} ${n}</span>`)
    .join("");
const turnText = () =>
  state.winner
    ? "원정 종료"
    : state.mode === "online" &&
        (!network?.connected?.blue || !network?.connected?.red)
      ? "상대 사령관을 기다리는 중"
      : state.mode === "ai" && state.current === "red"
        ? "붉은 독수리가 진군 중입니다"
        : state.current === ownSide()
          ? "사령관님의 차례입니다"
          : "상대 사령관의 차례입니다";

$("#app").innerHTML = `<svg class="svg-defs" aria-hidden="true">${defs}</svg>
<header class="topbar"><a class="brand" href="#" aria-label="HEXA CROWN 홈" style="color:inherit;text-decoration:none"><span class="brand-mark">${icon("crown")}</span><div><strong>HEXA CROWN</strong><small>A KINGDOM IS YOURS TO CLAIM</small></div></a><nav class="main-nav" aria-label="주 메뉴"><button class="active" id="battleTab" title="전장">${icon("sword")}전장</button><button id="guideButton" title="전쟁 지침서">${icon("book")}전쟁 지침서</button><button id="onlineButton" title="멀티플레이">${icon("globe")}멀티플레이</button></nav><div class="top-actions"><button class="icon-button" id="soundButton" aria-label="효과음 켜기"></button><div class="player-profile"><span class="avatar">C</span><div><span style="font-size:11px">사령관</span><small>아르덴의 개척자</small></div></div></div></header>
<div id="connectionNotice" class="connection-notice hidden" role="status"></div>
<main class="game-shell"><div class="page-heading"><div><div class="breadcrumb">왕국의 연대기 ${icon("chevron")} 아르덴 원정</div><div class="heading-title"><h1>왕관을 향한 진군</h1><span class="edition-tag">THE FIRST CHAPTER</span></div></div><div class="match-meta"><span>37개의 영토, 하나의 왕관</span><button class="mode-label" id="modeButton"><i class="status-dot"></i><span id="modeLabel"></span></button></div></div>
<div class="game-layout"><aside class="left-rail" aria-label="군단 현황"><section id="commander" class="panel commander-panel"></section><section class="panel resources-panel"><div class="panel-inner"><div class="section-heading"><span>왕국의 보급품</span><small id="resourceOwner"></small></div><div id="resources" class="resource-grid"></div><button class="trade-link" id="tradeButton"><span>${icon("trade")} 보급 교역소</span><span>3 : 1 ${icon("chevron")}</span></button></div><div id="dice" class="dice-panel"></div></section><section class="panel objective panel-inner"><div class="section-heading"><span>${icon("crown")} 왕관을 차지하는 방법</span></div><p>영토를 넓혀 10점을 획득하거나<br>적의 본성을 함락하세요.</p><small>영토 3칸마다 +1 · 황금 광산 +1<br>전초기지 +1 · 본성 +2</small></section><section class="panel journal panel-inner"><div class="section-heading"><span>전장의 기록</span><small id="logTurn"></small></div><div id="logs" class="log-list" role="log" aria-live="polite"></div></section></aside>
<section class="center-stage" aria-label="육각 전장"><div class="battlefield" id="battlefield"><div class="map-top"><div><h2>아르덴의 경계</h2><small>THE BORDERLANDS OF ARDEN</small></div><button class="icon-button" id="fullscreenButton" title="전장 전체 화면" aria-label="전장 전체 화면">${icon("expand")}</button></div><div class="map-viewport"><svg id="board" class="board-svg" viewBox="0 0 900 740" role="group" aria-label="37개 영토로 구성된 아르덴 전장"></svg></div><div class="map-bottom" style="bottom:59px"><div class="legend"><span><i class="mine"></i>아군 영토</span><span><i class="enemy"></i>적군 영토</span><span><i class="move"></i>이동 가능</span></div><div class="zoom"><button class="icon-button" id="zoomOut" aria-label="지도 축소">${icon("minus")}</button><small id="zoomValue">100%</small><button class="icon-button" id="zoomIn" aria-label="지도 확대">${icon("plus")}</button></div></div><div id="boardCaption" class="board-caption"></div></div><div id="turnControl" class="turn-control"></div><div class="map-footnote"><span>${icon("target")} 군단 선택 후 표시된 영토를 클릭하여 이동</span><span id="saveStatus">${icon("check")} 자동 저장됨</span></div></section>
<aside class="right-rail" aria-label="군단 명령"><section id="inspector" class="panel selected-panel"></section><section class="panel recruit-panel"><div class="section-heading"><span>새로운 군단 모집</span><small>RECRUITMENT</small></div><div id="recruitList" class="recruit-list"></div><p class="recruit-hint">본성 또는 전초기지에서 새 군단을 모집합니다.</p></section></aside></div>
<footer class="footer"><span class="footer-brand">HEXA CROWN <span style="font-family:var(--sans);letter-spacing:0;margin-left:9px">왕국은 당신의 선택으로 완성됩니다.</span></span><span>TURN-BASED STRATEGY · ORIGINAL VECTOR ART</span><button id="newGameButton">새로운 원정 시작 ${icon("reset")}</button></footer></main>`;

function notify(message) {
  clearTimeout(toastTimer);
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3400);
}
function sound(kind = "select") {
  if (!soundEnabled) return;
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume();
    const time = audioContext.currentTime;
    const tones =
      kind === "attack"
        ? [130, 90]
        : kind === "end"
          ? [330, 440, 550]
          : kind === "move"
            ? [260, 390]
            : [480];
    tones.forEach((n, i) => {
      const osc = audioContext.createOscillator(),
        gain = audioContext.createGain();
      osc.type = "triangle";
      osc.frequency.value = n;
      gain.gain.setValueAtTime(0.0001, time + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.08, time + i * 0.08 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + i * 0.08 + 0.2);
      osc.connect(gain).connect(audioContext.destination);
      osc.start(time + i * 0.08);
      osc.stop(time + i * 0.08 + 0.21);
    });
  } catch {}
}
function renderCommander() {
  const side = ownSide() || "blue",
    other = side === "blue" ? "red" : "blue",
    s = score(state, side),
    e = score(state, other);
  const track = (n, red = false) =>
    `<div class="vp-track ${red ? "red" : ""}">${Array.from({ length: 10 }, (_, i) => `<span class="${i < n ? "filled" : ""}"></span>`).join("")}</div>`;
  $("#commander").innerHTML =
    `<div class="commander-banner">${crest(side)}<div><div class="eyebrow">YOUR LEGION</div><strong>${FACTIONS[side].name} 군단</strong><small>아르덴의 ${side === "blue" ? "서부" : "동부"} 수호자</small></div></div><div class="panel-inner"><div class="faction-statline"><span>왕관까지의 여정</span><span><strong>${s.vp}</strong> <small>/ 10 VP</small></span></div>${track(s.vp, side === "red")}<div class="faction-substats"><span>점령지 <b>${s.territory}</b></span><span>보유 군단 <b>${s.army}</b></span></div><div class="rival-row"><div class="faction-statline"><span class="rival-name">${crest(other)}${FACTIONS[other].name}</span><span><strong>${e.vp}</strong> <small>/ 10</small></span></div>${track(e.vp, other === "red")}</div></div>`;
  let compact = $("#mobileScore");
  if (!compact) {
    compact = document.createElement("div");
    compact.id = "mobileScore";
    compact.className = "mobile-score";
    $(".page-heading").after(compact);
  }
  compact.innerHTML = `<span>${crest(side)}${FACTIONS[side].name} <b>${s.vp}<small>/10</small></b></span><span class="versus">VS</span><span>${crest(other)}${FACTIONS[other].name} <b>${e.vp}<small>/10</small></b></span>`;
}
function renderResources() {
  const side = ownSide() || "blue";
  $("#resourceOwner").textContent = FACTIONS[side].name;
  $("#resources").innerHTML = Object.entries(RESOURCES)
    .map(
      ([r, name]) =>
        `<div class="resource-cell"><span class="resource-symbol ${r}">${icon(r)}</span><div><small>${name}</small><strong data-resource="${r}">${state.resources[side][r]}</strong></div></div>`,
    )
    .join("");
  $("#dice").innerHTML =
    `<div><strong>이번 턴의 생산</strong><small>같은 숫자의 영토에서 수급</small></div><div class="dice-pair">${state.dice.map(diceSvg).join("")}<b>${state.dice[0] + state.dice[1]}</b></div>`;
}
const hexPoints = (radius = 53.7) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = ((60 * i - 30) * Math.PI) / 180;
    return `${Math.cos(a) * radius},${Math.sin(a) * radius}`;
  }).join(" ");
const position = (t) => ({
  x: 450 + Math.sqrt(3) * 55 * (t.q + t.r / 2),
  y: 365 + 82.5 * t.r,
});
function renderBoard() {
  $("#board").setAttribute(
    "viewBox",
    window.innerWidth <= 700 ? "70 -35 760 775" : "0 0 900 740",
  );
  const available = canControl()
    ? options(state, selected)
    : { moves: [], attacks: [] };
  const active = tileAt(state, selected);
  const tiles = state.tiles
    .map((t) => {
      const k = key(t),
        p = position(t),
        isSelected = k === selected,
        move = available.moves.includes(k),
        attack = available.attacks.includes(k),
        owner = t.owner;
      const color = TERRAIN[t.terrain].color;
      const ownerColor = owner ? FACTIONS[owner].color : "";
      const title = `${TERRAIN[t.terrain].name}${owner ? " · " + FACTIONS[owner].name : " · 중립"}${t.unit ? " · " + UNITS[t.unit.type].name : ""}${move ? " · 이동 가능" : ""}${attack ? " · 공격 가능" : ""}`;
      let figure = t.building
        ? `<g transform="translate(${t.unit ? -17 : 0},-9) scale(${t.unit ? 0.61 : 0.83})">${castleArt(owner)}</g>`
        : "";
      if (t.unit)
        figure += `<g class="tile-figure" transform="translate(${t.building ? -29 : -40},-48) scale(.5)">${unitArt(t.unit.type, t.unit.owner)}</g><rect x="-16" y="30" width="32" height="3" rx="1.5" fill="#2a463c" opacity=".65"/><rect x="-16" y="30" width="${(32 * t.unit.hp) / UNITS[t.unit.type].hp}" height="3" rx="1.5" fill="${t.unit.owner === "blue" ? "#b7e2cd" : "#f0b299"}"/>`;
      const number = t.number
        ? `<g class="tile-label" transform="translate(${t.unit || t.building ? -29 : 0},${t.unit || t.building ? 24 : 31})"><circle r="10" fill="#3e5846" fill-opacity=".9" stroke="#ddd9a8" stroke-width=".7"/><text text-anchor="middle" y="3.8" class="tile-number ${[6, 8].includes(t.number) ? "hot" : ""}">${t.number}</text>${[6, 8].includes(t.number) ? '<circle cx="-2" cy="7" r=".7" fill="#e9c788"/><circle cx="2" cy="7" r=".7" fill="#e9c788"/>' : ""}</g>`
        : "";
      return `<g class="hex-tile ${isSelected ? "selected" : ""} ${move ? "reachable" : ""} ${attack ? "attackable" : ""}" data-tile="${k}" role="button" tabindex="0" aria-label="${title}" aria-pressed="${isSelected}" transform="translate(${p.x},${p.y})"><title>${title}</title><polygon points="${hexPoints()}" transform="translate(0,7)" fill="${t.terrain === "water" ? "#28535a" : "#586f50"}" stroke="#1b3d35" stroke-width="1.4"/><polygon points="${hexPoints()}" fill="${color}" stroke="#d9d7a2" stroke-width=".6"/><polygon points="${hexPoints()}" fill="url(#grain)"/><g class="tile-art" opacity="${t.unit || t.building ? 0.3 : 1}">${terrainArt(t)}</g>${owner ? `<polygon class="tile-owner" points="${hexPoints(49)}" fill="${ownerColor}" fill-opacity=".12" stroke="${ownerColor}" stroke-width="2" stroke-opacity=".95"/><path d="m-7-43 7 4 7-4" fill="none" stroke="${owner === "blue" ? "#d5eee3" : "#eac5a3"}" stroke-width="2"/>` : ""}${figure}${number}<polygon class="hex-outline" points="${hexPoints(53)}" fill="none" stroke="transparent" stroke-width="2"/>${move ? '<g class="move-dot"><circle r="10" fill="#294d3f" fill-opacity=".55" stroke="#f4e5ad" stroke-width="1"/><circle r="3" fill="#f4e5ad"/></g>' : ""}${attack ? `<g transform="translate(0,-12)"><circle r="16" fill="#853e32"/><path d="m-6-6 12 12M-6 6 6-6" stroke="#f7dfb5" stroke-width="2"/><text text-anchor="middle" y="32" fill="#fff0ca" font-size="11">−${damage(active, t)} HP</text></g>` : ""}</g>`;
    })
    .join("");
  $("#board").innerHTML =
    `<rect width="900" height="740" fill="url(#waves)"/><path d="M40 100V76h24M860 100V76h-24M40 640v24h24M860 640v24h-24" stroke="#91a487" stroke-opacity=".25" fill="none"/><text x="88" y="490" class="sea-label" transform="rotate(-65 88 490)">THE WESTERN SEA</text><text x="762" y="375" class="sea-label" transform="rotate(65 762 375)">SILENT WATERS</text><ellipse cx="450" cy="385" rx="340" ry="287" fill="#153c30" opacity=".25"/><g class="board-tiles" style="transform:scale(${zoom})">${tiles}</g><g transform="translate(802 594)" opacity=".6"><circle r="25" fill="none" stroke="#a8b99c" stroke-width=".6"/><path d="m0-31 6 25 25 6-25 6-6 25-6-25-25-6 25-6Z" fill="none" stroke="#bac4a1" stroke-width=".7"/><path d="M0-27 6-6 0 0-6-6Z" fill="#c0c6a3"/><text class="compass-label" text-anchor="middle" y="-37">N</text></g>`;
  $("#boardCaption").innerHTML =
    `<span>${icon("flag")}${active?.unit ? `${UNITS[active.unit.type].name} 선택됨${available.moves.length ? " · 빛나는 영토로 진군하세요" : active.unit.moved ? " · 이동 완료" : ""}` : active ? `${TERRAIN[active.terrain].name} · ${active.owner ? FACTIONS[active.owner].name + "의 영토" : "미점령 영토"}` : "지도의 군단을 선택하세요"}</span><small>${state.tiles.filter((t) => t.owner).length} / 37 영토 점령</small>`;
  $("#zoomValue").textContent = `${Math.round(zoom * 100)}%`;
  $("#zoomOut").disabled = zoom <= 0.8;
  $("#zoomIn").disabled = zoom >= 1.4;
}
function renderInspector() {
  const t = tileAt(state, selected);
  if (!t) return;
  const u = t.unit,
    spec = u ? UNITS[u.type] : null,
    mine = u?.owner === ownSide(),
    control = canControl();
  const terrain = TERRAIN[t.terrain];
  const canBuild =
    control &&
    t.owner === state.current &&
    !t.building &&
    canAfford(state, state.current, OUTPOST_COST);
  $("#inspector").innerHTML =
    `<div class="selected-head"><span>${u ? "선택한 군단" : "선택한 영토"}</span><span class="unit-status"><i></i>${u ? (u.owner === ownSide() ? (u.moved ? "기동 완료" : "명령 대기") : "적 군단") : t.owner ? FACTIONS[t.owner].name : "중립 영토"}</span></div><div class="portrait">${u ? unitSvg(u.type, u.owner) : `<svg class="terrain-portrait" viewBox="-60 -60 120 120">${t.building ? castleArt(t.owner) : terrainArt(t)}</svg>`}<span class="portrait-coord">${t.q} / ${t.r}</span></div><div class="unit-details"><div class="unit-name"><h2>${u ? spec.name : t.building === "citadel" ? "왕국의 본성" : t.building ? "전초기지" : terrain.name}</h2><div class="eyebrow">${u ? spec.english : "TERRITORY OF ARDEN"}</div><p>${u ? FACTIONS[u.owner].name + " 군단 · " : ""}${terrain.name}</p></div>${u ? `<div class="health-line"><span>부대 체력</span><b>${u.hp} / ${spec.hp}</b></div><div class="health-track">${Array.from({ length: spec.hp }, (_, i) => `<i class="${i >= u.hp ? "empty" : ""}"></i>`).join("")}</div><div class="unit-stats"><div class="unit-stat">${icon("sword")}<strong>${spec.attack}</strong><small>공격력</small></div><div class="unit-stat">${icon("move")}<strong>${spec.move}</strong><small>이동 범위</small></div><div class="unit-stat">${icon("target")}<strong>${spec.range}</strong><small>공격 사거리</small></div></div><p class="unit-description">${spec.desc}</p>` : `<div class="unit-stats"><div class="unit-stat">${icon(terrain.resource || "leaf")}<strong>${t.building ? 2 : 1}</strong><small>${terrain.resource ? RESOURCES[terrain.resource] + " 생산" : "이동 불가"}</small></div><div class="unit-stat">${icon("shield")}<strong>${terrain.defense + (t.building ? 1 : 0)}</strong><small>방어 보너스</small></div><div class="unit-stat"><strong>${t.number || "—"}</strong><small>생산 주사위</small></div></div><p class="unit-description">${terrain.desc}</p>`}<div class="action-row"><button class="primary" data-command="heal" ${!control || !mine || u.hp >= spec.hp || state.resources[state.current].food < 1 ? "disabled" : ""} title="식량 1로 체력 4 회복">${icon("health")}재보급</button><button data-command="build" ${!canBuild ? "disabled" : ""} title="목재 2 · 철광 1 · 황금 1">${icon("castle")}전초기지</button></div></div>`;
}
function renderRecruit() {
  const allowed = canControl();
  $("#recruitList").innerHTML = Object.entries(UNITS)
    .map(
      ([type, u]) =>
        `<button class="recruit-card" data-recruit="${type}" ${!allowed || !canAfford(state, state.current, u.cost) || !spawnTile(state, state.current, selected) ? "disabled" : ""} title="${u.name} 모집 · ${Object.entries(
          u.cost,
        )
          .map(([r, n]) => `${RESOURCES[r]} ${n}`)
          .join(
            " · ",
          )}">${unitSvg(type, ownSide() || "blue")}<span><strong>${u.name}</strong><small>${costText(u.cost)}</small></span>${icon("plus")}</button>`,
    )
    .join("");
}
function render() {
  if (!tileAt(state, selected)) selected = "-2,0";
  renderCommander();
  renderResources();
  renderBoard();
  renderInspector();
  renderRecruit();
  $("#turnControl").innerHTML =
    `<div class="turn-number"><small>ROUND</small><strong>${String(state.turn).padStart(2, "0")}</strong></div><div class="turn-phase"><strong>${turnText()}</strong><div class="phase-steps"><span>${icon("check")} 자원 수급</span><span class="line"></span><span class="active"><i></i> 군단 지휘</span><span class="line"></span><span>턴 종료</span></div></div><button class="end-turn" id="endTurn" ${canControl() ? "" : "disabled"}>턴 종료 ${icon("arrow")}</button>`;
  $("#logs").innerHTML = state.logs
    .slice(0, 8)
    .map(
      (l) =>
        `<div class="log-item"><i class="log-bullet ${l.owner}"></i><div>${l.text}<small>ROUND ${String(l.turn).padStart(2, "0")}</small></div></div>`,
    )
    .join("");
  $("#logTurn").textContent = `ROUND ${String(state.turn).padStart(2, "0")}`;
  $("#modeLabel").textContent =
    state.mode === "online"
      ? `온라인 · ${network?.code || "연결 중"}`
      : state.mode === "local"
        ? "2인 교대 대전"
        : "AI 사령관 대전";
  $("#soundButton").innerHTML = icon(soundEnabled ? "volume" : "mute");
  $("#soundButton").setAttribute(
    "aria-label",
    soundEnabled ? "효과음 끄기" : "효과음 켜기",
  );
  if (state.mode !== "online") lastSavePersisted = writeStore("hexa-crown-save", state);
  $("#saveStatus").innerHTML =
    icon("check") + (state.mode === "online" ? "실시간 동기화" : lastSavePersisted ? "자동 저장됨" : "이번 창에서 플레이 중");
  $("#saveStatus").title = lastSavePersisted ? "" : "브라우저에서 저장을 허용하지 않아 창을 닫으면 진행 상황이 사라집니다.";
  if (state.winner && lastWinner !== state.winner) {
    lastWinner = state.winner;
    setTimeout(showVictory, 450);
  }
}
function command(a, automated = false) {
  if (!automated && !canControl()) {
    notify(
      state.winner
        ? "원정이 종료되었습니다. 새 원정을 시작하세요."
        : turnText(),
    );
    return;
  }
  if (state.mode === "online") {
    socket.send(JSON.stringify({ type: "action", action: a }));
    return;
  }
  const result = act(state, a);
  if (!result.ok) {
    if (!automated) notify(result.error);
    return;
  }
  if (result.selected) selected = result.selected;
  sound(a.type);
  render();
  if (!automated && a.type === "recruit")
    notify(`${UNITS[a.unit].name}이 전장에 합류했습니다.`);
  if (!automated && a.type === "build")
    notify("전초기지 건설 완료 · 생산량 2배 · 승리 점수 +1");
  scheduleAI();
}
function scheduleAI() {
  clearTimeout(aiTimer);
  if (state.mode === "ai" && state.current === "red" && !state.winner)
    aiTimer = setTimeout(() => command(aiAction(state), true), 620);
}
function selectTile(k) {
  const available = canControl()
    ? options(state, selected)
    : { moves: [], attacks: [] };
  if (available.moves.includes(k)) {
    command({ type: "move", from: selected, to: k });
    return;
  }
  if (available.attacks.includes(k)) {
    command({ type: "attack", from: selected, to: k });
    return;
  }
  selected = k;
  sound();
  renderBoard();
  renderInspector();
  renderRecruit();
}
$("#board").addEventListener("click", (e) => {
  const t = e.target.closest("[data-tile]");
  if (t) selectTile(t.dataset.tile);
});
$("#board").addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    const t = e.target.closest("[data-tile]");
    if (t) {
      e.preventDefault();
      const k = t.dataset.tile;
      selectTile(k);
      $(`[data-tile="${k}"]`)?.focus({ preventScroll: true });
    }
  }
});
$("#turnControl").addEventListener("click", (e) => {
  if (e.target.closest("#endTurn")) command({ type: "end" });
});
$("#recruitList").addEventListener("click", (e) => {
  const b = e.target.closest("[data-recruit]");
  if (b && !b.disabled)
    command({ type: "recruit", unit: b.dataset.recruit, tile: selected });
});
$("#inspector").addEventListener("click", (e) => {
  const b = e.target.closest("[data-command]");
  if (b && !b.disabled) command({ type: b.dataset.command, tile: selected });
});
$("#zoomIn").onclick = () => {
  zoom = Math.min(1.4, Math.round((zoom + 0.1) * 10) / 10);
  renderBoard();
};
$("#zoomOut").onclick = () => {
  zoom = Math.max(0.8, Math.round((zoom - 0.1) * 10) / 10);
  renderBoard();
};
$("#fullscreenButton").onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if ($("#battlefield").requestFullscreen)
      await $("#battlefield").requestFullscreen();
    else notify("이 브라우저는 전체 화면을 지원하지 않습니다.");
  } catch {
    notify("전체 화면 전환을 사용할 수 없습니다.");
  }
};
$("#soundButton").onclick = () => {
  soundEnabled = !soundEnabled;
  writeStore("hexa-crown-sound", soundEnabled);
  sound();
  render();
};
$("#battleTab").onclick = () =>
  $("#battlefield").scrollIntoView({ behavior: "smooth", block: "center" });

function openDialog(title, body, kind = "") {
  dialogKind = kind;
  $("#modalContent").innerHTML =
    `<div class="modal-header"><h2>${title}</h2><button class="icon-button" id="closeDialog" aria-label="닫기">${icon("close")}</button></div><div class="modal-body">${body}</div>`;
  if (!modal.open) modal.showModal();
  $("#closeDialog").onclick = () => modal.close();
}
modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    const r = modal.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      modal.close();
  }
});
modal.addEventListener("close", () => {
  dialogKind = "";
});
function showRules() {
  openDialog(
    "사령관의 전쟁 지침서",
    `<p>37개의 육각 영토 위에서 군단을 지휘하세요. 영토를 점령하고, 자원을 확보하며, 아르덴의 왕관에 다가갑니다.</p><h3>한 턴의 흐름</h3><ol><li><b>자원 수급</b> — 턴 시작 시 주사위 2개를 자동으로 굴립니다. 합계와 같은 숫자의 점령지에서 양쪽 군단이 자원을 받습니다. 7이 나오면 양쪽에 식량·목재가 1씩 보급됩니다.</li><li><b>군단 지휘</b> — 아군 말을 선택한 뒤 표시된 칸을 눌러 이동·점령하세요. 부대마다 이동 1회, 공격 1회가 가능합니다. 공격하면 남은 이동은 끝납니다.</li><li><b>보급과 확장</b> — 부대를 모집하고 전초기지를 건설하세요. 자원이 충분하면 한 턴에 여러 번 가능합니다.</li><li><b>턴 종료</b> — 상대 군단이 지휘를 시작합니다.</li></ol><h3>군단과 상성</h3><table><thead><tr><th>병종</th><th>체력</th><th>공격</th><th>이동</th><th>사거리</th></tr></thead><tbody>${Object.values(
      UNITS,
    )
      .map(
        (u) =>
          `<tr><td>${u.name}</td><td>${u.hp}</td><td>${u.attack}</td><td>${u.move}</td><td>${u.range}</td></tr>`,
      )
      .join(
        "",
      )}</tbody></table><p>장궁병 → 보병 +2 / 기병 → 궁병·투석기 +2 / 투석기 → 건물 주둔군 +3. 숲은 방어 +1, 산은 +2, 건물은 추가 +1입니다. 피해는 최소 2. 인접 공격에서 생존한 수비군은 공격력의 60%로 반격합니다.</p><h3>영토와 보급</h3><ul><li>새 영토를 점령하면 해당 자원을 즉시 1 획득합니다.</li><li>본성과 전초기지는 자원 생산량이 2배입니다.</li><li>전초기지: 목재 2 · 철광 1 · 황금 1. 빈 아군 영토에 건설합니다.</li><li>재보급: 식량 1로 체력 4를 회복합니다.</li><li>교역소: 식량·목재·철광 중 3개를 황금 1로 교환합니다.</li><li>기병은 아군 부대를 통과할 수 있으나 적이나 호수를 통과할 수 없습니다.</li></ul><h3>승리 조건</h3><p>영토 3칸마다 1점, 황금 광산마다 1점, 전초기지마다 1점, 본성마다 2점. 먼저 10점에 도달하거나 적 본성을 점령하면 승리합니다.</p>`,
    "rules",
  );
}
$("#guideButton").onclick = showRules;
function showTrade() {
  const side = ownSide();
  openDialog(
    "왕국의 보급 교역소",
    `<p>보유한 자원 3개를 황금 1개로 교환합니다.</p>${["food", "wood", "iron"].map((r) => `<button class="trade-option" data-trade="${r}" ${!canControl() || state.resources[side][r] < 3 ? "disabled" : ""}><span>${icon(r)} ${RESOURCES[r]} 3 <small class="muted">보유 ${state.resources[side][r]}</small></span><span>${icon("arrow")} ${icon("gold")} 황금 1</span></button>`).join("")}`,
    "trade",
  );
  $$("[data-trade]").forEach(
    (b) =>
      (b.onclick = () => {
        command({ type: "trade", resource: b.dataset.trade });
        if (state.mode === "online") modal.close();
        else showTrade();
      }),
  );
}
$("#tradeButton").onclick = showTrade;
function startNew(mode = "ai") {
  clearTimeout(aiTimer);
  leaveOnline();
  state = createGame(mode);
  selected = "-2,0";
  lastWinner = null;
  zoom = 1;
  modal.close();
  render();
  notify("새로운 원정이 시작되었습니다.");
}
function showModes() {
  openDialog(
    "어떤 원정을 떠나시겠습니까?",
    `<p>새로운 원정을 시작하면 현재 기기의 AI·교대 대전 저장을 대체합니다.</p><div class="mode-cards"><button class="mode-card" data-mode="ai">${icon("sword")}<span><strong>AI 사령관과 대전</strong><small>푸른 사자 군단을 이끌고 붉은 독수리에 맞서세요.</small></span></button><button class="mode-card" data-mode="local">${icon("people")}<span><strong>둘이서 교대 대전</strong><small>한 화면에서 두 사령관이 번갈아 군단을 지휘합니다.</small></span></button><button class="mode-card" data-mode="online">${icon("globe")}<span><strong>온라인 대전</strong><small>대전방을 만들고 친구에게 방 코드를 전하세요.</small></span></button></div>`,
    "modes",
  );
  $$("[data-mode]").forEach(
    (b) =>
      (b.onclick = () =>
        b.dataset.mode === "online" ? showOnline() : startNew(b.dataset.mode)),
  );
}
$("#modeButton").onclick = () =>
  state.mode === "online" ? showOnline() : showModes();
$("#newGameButton").onclick = showModes;
$("#onlineButton").onclick = showOnline;
function showVictory() {
  if (!state.winner) return;
  openDialog(
    "아르덴의 새로운 왕",
    `<div class="victory-art">${crest(state.winner)}</div><div class="victory-copy">${FACTIONS[state.winner].name} 군단의 승리</div><p style="text-align:center;margin-top:14px">${state.reason}<br>${state.turn}라운드 · ${score(state, state.winner).territory}개 영토 · ${score(state, state.winner).vp} VP</p><div class="modal-actions"><button class="btn" id="reviewMap">전장 살펴보기</button><button class="btn primary" id="nextCampaign">새 원정 시작 ${icon("arrow")}</button></div>`,
    "victory",
  );
  $("#reviewMap").onclick = () => modal.close();
  $("#nextCampaign").onclick = showModes;
}

function leaveOnline() {
  clearTimeout(retryTimer);
  network = null;
  if (socket) {
    socket.onclose = null;
    socket.close();
    socket = null;
  }
  try {
    sessionStorage.removeItem("hexa-crown-room");
  } catch {}
  $("#connectionNotice").classList.add("hidden");
}
function connect(message) {
  if (!serverMode) { showOnline(); return; }
  clearTimeout(retryTimer);
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
    return;
  }
  if (socket) {
    socket.onclose = null;
    socket.close();
  }
  socket = new WebSocket(
    `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/play`,
  );
  socket.onopen = () => {
    retries = 0;
    socket.send(JSON.stringify(message));
  };
  socket.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.type === "seat") {
      network = { ...network, code: m.code, side: m.side, token: m.token };
      writeStore(
        "hexa-crown-room",
        { code: m.code, token: m.token },
        "sessionStorage",
      );
      selected = m.side === "blue" ? "-2,0" : "2,0";
      return;
    }
    if (m.type === "error") {
      if (m.resumeFailed) {
        leaveOnline();
        state = validSave(saved) ? saved : createGame();
        render();
      }
      const err = $("#onlineError");
      if (err) err.textContent = m.message;
      notify(m.message);
      return;
    }
    if (m.type === "state") {
      clearTimeout(aiTimer);
      const previous = state.current;
      state = m.state;
      network = {
        ...network,
        code: m.code,
        side: m.side,
        connected: m.connected,
      };
      if (m.actor === m.side && m.action?.type !== "end" && m.selected)
        selected = m.selected;
      if (previous !== state.current && state.current === network.side)
        selected = key(
          state.tiles.find((t) => t.unit?.owner === network.side) ||
            state.tiles[0],
        );
      $("#connectionNotice").classList.toggle(
        "hidden",
        m.connected.blue && m.connected.red,
      );
      $("#connectionNotice").textContent =
        "상대 사령관의 접속을 기다리고 있습니다. 방 코드를 공유하세요.";
      render();
      if (m.action) sound(m.action.type);
      if (dialogKind === "online") showOnline();
    }
  };
  socket.onclose = (e) => {
    if (e.code === 4000) {
      leaveOnline();
      notify("이 방을 다른 창에서 열었습니다.");
      state = createGame();
      render();
      return;
    }
    if (network) {
      network.connected = { blue: false, red: false };
      render();
      $("#connectionNotice").classList.remove("hidden");
      $("#connectionNotice").textContent =
        "서버 연결이 끊어졌습니다. 자동으로 다시 연결합니다.";
      retryTimer = setTimeout(
        () =>
          connect({ type: "resume", code: network.code, token: network.token }),
        Math.min(1000 * 2 ** retries++, 15000),
      );
    } else {
      const err = $("#onlineError");
      if (err)
        err.textContent =
          "서버에 연결하지 못했습니다. 서버 실행 상태를 확인하세요.";
    }
  };
  socket.onerror = () => {};
}
function showOnline() {
  if (!serverMode) {
    openDialog(
      "함께 플레이하기",
      `<p>이 파일에서는 설치 없이 AI 대전과 같은 기기의 2인 교대 대전을 즐길 수 있습니다.</p><p>서로 다른 기기에서 온라인으로 대전하려면 서버로 실행한 게임에 접속하세요. 프로젝트 폴더에서 <code>npm ci</code> 후 <code>npm start</code>로 서버를 실행할 수 있습니다.</p><div class="modal-actions"><button class="btn" id="continueOffline">현재 원정 계속</button><button class="btn primary" id="localMatch">새 2인 교대 대전 ${icon("people")}</button></div>`,
      "offline-online-help",
    );
    $("#continueOffline").onclick = () => modal.close();
    $("#localMatch").onclick = () => startNew("local");
    return;
  }
  if (state.mode === "online" && network) {
    openDialog(
      "함께하는 아르덴 원정",
      `<p>같은 서버 주소에 접속한 친구에게 아래 방 코드를 전달하세요. 당신은 <b>${FACTIONS[network.side].name}</b> 군단입니다.</p><div class="room-code">${network.code}</div><div class="room-status"><i class="status-dot"></i>${network.connected?.blue && network.connected?.red ? "두 사령관이 준비되었습니다." : "상대 사령관의 접속을 기다리고 있습니다."}</div><div class="modal-actions"><button class="btn" id="copyRoom">${icon("link")}초대 링크 복사</button><button class="btn primary" id="returnBattle">전장으로 ${icon("arrow")}</button></div><p class="inline-error" id="onlineError"></p><p style="font-size:10px;margin:12px 0 0">방은 서버가 실행되는 동안 유지됩니다. 연결이 끊기면 상대가 돌아올 때까지 전투가 일시 정지됩니다.</p>`,
      "online",
    );
    $("#returnBattle").onclick = () => modal.close();
    $("#copyRoom").onclick = async () => {
      const u = new URL(location.href);
      u.searchParams.set("room", network.code);
      try {
        await navigator.clipboard.writeText(u.href);
        notify("초대 링크를 복사했습니다.");
      } catch {
        notify(`방 코드: ${network.code}`);
      }
    };
    return;
  }
  openDialog(
    "온라인 원정에 참가하기",
    `<p>같은 서버에 접속한 두 사령관이 실시간으로 턴을 주고받습니다. 새로운 방을 만들거나 친구의 코드를 입력하세요.</p><button class="btn primary" id="createRoom" style="width:100%">${icon("plus")}새 대전방 만들기</button><h3>초대받은 원정 참가</h3><form class="room-form" id="joinForm"><input id="roomInput" aria-label="대전방 코드" placeholder="6자리 방 코드" maxlength="6" pattern="[A-Fa-f0-9]{6}" required autocomplete="off"><button class="btn" type="submit">참가 ${icon("arrow")}</button></form><div class="inline-error" id="onlineError" role="status"></div>`,
    "online",
  );
  $("#createRoom").onclick = () => connect({ type: "create" });
  $("#joinForm").onsubmit = (e) => {
    e.preventDefault();
    connect({ type: "join", code: $("#roomInput").value.trim().toUpperCase() });
  };
}

render();
scheduleAI();
let resizeFrame;
window.addEventListener("resize", () => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(renderBoard);
});
const roomSession = serverMode ? readStore("hexa-crown-room", "sessionStorage") : null,
  invite = new URLSearchParams(location.search).get("room");
if (roomSession?.code && roomSession?.token) {
  clearTimeout(aiTimer);
  connect({ type: "resume", ...roomSession });
} else if (serverMode && invite && /^[0-9a-f]{6}$/i.test(invite)) {
  showOnline();
  $("#roomInput").value = invite.toUpperCase();
}
