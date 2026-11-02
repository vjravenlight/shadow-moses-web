# MGS web — FeniXVOID · Project Ravenlight
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS
from pcx_mgs import decode
from export_glb import exportar
LISTA = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sueltos.json')

def main():
    hechos, faltan = (0, [])
    for destino, origen, tipo, opcion in json.load(open(LISTA, encoding='utf-8')):
        o = os.path.join(EXTRAIDO, *origen.split('/'))
        d = os.path.join(ASSETS, *destino.split('/'))
        if not os.path.exists(o):
            faltan.append(origen)
            continue
        os.makedirs(os.path.dirname(d), exist_ok=True)
        if tipo == 'glb':
            exportar(o, d, estatico=bool(opcion))
        else:
            (decode(o, opcion) if opcion is not None else decode(o)).save(d)
        hechos += 1
    print(hechos, 'archivos sueltos')
    if faltan:
        print('no están en el disco:', ', '.join(faltan))
        return 1
    return 0
if __name__ == '__main__':
    sys.exit(main())
