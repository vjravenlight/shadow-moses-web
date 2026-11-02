# MGS web — FeniXVOID · Project Ravenlight
import struct
import numpy as np
from PIL import Image

def _rle(data, pos, size):
    out = bytearray()
    while len(out) < size:
        code = data[pos]
        pos += 1
        if code <= 192:
            out.append(code)
        else:
            n = code - 192
            out += bytes([data[pos]]) * n
            pos += 1
    return (out, pos)

def decode(path, semi=None):
    d = open(path, 'rb').read()
    min_x, min_y, max_x, max_y = struct.unpack('<4H', d[4:12])
    hdr_pal = d[16:64]
    bpl = struct.unpack('<H', d[66:68])[0]
    stamp, flag, px, py, cx, cy, ncol = struct.unpack('<7H', d[74:88])
    w, h = (max_x - min_x + 1, max_y - min_y + 1)
    pos = 128
    if flag & 1:
        idx, pos = _rle(d, pos, w * h)
        pal = d[pos + 1:pos + 1 + 3 * max(ncol, 1)]
        idx = np.frombuffer(bytes(idx[:w * h]), np.uint8).reshape(h, w)
    else:
        pal = hdr_pal
        rows = []
        for _ in range(h):
            line, pos = _rle(d, pos, bpl * 4)
            planes = np.frombuffer(bytes(line[:bpl * 4]), np.uint8).reshape(4, bpl)
            bits = np.unpackbits(planes, axis=1)[:, :w]
            rows.append(bits[0] | bits[1] << 1 | bits[2] << 2 | bits[3] << 3)
        idx = np.array(rows, np.uint8)
    n = len(pal) // 3
    p = np.zeros((256, 4), np.uint8)
    pp = np.frombuffer(pal[:n * 3], np.uint8).reshape(n, 3)
    p[:n, :3] = pp
    p[:n, 3] = np.where(pp.sum(1) == 0, 0, 255)
    if semi is not None:
        stp = np.zeros(256, bool)
        stp[:n] = (pp[:, 0] | pp[:, 1] | pp[:, 2]) & 7 != 0
        p[:n, 3] = np.where(pp.sum(1) == 0, 0, np.where(stp[:n], semi, 255))
    return Image.fromarray(p[idx], 'RGBA')

def modo_semi(path):
    d = open(path, 'rb').read(88)
    return (struct.unpack('<H', d[76:78])[0] & 48) >> 4
if __name__ == '__main__':
    import sys
    decode(sys.argv[1]).save(sys.argv[2])
