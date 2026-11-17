// Render sem framework: abre o filme no Chrome do sistema, chama seek(t) quadro a quadro e envia ao ffmpeg.
// Uso:
//   node render.mjs pf                    → pf/final.mp4 (30 fps, 3 subframes misturados = motion blur)
//   node render.mjs pf --stills           → pf/stills.jpg (1 quadro por batida, para revisão)
//   node render.mjs pf --sub 1 --de 15 --ate 21   (trecho rápido, em segundos)
//   node render.mjs pf --audio audio.wav          (fonte de áudio sem perdas, opcional)
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const args = process.argv.slice(2);
const filme = args[0] ?? "pf";
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const SUB = Number(opt("--sub", 3));
const FPS = 30;
const dir = resolve(filme);

const browser = await chromium.launch({ channel: opt("--canal", "chrome"), headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(resolve(dir, "index.html")).href);
await page.evaluate(async () => {
  if (window.READY) await window.READY;
  window.seek(0);
  await document.fonts.ready;
});
const info = await page.evaluate(() => ({ frames: window.FILME.frames, bpm: window.PLANO.bpm ?? 80, w: window.FILME.width ?? 1920, h: window.FILME.height ?? 1080 }));
// Formato vertical (9:16) ou outro: o filme declara FILME.width/height.
if (info.w !== 1920 || info.h !== 1080) await page.setViewportSize({ width: info.w, height: info.h });
const cdp = await page.context().newCDPSession(page);
const shot = async (t) => {
  await page.evaluate((x) => window.seek(x), t);
  const { data } = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 92, optimizeForSpeed: true });
  return Buffer.from(data, "base64");
};

const ffmpeg = (argv) => {
  const p = spawn("ffmpeg", argv, { stdio: ["pipe", "inherit", "inherit"] });
  const fim = new Promise((ok, err) => p.on("close", (c) => (c ? err(new Error("ffmpeg " + c)) : ok())));
  const write = (b) => new Promise((ok) => (p.stdin.write(b) ? ok() : p.stdin.once("drain", ok)));
  return { write, end: async () => (p.stdin.end(), fim) };
};

const t0 = Date.now();
if (args.includes("--stills")) {
  const beat = 60 / info.bpm;
  const n = Math.floor(info.frames / FPS / beat);
  const ff = ffmpeg(["-v", "error", "-y", "-f", "image2pipe", "-c:v", "mjpeg", "-i", "-", "-vf", `scale=384:-1,tile=8x${Math.ceil(n / 8)}`, "-frames:v", "1", resolve(dir, "stills.jpg")]);
  for (let b = 0; b < n; b++) await ff.write(await shot(b * beat + beat * 0.6));
  await ff.end();
  console.log(`stills: ${n} batidas → ${filme}/stills.jpg`);
} else {
  const de = Math.round(Number(opt("--de", 0)) * FPS);
  const ate = Math.min(info.frames, Math.round(Number(opt("--ate", info.frames / FPS)) * FPS));
  const saida = resolve(dir, opt("--saida", "final.mp4"));
  const inteiro = de === 0 && ate === info.frames;
  const vf = SUB > 1 ? `tmix=frames=${SUB},select='not(mod(n\,${SUB}))',setpts=N/${FPS}/TB` : "null";
  const ff = ffmpeg(["-v", "error", "-y", "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", String(FPS * SUB), "-i", "-", ...(inteiro ? ["-i", resolve(dir, opt("--audio", "audio.mp3"))] : []), "-vf", vf, "-r", String(FPS), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-preset", "medium", ...(inteiro ? ["-c:a", "aac", "-b:a", "192k", "-shortest"] : []), "-movflags", "+faststart", saida]);
  for (let i = de; i < ate; i++) {
    // subframes espalhados em meio quadro (obturador de 180°)
    for (let j = 0; j < SUB; j++) await ff.write(await shot((i + (SUB > 1 ? j / (2 * SUB) : 0)) / FPS));
    if (i % 60 === 0) process.stdout.write(`\r${i}/${ate} quadros`);
  }
  await ff.end();
  console.log(`\nok ${saida} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
await browser.close();
