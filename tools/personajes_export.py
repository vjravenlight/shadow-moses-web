# MGS web — FeniXVOID · Project Ravenlight
import os, sys, subprocess, hashlib
sys.path.insert(0, os.path.dirname(__file__))
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
from export_glb import exportar as exportar_glb
from anims import exportar as exportar_anim
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
ST = os.path.join(EXTRAIDO, 'disco1', '01_stages')
OUT = os.path.join(ASSETS, 'personajes')
MODELOS = [('s03d', 'mel_hei', 'meryl_hei', True), ('s03d', 'low_lit', 'meryl_hei_lod', True), ('s07c', 'meryl', 'meryl', True), ('s07c', 'desert', 'desert', False), ('s09a', 'meryl', 'meryl_09a', True), ('s07b', 'meryl', 'meryl_07b', True), ('s09a', 'wolfdog', 'wolfdog', True), ('s09a', 'dog_low', 'dog_low', True), ('s03b', 'sne_nude', 'sne_nude_03b', True), ('s03c', 'johnny', 'johnny', True)]
ANIMS = [('s03d', 'melhei03'), ('s07c', 'mel_07a'), ('s09a', 'mel_09a'), ('s07b', 'mel_07b'), ('s09a', 'wolfdog'), ('s12c', 'wolfdog2'), ('s03b', 'sne_03b'), ('s03b', 'rev03bd'), ('s03c', 'joh_03c'), ('s03c', 'ota_03c'), ('s03c', 'a11f')]
TEXTURAS = [('s09a', 'wolf_eye_l', 'wolf_eye'), ('s09a', 'heart', 'heart'), ('s03b', 'gou_bg', 'gou_bg'), ('s03b', 'goumon', 'goumon'), ('s03b', 'plasma', 'plasma'), ('s03c', 'ketchap', 'ketchap'), ('s03c', 'ketchap_grey', 'ketchap_grey')]
DOLLS = ['0f27', '0f47', '1eca', '2a3a', '2f4f', '2f50', '3469', '3d38', '4d39', '4d79', '54f9', '57cd', '773b', '9ac9', 'af5d', 'b65a', 'c118', 'c3b6', 'd669', 'e978']
DOLL_ARCHIVO = {'2a3a': 'rev03bd'}
TRAMPAS = [('s03c', 'c6c3')]
VOCES = [12039, 12065, 20488, 20532, 20548, 20560, 20648, 20673, 20698, 80245, 80260, 80273, 80286, 80301, 80327, 80337, 80349, 80362, 80402, 80433, 80691, 80693, 80695, 80697, 80699, 80701, 80703, 23007, 80705, 80723, 80738, 80753, 80772, 80799, 80811, 80824, 80839, 80882, 80915, 82623, 20770, 20737, 20760, 20828, 82651, 82680, 82699, 82726, 10815, 10827, 10844, 10858, 11198, 11242, 17734, 22980, 23032, 23095, 25291, 25359, 25385, 25145, 25412, 25546, 25669, 26527, 26529, 95657, 25829, 25924, 25955, 26263, 26278, 26291, 26317, 26340, 26367, 26386, 26403, 26422, 26442, 26458, 26479, 26493, 26511, 26531, 26565, 26687, 26949, 27371, 27397, 27204, 26062, 26065, 26111, 32613, 32663, 32721, 32754, 32813, 32848, 32938, 32954, 32964, 27341, 32872, 32952, 32984, 12106, 12113, 12121, 12123, 12135, 32879, 32907, 32933, 33000, 33017]

def md5(p):
    return hashlib.md5(open(p, 'rb').read()).hexdigest()

def main():
    os.makedirs(OUT, exist_ok=True)
    vistos = {}
    for st, kmd, nombre, esq in MODELOS:
        src = os.path.join(ST, st, 'cache', kmd + '.kmd')
        if not os.path.exists(src):
            print('falta', src)
            continue
        h = md5(src)
        if h in vistos:
            print('modelo', nombre, '= igual a', vistos[h])
            continue
        vistos[h] = nombre
        dst = os.path.join(OUT, nombre + '.glb')
        exportar_glb(src, dst, estatico=not esq)
        print('modelo', nombre, os.path.getsize(dst), 'bytes')
    for st, oar in ANIMS:
        src = os.path.join(ST, st, 'cache', oar + '.oar')
        if os.path.exists(src):
            exportar_anim(src, oar)
        else:
            print('falta', src)
    import glob
    for oar in DOLLS:
        fs = sorted(glob.glob(os.path.join(EXTRAIDO, 'disco*', '01_stages', '*', 'cache', DOLL_ARCHIVO.get(oar, oar) + '.oar')))
        if fs:
            exportar_anim(fs[0], 'doll_' + oar)
        else:
            print('falta', oar + '.oar')
    from pcx_mgs import decode
    for st, pcx, nombre in TEXTURAS:
        src = os.path.join(ST, st, 'nocache', pcx + '.pcx')
        if os.path.exists(src):
            decode(src).save(os.path.join(OUT, nombre + '.png'))
            print('textura', nombre)
        else:
            print('falta', src)
    from hzm import leer as leer_hzm
    import json

    def strcode(t):
        i = 0
        for c in t.encode():
            i = (i << 5 | i >> 11) + c & 65535
        return i
    for st, hz in TRAMPAS:
        src = os.path.join(ST, st, 'cache', hz + '.hzm')
        if not os.path.exists(src):
            print('falta', src)
            continue
        out = {}
        for g in leer_hzm(src)['grupos']:
            for t in g['triggers']:
                if t['tipo'] == 'trap':
                    out.setdefault(str(strcode(t['nombre'])), {'nombre': t['nombre'], 'cajas': []})['cajas'].append(t['caja'])
        json.dump(out, open(os.path.join(OUT, f'trampas_{st}.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        print('trampas', st, len(out), ', '.join((f"{v['nombre']}={int(k):04x}" for k, v in out.items())))
    if '--sin-voces' not in sys.argv:
        subprocess.run([sys.executable, os.path.join(RAIZ, 'tools', 'codec_voces.py'), '--solo', ','.join(map(str, VOCES))], cwd=RAIZ, check=False)
if __name__ == '__main__':
    main()
