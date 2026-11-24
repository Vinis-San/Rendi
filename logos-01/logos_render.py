"""Monta um vídeo no estilo "O Logos" só com ffmpeg: imagens paradas com movimento, tingimento,
faixas de cinema, grão, glitch nos cortes, cartela de título e de citação.

Uso (no PC ou no GitHub Actions):
  python logos_render.py <pasta>                 tudo numa máquina
  python logos_render.py <pasta> plano <n>       grava planos.json dividido em n trechos de duração parecida
  python logos_render.py <pasta> trecho <i>      renderiza só os planos do trecho i (segmentos/NNN.mp4)
  python logos_render.py <pasta> juntar          concatena os segmentos e mixa voz + trilha → final.mp4

A pasta precisa de: roteiro.json (cenas com "planos": [{"efeito": ...}], "citacao", "cartelaTitulo"),
timeline.json (gandhi-02/gerar.py: scenes, words, introAt, total), img/<cena>-<n>.jpg, narracao.mp3,
musica.mp3 e fonts/serif-italic.ttf.

Efeitos: kenburns (cor natural, escurecida) · aco (P&B azulado) · duotone (vermelho e preto)
· corisolada (só o vermelho fica, o resto azul-marinho).

Desempenho: a obra (fundo desfocado + tingimento, 4K) é composta UMA vez por plano num PNG; o movimento
anima esse PNG. Dois planos rodam ao mesmo tempo em cada máquina.
"""
import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

W, H, FPS = 1920, 1080, 30
BARRA = 138  # faixas de 2,39:1
EP = Path(sys.argv[1]).resolve()
SEG = EP / "segmentos"
FONTE = (EP / "fonts" / "serif-italic.ttf").as_posix().replace(":", r"\:")
PARALELO = int(os.environ.get("LOGOS_PARALELO", "2"))

TINTA = {
    "kenburns": "eq=saturation=0.8:brightness=-0.04:contrast=1.05",
    "aco": "hue=s=0,colorchannelmixer=rr=0.78:gg=0.9:bb=1.05,eq=contrast=1.12:brightness=-0.03",
    "duotone": "hue=s=0,eq=contrast=1.35:brightness=-0.08,curves=r='0/0 0.5/0.5 1/0.86':g='0/0 1/0.1':b='0/0.04 1/0.12'",
    "corisolada": "colorhold=color=0xC02020:similarity=0.3:blend=0.1,eq=brightness=-0.2:contrast=1.2,"
                  "colorbalance=rs=-0.12:gs=-0.04:bs=0.28:rm=-0.08:bm=0.2:rh=-0.05:bh=0.1",
}


def ff(args, cwd=None):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True, cwd=cwd)


def compor(img, tinta, saida):
    """Obra inteira sobre um fundo desfocado dela mesma (retrato não perde o rosto), já tingida, em 4K."""
    ff(["-i", str(img), "-filter_complex",
        "[0]split[a][b];[a]scale=3840:2160:force_original_aspect_ratio=increase,crop=3840:2160,boxblur=40:2,"
        "eq=brightness=-0.15[fundo];[b]scale=3840:2160:force_original_aspect_ratio=decrease[obra];"
        f"[fundo][obra]overlay=(W-w)/2:(H-h)/2,{tinta}", "-frames:v", "1", str(saida)])


MOVES = ["aproxima", "panoramica", "afasta", "sobe", "gira", "aproxima_rapido"]


def movimento(d, k):
    """Câmera: um movimento por plano, em rodízio, sempre com um leve tremor de mão por cima."""
    n = max(1, round(d * FPS))
    s = f"(on/{n})"                      # progresso 0→1
    e = f"(1-pow(1-{s},2))"              # desacelera no fim
    mao = "+18*sin(on*0.11)+11*sin(on*0.047+1.3)"   # tremor em pixels do quadro 4K
    maoy = "+12*sin(on*0.09+0.7)+8*sin(on*0.053)"
    tipo = MOVES[k % len(MOVES)]
    z, x, y = "1.12", "(iw-iw/zoom)/2", "(ih-ih/zoom)*0.42"
    if tipo == "aproxima":
        z = f"1.02+0.16*{e}"
    elif tipo == "aproxima_rapido":
        z = f"1.0+0.28*{e}"
    elif tipo == "afasta":
        z = f"1.22-0.18*{e}"
    elif tipo == "panoramica":
        z, x = "1.22", f"(iw-iw/zoom)*(0.12+0.76*{s})" if k % 2 else f"(iw-iw/zoom)*(0.88-0.76*{s})"
    elif tipo == "sobe":
        z, y = "1.22", f"(ih-ih/zoom)*(0.85-0.7*{s})"
    elif tipo == "gira":
        z = f"1.16+0.06*{s}"
    zp = f"zoompan=z='{z}':x='{x}{mao}':y='{y}{maoy}':d={n + 1}:s={W}x{H}:fps={FPS}"
    if tipo == "gira":  # leve rotação; o zoom acima esconde os cantos
        zp += f",rotate=a='(-0.035+0.07*t/{d:.3f})':c=black"
    return zp


def acabamento(d):
    """Mais escuro, grão de filme forte, vinheta, faixas de cinema e glitch de cor no 1º e no último 0,1 s."""
    return ",".join(["eq=brightness=-0.06:contrast=1.1:saturation=0.85", "noise=alls=22:allf=t+u",
                     "vignette=PI/3.6",
                     f"drawbox=x=0:y=0:w=iw:h={BARRA}:color=black:t=fill",
                     f"drawbox=x=0:y=ih-{BARRA}:w=iw:h={BARRA}:color=black:t=fill",
                     f"rgbashift=rh=-10:bh=10:enable='lt(t,0.1)+gt(t,{d - 0.1:.3f})'"])


def legendas_ass(tl):
    """Legenda dos vídeos do canal (Manrope Bold, creme sobre caixa escura), logo acima da faixa preta."""
    def ts(t):
        return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"
    linhas = [f"Dialogue: 0,{ts(c['from'])},{ts(c['to'])},L,,0,0,0,,{(chr(92) + 'N').join(c['lines'])}"
              for c in tl["captions"]]
    (EP / "legendas.ass").write_text(
        "[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\nWrapStyle: 2\n\n"
        "[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, "
        "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, "
        "MarginL, MarginR, MarginV, Encoding\n"
        "Style: L,Manrope,42,&H00EEF8FF,&H00EEF8FF,&H140E1114,&H140E1114,-1,0,0,0,100,100,0.5,0,3,11,0,2,200,200,152,1\n\n"
        "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
        + "\n".join(linhas) + "\n", encoding="utf8")


def titulo_girando(linhas, d):
    """Título grande que entra girando e se assenta sobre a 1ª imagem, depois some (camada transparente)."""
    fade = f"min(1,max(0,(t-0.35)/0.7))*min(1,max(0,({d:.3f}-0.6-t)/0.6))"
    textos = ",".join(texto(l, 84, H // 2 - 70 + i * 104, fade) for i, l in enumerate(linhas))
    return (f"color=c=black@0:s={W}x{H}:r={FPS}:d={d:.3f},format=rgba,{textos},"
            f"rotate=a='-0.09*pow(max(0,1-t/1.8),2)':c=none:ow=iw:oh=ih")


def texto(t, size, y, alfa="1"):
    t = t.replace("\\", "").replace("'", "’").replace(":", r"\:").replace(",", r"\,")
    return (f"drawtext=fontfile='{FONTE}':text='{t}':fontsize={size}:fontcolor=0xEDE6DA:x=(w-tw)/2:y={y}"
            f":shadowcolor=black@0.85:shadowx=0:shadowy=4:alpha='{alfa}'")


def render_plano(p):
    """p: {k, img, efeito, d, cartela?, titulo?} → segmentos/NNN.mp4"""
    d, k = p["d"], p["k"]
    png = SEG / f"{k:03d}.png"
    tinta = TINTA[p["efeito"]] + (",eq=brightness=-0.32" if p.get("titulo") else "")
    compor(EP / p["img"], tinta, png)
    vf = [movimento(d, k)]
    if p.get("cartela"):  # citação: duas linhas pequenas no centro, como versículo
        fade = f"min(1,max(0,(t-0.4)/0.6))*min(1,max(0,({d:.3f}-0.3-t)/0.4))"
        vf += [texto(p["cartela"][0], 32, H // 2 - 52, fade), texto(p["cartela"][1], 48, H // 2 + 2, fade)]
    if p.get("titulo"):
        fade = "min(1,max(0,(t-0.3)/0.8))"
        vf += [texto(l, 64, H // 2 - 60 + i * 84, fade) for i, l in enumerate(p["titulo"])]
    grafo = "[0]" + ",".join(vf) + "[base];"
    if p.get("abertura"):  # título girando sobre a primeira imagem
        dt = min(d, 5.0)  # escurece a imagem enquanto o título está na tela
        escuro = f"min(1,t/0.6)*min(1,max(0,({dt:.3f}-t)/0.6))"
        grafo = grafo.replace("[base];", f",eq=brightness='-0.22*{escuro}':contrast='1-0.1*{escuro}':eval=frame[base];")
        grafo += titulo_girando(p["abertura"], dt) + "[tit];[base][tit]overlay=eof_action=pass[base];"
    # Legenda do vídeo inteiro, deslocada para o tempo deste plano (cada máquina queima só o seu trecho).
    leg = (f",setpts=PTS+{p['ini']:.3f}/TB,subtitles=legendas.ass:fontsdir=fonts,setpts=PTS-{p['ini']:.3f}/TB"
           if (EP / "legendas.ass").exists() else "")
    grafo += f"[base]{acabamento(d)}{leg},format=yuv420p[v]"
    ff(["-i", str(png), "-filter_complex", grafo, "-map", "[v]", "-frames:v", str(round(d * FPS)),
        "-r", str(FPS), "-c:v", "libx264", "-preset", "veryfast", "-crf", "19",
        "-an", str(SEG / f"{k:03d}.mp4")], cwd=EP)
    png.unlink()
    print(f"plano {k:03d}: {d:.1f} s", flush=True)


def cortes(ini, fim, n, palavras):
    """Divide [ini, fim) em n planos, cortando no fim da palavra mais próxima de cada divisão."""
    fins = [w["e"] for w in palavras if ini < w["e"] < fim]
    pts = [ini]
    for i in range(1, n):
        alvo = ini + (fim - ini) * i / n
        pts.append(min(fins, key=lambda e: abs(e - alvo)) if fins else alvo)
    return pts + [fim]


def planos():
    """Lista de planos com início/duração; os cortes ficam em quadros inteiros para não acumular erro."""
    rot = json.loads((EP / "roteiro.json").read_text(encoding="utf8"))
    tl = json.loads((EP / "timeline.json").read_text(encoding="utf8"))
    brutos = []
    for i, (c, s) in enumerate(zip(rot["cenas"], tl["scenes"])):
        ini, fim = s["from"], s["from"] + s["dur"]
        if i == 0:  # o título entra depois do gancho
            t_ini = tl["introAt"] - 0.15
            fim, tit = t_ini, (t_ini, s["from"] + s["dur"])
        imgs = [(f"img/{c['id']}-{n}.jpg", p["efeito"]) for n, p in enumerate(c["planos"])]
        imgs = [x for x in imgs if (EP / x[0]).exists()]
        pts = cortes(ini, fim, len(imgs), tl["words"])
        brutos += [{"img": img, "efeito": ef, "a": a, "cartela": c.get("citacao")}
                   for (img, ef), a in zip(imgs, pts)]
        if i == 0:  # no respiro depois do gancho: cartela com o nome do pensador
            brutos.append({"img": f"img/{rot['cenas'][1]['id']}-0.jpg", "efeito": "duotone", "a": tit[0],
                           "titulo": rot.get("cartelaNome", rot["cartelaTitulo"])})
    brutos[0]["abertura"] = rot["cartelaTitulo"]
    marcas = [round(b["a"] * FPS) for b in brutos] + [round(tl["total"] * FPS)]
    for k, b in enumerate(brutos):
        b.update(k=k, d=(marcas[k + 1] - marcas[k]) / FPS, ini=marcas[k] / FPS)
        del b["a"]
    legendas_ass(tl)
    return brutos


def dividir(lista, n):
    """n trechos contíguos com duração parecida."""
    total, alvo, grupos, atual, soma = sum(p["d"] for p in lista), None, [], [], 0.0
    alvo = total / n
    for p in lista:
        atual.append(p["k"]); soma += p["d"]
        if soma >= alvo * (len(grupos) + 1) and len(grupos) < n - 1:
            grupos.append(atual); atual = []
    grupos.append(atual)
    return [g for g in grupos if g]


def trecho(ks):
    SEG.mkdir(exist_ok=True)
    lista = {p["k"]: p for p in json.loads((EP / "planos.json").read_text(encoding="utf8"))["planos"]}
    with ThreadPoolExecutor(PARALELO) as ex:
        list(ex.map(render_plano, [lista[k] for k in ks]))


def juntar():
    tl = json.loads((EP / "timeline.json").read_text(encoding="utf8"))
    segs = sorted(SEG.glob("[0-9][0-9][0-9].mp4"))
    (SEG / "lista.txt").write_text("".join(f"file '{p.name}'\n" for p in segs), encoding="utf8")
    ff(["-f", "concat", "-safe", "0", "-i", str(SEG / "lista.txt"), "-c", "copy", str(EP / "video.mp4")])
    total = tl["total"]
    # Trilha contínua, baixada sob a voz com ataque e soltura lentos (sem "bombear" nas pausas).
    mix = ("[1:a]aresample=48000,aformat=channel_layouts=stereo,apad[voz];[voz]asplit[v1][v2];"
           f"[2:a]aresample=48000,aformat=channel_layouts=stereo,volume=0.55,afade=t=in:d=2,"
           f"afade=t=out:st={total - 4:.2f}:d=4[mus];"
           "[mus][v1]sidechaincompress=threshold=0.04:ratio=4:attack=180:release=1400:makeup=1[duck];"
           "[v2][duck]amix=inputs=2:normalize=0")
    ent = ["-i", str(EP / "video.mp4"), "-i", str(EP / "narracao.mp3"), "-stream_loop", "-1", "-i", str(EP / "musica.mp3")]
    # Normalização em duas passadas, linear: um ganho só para o vídeo inteiro, sem sobe-e-desce.
    medida = subprocess.run(["ffmpeg", "-hide_banner", *ent, "-filter_complex",
                             mix + ",loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json[a]", "-map", "[a]",
                             "-t", f"{total:.2f}", "-f", "null", "-"], capture_output=True, text=True, check=True).stderr
    m = json.loads(medida[medida.rindex("{"):medida.rindex("}") + 1])
    ln = (f"loudnorm=I=-16:TP=-1.5:LRA=11:linear=true:measured_I={m['input_i']}:measured_TP={m['input_tp']}"
          f":measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}")
    ff([*ent, "-filter_complex", mix + f",{ln},aresample=48000[a]", "-map", "0:v", "-map", "[a]",
        "-t", f"{total:.2f}", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
        str(EP / "final.mp4")])
    print("ok:", EP / "final.mp4", f"{total:.1f} s, {len(segs)} planos")


def main():
    cmd = sys.argv[2] if len(sys.argv) > 2 else "tudo"
    if cmd in ("plano", "tudo"):
        lista = planos()
        n = int(sys.argv[3]) if cmd == "plano" else 1
        grupos = dividir(lista, n)
        (EP / "planos.json").write_text(json.dumps({"planos": lista, "trechos": grupos}, ensure_ascii=False, indent=1),
                                        encoding="utf8")
        print(len(lista), "planos em", len(grupos), "trechos:", [round(sum(lista[k]["d"] for k in g), 1) for g in grupos])
    if cmd == "trecho":
        trecho(json.loads((EP / "planos.json").read_text(encoding="utf8"))["trechos"][int(sys.argv[3])])
    if cmd == "tudo":
        trecho(range(len(lista)))
    if cmd in ("juntar", "tudo"):
        juntar()


if __name__ == "__main__":
    main()
