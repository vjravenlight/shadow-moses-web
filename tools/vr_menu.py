# MGS web — FeniXVOID · Project Ravenlight
import os, sys, struct, json, glob, re
sys.path.insert(0, os.path.dirname(__file__))
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
import gcx
from pcx_mgs import decode, modo_semi
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
ST = os.path.join(EXTRAIDO, 'disco1', '01_stages', 'selectvr')
OUT = os.path.join(ASSETS, 'vr')
BASE = 2148292968
ITEMS, N_ITEMS, PAGINAS = (2148293716, 120, 2148312916)

def main():
    d = open(glob.glob(os.path.join(ST, 'sound', '*.bin'))[0], 'rb').read()
    items = []
    for k in range(N_ITEMS):
        o = ITEMS - BASE + k * 160
        x, y, w, h = struct.unpack_from('<4h', d, o)
        up, left, down, right, tex, delay, semi, page, morph, proc = struct.unpack_from('<10i', d, o + 8)
        bx, by, bw, bh = struct.unpack_from('<4h', d, o + 48)
        rec, alt, link = struct.unpack_from('<3i', d, o + 56)
        items.append({'i': k, 'x': x, 'y': y, 'w': w, 'h': h, 'vec': [up, left, down, right], 'tex': '%04x' % (tex & 65535) if tex else None, 'delay': delay, 'semi': semi, 'page': page, 'morph': morph, 'proc': proc, 'barra': [bx, by, bw, bh], 'rec': rec, 'alt': '%04x' % (alt & 65535) if alt else None, 'link': link})
    paginas = []
    for p in range(4):
        cnt, first, cur, parent = struct.unpack_from('<4i', d, PAGINAS - BASE + p * 24)
        paginas.append({'n': cnt, 'primero': first, 'cursor': cur, 'padre': parent})
    od = os.path.join(OUT, 'menu', 'tex')
    os.makedirs(od, exist_ok=True)
    texs = {}
    for f in sorted(glob.glob(os.path.join(ST, 'nocache', '*.pcx'))):
        n = os.path.splitext(os.path.basename(f))[0]
        if not re.fullmatch('[0-9a-f]{4}', n):
            n = '%04x' % gcx.strcode(n)
        try:
            im = decode(f)
            im.save(os.path.join(od, n + '.png'))
            texs[n] = {'w': im.width, 'h': im.height, 'abr': modo_semi(f)}
        except Exception as e:
            print('  no se pudo', n, e)
    json.dump({'items': items, 'paginas': paginas, 'texturas': texs}, open(os.path.join(OUT, 'menu_items.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(len(items), 'items;', [p for p in paginas])
    print(len(texs), 'texturas')
    for it in items[:10]:
        print(it)
if __name__ == '__main__' and '--sala' not in sys.argv:
    main()
ROTULOS_SALA = ['9f93', '1866', '1eec', 'a90a', '93d8', 'b25c', '98b0', 'a6f9', '8d82', '7f9c', '6dc8', 'dd3d', '6462', 'a242', 'edaf', 'e43c']

def rotulos_sala():
    st0 = os.path.join(EXTRAIDO, 'disco1', '01_stages')

    def buscar(st, h):
        nc = os.path.join(st0, st, 'nocache')
        f = os.path.join(nc, h + '.pcx')
        if os.path.exists(f):
            return f
        for g in glob.glob(os.path.join(nc, '*.pcx')):
            n = os.path.splitext(os.path.basename(g))[0]
            if not re.fullmatch('[0-9a-f]{4}', n) and '%04x' % gcx.strcode(n) == h:
                return g
        return None
    od = os.path.join(OUT, 'comun', 'tex')
    os.makedirs(od, exist_ok=True)
    info = {}
    for h in ROTULOS_SALA:
        f = buscar('vr01', h)
        if not f:
            print('  falta', h)
            continue
        im = decode(f)
        im.save(os.path.join(od, h + '.png'))
        info[h] = {'w': im.width, 'h': im.height, 'abr': modo_semi(f)}
    for i in range(1, 11):
        st = 'vr%02d' % i
        f = buscar(st, '7e37')
        if f:
            d = os.path.join(OUT, st, 'tex')
            os.makedirs(d, exist_ok=True)
            decode(f).save(os.path.join(d, '7e37.png'))
    json.dump(info, open(os.path.join(od, 'rotulos.json'), 'w', encoding='utf-8'), indent=1)
    print('rótulos de sala:', sorted(info))
    b = open(glob.glob(os.path.join(st0, 'vr01', 'sound', '*.bin'))[0], 'rb').read()
    o = 2148295420 - BASE
    n = struct.unpack_from('<h', b, o)[0]
    lineas = list(struct.unpack_from('<%dh' % (4 * n), b, o + 2))
    json.dump({'n': n, 'lineas': lineas}, open(os.path.join(OUT, 'comun', 'vrover.json'), 'w', encoding='utf-8'), separators=(',', ':'))
    print('vrover:', n, 'líneas', lineas[:8])
if __name__ == '__main__':
    rotulos_sala()
