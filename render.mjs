// Render sem framework: abre o filme no Chrome do sistema, chama seek(t) quadro a quadro e envia ao ffmpeg.
// Uso:
//   node render.mjs pf                    → pf/final.mp4 (30 fps; --sub 3 mistura subquadros = motion blur)
//   node render.mjs pf --stills           → pf/stills.jpg (1 quadro por batida, para revisão)
//   node render.mjs pf --sub 1 --de 15 --ate 21   (trecho, em segundos)
//   node render.mjs pf --abas 4           (4 Chromes em paralelo na mesma máquina; padrão: nº de núcleos, máx. 4)
//   node render.mjs pf --audio audio.wav  (fonte de áudio sem perdas, opcional)
// Otimizações: quadro idêntico ao anterior (mesmo DOM) reaproveita o print; x264 veryfast.
import { spawn } from "node:child_process";
import { availableParallelism } from "node:os";
import { rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const args = process.argv.slice(2);
const filme = args[0] ?? "pf";
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const SUB = Number(opt("--sub", 1));
const ABAS = Math.max(1, Number(opt("--abas", Math.min(4, availableParallelism()))));
const PRESET = opt("--preset", "veryfast");
const FPS = 30;
const dir = resolve(filme);

const ffmpeg = (argv) => {
  const p = spawn("ffmpeg", argv, { stdio: ["pipe", "inherit", "inherit"] });
  const fim = new Promise((ok, err) => p.on("close", (c) => (c ? err(new Error("ffmpeg " + c)) : ok())));
  const write = (b) => new Promise((ok) => (p.stdin.write(b) ? ok() : p.stdin.once("drain", ok)));
  return { write, end: async () => (p.stdin.end(), fim) };
};

// Cada aba roda num Chrome próprio: abas do mesmo navegador dividem o processo de composição e não escalam.
const navegadores = [];
const abrir = async () => {
  const browser = await chromium.launch({ channel: opt("--canal", "chrome"), headless: true, args: ["--disable-gpu-vsync", "--disable-frame-rate-limit"] });
  navegadores.push(browser);
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(resolve(dir, "index.html")).href);
  await page.evaluate(async () => {
    if (window.READY) await window.READY;
    window.seek(0);
    await document.fonts.ready;
  });
  const info = await page.evaluate(() => ({ frames: window.FILME.frames, bpm: window.PLANO?.bpm ?? 80, w: window.FILME.width ?? 1920, h: window.FILME.height ?? 1080 }));
  if (info.w !== 1920 || info.h !== 1080) await page.setViewportSize({ width: info.w, height: info.h });
  const cdp = await page.context().newCDPSession(page);
  let ultimo = { h: -1, buf: null };
  const stats = { prints: 0, reuso: 0 };
  // seek + hash do DOM no mesmo round-trip; se o desenho não mudou, reaproveita o JPEG anterior.
  const shot = async (t) => {
    const h = await page.evaluate((x) => {
      window.seek(x);
      // Números arredondados a 2 casas: molas que "nunca param" (0.99997→0.99998) contam como quadro igual.
      const s = (document.getElementById("palco").innerHTML + "|" + (document.getElementById("cursor")?.innerHTML ?? ""))
        .replace(/(\d+\.\d{2})\d+/g, "$1");
      let a = 2166136261;
      for (let i = 0; i < s.length; i++) { a ^= s.charCodeAt(i); a = Math.imul(a, 16777619); }
      return a >>> 0;
    }, t);
    if (h === ultimo.h && ultimo.buf) { stats.reuso++; return ultimo.buf; }
    const { data } = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: Number(opt("--jpeg", 88)), optimizeForSpeed: true });
    ultimo = { h, buf: Buffer.from(data, "base64") };
    stats.prints++;
    return ultimo.buf;
  };
  return { info, shot, stats };
};

const t0 = Date.now();
const primeira = await abrir();
const info = primeira.info;

if (args.includes("--stills")) {
  const beat = 60 / info.bpm;
  const n = Math.floor(info.frames / FPS / beat);
  const ff = ffmpeg(["-v", "error", "-y", "-f", "image2pipe", "-c:v", "mjpeg", "-i", "-", "-vf", `scale=384:-1,tile=8x${Math.ceil(n / 8)}`, "-frames:v", "1", resolve(dir, "stills.jpg")]);
  for (let b = 0; b < n; b++) await ff.write(await primeira.shot(b * beat + beat * 0.6));
  await ff.end();
  console.log(`stills: ${n} batidas → ${filme}/stills.jpg`);
} else {
  const de = Math.round(Number(opt("--de", 0)) * FPS);
  const ate = Math.min(info.frames, Math.round(Number(opt("--ate", info.frames / FPS)) * FPS));
  const saida = resolve(dir, opt("--saida", "final.mp4"));
  const inteiro = de === 0 && ate === info.frames;
  const vf = SUB > 1 ? `tmix=frames=${SUB},select='not(mod(n\\,${SUB}))',setpts=N/${FPS}/TB` : "null";
  const n = Math.max(1, Math.min(ABAS, Math.ceil((ate - de) / 60)));
  const abas = [primeira, ...(await Promise.all(Array.from({ length: n - 1 }, abrir)))];
  const cortes = Array.from({ length: n + 1 }, (_, k) => de + Math.round(((ate - de) * k) / n));
  const pedacos = abas.map((_, k) => resolve(dir, `.trecho-${process.pid}-${k}.mp4`));
  let feitos = 0;
  await Promise.all(abas.map(async (aba, k) => {
    const ff = ffmpeg(["-v", "error", "-y", "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", String(FPS * SUB), "-i", "-",
      "-vf", vf, "-r", String(FPS), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", "-preset", PRESET, "-threads", "2", pedacos[k]]);
    for (let i = cortes[k]; i < cortes[k + 1]; i++) {
      // subquadros espalhados em meio quadro (obturador de 180°)
      for (let j = 0; j < SUB; j++) await ff.write(await aba.shot((i + (SUB > 1 ? j / (2 * SUB) : 0)) / FPS));
      if (++feitos % 120 === 0) process.stdout.write(`\r${feitos}/${ate - de} quadros`);
    }
    await ff.end();
  }));
  // Junta os pedaços (mesmo codec/parâmetros → cópia sem recodificar) e põe o áudio se for o filme inteiro.
  const lista = resolve(dir, `.lista-${process.pid}.txt`);
  writeFileSync(lista, pedacos.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n"));
  const audio = inteiro ? ["-i", resolve(dir, opt("--audio", "audio.mp3")), "-c:a", "aac", "-b:a", "192k", "-shortest"] : [];
  await ffmpeg(["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lista, ...audio, "-c:v", "copy", "-movflags", "+faststart", saida]).end();
  for (const p of [...pedacos, lista]) rmSync(p, { force: true });
  const prints = abas.reduce((s, a) => s + a.stats.prints, 0), reuso = abas.reduce((s, a) => s + a.stats.reuso, 0);
  console.log(`\nok ${saida} (${((Date.now() - t0) / 1000).toFixed(0)} s · ${n} abas · ${prints} prints · ${reuso} quadros reaproveitados)`);
}
await Promise.all(navegadores.map((b) => b.close()));
