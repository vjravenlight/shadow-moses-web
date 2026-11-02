# MGS web — FeniXVOID · Project Ravenlight
import os, sys, struct, json, glob
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
import numpy as np
from PIL import Image
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
ST = os.path.join(EXTRAIDO, 'disco1', '01_stages')
OUT = os.path.join(ASSETS, 'vr', 'comun')
SALAS = ['selectvr'] + ['vr%02d' % i for i in range(1, 11)] + ['vrdemo']
BASE = 2148292968

def _rle(data, pos, size):
    out = bytearray()
    while len(out) < size:
        code = data[pos]
        pos += 1
        if code <= 192:
            out.append(code)
        else:
            n = code - 192
            out += bytes([data[pos]]) * n
            pos += 1
    return (out, pos)

def pcx(path):
    d = open(path, 'rb').read()
    min_x, min_y, max_x, max_y = struct.unpack('<4H', d[4:12])
    stamp, flag, px, py, cx, cy, ncol = struct.unpack('<7H', d[74:88])
    w, h = (max_x - min_x + 1, max_y - min_y + 1)
    assert flag & 1, 'se esperaba 8 bits: ' + path
    idx, pos = _rle(d, 128, w * h)
    pal = d[pos + 1:pos + 1 + 3 * ncol]
    return (np.frombuffer(bytes(idx[:w * h]), np.uint8).reshape(h, w), np.frombuffer(pal, np.uint8).reshape(-1, 3), (px, py))

def rgba(idx, pal):
    p = np.zeros((256, 4), np.uint8)
    p[:len(pal), :3] = pal
    p[:len(pal), 3] = np.where(pal.astype(int).sum(1) == 0, 0, 255)
    return p[idx]

def tablas(st):
    f = (glob.glob(os.path.join(ST, st, 'sound', '*.bin')) or [None])[0]
    if not f:
        return None
    d = open(f, 'rb').read()
    ref = open(glob.glob(os.path.join(ST, 'vr01', 'sound', '*.bin'))[0], 'rb').read()
    t1 = ref[2148293980 - BASE:][:48]
    o = d.find(t1)
    if o < 0:
        return None
    tinte = [list(struct.unpack_from('<3i', d, o + 12 * t)) for t in range(4)]
    col = [[list(struct.unpack_from('<3i', d, o + 48 + 36 * t + 12 * c)) for c in range(3)] for t in range(4)]
    seq = list(struct.unpack_from('<4i', d, o + 48 + 144))
    return {'tinte': tinte, 'colores': col, 'secuencia': seq, 'dir': hex(o + BASE)}

def main():
    os.makedirs(OUT, exist_ok=True)
    nc = os.path.join(ST, 'vr01', 'nocache')
    il, pl, (lx, ly) = pcx(os.path.join(nc, 'op_back_l.pcx'))
    ir, pr, (rx, ry) = pcx(os.path.join(nc, 'op_back_r.pcx'))
    ib, pb, (bx, by) = pcx(os.path.join(nc, '94d7.pcx'))
    assert (rx, ry) == (0, 278) and (bx, by) == (0, 256) and (ib.shape[0] == 22), 'cambió la VRAM de vr01'
    Image.fromarray(rgba(il, pl)).save(os.path.join(OUT, 'fondo_l.png'))
    junk = ib[:, :160]
    Image.fromarray(rgba(np.vstack([junk, ir]), pr)).save(os.path.join(OUT, 'fondo_r.png'))
    info = {'filas_extra': 22, 'salas': {}, 'tablas': None}
    for st in SALAS:
        p = os.path.join(ST, st, 'nocache', 'op_back_r.pcx')
        if not os.path.exists(p):
            continue
        h = open(p, 'rb').read(88)
        px, py = struct.unpack('<7H', h[74:88])[2:4]
        b = os.path.join(ST, st, 'nocache', '94d7.pcx')
        info['salas'][st] = {'vR': py & 255, 'barra': os.path.exists(b)}
        t = tablas(st)
        if t and info['tablas'] is None:
            info['tablas'] = t
        elif t and (t['tinte'], t['colores'], t['secuencia']) != (info['tablas']['tinte'], info['tablas']['colores'], info['tablas']['secuencia']):
            print('  OJO: tablas distintas en', st)
    json.dump(info, open(os.path.join(OUT, 'fondo.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('fondo_l.png', il.shape, 'fondo_r.png', (22 + ir.shape[0], ir.shape[1]))
    print({k: v['vR'] for k, v in info['salas'].items()})
    print('tablas', info['tablas'])
    efectos()
    chispas()

def efectos():
    src = os.path.join(ST, 'init', 'nocache')
    for n in ('rcm_l', 'refrection6', 'sonic'):
        f = os.path.join(src, n + '.pcx')
        if not os.path.exists(f):
            print('  falta', f)
            continue
        d = open(f, 'rb').read()
        flag = struct.unpack('<H', d[76:78])[0]
        if flag & 1:
            idx, pal, _ = pcx(f)
            im = Image.fromarray(rgba(idx, pal))
        else:
            sys.path.insert(0, os.path.dirname(__file__))
            from pcx_mgs import decode
            im = decode(f)
        im.save(os.path.join(OUT, n + '.png'))
        print(n, im.size, 'semi', (flag & 48) >> 4)

def chispas():
    sys.path.insert(0, os.path.dirname(__file__))
    from kmd2obj import load
    import gcx
    for st in ['vr%02d' % i for i in range(1, 11)]:
        for var in 'nts':
            nombre = 'vr_%sn' % st[2:] if var == 'n' else 'vr_%s%s' % (st[2:], var)
            f = os.path.join(ST, st, 'cache', '%04x.kmd' % gcx.strcode(nombre))
            if not os.path.exists(f):
                print('  falta', nombre, f)
                continue
            piezas = []
            for m in load(f):
                n = len(m['verts'])
                ady = [[] for _ in range(n)]

                def agregar(a, b):
                    if b not in ady[a] and len(ady[a]) < 6:
                        ady[a].append(b)
                vi = m['vi']
                for k in range(len(vi) // 4):
                    i0, i1, i2, i3 = vi[k * 4:k * 4 + 4]
                    agregar(i0, i1)
                    agregar(i1, i2)
                    agregar(i2, i3)
                    agregar(i3, i0)
                    agregar(i1, i0)
                    agregar(i2, i1)
                    agregar(i3, i2)
                    agregar(i0, i3)
                piezas.append({'v': [list(v[:3]) for v in m['verts']], 'ady': ady, 't': list(m['t'])})
            dst = os.path.join(ASSETS, 'vr', st, 'chispas_%s.json' % var)
            json.dump({'kmd': nombre, 'piezas': piezas}, open(dst, 'w', encoding='utf-8'), separators=(',', ':'))
        print('chispas', st, 'ok')
if __name__ == '__main__':
    main()
