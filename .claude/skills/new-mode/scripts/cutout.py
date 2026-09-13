#!/usr/bin/env python3
"""Cut a generated picture out of its plain background and shrink it to a 208px art file.

Usage: cutout.py <in.png|in.jpg|in.webp> <out.webp> [--bg auto|#rrggbb] [--tol 40] [--size 208] [--pad 0.06]

For a Higgsfield image generated "on a plain white background": flood-fills the background from
the four corners (auto picks the corner colour), so white inside the character stays; feathers the
edge one pixel; trims to the content; pads to a square with a little margin; resizes with Lanczos;
saves RGBA webp like every file in art/. Look at the result: an image whose background is not plain
(a gradient, a floor shadow) needs the Higgsfield remove_background tool first, then this script
with --bg auto on the transparent result (it then only trims and resizes).
"""
import argparse, sys
from collections import deque
from PIL import Image, ImageFilter

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('inp'); ap.add_argument('out'); ap.add_argument('--bg', default='auto'); ap.add_argument('--tol', type=int, default=40)
    ap.add_argument('--size', type=int, default=208); ap.add_argument('--pad', type=float, default=0.06)
    a = ap.parse_args()
    im = Image.open(a.inp).convert('RGBA'); W, H = im.size; px = im.load()
    if im.getextrema()[3][0] < 255:   # already transparent somewhere: trust the alpha, only trim and resize
        pass
    else:
        if a.bg == 'auto':
            corners = [px[0, 0], px[W - 1, 0], px[0, H - 1], px[W - 1, H - 1]]
            bg = tuple(sum(c[i] for c in corners) // 4 for i in range(3))
        else:
            h = a.bg.lstrip('#'); bg = tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
        close = lambda p: abs(p[0] - bg[0]) + abs(p[1] - bg[1]) + abs(p[2] - bg[2]) <= a.tol * 3
        seen = bytearray(W * H); q = deque()
        for x, y in [(0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1), (W // 2, 0), (W // 2, H - 1), (0, H // 2), (W - 1, H // 2)]:
            if close(px[x, y]): q.append((x, y)); seen[y * W + x] = 1
        while q:
            x, y = q.popleft(); px[x, y] = (0, 0, 0, 0)
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < W and 0 <= ny < H and not seen[ny * W + nx] and close(px[nx, ny]): seen[ny * W + nx] = 1; q.append((nx, ny))
        alpha = im.getchannel('A').filter(ImageFilter.GaussianBlur(0.8)); im.putalpha(alpha)
    bbox = im.getchannel('A').getbbox()
    if not bbox: sys.exit('nothing left after removing the background; try --tol lower or --bg')
    im = im.crop(bbox); w, h = im.size; side = int(max(w, h) * (1 + 2 * a.pad))
    sq = Image.new('RGBA', (side, side), (0, 0, 0, 0)); sq.paste(im, ((side - w) // 2, (side - h) // 2), im)
    sq = sq.resize((a.size, a.size), Image.LANCZOS); sq.save(a.out, 'WEBP', quality=92, method=6)
    print(f'{a.out}: {a.size}x{a.size} RGBA from {W}x{H}, content {w}x{h}')

if __name__ == '__main__':
    main()
