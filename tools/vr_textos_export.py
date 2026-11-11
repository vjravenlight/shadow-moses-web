# MGS web — FeniXVOID · Project Ravenlight
import sys, os, re, json, glob, struct, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS
import gcx
VERSION = 1
VRWINDOW = 54350
G_IDIOMA = '$b:G0011'
RAMA = {1: 'de', 3: 'it', 4: 'es'}
USA = os.path.join(EXTRAIDO, 'vr_usa', '01_stages')
JAP = os.path.join(EXTRAIDO, 'integral3_vr', '01_stages')
OUT = os.path.join(ASSETS, 'vr', 'disco', 'idiomas')

def log(*a):
    print(*a, flush=True)
_valor = gcx.Lector.valor

def _valor_crudo(self, p):
    if self.d[p] == gcx.T_STRING:
        q = p + 1
        n = self.d[q]
        return ({'str': self.d[q + 1:q + 1 + n].split(b'\x00')[0].decode('latin1')}, q + n + 1)
    return _valor(self, p)

def leer_crudo(path):
    gcx.Lector.valor = _valor_crudo
    try:
        return gcx.leer(path)
    finally:
        gcx.Lector.valor = _valor

def kanji_del_guion(path):
    d = open(path, 'rb').read()
    proclen = struct.unpack('>i', d[0:4])[0]
    script = 4 + proclen
    font = script + 4 + struct.unpack('>i', d[script:script + 4])[0]
    return d[font + 4:] if font + 4 <= len(d) else b''

def texto_disco(s):
    out, i = ([], 0)
    while i < len(s):
        c = s[i]
        if c == '�' and i + 1 < len(s):
            n = s[i + 1]
            out.append({1: '"', 2: '"', 3: '*'}.get(ord(n), n if ord(n) >= 32 else ''))
            i += 2
            continue
        out.append(c)
        i += 1
    return ''.join(out)

def limpiar(s):
    return ''.join((ch for ch in s if ch == ' ' or 32 < ord(ch) < 127)).rstrip()

def clave_usa(crudo):
    return limpiar(texto_disco(crudo.encode('latin1').decode('shift_jis', 'replace')))
ESPECIALES = {1: '"', 2: '"', 3: '*'}

def unicode_eu(s):
    s = re.sub('\x1f(.)', lambda m: bytes([127 + ord(m.group(1)) & 255]).decode('mac_roman') if ord(m.group(1)) < 129 else '', s, flags=re.S)
    s = re.sub('\x9a([\x01-\x03])', lambda m: ESPECIALES[ord(m.group(1))], s)
    return re.sub('\x80(.)', lambda m: m.group(1) if ord(m.group(1)) >= 32 else ESPECIALES.get(ord(m.group(1)), ''), s, flags=re.S).rstrip()

def codigos(raw):
    out, i = ([], 0)
    while i < len(raw):
        c = raw[i]
        if c == 31 and i + 1 < len(raw):
            out.append(chr(127 + raw[i + 1] & 255))
            i += 2
        elif c < 128:
            out.append(chr(c))
            i += 1
        else:
            b = raw[i + 1] if i + 1 < len(raw) else 0
            code = c << 8 | b
            i += 2
            if code & 65280 == 32768:
                out.append({1: '"', 2: '"', 3: '*'}.get(b, chr(b) if b >= 32 else ''))
            else:
                out.append(chr(code))
    return ''.join(out).rstrip()
NUM = re.compile('\\d+')

def numeros_del_usa(trad, ingles):
    a, b = (NUM.findall(trad), NUM.findall(ingles))
    if len(a) != len(b) or a == b:
        return (trad, len(a) == len(b))
    it = iter(b)
    return (NUM.sub(lambda m: next(it), trad), True)
VALOR = re.compile('( {3,})(\\S.*\\d.*)$')

def valores_del_usa(trad, ingles):
    ve = [VALOR.search(l) for l in ingles]
    ve = [m.group(2) for m in ve if m]
    pos = [(i, m) for i, m in ((i, VALOR.search(l)) for i, l in enumerate(trad)) if m]
    if not ve or len(ve) != len(pos):
        t, ok = numeros_del_usa('\n'.join(trad), ' '.join(ingles))
        return (t.split('\n'), ok)
    out = list(trad)
    for (i, m), en in zip(pos, ve):
        tv, dt, de = (m.group(2), NUM.findall(m.group(2)), NUM.findall(en))
        if len(dt) == len(de):
            it = iter(de)
            nuevo = NUM.sub(lambda x: next(it), tv)
        else:
            nuevo = en
        largo = len(m.group(1)) + len(tv)
        out[i] = trad[i][:m.start()] + ' ' * max(1, largo - len(nuevo)) + nuevo
    return (out, True)

def _opts(chara):
    o = {}
    for a in chara['args'][1:]:
        if isinstance(a, dict) and 'opt' in a:
            o[a['opt']] = a['v']
    return o

def _ventana(chara):
    o = _opts(chara)
    lineas = [v['str'] for v in o.get('b', []) if isinstance(v, dict) and 'str' in v]
    n = next((v for v in o.get('i', []) if isinstance(v, int)), len(lineas))
    w = [v for v in o.get('w', []) if isinstance(v, int)]
    return {'crudo': lineas[:n], 'n': n, 'w': w[2] if len(w) > 2 else 256}

def _es_vrwindow(s):
    return s.get('cmd') == 'chara' and s.get('args') and isinstance(s['args'][0], dict) and (s['args'][0].get('id') == VRWINDOW)

def _es_idioma(e):
    return isinstance(e, dict) and isinstance(e.get('expr'), list) and (len(e['expr']) >= 2) and (e['expr'][0] == {'var': G_IDIOMA})

def _sub_bloques(s):
    for a in s.get('args', []):
        if isinstance(a, dict):
            if 'bloque' in a:
                yield a['bloque']
            for v in a.get('v', []) or []:
                if isinstance(v, dict) and 'bloque' in v:
                    yield v['bloque']

def ventanas_usa(path):
    r = leer_crudo(path)
    out = []

    def rec(b):
        for s in b:
            if s.get('cmd') == 'if' and s.get('args') and _es_idioma(s['args'][0]):
                ramas = {0: s['args'][1]['bloque']}
                for o in s['args'][2:]:
                    if isinstance(o, dict) and o.get('opt') == 'i' and (len(o['v']) >= 2) and _es_idioma(o['v'][0]):
                        k = o['v'][0]['expr'][1]
                        ramas[k] = o['v'][1]['bloque']
                en = [x for x in ramas[0] if _es_vrwindow(x)]
                for i, x in enumerate(en):
                    trad = {}
                    for k, idi in RAMA.items():
                        vs = [y for y in ramas.get(k, []) if _es_vrwindow(y)]
                        if i < len(vs):
                            trad[idi] = _ventana(vs[i])
                    out.append((_ventana(x), trad))
                continue
            if _es_vrwindow(s):
                out.append((_ventana(s), {}))
            for sb in _sub_bloques(s):
                rec(sb)
    rec(r['main'])
    for b in r['procs'].values():
        rec(b)
    return out

def ventanas_simples(path):
    r = leer_crudo(path)
    out = []

    def rec(b):
        for s in b:
            if _es_vrwindow(s):
                out.append(_ventana(s))
            for sb in _sub_bloques(s):
                rec(sb)
    rec(r['main'])
    for b in r['procs'].values():
        rec(b)
    return out

def glifos_t2(tj, tabla2):
    gl = {}
    for t in tj:
        for ch in t:
            c = ord(ch) & ~24576
            if c >= 39424:
                r = c - 39424
                tv, a = (r >> 9, r & 511)
                n = a - 1 - (a >> 8)
                if tv == 0 and 0 <= n and (36 * (n + 1) <= len(tabla2)):
                    gl[n] = tabla2[36 * n:36 * (n + 1)].hex()
    return gl

def norm_tit(t):
    return re.sub('[\\s-]+', '', t)

def tipo(lineas):
    cuerpo = [l for l in lineas[3:] if l.strip()]
    return 'cuenta' if cuerpo and all((re.search('\\s{4,}\\S*\\d', l) for l in cuerpo)) else 'texto'

def tipo_ja(tj):
    cuerpo = [l for l in tj if l.strip()]
    return 'cuenta' if cuerpo and all((re.search(' {4,}\\S*\\d', l) for l in cuerpo)) else 'texto'

def exportar_fuente(res, dest):
    import codec_web as CW
    r0, o0 = (CW.RES, CW.OUT)
    try:
        CW.RES, CW.OUT = (res, dest)
        CW.fuente()
    finally:
        CW.RES, CW.OUT = (r0, o0)
    pj = os.path.join(dest, 'ui', 'fuente.json')
    j = json.load(open(pj, encoding='utf-8'))
    j['europea'] = len(j['ascii']) > 96
    json.dump(j, open(pj, 'w', encoding='utf-8'), separators=(',', ':'))

def europeos(solo):
    guiones = sorted(glob.glob(os.path.join(USA, '*', 'cache', 'scenerio.gcx')))
    res = {k: {} for k in RAMA.values() if k in solo}
    ingles = {}
    sin, choques, nums_raros, titulos_distintos = ({k: 0 for k in res}, {k: 0 for k in res}, {k: 0 for k in res}, {k: 0 for k in res})
    total = 0
    for g in guiones:
        st = g.split(os.sep)[-3]
        tabla2 = kanji_del_guion(g)
        for en, trad in ventanas_usa(g):
            lin = [clave_usa(x) for x in en['crudo']]
            if len(lin) <= 3:
                continue
            clave = '\n'.join(lin[3:])
            ingles.setdefault(clave, {'lineas': lin, 'st': st})
            total += 1
            for k in res:
                t = trad.get(k)
                if not t:
                    sin[k] += 1
                    continue
                if [clave_usa(x) for x in t['crudo'][:2]] != lin[:2]:
                    titulos_distintos[k] += 1
                cuerpo = t['crudo'][3:]
                uni, ok1 = valores_del_usa([unicode_eu(x) for x in cuerpo], lin[3:])
                cod, ok2 = valores_del_usa([codigos(x.encode('latin1')) for x in cuerpo], lin[3:])
                if not (ok1 and ok2):
                    nums_raros[k] += 1
                e = {'l': uni, 'tj': cod, 'w': t['w'], 'n': t['n']}
                gl = glifos_t2(cod, tabla2)
                if gl:
                    e['g'] = gl
                if clave in res[k] and res[k][clave] != e:
                    choques[k] += 1
                    continue
                res[k][clave] = e
    for k in res:
        log('  %s: %d ventanas distintas de %d; sin traducción %d, título distinto %d, números sin emparejar %d, misma clave con otra traducción %d' % (k, len(res[k]), total, sin[k], titulos_distintos[k], nums_raros[k], choques[k]))
    return (res, ingles)

def japones(ingles):
    guiones = sorted(glob.glob(os.path.join(JAP, '*', 'cache', 'scenerio.gcx')))
    por_titulo = {}
    for clave, d in ingles.items():
        k = (norm_tit(d['lineas'][0]), norm_tit(d['lineas'][1]), tipo(d['lineas']))
        por_titulo.setdefault(k, []).append(clave)
    jp = {}
    for g in guiones:
        tabla2 = kanji_del_guion(g)
        for v in ventanas_simples(g):
            cr = v['crudo']
            if len(cr) <= 3:
                continue
            tit = (norm_tit(clave_usa(cr[0])), norm_tit(clave_usa(cr[1])))
            tj = [codigos(x.encode('latin1')) for x in cr[3:]]
            k = tit + (tipo_ja(tj),)
            gl = glifos_t2(tj, tabla2)
            e = {'tj': tj, 'g': gl, 'w': v['w'], 'n': v['n']}
            firma = tuple((''.join((gl.get(ord(ch) - 39425 - (ord(ch) - 39424 >> 8), ch) if ord(ch) >= 39424 else ch for ch in t)) for t in tj))
            lst = jp.setdefault(k, {})
            lst.setdefault(firma, e)
    res, sin, dudosas = ({}, 0, 0)
    for k, claves in por_titulo.items():
        cands = list(jp.get(k, {}).values())
        if not cands:
            sin += len(claves)
            continue
        if len(cands) != len(claves):
            dudosas += len(claves)
        for i, clave in enumerate(claves):
            if len(cands) == len(claves):
                e = dict(cands[i])
            elif len(cands) == 1:
                e = dict(cands[0])
            else:
                continue
            e['tj'], _ = valores_del_usa(e['tj'], ingles[clave]['lineas'][3:])
            res[clave] = e
    log('  ja: %d ventanas de %d; sin par %d; con otra cantidad de ventanas con ese título %d (sólo si había una)' % (len(res), len(ingles), sin, dudosas))
    return res

def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, ValueError):
        pass
    ap = argparse.ArgumentParser()
    ap.add_argument('--solo', default='es,de,it,ja')
    a = ap.parse_args()
    solo = set(a.solo.split(','))
    if not glob.glob(os.path.join(USA, '*', 'cache', 'scenerio.gcx')):
        log('no está el disco de VR Missions (%s): nada que hacer' % USA)
        return 0
    os.makedirs(OUT, exist_ok=True)
    res, ingles = europeos(solo)
    if res:
        exportar_fuente(os.path.join(USA, 'init', 'resident'), os.path.join(OUT, 'eu'))
    for k, v in res.items():
        json.dump({'version': VERSION, 'idioma': k, 'origen': 'VR Missions USA ($b:G0011)', 'fuente': 'eu/ui/', 'ventanas': v}, open(os.path.join(OUT, k + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    if 'ja' in solo:
        if glob.glob(os.path.join(JAP, '*', 'cache', 'scenerio.gcx')):
            v = japones(ingles)
            exportar_fuente(os.path.join(JAP, 'init', 'resident'), os.path.join(OUT, 'ja'))
            json.dump({'version': VERSION, 'idioma': 'ja', 'origen': 'Integral VR-DISC (integral3_vr)', 'fuente': 'ja/ui/', 'ventanas': v}, open(os.path.join(OUT, 'ja.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        else:
            log('  ja: no está el disco 3 del Integral (%s): las ventanas quedan en inglés' % JAP)
    log('listo: %s' % OUT)
    return 0
if __name__ == '__main__':
    sys.exit(main())
