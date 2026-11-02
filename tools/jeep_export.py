# MGS web — FeniXVOID · Project Ravenlight
import os, sys, glob, subprocess
sys.path.insert(0, os.path.dirname(__file__))
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
from export_glb import exportar as exportar_glb, strcode
from anims import exportar as exportar_anim
from pcx_mgs import decode
import preshade
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
ST = os.path.join(EXTRAIDO, 'disco1', '01_stages')
OUT = os.path.join(ASSETS, 'jefes', 'jeep')
VIAS = ['cb82', '1b3f', '1b40', '1f3f', '1f40', '1f41', '233f', '2340', '2341', '273f', '2740', '2741']
LUZ_D, LUZ_C, LUZ_A = ((0, -100, -50), (40, 30, 20), (70, 40, 30))
MODELOS = [('s19b/cache/26c7.kmd', 'jeep_b', True), ('s19b/cache/26d9.kmd', 'jeep_t', True), ('s19b/cache/3a07.kmd', 'jeep_fhl', False), ('s19b/cache/da10.kmd', 'jeep_hl', False), ('s19b/cache/jeep_gun.kmd', 'jeep_gun', False), ('init/resident/snake.kmd', 'snake', True), ('s19b/cache/meryl.kmd', 'meryl', True), ('s19b/cache/otacom.kmd', 'otacom', True), ('s19b/cache/liquid.kmd', 'liquid', True), ('s19b/cache/ippanhei.kmd', 'ippanhei', True), ('s19b/cache/low_109p.kmd', 'low_109p', True), ('s19b/cache/19b_o1.kmd', '19b_o1', False), ('s19b/cache/19b_o2.kmd', '19b_o2', False), ('s19b/cache/19b_o3a.kmd', '19b_o3a', False), ('s19b/cache/19b_o3b.kmd', '19b_o3b', False), ('s19b/cache/19b_o3c.kmd', '19b_o3c', False), ('s19b/cache/19b_o4a.kmd', '19b_o4a', False), ('s19b/cache/19b_o4b.kmd', '19b_o4b', False)]
ANIMS = [('s19b/cache/sne_19b.oar', 'sne_19b'), ('s19b/cache/mel_19b.oar', 'mel_19b'), ('s19b/cache/lqd_19b.oar', 'lqd_19b'), ('s19b/cache/enemy.oar', 'enemy_19b')]
TEXTURAS = ['bullet', 'jeep_bonbori_add', 'head_light', 'm60_flash', 'fire2', 'smoke', 'spark_fl', 'm19_c2_glass1hlf', 'blood_1', 'cd_warn', 'cd_keikoku']
VOCES = [80611, 80670, 80681, 80622, 80631, 80641, 80650, 80662]

def buscar_pcx(nombre):
    h = '%04x' % strcode(nombre)
    for st in ('s19b', 'init'):
        for sub in ('nocache', 'cache', 'resident'):
            for n in (nombre, h):
                f = os.path.join(ST, st, sub, n + '.pcx')
                if os.path.exists(f):
                    return f
    return None

def luz_via(mapa):
    lit = os.path.join(ST, 's19b', 'cache', mapa + '.lit')
    if not os.path.exists(lit):
        lit = os.path.join(ST, 's19b', 'cache', 'cb82.lit')
    luces = preshade.leer_lit(lit) if os.path.exists(lit) else []
    dx, dy, dz = LUZ_D
    L = (dx * dx + dy * dy + dz * dz) ** 0.5
    return {'luces': luces, 'amb': LUZ_A, 'main': ((dx / L, dy / L, dz / L), LUZ_C), 'pos': (0, 0, 0), 'rot': 0.0}

def main():
    os.makedirs(OUT, exist_ok=True)
    for m in VIAS:
        src = os.path.join(ST, 's19b', 'cache', m + '.kmd')
        if not os.path.exists(src):
            print('falta', src)
            continue
        dst = os.path.join(OUT, 'via_%s.glb' % m)
        exportar_glb(src, dst, estatico=True, luz=luz_via(m))
        print('tramo', m, os.path.getsize(dst), 'bytes')
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
    for n in TEXTURAS:
        f = buscar_pcx(n)
        if f:
            decode(f).save(os.path.join(OUT, n + '.png'))
            print('textura', n, os.path.basename(f))
        else:
            print('falta la textura', n)
    if '--voces' in sys.argv:
        subprocess.run([sys.executable, os.path.join(RAIZ, 'tools', 'codec_voces.py'), '--solo', ','.join(map(str, VOCES))], cwd=RAIZ)
if __name__ == '__main__':
    main()
