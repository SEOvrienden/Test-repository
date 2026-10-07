"""Mastert de ruwe Web Audio-render naar ca. -16 LUFS, true peak max -1.5 dBTP (twee passes loudnorm).
Gebruik: python3 render/master_audio.py build/bed_raw.wav build/audio_master.wav
"""
import json, re, subprocess, sys

src, out = sys.argv[1], sys.argv[2]
TARGET = 'I=-16:TP=-2.0:LRA=11'  # TP iets strenger dan -1.5 als marge voor AAC-codering

p = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', src, '-af', f'loudnorm={TARGET}:print_format=json', '-f', 'null', '-'],
                   capture_output=True, text=True)
m = json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}', p.stderr).group(0))
af = (f"loudnorm={TARGET}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
      f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,aresample=48000")
subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', src, '-af', af, '-c:a', 'pcm_s24le', out], check=True)
print('pass1', {k: m[k] for k in ('input_i', 'input_tp', 'input_lra')})
