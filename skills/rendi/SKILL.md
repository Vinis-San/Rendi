---
name: rendi
description: Renderiza vídeos de motion graphics (páginas HTML com seek(t)) na nuvem do GitHub Actions, em paralelo e de graça, pelo repositório Vinis-San/Rendi. Use quando pedirem para "renderizar na nuvem", "mandar pro Rendi", "render no GitHub", acelerar um render do motor film/ (Sanguina, chips, vinhetas, Shorts) ou medir/limpar renders na nuvem. Não confundir com a Rendi (rendi.dev), serviço pago de ffmpeg na nuvem usado por pipeline/rendi.py.
---

# Rendi — render de vídeo em paralelo no GitHub Actions

## O que é
Rendi é o repositório **Vinis-San/Rendi** (público). Ele guarda o **motor de vídeo sem framework** do
Synaptor e um **workflow do GitHub Actions** que renderiza um vídeo dividido em partes, em várias máquinas
ao mesmo tempo, junta tudo com o áudio e devolve o `final.mp4`.

- Não usa Remotion nem HyperFrames.
- O vídeo é uma página web: `index.html` + JavaScript que desenha qualquer instante com `window.seek(t)`.
- O Chrome (headless, via Playwright) tira um print por quadro e o ffmpeg codifica em H.264.
- Cada máquina renderiza um trecho (`--de`/`--ate`); uma última máquina concatena e põe o áudio.

> Atenção ao nome: **Rendi (este repo)** ≠ **Rendi (rendi.dev)**, o serviço de ffmpeg na nuvem
> (chaves `RENDI_FFMPEG_API_KEY_*`, `apps/faceless-studio/pipeline/rendi.py`). Esta skill é sobre o repo.

## Por que existe
- O notebook da empresa bloqueia o Remotion; Chrome + ffmpeg funcionam em qualquer lugar.
- Em repositório **público**, o GitHub Actions tem **minutos ilimitados** e máquinas Linux de 4 núcleos,
  com até ~20 jobs ao mesmo tempo no plano grátis. (Privado: ~2.000 min/mês, máquinas menores.)
- Medido em 17/11/2026: vídeo de 78 s 9:16 levou **6 min no notebook** e **2 min 16 s no GitHub** (6 partes).
  Com motion blur (`sub: 3`) e 12 partes, 66 s saíram em **2 min 39 s**.

## Estrutura do repositório
```
motor.js            funções de animação: iv, kf, spring (molas), ease, rng, cursor por data-anchor
render.mjs          Chrome + ffmpeg: --stills, --de/--ate, --sub N, --saida, --audio; lê FILME.width/height
package.json        playwright-core
sanguina-modelo/    modelo 16:9 (pranchas, capítulos, legenda) + montar.py (gera index.html e dados.js)
sanguina-curto/     modelo 9:16 (chip, mapa d3-geo, palavras, duelo, contagem)
sanguina-max/       modelo 9:16 de alta energia (planos por tempo absoluto, sons sincronizados)
.github/workflows/render.yml   o render em paralelo
```

## Contrato de um vídeo
Uma pasta na raiz do repo, por exemplo `chips-03/`, com:
- `index.html` que carrega `../motor.js`, o `filme.js` do modelo e define:
  - `window.FILME = { frames, width?, height?, cena(frame) → { html } }`
  - `window.PLANO = { bpm }` (usado só pela folha de quadros)
  - opcional `window.READY` (Promise: fontes, imagens, dados externos carregados)
- `dados.js` (roteiro/timeline), `img/` (imagens), `audio.mp3` (mixagem final)
- `render.json`: `{"dur": 66.8, "partes": 12, "sub": 3}`
  - `dur`: duração em segundos; `partes`: quantas máquinas; `sub`: 1 sem blur, 3 com motion blur (3× mais lento)

Regras do `seek(t)`: determinístico. Mesmo `t` = mesma imagem. Nada de `Math.random` (use `rng`),
`Date.now`, timers ou animação CSS (o `index.html` desliga `transition`/`animation`).

## Como renderizar
Pré-requisito local: o vídeo já funciona com `node render.mjs <pasta> --stills` (folha de quadros) no motor
`apps/faceless-studio/film/`. Para vídeos do Sanguina, gere com
`python film/sanguina-modelo/montar.py film/<pasta> [sanguina-curto|sanguina-max]`.

```bash
cd Documents/GitHub/Rendi
git checkout main && git pull
git checkout -b render/<pasta>
mkdir -p <pasta> && cp -r <origem>/{index.html,dados.js,audio.mp3,img} <pasta>/   # o que existir
echo '{"dur": 66.8, "partes": 12, "sub": 3}' > <pasta>/render.json
git add <pasta> && git commit -m "render <pasta>" && git push -u origin render/<pasta>
git checkout main
```
Se o vídeo usa um modelo novo ou alterado (`filme.js`, `motor.js`, `render.mjs`), envie essa mudança para a
`main` **antes** da branch de render.

O workflow então:
1. `plano`: lê `render.json`, monta a matriz de partes.
2. `parte` (N máquinas): instala Node/ffmpeg, `node render.mjs <pasta> --sub S --de A --ate B --saida parte-K.mp4`.
3. `juntar`: concatena as partes (`-c:v copy`), põe o áudio (AAC 192k), publica a release
   `render-<pasta>` com `final.mp4` e `tempos.txt`, e **apaga a branch** do vídeo.

## Acompanhar e baixar (sem login)
```bash
# status do último run
curl -s https://api.github.com/repos/Vinis-San/Rendi/actions/runs?per_page=1 \
  | python -c "import json,sys;r=json.load(sys.stdin)['workflow_runs'][0];print(r['head_branch'],r['status'],r['conclusion'])"
# resultado
curl -sL -o final.mp4 https://github.com/Vinis-San/Rendi/releases/download/render-<pasta>/final.mp4
curl -sL https://github.com/Vinis-San/Rendi/releases/download/render-<pasta>/tempos.txt
```
Faça o acompanhamento em segundo plano (loop com intervalo de 30 s), nunca prendendo a conversa.

## Limpeza
- A branch do vídeo é apagada pelo workflow; as partes (artifacts) expiram em 1 dia.
- **A release fica pública** até ser apagada. Apagar é permanente: confirme com o Vinícius antes.
  Com a credencial salva no Git (`git credential fill`), apague a release pela API
  (`DELETE /repos/Vinis-San/Rendi/releases/<id>`) e a tag com `git push origin --delete render-<pasta>`.
  Nunca imprima o token.

## Regras
- **Repositório público:** só material que pode ficar público enquanto estiver lá. Nada de segredos,
  dados de clientes, material interno da Brasal ou conteúdo de terceiros sem licença (imagens: domínio
  público ou licença compatível). Para material sensível, use um repositório privado com o mesmo workflow.
- Não usar o GitHub Actions para baixar ou processar vídeos de terceiros em massa (regras de uso do GitHub).
- Vídeos nunca vão para a `main`; só para branches `render/*`, que somem ao fim.
- Ícones em SVG, nunca emoji. Sem referências a Remotion/HyperFrames nos projetos novos.

## Problemas comuns
- **Texto minúsculo na folha de quadros:** aspas duplas em `font-family` dentro de `style="…"` quebram o
  atributo. Use aspas simples nos nomes de fonte.
- **Partes com tempos muito diferentes:** a divisão é por tempo, não por peso. Cenas pesadas (globo d3, muitos
  elementos) atrasam uma parte; aumente `partes`.
- **Wikimedia 429** ao baixar imagens: espere e baixe com intervalos; prefira URLs de miniatura `thumb.wikimedia.org`.
- **Vertical (9:16):** o filme declara `FILME.width = 1080, height = 1920`; o `render.mjs` ajusta a janela.
- **Corte de áudio no fim:** `audio.mp3` mais curto que o vídeo encerra o vídeo antes (`-shortest`); confira `dur`.
