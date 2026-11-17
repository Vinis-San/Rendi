# Rendi

Render de vídeo na nuvem do GitHub, em paralelo, com o motor `film/` do Sanguina (HTML com `seek(t)` + Chrome + ffmpeg).

## Como renderizar um vídeo

1. Copie a pasta do vídeo para a raiz (`index.html`, `dados.js`, `img/`, `audio.mp3`) e crie `render.json`:
   ```json
   {"dur": 78.1, "partes": 6}
   ```
2. Envie numa branch `render/<pasta>`:
   ```bash
   git checkout -b render/chips-01 && git add chips-01 && git commit -m "render chips-01" && git push -u origin render/chips-01
   ```
3. O workflow divide o vídeo em `partes` trechos, renderiza todos ao mesmo tempo, junta com o áudio e publica uma release `render-<pasta>` com `final.mp4` e `tempos.txt`. Depois apaga a branch.

## O que tem aqui

- `motor.js`, `render.mjs`, `package.json`: o motor.
- `sanguina-modelo/`: modelo 16:9 (pranchas, capítulos, legenda).
- `sanguina-curto/`: modelo 9:16 (chip, mapa, palavras, duelo, contagem).

Repositório público: não suba segredos. As imagens usadas são obras em domínio público.
