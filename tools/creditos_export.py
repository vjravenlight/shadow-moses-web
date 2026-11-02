# MGS web — FeniXVOID · Project Ravenlight
import json
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
import os
import struct
import sys
from PIL import Image
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
ORIGEN = os.path.join(EXTRAIDO, 'disco2', '01_stages', 'roll', 'cache')
SALIDA = os.path.join(ASSETS, 'demos', 'creditos')
TIEMPOS = [615, 1587, 2267, 3610, 4728, 5517, 6866, 7504, 9009, 9908, 10892, 11449, 12085, 12660, 13152, 14324, 15258, 15723, 16123, 16644, 17870, 18620, 18989, 19366, 19729]

def color(c):
    if c == 0:
        return (0, 0, 0, 0)
    r, g, b = (c & 31, c >> 5 & 31, c >> 10 & 31)
    return (r * 255 // 31, g * 255 // 31, b * 255 // 31, 255)

def lz(src, p, n):
    out = bytearray()
    while len(out) < n:
        b = src[p]
        p += 1
        largo = b & 127
        if b & 128:
            atras = src[p]
            p += 1
            for _ in range(largo):
                out.append(out[len(out) - atras])
        else:
            out += src[p:p + largo]
            p += largo
    return (bytes(out[:n]), p)

def imagenes(d):
    n = struct.unpack_from('<I', d, 0)[0]
    p = 4
    out = []
    for _ in range(n):
        w, h = struct.unpack_from('<hh', d, p)
        pal = struct.unpack_from('<16H', d, p + 4)
        tam = struct.unpack_from('<i', d, p + 36)[0]
        q = p + 40
        im = Image.new('RGBA', (w, h))
        px = im.load()
        cols = [color(c) for c in pal]
        for y in range(h):
            if d[q] & 64:
                q += 1
                continue
            flag = d[q]
            q += 1
            if flag & 192:
                continue
            fila, q = lz(d, q, w // 2)
            for i, b in enumerate(fila):
                px[2 * i, y] = cols[b & 15]
                px[2 * i + 1, y] = cols[b >> 4]
        out.append(im)
        p = p + 40 + tam
    return out

def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, ValueError):
        pass
    os.makedirs(SALIDA, exist_ok=True)
    info = {'archivos': {}, 'tiempos_rodillo': TIEMPOS, 'unidad_tiempos': 'ticks de 60 Hz (mts_get_tick_count) desde que arranca el rodillo', 'origen': os.path.relpath(ORIGEN, RAIZ)}
    total = 0
    for nombre in ('credit', 'b8b9', 'b8ba'):
        d = open(os.path.join(ORIGEN, nombre + '.rar'), 'rb').read()
        lista = []
        for k, im in enumerate(imagenes(d)):
            png = '%s_%02d.png' % (nombre, k)
            im.save(os.path.join(SALIDA, png), optimize=True)
            total += os.path.getsize(os.path.join(SALIDA, png))
            lista.append({'png': 'demos/creditos/' + png, 'w': im.size[0], 'h': im.size[1]})
        info['archivos'][nombre] = lista
        print('%s: %d imágenes %s' % (nombre, len(lista), ', '.join(('%dx%d' % (x['w'], x['h']) for x in lista[:8]))))
    json.dump(info, open(os.path.join(SALIDA, 'creditos.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('listo: %.0f KB en %s' % (total / 1024, os.path.relpath(SALIDA, RAIZ)))
if __name__ == '__main__':
    main()
