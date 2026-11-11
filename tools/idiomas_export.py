# MGS web — FeniXVOID · Project Ravenlight
import argparse
import collections
import difflib
import glob
import json
import mmap
import os
import re
import struct
import sys
import time
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gcx
import radio_dat as R
import demo_dat as D
import vox as V
BASE2 = 200000
VERSION = 1
IDIOMAS = {'es': ('espana', 'CASTELLANO', True), 'de': ('alemania', 'DEUTSCH', True), 'it': ('italia', 'ITALIANO', True), 'ja': ('japon', 'JAPONES', False)}

def log(*a):
    print(*a, flush=True)

def _mac(xx):
    return bytes([127 + xx & 255]).decode('mac_roman')

def unicode_eu(s):
    s = re.sub('\x1f(.)', lambda m: _mac(ord(m.group(1))) if ord(m.group(1)) < 129 else '', s, flags=re.S)
    s = s.replace('\x80|', '\n').replace('\r', '\n')
    return re.sub('\x80(.)', lambda m: m.group(1), s, flags=re.S)

def fuente_eu(s):
    return re.sub('\x1f(.)', lambda m: chr(127 + ord(m.group(1)) & 255) if ord(m.group(1)) < 129 else '', s, flags=re.S)

def texto_js_eu(raw):
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
            code = c << 8 | (raw[i + 1] if i + 1 < len(raw) else 0)
            i += 2
            out.append(chr(code & 255) if code & 65280 == 32768 else chr(code))
    return ''.join(out)

def texto_legible(t):
    out = []
    for ch in t:
        c = ord(ch)
        if 128 <= c <= 255:
            out.append(bytes([c]).decode('mac_roman'))
        elif c < 128:
            out.append(ch)
        elif c == 36865:
            out.append(' ')
        else:
            out.append('?')
    return ''.join(out).replace('#N', '\n').replace('|', '\n')

class Version:

    def __init__(self, idioma, disco1=None):
        self.idioma = idioma
        pref, self.nombre, self.europeo = IDIOMAS[idioma]
        self.d1 = disco1 or os.path.join(EXTRAIDO, pref + '1')
        self.d2 = re.sub('1$', '2', self.d1.rstrip('\\/'))
        self.sal = os.path.join(ASSETS, 'idiomas', idioma)

    def mgs(self, n, archivo):
        return os.path.join(self.d1 if n == 1 else self.d2, '00_disco', 'MGS', archivo)

    def hay(self):
        return os.path.exists(self.mgs(1, 'RADIO.DAT'))

def usa(n, archivo):
    return os.path.join(EXTRAIDO, 'disco%d' % n, '00_disco', 'MGS', archivo)

def _tokens(x, out):
    if isinstance(x, list):
        out.append(('[', len(x)))
        for y in x:
            _tokens(y, out)
        out.append((']',))
    elif isinstance(x, dict):
        for k in sorted(x):
            if k == 'n':
                continue
            v = x[k]
            if k in ('cmd', 'opt', 'var', 'op', 'str', 'arg', 'proc', 'call', 'id') and isinstance(v, (int, str)):
                out.append((k, v))
            else:
                out.append((k,))
                _tokens(v, out)
    elif isinstance(x, int):
        out.append(('num', x))
    else:
        out.append(('otro', str(x)))

def _bloques(path):
    r = gcx.leer(path)
    out = {}
    for nombre, bl in [('proc_%d' % pid, b) for pid, b in r['procs'].items()] + [('main', r['main'])]:
        sents = []
        for st in bl:
            t = []
            _tokens(st, t)
            sents.append(t)
        out[nombre] = sents
    return out

def _tapar(ts):
    return tuple((('num',) if t[0] == 'num' else t for t in ts))

def _emparejar_tokens(a, b, pares):
    ma, mb = (_tapar(a), _tapar(b))
    if ma == mb:
        ops = [('equal', 0, len(a), 0, len(b))]
    elif len(a) * len(b) > 4000000.0:
        return
    else:
        ops = difflib.SequenceMatcher(None, ma, mb, autojunk=False).get_opcodes()
    for op, i1, i2, j1, j2 in ops:
        if op == 'equal' or (op == 'replace' and i2 - i1 == j2 - j1):
            for k in range(i2 - i1):
                x, y = (a[i1 + k], b[j1 + k])
                if x[0] == 'num' and y[0] == 'num':
                    pares[x[1]][y[1]] += 1

def _emparejar_sentencias(A, B, pares):
    sa, sb = ([_tapar(x) for x in A], [_tapar(x) for x in B])
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, sa, sb, autojunk=False).get_opcodes():
        if op == 'equal':
            for k in range(i2 - i1):
                _emparejar_tokens(A[i1 + k], B[j1 + k], pares)
        elif op == 'replace':
            if i2 - i1 == j2 - j1:
                for k in range(i2 - i1):
                    _emparejar_tokens(A[i1 + k], B[j1 + k], pares)
            else:
                _emparejar_tokens([t for x in A[i1:i2] for t in x], [t for x in B[j1:j2] for t in x], pares)

def pares_guiones(ver):
    pares = {1: collections.defaultdict(collections.Counter), 2: collections.defaultdict(collections.Counter)}
    for n, dv in ((1, ver.d1), (2, ver.d2)):
        for f in sorted(glob.glob(os.path.join(EXTRAIDO, 'disco%d' % n, '01_stages', '*', 'cache', 'scenerio.gcx'))):
            st = os.path.normpath(f).split(os.sep)[-3]
            g = os.path.join(dv, '01_stages', st, 'cache', 'scenerio.gcx')
            if not os.path.exists(g):
                continue
            try:
                a, b = (_bloques(f), _bloques(g))
            except Exception as e:
                log('  ! guion %s/%s: %s' % (n, st, e))
                continue
            for nombre, A in a.items():
                if nombre in b:
                    _emparejar_sentencias(A, b[nombre], pares[n])
    return pares

def elegir(cnt):
    return cnt.most_common(1)[0][0] if cnt else None

def _voces_evs(evs, out):
    for e in evs or []:
        if e.get('tipo') == 'voz':
            out.append(e)
        _voces_evs(e.get('eventos'), out)
        for r in e.get('ramas', []) or []:
            _voces_evs(r['eventos'], out)
        for c in e.get('casos', []) or []:
            _voces_evs(c['eventos'], out)
    return out

def _caras_evs(evs, out):
    for e in evs or []:
        if e.get('tipo') == 'hablar':
            out.append((e.get('personaje'), e.get('cara')))
        _caras_evs(e.get('eventos'), out)
        for r in e.get('ramas', []) or []:
            _caras_evs(r['eventos'], out)
        for c in e.get('casos', []) or []:
            _caras_evs(c['eventos'], out)
    return out

def grupos_partidos(indice_usa):
    por_code = {v[0]: int(k) for k, v in indice_usa.items()}
    grupos = set()
    for f in sorted(glob.glob(os.path.join(EXTRAIDO, 'disco1', '01_stages', '*', 'cache', 'scenerio.gcx'))):
        try:
            bl = _bloques(f)
        except Exception:
            continue
        for sents in bl.values():
            for s in sents:
                offs = sorted({por_code[t[1]] for t in s if t[0] == 'num' and t[1] in por_code and (t[1] > 65535)})
                if len(offs) < 2:
                    continue
                fr = {indice_usa[str(o)][1] for o in offs}
                if len(fr) == 1 and None not in fr:
                    grupos.add(tuple(offs))
    return [list(g) for g in sorted(grupos)]

def fuente_ja(s):
    try:
        return texto_js_eu(s.encode('shift_jis'))
    except UnicodeEncodeError:
        return s

def _preparar(evs, d, europeo=True):
    for ev in evs or []:
        t = ev.get('tipo')
        if t == 'hablar':
            raw, _ = R.cstring(d, ev['off'] + 4 + 6)
            ev['t'] = texto_js_eu(raw)
            ev.pop('texto_crudo', None)
            ev.pop('texto', None)
        elif t == 'pregunta':
            ev['opciones'] = [(fuente_eu(x) if europeo else fuente_ja(x)) if isinstance(x, str) else x for x in ev.get('opciones', [])]
        elif t == 'guardar':
            ev['nombres'] = [unicode_eu(x) if isinstance(x, str) else x for x in ev.get('nombres', [])]
        _preparar(ev.get('eventos'), d, europeo)
        for r in ev.get('ramas', []) or []:
            _preparar(r['eventos'], d, europeo)
        for c in ev.get('casos', []) or []:
            _preparar(c['eventos'], d, europeo)

def _guardar_evs(evs, out):
    for e in evs or []:
        if e.get('tipo') == 'guardar':
            out.append(e)
        _guardar_evs(e.get('eventos'), out)
        for r in e.get('ramas', []) or []:
            _guardar_evs(r['eventos'], out)
        for c in e.get('casos', []) or []:
            _guardar_evs(c['eventos'], out)
    return out

def _seg_voz(mm, sec):
    s = V.stream_en(mm, sec)
    if not s:
        return None
    for q, t, tam in D.paquetes(mm, s['offset'], s.get('fin')):
        if t == 2:
            return D.leer_pcm_cab(mm, q).get('segundos')
        if t == 240:
            break
    return None

def revisar_alineadas(ver, mapa_vox, alineadas, lim=(0.5, 2.0)):
    mms, archivos, buenos, malos = ({}, [], 0, 0)
    for u, o in sorted(alineadas):
        try:
            su = json.load(open(os.path.join(ASSETS, 'codec', 'vox', '%d.json' % u), encoding='utf-8')).get('seg')
        except (OSError, ValueError):
            su = None
        disco, sec = (2, o - BASE2) if o >= BASE2 else (1, o)
        if disco not in mms:
            p = ver.mgs(disco, 'VOX.DAT')
            mms[disco] = None
            if os.path.exists(p):
                archivos.append(open(p, 'rb'))
                mms[disco] = mmap.mmap(archivos[-1].fileno(), 0, access=mmap.ACCESS_READ)
        so = _seg_voz(mms[disco], sec) if mms[disco] is not None else None
        if not su or not so or (not lim[0] <= so / su <= lim[1]):
            c = mapa_vox.get(u)
            if c is not None:
                c[o] -= 1
                if c[o] <= 0:
                    del c[o]
                if not c:
                    del mapa_vox[u]
            malos += 1
        else:
            buenos += 1
    return (buenos, malos)
alineadas = set()

def llamadas(ver, pares, mapa_vox):
    alineadas.clear()
    import codec_web as CW
    d1, ll1, _, err1 = R.parsear(ver.mgs(1, 'RADIO.DAT'))
    otra2 = {}
    if os.path.exists(ver.mgs(2, 'RADIO.DAT')):
        d2, ll2, _, _ = R.parsear(ver.mgs(2, 'RADIO.DAT'))
        if [x['off'] for x in ll1] == [x['off'] for x in ll2]:
            for a, b in zip(ll1, ll2):
                va, vb = (_voces_evs(a['eventos'], []), _voces_evs(b['eventos'], []))
                for x, y in zip(va, vb):
                    otra2[x['off']] = y['vox']
        else:
            log('  ! el RADIO.DAT del disco 2 tiene otro orden: las voces que sólo están en el disco 2 quedan sin poner')
    por_off = {ll['off']: ll for ll in ll1}
    indice_usa = json.load(open(os.path.join(ASSETS, 'codec', 'llamadas', 'indice.json'), encoding='utf-8'))
    cj = json.load(open(os.path.join(ASSETS, 'codec', 'caras', 'caras.json'), encoding='utf-8'))
    dest = os.path.join(ver.sal, 'codec', 'llamadas')
    os.makedirs(dest, exist_ok=True)
    hechas, sin_par, voces_distintas, indice = (0, [], 0, {})
    usados = set()
    par = {}
    for off_s, info in indice_usa.items():
        cand = collections.Counter()
        for n in (1, 2):
            cand.update(pares[n].get(info[0], {}))
        code2 = elegir(cand)
        if code2 is not None and code2 & 16777215 in por_off:
            par[int(off_s)] = code2 & 16777215
    lu_todas = {}
    for off_s in indice_usa:
        ru = os.path.join(ASSETS, 'codec', 'llamadas', '%s.json' % off_s)
        lu_todas[int(off_s)] = json.load(open(ru, encoding='utf-8')) if os.path.exists(ru) else None
    ou = sorted((int(x) for x in indice_usa))
    oo = [ll['off'] for ll in ll1]
    pos_u, pos_o = ({o: i for i, o in enumerate(ou)}, {o: i for i, o in enumerate(oo)})
    anclas = sorted(((pos_u[u], pos_o[e]) for u, e in par.items()))
    anclas = [(-1, -1)] + anclas + [(len(ou), len(oo))]
    por_orden = 0
    for (ia, ja), (ib, jb) in zip(anclas, anclas[1:]):
        if ib - ia != jb - ja or ib - ia < 2:
            continue
        for k in range(1, ib - ia):
            u, e = (ou[ia + k], oo[ja + k])
            if u in par or e in par.values():
                continue
            lu = lu_todas.get(u)
            if lu and len(_voces_evs(lu['eventos'], [])) == len(_voces_evs(por_off[e]['eventos'], [])):
                par[u] = e
                por_orden += 1
    partidas = 0
    for grupo in grupos_partidos(indice_usa):
        if all((u in par for u in grupo)):
            continue
        cu = []
        for u in grupo:
            cu += _caras_evs(lu_todas[u]['eventos'], []) if lu_todas.get(u) else []
        ya = {par[u] for u in grupo if u in par}
        mejor, rmejor = (None, 0.75)
        for ll in ll1:
            if ya and ll['off'] not in ya:
                continue
            if ll['freq_header'] != indice_usa[str(grupo[0])][1]:
                continue
            co = _caras_evs(ll['eventos'], [])
            if len(co) < 1.3 * max((len(_caras_evs(lu_todas[u]['eventos'], [])) for u in grupo)):
                continue
            r = difflib.SequenceMatcher(None, cu, co, autojunk=False).ratio()
            if r > rmejor:
                mejor, rmejor = (ll['off'], r)
        if mejor is not None:
            for u in grupo:
                if u not in par:
                    par[u] = mejor
                    partidas += 1
    muertas = {int(k) for k, v in indice_usa.items() if not v[3]}
    for off_s, info in indice_usa.items():
        ll = por_off.get(par.get(int(off_s), -1))
        if ll is None:
            sin_par.append(int(off_s))
            continue
        usados.add(ll['off'])
        lu = lu_todas.get(int(off_s))
        evs = json.loads(json.dumps(ll['eventos']))
        _preparar(evs, d1, ver.europeo)
        if not ver.europeo and lu:
            for a, b in zip(_guardar_evs(lu['eventos'], []), _guardar_evs(evs, [])):
                b['nombres'] = a.get('nombres', [])
        vo = _voces_evs(evs, [])
        for e in vo:
            if not e.get('vox') and otra2.get(e['off']):
                e['vox'] = BASE2 + otra2[e['off']]
        if lu:
            vu = _voces_evs(lu['eventos'], [])
            if len(vu) == len(vo):
                for a, b in zip(vu, vo):
                    if a.get('vox') and b.get('vox'):
                        mapa_vox.setdefault(a['vox'], collections.Counter())[b['vox']] += 1
            else:
                voces_distintas += 1
                fa = [(_caras_evs(v.get('eventos'), []) or [None])[0] for v in vu]
                fb = [(_caras_evs(v.get('eventos'), []) or [None])[0] for v in vo]
                for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, fa, fb, autojunk=False).get_opcodes():
                    if op == 'equal' or (op == 'replace' and i2 - i1 == j2 - j1):
                        for k in range(i2 - i1):
                            a, b = (vu[i1 + k], vo[j1 + k])
                            if a.get('vox') and b.get('vox'):
                                mapa_vox.setdefault(a['vox'], collections.Counter())[b['vox']] += 1
                                alineadas.add((a['vox'], b['vox']))
        sal = {'off': ll['off'], 'usa_off': int(off_s), 'code': ll['code'], 'freq': info[1], 'freq_header': ll['freq_header'], 'face_sector': ll['face']['sector'], 'flags': ll['flags'], 'glifos': ll.get('glifos', []), 'caras': CW.caras_de_grupo(cj, ll['face']['sector']), 'eventos': evs, 'idioma': ver.idioma}
        with open(os.path.join(dest, '%s.json' % off_s), 'w', encoding='utf-8') as f:
            json.dump(sal, f, ensure_ascii=True, separators=(',', ':'))
        indice[off_s] = ll['off']
        hechas += 1
    json.dump(indice, open(os.path.join(dest, 'indice.json'), 'w', encoding='utf-8'), separators=(',', ':'))
    vivas = [x for x in sin_par if x not in muertas]
    log('  llamadas: %d de %d emparejadas (%d por orden, %d partidas en el USA; %d sin par: %d que ningún guion llama%s), %d con otra cantidad de voces, %d del disco sin usar, %d errores' % (hechas, len(indice_usa), por_orden, partidas, len(sin_par), len(sin_par) - len(vivas), ' y %d que sí: %s' % (len(vivas), vivas) if vivas else '', voces_distintas, len(ll1) - len(usados), len(err1)))
    return (hechas, sin_par, vivas)

def areas(ver):
    if ver.europeo:
        return 0
    d, ll1, _, _ = R.parsear(ver.mgs(1, 'RADIO.DAT'))
    L = gcx.Lector(d)
    votos = collections.defaultdict(collections.Counter)
    for ll in ll1:
        gl = ll.get('glifos', [])
        for ev in _guardar_evs(ll['eventos'], []):
            q = ev['off'] + 4
            _, q = L.valor(q)
            crudos = []
            while d[q] != 0 and d[q] == gcx.T_STRING:
                n = d[q + 1]
                crudos.append(d[q + 2:q + 2 + n].split(b'\x00')[0])
                q += 2 + n
            for i, raw in enumerate(crudos[0::2]):
                t = texto_js_eu(raw)
                usados = {}
                for ch in t:
                    c = ord(ch) & 40959
                    if 38400 <= c < 39424:
                        k = c - 38251 - (c >> 8)
                        if 0 <= k < len(gl):
                            usados[k] = gl[k]
                votos[i][json.dumps({'t': t, 'glifos': usados}, sort_keys=True)] += 1
    out = [json.loads(votos[i].most_common(1)[0][0]) for i in sorted(votos)]
    json.dump(out, open(os.path.join(ver.sal, 'codec', 'areas.json'), 'w', encoding='utf-8'), ensure_ascii=True, separators=(',', ':'))
    log('  nombres de área (pantalla de guardado): %d' % len(out))
    return len(out)

def ids_voces_usa():
    out = set()
    for f in glob.glob(os.path.join(ASSETS, 'codec', 'vox', '*.json')):
        b = os.path.basename(f)[:-5]
        if b.isdigit():
            out.add(int(b))
    return out

def voces_guion(pares, mapa_vox, ids_usa):
    n_ok = 0
    for vid in ids_usa:
        if vid in mapa_vox:
            continue
        disco, sec = (2, vid - BASE2) if vid >= BASE2 else (1, vid)
        c = pares[disco].get(sec)
        if c:
            v = elegir(c)
            if v and v > 0:
                mapa_vox.setdefault(vid, collections.Counter())[v + (BASE2 if disco == 2 else 0)] += 1
                n_ok += 1
    return n_ok
VERSION_VOZ = 2

def exportar_voces(ver, ids, forzar):
    import codec_voces as CV
    dest = os.path.join(ver.sal, 'vox')
    os.makedirs(dest, exist_ok=True)
    mms = {}
    total_b, hechas, errores = (0, 0, [])
    for vid in sorted(ids):
        disco, sec = (2, vid - BASE2) if vid >= BASE2 else (1, vid)
        js = os.path.join(dest, '%d.json' % vid)
        if not forzar and os.path.exists(js) and os.path.exists(os.path.join(dest, '%d.adpcm' % vid)):
            if ver.europeo or json.load(open(js, encoding='utf-8')).get('v', 1) >= VERSION_VOZ:
                total_b += os.path.getsize(os.path.join(dest, '%d.adpcm' % vid))
                hechas += 1
                continue
        if disco not in mms:
            p = ver.mgs(disco, 'VOX.DAT')
            if not os.path.exists(p):
                errores.append((vid, 'falta VOX.DAT del disco %d' % disco))
                continue
            f = open(p, 'rb')
            mms[disco] = mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ)
        mm = mms[disco]
        s = V.stream_en(mm, sec)
        if not s:
            errores.append((vid, 'no arranca un stream'))
            continue
        info = V.analizar(mm, s)
        cab, bloques = (None, [])
        for q, t, tam in D.paquetes(mm, s['offset'], s.get('fin')):
            if t == 2:
                cab = D.leer_pcm_cab(mm, q)
            elif t == 1:
                bloques.append((q, tam))
            elif t == 240:
                break
        if not cab:
            errores.append((vid, 'sin PCM'))
            continue
        datos, n = D.adpcm_crudo(mm, bloques, cab['canales'])
        if datos is None:
            errores.append((vid, n))
            continue
        hz, ch = (int(round(cab['hz'])), cab['canales'])
        with open(os.path.join(dest, '%d.adpcm' % vid), 'wb') as f:
            f.write(datos)
        sub, lip = CV.subtitulos_y_lip(info)
        if ver.europeo:
            sub = [[a, b, unicode_eu(t)] for a, b, t in sub]
        else:
            extra = [dict(subtitulo_ja(mm, x, l), i=ver.idioma) for x in info['subtitulos'] for l in x['lineas']]
            sub = [[a, b, ''] + ([extra[k]] if k < len(extra) else []) for k, (a, b, t) in enumerate(sub)]
        dj = {'id': vid, 'formato': 'adpcm', 'archivo': '%d.adpcm' % vid, 'hz': hz, 'canales': ch}
        if ch == 2:
            dj['bloque'] = D.BLOQUE_ESTEREO
        dj.update({'seg': round(n / hz, 4), 'muestras': n, 'sub': sub, 'lip': lip, 'idioma': ver.idioma, 'disco': disco, 'sector': sec, 'v': VERSION_VOZ})
        json.dump(dj, open(js, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        total_b += len(datos)
        hechas += 1
    log('  voces: %d (%.1f MB), %d errores %s' % (hechas, total_b / 1000000.0, len(errores), errores[:6]))
    return (hechas, total_b, [e[0] for e in errores])

def _streams(p):
    f = open(p, 'rb')
    mm = mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ)
    return (mm, [s for s in D.hallar_streams(mm) if 'error' not in s])
VERSION_DEMO = 4

def _tabla_zen(c):
    r = c - 39424
    tv, a = (r // 512, r % 512)
    return (tv + 2, a - 1 - a // 256)

def subtitulo_ja(mm, sb, l):
    raw = bytes.fromhex(l['crudo_hex']) if 'crudo_hex' in l else l['texto'].replace('\n', '\x80|').encode('latin1')
    t = texto_js_eu(raw).replace('\r', '|')
    ini = sb['offset'] + sb['tamanio'] - sb['fuente_bytes']
    gl = {}
    for ch in t:
        c = ord(ch) & 40959
        if c >= 39424:
            tabla, k = _tabla_zen(c)
            if tabla == 3 and 0 <= k and (36 * (k + 1) <= sb['fuente_bytes']):
                gl[k] = bytes(mm[ini + 36 * k:ini + 36 * (k + 1)]).hex()
    return {'tj': t, 'glifos': gl}

def _env_audio(mm, s, paso_s=0.1):
    import numpy as np
    cab, izq, est = (None, [], [0, 0])
    for q, t, tam in D.paquetes(mm, s['offset'], s.get('fin')):
        if t == 2:
            cab = D.leer_pcm_cab(mm, q)
        elif t == 1 and cab:
            d = bytes(mm[q + 4:q + tam])
            izq += D.decodificar_adpcm(d if cab['canales'] == 1 else d[D.BLOQUE_ESTEREO:], est)
        elif t == 240:
            break
    x = np.array(izq, np.float32)
    paso = int(cab['hz'] * paso_s)
    m = len(x) // paso
    return (np.log1p(np.sqrt((x[:m * paso].reshape(m, paso) ** 2).mean(1))), len(x) / cab['hz'])

def mapa_tiempo(mo, so, mu, su, paso_s=0.1):
    import numpy as np
    eb, db = _env_audio(mo, so, paso_s)
    ea, da = _env_audio(mu, su, paso_s)
    na, nb = (len(ea), len(eb))
    C = np.abs(ea[:, None] - eb[None, :])
    A = np.full((na + 1, nb + 1), np.inf)
    A[0, 0] = 0
    for x in range(1, na + 1):
        fila, prev, cur = (C[x - 1], A[x - 1], A[x])
        diag = np.minimum(prev[:-1], prev[1:])
        for y in range(1, nb + 1):
            cur[y] = fila[y - 1] + min(diag[y - 1], cur[y - 1])
    x, y, camino = (na, nb, [])
    while x > 0 and y > 0:
        camino.append((x - 1, y - 1))
        k = int(np.argmin([A[x - 1, y - 1], A[x - 1, y], A[x, y - 1]]))
        if k == 0:
            x, y = (x - 1, y - 1)
        elif k == 1:
            x -= 1
        else:
            y -= 1
    camino.reverse()
    usa_de = {}
    for p, q in camino:
        usa_de.setdefault(q, []).append(p)
    pts, ult = ([[0.0, 0.0]], 0.0)
    cada = int(round(1.0 / paso_s))
    for q in range(cada, nb, cada):
        ps = usa_de.get(q)
        if not ps:
            continue
        tu = float(np.median(ps)) * paso_s
        if tu > ult:
            pts.append([round(q * paso_s, 2), round(tu, 2)])
            ult = tu
    u0, u1 = pts[-1]
    pts.append([round(db, 2), round(max(min(da, u1 + (db - u0)), ult + 0.01), 2)])
    return pts

def demos(ver, sin_audio, forzar):
    dest = os.path.join(ver.sal, 'demos')
    os.makedirs(dest, exist_ok=True)
    hechas, total_b, avisos = (0, 0, [])
    for n in (1, 2):
        pu, po = (usa(n, 'DEMO.DAT'), ver.mgs(n, 'DEMO.DAT'))
        if not (os.path.exists(pu) and os.path.exists(po)):
            continue
        mu, su = _streams(pu)
        mo, so = _streams(po)
        if len(su) != len(so):
            avisos.append('disco %d: %d cinemáticas contra %d; no se emparejan' % (n, len(su), len(so)))
            continue
        for a, b in zip(su, so):
            did = a['sector'] + (BASE2 if n == 2 else 0)
            if not os.path.isdir(os.path.join(ASSETS, 'demos', str(did))):
                continue
            js = os.path.join(dest, '%d.json' % did)
            pa = os.path.join(dest, '%d.adpcm' % did)
            viejo = None
            if not forzar and os.path.exists(js):
                viejo = json.load(open(js, encoding='utf-8'))
                if viejo.get('v', 1) >= VERSION_DEMO:
                    hechas += 1
                    total_b += os.path.getsize(pa) if os.path.exists(pa) else 0
                    continue
            cab, bloques, subt = (None, [], [])
            for q, t, tam in D.paquetes(mo, b['offset'], b.get('fin')):
                if t == 2:
                    cab = D.leer_pcm_cab(mo, q)
                elif t == 1:
                    bloques.append((q, tam))
                elif t in (3, 6):
                    subt.append(D.leer_subtitulos(mo, q))
                elif t == 240:
                    break
            cab_u = None
            for q, t, tam in D.paquetes(mu, a['offset'], a.get('fin')):
                if t == 2:
                    cab_u = D.leer_pcm_cab(mu, q)
                    break
            lineas = []
            for sb in subt:
                for l in sb['lineas']:
                    x = {'t': round(l['inicio'] * D.TICK_SUBT_SEG, 3), 'd': round(l['duracion'] * D.TICK_SUBT_SEG, 3)}
                    if ver.europeo:
                        x['texto'] = unicode_eu(l['texto'])
                    else:
                        x.update(subtitulo_ja(mo, sb, l))
                    lineas.append(x)
            lineas.sort(key=lambda l: l['t'])
            sal = {'id': did, 'sector': b['sector'], 'disco': n, 'idioma': ver.idioma, 'v': VERSION_DEMO, 'subtitulos': lineas}
            if not ver.europeo:
                sal['fuente'] = 'codec/ui/'
            if cab and cab_u and (abs(cab['segundos'] - cab_u['segundos']) > 0.05):
                avisos.append('%d: el audio dura %.2f s y el del USA %.2f s: tiempos por DTW' % (did, cab['segundos'], cab_u['segundos']))
                sal['mapa_tiempo'] = mapa_tiempo(mo, b, mu, a)
            if viejo and viejo.get('audio') and os.path.exists(pa) and (not sin_audio):
                sal['audio'] = viejo['audio']
                total_b += os.path.getsize(pa)
            elif cab and (not sin_audio):
                datos, nm = D.adpcm_crudo(mo, bloques, cab['canales'])
                if datos is None:
                    avisos.append('%d: %s' % (did, nm))
                else:
                    hz = int(round(cab['hz']))
                    with open(os.path.join(dest, '%d.adpcm' % did), 'wb') as f:
                        f.write(datos)
                    au = {'archivo': '%d.adpcm' % did, 'formato': 'adpcm', 'hz_original': hz, 'hz': hz, 'canales': cab['canales']}
                    if cab['canales'] == 2:
                        au['bloque'] = D.BLOQUE_ESTEREO
                    au.update({'segundos': round(nm / float(hz), 3), 'muestras': nm, 'bytes': len(datos)})
                    sal['audio'] = au
                    total_b += len(datos)
            json.dump(sal, open(js, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
            hechas += 1
    log('  cinemáticas: %d (%.1f MB de audio)%s' % (hechas, total_b / 1000000.0, ''.join(('\n    ! ' + x for x in avisos))))
    return (hechas, total_b)

def _exe(carpeta):
    for f in glob.glob(os.path.join(carpeta, '00_disco', 'MGS', '*.EXE')) + glob.glob(os.path.join(carpeta, '00_disco', 'S?ES_*')) + glob.glob(os.path.join(carpeta, '00_disco', 'S?PM_*')) + glob.glob(os.path.join(carpeta, '00_disco', 'S?US_*')) + glob.glob(os.path.join(carpeta, '00_disco', 'MGS', 'S?US_*')) + glob.glob(os.path.join(carpeta, '00_disco', 'MGS', 'S?PM_*')):
        if os.path.getsize(f) > 500000:
            return f
    return None
IT_CARD = 17

def descripciones(exe):
    d = open(exe, 'rb').read()
    if d[:8] != b'PS-X EXE':
        return None
    t_addr = struct.unpack_from('<I', d, 24)[0]
    z0 = d.find(b'GET WEAPON FIRST')
    if z0 < 0:
        return None
    lo, hi = (t_addr + z0 - 2048, t_addr + z0 + 4096 - 2048)
    corridas, cur = ([], [])
    for o in range(2048, len(d) - 4, 4):
        v = struct.unpack_from('<I', d, o)[0]
        if lo <= v < hi:
            cur.append(v)
        else:
            if len(cur) >= 8:
                corridas.append(cur)
            cur = []
    items = next((c for c in corridas if len(c) == 26), None)
    armas = next((c for c in corridas if len(c) == 10), None)
    if not items or not armas:
        return None

    def cad(v):
        o = v - t_addr + 2048
        return d[o:d.index(bytes(1), o)]
    out = {'items': [texto_js_eu(cad(v)) for v in items], 'armas': [texto_js_eu(cad(v)) for v in armas]}
    t = out['items'][IT_CARD]
    m = re.search('[1-9]', t[t.find('|') + 1:]) or re.search('\\?(?=\\.?$)', t[t.find('|') + 1:]) if '|' in t else None
    if m:
        out['carta'] = t.find('|') + 1 + m.start()
    return out

def textos(ver):
    fu, fo = (_exe(os.path.join(EXTRAIDO, 'disco1')), _exe(ver.d1))
    du = descripciones(fu) if fu else None
    if du:
        os.makedirs(os.path.join(ASSETS, 'hud'), exist_ok=True)
        json.dump(du, open(os.path.join(ASSETS, 'hud', 'descripciones.json'), 'w', encoding='utf-8'), ensure_ascii=True, separators=(',', ':'))
    do = descripciones(fo) if fo else None
    if not do:
        log('  textos: no encontré las descripciones en %s' % fo)
        return 0
    json.dump(do, open(os.path.join(ver.sal, 'textos.json'), 'w', encoding='utf-8'), ensure_ascii=True, separators=(',', ':'))
    log('  textos: %d descripciones de objetos y %d de armas (USA: %s)' % (len(do['items']), len(do['armas']), 'sí' if du else 'no'))
    return len(do['items']) + len(do['armas'])
TEX_ACOMPANAN = {'gou_bg', 'hideo'}
TEX_NO = ('title', 'option', 'rank', 'preope', 'demosel', 'brf', 'abst', 'vr', 'selectvr', 'vrdemo')
TEX_NO_NOMBRES = {'c1bd'}
TEX_NO_NOMBRES |= {'cam_album', 'cam_frame'}

def _tex_es_texto(st, nombre, img):
    import numpy as np
    if st.startswith(TEX_NO) or nombre in TEX_NO_NOMBRES:
        return False
    if st == 'camera' or nombre in TEX_ACOMPANAN:
        return True
    b = np.asarray(img).astype(int)
    fondo = (b[..., 3] == 0) | (b[..., :3].max(2) <= 16)
    op = b[~fondo][:, :3]
    sat = float(np.mean(op.max(1) - op.min(1))) if len(op) else 0.0
    return fondo.mean() >= 0.3 and sat < 10

def _texturas_de_actores():
    try:
        t = json.load(open(os.path.join(ASSETS, 'telops', 'textos.json'), encoding='utf-8'))
    except (OSError, ValueError):
        return set()
    out, demos_par = (set(), set())
    for k, v in t.items():
        m = re.match('demos/(\\d+)/tex_([0-9a-f]{4})\\.png$', k)
        if not m:
            continue
        palabras = ' '.join((p[0] for r in v.get('L', []) for p in r['p']))
        if '(' in palabras or m.group(1) == '5183':
            out.add(m.group(2))
            demos_par.add(m.group(1))
    for k, v in t.items():
        m = re.match('demos/(\\d+)/tex_([0-9a-f]{4})\\.png$', k)
        if m and m.group(1) in demos_par and (not v.get('L')) and v.get('sombra'):
            out.add(m.group(2))
    return out
EF_TEXT, EF_TEXT2 = (5, 74)

def _telops_stream(mm, s):
    out, primero = ({}, True)
    for q, t, tam in D.paquetes(mm, s['offset'], s.get('fin')):
        if t == 5:
            if primero:
                primero = False
                continue
            for e in D.leer_dmo_dat(mm, q, con_huesos=False)['efectos']:
                if e.get('tipo') in (EF_TEXT, EF_TEXT2):
                    p = e['param_i16']
                    for h in [p[4] & 65535] + ([p[6] & 65535] if e['tipo'] == EF_TEXT2 else []):
                        out.setdefault(h, (p[2], p[3]))
        elif t == 240:
            break
    return out

def desplazamientos_telops(ver):
    out = collections.defaultdict(dict)
    for n in (1, 2):
        pu, po = (usa(n, 'DEMO.DAT'), ver.mgs(n, 'DEMO.DAT'))
        if not (os.path.exists(pu) and os.path.exists(po)):
            continue
        mu, su = _streams(pu)
        mo, so = _streams(po)
        if len(su) != len(so):
            continue
        for a, b in zip(su, so):
            did = a['sector'] + (BASE2 if n == 2 else 0)
            tu = _telops_stream(mu, a)
            if not tu:
                continue
            to = _telops_stream(mo, b)
            for h, (x, y) in tu.items():
                if h in to and to[h] != (x, y):
                    out['%04x' % h][str(did)] = [to[h][0] - x, to[h][1] - y]
    return out

def _telops_guion(path):
    lineas = gcx.texto(gcx.leer(path)['main'])
    out, base, t = ([], None, None)
    for l in lineas:
        m = re.match('(\\s*)delay -t (\\d+)', l)
        if m:
            t = int(m.group(2))
            continue
        m = re.match('(\\s*)chara TELOP .*?-d (.*)$', l)
        if not m:
            continue
        if base is None:
            base = len(m.group(1))
        if len(m.group(1)) != base:
            continue
        v = m.group(2).split()
        grupos = [(int(v[i]), int(v[i + 1]), int(v[i + 2]), int(v[i + 3]), v[i + 4].lstrip('#')) for i in range(0, len(v) - 4, 5)]
        out.append((t, grupos))
    return out

def telops_muelle(ver, dest):
    from pcx_mgs import decode
    import numpy as np
    rel = os.path.join('01_stages', 's00a', 'cache', 'scenerio.gcx')
    pu, po = (os.path.join(EXTRAIDO, 'disco1', rel), os.path.join(ver.d1, rel))
    if not (os.path.exists(pu) and os.path.exists(po)):
        return None
    tu, to = (_telops_guion(pu), _telops_guion(po))
    if not tu or not to:
        return None

    def pcx(d, h):
        g = glob.glob(os.path.join(d, '01_stages', 's00a', '*', h + '.pcx'))
        return g[0] if g else None
    usa_claves = {}
    for t, gr in tu:
        usa_claves['|'.join(('niveles/s00a/tex_%s.png' % g[4] for g in gr))] = t
    lista, nuevas = ({}, 0)
    for t, gr in to:
        ls = []
        for x, y, espera, dur, h in gr:
            fu, fo = (pcx(os.path.join(EXTRAIDO, 'disco1'), h), pcx(ver.d1, h))
            if not fo:
                continue
            igual = False
            if fu:
                try:
                    a, b = (decode(fu), decode(fo))
                    igual = a.size == b.size and np.array_equal(np.asarray(a), np.asarray(b))
                except Exception:
                    igual = False
            if igual and os.path.exists(os.path.join(ASSETS, 'niveles', 's00a', 'tex_%s.png' % h)):
                img = 'niveles/s00a/tex_%s.png' % h
            else:
                decode(fo).save(os.path.join(dest, 'muelle_%s.png' % h), optimize=True)
                nuevas += 1
                img = 'idiomas/%s/texturas/muelle_%s.png' % (ver.idioma, h)
            ls.append({'x': x, 'y': y, 'espera': espera, 'dur': dur, 'img': img})
        lista[str(t)] = ls
    log('  créditos del muelle (s00a): %d TELOP (USA %d), %d texturas propias' % (len(to), len(tu), nuevas))
    return {'usa': usa_claves, 'lista': lista}

def texturas(ver):
    from pcx_mgs import decode
    import numpy as np
    dest = os.path.join(ver.sal, 'texturas')
    de_actores = _texturas_de_actores()
    desp = desplazamientos_telops(ver)
    elegidas, revisadas = ({}, 0)
    for n, dv in ((1, ver.d1), (2, ver.d2)):
        for f in sorted(glob.glob(os.path.join(EXTRAIDO, 'disco%d' % n, '01_stages', '*', '*', '*.pcx'))):
            rel = os.path.relpath(f, os.path.join(EXTRAIDO, 'disco%d' % n))
            g = os.path.join(dv, rel)
            if not os.path.exists(g):
                continue
            a, b = (open(f, 'rb').read(), open(g, 'rb').read())
            if a == b:
                continue
            st, nombre = (rel.split(os.sep)[1], os.path.basename(f)[:-4])
            if nombre in elegidas or st.startswith(TEX_NO):
                continue
            try:
                ia, ib = (decode(f), decode(g))
            except Exception:
                continue
            revisadas += 1
            if ia.size == ib.size and np.array_equal(np.asarray(ia), np.asarray(ib)):
                continue
            if not _tex_es_texto(st, nombre, ib):
                continue
            elegidas[nombre] = (ib, ia.size, st)
    os.makedirs(dest, exist_ok=True)
    for f in glob.glob(os.path.join(dest, '*.png')):
        if os.path.basename(f)[:-4] not in elegidas:
            os.remove(f)
    indice, total = ({}, 0)
    for nombre, (img, usa_tam, st) in sorted(elegidas.items()):
        p = os.path.join(dest, nombre + '.png')
        img.save(p, optimize=True)
        total += os.path.getsize(p)
        e = {'png': nombre + '.png', 'w': img.width, 'h': img.height, 'usa': list(usa_tam), 'escenario': st}
        if nombre in de_actores:
            e['voz'] = True
        if desp.get(nombre):
            e['desp'] = desp[nombre]
        indice[nombre] = e
        if not re.fullmatch('[0-9a-f]{4}', nombre):
            indice['%04x' % gcx_strcode(nombre)] = e
    for h, dd in desp.items():
        if h not in indice:
            indice[h] = {'desp': dd, 'voz': h in de_actores}
    muelle = telops_muelle(ver, dest)
    doc = {'version': 1, 'texturas': indice}
    if muelle:
        doc['muelle'] = muelle
    json.dump(doc, open(os.path.join(dest, 'indice.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    log('  texturas con texto: %d de %d distintas (%.0f KB); con el idioma de la voz: %d' % (len(elegidas), revisadas, total / 1024, sum((1 for k, v in indice.items() if v.get('voz') and k == v.get('png', '')[:-4]))))
    return len(elegidas)

def gcx_strcode(s):
    i = 0
    for c in s.encode('latin1'):
        i = (i << 5 | i >> 11) & 65535
        i = i + c & 65535
    return i

def fuente(ver):
    import codec_web as CW
    res_viejo, out_viejo = (CW.RES, CW.OUT)
    try:
        CW.RES = os.path.join(ver.d1, '01_stages', 'init', 'resident')
        CW.OUT = os.path.join(ver.sal, 'codec')
        CW.fuente()
    finally:
        CW.RES, CW.OUT = (res_viejo, out_viejo)
    pj = os.path.join(ver.sal, 'codec', 'ui', 'fuente.json')
    j = json.load(open(pj, encoding='utf-8'))
    j['europea'] = len(j['ascii']) > 96
    j['origen'] = 'init/resident/font.rar del disco %s' % os.path.basename(ver.d1)
    json.dump(j, open(pj, 'w', encoding='utf-8'), separators=(',', ':'))

def indice():
    base = os.path.join(ASSETS, 'idiomas')
    out = {'en': {'nombre': 'ENGLISH', 'texto': True, 'voz': True}}
    for d in sorted(os.listdir(base)) if os.path.isdir(base) else []:
        p = os.path.join(base, d, 'idioma.json')
        if os.path.exists(p):
            j = json.load(open(p, encoding='utf-8'))
            out[d] = {'nombre': j['nombre'], 'texto': j.get('texto', False), 'voz': j.get('voz', False)}
    os.makedirs(base, exist_ok=True)
    json.dump({'version': VERSION, 'idiomas': out}, open(os.path.join(base, 'indice.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    return out

def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, ValueError):
        pass
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('idioma', choices=sorted(IDIOMAS))
    ap.add_argument('--discos', help='carpeta del disco 1 extraído (el 2 se busca al lado, terminado en 2)')
    ap.add_argument('--sin-voces', action='store_true')
    ap.add_argument('--sin-demos', action='store_true')
    ap.add_argument('--sin-audio', action='store_true', help='cinemáticas: sólo subtítulos')
    ap.add_argument('--forzar', action='store_true')
    ap.add_argument('--solo', help='llamadas,voces,demos,textos,texturas')
    a = ap.parse_args()
    ver = Version(a.idioma, a.discos)
    if not ver.hay():
        log('no está %s: no hay nada que hacer (el visor sigue en inglés)' % ver.mgs(1, 'RADIO.DAT'))
        return 0
    solo = set(a.solo.split(',')) if a.solo else {'llamadas', 'voces', 'demos', 'textos', 'texturas'}
    t0 = time.time()
    os.makedirs(ver.sal, exist_ok=True)
    log('%s (%s): %s' % (ver.nombre, a.idioma, ver.d1))
    fuente(ver)
    pares = pares_guiones(ver)
    log('  guiones alineados (%.0f s)' % (time.time() - t0))
    mapa = {}
    res = {'idioma': a.idioma, 'nombre': ver.nombre, 'version': VERSION, 'europeo': ver.europeo, 'texto': True, 'voz': False, 'discos': [os.path.basename(ver.d1), os.path.basename(ver.d2)]}
    pj = os.path.join(ver.sal, 'idioma.json')
    if os.path.exists(pj):
        viejo = json.load(open(pj, encoding='utf-8'))
        res.update({k: v for k, v in viejo.items() if k in ('voz', 'voces', 'voces_mb', 'demos', 'demos_mb', 'textos', 'llamadas', 'llamadas_sin_par', 'llamadas_sin_par_que_se_usan', 'voces_sin_par', 'texturas')})
    if 'llamadas' in solo or 'voces' in solo:
        n, sin, vivas = llamadas(ver, pares, mapa)
        areas(ver)
        res['llamadas'] = n
        res['llamadas_sin_par'] = sin
        res['llamadas_sin_par_que_se_usan'] = vivas
        ids_usa = ids_voces_usa()
        nv = voces_guion(pares, mapa, ids_usa)
        if alineadas:
            b, m = revisar_alineadas(ver, mapa, alineadas)
            log('  voces de llamadas con otra cantidad de voces: %d pares por alineación, %d descartados por la duración' % (b, m))
        mapa_f = {str(k): elegir(v) for k, v in sorted(mapa.items())}
        if a.sin_voces or 'voces' not in solo:
            dv = os.path.join(ver.sal, 'vox')
            if os.path.isdir(dv) and any((f.endswith('.adpcm') for f in os.listdir(dv))):
                mapa_f = {k: v for k, v in mapa_f.items() if os.path.exists(os.path.join(dv, '%d.json' % v))}
        os.makedirs(os.path.join(ver.sal, 'vox'), exist_ok=True)
        json.dump(mapa_f, open(os.path.join(ver.sal, 'vox', 'mapa.json'), 'w', encoding='utf-8'), separators=(',', ':'))
        faltan = sorted((i for i in ids_usa if i not in mapa))
        log('  mapa de voces: %d (%d de los guiones), %d voces del USA sin par: %s' % (len(mapa_f), nv, len(faltan), faltan[:10]))
        res['voces_sin_par'] = len(faltan)
        if 'voces' in solo and (not a.sin_voces):
            ids = set(mapa_f.values())
            for f in glob.glob(os.path.join(ver.sal, 'codec', 'llamadas', '*.json')):
                if os.path.basename(f) == 'indice.json':
                    continue
                for e in _voces_evs(json.load(open(f, encoding='utf-8'))['eventos'], []):
                    if e.get('vox'):
                        ids.add(e['vox'])
            nh, nb, malas = exportar_voces(ver, ids, a.forzar)
            if malas:
                mapa_f = {k: v for k, v in mapa_f.items() if v not in malas}
                json.dump(mapa_f, open(os.path.join(ver.sal, 'vox', 'mapa.json'), 'w', encoding='utf-8'), separators=(',', ':'))
                log('  mapa de voces: %d después de sacar %d que no son voces' % (len(mapa_f), len(malas)))
            res.update({'voz': nh > 0, 'voces': nh, 'voces_mb': round(nb / 1000000.0, 1)})
    if 'demos' in solo and (not a.sin_demos):
        nd, nb = demos(ver, a.sin_audio, a.forzar)
        res.update({'demos': nd, 'demos_mb': round(nb / 1000000.0, 1)})
        if nb:
            res['voz'] = True
    if 'textos' in solo:
        res['textos'] = textos(ver)
    if 'texturas' in solo:
        res['texturas'] = texturas(ver)
    res['generado'] = time.strftime('%Y-%m-%d %H:%M')
    json.dump(res, open(pj, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    idx = indice()
    log('listo en %.0f s; idiomas: %s' % (time.time() - t0, ', '.join(idx)))
    return 0
if __name__ == '__main__':
    sys.exit(main())
