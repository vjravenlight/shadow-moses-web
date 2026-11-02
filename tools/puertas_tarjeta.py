# MGS web — FeniXVOID · Project Ravenlight
import os, sys, json, glob, struct
sys.path.insert(0, os.path.dirname(__file__))
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
import gcx
RAIZ = os.path.join(os.path.dirname(__file__), '..')
ST = os.path.join(EXTRAIDO, 'disco1', '01_stages')
NIV = os.path.join(ASSETS, 'niveles')
SNAKE = 8650
TODOS = 5321
ENTER = 3538
CARD, ITEM = ('$w:L006c', '$w:L001e')

def es_arg(v):
    return isinstance(v, dict) and 'arg' in v

def es_id(v):
    return isinstance(v, dict) and 'id' in v

def condicion_tarjeta(expr):
    t = expr
    nivel = None
    equipada = False
    no_snake = None
    for i in range(len(t) - 2):
        a, b, c = (t[i], t[i + 1], t[i + 2])
        if isinstance(a, dict) and a.get('var') == CARD and isinstance(c, dict) and (c.get('op') == 14):
            nivel = b if isinstance(b, int) else ('arg', b['arg']) if es_arg(b) else None
        if isinstance(a, dict) and a.get('var') == ITEM and (b == 17) and isinstance(c, dict) and (c.get('op') == 9):
            equipada = True
        if es_arg(a) and es_id(b) and (b['id'] == SNAKE) and isinstance(c, dict) and (c.get('op') == 10):
            no_snake = ('arg', a['arg'])
    if nivel is None:
        return None
    return {'nivel': nivel, 'equipada': equipada, 'no_snake': no_snake}

def es_evento_entrar(expr):
    return len(expr) >= 3 and es_arg(expr[0]) and es_id(expr[1]) and (expr[1]['id'] == ENTER) and isinstance(expr[2], dict) and (expr[2].get('op') == 9)

def ramas_if(args):
    out = []
    if len(args) >= 2 and 'expr' in args[0] and ('bloque' in args[1]):
        out.append((args[0]['expr'], args[1]['bloque'], False))
    for o in args[2:]:
        if isinstance(o, dict) and o.get('opt') == 'i' and (len(o['v']) >= 2):
            out.append((o['v'][0].get('expr', []), o['v'][1].get('bloque', []), False))
        if isinstance(o, dict) and o.get('opt') == 'e' and o['v'] and ('bloque' in o['v'][0]):
            out.append((None, o['v'][0]['bloque'], True))
    return out

class Recorrido:

    def __init__(self, script):
        self.s = script
        self.hallazgos = []
        self.llamadas = []

    def bloque(self, b, ctx):
        for st in b:
            if 'call' in st:
                self.llamadas.append((st['call'], st['args'], ctx))
                continue
            cmd = st.get('cmd')
            args = st.get('args', [])
            if cmd == 'if':
                previas = []
                for expr, sub, es_else in ramas_if(args):
                    c = dict(ctx)
                    if expr is not None:
                        ct = condicion_tarjeta(expr)
                        if ct:
                            c['tarjeta'] = ct
                        if es_evento_entrar(expr):
                            c['salir'] = False
                    for pe in previas:
                        if condicion_tarjeta(pe):
                            c['rechazo'] = True
                        if es_evento_entrar(pe):
                            c['salir'] = True
                    self.bloque(sub, c)
                    if expr is not None:
                        previas.append(expr)
                continue
            if cmd in ('ntrap', 'trap'):
                c = dict(ctx)
                if args and es_id(args[0]):
                    c['trap'] = args[0]['id']
                if len(args) > 1 and es_id(args[1]):
                    c['quien'] = args[1]['id']
                for a in args:
                    if isinstance(a, dict) and 'bloque' in a:
                        self.bloque(a['bloque'], c)
                    if isinstance(a, dict) and 'opt' in a:
                        for v in a['v']:
                            if isinstance(v, dict) and 'bloque' in v:
                                self.bloque(v['bloque'], c)
                            if a['opt'] == 'p' and isinstance(v, dict) and ('proc' in v):
                                self.llamadas.append((v['proc'], [{'arg': k} for k in range(1, 8)], c))
                continue
            if cmd == 'mesg' and len(args) >= 2:
                self.hallazgos.append((ctx, args))
            for a in args:
                if isinstance(a, dict) and 'bloque' in a:
                    self.bloque(a['bloque'], ctx)
                if isinstance(a, dict) and 'opt' in a:
                    for v in a['v']:
                        if isinstance(v, dict) and 'bloque' in v:
                            self.bloque(v['bloque'], ctx)

def resolver(v, args):
    if es_arg(v):
        k = v['arg'] - 1
        return args[k] if 0 <= k < len(args) else None
    return v

def analizar(st, nivel_json):
    f = os.path.join(ST, st, 'cache', 'scenerio.gcx')
    if not os.path.exists(f):
        return None
    s = gcx.leer(f)
    puertas = {a['nombre']: a for a in nivel_json['actores'] if a['tipo'] in ('DOOR', 'DOOR2')}
    if not puertas:
        return {'puertas': []}
    R = Recorrido(s)
    R.bloque(s['main'], {'proc': None})
    for pid, b in s['procs'].items():
        if isinstance(b, list) and b and ('error' not in b[0]):
            R.bloque(b, {'proc': pid})
    llamadas = {}
    for pid, args, ctx in R.llamadas:
        llamadas.setdefault(pid, []).append((args, ctx))
    res = {}

    def anotar(nombre, ctx, tarjeta):
        if nombre not in puertas:
            return
        r = res.setdefault(nombre, {'abre': [], 'tarjetas': []})
        if tarjeta:
            r['tarjetas'].append({**tarjeta, 'trap': ctx.get('trap'), 'quien': ctx.get('quien'), 'proc': ctx.get('proc')})
        else:
            r['abre'].append({'trap': ctx.get('trap'), 'quien': ctx.get('quien'), 'proc': ctx.get('proc')})
    for ctx, args in R.hallazgos:
        if ctx.get('rechazo') or ctx.get('salir'):
            continue
        destino, evento = (args[0], args[1])
        if not es_arg(evento):
            continue
        tj = ctx.get('tarjeta')
        if ctx['proc'] is None or (es_id(destino) and (not (tj and isinstance(tj['nivel'], tuple)))):
            if es_id(destino):
                if tj and isinstance(tj['nivel'], tuple):
                    continue
                c2 = ctx
                if ctx['proc'] is not None and 'trap' not in ctx:
                    for _, cctx in llamadas.get(ctx['proc'], []):
                        if 'trap' in cctx:
                            c2 = {**ctx, 'trap': cctx['trap'], 'quien': cctx.get('quien')}
                            break
                anotar(destino['id'], c2, tj and {'nivel': tj['nivel'], 'equipada': tj['equipada'], 'guardias': tj['no_snake'] is not None})
            continue
        for cargs, cctx in llamadas.get(ctx['proc'], []):
            d = resolver(destino, cargs)
            if not es_id(d):
                continue
            c2 = {**cctx, 'proc': ctx['proc']}
            if tj:
                n = tj['nivel']
                if isinstance(n, tuple):
                    n = resolver({'arg': n[1]}, cargs)
                if not isinstance(n, int):
                    continue
                anotar(d['id'], c2, {'nivel': n, 'equipada': tj['equipada'], 'guardias': tj['no_snake'] is not None})
            else:
                anotar(d['id'], c2, None)
    cajas = {}
    vistos = set()
    for m in nivel_json['mapas']:
        for hz in m.get('hzm_json') or []:
            if hz in vistos:
                continue
            vistos.add(hz)
            p = os.path.join(ASSETS, hz)
            if not os.path.exists(p):
                continue
            h = json.load(open(p))
            for g in h['grupos']:
                for t in g['triggers']:
                    if t.get('tipo') == 'trap' and t.get('nombre'):
                        e = cajas.setdefault(gcx.strcode(t['nombre']), {'nombre': t['nombre'], 'cajas': []})
                        if t['caja'] not in e['cajas']:
                            e['cajas'].append(t['caja'])
    salida = []
    for nombre, a in puertas.items():
        r = res.get(nombre)
        info = {'nombre': nombre, 'tipo': a['tipo'], 'p': a.get('p'), 'd': a.get('d')}
        if r and r['tarjetas']:
            t = max(r['tarjetas'], key=lambda x: x['nivel'])
            info.update(nivel=t['nivel'], equipada=t['equipada'], guardias=t['guardias'] and t.get('quien') != SNAKE, solo_snake=t.get('quien') == SNAKE, via='proc_%04x' % t['proc'] if t['proc'] is not None else 'main')
            tr = t.get('trap')
        elif r and r['abre']:
            t = r['abre'][0]
            info.update(nivel=0, equipada=False, guardias=t.get('quien') != SNAKE, solo_snake=t.get('quien') == SNAKE, via='proc_%04x' % t['proc'] if t['proc'] is not None else 'main')
            tr = t.get('trap')
        else:
            info.update(nivel=None, evento=True)
            tr = None
        if tr is not None:
            info['trap'] = cajas.get(tr, {}).get('nombre') or '#%04x' % tr
            if tr in cajas:
                info['cajas'] = cajas[tr]['cajas']
        salida.append(info)
    return {'puertas': salida}

def estado_entrada(st):
    try:
        import gcl_vm
        e = gcl_vm.estado(st)
    except Exception as ex:
        return {'error': str(ex)}
    l, g = (e['l'], e['g'])
    w = lambda i: struct.unpack_from('<h', l, i * 2)[0]
    return {'etiqueta': e['etiqueta'], 'vida_max': w(12), 'armas': [w(17 + i) for i in range(10)], 'armas_max': [w(27 + i) for i in range(10)], 'items': [w(37 + i) for i in range(24)], 'items_max': [w(61 + i) for i in range(3)], 'nivel_historia': struct.unpack_from('<h', g, 68)[0]}
REGLA = 'La puerta se abre cuando entra alguien a su trampa si GM_CardFlag >= nivel y (el que entra no es Snake o Snake tiene la tarjeta (CARD) equipada). nivel 0 = sin tarjeta; nivel null = la abre un evento del script. solo_snake: la trampa sólo reacciona a Snake. Con la tarjeta equipada pero de menos nivel: zumbador (sound 35).'

def main():
    sts = sys.argv[1:] or sorted((os.path.basename(os.path.dirname(p)) for p in glob.glob(os.path.join(NIV, '*', 'nivel.json'))))
    total = con = 0
    for st in sts:
        p = os.path.join(NIV, st, 'nivel.json')
        if not os.path.exists(p):
            continue
        nv = json.load(open(p, encoding='utf-8'))
        r = analizar(st, nv)
        if r is None:
            continue
        r = {'regla': REGLA, **r, 'estado_entrada': estado_entrada(st) if st[:1] == 's' else None}
        json.dump(r, open(os.path.join(NIV, st, 'puertas.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        n = [x for x in r['puertas'] if x.get('nivel')]
        total += len(r['puertas'])
        con += len(n)
        if r['puertas']:
            print(f"{st}: {len(r['puertas'])} puertas, con tarjeta: " + ', '.join((f"{x['nombre']}=L{x['nivel']}" for x in n)))
    print(f'total {total} puertas, {con} con tarjeta')
if __name__ == '__main__':
    main()
