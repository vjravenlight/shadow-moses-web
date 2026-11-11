# MGS web — FeniXVOID · Project Ravenlight
import os, sys, json, struct
sys.path.insert(0, os.path.dirname(__file__))
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
import gcx, hzm
import camaras_export as ce
import vr_export as ve
from niveles import indice
OUT = os.path.join(ASSETS, 'vr')
ENTRAR, SALIR, SNAKE = (ce.ENTRAR, ce.SALIR, ce.SNAKE)

class VMEv(ce.VMCam):

    def comando(self, s, args, ctx):
        c = s['cmd']
        o = self.opciones(s)
        if c == 'chara' and s['args'] and isinstance(s['args'][0], dict) and ('id' in s['args'][0]):
            self.ev.append({'t': self.t, 'chara': gcx.CHARAS.get(s['args'][0]['id'], {}).get('nombre', '%04x' % s['args'][0]['id'])})
        elif c in ('pad', 'sound'):
            self.ev.append({'t': self.t, c: {k: ce.ints(self.resolver(v, args)) for k, v in o.items()}})
        elif c == 'mesg' and s['args']:
            self.ev.append({'t': self.t, 'mesg': ce.ints(self.resolver([x for x in s['args'] if not (isinstance(x, dict) and 'opt' in x)], args))})
        return super().comando(s, args, ctx)

    def correr1(self):
        self.ev = []
        return super().correr1()

    def ejecutar(self, *a, **k):
        self.ev = []
        return super().ejecutar(*a, **k)

def correr(script, modo, base):
    vm = VMEv(script, horizonte=60)
    vm.g[:] = base[0]
    vm.l[:] = base[1]
    vm.set(ve.G_MODO, modo)
    if modo == 4:
        vm.set(ve.G_TIEMPO, 0)
        vm.set(ve.G_LIMITE, 12600)
    vm.correr()
    return vm

def caja_sandbox(script, vm, k, obj, args):
    sb = VMEv(script, horizonte=60)
    sb.g[:] = vm.g
    sb.l[:] = vm.l
    sb.mapas = dict(vm.mapas)
    sb.orden_mapas = list(vm.orden_mapas)
    sb.mapa = vm.mapa
    try:
        sb.acc = []
        sb.binds = []
        sb.ejecutar(k, obj, args)
    except Exception as e:
        print('   (sandbox)', e)
    return sb

def proc_de(v):
    x = v[0] if v else None
    return x['proc'] if isinstance(x, dict) and 'proc' in x else None

def sala(st, modo, base):
    script = ve.leer(st)
    vm = correr(script, modo, base)
    idx = indice(st)
    crudos = []
    for mid in vm.orden_mapas:
        o = ve.opciones(vm.mapas[mid])
        for v in o.get('h', []):
            if isinstance(v, dict) and 'id' in v:
                f = idx.get(('hzm', v['id']))
                if f and f not in crudos:
                    crudos.append(f)
    cajas = {}
    detras = []
    ductos = []
    for f in crudos:
        hz = hzm.leer(f)
        for g in hz['grupos']:
            for t in g['triggers']:
                if t['tipo'] != 'trap':
                    continue
                n = gcx.strcode(t['nombre'])
                cajas.setdefault(n, {'nombre': t['nombre'], 'cajas': []})
                if t['caja'] not in cajas[n]['cajas']:
                    cajas[n]['cajas'].append(t['caja'])
                if n == 29650 and t['caja'] not in ductos:
                    ductos.append(t['caja'])
        detras += ce.detras(f)
    trampas = []
    for b in vm.binds:
        if not b['ej'] or b['quien'] not in (0, SNAKE):
            continue
        k, obj = b['ej']
        t = {'cmd': b['cmd'], 'zona': b['zona'], 'nombre': cajas.get(b['zona'], {}).get('nombre'), 'cajas': cajas.get(b['zona'], {}).get('cajas', []), 'cond': b['cond'], **{x: b[x] for x in ('d', 's', 'b', 'r', 't', 'i', 'c') if x in b}}
        for nombre_ev, ev in (('entra', ENTRAR), ('sale', SALIR)):
            if b['cond'] not in (0, ev):
                continue
            sb = caja_sandbox(script, vm, k, obj, [b['zona'], SNAKE, ev, 0, 0, 0, 1])
            sb.mapa = b['mapa']
            if sb.acc:
                t[nombre_ev] = list(sb.acc)
        if 'entra' in t or 'sale' in t:
            trampas.append(t)
    ventana = []
    llegada = []
    ventana_ev = []
    llegada_ev = []
    win = next((a for a in vm.actores if a['tipo'] == 'VRWINDOW'), None)
    if win and proc_de(win['opts'].get('p')) is not None:
        sb = caja_sandbox(script, vm, 'p', proc_de(win['opts']['p']), [])
        ventana = sb.acc
        ventana_ev = sb.ev
    vr = next((a for a in vm.actores if a['tipo'] == 'VR'), None)
    if vr and proc_de(vr['opts'].get('e')) is not None:
        sb = caja_sandbox(script, vm, 'p', proc_de(vr['opts']['e']), [600, 1, 2, 3])
        llegada = sb.acc
        llegada_ev = sb.ev
    return {'id': st, 'estado': 'VR modo %d (%s)' % (modo, ve.MODOS[modo]), 'zoom': 320, 'inicial': vm.acc, 'trampas': trampas, 'detras': detras, 'ductos': ductos, 'ventana': ventana, 'llegada': llegada, 'ventana_ev': ventana_ev, 'llegada_ev': llegada_ev, 'inicial_ev': [e for e in vm.ev if e['t'] > 0], 'hzm': [os.path.basename(f) for f in crudos]}
if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    pedidas = [a for a in sys.argv[1:] if not a.startswith('--')] or ve.SALAS
    base = ve.memoria_inicial()
    for st in pedidas:
        os.makedirs(os.path.join(OUT, st), exist_ok=True)
        for modo in (5,) if '--demo' in sys.argv else range(6):
            d = sala(st, modo, base)
            json.dump(d, open(os.path.join(OUT, st, 'camaras_%d.json' % modo), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
            cam = [a for a in d['inicial'] if 'camera' in a]
            ev = lambda L: ' '.join(('%d:%s%s' % (a['t'], 'cam%d' % a['evento']['cam'], '+' if a['evento']['ev'] == 'entra' else '-') for a in L if 'evento' in a))
            r = next((a['camera'] for a in cam if a['camera'].get('r')), {})
            print(f"{st} m{modo}: hzm {d['hzm']} -r {r.get('r')} -t {r.get('t')}  inicial [{ev(d['inicial'])}]  ventana [{ev(d['ventana'])}]  llegada [{ev(d['llegada'])}]  trampas {len(d['trampas'])}  detrás {len(d['detras'])}")
