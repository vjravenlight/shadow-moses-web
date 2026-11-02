# MGS web — FeniXVOID · Project Ravenlight
import os, struct, json
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
import numpy as np
from PIL import Image
RAIZ = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(EXTRAIDO, 'disco1', '01_stages', 'init', 'resident', 'item.rar')
OUT = os.path.join(ASSETS, 'hud')
d = open(SRC, 'rb').read()
n = d[0] + d[1]
offs = struct.unpack_from(f'<{n}I', d, 4)
base = 4 + 4 * n
items = []
for o in offs:
    p = base + o
    items.append((d[p], d[p + 1], d[p + 2], d[p + 3], p + 4))

def paleta(i):
    cols = struct.unpack_from('<16H', d, items[i][4])
    out = []
    for c in cols:
        r, g, b = ((c & 31) << 3, (c >> 5 & 31) << 3, (c >> 10 & 31) << 3)
        out.append((r | r >> 5, g | g >> 5, b | b >> 5, 0 if c == 0 else 255))
    return np.array(out, np.uint8)

def imagen(i, pi):
    x, y, w, h, p = items[i]
    W, H = (w * 4, h)
    raw = np.frombuffer(d, np.uint8, count=W * H // 2, offset=p)
    idx = np.empty(W * H, np.uint8)
    idx[0::2] = raw & 15
    idx[1::2] = raw >> 4
    return (Image.fromarray(paleta(pi)[idx.reshape(H, W)]), x - 2, y - 2)
pedidos = [(i, 0) for i in range(1, 12)] + [(i, 46 if i == 22 else 47 if i == 27 else 0) for i in range(12, 33)] + [(40, 39), (48, 39)]
imgs = [(i, *imagen(i, pi)) for i, pi in pedidos]
ancho = 256
x = y = fila = 0
pos = {}
for i, im, ox, oy in imgs:
    if x + im.width > ancho:
        x = 0
        y += fila + 1
        fila = 0
    pos[i] = (x, y)
    x += im.width + 1
    fila = max(fila, im.height)
atlas = Image.new('RGBA', (ancho, y + fila), (0, 0, 0, 0))
meta = {}
for i, im, ox, oy in imgs:
    atlas.paste(im, pos[i])
    meta[str(i)] = {'u': pos[i][0], 'v': pos[i][1], 'w': im.width, 'h': im.height, 'ox': ox, 'oy': oy}
atlas.save(os.path.join(OUT, 'inventario.png'))
json.dump(meta, open(os.path.join(OUT, 'inventario.json'), 'w'), indent=0)
print('atlas', atlas.size, len(meta), 'imágenes ->', os.path.join(OUT, 'inventario.png'))
