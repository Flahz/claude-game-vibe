#!/usr/bin/env python3
"""Build a single-file copy of the game with every art file inlined as a data URI.

Usage: inline-art.py <repo-dir> <output.html>

The Claude artifact of Bubble Pop Safari is published from this output (same artifact
URL every release, see references/release.md). The artifact sandbox cannot load
art/*.webp by path, so every `src="art/x.webp"` and every `'art/x.webp'` string in the
ART_SRC table becomes `data:image/webp;base64,...`. The service worker registration is
dropped (there is no sw.js next to an artifact) and so is the manifest link.
"""
import base64, os, re, sys

if len(sys.argv) != 3:
    sys.exit(__doc__)
repo, out = sys.argv[1], sys.argv[2]
html = open(os.path.join(repo, 'index.html'), encoding='utf-8').read()
cache = {}

def data_uri(rel):
    if rel not in cache:
        with open(os.path.join(repo, rel), 'rb') as f:
            cache[rel] = 'data:image/webp;base64,' + base64.b64encode(f.read()).decode('ascii')
    return cache[rel]

html, n = re.subn(r"(['\"])(art/[A-Za-z0-9_-]+\.webp)\1",
                  lambda m: m.group(1) + data_uri(m.group(2)) + m.group(1), html)
html = re.sub(r'<link rel="manifest"[^>]*>\n?', '', html)
html = re.sub(r"try\{ if\('serviceWorker' in navigator[^\n]*\n", '', html)
open(out, 'w', encoding='utf-8').write(html)
print(f'{out}: {n} art references inlined, {len(cache)} files, {os.path.getsize(out)//1024} KB')
