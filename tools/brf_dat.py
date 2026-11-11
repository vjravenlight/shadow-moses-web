# MGS web — FeniXVOID · Project Ravenlight
import json, os, struct, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rutas import EXTRAIDO
BRF = os.path.join(EXTRAIDO, 'disco1', '00_disco', 'MGS', 'BRF.DAT')
OVERLAY = os.path.join(EXTRAIDO, 'disco1', '01_stages', 'brf', 'sound', '96a7.bin')
BASE = 2148292968
N = 19
T_V, T_C = (2148292988, 2148293216)
T_DUR = 2148293444
T_ARCH = 2148293520
T_CONT = 2148293584
T_NPOL = 2148293736
T_POL = 2148298816
T_CORTES = 2148299792
T_BOCAS = 2148300788
T_OJOS = 2148300860

def strcode(s):
    i = 0
    for c in s.encode('latin1') if isinstance(s, str) else s:
        i = (i << 5 | i >> 11) & 65535
        i = i + c & 65535
    return i

class Overlay:

    def __init__(self, ruta=OVERLAY):
        self.d = open(ruta, 'rb').read()

    def u32(self, a):
        return struct.unpack_from('<I', self.d, a - BASE)[0]

    def s16(self, a):
        return struct.unpack_from('<h', self.d, a - BASE)[0]

    def u16(self, a):
        return struct.unpack_from('<H', self.d, a - BASE)[0]

    def u8(self, a):
        return self.d[a - BASE]

    def cad(self, a):
        o = a - BASE
        return self.d[o:self.d.index(b'\x00', o)].decode('latin1')

    def valido(self):
        try:
            return self.cad(self.u32(T_V)) == 's00v.dbl' and self.cad(self.u32(T_C)) == 's00c.dbl'
        except (ValueError, IndexError, struct.error):
            return False

    def paquetes(self, tabla):
        out = []
        for i in range(N):
            p, sec, tam = struct.unpack_from('<III', self.d, tabla - BASE + 12 * i)
            out.append((self.cad(p), sec, tam) if tam else None)
        return out

    def polys(self, k):
        p, n = (self.u32(T_POL + 4 * k), self.s16(T_NPOL + 2 * k))
        out = []
        for i in range(n):
            t, a, x0, y0, x1, y1, h = struct.unpack_from('<HHhhhhI', self.d, p - BASE + 16 * i)
            out.append((t, a, x0, y0, x1, y1, h))
        return out

    def cortes(self, k):
        p, out = (self.u32(T_CORTES + 4 * k), [])
        for i in range(64):
            f, c = struct.unpack_from('<hh', self.d, p - BASE + 4 * i)
            if i and f == 0 and (c == 0):
                break
            out.append((f, c))
        return out

    def tabla_hashes(self, t, n):
        return [list(struct.unpack_from('<4H', self.d, self.u32(t + 4 * i) - BASE)) for i in range(n)]

    def movimiento(self, a, n):
        return [list(struct.unpack_from('<ihhhh', self.d, a - BASE + 12 * i)) for i in range(n)]

def paquete(brf, sec, tam):
    d = brf[sec * 2048:sec * 2048 + tam]
    n = struct.unpack_from('<I', d, 0)[0]
    p, out = (4, [])
    for _ in range(n):
        e = d.index(b'\x00', p)
        nombre = d[p:e].decode('latin1')
        p = e + 1
        p += (4 - p % 4) % 4
        m = struct.unpack_from('<I', d, p)[0]
        p += 4
        out.append((nombre, d[p:p + m + 1]))
        p += m + 1
    return out

def pll(x):
    modo, bits, ncol, w, h, fl, vx, vy, cx, cy, nr = struct.unpack_from('<BBHHHHHHHHH', x, 0)
    p = 20
    pal = struct.unpack_from('<%dH' % ncol, x, p)
    p += ncol * 2
    if ncol & 1:
        p += 2
    b1, b2 = (bits & 15, bits >> 4)
    k1, k2 = (32 // b1, 32 // b2)
    base2 = p + (nr + k1 - 1) // k1 * 4
    m1, m2 = ((1 << b1) - 1, (1 << b2) - 1)
    ind = bytearray()
    for i in range(nr):
        n = (struct.unpack_from('<I', x, p + i // k1 * 4)[0] >> i % k1 * b1 & m1) + 1
        v = struct.unpack_from('<I', x, base2 + i // k2 * 4)[0] >> i % k2 * b2 & m2
        ind += bytes([v]) * n
    return dict(w=w, h=h, modo=modo, flags=fl, abr=fl >> 4 & 3, vram=(vx, vy), clut=(cx, cy), ind=bytes(ind[:w * h]), pal=pal)

def rgba(img):
    import numpy as np
    from PIL import Image
    pal = np.zeros((256, 4), np.uint8)
    for i, c in enumerate(img['pal'][:256]):
        r, g, b = ((c & 31) << 3, (c >> 5 & 31) << 3, (c >> 10 & 31) << 3)
        pal[i] = (r | r >> 5, g | g >> 5, b | b >> 5, 0 if c == 0 else 160 if c & 32768 else 255)
    ind = np.frombuffer(img['ind'].ljust(img['w'] * img['h'], b'\x00'), np.uint8).reshape(img['h'], img['w'])
    return Image.fromarray(pal[ind], 'RGBA')

def _rle(d, pos, size):
    out = bytearray()
    while len(out) < size:
        c = d[pos]
        pos += 1
        if c <= 192:
            out.append(c)
        else:
            out += bytes([d[pos]]) * (c - 192)
            pos += 1
    return (out, pos)

def pcx_a_vram(d, vram):
    min_x, min_y, max_x, max_y = struct.unpack_from('<4H', d, 4)
    bpl = struct.unpack_from('<H', d, 66)[0]
    stamp, flag, px, py, cx, cy, ncol = struct.unpack_from('<7H', d, 74)
    w, h = (max_x - min_x + 1, max_y - min_y + 1)
    if flag & 1:
        ind, pos = _rle(d, 128, w * h)
        datos = bytes(ind[:w * h])
        pal = d[pos + 1:pos + 1 + 3 * ncol]
        ww = w // 2
    else:
        filas = bytearray()
        pos = 128
        for _ in range(h):
            linea, pos = _rle(d, pos, bpl * 4)
            r, g, b, a = (linea[k * bpl:(k + 1) * bpl] for k in range(4))
            fila = []
            for x in range(w):
                bit = 128 >> (x & 7)
                k = x >> 3
                fila.append((1 if r[k] & bit else 0) | (2 if g[k] & bit else 0) | (4 if b[k] & bit else 0) | (8 if a[k] & bit else 0))
            if len(fila) & 1:
                fila.append(0)
            filas += bytes((fila[i] | fila[i + 1] << 4 for i in range(0, len(fila), 2)))
        datos = bytes(filas)
        pal = d[16:16 + 48]
        ww = w // 4
    cl = []
    for i in range(ncol):
        r, g, b = pal[3 * i:3 * i + 3] if 3 * i + 3 <= len(pal) else (0, 0, 0)
        c = 1 << 15 if (r | g | b) & 7 else 0
        if r or g or b:
            c |= b >> 3 << 10 | g >> 3 << 5 | r >> 3
        cl.append(c)
    _cargar(vram, cx, cy, ncol, 1, struct.pack('<%dH' % ncol, *cl))
    alto = h
    _cargar(vram, px, py, ww, alto, datos)
    tp, abr = (flag & 1, (flag & 48) >> 4)
    tpage = px // 64 + (py // 256 << 4) | tp << 7 | abr << 5
    clut = cy << 6 | cx >> 4
    x = px % 64
    x, wt = (x * 2, ww * 2) if tp else (x * 4, ww * 4)
    return [tpage, clut, x, py % 256, wt - 1, alto - 1, ncol]

def _cargar(vram, x, y, w, h, datos):
    for j in range(h):
        o = ((y + j) * 1024 + x) * 2
        f = datos[j * w * 2:(j + 1) * w * 2]
        vram[o:o + len(f)] = f

def exportar(destino, voces=True):
    import shutil
    if not (os.path.exists(OVERLAY) and os.path.exists(BRF)):
        return None
    ov = Overlay()
    if not ov.valido():
        return None
    os.makedirs(destino, exist_ok=True)
    shutil.copyfile(OVERLAY, os.path.join(destino, 'overlay.bin'))
    fin = max((s * 2048 + t for tabla in (T_V, T_C) for e in ov.paquetes(tabla) if e for _, s, t in [e]))
    brf = open(BRF, 'rb').read()
    with open(os.path.join(destino, 'brf.dat'), 'wb') as f:
        f.write(brf[:fin])
    vram = bytearray(1024 * 512 * 2)
    tex = {}
    noc = os.path.join(EXTRAIDO, 'disco1', '01_stages', 'brf', 'nocache')
    conocidos = set((l.strip() for l in open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'names.txt'), encoding='latin1')))
    for nombre in sorted(os.listdir(noc)):
        if not nombre.lower().endswith('.pcx'):
            continue
        base = nombre[:-4]
        es_hash = base not in conocidos and len(base) == 4 and all((c in '0123456789abcdef' for c in base))
        h = int(base, 16) if es_hash else strcode(base)
        tex[str(h)] = pcx_a_vram(open(os.path.join(noc, nombre), 'rb').read(), vram)
    with open(os.path.join(destino, 'vram.bin'), 'wb') as f:
        f.write(bytes(vram))
    json.dump(tex, open(os.path.join(destino, 'texturas.json'), 'w'), separators=(',', ':'))
    vox = VOCES
    if voces:
        exportar_voces(vox, os.path.join(destino, 'vox'))
    info = {'version': 1, 'vox': vox, 'brf_bytes': fin, 'durs': [ov.u32(T_DUR + 4 * i) for i in range(N)]}
    json.dump(info, open(os.path.join(destino, 'brf.json'), 'w'), separators=(',', ':'))
    return {'informes': N, 'texturas': len(tex), 'voces': len(vox)}
VOCES = [969, 3109, 3214, 3658, 6745, 6968, 7451, 1460, 1676, 2062, 2651, 3913, 4070, 4629, 5075, 5467, 7, 6081, 7888]

def exportar_voces(ids, salida):
    import tempfile
    import codec_voces as CV
    import vox as V
    os.makedirs(salida, exist_ok=True)
    CV.SALIDA = salida
    nombres = V.nombres_soundtest(1)
    tmp = tempfile.mkdtemp(prefix='brf_vox_')
    try:
        for i in ids:
            vid, d, wav, err = CV.decodificar((i, nombres.get(i), False, tmp, 1, 'original'))
            if err or wav:
                raise SystemExit('voz %d del briefing: %s' % (i, err or 'no se pudo copiar en ADPCM'))
    finally:
        shutil_rm(tmp)

def shutil_rm(p):
    import shutil
    shutil.rmtree(p, ignore_errors=True)

def main():
    if '--exportar' in sys.argv:
        from rutas import ASSETS
        print(exportar(os.path.join(ASSETS, 'extras', 'brf')))
        return
    ov = Overlay()
    if not ov.valido():
        raise SystemExit('el overlay de brf no es el USA esperado')
    brf = open(BRF, 'rb').read()
    tot = 0
    for t in (T_V, T_C):
        for k, e in enumerate(ov.paquetes(t)):
            if not e:
                continue
            ims = paquete(brf, e[1], e[2])
            tot += len(ims)
            if '--lista' in sys.argv:
                print(k, e[0], [n for n, _ in ims])
    print('imagenes', tot)
if __name__ == '__main__':
    main()
