// Modelo vertical (9:16) do Sanguina: tipografia do design system, fundo com textura e motions em loop.
// Tipos de cena: chip · mapa · palavras · duelo · contagem. Dados: dados.js (ROTEIRO, TIMELINE) via montar.py.
/* global FPS, iv, spring, ease, ROTEIRO, TIMELINE, d3, topojson */

const W = 1080, H = 1920;
const PIG = { violeta: "#563a9e", lapis: "#2648a8", salvia: "#346242", rosa: "#a83460", ocre: "#96580e", sanguina: "#962e1a" };
const C = { papel: "#ece4d6", papel2: "#e2d8c6", tinta: "#1b1a2a", muted: "#5b5566", fio: "#c4b8a3", san: "#b5402a" };
const COR = PIG[ROTEIRO.pigmento] || PIG.lapis;
const F = { disp: "'Big Shoulders Display', 'Arial Narrow', sans-serif", serif: "'Cormorant Garamond', Georgia, serif",
  sans: "'Hanken Grotesk', Arial, sans-serif", mono: "'IBM Plex Mono', Consolas, monospace" };

const abs = (st, h = "") => `<div style="position:absolute;${st}">${h}</div>`;
const rot = (t, cor = C.muted, s = 30) => `<div style="font:500 ${s}px ${F.mono};letter-spacing:.18em;text-transform:uppercase;color:${cor}">${t}</div>`;
const man = (t, s = 170, cor = C.tinta, peso = 300) => `<div style="font:${peso} ${s}px/.9 ${F.disp};text-transform:uppercase;color:${cor}">${t}</div>`;
const entra = (f, at, h, dy = 50) => { const p = iv(f, at, at + 14); return `<div style="opacity:${p};transform:translateY(${(1 - p) * dy}px);filter:blur(${(1 - p) * 8}px)">${h}</div>`; };
// Tremor de impacto: decai em ~10 quadros a partir de "at".
const treme = (f, at, amp = 14) => { const k = f - at; if (k < 0 || k > 12) return ""; const a = amp * Math.exp(-k / 3); return `transform:translate(${Math.sin(k * 7) * a}px,${Math.cos(k * 5) * a}px);`; };

// ---------- fundo vivo (loop) ----------
const fundo = (fr, t) => {
  const g = (fr / FPS);
  const aneis = [380, 520, 660].map((r, k) =>
    `<circle cx="${W * 0.78}" cy="${H * 0.3}" r="${r}" fill="none" stroke="${C.fio}" stroke-width="2" stroke-dasharray="${6 + k * 4} ${10 + k * 6}" transform="rotate(${(k % 2 ? -1 : 1) * g * (6 + k * 3)} ${W * 0.78} ${H * 0.3})"/>`).join("");
  const grade = Array.from({ length: 9 }, (_, i) => `<line x1="${120 * i + 60}" y1="0" x2="${120 * i + 60}" y2="${H}" stroke="${C.fio}" stroke-width="1" opacity=".45"/>`).join("") +
    Array.from({ length: 17 }, (_, i) => `<line x1="0" y1="${120 * i + ((g * 20) % 120)}" x2="${W}" y2="${120 * i + ((g * 20) % 120)}" stroke="${C.fio}" stroke-width="1" opacity=".3"/>`).join("");
  const varredura = `<rect x="0" y="${((g * 260) % (H + 400)) - 200}" width="${W}" height="140" fill="${COR}" opacity=".05"/>`;
  return `<div style="position:absolute;inset:0;background:${C.papel}"></div>
    <svg width="${W}" height="${H}" style="position:absolute;inset:0">${grade}${aneis}${varredura}</svg>
    <svg width="${W}" height="${H}" style="position:absolute;inset:0;opacity:.09;mix-blend-mode:multiply"><filter id="n"><feTurbulence baseFrequency=".8" seed="${fr % 6}"/></filter><rect width="${W}" height="${H}" filter="url(#n)"/></svg>`;
};

// ---------- motivos ----------
const chip = (f, cx, cy, s = 1) => {
  const g = f / FPS, pinos = [], trilhas = [];
  for (let k = 0; k < 8; k++) {
    const o = -210 + k * 60;
    pinos.push(`<rect x="${cx + o - 10}" y="${cy - 300}" width="20" height="70" fill="${C.tinta}"/><rect x="${cx + o - 10}" y="${cy + 230}" width="20" height="70" fill="${C.tinta}"/>`,
      `<rect x="${cx - 300}" y="${cy + o - 10}" width="70" height="20" fill="${C.tinta}"/><rect x="${cx + 230}" y="${cy + o - 10}" width="70" height="20" fill="${C.tinta}"/>`);
    const fase = ((g * 0.9 + k * 0.13) % 1);
    trilhas.push(`<path d="M${cx + o} ${cy - 300} V${cy - 420 - k * 18} H${cx + o + (k % 2 ? 120 : -120)}" fill="none" stroke="${COR}" stroke-width="5" pathLength="1" stroke-dasharray=".12 .88" stroke-dashoffset="${-fase}"/>`,
      `<path d="M${cx + o} ${cy + 300} V${cy + 420 + k * 18} H${cx + o + (k % 2 ? -120 : 120)}" fill="none" stroke="${COR}" stroke-width="5" pathLength="1" stroke-dasharray=".12 .88" stroke-dashoffset="${-fase}"/>`);
  }
  const p = spring(f, 0, "pesado"), brilho = 0.5 + 0.5 * Math.sin(g * 4);
  return `<svg width="${W}" height="${H}" style="position:absolute;inset:0;transform:scale(${0.6 + 0.4 * p});transform-origin:${cx}px ${cy}px">${trilhas.join("")}${pinos.join("")}
    <rect x="${cx - 230}" y="${cy - 230}" width="460" height="460" fill="${C.tinta}"/>
    <rect x="${cx - 170}" y="${cy - 170}" width="340" height="340" fill="none" stroke="${COR}" stroke-width="4" opacity="${0.5 + 0.5 * brilho}"/>
    <text x="${cx}" y="${cy + 30}" text-anchor="middle" font-family="IBM Plex Mono" font-size="64" fill="${C.papel}">3 nm</text></svg>`;
};

let MUNDO = null, TAIWAN = null;
window.READY = (window.READY || Promise.resolve()).then(() =>
  fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json").then((r) => r.json()).then((topo) => {
    MUNDO = topojson.feature(topo, topo.objects.countries);
    TAIWAN = MUNDO.features.find((x) => x.id === "158");
  }));

const globo = (f, cx, cy, r) => {
  if (!MUNDO) return "";
  const k = iv(f, 0, 70, 0, 1, ease.inOutC);
  const proj = d3.geoOrthographic().scale(r * (1 + 1.6 * iv(f, 60, 110, 0, 1, ease.inOutC))).translate([cx, cy]).rotate([-60 - 61 * k, -10 - 13.5 * k]).clipAngle(90);
  const path = d3.geoPath(proj);
  const terra = MUNDO.features.map((x) => path(x)).filter(Boolean).join(" ");
  const tw = TAIWAN ? path(TAIWAN) : "";
  const pulso = 1 + 0.15 * Math.sin((f / FPS) * 6);
  const c = TAIWAN ? proj([121, 23.7]) : [cx, cy];
  return `<svg width="${W}" height="${H}" style="position:absolute;inset:0"><defs><clipPath id="cg"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.papel2}" stroke="${C.tinta}" stroke-width="2"/>
    <g clip-path="url(#cg)"><path d="${path(d3.geoGraticule10())}" fill="none" stroke="${C.fio}"/><path d="${terra}" fill="${COR}" opacity=".85"/><path d="${tw}" fill="${C.san}"/></g>
    ${c ? `<circle cx="${c[0]}" cy="${c[1]}" r="${44 * pulso}" fill="none" stroke="${C.san}" stroke-width="4" opacity="${iv(f, 70, 80)}"/>` : ""}</svg>`;
};

const engrenagem = (cx, cy, r, ang, cor) => {
  const dentes = Array.from({ length: 12 }, (_, i) => `<rect x="${cx - 14}" y="${cy - r - 26}" width="28" height="40" fill="${cor}" transform="rotate(${i * 30 + ang} ${cx} ${cy})"/>`).join("");
  return `${dentes}<circle cx="${cx}" cy="${cy}" r="${r}" fill="${cor}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.35}" fill="${C.papel}"/>`;
};

// ---------- legenda palavra por palavra ----------
const legenda = (t) => {
  const Wd = TIMELINE.words; const i = Wd.findIndex((w) => w.e >= t);
  if (i < 0 || Wd[i].s - t > 0.5) return "";
  const ini = Math.floor(i / 4) * 4, g = Wd.slice(ini, ini + 4);
  return abs("left:60px;right:60px;top:1500px;text-align:center",
    `<span style="display:inline-block;padding:14px 30px;background:${C.tinta};font:600 64px/1.15 ${F.sans};color:${C.papel}">` +
    g.map((w, k) => `<span style="color:${ini + k === i ? "#f0a48e" : C.papel}">${w.w}</span>`).join(" ") + "</span>");
};

// ---------- cenas ----------
const cenas = {
  chip(c, f) {
    return chip(f, W / 2, 1020) +
      abs(`left:80px;top:200px;${treme(f, 0)}`, entra(f, 0, man(c.titulo[0], 150))) +
      abs(`left:80px;top:340px;${treme(f, 40)}`, entra(f, 40, man(c.titulo[1], 150, C.san, 400)));
  },
  mapa(c, f) {
    const n = Math.round(iv(f, 120, 175, 0, c.numero));
    return globo(f, W / 2, 800, 380) +
      abs("left:80px;top:180px", entra(f, 0, rot(c.rotulo, C.san))) +
      abs(`left:80px;top:1215px;opacity:${iv(f, 115, 130)}`, `<div style="display:flex;align-items:baseline;gap:24px">${man(n + "%", 210, COR, 400)}<div style="font:italic 50px/1.05 ${F.serif};color:${C.tinta};max-width:440px">${c.legenda_numero}</div></div>`);
  },
  palavras(c, f, d) {
    const fatia = d / c.palavras.length;
    return c.palavras.map((p, k) => {
      const at = Math.round(fatia * k), s = spring(f, at, "quica"), ativo = f >= at && f < at + fatia;
      return abs(`left:80px;top:${260 + k * 270}px;opacity:${Math.min(1, s)};transform:scale(${0.7 + 0.3 * s});transform-origin:left center;${treme(f, at, 8)}`,
        man(p, k > 1 ? 210 : 120, ativo ? C.san : C.tinta, ativo ? 400 : 300));
    }).join("") + `<svg width="${W}" height="${H}" style="position:absolute;inset:0">${[0, 1, 2].map((k) => {
      const r = ((f / FPS + k * 0.4) % 1.2) / 1.2; return `<circle cx="${W - 160}" cy="300" r="${30 + r * 160}" fill="none" stroke="${COR}" stroke-width="3" opacity="${1 - r}"/>`; }).join("")}</svg>`;
  },
  duelo(c, f) {
    const g = f / FPS, p = iv(f, 0, 20, 0, 1, ease.inOutC);
    return abs(`left:0;top:0;width:${W / 2}px;height:${H}px;background:${COR};transform:translateY(${(1 - p) * -H}px)`) +
      abs(`left:${W / 2}px;top:0;width:${W / 2}px;height:${H}px;background:${C.tinta};transform:translateY(${(1 - p) * H}px)`) +
      `<svg width="${W}" height="${H}" style="position:absolute;inset:0;opacity:${iv(f, 20, 34)}">${engrenagem(W / 2 - 4, 960, 120, g * 40, C.papel)}${engrenagem(W / 2 + 230, 1180, 80, -g * 60 + 15, C.san)}</svg>` +
      abs("left:60px;top:300px;width:420px", entra(f, 24, man(c.esq[0], 170, C.papel, 400)) + entra(f, 34, `<div style="font:italic 52px/1.05 ${F.serif};color:${C.papel};margin-top:20px">${c.esq[1]}</div>`)) +
      abs(`left:${W / 2 + 60}px;top:300px;width:420px`, entra(f, 120, man(c.dir[0], 170, C.papel, 400)) + entra(f, 130, `<div style="font:italic 52px/1.05 ${F.serif};color:${C.papel};margin-top:20px">${c.dir[1]}</div>`));
  },
  contagem(c, f, d) {
    const resta = Math.max(0, Math.ceil((d - f) / FPS)), pisca = Math.floor(f / 15) % 2;
    const contorno = TAIWAN && MUNDO ? (() => { const pr = d3.geoMercator().fitSize([460, 760], TAIWAN); return d3.geoPath(pr)(TAIWAN); })() : "";
    return `<svg width="${W}" height="${H}" style="position:absolute;inset:0"><g transform="translate(310 520)"><path d="${contorno}" fill="${pisca ? C.san : "none"}" stroke="${C.san}" stroke-width="4"/></g></svg>` +
      abs(`left:80px;top:200px;${treme(f, 0)}`, entra(f, 0, man(c.titulo[0], 150))) +
      abs(`left:80px;top:340px;${treme(f, 60)}`, entra(f, 60, man(c.titulo[1], 150, C.san, 400))) +
      abs("left:80px;top:1320px", `<div style="font:500 120px ${F.mono};color:${C.tinta}">00:00:${String(resta).padStart(2, "0")}</div>`);
  },
};

const CENAS = ROTEIRO.cenas.map((c, i) => ({ ...c, ini: TIMELINE.scenes[i].from, dur: TIMELINE.scenes[i].dur }));
window.FILME = {
  width: W, height: H,
  frames: Math.round((TIMELINE.total) * FPS),
  cena(fr) {
    const t = fr / FPS;
    let i = CENAS.findIndex((c, k) => t < (CENAS[k + 1]?.ini ?? 1e9) - 0.1);
    if (i < 0) i = CENAS.length - 1;
    const c = CENAS[i], f = fr - c.ini * FPS + 6, d = ((CENAS[i + 1]?.ini ?? TIMELINE.total) - c.ini) * FPS;
    const fim = (CENAS[i + 1]?.ini ?? 1e9) * FPS - fr;
    const vis = Math.min(iv(f, 0, 6), iv(fim, 0, 6));
    const flash = Math.max(0, 1 - Math.abs(fim) / 3) * 0.6; // clarão na troca de cena (casa com o whoosh/impacto)
    return {
      html: fundo(fr, t) + `<div style="position:absolute;inset:0;opacity:${vis}">${cenas[c.tipo](c, f, d)}</div>` +
        abs(`inset:0;background:#fff;opacity:${flash}`) +
        abs("left:80px;top:90px", rot("Sanguina", C.tinta, 28)) +
        abs(`left:0;top:0;height:8px;width:${(t / TIMELINE.total) * W}px;background:${C.san}`) + legenda(t),
    };
  },
};
