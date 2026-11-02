# MGS web — FeniXVOID · Project Ravenlight
import glob
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
import json
import os
import sys
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gcx
import codec_niveles
ST = os.path.join(EXTRAIDO, 'disco1', '01_stages')
OUT = os.path.join(ASSETS, 'partida')
FLUJO = {'if', 'eval', 'return', 'foreach', 'rand', 'func'}
CHARA = {v['nombre']: k for k, v in gcx.CHARAS.items()}
INVENTARIO = range(34, 122)

def es_chara(s, nombre):
    return s.get('cmd') == 'chara' and s.get('args') and isinstance(s['args'][0], dict) and (s['args'][0].get('id') == CHARA[nombre])

def opciones(s):
    o = {}
    for a in s.get('args', []):
        if isinstance(a, dict) and 'opt' in a:
            o.setdefault(a['opt'], a['v'])
    return o

def num(v, d=None):
    return v[0] if isinstance(v, list) and v and isinstance(v[0], (int, float)) else d

def valor_simple(v):
    if isinstance(v, (int, float)):
        return v
    if isinstance(v, dict):
        for k in ('var', 'expr', 'arg', 'proc', 'str'):
            if k in v:
                return {k: v[k]}
        if 'id' in v:
            return {'id': v['id']}
    return 0

def vars_de(x, out=None):
    out = set() if out is None else out
    if isinstance(x, dict):
        if 'var' in x:
            out.add(x['var'])
        for v in x.values():
            vars_de(v, out)
    elif isinstance(x, list):
        for v in x:
            vars_de(v, out)
    return out

def lee_inventario(conds):
    for c in conds:
        for v in vars_de(c):
            if v[3] == 'L' and int(v[4:8], 16) in INVENTARIO:
                return True
    return False

def asignaciones(bloque):
    r = []
    for s in bloque or []:
        e = s.get('eval') or (s.get('args', [{}])[0].get('expr') if s.get('cmd') == 'eval' and s.get('args') else None)
        if e and len(e) >= 3 and isinstance(e[0], dict) and ('var' in e[0]) and isinstance(e[2], dict) and (e[2].get('op') == 20):
            r.append((e[0]['var'], e[1]))
    return r

class Exportador:

    def __init__(self, script):
        self.script = script
        self.items = []
        self.procs_item = {}

    def busca(self, bloque, que, vistos=None):
        vistos = set() if vistos is None else vistos
        for s in bloque or []:
            if 'item' in que and es_chara(s, 'ITEM'):
                return True
            if 'carga' in que and s.get('cmd') in ('load', 'restart'):
                return True
            if 'call' in s:
                p = s['call']
                if p not in vistos:
                    vistos.add(p)
                    if self.busca(self.script['procs'].get(p), que, vistos):
                        return True
            for a in s.get('args', []) or []:
                if isinstance(a, dict) and 'bloque' in a and self.busca(a['bloque'], que, vistos):
                    return True
                if isinstance(a, dict) and 'opt' in a:
                    for v in a['v']:
                        if isinstance(v, dict) and 'bloque' in v and self.busca(v['bloque'], que, vistos):
                            return True
                        if isinstance(v, dict) and 'proc' in v and (v['proc'] not in vistos) and (s.get('cmd') in ('delay', 'demo', 'radio')):
                            vistos.add(v['proc'])
                            if self.busca(self.script['procs'].get(v['proc']), que, vistos):
                                return True
        return False

    def item(self, s, ctx, conds):
        o = opciones(s)
        k = len(self.items)
        x = None
        if 'x' in o and o['x'] and isinstance(o['x'][0], dict) and ('bloque' in o['x'][0]):
            x = codec_niveles.podar(o['x'][0]['bloque'])
        e = None
        if 'e' in o and o['e'] and isinstance(o['e'][0], dict) and ('proc' in o['e'][0]):
            e = o['e'][0]['proc']
            if e in self.script['procs']:
                self.procs_item['%04x' % e] = codec_niveles.podar(self.script['procs'][e])
        m = o.get('m', [None])[0]
        it = {'k': k, 'nombre': s['args'][1].get('id') if len(s['args']) > 1 and isinstance(s['args'][1], dict) else None, 'p': [valor_simple(v) for v in o.get('p', [])[:3]], 'h': num(o.get('h'), 450), 'b': num(o.get('b'), 0), 'i': num(o.get('i'), 0), 'n': num(o.get('n'), 1), 'm': m.get('str') if isinstance(m, dict) else m, 'x': x, 'e': e, 'ctx': ctx}
        marca = asignaciones(o['x'][0]['bloque']) if x is not None else []
        if e is not None:
            marca = asignaciones(self.script['procs'].get(e))
        cont = [v for v, val in marca if isinstance(val, dict) and val.get('var') == '$b:G0000']
        if cont:
            it['clase'], it['var'] = ('contador', cont[0])
        elif marca:
            it['clase'], it['var'] = ('bandera', marca[0][0])
        elif x is not None or e is not None:
            it['clase'] = 'bandera'
        elif lee_inventario(conds):
            it['clase'] = 'inventario'
        else:
            it['clase'] = 'sin_marca'
        self.items.append(it)
        return k

    def podar_valor(self, v, ctx, conds):
        if isinstance(v, dict):
            if 'bloque' in v:
                return {'bloque': self.podar(v['bloque'], ctx, conds)}
            if 'opt' in v:
                return {'opt': v['opt'], 'v': [self.podar_valor(x, ctx, conds) for x in v['v']]}
            if 'id' in v:
                return {'id': v['id']}
        return v

    def podar_if(self, s, ctx, conds):
        nuevos, acum = ([], list(conds))
        for x in s['args']:
            if isinstance(x, dict) and 'expr' in x:
                acum = acum + [x]
                nuevos.append(x)
            elif isinstance(x, dict) and 'bloque' in x:
                nuevos.append({'bloque': self.podar(x['bloque'], ctx, acum)})
            elif isinstance(x, dict) and 'opt' in x:
                vs = []
                for y in x['v']:
                    if isinstance(y, dict) and 'expr' in y:
                        acum = acum + [y]
                        vs.append(y)
                    elif isinstance(y, dict) and 'bloque' in y:
                        vs.append({'bloque': self.podar(y['bloque'], ctx, acum)})
                    else:
                        vs.append(y)
                nuevos.append({'opt': x['opt'], 'v': vs})
            else:
                nuevos.append(x)
        return {'cmd': 'if', 'args': nuevos}

    def podar(self, bloque, ctx, conds=()):
        out = []
        for s in bloque or []:
            c = s.get('cmd')
            o = opciones(s) if c else {}
            if 'call' in s:
                out.append({'call': s['call'], 'args': [self.podar_valor(a, ctx, conds) for a in s['args']]})
            elif 'eval' in s:
                out.append({'eval': s['eval']})
            elif es_chara(s, 'ITEM'):
                out.append({'cmd': 'item', 'k': self.item(s, ctx, conds)})
            elif es_chara(s, 'SNAKE'):
                out.append({'cmd': 'snake', 'p': [valor_simple(v) for v in o.get('p', [])[:3]], 'd': [valor_simple(v) for v in o.get('d', [])[:3]]})
            elif c == 'if':
                out.append(self.podar_if(s, ctx, conds))
            elif c in FLUJO:
                out.append({'cmd': c, 'args': [self.podar_valor(a, ctx, conds) for a in s['args']]})
            elif c == 'demo':
                d = {'cmd': 'demo'}
                if o.get('s'):
                    d['s'] = valor_simple(o['s'][0])
                if o.get('p'):
                    d['p'] = valor_simple(o['p'][0])
                out.append(d)
            elif c == 'radio' and o.get('p'):
                d = {'cmd': 'radiop', 'p': valor_simple(o['p'][0])}
                if o.get('c'):
                    d['c'] = [valor_simple(v) for v in o['c'][:3]]
                out.append(d)
            elif c == 'load':
                a0 = s['args'][0] if s['args'] else None
                d = {'cmd': 'load', 'st': a0.get('str') if isinstance(a0, dict) else None}
                for k in ('m', 'p', 's'):
                    if k in o:
                        d[k] = [valor_simple(v) for v in o[k]]
                if 'n' in o:
                    d['n'] = True
                if 'r' in o:
                    d['r'] = [valor_simple(v) for v in o['r']]
                out.append(d)
            elif c == 'restart':
                d = {'cmd': 'restart'}
                if 's' in o:
                    d['s'] = True
                if o.get('p'):
                    d['p'] = valor_simple(o['p'][0])
                out.append(d)
            elif c == 'varsave':
                d = {'cmd': 'varsave', 'vars': [{'var': a['var']} for a in s['args'] if isinstance(a, dict) and 'var' in a]}
                if 'a' in o:
                    d['a'] = True
                out.append(d)
            elif c == 'delay':
                blk = o.get('e', [None])[0]
                pid = o.get('p', [None])[0]
                t = valor_simple(o['t'][0]) if o.get('t') else 0
                cuerpo = blk['bloque'] if isinstance(blk, dict) and 'bloque' in blk else self.script['procs'].get(pid['proc']) if isinstance(pid, dict) and 'proc' in pid else None
                items, carga = (self.busca(cuerpo, {'item'}), self.busca(cuerpo, {'carga'}))
                if items or carga:
                    d = {'cmd': 'delay', 't': t, 'items': items, 'carga': carga}
                    if isinstance(blk, dict) and 'bloque' in blk:
                        d['bloque'] = self.podar(blk['bloque'], 'delay', conds)
                    else:
                        d['proc'] = pid['proc']
                    out.append(d)
            elif c in ('trap', 'ntrap'):
                for a in s['args']:
                    if isinstance(a, dict) and 'bloque' in a:
                        self.podar(a['bloque'], 'trampa', conds)
                    if isinstance(a, dict) and 'opt' in a:
                        for v in a['v']:
                            if isinstance(v, dict) and 'bloque' in v:
                                self.podar(v['bloque'], 'trampa', conds)
        return out

def escenario(st):
    path = os.path.join(ST, st, 'cache', 'scenerio.gcx')
    if not os.path.exists(path):
        return None
    script = gcx.leer(path)
    ex = Exportador(script)
    main = ex.podar(script['main'], 'main')
    procs = {'%04x' % k: ex.podar(v, 'proc_%04x' % k) for k, v in script['procs'].items()}
    alcanzados, pila = (set(), [main])
    while pila:
        b = pila.pop()
        for s in b:
            ps = [s['call']] if 'call' in s else []
            if s.get('cmd') == 'delay' and 'proc' in s:
                ps.append(s['proc'])
            if s.get('cmd') in ('demo', 'radiop', 'restart') and isinstance(s.get('p'), dict) and ('proc' in s['p']):
                ps.append(s['p']['proc'])
            for p in ps:
                k = '%04x' % p
                if k not in alcanzados and k in procs:
                    alcanzados.add(k)
                    pila.append(procs[k])
            for a in (s.get('args') or []) + ([{'bloque': s['bloque']}] if 'bloque' in s else []):
                if isinstance(a, dict) and 'bloque' in a:
                    pila.append(a['bloque'])
                if isinstance(a, dict) and 'opt' in a:
                    pila.extend((v['bloque'] for v in a['v'] if isinstance(v, dict) and 'bloque' in v))
    area = None
    pila = [main] + [procs[k] for k in sorted(alcanzados)]
    while pila and area is None:
        b = pila.pop(0)
        for s in b:
            for v, val in asignaciones([s]):
                if v == '$b:G00aa' and isinstance(val, int):
                    area = val
                    break
            if area is not None:
                break
            for a in s.get('args') or []:
                if isinstance(a, dict) and 'bloque' in a:
                    pila.append(a['bloque'])
    return {'st': st, 'area': area, 'items': ex.items, 'main': main, 'procs': {k: procs[k] for k in sorted(alcanzados) if procs[k]}, 'procs_item': ex.procs_item}

def partida_nueva():
    import gcl_vm
    title, d00a = (gcl_vm.leer_st('title'), gcl_vm.leer_st('d00a'))

    def carga(vm, st):
        c = vm.cargas[-1]
        assert c['a'] == st, (c, st)
        vm.set('$s:L0094', vm.get('$s:L000c'))
        vm.set('$s:L000c', gcx.strcode(st))
        m = c['m'][0] if c['m'] else None
        if isinstance(m, dict):
            m = m['id']
        if isinstance(m, int):
            vm.set('$s:L000e', m)
    niveles = {}
    ent = None
    for nivel in (-1, 0, 1, 2, 3):
        vm = gcl_vm.VM(title)
        vm.set('$w:L0002', nivel)
        vm.proc(5103, [0, 0, 0], 'nueva')
        carga(vm, 'd00a')
        vm2 = gcl_vm.VM(d00a)
        vm2.g[:] = vm.g
        vm2.l[:] = vm.l
        vm2.correr()
        carga(vm2, 's00a')
        niveles[str(nivel)] = {'g': [[i, b] for i, b in enumerate(vm2.g) if b], 'l': [[i, b] for i, b in enumerate(vm2.l) if b]}
        ent = {'p': [vm2.get('$w:L0010'), vm2.get('$w:L0012'), vm2.get('$w:L0014')], 'rot': vm2.get('$w:G0002'), 'm': vm2.get('$s:L000e'), 'progreso': vm2.get('$w:G000a')}
    d = {'st': 's00a', 'historial': [gcx.strcode('s00a'), gcx.strcode('d00a')], 'entrada': ent, 'niveles': niveles, 'origen': 'title proc_13ef + proc_c8cf + proc_b7ed -> load d00a; d00a main + proc_3c7f -> load s00a'}
    json.dump(d, open(os.path.join(OUT, 'nueva.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('nueva.json: s00a, entrada %s, progreso %d' % (ent['p'], ent['progreso']))

def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, ValueError):
        pass
    os.makedirs(OUT, exist_ok=True)
    partida_nueva()
    sts = sys.argv[1:] or sorted((os.path.basename(x) for x in glob.glob(os.path.join(ST, '*')) if os.path.basename(x)[:1] in 'sd' and os.path.basename(x)[1:2].isdigit() or os.path.basename(x) in ('ending', 'roll')))
    indice = {}
    total = 0
    for st in sts:
        d = escenario(st)
        if not d:
            continue
        s = json.dumps(d, ensure_ascii=False, separators=(',', ':'))
        open(os.path.join(OUT, st + '.json'), 'w', encoding='utf-8').write(s)
        total += len(s)
        clases = {}
        for it in d['items']:
            clases[it['clase']] = clases.get(it['clase'], 0) + 1
        indice[st] = {'items': len(d['items']), 'clases': clases}
        print('%-6s %6.1f KB  %3d ítems  %s' % (st, len(s) / 1024, len(d['items']), ' '.join(('%s %d' % kv for kv in sorted(clases.items())))))
    if len(sys.argv) == 1:
        json.dump(indice, open(os.path.join(OUT, 'indice.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    tot = {}
    for v in indice.values():
        for k, n in v['clases'].items():
            tot[k] = tot.get(k, 0) + n
    print('total %.2f MB en %d escenarios; %s' % (total / 1000000.0, len(indice), tot))
if __name__ == '__main__':
    main()
