# MGS web — FeniXVOID · Project Ravenlight
import os, glob, json, sys
sys.path.insert(0, os.path.dirname(__file__))
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
from hzm import leer
RAIZ = os.path.join(os.path.dirname(__file__), '..')
n = 0
for f in glob.glob(os.path.join(ASSETS, 'niveles', '*', '*.hzm.json')):
    st, nombre = (os.path.basename(os.path.dirname(f)), os.path.basename(f)[:-len('.json')])
    src = next(iter(glob.glob(os.path.join(EXTRAIDO, 'disco1', '01_stages', st, '*', nombre))), None)
    if not src:
        print('sin fuente', st, nombre)
        continue
    orig = leer(src)
    d = json.load(open(f, encoding='utf-8'))
    if len(orig['grupos']) != len(d['grupos']):
        print('grupos distintos', f)
        continue
    for go, gd in zip(orig['grupos'], d['grupos']):
        for po, pd in zip(go['pisos'], gd['pisos']):
            pd['atr'] = po['atr']
    json.dump(d, open(f, 'w', encoding='utf-8'), separators=(',', ':'))
    n += 1
print(n, 'archivos')
