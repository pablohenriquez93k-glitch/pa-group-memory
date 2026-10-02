"""Genera icon.png (300x300): barra de grupos de control + disquete de guardado."""
from PIL import Image, ImageDraw, ImageFont
import os

S = 4  # supersampling
W = 300 * S
img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

def px(v):
    return int(v * S)

def font(size):
    for f in ("segoeuib.ttf", "arialbd.ttf"):
        try:
            return ImageFont.truetype(os.path.join(os.environ.get("WINDIR", "C:/Windows"), "Fonts", f), px(size))
        except OSError:
            pass
    return ImageFont.load_default()

# fondo: cuadrado redondeado con degradado vertical
grad = Image.new("RGBA", (W, W))
gd = ImageDraw.Draw(grad)
top, bot = (28, 46, 74), (11, 18, 32)
for y in range(W):
    t = y / (W - 1)
    gd.line([(0, y), (W, y)], fill=tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)) + (255,))
mask = Image.new("L", (W, W), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, W - 1, W - 1], radius=px(48), fill=255)
img.paste(grad, (0, 0), mask)
d.rounded_rectangle([px(3), px(3), px(297), px(297)], radius=px(46), outline=(70, 110, 160, 255), width=px(3))

# barra de grupos de control: 5 fichas con numero
accent = (255, 176, 46)
fn = font(30)
n, tw, gap = 5, 44, 8
x0 = (300 - (n * tw + (n - 1) * gap)) / 2
for i in range(n):
    x = x0 + i * (tw + gap)
    d.rounded_rectangle([px(x), px(34), px(x + tw), px(34 + 44)], radius=px(8),
                        fill=(20, 32, 54, 255), outline=accent, width=px(3))
    d.text((px(x + tw / 2), px(34 + 22)), str((i + 1) % 10), font=fn, fill=accent, anchor="mm")

# flecha corta hacia el disquete
d.polygon([(px(150), px(100)), (px(133), px(84 + 6)), (px(167), px(84 + 6))], fill=(120, 170, 225, 255))

# disquete
cx, cy, sz = 150, 195, 120
l, t, r, b = cx - sz / 2, cy - sz / 2 + 10, cx + sz / 2, cy + sz / 2 + 10
blue = (70, 150, 235, 255)
d.rounded_rectangle([px(l), px(t), px(r), px(b)], radius=px(10), fill=blue)
# esquina cortada
d.polygon([(px(r - 22), px(t)), (px(r), px(t)), (px(r), px(t + 22))], fill=(11, 18, 32, 255))
# etiqueta (parte baja)
d.rounded_rectangle([px(l + 16), px(b - 52), px(r - 16), px(b)], radius=px(6), fill=(236, 242, 250, 255))
for k in range(3):
    d.line([(px(l + 28), px(b - 38 + k * 12)), (px(r - 28), px(b - 38 + k * 12))], fill=(150, 170, 200, 255), width=px(3))
# obturador metalico
d.rectangle([px(l + 28), px(t), px(r - 38), px(t + 34)], fill=(200, 215, 235, 255))
d.rectangle([px(r - 56), px(t + 6), px(r - 46), px(t + 28)], fill=blue)

out = img.resize((300, 300), Image.LANCZOS)
out.save(os.path.join(os.path.dirname(__file__), "..", "icon.png"), optimize=True)
print("icon.png listo")
