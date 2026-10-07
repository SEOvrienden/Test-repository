"""Contact sheet: alle stills met dezelfde prefix in een raster, gesorteerd op bestandsnaam.
Gebruik: python3 engine/contact.py <map> <prefix> <uit.png> [kolommen] [breedte_per_tegel]
Label = bestandsnaam zonder prefix (verify.py nummert als 01_S1-a zodat de volgorde klopt).
"""
import sys, os, glob
from PIL import Image, ImageDraw, ImageFont

src, prefix, out = sys.argv[1], sys.argv[2], sys.argv[3]
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 5
tw = int(sys.argv[5]) if len(sys.argv) > 5 else 480
here = os.path.dirname(os.path.abspath(__file__))
font = ImageFont.truetype(os.path.join(here, '..', 'brand', 'fonts', 'Inter-SemiBold.otf'), 18)

files = sorted(glob.glob(os.path.join(src, prefix + '_*.png')))
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
