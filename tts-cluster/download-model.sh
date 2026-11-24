#!/usr/bin/env bash
set -euo pipefail

model_url="https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-Base/resolve/$1"
mkdir -p model/speech_tokenizer
for file in config.json generation_config.json merges.txt model.safetensors preprocessor_config.json tokenizer_config.json vocab.json speech_tokenizer/config.json speech_tokenizer/configuration.json speech_tokenizer/model.safetensors speech_tokenizer/preprocessor_config.json; do
  curl --fail --silent --show-error --location --connect-timeout 15 --max-time 90 \
    --retry 2 --retry-all-errors "$model_url/$file" -o "model/$file"
done
