# MGS web — FeniXVOID · Project Ravenlight
import json
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
import os
import struct
import sys
import unicodedata
import numpy as np
from PIL import Image
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import radio_dat as R
RES = os.path.join(EXTRAIDO, 'disco1', '01_stages', 'init', 'resident')
DAT = os.path.join(EXTRAIDO, 'disco1', '00_disco', 'MGS', 'RADIO.DAT')
OUT = os.path.join(ASSETS, 'codec')
CARAS = os.path.join(OUT, 'caras', 'caras.json')

def color15(c):
    r, g, b = (c & 31, c >> 5 & 31, c >> 10 & 31)
    return (r << 3 | r >> 2, g << 3 | g >> 2, b << 3 | b >> 2, 0 if c == 0 else 255)

def fuente():
    d = open(os.path.join(RES, 'font.rar'), 'rb').read()
    fin_tabla, zen_off = struct.unpack('>II', d[:8])
    n = (fin_tabla - 8) // 4
    tabla = struct.unpack('>%dI' % n, d[8:fin_tabla])
    datos = d[fin_tabla:]
    glifos = []
    for e in tabla:
        yo, w, off = (e >> 28, e >> 24 & 15, e & 16777215)
        px = np.zeros((12, max(w, 1)), np.uint8)
        bit = 0
        for y in range(12):
            for x in range(w):
                b = datos[off + (bit >> 3)] if off + (bit >> 3) < len(datos) else 0
                px[y, x] = b >> 6 - (bit & 7) & 3
                bit += 2
        glifos.append((yo, w, px))
    nz = (len(d) - zen_off) // 36
    ancho = sum((max(w, 1) + 1 for _, w, _ in glifos))
    W = max(ancho, nz * 13)
    atlas = np.zeros((12 + 12, W), np.uint8)
    meta = []
    x = 0
    for yo, w, px in glifos:
        atlas[0:12, x:x + px.shape[1]] = px
        meta.append([x, yo, w])
        x += max(w, 1) + 1
    for k in range(nz):
        g = d[zen_off + 36 * k:zen_off + 36 * (k + 1)]
        for y in range(12):
            v = g[y * 3] << 16 | g[y * 3 + 1] << 8 | g[y * 3 + 2]
            for xx in range(12):
                atlas[12 + y, k * 13 + xx] = v >> 22 - 2 * xx & 3
    rgba = np.zeros(atlas.shape + (4,), np.uint8)
    rgba[..., 0] = atlas * 85
    rgba[..., 3] = np.where(atlas > 0, 255, 0)
    os.makedirs(os.path.join(OUT, 'ui'), exist_ok=True)
    Image.fromarray(rgba).save(os.path.join(OUT, 'ui', 'fuente.png'))
    json.dump({'ascii': meta, 'zen': nz, 'zen_y': 12, 'zen_paso': 13, 'origen': 'init/resident/font.rar (font.res), font/font.c put_hankaku_4bpp / put_zenkaku_4bpp'}, open(os.path.join(OUT, 'ui', 'fuente.json'), 'w', encoding='utf-8'), separators=(',', ':'))
    anchos = [m[2] for m in meta]
    print('fuente: %d glifos ascii (ancho %d..%d), %d zenkaku' % (len(meta), min(anchos), max(anchos), nz))

def rpk_items(path):
    d = open(path, 'rb').read()
    n = d[0] + d[1]
    offs = struct.unpack_from('<%dI' % n, d, 4)
    base = 4 + 4 * n
    return (d, [base + o for o in offs])

def marco():
    d, its = rpk_items(os.path.join(RES, 'item.rar'))
    pal = [color15(c) for c in struct.unpack_from('<16H', d, its[42] + 4)]
    p = its[43]
    w, h = (d[p + 2] * 4, d[p + 3])
    raw = np.frombuffer(d, np.uint8, count=w * h // 2, offset=p + 4)
    idx = np.empty(w * h, np.uint8)
    idx[0::2] = raw & 15
    idx[1::2] = raw >> 4
    Image.fromarray(np.array(pal, np.uint8)[idx.reshape(h, w)]).save(os.path.join(OUT, 'ui', 'marco.png'))
    print('marco: %dx%d' % (w, h))

def cartel_call():
    d = open(os.path.join(RES, 'call.rar'), 'rb').read()
    bnum = struct.unpack_from('<I', d, 8)[0]
    clut = [color15(c) for c in struct.unpack_from('<16H', d, 20)]
    q = 8 + bnum
    _, x, y, w, h = struct.unpack_from('<IHHHH', d, q)
    w *= 4
    raw = np.frombuffer(d, np.uint8, count=w * h // 2, offset=q + 12)
    idx = np.empty(w * h, np.uint8)
    idx[0::2] = raw & 15
    idx[1::2] = raw >> 4
    img = np.array(clut, np.uint8)[idx.reshape(h, w)]
    Image.fromarray(img).save(os.path.join(OUT, 'ui', 'call.png'))
    print('call: %dx%d, clut[0]=%s' % (w, h, clut[0]))

def texto_js(b):
    out = []
    i = 0
    while i < len(b):
        c = b[i]
        if c < 128:
            out.append(chr(c))
            i += 1
        else:
            code = c << 8 | (b[i + 1] if i + 1 < len(b) else 0)
            i += 2
            out.append(chr(code & 255) if code & 65280 == 32768 else chr(code))
    return ''.join(out)

def plano(s):
    return unicodedata.normalize('NFKC', s) if isinstance(s, str) else s

def caras_de_grupo(cj, sector):
    g = next((g for g in cj['grupos'] if g['sector'] == sector), None)
    if not g:
        return {}
    out = {}
    for c in g['caras']:
        info = cj['caras'].get(c['carpeta'], {})
        e = {'carpeta': c['carpeta'], 'tipo': info.get('tipo')}
        if info.get('tipo') == 'simple':
            e['base'] = info.get('base')
            e['ojos'] = [[o['x'], o['y'], o['w'], o['h']] if o else None for o in info.get('ojos', [])]
            e['boca'] = [[o['x'], o['y'], o['w'], o['h']] if o else None for o in info.get('boca', [])]
        elif info.get('tipo') == 'completa':
            cs = []
            for q in info.get('cuadros', []):
                if 'archivo' in q:
                    cs.append({'img': q['archivo'], 'fundido': q.get('fundido', 0), 'espera': q.get('espera', 0)})
                else:
                    cs.append({k: v for k, v in q.items()})
            e['cuadros'] = cs
        out['%04x' % int(c['codigo'], 16)] = e
    return out

def preparar_eventos(evs, d):
    for ev in evs:
        t = ev.get('tipo')
        if t == 'hablar':
            raw, _ = R.cstring(d, ev['off'] + 4 + 6)
            ev['t'] = texto_js(raw)
            ev.pop('texto_crudo', None)
        elif t == 'pregunta':
            ev['opciones'] = [plano(x) for x in ev.get('opciones', [])]
        elif t == 'guardar':
            ev['nombres'] = [plano(x) for x in ev.get('nombres', [])]
        if isinstance(ev.get('eventos'), list):
            preparar_eventos(ev['eventos'], d)
        for r in ev.get('ramas', []) or []:
            preparar_eventos(r['eventos'], d)
        for c in ev.get('casos', []) or []:
            preparar_eventos(c['eventos'], d)

def llamadas():
    d, lls, huecos, errores = R.parsear(DAT)
    usos = R.codes_de_scripts()
    cj = json.load(open(CARAS, encoding='utf-8'))
    dest = os.path.join(OUT, 'llamadas')
    os.makedirs(dest, exist_ok=True)
    indice = {}
    total = 0
    for ll in lls:
        preparar_eventos(ll['eventos'], d)
        u = usos.get(ll['code'], [])
        freqs = sorted(set((x.get('freq') for x in u if x.get('freq'))))
        sal = {'off': ll['off'], 'code': ll['code'], 'freq': freqs[0] if freqs else None, 'freq_header': ll['freq_header'], 'face_sector': ll['face']['sector'], 'flags': ll['flags'], 'glifos': ll.get('glifos', []), 'caras': caras_de_grupo(cj, ll['face']['sector']), 'eventos': ll['eventos']}
        s = json.dumps(sal, ensure_ascii=True, separators=(',', ':'))
        open(os.path.join(dest, '%d.json' % ll['off']), 'w', encoding='utf-8').write(s)
        total += len(s)
        indice[ll['off']] = [ll['code'], sal['freq'], ll['bytes'], sorted(set((x['stage'] for x in u if x.get('disco') in (None, 'disco1'))))]
    json.dump(indice, open(os.path.join(dest, 'indice.json'), 'w', encoding='utf-8'), separators=(',', ':'))
    print('llamadas: %d archivos, %.2f MB, %d errores de parseo' % (len(lls), total / 1000000.0, len(errores)))
if __name__ == '__main__':
    fuente()
    marco()
    cartel_call()
    llamadas()
