# MGS web — FeniXVOID · Project Ravenlight
import json, hashlib, os, shutil, collections, re
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
from concurrent.futures import ThreadPoolExecutor

def _abs(fn):
    return fn if os.path.isabs(fn) else os.path.join(os.path.dirname(EXTRAIDO), fn)
import sys
_DK = [sys.argv[sys.argv.index('--solo') + 1]] if '--solo' in sys.argv else [dk for dk in ('disco1', 'disco2') if os.path.exists(os.path.join(EXTRAIDO, dk, '01_stages', '_inventario.json'))]
inv = [(st, rg, fn, sz, dk) for dk in _DK for st, rg, fn, sz in json.load(open(os.path.join(EXTRAIDO, dk, '01_stages', '_inventario.json')))]
CAT = {'kmd': '01_modelos_3d', 'zmd': '01_modelos_3d', 'oar': '02_animaciones', 'hzm': '03_mapas_colision', 'lit': '04_luces', 'pcx': '05_texturas', 'gcx': '06_scripts', 'bin': '07_codigo_overlay', 'wvx': '08_audio/samples', 'mdx': '08_audio/musica', 'efx': '08_audio/efectos', 'sgt': '09_otros/sgt', 'img': '09_otros/img', 'rar': '09_otros/rar', 'crv': '09_otros/crv', 'nar': '09_otros/nar'}
OUT = os.path.join(EXTRAIDO, sys.argv[sys.argv.index('--salida') + 1] if '--salida' in sys.argv else '02_por_tipo').replace(os.sep, '/')
seen = {}
donde = collections.defaultdict(list)
discos = collections.defaultdict(set)

def _leer(fn):
    b = open(fn, 'rb').read()
    return (b, hashlib.md5(b).hexdigest())
with ThreadPoolExecutor(4) as ex:
    for k in range(0, len(inv), 1024):
        tanda = inv[k:k + 1024]
        for (stage, reg, fn, sz, dk), (b, h) in zip(tanda, ex.map(_leer, [_abs(x[2]) for x in tanda])):
            fn = _abs(fn)
            base = os.path.basename(fn)
            ext = base.rsplit('.', 1)[1]
            donde[h].append(stage)
            discos[h].add(dk)
            if h in seen:
                continue
            cat = CAT.get(ext, '09_otros/' + ext)
            name = base if not re.fullmatch('[0-9a-f]{4}\\.\\w+', base) else f'{stage}_{base}'
            dst = f'{OUT}/{cat}/{name}'
            if os.path.exists(dst):
                dst = f'{OUT}/{cat}/{stage}_{base}'
            if os.path.exists(dst):
                dst = dst.replace('.' + ext, f'_{dk}.' + ext)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            with open(dst, 'wb') as o:
                o.write(b)
            seen[h] = (dst, sz)
rows = [{'archivo': v[0].replace(OUT + '/', ''), 'bytes': v[1], 'escenarios': sorted(set(donde[h])), 'discos': sorted(discos[h])} for h, v in seen.items()]
json.dump(rows, open(f'{OUT}/_indice.json', 'w'), indent=1)
c = collections.Counter((r['archivo'].split('/')[0] for r in rows))
for k in sorted(c):
    print(k, c[k])
print('unicos', len(rows), 'de', len(inv))
