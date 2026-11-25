"""Gera a narração de um roteiro com o Kokoro-82M (kokoro-onnx, CPU) para uma voz e várias velocidades.
Mesmo formato de saída do gerar_supertonic.py, para o comparar.py juntar os dois.
Uso: python voz/gerar_kokoro.py <pasta-do-roteiro> <voz> <saida>   (modelos em ~/.cache/kokoro)
Vozes em português: pf_dora (feminina), pm_alex e pm_santa (masculinas).
"""
import json
import subprocess
import sys
import time
from pathlib import Path

import imageio_ffmpeg
import numpy as np
import soundfile as sf

pasta, voz, saida = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])
saida.mkdir(parents=True, exist_ok=True)
roteiro = json.loads((pasta / "roteiro.json").read_text(encoding="utf8"))
var = json.loads((pasta / "variacoes.json").read_text(encoding="utf8"))
lang, pausa = var.get("lang_kokoro", "pt-br"), var.get("pausa", 0.6)
MOD = Path.home() / ".cache" / "kokoro"

t0 = time.time()
from kokoro_onnx import Kokoro  # noqa: E402
k = Kokoro(str(MOD / "kokoro-v1.0.onnx"), str(MOD / "voices-v1.0.bin"))
carga = time.time() - t0
print(f"{voz}: modelo carregado em {carga:.1f}s", flush=True)

relatorio = {"voz": voz, "motor": "kokoro", "carga_modelo_s": round(carga, 2), "variacoes": []}
for vel in var["velocidades"]:
    pasta_v = saida / f"{voz}-v{vel}"
    pasta_v.mkdir(exist_ok=True)
    blocos, cenas, sr = [], [], 24000
    t_ini = time.time()
    for c in roteiro["cenas"]:
        t1 = time.time()
        amostras, sr = k.create(c["texto"], voice=voz, speed=float(vel), lang=lang)
        ger = time.time() - t1
        sf.write(pasta_v / f"{c['id']}.wav", amostras, sr)
        d = len(amostras) / sr
        blocos += [amostras, np.zeros(int(sr * pausa), dtype=amostras.dtype)]
        cenas.append({"id": c["id"], "audio_s": round(d, 2), "geracao_s": round(ger, 2), "rtf": round(ger / d, 3),
                      "palavras": len(c["texto"].split()), "ppm": round(len(c["texto"].split()) / d * 60)})
    total_ger = time.time() - t_ini
    sf.write(pasta_v / "narracao.wav", np.concatenate(blocos), sr)
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-v", "error", "-y", "-i", str(pasta_v / "narracao.wav"), "-af", "loudnorm=I=-16:TP=-1.5",
                    "-b:a", "160k", str(pasta_v / "narracao.mp3")], check=True)
    (pasta_v / "narracao.wav").unlink()
    audio = sum(c["audio_s"] for c in cenas)
    palavras = sum(c["palavras"] for c in cenas)
    relatorio["variacoes"].append({"velocidade": vel, "audio_total_s": round(audio, 1),
                                   "com_pausas_s": round(audio + pausa * len(cenas), 1),
                                   "geracao_total_s": round(total_ger, 1), "rtf": round(total_ger / audio, 3),
                                   "palavras_por_minuto": round(palavras / audio * 60), "cenas": cenas})
    print(f"{voz} v{vel}: {audio:.1f}s de áudio em {total_ger:.1f}s (RTF {total_ger/audio:.3f})", flush=True)

(saida / f"{voz}.json").write_text(json.dumps(relatorio, ensure_ascii=False, indent=1), encoding="utf8")
