# MGS web — FeniXVOID · Project Ravenlight
import os, sys, glob, json, struct, shutil
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
RAIZ = os.path.join(os.path.dirname(__file__), '..')
sys.path.insert(0, os.path.dirname(__file__))
from gcx import strcode
import hzm
_src = open(os.path.join(os.path.dirname(__file__), 'hzm.py'), encoding='utf-8').read().replace('d[o2 + 16:o2 + 28]', 'd[o2 + 16:o2 + 29]')
_ns = {}
exec(compile(_src.split("if __name__ == '__main__':")[0], 'hzm13', 'exec'), _ns)
leer13 = _ns['leer']
_src12 = open(os.path.join(os.path.dirname(__file__), 'hzm.py'), encoding='utf-8').read().replace('d[o2 + 16:o2 + 29]', 'd[o2 + 16:o2 + 28]')
_ns12 = {}
exec(compile(_src12.split("if __name__ == '__main__':")[0], 'hzm12', 'exec'), _ns12)
leer12 = _ns12['leer']

def nombres(path):
    r12, r13 = (leer12(path), leer13(path))
    vistos = {}
    for g12, g13 in zip(r12['grupos'], r13['grupos']):
        for t12, t13 in zip(g12['triggers'], g13['triggers']):
            if t12.get('tipo') == 'trap' and t13.get('tipo') == 'trap' and (t12['nombre'] != t13['nombre']):
                vistos.setdefault((t12['nombre'], t13['nombre']), []).append([list(t13['caja'][0]), list(t13['caja'][1])])
    return vistos
cambios = {}
for base in ['02_por_tipo/03_mapas_colision', '_02_por_tipo_solo_disco2']:
    for f in glob.glob(os.path.join(EXTRAIDO, base, '**', '*.hzm'), recursive=True):
        st = os.path.basename(f).split('_')[0]
        try:
            v = nombres(f)
        except Exception as e:
            continue
        for par, cajas in v.items():
            l = cambios.setdefault(st, {}).setdefault(par, [])
            for c in cajas:
                if c not in l:
                    l.append(c)
aplicar = '--aplicar' in sys.argv
total = 0
for carpeta in ['visor/assets/guion/st', 'visor/assets/codec/st']:
    for st, pares in sorted(cambios.items()):
        p = os.path.join(ASSETS, *carpeta.split('/')[2:], st + '.json')
        if not os.path.exists(p):
            continue
        d = json.load(open(p, encoding='utf-8'))
        z = d.get('zonas') if isinstance(d, dict) else None
        if not isinstance(z, dict):
            continue
        hecho = []
        for (n12, n13), cajas in sorted(pares.items()):
            k12, k13 = (str(strcode(n12)), str(strcode(n13)))
            if k13 in z:
                continue
            if k12 in z:
                hecho.append(f'{n12} -> {n13} ({k12} -> {k13})')
                if aplicar:
                    z[k13] = z.pop(k12)
            else:
                hecho.append(f'+ {n13} ({k13}, {len(cajas)} caja/s)')
                if aplicar:
                    z[k13] = cajas
        if hecho:
            total += len(hecho)
            print(carpeta, st, *hecho, sep='\n  ')
            if aplicar:
                bk = os.path.join(PRUEBAS, 'trampas_13', 'antes', carpeta.replace('/', '_'))
                os.makedirs(bk, exist_ok=True)
                shutil.copy2(p, os.path.join(bk, st + '.json'))
                json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('escenarios con trampas de 13 letras:', {k: sorted((n13 for _, n13 in v)) for k, v in sorted(cambios.items())})
print('claves', 'cambiadas' if aplicar else 'a cambiar', total)
