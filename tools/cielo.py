# MGS web — FeniXVOID · Project Ravenlight
import os, sys, struct, glob
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from pcx_mgs import decode

def armar(stage_dir, h, salida, init_dir=None):
    f = None
    for d in (stage_dir, init_dir):
        if d:
            c = glob.glob(os.path.join(d, '*', f'{h:04x}.img'))
            if c:
                f = c[0]
                break
    if not f:
        return None
    d = open(f, 'rb').read()
    w, alto, tw, th, pt, pa, pm = struct.unpack_from('<4H3I', d, 0)
    n = struct.unpack_from('<H', d, pt)[0]
    texs = struct.unpack_from(f'<{n}H', d, pt + 2)
    attribs = [d[pa + 4 * i:pa + 4 * i + 4] for i in range((pm - pa) // 4)]
    tx, ty = (w // tw, alto // th)
    grilla = d[pm:pm + tx * ty]
    imgs = []
    for t in texs:
        c = glob.glob(os.path.join(stage_dir, '*', f'{t:04x}.pcx')) or (glob.glob(os.path.join(init_dir, '*', f'{t:04x}.pcx')) if init_dir else [])
        imgs.append(decode(c[0]).convert('RGBA') if c else None)
    out = Image.new('RGBA', (w, alto), (0, 0, 0, 0))
    for j in range(ty):
        for i in range(tx):
            a = attribs[grilla[j * tx + i]]
            im = imgs[a[0]] if a[0] < len(imgs) else None
            if im is None:
                continue
            pieza = im.crop((a[1], a[2], a[1] + tw, a[2] + th))
            out.paste(pieza, (i * tw, j * th))
    out.save(salida, optimize=True)
    return {'ancho': w, 'alto': alto}
if __name__ == '__main__':
    st, h, sal = (sys.argv[1], int(sys.argv[2], 16), sys.argv[3])
    raiz = os.path.join(EXTRAIDO, 'disco1', '01_stages')
    print(armar(os.path.join(raiz, st), h, sal, os.path.join(raiz, 'init')))
