"""Contact sheet: alle beat-stills in een raster met id en tijd.
Gebruik: python3 render/contact.py <map> <prefix> <uit.png> [kolommen] [breedte_per_tegel]
"""
import sys, os, json, glob
from PIL import Image, ImageDraw, ImageFont

src, prefix, out = sys.argv[1], sys.argv[2], sys.argv[3]
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 5
tw = int(sys.argv[5]) if len(sys.argv) > 5 else 480
here = os.path.dirname(os.path.abspath(__file__))
font = ImageFont.truetype(os.path.join(here, '..', 'src', 'fonts', 'Inter-SemiBold.otf'), 18)

files = sorted(glob.glob(os.path.join(src, prefix + '_*.png')), key=lambda p: (p.split('_')[-1]))
# volgorde van TIMELINE.beats aanhouden
order = ['S1-a', 'S1-b', 'S2-a', 'S2-b', 'S2-c', 'S2-d', 'S3-a', 'S3-b', 'S3-c', 'S3-d', 'S4-a', 'S4-b', 'S4-c', 'S5-a', 'S5-b']
def key(p):
    b = os.path.basename(p)[len(prefix) + 1:-4]
    return order.index(b) if b in order else 99
files.sort(key=key)
ims = [Image.open(f).convert('RGB') for f in files]
w0, h0 = ims[0].size
th = int(tw * h0 / w0)
rows = (len(ims) + cols - 1) // cols
lab = 30
sheet = Image.new('RGB', (cols * (tw + 12) + 12, rows * (th + lab + 12) + 12), (232, 226, 215))
d = ImageDraw.Draw(sheet)
for i, (f, im) in enumerate(zip(files, ims)):
    r, c = divmod(i, cols)
    x, y = 12 + c * (tw + 12), 12 + r * (th + lab + 12)
    d.text((x, y + 4), os.path.basename(f)[len(prefix) + 1:-4], fill=(30, 28, 25), font=font)
    sheet.paste(im.resize((tw, th), Image.LANCZOS), (x, y + lab))
sheet.save(out)
print(out, sheet.size)
