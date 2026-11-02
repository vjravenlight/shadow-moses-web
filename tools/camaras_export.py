# MGS web — FeniXVOID · Project Ravenlight
import os, sys, json, glob, struct, re
sys.path.insert(0, os.path.dirname(__file__))
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
import gcx, gcl_vm, hzm
RAIZ = os.path.join(os.path.dirname(__file__), '..')
ST = os.path.join(EXTRAIDO, 'disco1', '01_stages')
OUT = os.path.join(ASSETS, 'niveles')
ENTRAR, SALIR, TODO, SNAKE, CAMARA = (3538, 54732, 5321, 8650, 50006)
TIPOS_CATIN = {n for n, c in gcx.CHARAS.items() if c['nombre'] == 'CAT_IN'}

def ints(vals):
    return [v if isinstance(v, int) else v.get('id') if isinstance(v, dict) and 'id' in v else 0 for v in vals]

class VMCam(gcl_vm.VM):

    def __init__(self, *a, **k):
        super().__init__(*a, **k)
        self.acc = []
        self.binds = []

    def correr1(self):
        self.acc = []
        self.binds = []
        return super().correr1()

    def comando(self, s, args, ctx):
        c = s['cmd']
        o = self.opciones(s)
        if c == 'camera':
            r = {}
            for k, v in o.items():
                vals = ints(self.resolver(v, args))
                if k in ('e', 'p'):
                    r[k] = 1
                elif k in ('b', 'l'):
                    r[k] = vals[:6]
                elif k == 'r':
                    r[k] = vals[:3]
                elif k in ('t', 'a', 'c'):
                    r[k] = vals[0] if vals else 0
                elif k == 's':
                    r[k] = {'id': vals[0], 'p1': vals[1], 'interp': vals[2], 'tipo': vals[3], 'pos': vals[4:7], 'trg': vals[7:10], 'mask': vals[10] if len(vals) > 10 else 0}
            self.acc.append({'t': self.t, 'camera': r})
            return None
        if c == 'mesg':
            a = s['args']
            if a:
                dest = self.valor(a[0], args)
                vals = ints(self.resolver(a[1:], args))
                if dest == CAMARA and len(vals) >= 2:
                    ev = 'entra' if vals[1] == ENTRAR else 'sale' if vals[1] == SALIR else vals[1]
                    self.acc.append({'t': self.t, 'evento': {'cam': vals[0], 'ev': ev}})
                elif isinstance(dest, int):
                    self.acc.append({'t': self.t, 'mesg': {'a': dest, 'v': vals}})
            return None
        if c == 'chara' and s['args'] and isinstance(s['args'][0], dict) and (s['args'][0].get('id') in TIPOS_CATIN):
            v = ints(self.resolver(o.get('c', []), args))
            if len(v) >= 6:
                self.acc.append({'t': self.t, 'corte': {'ojo': v[0:3], 'centro': v[3:6], 'zoom': (ints(self.resolver(o['a'], args)) or [320])[0] if 'a' in o else 320, 'cuadros': (ints(self.resolver(o['t'], args)) or [0])[0] if 't' in o else 0}})
        if c in ('trap', 'ntrap'):
            a = s['args']
            pos = [x for x in a if not (isinstance(x, dict) and ('opt' in x or 'bloque' in x))]
            vals = ints(self.resolver(pos, args))
            b = {'cmd': c, 'zona': vals[0] if vals else 0, 'quien': vals[1] if len(vals) > 1 else 0, 'mapa': self.mapa, 'ej': None}
            b['zona'] = 0 if b['zona'] == TODO else b['zona']
            b['quien'] = 0 if b['quien'] == TODO else b['quien']
            if c == 'trap':
                b['cond'] = vals[2] if len(vals) > 2 else 0
                if b['cond'] == TODO:
                    b['cond'] = 0
                blk = next((x for x in a if isinstance(x, dict) and 'bloque' in x), None)
                if blk:
                    b['ej'] = ('b', blk['bloque'])
            else:
                b['cond'] = 0
                for k, v in o.items():
                    vv = self.resolver(v, args)
                    if k == 'm':
                        b['cond'] = ints(vv)[0] if vv else 0
                    elif k == 'd':
                        n = ints(vv)
                        b['d'] = [n[0], n[1] if len(n) > 1 else 512]
                    elif k == 's':
                        b['s'] = ints(vv)[0]
                    elif k == 'b':
                        b['b'] = ints(vv)[0]
                    elif k == 'r':
                        b['r'] = 1
                    elif k == 'i':
                        b['i'] = 1
                    elif k == 'c':
                        b['c'] = 1
                    elif k == 't':
                        b['t'] = ints(vv)[0]
                    elif k == 'p':
                        b['ej'] = ('p', ints(vv)[0])
                    elif k == 'e':
                        x = v[0] if v else None
                        if isinstance(x, dict) and 'bloque' in x:
                            b['ej'] = ('b', x['bloque'])
                        elif isinstance(x, dict) and 'proc' in x:
                            b['ej'] = ('p', x['proc'])
                if b['cond'] == TODO:
                    b['cond'] = 0
            self.binds.append(b)
            return None
        return super().comando(s, args, ctx)

def detras(path):
    d = open(path, 'rb').read()
    h = lambda o, n: struct.unpack_from(f'<{n}h', d, o)
    I = lambda o: struct.unpack_from('<i', d, o)[0]
    n_groups = h(0, 8)[5]
    p_groups = I(16)
    out = []
    for g in range(n_groups):
        o = p_groups + g * 24
        n_trig = h(o, 1)[0]
        p_t = I(o + 16)
        primero = None
        for k in range(n_trig):
            if d[p_t + k * 32 + 29] == 255:
                primero = k
                break
        if primero is None:
            continue
        for k in range(primero, n_trig):
            o2 = p_t + k * 32
            b1 = h(o2, 4)
            b2 = h(o2 + 8, 4)
            s = h(o2 + 16, 6)
            out.append({'grupo': g, 'caja': [[b1[0], b1[2], b1[1]], [b2[0], b2[2], b2[1]]], 'trg': list(s[0:3]), 'pos': list(s[3:6])})
    return out

def ductos(st, nv=None):
    nv = nv or json.load(open(os.path.join(OUT, st, 'nivel.json'), encoding='utf-8'))
    mapas = {m['id']: m for m in nv['mapas']}
    out = []
    for mid in nv.get('visibles') or [nv.get('principal')]:
        for f in (mapas.get(mid) or {}).get('hzm_json', []):
            ruta = os.path.join(os.path.dirname(OUT), f)
            if not os.path.exists(ruta):
                continue
            for g in json.load(open(ruta, encoding='utf-8'))['grupos']:
                for t in g.get('triggers', []):
                    if t.get('tipo') == 'trap' and gcx.strcode(t.get('nombre') or '') == 29650 and (t['caja'] not in out):
                        out.append(t['caja'])
    return out
_CARGAS = None

def cargas():
    global _CARGAS
    if _CARGAS is None:
        try:
            import niveles
            _CARGAS = niveles.cargas_externas()
        except Exception:
            _CARGAS = {}
    return _CARGAS

def exportar(st):
    nv_path = os.path.join(OUT, st, 'nivel.json')
    sc = os.path.join(ST, st, 'cache', 'scenerio.gcx')
    if not os.path.exists(nv_path) or not os.path.exists(sc):
        return None
    nv = json.load(open(nv_path, encoding='utf-8'))
    script = gcx.leer(sc)
    e = gcl_vm.estado(st, cargas())
    vm = VMCam(script, horizonte=180)
    gcl_vm.aplicar_carga(vm, st, e)
    vm.correr()
    mapas = {m['id']: m for m in nv['mapas']}
    vis = nv.get('visibles') or [nv.get('principal')]
    archivos = []
    for mid in vis:
        for f in (mapas.get(mid) or {}).get('hzm_json', []):
            if f not in archivos:
                archivos.append(f)
    cajas = {}
    detras_l = []
    vistos = set()
    for f in archivos:
        base = os.path.basename(f).split('.')[0]
        crudo = os.path.join(ST, st, 'cache', base + '.hzm')
        if not os.path.exists(crudo):
            continue
        hz = hzm.leer(crudo)
        for g in hz['grupos']:
            for t in g['triggers']:
                if t['tipo'] != 'trap':
                    continue
                n = gcx.strcode(t['nombre'])
                cajas.setdefault(n, {'nombre': t['nombre'], 'cajas': []})
                if t['caja'] not in cajas[n]['cajas']:
                    cajas[n]['cajas'].append(t['caja'])
        if crudo not in vistos:
            vistos.add(crudo)
            detras_l += detras(crudo)
    trampas = []
    for b in vm.binds:
        if not b['ej']:
            continue
        k, obj = b['ej']
        if b['quien'] not in (0, SNAKE):
            continue
        t = {'cmd': b['cmd'], 'zona': b['zona'], 'nombre': cajas.get(b['zona'], {}).get('nombre'), 'cajas': cajas.get(b['zona'], {}).get('cajas', []), 'cond': b['cond'], **{x: b[x] for x in ('d', 's', 'b', 'r', 't', 'i', 'c') if x in b}}
        for nombre_ev, ev in (('entra', ENTRAR), ('sale', SALIR)):
            if b['cond'] not in (0, ev):
                continue
            sb = VMCam(script)
            sb.g[:] = vm.g
            sb.l[:] = vm.l
            sb.mapas = dict(vm.mapas)
            sb.orden_mapas = list(vm.orden_mapas)
            sb.mapa = b['mapa']
            try:
                sb.acc = []
                sb.binds = []
                sb.ejecutar(k, obj, [b['zona'], SNAKE, ev, 0, 0, 0, 1])
            except Exception:
                continue
            acc = [a for a in sb.acc]
            if acc:
                t[nombre_ev] = acc
        if 'entra' in t or 'sale' in t:
            trampas.append(t)
    datos = {'id': st, 'estado': e['etiqueta'], 'zoom': 320, 'inicial': vm.acc, 'trampas': trampas, 'detras': detras_l, 'ductos': ductos(st, nv)}
    json.dump(datos, open(os.path.join(OUT, st, 'camaras.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    return datos
if __name__ == '__main__':
    if '--solo-ductos' in sys.argv:
        sts = [a for a in sys.argv[1:] if not a.startswith('--')] or sorted((os.path.basename(os.path.dirname(f)) for f in glob.glob(os.path.join(OUT, '*', 'camaras.json'))))
        for st in sts:
            f = os.path.join(OUT, st, 'camaras.json')
            if not os.path.exists(f):
                continue
            d = json.load(open(f, encoding='utf-8'))
            d['ductos'] = ductos(st)
            json.dump(d, open(f, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
            if d['ductos']:
                print(f"{st}: {len(d['ductos'])} ductos")
        sys.exit(0)
    sts = sys.argv[1:] or sorted((os.path.basename(os.path.dirname(f)) for f in glob.glob(os.path.join(OUT, '*', 'nivel.json'))))
    for st in sts:
        try:
            d = exportar(st)
        except Exception as ex:
            print('ERROR', st, ex)
            continue
        if not d:
            continue
        ncam = sum((1 for t in d['trampas'] for k in ('entra', 'sale') for a in t.get(k, []) if 'camera' in a or 'evento' in a))
        print(f"{st}: {len(d['inicial'])} acciones al entrar, {len(d['trampas'])} trampas ({ncam} acciones de cámara), {len(d['detras'])} cajas 'detrás'")
