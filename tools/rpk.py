# MGS web — FeniXVOID · Project Ravenlight
import struct, sys, os
import numpy as np
from PIL import Image

def color15(c):
    r, g, b = ((c & 31) << 3, (c >> 5 & 31) << 3, (c >> 10 & 31) << 3)
    a = 0 if c == 0 else 255
    return (r | r >> 5, g | g >> 5, b | b >> 5, a)

def leer(path):
    d = open(path, 'rb').read()
    n_pal, n_img = (d[0], d[1])
    n = n_pal + n_img
    offs = struct.unpack_from(f'<{n}I', d, 4)
    base = 4 + 4 * n
    items = []
    for i, o in enumerate(offs):
        p = base + o
        x, y, w, h = (d[p], d[p + 1], d[p + 2], d[p + 3])
        items.append({'i': i, 'x': x, 'y': y, 'w': w, 'h': h, 'p': p + 4})
    paletas = []
    for it in items[:n_pal]:
        cols = struct.unpack_from('<16H', d, it['p'])
        paletas.append([color15(c) for c in cols])
    imagenes = []
    for it in items[n_pal:]:
        W, H = (it['w'] * 4, it['h'])
        raw = np.frombuffer(d, np.uint8, count=W * H // 2, offset=it['p'])
        idx = np.empty(W * H, np.uint8)
        idx[0::2] = raw & 15
        idx[1::2] = raw >> 4
        imagenes.append(dict(it, idx=idx.reshape(H, W)))
    return (paletas, imagenes)

def png(img, pal):
    p = np.array(pal, np.uint8)
    return Image.fromarray(p[img['idx']])
if __name__ == '__main__':
    src, out = (sys.argv[1], sys.argv[2])
    pi = int(sys.argv[sys.argv.index('--paleta') + 1]) if '--paleta' in sys.argv else 0
    pals, imgs = leer(src)
    os.makedirs(out, exist_ok=True)
    print(len(pals), 'paletas,', len(imgs), 'imagenes')
    for k, im in enumerate(imgs):
        if im['w'] * im['h'] == 0:
            print(f'  {k + len(pals):3d}: vacia')
            continue
        png(im, pals[min(pi, len(pals) - 1)]).save(os.path.join(out, f'{k + len(pals):03d}.png'))
        print(f"  {k + len(pals):3d}: {im['w'] * 4}x{im['h']} en ({im['x']},{im['y']})")
