# MGS web — FeniXVOID · Project Ravenlight
import sys, os, json, glob, re, struct, shutil, subprocess, hashlib
sys.path.insert(0, os.path.dirname(__file__))
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
import gcx, hzm, gcl_vm, preshade
from kmd2obj import load
from export_glb import exportar, strcode
from pcx_mgs import decode
from niveles import indice
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
ST = os.path.join(EXTRAIDO, 'disco1', '01_stages')
OUT = os.path.join(ASSETS, 'vr')
FPS = 30
SALAS = ['vr%02d' % i for i in range(1, 11)]
MODOS = {0: 'TRAINING MODE', 1: 'TIME ATTACK MODE', 2: 'TIME ATTACK THROUGH 10 STAGES', 3: 'GUN SHOOTING MODE', 4: 'GUN SHOOTING SURVIVAL MISSION', 5: 'TECHNICAL DEMONSTRATION'}
VARIANTE = {0: 'n', 1: 't', 2: 't', 3: 's', 4: 's', 5: 's'}
G_MODO, G_PROGRESO, G_TIEMPO, G_LIMITE = ('$b:G02ea', '$b:G02eb', '$w:G0374', '$w:G0382')
ROTULOS = {'9f93': 'vr_training', 'a90a': 'training', '1866': 'time_attack', '1eec': 'gun_shooting', '181a': 'through10', '93d8': 'survival', 'demo': 'demo', '6dc8': 'exit', '8d5c': 'select', 'stage': 'stage', 'clear': 'clear', '7f9c': 'next_stage', '8d82': 'try_again', 'edaf': 'continue', 'restart': 'restart', 'mode': 'mode', 'a579': 'records', '957b': 'digitos', '94d7': 'barra', 'c75f': 'pregunta', 'line': 'linea', 'font': 'fuente', '197e': 'marco_a', '2ff5': 'marco_b', 'f2de': 'marco_c', 'op_back_l': 'fondo_izq', 'op_back_r': 'fondo_der', '1360': 'save', '6555': 'cancel'}
NUMEROS = {1: ['c99a', 'c99b', 'c99c'], 2: ['c9b9', 'c9ba', 'c9bb', 'c9bc'], 3: ['c9d9', 'c9da', 'c9db', 'c9dc'], 4: ['c9f9', 'c9fa', 'c9fb', 'c9fc'], 5: ['ca19', 'ca1b', 'ca1c'], 6: ['ca39', 'ca3a', 'ca3b', 'ca3c'], 7: ['ca59', 'ca5a', 'ca5b', 'ca5c'], 8: ['ca79', 'ca7a', 'ca7b', 'ca7c'], 9: ['ca99', 'ca9a', 'ca9b', 'ca9c'], 10: ['cd79', 'cd7a', 'cd7b', 'cd7c']}
COMUNES = {'ippanhei': True, 'b466': False, '1904': False, '12b7': False, 'cae6': False, 's_camera': False, 'cam_arm': False, '4d60': False, '4d61': False, '4d63': False}
TEX_COMUNES = ['b09b', 'ca94', 'd517', 'fe1c', 'eb18']

def leer(st):
    return gcx.leer(os.path.join(ST, st, 'cache', 'scenerio.gcx'))

def crudo(v):
    if isinstance(v, (int, float)):
        return v
    if isinstance(v, dict):
        if 'var' in v:
            return {'var': v['var']}
        if 'id' in v:
            return {'id': '%04x' % v['id']}
        if 'proc' in v:
            return {'proc': '%04x' % v['proc']}
        if 'str' in v:
            return v['str']
        if 'expr' in v:
            return {'expr': True}
        if 'arg' in v:
            return {'arg': v['arg']}
    return None

def opciones(s):
    return {a['opt']: a['v'] for a in s.get('args', []) if isinstance(a, dict) and 'opt' in a}
KANJI = {1: '制', 2: '限', 3: '時', 4: '間', 5: '秒'}

def texto(s):
    out, orig, i = ([], [], 0)
    while i < len(s):
        c = s[i]
        if c == '�' and i + 1 < len(s):
            n = s[i + 1]
            if ord(n) < 32:
                orig.append(KANJI.get(ord(n), '?'))
                out.append({1: 'Time Limit', 5: ' sec.'}.get(ord(n), ''))
            else:
                orig.append(n)
                out.append(n)
            i += 2
            continue
        orig.append(c)
        out.append(c)
        i += 1
    return (''.join(out), ''.join(orig))

class VMVR(gcl_vm.VM):

    def __init__(self, *a, **k):
        super().__init__(*a, **k)
        self.eventos = []
        self.crudos = {}
        self.t_ventana = None

    def comando(self, s, args, ctx):
        c = s['cmd']
        a = s['args']
        o = opciones(s)
        if c == 'mesg':
            vals = self.resolver([x for x in a if not (isinstance(x, dict) and 'opt' in x)], args)
            self.eventos.append({'t': self.t, 'cmd': 'mesg', 'a': vals, 'ctx': ctx})
        elif c in ('sound', 'pad', 'menu', 'camera'):
            self.eventos.append({'t': self.t, 'cmd': c, 'o': {k: self.resolver(v, args) for k, v in o.items()}, 'ctx': ctx})
        antes = len(self.actores)
        r = super().comando(s, args, ctx)
        if c == 'chara' and a and isinstance(a[0], dict) and ('id' in a[0]):
            tipo = gcx.CHARAS.get(a[0]['id'], {}).get('nombre', '')
            act = self.actores[antes] if len(self.actores) > antes and self.actores[antes]['_s'] == id(s) else None
            if act:
                act['crudo'] = {k: [crudo(x) for x in v] for k, v in o.items()}
            if tipo == 'COMMANDER' and act:
                for k in ('c', 's'):
                    for p in act['opts'].get(k, []):
                        if isinstance(p, dict) and 'proc' in p:
                            self.proc(p['proc'], [], ctx)
            if tipo == 'VRWINDOW' and act:
                self.t_ventana = self.t
                p = act['opts'].get('p', [])
                if p and isinstance(p[0], dict) and ('proc' in p[0]):
                    self.orden += 1
                    self.cola.append((self.t + 1, self.orden, ('proc', p[0]['proc']), [], 'ventana', self.mapa))
        return r

def memoria_inicial():
    t = leer('title')
    vm = gcl_vm.VM(t)
    pid = next((p for p, b in t['procs'].items() if any(('G02f0' in json.dumps(x) for x in b))), None)
    if pid is not None:
        vm.proc(pid, [], 'titulo')
    return (bytes(vm.g), bytes(vm.l))

def exportar_glb(f, dst, esqueleto, luz=None, normales_juego=False):
    if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(f) and (not FORZAR):
        return True
    try:
        exportar(f, dst, estatico=not esqueleto, luz=luz, normales_juego=normales_juego)
        return True
    except Exception as e:
        print('  no se pudo exportar', f, e)
        return False

def luz_de(vm):
    lz = vm.luz or {}
    amb = tuple((max(0, min(255, v)) for v in lz.get('a', [0, 0, 0])))
    main = None
    if lz.get('d') and lz.get('c') and any(lz['d']):
        dx, dy, dz = lz['d']
        L = (dx * dx + dy * dy + dz * dz) ** 0.5 or 1
        main = ((dx / L, dy / L, dz / L), tuple(lz['c']))
    return (amb, main, lz)

def rel(p):
    return os.path.relpath(p, ASSETS).replace('\\', '/')

def comunes():
    od = os.path.join(OUT, 'comun')
    os.makedirs(od, exist_ok=True)
    idx = indice('vr10')
    for k, v in indice('vr01').items():
        idx.setdefault(k, v)
    out = {}
    for n, esq in COMUNES.items():
        f = idx.get(('kmd', strcode(n) if not re.fullmatch('[0-9a-f]{4}', n) else int(n, 16)))
        if not f:
            print('  falta', n)
            continue
        dst = os.path.join(od, n + '.glb')
        if exportar_glb(f, dst, esq):
            out[n] = rel(dst)
    f = idx.get(('kmd', strcode('snake')))
    if f and exportar_glb(f, os.path.join(od, 'snake.glb'), True):
        out['snake'] = rel(os.path.join(od, 'snake.glb'))
    for h in TEX_COMUNES:
        f = idx.get(('pcx', int(h, 16)))
        if f:
            dst = os.path.join(od, h + '.png')
            if not os.path.exists(dst) or FORZAR:
                decode(f).save(dst)
            out['tex_' + h] = rel(dst)
    return out

def correr(script, modo, base, extra=None):
    vm = VMVR(script, horizonte=60)
    vm.g[:] = base[0]
    vm.l[:] = base[1]
    vm.set(G_MODO, modo)
    if modo == 4:
        vm.set(G_TIEMPO, 0)
        vm.set(G_LIMITE, 12600)
    for k, v in (extra or {}).items():
        vm.set(k, v)
    vm.correr()
    return vm

def sandbox(script, vm, k, obj, args):
    sb = VMVR(script, horizonte=60)
    sb.g[:] = vm.g
    sb.l[:] = vm.l
    sb.mapas = dict(vm.mapas)
    sb.orden_mapas = list(vm.orden_mapas)
    try:
        sb.ejecutar(k, obj, args)
    except Exception as e:
        print('   (sandbox)', e)
    return sb

def destino_de_proc(script, vm, pid):
    sb = sandbox(script, vm, 'p', pid, [])
    if getattr(sb, 'reinicio', False):
        return {'tipo': 'reintentar'}
    if sb.cargas:
        a = sb.cargas[-1]['a']
        m = sb.get(G_MODO)
        if a == 'selectvr':
            return {'tipo': 'salir'}
        if a == 'vrdemo':
            return {'tipo': 'demo'}
        if a == 'title':
            return {'tipo': 'titulo'}
        d = {'tipo': 'siguiente', 'st': a}
        if m != vm.get(G_MODO):
            d = {'tipo': 'modo', 'st': a, 'modo': m}
        return d
    return {'tipo': 'nada'}

def ruta_pts(hz, n):
    if hz and isinstance(n, int) and (0 <= n < len(hz['rutas'])):
        return hz['rutas'][n]['puntos']
    return []

def sala(st, modo, base, com, rotulos_ok=True):
    script = leer(st)
    vm = correr(script, modo, base)
    idx = indice(st)
    od = os.path.join(OUT, st)
    os.makedirs(od, exist_ok=True)
    amb, main, lz = luz_de(vm)
    mapas = []
    for mid in vm.orden_mapas:
        s = vm.mapas[mid]
        o = opciones(s)
        kmds = [v['id'] for v in o.get('k', []) if isinstance(v, dict) and 'id' in v]
        hz = [v['id'] for v in o.get('h', []) if isinstance(v, dict) and 'id' in v]
        lit = [v['id'] for v in o.get('l', []) if isinstance(v, dict) and 'id' in v]
        luces = []
        for h in lit:
            f = idx.get(('lit', h))
            if f:
                try:
                    luces += preshade.leer_lit(f)
                except Exception:
                    pass
        piezas = []
        for h in kmds:
            f = idx.get(('kmd', h))
            if not f:
                continue
            dst = os.path.join(od, '%04x_%s.glb' % (h, VARIANTE[modo]))
            if SIN_GLB or exportar_glb(f, dst, False, {'luces': luces, 'amb': amb, 'main': main, 'pos': (0, 0, 0), 'rot': 0.0}):
                piezas.append(rel(dst))
        hzj = []
        datos_hz = None
        for h in hz:
            f = idx.get(('hzm', h))
            if not f:
                continue
            datos_hz = hzm.leer(f)
            dst = os.path.join(od, '%04x.hzm.json' % h)
            json.dump(datos_hz, open(dst, 'w'), separators=(',', ':'))
            hzj.append(rel(dst))
        mapas.append({'id': mid, 'kmds': kmds, 'lit': lit, 'piezas': piezas, 'hzm_json': hzj, '_hz': datos_hz})
    principal = vm.orden_mapas[0] if vm.orden_mapas else None
    hzp = mapas[0]['_hz'] if mapas else None
    cambios = {}
    for e in vm.eventos:
        if e['cmd'] == 'mesg' and len(e['a']) >= 3 and isinstance(e['a'][1], dict) and (e['a'][1].get('id') == 17167):
            g = e['a'][0]['id'] if isinstance(e['a'][0], dict) else None
            cambios[g] = {'ruta': e['a'][2], 'n': e['a'][3:6], 't': round(e['t'] / FPS, 2)}
    actores = []
    vr = {}
    ventana = None
    clears = []
    goal = None
    PASAN = {'SNAKE', 'WATCHER', 'COMMANDER', 'CAMERA', 'SEARCHLIGHT', 'RSURFACE', 'SNOW', 'ASIATOKUN', 'ASIOTOKUN'}
    for a in vm.actores:
        t = a['tipo']
        o = a['opts']
        act = {'tipo': t, 'nombre': a['nombre'], 'mapa': a['mapa'], 'ctx': a['ctx'], 't': a['t'], 'opts': o}
        p = o.get('p')
        d = o.get('d')
        if p and len(p) >= 3 and all((isinstance(x, int) for x in p[:3])):
            act['p'] = p[:3]
        if d and len(d) >= 3 and all((isinstance(x, int) for x in d[:3])):
            act['d'] = d[:3]
        if t == 'VR':
            vr = {'opts': o, 'crudo': a.get('crudo', {}), 't': a['t']}
            continue
        if t == 'GOAL':
            goal = {'p': act.get('p'), 'd': act.get('d'), 'modelo': com.get('b466')}
            continue
        if t == 'VRWINDOW':
            ventana = a
            continue
        if t not in PASAN:
            continue
        if t == 'SNAKE':
            act['modelo'] = com.get('snake')
        if t == 'WATCHER':
            r = o.get('r', [0])[0] if o.get('r') else 0
            act['ruta'] = r
            act['puntos'] = ruta_pts(hzp, r)
            if act['puntos']:
                act['p'] = act['puntos'][0]['p']
            act['modelo'] = com.get('ippanhei')
            ch = cambios.get(a['nombre'])
            if ch:
                act['ruta_inicio'] = dict(ch, puntos=ruta_pts(hzp, ch['ruta']))
        if t == 'CAMERA':
            act['modelo'] = com.get('s_camera')
            act['brazo'] = com.get('cam_arm')
        actores.append(act)
    for act in actores:
        if vm.t_ventana is not None and act['t'] * FPS > vm.t_ventana:
            act['tras_ventana'] = True
        act['t'] = 0
    win = None
    if ventana:
        o = ventana['opts']
        lineas = [x for x in o.get('b', []) if isinstance(x, str)]
        n = (o.get('i') or [len(lineas)])[0]
        mostrar = [texto(x)[0] for x in lineas[:n]]
        win = {'lineas': mostrar, 'original': [texto(x)[1] for x in lineas], 'n': n, 'w': o.get('w'), 'm': o.get('m'), 'cuadro_ps1': {'ancho': ((o.get('w') or [0, 0, 256])[2] + 3) // 4 * 4, 'alto': n * 18 + 18}}
    ov = vr.get('opts', {})
    cr = vr.get('crudo', {})
    num = lambda k: [x for x in ov.get(k, []) if isinstance(x, int)]
    limite = None
    arrastra = None
    if 'a' in cr:
        x = cr['a'][0] if cr['a'] else None
        if isinstance(x, dict) and x.get('var') == G_TIEMPO:
            arrastra = 'restante'
        elif isinstance(x, dict) and x.get('var') == G_LIMITE:
            limite = 12600
            arrastra = 'acumulado'
        elif isinstance(x, int):
            limite = x
    rk = cr.get('r', [])
    ranking = None
    if rk:
        vars_ = [x.get('var') for x in rk if isinstance(x, dict) and 'var' in x]
        vals = [vm.get(v) for v in vars_] if vars_ else num('r')
        ranking = {'vars': vars_, 'inicial': [{'t': abs(v), 'def': v < 0} for v in vals]}
    proc_ok = (cr.get('e') or [None])[0]
    proc_ok = int(proc_ok['proc'], 16) if isinstance(proc_ok, dict) and 'proc' in proc_ok else None
    s_opt = cr.get('s', [])
    tiro = {'espera': s_opt[0], 'proc': s_opt[1]['proc']} if len(s_opt) >= 2 and isinstance(s_opt[1], dict) else None
    if tiro and goal is None:
        sb = sandbox(script, vm, 'p', int(tiro['proc'], 16), [])
        g = next((x for x in sb.actores if x['tipo'] == 'GOAL'), None)
        if g:
            goal = {'p': g['opts']['p'][:3], 'd': g['opts'].get('d', [0, 0, 0])[:3], 'modelo': com.get('b466')}
        tiro['sonido'] = [e['o'].get('e') for e in sb.eventos if e['cmd'] == 'sound' and e['o'].get('e')]
    clear = None
    if proc_ok is not None:
        sb = sandbox(script, vm, 'p', proc_ok, [600, 1, 2, 3])
        vc = [x for x in sb.actores if x['tipo'] == 'VRCLEAR']
        if vc:
            o = vc[-1]['opts']
            p = o.get('p', [])
            procs = [x['proc'] for x in p[1:] if isinstance(x, dict) and 'proc' in x]
            ops = []
            for pid in procs:
                dd = destino_de_proc(script, sb, pid)
                if dd not in ops:
                    ops.append(dd)
            clear = {'opciones': ops, 'voces': [x for x in o.get('t', []) if isinstance(x, int)], 'automatico': None}
            if not procs and sb.cargas:
                clear['automatico'] = {'st': sb.cargas[-1]['a'], 'cuadros': round(sb.cargas[-1]['t'])}
        if not vc and sb.cargas:
            clear = {'opciones': [], 'voces': [], 'automatico': {'st': sb.cargas[-1]['a'], 'cuadros': round(sb.cargas[-1]['t'])}, 'sin_pantalla': True}
        clear = clear or {'opciones': [], 'voces': []}
        clear['sonidos'] = [{'t': e['t'], **({'se': e['o']['e'][2]} if e['o'].get('e') else {}), **({'voz': e['o']['v'][0]} if e['o'].get('v') else {})} for e in sb.eventos if e['cmd'] == 'sound' and (e['o'].get('e') or e['o'].get('v'))]
        prog = []
        for v in range(0, 33):
            s2 = VMVR(script, horizonte=60)
            s2.g[:] = vm.g
            s2.l[:] = vm.l
            s2.set(G_PROGRESO, v)
            try:
                s2.ejecutar('p', proc_ok, [600, 1, 2, 3])
            except Exception:
                pass
            if s2.get(G_PROGRESO) != v:
                prog.append([v, s2.get(G_PROGRESO)])
        clear['progreso'] = prog
    sig = next((o['st'] for o in (clear or {}).get('opciones', []) if o['tipo'] == 'siguiente'), None) or ((clear or {}).get('automatico') or {}).get('st')
    mun = None
    sock, smax = (vm.get('$w:L0022'), vm.get('$w:L0036'))
    if modo in (3, 4, 5):
        mun = {'balas': sock, 'max': smax, 'arma': 'SOCOM' if vm.get('$w:L001c') == 0 else None, 'silenciador': vm.get('$w:L0078') >= 0}
        if modo == 4 and st != 'vr01':
            mun['arrastra'] = True
    seq = {}
    t0 = (vm.t_ventana or 0) + 1
    for a in vm.actores:
        if a['tipo'] == 'VR_SNAKE':
            seq['materializa'] = round(a['t'] * FPS - t0)
            seq['materializa_dur'] = (a['opts'].get('t') or [45])[0]
            seq['color'] = a['opts'].get('c')
        if a['tipo'] == 'SNEBREATH':
            seq['aliento'] = round(a['t'] * FPS - t0)
    for e in vm.eventos:
        if e['cmd'] == 'pad' and 's' in e['o'] and (e['t'] >= t0):
            seq.setdefault('control', e['t'] - t0)
        if e['cmd'] == 'mesg' and len(e['a']) >= 2 and isinstance(e['a'][0], dict) and (e['a'][0].get('id') == 60806) and (e['t'] >= t0):
            seq.setdefault('reloj', e['t'] - t0)
        if e['cmd'] == 'sound' and e['o'].get('e') and (e['t'] >= t0):
            seq.setdefault('sonidos', []).append([e['t'] - t0, e['o']['e'][2]])
        if e['cmd'] == 'sound' and e['o'].get('b'):
            seq.setdefault('canciones', []).append([e['t'] - t0, e['o']['b']])
    camaras = {}
    for e in vm.eventos:
        if e['cmd'] == 'camera' and e['o'].get('s') and all((isinstance(v, int) for v in e['o']['s'])) and ('e' not in e['o']):
            camaras.setdefault(e['o']['s'][0], e['o']['s'][1:])
    luzj = {'luces': [], 'amb': list(amb), 'main': [list(main[0]), list(main[1])] if main else None}
    for m in mapas:
        m.pop('_hz', None)
    enemigos = sum((1 for a in actores if a['tipo'] == 'WATCHER'))
    datos = {'id': st, 'mapas': mapas, 'orden_mapas': vm.orden_mapas, 'actores': actores, 'camaras': [], 'juego': {'estado': f'VR {MODOS[modo]}', 'progreso': 0, 'mapa_inicial': principal, 'fondo': None}, 'principal': principal, 'visibles': [principal] if principal is not None else [], 'salidas': [], 'luz': luzj, 'brillos': [], 'demos': [], 'vr': {'sala': st, 'modo': modo, 'nombre_modo': MODOS[modo], 'variante': VARIANTE[modo], 'etapa': None, 'ventana': win, 'meta': {'p': num('p')[:3], 'goal': goal, 'aparece_al_limpiar': bool(tiro), 'dir': (num('d') or [0])[0]}, 'limite': limite, 'limite_seg': round(limite / FPS, 2) if limite else None, 'arrastra': arrastra, 'tiempo_previo': 'acumulado' if 't' in cr else None, 'voz': (num('o') or [None])[0], 'ranking': ranking, 'municion': mun, 'enemigos': enemigos if modo in (3, 4) else None, 'tiro': tiro, 'clear': clear, 'siguiente': sig, 'secuencia': seq, 'camaras': camaras, 'luz_script': lz, 'fondo': {'vrbg': next((a['opts'].get('t', [None])[0] for a in vm.actores if a['tipo'] == 'VRBG'), None), 'vrbg2': next((a['opts'].get('t', [None])[0] for a in vm.actores if a['tipo'] == 'VRBG2'), None), 'piso': com.get('1904'), 'baldosa': com.get('12b7'), 'cubo': com.get('cae6'), 'tex': {k[4:]: v for k, v in com.items() if k.startswith('tex_')}}, 'spark': next((a['opts'].get('k', [None])[0] for a in vm.actores if a['tipo'] == 'VRSPARK'), None), 'derrota': ['visto'] if modo == 0 else ['tiempo', 'muerte'], 'items': {'socom': com.get('4d61'), 'racion': com.get('4d63'), 'caja': com.get('4d60')}}}
    return datos

def niv_rec(script, f):

    def rec(b, prof=0):
        for s in b:
            f(s, prof, None)
            for a in s.get('args', []):
                if isinstance(a, dict) and 'bloque' in a:
                    rec(a['bloque'], prof + 1)
                if isinstance(a, dict) and 'opt' in a:
                    for v in a['v']:
                        if isinstance(v, dict) and 'bloque' in v:
                            rec(v['bloque'], prof + 1)
    rec(script['main'])
    for b in script['procs'].values():
        rec(b, 1)

def menu(base):
    sc = leer('selectvr')
    wm = None

    def v(x, prof, ctx):
        nonlocal wm
        if x.get('cmd') == 'chara' and gcx.CHARAS.get(x['args'][0].get('id'), {}).get('nombre') == 'VRWINMNGR':
            wm = x
    niv_rec(sc, v)
    o = opciones(wm)
    p = o['p']
    n = p[0]
    procs = [x['proc'] for x in p[1:1 + n]]
    entradas = []
    for i, pid in enumerate(procs):
        vm = gcl_vm.VM(sc, horizonte=60)
        vm.g[:] = base[0]
        vm.l[:] = base[1]
        vm.set(G_MODO, 0)
        try:
            vm.ejecutar('p', pid, [])
        except Exception:
            pass
        e = {'i': i, 'proc': '%04x' % pid}
        if vm.cargas:
            e['st'] = vm.cargas[-1]['a']
            e['modo'] = vm.get(G_MODO)
            if e['st'] == 'title':
                e = {'i': i, 'proc': '%04x' % pid, 'tipo': 'titulo'}
            elif e['st'] == 'vrdemo':
                e['tipo'] = 'demo'
                e.pop('modo', None)
            else:
                e['tipo'] = 'sala'
                if e['modo'] == 4:
                    e['limite'] = vm.get(G_LIMITE)
        entradas.append(e)
    orden = [e['st'] for e in entradas if e.get('tipo') == 'sala' and e['modo'] == 0]
    r = [x['var'] for x in o.get('r', []) if isinstance(x, dict) and 'var' in x]
    vm = gcl_vm.VM(sc)
    vm.g[:] = base[0]
    defecto = {k: {'t': abs(vm.get(k)), 'def': vm.get(k) < 0} for k in r[1:]}
    return {'entradas': entradas, 'orden': orden, 'rankings_menu': r, 'rankings_defecto': defecto, 'pausa': None}

def rotulos():
    od = os.path.join(OUT, 'menu')
    os.makedirs(od, exist_ok=True)
    src = os.path.join(ST, 'selectvr', 'nocache')
    out = {}

    def png(h, nombre):
        f = os.path.join(src, h + '.pcx')
        if not os.path.exists(f):
            return None
        dst = os.path.join(od, nombre + '.png')
        im = decode(f).convert('RGBA')
        im.save(dst)
        out[nombre] = rel(dst)
        return im
    for h, n in ROTULOS.items():
        png(h, n)
    for k, hs in NUMEROS.items():
        mejor, mb = (None, -1)
        for h in hs:
            f = os.path.join(src, h + '.pcx')
            if not os.path.exists(f):
                continue
            im = decode(f).convert('RGBA')
            px = [p for p in im.getdata() if p[3] > 0]
            b = sum((p[0] + p[1] + p[2] for p in px)) / max(1, len(px))
            if b > mb:
                mb, mejor = (b, h)
        if mejor:
            png(mejor, 'n%02d' % k)
    return out

def voces(ids):
    od = os.path.join(OUT, 'vox')
    os.makedirs(od, exist_ok=True)
    tmp = os.path.join(od, '_tmp.wav')
    out = {}
    for i in sorted(ids):
        dst = os.path.join(od, f'{i}.m4a')
        if not os.path.exists(dst) or FORZAR:
            r = subprocess.run([sys.executable, os.path.join(RAIZ, 'tools', 'vox.py'), 'wav', str(i), tmp], capture_output=True, text=True, cwd=RAIZ)
            if r.returncode != 0 or not os.path.exists(tmp):
                print('  sin voz', i, r.stderr[-200:])
                continue
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'aac', '-b:a', '64k', dst], check=False)
            try:
                os.remove(tmp)
            except OSError:
                pass
        if os.path.exists(dst):
            out[i] = rel(dst)
    return out
SIN_GLB = '--sin-glb' in sys.argv
FORZAR = '--forzar' in sys.argv
if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    pedidas = [a for a in sys.argv[1:] if not a.startswith('--')] or SALAS
    os.makedirs(OUT, exist_ok=True)
    base = memoria_inicial()
    com = comunes()
    m = menu(base)
    m['rotulos'] = rotulos()
    etapa = {st: i + 1 for i, st in enumerate(m['orden'])}
    ids_vox = set()
    resumen = []
    if '--demo' in sys.argv:
        for st in pedidas:
            d = sala(st, 5, base, com)
            d['vr']['etapa'] = etapa.get(st)
            json.dump(d, open(os.path.join(OUT, f'{st}_5.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
            print(st, 'modo 5:', d['mapas'][0]['piezas'], 'guardias', sum((1 for a in d['actores'] if a['tipo'] == 'WATCHER')), 'meta', d['vr']['meta']['p'])
        sys.exit(0)
    for st in pedidas:
        for modo in (0, 1, 2, 3, 4, 5):
            d = sala(st, modo, base, com)
            d['vr']['etapa'] = etapa.get(st)
            v = d['vr']
            for x in [v['voz']] + (v['clear'] or {}).get('voces', []) + [s.get('voz') for s in (v['clear'] or {}).get('sonidos', [])]:
                if isinstance(x, int) and x > 0:
                    ids_vox.add(x)
            json.dump(d, open(os.path.join(OUT, f'{st}_{modo}.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
            if modo == 2 and v['ranking']:
                m['ranking_ta10'] = v['ranking']
            g = [a for a in d['actores'] if a['tipo'] == 'WATCHER']
            resumen.append(f"{st} m{modo} etapa {v['etapa']}: mapa {d['mapas'][0]['kmds'][0]:04x}/{(d['mapas'][0]['hzm_json'] or ['-'])[0].split('/')[-1]} guardias {len(g)} meta {v['meta']['p']} límite {v['limite_seg']} munición {(v['municion'] or {}).get('balas')} siguiente {v['siguiente']} clear {([o['tipo'] for o in v['clear']['opciones']] if v['clear'] else None)}")
    m['voces'] = {} if '--sin-vox' in sys.argv else voces(ids_vox)
    m['modos'] = MODOS
    m['comun'] = com
    json.dump(m, open(os.path.join(OUT, 'menu.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('\n'.join(resumen))
    print('voces', sorted(ids_vox))
