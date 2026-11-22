# MGS web — FeniXVOID · Project Ravenlight
import sys, os, re, json, glob, struct, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS
import gcx
AQUI = os.path.dirname(os.path.abspath(__file__))
BRIEFING = {7, 969}
MUSICA_DEL_CODIGO = {'ed8e': 'la toca el título', 'ed90': 'la toca el BRIEFING'}

def _bloques(s):
    for a in s.get('args', []) or []:
        if isinstance(a, dict) and 'bloque' in a:
            yield a['bloque']
        if isinstance(a, dict) and 'opt' in a:
            for x in a['v']:
                if isinstance(x, dict) and 'bloque' in x:
                    yield x['bloque']
_LEIDOS = {}

def _guiones(bases):
    for base in bases:
        for f in sorted(glob.glob(os.path.join(base, '*', 'cache', '*.gcx'))):
            partes = os.path.normpath(f).split(os.sep)
            if f not in _LEIDOS:
                try:
                    _LEIDOS[f] = gcx.leer(f)
                except Exception:
                    _LEIDOS[f] = None
            if _LEIDOS[f] is not None:
                yield (partes[-5], partes[-3], _LEIDOS[f])

def _recorrer(r, fn):

    def rec(b):
        for s in b:
            if not isinstance(s, dict):
                continue
            fn(s)
            for x in _bloques(s):
                rec(x)
    rec(r['main'])
    for b in r['procs'].values():
        rec(b)

def codigos_radio(bases):
    usos, calculados = ({}, [])

    def fn(s, st):
        if s.get('cmd') != 'radio':
            return
        for a in s['args']:
            if not (isinstance(a, dict) and a.get('opt') in ('b', 'o', 'c')):
                continue
            v = a['v'][1:] if a['opt'] == 'o' else a['v']
            if any((not isinstance(x, int) for x in v)):
                calculados.append((st, a['opt']))
            n = [x for x in v if isinstance(x, int)]
            if a['opt'] == 'c':
                if len(n) >= 2:
                    usos.setdefault(n[1], set()).add(st)
            else:
                for i in range(0, len(n) - 1, 2):
                    if 14000 <= n[i] <= 14199:
                        usos.setdefault(n[i + 1], set()).add(st)
    for disco, st, r in _guiones(bases):
        _recorrer(r, lambda s: fn(s, st))
    return (usos, calculados)

def numeros_del_codigo():
    archs = glob.glob(os.path.join(EXTRAIDO, '02_por_tipo', '07_codigo_overlay', '*.bin')) + glob.glob(os.path.join(EXTRAIDO, '_02_por_tipo_solo_disco2', '07_codigo_overlay', '*.bin')) + [p for p in (os.path.join(EXTRAIDO, 'disco1', '00_disco', 'MGS', 'SLUS_005.94'), os.path.join(EXTRAIDO, 'disco1', '00_disco', 'SLUS_005.94')) if os.path.exists(p)][:1]
    por_arch = {}
    for a in archs:
        d = open(a, 'rb').read()
        n = len(d) // 4
        ws = struct.unpack('<%dI' % n, d[:n * 4])
        vals, lui = (set(ws), {})
        for i, w in enumerate(ws):
            op, rs, rt, im = (w >> 26, w >> 21 & 31, w >> 16 & 31, w & 65535)
            if op == 15:
                lui[rt] = (i, im)
                continue
            if op in (9, 13):
                v = im - 65536 if op == 9 and im & 32768 else im
                if rs == 0:
                    vals.add(v & 4294967295)
                elif rs in lui and i - lui[rs][0] <= 8:
                    vals.add((lui[rs][1] << 16) + v & 4294967295)
        k = os.path.basename(a)
        if k in por_arch:
            k = 'disco2/' + k
        por_arch[k] = vals
    return por_arch

def en_codigo(por_arch, v):
    return sorted({k for k, s in por_arch.items() if v in s})

def _textos(evs, out):
    for e in evs:
        if e.get('tipo') == 'hablar':
            out.append((e.get('quien') or '?', e.get('texto') or ''))
        if isinstance(e.get('eventos'), list):
            _textos(e['eventos'], out)
        for r in (e.get('ramas') or []) + (e.get('casos') or []):
            _textos(r['eventos'], out)
    return out

def _voces(evs, out):
    for e in evs:
        if e.get('tipo') == 'voz' and e.get('vox'):
            out.append(e['vox'])
        if isinstance(e.get('eventos'), list):
            _voces(e['eventos'], out)
        for r in (e.get('ramas') or []) + (e.get('casos') or []):
            _voces(r['eventos'], out)
    return out

def _norm(t):
    return re.sub('\\W+', ' ', t).strip().lower()

def llamadas_del_integral():
    dat = os.path.join(EXTRAIDO, 'integral1', '00_disco', 'MGS', 'RADIO.DAT')
    if not os.path.exists(dat):
        return {}
    import radio_dat as R
    usos, _ = codigos_radio([os.path.join(EXTRAIDO, 'integral%d' % n, '01_stages') for n in (1, 2)])
    _, lls, _, _ = R.parsear(dat)
    por_off = {l['off']: l for l in lls}
    out = {}
    for c, sts in usos.items():
        for off in ((c & 65535) * 2048, ((c & 65535) + (c >> 24)) * 2048):
            l = por_off.get(off)
            t = _textos(l['eventos'], []) if l else []
            if t:
                out.setdefault(' / '.join((_norm(x[1]) for x in t)), set()).update(sts)
    return out

def llamadas(codigo):
    rj = json.load(open(os.path.join(ASSETS, 'codec', 'radio.json'), encoding='utf-8'))
    usos, calculados = codigos_radio([os.path.join(EXTRAIDO, d, '01_stages') for d in ('disco1', 'disco2')])
    integral = llamadas_del_integral()
    usadas_txt = {}
    for c in rj['calls']:
        if c['code'] in usos:
            t = _textos(c['eventos'], [])
            if t:
                usadas_txt.setdefault(_norm(t[0][1]), []).append(c['off'])
    out = []
    for c in rj['calls']:
        if c['code'] in usos:
            continue
        try:
            ll = json.load(open(os.path.join(ASSETS, 'codec', 'llamadas', '%d.json' % c['off']), encoding='utf-8'))
        except Exception:
            ll = c
        t = _textos(c['eventos'], [])
        voces = _voces(ll['eventos'], [])
        seg = 0.0
        for v in voces:
            try:
                seg += json.load(open(os.path.join(ASSETS, 'codec', 'vox', '%d.json' % v), encoding='utf-8')).get('seg', 0)
            except Exception:
                pass
        dudas = []
        sts_int = integral.get(' / '.join((_norm(x[1]) for x in t)))
        if sts_int:
            dudas.append('el Integral sí la usa (%s)' % ', '.join(sorted(sts_int)[:6]))
        cod = en_codigo(codigo, c['code'])
        if cod:
            dudas.append('el número aparece en el código de %s' % ', '.join(cod[:4]))
        parecidas = [o for o in usadas_txt.get(_norm(t[0][1]) if t else '', []) if o != c['off']]
        quien = []
        for q, _ in t:
            if q not in quien:
                quien.append(q)
        out.append({'off': c['off'], 'code': c['code'], 'freq': c['freq_header'], 'quien': quien, 'lineas': len(t), 'texto': [x[1] for x in t[:3]], 'voces': voces, 'seg': round(seg, 1), 'otra_version_de': parecidas[:3], 'duda': '; '.join(dudas) or None})
    return (out, {'llamadas': len(rj['calls']), 'usadas': sum((1 for c in rj['calls'] if c['code'] in usos)), 'calculados': len(calculados)})

def _texto_rapido(mm, sector, D):
    seg, lineas = (0.0, [])
    for q, t, tam in D.paquetes(mm, sector * 2048):
        if t == 2:
            try:
                seg = D.leer_pcm_cab(mm, q).get('segundos', 0.0)
            except Exception:
                pass
        elif t in (3, 6):
            try:
                lineas += [l['texto'].replace('\r', '\n') for l in D.leer_subtitulos(mm, q)['lineas']]
            except Exception:
                pass
        elif t == 1:
            break
    return (seg, lineas)

def _legible(t):
    return t if all((ch == '\n' or 32 <= ord(ch) < 127 for ch in t)) else None

def voces(codigo, sin_usar_llamadas):
    import vox as V, demo_dat as D
    refs = json.load(open(os.path.join(DOCS, 'codec', 'vox_refs.json'), encoding='utf-8'))
    sin_codes = {c['code'] for c in sin_usar_llamadas}
    porvoz = {}
    for r in refs:
        if 'id' in r:
            porvoz.setdefault((r['disco'], r['id']), []).append(r)
    todas, usadas_txt = ([], {})
    for disco in (1, 2):
        if not os.path.exists(V.ruta_vox(disco)):
            continue
        nombres = V.nombres_soundtest(disco)
        _, f, mm = V.abrir(disco)
        for sector, nombre in sorted(nombres.items()):
            seg, lin = _texto_rapido(mm, sector, D)
            segura, cand, llam_sin = (False, [], False)
            for r in porvoz.get((disco, sector), []):
                if r['tipo'] == 'radio VOZ':
                    m = re.search('code (\\d+)', r.get('proc', ''))
                    if m and int(m.group(1)) in sin_codes:
                        llam_sin = True
                    else:
                        segura = True
                elif r['tipo'] == 'candidato':
                    if r['stage'] == 'sound':
                        continue
                    if re.fullmatch('vr\\d\\d|selectvr|vrdemo', r['stage']):
                        cand.append(r['stage'])
                    else:
                        segura = True
                else:
                    segura = True
            if sector in BRIEFING:
                segura = True
            x = {'disco': disco, 'sector': sector, 'nombre': nombre, 'seg': round(seg, 2), 'lineas': lin, 'segura': segura, 'vr': sorted(set(cand)), 'llamada_sin_usar': llam_sin}
            todas.append(x)
            if segura and lin:
                usadas_txt.setdefault(_norm(' '.join(lin)), []).append(x)
        mm.close()
        f.close()
    out, vistas, cuenta = ([], {}, {'streams': len(todas), 'solo_llamadas_sin_usar': 0})
    for x in todas:
        if x['segura']:
            continue
        if x['llamada_sin_usar'] and (not x['vr']):
            cuenta['solo_llamadas_sin_usar'] += 1
            continue
        vid = x['sector'] + (200000 if x['disco'] == 2 else 0)
        dudas = []
        if x['vr']:
            dudas.append('sólo coincide con un número de las salas de VR TRAINING (%s)' % ', '.join(x['vr'][:4]))
        cod = en_codigo(codigo, x['sector'])
        if cod:
            dudas.append('el número aparece en el código de %s' % ', '.join(cod[:4]) + (' y %d más' % (len(cod) - 4) if len(cod) > 4 else ''))
        txt = [_legible(l) for l in x['lineas']]
        copia = usadas_txt.get(_norm(' '.join(x['lineas']))) if x['lineas'] else None
        if copia:
            dudas.append('copia: la misma frase suena desde %s (disco %d)' % (copia[0]['nombre'], copia[0]['disco']))
        clave = (x['nombre'], _norm(' '.join(x['lineas'])), round(x['seg'], 1))
        if clave in vistas:
            vistas[clave]['discos'].append(x['disco'])
            continue
        y = {'id': vid, 'disco': x['disco'], 'discos': [x['disco']], 'sector': x['sector'], 'nombre': x['nombre'], 'seg': x['seg'], 'texto': [t for t in txt if t][:4], 'japones': any((t is None for t in txt)), 'copia': bool(copia), 'duda': '; '.join(dudas) or None}
        vistas[clave] = y
        out.append(y)
    return (out, cuenta)

def exportar_voces(lista):
    falta = {1: [], 2: []}
    for v in lista:
        if not os.path.exists(os.path.join(ASSETS, 'codec', 'vox', '%d.json' % v['id'])):
            falta[v['disco']].append(v['sector'])
    for disco, ids in falta.items():
        for i in range(0, len(ids), 60):
            cmd = [sys.executable, os.path.join(AQUI, 'codec_voces.py'), '--solo', ','.join(map(str, ids[i:i + 60]))] + (['--disco', '2'] if disco == 2 else [])
            subprocess.run(cmd, check=False)
    return sum((len(x) for x in falta.values()))

def _canciones(d):
    out = []
    for n in range(1, 16):
        if n * 4 + 2 > len(d):
            break
        a = struct.unpack_from('<H', d, n * 4)[0]
        if not a or a + 52 > len(d):
            continue
        p = [int.from_bytes(d[a + k * 4:a + k * 4 + 3], 'little') for k in range(13)]
        if any(p) and (not any((x >= len(d) for x in p))):
            out.append(n)
    return out

def musica(codigo):
    esc = json.load(open(os.path.join(ASSETS, 'sonido', 'escenarios.json'), encoding='utf-8'))
    pedidas = {}

    def fn(s, st):
        if s.get('cmd') != 'sound':
            return
        for a in s['args']:
            if isinstance(a, dict) and a.get('opt') in ('b', 's'):
                pedidas.setdefault(st, set()).update((v for v in a['v'] if isinstance(v, int)))
            if isinstance(a, dict) and a.get('opt') == 'x':
                pedidas.setdefault(st, set()).update((v & 255 for v in a['v'] if isinstance(v, int) and v & 4278190080 == 16777216))
    for disco, st, r in _guiones([os.path.join(EXTRAIDO, d, '01_stages') for d in ('disco1', 'disco2')]):
        _recorrer(r, lambda s: fn(s, st))
    por = {}
    for st, x in esc.items():
        if x.get('mdx'):
            por.setdefault(x['mdx'], []).append(st)
    out, total = ([], 0)
    for mdx, sts in sorted(por.items()):
        p = os.path.join(ASSETS, 'sonido', 'mdx', mdx + '.mdx')
        if not os.path.exists(p) or mdx in MUSICA_DEL_CODIGO:
            continue
        c = _canciones(open(p, 'rb').read())
        total += len(c)
        ped = set().union(*[pedidas.get(st, set()) for st in sts])
        ovl = [k for k in codigo if any((k.split('/')[-1].startswith(st + '_') or k.split('/')[-1] == st + '.bin' for st in sts))]
        for n in c:
            if n in ped:
                continue
            if any((16777216 | n in codigo[k] for k in ovl)):
                continue
            out.append({'mdx': mdx, 'n': n, 'st': sts[0], 'escenarios': sts, 'pedidas': sorted((x for x in ped if 0 < x < 16)), 'duda': 'ningún guion la pide; un actor podría pedirla con GM_SetSong'})
    return (out, {'canciones': total})

def barrer(exportar=True):
    codigo = numeros_del_codigo()
    ll, cl = llamadas(codigo)
    vs, cv = voces(codigo, ll)
    if exportar:
        cv['exportadas'] = exportar_voces(vs)
    mu, cm = musica(codigo)
    return {'llamadas': ll, 'voces': vs, 'musica': mu, 'cuenta_sonido': {**cl, **cv, **cm, 'sin_usar_llamadas': len(ll), 'sin_usar_voces': len(vs), 'sin_usar_musica': len(mu), 'archivos_de_codigo': len(codigo), 'cinematicas_sin_usar': 0}}
if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    r = barrer(exportar='--sin-exportar' not in sys.argv)
    print(json.dumps(r['cuenta_sonido'], ensure_ascii=False))
    for c in r['llamadas']:
        print('LLAMADA', c['off'], c['freq'], c['quien'], (c['texto'] or [''])[0][:50].replace('\n', ' '), '|', c['duda'] or '')
    for v in r['voces']:
        print('VOZ', v['id'], v['nombre'], v['seg'], (v['texto'] or ['(japonés)' if v['japones'] else ''])[0][:40].replace('\n', ' '), '|', v['duda'] or '')
    for m in r['musica']:
        print('MUSICA', m['mdx'], m['n'], m['escenarios'][:3])
