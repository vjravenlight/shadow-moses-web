# MGS web — FeniXVOID · Project Ravenlight
import os, sys, json, glob
sys.path.insert(0, os.path.dirname(__file__))
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
from export_glb import exportar as exportar_glb
from pcx_mgs import decode, modo_semi
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
ST = os.path.join(EXTRAIDO, 'disco1', '01_stages')
OUT = os.path.join(ASSETS, 'actores')
MODELOS = [('s08b', 'isu', 'isu'), ('s08b', 'nanao', 'nanao'), ('s08b', 'nanao_d', 'nanao_d'), ('s08a', '08a_o1', 'piso_08a'), ('s02a', 'mouse', 'raton'), ('s13a', 'cr_main', 'grua'), ('s13a', 'cr_arm', 'grua_brazo'), ('s14e', 'crow', 'cuervo', True)] + [('s15c', k, k) for k in ('con_uf0', 'con_ub0', 'con_tf', 'con_tb', 'con_ten')] + [] + [('s15c', k, k) for k in ('con_uf1', 'con_uf2', 'con_uf3', 'con_ub1', 'con_ub2', 'con_ub3', 'br5', 'br6', 'br7', 'br8', 'con_all', 'pan1', 'pan2', 'box_01')] + [('s19a', 'faee', 'tambor'), ('s19a', 'faef', 'tambor_roto'), ('s19a', 'face', 'porton_19a'), ('s19a', 'facf', 'porton_19a_roto'), ('s19a', '26c7', 'jeep_19a'), ('s19a', '26d9', 'jeep_19a_b')]
HZM = [('s17a', 'cb42'), ('s11h', '2f3b'), ('s11h', '2f3c'), ('s11h', '2f3d')]
ANIMS = [('s14e', 'crow')]
TEXTURAS = [('s08b', 'glass', 'glass'), ('s08b', 'paper', 'paper'), ('s00a', 'sfex0236', 'sfex0236'), ('s01a', 'aef2', 'aef2'), ('s09a', 'aef4', 'aef4'), ('s08c', 'ketchap_grey', 'ketchap_grey'), ('init', 'smoke', 'smoke'), ('s08a', 'plasma', 'plasma'), ('s00a', 'awa_s', 'awa_s'), ('s00a', 'awa_2', 'awa_2'), ('s00a', 'awa_3', 'awa_3'), ('init', 'hosi', 'hosi'), ('s03a', 'uji', 'uji'), ('init', 'shadow', 'shadow'), ('s01a', 'asiato', 'asiato'), ('s13a', 'door2', 'door2')]

def buscar(st, nombre, ext, sub):
    p = os.path.join(ST, st, sub, nombre + ext)
    if os.path.exists(p):
        return p
    fs = sorted(glob.glob(os.path.join(EXTRAIDO, 'disco*', '01_stages', '*', sub, nombre + ext)))
    return fs[0] if fs else None

def main():
    os.makedirs(OUT, exist_ok=True)
    for st, kmd, nombre, *esq in MODELOS:
        src = buscar(st, kmd, '.kmd', 'cache')
        if not src:
            print('falta', st, kmd)
            continue
        r = exportar_glb(src, os.path.join(OUT, nombre + '.glb'), estatico=not (esq and esq[0]))
        print('modelo', nombre, r)
    from anims import exportar as exportar_anim
    for st, oar in ANIMS:
        src = buscar(st, oar, '.oar', 'cache')
        if src:
            exportar_anim(src, oar)
            print('animación', oar)
        else:
            print('falta', st, oar)
    info = {}
    for st, pcx, nombre in TEXTURAS:
        src = buscar(st, pcx, '.pcx', 'nocache')
        if not src:
            print('falta', st, pcx)
            continue
        im = decode(src)
        im.save(os.path.join(OUT, nombre + '.png'))
        info[nombre] = {'semi': modo_semi(src), 'w': im.width, 'h': im.height}
        print('textura', nombre, info[nombre])
    json.dump(info, open(os.path.join(OUT, 'texturas.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    lamparas()
    from hzm import leer as leer_hzm
    os.makedirs(os.path.join(OUT, 'hzm'), exist_ok=True)
    for st, h in HZM:
        src = buscar(st, h, '.hzm', 'cache')
        if not src:
            print('falta', st, h)
            continue
        z = leer_hzm(src)
        out = {'paredes': [w for g in z['grupos'] for w in g['paredes']], 'pisos': [f for g in z['grupos'] for f in g['pisos']]}
        json.dump(out, open(os.path.join(OUT, 'hzm', h + '.json'), 'w', encoding='utf-8'), separators=(',', ':'))
        print('hzm', h, len(out['paredes']), 'paredes', len(out['pisos']), 'pisos')

def lamparas():
    import export_glb
    sal = os.path.join(OUT, 'tex')
    os.makedirs(sal, exist_ok=True)
    ids = {}
    for f in glob.glob(os.path.join(ASSETS, 'niveles', '*', 'nivel.json')):
        st = os.path.basename(os.path.dirname(f))
        for a in json.load(open(f, encoding='utf-8')).get('actores', []):
            if a.get('tipo') == 'ELEVPANEL':
                for k in ('p', 'b'):
                    for c in (a.get('opts') or {}).get(k) or []:
                        if isinstance(c, dict) and isinstance(c.get('id'), int) and c['id']:
                            ids.setdefault(c['id'], set()).add(st)
                continue
            if a.get('tipo') != 'TEXTURE':
                continue
            for k, v in (a.get('opts') or {}).items():
                if not isinstance(v, list):
                    continue
                if k == 'I':
                    cand = v[:1]
                elif len(k) == 1 and k.islower():
                    cand = [v[i + 1] for i in range(len(v) - 1) if isinstance(v[i], dict) and v[i].get('id') == 56601]
                else:
                    continue
                for c in cand:
                    h = c.get('id') if isinstance(c, dict) else c
                    if isinstance(h, int) and h:
                        ids.setdefault(h, set()).add(st)
    indice, faltan = ({}, [])
    for h, sts in sorted(ids.items()):
        src = None
        for st in sorted(sts):
            for disco in ('disco1', 'disco2'):
                d = os.path.join(EXTRAIDO, disco, '01_stages', st)
                if os.path.isdir(d):
                    local, glob_idx = export_glb.indice_texturas(d)
                    src = local.get(h) or src
                    if src:
                        break
            if src:
                break
        if not src:
            src = export_glb.indice_texturas(None)[1].get(h)
        if not src:
            faltan.append(f'{h:04x}')
            continue
        im = decode(src)
        im.save(os.path.join(sal, f'{h:04x}.png'))
        a = list(decode(src, semi=128).getchannel('A').getdata())
        vis = sum((1 for x in a if x))
        stp = round(sum((1 for x in a if x == 128)) / vis, 3) if vis else 0
        indice[f'{h:04x}'] = {'w': im.width, 'h': im.height, 'semi': modo_semi(src), 'stp': stp, 'pcx': os.path.basename(src)}
    json.dump(indice, open(os.path.join(sal, 'indice.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print('lámparas (TEXTURE):', len(indice), 'texturas', '· faltan:', ' '.join(faltan) or 'ninguna')
if __name__ == '__main__':
    main()
