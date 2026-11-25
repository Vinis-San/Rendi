"""Gera a narração chamando um Space do Hugging Face (ZeroGPU) via gradio_client.
Uso: python voz/gerar_hf.py <pasta-do-roteiro> <variante> <saida>
  variacoes.json: {"motor": "hf", "space": "ResembleAI/Chatterbox-Multilingual-TTS-pt-br",
                   "vozes": ["exag0.5", "exag0.8"], "velocidades": [1.0], "pausa": 0.6}
  A "voz" é uma variante de parâmetros: exagN = nível de emoção (exaggeration) do Chatterbox.
Mesmo formato de saída dos outros geradores (comparar.py junta tudo).
"""
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

import imageio_ffmpeg
import numpy as np
import soundfile as sf
from gradio_client import Client

pasta, variante, saida = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])
saida.mkdir(parents=True, exist_ok=True)
roteiro = json.loads((pasta / "roteiro.json").read_text(encoding="utf8"))
var = json.loads((pasta / "variacoes.json").read_text(encoding="utf8"))
space, pausa = var["space"], var.get("pausa", 0.6)
exag = float(variante.replace("exag", "")) if variante.startswith("exag") else 0.5

t0 = time.time()
cli = Client(space, token=os.environ.get("HF_TOKEN") or None, verbose=False)
api = cli.view_api(return_format="dict", print_info=False)
print(json.dumps(api, ensure_ascii=False)[:3000], flush=True)  # registro dos endpoints do Space
endpoint = next(iter(api["named_endpoints"]))
params = [p["parameter_name"] for p in api["named_endpoints"][endpoint]["parameters"]]
carga = time.time() - t0
print("endpoint", endpoint, params, flush=True)


from gradio_client import handle_file  # noqa: E402

# Voz de referência: "ref" no variacoes.json mapeia variante -> arquivo da pasta (ex.: {"m4": "ref-m4.wav"});
# sem arquivo, usa o áudio padrão do Space (servido pela própria URL dele).
refs = var.get("ref", {})
chave_ref = next((k for k in refs if k in variante), None)
padrao = next((p.get("parameter_default") for p in api["named_endpoints"][endpoint]["parameters"]
               if "audio" in p["parameter_name"].lower()), None)
if chave_ref:
    REF = handle_file(str(pasta / refs[chave_ref]))
elif isinstance(padrao, dict) and padrao.get("url"):
    REF = handle_file(padrao["url"])
elif isinstance(padrao, str):
    REF = handle_file(cli.src.rstrip("/") + "/gradio_api/file=" + padrao)
else:
    REF = None
print("referência:", chave_ref or "padrão do Space", flush=True)


def pedacos(texto, limite=280):
    """O Space aceita no máximo 300 caracteres: divide por frases."""
    import re
    frases, atual = re.split(r"(?<=[.?!])\s+", texto), ""
    for f in frases:
        if atual and len(atual) + len(f) + 1 > limite:
            yield atual
            atual = f
        else:
            atual = (atual + " " + f).strip()
    if atual:
        yield atual


def chamar(texto):
    kw = {}
    for p in params:
        n = p.lower()
        if "text" in n:
            kw[p] = texto
        elif "audio" in n and REF is not None:
            kw[p] = REF
        elif "lang" in n:
            kw[p] = "pt"
        elif "exag" in n:
            kw[p] = exag
        elif "temp" in n:
            kw[p] = 0.8
        elif "seed" in n:
            kw[p] = 42
        elif "cfg" in n or "pace" in n:
            kw[p] = 0.5
    r = cli.predict(api_name=endpoint, **kw)
    return r[0] if isinstance(r, (list, tuple)) else r


relatorio = {"voz": variante, "motor": "hf:" + space, "carga_modelo_s": round(carga, 2), "variacoes": []}
pasta_v = saida / f"{variante}-v1.0"
pasta_v.mkdir(exist_ok=True)
blocos, cenas, sr = [], [], None
t_ini = time.time()
for c in roteiro["cenas"]:
    t1 = time.time()
    partes = []
    for k, trecho in enumerate(pedacos(c["texto"])):
        for tent in range(3):
            try:
                arq_tmp = chamar(trecho)
                break
            except Exception as e:  # fila ou cota do ZeroGPU
                print(c["id"], k, "tentativa", tent + 1, "falhou:", str(e)[:300], flush=True)
                time.sleep(20)
        else:
            raise SystemExit(f"{c['id']}: o Space não respondeu")
        p, sr = sf.read(arq_tmp)
        partes += [p.mean(axis=1) if p.ndim > 1 else p, np.zeros(int(sr * 0.25))]
    ger = time.time() - t1
    dados = np.concatenate(partes[:-1])
    arq = pasta_v / f"{c['id']}.wav"
    sf.write(arq, dados, sr)
    d = len(dados) / sr
    blocos += [dados, np.zeros(int(sr * pausa))]
    cenas.append({"id": c["id"], "audio_s": round(d, 2), "geracao_s": round(ger, 2), "rtf": round(ger / d, 3),
                  "palavras": len(c["texto"].split()), "ppm": round(len(c["texto"].split()) / d * 60)})
    print(c["id"], f"{d:.1f}s em {ger:.1f}s", flush=True)
total_ger = time.time() - t_ini
sf.write(pasta_v / "narracao.wav", np.concatenate(blocos), sr)
subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-v", "error", "-y", "-i", str(pasta_v / "narracao.wav"), "-af", "loudnorm=I=-16:TP=-1.5",
                "-b:a", "160k", str(pasta_v / "narracao.mp3")], check=True)
(pasta_v / "narracao.wav").unlink()
audio = sum(c["audio_s"] for c in cenas)
palavras = sum(c["palavras"] for c in cenas)
relatorio["variacoes"].append({"velocidade": 1.0, "audio_total_s": round(audio, 1), "com_pausas_s": round(audio + pausa * len(cenas), 1),
                               "geracao_total_s": round(total_ger, 1), "rtf": round(total_ger / audio, 3),
                               "palavras_por_minuto": round(palavras / audio * 60), "cenas": cenas})
(saida / f"{variante}.json").write_text(json.dumps(relatorio, ensure_ascii=False, indent=1), encoding="utf8")
