# MGS web — FeniXVOID · Project Ravenlight
import json
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gcl_vm
import niveles
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
NIV = os.path.join(ASSETS, 'niveles')
SALIDA = os.path.join(ASSETS, 'demos', 'cadenas.json')

class VMEventos(gcl_vm.VM):

    def correr(self):
        self.eventos = []
        return super().correr()

    def comando(self, s, args, ctx):
        c = s['cmd']
        if c in ('demo', 'radio'):
            o = self.opciones(s)
            if c == 'demo' and o.get('s'):
                sec = self.valor(o['s'][0], args)
                if isinstance(sec, int) and sec >= 0:
                    self.eventos.append({'demo': sec, 'pasada': self.pasada, 't': round(self.t / gcl_vm.FPS, 2)})
                elif isinstance(sec, int):
                    f = o.get('f')
                    self.eventos.append({'texto': f[0].get('str') if f and isinstance(f[0], dict) else None, 'pasada': self.pasada})
            if c == 'radio' and o.get('c'):
                vals = [self.valor(v, args) for v in o['c']]
                self.eventos.append({'radio': vals[0], 'radio_c': vals, 'pasada': self.pasada, 't': round(self.t / gcl_vm.FPS, 2)})
        return super().comando(s, args, ctx)

def seguir(dest, g, l, carga, prof=0):
    pasos = []
    while dest and dest[:1] in ('d', 'o') and (prof < 8):
        prof += 1
        try:
            sc = gcl_vm.leer_st(dest)
        except Exception as e:
            pasos.append({'st': dest, 'error': str(e)})
            break
        vm = VMEventos(sc, horizonte=600)
        gcl_vm.aplicar_carga(vm, dest, {'g': g, 'l': l, 'carga': carga})
        vm.correr()
        for ev in vm.eventos:
            pasos.append(dict(st=dest, **ev))
        if not vm.cargas:
            break
        carga = vm.cargas[-1]
        g, l = (bytes(vm.g), bytes(vm.l))
        dest = carga['a']
    return (pasos, dest, carga)

def salidas_de(st):
    script = gcl_vm.leer_st(st)
    e = gcl_vm.estado(st, niveles.CARGAS)
    vm = gcl_vm.VM(script, horizonte=180)
    gcl_vm.aplicar_carga(vm, st, e)
    vm.correr()

    def bloque_de(x):
        for a in x['args']:
            if isinstance(a, dict) and 'bloque' in a:
                return ('b', a['bloque'])
            if isinstance(a, dict) and a.get('opt') in ('e', 'p'):
                for v in a['v']:
                    if isinstance(v, dict) and 'bloque' in v:
                        return ('b', v['bloque'])
                    if isinstance(v, dict) and 'proc' in v:
                        return ('p', v['proc'])
        return None
    traps = []

    def vt(x, prof, ctx):
        if x.get('cmd') in ('trap', 'ntrap') and x['args'] and isinstance(x['args'][0], dict) and ('id' in x['args'][0]):
            ej = bloque_de(x)
            if ej:
                traps.append((x['args'][0]['id'], ej))
    niveles.recorrer(script['main'], vt)
    for b in script['procs'].values():
        niveles.recorrer(b, vt)
    out = []
    for zona, (k, ej) in traps:
        sb = gcl_vm.VM(script)
        sb.g[:] = vm.g
        sb.l[:] = vm.l
        sb.mapas = dict(vm.mapas)
        sb.orden_mapas = list(vm.orden_mapas)
        sb.set('$w:L0010', 0)
        sb.set('$w:L0012', 0)
        sb.set('$w:L0014', 0)
        try:
            sb.ejecutar(k, ej, [zona, 8650, 3538])
        except Exception:
            continue
        if not sb.cargas or not sb.cargas[0]['a'] or sb.cargas[0]['a'][:1] != 'd':
            continue
        via = sb.cargas[0]['a']
        pasos, destino, carga = seguir(via, bytes(sb.g), bytes(sb.l), sb.cargas[0])
        p = [x for x in (carga or {}).get('p', []) if isinstance(x, int)]
        out.append({'zona': zona, 'via': via, 'a': destino, 'pasos': pasos})
    return out

def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    niveles.CARGAS.update(niveles.cargas_externas())
    res = {'entrada': {}, 'entrada_cadena': {}, 'salidas': {}, 'apertura': None, 'partida_nueva': None, 'sectores': {}}
    for st in sorted(os.listdir(NIV)):
        p = os.path.join(NIV, st, 'nivel.json')
        if not os.path.exists(p):
            continue
        nv = json.load(open(p, encoding='utf-8'))
        if nv.get('demos'):
            res['entrada'][st] = [{k: d.get(k) for k in ('sector', 't', 'pasada', 'proc')} for d in nv['demos']]
        if any((s.get('via') for s in nv.get('salidas', []))):
            try:
                sal = salidas_de(st)
            except Exception as e:
                print('  !', st, e)
                continue
            zonas = {(s['zona'], s.get('via')) for s in nv['salidas'] if s.get('via')}
            sal = [s for s in sal if (s['zona'], s['via']) in zonas]
            vistos, uni = (set(), [])
            for s in sal:
                k = (s['zona'], s['via'])
                if k not in vistos:
                    vistos.add(k)
                    uni.append(s)
            uni = [s for s in uni if s['a'][:1] == 's']
            if uni:
                res['salidas'][st] = uni
            for s in uni:
                print('%s -> %s via %s: %s' % (st, s['a'], s['via'], ', '.join(('%s:%s' % (x['st'], x.get('demo', 'radio %s' % x.get('radio'))) for x in s['pasos']))))
    for st in sorted(res['entrada']):
        if st[:1] not in ('d', 'o'):
            continue
        e = gcl_vm.estado(st, niveles.CARGAS)
        pasos, destino, _ = seguir(st, e['g'], e['l'], e['carga'])
        res['entrada_cadena'][st] = {'pasos': pasos, 'destino': destino if destino != st else None, 'estado': e['etiqueta']}
        print('entrada %s (%s): %s -> %s' % (st, e['etiqueta'], ', '.join(('%s:%s' % (x['st'], x.get('demo', 'radio %s' % x.get('radio'))) for x in pasos)), destino))
    e = gcl_vm.estado('opening', niveles.CARGAS)
    pasos, destino, _ = seguir('opening', e['g'], e['l'], e['carga'])
    res['apertura'] = {'pasos': pasos, 'destino': destino, 'estado': e['etiqueta']}
    print('apertura (%s): %s -> %s' % (e['etiqueta'], ', '.join(('%s:%s' % (x['st'], x.get('demo', x.get('radio'))) for x in pasos)), destino))
    e = gcl_vm.estado('d00a', niveles.CARGAS)
    pasos, destino, _ = seguir('d00a', e['g'], e['l'], e['carga'])
    res['partida_nueva'] = {'pasos': pasos, 'destino': destino, 'estado': e['etiqueta']}
    print('partida nueva (%s): %s -> %s' % (e['etiqueta'], ', '.join(('%s:%s' % (x['st'], x.get('demo', x.get('radio'))) for x in pasos)), destino))
    for h in json.load(open(os.path.join(DOCS, 'demo', 'demos_scripts.json'), encoding='utf-8')):
        if h.get('disco') == 1 and isinstance(h.get('sector'), int) and (h['sector'] >= 0) and (h.get('script') == 'scenerio.gcx'):
            ref = {'stage': h['stage'], 'proc': h['proc'], 'proc_fin': h['proc_fin'], 'dmo': h['archivo_dmo'] or None}
            lst = res['sectores'].setdefault(str(h['sector']), [])
            if ref not in lst:
                lst.append(ref)
    json.dump(res, open(SALIDA, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('escrito', SALIDA)
if __name__ == '__main__':
    main()
