# MGS web — FeniXVOID · Project Ravenlight
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
from export_glb import exportar as exportar_glb
from anims import exportar as exportar_anim
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
ST = os.path.join(EXTRAIDO, 'disco1', '01_stages')
OUT = os.path.join(ASSETS, 'jefes', 'jeep')

def main():
    os.makedirs(OUT, exist_ok=True)
    src = os.path.join(ST, 's19a', 'cache', '7607.kmd')
    dst = os.path.join(OUT, 'jeep_7607.glb')
    exportar_glb(src, dst, estatico=True)
    print('modelo jeep_7607', os.path.getsize(dst), 'bytes')
    exportar_anim(os.path.join(ST, 's19a', 'cache', '5c8d.oar'), 'mel_19a')
if __name__ == '__main__':
    main()
