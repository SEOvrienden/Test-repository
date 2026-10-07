"""Mastert de ruwe Web Audio-render naar ca. -16 LUFS, true peak max -1.5 dBTP na AAC (twee passes loudnorm + limiter).
Gebruik: python3 engine/master_audio.py <in.wav> <uit.wav>
"""
import json, re, subprocess, sys

src, out = sys.argv[1], sys.argv[2]
TARGET = 'I=-16:TP=-2.0:LRA=11'  # TP iets strenger dan -1.5 als marge voor AAC-codering

p = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', src, '-af', f'loudnorm={TARGET}:print_format=json', '-f', 'null', '-'],
                   capture_output=True, text=True)
m = json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}', p.stderr).group(0))
af = (f"loudnorm={TARGET}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
      f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,aresample=48000")
# Klik-transiënten schieten na AAC-codering ~2 dB over: oversampled limiter erachter (getest: -2,9 dBTP na AAC 192k)
af += ',aresample=192000,alimiter=limit=0.6:attack=0.5:release=40:level=false,aresample=48000'
subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', src, '-af', af, '-c:a', 'pcm_s24le', out], check=True)
print('pass1', {k: m[k] for k in ('input_i', 'input_tp', 'input_lra')})
