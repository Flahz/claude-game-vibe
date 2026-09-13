#!/usr/bin/env python3
"""Draw a mode icon in the game's own style when Higgsfield is not available.

Usage: make-icon.py --text "Aa" [--color "#2f7cff"] [--shape circle|rounded|bubble] [--size 208] out.webp

A flat, bright badge with a soft highlight, a thick dark outline (#2b2b45, like the rims on the
bubbles' numbers), big white letters with the same dark rim, and a soft drop shadow; drawn at 4x
and shrunk with Lanczos so the edges are smooth at 34px on the home screen. Output is a 208x208
RGBA webp, the size every file in art/ has. Two or three characters read best; use a middle dot
"3·00" for a colon-like separator if the font's colon is too thin.
"""
import argparse, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONTS = ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf',
         '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf']

def font(size):
    for p in FONTS:
        try: return ImageFont.truetype(p, size)
        except OSError: pass
    return ImageFont.load_default(size=size)

def hexrgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def shade(rgb, k):
    return tuple(max(0, min(255, int(c * k + (255 * (1 - k) if k > 1 else 0)))) for c in rgb) if k <= 1 else tuple(min(255, int(c + (255 - c) * (k - 1))) for c in rgb)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('out'); ap.add_argument('--text', required=True); ap.add_argument('--color', default='#2f7cff')
    ap.add_argument('--shape', default='rounded', choices=['circle', 'rounded', 'bubble']); ap.add_argument('--size', type=int, default=208)
    a = ap.parse_args()
    S = a.size * 4; pad = S * 0.08; ink = (43, 43, 69, 255); main = hexrgb(a.color)
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    # drop shadow
    sh = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(sh)
    box = [pad, pad, S - pad, S - pad * 1.6]
    shadow_box = [box[0], box[1] + S * 0.05, box[2], box[3] + S * 0.05]
    draw_shape = lambda dr, b, fill, outline=None, w=0: (dr.ellipse(b, fill=fill, outline=outline, width=w) if a.shape == 'circle' else dr.rounded_rectangle(b, radius=S * 0.22, fill=fill, outline=outline, width=w))
    draw_shape(d, shadow_box, (0, 0, 0, 90)); sh = sh.filter(ImageFilter.GaussianBlur(S * 0.02)); im.alpha_composite(sh)
    d = ImageDraw.Draw(im)
    draw_shape(d, box, main + (255,), ink, int(S * 0.035))
    # highlight: a lighter band across the top
    hl = Image.new('RGBA', (S, S), (0, 0, 0, 0)); hd = ImageDraw.Draw(hl)
    draw_shape(hd, [box[0] + S * 0.06, box[1] + S * 0.05, box[2] - S * 0.06, box[1] + (box[3] - box[1]) * 0.5], shade(main, 1.45) + (150,))
    hl = hl.filter(ImageFilter.GaussianBlur(S * 0.03))
    mask = Image.new('L', (S, S), 0); draw_shape(ImageDraw.Draw(mask), [box[0] + S * 0.02, box[1] + S * 0.02, box[2] - S * 0.02, box[3] - S * 0.02], 255)
    im.paste(Image.alpha_composite(im, hl), (0, 0), mask)
    if a.shape == 'bubble':   # a speech-bubble tail, bottom left
        d = ImageDraw.Draw(im); d.polygon([(S * 0.22, box[3] - S * 0.02), (S * 0.14, S - pad * 0.6), (S * 0.42, box[3] - S * 0.02)], fill=main + (255,), outline=ink, width=int(S * 0.035))
        d.rounded_rectangle([S * 0.2, box[3] - S * 0.09, S * 0.44, box[3] - S * 0.03], radius=4, fill=main + (255,))
    # text: white with a dark rim, sized to fit
    d = ImageDraw.Draw(im); size = int(S * 0.62)
    while size > 20:
        f = font(size); l, t, r, b = d.textbbox((0, 0), a.text, font=f)
        if r - l <= (box[2] - box[0]) * 0.78 and b - t <= (box[3] - box[1]) * 0.62: break
        size -= 8
    cx = (box[0] + box[2]) / 2 - (l + r) / 2; cy = (box[1] + box[3]) / 2 - (t + b) / 2
    d.text((cx, cy), a.text, font=f, fill=(255, 255, 255, 255), stroke_width=int(size * 0.09), stroke_fill=ink)
    im = im.resize((a.size, a.size), Image.LANCZOS)
    im.save(a.out, 'WEBP', quality=92, method=6)
    print(f'{a.out}: {a.size}x{a.size} {im.mode}, text "{a.text}" on {a.color} {a.shape}')

if __name__ == '__main__':
    main()
