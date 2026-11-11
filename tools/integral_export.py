# MGS web — FeniXVOID · Project Ravenlight
import os, sys, json, glob, hashlib, struct
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS
INT = [os.path.join(EXTRAIDO, 'integral%d' % n, '01_stages') for n in (1, 2)]
OUT = os.path.join(ASSETS, 'integral')
ESCENARIOS_R = ['s03ar', 's03dr', 's03er', 's07br', 's07cr', 's09ar', 's10ar', 's18ar', 's19ar', 's19br', 's20ar', 'd18ar', 'endingr']

def md5(p):
    return hashlib.md5(open(p, 'rb').read()).hexdigest()
MODELOS_R = {'3b26d4ac1a273cff35dbcc7e893be5dc': ('meryl_traje', 'Meryl, traje de infiltración (Integral)'), 'feecaec4ac100aaa5455c6bff199ac03': ('meryl_traje_panuelo', 'Meryl, traje de infiltración con pañuelo (Integral)'), 'ec757c283516190eebb0044bdc4f5eaa': ('meryl_traje_tendida', 'Meryl tendida, traje de infiltración (Integral)'), 'c34275ec9d209fb8ebebed70e539bd3b': ('snake_esmoquin_s10a', 'Solid Snake de esmoquin (s10ar)')}

def en_usa(st, nombre):
    for n in (1, 2):
        p = os.path.join(EXTRAIDO, 'disco%d' % n, '01_stages', st, 'cache', nombre)
        if os.path.exists(p):
            return md5(p)
    return None

def buscar(st, sub, nombre):
    for base in INT:
        p = os.path.join(base, st, sub, nombre)
        if os.path.exists(p):
            return p
    return None

def icono_menu(rar, i, pal):
    import numpy as np
    from PIL import Image
    d = open(rar, 'rb').read()
    n = d[0] + d[1]
    offs = struct.unpack_from(f'<{n}I', d, 4)
    base = 4 + 4 * n
    items = [(d[base + o], d[base + o + 1], d[base + o + 2], d[base + o + 3], base + o + 4) for o in offs]
    cols = struct.unpack_from('<16H', d, items[pal][4])
    paleta = []
    for c in cols:
        r, g, b = ((c & 31) << 3, (c >> 5 & 31) << 3, (c >> 10 & 31) << 3)
        paleta.append((r | r >> 5, g | g >> 5, b | b >> 5, 0 if c == 0 else 255))
    paleta = np.array(paleta, np.uint8)
    x, y, w, h, p = items[i]
    W = w * 4
    raw = np.frombuffer(d, np.uint8, count=W * h // 2, offset=p)
    idx = np.empty(W * h, np.uint8)
    idx[0::2] = raw & 15
    idx[1::2] = raw >> 4
    return (Image.fromarray(paleta[idx.reshape(h, W)]), x - 2, y - 2)
FREQ_STAFF = 14007

def staff():
    import codec_web as CW
    import radio_dat as R
    from gcx import leer
    dat = next((p for p in (os.path.join(EXTRAIDO, 'integral%d' % n, '00_disco', 'MGS', 'RADIO.DAT') for n in (1, 2)) if os.path.exists(p)), None)
    font = buscar('init', 'resident', 'font.rar')
    if not dat or not font:
        return None
    dest = os.path.join(OUT, 'staff')
    os.makedirs(os.path.join(dest, 'ui'), exist_ok=True)
    viejo = (CW.RES, CW.OUT)
    try:
        CW.RES, CW.OUT = (os.path.dirname(font), dest)
        CW.fuente()
    finally:
        CW.RES, CW.OUT = viejo
    porst = {}

    def rec(bloque, st):
        for s in bloque:
            if not isinstance(s, dict):
                continue
            if s.get('cmd') == 'radio':
                for a in s.get('args', []):
                    if isinstance(a, dict) and a.get('opt') in ('b', 'o'):
                        vals = [x for x in a['v'] if isinstance(x, int)]
                        for i in range(0, len(vals) - 1, 2):
                            if vals[i] == FREQ_STAFF and vals[i + 1] >= 0:
                                porst.setdefault(st, {}).setdefault(a['opt'], []).append(vals[i + 1])
            for a in s.get('args', []) or []:
                if isinstance(a, dict) and 'bloque' in a:
                    rec(a['bloque'], st)
                if isinstance(a, dict) and 'opt' in a:
                    for x in a['v']:
                        if isinstance(x, dict) and 'bloque' in x:
                            rec(x['bloque'], st)
    for base in INT:
        for p in sorted(glob.glob(os.path.join(base, '*', 'cache', 'scenerio.gcx'))):
            st = os.path.basename(os.path.dirname(os.path.dirname(p)))
            if st in porst:
                continue
            try:
                r = leer(p)
            except Exception:
                continue
            rec(r['main'], st)
            for b in r['procs'].values():
                rec(b, st)
    d, lls, _, errores = R.parsear(dat)
    try:
        cj = json.load(open(os.path.join(ASSETS, 'codec', 'caras', 'caras.json'), encoding='utf-8'))
    except Exception:
        cj = {'grupos': [], 'caras': {}}
    off_de = lambda c: (c & 65535) * 2048
    usadas = {off_de(c) for o in porst.values() for cs in o.values() for c in cs}
    llamadas, total = (set(), 0)
    for ll in lls:
        if ll['freq_header'] != FREQ_STAFF or ll['off'] not in usadas:
            continue
        CW.preparar_eventos(ll['eventos'], d)
        sal = {'off': ll['off'], 'code': ll['code'], 'freq': FREQ_STAFF, 'freq_header': ll['freq_header'], 'face_sector': ll['face']['sector'], 'flags': ll['flags'], 'glifos': ll.get('glifos', []), 'caras': CW.caras_de_grupo(cj, ll['face']['sector']), 'eventos': ll['eventos'], 'fuente': 'integral/staff/ui/'}
        s = json.dumps(sal, ensure_ascii=True, separators=(',', ':'))
        open(os.path.join(dest, '%d.json' % ll['off']), 'w', encoding='utf-8').write(s)
        llamadas.add(ll['off'])
        total += len(s)
    esc = {}
    for st, o in sorted(porst.items()):
        c = (o.get('b') or o.get('o') or [None])[0]
        if c is not None and off_de(c) in llamadas:
            esc[st] = off_de(c)
    guiones = guiones_staff(dest)
    n_staff = sum((1 for ll in lls if ll['freq_header'] == FREQ_STAFF))
    json.dump({'freq': FREQ_STAFF, 'escenarios': esc, 'llamadas': sorted(llamadas), 'guiones': guiones}, open(os.path.join(dest, 'indice.json'), 'w', encoding='utf-8'), separators=(',', ':'))
    print('STAFF 140.07: %d llamadas en el disco, %d exportadas (%.1f MB), %d escenarios, %d guiones con trampas o condiciones, %d errores de parseo' % (n_staff, len(llamadas), total / 1000000.0, len(esc), len(guiones), len(errores)))
    res = {'freq': FREQ_STAFF, 'indice': 'integral/staff/indice.json', 'llamadas': len(llamadas), 'escenarios': len(esc)}
    try:
        import staff_texto
        t = staff_texto.exportar()
        if t:
            res['texto'] = t['texto']
    except Exception as e:
        print('STAFF en texto: no se pudo (%s)' % e)
    return res

def _bloques_de(s):
    out = []
    for a in s.get('args', []) or []:
        if isinstance(a, dict) and 'bloque' in a:
            out.append(a)
        if isinstance(a, dict) and 'opt' in a:
            for v in a['v']:
                if isinstance(v, dict) and 'bloque' in v:
                    out.append(v)
    return out

def podar_staff(script):
    import copy

    def radio(s):
        args = []
        for a in s['args']:
            if not isinstance(a, dict) or 'opt' not in a:
                continue
            if a['opt'] == 'a':
                args.append(a)
                continue
            if a['opt'] not in ('b', 'o'):
                continue
            v = a['v']
            ini = 1 if a['opt'] == 'o' else 0
            pares = [v[i:i + 2] for i in range(ini, len(v) - 1, 2) if v[i] == FREQ_STAFF]
            if pares:
                args.append({'opt': a['opt'], 'v': v[:ini] + [x for p in pares for x in p]})
        return {'cmd': 'radio', 'args': args} if any((a['opt'] in ('b', 'o') for a in args)) else None

    def bloque(b, vivos):
        out = []
        for s in b:
            if 'call' in s:
                if s['call'] in vivos:
                    out.append(s)
                continue
            c = s.get('cmd')
            if c == 'radio':
                r = radio(s)
                if r:
                    out.append(r)
            elif c in ('if', 'trap', 'ntrap', 'foreach'):
                n = copy.deepcopy(s)
                hay = False
                for x in _bloques_de(n):
                    x['bloque'] = bloque(x['bloque'], vivos)
                    hay = hay or bool(x['bloque'])
                for a in n['args']:
                    if isinstance(a, dict) and 'opt' in a:
                        for v in a['v']:
                            if isinstance(v, dict) and 'proc' in v and (v['proc'] in vivos):
                                hay = True
                if hay:
                    out.append(n)
        return out
    vivos = set(script['procs'])
    for _ in range(8):
        procs = {k: bloque(b, vivos) for k, b in script['procs'].items()}
        nuevos = {k for k, b in procs.items() if b}
        if nuevos == vivos:
            break
        vivos = nuevos
    main = bloque(script['main'], vivos)
    if not main and (not vivos):
        return None
    return {'main': main, 'procs': {'%04x' % k: procs[k] for k in sorted(vivos)}}

def guiones_staff(dest):
    from gcx import leer
    import codec_niveles
    od = os.path.join(dest, 'st')
    os.makedirs(od, exist_ok=True)
    hechos = []
    for base in INT:
        for p in sorted(glob.glob(os.path.join(base, '*', 'cache', 'scenerio.gcx'))):
            st = os.path.basename(os.path.dirname(os.path.dirname(p)))
            if st in hechos or st[:1] not in 'sd':
                continue
            try:
                g = podar_staff(leer(p))
            except Exception as e:
                print('  STAFF', st, e)
                continue
            if not g:
                continue
            g['st'] = st
            g['zonas'] = codec_niveles.cajas(st, codec_niveles.zonas_de_trampa({'main': g['main'], 'procs': {int(k, 16): v for k, v in g['procs'].items()}}))
            json.dump(g, open(os.path.join(od, st + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
            hechos.append(st)
    return sorted(hechos)
TIPOS_CAMARA = {'CAMERA', 'CAMERA2', 'CAMERAGUN'}

def camaras_nuevas():
    from gcx import leer, CHARAS
    tipos = {k: v['nombre'] for k, v in CHARAS.items() if v['nombre'] in TIPOS_CAMARA}
    if not tipos:
        return {}

    def lista(p, solo_main):
        r = leer(p)
        out = []

        def recorrer(o, alt):
            if isinstance(o, list):
                for x in o:
                    recorrer(x, alt)
                return
            if not isinstance(o, dict):
                return
            if o.get('cmd') == 'if':
                alt = alt or 'G0435.3' in json.dumps([a.get('expr') for a in o.get('args', []) if isinstance(a, dict)])
            if o.get('cmd') == 'chara' and o.get('args') and isinstance(o['args'][0], dict) and (o['args'][0].get('id') in tipos):
                out.append((alt, o))
            for v in o.values():
                recorrer(v, alt)
        recorrer(r['main'], False)
        if not solo_main:
            for b in r['procs'].values():
                recorrer(b, False)
        return out
    clave = lambda o: json.dumps(o.get('args'), sort_keys=True)
    res = {}
    for base in INT:
        for p in sorted(glob.glob(os.path.join(base, '*', 'cache', 'scenerio.gcx'))):
            st = os.path.basename(os.path.dirname(os.path.dirname(p)))
            usa = next((q for q in (os.path.join(EXTRAIDO, 'disco%d' % n, '01_stages', st, 'cache', 'scenerio.gcx') for n in (1, 2)) if os.path.exists(q)), None)
            if not usa or st in res:
                continue
            del_usa = {clave(o) for _, o in lista(usa, False)}
            for alt, o in lista(p, True):
                if alt or clave(o) in del_usa:
                    continue
                args = o['args']
                opts = {}
                for a in args[2:]:
                    if isinstance(a, dict) and 'opt' in a:
                        opts[a['opt']] = a['v']
                act = {'tipo': tipos[args[0]['id']], 'nombre': args[1].get('id') if isinstance(args[1], dict) else None, 'ctx': 'main', 't': 0.0, 'opts': opts, 'integral': True}
                if 'p' in opts:
                    act['p'] = opts['p']
                if 'd' in opts:
                    act['d'] = opts['d']
                res.setdefault(st, []).append(act)
    return res

def main():
    if not any((os.path.isdir(b) for b in INT)):
        print('Sin los discos del Integral (extraido/integral1): no hay nada que agregar.')
        return 0
    from export_glb import exportar
    os.makedirs(OUT, exist_ok=True)
    info = {'version': 1, 'origen': 'Metal Gear Solid: Integral (SLPM-86247/86248)'}
    catalogo = []

    def glb(src, nombre, estatico, titulo, categoria, escenarios):
        dst = os.path.join(OUT, nombre + '.glb')
        exportar(src, dst, estatico=estatico)
        from kmd2obj import load
        m = load(src)
        pts = [w for x in m for w in x['world']]
        alto = round((max((p[1] for p in pts)) - min((p[1] for p in pts))) / 1000, 3)
        ancho = round(max(max((p[0] for p in pts)) - min((p[0] for p in pts)), max((p[2] for p in pts)) - min((p[2] for p in pts))) / 1000, 3)
        catalogo.append({'nombre': 'integral_' + nombre, 'archivo': 'integral/%s.glb' % nombre, 'con_nombre': True, 'categoria': categoria, 'escenarios': escenarios, 'texturas': 0, 'piezas': len(m), 'caras': sum((len(x['vi']) // 4 for x in m)), 'esqueleto': not estatico, 'alto': alto, 'ancho': ancho, 'integral': True, 'titulo': titulo})
        print('modelo', nombre, os.path.getsize(dst), 'bytes')
    mp5 = buscar('init_ve', 'resident', 'mpfive.kmd')
    rar = buscar('init_ve', 'resident', 'item.rar')
    if mp5 and rar:
        glb(mp5, 'mp5', True, 'MP5 SD (VERY EASY)', 'objeto', ['init_ve'])
        im, ox, oy = icono_menu(rar, 3, 0)
        im.save(os.path.join(OUT, 'menu_mp5.png'))
        info['muy_facil'] = {'modelo': 'integral/mp5.glb', 'nombre': 'MP 5 SD', 'icono': {'png': 'integral/menu_mp5.png', 'w': im.width, 'h': im.height, 'ox': ox, 'oy': oy}, 'vars': {'$w:L0024': 999, '$w:L0038': 999}}
        print('muy fácil: MP5', im.size)
        oar = buscar('init_ve', 'resident', 'snake.oar')
        if oar:
            from oar import leer
            r = leer(oar)
            m = r['motions'][52]
            clip = {'n': 52, 'cuadros': len(m['cuadros']), 'rot': [v for c in m['cuadros'] for h in c for v in h], 'altura': m['altura'], 'paso': [v for p in m['paso'] for v in p]}
            json.dump({'huesos': r['n_joint'], 'fps': 30, 'clips': {'anim 52': clip}}, open(os.path.join(OUT, 'snake_ve.json'), 'w'), separators=(',', ':'))
            info['muy_facil']['recarga'] = {'anim': 'integral/snake_ve.json', 'motion': 52, 'cuadros': clip['cuadros']}
            print('muy fácil: recarga de la MP5 (motion 52,', clip['cuadros'], 'cuadros)')
    cambios, modelos = ({}, {})
    for st in ESCENARIOS_R:
        base_r = next((os.path.join(b, st) for b in INT if os.path.isdir(os.path.join(b, st))), None)
        if not base_r:
            continue
        st0 = st[:-1]
        base0 = next((os.path.join(b, st0) for b in INT if os.path.isdir(os.path.join(b, st0))), None)
        if not base0:
            continue
        for p in sorted(glob.glob(os.path.join(base_r, 'cache', '*.kmd'))):
            n = os.path.basename(p)
            p0 = os.path.join(base0, 'cache', n)
            if not os.path.exists(p0) or md5(p0) == md5(p):
                continue
            h = md5(p)
            if h == en_usa(st, n):
                continue
            if h not in modelos:
                nombre, titulo = MODELOS_R.get(h, ('integral_r%d' % (len(modelos) + 1), 'Modelo de los escenarios "r" (Integral)'))
                modelos[h] = (p, nombre, titulo, [])
            modelos[h][3].append(st0)
            cambios.setdefault(st0, {})[n[:-4]] = 'integral/%s.glb' % modelos[h][1]
    for h, (p, nombre, titulo, sts) in modelos.items():
        glb(p, nombre, False, titulo, 'personaje', sorted(set(sts)))
    if cambios:
        info['traje_meryl'] = {'variable': '$f:G0435.0', 'escenarios': cambios}
        print('traje de Meryl:', len(modelos), 'modelos en', len(cambios), 'escenarios')
    try:
        import integral_guiones
        armas = {}
        for n in ('famas', 'rifle'):
            pi_, pu_ = (buscar('init', 'resident', n + '.kmd'), os.path.join(EXTRAIDO, 'disco1', '01_stages', 'init', 'resident', n + '.kmd'))
            if not pi_ or not os.path.exists(pu_) or (not integral_guiones.distinto_de_verdad(pu_, pi_)):
                continue
            os.makedirs(os.path.join(OUT, 'armas'), exist_ok=True)
            exportar(pi_, os.path.join(OUT, 'armas', n + '.glb'), estatico=True)
            armas['armas/%s.glb' % n] = 'integral/armas/%s.glb' % n
        if armas:
            info['armas'] = armas
            print('armas del Integral:', ', '.join(armas))
    except Exception as e:
        print('armas del Integral: no se pudieron exportar (%s)' % e)
    camaras = camaras_nuevas()
    if camaras:
        info['actores'] = camaras
        print('cámaras nuevas:', {k: len(v) for k, v in camaras.items()})
    st = staff()
    if st:
        info['staff'] = st
    try:
        import integral_guiones
        g = integral_guiones.armar() or {}
        if g.get('guiones'):
            info['guiones'] = g['guiones']
            print('guiones del Integral:', len(g['guiones']['escenarios']), 'escenarios')
        if g.get('alterna'):
            info['alterna'] = g['alterna']
            print('Alternate Round:', len(g['alterna']['escenarios']), 'escenarios')
    except Exception as e:
        import traceback
        traceback.print_exc()
        print('guiones del Integral: no se pudieron armar (%s); va el Alternate Round de antes' % e)
    if 'alterna' not in info:
        try:
            import integral_alterna
            alt = integral_alterna.armar()
            if alt:
                info['alterna'] = alt
                print('Alternate Round:', len(alt['escenarios']), 'escenarios')
        except Exception as e:
            import traceback
            traceback.print_exc()
            print('Alternate Round: no se pudo armar (%s); el resto sigue' % e)
    json.dump(catalogo, open(os.path.join(OUT, 'catalogo.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    json.dump(info, open(os.path.join(OUT, 'integral.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('listo:', OUT)
    return 0
if __name__ == '__main__':
    sys.exit(main())
