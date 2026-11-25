"""Junta os relatórios de cada voz num comparativo (markdown + json + página HTML com player).
Uso: python voz/comparar.py <saida> <tempo_total_workflow_s>
"""
import json
import sys
from pathlib import Path

saida, wall = Path(sys.argv[1]), sys.argv[2] if len(sys.argv) > 2 else "?"
rel = [json.loads(p.read_text(encoding="utf8")) for p in sorted(saida.glob("*/*.json")) + sorted(saida.glob("*.json"))
       if p.name != "comparativo.json"]
motor = sys.argv[3] if len(sys.argv) > 3 else "supertonic"
linhas = [f"# Comparativo {motor}", "", f"Tempo total do workflow (paralelo): **{wall} s**", "",
          "| Voz | Velocidade | Áudio (s) | Com pausas (s) | Geração (s) | RTF | Palavras/min | Carga do modelo (s) |",
          "|---|---|---|---|---|---|---|---|"]
for r in sorted(rel, key=lambda r: r["voz"]):
    for v in r["variacoes"]:
        linhas.append(f"| {r['voz']} | {v['velocidade']} | {v['audio_total_s']} | {v['com_pausas_s']} | {v['geracao_total_s']} | "
                      f"{v['rtf']} | {v['palavras_por_minuto']} | {r['carga_modelo_s']} |")
linhas += ["", "RTF = tempo de geração ÷ duração do áudio (abaixo de 1 = mais rápido que tempo real).",
           "Ouça `index.html` (player de todas as variações) ou cada `<voz>-v<velocidade>/narracao.mp3`."]
(saida / "comparativo.md").write_text("\n".join(linhas), encoding="utf8")
(saida / "comparativo.json").write_text(json.dumps(rel, ensure_ascii=False, indent=1), encoding="utf8")
cards = []
for r in sorted(rel, key=lambda r: r["voz"]):
    for v in r["variacoes"]:
        cards.append(f"<div class=c><b>{r['voz']} · {v['velocidade']}×</b><span>{v['com_pausas_s']} s · {v['palavras_por_minuto']} ppm · RTF {v['rtf']}</span>"
                     f"<audio controls preload=none src='{r['voz']}-v{v['velocidade']}/narracao.mp3'></audio></div>")
(saida / "index.html").write_text(
    "<!doctype html><meta charset=utf-8><title>Supertonic</title><style>body{font:15px system-ui;background:#111;color:#eee;max-width:900px;margin:30px auto;padding:0 16px}"
    ".c{display:grid;grid-template-columns:150px 1fr;gap:6px 16px;padding:12px 0;border-bottom:1px solid #333}.c span{color:#aaa}.c audio{grid-column:1/3;width:100%}</style>"
    f"<h1>{motor} · comparativo</h1>" + "".join(cards), encoding="utf8")
print("\n".join(linhas))
