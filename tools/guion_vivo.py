# MGS web — FeniXVOID · Project Ravenlight
import collections
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
import glob
import json
import os
import re
import sys
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gcx
import gcl_vm
import niveles
import codec_niveles
ST = os.path.join(EXTRAIDO, 'disco1', '01_stages')
NIV = os.path.join(ASSETS, 'niveles')
OUT = os.path.join(ASSETS, 'guion', 'st')
DOC = os.path.join(DOCS, 'guion_vivo_cobertura.md')

def _valor(v, kde):
    if isinstance(v, dict):
        if 'bloque' in v:
            return {'bloque': _bloque(v['bloque'], kde)}
        if 'opt' in v:
            return {'opt': v['opt'], 'v': [_valor(x, kde) for x in v['v']]}
        if 'id' in v:
            return {'id': v['id']}
        if 'expr' in v:
            return {'expr': [_valor(x, kde) for x in v['expr']]}
        return dict(v)
    return v

def _bloque(b, kde):
    out = []
    for s in b:
        if 'cmd' in s:
            n = {'cmd': s['cmd'], 'args': [_valor(a, kde) for a in s['args']]}
            if id(s) in kde:
                n['k'] = kde[id(s)]
                n['tipo'] = gcx.CHARAS.get(s['args'][0]['id'], {}).get('nombre', '%04x' % s['args'][0]['id'])
            out.append(n)
        elif 'call' in s:
            out.append({'call': s['call'], 'args': [_valor(a, kde) for a in s['args']]})
        elif 'eval' in s:
            out.append({'eval': [_valor(x, kde) for x in s['eval']]})
        else:
            out.append(s)
    return out

def numerar_charas(script):
    kde = {}

    def v(s, prof, ctx):
        if s.get('cmd') == 'chara' and s['args'] and isinstance(s['args'][0], dict) and ('id' in s['args'][0]):
            kde[id(s)] = len(kde)
    niveles.recorrer(script['main'], v)
    for b in script['procs'].values():
        niveles.recorrer(b, v)
    return kde

class VMRegistro(gcl_vm.VM):

    def __init__(self, *a, **k):
        super().__init__(*a, **k)
        self.vistas = set()

    def comando(self, s, args, ctx):
        self.vistas.add(id(s))
        return super().comando(s, args, ctx)

def correr_entrada(st, script, estado):
    vm = VMRegistro(script, horizonte=180)
    gcl_vm.aplicar_carga(vm, st, estado)
    vm.correr()
    return vm

def orden_nivel(script, vm, kde):
    ejecutados = {a['_s'] for a in vm.actores}
    estaticos = []

    def v(s, prof, ctx):
        if id(s) in kde:
            estaticos.append(s)
    niveles.recorrer(script['main'], v)
    for b in script['procs'].values():
        niveles.recorrer(b, v)
    return [kde[a['_s']] for a in vm.actores] + [kde[id(s)] for s in estaticos if id(s) not in ejecutados]

def validar(st, orden, script, kde):
    f = os.path.join(NIV, st, 'nivel.json')
    if not os.path.exists(f):
        return (False, 'sin nivel.json')
    nv = json.load(open(f, encoding='utf-8'))
    acts = nv.get('actores', [])
    if len(acts) != len(orden):
        return (False, 'nivel.json tiene %d actores y el script da %d' % (len(acts), len(orden)))
    porK = {}

    def v(s, prof, ctx):
        if id(s) in kde:
            porK[kde[id(s)]] = s
    niveles.recorrer(script['main'], v)
    for b in script['procs'].values():
        niveles.recorrer(b, v)
    for i, (a, k) in enumerate(zip(acts, orden)):
        s = porK[k]
        tipo = gcx.CHARAS.get(s['args'][0]['id'], {}).get('nombre', '#%04x' % s['args'][0]['id'])
        nombre = s['args'][1]['id'] if len(s['args']) > 1 and isinstance(s['args'][1], dict) and ('id' in s['args'][1]) else None
        if a.get('tipo') != tipo or a.get('nombre') != nombre:
            return (False, 'actor %d: nivel.json %s/%s, script %s/%s' % (i, a.get('tipo'), a.get('nombre'), tipo, nombre))
    return (True, '')

def escenario(st, cargas):
    path = os.path.join(ST, st, 'cache', 'scenerio.gcx')
    if not os.path.exists(path):
        return (None, None)
    script = gcx.leer(path)
    kde = numerar_charas(script)
    vm = None
    try:
        e = gcl_vm.estado(st, cargas)
        vm0 = gcl_vm.VM(script)
        gcl_vm.aplicar_carga(vm0, st, e)
        g = [[i, b] for i, b in enumerate(vm0.g) if b]
        l = [[i, b] for i, b in enumerate(vm0.l) if b]
        etiqueta = e['etiqueta']
        vm = correr_entrada(st, script, e)
    except Exception as ex:
        g, l, etiqueta = ([], [], 'sin estado (%s)' % ex)
    orden, ok, motivo = (None, False, 'sin VM')
    if vm is not None:
        orden = orden_nivel(script, vm, kde)
        ok, motivo = validar(st, orden, script, kde)
    zs = codec_niveles.zonas_de_trampa(script)
    d = {'st': st, 'estado': etiqueta, 'vars': {'g': g, 'l': l}, 'main': _bloque(script['main'], kde), 'procs': {'%04x' % k: _bloque(v, kde) for k, v in script['procs'].items()}, 'zonas': codec_niveles.cajas(st, zs), 'nivel': orden if ok else None}
    d['resumen'] = {'charas': len(kde), 'trampas': len(zs), 'zonas_con_caja': len(d['zonas']), 'gameover': codec_niveles.sistema_g(script), 'nivel_ok': ok, 'nivel_motivo': motivo}
    return (d, (script, vm, kde))

def _opts(s):
    return {a['opt']: a['v'] for a in s.get('args', []) if isinstance(a, dict) and 'opt' in a}

def _hijos(s):
    out = []
    for a in s.get('args', []) or []:
        if isinstance(a, dict) and 'bloque' in a:
            out.append((None, a['bloque']))
        if isinstance(a, dict) and 'opt' in a:
            for v in a['v']:
                if isinstance(v, dict) and 'bloque' in v:
                    out.append((a['opt'], v['bloque']))
    return out

def _procs_en(s):
    out = []
    for a in s.get('args', []) or []:
        vals = a['v'] if isinstance(a, dict) and 'opt' in a else [a]
        for v in vals:
            if isinstance(v, dict) and 'proc' in v:
                out.append((a.get('opt') if isinstance(a, dict) else None, v['proc']))
    return out
CREACION = {'COMMANDER': set('nmcs'), 'ZAKOCOM': set('nmcs'), 'ZAKO10COM': set('nmcs'), 'ZAKO11ACOM': set('nmcs'), 'ZAKO11ECOM': set('nmcs'), 'ZAKO11FCOM': set('nmcs'), 'ZAKO14COM': set('nmcs'), 'ZAKO19COM': set('nmcs')}

def recorrer_cobertura(script):
    procs = script['procs']
    entrada, juego = (set(), set())
    nodos = {}

    def marcar(b, conjunto, pila):
        for s in b:
            if id(s) in conjunto:
                continue
            conjunto.add(id(s))
            nodos[id(s)] = s
            if 'call' in s:
                p = s['call'] & 65535
                if p in procs and ('p', p) not in pila:
                    marcar(procs[p], conjunto, pila | {('p', p)})
                continue
            if 'cmd' not in s:
                continue
            c = s['cmd']
            tipo = gcx.CHARAS.get(s['args'][0].get('id'), {}).get('nombre') if c == 'chara' and s['args'] and isinstance(s['args'][0], dict) else None
            for letra, hb in _hijos(s):
                disparador = c in ('trap', 'ntrap', 'delay') or (c == 'chara' and letra not in CREACION.get(tipo, ()))
                if c in ('if', 'foreach', 'eval') or not disparador:
                    marcar(hb, conjunto, pila)
                else:
                    marcar(hb, juego, pila)
            for letra, p in _procs_en(s):
                p &= 65535
                if p not in procs or ('p', p) in pila:
                    continue
                if c == 'chara' and letra in CREACION.get(tipo, ()):
                    marcar(procs[p], conjunto, pila | {('p', p)})
                else:
                    marcar(procs[p], juego, pila | {('p', p)})
    marcar(script['main'], entrada, frozenset())
    return (entrada, juego, nodos)

def cmd_soporte(c, o):
    TABLA = {'if': ('sí', ''), 'eval': ('sí', ''), 'return': ('sí', ''), 'foreach': ('sí', ''), 'radio': ('sí', 'códec (codec_gcl.js)'), 'system': ('sí', ''), 'rand': ('sí', ''), 'delay': ('sí', ''), 'trap': ('sí', ''), 'ntrap': ('sí', '-d/-s/-b con el estado de Snake'), 'varsave': ('sí', 'punto de guardado (API de partida)'), 'restart': ('sí', '-p, -s; no recarga la escena'), 'load': ('sí', 'salidas que ya maneja el visor no se repiten'), 'demo': ('sí', ''), 'jimaku': ('parcial', 'corre -e; el texto no se muestra'), 'light': ('sí', 'luz de personajes y sombra; la del escenario está horneada'), 'sound': ('sí', '-k/-r/-l (ruidos) sólo se anotan'), 'map': ('parcial', '-a, -b, -p/-m (mapas visibles); -s/-c/-d sin efecto'), 'camera': ('parcial', 'a la cámara del juego fuera de trampas'), 'mesg': ('parcial', 'ver tabla de destinos'), 'chara': ('parcial', 'ver tabla de tipos'), 'pad': ('parcial', 'callback pad (traba de controles)'), 'menu': ('parcial', 'callback menu (radar, vida)'), 'func': ('parcial', '-s -a -m -c; -v y -p dan 0'), 'mapdef': ('—', 'sólo al entrar'), 'start': ('—', 'menús'), 'print': ('—', 'traza'), 'demodebug': ('no', '')}
    return TABLA.get(c, ('no', ''))
TIPOS_VISOR = {'WATCHER', 'ITEM', 'SPHERE', 'SPHERE2', 'SNOW', 'SNOWAREA', 'TELOP', 'RIPPLES', 'PATOLAMP', 'RSURFACE', 'PUT_OBJECT', 'DOOR', 'ELEVATOR', 'DYNWALL'}
TIPOS_SENSOR = {'CAMERA', 'CAMERA2', 'CAMERAGUN', 'CLAYMORE', 'CENSOR', 'SEARCHLIGHT', 'KIKENKUN'}
TIPOS_GUION = {'COMMANDER': 'corre -n -m -c -s; -z al quedarse sin guardias', 'CAT_IN': 'corte de cámara', 'CAMERASHAKE': 'efecto (callback, sin manejador por defecto)', 'FADEIO': 'fundido', 'PADVIBRATE': 'vibración', 'CINEMA': 'barras de cine', 'SNAKE': 'reubica a Snake (colocarSnake)'}
MESG_OK = {'DOOR': 'entra/sale (abre/cierra), kill', 'ELEVATOR': 'acdc/085b/804b/dbc9 (subir/bajar)', 'WATCHER': '430f ruta, f1bd/1dc4 desaparece/aparece, kill', 'CAMERA': 'kill, entra/sale', 'CAMERAGUN': 'kill', 'CENSOR': 'kill, dcfc/e102', 'KIKENKUN': 'entra/sale', 'CAMERA2': 'kill', 'WALL': 'kill', 'PUT_OBJECT': 'kill', 'DEMODOLL': 'kill', 'ITEM': 'kill', 'COMMANDER': 'kill', 'CAT_IN': 'kill', 'DYNWALL': 'off (se borra)', 'FADEIO': 'kill, 71f1 (aclara)', 'CINEMA': 'd420/745d (se van las barras)', 'SISTEMA_CAMARA': 'mesg #c356 n entra/sale (cámara del juego)'}

def cobertura(sts, datos):
    filas = []
    tot_cmd = collections.Counter()
    tot_tipo = collections.Counter()
    tot_mesg = collections.Counter()
    for st in sts:
        if st not in datos:
            continue
        d, (script, vm, kde) = datos[st]
        entrada, juego, nodos = recorrer_cobertura(script)
        corridas = vm.vistas if vm is not None else set()
        nombres = collections.defaultdict(set)
        for s in nodos.values():
            if s.get('cmd') == 'chara' and len(s['args']) > 1 and isinstance(s['args'][1], dict) and ('id' in s['args'][1]):
                nombres[s['args'][1]['id']].add(gcx.CHARAS.get(s['args'][0].get('id'), {}).get('nombre', '?'))
        cmds = collections.Counter()
        tipos = collections.Counter()
        mesgs = collections.Counter()
        solo = 0
        plantilla_modelo = {}
        f = os.path.join(NIV, st, 'nivel.json')
        if d.get('nivel') and os.path.exists(f):
            acts = json.load(open(f, encoding='utf-8'))['actores']
            for a, k in zip(acts, d['nivel']):
                if a.get('modelo'):
                    plantilla_modelo[k] = True
        for i in juego:
            s = nodos[i]
            if 'cmd' not in s:
                continue
            c = s['cmd']
            cmds[c] += 1
            if i not in corridas:
                solo += 1
            if c == 'chara' and s['args'] and isinstance(s['args'][0], dict) and ('id' in s['args'][0]):
                t = gcx.CHARAS.get(s['args'][0]['id'], {}).get('nombre', '#%04x' % s['args'][0]['id'])
                con = plantilla_modelo.get(kde.get(i))
                tipos[t, bool(con)] += 1
            if c == 'mesg' and s['args']:
                dst = s['args'][0]
                if isinstance(dst, dict) and 'id' in dst:
                    if dst['id'] == 50006:
                        tt = 'SISTEMA_CAMARA'
                    elif dst['id'] == 8650:
                        tt = 'SNAKE'
                    else:
                        tt = '/'.join(sorted(nombres.get(dst['id'], []))) or 'sin actor #%04x' % dst['id']
                elif isinstance(dst, dict) and 'arg' in dst:
                    tt = 'argumento (puerta/zona de la trampa)'
                else:
                    tt = '?'
                mesgs[tt] += 1
        filas.append((st, d, cmds, tipos, mesgs, solo, len([i for i in juego if 'cmd' in nodos[i]])))
        tot_cmd.update(cmds)
        for (t, con), n in tipos.items():
            tot_tipo[t, con] += n
        tot_mesg.update(mesgs)

    def sop_tipo(t, con):
        if t in TIPOS_VISOR:
            return 'sí'
        if t in TIPOS_SENSOR:
            return 'sí (sensores)'
        if t in TIPOS_GUION:
            return 'sí (' + TIPOS_GUION[t] + ')'
        if con:
            return 'objeto quieto'
        return 'no'

    def sop_mesg(t):
        if t in MESG_OK:
            return 'sí: ' + MESG_OK[t]
        if t.startswith('argumento'):
            return 'sí: puertas (trampa reenviada)'
        if any((x in MESG_OK for x in t.split('/'))):
            return 'parcial'
        return 'no'
    L = []
    L.append('# Guion en vivo: cobertura por escenario (disco 1)\n')
    L.append('Generado por `python tools/guion_vivo.py --cobertura`. Cuenta las sentencias que corren **durante el juego**: las que se alcanzan desde un disparador (trampa `trap`/`ntrap`, `delay`, callback del códec `radio -p`, `demo -p`, `system`, `sound -v -f`, opciones de un actor como el `-x` de un ITEM o el `-e` de una cámara, o procs que el script le pasa a un actor). No cuenta lo que corre sólo al entrar (eso ya lo resuelve `tools/niveles.py` en `nivel.json`). Una sentencia alcanzable desde la entrada y desde un disparador cuenta como "juego" (puede volver a correr).\n')
    L.append('Soporte = lo que hace `visor/guion_vivo.js` con el manejador por defecto (`manejadorMensajes`) y los callbacks de la integración (`docs/guion_vivo.md`). "objeto quieto" = el visor lo pone con su modelo pero sin lógica propia.\n')
    L.append('## Totales\n')
    L.append('### Comandos\n')
    L.append('| comando | sentencias | soporte | nota |')
    L.append('|---|---:|---|---|')
    for c, n in tot_cmd.most_common():
        e, nota = cmd_soporte(c, None)
        L.append('| `%s` | %d | %s | %s |' % (c, n, e, nota))
    L.append('\n### Tipos de actor creados durante el juego (`chara`)\n')
    L.append('| tipo | sentencias | soporte |')
    L.append('|---|---:|---|')
    agg = collections.Counter()
    con_m = collections.defaultdict(bool)
    for (t, con), n in tot_tipo.items():
        agg[t] += n
        con_m[t] = con_m[t] or con
    for t, n in agg.most_common():
        L.append('| %s | %d | %s |' % (t, n, sop_tipo(t, con_m[t])))
    L.append('\n### Destinos de `mesg` durante el juego\n')
    L.append('| destino | sentencias | soporte |')
    L.append('|---|---:|---|')
    for t, n in tot_mesg.most_common(60):
        L.append('| %s | %d | %s |' % (t, n, sop_mesg(t)))
    L.append('\n## Por escenario\n')
    for st, d, cmds, tipos, mesgs, solo, total in filas:
        nv = 'sí' if d.get('nivel') else 'NO (' + d['resumen'].get('nivel_motivo', '') + ')'
        L.append('### %s\n' % st)
        L.append('- Estado de entrada: %s. Correspondencia con nivel.json: %s.' % (d['estado'], nv))
        L.append('- %d sentencias de juego (%d nunca corren al entrar).' % (total, solo))
        if cmds:
            partes = []
            for c, n in cmds.most_common():
                e, _ = cmd_soporte(c, None)
                partes.append('`%s` %d (%s)' % (c, n, e))
            L.append('- Comandos: ' + ', '.join(partes) + '.')
        if tipos:
            agg = collections.Counter()
            cm = collections.defaultdict(bool)
            for (t, con), n in tipos.items():
                agg[t] += n
                cm[t] = cm[t] or con
            si = ['%s %d' % (t, n) for t, n in agg.most_common() if sop_tipo(t, cm[t]) != 'no']
            no = ['%s %d' % (t, n) for t, n in agg.most_common() if sop_tipo(t, cm[t]) == 'no']
            L.append('- Actores soportados: ' + (', '.join(si) or '—') + '.')
            L.append('- Actores sin soporte (se anotan en el registro): ' + (', '.join(no) or '—') + '.')
        if mesgs:
            si = ['%s %d' % (t, n) for t, n in mesgs.most_common() if sop_mesg(t) != 'no']
            no = ['%s %d' % (t, n) for t, n in mesgs.most_common() if sop_mesg(t) == 'no']
            L.append('- `mesg` soportados: ' + (', '.join(si) or '—') + '.')
            L.append('- `mesg` sin soporte: ' + (', '.join(no) or '—') + '.')
        L.append('')
    os.makedirs(os.path.dirname(DOC), exist_ok=True)
    open(DOC, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    print('cobertura ->', DOC)

def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, ValueError):
        pass
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    con_cob = '--cobertura' in sys.argv
    os.makedirs(OUT, exist_ok=True)
    niveles.CARGAS.update(niveles.cargas_externas())
    cargas = niveles.CARGAS
    sts = args or sorted((os.path.basename(x) for x in glob.glob(os.path.join(ST, '*')) if os.path.basename(x)[:1] in 'sd'))
    total = 0
    indice = {}
    datos = {}
    for st in sts:
        d, extra = escenario(st, cargas)
        if not d:
            continue
        s = json.dumps(d, ensure_ascii=False, separators=(',', ':'))
        open(os.path.join(OUT, st + '.json'), 'w', encoding='utf-8').write(s)
        total += len(s)
        indice[st] = d['resumen']
        datos[st] = (d, extra)
        print('%-7s %6.1f KB  charas %4d  trampas %3d  nivel %s' % (st, len(s) / 1024, d['resumen']['charas'], d['resumen']['trampas'], 'ok' if d['nivel'] else 'NO: ' + d['resumen']['nivel_motivo']))
    if not args:
        json.dump(indice, open(os.path.join(OUT, 'indice.json'), 'w', encoding='utf-8'), separators=(',', ':'))
    print('total %.2f MB en %d escenarios' % (total / 1000000.0, len(datos)))
    if con_cob:
        jugables = [st for st in sts if re.fullmatch('s\\d\\d[a-z]+', st) and int(st[1:3]) <= 20]
        cobertura(jugables, datos)
if __name__ == '__main__':
    main()
