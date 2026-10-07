#!/usr/bin/env bash
# Volledige export van één film. Draai vanuit explainer/:  ./engine/build.sh <slug>
# Levert films/<slug>/out/{master_16x9,cut_9x16,cut_1x1,master_16x9_reduced_motion}.mp4 en captions.srt.
set -euo pipefail
SLUG="${1:?gebruik: ./engine/build.sh <slug>}"
D="films/$SLUG"
mkdir -p "$D/build" "$D/out"
node engine/srt.js "$SLUG" > "$D/captions.srt"
node engine/render.js audio --film "$SLUG" --out "$D/build/bed_raw.wav"
python3 engine/master_audio.py "$D/build/bed_raw.wav" "$D/build/audio_master.wav"
render_one () { # formaat, rm-vlag, naam
  node engine/render.js video --film "$SLUG" --f "$1" $2 --workers 2 --out "$D/build/$3_silent.mp4"
  ffmpeg -y -loglevel error -i "$D/build/$3_silent.mp4" -i "$D/build/audio_master.wav" -c:v copy -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart "$D/out/$3.mp4"
}
# 4 cores: twee tegelijk
render_one wide "" master_16x9 &
render_one tall "" cut_9x16 &
wait
render_one square "" cut_1x1 &
render_one wide "--rm" master_16x9_reduced_motion &
wait
ls -la "$D/out"
