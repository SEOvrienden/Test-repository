#!/usr/bin/env bash
# Volledige export. Draai vanuit de map explainer/.
set -euo pipefail
mkdir -p build out
node render/srt.js > captions.srt
node render/render.js audio --out build/bed_raw.wav
python3 render/master_audio.py build/bed_raw.wav build/audio_master.wav
render_one () { # formaat, rm-vlag, naam
  node render/render.js video --f "$1" $2 --workers 2 --out "build/$3_silent.mp4"
  ffmpeg -y -loglevel error -i "build/$3_silent.mp4" -i build/audio_master.wav -c:v copy -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart "out/$3.mp4"
}
render_one wide "" master_16x9 &
render_one tall "" cut_9x16 &
wait
render_one square "" cut_1x1 &
render_one wide "--rm" master_16x9_reduced_motion &
wait
ls -la out
