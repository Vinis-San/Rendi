"""Prepara um vídeo do Sanguina para o motor film/: grava dados.js e index.html na pasta do vídeo.

uso: python film/sanguina-modelo/montar.py film/sanguina-02 [modelo]
(modelo: sanguina-modelo, padrão 16:9; ou sanguina-curto, 9:16 com mapa)
Antes: roteiro.json (cenas com tipo) + timeline.json (pipeline/voz.py) + img/*.png (gravura.py --denso).
Depois: node render.mjs sanguina-02 --stills  /  node render.mjs sanguina-02 --audio narracao_mix.mp3
"""
import json, sys
from pathlib import Path

pasta = Path(sys.argv[1])
modelo = sys.argv[2] if len(sys.argv) > 2 else "sanguina-modelo"
roteiro = json.loads((pasta / "roteiro.json").read_text(encoding="utf-8"))
w, h = (1080, 1920) if roteiro.get("formato") == "9x16" else (1920, 1080)
libs = ('<script src="https://cdn.jsdelivr.net/npm/d3-array@3.2.4/dist/d3-array.min.js"></script>'
        '<script src="https://cdn.jsdelivr.net/npm/d3-geo@3.1.1/dist/d3-geo.min.js"></script>'
        '<script src="https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js"></script>')
timeline = json.loads((pasta / "timeline.json").read_text(encoding="utf-8"))
(pasta / "dados.js").write_text(
    "window.ROTEIRO = " + json.dumps(roteiro, ensure_ascii=False) + ";\n"
    "window.TIMELINE = " + json.dumps(timeline, ensure_ascii=False) + ";\n", encoding="utf-8")
(pasta / "index.html").write_text(f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>{roteiro['titulo']}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@300;400&family=Cormorant+Garamond:ital@1&family=Hanken+Grotesk:wght@400;600&family=IBM+Plex+Mono:wght@500&display=swap">
<style>
  html,body {{ margin:0; width:{w}px; height:{h}px; overflow:hidden; background:#ece4d6; }}
  * {{ transition:none !important; animation:none !important; box-sizing:border-box; }}
  #palco, #cursor {{ position:absolute; inset:0; overflow:hidden; }}
  #pre {{ position:absolute; left:-9999px; }}
</style></head><body>
<div id="pre"><span style="font:300 20px 'Big Shoulders Display'">a</span><span style="font:400 20px 'Big Shoulders Display'">a</span><span style="font:italic 20px 'Cormorant Garamond'">a</span><span style="font:600 20px 'Hanken Grotesk'">a</span><span style="font:500 20px 'IBM Plex Mono'">a</span></div>
<div id="palco"></div><div id="cursor"></div>
<script>window.PLANO = {{ bpm: 20 }}; window.READY = document.fonts.ready.then(() => Promise.all([...document.images].map(i => i.decode().catch(() => 0))));</script>
{libs}
<script src="dados.js"></script>
<script src="../motor.js"></script>
<script src="../{modelo}/filme.js"></script>
<script>window.seek(0);</script>
</body></html>
""", encoding="utf-8")
print("ok:", pasta / "index.html", "·", len(roteiro["cenas"]), "cenas ·", round(timeline["total"], 1), "s")
