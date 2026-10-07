"""Voor/na-paar voor een fix. Elke fix krijgt er één.
Gebruik: python3 engine/pair.py <voor.png> <na.png> <uit.png> "<wat er mis was>"
"""
import sys, os
from PIL import Image, ImageDraw, ImageFont
a, b, out, why = sys.argv[1:5]
here = os.path.dirname(os.path.abspath(__file__))
f = ImageFont.truetype(os.path.join(here, '..', 'brand', 'fonts', 'Inter-SemiBold.otf'), 28)
A = Image.open(a).convert('RGB'); B = Image.open(b).convert('RGB')
h = 720 if A.width >= A.height else 960
A = A.resize((int(A.width * h / A.height), h)); B = B.resize((int(B.width * h / B.height), h))
s = Image.new('RGB', (A.width + B.width + 30, h + 70), (244, 239, 230)); d = ImageDraw.Draw(s)
d.text((10, 18), 'VOOR  ·  ' + why, fill=(30, 28, 25), font=f); d.text((A.width + 40, 18), 'NA', fill=(24, 94, 68), font=f)
s.paste(A, (10, 60)); s.paste(B, (A.width + 20, 60)); s.save(out)
print(out)
