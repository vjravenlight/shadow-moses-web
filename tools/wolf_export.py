# MGS web — FeniXVOID · Project Ravenlight
import os, sys, hashlib
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
MODELOS = [('s10a/cache/sniper.kmd', 'wolf', True), ('s12a/cache/snp_cold.kmd', 'wolf_frio', True), ('s12a/cache/snp_ded0.kmd', 'wolf_herida', True), ('s10a/cache/7af3.kmd', 'meryl_herida', True)]
ANIMS = [('s10a/cache/sniper.oar', 'sniper'), ('s10a/cache/5d79.oar', 'mel10ad')]
TEXTURAS = [('init/nocache/lsight.pcx', 'lsight'), ('init/nocache/kirari.pcx', 'kirari')]

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
    a = os.path.join(ST, 's10a', 'cache', 'sniper.oar')
    b = os.path.join(ST, 's12a', 'cache', 'sniper.oar')
    if os.path.exists(a) and os.path.exists(b) and (hashlib.md5(open(a, 'rb').read()).digest() != hashlib.md5(open(b, 'rb').read()).digest()):
        print('ojo: sniper.oar de s10a y s12a son distintos (se exporta el de s10a)')
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
if __name__ == '__main__':
    main()
