# MGS web — FeniXVOID · Project Ravenlight
import glob, json, math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
from export_glb import exportar
ST = os.path.join(EXTRAIDO, 'disco1', '01_stages')
OUT = os.path.join(ASSETS, 'niveles')

def main():
    hechos = []
    for f in sorted(glob.glob(os.path.join(OUT, '*', 'nivel.json'))):
        st = os.path.basename(os.path.dirname(f))
        nv = json.load(open(f, encoding='utf-8'))
        luz = nv.get('luz') or None
        for a in nv['actores']:
            if a['tipo'] not in ('DMYWALL', 'DMYFLOOR', 'PANEL2'):
                continue
            m = a.get('opts', {}).get('m') or []
            if len(m) < 2 or not isinstance(m[1], dict):
                continue
            h = m[1]['id']
            kmd = os.path.join(ST, st, 'cache', f'{h:04x}.kmd')
            dst = os.path.join(OUT, st, f'{h:04x}.glb')
            if not os.path.isfile(kmd) or os.path.isfile(dst):
                continue
            pz = a.get('p') or [0, 0, 0]
            rz = (a.get('d') or [0, 0, 0])[1] * math.pi * 2 / 4096
            L = dict(luces=[tuple(x) for x in luz['luces']], amb=tuple(luz['amb']), main=(tuple(luz['main'][0]), tuple(luz['main'][1])) if luz.get('main') else None, pos=tuple(pz), rot=rz) if luz else None
            exportar(kmd, dst, estatico=True, luz=L)
            hechos.append(f"{st} {a['tipo']} {h:04x}")
    print('\n'.join(hechos) or 'nada nuevo')
if __name__ == '__main__':
    main()
