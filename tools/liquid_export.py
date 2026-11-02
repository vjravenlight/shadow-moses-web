# MGS web — FeniXVOID · Project Ravenlight
import os, sys, subprocess
sys.path.insert(0, os.path.dirname(__file__))
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
from export_glb import exportar as exportar_glb
from anims import exportar as exportar_anim
from pcx_mgs import decode
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
ST = os.path.join(EXTRAIDO, 'disco1', '01_stages')
OUT = os.path.join(ASSETS, 'jefes')
MODELOS = [('s18a/cache/liquid.kmd', 'liquid', True), ('s18a/cache/0d97.kmd', 'b_switch', False), ('s18a/cache/sne_nude.kmd', 'sne_nude', True)]
ANIMS = [('s18a/cache/33ed.oar', 'lqd_18a'), ('s18a/cache/edfe.oar', 'sne_18a'), ('s18a/cache/sne_18vs.oar', 'sne_18vs')]
TEXTURAS = [('s18a/nocache/cd_warn.pcx', 'cd_warn'), ('s18a/nocache/cd_keikoku.pcx', 'cd_keikoku')]
VOCES = [38291, 38297, 38311, 38324, 38335]

def main():
    os.makedirs(OUT, exist_ok=True)
    for rel, nombre, esq in MODELOS:
        src = os.path.join(ST, *rel.split('/'))
        if not os.path.exists(src):
            print('falta', src)
            continue
        dst = os.path.join(OUT, nombre + '.glb')
        exportar_glb(src, dst, estatico=not esq)
        print('modelo', nombre, os.path.getsize(dst), 'bytes')
    for rel, nombre in ANIMS:
        src = os.path.join(ST, *rel.split('/'))
        if os.path.exists(src):
            exportar_anim(src, nombre)
        else:
            print('falta', src)
    for rel, nombre in TEXTURAS:
        src = os.path.join(ST, *rel.split('/'))
        if os.path.exists(src):
            decode(src).save(os.path.join(OUT, nombre + '.png'))
            print('textura', nombre)
        else:
            print('falta', src)
    if '--sin-voces' not in sys.argv:
        subprocess.run([sys.executable, os.path.join(RAIZ, 'tools', 'codec_voces.py'), '--solo', ','.join(map(str, VOCES))], cwd=RAIZ, check=False)
if __name__ == '__main__':
    main()
