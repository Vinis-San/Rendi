// Sanguina MAX — versão vertical de alta energia. Cada plano vem de ROTEIRO.planos (tempo absoluto em segundos);
// o mesmo instante dispara o visual e o som (pipeline/sfx.py lê os mesmos "sfx"). Dados: dados.js via montar.py.
/* global FPS, iv, spring, ease, ROTEIRO, TIMELINE, d3, topojson */

const W = 1080, H = 1920;
const C = { papel: "#ece4d6", papel2: "#e2d8c6", tinta: "#16151f", muted: "#5b5566", fio: "#c4b8a3", san: "#c0432b", lapis: "#2648a8", ouro: "#b8862b" };
const F = { disp: "'Big Shoulders Display', 'Arial Narrow', sans-serif", serif: "'Cormorant Garamond', Georgia, serif",
  sans: "'Hanken Grotesk', Arial, sans-serif", mono: "'IBM Plex Mono', Consolas, monospace" };
const P = ROTEIRO.planos;
const IMPACTOS = P.flatMap((p) => p.sfx.filter(([, n]) => /impacto|explosao|carimbo/.test(n)).map(([t, n]) => [t, n === "explosao" ? 2 : 1]));

const abs = (st, h = "") => `<div style="position:absolute;${st}">${h}</div>`;
const svg = (h, st = "") => `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;inset:0;${st}">${h}</svg>`;
const man = (t, s, cor = C.tinta, peso = 400, ls = 0) => `<span style="font:${peso} ${s}px/.88 ${F.disp};text-transform:uppercase;letter-spacing:${ls}px;color:${cor}">${t}</span>`;
const rot = (t, cor = C.muted, s = 30) => `<div style="font:500 ${s}px ${F.mono};letter-spacing:.2em;text-transform:uppercase;color:${cor}">${t}</div>`;
const slam = (f, at, h, de = 1.6) => { const k = f - at; if (k < 0) return `<div style="opacity:0">${h}</div>`;
  const s = 1 + (de - 1) * Math.exp(-k / 2.2) * Math.cos(k * 0.5); return `<div style="transform:scale(${Math.max(s, 0.94)});transform-origin:left center;opacity:${Math.min(1, k / 2)}">${h}</div>`; };
const sobe = (f, at, h, dy = 70) => { const p = iv(f, at, at + 9, 0, 1, ease.outC); return `<div style="opacity:${p};transform:translateY(${(1 - p) * dy}px);filter:blur(${(1 - p) * 10}px)">${h}</div>`; };
// Glitch: duas cópias deslocadas (vermelha e azul) exatamente sobre o original, sem quebrar linha.
const glitch = (h, k) => `<div style="position:relative;display:inline-block;white-space:nowrap">` +
  `<div style="position:absolute;left:${-8 * k}px;top:0;opacity:${k ? 0.7 : 0};filter:sepia(1) saturate(9) hue-rotate(-35deg);mix-blend-mode:multiply;white-space:nowrap">${h}</div>` +
  `<div style="position:absolute;left:${8 * k}px;top:${2 * k}px;opacity:${k ? 0.7 : 0};mix-blend-mode:multiply;white-space:nowrap;filter:hue-rotate(200deg)">${h}</div>` +
  `<div style="position:relative">${h}</div></div>`;
const loc = (p, s) => (s - p.t) * FPS; // frame local de um instante absoluto

// ---------- fundo ----------
const fundo = (fr, escuro = false) => {
  const g = fr / FPS, bg = escuro ? C.tinta : C.papel, linha = escuro ? "#2c2a3a" : C.fio;
  let pontos = "";
  for (let y = 0; y < 16; y++) for (let x = 0; x < 10; x++) {
    const r = 3 + 2.6 * Math.sin(g * 1.6 + x * 0.55 + y * 0.35);
    pontos += `<circle cx="${x * 120 + 60}" cy="${y * 120 + 60}" r="${Math.max(0.6, r)}" fill="${linha}"/>`;
  }
  return `<div style="position:absolute;inset:0;background:${bg}"></div>` + svg(pontos + `<rect y="${((g * 300) % (H + 300)) - 150}" width="${W}" height="110" fill="${C.lapis}" opacity="${escuro ? 0.12 : 0.05}"/>`) +
    svg(`<filter id="gr"><feTurbulence baseFrequency=".85" seed="${fr % 7}"/></filter><rect width="${W}" height="${H}" filter="url(#gr)"/>`, `opacity:${escuro ? 0.12 : 0.08};mix-blend-mode:${escuro ? "screen" : "multiply"}`) +
    `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,transparent 55%,rgba(0,0,0,${escuro ? 0.45 : 0.16}))"></div>`;
};

// ---------- ícones ----------
const ICO = {
  gota: (c) => `<path d="M0 -210 C 90 -80 150 10 150 80 A 150 150 0 0 1 -150 80 C -150 10 -90 -80 0 -210Z" fill="${c}"/><path d="M-70 60 A 80 80 0 0 0 -10 140" stroke="${C.papel}" stroke-width="14" fill="none" stroke-linecap="round" opacity=".6"/>`,
  barra: (c) => `<path d="M-200 90 L-140 -60 L140 -60 L200 90Z" fill="${c}"/><path d="M-140 -60 L-110 -110 L110 -110 L140 -60Z" fill="#d8a84a"/><text x="0" y="40" text-anchor="middle" font-family="IBM Plex Mono" font-size="44" fill="${C.papel}">999,9</text>`,
  carro: (c) => `<path d="M-90 10 L-60 -40 H50 L90 10 H110 V50 H-110 V10Z" fill="${c}"/><circle cx="-55" cy="55" r="22" fill="${C.tinta}"/><circle cx="55" cy="55" r="22" fill="${C.tinta}"/>`,
  cruz: (c) => `<rect x="-30" y="-90" width="60" height="180" fill="${c}"/><rect x="-90" y="-30" width="180" height="60" fill="${c}"/>`,
  grafico: (c, k = 1) => `<polyline points="-110,40 -60,-20 -20,0 30,-60 ${30 + 80 * k},${-60 + 160 * k}" fill="none" stroke="${c}" stroke-width="12" stroke-linejoin="round"/>`,
};

// ---------- mapa ----------
let MUNDO = null, TAIWAN = null;
window.READY = (window.READY || Promise.resolve()).then(() =>
  fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json").then((r) => r.json()).then((t) => {
    MUNDO = topojson.feature(t, t.objects.countries); TAIWAN = MUNDO.features.find((x) => x.id === "158");
  }));
const TW = [121, 23.7];

// ---------- planos ----------
const R = {
  risca(p, f, d) {
    const r = loc(p, p.risca), k = iv(f, r, r + 6, 0, 1, ease.inOutC), deg = Math.sin(f * 0.05) * 3;
    return svg(`<g transform="translate(540 640) rotate(${deg}) scale(${spring(f, 0, "quica")})">${ICO[p.icone](p.icone === "gota" ? C.tinta : C.ouro)}</g>`) +
      abs("left:70px;right:70px;top:960px", `<div style="position:relative;display:inline-block">${slam(f, 0, man(p.palavra, p.palavra.length > 5 ? 230 : 330, C.tinta, 700))}` +
        abs(`left:-3%;width:106%;top:45%;height:34px;background:${C.san};transform-origin:left;transform:scaleX(${k}) rotate(-4deg)`) + `</div>` +
        `<div style="margin-top:30px;opacity:${iv(f, 2, 8)}">${rot("Esqueça", C.san, 40)}</div>`);
  },
  perigo(p, f) {
    const g = f / FPS, faixa = (y) => svg(`<defs><pattern id="hz${y}" width="80" height="80" patternUnits="userSpaceOnUse" patternTransform="rotate(45) translate(${(g * 160) % 80} 0)"><rect width="40" height="80" fill="${C.tinta}"/><rect x="40" width="40" height="80" fill="#e2b33c"/></pattern></defs><rect y="${y}" width="${W}" height="90" fill="url(#hz${y})"/>`);
    return faixa(170) + faixa(1520) + abs("left:70px;top:420px", p.linhas.map((l, i) => sobe(f, loc(p, p.marcas[i]), man(l, i === 1 ? 190 : 150, i === 1 ? C.san : C.tinta, i === 1 ? 700 : 400))).join(""));
  },
  dedo(p, f) {
    const linhas = Array.from({ length: 16 }, (_, i) => { const pr = iv(f, i * 1.2, i * 1.2 + 16);
      return `<ellipse cx="540" cy="900" rx="${60 + i * 26}" ry="${90 + i * 32}" fill="none" stroke="${C.tinta}" stroke-width="7" pathLength="1" stroke-dasharray="${pr * 0.82} 1" transform="rotate(${i * 7} 540 900)" opacity=".85"/>`; }).join("");
    const cai = spring(f, 14, "quica"), y = 900 - 700 * (1 - cai), brilho = 0.5 + 0.5 * Math.sin(f * 0.4);
    const zoom = 1 + 0.5 * iv(f, 0, 50, 1, 0, ease.outC);
    return svg(`<g transform="translate(540 900) scale(${zoom}) translate(-540 -900)">${linhas}<rect x="500" y="${y - 40}" width="80" height="80" fill="${C.tinta}" stroke="${C.lapis}" stroke-width="6"/><circle cx="540" cy="${y}" r="${120 + 40 * brilho}" fill="none" stroke="${C.lapis}" stroke-width="3" opacity="${iv(f, 24, 30) * (1 - brilho * 0.6)}"/></g>`) +
      abs("left:70px;top:230px", sobe(f, 4, man("cabe na ponta", 150)) + sobe(f, 10, man("do seu dedo", 150, C.san, 700))) +
      abs(`left:70px;top:1480px;opacity:${iv(f, 26, 34)}`, rot("1 chip de 3 nm · bilhões de transistores", C.tinta, 30));
  },
  ilha(p, f) {
    const g = f / FPS, ang = (g * 120) % 360, pulso = 1 + 0.25 * Math.sin(g * 7);
    return svg(`<circle cx="540" cy="980" r="420" fill="none" stroke="#2c2a3a" stroke-width="2"/><circle cx="540" cy="980" r="280" fill="none" stroke="#2c2a3a" stroke-width="2"/><circle cx="540" cy="980" r="140" fill="none" stroke="#2c2a3a" stroke-width="2"/>
      <path d="M540 980 L${540 + 420 * Math.cos((ang * Math.PI) / 180)} ${980 + 420 * Math.sin((ang * Math.PI) / 180)} A420 420 0 0 0 ${540 + 420 * Math.cos(((ang - 40) * Math.PI) / 180)} ${980 + 420 * Math.sin(((ang - 40) * Math.PI) / 180)}Z" fill="${C.lapis}" opacity=".35"/>
      <circle cx="590" cy="940" r="${16 * pulso}" fill="${C.san}"/><circle cx="590" cy="940" r="${40 * pulso}" fill="none" stroke="${C.san}" stroke-width="3" opacity="${2 - pulso * 1.4}"/>`) +
      abs("left:70px;top:220px", p.linhas.map((l, i) => sobe(f, loc(p, p.marcas[i]), man(l, 150, i ? "#f0a48e" : C.papel, i ? 700 : 400))).join(""));
  },
  globo(p, f) {
    if (!MUNDO) return "";
    const fo = loc(p, p.foco), k = iv(f, 0, fo, 0, 1, ease.inOutC), z = iv(f, fo - 6, fo + 20, 0, 1, ease.inOutC);
    const proj = d3.geoOrthographic().scale(430 * (1 + 2.2 * z)).translate([540, 960]).rotate([-TW[0] + 200 * (1 - k), -TW[1] + 10 * (1 - k)]).clipAngle(90);
    const pa = d3.geoPath(proj), terra = MUNDO.features.map((x) => pa(x)).filter(Boolean).join(" ");
    const rotas = [[-122, 37], [-74, 40], [8, 50], [139, 35], [77, 28]].map((dst, i) => {
      const pr = iv(f, fo + 4 + i * 3, fo + 26 + i * 3); if (pr <= 0) return ""; const it = d3.geoInterpolate(TW, dst);
      return `<path d="${pa({ type: "LineString", coordinates: Array.from({ length: 30 }, (_, j) => it((j / 29) * pr)) })}" fill="none" stroke="${C.san}" stroke-width="4"/>`;
    }).join("");
    const c = proj(TW), pulso = 1 + 0.2 * Math.sin(f * 0.3);
    return svg(`<defs><clipPath id="cg"><circle cx="540" cy="960" r="${430 * (1 + 2.2 * z)}"/></clipPath></defs><circle cx="540" cy="960" r="${430 * (1 + 2.2 * z)}" fill="${C.papel2}" stroke="${C.tinta}" stroke-width="3"/>
      <g clip-path="url(#cg)"><path d="${pa(d3.geoGraticule10())}" fill="none" stroke="${C.fio}"/><path d="${terra}" fill="${C.lapis}"/><path d="${TAIWAN ? pa(TAIWAN) : ""}" fill="${C.san}"/>${rotas}</g>
      ${c ? `<circle cx="${c[0]}" cy="${c[1]}" r="${60 * pulso}" fill="none" stroke="${C.san}" stroke-width="5" opacity="${iv(f, fo, fo + 6)}"/>` : ""}`) +
      abs(`left:70px;top:200px`, slam(f, fo, man(p.rotulo, 260, C.tinta, 700)));
  },
  noventa(p, f) {
    const a = loc(p, p.de), b = loc(p, p.ate), n = Math.round(iv(f, a, b, 0, 90, ease.outC)), k = n / 100;
    const r = 330, cc = 2 * Math.PI * r;
    return svg(`<circle cx="540" cy="900" r="${r}" fill="none" stroke="${C.fio}" stroke-width="56"/><circle cx="540" cy="900" r="${r}" fill="none" stroke="${C.lapis}" stroke-width="56" stroke-dasharray="${cc * k} ${cc}" transform="rotate(-90 540 900)"/>
      ${Array.from({ length: 60 }, (_, i) => `<line x1="540" y1="${900 - r - 50}" x2="540" y2="${900 - r - (i % 5 ? 36 : 20)}" stroke="${C.tinta}" stroke-width="3" transform="rotate(${i * 6} 540 900)"/>`).join("")}`) +
      abs("left:0;right:0;top:790px;text-align:center", slam(f, b, man(`${n}%`, 260, n >= 90 ? C.san : C.tinta, 700), 1.3)) +
      abs("left:70px;top:200px", sobe(f, 0, rot(p.rotulo + " · Taiwan", C.san, 40)) + sobe(f, 4, man("produz", 150))) +
      abs("left:70px;top:1360px", sobe(f, b - 4, man("dos chips mais", 120) + "<br>" + man("avançados do mundo", 120, C.lapis, 700)));
  },
  relogio(p, f) {
    const pa = loc(p, p.para), parou = f >= pa, ang = parou ? 0 : (f * 24) % 360;
    return svg(`<circle cx="540" cy="1060" r="380" fill="none" stroke="${parou ? C.san : C.tinta}" stroke-width="10"/>
      ${Array.from({ length: 24 }, (_, i) => `<line x1="540" y1="700" x2="540" y2="${i % 6 ? 730 : 760}" stroke="${C.tinta}" stroke-width="${i % 6 ? 4 : 10}" transform="rotate(${i * 15} 540 1060)"/>`).join("")}
      <line x1="540" y1="1060" x2="540" y2="740" stroke="${parou ? C.san : C.tinta}" stroke-width="14" stroke-linecap="round" transform="rotate(${ang} 540 1060)"/><circle cx="540" cy="1060" r="24" fill="${C.tinta}"/>`) +
      abs("left:70px;top:220px", sobe(f, 0, man(p.linhas[0], 150)) + sobe(f, 14, man(p.linhas[1], 150, C.san, 700)));
  },
  colapso(p, f) {
    const fi = loc(p, p.final), gk = f >= fi ? Math.max(0, 1 - (f - fi) / 14) : 0;
    const rows = p.itens.map(([txt, t, ic], i) => { const a = loc(p, t), cair = ic === "grafico" ? iv(f, a + 4, a + 22) : 1;
      return abs(`left:70px;top:${300 + i * 330}px;display:flex;align-items:center;gap:50px`, slam(f, a,
        `<div style="display:flex;align-items:center;gap:50px"><svg width="240" height="220" viewBox="-120 -110 240 220">${ICO[ic](i === 2 ? C.san : C.tinta, cair)}</svg>${man(txt, 110, C.tinta, 700)}</div>`)); }).join("");
    return rows + (f >= fi ? abs(`left:0;right:0;top:1280px;text-align:center;transform:rotate(-4deg)`, glitch(man("colapso", 290, C.san, 700), gk * 3)) : "");
  },
  pergunta(p, f) {
    return abs("left:380px;top:420px", `<div style="font:700 1100px/.8 ${F.disp};color:${C.lapis};opacity:.16;transform:rotate(${Math.sin(f * 0.05) * 6}deg)">?</div>`) +
      abs("left:70px;top:700px", p.linhas.map((l, i) => slam(f, loc(p, p.marcas[i]), man(l, 190, i ? C.san : C.tinta, 700))).join(""));
  },
  rede(p, f) {
    const ia = loc(p, p.ia), mx = iv(f, ia - 10, ia + 10, 0, 1, ease.inOutC), g = f / FPS;
    const nos = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) {
      const gx = 160 + j * 190, gy = 760 + i * 190, nx = 160 + i * 250, ny = 640 + j * 170 + (i % 2) * 80;
      nos.push([gx + (nx - gx) * mx, gy + (ny - gy) * mx, i]);
    }
    let lig = "";
    nos.forEach(([x, y, c], a) => nos.forEach(([x2, y2, c2], b) => {
      if (mx > 0.5 ? c2 === c + 1 : (b === a + 1 && c2 === c)) {
        const pul = (g * 1.6 + a * 0.07) % 1;
        lig += `<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="${C.fio}" stroke-width="3"/><circle cx="${x + (x2 - x) * pul}" cy="${y + (y2 - y) * pul}" r="7" fill="${mx > 0.5 ? C.san : C.lapis}"/>`;
      }
    }));
    return svg(lig + nos.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="22" fill="${C.tinta}"/>`).join("")) +
      abs("left:70px;top:200px", sobe(f, 0, man(p.linhas[0], 120)) + sobe(f, 8, man(p.linhas[1], 120)) +
        (f >= ia ? slam(f, ia, man("inteligência", 175, C.lapis, 700) + "<br>" + man("artificial", 175, C.lapis, 700)) : ""));
  },
  missil(p, f) {
    const im = loc(p, p.impacto), pr = iv(f, 0, im, 0, 1, ease.inC);
    const pt = (s) => { const x = 140 + 800 * s, y = 1500 - 1100 * Math.sin(Math.PI * s * 0.92) + 200 * s; return [x, y]; };
    const traj = Array.from({ length: 40 }, (_, i) => pt((i / 39) * pr).join(",")).join(" ");
    const [hx, hy] = pt(pr), onda = f >= im ? (f - im) : -1, [ix, iy] = pt(1);
    return svg(`<polyline points="${traj}" fill="none" stroke="${C.tinta}" stroke-width="6" stroke-dasharray="20 14"/>
      ${onda < 0 ? `<circle cx="${hx}" cy="${hy}" r="18" fill="${C.san}"/><circle cx="${hx}" cy="${hy}" r="34" fill="none" stroke="${C.san}" stroke-width="3" opacity=".6"/>` :
        [0, 6, 12].map((o) => `<circle cx="${ix}" cy="${iy}" r="${Math.max(0, (onda - o) * 26)}" fill="none" stroke="${C.san}" stroke-width="${Math.max(1, 14 - (onda - o) * 0.6)}" opacity="${Math.max(0, 1 - (onda - o) / 24)}"/>`).join("") + `<circle cx="${ix}" cy="${iy}" r="${Math.max(0, 90 - onda * 4)}" fill="${C.san}"/>`}`) +
      abs("left:70px;top:220px", sobe(f, 0, man(p.linhas[0], 150)) + sobe(f, 10, man(p.linhas[1], 200, C.san, 700)));
  },
  lados(p, f) {
    const e = loc(p, p.te), dd = loc(p, p.td), pe = iv(f, e, e + 8, 0, 1, ease.outC), pd = iv(f, dd, dd + 8, 0, 1, ease.outC);
    return abs(`left:0;top:0;width:${W}px;height:${H / 2}px;background:${C.lapis};transform:translateX(${(1 - pe) * -W}px)`, abs("left:70px;bottom:80px", man(p.esq, 420, C.papel, 700))) +
      abs(`left:0;top:${H / 2}px;width:${W}px;height:${H / 2}px;background:${C.tinta};transform:translateX(${(1 - pd) * W}px)`, abs("right:70px;top:80px", man(p.dir, 420, C.san, 700))) +
      abs(`left:0;right:0;top:${H / 2 - 70}px;text-align:center;opacity:${pd}`, `<span style="display:inline-block;padding:10px 40px;background:${C.papel};font:700 110px ${F.disp};color:${C.tinta}">VS</span>`);
  },
  bloqueio(p, f) {
    const cb = loc(p, p.carimbo), g = f / FPS, para = f >= cb, ang = para ? cb / FPS * 50 : g * 50;
    const eng = (cx, cy, r, a) => Array.from({ length: 10 }, (_, i) => `<rect x="${cx - 16}" y="${cy - r - 30}" width="32" height="44" fill="${C.tinta}" transform="rotate(${i * 36 + a} ${cx} ${cy})"/>`).join("") + `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.tinta}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.35}" fill="${C.papel}"/>`;
    const k = f - cb, s = k < 0 ? 0 : 1 + 1.4 * Math.exp(-k / 2);
    return svg(`<rect x="190" y="760" width="700" height="520" fill="none" stroke="${C.tinta}" stroke-width="10"/><rect x="460" y="1280" width="160" height="120" fill="${C.tinta}"/>${eng(380, 1020, 110, ang)}${eng(700, 1060, 80, -ang * 1.4)}`) +
      abs("left:70px;top:220px", sobe(f, 0, man(p.linhas[0], 140, C.lapis, 700)) + sobe(f, 8, man(p.linhas[1], 140))) +
      (k >= 0 ? abs(`left:110px;top:900px;transform:rotate(-12deg) scale(${s});opacity:${Math.min(1, k / 2)}`, `<div style="border:14px solid ${C.san};padding:10px 40px;font:700 190px/.9 ${F.disp};color:${C.san}">BLOQUEADO</div>`) : "");
  },
  minerais(p, f) {
    const ct = loc(p, p.corte), sep = iv(f, ct, ct + 10, 0, 1, ease.outC) * 70;
    const tile = (x, n, s, nome, m, a) => { const pp = spring(f, a, "ui");
      return abs(`left:${x}px;top:${760 + (1 - pp) * 300}px;width:400px;height:480px;background:${C.papel2};border:6px solid ${C.tinta};opacity:${pp};transform:translate(${x < 500 ? -sep : sep}px,${x < 500 ? -sep / 2 : sep / 2}px) rotate(${x < 500 ? -sep / 20 : sep / 20}deg)`,
        abs("left:28px;top:20px", `<span style="font:500 50px ${F.mono};color:${C.tinta}">${n}</span>`) + abs("left:0;right:0;top:120px;text-align:center", man(s, 230, C.lapis, 700)) +
        abs("left:28px;bottom:70px", `<span style="font:italic 50px ${F.serif};color:${C.tinta}">${nome}</span>`) + abs("left:28px;bottom:24px", `<span style="font:500 32px ${F.mono};color:${C.muted}">${m}</span>`)); };
    return tile(80, 31, "Ga", "gálio", "69,723", 2) + tile(600, 32, "Ge", "germânio", "72,630", 8) +
      svg(`<line x1="0" y1="${1500 - 1100 * iv(f, ct, ct + 5)}" x2="${W}" y2="${1700 - 1100 * iv(f, ct, ct + 5)}" stroke="${C.san}" stroke-width="10" opacity="${f >= ct && f < ct + 10 ? 1 : 0}"/>`) +
      abs("left:70px;top:220px", sobe(f, 0, man(p.linhas[0], 140, C.san, 700)) + sobe(f, 8, man(p.linhas[1], 140)));
  },
  xadrez(p, f) {
    let cas = "";
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) cas += `<rect x="${j * 100}" y="${i * 100}" width="100" height="100" fill="${(i + j) % 2 ? C.tinta : C.papel2}"/>`;
    const lances = [[[1, 6], [3, 4], C.lapis], [[6, 1], [4, 3], C.san], [[3, 4], [4, 3], C.lapis]];
    const pecas = lances.map(([a, b, cor], i) => { const t = loc(p, p.lances[i]), m = iv(f, t, t + 8, 0, 1, ease.inOutC);
      const x = (a[0] + (b[0] - a[0]) * m) * 100 + 50, y = (a[1] + (b[1] - a[1]) * m) * 100 + 50, salto = Math.sin(m * Math.PI) * 40;
      return i === 1 && f >= loc(p, p.lances[2]) + 6 ? "" : `<circle cx="${x}" cy="${y - salto}" r="34" fill="${cor}" stroke="${C.papel}" stroke-width="6"/><rect x="${x - 22}" y="${y - salto + 10}" width="44" height="22" fill="${cor}"/>`; }).join("");
    return abs(`left:140px;top:640px;width:800px;height:800px;transform:perspective(1400px) rotateX(${38 - 6 * Math.sin(f * 0.04)}deg) rotateZ(${f * 0.15}deg)`, `<svg width="800" height="800">${cas}${pecas}</svg>`) +
      abs("left:70px;top:220px", slam(f, 0, man("um jogo de", 140)) + slam(f, 6, man(p.rotulo, 230, C.lapis, 700)));
  },
  trilhoes(p, f) {
    const a = loc(p, p.de), b = loc(p, p.ate), v = Math.round(iv(f, a, b, 0, 1, ease.outC) * 1000);
    const txt = `US$ ${v.toLocaleString("pt-BR")}.000.000.000`;
    return abs("left:70px;top:520px", rot("um erro de cálculo custa", C.muted, 38)) +
      abs("left:70px;top:640px", slam(f, a, `<div style="font:700 112px/.95 ${F.disp};color:${v >= 1000 ? C.san : C.tinta};white-space:nowrap;font-variant-numeric:tabular-nums">${txt}</div>`, 1.25)) +
      abs("left:70px;top:1300px", sobe(f, b, man("trilhões", 230, C.san, 700)));
  },
  holofote(p, f) {
    const x = 540 + 220 * Math.sin(f * 0.06), y = 1000 + 120 * Math.cos(f * 0.05);
    return `<div style="position:absolute;inset:0;background:radial-gradient(circle 420px at ${x}px ${y}px,rgba(236,228,214,.18),transparent 70%)"></div>` +
      abs("left:70px;top:820px", sobe(f, 0, man(p.linhas[0], 200, C.papel, 400)) + sobe(f, 10, man(p.linhas[1], 230, "#f0a48e", 700)));
  },
  frase(p, f) {
    const h = `<span style="white-space:nowrap">${man(p.texto, 230, p.cor === "san" ? C.san : C.tinta, 700)}</span>`;
    const k = Math.max(0, 1 - f / 10);
    return abs("left:0;right:0;top:760px;text-align:center", slam(f, 0, p.glitch ? glitch(h, k * 4 + (f % 9 < 2 ? 1.5 : 0)) : h, 1.8));
  },
  alerta(p, f) {
    const pisca = Math.floor(f / 10) % 2, resta = Math.max(0, Math.ceil(((ROTEIRO.planos[ROTEIRO.planos.indexOf(p) + 1].t - p.t) * FPS - f) / FPS));
    const contorno = TAIWAN ? d3.geoPath(d3.geoMercator().fitSize([420, 700], TAIWAN))(TAIWAN) : "";
    return `<div style="position:absolute;inset:24px;border:${pisca ? 14 : 6}px solid ${C.san}"></div>` +
      svg(`<g transform="translate(330 560)"><path d="${contorno}" fill="${pisca ? C.san : "none"}" stroke="${C.san}" stroke-width="5"/></g>`) +
      abs("left:70px;top:150px", sobe(f, 0, rot("ALERTA · ESTREITO DE TAIWAN", C.san, 32)) + sobe(f, 4, man(p.linhas[0], 140)) + sobe(f, 10, man(p.linhas[1], 140, C.san, 700))) +
      abs("left:70px;top:1330px", `<div style="font:500 150px ${F.mono};color:${C.tinta}">00:0${resta}</div>`);
  },
  fim(p, f) {
    const rei = loc(p, p.rei), cai = iv(f, rei, rei + 14, 0, 1, ease.inC);
    return svg(`<g transform="translate(780 1100) rotate(${cai * 88})"><rect x="-50" y="-40" width="100" height="40" fill="${C.tinta}"/><path d="M-40 -40 L-30 -220 H30 L40 -40Z" fill="${C.tinta}"/><rect x="-12" y="-300" width="24" height="80" fill="${C.san}"/><rect x="-40" y="-272" width="80" height="24" fill="${C.san}"/></g>
      <path d="M90 760 C 260 740, 420 790, 620 752" stroke="${C.san}" stroke-width="16" fill="none" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${1 - iv(f, 10, 30)}"/>`) +
      abs("left:70px;top:520px", slam(f, 0, man("Sanguina", 230, C.tinta, 700))) +
      abs("left:70px;top:860px", sobe(f, 16, `<div style="display:inline-block;padding:26px 50px;border-radius:999px;background:${C.san};font:600 64px ${F.sans};color:${C.papel}">Segue o canal</div>`)) +
      abs("left:70px;top:1480px", sobe(f, rei, man("o jogo já começou", 120, C.tinta, 400)));
  },
};
const ESCURO = new Set(["ilha", "holofote"]);

// ---------- legenda ----------
const legenda = (t) => {
  const Wd = TIMELINE.words, i = Wd.findIndex((w) => w.e >= t);
  if (i < 0 || Wd[i].s - t > 0.4) return "";
  const ini = Math.floor(i / 3) * 3, g = Wd.slice(ini, ini + 3);
  return abs("left:60px;right:60px;top:1700px;text-align:center", `<span style="display:inline-block;padding:10px 26px;background:${C.tinta};font:600 52px/1.15 ${F.sans};color:${C.papel}">` +
    g.map((w, k) => `<span style="color:${ini + k === i ? "#f0a48e" : C.papel}">${w.w.replace(/[.,?]$/, "")}</span>`).join(" ") + "</span>");
};

window.FILME = {
  width: W, height: H, frames: Math.round(TIMELINE.total * FPS),
  cena(fr) {
    const t = fr / FPS;
    let i = P.findIndex((p, k) => t < (P[k + 1]?.t ?? 1e9)); if (i < 0) i = P.length - 1;
    const p = P[Math.max(0, i)], f = Math.max(0, (t - p.t) * FPS), d = ((P[i + 1]?.t ?? TIMELINE.total) - p.t) * FPS;
    // câmera: punch-in no corte, tremor e clarão nos impactos
    const punch = 1 + 0.07 * Math.exp(-f / 4);
    let tx = 0, ty = 0, flash = 0;
    for (const [ti, forca] of IMPACTOS) { const k = (t - ti) * FPS; if (k >= 0 && k < 14) { const a = 18 * forca * Math.exp(-k / 3); tx += Math.sin(k * 7.3) * a; ty += Math.cos(k * 5.1) * a; if (k < 2) flash = Math.max(flash, 0.55 * forca); } }
    const fimP = d - f, sai = fimP < 4 ? (4 - fimP) / 4 : 0; // saída: zoom + desfoque (whip)
    const esc = ESCURO.has(p.tipo);
    return {
      html: fundo(fr, esc) + svg(`<filter id="vermelho"><feColorMatrix values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/></filter><filter id="azul"><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"/></filter>`, "width:0;height:0") +
        `<div style="position:absolute;inset:0;transform:translate(${tx}px,${ty}px) scale(${punch + sai * 0.12});filter:blur(${sai * 10}px);opacity:${1 - sai * 0.3}">${R[p.tipo](p, f, d)}</div>` +
        abs(`inset:0;background:#fff;opacity:${flash}`) +
        abs("left:70px;top:70px", rot("Sanguina", esc ? C.papel : C.tinta, 28)) +
        abs(`left:0;top:0;height:10px;width:${(t / TIMELINE.total) * W}px;background:${C.san}`) + legenda(t),
    };
  },
};
