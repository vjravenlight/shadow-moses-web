# MGS web — FeniXVOID · Project Ravenlight
import os, sys, re, json, glob, shutil
sys.path.insert(0, os.path.dirname(__file__))
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
import gcx
RAIZ = os.path.join(os.path.dirname(__file__), '..')
ST = os.path.join(EXTRAIDO, 'disco1', '01_stages')
SRC = os.path.join(RAIZ, 'ref', 'mgs_reversing', 'source', 'sound')
OUT = os.path.join(ASSETS, 'sonido')

def residente():
    if not os.path.isdir(SRC):
        import tablas_ref
        datos = tablas_ref.blobs()
        datos['se_dummy'] = [0, 0, 254, 255]
        return {n: {'pri': pri, 'kind': kind, 'character': ch, 'pistas': [datos.get(x, datos['se_dummy']) for x in nombres[:tracks]], 'nombres': nombres[:tracks]} for n, pri, tracks, kind, ch, nombres in tablas_ref.se_tbl()}
    blob = open(os.path.join(SRC, 'se_data', 'blob.h'), encoding='utf-8', errors='replace').read()
    datos = {m.group(1): [int(x, 16) for x in re.findall('0x([0-9A-Fa-f]{2})', m.group(2))] for m in re.finditer('unsigned char (\\w+)\\[\\]\\s*=\\s*\\{([^}]*)\\}', blob)}
    datos['se_dummy'] = [0, 0, 254, 255]
    tbl = open(os.path.join(SRC, 'se_tbl.c'), encoding='utf-8', errors='replace').read()
    out = {}
    for m in re.finditer('\\{\\s*0x([0-9A-F]{2}),\\s*0x([0-9A-F]{2}),\\s*0x([0-9A-F]{2}),\\s*0x([0-9A-F]{2}),\\s*\\{\\s*(\\w+),\\s*(\\w+),\\s*(\\w+)\\s*\\}\\s*\\},\\s*/\\*\\s*(\\d+)\\s*\\*/', tbl):
        pri, tracks, kind, ch = (int(m.group(i), 16) for i in range(1, 5))
        nombres = [m.group(5), m.group(6), m.group(7)][:tracks]
        out[int(m.group(8))] = {'pri': pri, 'kind': kind, 'character': ch, 'pistas': [datos.get(n, datos['se_dummy']) for n in nombres], 'nombres': nombres}
    return out

def canciones_script(stage):
    f = os.path.join(ST, stage, 'cache', 'scenerio.gcx')
    if not os.path.exists(f):
        return None
    try:
        s = gcx.leer(f)
    except Exception:
        return None
    res = []

    def rec(b):
        for c in b:
            if c.get('cmd') == 'sound':
                for a in c['args']:
                    if isinstance(a, dict) and a.get('opt') == 'b' and (len(a['v']) >= 2) and all((isinstance(v, int) for v in a['v'][:2])):
                        res.append(a['v'][:2])
            for a in c.get('args', []):
                if isinstance(a, dict) and 'bloque' in a:
                    rec(a['bloque'])
                if isinstance(a, dict) and 'opt' in a:
                    for v in a['v']:
                        if isinstance(v, dict) and 'bloque' in v:
                            rec(v['bloque'])
    rec(s['main'])
    if not res:
        for b in s['procs'].values():
            rec(b)
    return res[0] if res else None

def main():
    for d in ('bancos', 'mdx', 'efx'):
        os.makedirs(os.path.join(OUT, d), exist_ok=True)
    json.dump(residente(), open(os.path.join(OUT, 'residente.json'), 'w'), separators=(',', ':'))
    shutil.copyfile(os.path.join(ST, 'init', 'sound', 'ae34.wvx'), os.path.join(OUT, 'bancos', 'ae34.wvx'))
    esc = {}
    for sd in sorted(glob.glob(os.path.join(ST, '*', 'sound'))):
        st = os.path.basename(os.path.dirname(sd))
        info = {'bancos': [], 'mdx': None, 'efx': None}
        for f in sorted(glob.glob(os.path.join(sd, '*.*'))):
            n, ext = os.path.basename(f).rsplit('.', 1)
            if ext == 'wvx':
                dst = os.path.join(OUT, 'bancos', n + '.wvx')
                if not os.path.exists(dst):
                    shutil.copyfile(f, dst)
                if n != 'ae34':
                    info['bancos'].append(n)
            elif ext in ('mdx', 'efx'):
                dst = os.path.join(OUT, ext, n + '.' + ext)
                if not os.path.exists(dst):
                    shutil.copyfile(f, dst)
                info[ext] = n
        info['canciones'] = canciones_script(st)
        if info['bancos'] or info['mdx'] or info['efx']:
            esc[st] = info
    json.dump(esc, open(os.path.join(OUT, 'escenarios.json'), 'w'), indent=0)
    tam = sum((os.path.getsize(f) for f in glob.glob(os.path.join(OUT, '*', '*'))))
    print(len(esc), 'escenarios con sonido;', len(glob.glob(os.path.join(OUT, 'bancos', '*'))), 'bancos,', len(glob.glob(os.path.join(OUT, 'mdx', '*'))), 'mdx,', len(glob.glob(os.path.join(OUT, 'efx', '*'))), 'efx;', round(tam / 1000000.0, 1), 'MB')
    print('s00a:', esc.get('s00a'))
if __name__ == '__main__':
    main()
