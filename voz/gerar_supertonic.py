"""Gera a narração de um roteiro com o Supertonic (TTS local, CPU) para uma voz e várias velocidades.
Uso: python voz/gerar_supertonic.py <pasta-do-roteiro> <voz> <saida>
  <pasta>/roteiro.json  -> {"cenas": [{"id": "c01", "texto": "..."}, ...]}
  <pasta>/variacoes.json -> {"velocidades": [1.0, 1.1], "pausa": 0.6, "lang": "pt"}
Saída: <saida>/<voz>-v<vel>/{cXX.wav, narracao.mp3} e <saida>/<voz>.json com tempos.
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
lang, pausa = var.get("lang", "pt"), var.get("pausa", 0.6)

t0 = time.time()
from supertonic import TTS  # noqa: E402
tts = TTS()
estilo = tts.get_voice_style(voz)
carga = time.time() - t0
print(f"{voz}: modelo carregado em {carga:.1f}s", flush=True)

relatorio = {"voz": voz, "carga_modelo_s": round(carga, 2), "variacoes": []}
for vel in var["velocidades"]:
    pasta_v = saida / f"{voz}-v{vel}"
    pasta_v.mkdir(exist_ok=True)
    blocos, cenas, sr = [], [], None
    t_ini = time.time()
    for c in roteiro["cenas"]:
        t1 = time.time()
        wav, dur = tts.synthesize(c["texto"], voice_style=estilo, lang=lang, speed=vel)
        ger = time.time() - t1
        arq = pasta_v / f"{c['id']}.wav"
        tts.save_audio(wav, str(arq))
        dados, sr = sf.read(arq)
        d = len(dados) / sr
        blocos += [dados, np.zeros(int(sr * pausa)) if dados.ndim == 1 else np.zeros((int(sr * pausa), dados.shape[1]))]
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
