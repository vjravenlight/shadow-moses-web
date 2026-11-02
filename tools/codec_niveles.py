# MGS web — FeniXVOID · Project Ravenlight
import glob
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
import json
import os
import re
import sys
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gcx
import gcl_vm
import niveles
ST = os.path.join(EXTRAIDO, 'disco1', '01_stages')
NIV = os.path.join(ASSETS, 'niveles')
OUT = os.path.join(ASSETS, 'codec', 'st')
CONSERVAR = {'if', 'eval', 'return', 'foreach', 'radio', 'sound', 'delay', 'trap', 'ntrap', 'restart', 'load', 'rand', 'varsave', 'system', 'func'}

def podar_valor(v):
    if isinstance(v, dict):
        if 'bloque' in v:
            return {'bloque': podar(v['bloque'])}
        if 'opt' in v:
            return {'opt': v['opt'], 'v': [podar_valor(x) for x in v['v']]}
        if 'id' in v:
            return {'id': v['id']}
        return v
    return v

def podar(bloque):
    out = []
    for s in bloque:
        if 'cmd' in s:
            if s['cmd'] in CONSERVAR:
                out.append({'cmd': s['cmd'], 'args': [podar_valor(a) for a in s['args']]})
            else:
                c = {'cmd': s['cmd']}
                if s['cmd'] == 'chara' and s['args'] and isinstance(s['args'][0], dict) and ('id' in s['args'][0]):
                    c['tipo'] = gcx.CHARAS.get(s['args'][0]['id'], {}).get('nombre', '%04x' % s['args'][0]['id'])
                out.append(c)
        elif 'call' in s:
            out.append({'call': s['call'], 'args': [podar_valor(a) for a in s['args']]})
        elif 'eval' in s:
            out.append({'eval': s['eval']})
        else:
            out.append(s)
    return out

def contar(bloque, que):
    n = 0
    for s in bloque:
        if s.get('cmd') in que:
            n += 1
        for a in s.get('args', []) or []:
            if isinstance(a, dict):
                if 'bloque' in a:
                    n += contar(a['bloque'], que)
                if 'opt' in a:
                    for v in a['v']:
                        if isinstance(v, dict) and 'bloque' in v:
                            n += contar(v['bloque'], que)
    return n

def zonas_de_trampa(script):
    zs = set()

    def rec(b):
        for s in b:
            if s.get('cmd') in ('trap', 'ntrap') and s['args'] and isinstance(s['args'][0], dict) and ('id' in s['args'][0]):
                zs.add(s['args'][0]['id'])
            for a in s.get('args', []) or []:
                if isinstance(a, dict):
                    if 'bloque' in a:
                        rec(a['bloque'])
                    if 'opt' in a:
                        for v in a['v']:
                            if isinstance(v, dict) and 'bloque' in v:
                                rec(v['bloque'])
    rec(script['main'])
    for b in script['procs'].values():
        rec(b)
    return zs

def cajas(st, zs):
    out = {}
    for f in glob.glob(os.path.join(NIV, st, '*.hzm.json')):
        try:
            hz = json.load(open(f, encoding='utf-8'))
        except Exception:
            continue
        for g in hz.get('grupos', []):
            for t in g.get('triggers', []):
                n = t.get('nombre')
                h = int(n, 16) if isinstance(n, str) and re.fullmatch('[0-9a-f]{4}', n) else gcx.strcode(n) if isinstance(n, str) else n
                if h in zs:
                    out.setdefault(str(h), []).append(t['caja'])
    return out

def sistema_g(script):
    res = []

    def rec(b):
        for s in b:
            if s.get('cmd') == 'system':
                for a in s['args']:
                    if isinstance(a, dict) and a.get('opt') == 'g' and a['v'] and isinstance(a['v'][0], dict) and ('proc' in a['v'][0]):
                        res.append('%04x' % a['v'][0]['proc'])
            for a in s.get('args', []) or []:
                if isinstance(a, dict) and 'bloque' in a:
                    rec(a['bloque'])
                if isinstance(a, dict) and 'opt' in a:
                    for v in a['v']:
                        if isinstance(v, dict) and 'bloque' in v:
                            rec(v['bloque'])
    rec(script['main'])
    return res[0] if res else None

def escenario(st, cargas):
    path = os.path.join(ST, st, 'cache', 'scenerio.gcx')
    if not os.path.exists(path):
        return None
    script = gcx.leer(path)
    try:
        e = gcl_vm.estado(st, cargas)
        vm = gcl_vm.VM(script)
        gcl_vm.aplicar_carga(vm, st, e)
        g = [[i, b] for i, b in enumerate(vm.g) if b]
        l = [[i, b] for i, b in enumerate(vm.l) if b]
        etiqueta = e['etiqueta']
    except Exception as ex:
        g, l, etiqueta = ([], [], 'sin estado (%s)' % ex)
    zs = zonas_de_trampa(script)
    d = {'st': st, 'estado': etiqueta, 'vars': {'g': g, 'l': l}, 'main': podar(script['main']), 'procs': {'%04x' % k: podar(v) for k, v in script['procs'].items()}, 'zonas': cajas(st, zs)}
    nr = contar(script['main'], {'radio'}) + sum((contar(b, {'radio'}) for b in script['procs'].values()))
    d['resumen'] = {'radio': nr, 'trampas': len(zs), 'zonas_con_caja': len(d['zonas']), 'gameover': sistema_g(script)}
    return d

def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, ValueError):
        pass
    os.makedirs(OUT, exist_ok=True)
    cargas = niveles.cargas_externas()
    sts = sys.argv[1:] or sorted((os.path.basename(x) for x in glob.glob(os.path.join(ST, '*')) if os.path.basename(x)[:1] in 'sd'))
    total = 0
    indice = {}
    for st in sts:
        d = escenario(st, cargas)
        if not d:
            continue
        s = json.dumps(d, ensure_ascii=False, separators=(',', ':'))
        open(os.path.join(OUT, st + '.json'), 'w', encoding='utf-8').write(s)
        total += len(s)
        indice[st] = d['resumen']
        print('%-6s %6.1f KB  radio %3d  trampas %3d (con caja %3d)  gameover %s  [%s]' % (st, len(s) / 1024, d['resumen']['radio'], d['resumen']['trampas'], d['resumen']['zonas_con_caja'], d['resumen']['gameover'], d['estado'][:40]))
    if len(sys.argv) == 1:
        json.dump(indice, open(os.path.join(OUT, 'indice.json'), 'w', encoding='utf-8'), separators=(',', ':'))
    print('total %.2f MB en %d escenarios' % (total / 1000000.0, len(indice)))
if __name__ == '__main__':
    main()
