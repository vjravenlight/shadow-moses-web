# MGS web — FeniXVOID · Project Ravenlight
import struct, math

def leer_lit(path):
    d = open(path, 'rb').read()
    n = struct.unpack_from('<i', d, 0)[0]
    luces = []
    for i in range(n):
        x, y, z, _, r, e, cr, cg, cb, _ = struct.unpack_from('<4hHH4B', d, 4 + i * 16)
        luces.append((x, y, z, max(1, r), e, cr, cg, cb))
    return luces

def normales_kmd(path):
    d = open(path, 'rb').read()
    n_x = struct.unpack_from('<i', d, 4)[0]
    out = []
    for m in range(n_x):
        f = struct.unpack_from('<22i', d, 32 + m * 88)
        nf, nn, pn, pni = (f[1], f[16], f[17], f[18])
        if not nn or not pn or (not pni):
            out.append(None)
            continue
        norms = [struct.unpack_from('<3h', d, pn + i * 8) for i in range(nn)]
        idx = d[pni:pni + nf * 4]
        out.append([norms[k & 127] if k & 127 < nn else (0, 4096, 0) for k in idx])
    return out

def vector_luz(dx, dy, dz, r):
    d = math.sqrt(dx * dx + dy * dy + dz * dz) or 1.0
    k = max(0.0, 2 * r - d) / r * 0.75 / d
    return (dx * k, dy * k, dz * k)

def color_vertice(pos, normal, luces, ambiente=(0, 0, 0), principal=None, signo=-1):
    x, y, z = pos
    nx, ny, nz = (c / 4096.0 for c in normal)
    I = [a / 256.0 for a in ambiente]
    usadas = 0
    if principal:
        (lx, ly, lz), (cr, cg, cb) = principal
        dot = max(0.0, lx * nx + ly * ny + lz * nz)
        I[0] += cr / 256.0 * dot
        I[1] += cg / 256.0 * dot
        I[2] += cb / 256.0 * dot
    for px, py, pz, r, e, cr, cg, cb in luces:
        dx, dy, dz = (x - px, y - py, z - pz)
        if not (-e <= dx <= e and -e <= dy <= e and (-e <= dz <= e)):
            continue
        lx, ly, lz = vector_luz(dx, dy, dz, r)
        dot = max(0.0, signo * (lx * nx + ly * ny + lz * nz))
        I[0] += cr / 256.0 * dot
        I[1] += cg / 256.0 * dot
        I[2] += cb / 256.0 * dot
        usadas += 1
        if usadas == 2:
            break
    cod = [(256 - a) / 2.0 for a in ambiente]
    return tuple((min(255.0, cod[k] * I[k]) / 128.0 for k in range(3)))
