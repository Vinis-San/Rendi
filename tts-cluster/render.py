import argparse
import json
import subprocess
import time
import wave
from pathlib import Path


BLOCKS = (
    "A primeira luz do dia atravessou a janela. Na rua, a padaria já estava aberta e o cheiro de pão fresco chegava até a esquina.",
    "Júlia pegou o caderno e saiu para encontrar o João. Os dois tinham combinado de atravessar a cidade antes das nove da manhã.",
    "Quando chegaram à estação, a chuva apertou. Eles ficaram debaixo da marquise, olhando as gotas escorrer pelo relógio da praça.",
    "O trem partiu alguns minutos depois. Do outro lado da janela, os prédios deram lugar ao campo e as nuvens começaram a se abrir.",
)


def render(numbers):
    output = Path("output")
    output.mkdir()
    samples = []
    started = time.time()
    for number in numbers:
        text = BLOCKS[number - 1]
        wav = output / f"{number:02}.wav"
        clip_start = time.perf_counter()
        subprocess.run([
            "./engine/qwen_tts", "-d", "model", "--ref-audio", "reference.wav",
            "--xvector-only", "-l", "Portuguese", "-t", text, "--seed", "42",
            "-j", "4", "-o", str(wav),
        ], check=True, timeout=180)
        seconds = time.perf_counter() - clip_start
        with wave.open(str(wav)) as audio:
            frames = audio.getnframes()
            if frames < audio.getframerate() or audio.getnchannels() != 1:
                raise ValueError(f"Invalid output {wav}")
            duration = frames / audio.getframerate()
        samples.append({"block": number, "text": text, "seconds": seconds, "audio_seconds": duration})
        print(f"Block {number}: {seconds:.2f}s processing, {duration:.2f}s audio", flush=True)
    save_json(output / "metrics.json", {"started": started, "finished": time.time(), "samples": samples})


def save_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def join(files, output):
    expected = None
    with wave.open(str(output), "wb") as destination:
        for path in files:
            with wave.open(str(path)) as clip:
                spec = (clip.getnchannels(), clip.getsampwidth(), clip.getframerate())
                if expected is None:
                    expected = spec
                    destination.setnchannels(spec[0])
                    destination.setsampwidth(spec[1])
                    destination.setframerate(spec[2])
                elif spec != expected:
                    raise ValueError(f"Mismatched WAV format: {path}")
                else:
                    destination.writeframes(bytes(round(0.2 * spec[2]) * spec[0] * spec[1]))
                destination.writeframes(clip.readframes(clip.getnframes()))


def assemble(mode):
    batch = ([Path("output")] if mode == "serial" else
             [Path("batches") / f"narration-part-{number}" for number in range(1, 5)])
    output = Path("assembled")
    output.mkdir()
    reports = [json.loads((folder / "metrics.json").read_text(encoding="utf-8")) for folder in batch]
    samples = [sample for report in reports for sample in report["samples"]]
    if [(sample["block"], sample["text"]) for sample in samples] != list(enumerate(BLOCKS, 1)):
        raise ValueError(f"Invalid blocks in {mode}")
    wavs = sorted((path for folder in batch for path in folder.glob("*.wav")), key=lambda path: path.name)
    if [path.name for path in wavs] != [f"{number:02}.wav" for number in range(1, 5)]:
        raise ValueError(f"Missing or repeated WAVs in {mode}")
    started = time.perf_counter()
    join(wavs, output / f"{mode}.wav")
    summary = {
        "mode": mode,
        "generation_seconds": max(report["finished"] for report in reports)
        - min(report["started"] for report in reports),
        "inference_worker_seconds": sum(sample["seconds"] for sample in samples),
        "audio_seconds": sum(sample["audio_seconds"] for sample in samples),
        "assembly_seconds": time.perf_counter() - started,
        "samples": samples,
    }
    save_json(output / "metrics.json", summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["render", "assemble"])
    parser.add_argument("selection")
    args = parser.parse_args()
    if args.action == "render":
        render([int(number) for number in args.selection.split()])
    else:
        assemble(args.selection)
