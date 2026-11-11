# MGS web — FeniXVOID · Project Ravenlight
import os, sys, json, struct, hashlib, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS
AQUI = os.path.dirname(os.path.abspath(__file__))
TABLA = os.path.join(AQUI, 'staff_kanji.json')
FREQ = 14007

def fuente(path):
    d = open(path, 'rb').read()
    fin_tabla, zen_off = struct.unpack('>II', d[:8])
    return [d[zen_off + 36 * k:zen_off + 36 * (k + 1)] for k in range((len(d) - zen_off) // 36)]

def codigos(raw):
    out, i = ([], 0)
    while i < len(raw):
        c = raw[i]
        if c < 128:
            out.append(c)
            i += 1
        else:
            if i + 1 >= len(raw):
                break
            out.append((c << 8 | raw[i + 1]) & 40959)
            i += 2
    return out

def indice(code):
    code &= ~24576
    if code < 33280:
        return code - 33025
    if code < 33536:
        return code - 33198
    if code < 38400:
        return code - 36721 - code // 256 + 169
    if code < 39424:
        return code - 38251 - code // 256 | 4096
    t = (code - 39424) // 512
    a = code - 39424 - t * 512
    return a - 1 - a // 256 | (t + 2) * 4096

def md5(b):
    return hashlib.md5(b).hexdigest()

def recorrer(evs, f):
    for e in evs:
        f(e)
        if 'eventos' in e:
            recorrer(e['eventos'], f)
        for r in e.get('ramas', []) + e.get('casos', []):
            recorrer(r['eventos'], f)

def pares_sjis(dat, font):
    import radio_dat as RD, gcx
    d, lls, _, _ = RD.parsear(dat)
    cod, loc = ({}, {})

    def strings(p, fin):
        out = []
        while p < fin and d[p] != 0:
            if d[p] == gcx.T_STRING:
                n = d[p + 1]
                out.append(d[p + 2:p + 2 + n].split(b'\x00')[0])
                p += 2 + n
            else:
                _, p = gcx.Lector(d).valor(p)
        return out
    for ll in lls:
        gl = [bytes.fromhex(g) for g in ll.get('glifos', [])]

        def f(e):
            if e['tipo'] != 'guardar':
                return
            q = e['off']
            fin = q + 2 + RD.be16(d, q + 2)
            _, p = gcx.Lector(d).valor(q + 4)
            ss = strings(p, fin)
            for a, b in zip(ss[0::2], ss[1::2]):
                ca = codigos(a)
                try:
                    tb = b.decode('shift_jis')
                except UnicodeDecodeError:
                    continue
                if len(ca) != len(tb):
                    continue
                for c, ch in zip(ca, tb):
                    if c < 33536:
                        continue
                    i = indice(c)
                    if i >= 4096:
                        if i >> 12 == 1 and i & 4095 < len(gl):
                            bm = gl[i & 4095]
                            j = next((k for k, x in enumerate(font) if x == bm), None)
                            if j is not None and j >= 169:
                                cod['%x' % next((c2 for c2 in range(36865, 38400) if indice(c2) == j))] = ch
                            else:
                                loc[md5(bm)] = ch
                    elif i >= 169:
                        cod['%x' % c] = ch
        recorrer(ll['eventos'], f)
    return (cod, loc)

def armar_tabla():
    jp = os.path.join(EXTRAIDO, 'japon1', '00_disco', 'MGS', 'RADIO.DAT')
    fj = os.path.join(EXTRAIDO, 'japon1', '01_stages', 'init', 'resident', 'font.rar')
    if not (os.path.exists(jp) and os.path.exists(fj)):
        print('staff_texto: sin extraido/japon1 no se puede rehacer la tabla')
        return None
    cod, loc = pares_sjis(jp, fuente(fj))
    t = json.load(open(TABLA, encoding='utf-8'))
    t['sjis'] = dict(sorted(cod.items()))
    t['locales_sjis'] = dict(sorted(loc.items()))
    distintos = {k: (t['ojo'].get(k), v) for k, v in cod.items() if t['ojo'].get(k) not in (None, v)}
    json.dump(t, open(TABLA, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('tabla: %d códigos y %d dibujos de llamada con su Shift-JIS; lecturas a ojo que no coinciden: %s' % (len(cod), len(loc), distintos or 'ninguna'))
    return t

def exportar():
    dat = next((p for p in (os.path.join(EXTRAIDO, 'integral%d' % n, '00_disco', 'MGS', 'RADIO.DAT') for n in (1, 2)) if os.path.exists(p)), None)
    fnt = next((p for p in (os.path.join(EXTRAIDO, 'integral%d' % n, '01_stages', 'init', 'resident', 'font.rar') for n in (1, 2)) if os.path.exists(p)), None)
    dest = os.path.join(ASSETS, 'integral', 'staff')
    if not dat or not fnt or (not os.path.isdir(dest)):
        return None
    import radio_dat as RD
    t = json.load(open(TABLA, encoding='utf-8'))
    font = fuente(fnt)
    por_codigo = {**t.get('dudoso', {}), **t.get('ojo', {}), **t.get('sjis', {})}
    por_dibujo = {}
    for c, ch in por_codigo.items():
        i = indice(int(c, 16))
        if 0 <= i < len(font):
            por_dibujo.setdefault(md5(font[i]), ch)
    por_dibujo.update(t.get('locales_dudoso', {}))
    por_dibujo.update(t.get('locales_ojo', {}))
    por_dibujo.update(t.get('locales_sjis', {}))
    try:
        usadas = set(json.load(open(os.path.join(dest, 'indice.json'), encoding='utf-8')).get('llamadas', []))
    except Exception:
        usadas = None
    d, lls, _, _ = RD.parsear(dat)
    sin_leer, cuenta = ({}, collections.Counter())

    def letra(c, gl):
        if c < 128:
            return chr(c)
        if c < 33024:
            return chr(c & 255)
        if c < 33280:
            cuenta['kana'] += 1
            return chr(12352 + (c & 255))
        if c < 33536:
            cuenta['kana'] += 1
            return chr(12448 + (c & 255))
        i = indice(c)
        if i < 4096:
            ch = por_codigo.get('%x' % c)
            cuenta['fuente' if ch else 'fuente_sin_leer'] += 1
            return ch or '〓{%x}' % c
        bm = gl[i & 4095] if i >> 12 == 1 and i & 4095 < len(gl) else None
        if bm is None:
            cuenta['sin_dibujo'] += 1
            return '〓'
        h = md5(bm)
        ch = por_dibujo.get(h)
        if ch:
            cuenta['llamada'] += 1
            return ch
        cuenta['llamada_sin_leer'] += 1
        n = sin_leer.setdefault(h, (len(sin_leer), bm))[0]
        return '〓{%d}' % n
    out = {}
    for ll in lls:
        if ll['freq_header'] != FREQ or (usadas is not None and ll['off'] not in usadas):
            continue
        gl = [bytes.fromhex(g) for g in ll.get('glifos', [])]
        lineas = []

        def f(e):
            if e['tipo'] != 'hablar':
                return
            raw, _ = RD.cstring(d, e['off'] + 10)
            txt = ''.join((letra(c, gl) for c in codigos(raw))).replace('#N', '\n')
            lineas.append({'quien': e.get('quien'), 'texto': txt})
        recorrer(ll['eventos'], f)
        out[str(ll['off'])] = lineas
    json.dump({'_que': 'STAFF 140.07 del Integral en Unicode (tools/staff_texto.py). 〓{n} = kanji de la llamada sin leer (su dibujo: glifos_sin_leer.png); 〓{90xx} = de la fuente sin leer. Los kanji de la fuente marcados "ojo" en tools/staff_kanji.json están leídos a ojo, sin verificar.', 'cuenta': dict(cuenta), 'llamadas': out}, open(os.path.join(dest, 'texto.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    try:
        import numpy as np
        from PIL import Image
        lista = sorted(sin_leer.values())
        cols = 32
        filas = max(1, (len(lista) + cols - 1) // cols)
        im = np.full((filas * 14, cols * 14), 255, np.uint8)
        for n, bm in lista:
            y0, x0 = (n // cols * 14 + 1, n % cols * 14 + 1)
            for y in range(12):
                v = bm[y * 3] << 16 | bm[y * 3 + 1] << 8 | bm[y * 3 + 2]
                for x in range(12):
                    im[y0 + y, x0 + x] = 255 - (v >> 22 - 2 * x & 3) * 85
        Image.fromarray(im).save(os.path.join(dest, 'glifos_sin_leer.png'))
        json.dump({'columnas': cols, 'celda': 14, 'glifos': [md5(bm) for _, bm in lista]}, open(os.path.join(dest, 'glifos_sin_leer.json'), 'w'), separators=(',', ':'))
    except ImportError:
        pass
    total = sum(cuenta.values())
    leidos = cuenta['kana'] + cuenta['fuente'] + cuenta['llamada']
    print('STAFF en texto: %d llamadas, %d letras japonesas, %d leídas (%.0f%%), %d dibujos de llamada sin leer' % (len(out), total, leidos, 100 * leidos / max(1, total), len(sin_leer)))
    return {'texto': 'integral/staff/texto.json', 'leidas': round(leidos / max(1, total), 3), 'sin_leer': len(sin_leer)}
if __name__ == '__main__':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    if '--tabla' in sys.argv:
        armar_tabla()
    print(exportar())
