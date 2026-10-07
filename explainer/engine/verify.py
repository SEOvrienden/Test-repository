"""Verificatie van één film. Draait de controles echt en schrijft films/<slug>/VERIFY.md.
Gebruik (vanuit explainer/):  python3 engine/verify.py <slug> [--quick]
--quick: alleen de controles die geen video nodig hebben (voor tijdens het bouwen).
Exitcode 1 als een harde eis faalt.
"""
import glob, json, os, re, shutil, subprocess, sys, tempfile, hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
slug = sys.argv[1]
QUICK = '--quick' in sys.argv
D = os.path.join('films', slug)
OUT = os.path.join(D, 'out')

def node_json(expr_file, expr):
    js = f"const x=require('./{expr_file}');console.log(JSON.stringify({expr}))"
    return json.loads(subprocess.run(['node', '-e', js], capture_output=True, text=True, check=True).stdout)

T = node_json(f'{D}/timeline.js', 'x')
BR = node_json('brand/brand.js', 'x')
rows = []  # (controle, resultaat, ok: True/False/None)
def row(name, result, ok): rows.append((name, result, ok))

# ---------- 1. teksten en tijdlijn ----------
caps = T['captions']
cps = [(len(c['text']) / (c['t1'] - c['t0']), c['text']) for c in caps]
worst = max(cps)
row('Leessnelheid captions (max 17 tekens/s)', f"max {worst[0]:.1f} t/s ({worst[1][:40]}…)", worst[0] <= 17)
overlap = [i for i in range(1, len(caps)) if caps[i]['t0'] < caps[i - 1]['t1'] - 1e-6]
row('Captions overlappen niet', 'ok' if not overlap else f'overlap bij {overlap}', not overlap)
anchors = T.get('anchors', {})
long_lines = [l for v in anchors.values() for l in v if len(l.split()) > 8]
too_many = [k for k, v in anchors.items() if len(v) > 2]
row('Ankers max 8 woorden/regel, max 2 regels', 'ok' if not (long_lines or too_many) else f'{long_lines} {too_many}', not (long_lines or too_many))
end = max(c['t1'] for c in caps)
row('Captions binnen de duur', f"laatste eindigt {end:.2f} s / duur {T['duration']:.2f} s", end <= T['duration'])
cue_bad = [c for c in T.get('cues', []) if not (0 <= c['t'] <= T['duration'])]
row('Cues binnen de duur', 'ok' if not cue_bad else str(cue_bad), not cue_bad)
nums = [c['text'] for c in caps if re.search(r'\d|een jaar|maanden|procent|%', c['text'])] + [l for v in anchors.values() for l in v if re.search(r'\d', l)]
src_ok = os.path.exists(os.path.join(D, 'SOURCES.md'))
row('Teksten met getallen: elk een bron in SOURCES.md (handmatig nalopen)', ('; '.join(nums) or 'geen') + ('' if src_ok else ' · SOURCES.md ONTBREEKT'), src_ok if nums else None)

# ---------- 2. contrast (merk) ----------
def lum(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    c = [v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4 for v in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
def ratio(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True); return (la + 0.05) / (lb + 0.05)
def mix(fg, bg, a):
    f = [int(fg.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4)]; b = [int(bg.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4)]
    return '#' + ''.join(f'{round(x * a + y * (1 - a)):02x}' for x, y in zip(f, b))
C = BR['color']
pairs = [('ink', 'ground'), ('ink', 'surface'), ('ink2', 'ground'), ('ink2', 'surface'), ('accent', 'ground'), ('accent', 'surface'), ('accent', 'accentSoft')]
worst_c = min((ratio(C[a], C[b]), f'{a} op {b}') for a, b in pairs)
cap_bg = mix(C['captionBg'], C['ground'], 0.94)
cap_r = ratio(C['captionInk'], cap_bg)
row('Contrast tekstparen merk (min 4,5:1)', f'krapste {worst_c[1]} {worst_c[0]:.2f}:1 · captions {cap_r:.2f}:1', worst_c[0] >= 4.5 and cap_r >= 4.5)

# ---------- 3. tekstmaat op 390 px ----------
scale = {'wide': 1.1, 'tall': 1.35, 'square': 1.2}; scale.update((T.get('format') or {}).get('scale', {}))
mins = {'wide': 22, 'tall': 26, 'square': 26}; mins.update((T.get('format') or {}).get('min', {}))
widths = {'wide': 1920, 'tall': 1080, 'square': 1080}
px = {f: mins[f] * scale[f] * 390 / widths[f] for f in scale}
row('Kleinste tekst op 390 px breed (9:16 en 1:1 min 11 px)', f"9:16 {px['tall']:.1f} px · 1:1 {px['square']:.1f} px · 16:9 {px['wide']:.1f} px (niet voor telefoon)", px['tall'] >= 11 and px['square'] >= 11)

# ---------- 4. determinisme ----------
tmp = tempfile.mkdtemp()
ts = ','.join(str(round(T['duration'] * f, 3)) for f in (0.23, 0.51, 0.77))
for run in ('a', 'b'):
    subprocess.run(['node', 'engine/render.js', 'stills', '--film', slug, '--f', 'wide', '--times', ts, '--out', os.path.join(tmp, run)], check=True, capture_output=True)
ha = [hashlib.sha1(open(p, 'rb').read()).hexdigest() for p in sorted(glob.glob(os.path.join(tmp, 'a', '*.png')))]
hb = [hashlib.sha1(open(p, 'rb').read()).hexdigest() for p in sorted(glob.glob(os.path.join(tmp, 'b', '*.png')))]
row('Zelfde frame twee keer renderen (3 tijden, aparte sessies)', 'identiek' if ha == hb and ha else 'VERSCHIL', ha == hb and bool(ha))

# ---------- 5. stills per beat in alle formaten + contact sheets ----------
st = os.path.join(D, 'build', 'stills'); shutil.rmtree(st, ignore_errors=True); os.makedirs(st)
beats = T['beats']
procs = []
for f, rm in (('wide', False), ('tall', False), ('square', False), ('tall', True)):
    cmd = ['node', 'engine/render.js', 'stills', '--film', slug, '--f', f, '--times', 'beats', '--out', os.path.join(tmp, 'beats'), '--prefix', ('rm' if rm else '') + f] + (['--rm'] if rm else [])
    procs.append(subprocess.Popen(cmd, stdout=subprocess.DEVNULL))
for p in procs: p.wait()
for f in ('wide', 'tall', 'square', 'rmtall'):
    for i, b in enumerate(beats):
        src = os.path.join(tmp, 'beats', f"{f}_{b['id']}.png")
        if os.path.exists(src): shutil.copy(src, os.path.join(st, f"{f}_{i + 1:02d}_{b['id']}.png"))
for f in ('wide', 'tall', 'square', 'rmtall'):
    subprocess.run(['python3', 'engine/contact.py', st, f, os.path.join(D, 'build', f'contact_{f}.png'), '5', '300' if 'tall' in f else '380'], check=True, capture_output=True)
row('Still per beat (16:9, 9:16, 1:1, reduced motion 9:16)', f"{len(beats)} beats × 4 → {D}/build/contact_*.png (bekijken!)", None)

if QUICK:
    pass
else:
    # ---------- 6. exports ----------
    names = ['master_16x9', 'cut_9x16', 'cut_1x1', 'master_16x9_reduced_motion']
    for n in names:
        p = os.path.join(OUT, n + '.mp4')
        if not os.path.exists(p): row(f'{n}.mp4', 'ONTBREEKT', False); continue
        pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate,pix_fmt', '-show_entries', 'format=duration', '-of', 'json', p], capture_output=True, text=True).stdout)
        v = [s for s in pr['streams'] if s['codec_type'] == 'video'][0]; has_a = any(s['codec_type'] == 'audio' for s in pr['streams'])
        dur = float(pr['format']['duration'])
        ok = abs(dur - T['duration']) < 0.05 and v['r_frame_rate'] == '60/1' and v['pix_fmt'] == 'yuv420p' and has_a
        row(f'{n}: specs', f"{v['width']}×{v['height']}, {v['r_frame_rate']} fps, {v['pix_fmt']}, {dur:.3f} s, audio {'ja' if has_a else 'NEE'}", ok)
        e = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', p, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
        I = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', e)[-1]); TP = float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', e)[-1])
        row(f'{n}: loudness na AAC (-16 ±1 LUFS, TP ≤ -1,5)', f'{I:.1f} LUFS, true peak {TP:.1f} dBTP', -17 <= I <= -15 and TP <= -1.5)
    # captions zichtbaar in de echte video's (donker vak onderin op elk captionmoment)
    try:
        import numpy as np
        miss = []
        for n, (w, h) in (('master_16x9', (1920, 1080)), ('cut_9x16', (1080, 1920)), ('cut_1x1', (1080, 1080))):
            p = os.path.join(OUT, n + '.mp4')
            if not os.path.exists(p): continue
            for i, c in enumerate(caps):
                raw = subprocess.run(['ffmpeg', '-nostdin', '-loglevel', 'error', '-ss', str((c['t0'] + c['t1']) / 2), '-i', p, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True).stdout
                a = np.frombuffer(raw, np.uint8).reshape(h, w)[int(h * 0.8):, int(w * 0.35):int(w * 0.65)]
                if (a < 60).mean() < 0.15: miss.append(f'{n}#{i + 1}')
        row('Gedempt: caption in beeld op elk captionmoment', 'ok' if not miss else 'ontbreekt: ' + ', '.join(miss), not miss)
    except ImportError:
        row('Gedempt: caption in beeld', 'numpy ontbreekt, niet getest', None)
    # contact sheet uit de echte master
    fv = os.path.join(tmp, 'fromvideo'); os.makedirs(fv)
    for i, b in enumerate(beats):
        subprocess.run(['ffmpeg', '-nostdin', '-loglevel', 'error', '-ss', str(b['t']), '-i', os.path.join(OUT, 'master_16x9.mp4'), '-frames:v', '1', os.path.join(fv, f"master_{i + 1:02d}_{b['id']}.png")])
    subprocess.run(['python3', 'engine/contact.py', fv, 'master', os.path.join(D, 'contact.png'), '5', '380'], capture_output=True)
    row('contact.png uit de echte master-mp4', f'{D}/contact.png', os.path.exists(os.path.join(D, 'contact.png')))

shutil.rmtree(tmp, ignore_errors=True)
fails = [r for r in rows if r[2] is False]
mark = {True: 'ok', False: '**FAALT**', None: 'nalopen'}
md = [f'# Verificatie: {slug}', '', f"Gedraaid met `python3 engine/verify.py {slug}{' --quick' if QUICK else ''}`. Alleen wat hier staat is getest.", '',
      '| Controle | Resultaat | Status |', '|---|---|---|'] + [f'| {a} | {b} | {mark[c]} |' for a, b, c in rows]
md += ['', 'Niet automatisch te testen: of het verhaal klopt, beluisteren door een mens, afspelen op een echte telefoon. Zie de design review.']
open(os.path.join(D, 'VERIFY.md'), 'w').write('\n'.join(md) + '\n')
print('\n'.join(md))
sys.exit(1 if fails else 0)
