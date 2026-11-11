# MGS web — FeniXVOID · Project Ravenlight
import os, sys, struct
sys.path.insert(0, os.path.dirname(__file__))
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
import gcx
FPS = 30

class Fin(Exception):
    pass

class VM:

    def __init__(self, script, link=None, glob=None, horizonte=90):
        self.s = script
        self.g = bytearray(65536)
        self.l = bytearray(512)
        for k, v in (link or {}).items():
            self.set_raw(self.l, k, 'w', v)
        for k, v in (glob or {}).items():
            self.set_raw(self.g, k, 'w', v)
        self.t = 0
        self.cola = []
        self.orden = 0
        self.mapa = None
        self.mapas = {}
        self.orden_mapas = []
        self.actores = []
        self.cargas = []
        self.sonido = None
        self.traps = []
        self.horizonte = horizonte * FPS
        self.prof = 0
        self.fin = False
        self.fondo = None
        self.luz = {}
        self.demos = []
        self.pasada = 0

    @staticmethod
    def parse_var(nombre):
        tipo, resto = nombre[1:].split(':')
        link = resto[0] == 'L'
        if '.' in resto:
            off, bit = resto[1:].split('.')
            return (tipo, link, int(off, 16), int(bit))
        return (tipo, link, int(resto[1:], 16), None)

    @staticmethod
    def set_raw(mem, off, tipo, v):
        if tipo in ('w', 's', 'p'):
            struct.pack_into('<H', mem, off, v & 65535)
        elif tipo in ('b', 'c'):
            mem[off] = v & 255

    def get(self, nombre):
        tipo, link, off, bit = self.parse_var(nombre)
        mem = self.l if link else self.g
        if tipo == 'w':
            return struct.unpack_from('<h', mem, off)[0]
        if tipo in ('s', 'p'):
            return struct.unpack_from('<H', mem, off)[0]
        if tipo in ('b', 'c'):
            return mem[off]
        if tipo == 'f':
            return int(bool(mem[off] & 1 << bit))
        return 0

    def set(self, nombre, v):
        tipo, link, off, bit = self.parse_var(nombre)
        mem = self.l if link else self.g
        if tipo == 'f':
            if v:
                mem[off] |= 1 << bit
            else:
                mem[off] &= ~(1 << bit) & 255
        else:
            self.set_raw(mem, off, tipo, v)

    def valor(self, v, args):
        if isinstance(v, (int, float)):
            return int(v)
        if v is None:
            return 0
        if 'var' in v:
            return self.get(v['var'])
        if 'arg' in v:
            n = v['arg']
            return len(args) if n == 0 else args[n - 1] if n - 1 < len(args) else 0
        if 'expr' in v:
            return self.expr(v['expr'], args)
        if 'id' in v:
            return v['id']
        if 'proc' in v:
            return v['proc']
        if 'str' in v:
            return v['str']
        if 'bloque' in v:
            return v
        return 0

    def expr(self, lista, args):
        pila = []
        for x in lista:
            if isinstance(x, dict) and 'op' in x:
                op = x['op']
                if op == 0:
                    return pila[-1][0] if pila else 0
                if op == 20:
                    (a, var), (b, _) = (pila[-2], pila[-1])
                    if var:
                        self.set(var, b)
                    pila[-2:] = [(b, None)]
                    continue
                b = pila.pop()[0] if pila else 0
                a = pila.pop()[0] if pila else 0
                pila.append((self.calc(op, a, b), None))
            else:
                var = x['var'] if isinstance(x, dict) and 'var' in x else None
                pila.append((self.valor(x, args), var))
        return pila[-1][0] if pila else 0

    @staticmethod
    def calc(op, a, b):
        a = a if isinstance(a, int) else 0
        b = b if isinstance(b, int) else 0
        return {1: lambda: -b, 2: lambda: int(not b), 3: lambda: ~b, 4: lambda: a + b, 5: lambda: a - b, 6: lambda: a * b, 7: lambda: int(a / b) if b else 0, 8: lambda: abs(a) % abs(b) * (1 if a >= 0 else -1) if b else 0, 9: lambda: int(a == b), 10: lambda: int(a != b), 11: lambda: int(a < b), 12: lambda: int(a <= b), 13: lambda: int(a > b), 14: lambda: int(a >= b), 15: lambda: a | b, 16: lambda: a & b, 17: lambda: a ^ b, 18: lambda: int(bool(a) or bool(b)), 19: lambda: int(bool(a) and bool(b))}.get(op, lambda: 0)()

    def opciones(self, s):
        return {a['opt']: a['v'] for a in s.get('args', []) if isinstance(a, dict) and 'opt' in a}

    def resolver(self, vals, args):
        out = []
        for v in vals:
            if isinstance(v, dict) and 'bloque' in v:
                out.append({'bloque': True})
            elif isinstance(v, dict) and 'proc' in v:
                out.append({'proc': v['proc']})
            elif isinstance(v, dict) and 'id' in v:
                out.append({'id': v['id'], 'n': v.get('n')})
            elif isinstance(v, dict) and 'str' in v:
                out.append(v['str'])
            else:
                out.append(self.valor(v, args))
        return out

    def bloque(self, b, args, ctx):
        self.prof += 1
        if self.prof > 60:
            self.prof -= 1
            return None
        try:
            for s in b:
                if self.fin:
                    return 'fin'
                if 'call' in s:
                    self.proc(s['call'], [self.valor(a, args) for a in s['args']], ctx)
                elif 'eval' in s:
                    self.expr(s['eval'], args)
                elif 'cmd' in s:
                    if self.comando(s, args, ctx) == 'return':
                        return 'return'
            return None
        finally:
            self.prof -= 1

    def proc(self, pid, args, ctx):
        b = self.s['procs'].get(pid)
        if b is None:
            return
        self.bloque(b, args, f'proc_{pid:04x}')

    def comando(self, s, args, ctx):
        c = s['cmd']
        a = s['args']
        o = self.opciones(s)
        if c == 'if':
            i = 0
            cond = self.valor(a[0], args)
            blk = a[1]
            rest = a[2:]
            while True:
                if cond:
                    return self.bloque(blk['bloque'], args, ctx)
                if not rest:
                    return None
                nxt = rest.pop(0)
                if not (isinstance(nxt, dict) and 'opt' in nxt):
                    return None
                if nxt['opt'] == 'e':
                    return self.bloque(nxt['v'][0]['bloque'], args, ctx)
                if nxt['opt'] == 'i':
                    cond = self.valor(nxt['v'][0], args)
                    blk = nxt['v'][1]
                    continue
                return None
        if c == 'eval':
            for x in a:
                self.valor(x, args)
            return None
        if c == 'return':
            return 'return'
        if c == 'foreach':
            vals = []
            for x in a:
                if isinstance(x, dict) and 'opt' in x:
                    break
                vals.append(self.valor(x, args))
            blk = next((v['bloque'] for x in a if isinstance(x, dict) and 'opt' in x for v in x['v'] if isinstance(v, dict) and 'bloque' in v), None)
            if blk:
                for v in vals:
                    self.bloque(blk, [v], ctx)
            return None
        if c == 'chara':
            if not a or not isinstance(a[0], dict) or 'id' not in a[0]:
                return None
            tipo = gcx.CHARAS.get(a[0]['id'], {}).get('nombre', f"#{a[0]['id']:04x}")
            nombre = a[1]['id'] if len(a) > 1 and isinstance(a[1], dict) and ('id' in a[1]) else None
            act = {'tipo': tipo, 'nombre': nombre, 'mapa': self.mapa, 't': round(self.t / FPS, 2), 'ctx': ctx, 'opts': {k: self.resolver(v, args) for k, v in o.items()}, '_s': id(s)}
            self.actores.append(act)
            if tipo in ('COMMANDER', 'GODZCOM'):
                for p in act['opts'].get('n', []):
                    if isinstance(p, dict) and 'proc' in p:
                        self.proc(p['proc'], [], ctx)
            return None
        if c == 'mapdef':
            mid = a[0]['id'] if a and isinstance(a[0], dict) and ('id' in a[0]) else None
            if mid is not None and mid not in self.mapas:
                self.mapas[mid] = s
                self.orden_mapas.append(mid)
            return None
        if c == 'light':
            for k in ('d', 'c', 'a'):
                if o.get(k) and k not in self.luz:
                    self.luz[k] = [self.valor(v, args) for v in o[k][:3]]
            return None
        if c == 'map':
            if o.get('b') and self.fondo is None:
                self.fondo = [self.valor(v, args) for v in o['b'][:3]]
            if 'd' in o:
                for mid in [self.valor(v, args) for v in o['d']][0::2]:
                    if mid is not None and mid not in self.mapas:
                        self.mapas[mid] = s
                        self.orden_mapas.append(mid)
            if 'a' in o:
                ids = [self.valor(v, args) for v in o['a']]
                ids = [i for i in ids if i in self.mapas] or ([self.orden_mapas[0]] if self.orden_mapas and self.mapa is None else [])
                if ids:
                    self.mapa = ids[0]
            return None
        if c == 'delay':
            t = self.valor(o['t'][0], args) if o.get('t') else 0
            if 'g' in o:
                t = -t
            obj = None
            if o.get('p'):
                obj = ('proc', self.valor(o['p'][0], args))
            if o.get('e') and isinstance(o['e'][0], dict) and ('bloque' in o['e'][0]):
                obj = ('bloque', o['e'][0]['bloque'])
            if t and obj and (self.t + abs(t) <= self.horizonte):
                self.orden += 1
                self.cola.append((self.t + abs(t), self.orden, obj, list(args), ctx, self.mapa))
            return None
        if c == 'radio' and o.get('p'):
            pid = self.valor(o['p'][0], args)
            if isinstance(pid, int):
                self.proc(pid, [], ctx)
            return None
        if c == 'demo':
            sec = self.valor(o['s'][0], args) if o.get('s') else None
            pid = self.valor(o['p'][0], args) if o.get('p') else None
            if isinstance(sec, int) and sec >= 0:
                self.demos.append({'sector': sec, 'proc': pid if isinstance(pid, int) else None, 't': round(self.t / FPS, 2), 'ctx': ctx, 'pasada': self.pasada})
            if isinstance(pid, int):
                self.proc(pid, [], ctx)
            return None
        if c == 'jimaku' and o.get('e'):
            pid = self.valor(o['e'][0], args)
            if isinstance(pid, int):
                self.proc(pid, [], ctx)
            return None
        if c == 'restart':
            self.reinicio = True
            self.fin = True
            return 'return'
        if c == 'load':
            if a and isinstance(a[0], dict) and ('str' in a[0]):
                self.cargas.append({'a': a[0]['str'], 'm': self.resolver(o.get('m', []), args), 'p': self.resolver(o.get('p', []), args), 't': self.t})
            self.fin = True
            return 'return'
        if c == 'sound':
            if 'b' in o and self.sonido is None:
                self.sonido = self.resolver(o['b'], args)
            return None
        if c == 'rand':
            self.set('$w:L000a', 0)
            return None
        if c in ('trap', 'ntrap'):
            self.traps.append({'cmd': c, 'opts': {k: self.resolver(v, args) for k, v in o.items()}})
            return None
        return None

    def correr(self):
        self.demos = []
        for pasada in range(4):
            self.pasada = pasada
            self.reinicio = False
            self.fin = False
            self.t = 0
            self.cola = []
            self.mapa = None
            self.mapas = {}
            self.orden_mapas = []
            self.actores = []
            self.traps = []
            self.sonido = None
            self.fondo = None
            self.luz = {}
            self.correr1()
            if not self.reinicio:
                break
        return self

    def ejecutar(self, k, obj, args, ctx='trap'):
        self.fin = False
        self.t = 0
        self.cola = []
        if k == 'b':
            self.bloque(obj, args, ctx)
        else:
            self.proc(obj, args, ctx)
        while self.cola and (not self.fin):
            self.cola.sort(key=lambda x: (x[0], x[1]))
            t, _, (kk, o2), a2, c2, mapa = self.cola.pop(0)
            self.t = t
            self.mapa = mapa
            if kk == 'proc':
                self.proc(o2, a2, c2)
            else:
                self.bloque(o2, a2, c2)
        return self

    def correr1(self):
        try:
            self.bloque(self.s['main'], [], 'main')
            while self.cola and (not self.fin):
                self.cola.sort(key=lambda x: (x[0], x[1]))
                t, _, (k, obj), args, ctx, mapa = self.cola.pop(0)
                self.t = t
                self.mapa = mapa
                if k == 'proc':
                    self.proc(obj, args, ctx)
                else:
                    self.bloque(obj, args, ctx)
        except Fin:
            pass
ST = os.path.join(EXTRAIDO, 'disco1', '01_stages')

def leer_st(st):
    return gcx.leer(os.path.join(ST, st, 'cache', 'scenerio.gcx'))

def _menu(script, chara_proc=None):
    pares = []
    bloques = [script['main']] + ([script['procs'][chara_proc]] if chara_proc is not None else [])
    for b in bloques:
        for x in b:
            if x.get('cmd') == 'chara' and gcx.CHARAS.get(x['args'][0].get('id'), {}).get('nombre') == 'STAGESELECT':
                for o in x['args']:
                    if isinstance(o, dict) and o.get('opt') == 's':
                        v = o['v']
                        pares += [(v[i]['str'], v[i + 1]['proc']) for i in range(0, len(v) - 1, 2) if isinstance(v[i], dict) and 'str' in v[i] and isinstance(v[i + 1], dict) and ('proc' in v[i + 1])]
    return pares

def _correr_menu(script, pid, base=None):
    vm = VM(script, link={2: 1, 8: 1})
    if base:
        vm.g[:] = base[0]
        vm.l[:] = base[1]
    try:
        vm.proc(pid, [], 'menu')
    except Exception:
        return None
    return vm if vm.cargas else None
_ENTRADAS = None

def entradas():
    global _ENTRADAS
    if _ENTRADAS:
        return _ENTRADAS
    sel = leer_st('select')
    init = dict(_menu(sel)).get('VAR INIT')
    presets = []
    for grupo, gp in _menu(sel, init):
        if grupo == 'RETURN':
            continue
        for etiqueta, pid in _menu(sel, gp):
            if etiqueta == 'RETURN':
                continue
            vm = _correr_menu(sel, pid)
            if vm:
                presets.append({'etiqueta': etiqueta, 'st': vm.cargas[-1]['a'], 'g': bytes(vm.g), 'l': bytes(vm.l), 'carga': vm.cargas[-1]})
    menus = {}
    for m in ('select1', 'select2', 'select3', 'select4'):
        sc = leer_st(m)
        for etiqueta, pid in _menu(sc):
            vm = _correr_menu(sc, pid)
            if vm:
                menus.setdefault(vm.cargas[-1]['a'], []).append((etiqueta, sc, pid))
    _ENTRADAS = (presets, menus)
    return _ENTRADAS

def estado(st, cargas_externas=None):
    presets, menus = entradas()
    propios = [p for p in presets if p['st'] == st]
    if propios:
        p = propios[0]
        return {'etiqueta': p['etiqueta'], 'g': p['g'], 'l': p['l'], 'carga': p['carga']}
    previos = [p for p in presets if p['st'][:1] == 's' and p['st'] <= st] or presets[:1]
    base = previos[-1]
    if st in menus:
        etiqueta, sc, pid = menus[st][0]
        vm = _correr_menu(sc, pid, (base['g'], base['l']))
        if vm:
            return {'etiqueta': f"{etiqueta} (sobre {base['etiqueta']})", 'g': bytes(vm.g), 'l': bytes(vm.l), 'carga': vm.cargas[-1]}
    carga = (cargas_externas or {}).get(st) or {'a': st, 'm': [], 'p': []}
    return {'etiqueta': f"como {base['etiqueta']}", 'g': base['g'], 'l': base['l'], 'carga': carga}

def aplicar_carga(vm, st, e):
    vm.g[:] = e['g']
    vm.l[:] = e['l']
    c = e['carga']
    vm.set('$s:L0094', vm.get('$s:L000c'))
    vm.set('$s:L000c', gcx.strcode(st))
    m = c['m'][0] if c['m'] else None
    if isinstance(m, dict):
        m = m['id']
    if isinstance(m, int):
        vm.set('$s:L000e', m)
    if len(c['p']) >= 3 and all((isinstance(x, int) for x in c['p'][:3])):
        for k, x in zip(('$w:L0010', '$w:L0012', '$w:L0014'), c['p'][:3]):
            vm.set(k, x)
if __name__ == '__main__':
    st = sys.argv[1]
    s = leer_st(st)
    e = estado(st)
    vm = VM(s, horizonte=180)
    aplicar_carga(vm, st, e)
    vm.correr()
    print('estado:', e['etiqueta'], 'progreso', vm.get('$w:G000a'))
    sys.stdout.reconfigure(encoding='utf-8')
    for a in vm.actores:
        if a['tipo'] in ('TELOP', 'PADVIBRATE', 'FADEIO', 'CINEMA', 'TEXTURE'):
            continue
        print(f"t={a['t']:6.1f} {a['tipo']:12s} map={a['mapa']} {a['ctx']:10s} " + ' '.join((f'-{k} {v}' for k, v in a['opts'].items()))[:150])
    print('cargas', vm.cargas)
