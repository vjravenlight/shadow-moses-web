# MGS web — FeniXVOID · Project Ravenlight
import sys, os, json, struct, glob, re, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS
import gcx, hzm
import vr_disco_export as vd
import vr_export as ve
from export_glb import strcode
from kmd2obj import load as cargar_kmd
from pcx_mgs import decode as decodificar_pcx, modo_semi
ST = os.path.join(EXTRAIDO, 'vr_usa', '01_stages')
OUT = os.path.join(ASSETS, 'vr', 'disco')
FORZAR = '--forzar' in sys.argv
ve.FORZAR = FORZAR
SESIONES = {'photo_n2': {'g0478': 102, 'titulo': ['PHOTOGRAPH', 'NAOMI 1']}, 'photo_n3': {'g0478': 101, 'titulo': ['PHOTOGRAPH', 'NAOMI 2']}, 'photo_m2': {'g0478': 0, 'titulo': ['PHOTOGRAPH', 'MEI LING']}, 'photo_n1': {'g0478': 1, 'titulo': ['PHOTOGRAPH', 'NAOMI (DEBUG)']}, 'photo_m1': {'g0478': 4, 'titulo': ['PHOTOGRAPH', 'MEI LING (DEBUG)']}}
ORDEN = ['photo_m2', 'photo_n2', 'photo_n3', 'photo_m1', 'photo_n1']
CATEGORIAS = {'photo_n3': [45, 29, 9, 5, 1, 101], 'photo_n2': [46, 30, 10, 6, 2, 102], 'photo_m2': [44, 28, 8, 4, 100, 0]}
UMBRALES_CLEAR = [30, 90, 150, 210, 270, 300]

def config_g0478(g):
    if g in (0, 101, 102, 103):
        return (0, 0, 600)
    if g <= 3 or g == 100:
        return (1, 1, 240)
    if g <= 7:
        return (2, 2, 180)
    if g <= 27:
        return (3 if g <= 11 else 4 if g <= 15 else 5 if g <= 19 else 6 if g <= 23 else 7, 3, 120)
    if g <= 43:
        return (8 if g <= 31 else 9 if g <= 35 else 10 if g <= 39 else 11, 4, 90)
    return (12, 5, 60)
UMBRALES = [1, 4, 8, 28, 44, 48]
RADIOS = [1000, 2000, 4000, 6000, 10000, 16000]
OCTANTES = [[(0, 1000), (250, 1000)], [(0, 2000), (500, 2000)], [(0, 4000), (1500, 3750)], [(0, 6000), (2500, 6000)], [(0, 10250), (4000, 10000)], [(0, 16000), (6500, 16000), (9750, 13500)]]
RANGO = ['add_bb', 'add_fox', 'add_fal', 'add_mid', 'add_bad', 'add_chi', 'add_dbb', 'add_fox2']
BRILLO = ['brit_100'] * 4 + ['brit_90'] * 4 + ['brit_70'] * 20 + ['brit_50'] * 16 + ['brit_30'] * 4
OSCURO = ['dark_100', 'dark_100', 'dark_90', 'dark_70', 'dark_50', 'dark_30']

def r_de(g):
    r = g
    if r == 100:
        r = 1
    if r in (101, 102, 103):
        r = 0
    return r

def nivel_de(r):
    return sum((1 for u in UMBRALES if r >= u))

def paredes_anillo(nivel):
    P = [list(p) for p in OCTANTES[min(nivel, len(OCTANTES) - 1)]]
    n = len(P)
    P += [[P[n - 1 - i][1], P[n - 1 - i][0]] for i in range(n)]
    P += [[P[2 * n - 1 - i][0], -P[2 * n - 1 - i][1]] for i in range(2 * n)]
    P += [[-P[4 * n - 1 - i][0], P[4 * n - 1 - i][1]] for i in range(4 * n)]
    segs = []
    for i in range(len(P)):
        a, b = (P[i], P[(i + 1) % len(P)])
        if a != b:
            segs.append({'a': [a[0], 0, a[1]], 'b': [b[0], 0, b[1]], 'alto': 2000, 'flags': 0})
    return segs

def hash_nombre(f):
    n = os.path.basename(f).rsplit('.', 1)[0]
    return int(n, 16) if re.fullmatch('[0-9a-f]{4}', n) else strcode(n)

def indice(st):
    idx = {}
    for f in glob.glob(os.path.join(ST, st, '*', '*.*')):
        idx[f.rsplit('.', 1)[1], hash_nombre(f)] = f
    return idx

def rel(p):
    return os.path.relpath(p, ASSETS).replace('\\', '/')

def overlay(st):
    fs = glob.glob(os.path.join(ST, st, 'sound', '*.bin'))
    return open(fs[0], 'rb').read() if fs else None
BASE_OV = 2148287312

def tablas_sonido(ov):
    pat = struct.pack('<III', 746717189, 272629782, 268416)
    i = ov.find(pat)
    if i < 0:
        return None
    ws = struct.unpack_from('<40I', ov, i)
    tablas, hi = ([], None)
    for w in ws[3:]:
        if w >> 16 == 15362:
            hi = (w & 65535) << 16
        elif w >> 16 == 9282 and hi is not None and (len(tablas) < 6):
            lo = w & 65535
            lo = lo - 65536 if lo & 32768 else lo
            tablas.append(hi + lo)
            hi = None
    return tablas[1:6] if len(tablas) >= 6 else tablas[:5]

def sonidos_pose(ov, tabla, n_poses):
    out = []
    for k in range(n_poses):
        try:
            p = struct.unpack_from('<I', ov, tabla - BASE_OV + 4 * k)[0]
            ev = []
            o = p - BASE_OV
            while 0 <= o < len(ov) - 4 and len(ev) < 64:
                fr, se = struct.unpack_from('<hh', ov, o)
                if fr < 0 or se < 0:
                    break
                ev.append([fr, se])
                o += 4
            out.append(ev)
        except Exception:
            out.append([])
    return out

class Bits:

    def __init__(self, d, p, s=0):
        self.d, self.p, self.s = (d, p, s)

    def hw(self, i):
        o = i * 2
        return struct.unpack_from('<H', self.d, o)[0] if o + 2 <= len(self.d) else 0

    def leer(self, n, signo=True):
        if n == 0:
            return 0
        v = (self.hw(self.p) | self.hw(self.p + 1) << 16) >> self.s & (1 << n) - 1
        if signo and v & 1 << n - 1:
            v -= 1 << n
        self.s += n
        self.p += self.s >> 4
        self.s &= 15
        return v

def leer_mdx(path):
    f = open(path, 'rb').read()
    H = struct.unpack_from('<9i', f, 0)
    banderas, nfr, doff, nj, roff = (H[1], H[3], H[4], H[6], H[7])
    offs = struct.unpack_from('<%di' % nj, f, 36)
    d = f[doff:]
    out = {'cuadros': nfr}
    if banderas & 1:
        b = Bits(d, roff)
        y0 = struct.unpack('<h', struct.pack('<H', b.hw(roff)))[0]
        t = b.hw(roff + 1)
        rx, ry, rz = (t & 15, t >> 4 & 15, t >> 8 & 15)
        b.p = roff + 2
        b.s = 0
        raiz = []
        for _ in range(nfr):
            raiz += [b.leer(rx), b.leer(ry) + y0, b.leer(rz)]
        out['raiz'] = raiz
    if banderas & 2:
        J = []
        for j in range(nj):
            b = Bits(d, offs[j])
            cab = b.leer(8, False)
            q = [b.leer(14) for _ in range(4)]
            s = q if cab & 128 else [b.leer(14) for _ in range(4)]
            claves = [[0] + q + s]
            tot = 0
            while tot < nfr:
                cab = b.leer(8, False)
                q = [b.leer(14) for _ in range(4)]
                if cab & 128:
                    n = cab & 127
                    s = q
                else:
                    n = cab
                    s = [b.leer(14) for _ in range(4)]
                if n == 0:
                    break
                claves.append([n] + q + s)
                tot += n
            J.append(claves)
        out['huesos'] = J
    return out

def leer_asd(path, n_poses):
    d = open(path, 'rb').read()
    ini = []
    while len(ini) < 64:
        v = struct.unpack_from('<H', d, len(ini) * 2)[0]
        if v == 0:
            break
        ini.append(v)
    out = []
    for k in range(n_poses):
        ev = []
        if k < len(ini):
            p = ini[k] * 2
            while p + 4 <= len(d) and len(ev) < 400:
                fr, t = struct.unpack_from('<HH', d, p)
                if fr == 32767:
                    break
                if t == 0:
                    a = struct.unpack_from('<5h', d, p + 4)
                    ev.append([fr, 0] + list(a))
                    p += 14
                elif 1 <= t <= 4:
                    a = struct.unpack_from('<hhH', d, p + 4)
                    ev.append([fr, t, a[0], a[1], a[2]])
                    p += 10
                else:
                    break
        out.append(ev)
    return out

def variantes_azm(path):
    d = open(path, 'rb').read()
    _, cnt, doff, _ = struct.unpack_from('<4i', d, 0)
    if not 0 < cnt < 64:
        return []
    base = 16 + doff
    blob = d[base:]
    p, out = (16, [])
    for _ in range(cnt):
        h = struct.unpack_from('<I', d, p)[0]
        nobj = struct.unpack_from('<i', d, p + 8)[0]
        if not 0 < nobj < 64:
            return []
        cab = bytearray(d[p + 4:p + 4 + 32 + nobj * 88])
        suma = len(cab)
        for k in range(nobj):
            o = 32 + k * 88
            for fo in (56, 60, 68, 72, 76, 80):
                v = struct.unpack_from('<i', cab, o + fo)[0]
                if v != 0 or fo == 56:
                    struct.pack_into('<i', cab, o + fo, v + suma)
        out.append((h, bytes(cab) + blob))
        p += 4 + 32 + nobj * 88
    return out

class Sesion:

    def __init__(self, st):
        self.st = st
        self.idx = indice(st)
        self.od = os.path.join(OUT, 'foto', st)
        os.makedirs(self.od, exist_ok=True)
        self.tmp = os.path.join(ST, st, '_foto_tmp')

    def kmd(self, h, esqueleto=False):
        if not h:
            return None
        f = self.idx.get(('kmd', h))
        if not f:
            return None
        dst = os.path.join(self.od, '%04x%s.glb' % (h, '_esq' if esqueleto else ''))
        return rel(dst) if ve.exportar_glb(f, dst, esqueleto, normales_juego=True) else None

    def kmd_ruta(self, h):
        return self.idx.get(('kmd', h))

    def textura(self, h):
        f = self.idx.get(('pcx', h))
        if not f:
            return None
        dst = os.path.join(self.od, 'tex_%04x.png' % h)
        if not os.path.exists(dst) or FORZAR:
            decodificar_pcx(f).save(dst)
        return {'png': rel(dst), 'abr': modo_semi(f)}

    def variantes(self, h):
        f = self.idx.get(('azm', h))
        if not f:
            return None
        vs = variantes_azm(f)
        if not vs:
            return None
        out = {}
        os.makedirs(self.tmp, exist_ok=True)
        for vh, b in vs:
            dst = os.path.join(self.od, '%04x_%04x.glb' % (h, vh))
            if not os.path.exists(dst) or FORZAR:
                t = os.path.join(self.tmp, '%04x.kmd' % vh)
                open(t, 'wb').write(b)
                try:
                    ve.exportar_glb(t, dst, False, normales_juego=True)
                finally:
                    os.remove(t)
            if os.path.exists(dst):
                out['%04x' % vh] = rel(dst)
        return out

    def limpiar(self):
        if os.path.isdir(self.tmp) and (not os.listdir(self.tmp)):
            os.rmdir(self.tmp)

def opts_ids(o, k):
    return [x['id'] if isinstance(x, dict) and 'id' in x else x for x in o.get(k) or []]

def sesion(st, base, cat_por_clave):
    cfg = SESIONES[st]
    g = cfg['g0478']
    a, b, t = config_g0478(g)
    S = Sesion(st)
    e = {'clave': st, 'st': st, 'modo': 0, 'n': 0, 'lista': 0, 'lnum': 0}
    vd_correr = vd.correr

    def correr(script, e_, base_, cls=vd.VMDisco):
        vm = cls(script, horizonte=60)
        vd.poner(vm, base_, e_)
        vm.set('$b:G0478', g)
        vm.set('$b:G047a', a)
        vm.set('$b:G047b', b)
        vm.set('$w:G0476', t)
        vm.correr()
        return vm
    vd.correr = correr
    try:
        datos, vm, script = vd.mision(e, base, {}, cat_por_clave, escribir=True)
    finally:
        vd.correr = vd_correr
    act = {x['tipo']: x for x in vm.actores}
    A6F6 = [x['nombre'] for x in vm.actores if x['tipo'] == 'A6F6']
    D = act['DOLL2']['opts']
    pelo_a = act.get('NAOMIHAIR') or act.get('MEILINGHAIR')
    ARR = (act.get('ARRAY') or {}).get('opts', {})
    BG = act['BG_STAGE']['opts']
    HEX = (act.get('BG_HEX_S') or {}).get('opts', {})
    ST1 = act.get('BG_ST1')
    snake = act['SNAKE']['opts']
    m = opts_ids(D, 'm')
    cuerpo_h = m[0]
    mm = m[1:] + [0] * 16
    tipo = 0 if cuerpo_h == 58525 else 1 if cuerpo_h == 61604 else 2
    cuerpo = S.kmd(cuerpo_h, True)
    piezas = []

    def pieza(i, hueso, msg=None, nombre=None, directo=False):
        h = i if directo else mm[i]
        if not h or h == strcode('null'):
            return
        p = {'modelo': S.kmd(h), 'hueso': hueso, 'hash': '%04x' % h}
        if nombre:
            p['nombre'] = nombre
        if msg is not None:
            v = S.variantes(h)
            if v:
                p['variantes'] = v
                p['mensaje'] = msg
        if p['modelo']:
            piezas.append(p)
    pieza(0, 13)
    pieza(1, 12, 47672, 'cara')
    pieza(2, 12, 47065, 'boca')
    pieza(8, 12)
    pieza(9, 12)
    pieza(10, 12, 25667 if tipo == 0 else None)
    pieza(11, 12, 25668 if tipo == 0 else None)
    pieza(3, 10, 27465, 'mano')
    pieza(4, 6, 41796, 'mano2')
    pieza(6, 12, None, 'ojo_i')
    pieza(7, 12, None, 'ojo_d')
    pieza(5, 12)
    sueltos = []
    if tipo == 2:
        pieza(55698, 10, directo=True)
        pieza(42726, 0, directo=True)
    elif tipo == 1:
        for h, k in ((31762, 'banco'), (16994, 'mundo'), (33366, 'mundo')):
            r = S.kmd(h)
            if r:
                sueltos.append({'modelo': r, 'tipo': k, 'hash': '%04x' % h})
        pieza(42662, 0, directo=True)
    lista = opts_ids(D, 'l')
    movs = []
    for h in lista:
        f = S.idx.get(('mdx', h))
        movs.append(leer_mdx(f) if f else None)
    json.dump(movs, open(os.path.join(S.od, 'movs.json'), 'w'), separators=(',', ':'))
    av = D.get('a') or []
    eventos = []
    sonidos = []
    if av and isinstance(av[0], dict):
        f = S.idx.get(('azm', av[0]['id']))
        if f:
            eventos = leer_asd(f, len(lista))
    ov = overlay(st)
    if ov and len(av) > 1 and isinstance(av[1], int):
        T = tablas_sonido(ov)
        if T and 0 <= av[1] < len(T):
            sonidos = sonidos_pose(ov, T[av[1]], len(lista))
    pelo = datos_pelo(S, pelo_a) if pelo_a else None
    w = (BG.get('w') or [0])[0]
    m0 = datos['mapas'][0]
    hz_src = os.path.join(ASSETS, m0['hzm_json'][0]) if m0.get('hzm_json') else None
    P = partes_categoria(S, script, act, g, hz_src)
    arreglo, poses, r, niv, anillos = (P['arreglo'], P['poses'], P['r'], P['nivel'], P['anillos'])
    if P.get('hzm_json'):
        m0['hzm_json'] = [P['hzm_json']]
    categorias = None
    if st in CATEGORIAS:
        categorias = {}
        for g2 in CATEGORIAS[st]:
            if g2 == g:
                categorias[str(g2)] = {k: P[k] for k in CLAVES_CATEGORIA}
                continue
            vm2 = correr_g(script, e, base, g2)
            act2 = {x['tipo']: x for x in vm2.actores}
            categorias[str(g2)] = {k: v for k, v in partes_categoria(S, script, act2, g2, hz_src).items() if k in CLAVES_CATEGORIA}
    ESC = []

    def esc(nombre, pos=(0, 0, 0), rot=0, color=None, tipo=None):
        u = S.kmd(strcode(nombre))
        if u:
            ESC.append({'modelo': u, 'nombre': nombre, 'pos': list(pos), 'rot': rot, **({'color': color} if color else {}), **({'tipo': tipo} if tipo else {})})
    for i in range(3):
        c = (3 - i) * 30
        esc('ling_all', (0, -3000 - 3000 * i, 0), -800 * i, [c + 10, c + 40, c + 20])
    esc('ling6bar', (0, -3000, 0), 0, [100, 130, 110])
    ESC.append(P['rango'])
    esc('obj_ss')
    esc('obj_edg')
    esc('obj_txt', tipo='texto')
    set1 = None
    if ST1:
        set1 = bg_st1(S, ST1['opts'])
    envmap = datos_envmap(S, mm)
    m0['piezas'] = []
    V = datos['vr']
    inv = V['disco']['inventario']
    inv['item'] = 12
    inv['arma'] = -1
    V['disco']['faltan'] = []
    V['nombre_modo'] = ' '.join(cfg['titulo'])
    datos['juego']['estado'] = 'VR MISSIONS ' + ' '.join(cfg['titulo'])
    V['fondo'] = {'vrbg': None}
    V['ventana'] = None
    V['limite'] = None
    V['derrota'] = []
    V['foto'] = {'st': st, 'g0478': g, 'g047a': a, 'g047b': b, 'tiempo': t, 'intro': w, 'nivel': niv, 'r': r, 'radios': RADIOS, 'muneca': {'tipo': tipo, 'cuerpo': cuerpo, 'piezas': piezas, 'sueltos': sueltos, 'p': (D.get('p') or [0, 0, 0])[:3], 'd': (D.get('d') or [0, 0, 0])[:3], 'movs': rel(os.path.join(S.od, 'movs.json')), 'eventos': eventos, 'sonidos': sonidos, 'n_poses': len(lista)}, 'pelo': pelo, 'arreglo': arreglo, 'poses': poses, 'envmap': envmap, 'luz': datos.get('luz'), 'categorias': categorias, 'hzm_json': m0.get('hzm_json'), 'escenario': {'anillos': anillos, 'modelos': ESC, 'hex': (HEX.get('c') or [0, 128, 32])[:3] if HEX is not None else None, 'set1': set1}, 'snake': {'p': snake.get('p'), 'd': snake.get('d')}, 'salida': 'r_title'}
    out = os.path.join(OUT, st + '.json')
    json.dump(datos, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    S.limpiar()
    print(f'{st}: tipo {tipo}, {len(piezas)} piezas, {len(sueltos)} sueltas, {len(lista)} poses ({sum((1 for x in movs if x))} leídas), eventos {sum((len(x) for x in eventos))}, sonidos {sum((len(x) for x in sonidos))}, arreglo {len(arreglo or [])}, nivel {niv}, {t} s')
    return datos
CLAVES_CATEGORIA = ('g0478', 'g047a', 'g047b', 'tiempo', 'nivel', 'r', 'arreglo', 'poses', 'anillos', 'rango', 'hzm_json')

def correr_g(script, e, base, g):
    a, b, t = config_g0478(g)
    vm = vd.VMDisco(script, horizonte=60)
    vd.poner(vm, base, e)
    vm.set('$b:G0478', g)
    vm.set('$b:G047a', a)
    vm.set('$b:G047b', b)
    vm.set('$w:G0476', t)
    vm.correr()
    return vm

def partes_categoria(S, script, act, g, hz_src):
    a, b, t = config_g0478(g)
    ARR = (act.get('ARRAY') or {}).get('opts', {})
    BG = act['BG_STAGE']['opts']
    arreglo = [x for x in ARR.get('d') or [] if isinstance(x, int)] if ARR else None
    pid = next((x['proc'] for x in ARR.get('p') or [] if isinstance(x, dict) and 'proc' in x), None)
    poses = tabla_poses(script, pid, arreglo or []) if pid is not None else {}
    r0 = (BG.get('r') or [g])[0]
    r = r_de(r0 if isinstance(r0, int) else g)
    niv = nivel_de(r)
    code = S.variantes(strcode('code')) or {}
    oscuro = list(OSCURO)
    oscuro[niv if niv < 6 else 5] = BRILLO[min(r, len(BRILLO) - 1)]
    anillos = []
    for i in range(1, 6):
        v = '%04x' % strcode(oscuro[i])
        if v in code:
            anillos.append({'modelo': code[v], 'i': i, 'brilla': oscuro[i].startswith('brit')})
    nombre = RANGO[min(niv, len(RANGO) - 1)]
    rango = {'modelo': S.kmd(strcode(nombre)), 'nombre': nombre, 'pos': [0, 0, 0], 'rot': 0, 'color': [0, 0, 128], 'tipo': 'rango'}
    hzm_json = None
    if hz_src and os.path.exists(hz_src):
        H = json.load(open(hz_src))
        H['grupos'][0]['paredes'] += paredes_anillo(niv)
        if not any((q.get('pisos') for q in H['grupos'])):
            L = H.get('limites') or [-32000, -32000, 32000, 32000]
            pts = [[L[0], 0, L[1]], [L[2], 0, L[1]], [L[2], 0, L[3]], [L[0], 0, L[3]]]
            H['grupos'][0]['pisos'] = [{'caja': [pts[0], pts[2]], 'puntos': pts, 'atr': 0}]
        dst = os.path.join(S.od, 'mapa_n%d.hzm.json' % niv)
        json.dump(H, open(dst, 'w'), separators=(',', ':'))
        hzm_json = rel(dst)
    return {'g0478': g, 'g047a': a, 'g047b': b, 'tiempo': t, 'nivel': niv, 'r': r, 'arreglo': arreglo, 'poses': poses, 'anillos': anillos, 'rango': rango, 'hzm_json': hzm_json}

def mapa_glb(kmd_path):
    mdls = cargar_kmd(kmd_path)
    grupos = {}
    for pi, m in enumerate(mdls):
        for f in range(len(m['vi']) // 4):
            tid = m['tex'][f] if m['tex'] else 0
            grupos.setdefault((tid, bool(m['flag'] & 2)), []).extend((pi * 256 + (m['vi'][f * 4 + j] & 127) for j in range(4)))
    return (list(grupos.values()), mdls)

def vertices_kmd(path, obj=0):
    m = cargar_kmd(path)[obj]
    return [c for p in m['world'] for c in p[:3]]

def ints(v):
    return [x for x in v or [] if isinstance(x, int)]

def datos_pelo(S, pa):
    po = pa['opts']
    ph = opts_ids(po, 'm')
    if not ph:
        return None
    f = S.kmd_ruta(ph[0])
    out = {'modelo': S.kmd(ph[0]), 'offset': [x for x in (po.get('s') or [0, 0, 0])[:3]], 'hueso': 12, 'tipo': pa['tipo'], 'h': ints(po.get('h')), 't': ints(po.get('t')), 'l': ints(po.get('l'))}
    if f:
        mapa, _ = mapa_glb(f)
        out['mapa'] = mapa
        out['base'] = vertices_kmd(f)
        out['juegos'] = [vertices_kmd(S.kmd_ruta(h)) for h in ph[1:] if S.kmd_ruta(h)]
    return out

def datos_envmap(S, mm):
    out = []
    for i, tex, objs in ((6, 43241, None), (7, 43241, None), (2, 43242, [0, 2])):
        h = mm[i]
        if not h or h == strcode('null'):
            continue
        f = S.kmd_ruta(h)
        t = S.textura(tex)
        if not f or not t:
            continue
        mapa, mdls = mapa_glb(f)
        out.append({'pieza': '%04x' % h, 'textura': t, 'objetos': objs if objs is not None else list(range(len(mdls))), 'mapa': mapa})
    return out

class VMRand(vd.VMDisco):
    forzar = 0

    def comando(self, s, args, ctx):
        if s['cmd'] == 'rand':
            self.set('$w:L000a', self.forzar)
            return None
        return super().comando(s, args, ctx)

def tabla_poses(script, pid, valores):

    def correr(v, k):
        vm = VMRand(script, horizonte=5)
        vm.forzar = k
        try:
            vm.ejecutar('p', pid, [0, v])
        except Exception:
            return None
        ms = [e['a'][2] for e in vm.eventos if e['cmd'] == 'mesg' and len(e['a']) >= 3 and isinstance(e['a'][1], dict) and (e['a'][1].get('id') == 61255)]
        return ms[-1] if ms and isinstance(ms[-1], int) else None
    tabla = {}
    for v in sorted(set(valores) | {-1, 0}):
        r = [correr(v, k) for k in range(8)]
        tabla[str(v)] = r[0] if len(set(r)) == 1 else r
    return tabla

def bg_st1(S, o):
    m0 = (o.get('m') or [0])[0]
    m = m0 if isinstance(m0, int) else 0
    nombres = ['mei_eye1', 'mei_leye', 'mei_reye', 'mei_face', 'mei_mou1'] if m == 0 else ['nao_eye1', 'nao_eye2', 'nao_eye3', 'nao_face', 'nao_mou1']
    modelos = [S.kmd(strcode(n)) for n in nombres]
    return {'m': m, 'modelos': [x for x in modelos if x], 'y': -364 if m == 0 else -810, 'z': 30000, 'giro': -256, 'escala': 32000}

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    return exportar([a for a in sys.argv[1:] if not a.startswith('--')] or None)

def exportar(pedidas=None):
    if not os.path.isdir(os.path.join(ST, 'photo_n2')):
        print('vr_foto_export: no están las sesiones de fotos del disco de VR (extraido/vr_usa/01_stages/photo_*)')
        return 0
    vd.usar_disco_vr()
    pedidas = pedidas or ORDEN
    base = vd.memoria_inicial()
    fcat = os.path.join(OUT, 'catalogo.json')
    cat = json.load(open(fcat, encoding='utf-8')) if os.path.exists(fcat) else None
    por_clave = {e['clave']: e for e in (cat or {}).get('misiones', [])}
    hechas = []
    for st in pedidas:
        if st not in SESIONES or not os.path.isdir(os.path.join(ST, st)):
            continue
        try:
            sesion(st, base, por_clave)
            hechas.append(st)
        except Exception as ex:
            import traceback
            traceback.print_exc()
            print(st, 'no se pudo:', ex)
    if cat:
        for e in cat['misiones']:
            if e['st'] in hechas:
                e['jugable'] = True
                e['motivo'] = None
                e['titulo'] = SESIONES[e['st']]['titulo']
                e['n'] = ORDEN.index(e['st']) + 1
                e['limite'] = None
                e['practica'] = True
                e['texto'] = ['TAKE PICTURES OF HER WITH THE CAMERA.', 'TIME: %d MIN.' % (config_g0478(SESIONES[e['st']]['g0478'])[2] // 60)]
        orden = {k: i for i, k in enumerate(ORDEN)}
        fotos = sorted([e for e in cat['misiones'] if e.get('grupo') == 'photo'], key=lambda e: orden.get(e['st'], 99))
        resto = [e for e in cat['misiones'] if e.get('grupo') != 'photo']
        cat['misiones'] = resto + fotos
        for gr in cat.get('grupos', []):
            if gr['id'] == 'photo':
                xs = [e for e in cat['misiones'] if e.get('grupo') == 'photo']
                gr['jugables'] = sum((1 for x in xs if x.get('jugable')))
                gr['estado'] = 'si' if gr['jugables'] == len(xs) else gr.get('estado')
        json.dump(cat, open(fcat, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print('sesiones:', hechas)
    return 0
if __name__ == '__main__':
    sys.exit(main())
