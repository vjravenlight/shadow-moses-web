# MGS web — FeniXVOID · Project Ravenlight
import sys, os, json, re, hashlib, subprocess, mmap
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS
import gcx, hzm, gcl_vm, preshade
import niveles
import vr_export as ve
import vr_camaras as vc
import camaras_export as ce
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
DISCO = os.path.join(EXTRAIDO, 'vr_usa')
ST = os.path.join(DISCO, '01_stages')
OUT = os.path.join(ASSETS, 'vr', 'disco')
FPS = 30
G_MODO, G_NUM, G_LISTA, G_LNUM, G_IDIOMA = ('$b:G0002', '$w:G0004', '$b:G0003', '$w:G0006', '$b:G0011')
PREFIJO_REC = 'vrm:'
ARMAS = {'sud': 'NO WEAPON', 'scm': 'SOCOM', 'fms': 'FA-MAS', 'grn': 'GRENADE', 'clm': 'CLAYMORE', 'nkt': 'NIKITA', 'psg': 'PSG1', 'stg': 'STINGER', 'cfr': 'C4'}
ORDEN_ARMAS = ['scm', 'fms', 'grn', 'clm', 'cfr', 'nkt', 'psg', 'stg']
ESTADO_GRUPO = {'sneaking': 'si', 'advanced': 'si', 'weapon': 'si', 'battle': 'si', 'ninja': 'si', 'mystery': 'si', 'vs12': 'si', 'vrmission': 'si', 'puzzle': 'si', 'variety': 'si', 'ng': 'si', 'photo': 'no: falta correr tools/vr_foto_export.py (docs/vr_foto.md)'}
NO_JUGABLE = {}

def grupo_de(m, g3, st):
    pre = st.split('_')[1][:3] if st.startswith('vr_') else None
    if g3 == 9:
        return 'puzzle'
    if g3 == 12:
        return 'variety'
    if g3 == 16:
        return 'ng'
    if st.startswith('vr_sud'):
        return 'sneaking'
    if st.startswith('vr_'):
        return 'weapon' if m in (1, 2) else 'advanced'
    if st.startswith('vab_'):
        return 'battle'
    if m == 7:
        return 'ninja'
    if m == 10:
        return 'mystery'
    if m == 11:
        return 'vs12'
    if m == 13:
        return 'vrmission'
    return 'otro'
NOMBRE_GRUPO = {'sneaking': 'SNEAKING MODE', 'weapon': 'WEAPON MODE', 'advanced': 'ADVANCED MODE', 'battle': '1 MIN. BATTLE', 'ninja': 'NINJA', 'mystery': 'MYSTERY', 'vs12': 'VS. 12 BATTLE', 'vrmission': 'VR MISSION', 'puzzle': 'PUZZLE', 'variety': 'VARIETY', 'ng': 'NG SELECTION', 'photo': 'PHOTOGRAPH'}
PAGINA_GRUPO = {'sneaking': 'SNEAKING', 'weapon': 'WEAPON', 'advanced': 'ADVANCED', 'battle': 'SPECIAL', 'ninja': 'SPECIAL', 'mystery': 'SPECIAL', 'vs12': 'SPECIAL', 'vrmission': 'SPECIAL', 'puzzle': 'SPECIAL', 'variety': 'SPECIAL', 'ng': 'SPECIAL', 'photo': 'SPECIAL'}

def clave_de(st, m, n, g3):
    return f'{st}_{m}_{n}' + (f'_{g3}' if g3 else '')

def usar_disco_vr():
    niveles.ST = ST
    niveles.INIT = os.path.join(ST, 'init')
    ve.ST = ST
    ve.OUT = OUT
    gcl_vm.ST = ST

def leer(st):
    return gcx.leer(os.path.join(ST, st, 'cache', 'scenerio.gcx'))

def memoria_inicial():
    t = leer('vrtitle')
    vm = gcl_vm.VM(t)
    for pid, b in t['procs'].items():
        js = json.dumps(b)
        if '"$w:G0016"' in js or '"$b:G0012"' in js:
            vm.proc(pid, [], 'titulo')
    vm.set(G_IDIOMA, 0)
    return (bytes(vm.g), bytes(vm.l))

def catalogo(base):
    sc = leer('selectvr')
    wm = None

    def v(x, prof, ctx):
        nonlocal wm
        if x.get('cmd') == 'chara' and gcx.CHARAS.get(x['args'][0].get('id'), {}).get('nombre') == 'NOBU_WINMNGR':
            wm = x
    ve.niv_rec(sc, v)
    procs = []
    for a in wm['args']:
        if isinstance(a, dict) and a.get('opt') in ('a', 'b', 'c', 'd', 'e'):
            procs += [x['proc'] for x in a['v'] if isinstance(x, dict) and 'proc' in x]
    vistos = set()
    out = []
    for pid in procs:
        if pid in vistos:
            continue
        vistos.add(pid)
        vm = gcl_vm.VM(sc, horizonte=5)
        vm.g[:] = base[0]
        vm.l[:] = base[1]
        try:
            vm.ejecutar('p', pid, [])
        except Exception:
            pass
        if not vm.cargas:
            continue
        st = vm.cargas[-1]['a']
        if st in ('vrtitle', 'opening', 'title'):
            continue
        m, n, g3, g6 = (vm.get(G_MODO), vm.get(G_NUM), vm.get(G_LISTA), vm.get(G_LNUM))
        out.append({'clave': clave_de(st, m, n, g3), 'st': st, 'modo': m, 'n': n, 'lista': g3, 'lnum': g6, 'proc': '%04x' % pid})
    return out
OV_SELECTVR = 2148287312
BIT_VRMISSION = 12 * 192 + 140

def arbol_menu(sc, wm):
    import glob, struct
    p = glob.glob(os.path.join(ST, 'selectvr', 'sound', '*.bin'))
    if not p:
        return None
    ov = open(p[0], 'rb').read()

    def w(a):
        return struct.unpack_from('<I', ov, a - OV_SELECTVR)[0]

    def b(a):
        return ov[a - OV_SELECTVR]
    procs = []
    for letra in 'abcde':
        for a in wm['args']:
            if isinstance(a, dict) and a.get('opt') == letra:
                procs += [x['proc'] for x in a['v'] if isinstance(x, dict) and 'proc' in x]
    nodos, k = ([], 0)
    for n in range(71):
        a = 2148339208 + n * 28
        cnt, ent = (w(a + 4), w(a + 8))
        g, base = (b(2148343280 + n), b(2148343352 + n))
        nd = {'hijos': [], 'abierta': [], 'proc': [], 'bit': [], 'cuenta': b(2148343604 + n)}
        for i in range(cnt):
            f = w(ent + i * 60)
            hijo = w(ent + i * 60 + 32) >> 16
            nd['hijos'].append(hijo if hijo and hijo < 71 else -1)
            nd['abierta'].append(1 if f & 1073741824 else 0)
            hoja = bool(f & 536870912)
            nd['proc'].append('%04x' % procs[k] if hoja and k < len(procs) else None)
            if hoja:
                k += 1
            nd['bit'].append((g - 1) * 192 + base + i if hoja and g else -1)
        nodos.append(nd)
    return nodos

def _winmngr(sc):
    wm = None

    def v(x, prof, ctx):
        nonlocal wm
        if x.get('cmd') == 'chara' and gcx.CHARAS.get(x['args'][0].get('id'), {}).get('nombre') == 'NOBU_WINMNGR':
            wm = x
    ve.niv_rec(sc, v)
    return wm

def menu_original(cat):
    sc = leer('selectvr')
    nodos = arbol_menu(sc, _winmngr(sc))
    if not nodos:
        return None
    por_proc = {}
    for e in cat:
        if e.get('proc'):
            por_proc.setdefault(e['proc'], e['clave'])
    bit = {}
    for nd in nodos:
        nd['clave'] = [por_proc.get(p) if p else None for p in nd.pop('proc')]
        for c, b in zip(nd['clave'], nd['bit']):
            if c and b >= 0:
                bit[c] = b
    for e in cat:
        if e.get('grupo') == 'vrmission' and bit.get(e['clave']) != BIT_VRMISSION:
            bit.pop(e['clave'], None)
    return {'nodos': nodos, 'bit': bit}

class VMDisco(ve.VMVR):
    rand_valor = 0

    def comando(self, s, args, ctx):
        if s['cmd'] == 'rand':
            n = next((self.valor(x, args) for x in s['args'] if not (isinstance(x, dict) and 'opt' in x)), None)
            self.rand_n = max(getattr(self, 'rand_n', 0), n if isinstance(n, int) else 0)
            self.set('$w:L000a', self.rand_valor if isinstance(n, int) and self.rand_valor < n else 0)
            return None
        if s['cmd'] == 'light':
            o = self.opciones(s)
            for k in ('d', 'c', 'a'):
                if o.get(k):
                    self.luz[k] = [self.valor(v, args) for v in o[k][:3]]
            return None
        if s['cmd'] in ('trap', 'ntrap'):
            if getattr(self, '_pasada_tr', None) != getattr(self, 'pasada', 0):
                self.trampas = []
                self._pasada_tr = getattr(self, 'pasada', 0)
            a = list(s['args'])
            for i in range(min(3, len(a))):
                if isinstance(a[i], dict) and ('arg' in a[i] or 'var' in a[i] or 'expr' in a[i]):
                    a[i] = {'id': self.valor(a[i], args) & 65535, 'n': None}
            self.trampas.append(dict(s, args=a))
        return super().comando(s, args, ctx)

def poner(vm, base, e):
    vm.g[:] = base[0]
    vm.l[:] = base[1]
    vm.set(G_MODO, e['modo'])
    vm.set(G_NUM, e['n'])
    vm.set(G_LISTA, e['lista'])
    vm.set(G_LNUM, e['lnum'])
    vm.set(G_IDIOMA, 0)

def correr(script, e, base, cls=VMDisco):
    vm = cls(script, horizonte=60)
    poner(vm, base, e)
    vm.correr()
    return vm

def sandbox(script, vm, k, obj, args, cls=VMDisco):
    sb = cls(script, horizonte=60)
    sb.g[:] = vm.g
    sb.l[:] = vm.l
    sb.mapas = dict(vm.mapas)
    sb.orden_mapas = list(vm.orden_mapas)
    sb.mapa = vm.mapa
    try:
        sb.ejecutar(k, obj, args)
    except Exception as ex:
        print('   (sandbox)', ex)
    return sb

def destino(script, vm, pid, por_clave):
    sb = sandbox(script, vm, 'p', pid, [])
    if getattr(sb, 'reinicio', False):
        return {'tipo': 'reintentar'}
    if sb.cargas:
        a = sb.cargas[-1]['a']
        if a == 'selectvr':
            return {'tipo': 'salir'}
        if a in ('vrtitle', 'title'):
            return {'tipo': 'salir'}
        if a == 'vrsave':
            return {'tipo': 'salir', 'guardar': True}
        c = clave_de(a, sb.get(G_MODO), sb.get(G_NUM), sb.get(G_LISTA))
        if c in por_clave:
            return {'tipo': 'siguiente', 'st': a, 'clave': c}
        return {'tipo': 'siguiente', 'st': a, 'clave': None}
    return {'tipo': 'nada'}
COMUNES = {'ippanhei': True, 'b466': False, 'box_01': False, 's_camera': False, 'cam_arm': False, '4d60': False, '4d61': False, '4d63': False}

def comunes():
    od = os.path.join(OUT, 'comun')
    os.makedirs(od, exist_ok=True)
    idx = {}
    for st in ('vr_sud01', 'vr_sud06', 'vr_sud10', 'vr_scm01'):
        if os.path.isdir(os.path.join(ST, st)):
            for k, v in niveles.indice(st).items():
                idx.setdefault(k, v)
    out = {}
    for n, esq in COMUNES.items():
        f = idx.get(('kmd', ve.strcode(n) if not re.fullmatch('[0-9a-f]{4}', n) else int(n, 16)))
        if not f:
            continue
        dst = os.path.join(od, n + '.glb')
        if SIN_GLB or ve.exportar_glb(f, dst, esq):
            out[n] = ve.rel(dst)
    f = idx.get(('kmd', ve.strcode('snake')))
    if f and (SIN_GLB or ve.exportar_glb(f, os.path.join(od, 'snake.glb'), True)):
        out['snake'] = ve.rel(os.path.join(od, 'snake.glb'))
    return out
PASAN = {'SNAKE', 'WATCHER', 'COMMANDER', 'CAMERA', 'SEARCHLIGHT', 'RSURFACE', 'SNOW', 'ASIATOKUN', 'ASIOTOKUN', 'CENSOR', 'CAMERAGUN', 'CLAYMORE', 'ITEM', 'CAT_IN', 'DMYFLOOR', 'TEXTURE', 'PADVIBRATE', 'VRBOX', 'VRBOX2', 'DYNWALL', 'WALL', 'FURNACE', 'VRBOX4', 'VRGLASS', 'BLOODY_MERYL', 'BLOOD_POOL', 'SMOKE', 'ENV_SOUND', 'BELONG', 'FINDTRAP', 'BOXALL', 'MYSTERYDOOR'}
SOPORTADOS = PASAN | {'VR', 'VR2', 'VRCLEAR2', 'GOAL', 'VRWINDOW', 'VRCLEAR', 'VRBG3', 'FADEIO', 'SNAKEWARP', 'VR_SNAKE', 'SNEBREATH', 'VR_PAUSEMENU', 'PADDEMO2', 'LOADREP', 'MYSTERYHEI', 'NINJAPLAY', 'MINENE', 'VRBOX3', 'MOTIONSE', 'DOOR', 'BELONG', 'VRGLASS', 'GODZILA', 'GODZCOM', 'CINEMA', 'MYSTERYDOOR'}

def sonido_de(st, escribir=True):
    import glob, shutil
    od = os.path.join(OUT, 'sonido')
    out = {'bancos': [], 'mdx': None, 'efx': None}
    for f in sorted(glob.glob(os.path.join(ST, st, 'sound', '*.*'))):
        ext = f.rsplit('.', 1)[1]
        if ext not in ('wvx', 'mdx', 'efx'):
            continue
        h = hashlib.md5(open(f, 'rb').read()).hexdigest()[:6]
        n = '%s_%s' % (os.path.basename(f).rsplit('.', 1)[0], h)
        if escribir:
            os.makedirs(od, exist_ok=True)
            dst = os.path.join(od, n + '.' + ext)
            if not os.path.exists(dst):
                shutil.copyfile(f, dst)
        if ext == 'wvx':
            out['bancos'].append(n)
        else:
            out[ext] = n
    return out

def num_opts(o, k):
    return [x for x in o.get(k, []) if isinstance(x, int)]
H_VR, H_PLUS = (60806, 48972)

def manda_plus(script, vm, pid):
    sb = sandbox(script, vm, 'p', pid, [])
    return any((x['cmd'] == 'mesg' and len(x['a']) >= 2 and all((isinstance(q, dict) for q in x['a'][:2])) and (x['a'][0].get('id') == H_VR) and (x['a'][1].get('id') == H_PLUS) for x in sb.eventos))

def guion_sala(st, script, escribir=True):
    dst = os.path.join(OUT, st, 'guion.json')
    if escribir and (not os.path.exists(dst) or FORZAR):
        tipos = {}

        def v(x, prof, ctx):
            if x.get('cmd') == 'chara' and x['args'] and isinstance(x['args'][0], dict) and ('id' in x['args'][0]):
                h = x['args'][0]['id']
                tipos['%04x' % h] = gcx.CHARAS.get(h, {}).get('nombre', '%04x' % h)
        ve.niv_rec(script, v)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        json.dump({'st': st, 'procs': {'%04x' % k: b for k, b in script['procs'].items()}, 'charas': tipos}, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    return ve.rel(dst)

def anims_godzila(st, idx, escribir=True):
    f = idx.get(('oar', 9810))
    if not f:
        import glob
        g = glob.glob(os.path.join(ST, st, 'cache', '2652.oar'))
        f = g[0] if g else None
    if not f:
        return None
    if escribir and (not os.path.exists(os.path.join(ASSETS, 'anim', 'vr_godzila.json')) or FORZAR):
        import anims as an
        an.exportar(f, 'vr_godzila', an.NOMBRES_ENEMY, an.ACT_ENEMY, an.CICLICAS_ENEMY)
    return 'vr_godzila'
EXTRA_ENEMY = [('vefgh_06', 11, 'levantarse de la pose del mensaje'), ('vijkl_07', 48, 'nodo 15 (NG 08)')]

def anims_enemy_extra(escribir=True):
    dst = os.path.join(ASSETS, 'anim', 'vr_enemy_extra.json')
    if not escribir or (os.path.exists(dst) and (not FORZAR)):
        return 'vr_enemy_extra' if os.path.exists(dst) else None
    from oar import leer
    clips, huesos = ({}, 16)
    for st, mi, nombre in EXTRA_ENEMY:
        f = os.path.join(ST, st, 'cache', 'enemy.oar')
        if not os.path.exists(f):
            print('  sin', f)
            continue
        r = leer(f, ())
        if mi >= len(r['motions']):
            print('  %s: sin el motion 0x%02x' % (st, mi))
            continue
        m = r['motions'][mi]
        huesos = r['n_joint']
        clips[nombre] = {'n': mi, 'cuadros': len(m['cuadros']), 'rot': [v for c in m['cuadros'] for h in c for v in h], 'altura': m['altura'], 'paso': [v for p in m['paso'] for v in p], 'sala': st}
    if not clips:
        return None
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    json.dump({'huesos': huesos, 'fps': 30, 'clips': clips}, open(dst, 'w'), separators=(',', ':'))
    print('vr_enemy_extra:', ', '.join(('%s (%d cuadros)' % (k, v['cuadros']) for k, v in clips.items())))
    return 'vr_enemy_extra'

def anims_snake_vr(escribir=True):
    dst = os.path.join(ASSETS, 'anim', 'vr_snake_f846.json')
    if not escribir or (os.path.exists(dst) and (not FORZAR)):
        return 'vr_snake_f846' if os.path.exists(dst) else None
    from oar import leer
    f = os.path.join(ST, 'vefgh_07', 'cache', 'f846.oar')
    if not os.path.exists(f):
        return None
    r = leer(f, ())
    clips = {'snake_f846:%d' % i: {'n': i, 'cuadros': len(m['cuadros']), 'rot': [v for c in m['cuadros'] for h in c for v in h], 'altura': m['altura'], 'paso': [v for p in m['paso'] for v in p]} for i, m in enumerate(r['motions'])}
    json.dump({'huesos': r['n_joint'], 'fps': 30, 'clips': clips}, open(dst, 'w'), separators=(',', ':'))
    print('vr_snake_f846:', ', '.join(('%s (%d)' % (k, v['cuadros']) for k, v in clips.items())))
    return 'vr_snake_f846'
CICLICAS_NINJA = {2, 3, 4, 5, 6, 12, 21, 22, 23, 24, 26}

def ninja_jugable(st, idx, escribir=True):
    import glob

    def buscar(tipo, h, nombre):
        f = idx.get((tipo, h))
        if not f:
            g = glob.glob(os.path.join(ST, st, 'cache', nombre))
            f = g[0] if g else None
        return f
    fk, fm, fo = (buscar('kmd', 37617, '92f1.kmd'), buscar('oar', 5887, '16ff.oar'), buscar('oar', 60932, 'ee04.oar'))
    if not fk or not fm:
        return None
    od = os.path.join(OUT, 'comun')
    os.makedirs(od, exist_ok=True)
    dst = os.path.join(od, 'ninja_vr.glb')
    if escribir and (not ve.exportar_glb(fk, dst, True)):
        return None
    import anims as an
    if escribir and (not os.path.exists(os.path.join(ASSETS, 'anim', 'vr_ninja.json')) or FORZAR):
        an.exportar(fm, 'vr_ninja', ciclicas=CICLICAS_NINJA)
    if fo and escribir and (not os.path.exists(os.path.join(ASSETS, 'anim', 'vr_ninja_o.json')) or FORZAR):
        an.exportar(fo, 'vr_ninja_o')
    return {'modelo': ve.rel(dst), 'anims': 'vr_ninja', 'anims_o': 'vr_ninja_o' if fo else None}

def luz_clave(amb, main):
    return hashlib.md5(json.dumps([amb, main]).encode()).hexdigest()[:6]

def inventario(vm):
    L = lambda off: vm.get('$w:L%04x' % off)
    armas = [L(34 + 2 * i) for i in range(10)]
    maxs = [L(54 + 2 * i) for i in range(10)]
    items = [L(74 + 2 * i) for i in range(24)]
    return {'armas': armas, 'armas_max': maxs, 'items': items, 'arma': L(28), 'item': L(30), 'silenciador': L(120)}

def zonas_huella(hzs):
    r = {}
    for h in hzs:
        for g in (h or {}).get('grupos', []):
            for t in g.get('triggers', []):
                if t.get('tipo') == 'trap' and t.get('nombre') in ('asiato', 'pool') and t.get('caja'):
                    r.setdefault(t['nombre'], []).append(t['caja'])
    return r or None

def variantes_rand(script, e, base, vm, hzp):
    n = getattr(vm, 'rand_n', 0)
    if n < 2:
        return None
    out = []
    for r in range(n):
        if r == 0:
            v = vm
        else:
            cls = type('VMDiscoR', (VMDisco,), {'rand_valor': r})
            v = correr(script, e, base, cls=cls)
        cambios = {}
        for ev in v.eventos:
            if ev['cmd'] == 'mesg' and len(ev['a']) >= 3 and isinstance(ev['a'][1], dict) and (ev['a'][1].get('id') == 17167):
                g = ev['a'][0]['id'] if isinstance(ev['a'][0], dict) else None
                cambios[g] = ev['a'][2]
        gs = {}
        for a in v.actores:
            o = a['opts']
            if a['tipo'] == 'MYSTERYHEI':
                rr = (o.get('r') or [0])[0] if isinstance((o.get('r') or [0])[0], int) else 0
                d = {'mystery': {'b': chr((num_opts(o, 'b') or [65])[0]), 'k': (num_opts(o, 'k') or [0])[0], 'a': chr((num_opts(o, 'a') or [65])[0])}, 'ruta': rr, 'puntos': ve.ruta_pts(hzp, rr)}
                if a['nombre'] in cambios:
                    d['ruta_inicio'] = {'ruta': cambios[a['nombre']], 'puntos': ve.ruta_pts(hzp, cambios[a['nombre']])}
                gs[str(a['nombre'])] = d
            if a['tipo'] == 'BELONG':
                c = (o.get('c') or [None])[0]
                gs.setdefault('belong', []).append({'nombre': a['nombre'], 'c': c.get('id') if isinstance(c, dict) else c})
        out.append({'r': r, 'guardias': gs, 'trampas': getattr(v, 'trampas', []), 'vars': {'g': [[i, b] for i, b in enumerate(v.g) if b], 'l': [[i, b] for i, b in enumerate(v.l) if b]}})
    return out

def mision(e, base, com, por_clave, escribir=True):
    st = e['st']
    script = leer(st)
    vm = correr(script, e, base)
    idx = niveles.indice(st)
    od = os.path.join(OUT, st)
    if escribir:
        os.makedirs(od, exist_ok=True)
    amb, main, lz = ve.luz_de(vm)
    suf = luz_clave(list(amb), [list(main[0]), list(main[1])] if main else None)
    mapas = []
    for mid in vm.orden_mapas:
        s = vm.mapas[mid]
        o = ve.opciones(s)
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
            dst = os.path.join(od, '%04x_%s.glb' % (h, suf))
            if SIN_GLB or not escribir or ve.exportar_glb(f, dst, False, {'luces': luces, 'amb': amb, 'main': main, 'pos': (0, 0, 0), 'rot': 0.0}):
                piezas.append(ve.rel(dst))
        hzj = []
        datos_hz = None
        for h in hz:
            f = idx.get(('hzm', h))
            if not f:
                continue
            datos_hz = hzm.leer(f)
            dst = os.path.join(od, '%04x.hzm.json' % h)
            if escribir and (not os.path.exists(dst) or FORZAR):
                json.dump(datos_hz, open(dst, 'w'), separators=(',', ':'))
            hzj.append(ve.rel(dst))
        mapas.append({'id': mid, 'kmds': kmds, 'lit': lit, 'piezas': piezas, 'hzm_json': hzj, '_hz': datos_hz})
    principal = vm.orden_mapas[0] if vm.orden_mapas else None
    hzp = mapas[0]['_hz'] if mapas else None
    cambios = {}
    for ev in vm.eventos:
        if ev['cmd'] == 'mesg' and len(ev['a']) >= 3 and isinstance(ev['a'][1], dict) and (ev['a'][1].get('id') == 17167):
            g = ev['a'][0]['id'] if isinstance(ev['a'][0], dict) else None
            cambios[g] = {'ruta': ev['a'][2], 'n': ev['a'][3:6], 't': round(ev['t'] / FPS, 2)}
    actores = []
    vr = {}
    ventana = None
    goal = None
    tipos = set()
    modelos_vr4 = {}
    if any((a['tipo'] == 'VRBOX4' for a in vm.actores)) or '"id": %d' % 21648 in json.dumps(script.get('procs', {})):
        for m_, n_ in (('4', 'ufo'), ('7', 'ufo2')):
            f = idx.get(('kmd', ve.strcode(n_)))
            if not f:
                continue
            dst = os.path.join(od, n_ + '.glb')
            if SIN_GLB and os.path.exists(dst) or not escribir or ve.exportar_glb(f, dst, False):
                modelos_vr4[m_] = ve.rel(dst)
    for a in vm.actores:
        t = a['tipo']
        o = a['opts']
        tipos.add(t)
        if t == 'MYSTERYHEI':
            t = 'WATCHER'
        if t == 'NINJAPLAY':
            t = 'SNAKE'
        if t == 'MINENE':
            t = 'WATCHER'
        es_vrbox3 = t == 'VRBOX3'
        if t == 'VRBOX3':
            t = 'VRBOX2'
            pp = num_opts(o, 'p')
            o = dict(o, w=[0])
            if len(pp) >= 3:
                o['p'] = [pp[0], pp[1] + 1140, pp[2]]
        if t == 'GODZILA':
            t = 'WATCHER'
        if t == 'GODZCOM':
            t = 'COMMANDER'
            o = {k: v for k, v in o.items() if k != 'n'}
        act = {'tipo': t, 'nombre': a['nombre'], 'mapa': a['mapa'], 'ctx': a['ctx'], 't': a['t'], 'opts': o}
        if a['tipo'] == 'GODZILA':
            esc = 4096 + (num_opts(o, 's') or [0])[0]
            act['escala'] = round(esc / 4096, 4)
            act['alt_ctrl'] = 6000
            act['paso_caminar'] = 40
            act['anims'] = anims_godzila(st, idx, escribir)
        if a['tipo'] == 'MYSTERYHEI':
            act['mystery'] = {'b': chr((num_opts(o, 'b') or [65])[0]), 'k': (num_opts(o, 'k') or [0])[0], 'a': chr((num_opts(o, 'a') or [65])[0])}
            if num_opts(o, 's'):
                act['escala'] = round((4096 + num_opts(o, 's')[0]) / 4096, 4)
        if a['tipo'] == 'MINENE' and 84 in (o.get('b') or []):
            act['es_snake'] = True
        p = o.get('p')
        d = o.get('d')
        if p and len(p) >= 3 and all((isinstance(x, int) for x in p[:3])):
            act['p'] = p[:3]
        if d and len(d) >= 3 and all((isinstance(x, int) for x in d[:3])):
            act['d'] = d[:3]
        if t in ('VR', 'VR2'):
            vr = {'opts': o, 'crudo': a.get('crudo', {}), 't': a['t'], 'tipo': t}
            continue
        if t == 'GOAL':
            goal = {'p': act.get('p'), 'd': act.get('d'), 'modelo': com.get('b466'), 'oculta': (o.get('v') or [1])[0] == 0}
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
            act['puntos'] = ve.ruta_pts(hzp, r)
            if act['puntos']:
                act['p'] = act['puntos'][0]['p']
            act['modelo'] = com.get('snake') if act.get('es_snake') and com.get('snake') else com.get('ippanhei')
            ch = cambios.get(a['nombre'])
            if ch:
                act['ruta_inicio'] = dict(ch, puntos=ve.ruta_pts(hzp, ch['ruta']))
            pe = (o.get('e') or [None])[0]
            if isinstance(pe, dict) and 'proc' in pe and manda_plus(script, vm, pe['proc']):
                act['cuenta'] = True
        if t == 'COMMANDER' and (o.get('w') or [0])[0] == 2:
            act['opts'] = dict(o, reponer_siempre=[1])
        if t == 'CAMERA':
            act['modelo'] = com.get('s_camera')
            act['brazo'] = com.get('cam_arm')
        if es_vrbox3:
            f = idx.get(('kmd', 50983))
            act['vrbox3'] = True
            if f:
                dst = os.path.join(od, 'c727.glb')
                if SIN_GLB and os.path.exists(dst) or not escribir or ve.exportar_glb(f, dst, False):
                    act['modelo'] = ve.rel(dst)
        if t in ('BELONG', 'BOXALL', 'MYSTERYDOOR'):
            m = o.get('m') or []
            f = idx.get(('kmd', m[0]['id'])) if m and isinstance(m[0], dict) and ('id' in m[0]) else None
            if f:
                dst = os.path.join(od, '%04x.glb' % m[0]['id'])
                if SIN_GLB and os.path.exists(dst) or not escribir or ve.exportar_glb(f, dst, False):
                    act['modelo'] = ve.rel(dst)
        if t == 'WALL':
            m = o.get('m') or []
            f = idx.get(('kmd', m[0]['id'])) if m and isinstance(m[0], dict) and ('id' in m[0]) else None
            if f:
                pz = tuple(act.get('p') or (0, 0, 0))
                rz = (act.get('d') or [0, 0, 0])[1] * 2 * 3.141592653589793 / 4096
                dst = os.path.join(od, 'w%04x_%s_%s.glb' % (m[0]['id'], suf, hashlib.md5(repr((pz, rz)).encode()).hexdigest()[:4]))
                luzw = {'luces': [], 'amb': amb, 'main': main, 'pos': pz, 'rot': rz}
                if SIN_GLB and os.path.exists(dst) or not escribir or ve.exportar_glb(f, dst, False, luzw):
                    act['modelo'] = ve.rel(dst)
        if t in ('VRBOX', 'VRBOX2', 'VRBOX4'):
            act['modelo'] = act.get('modelo') if es_vrbox3 and act.get('modelo') else com.get('box_01')
            if t == 'VRBOX4':
                act['modelo'] = modelos_vr4.get(str((num_opts(o, 'm') or [0])[0])) or act['modelo']
            if t in ('VRBOX', 'VRBOX4'):
                r = (o.get('r') or [0])[0]
                act['puntos'] = ve.ruta_pts(hzp, r) if isinstance(r, int) else []
        actores.append(act)
    for act in actores:
        if vm.t_ventana is not None and act['t'] * FPS > vm.t_ventana:
            act['tras_ventana'] = True
        act['t'] = 0
    faltan = sorted(tipos - SOPORTADOS)
    sb_trampa = None
    ventana_tr = None
    if ventana is None:
        for s_ in getattr(vm, 'trampas', []):
            bl = next((x['bloque'] for x in s_['args'] if isinstance(x, dict) and 'bloque' in x), None)
            z_ = s_['args'][0] if s_['args'] and isinstance(s_['args'][0], dict) else {}
            if bl is None:
                continue
            sb_ = sandbox(script, vm, 'b', bl, [z_.get('id', 0), 8650, 3538])
            w_ = next((x for x in sb_.actores if x['tipo'] == 'VRWINDOW'), None)
            if w_:
                sb_trampa = sb_
                ventana_tr = w_
                break

    def armar_ventana(a):
        o = a['opts']
        lineas = [x for x in o.get('b', []) if isinstance(x, str)]
        n = (o.get('i') or [len(lineas)])[0]
        mostrar = [limpiar(texto_disco(x)) for x in lineas[:n]]
        w = o.get('w') or [0, 0, 256]
        return ({'lineas': mostrar, 'n': n, 'w': w, 'm': o.get('m'), 'cuadro_ps1': {'ancho': ((w[2] if len(w) > 2 else 256) + 3) // 4 * 4, 'alto': n * 18 + 18}}, lineas)
    win = None
    lineas_win = []
    if ventana:
        win, lineas_win = armar_ventana(ventana)
    win_tr = None
    if ventana_tr:
        win_tr, lineas_win = armar_ventana(ventana_tr)
        p_ = ventana_tr['opts'].get('p') or []
        win_tr['proc'] = '%04x' % p_[0]['proc'] if p_ and isinstance(p_[0], dict) and isinstance(p_[0].get('proc'), int) else None
    ov = vr.get('opts', {})
    cr = vr.get('crudo', {})
    limite = None
    if 'a' in cr and cr['a'] and isinstance(cr['a'][0], int):
        limite = cr['a'][0]
    elif 'a' in cr and cr['a'] and isinstance(cr['a'][0], dict) and ('var' in cr['a'][0]):
        limite = vm.get(cr['a'][0]['var']) or None
    acumula = isinstance((cr.get('t') or [None])[0], dict)
    rk = cr.get('r', [])
    ranking = None
    if rk:
        vars_ = [x.get('var') for x in rk if isinstance(x, dict) and 'var' in x]
        vals = [vm.get(v) for v in vars_]
        ranking = {'vars': [PREFIJO_REC + v for v in vars_], 'inicial': [{'t': abs(v), 'def': v < 0} for v in vals]}
    proc_ok = (cr.get('e') or [None])[0]
    proc_ok = int(proc_ok['proc'], 16) if isinstance(proc_ok, dict) and 'proc' in proc_ok else None
    s_opt = cr.get('s', [])
    tiro = {'espera': s_opt[0], 'proc': s_opt[1]['proc']} if len(s_opt) >= 2 and isinstance(s_opt[1], dict) else None
    if tiro and goal is None:
        sb = sandbox(script, vm, 'p', int(tiro['proc'], 16), [])
        g = next((x for x in sb.actores if x['tipo'] == 'GOAL'), None)
        if g:
            goal = {'p': g['opts']['p'][:3], 'd': g['opts'].get('d', [0, 0, 0])[:3], 'modelo': com.get('b466')}
    b_opt = cr.get('b', [])
    blancos_vr = {'n': b_opt[0], 'proc': b_opt[1]['proc'] if len(b_opt) > 1 and isinstance(b_opt[1], dict) else None} if b_opt and isinstance(b_opt[0], int) else None
    c_opt = cr.get('c', [])
    claymores = {'n': c_opt[0], 'proc': c_opt[1]['proc']} if len(c_opt) >= 2 and isinstance(c_opt[0], int) and isinstance(c_opt[1], dict) else None
    if tiro:
        tiro['sonido'] = [184]
    clear = None
    if proc_ok is not None:
        sb = sandbox(script, vm, 'p', proc_ok, [600, 1, 2, 3])
        vcs = [x for x in sb.actores if x['tipo'] in ('VRCLEAR', 'VRCLEAR2')] or [x for x in vm.actores if x['tipo'] in ('VRCLEAR', 'VRCLEAR2')] or [x for x in (sb_trampa.actores if sb_trampa else []) if x['tipo'] in ('VRCLEAR', 'VRCLEAR2')]
        if vcs:
            o = vcs[-1]['opts']
            p = o.get('p', [])
            procs = [x['proc'] for x in p[1:] if isinstance(x, dict) and 'proc' in x]
            ops = [destino(script, sb, pid, por_clave) for pid in procs]
            clear = {'opciones': ops, 'voces': [x for x in o.get('t', []) if isinstance(x, int)], 'automatico': None, 'c': [x for x in o.get('c', []) if isinstance(x, int)]}
        if clear is None and sb.cargas:
            ld = sb.cargas[-1]
            a = ld['a']
            c = clave_de(a, sb.get(G_MODO), sb.get(G_NUM), sb.get(G_LISTA))
            if a not in ('selectvr', 'vrtitle', 'title', 'vrsave'):
                clear = {'opciones': [], 'voces': [], 'automatico': {'st': a, 'clave': c if c in por_clave else None, 'cuadros': int(ld['t'])}}
        clear = clear or {'opciones': [], 'voces': []}
        hc = ve.strcode('clear')
        for x in sb.eventos:
            if x['cmd'] == 'mesg' and len(x['a']) >= 2 and all((isinstance(q, dict) and q.get('id') == hc for q in x['a'][:2])):
                clear.setdefault('mostrar', x['t'])
        clear['sonidos'] = [{'t': x['t'], **({'se': x['o']['e'][2]} if x['o'].get('e') else {}), **({'voz': x['o']['v'][0]} if x['o'].get('v') else {})} for x in sb.eventos if x['cmd'] == 'sound' and (x['o'].get('e') or x['o'].get('v'))]
    sig = next((o.get('clave') for o in (clear or {}).get('opciones', []) if o['tipo'] == 'siguiente'), None)
    inv = inventario(vm)
    con_arma = inv['arma'] >= 0 and inv['armas'][inv['arma']] > 0
    mun = None
    if con_arma:
        a = inv['arma']
        mun = {'balas': inv['armas'][a], 'max': inv['armas_max'][a], 'arma': ['SOCOM', 'FAMAS', 'GRENADE', 'NIKITA', 'STINGER', 'CLAYMORE', 'C4', 'STUN', 'CHAFF', 'PSG1'][a], 'id': a, 'silenciador': inv['silenciador'] >= 0}
    modelos_guion = {}

    def _walls(b):
        for s_ in b:
            if s_.get('cmd') == 'chara' and s_['args'] and isinstance(s_['args'][0], dict) and (gcx.CHARAS.get(s_['args'][0].get('id'), {}).get('nombre') in ('WALL', 'BELONG')):
                o_ = ve.opciones(s_)
                m_ = o_.get('m') or []
                h_ = m_[0].get('id') if m_ and isinstance(m_[0], dict) else None
                f_ = idx.get(('kmd', h_)) if h_ is not None else None
                if f_ and '%04x' % h_ not in modelos_guion and (h_ not in ya_walls):
                    pp_ = o_.get('p') or [0, 0, 0]
                    dd_ = o_.get('d') or [0, 0, 0]
                    pz = tuple((x if isinstance(x, int) else 0 for x in pp_[:3]))
                    rz = (dd_[1] if len(dd_) > 1 and isinstance(dd_[1], int) else 0) * 2 * 3.141592653589793 / 4096
                    dst = os.path.join(od, 'g%04x_%s.glb' % (h_, suf))
                    if SIN_GLB and os.path.exists(dst) or not escribir or ve.exportar_glb(f_, dst, False, {'luces': [], 'amb': amb, 'main': main, 'pos': pz, 'rot': rz}):
                        modelos_guion['%04x' % h_] = ve.rel(dst)
            for a_ in s_.get('args', []):
                if isinstance(a_, dict) and 'bloque' in a_:
                    _walls(a_['bloque'])
                if isinstance(a_, dict) and 'opt' in a_:
                    for v_ in a_['v']:
                        if isinstance(v_, dict) and 'bloque' in v_:
                            _walls(v_['bloque'])
    ya_walls = {((x['opts'].get('m') or [{}])[0] or {}).get('id') for x in vm.actores if x['tipo'] in ('WALL', 'BELONG') and isinstance((x['opts'].get('m') or [None])[0], dict)}
    if getattr(vm, 'trampas', None) or sb_trampa:
        for b_ in script['procs'].values():
            _walls(b_)
    seq = {}
    t0 = (vm.t_ventana or 0) + 1
    for a in vm.actores:
        if a['tipo'] == 'VR_SNAKE':
            seq['materializa'] = round(a['t'] * FPS - t0)
            seq['materializa_dur'] = (a['opts'].get('t') or [45])[0]
            seq['color'] = a['opts'].get('c')
        if a['tipo'] == 'SNEBREATH':
            seq['aliento'] = round(a['t'] * FPS - t0)
    for x in vm.eventos:
        if x['cmd'] == 'pad' and 's' in x['o'] and (x['t'] >= t0):
            seq.setdefault('control', x['t'] - t0)
        if x['cmd'] == 'mesg' and len(x['a']) >= 2 and isinstance(x['a'][0], dict) and (x['a'][0].get('id') == 60806) and (x['t'] >= t0):
            seq.setdefault('reloj', x['t'] - t0)
        if x['cmd'] == 'mesg' and len(x['a']) == 2 and isinstance(x['a'][0], dict) and (x['a'][1] == 0) and (x['t'] >= t0) and any((a['tipo'] == 'MYSTERYHEI' and a['nombre'] == x['a'][0].get('id') for a in vm.actores)):
            seq.setdefault('mensajes', []).append([x['t'] - t0, x['a'][0]['id'], 0])
    camaras = {}
    for x in vm.eventos:
        if x['cmd'] == 'camera' and x['o'].get('s') and all((isinstance(v, int) for v in x['o']['s'])) and ('e' not in x['o']):
            camaras.setdefault(x['o']['s'][0], x['o']['s'][1:])
    luzj = {'luces': [], 'amb': list(amb), 'main': [list(main[0]), list(main[1])] if main else None}
    trampas = getattr(vm, 'trampas', [])
    variantes = variantes_rand(script, e, base, vm, hzp)
    zonas_tr = {}
    if trampas:
        quiere = set()
        todas = False
        for s in trampas + [t for x in variantes or [] for t in x.get('trampas', [])]:
            z = s['args'][0] if s['args'] and isinstance(s['args'][0], dict) else {}
            if z.get('id') == 5321:
                todas = True
            elif 'id' in z:
                quiere.add(z['id'] & 65535)
        for m in mapas:
            for g in (m['_hz'] or {}).get('grupos', []):
                for t in g.get('triggers', []):
                    if t.get('tipo') != 'trap' or not t.get('nombre'):
                        continue
                    h = gcx.strcode(t['nombre']) & 65535
                    if todas or h in quiere:
                        zonas_tr.setdefault('%04x' % h, []).append(t['caja'])
    mapas_hz = [m['_hz'] for m in mapas if m.get('_hz')]
    for m in mapas:
        m.pop('_hz', None)
    enemigos = sum((1 for a in actores if a['tipo'] == 'WATCHER'))
    blancos = sum((1 for a in actores if a['tipo'] in ('VRBOX', 'VRBOX2', 'VRBOX4')))
    modo_int = 3 if tiro or blancos_vr or con_arma else 1 if limite else 0
    titulo = win['lineas'][:2] if win else []
    datos = {'id': st, 'mapas': mapas, 'orden_mapas': vm.orden_mapas, 'actores': actores, 'camaras': [], 'juego': {'estado': 'VR MISSIONS ' + ' '.join(titulo), 'progreso': 0, 'mapa_inicial': principal, 'fondo': None}, 'principal': principal, 'visibles': [principal] if principal is not None else [], 'salidas': [], 'luz': luzj, 'brillos': [], 'demos': [], 'vr': {'sala': st, 'modo': modo_int, 'nombre_modo': ' '.join(titulo), 'variante': suf, 'etapa': e['n'], 'disco': {'clave': e['clave'], 'modo': e['modo'], 'n': e['n'], 'lista': e['lista'], 'lnum': e['lnum'], 'faltan': faltan, 'camaras': f"vr/disco/{st}/camaras_{e['clave']}.json", 'inventario': inv, 'blancos': blancos, 'sonido': dict(sonido_de(st, escribir), canciones=[2, 2]), 'sub': limpiar(texto_disco(lineas_win[3])) if len(lineas_win) > 3 else '', 'guion': guion_sala(st, script, escribir), 'trampas': trampas, 'zonas': zonas_tr, 'arranque': [[x['a'][0]['id'], x['a'][1]['id']] for x in vm.eventos if x['cmd'] == 'mesg' and len(x['a']) >= 2 and all((isinstance(q, dict) and 'id' in q for q in x['a'][:2])) and (x['a'][1]['id'] == 39455)], 'vars': {'g': [[i, b] for i, b in enumerate(vm.g) if b], 'l': [[i, b] for i, b in enumerate(vm.l) if b]}}, 'zonas_huella': zonas_huella(mapas_hz), 'variantes': variantes, 'ventana_trampa': win_tr, 'reloj_guion': bool(win_tr), 'modelos_guion': modelos_guion, 'ventana': win, 'meta': {'p': num_opts(ov, 'p')[:3], 'goal': goal, 'aparece_al_limpiar': bool(tiro or blancos_vr or claymores), 'dir': (num_opts(ov, 'd') or [0])[0], 'h': num_opts(ov, 'h')[:3] or None}, 'limite': limite, 'limite_seg': round(limite / FPS, 2) if limite else None, 'arrastra': None, 'tiempo_previo': None, 'voz': (num_opts(ov, 'o') or [None])[0], 'ranking': ranking, 'municion': mun, 'enemigos': enemigos, 'tiro': tiro, 'blancos': blancos_vr, 'clear': clear, 'claymores': claymores, 'rutas': {str(r): pts for r in range(len((hzp or {}).get('rutas', []))) for pts in [ve.ruta_pts(hzp, r) if hzp else []] if pts}, 'visto_falla': 'v' not in ov and vr.get('tipo') != 'VR2', 'f': (num_opts(ov, 'f') or [None])[0], 'acumula': acumula, 'ninja': ninja_jugable(st, idx, escribir) or True if any((a['tipo'] == 'NINJAPLAY' for a in vm.actores)) else False, 'vr2': {'minimo': (num_opts(ov, 'b') or [0])[0], 'limite': limite or 1800} if vr.get('tipo') == 'VR2' else None, 'cuenta_guardias': sum((1 for a in actores if a.get('cuenta'))), 'siguiente': sig, 'secuencia': seq, 'camaras': camaras, 'luz_script': lz, 'fondo': {'vrbg': 1 if modo_int == 0 else 2 if modo_int == 1 else 3, 'vrbg3': next((a['opts'].get('t', [None])[0] for a in vm.actores if a['tipo'] == 'VRBG3'), None)}, 'spark': None, 'derrota': ['visto', 'tiempo', 'muerte'], 'items': {'socom': com.get('4d61'), 'racion': com.get('4d63'), 'caja': com.get('4d60'), 'blanco': com.get('box_01'), 'vrbox4': modelos_vr4}}}
    return (datos, vm, script)

def texto_disco(s):
    out, i = ([], 0)
    while i < len(s):
        c = s[i]
        if c == '�' and i + 1 < len(s):
            n = s[i + 1]
            out.append({1: '"', 2: '"', 3: '*'}.get(ord(n), n if ord(n) >= 32 else ''))
            i += 2
            continue
        out.append(c)
        i += 1
    return ''.join(out)

def limpiar(s):
    return ''.join((ch for ch in s if ch == ' ' or 32 < ord(ch) < 127)).rstrip()

def camaras(e, base):
    st = e['st']
    vc.correr = lambda script, modo, b: correr(script, e, base, cls=vc.VMEv)
    ve.MODOS = {0: e['clave']}
    d = vc.sala(st, 0, base)
    d['estado'] = 'VR MISSIONS ' + e['clave']
    return d

def voces(ids):
    import vox
    od = os.path.join(OUT, 'vox')
    os.makedirs(od, exist_ok=True)
    f = os.path.join(DISCO, '00_disco', 'MGS', 'VOX.DAT')
    if not os.path.exists(f):
        return {}
    out = {}
    with open(f, 'rb') as fh:
        mm = mmap.mmap(fh.fileno(), 0, access=mmap.ACCESS_READ)
        for i in sorted(ids):
            dst = os.path.join(od, f'{i}.m4a')
            if not os.path.exists(dst) or FORZAR:
                tmp = os.path.join(od, f'_tmp_{i}.wav')
                try:
                    s = vox.stream_en(mm, i)
                    if not s or not vox.exportar_wav(mm, s, tmp):
                        print('  sin voz', i)
                        continue
                    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'aac', '-b:a', '64k', dst], check=False)
                except Exception as ex:
                    print('  sin voz', i, ex)
                    continue
                finally:
                    if os.path.exists(tmp):
                        os.remove(tmp)
            if os.path.exists(dst):
                out[str(i)] = ve.rel(dst)
    return out
SIN_GLB = '--sin-glb' in sys.argv
FORZAR = '--forzar' in sys.argv
ve.SIN_GLB = SIN_GLB
ve.FORZAR = FORZAR

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    if not os.path.exists(os.path.join(ST, 'selectvr', 'cache', 'scenerio.gcx')):
        print('vr_disco_export: no está el disco de VR Missions (extraido/vr_usa/01_stages): no hay nada que exportar')
        return 0
    usar_disco_vr()
    args = sys.argv[1:]
    grupos = None
    if '--grupos' in args:
        grupos = set(args[args.index('--grupos') + 1].split(','))
    pedidas = {a for i, a in enumerate(args) if not a.startswith('--') and (i == 0 or args[i - 1] != '--grupos')}
    os.makedirs(OUT, exist_ok=True)
    base = memoria_inicial()
    cat = catalogo(base)
    por_clave = {e['clave']: e for e in cat}
    com = comunes()
    for st in ('photo_n1', 'photo_n2', 'photo_n3', 'photo_m1', 'photo_m2'):
        if os.path.isdir(os.path.join(ST, st)):
            cat.append({'clave': st, 'st': st, 'modo': 0, 'n': 0, 'lista': 0, 'lnum': 0, 'proc': None})
    ids_vox = set()
    resumen = []
    anterior = {}
    fcat = os.path.join(OUT, 'catalogo.json')
    if os.path.exists(fcat):
        try:
            anterior = {x['clave']: x for x in json.load(open(fcat, encoding='utf-8')).get('misiones', [])}
        except Exception:
            anterior = {}
    for e in cat:
        e['grupo'] = 'photo' if e['st'].startswith('photo') else grupo_de(e['modo'], e['lista'], e['st'])
        e['pagina'] = PAGINA_GRUPO.get(e['grupo'], 'SPECIAL')
        e['nombre_grupo'] = NOMBRE_GRUPO.get(e['grupo'], e['grupo'].upper())
        if e['st'].startswith('vr_'):
            e['arma'] = ARMAS.get(e['st'][3:6])
        estado = ESTADO_GRUPO.get(e['grupo'], 'no')
        quiere = (grupos is None or e['grupo'] in grupos) and (not pedidas or e['clave'] in pedidas)
        if e['grupo'] == 'photo':
            prev = anterior.get(e['clave'])
            if prev and prev.get('jugable') and os.path.exists(os.path.join(OUT, e['st'] + '.json')):
                for k in ('n', 'titulo', 'jugable', 'motivo', 'limite', 'practica', 'texto'):
                    if k in prev:
                        e[k] = prev[k]
                continue
            e['jugable'] = False
            e['motivo'] = ESTADO_GRUPO['photo']
            e['titulo'] = ['PHOTOGRAPH', e['st'].upper()]
            continue
        if not quiere and e['clave'] in anterior:
            for k in ('titulo', 'jugable', 'motivo', 'limite', 'practica', 'faltan', 'sub', 'texto'):
                if k in anterior[e['clave']]:
                    e[k] = anterior[e['clave']][k]
            if e.get('jugable') and (not os.path.exists(os.path.join(OUT, e['clave'] + '.json'))):
                e['jugable'] = False
                e['motivo'] = 'sin exportar'
            continue
        try:
            d, vm, script = mision(e, base, com, por_clave, escribir=quiere)
        except Exception as ex:
            import traceback
            traceback.print_exc()
            e['jugable'] = False
            e['motivo'] = 'error al exportar: %s' % ex
            continue
        v = d['vr']
        vw = v['ventana'] or v.get('ventana_trampa')
        e['titulo'] = vw['lineas'][:2] if vw else []
        e['limite'] = v['limite']
        e['practica'] = not v['limite']
        e['faltan'] = v['disco']['faltan']
        e['sub'] = v['disco']['sub']
        e['texto'] = (vw or {}).get('lineas', [])[3:]
        if estado != 'si':
            e['jugable'] = False
            e['motivo'] = estado
        elif e['clave'] in NO_JUGABLE:
            e['jugable'] = False
            e['motivo'] = NO_JUGABLE[e['clave']]
        elif e['faltan']:
            e['jugable'] = False
            e['motivo'] = 'no: actores sin portar (%s)' % ', '.join(e['faltan'])
        else:
            e['jugable'] = True
            e['motivo'] = None
        if not quiere:
            if e['jugable'] and (not os.path.exists(os.path.join(OUT, e['clave'] + '.json'))):
                e['jugable'] = False
                e['motivo'] = 'sin exportar'
            continue
        json.dump(d, open(os.path.join(OUT, e['clave'] + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        if e['jugable']:
            cd = camaras(e, base)
            json.dump(cd, open(os.path.join(OUT, e['st'], 'camaras_%s.json' % e['clave']), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        for x in [v['voz']] + (v['clear'] or {}).get('voces', []) + [s.get('voz') for s in (v['clear'] or {}).get('sonidos', [])]:
            if isinstance(x, int) and x > 0:
                ids_vox.add(x)
        resumen.append(f"{e['clave']:24s} {e['grupo']:9s} {' / '.join(e['titulo']):40s} guardias {v['enemigos']} blancos {v['disco']['blancos']} límite {v['limite_seg']} arma {(v['municion'] or {}).get('arma')} {(v['municion'] or {}).get('balas')} faltan {e['faltan']}")
    vx = {} if '--sin-vox' in sys.argv else voces(ids_vox)
    if os.path.exists(fcat):
        try:
            vx = {**json.load(open(fcat, encoding='utf-8')).get('voces', {}), **vx}
        except Exception:
            pass
    grupos_menu = []
    for g in ['sneaking', 'weapon', 'advanced', 'battle', 'ninja', 'mystery', 'vs12', 'vrmission', 'puzzle', 'variety', 'ng', 'photo']:
        xs = [e for e in cat if e['grupo'] == g]
        if xs:
            jg = sum((1 for x in xs if x.get('jugable')))
            grupos_menu.append({'id': g, 'nombre': NOMBRE_GRUPO[g], 'pagina': PAGINA_GRUPO[g], 'n': len(xs), 'jugables': jg, 'estado': 'si' if g == 'photo' and jg == len(xs) else ESTADO_GRUPO.get(g)})
    try:
        menu = menu_original(cat)
    except Exception as ex:
        print('vr_disco_export: sin árbol del menú:', ex)
        menu = None
    json.dump({'disco': 'SLUS-00957', 'misiones': cat, 'grupos': grupos_menu, 'armas': ARMAS, 'orden_armas': ORDEN_ARMAS, 'comun': com, 'voces': vx, 'menu': menu}, open(fcat, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print('\n'.join(resumen))
    print('misiones', len(cat), 'jugables', sum((1 for e in cat if e.get('jugable'))), 'voces', sorted(ids_vox))
    fotos = [c for c in pedidas if c.startswith('photo_')]
    if '--sin-fotos' not in sys.argv and (fotos or (not pedidas and (grupos is None or 'photo' in grupos))):
        import vr_foto_export
        vr_foto_export.exportar(fotos or None)
    try:
        anims_enemy_extra()
        anims_snake_vr()
    except Exception as ex:
        print('vr_disco_export: sin vr_enemy_extra / vr_snake_f846:', ex)
    if '--sin-titulo' not in sys.argv:
        import vr_titulo_export
        vr_titulo_export.exportar()
    return 0
if __name__ == '__main__':
    sys.exit(main())
