// Original vector illustrations, drawn for HEXA CROWN. No remote image assets.
export const icons = {
  crown: '<path d="m3 7 5 4 4-7 4 7 5-4-2 12H5Z"/><path d="M6 16h12"/>',
  sword:
    '<path d="m15 3 6 0 0 6-11 11-6-6Z"/><path d="m3 13 8 8M7 17l-4 4M15 3l6 6"/>',
  shield:
    '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="M12 7v9M8 11h8"/>',
  flag: '<path d="M5 22V3m0 1c5-4 9 4 15 0v10c-6 4-10-4-15 0"/>',
  food: '<path d="M12 22V5m0 9C5 14 5 8 5 8s7 0 7 6Zm0-5C6 9 7 3 7 3s5 1 5 6Zm0 9c7 0 7-6 7-6s-7 0-7 6Zm0-9c6 0 5-6 5-6s-5 1-5 6Z"/>',
  wood: '<path d="m12 2-6 8h3l-5 7h16l-5-7h3Z"/><path d="M12 17v5M8 22h8"/>',
  iron: '<path d="m3 17 5-9 7-4 6 13-5 4H8Z"/><path d="m8 8 5 5 2-9m-2 9 8 4m-8-4L8 21"/>',
  gold: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 4 16 4 16 0V6M4 12c0 4 16 4 16 0"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  volume: '<path d="m11 4-6 5H2v6h3l6 5Zm5 4c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',
  mute: '<path d="m11 4-6 5H2v6h3l6 5Zm5 5 6 6m-6 0 6-6"/>',
  book: '<path d="M12 5C8 2 3 3 3 3v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2Zm0 0v16"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  reset: '<path d="M3 10a9 9 0 1 1 1 8M3 4v6h6"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  link: '<path d="m10 7 3-3a5 5 0 0 1 7 7l-4 4M14 17l-3 3a5 5 0 0 1-7-7l4-4m0 8 8-8"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  health: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z"/>',
  castle: '<path d="M3 21V7h4v3h3V3h4v7h3V7h4v14ZM10 21v-6h4v6"/>',
  target:
    '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3"/>',
  move: '<path d="M12 3v18M3 12h18M8 7l4-4 4 4M8 17l4 4 4-4M7 8l-4 4 4 4m10-8 4 4-4 4"/>',
  trade: '<path d="M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4"/>',
  people:
    '<circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4M16 4a3 3 0 0 1 0 6m2 4c4 0 4 4 4 7"/>',
  hourglass: '<path d="M5 3h14M5 21h14M7 3v4l10 10v4M17 3v4L7 17v4"/>',
  leaf: '<path d="M5 19C-2 7 12 3 21 3c0 10-4 19-16 16ZM5 19 16 8"/>',
};
export const icon = (name, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.flag}</svg>`;
export function crest(owner = "blue", cls = "") {
  const blue = owner === "blue";
  return `<svg class="crest ${cls}" viewBox="0 0 60 70" aria-hidden="true"><path d="M5 5 30 1 55 5v30c0 17-25 32-25 32S5 52 5 35Z" fill="${blue ? "#295865" : "#854b42"}" stroke="#b49b60" stroke-width="2"/><path d="M10 10 30 6l20 4v25c0 12-20 26-20 26S10 47 10 35Z" fill="none" stroke="#d5c28b" stroke-opacity=".45"/>${blue ? '<path d="m23 20 1-6 6 3 5-3 3 7-4 5 5 6-4 6 5 7 5 2-1 5-9-3-4-8-4 5-7 5-5-1 1-4 6-2 3-8-5-5-3-2-1-7 3-5 3 3-1 4 4 2 5-5-5-1Z" fill="#dfc98d"/><path d="M35 32c16-11 15 13 7 8" fill="none" stroke="#dfc98d" stroke-width="3"/>' : '<path d="m30 16 5 7 12-5-4 10 7 4-13 5 7 7-10-2-4 11-4-11-10 2 7-7-13-5 7-4-4-10 12 5Z" fill="#dfc98d"/>'}<path d="m27 10 3 2 3-2" fill="none" stroke="#e0cb92"/></svg>`;
}
export const defs = `<defs>
 <linearGradient id="steel" x1="0" x2="1"><stop stop-color="#687a7c"/><stop offset=".45" stop-color="#e0e5d9"/><stop offset=".6" stop-color="#acbcb7"/><stop offset="1" stop-color="#526669"/></linearGradient>
 <linearGradient id="horse" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e6dfc6"/><stop offset="1" stop-color="#928d79"/></linearGradient>
 <linearGradient id="cloth-blue" x1="0" x2="1" y2="1"><stop stop-color="#69a6ac"/><stop offset="1" stop-color="#245364"/></linearGradient>
 <linearGradient id="cloth-red" x1="0" x2="1" y2="1"><stop stop-color="#cb8770"/><stop offset="1" stop-color="#783e3b"/></linearGradient>
 <linearGradient id="stone" x1="0" x2="1"><stop stop-color="#e4d7b3"/><stop offset="1" stop-color="#9d947a"/></linearGradient>
 <linearGradient id="gold" x1="0" x2="1" y2="1"><stop stop-color="#ead69b"/><stop offset=".5" stop-color="#b9964f"/><stop offset="1" stop-color="#806c3e"/></linearGradient>
 <filter id="shadow" x="-40%" y="-40%" width="180%" height="200%"><feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#102d29" flood-opacity=".3"/></filter>
 <pattern id="waves" width="56" height="38" patternUnits="userSpaceOnUse"><path d="M4 19q6-5 12 0t12 0M37 3q5-4 10 0M34 33q6-5 12 0" fill="none" stroke="#c1dac5" stroke-opacity=".09" stroke-width="1"/></pattern>
 <pattern id="grain" width="19" height="17" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r=".6" fill="#fff" opacity=".11"/><circle cx="12" cy="10" r=".5" fill="#132f29" opacity=".14"/><path d="M6 14h2M15 3h2" stroke="#15362a" opacity=".09"/></pattern>
 <symbol id="pine" viewBox="0 0 30 48"><path d="M14 34h3v13h-3" fill="#6e6850"/><path d="m15 1-10 19h5L1 35l14 7 14-7-9-15h5Z" fill="#305d4b"/><path d="m15 1 0 41 14-7-9-15h5Z" fill="#244d42"/><path d="m15 3-7 15 7-3m-2 7-8 12 10-4" fill="#54806a"/></symbol>
 <symbol id="mountain" viewBox="0 0 70 60"><path d="M1 54 28 4l17 22 7-8 17 36-35 5Z" fill="#707f79"/><path d="m28 4 6 55 35-5-17-36-7 8Z" fill="#536b65"/><path d="m28 4-11 21 9-4 6 7 4-7 9 5Z" fill="#e2dfcb"/><path d="m28 4 4 24 4-7 9 5Z" fill="#bac9be"/><path d="m52 18-7 8 10 13 3-10Z" fill="#c8d0bf"/><path d="m15 38-5 12 14-4m18-5 8 9" fill="none" stroke="#9baa97" stroke-width="1"/></symbol>
 <symbol id="wheat" viewBox="0 0 35 40"><path d="m10 37 8-29m4 31 3-25M2 32l8-22" stroke="#8a8145" fill="none" stroke-width="1.3"/><g fill="#e3cf81" stroke="#9e914c" stroke-width=".5"><path d="M17 15C9 13 13 7 17 15Zm1-3c-4-6 3-10 0 0Zm-3 10c-8-2-4-9 0 0Zm3-5c7-3 5-8 0 0Zm-1 6c7-3 5-8 0 0ZM8 17c-7-1-4-8 0 0Zm2-6c-4-6 3-10 0 0ZM6 23c-7-1-4-8 0 0Zm2-5c7-3 5-8 0 0Zm17 5c-6-3-4-8 0 0Zm0-5c-4-6 3-10 0 0Zm0 12c7-4 4-9 0 0Z"/></g></symbol>
 </defs>`;
export function unitArt(type, owner = "blue") {
  const cloth = `url(#cloth-${owner})`;
  const common = `stroke="#344c4b" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"`;
  const base = `<ellipse cx="79" cy="141" rx="53" ry="10" fill="#213e37" opacity=".12"/><path d="M29 135q50 15 101 0v8q-50 18-101 0Z" fill="#746d50" stroke="#4c5948"/><ellipse cx="79" cy="135" rx="50" ry="10" fill="#a4a989" stroke="#616c55"/><ellipse cx="79" cy="133" rx="44" ry="7" fill="#b9bea0"/>`;
  let figure = "";
  if (type === "knight")
    figure = `<g ${common}>
 <path d="M117 76q22-8 18 12l-4 25 8 7q-17 3-16-14l-1-17" fill="#59615a"/>
 <path d="m52 99-5 17-9 13 9 3 15-17 6-19m32-1 9 17-3 17h9l5-22-9-22" fill="#9f9e8b"/>
 <path d="M46 72q5-17 14-19l13 19 31 1q19 2 18 20l-5 15-47-3-12-13-7 12-5 24h-9l2-27-1-16-11-3-1-8 8-8 4-15 7 9Z" fill="url(#horse)"/>
 <path d="m42 53 4-11 5 14m-9 11-6 7 12 5 4-11" fill="#d5d9c5"/>
 <path d="m49 54 8 2 12 21-7 9-7-18-7-2" fill="#52635d"/>
 <path d="m38 78 9 2 14-5m-21-5 11 1" fill="none" stroke="#645c45" stroke-width="2"/>
 <circle cx="42" cy="68" r="1.5" fill="#243e3d" stroke="none"/>
 <path d="M66 78q19-12 43-2l8 29-19 11-34-10-6-15Z" fill="${cloth}"/><path d="m68 99 30 10 15-7" fill="none" stroke="#dac083" stroke-width="3"/>
 <path d="m78 65 5 20 10 21-7 15 10 2 9-19-9-26-1-16" fill="url(#steel)"/><path d="m86 121-3 6h15l-2-5" fill="#4f5b57"/>
 <path d="m74 39 17-4 16 32-24 10-17-21Z" fill="${cloth}"/><path d="m90 37 13 1 13 38-17-9" fill="${cloth}"/>
 <path d="m78 43-8 16-13 11 5 4 18-9 7-16" fill="url(#steel)"/>
 <path d="m93 44-9 7 2 18 10 7 10-9-2-20Z" fill="#346170" stroke="#d4bd7c" stroke-width="2"/><path d="m96 51-2 5-5 1 5 4 1 7 3-7 4-4-5-1Z" fill="#d4bd7c" stroke="none"/>
 <path d="m77 22 12-6 12 8-1 15-9 8-12-8Z" fill="url(#steel)"/><path d="m80 29 18-2-1 8-16 2Z" fill="#354f50"/><path d="m88 28 1 9m3-10 1 9" stroke="#c6d2c6"/><path d="M87 17q-2-16 12-14l12 12-13-3-5 7" fill="${cloth}"/>
 <path d="m59 72 5-59" stroke="#907745" stroke-width="2.5"/><path d="m64 14-3-10 5-4 2 13" fill="url(#steel)"/><path d="M65 16q12-5 22 3l-8 6 8 5-22-2Z" fill="${cloth}" stroke="#cbb677" stroke-width="1"/>
 </g>`;
  else if (type === "infantry" || type === "archer")
    figure = `<g ${common}>
 <path d="m69 91-6 34-9 5 2 5h19l5-42m14-2 7 34 8 5-1 5H92l-9-39" fill="url(#steel)"/>
 <path d="m62 54 24-13 18 13-4 36 7 19-45 0 5-23Z" fill="${cloth}"/><path d="m68 99 30 0" stroke="#d9c38d" stroke-width="3"/><path d="m71 54 2 27 20 0 5-27" fill="url(#steel)"/>
 <path d="m63 55-11 21 10 13 7-7-6-8 9-15m25-5 11 19-9 16-7-6 5-12-7-15" fill="url(#steel)"/>
 <path d="m72 26 11-6 12 6 3 16-13 13-14-12Z" fill="url(#steel)"/><path d="m73 35 22-2-1 6-20 2Z" fill="#344e4e"/><path d="m84 34 1 14" stroke="#d6dfd0"/><path d="M80 21q-8-12 6-17l12 14-12-3-1 7" fill="${cloth}"/>
 ${type === "infantry" ? `<path d="m46 103 8-87m-1 1-3-13 6-4 3 16Z" fill="url(#steel)" stroke="#8b794f" stroke-width="2"/><path d="m86 64 23-4 5 28-17 18-15-15Z" fill="${cloth}" stroke="#d6c18a" stroke-width="3"/><path d="m97 69 1 25m-9-15 16-3" stroke="#d6c18a" stroke-width="3"/>` : '<path d="M110 46q33 34-6 65l7-33Z" fill="none" stroke="#b29963" stroke-width="4"/><path d="m110 46-15 33 9 32M80 80h47m-4-3 5 3-5 3" fill="none" stroke="#dfd3a7" stroke-width="1.3"/>'}
 </g>`;
  else
    figure = `<g ${common}><path d="m40 113 69-2 16 16-71 5Z" fill="#66563d"/><path d="m61 115 20-76 23 76m-38-15 30 0" fill="none" stroke="#ab9161" stroke-width="9"/><path d="m52 34 70 61" stroke="#d0b17b" stroke-width="7"/><path d="m53 33-13 33 23 8 10-23Z" fill="url(#stone)"/><path d="m122 95 12 8-5 10-12-6Z" fill="#796c51"/><path d="m86 46 12-22 9 3" fill="none" stroke="#ccb886"/><path d="m82 44 5-5" stroke="#57665b" stroke-width="5"/><circle cx="60" cy="128" r="14" fill="#86744e"/><circle cx="112" cy="124" r="14" fill="#86744e"/><g stroke="#ccb581" stroke-width="2"><path d="M60 115v26m-13-13h26m-22-9 18 18m0-18-18 18M112 111v26m-13-13h26m-22-9 18 18m0-18-18 18"/></g><circle cx="60" cy="128" r="3" fill="#48584f"/><circle cx="112" cy="124" r="3" fill="#48584f"/><path d="m83 47 0 42 16-4-2-35Z" fill="${cloth}" stroke="#d3b77c"/></g>`;
  return base + figure;
}
export function unitSvg(type, owner = "blue", cls = "") {
  return `<svg class="unit-art ${cls}" viewBox="0 0 160 158" role="img" aria-label="${{ knight: "기병", infantry: "보병", archer: "궁병", siege: "투석기" }[type]} 말 일러스트">${unitArt(type, owner)}</svg>`;
}
export function castleArt(owner = "blue", small = false) {
  return `<g stroke="#6b715b" stroke-width="1.1" stroke-linejoin="round"><ellipse cx="0" cy="20" rx="31" ry="10" fill="#435d43" opacity=".18"/><path d="m-25-2 24-10 27 10v24L0 32l-25-10Z" fill="url(#stone)"/><path d="M0-12v44l26-10V-2Z" fill="#b1aa8c"/><path d="m-24-2 24 9 26-9M-16 1v19m8-15v20m16-20v20m9-24v19" fill="none" opacity=".35"/><path d="m-29-21 12-4 9 5v30l-9 5-12-5Zm42 1 11-5 9 5v30l-9 5-11-5Z" fill="url(#stone)"/><path d="m-29-21 0-8 5-2v6l5-1v-6l5 2v6l6-2v6-1m21 1v-8l5-2v6l5-1v-6l5 2v6l5-2v7" fill="url(#stone)"/><path d="m-9-19 9-5 10 5v22L0 8-9 3Z" fill="url(#stone)"/><path d="m-14-19 14-19 15 19-15 6Z" fill="${owner === "blue" ? "#3c7480" : "#a3604d"}"/><path d="M0-37v-16l16 4-16 5" fill="${owner === "blue" ? "#72b2bd" : "#d08b6c"}"/><path d="M-5 29V16q5-8 10 0v13" fill="#4c5d50"/><path d="M-23-14v7m45-7v7M0-9v6" stroke="#536550" stroke-width="3"/>${small ? '<path d="m-5-29 5-4 6 4" fill="none"/>' : ""}</g>`;
}
export function terrainArt(t) {
  const variant = Math.abs(t.q * 7 + t.r * 3) % 3;
  if (t.terrain === "water")
    return '<g fill="none" stroke="#b4d0be" stroke-width="1.4" opacity=".55"><path d="M-29-10q9-5 18 0t18 0M-13 5q9-5 18 0t18 0M-32 17q9-5 18 0t18 0"/></g>';
  if (t.terrain === "forest")
    return `<g opacity=".96"><use href="#pine" x="-32" y="-29" width="25" height="40"/><use href="#pine" x="-4" y="-38" width="30" height="48"/><use href="#pine" x="-18" y="-17" width="28" height="45"/><use href="#pine" x="17" y="-14" width="22" height="35"/></g>`;
  if (t.terrain === "hills")
    return `<use href="#mountain" x="-34" y="-35" width="68" height="58"/><path d="m-33 29 16-4 8 2m22-6 17 6" fill="none" stroke="#ccd3b8" opacity=".6"/>`;
  if (t.terrain === "gold")
    return '<g stroke="#9c844d" stroke-width="1"><path d="m-32 21 12-30 25-13 24 41Z" fill="#bca064"/><path d="m5-22-3 36 27 5" fill="#a18f61"/><path d="m-16 20 3-20 17-8 12 11 1 17" fill="#555d48"/><path d="m-18 22 2-24 20-9 15 12 1 21" fill="none" stroke="#e2c282" stroke-width="4"/><path d="m-11 20 5-7 7 4 3-9 7 8 4 5Z" fill="#ebcf71"/><path d="m-8 27 10-5 14 5-11 5Z" fill="#e3c875"/><path d="m-30 6 6-6 5 5-6 5m35-9 7-5 4 9-8 1" fill="#e4c678"/></g>';
  return `<g><path d="m-36 10 24-21 41 13-23 25Z" fill="#a9a665" opacity=".65"/><path d="m-28 10 18-16m-12 21 20-18m-13 23 22-19m-14 23 22-19m-14 22 22-19" stroke="#dbd39a" stroke-width="2.5" opacity=".65"/><use href="#wheat" x="-27" y="-24" width="31" height="35"/><use href="#wheat" x="3" y="${-19 + variant * 3}" width="28" height="32"/><path d="M-36 25h7m51-38h6" stroke="#8e9b65"/></g>`;
}
export function diceSvg(n) {
  const dots = {
    1: [[12, 12]],
    2: [
      [7, 7],
      [17, 17],
    ],
    3: [
      [7, 7],
      [12, 12],
      [17, 17],
    ],
    4: [
      [7, 7],
      [17, 7],
      [7, 17],
      [17, 17],
    ],
    5: [
      [7, 7],
      [17, 7],
      [12, 12],
      [7, 17],
      [17, 17],
    ],
    6: [
      [7, 6],
      [17, 6],
      [7, 12],
      [17, 12],
      [7, 18],
      [17, 18],
    ],
  };
  return `<svg viewBox="0 0 24 24" aria-label="주사위 ${n}"><rect x="1" y="1" width="22" height="22" rx="4" fill="#f3ecd8" stroke="#cbbd97"/>${dots[n].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="#34574e"/>`).join("")}</svg>`;
}
