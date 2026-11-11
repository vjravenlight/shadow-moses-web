# MGS web — FeniXVOID · Project Ravenlight
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
from export_glb import exportar as exportar_glb, strcode
from anims import exportar as exportar_anim
from pcx_mgs import decode
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
ST = os.path.join(EXTRAIDO, 'disco1', '01_stages')
OUT = os.path.join(ASSETS, 'jefes', 'rex')
MODELOS = [('mgrexw.kmd', 'mgrexw', True), ('mgrexll.kmd', 'mgrexll', True), ('mgrexrl.kmd', 'mgrexrl', True), ('pit_t.kmd', 'pit_t', False), ('pit_u.kmd', 'pit_u', False), ('pit_liq.kmd', 'pit_liq', True), ('radar_f1.kmd', 'radar_f1', False), ('radar_f2.kmd', 'radar_f2', False), ('radar_f3.kmd', 'radar_f3', False), ('l_hatch1.kmd', 'l_hatch1', False), ('l_hatch2.kmd', 'l_hatch2', False), ('l_hatch3.kmd', 'l_hatch3', False), ('l_hatch4.kmd', 'l_hatch4', False), ('r_hatch1.kmd', 'r_hatch1', False), ('r_hatch2.kmd', 'r_hatch2', False), ('r_hatch3.kmd', 'r_hatch3', False), ('r_hatch4.kmd', 'r_hatch4', False), ('%04x.kmd' % strcode('rex_mis'), 'rex_mis', False), ('%04x.kmd' % strcode('rex_mhat'), 'rex_mhat', False)]
ANIMS = [('mgrexw.oar', 'mgrexw'), ('mgrexll.oar', 'mgrexll'), ('mgrexrl.oar', 'mgrexrl'), ('c2c9.oar', 'rex_c2c9')]
TEXTURAS = [('s17a/nocache/bfe8.pcx', 'laser_rayo'), ('s17a/nocache/bfe9.pcx', 'laser_brillo'), ('s17a/nocache/hind_wind01.pcx', 'anillo_polvo'), ('init/nocache/smoke.pcx', 'humo'), ('s17a/nocache/6a8c.pcx', 'blue_bonbori')]

def main():
    os.makedirs(OUT, exist_ok=True)
    for arch, nombre, esq in MODELOS:
        src = os.path.join(ST, 's17a', 'cache', arch)
        if not os.path.exists(src):
            print('falta', src)
            continue
        dst = os.path.join(OUT, nombre + '.glb')
        exportar_glb(src, dst, estatico=not esq)
        print('modelo', nombre, os.path.getsize(dst), 'bytes')
    for arch, nombre in ANIMS:
        src = os.path.join(ST, 's17a', 'cache', arch)
        if os.path.exists(src):
            exportar_anim(src, nombre)
        else:
            print('falta', src)
    for arch, nombre in TEXTURAS:
        src = os.path.join(ST, *arch.split('/'))
        if os.path.exists(src):
            decode(src).save(os.path.join(OUT, nombre + '.png'))
            print('textura', nombre)
        else:
            print('falta', src)
if __name__ == '__main__':
    main()
