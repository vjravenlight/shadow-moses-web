# MGS web — FeniXVOID · Project Ravenlight
import sys, os, glob, json, struct
sys.path.insert(0, os.path.dirname(__file__))
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
from kmd2obj import load
RAIZ = os.path.join(os.path.dirname(__file__), '..')
NIVELES = os.path.join(ASSETS, 'niveles')
STAGES = os.path.join(EXTRAIDO, 'disco1', '01_stages')
_todos = None

def buscar_kmd(st, nombre):
    global _todos
    for p in glob.glob(os.path.join(STAGES, st, '*', nombre + '.kmd')):
        return p
    if _todos is None:
        _todos = {}
        for p in glob.glob(os.path.join(STAGES, '*', '*', '*.kmd')):
            _todos.setdefault(os.path.basename(p)[:-4], p)
    return _todos.get(nombre)

def glb_json(path):
    d = open(path, 'rb').read()
    L = struct.unpack('<I', d[12:16])[0]
    return json.loads(d[20:20 + L])

def caras(st):
    out, avisos = ({}, [])
    for g in sorted(glob.glob(os.path.join(NIVELES, st, '*.glb'))):
        nombre = os.path.basename(g)[:-4]
        j = glb_json(g)
        if j.get('skins'):
            continue
        if len(j.get('meshes', [])) != 1:
            avisos.append(f"{nombre}: {len(j.get('meshes', []))} mallas")
            continue
        kmd = buscar_kmd(st, nombre)
        if not kmd:
            avisos.append(f'{nombre}: sin KMD')
            continue
        try:
            mdls = load(kmd)
        except Exception as e:
            avisos.append(f'{nombre}: {e}')
            continue
        grupos = {}
        for m in mdls:
            for f in range(len(m['vi']) // 4):
                tid = m['tex'][f] if m['tex'] else 0
                k = (tid, bool(m['flag'] & 2))
                grupos.setdefault(k, False)
                if m['flag'] & 1024:
                    grupos[k] = True
        n = len(j['meshes'][0]['primitives'])
        if n != len(grupos):
            avisos.append(f'{nombre}: {n} primitivas en el glb y {len(grupos)} grupos en el KMD')
            continue
        out[nombre] = {'primitivas': n, 'dobles': [i for i, b in enumerate(grupos.values()) if b]}
    return (out, avisos)
if __name__ == '__main__':
    sts = sys.argv[1:] or sorted((d for d in os.listdir(NIVELES) if os.path.isdir(os.path.join(NIVELES, d))))
    total = dobles = 0
    for st in sts:
        out, avisos = caras(st)
        if out:
            with open(os.path.join(NIVELES, st, 'caras.json'), 'w', encoding='utf-8') as f:
                json.dump(out, f, separators=(',', ':'))
        total += sum((v['primitivas'] for v in out.values()))
        dobles += sum((len(v['dobles']) for v in out.values()))
        print(f'{st}: {len(out)} modelos' + (f" · avisos: {'; '.join(avisos)}" if avisos else ''))
    print(f'primitivas {total}, con caras de doble lado {dobles}')
