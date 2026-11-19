"""Prepara um episódio do canal Não Amanhã para o motor: pasta pronta para o Rendi.

uso: python estoico-modelo/montar.py <episodio_faceless_studio> <pasta_destino> [--partes 20]
Lê roteiro.json, timeline.json, narracao.mp3 e img/cNN.png do episódio. Grava na pasta destino:
index.html, dados.js, img/cNN.jpg (1920 px, JPEG 85), audio.mp3 e render.json.
Depois: node render.mjs <pasta> --stills   (revisão local)   ·   push em render/<pasta> (nuvem)
"""
import json, shutil, subprocess, sys
from pathlib import Path

ep, dst = Path(sys.argv[1]), Path(sys.argv[2])
partes = int(sys.argv[sys.argv.index("--partes") + 1]) if "--partes" in sys.argv else 20
roteiro = json.loads((ep / "roteiro.json").read_text(encoding="utf-8"))
timeline = json.loads((ep / "timeline.json").read_text(encoding="utf-8"))
(dst / "img").mkdir(parents=True, exist_ok=True)
for png in sorted((ep / "img").glob("c*.png")):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(png), "-vf", "scale=1920:-2", "-q:v", "3",
                    str(dst / "img" / (png.stem + ".jpg"))], check=True)
shutil.copy(ep / "narracao.mp3", dst / "audio.mp3")
(dst / "dados.js").write_text("window.ROTEIRO = " + json.dumps(roteiro, ensure_ascii=False) + ";\n"
                              "window.TIMELINE = " + json.dumps(timeline, ensure_ascii=False) + ";\n", encoding="utf-8")
(dst / "render.json").write_text(json.dumps({"dur": round(timeline["total"], 2), "partes": partes, "sub": 1}), encoding="utf-8")
(dst / "index.html").write_text(f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>{roteiro['titulo']}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;0,800;0,900;1,600&family=Montserrat:wght@600;700;800&display=swap">
<style>
  html,body {{ margin:0; width:1920px; height:1080px; overflow:hidden; background:#12161d; }}
  * {{ transition:none !important; animation:none !important; box-sizing:border-box; }}
  #palco, #cursor {{ position:absolute; inset:0; overflow:hidden; }}
  #pre {{ position:absolute; left:-9999px; }}
</style></head><body>
<div id="pre"><span style="font:800 20px 'Playfair Display'">a</span><span style="font:900 20px 'Playfair Display'">a</span><span style="font:italic 600 20px 'Playfair Display'">a</span><span style="font:600 20px 'Montserrat'">a</span><span style="font:800 20px 'Montserrat'">a</span></div>
<div id="palco"></div><div id="cursor"></div>
<script>window.PLANO = {{ bpm: 6 }};
window.READY = document.fonts.ready.then(() => Promise.all(
  Array.from({{length: {len(roteiro['cenas'])}}}, (_, i) => new Promise(ok => {{ const im = new Image(); im.onload = im.onerror = ok; im.src = 'img/c' + String(i).padStart(2, '0') + '.jpg'; }}))));</script>
<script src="dados.js"></script>
<script src="../motor.js"></script>
<script src="../estoico-modelo/filme.js"></script>
<script>window.seek(0);</script>
</body></html>
""", encoding="utf-8")
print("ok:", dst, "·", len(roteiro["cenas"]), "cenas ·", round(timeline["total"], 1), "s ·", partes, "partes")
