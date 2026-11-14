"""Builds the two textures the animated hero (assets/js/hero-melt.js) loads.

  assets/img/logo-hero.webp   the logo, sharp enough for large screens
  assets/img/logo-field.png   helper map: red = tight blur of the logo shape,
                              green = wide blur. The shader uses it to bulge,
                              light, shadow and outline the liquid around the logo.

Run after changing assets/img/logo-transparent.png:
  python tools/make-hero-assets.py        (needs Pillow: pip install pillow)
"""
from pathlib import Path
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "assets" / "img"
MARGIN = 1.5          # field covers the logo box grown 1.5x; must match FM in hero-melt.js
FIELD_LOGO_W = 256    # logo width inside the field map, in pixels

src = Image.open(IMG / "logo-transparent.png").convert("RGBA")

# 1. Logo texture
hero = src.copy()
hero.save(IMG / "logo-hero.webp", "WEBP", quality=90, method=6)

# 2. Field map
w = FIELD_LOGO_W
h = round(w * src.height / src.width)
alpha = src.getchannel("A").resize((w, h), Image.LANCZOS)
fw, fh = round(w * MARGIN), round(h * MARGIN)
canvas = Image.new("L", (fw, fh), 0)
canvas.paste(alpha, ((fw - w) // 2, (fh - h) // 2))
tight = canvas.filter(ImageFilter.GaussianBlur(2.6))
wide = canvas.filter(ImageFilter.GaussianBlur(20))
field = Image.merge("RGB", (tight, wide, canvas))
field.save(IMG / "logo-field.png", optimize=True)

for name in ("logo-hero.webp", "logo-field.png"):
    p = IMG / name
    print(name, Image.open(p).size, round(p.stat().st_size / 1024), "KB")
