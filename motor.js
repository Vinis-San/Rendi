// Motor de quadros sem framework: tudo é função pura do tempo.
// Contrato de render: nada de timers, transições CSS, Math.random ou estado entre quadros.
// O filme define window.FILME = { dur, cena(f) → { html, cursor? } } e o motor expõe window.seek(t).

const FPS = 30;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const ease = {
  lin: (x) => x,
  outC: (x) => 1 - Math.pow(1 - x, 3),
  inC: (x) => x * x * x,
  inOutC: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
};

// interpolação com clamp: iv(f, de, ate, v0, v1, easing)
const iv = (f, a, b, from = 0, to = 1, e = ease.outC) => from + (to - from) * e(clamp((f - a) / (b - a), 0, 1));

// interpolação por keyframes
const kf = (f, frames, vals, e = ease.inOutC) => {
  if (f <= frames[0]) return vals[0];
  for (let i = 0; i < frames.length - 1; i++) {
    if (f <= frames[i + 1]) return vals[i] + (vals[i + 1] - vals[i]) * e((f - frames[i]) / (frames[i + 1] - frames[i] || 1));
  }
  return vals[vals.length - 1];
};

// Mola em forma fechada (resposta ao degrau): qualquer quadro calcula sozinho.
// Presets (rigidez/amortecimento): UI ágil 320/30 · padrão 170/26 · pesado 120/24.
const MOLA = { ui: [320, 30, 1], padrao: [170, 26, 1], pesado: [120, 24, 1], solta: [100, 9, 0.6], quica: [140, 13, 0.6] };
const spring = (f, delay = 0, tipo = "padrao") => {
  const t = (f - delay) / FPS;
  if (t <= 0) return 0;
  const [k, d, m] = MOLA[tipo];
  const w0 = Math.sqrt(k / m);
  const z = d / (2 * Math.sqrt(k * m));
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
  }
  if (z === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  const s = Math.sqrt(z * z - 1);
  const r1 = -w0 * (z - s);
  const r2 = -w0 * (z + s);
  return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
};

// Ruído determinístico (mulberry32) para quando precisar de "aleatório".
const rng = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Cursor: pontos [frame, "ancora"] ou [frame, x, y]; âncoras (data-anchor) medidas no DOM do próprio quadro.
const desenharCursor = (f, c) => {
  const el = document.getElementById("cursor");
  if (!c) {
    el.innerHTML = "";
    return;
  }
  const pos = (p) => {
    if (typeof p[1] !== "string") return [p[1], p[2]];
    const a = document.querySelector(`[data-anchor="${p[1]}"]`);
    if (!a) return [960, 1200];
    const r = a.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  };
  const xy = c.pts.map(pos);
  const fr = c.pts.map((p) => p[0]);
  const x = kf(f, fr, xy.map((q) => q[0]));
  const y = kf(f, fr, xy.map((q) => q[1]));
  const vis = iv(f, fr[0] - 6, fr[0]);
  const cor = c.cor || "#2459e8";
  let aneis = "";
  for (const k of c.clicks || []) {
    if (f >= k && f < k + 16) {
      const r = iv(f, k, k + 14);
      aneis += `<div style="position:absolute;left:${x - 60 * r}px;top:${y - 60 * r}px;width:${120 * r}px;height:${120 * r}px;border-radius:50%;border:2px solid ${cor};opacity:${1 - r}"></div>`;
    }
  }
  const press = (c.clicks || []).some((k) => f >= k && f < k + 4);
  el.innerHTML = `${aneis}<svg style="position:absolute;left:${x - 6}px;top:${y - 3}px;opacity:${vis};transform:scale(${press ? 0.85 : 1});transform-origin:6px 3px;filter:drop-shadow(0 4px 8px rgba(0,0,0,.25))" width="34" height="34" viewBox="0 0 24 24"><path d="M4 2 L4 19 L8.5 15 L11.5 22 L14.5 20.7 L11.5 14 L18 14 Z" fill="#111" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
};

window.seek = (t) => {
  const f = t * FPS;
  const q = window.FILME.cena(f);
  document.getElementById("palco").innerHTML = q.html;
  desenharCursor(q.cursorF ?? f, q.cursor);
  return true;
};
