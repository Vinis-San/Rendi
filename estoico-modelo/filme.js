// Modelo "Não Amanhã" (estoicismo, 16:9) para o motor sem framework.
// Cada vídeo fornece roteiro.json + timeline.json (em dados.js, via montar.py) + img/cNN.jpg.
// Tipos de cena: pintura · cartela · impacto · conceito · citacao · numero · cadeados · cta.
/* global FPS, iv, kf, spring, ease, rng, ROTEIRO, TIMELINE */

const C = {
  papel: "#efe8dc", papel2: "#e4dac8", tinta: "#1c2230", noite: "#12161d", noite2: "#1b212c",
  terra: "#b4502e", terra2: "#d8774f", muted: "#6a655c", mutedN: "#a9a294", fio: "#cfc3ae",
};
const F = {
  // Aspas simples: os valores entram em style="…".
  serif: "'Playfair Display', Georgia, serif",
  sans: "'Montserrat', Arial, sans-serif",
};
const W = 1920, H = 1080;

const abs = (st, h = "") => `<div style="position:absolute;${st}">${h}</div>`;
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
const entra = (f, at, h, dy = 36) => {
  const p = iv(f, at, at + 16);
  return `<div style="opacity:${p};transform:translateY(${(1 - p) * dy}px);filter:blur(${(1 - p) * 6}px)">${h}</div>`;
};
const chip = (t, escuro = true) =>
  `<div style="display:inline-block;font:800 20px ${F.sans};letter-spacing:.28em;text-transform:uppercase;color:${escuro ? C.terra2 : C.terra};border-bottom:3px solid ${escuro ? C.terra2 : C.terra};padding-bottom:8px">${esc(t)}</div>`;

// Marca-texto: faixa terracota que varre por trás da palavra.
const marca = (f, at, t, size, escuro) => {
  const p = iv(f, at, at + 14, 0, 1, ease.inOutC);
  return `<span style="position:relative;display:inline-block;padding:0 .12em;color:${p > 0.55 ? "#fff" : escuro ? "#f3ede2" : C.tinta}">` +
    `<span style="position:absolute;left:0;right:0;top:12%;bottom:6%;background:${C.terra};transform-origin:left;transform:scaleX(${p})"></span>` +
    `<span style="position:relative">${esc(t)}</span></span>`;
};

// Imagem cheia com Ken Burns determinístico (direção alterna por cena).
const foto = (src, f, d, i, st = "", extra = "") => {
  const k = iv(f, 0, d, 0, 1, (x) => x);
  const dir = i % 4;
  const z = 1.06 + 0.1 * k;
  const tx = [-1, 1, 0, 0][dir] * 30 * (k - 0.5), ty = [0, 0, -1, 1][dir] * 20 * (k - 0.5);
  return abs(`inset:0;overflow:hidden;${st}`,
    // Correção de cor única para fotos de fontes diferentes parecerem do mesmo filme.
    `<img src="${src}" style="width:100%;height:100%;object-fit:cover;transform:translate(${tx}px,${ty}px) scale(${z});filter:sepia(.22) saturate(.78) contrast(1.06) brightness(.9);${extra}">`);
};
const veu = (a = 0.55) => abs(`inset:0;background:linear-gradient(180deg,rgba(18,22,29,${a * 0.5}) 0%,rgba(18,22,29,${a * 0.2}) 40%,rgba(18,22,29,${a}) 100%)`);
const vinheta = abs("inset:0;background:radial-gradient(ellipse at 50% 45%,transparent 55%,rgba(0,0,0,.45) 100%)");

// Legenda palavra a palavra: janela de 3 palavras, a falada em terracota.
const legenda = (t) => {
  const P = TIMELINE.words;
  let i = P.findIndex((w) => w.e >= t);
  if (i < 0 || P[i].s - t > 0.5) return "";
  const ini = Math.floor(i / 3) * 3, g = P.slice(ini, ini + 3);
  const pop = iv(t * FPS, P[i].s * FPS, P[i].s * FPS + 4);
  return abs("left:0;right:0;bottom:96px;text-align:center",
    g.map((w, k) => {
      const at = ini + k === i;
      return `<span style="display:inline-block;margin:0 12px;font:800 64px/1.1 ${F.sans};color:${at ? C.terra2 : "#fff"};` +
        `text-shadow:0 4px 18px rgba(0,0,0,.75),0 2px 2px rgba(0,0,0,.6);transform:scale(${at ? 1 + 0.08 * pop : 1})">${esc(w.w)}</span>`;
    }).join(""));
};

// Cena sem imagem: a frase narrada grande, palavras acendendo conforme a voz (técnica "palavra em fundo liso").
const frase = (c, f) => {
  const P = TIMELINE.words.filter((w) => w.s >= c.ini - 0.05 && w.s < c.ini + c.durS);
  const n = P.length, size = n > 22 ? 64 : n > 14 ? 76 : 92;
  return abs(`inset:0;background:${C.noite}`) +
    abs(`inset:0;background:radial-gradient(ellipse at 50% 50%,rgba(180,80,46,.10),transparent 65%)`) +
    abs("left:220px;right:220px;top:0;bottom:0;display:flex;align-items:center;justify-content:center;text-align:center",
      `<div style="font:700 ${size}px/1.3 ${F.serif};color:#f3ede2">` +
      P.map((w) => {
        const on = iv(c.t * FPS, w.s * FPS - 2, w.s * FPS + 5);
        const agora = c.t >= w.s && c.t < w.e + 0.15;
        return `<span style="opacity:${0.18 + 0.82 * on};color:${agora ? C.terra2 : "#f3ede2"}">${esc(w.w)}</span>`;
      }).join(" ") + "</div>");
};

const fundo = (escuro) => abs(`inset:0;background:${escuro ? C.noite : C.papel}`);

const cenas = {
  pintura(c, f, d, i) {
    if (!c.img) return frase(c, f);
    return foto(c.img, f, d, i) + veu(0.6) + vinheta +
      (c.rotulo ? abs("left:120px;top:110px", entra(f, 6, chip(c.rotulo))) : "") + legenda(c.t);
  },
  cartela(c, f) {
    const esc_ = c.fundo === "escuro";
    return fundo(esc_) + abs("left:160px;right:160px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center",
      entra(f, 2, `<div style="font:italic 600 46px ${F.serif};color:${esc_ ? C.mutedN : C.muted};margin-bottom:26px">${esc(c.pre)}</div>`) +
      entra(f, 10, `<div style="font:800 118px/1.08 ${F.serif};color:${esc_ ? "#f3ede2" : C.tinta}">${esc(c.linha)} ${marca(f, 24, c.marca, 118, esc_)}${c.pos ? " " + esc(c.pos) : ""}</div>`));
  },
  impacto(c, f) {
    const p = spring(f, 6, "quica");
    const r = rng(Math.floor(f / 2) + 7);
    const tremor = f > 20 ? 1 : 0;
    const dx = (r() - 0.5) * 8 * tremor, dy = (r() - 0.5) * 8 * tremor;
    const len = String(c.palavra).length;
    const size = Math.min(300, Math.floor(1600 / Math.max(4, len * 0.62)));
    return fundo(true) + abs(`inset:0;background:radial-gradient(ellipse at 50% 55%,rgba(180,80,46,${0.22 * p}) 0%,transparent 60%)`) +
      abs("left:0;right:0;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center",
        entra(f, 0, `<div style="font:700 40px ${F.sans};letter-spacing:.12em;text-transform:uppercase;color:${C.mutedN};margin-bottom:24px">${esc(c.pre)}</div>`) +
        `<div style="font:900 ${size}px/1 ${F.serif};text-transform:uppercase;color:${C.terra2};transform:translate(${dx}px,${dy}px) scale(${0.6 + 0.4 * p});opacity:${Math.min(1, p * 1.4)}">${esc(c.palavra)}</div>`);
  },
  conceito(c, f, d, i) {
    const p = spring(f, 4, "pesado");
    return fundo(true) +
      abs(`left:150px;top:150px;width:620px;height:780px;overflow:hidden;border-radius:6px;outline:2px solid ${C.terra};outline-offset:14px;opacity:${p};transform:translateX(${(1 - p) * -60}px)`,
        `<div style="position:absolute;inset:0">${foto(c.img, f, d, i)}</div>`) +
      abs("left:880px;right:150px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center",
        entra(f, 10, chip(c.rotulo)) + `<div style="height:34px"></div>` +
        entra(f, 18, `<div style="font:800 96px/1.1 ${F.serif};color:#f3ede2">${esc(c.linha)}<br>${marca(f, 34, c.marca, 96, true)}</div>`));
  },
  citacao(c, f, d, i) {
    const temImg = !!c.img;
    return fundo(true) + (temImg ? foto(c.img, f, d, i, "opacity:.32", "filter:grayscale(.5)") + veu(0.7) : "") +
      abs("left:200px;right:200px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center",
        entra(f, 0, `<div style="font:900 200px/0.6 ${F.serif};color:${C.terra2};height:100px">“</div>`) +
        entra(f, 8, `<div style="font:italic 600 60px/1.25 ${F.serif};color:#e9e2d4;margin-bottom:20px">${esc(c.l1)}</div>`) +
        entra(f, 22, `<div style="font:800 84px/1.15 ${F.serif};color:#fff">${esc(c.l2)} <span style="color:${C.terra2}">${esc(c.destaque)}</span></div>`));
  },
  numero(c, f) {
    const p = spring(f, 4, "padrao");
    return fundo(false) + abs("left:0;right:0;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center",
      `<div style="font:900 ${String(c.n).length > 8 ? 130 : 260}px/1 ${F.serif};color:${C.terra};transform:scale(${0.7 + 0.3 * p});opacity:${p}">${esc(c.n)}</div>` +
      entra(f, 14, `<div style="font:800 76px/1.15 ${F.serif};color:${C.tinta};margin-top:20px">${esc(c.linha)} ${marca(f, 28, c.marca, 76, false)}</div>`) +
      entra(f, 26, `<div style="font:600 34px ${F.sans};color:${C.muted};margin-top:22px">${esc(c.sub)}</div>`));
  },
  cadeados(c, f) {
    const cad = (aberto, cor) => `<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="${cor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/>${aberto ? '<path d="M8 11V7a4 4 0 0 1 7.5-2"/>' : '<path d="M8 11V7a4 4 0 0 1 8 0v4"/>'}</svg>`;
    return fundo(true) + abs("left:220px;top:150px", entra(f, 0, chip(c.rotulo))) +
      abs("left:220px;right:220px;top:300px", c.itens.map((t, k) => {
        const n = k + 1, feito = n < c.ate, atual = n === c.ate;
        const p = atual ? spring(f, 8, "ui") : 1;
        const cor = feito || atual ? C.terra2 : "#4a5160";
        return `<div style="display:flex;align-items:center;gap:36px;margin-bottom:46px;opacity:${feito ? 0.55 : atual ? 1 : 0.4};transform:translateX(${atual ? (1 - p) * 40 : 0}px)">` +
          `<div style="width:96px;height:96px;border-radius:50%;border:3px solid ${cor};display:grid;place-items:center">${cad(feito || atual, cor)}</div>` +
          `<div style="font:800 26px ${F.sans};color:${cor};letter-spacing:.2em">PASSO ${n}</div>` +
          `<div style="font:800 ${atual ? 78 : 60}px ${F.serif};color:${atual ? "#fff" : "#c9c2b4"}">${esc(t)}</div></div>`;
      }).join(""));
  },
  cta(c, f, d, i) {
    const p = spring(f, 10, "pesado");
    const seta = Math.sin((f / FPS) * Math.PI * 2) * 8;
    return foto(c.img, f, d, i) + abs("inset:0;background:linear-gradient(90deg,rgba(18,22,29,.15) 0%,rgba(18,22,29,.85) 60%)") +
      abs(`left:1000px;top:${190 + (1 - p) * 80}px;width:760px;opacity:${p};background:${C.noite2};border-top:6px solid ${C.terra};padding:56px`,
        chip(c.rotulo) + `<div style="font:800 70px/1.12 ${F.serif};color:#fff;margin:30px 0 44px">${esc(c.titulo)}</div>` +
        `<div style="display:inline-flex;align-items:center;gap:18px;background:${C.terra};color:#fff;font:800 34px ${F.sans};padding:26px 40px;border-radius:12px;box-shadow:0 8px 0 #7d3519">${esc(c.botao)}` +
        `<span style="display:inline-block;transform:translateY(${seta}px)">↓</span></div>`);
  },
};

const CENAS = ROTEIRO.cenas.map((c, i) => ({
  ...c, i, img: c.visual ? `img/c${String(i).padStart(2, "0")}.jpg` : null,
  ini: TIMELINE.scenes[i].from, durS: TIMELINE.scenes[i].dur,
}));

window.FILME = {
  frames: Math.round((TIMELINE.total + 0.3) * FPS),
  cena(fr) {
    const t = fr / FPS;
    let i = CENAS.findIndex((c, k) => t < (CENAS[k + 1]?.ini ?? 1e9) - 0.12);
    if (i < 0) i = CENAS.length - 1;
    const c = { ...CENAS[i], t };
    const f = fr - c.ini * FPS + 6;
    const d = ((CENAS[i + 1]?.ini ?? TIMELINE.total) - c.ini) * FPS;
    const fim = (CENAS[i + 1]?.ini ?? 1e9) * FPS - fr;
    const vis = Math.min(iv(f, 0, 8), iv(fim, 0, 6));
    const tipo = cenas[c.tipo] ? c.tipo : "pintura";
    const grao = `<svg width="${W}" height="${H}" style="position:absolute;inset:0;opacity:.05;mix-blend-mode:overlay"><filter id="n"><feTurbulence baseFrequency=".9" seed="${fr % 6}"/></filter><rect width="${W}" height="${H}" filter="url(#n)"/></svg>`;
    return {
      html: `<div style="position:absolute;inset:0;background:${C.noite}"></div>
        <div style="position:absolute;inset:0;opacity:${vis}">${cenas[tipo](c, f, d, i)}</div>
        ${grao}
        ${abs(`left:0;top:0;height:5px;width:${(t / TIMELINE.total) * W}px;background:${C.terra}`)}
        ${abs("right:60px;top:40px", `<div style="font:800 18px ${F.sans};letter-spacing:.3em;color:rgba(255,255,255,.55);text-shadow:0 1px 4px rgba(0,0,0,.6)">NÃO AMANHÃ.</div>`)}`,
    };
  },
};
