# MGS web — FeniXVOID · Project Ravenlight
import sys, os, glob, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS
from kmd2obj import load
from caras_ps1 import glb_json

def buscar(disco, st, base):
    for p in glob.glob(os.path.join(EXTRAIDO, disco, '01_stages', st, '*', base + '.kmd')):
        return p
    for p in glob.glob(os.path.join(EXTRAIDO, disco, '01_stages', '*', '*', base + '.kmd')):
        return p
    return None

def carpeta(dir_glb, disco, st):
    out, avisos = ({}, [])
    for g in sorted(glob.glob(os.path.join(dir_glb, '*.glb'))):
        nombre = os.path.basename(g)[:-4]
        base = nombre.split('_')[0]
        try:
            j = glb_json(g)
        except Exception as e:
            avisos.append(f'{nombre}: {e}')
            continue
        if j.get('skins') or len(j.get('meshes', [])) != 1:
            continue
        kmd = buscar(disco, st, base)
        if not kmd:
            continue
        try:
            mdls = load(kmd)
        except Exception as e:
            avisos.append(f'{nombre}: {e}')
            continue
        grupos = {}
        for m in mdls:
            for f in range(len(m['vi']) // 4):
                k = (m['tex'][f] if m['tex'] else 0, bool(m['flag'] & 2))
                grupos.setdefault(k, False)
                if m['flag'] & 1024:
                    grupos[k] = True
        n = len(j['meshes'][0]['primitives'])
        if n != len(grupos):
            avisos.append(f'{nombre}: {n} primitivas y {len(grupos)} grupos')
            continue
        out[nombre] = {'primitivas': n, 'dobles': [i for i, b in enumerate(grupos.values()) if b]}
    if out or glob.glob(os.path.join(dir_glb, '*.glb')):
        with open(os.path.join(dir_glb, 'caras.json'), 'w', encoding='utf-8') as f:
            json.dump(out, f, separators=(',', ':'))
    return (out, avisos)
if __name__ == '__main__':
    salas = 0
    modelos = 0
    dobles = 0
    todos = []
    pedidos = [a for a in sys.argv[1:] if not a.startswith('-')]
    for disco, raiz in (('disco1', os.path.join(ASSETS, 'vr')), ('vr_usa', os.path.join(ASSETS, 'vr', 'disco'))):
        if pedidos and disco not in pedidos:
            continue
        if not os.path.isdir(raiz):
            continue
        for st in sorted(os.listdir(raiz)):
            d = os.path.join(raiz, st)
            if not os.path.isdir(d) or st in ('comun', 'disco', 'menu', 'vox', 'codec', 'demos', 'movie', 'titulo', 'idiomas', 'sonido', 'foto'):
                continue
            out, avisos = carpeta(d, disco, st)
            if out:
                salas += 1
                modelos += len(out)
                dobles += sum((1 for v in out.values() if v['dobles']))
            todos += [f'{st}/{a}' for a in avisos]
    print(f'vr_caras: {salas} salas, {modelos} modelos ({dobles} con caras de doble lado)')
    if todos:
        print('avisos:', '; '.join(todos[:20]) + (f' (+{len(todos) - 20})' if len(todos) > 20 else ''))
