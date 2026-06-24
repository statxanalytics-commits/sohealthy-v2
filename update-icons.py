#!/usr/bin/env python3
"""
Generate SoHealthy app icons from the brand logo.
Run once locally:  python3 update-icons.py
Requires: pip install Pillow --break-system-packages
Output: assets/images/{icon,android-icon-foreground,android-icon-background,android-icon-monochrome,splash-icon}.png
"""
import os
import urllib.request
from PIL import Image

PINE = (27, 63, 47)  # #1B3F2F
LOGO_URL = "https://sohealthy.al/wp-content/uploads/2026/01/icon-light-scaled.jpeg"
OUT_DIR = "assets/images"

os.makedirs(OUT_DIR, exist_ok=True)

# Download brand logo
tmp = "/tmp/_sohealthy_logo.jpeg"
print("Downloading logo...")
urllib.request.urlretrieve(LOGO_URL, tmp)
src = Image.open(tmp).convert("RGB")
w, h = src.size

# Crop the central mark (~50% of source)
cw = int(w * 0.50)
left = (w - cw) // 2
top = (h - cw) // 2
mark = src.crop((left, top, left + cw, top + cw)).convert("RGBA")

# Convert mark to white silhouette on transparent
mw, mh = mark.size
pm = mark.load()
for y in range(mh):
    for x in range(mw):
        r, g, b, a = pm[x, y]
        if r > 180 and g > 190 and b > 175:   # light bg -> transparent
            pm[x, y] = (255, 255, 255, 0)
        else:                                  # green mark -> white
            pm[x, y] = (255, 255, 255, 255)

def place(size, canvas_mode, canvas_fill):
    canvas = Image.new(canvas_mode, (1024, 1024), canvas_fill)
    m = mark.resize((size, size), Image.LANCZOS)
    off = (1024 - size) // 2
    canvas.paste(m, (off, off), m)
    return canvas

# iOS icon: Pine bg + white mark, no alpha
place(620, "RGB", PINE).save(f"{OUT_DIR}/icon.png")
print("icon.png")

# Android foreground: white mark on transparent
place(520, "RGBA", (0, 0, 0, 0)).save(f"{OUT_DIR}/android-icon-foreground.png")
print("android-icon-foreground.png")

# Android background: solid Pine
Image.new("RGB", (1024, 1024), PINE).save(f"{OUT_DIR}/android-icon-background.png")
print("android-icon-background.png")

# Android monochrome: white mark on transparent
place(520, "RGBA", (0, 0, 0, 0)).save(f"{OUT_DIR}/android-icon-monochrome.png")
print("android-icon-monochrome.png")

# Splash icon: white mark on transparent (splash bg is Pine via app.json)
place(420, "RGBA", (0, 0, 0, 0)).save(f"{OUT_DIR}/splash-icon.png")
print("splash-icon.png")

print("\nDONE. Now run:  npx expo prebuild --clean")
