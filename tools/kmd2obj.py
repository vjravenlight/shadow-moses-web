# MGS web — FeniXVOID · Project Ravenlight
import struct, sys, os

def load(path):
    d = open(path, 'rb').read()
    n_models, n_x = struct.unpack('<ii', d[:8])
    mdls = []
    for m in range(n_x):
        o = 32 + m * 88
        f = struct.unpack('<22i', d[o:o + 88])
        flag, nf = (f[0], f[1])
        t = f[8:11]
        parent = f[11]
        nv = f[13]
        pv, pvi = (f[14], f[15])
        nn = f[16]
        pn, pni, puv, ptex = (f[17], f[18], f[19], f[20])
        verts = [struct.unpack('<hhhh', d[pv + i * 8:pv + i * 8 + 8]) for i in range(nv)]
        vi = [d[pvi + i] for i in range(nf * 4)]
        uv = [d[puv + i] for i in range(nf * 8)] if puv else []
        tex = list(struct.unpack(f'<{nf}H', d[ptex:ptex + nf * 2])) if ptex else []
        mdls.append(dict(flag=flag, t=t, parent=parent, verts=verts, vi=vi, uv=uv, tex=tex))
    for m in mdls:
        p = m['parent']
        o = list(m['t'])
        while p >= 0:
            q = mdls[p]
            o = [a + b for a, b in zip(o, q['t'])]
            p = q['parent']
        m['org'] = o
    for m in mdls:
        w = []
        for x, y, z, pad in m['verts']:
            if pad != -1 and m['parent'] >= 0:
                P = mdls[m['parent']]
                px, py, pz, _ = P['verts'][pad]
                w.append((px + P['org'][0], py + P['org'][1], pz + P['org'][2]))
            else:
                w.append((x + m['org'][0], y + m['org'][1], z + m['org'][2]))
        m['world'] = w
    return mdls

def to_obj(mdls, out):
    L = []
    base = 1
    for k, m in enumerate(mdls):
        L.append(f'o pieza_{k}')
        for x, y, z in m['world']:
            L.append(f'v {x} {y} {z}')
        for i in range(0, len(m['vi']), 4):
            a, b, c, dd = [m['vi'][i + j] & 127 for j in (0, 1, 2, 3)]
            L.append(f'f {a + base} {b + base} {c + base} {dd + base}')
        base += len(m['world'])
    open(out, 'w').write('\n'.join(L))
if __name__ == '__main__':
    m = load(sys.argv[1])
    to_obj(m, sys.argv[2])
    print(len(m), 'piezas', sum((len(x['world']) for x in m)), 'verts', sum((len(x['vi']) // 4 for x in m)), 'caras')
