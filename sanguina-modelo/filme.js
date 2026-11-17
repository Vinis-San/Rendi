// Modelo de motion do canal Sanguina — reutilizável.
// Cada vídeo só fornece: roteiro.json + timeline.json (gerados em dados.js por montar.py) + img/<nome>.png.
// Tipos de cena: prancha · tres · capitulo · cta. Legenda palavra por palavra em todas.
/* global FPS, iv, spring, ease, ROTEIRO, TIMELINE */

const PIG = {
  violeta: "#563a9e", lapis: "#2648a8", salvia: "#346242", rosa: "#a83460", ocre: "#96580e", sanguina: "#962e1a",
};
const C = { papel: "#ece4d6", papel2: "#e2d8c6", tinta: "#1b1a2a", muted: "#5b5566", fio: "#c4b8a3", san: "#a8472f" };
const COR = PIG[ROTEIRO.pigmento] || PIG.violeta;
const F = {
  // Aspas simples: estes valores vão dentro de style="…".
  disp: "'Big Shoulders Display', 'Arial Narrow', sans-serif",
  serif: "'Cormorant Garamond', Georgia, serif",
  sans: "'Hanken Grotesk', Arial, sans-serif",
  mono: "'IBM Plex Mono', Consolas, monospace",
};
const IMG = { schopenhauer: "img/schopenhauer.png", anjo: "img/anjo-caido.png", viajante: "img/viajante.png", filosofo: "img/filosofo.png" };

const abs = (st, h = "") => `<div style="position:absolute;${st}">${h}</div>`;
const rot = (t, cor = C.muted, size = 22) => `<div style="font:500 ${size}px ${F.mono};letter-spacing:.18em;text-transform:uppercase;color:${cor}">${t}</div>`;
const entra = (f, at, h, dy = 40) => { const p = iv(f, at, at + 16); return `<div style="opacity:${p};transform:translateY(${(1 - p) * dy}px);filter:blur(${(1 - p) * 8}px)">${h}</div>`; };
const man = (t, size = 190, cor = C.tinta) => `<div style="font:300 ${size}px/.9 ${F.disp};text-transform:uppercase;color:${cor}">${t}</div>`;

// Prancha emoldurada com zoom lento (Ken Burns) e revelação por cortina.
const prancha = (f, dur, src, x, y, w, h, pos = "50% 30%") => {
  const z = 1.04 + 0.06 * iv(f, 0, dur, 0, 1, (k) => k);
  const rev = iv(f, 0, 22, 0, 1, ease.inOutC);
  return abs(`left:${x}px;top:${y}px;width:${w}px;height:${h}px;outline:1px solid ${C.fio};outline-offset:14px;overflow:hidden;clip-path:inset(0 ${(1 - rev) * 100}% 0 0)`,
    `<img src="${src}" style="width:100%;height:100%;object-fit:cover;object-position:${pos};transform:scale(${z});transform-origin:50% 40%">`);
};

// Legenda: janela de até 6 palavras da frase atual, palavra falada em sanguina.
const legenda = (t) => {
  const W = TIMELINE.words;
  let i = W.findIndex((w) => w.e >= t);
  if (i < 0 || W[i].s - t > 0.6) return "";
  const ini = Math.floor(i / 6) * 6, grupo = W.slice(ini, ini + 6);
  return abs("left:0;right:0;bottom:70px;text-align:center",
    `<span style="display:inline-block;padding:10px 26px;background:${C.papel};font:600 44px/1.2 ${F.sans};color:${C.tinta}">` +
    grupo.map((w, k) => `<span style="color:${ini + k === i ? C.san : C.tinta}">${w.w}</span>`).join(" ") + "</span>");
};

const cenas = {
  prancha(c, f, d) {
    return prancha(f, d, IMG[c.img], 1040, 150, 760, 760) +
      abs("left:120px;top:190px", entra(f, 4, rot(c.rotulo)) + `<div style="height:30px"></div>` + entra(f, 12, man(c.titulo, 170))) +
      abs(`left:122px;top:610px;width:${iv(f, 30, 60) * 300}px;height:5px;background:${C.san};border-radius:3px`);
  },
  tres(c, f) {
    return abs("left:120px;top:140px", entra(f, 4, rot(c.rotulo)) + `<div style="height:24px"></div>` + entra(f, 10, man(c.titulo, 150))) +
      c.itens.map((t, k) => {
        const at = 60 + k * 110, p = spring(f, at, "ui"), risca = k === 2 ? iv(f, at + 120, at + 140) : 0;
        return abs(`left:${150 + k * 560}px;top:520px;width:420px;height:420px;border-radius:50%;border:2px solid ${k === 2 ? COR : C.tinta};opacity:${p};transform:scale(${0.85 + 0.15 * p});display:flex;align-items:center;justify-content:center;text-align:center`,
          `<div style="position:relative;font:italic 54px/1.05 ${F.serif};color:${C.tinta};padding:0 40px">${t}<span style="position:absolute;left:10%;width:80%;top:50%;height:5px;background:${C.san};transform-origin:left;transform:scaleX(${risca})"></span></div>`);
      }).join("");
  },
  capitulo(c, f, d) {
    // 1º: cartão "#N" grande; depois o título vai para a esquerda e a prancha entra.
    const sai = iv(f, 36, 48), troca = iv(f, 50, 64, 0, 1, ease.inOutC); // um sai antes do outro entrar
    const num = abs(`left:120px;top:160px;opacity:${1 - sai}`,
      entra(f, 0, `<div style="font:300 520px/.8 ${F.disp};color:${COR}">#${c.n}</div>`));
    const lado = abs(`left:120px;top:190px;opacity:${troca}`,
      rot(`#${c.n} · ${ROTEIRO.cenas.filter((x) => x.tipo === "capitulo").length} coisas`) + `<div style="height:26px"></div>` + man(c.titulo, 150) +
      (c.citacao ? `<div style="margin-top:60px;max-width:760px;opacity:${iv(f, 120, 140)}"><div style="font:italic 50px/1.12 ${F.serif};color:${C.tinta}">“${c.citacao}”</div><div style="margin-top:20px">${rot(c.fonte)}</div></div>` : ""));
    const titulo0 = abs(`left:600px;top:330px;opacity:${1 - sai}`, entra(f, 8, man(c.titulo, 150)));
    const img = c.img === "pontos" ? (f > 50 ? porcos(f) : "") : (f > 50 ? prancha(f - 50, d - 50, IMG[c.img], 1040, 150, 760, 760) : "");
    return num + titulo0 + lado + img;
  },
  cta(c, f) {
    const p = spring(f, 20, "pesado");
    return abs("left:120px;top:200px", entra(f, 4, rot("Para praticar todo dia", C.san)) + `<div style="height:24px"></div>` + entra(f, 10, man(c.titulo, 160)) +
        entra(f, 30, `<div style="font:italic 56px ${F.serif};color:${C.muted};margin-top:20px">${c.sub}</div>`) +
        entra(f, 90, `<div style="display:inline-block;margin-top:60px;padding:24px 44px;border-radius:999px;background:${C.san};font:600 44px ${F.sans};color:#f6efe3">link na descrição</div>`)) +
      abs(`left:1180px;top:${170 + (1 - p) * 160}px;width:520px;height:700px;opacity:${p};background:${COR};transform:rotate(${-3 * p}deg);outline:1px solid ${C.fio};outline-offset:14px`,
        abs("left:50px;top:60px", rot("Sanguina", "#ece6f7")) + abs("left:50px;top:150px", man("Caderno<br>Sanguina", 120, "#f3eefb")) + abs("left:50px;bottom:60px", `<div style="font:italic 40px ${F.serif};color:#e6def6">30 dias · 1 filósofo por manhã</div>`));
  },
};

// Dilema dos porcos-espinhos: pontos se aproximam, espetam, se afastam e estabilizam.
const porcos = (f) => {
  const g = f / FPS, n = 7, pts = [];
  const dist = 120 + 160 * Math.exp(-g * 0.25) * Math.cos(g * 1.3) + 40;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2, r = dist;
    const x = 1420 + Math.cos(a) * r, y = 530 + Math.sin(a) * r;
    pts.push(`<circle cx="${x}" cy="${y}" r="26" fill="${COR}"/>` + Array.from({ length: 10 }, (_, j) => {
      const b = (j / 10) * Math.PI * 2; return `<line x1="${x}" y1="${y}" x2="${x + Math.cos(b) * 44}" y2="${y + Math.sin(b) * 44}" stroke="${COR}" stroke-width="3"/>`;
    }).join(""));
  }
  return `<svg width="1920" height="1080" style="position:absolute;inset:0"><circle cx="1420" cy="530" r="160" fill="none" stroke="${C.fio}" stroke-dasharray="6 8"/>${pts.join("")}</svg>`;
};

const CENAS = ROTEIRO.cenas.map((c, i) => ({ ...c, ini: TIMELINE.scenes[i].from, dur: TIMELINE.scenes[i].dur }));
window.FILME = {
  frames: Math.round((TIMELINE.total + 0.5) * FPS),
  cena(fr) {
    const t = fr / FPS;
    let i = CENAS.findIndex((c, k) => t < (CENAS[k + 1]?.ini ?? 1e9) - 0.15);
    if (i < 0) i = CENAS.length - 1;
    const c = CENAS[i], f = fr - c.ini * FPS + 8, d = (CENAS[i + 1]?.ini ?? TIMELINE.total) * FPS - c.ini * FPS;
    const fim = (CENAS[i + 1]?.ini ?? 1e9) * FPS - fr;
    const vis = Math.min(iv(f, 0, 10), iv(fim, 0, 8));
    const grao = `<svg width="1920" height="1080" style="position:absolute;inset:0;opacity:.06;mix-blend-mode:multiply"><filter id="n"><feTurbulence baseFrequency=".85" seed="${fr % 5}"/></filter><rect width="1920" height="1080" filter="url(#n)"/></svg>`;
    return {
      html: `<div style="position:absolute;inset:0;background:${C.papel}"></div>
        <div style="position:absolute;inset:0;opacity:${vis}">${cenas[c.tipo](c, f, d)}</div>
        ${grao}
        ${abs(`left:120px;right:120px;top:100px;height:1px;background:${C.fio}`)}
        ${abs(`left:120px;bottom:40px`, `<div style="font:400 30px ${F.disp};letter-spacing:.06em;color:${C.tinta}">SANGUINA</div>`)}
        ${abs(`left:0;top:0;height:4px;width:${(t / TIMELINE.total) * 1920}px;background:${C.san}`)}
        ${legenda(t)}`,
    };
  },
};
