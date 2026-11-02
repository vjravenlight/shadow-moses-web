# MGS web — FeniXVOID · Project Ravenlight
import struct, sys, json

def leer(path):
    d = open(path, 'rb').read()
    h = lambda o, n: struct.unpack_from(f'<{n}h', d, o)
    I = lambda o: struct.unpack_from('<i', d, o)[0]
    version, min_x, min_y, max_x, max_y, n_groups, n_zones, n_routes = h(0, 8)
    p_groups, p_zones, p_routes = (I(16), I(20), I(24))

    def vec(o):
        x, z, y, hh = h(o, 4)
        return ([x, y, z], hh)
    grupos = []
    for g in range(n_groups):
        o = p_groups + g * 24
        n_trig, n_walls, n_floors, n_flat = h(o, 4)
        p_w, p_f, p_t, p_fl = (I(o + 8), I(o + 12), I(o + 16), I(o + 20))
        paredes = []
        for k in range(n_walls):
            a, ha = vec(p_w + k * 16)
            b, hb = vec(p_w + k * 16 + 8)
            flags = d[p_fl + k] if p_fl and p_fl + k < len(d) else 0
            paredes.append({'a': a, 'b': b, 'alto': ha, 'flags': flags})
        pisos = []
        for k in range(n_floors):
            o2 = p_f + k * 48
            b1, hb1 = vec(o2)
            b2, _ = vec(o2 + 8)
            pts = [vec(o2 + 16 + 8 * j)[0] for j in range(4)]
            pisos.append({'caja': [b1, b2], 'puntos': pts, 'atr': hb1 >> 8 & 255})
        triggers = []
        for k in range(n_trig):
            o2 = p_t + k * 32
            b1, _ = vec(o2)
            b2, _ = vec(o2 + 8)
            nombre = d[o2 + 16:o2 + 29]
            n = nombre.split(b' ')[0].split(b'\x00')[0]
            if all((32 <= c < 127 for c in n)) and n:
                triggers.append({'tipo': 'trap', 'caja': [b1, b2], 'nombre': n.decode()})
            else:
                cam, _ = vec(o2 + 16)
                orient, _ = vec(o2 + 24)
                triggers.append({'tipo': 'camara', 'caja': [b1, b2], 'cam': cam, 'orient': orient})
        grupos.append({'paredes': paredes, 'pisos': pisos, 'triggers': triggers, 'n_flat': n_flat})
    zonas = []
    for k in range(n_zones):
        o = p_zones + k * 24
        x, z, y, w, hh = h(o, 5)
        nears = list(d[o + 10:o + 16])
        dists = list(d[o + 16:o + 22])
        zonas.append({'p': [x, y, z], 'w': w, 'h': hh, 'vecinas': [n for n in nears if n != 255], 'dist': dists})
    rutas = []
    for k in range(n_routes):
        o = p_routes + k * 8
        n_pts, init = h(o, 2)
        pp = I(o + 4)
        pts = []
        for j in range(n_pts):
            x, z, y, cmd = struct.unpack_from('<hhhH', d, pp + j * 8)
            pts.append({'p': [x, y, z], 'cmd': cmd})
        rutas.append({'inicio': init, 'puntos': pts})
    return {'version': version, 'limites': [min_x, min_y, max_x, max_y], 'grupos': grupos, 'zonas': zonas, 'rutas': rutas}
if __name__ == '__main__':
    r = leer(sys.argv[1])
    print('version', r['version'], 'limites', r['limites'])
    for i, g in enumerate(r['grupos']):
        print(f"grupo {i}: {len(g['paredes'])} paredes, {len(g['pisos'])} pisos, {len(g['triggers'])} triggers ({sum((t['tipo'] == 'trap' for t in g['triggers']))} traps: {', '.join((t['nombre'] for t in g['triggers'] if t['tipo'] == 'trap'))[:300]})")
    print('zonas', len(r['zonas']), 'rutas', len(r['rutas']))
    for i, ru in enumerate(r['rutas']):
        print(f"  ruta {i}: {len(ru['puntos'])} puntos, inicio {ru['inicio']}: " + ' '.join((f"{p['p']}" for p in ru['puntos'][:4])) + (' …' if len(ru['puntos']) > 4 else ''))
    if '--json' in sys.argv:
        json.dump(r, open(sys.argv[sys.argv.index('--json') + 1], 'w'), separators=(',', ':'))
