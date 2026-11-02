# MGS web — FeniXVOID · Project Ravenlight
import os, sys, subprocess
sys.path.insert(0, os.path.dirname(__file__))
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
from export_glb import exportar as exportar_glb
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
ST = os.path.join(EXTRAIDO, 'disco1', '01_stages')
OUT = os.path.join(ASSETS, 'jefes')
MODELOS = [('s08b', 'nja_ball', 'nja_ball', False)]

def main():
    os.makedirs(OUT, exist_ok=True)
    if '--todo' in sys.argv:
        subprocess.run([sys.executable, os.path.join(RAIZ, 'tools', 'jefes_export.py'), '--jefe', 'ninja'], cwd=RAIZ, check=False)
    for st, kmd, nombre, esq in MODELOS:
        src = os.path.join(ST, st, 'cache', kmd + '.kmd')
        if not os.path.exists(src):
            print('falta', src)
            continue
        dst = os.path.join(OUT, nombre + '.glb')
        exportar_glb(src, dst, estatico=not esq)
        print('modelo', nombre, os.path.getsize(dst), 'bytes')
if __name__ == '__main__':
    main()
