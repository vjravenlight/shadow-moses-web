# MGS web — FeniXVOID · Project Ravenlight
import os, sys, json, glob, hashlib, struct
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS
INT = [os.path.join(EXTRAIDO, 'integral%d' % n, '01_stages') for n in (1, 2)]
OUT = os.path.join(ASSETS, 'integral')
ESCENARIOS_R = ['s03ar', 's03dr', 's03er', 's07br', 's07cr', 's09ar', 's10ar', 's18ar', 's19ar', 's19br', 's20ar', 'd18ar', 'endingr']

def md5(p):
    return hashlib.md5(open(p, 'rb').read()).hexdigest()
MODELOS_R = {'3b26d4ac1a273cff35dbcc7e893be5dc': ('meryl_traje', 'Meryl, traje de infiltración (Integral)'), 'feecaec4ac100aaa5455c6bff199ac03': ('meryl_traje_panuelo', 'Meryl, traje de infiltración con pañuelo (Integral)'), 'ec757c283516190eebb0044bdc4f5eaa': ('meryl_traje_tendida', 'Meryl tendida, traje de infiltración (Integral)'), 'c34275ec9d209fb8ebebed70e539bd3b': ('snake_esmoquin_s10a', 'Solid Snake de esmoquin (s10ar)')}

def en_usa(st, nombre):
    for n in (1, 2):
        p = os.path.join(EXTRAIDO, 'disco%d' % n, '01_stages', st, 'cache', nombre)
        if os.path.exists(p):
            return md5(p)
    return None

def buscar(st, sub, nombre):
    for base in INT:
        p = os.path.join(base, st, sub, nombre)
        if os.path.exists(p):
            return p
    return None

def icono_menu(rar, i, pal):
    import numpy as np
    from PIL import Image
    d = open(rar, 'rb').read()
    n = d[0] + d[1]
    offs = struct.unpack_from(f'<{n}I', d, 4)
    base = 4 + 4 * n
    items = [(d[base + o], d[base + o + 1], d[base + o + 2], d[base + o + 3], base + o + 4) for o in offs]
    cols = struct.unpack_from('<16H', d, items[pal][4])
    paleta = []
    for c in cols:
        r, g, b = ((c & 31) << 3, (c >> 5 & 31) << 3, (c >> 10 & 31) << 3)
        paleta.append((r | r >> 5, g | g >> 5, b | b >> 5, 0 if c == 0 else 255))
    paleta = np.array(paleta, np.uint8)
    x, y, w, h, p = items[i]
    W = w * 4
    raw = np.frombuffer(d, np.uint8, count=W * h // 2, offset=p)
    idx = np.empty(W * h, np.uint8)
    idx[0::2] = raw & 15
    idx[1::2] = raw >> 4
    return (Image.fromarray(paleta[idx.reshape(h, W)]), x - 2, y - 2)

def main():
    if not any((os.path.isdir(b) for b in INT)):
        print('Sin los discos del Integral (extraido/integral1): no hay nada que agregar.')
        return 0
    from export_glb import exportar
    os.makedirs(OUT, exist_ok=True)
    info = {'version': 1, 'origen': 'Metal Gear Solid: Integral (SLPM-86247/86248)'}
    catalogo = []

    def glb(src, nombre, estatico, titulo, categoria, escenarios):
        dst = os.path.join(OUT, nombre + '.glb')
        exportar(src, dst, estatico=estatico)
        from kmd2obj import load
        m = load(src)
        pts = [w for x in m for w in x['world']]
        alto = round((max((p[1] for p in pts)) - min((p[1] for p in pts))) / 1000, 3)
        ancho = round(max(max((p[0] for p in pts)) - min((p[0] for p in pts)), max((p[2] for p in pts)) - min((p[2] for p in pts))) / 1000, 3)
        catalogo.append({'nombre': 'integral_' + nombre, 'archivo': 'integral/%s.glb' % nombre, 'con_nombre': True, 'categoria': categoria, 'escenarios': escenarios, 'texturas': 0, 'piezas': len(m), 'caras': sum((len(x['vi']) // 4 for x in m)), 'esqueleto': not estatico, 'alto': alto, 'ancho': ancho, 'integral': True, 'titulo': titulo})
        print('modelo', nombre, os.path.getsize(dst), 'bytes')
    mp5 = buscar('init_ve', 'resident', 'mpfive.kmd')
    rar = buscar('init_ve', 'resident', 'item.rar')
    if mp5 and rar:
        glb(mp5, 'mp5', True, 'MP5 SD (VERY EASY)', 'objeto', ['init_ve'])
        im, ox, oy = icono_menu(rar, 3, 0)
        im.save(os.path.join(OUT, 'menu_mp5.png'))
        info['muy_facil'] = {'modelo': 'integral/mp5.glb', 'nombre': 'MP 5 SD', 'icono': {'png': 'integral/menu_mp5.png', 'w': im.width, 'h': im.height, 'ox': ox, 'oy': oy}, 'vars': {'$w:L0024': 999, '$w:L0038': 999}}
        print('muy fácil: MP5', im.size)
    cambios, modelos = ({}, {})
    for st in ESCENARIOS_R:
        base_r = next((os.path.join(b, st) for b in INT if os.path.isdir(os.path.join(b, st))), None)
        if not base_r:
            continue
        st0 = st[:-1]
        base0 = next((os.path.join(b, st0) for b in INT if os.path.isdir(os.path.join(b, st0))), None)
        if not base0:
            continue
        for p in sorted(glob.glob(os.path.join(base_r, 'cache', '*.kmd'))):
            n = os.path.basename(p)
            p0 = os.path.join(base0, 'cache', n)
            if not os.path.exists(p0) or md5(p0) == md5(p):
                continue
            h = md5(p)
            if h == en_usa(st, n):
                continue
            if h not in modelos:
                nombre, titulo = MODELOS_R.get(h, ('integral_r%d' % (len(modelos) + 1), 'Modelo de los escenarios "r" (Integral)'))
                modelos[h] = (p, nombre, titulo, [])
            modelos[h][3].append(st0)
            cambios.setdefault(st0, {})[n[:-4]] = 'integral/%s.glb' % modelos[h][1]
    for h, (p, nombre, titulo, sts) in modelos.items():
        glb(p, nombre, False, titulo, 'personaje', sorted(set(sts)))
    if cambios:
        info['traje_meryl'] = {'variable': '$f:G0435.0', 'escenarios': cambios}
        print('traje de Meryl:', len(modelos), 'modelos en', len(cambios), 'escenarios')
    json.dump(catalogo, open(os.path.join(OUT, 'catalogo.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    json.dump(info, open(os.path.join(OUT, 'integral.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('listo:', OUT)
    return 0
if __name__ == '__main__':
    sys.exit(main())
