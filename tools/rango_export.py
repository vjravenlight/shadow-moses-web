# MGS web — FeniXVOID · Project Ravenlight
import os, sys, struct, glob, json
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
import numpy as np
from PIL import Image
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
ST = os.path.join(EXTRAIDO, 'disco1', '01_stages', 'rank')
OUT = os.path.join(ASSETS, 'rango')
BASE = 2148292968
NOMBRES = ['HOUND', 'DOBERMAN', 'FOX', 'BIG BOSS', 'PIGEON', 'FALCON', 'HAWK', 'EAGLE', 'PIRANHA', 'SHARK', 'JAWS', 'ORCA', 'PIG', 'ELEPHANT', 'MAMMOTH', 'WHALE', 'CAT', 'DEER', 'ZEBRA', 'HIPPOPOTAMUS', 'KOALA', 'CAPYBARA', 'SLOTH', 'GIANT PANDA', 'CHICKEN', 'MOUSE', 'RABBIT', 'OSTRICH', 'PUMA', 'LEOPARD', 'PANTHER', 'JAGUAR', 'COMODO DRAGON', 'IGUANA', 'ALLIGATOR', 'CROCODILE', 'MONGOOSE', 'HYENA', 'JACKAL', 'TASMANIAN DEVIL', 'SPIDER', 'TARANTULA', 'CENTIPEDE', 'SCORPION', 'FLYING SQUIRREL', 'BAT', 'FLYING FOX', 'NIGHT OWL']
PIEZAS = ['rank_rank', 'rank_line1', 'rank_line2', 'rank_spe_camera', 'rank_spe_stealth', 'rank_spe_mugen', 'cur_lu', 'cur_ru', 'cur_ld', 'cur_rd', 'cur_u', 'cur_d', 'cur_l', 'cur_r', 'cur_c']

def strcode(s):
    i = 0
    for c in s.encode():
        i = (i << 5 | i >> 11) & 65535
        i = i + c & 65535
    return i

def _rle(d, p, n):
    out = bytearray()
    while len(out) < n:
        c = d[p]
        p += 1
        if c <= 192:
            out.append(c)
        else:
            out += bytes([d[p]]) * (c - 192)
            p += 1
    return (out, p)

def pcx(path):
    d = open(path, 'rb').read()
    min_x, min_y, max_x, max_y = struct.unpack('<4H', d[4:12])
    bpl = struct.unpack('<H', d[66:68])[0]
    stamp, flag, px, py, cx, cy, ncol = struct.unpack('<7H', d[74:88])
    w, h = (max_x - min_x + 1, max_y - min_y + 1)
    if flag & 1:
        idx, p = _rle(d, 128, w * h)
        pal = np.frombuffer(d[p + 1:p + 1 + 3 * ncol], np.uint8).reshape(-1, 3)
        idx = np.frombuffer(bytes(idx[:w * h]), np.uint8).reshape(h, w)
    else:
        pal = np.frombuffer(d[16:16 + 48], np.uint8).reshape(16, 3)
        p = 128
        filas = []
        for _ in range(h):
            t, p = _rle(d, p, bpl * 4)
            pl = [np.unpackbits(np.frombuffer(bytes(t[i * bpl:(i + 1) * bpl]), np.uint8))[:w] for i in range(4)]
            filas.append(pl[0] | pl[1] << 1 | pl[2] << 2 | pl[3] << 3)
        idx = np.array(filas, np.uint8)
    lut = np.zeros((256, 4), np.uint8)
    lut[:len(pal), :3] = pal
    lut[:len(pal), 3] = np.where(pal.astype(int).sum(1) == 0, 0, 255)
    return (lut[idx], flag)

def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    os.makedirs(OUT, exist_ok=True)
    noc = os.path.join(ST, 'nocache')
    if not os.path.isdir(noc):
        raise SystemExit('falta ' + noc + ' (python tools/stage_extract.py disco1)')
    ov = open(glob.glob(os.path.join(ST, 'sound', '*.bin'))[0], 'rb').read()
    o_h = ov.find(struct.pack('<2I', 26845, 20053))
    o_a = ov.find(struct.pack('<I', 571352600))
    if o_h < 0 or o_a < 0:
        raise SystemExit('no encontré las tablas del rango en el overlay')
    hashes = [struct.unpack_from('<I', ov, o_h + 4 * i)[0] for i in range(48)]
    anchos = list(ov[o_a:o_a + 48])
    print('tablas en', hex(BASE + o_h), hex(BASE + o_a))
    VISTOS = {42, 47}
    for i, (n, h) in enumerate(zip(NOMBRES, hashes)):
        if i not in VISTOS and strcode({'CAPYBARA': 'capibara'}.get(n, n.lower().replace(' ', ''))) != h:
            print('  ojo: el nombre', i, n, 'no da', hex(h))
    for a, b, nom in (('back_l', 'back_r', 'fondo.png'), ('big_back_l', 'big_back_r', 'fondo_bb.png')):
        l, _ = pcx(os.path.join(noc, a + '.pcx'))
        r, _ = pcx(os.path.join(noc, b + '.pcx'))
        Image.fromarray(np.concatenate([l, r], axis=1)).save(os.path.join(OUT, nom), optimize=True)
    imgs = []
    for n in PIEZAS:
        im, fl = pcx(os.path.join(noc, n + '.pcx'))
        imgs.append((n, im, fl))
    for i, h in enumerate(hashes):
        f = os.path.join(noc, '%04x.pcx' % h)
        if not os.path.exists(f):
            f = os.path.join(noc, NOMBRES[i].lower().replace(' ', '_') + '.pcx')
        im, fl = pcx(f)
        imgs.append(('n%02d' % i, im, fl))
    W = max((im.shape[1] for _, im, _ in imgs))
    H = sum((im.shape[0] + 1 for _, im, _ in imgs))
    atlas = np.zeros((H, W, 4), np.uint8)
    rects = {}
    y = 0
    for n, im, fl in imgs:
        h, w = im.shape[:2]
        atlas[y:y + h, :w] = im
        rects[n] = [0, y, w, h, (fl & 48) >> 4]
        y += h + 1
    Image.fromarray(atlas).save(os.path.join(OUT, 'piezas.png'), optimize=True)
    json.dump({'piezas': rects, 'nombres': NOMBRES, 'hashes': ['%04x' % h for h in hashes], 'medio_ancho': anchos, 'fuente': 'overlays/rank (rank_dword_800CBAAC, rank_dword_800CBA7C), tools/rango_export.py'}, open(os.path.join(OUT, 'rango.json'), 'w'), indent=1)
    print('listo:', OUT, len(rects), 'piezas, atlas', W, 'x', H)
if __name__ == '__main__':
    main()
