# MGS web — FeniXVOID · Project Ravenlight
import struct, os, sys, json, re
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
DISCO = sys.argv[1]
SRC = os.path.join(EXTRAIDO, DISCO, '00_disco', 'MGS', 'STAGE.DIR')
OUT = os.path.join(EXTRAIDO, DISCO, '01_stages').replace(os.sep, '/')
EXT = {'b': 'bin', 'p': 'pcx', 'k': 'kmd', 'l': 'lit', 'n': 'nar', 'o': 'oar', 'z': 'zmd', 'i': 'img', 's': 'sgt', 'g': 'gcx', 'h': 'hzm', 'w': 'wvx', 'm': 'mdx', 'e': 'efx', 'c': 'crv', 'r': 'rar', 'a': 'azm', 'd': 'dar'}

def strcode(s):
    i = 0
    for c in s.encode():
        i = (i << 5 | i >> 11) & 65535
        i = i + c & 65535
    return i
names = {}
if os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'names.txt')):
    for n in open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'names.txt'), encoding='latin1').read().split():
        names.setdefault(strcode(n), n)

def nm(i):
    return names.get(i, f'{i:04x}')
d = open(SRC, 'rb').read()
n = struct.unpack('<I', d[:4])[0]
ents = [(d[i:i + 8].rstrip(b'\x00').decode(), struct.unpack('<I', d[i + 8:i + 12])[0]) for i in range(4, 4 + n, 12)]
inv = []
SEC = 2048
for stage, sec in ents:
    base = sec * SEC
    ver, _, size = struct.unpack('<BBh', d[base:base + 4])
    tags = []
    p = base + 4
    while True:
        tid, mode, ext, sz = struct.unpack('<HBBi', d[p:p + 8])
        p += 8
        if mode == 0:
            break
        tags.append((tid, chr(mode), ext, sz))
    sdir = f'{OUT}/{stage}'
    os.makedirs(sdir, exist_ok=True)
    pos = base + SEC
    cache_done = False
    i = 0

    def rd(sz):
        global pos
        b = d[pos:pos + sz]
        pos += (sz + SEC - 1) // SEC * SEC
        return b
    while i < len(tags):
        tid, mode, ext, sz = tags[i]
        if mode == 's':
            fn = f"{sdir}/sound/{nm(tid)}.{EXT.get(chr(ext), 'x' + chr(ext))}"
            os.makedirs(os.path.dirname(fn), exist_ok=True)
            open(fn, 'wb').write(rd(sz))
            inv.append((stage, 'sound', fn, sz))
            i += 1
        elif mode in 'nr':
            blob = rd(sz)
            q = 0
            reg = 'resident' if mode == 'r' else 'nocache'
            while q + 8 <= len(blob):
                fid, fext, fsz = struct.unpack('<Hhi', blob[q:q + 8])
                if fsz <= 0:
                    break
                e = EXT.get(chr(fext & 255), 'x%02x' % (fext & 255))
                fn = f'{sdir}/{reg}/{nm(fid)}.{e}'
                os.makedirs(os.path.dirname(fn), exist_ok=True)
                open(fn, 'wb').write(blob[q + 8:q + 8 + fsz])
                inv.append((stage, reg, fn, fsz))
                q += 8 + fsz
            i += 1
        elif mode == 'c':
            j = i
            while tags[j][2] != 255:
                j += 1
            total = tags[j][3]
            blob = rd(total)
            for k in range(i, j):
                cid, _, cext, off = tags[k]
                end = tags[k + 1][3]
                e = EXT.get(chr(cext), 'x' + chr(cext))
                fn = f'{sdir}/cache/{nm(cid)}.{e}'
                os.makedirs(os.path.dirname(fn), exist_ok=True)
                open(fn, 'wb').write(blob[off:end])
                inv.append((stage, 'cache', fn, end - off))
            i = j + 1
        else:
            print('modo raro', stage, mode)
            i += 1
    if (pos - base) // SEC != size:
        print(f'{stage}: leidos {(pos - base) // SEC} sect, header dice {size}')
json.dump(inv, open(f'{OUT}/_inventario.json', 'w'), indent=0)
print('archivos', len(inv))
