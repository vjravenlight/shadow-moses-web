# MGS web — FeniXVOID · Project Ravenlight
import sys, os, json, glob, re
sys.path.insert(0, os.path.dirname(__file__))
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
from kmd2obj import load
from export_glb import exportar
RAIZ = os.path.join(os.path.dirname(__file__), '..')
ST = os.path.join(EXTRAIDO, 'disco1', '01_stages')
OUT = ASSETS
HEX = re.compile('[0-9a-f]{4}$')

def info(path):
    m = load(path)
    V = [v for x in m for v in x['world']]
    if not V:
        return None
    ext = [max((v[i] for v in V)) - min((v[i] for v in V)) for i in range(3)]
    hueso = any((x['parent'] >= 0 for x in m))
    return dict(piezas=len(m), caras=sum((len(x['vi']) // 4 for x in m)), alto=ext[1] / 1000, ancho=max(ext[0], ext[2]) / 1000, esqueleto=hueso)

def categoria(nombre, i):
    if i['esqueleto'] and i['piezas'] >= 10 and (1.0 <= i['alto'] <= 2.6):
        return 'personaje'
    if i['ancho'] > 4 or i['alto'] > 4:
        return 'grande'
    return 'objeto'

def main():
    os.makedirs(f'{OUT}/modelos', exist_ok=True)
    idx = json.load(open(os.path.join(EXTRAIDO, '02_por_tipo', '_indice.json')))
    catalogo = []
    for r in idx:
        if not r['archivo'].endswith('.kmd'):
            continue
        nombre = os.path.basename(r['archivo'])[:-4]
        base = nombre
        for st in r['escenarios']:
            if nombre.startswith(st + '_'):
                base = nombre[len(st) + 1:]
                break
        src = None
        for st in r['escenarios']:
            c = glob.glob(os.path.join(ST, st, '*', base + '.kmd'))
            if c:
                src = c[0]
                break
        if not src:
            continue
        try:
            i = info(src)
            if not i:
                continue
            res = exportar(src, f'{OUT}/modelos/{nombre}.glb', estatico=not i['esqueleto'])
        except Exception as e:
            print('ERROR', nombre, e)
            continue
        catalogo.append(dict(nombre=nombre, archivo=f'modelos/{nombre}.glb', con_nombre=not HEX.search(nombre), categoria=categoria(nombre, i), escenarios=r['escenarios'][:8], texturas=res['texturas'], **i))
    json.dump(catalogo, open(f'{OUT}/catalogo.json', 'w'), indent=0)
    print('modelos', len(catalogo))
    escenarios = []
    for sd in sorted(glob.glob(os.path.join(ST, '*'))):
        st = os.path.basename(sd)
        partes = []
        for f in glob.glob(os.path.join(sd, '*', '*.kmd')):
            try:
                i = info(f)
            except Exception:
                continue
            if not i or (i['esqueleto'] and i['piezas'] < 30):
                continue
            if max(i['ancho'], i['alto']) < 3:
                continue
            n = os.path.basename(f)[:-4]
            os.makedirs(f'{OUT}/escenarios/{st}', exist_ok=True)
            try:
                exportar(f, f'{OUT}/escenarios/{st}/{n}.glb', estatico=True)
            except Exception as e:
                print('ERROR', st, n, e)
                continue
            partes.append(dict(nombre=n, archivo=f'escenarios/{st}/{n}.glb', **i))
        if partes:
            partes.sort(key=lambda p: -p['caras'])
            escenarios.append(dict(id=st, partes=partes, caras=sum((p['caras'] for p in partes))))
    json.dump(escenarios, open(f'{OUT}/escenarios.json', 'w'), indent=0)
    print('escenarios', len(escenarios))
if __name__ == '__main__':
    main()
