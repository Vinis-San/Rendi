// Vinheta do Sanguina (16:9, 15 s): gravuras recortadas em tinta sobre branco, elementos pintados em sanguina,
// caligrafia que se escreve e se transforma, cortes rápidos com zoom no ponto vermelho. Fecha no logo.
/* global FPS, iv, spring, ease */

const W = 1920, H = 1080;
const C = { fundo: "#faf8f3", tinta: "#16151f", muted: "#6b6575", san: "#c0432b", fio: "#d9d1c3" };
const F = { cali: "'Pinyon Script', cursive", disp: "'Big Shoulders Display', sans-serif", mono: "'IBM Plex Mono', monospace", serif: "'Cormorant Garamond', serif" };
const DUR = 15;
// Cada plano: [início (s), tipo, dados]
const PLANOS = [
  [0.0, "escreve", { texto: "Sanguina" }],
  [3.1, "mergulho", {}],
  [3.7, "prancha", { img: "vesalius-174", foco: [0.52, 0.34], anota: "musculus", rot: "FIG. I · VESALIUS · 1543" }],
  [4.35, "prancha", { img: "maos-durer", foco: [0.5, 0.42], anota: "manus", rot: "FIG. II · DÜRER · 1508" }],
  [5.0, "prancha", { img: "vesalius-190", foco: [0.5, 0.3], anota: "sceleton", rot: "FIG. III · VESALIUS · 1543" }],
  [5.65, "prancha", { img: "vitruviano", foco: [0.5, 0.42], anota: "proportio", rot: "FIG. IV · LEONARDO · c. 1490" }],
  [6.4, "mosaico", {}],
  [8.5, "morfa", { palavras: ["pensar", "agir", "agora"] }],
  [12.3, "ponto", {}],
  [13.0, "logo", {}],
];
const IMGS = ["vesalius-174", "maos-durer", "vesalius-190", "vitruviano"];

const abs = (st, h = "") => `<div style="position:absolute;${st}">${h}</div>`;
const svg = (h, st = "") => `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;inset:0;${st}">${h}</svg>`;
const rot = (t, cor = C.muted) => `<div style="font:500 22px ${F.mono};letter-spacing:.22em;text-transform:uppercase;color:${cor}">${t}</div>`;
// Traço pintado à mão: um círculo de compasso que se desenha (com leve tremor para parecer pincel).
const circulo = (cx, cy, r, p, larg = 8) => {
  const pts = []; const n = 90;
  for (let i = 0; i <= n * p; i++) { const a = -Math.PI / 2 + (i / n) * Math.PI * 2.08; const rr = r * (1 + 0.012 * Math.sin(i * 0.7)); pts.push(`${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`); }
  return pts.length > 1 ? `<polyline points="${pts.join(" ")}" fill="none" stroke="${C.san}" stroke-width="${larg}" stroke-linecap="round" stroke-linejoin="round" opacity=".92"/>` : "";
};
const pena = (x, y, ang = -35) => `<g transform="translate(${x} ${y}) rotate(${ang})">
  <path d="M0 0 L14 -40 C 40 -150 120 -330 210 -430 C 160 -300 90 -150 30 -36 Z" fill="${C.tinta}"/>
  <path d="M14 -40 C 60 -170 130 -320 210 -430" stroke="${C.fundo}" stroke-width="3" fill="none"/>
  ${Array.from({ length: 14 }, (_, i) => `<line x1="${30 + i * 12}" y1="${-70 - i * 26}" x2="${80 + i * 10}" y2="${-90 - i * 28}" stroke="${C.fundo}" stroke-width="2"/>`).join("")}
  <path d="M0 0 L7 -18 L14 -40 L10 -20 Z" fill="${C.san}"/></g>`;

const R = {
  escreve(f, d, o) {
    // a pena escreve da esquerda para a direita: máscara revela o texto; a ponta segue a revelação
    const p = iv(f, 6, 70, 0, 1, (x) => x), x0 = 520, x1 = 1420, xp = x0 + (x1 - x0) * p;
    const yp = 560 + Math.sin(f * 0.9) * 26 + Math.sin(f * 0.37) * 14;
    const cr = iv(f, 66, 88, 0, 1, ease.inOutC);
    return abs(`left:0;right:0;top:330px;text-align:center;clip-path:inset(0 ${W - xp}px 0 0)`, `<span style="font:400 300px/1 ${F.cali};color:${C.tinta}">${o.texto}</span>`) +
      svg(circulo(990, 520, 330, cr, 9) + (p < 1 ? pena(xp, yp) : pena(x1 + 40 * iv(f, 70, 90), yp - 300 * iv(f, 70, 90))) +
        `<circle cx="1328" cy="372" r="${16 * spring(f, 84, "quica")}" fill="${C.san}"/>`) +
      abs(`left:0;right:0;top:880px;text-align:center;opacity:${iv(f, 50, 66)}`, rot("caderno de filosofia · ação · agora"));
  },
  mergulho(f) {
    // o ponto vermelho cresce e cobre a tela (transição), depois se abre
    const r = iv(f, 0, 12, 16, 1300, ease.inC), abre = iv(f, 12, 18, 0, 1);
    return svg(`<circle cx="${1328 + (960 - 1328) * iv(f, 0, 10)}" cy="${372 + (540 - 372) * iv(f, 0, 10)}" r="${r}" fill="${C.san}" opacity="${1 - abre}"/>`);
  },
  prancha(f, d, o) {
    const z = 1.12 - 0.12 * iv(f, 0, d, 0, 1, (x) => x), fx = o.foco[0], fy = o.foco[1];
    const cx = 960, cy = 470, p = iv(f, 3, 13, 0, 1, ease.outC);
    return abs(`left:560px;top:-20px;width:800px;height:1120px;transform:scale(${z});transform-origin:${fx * 100}% ${fy * 100}%`, `<img src="img/${o.img}.png" style="width:100%;height:100%;object-fit:contain">`) +
      svg(circulo(cx, cy, 120, p, 7) + `<line x1="${cx + 120}" y1="${cy}" x2="${cx + 420}" y2="${cy - 120}" stroke="${C.san}" stroke-width="4" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${1 - iv(f, 8, 16)}"/>` +
        `<circle cx="${cx}" cy="${cy}" r="${10 * spring(f, 2, "quica")}" fill="${C.san}"/>`) +
      abs(`left:${cx + 430}px;top:${cy - 170}px;opacity:${iv(f, 12, 16)}`, `<span style="font:400 64px ${F.cali};color:${C.san}">${o.anota}</span>`) +
      abs("left:120px;top:960px", rot(o.rot, C.tinta));
  },
  mosaico(f, d) {
    // várias pranchas ao mesmo tempo: pequenas, crescem, uma toma a tela
    const pos = [[300, 300], [760, 240], [1220, 320], [1640, 260]];
    return IMGS.map((im, i) => {
      const a = i * 6, s = spring(f, a, "ui"), cresce = i === 3 ? iv(f, 40, 62, 0, 1, ease.inOutC) : 0;
      const w = 300 + 1000 * cresce, x = pos[i][0] + (960 - pos[i][0]) * cresce, y = pos[i][1] + 260 + (540 - pos[i][1] - 260) * cresce;
      const fora = i < 3 ? iv(f, 40, 52) : 0;
      return abs(`left:${x - w / 2}px;top:${y - w * 0.65}px;width:${w}px;height:${w * 1.3}px;opacity:${s * (1 - fora)};transform:scale(${0.6 + 0.4 * s}) rotate(${(i - 1.5) * 2 * (1 - cresce)}deg)`,
        `<img src="img/${im}.png" style="width:100%;height:100%;object-fit:contain">`);
    }).join("") + svg(IMGS.map((_, i) => { const t = f - 14 - i * 5; return t > 0 && t < 30 ? `<circle cx="${pos[i][0]}" cy="${pos[i][1] + 180}" r="${8 + 4 * Math.sin(f * 0.5)}" fill="${C.san}"/>` : ""; }).join("") +
      `<line x1="200" y1="900" x2="${200 + 1520 * iv(f, 6, 40)}" y2="900" stroke="${C.san}" stroke-width="3"/>` +
      Array.from({ length: 20 }, (_, i) => `<line x1="${200 + i * 80}" y1="890" x2="${200 + i * 80}" y2="${i % 5 ? 900 : 880}" stroke="${C.tinta}" stroke-width="2" opacity="${iv(f, 6 + i, 10 + i)}"/>`).join(""));
  },
  morfa(f, d, o) {
    // cada palavra se escreve, segura e se dissolve na próxima (desfoque cruzado), sublinhada em sanguina
    const fatia = d / o.palavras.length;
    return o.palavras.map((w, i) => {
      const a = fatia * i, ent = iv(f, a, a + 12, 0, 1, ease.outC), sai = i < o.palavras.length - 1 ? iv(f, a + fatia - 8, a + fatia + 4) : 0;
      const op = ent * (1 - sai);
      return abs(`left:0;right:0;top:300px;text-align:center;opacity:${op};filter:blur(${(1 - ent) * 14 + sai * 18}px);transform:scale(${0.92 + 0.08 * ent + 0.06 * sai}) translateY(${sai * -30}px)`,
        `<span style="font:400 340px/1 ${F.cali};color:${i === 2 ? C.san : C.tinta}">${w}</span>`);
    }).join("") + svg(`<path d="M640 760 C 820 730, 1080 790, 1290 748" stroke="${C.san}" stroke-width="10" fill="none" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${1 - iv(f, fatia * 2, fatia * 2 + 18)}"/>`) +
      abs(`left:0;right:0;top:860px;text-align:center`, rot(["I · pensar", "II · agir", "III · agora"][Math.min(2, Math.floor(f / fatia))], C.tinta));
  },
  ponto(f) {
    const s = spring(f, 0, "quica"), pul = 1 + 0.12 * Math.sin(f * 0.6);
    return svg(`<circle cx="960" cy="540" r="${22 * s * pul}" fill="${C.san}"/><circle cx="960" cy="540" r="${60 * s * pul}" fill="none" stroke="${C.san}" stroke-width="2" opacity=".5"/>`);
  },
  logo(f) {
    const p = iv(f, 0, 10, 0, 1, ease.outC), traco = iv(f, 10, 28, 0, 1, ease.inOutC);
    return abs(`left:0;right:0;top:330px;text-align:center;opacity:${p};filter:blur(${(1 - p) * 10}px);transform:scale(${1.08 - 0.08 * p})`,
        `<span style="font:400 300px/.9 ${F.disp};letter-spacing:.04em;color:${C.tinta}">SANGUINA</span>`) +
      svg(`<path d="M470 700 C 760 670, 1120 730, 1460 682" stroke="${C.san}" stroke-width="16" fill="none" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${1 - traco}"/>`) +
      abs(`left:0;right:0;top:770px;text-align:center;opacity:${iv(f, 24, 36)}`, `<span style="font:italic 52px ${F.serif};color:${C.muted}">filosofia para quem age</span>`);
  },
};

window.FILME = {
  frames: DUR * FPS,
  cena(fr) {
    const t = fr / FPS;
    let i = PLANOS.findIndex((p, k) => t < (PLANOS[k + 1]?.[0] ?? 1e9)); if (i < 0) i = PLANOS.length - 1;
    const [t0, tipo, o] = PLANOS[i], f = (t - t0) * FPS, d = ((PLANOS[i + 1]?.[0] ?? DUR) - t0) * FPS;
    const punch = tipo === "prancha" ? 1 + 0.05 * Math.exp(-f / 3) : 1;
    const grao = svg(`<filter id="g"><feTurbulence baseFrequency=".9" seed="${fr % 6}"/></filter><rect width="${W}" height="${H}" filter="url(#g)"/>`, "opacity:.05;mix-blend-mode:multiply");
    return { html: `<div style="position:absolute;inset:0;background:${C.fundo}"></div><div style="position:absolute;inset:0;transform:scale(${punch})">${R[tipo](f, d, o)}</div>${grao}` };
  },
};
