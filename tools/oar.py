# MGS web — FeniXVOID · Project Ravenlight
import struct, sys, os, re, json
SRC = os.path.join(os.path.dirname(__file__), '..', 'ref', 'mgs_reversing', 'source', 'game', 'motion.c')

def _curvas():
    if not os.path.exists(SRC):
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import tablas_ref
        return tablas_ref.curvas()
    t = open(SRC, encoding='utf-8', errors='replace').read()
    bloque = t[t.index('word_8009D69C'):t.index('dword_8009DE1C')]
    nums = [int(x, 16) for x in re.findall('0x([0-9A-Fa-f]{4})', bloque)]
    assert len(nums) == 15 * 64, len(nums)
    return [nums[i * 64:(i + 1) * 64] for i in range(15)]
CURVAS = _curvas()
INTERP = [65536] + [65536 // k for k in range(1, 16)]

def envolver(v):
    return (v + 2048) % 4096 - 2048

class Bits:

    def __init__(self, w, pos, shift):
        self.w, self.p, self.s = (w, pos, shift)

    def leer(self, n, signo=True):
        if n == 0:
            return 0
        w = self.w
        v = (w[self.p] | w[self.p + 1] << 16) >> self.s & (1 << n) - 1
        if signo and v & 1 << n - 1:
            v -= 1 << n
        self.s += n
        if self.s & 16:
            self.p += 1
            self.s &= 15
        return v

def leer(path, ciclicas=()):
    d = open(path, 'rb').read()
    _, n_joint, n_motion, _ = struct.unpack_from('<IIII', d, 0)
    w = list(struct.unpack_from(f'<{(len(d) - 16) // 2}H', d, 16)) + [0, 0]
    tam = n_joint + 2
    base_arch = tam * n_motion
    motions = []

    def decodificar(act, previa=None):
        fila = w[tam * act:tam * (act + 1)]
        n_frame = fila[0]
        a = base_arch + fila[1]
        base_vy = struct.unpack('<h', struct.pack('<H', w[a]))[0]
        tams = w[a + 1] & 4095
        rx, ry, rz = (tams & 15, tams >> 4 & 15, tams >> 8 & 15)
        raiz = Bits(w, a + 2, 0)
        segs = []
        for i in range(n_joint):
            s = base_arch + fila[2 + i]
            h = w[s] & 4095
            seg = {'xs': h & 15, 'ys': h >> 4 & 15, 'zs': h >> 8 & 15, 'b': Bits(w, s, 12)}
            inflar(seg)
            if previa is None:
                seg['base'] = list(seg['clave'])
                seg['delta'] = [0, 0, 0]
            elif i == 0:
                seg['base'], seg['delta'] = corregir_cintura(previa[i], seg['clave'])
            else:
                seg['base'] = list(previa[i])
                seg['delta'] = [envolver(seg['clave'][k] - previa[i][k]) for k in range(3)]
            segs.append(seg)
        cuadros, alturas, pasos = ([], [], [])
        quedan = n_frame
        while quedan > 0:
            ultimo = quedan == 1
            vx = raiz.leer(rx)
            vy = raiz.leer(ry)
            vz = raiz.leer(rz)
            alturas.append(vy + base_vy)
            pasos.append([vx, vz])
            rot = []
            for seg in segs:
                N = seg['N']
                idx = INTERP[N] * (N - seg['f18']) >> 10
                c = 4096 if idx >= 64 else CURVAS[seg['curva']][idx]
                r = [(seg['delta'][k] * c >> 12) + seg['base'][k] & 4095 for k in range(3)]
                seg['f18'] -= 1
                if seg['f18'] < 0:
                    seg['base'] = r
                    if not ultimo:
                        inflar(seg)
                        seg['delta'] = [envolver(seg['clave'][k] - r[k]) for k in range(3)]
                rot.append(r)
            cuadros.append(rot)
            quedan -= 1
        return {'cuadros': cuadros, 'altura': alturas, 'paso': pasos, 'bases': [list(s['base']) for s in segs]}
    for act in range(n_motion):
        m = decodificar(act)
        if act in ciclicas and len(m['cuadros']) > 1:
            m = decodificar(act, m['bases'])
        del m['bases']
        motions.append(m)
    return {'n_joint': n_joint, 'motions': motions}

def corregir_cintura(base, clave):
    b = list(base)
    v1 = [b[0] - 2048 & 4095 if b[0] > 0 else b[0] + 2048 & 4095, 2048 - b[1] & 4095 if b[1] > 0 else -2048 - b[1] & 4095, b[2] - 2048 & 4095 if b[2] > 0 else b[2] + 2048 & 4095]
    d = [envolver(clave[k] - b[k]) for k in range(3)]
    d2 = [envolver(clave[k] - v1[k]) for k in range(3)]
    if sum((1 if abs(d[k]) <= abs(d2[k]) else -1 for k in range(3))) < 0:
        return (v1, d2)
    return (b, d)

def inflar(seg):
    b = seg['b']
    v = b.leer(8, signo=False)
    seg['N'] = v & 15
    seg['curva'] = v >> 4 & 15
    seg['f18'] = seg['N'] - 1
    seg['clave'] = [b.leer(seg['xs']), b.leer(seg['ys']), b.leer(seg['zs'])]
if __name__ == '__main__':
    r = leer(sys.argv[1])
    print('huesos', r['n_joint'], 'animaciones', len(r['motions']))
    for i, m in enumerate(r['motions'][:60]):
        print(f"  {i:2d}: {len(m['cuadros'])} cuadros, altura {min(m['altura'])}..{max(m['altura'])}, avance z {sum((p[1] for p in m['paso']))}")
    if '--json' in sys.argv:
        json.dump(r, open(sys.argv[sys.argv.index('--json') + 1], 'w'), separators=(',', ':'))
