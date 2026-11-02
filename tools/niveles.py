# MGS web — FeniXVOID · Project Ravenlight
import sys, os, glob, json, re, math
sys.path.insert(0, os.path.dirname(__file__))
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
import gcx, hzm, gcl_vm, cielo, preshade
from kmd2obj import load
from export_glb import exportar, strcode
from pcx_mgs import decode
RAIZ = os.path.join(os.path.dirname(__file__), '..')
ST = os.path.join(EXTRAIDO, 'disco1', '01_stages')
OUT = os.path.join(ASSETS, 'niveles')
INIT = os.path.join(ST, 'init')

def hash_archivo(path):
    n = os.path.basename(path).rsplit('.', 1)[0]
    return int(n, 16) if re.fullmatch('[0-9a-f]{4}', n) else strcode(n)

def indice(stage):
    idx = {}
    for d in (os.path.join(ST, stage), INIT):
        for f in glob.glob(os.path.join(d, '*', '*.*')):
            ext = f.rsplit('.', 1)[1]
            idx.setdefault((ext, hash_archivo(f)), f)
    for z in sorted(glob.glob(os.path.join(ST, stage, '*', '*.zmd'))):
        for h, f in kmds_de_zmd(stage, z):
            idx.setdefault(('kmd', h), f)
    return idx

def kmds_de_zmd(stage, zmd):
    import struct
    from jefes_export import kmd_de_zmd
    d = open(zmd, 'rb').read()
    if d[:4] != b'KMDa':
        return []
    n = struct.unpack('<I', d[4:8])[0]
    p = 16
    out = []
    od = os.path.join(EXTRAIDO, '_kmd_de_zmd', 'disco1', stage)
    os.makedirs(od, exist_ok=True)
    for _ in range(n):
        kid = struct.unpack('<I', d[p:p + 4])[0]
        nx = struct.unpack('<i', d[p + 8:p + 12])[0]
        dst = os.path.join(od, '%04x.kmd' % kid)
        if os.path.exists(dst) or kmd_de_zmd(zmd, kid, dst):
            out.append((kid, dst))
        p += 4 + 32 + nx * 88
    return out

def valores(v):
    out = []
    for x in v:
        if isinstance(x, (int, float)):
            out.append(x)
        elif isinstance(x, dict) and 'id' in x:
            out.append({'id': x['id'], 'n': x.get('n')})
        elif isinstance(x, dict) and 'str' in x:
            out.append(x['str'])
        elif isinstance(x, dict) and 'var' in x:
            out.append({'var': x['var']})
        elif isinstance(x, dict) and 'proc' in x:
            out.append({'proc': x['proc']})
        else:
            out.append(None)
    return out

def recorrer(bloque, f, prof=0, ctx='main'):
    for s in bloque:
        f(s, prof, ctx)
        for a in s.get('args', []):
            if isinstance(a, dict) and 'bloque' in a:
                recorrer(a['bloque'], f, prof + 1, ctx)
            if isinstance(a, dict) and 'opt' in a:
                for v in a['v']:
                    if isinstance(v, dict) and 'bloque' in v:
                        recorrer(v['bloque'], f, prof + 1, ctx)

def nivel(stage):
    sc = os.path.join(ST, stage, 'cache', 'scenerio.gcx')
    if not os.path.exists(sc):
        return None
    script = gcx.leer(sc)
    idx = indice(stage)
    od = os.path.join(OUT, stage)
    os.makedirs(od, exist_ok=True)
    exportados = {}

    def glb(h, esqueleto=None, luz=None):
        f = idx.get(('kmd', h))
        if not f:
            return None
        if f in exportados:
            return exportados[f]
        nombre = os.path.basename(f)[:-4]
        dst = os.path.join(od, nombre + '.glb')
        if esqueleto is None:
            esqueleto = any((m['parent'] >= 0 for m in load(f)))
        try:
            exportar(f, dst, estatico=not esqueleto, luz=luz)
        except Exception as e:
            print('  no se pudo exportar', nombre, e)
            exportados[f] = None
            return None
        exportados[f] = f'niveles/{stage}/{nombre}.glb'
        return exportados[f]

    def textura_png(h):
        dst = os.path.join(od, f'tex_{h:04x}.png')
        if not os.path.exists(dst):
            f = idx.get(('pcx', h))
            if not f:
                return None
            try:
                decode(f).save(dst)
            except Exception:
                return None
        return f'niveles/{stage}/tex_{h:04x}.png'
    hzms = {}

    def hzm_json(h):
        f = idx.get(('hzm', h))
        if not f:
            return None
        if f not in hzms:
            nombre = os.path.basename(f)[:-4]
            json.dump(hzm.leer(f), open(os.path.join(od, nombre + '.hzm.json'), 'w'), separators=(',', ':'))
            hzms[f] = {'archivo': f'niveles/{stage}/{nombre}.hzm.json', 'datos': hzm.leer(f)}
        return hzms[f]
    mapas = {}
    orden_mapas = []
    actores = []
    camaras = []
    actual = [None]

    def visitar(s, prof, ctx):
        cmd = s.get('cmd')
        opts = {a['opt']: a['v'] for a in s.get('args', []) if isinstance(a, dict) and 'opt' in a}
        if cmd == 'mapdef':
            mid = s['args'][0]['id'] if s['args'] and isinstance(s['args'][0], dict) and ('id' in s['args'][0]) else None
            kmds = [v['id'] for v in opts.get('k', []) if isinstance(v, dict) and 'id' in v]
            hz = [v['id'] for v in opts.get('h', []) if isinstance(v, dict) and 'id' in v]
            mapas[mid] = {'id': mid, 'kmds': kmds, 'hzm': hz, 'lit': [v['id'] for v in opts.get('l', []) if isinstance(v, dict) and 'id' in v]}
            orden_mapas.append(mid)
            if actual[0] is None:
                actual[0] = mid
        elif cmd == 'map' and 'd' in opts:
            ids = [v['id'] for v in opts['d'] if isinstance(v, dict) and 'id' in v]
            for mid, nom in zip(ids[0::2], ids[1::2]):
                mapas[mid] = {'id': mid, 'kmds': [nom], 'hzm': [nom], 'lit': [nom]}
                orden_mapas.append(mid)
                if actual[0] is None:
                    actual[0] = mid
        elif cmd == 'map' and 'a' in opts:
            v = opts['a'][0] if opts['a'] else None
            if isinstance(v, dict) and v.get('id') in mapas:
                actual[0] = v['id']
        elif cmd == 'camera':
            camaras.append({k: valores(v) for k, v in opts.items()} | {'_prof': prof})
        elif cmd == 'chara':
            a = s['args']
            if not a or not isinstance(a[0], dict) or 'id' not in a[0]:
                return
            tipo = gcx.CHARAS.get(a[0]['id'], {}).get('nombre', f"#{a[0]['id']:04x}")
            nombre = a[1]['id'] if len(a) > 1 and isinstance(a[1], dict) and ('id' in a[1]) else None
            act = {'tipo': tipo, 'nombre': nombre, 'mapa': actual[0], 'prof': prof, 'ctx': ctx, 'opts': {k: valores(v) for k, v in opts.items()}, '_s': id(s)}
            p = act['opts'].get('p')
            if p and len(p) >= 3 and all((isinstance(x, int) for x in p[:3])):
                act['p'] = p[:3]
            dd = act['opts'].get('d')
            if dd and len(dd) >= 3 and all((isinstance(x, int) for x in dd[:3])):
                act['d'] = dd[:3]
            actores.append(act)
    recorrer(script['main'], visitar)
    for pid, b in script['procs'].items():
        recorrer(b, visitar, 1, f'proc_{pid:04x}')
    info_vm = None
    try:
        e = gcl_vm.estado(stage, CARGAS)
        vm = gcl_vm.VM(script, horizonte=180)
        gcl_vm.aplicar_carga(vm, stage, e)
        vm.correr()
        ejecutados = {a['_s'] for a in vm.actores}
        eventos = [dict(a, evento=True) for a in actores if a['_s'] not in ejecutados]
        actores = []
        for a in vm.actores:
            act = {'tipo': a['tipo'], 'nombre': a['nombre'], 'mapa': a['mapa'], 'ctx': a['ctx'], 't': a['t'], 'opts': a['opts'], '_s': a['_s']}
            p = a['opts'].get('p')
            if p and len(p) >= 3 and all((isinstance(x, int) for x in p[:3])):
                act['p'] = p[:3]
            dd = a['opts'].get('d')
            if dd and len(dd) >= 3 and all((isinstance(x, int) for x in dd[:3])):
                act['d'] = dd[:3]
            actores.append(act)
        actores += eventos
        info_vm = {'estado': e['etiqueta'], 'progreso': vm.get('$w:G000a'), 'mapa_inicial': vm.get('$s:L000e'), 'fondo': vm.fondo}
    except Exception as ex:
        print('  (sin intérprete:', ex, ')')
    salidas = []
    if info_vm:

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
                    traps.append((x['args'][0]['id'], x, ej))
        recorrer(script['main'], vt)
        for b in script['procs'].values():
            recorrer(b, vt)
        for zona, x, (k, ej) in traps:
            sb = gcl_vm.VM(script)
            sb.g[:] = vm.g
            sb.l[:] = vm.l
            sb.mapas = dict(vm.mapas)
            sb.orden_mapas = list(vm.orden_mapas)
            sb.set('$w:L0010', 0)
            sb.set('$w:L0012', 0)
            sb.set('$w:L0014', 0)
            ev = 3538
            try:
                sb.ejecutar(k, ej, [zona, 8650, ev])
            except Exception:
                continue
            if not sb.cargas:
                continue
            c = sb.cargas[0]
            dest = c['a']
            if dest == stage or not dest or dest[:1] not in 'sd':
                continue
            pos = [sb.get('$w:L0010'), sb.get('$w:L0012'), sb.get('$w:L0014')]
            m = c['m'][0]['id'] if c['m'] and isinstance(c['m'][0], dict) else c['m'][0] if c['m'] and isinstance(c['m'][0], int) else None
            via = None
            if dest[:1] == 'd':
                via = dest
                dest = seguir_demo(dest, stage)
                if dest[:1] != 's':
                    continue
                pos = [0, 0, 0]
            salidas.append({'zona': zona, 'a': dest, 'via': via, 'm': m, 'p': pos if any(pos) else None, 'rot': sb.get('$w:G0002'), 'g4': sb.get('$w:G0004')})
        cajas = {}
        for m in mapas.values():
            for h in m['hzm']:
                hz = hzm_json(h)
                if not hz:
                    continue
                for g in hz['datos']['grupos']:
                    for t in g['triggers']:
                        n = t.get('nombre')
                        hh = int(n, 16) if isinstance(n, str) and re.fullmatch('[0-9a-f]{4}', n) else strcode(n) if isinstance(n, str) else n
                        cajas.setdefault(hh, []).append(t['caja'])
        vistas = set()
        for sa in salidas:
            sa['cajas'] = cajas.get(sa['zona'], [])
        salidas = [sa for sa in salidas if sa['cajas'] and (not (sa['zona'], sa['a']) in vistas) and (not vistas.add((sa['zona'], sa['a'])))]
    lz = (vm.luz if info_vm else {}) or {}
    amb = tuple((max(0, min(255, v)) for v in lz.get('a', [0, 0, 0])))
    main = None
    if lz.get('d') and lz.get('c') and any(lz['d']):
        dx, dy, dz = lz['d']
        L = (dx * dx + dy * dy + dz * dz) ** 0.5 or 1
        main = ((dx / L, dy / L, dz / L), tuple(lz['c']))
    luces_mapa = {}
    for m in mapas.values():
        ls = []
        for h in m.get('lit', []):
            f = idx.get(('lit', h))
            if f:
                try:
                    ls += preshade.leer_lit(f)
                except Exception:
                    pass
        luces_mapa[m['id']] = {'luces': ls, 'amb': amb, 'main': main}

    def luz_de(mid, pos=(0, 0, 0), rot=0.0):
        L = luces_mapa.get(mid)
        return dict(L, pos=pos, rot=rot) if L else None
    for m in mapas.values():
        m['piezas'] = [x for x in (glb(h, esqueleto=False, luz=luz_de(m['id'])) for h in m['kmds']) if x]
        m['hzm_json'] = [hzm_json(h)['archivo'] for h in m['hzm'] if hzm_json(h)]
    for act in actores:
        o = act['opts']
        t = act['tipo']
        if t == 'ITEM':
            b = o.get('b', [0])[0] if o.get('b') else 0
            if isinstance(b, int):
                act['modelo'] = glb(strcode('box_0%d' % (1 + b)), esqueleto=False)
            act['item'] = o.get('m', [None])[0]
        elif t == 'SNAKE':
            m = o.get('m', [None])[0]
            h = m['id'] if isinstance(m, dict) else strcode(m) if isinstance(m, str) else strcode('snake')
            act['modelo'] = glb(h) or glb(strcode('snake'))
        elif t == 'WATCHER':
            ruta = o.get('r', [0])[0] if o.get('r') else 0
            mapa = mapas.get(act['mapa'])
            pts = []
            if mapa and mapa['hzm']:
                hz = hzm_json(mapa['hzm'][0])
                if hz and isinstance(ruta, int) and (ruta < len(hz['datos']['rutas'])):
                    pts = hz['datos']['rutas'][ruta]['puntos']
            act['ruta'] = ruta
            act['puntos'] = pts
            if pts:
                act['p'] = pts[0]['p']
            act['modelo'] = glb(strcode('ippanhei'))
        else:
            m = o.get('m')
            if m and isinstance(m[0], dict) and ('id' in m[0]):
                esq = True if t == 'DOOR' else False if t in ('ELEVATOR', 'LIFT', 'RASEN_EL') else None
                pz = act.get('p') or [0, 0, 0]
                rz = (act.get('d') or [0, 0, 0])[1] * math.pi * 2 / 4096
                act['modelo'] = glb(m[0]['id'], esqueleto=esq, luz=luz_de(act.get('mapa'), tuple(pz), rz) if t not in ('DEMODOLL',) else None)

        def ruta(n):
            mapa = mapas.get(act['mapa'])
            if mapa and mapa['hzm']:
                hz = hzm_json(mapa['hzm'][0])
                if hz and isinstance(n, int) and (0 <= n < len(hz['datos']['rutas'])):
                    return hz['datos']['rutas'][n]['puntos']
            return []
        num = lambda k: [x for x in o.get(k, []) if isinstance(x, int)]
        if t == 'ELEVATOR':
            s0, e0, c = (num('s')[:3], num('e')[:3], (num('c') or [300])[0])
            i = abs((num('i') or [0])[0])
            if len(s0) == 3 and len(e0) == 3 and c:
                act['p'] = [s0[k] + (e0[k] - s0[k]) * i // c for k in range(3)]
                X = num('X')
                act['elevador'] = {'s': s0, 'e': e0, 'c': c, 'i': i, 'x': (num('x') or [0])[0], 'snd': X[:3] if len(X) >= 3 else [184, 185, 186], 'per': X[3] if len(X) >= 4 else 8}
            w = o.get('w')
            if w and isinstance(w[0], dict):
                act['espera'] = w[0]['id']
            n_ = o.get('n')
            if not act.get('modelo') and (not o.get('m')) and n_ and isinstance(n_[0], dict):
                act['modelo'] = glb(n_[0]['id'], esqueleto=False, luz=luz_de(act.get('mapa')))
            h = o.get('m') or o.get('h')
            if not act.get('modelo') and h and isinstance(h[0], dict):
                act['modelo'] = glb(h[0]['id'], esqueleto=False)
            f_ = o.get('f')
            if f_ and isinstance(f_[0], dict):
                act['modelo2'] = glb(f_[0]['id'], esqueleto=False, luz=luz_de(act.get('mapa')))
        elif t == 'PUT_OBJECT':
            v = num('s')
            act['instancias'] = [{'p': v[k:k + 3], 'd': v[k + 3:k + 6]} for k in range(0, len(v) - 5, 6)]
        elif t == 'DEMODOLL' or t.startswith('DOLL'):
            pts = ruta((num('r') or [0])[0])
            if pts and 'p' not in act:
                act['p'] = pts[0]['p']
                act['puntos'] = pts
        elif t == 'PATOLAMP':
            mid = act.get('mapa')
            pz = act.get('p') or [0, 0, 0]
            act['baliza'] = {k: glb(strcode(n), esqueleto=False, luz=luz_de(mid, tuple(pz)) if k != 'cono' else None) for k, n in (('cuerpo', 'pat_body'), ('lampara', 'pat_lamp'), ('cono', 'pat_spt1'))}
        elif t == 'TELOP' and (not act.get('evento')):
            d = o.get('d', [])
            lineas = []
            for k in range(0, len(d) - 4, 5):
                x, y, esp, dur, tx = d[k:k + 5]
                if not (isinstance(tx, dict) and 'id' in tx and all((isinstance(v, int) for v in (x, y, esp, dur)))):
                    continue
                png = textura_png(tx['id'])
                if png:
                    lineas.append({'x': x, 'y': y, 'espera': esp, 'dur': dur, 'img': png})
            act['telop'] = lineas
        elif t in ('SPHERE', 'SPHERE2'):
            act['cielo'] = {'y': (num('y') or [0])[0], 'c': num('c')[:3], 'vel': (num('s') or [0])[0]}
            m = o.get('m')
            if m and isinstance(m[0], dict):
                dst = os.path.join(od, f"cielo_{m[0]['id']:04x}.png")
                r = cielo.armar(os.path.join(ST, stage), m[0]['id'], dst, INIT)
                if r:
                    act['cielo'].update(r, img=f"niveles/{stage}/cielo_{m[0]['id']:04x}.png")
            act.pop('modelo', None)

    def voxels(m):
        vs = set()
        for h in m['kmds']:
            f = idx.get(('kmd', h))
            if not f:
                continue
            try:
                for pz in load(f):
                    for x, y, z in pz['world']:
                        vs.add((x // 500, y // 500, z // 500))
            except Exception:
                pass
        return vs
    ini = (info_vm or {}).get('mapa_inicial')
    sn = next((a for a in actores if a['tipo'] == 'SNAKE' and (not a.get('evento'))), None)
    orden = [m for m in orden_mapas if m in mapas]
    principal = ini if ini in mapas else sn['mapa'] if sn and sn.get('mapa') in mapas else orden[0] if orden else None
    visibles = []
    if principal is not None:
        union = voxels(mapas[principal])
        visibles.append(principal)
        for mid in orden:
            if mid == principal:
                continue
            v = voxels(mapas[mid])
            if not v:
                continue
            if len(v & union) / len(v) < 0.3:
                visibles.append(mid)
                union |= v
    for a in actores:
        a.pop('_s', None)
    datos = {'id': stage, 'mapas': list(mapas.values()), 'orden_mapas': orden_mapas, 'actores': actores, 'camaras': camaras}
    if info_vm:
        datos['juego'] = info_vm
        datos['demos'] = vm.demos
    datos['principal'] = principal
    datos['visibles'] = visibles
    datos['salidas'] = salidas
    lv = []
    for mid in visibles or []:
        lv += luces_mapa.get(mid, {}).get('luces', [])
    datos['luz'] = {'luces': lv, 'amb': list(amb), 'main': [list(main[0]), list(main[1])] if main else None}
    vox = set()
    for mid in visibles or []:
        vox |= voxels(mapas[mid])
    brillos = []
    for x, y, z, r, e, cr, cg, cb in lv:
        if max(cr, cg, cb) < 140:
            continue
        cx, cy, cz = (x // 500, y // 500, z // 500)
        if any(((cx + i, cy + j, cz + k) in vox for i in (-1, 0, 1) for j in (-1, 0, 1) for k in (-1, 0, 1))):
            brillos.append([x, y, z, cr, cg, cb, int(300 + min(r, 4000) / 6)])
    datos['brillos'] = brillos
    for m in datos['mapas']:
        m.pop('hzm', None)
    json.dump(datos, open(os.path.join(od, 'nivel.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    return datos

def cargas_externas():
    out = {}
    for f in sorted(glob.glob(os.path.join(ST, '*', 'cache', 'scenerio.gcx'))):
        sc = gcx.leer(f)

        def v(x, prof, ctx):
            if x.get('cmd') == 'load' and x['args'] and isinstance(x['args'][0], dict) and ('str' in x['args'][0]):
                o = {a['opt']: a['v'] for a in x['args'] if isinstance(a, dict) and 'opt' in a}
                m = [y for y in o.get('m', []) if isinstance(y, dict) and 'id' in y]
                p = [y for y in o.get('p', []) if isinstance(y, int)]
                out.setdefault(x['args'][0]['str'], {'a': x['args'][0]['str'], 'm': [{'id': y['id']} for y in m], 'p': p})
                ARISTAS.setdefault(os.path.basename(os.path.dirname(os.path.dirname(f))), []).append(x['args'][0]['str'])
        recorrer(sc['main'], v)
        for b in sc['procs'].values():
            recorrer(b, v)
    return out
CARGAS = {}
ARISTAS = {}

def seguir_demo(dest, origen, prof=0):
    if dest[:1] == 's' or prof > 3:
        return dest
    familia = origen[:4]
    for t in ARISTAS.get(dest, []):
        if t[:1] == 's' and (not t.startswith(familia)):
            return t
    for t in ARISTAS.get(dest, []):
        if t[:1] == 'd' and t != dest:
            r = seguir_demo(t, origen, prof + 1)
            if r[:1] == 's' and (not r.startswith(familia)):
                return r
    return dest

def _iniciar(cargas, aristas):
    CARGAS.update(cargas)
    ARISTAS.update(aristas)

def _nivel_resumen(st):
    import io, contextlib
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        try:
            d = nivel(st)
        except Exception as e:
            print('ERROR', st, e)
            d = None
    if not d:
        return (st, None, buf.getvalue())
    n = {}
    for a in d['actores']:
        n[a['tipo']] = n.get(a['tipo'], 0) + 1
    return (st, '%s mapas %d actores %d guardias %d items %d' % (st, len(d['mapas']), len(d['actores']), n.get('WATCHER', 0), n.get('ITEM', 0)), buf.getvalue())
if __name__ == '__main__':
    CARGAS.update(cargas_externas())
    stages = sys.argv[1:] or sorted((os.path.basename(d) for d in glob.glob(os.path.join(ST, '*'))))
    hechos = []
    procesos = int(os.environ.get('MGS_PROCESOS') or max(1, min(3, (os.cpu_count() or 2) - 1)))
    if procesos > 1 and len(stages) > 4:
        from multiprocessing import Pool
        pool = Pool(procesos, initializer=_iniciar, initargs=(CARGAS, ARISTAS))
        resultados = pool.imap(_nivel_resumen, stages)
    else:
        pool, resultados = (None, map(_nivel_resumen, stages))
    for st, linea, salida in resultados:
        if salida:
            print(salida, end='')
        if linea:
            print(linea)
            hechos.append(st)
    if pool:
        pool.close()
        pool.join()
    if len(sys.argv) == 1:
        json.dump(hechos, open(os.path.join(OUT, 'indice.json'), 'w'))
