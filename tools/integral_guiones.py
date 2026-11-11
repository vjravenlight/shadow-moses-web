# MGS web — FeniXVOID · Project Ravenlight
import os, re, sys, json, copy, glob, difflib, tempfile, shutil, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS
import integral_alterna as IA
INT = IA.INT
USA = IA.USA
USA_TODOS = [os.path.join(EXTRAIDO, 'disco%d' % n, '01_stages') for n in (1, 2)]
OUT = os.path.join(ASSETS, 'integral', 'guion')
OUT_ALT = os.path.join(ASSETS, 'integral', 'alterna')
STAFF = 14007
VAR_ALT = IA.VAR
CODIGOS = ('radio', 'sound', 'demo')
VOX_MAX = 200000
VOZ_INTEGRAL = 500000
OUT_VOX = os.path.join(ASSETS, 'integral', 'vox')

def _bloques(s):
    return IA._bloques(s)

def _es_voicesys(s):
    import gcx
    a = s.get('args') or []
    return s.get('cmd') == 'chara' and a and isinstance(a[0], dict) and ((gcx.CHARAS.get(a[0].get('id')) or {}).get('nombre') in ('VOICESYS', 'TOBCNT'))

def _opt_de_voz(a):
    return isinstance(a, dict) and a.get('opt') in ('v', 's', 'b', 't', 'c') and a['v'] and all((isinstance(v, int) and (v == 0 or 8000 <= v <= 200000 + VOX_MAX or VOZ_INTEGRAL < v <= VOZ_INTEGRAL + 200000) for v in a['v'])) and any((isinstance(v, int) and v for v in a['v']))

def _posiciones(s):
    c = s.get('cmd')
    out = []
    if c in CODIGOS or _es_voicesys(s):
        lim = 65535 if c == 'radio' else 0
        for a in s.get('args', []) or []:
            if isinstance(a, dict) and 'opt' in a and (a['opt'] in 'bocvgs'):
                ks = {k for k, v in enumerate(a['v']) if isinstance(v, int) and (not isinstance(v, bool)) and (abs(v) > lim)}
                if c == 'radio' and a['opt'] in 'boc':
                    v = a['v']
                    ks |= {k for k in range(1, len(v)) if isinstance(v[k], int) and (not isinstance(v[k], bool)) and isinstance(v[k - 1], int) and (14000 <= v[k - 1] <= 14300) and (k - 1 not in ks)}
                out += [(a, k) for k in sorted(ks)]
    elif c == 'chara':
        for a in s.get('args', []) or []:
            if _opt_de_voz(a):
                out += [(a, k) for k, v in enumerate(a['v']) if v]
    return out

def _tapar(s):
    s = copy.deepcopy(s)

    def rec(x):
        for a, k in _posiciones(x):
            a['v'][k] = 'N'
        if x.get('cmd') == 'chara':
            for a in x.get('args', []) or []:
                if isinstance(a, dict) and a.get('opt') in ('v', 's', 'b', 't', 'c') and a['v'] and all((v in (0, 'N') for v in a['v'])):
                    a['v'] = ['N' for _ in a['v']]
        for a in x.get('args', []) or []:
            if isinstance(a, dict) and 'str' in a and (not all((32 <= ord(ch) < 127 for ch in a['str']))):
                a['str'] = 'J'
        for b in _bloques(x):
            for y in b:
                rec(y)
    rec(s)
    return s

def clave(s, bloques=True):
    t = _tapar(s)
    if not bloques:
        for a in t.get('args', []) or []:
            if isinstance(a, dict) and 'bloque' in a:
                a['bloque'] = 'B'
            if isinstance(a, dict) and 'opt' in a:
                a['v'] = ['B' if isinstance(v, dict) and 'bloque' in v else v for v in a['v']]
    return json.dumps(t, sort_keys=True, ensure_ascii=False)

def _parecida(s):
    return IA._clave(s, False)

def todas(b, out=None):
    out = [] if out is None else out
    for s in b:
        out.append(s)
        for x in _bloques(s):
            todas(x, out)
    return out

def codigos_de(script):
    out = set()
    for b in [script['main']] + list(script['procs'].values()):
        for s in todas(b):
            for a, k in _posiciones(s):
                out.add(a['v'][k])
    return out

def _valores(s):
    for a in s.get('args', []) or []:
        if isinstance(a, dict) and 'opt' in a:
            for v in a['v']:
                if isinstance(v, int):
                    yield v

def _es_staff(s):
    return s.get('cmd') == 'radio' and STAFF in list(_valores(s))

def _cond_traje(s):
    if s.get('cmd') != 'if' or len(s.get('args') or []) != 3:
        return False
    e = s['args'][0].get('expr') if isinstance(s['args'][0], dict) else None
    o = s['args'][2]
    return e == [{'var': '$f:G0435.0'}, 0, {'op': 9}, {'op': 0}] and isinstance(o, dict) and (o.get('opt') == 'e')

def preparar(script, sts_usa):
    script = copy.deepcopy(script)
    quitados = {'staff': 0, 'traje': 0}

    def rec(b):
        out = []
        for s in b:
            if _es_staff(s):
                quitados['staff'] += 1
                continue
            if s.get('cmd') == 'load' and s['args'] and isinstance(s['args'][0], dict) and ('str' in s['args'][0]):
                n = s['args'][0]['str']
                if n.endswith('r') and n not in sts_usa and (n[:-1] in sts_usa):
                    s['args'][0]['str'] = n[:-1]
                    quitados['traje'] += 1
            for a in s.get('args', []) or []:
                if isinstance(a, dict) and 'bloque' in a:
                    a['bloque'] = rec(a['bloque'])
                if isinstance(a, dict) and 'opt' in a:
                    for v in a['v']:
                        if isinstance(v, dict) and 'bloque' in v:
                            v['bloque'] = rec(v['bloque'])
            if _cond_traje(s):
                b0, b1 = (s['args'][1]['bloque'], s['args'][2]['v'][0]['bloque'])
                if clave({'cmd': 'x', 'args': [{'bloque': b0}]}) == clave({'cmd': 'x', 'args': [{'bloque': b1}]}):
                    out += b0
                    continue
            if s.get('cmd') == 'if' and (not any(_bloques(s))) and ('"op": 20' not in json.dumps(s)):
                continue
            out.append(s)
        return out
    script['main'] = rec(script['main'])
    script['procs'] = {k: rec(v) for k, v in script['procs'].items()}
    return (script, quitados)

class Injerto:

    def __init__(self, usa):
        self.usa = usa
        self.sin_codigo = []
        self.cambiadas = 0
        self.agregadas = 0
        self.glob_igual, self.glob_parecida = ({}, {})
        for b in [usa['main']] + list(usa['procs'].values()):
            for s in todas(b):
                if not self._con_codigos(s):
                    continue
                self.glob_igual.setdefault(clave(s), s)
                self.glob_parecida.setdefault(_parecida(s), s)

    @staticmethod
    def _con_codigos(s):
        return bool(_posiciones(s)) or (s.get('cmd') == 'chara' and any((isinstance(a, dict) and a.get('opt') in ('v', 's', 'b', 't', 'c') and a['v'] and all((v == 0 for v in a['v'])) for a in s.get('args', []) or [])))

    def _copiar_codigos(self, i, u):
        for ai, au in zip(i.get('args', []) or [], u.get('args', []) or []):
            if not (isinstance(ai, dict) and isinstance(au, dict) and ai.get('opt') and (ai.get('opt') == au.get('opt'))):
                continue
            if len(ai['v']) != len(au['v']):
                continue
            cod_i = {k for a, k in _posiciones(i) if a is ai}
            cod_u = {k for a, k in _posiciones(u) if a is au}
            if i.get('cmd') == 'chara' and (_opt_de_voz(ai) or _opt_de_voz(au) or cod_u or cod_i):
                cod_i = cod_u = set(range(len(ai['v'])))
            for k in cod_i | cod_u:
                if isinstance(au['v'][k], int) or isinstance(ai['v'][k], int):
                    ai['v'][k] = au['v'][k]

    def fijar(self, s, pozo):
        loc_igual, loc_parecida = ({}, {})
        for u in todas(pozo):
            if self._con_codigos(u):
                loc_igual.setdefault(clave(u), u)
                loc_parecida.setdefault(_parecida(u), u)
        s = copy.deepcopy(s)

        def rec(b):
            for n, x in enumerate(b):
                if self._con_codigos(x):
                    c = clave(x)
                    u = loc_igual.get(c) or self.glob_igual.get(c)
                    if u is not None:
                        b[n] = copy.deepcopy(u)
                        continue
                    p = _parecida(x)
                    u = loc_parecida.get(p) or self.glob_parecida.get(p)
                    if u is not None:
                        self._copiar_codigos(x, u)
                    elif _posiciones(x):
                        self.sin_codigo.append(json.dumps(x, ensure_ascii=False)[:160])
                for y in _bloques(x):
                    rec(y)
        lista = [s]
        rec(lista)
        return lista[0]

    def lista(self, U, I):
        sm = difflib.SequenceMatcher(None, [clave(s, False) for s in U], [clave(s, False) for s in I], autojunk=False)
        out = []
        for tag, i1, i2, j1, j2 in sm.get_opcodes():
            if tag == 'equal':
                out += [self.sentencia(U[i1 + k], I[j1 + k]) for k in range(i2 - i1)]
            elif tag == 'delete':
                self.cambiadas += i2 - i1
            elif tag == 'insert':
                out += [self.fijar(s, []) for s in I[j1:j2]]
                self.agregadas += j2 - j1
            else:
                pozo = U[i1:i2]
                if i2 - i1 == j2 - j1 and all((u.get('cmd') == i.get('cmd') and u.get('cmd') for u, i in zip(pozo, I[j1:j2]))):
                    out += [self.sentencia(u, i) for u, i in zip(pozo, I[j1:j2])]
                else:
                    out += [self.fijar(s, pozo) for s in I[j1:j2]]
                    self.cambiadas += j2 - j1
        return out

    def sentencia(self, u, i):
        if clave(u) == clave(i):
            return u
        bu, bi = (_bloques(u), _bloques(i))
        if not bu or not bi or u.get('cmd') != i.get('cmd'):
            self.cambiadas += 1
            return self.fijar(i, [u])
        r = copy.deepcopy(i)
        cab_u, cab_i = (copy.deepcopy(u), copy.deepcopy(i))
        if clave(u, False) != clave(i, False):
            self.cambiadas += 1
            if _parecida(u) == _parecida(i):
                self._copiar_codigos(r, u)
        cu = [clave({'cmd': 'b', 'args': [{'bloque': b}]}) for b in bu]
        ci = [clave({'cmd': 'b', 'args': [{'bloque': b}]}) for b in bi]
        nuevos = [None] * len(bi)
        if len(bu) == len(bi):
            nuevos = [self.lista(a, b) for a, b in zip(bu, bi)]
        else:
            sm = difflib.SequenceMatcher(None, cu, ci, autojunk=False)
            for tag, i1, i2, j1, j2 in sm.get_opcodes():
                if tag in ('equal', 'replace'):
                    for k in range(j2 - j1):
                        nuevos[j1 + k] = self.lista(bu[i1 + k], bi[j1 + k]) if i1 + k < i2 else None
            for k, b in enumerate(bi):
                if nuevos[k] is None:
                    nuevos[k] = [self.fijar(s, [u]) for s in b]
        IA._poner_bloques(r, nuevos)
        return r

    def guion(self, I):
        U = self.usa
        r = {k: v for k, v in U.items() if k not in ('main', 'procs')}
        r['main'] = self.lista(U['main'], I['main'])
        r['procs'] = {}
        for pid, b in U['procs'].items():
            r['procs'][pid] = self.lista(b, I['procs'][pid]) if pid in I['procs'] else b
        for pid, b in I['procs'].items():
            if pid not in U['procs']:
                r['procs'][pid] = [self.fijar(s, []) for s in b]
                self.agregadas += 1
        return r

def usa_con_disco2(st, u):
    import guion_disco2
    if not os.path.exists(os.path.join(guion_disco2.ST2, st, 'cache', 'scenerio.gcx')):
        return u
    try:
        m = guion_disco2.script_mezclado(st, [])
    except (ValueError, OSError) as e:
        print('integral %s: sin los números del disco 2 (%s)' % (st, e))
        return u
    u = dict(u)
    u['main'], u['procs'] = (m['main'], m['procs'])
    return u

def voces_solo_integral(g, u, i):

    def charas(sc):
        out = {}
        for b in [sc['main']] + list(sc['procs'].values()):
            for x in todas(b):
                if x.get('cmd') == 'chara' and any((_opt_de_voz(a) for a in x.get('args', []) or [])):
                    out.setdefault(clave(x), []).append(x)
        return out
    cu, ci, cg = (charas(u), charas(i), charas(g))
    sectores = []
    for k, lu in cu.items():
        li, lg = (ci.get(k), cg.get(k))
        if not li or not lg or len(lu) != 1 or (len(li) != 1):
            continue
        for au, ai in zip(lu[0].get('args', []), li[0].get('args', [])):
            if not (_opt_de_voz(au) and isinstance(ai, dict) and (ai.get('opt') == au.get('opt')) and (len(ai['v']) == len(au['v']))):
                continue
            for n, (vu, vi) in enumerate(zip(au['v'], ai['v'])):
                if vu == 0 and isinstance(vi, int) and (vi > 0):
                    for x in lg:
                        for ag in x.get('args', []):
                            if isinstance(ag, dict) and ag.get('opt') == au.get('opt') and (len(ag['v']) == len(au['v'])) and (ag['v'][n] == 0):
                                ag['v'][n] = VOZ_INTEGRAL + vi
                    sectores.append(vi)
    return sectores

def exportar_voces_integral(sectores, disco=1):
    import mmap, vox as V, demo_dat as D
    p = os.path.join(EXTRAIDO, 'integral%d' % disco, '00_disco', 'MGS', 'VOX.DAT')
    if not sectores or not os.path.exists(p):
        return []
    os.makedirs(OUT_VOX, exist_ok=True)
    hechas = []
    with open(p, 'rb') as f:
        mm = mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ)
        for sec in sorted(set(sectores)):
            s = V.stream_en(mm, sec)
            if not s:
                print('integral: la voz %d no está en el VOX.DAT' % sec)
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
                continue
            datos, n = D.adpcm_crudo(mm, bloques, cab['canales'])
            if datos is None:
                print('integral: la voz %d no se puede copiar (%s)' % (sec, n))
                continue
            hz, ch = (int(round(cab['hz'])), cab['canales'])
            open(os.path.join(OUT_VOX, '%d.adpcm' % sec), 'wb').write(datos)
            tick = V.TICK_SUBT_SEG
            pistas = [[[round(l['inicio'] * tick, 3), round((l['inicio'] + l['duracion']) * tick, 3), l['texto']] for l in x['lineas']] for x in info['subtitulos']]
            d = {'id': VOZ_INTEGRAL + sec, 'nombre': 'integral %d' % sec, 'formato': 'adpcm', 'archivo': '%d.adpcm' % sec, 'hz': hz, 'canales': ch}
            if ch == 2:
                d['bloque'] = D.BLOQUE_ESTEREO
            d.update({'seg': round(n / hz, 4), 'muestras': n, 'sub': pistas[-1] if pistas else [], 'lip': [], 'disco': 'integral%d' % disco, 'sector': sec})
            if len(pistas) > 1:
                d['sub_ja'] = pistas[0]
            json.dump(d, open(os.path.join(OUT_VOX, '%d.json' % sec), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
            hechas.append(sec)
    return hechas

def escenarios_usa():
    return {d for b in USA_TODOS if os.path.isdir(b) for d in os.listdir(b) if os.path.isdir(os.path.join(b, d))}

def injertar(usa, integral, sts_usa=None):
    prep, quitados = preparar(integral, sts_usa if sts_usa is not None else escenarios_usa())
    inj = Injerto(usa)
    g = inj.guion(prep)
    raros = sorted(codigos_de(g) - codigos_de(usa), key=str)
    return (g, {'cambiadas': inj.cambiadas, 'agregadas': inj.agregadas, 'quitados': quitados, 'codigos_del_integral': raros, 'sin_codigo_del_usa': inj.sin_codigo[:10]})

def igual_al_usa(g, usa):
    return json.dumps({'m': g['main'], 'p': g['procs']}, sort_keys=True) == json.dumps({'m': usa['main'], 'p': usa['procs']}, sort_keys=True)

def _md5(p):
    return hashlib.md5(open(p, 'rb').read()).hexdigest()

def distinto_de_verdad(pu, pi):
    a, b = (open(pu, 'rb').read(), open(pi, 'rb').read())
    if a == b:
        return False
    if len(a) != len(b) or not pu.lower().endswith('.kmd'):
        return True
    return any((a[k] != b[k] for k in range(len(a)) if not 8 <= k < 32))

def armar(sts=None, escribir=True, alterna=True):
    import gcx, gcl_vm, niveles, guion_vivo, codec_niveles
    if not any((os.path.isdir(b) for b in INT)) or not os.path.isdir(USA):
        return None
    if not os.path.exists(os.path.join(ASSETS, 'niveles')) or not os.path.exists(os.path.join(ASSETS, 'guion', 'st')):
        print('guiones del Integral: faltan niveles/ o guion/st/ del USA (tools/niveles.py y tools/guion_vivo.py)')
        return None
    sts_usa = escenarios_usa()
    if not sts:
        sts = sorted((os.path.basename(p)[:-5] for p in glob.glob(os.path.join(ASSETS, 'guion', 'st', '*.json'))))
        sts = [st for st in sts if re.fullmatch('[sd]\\d\\d[a-z]r?', st) and os.path.exists(os.path.join(USA, st, 'cache', 'scenerio.gcx')) and IA._dir(INT, st)]
    con_alt = set(IA.escenarios_con_alterna()) if alterna else set()
    injertos, info, voces_int = ({}, {}, {})
    for st in sts:
        pu = os.path.join(USA, st, 'cache', 'scenerio.gcx')
        di = IA._dir(INT, st)
        if not di or not os.path.exists(pu) or (not os.path.exists(os.path.join(di, 'cache', 'scenerio.gcx'))):
            continue
        u, i = (gcx.leer(pu), gcx.leer(os.path.join(di, 'cache', 'scenerio.gcx')))
        u = usa_con_disco2(st, u)
        g, inf = injertar(u, i, sts_usa)
        g = copy.deepcopy(g)
        solo = voces_solo_integral(g, u, i)
        if solo:
            inf['voces_integral'] = solo
            voces_int.setdefault(1 if di.startswith(INT[0]) else 2, []).extend(solo)
        archivos = archivos_distintos(st)
        if igual_al_usa(g, u) and (not archivos) and (st not in con_alt):
            continue
        injertos[st] = (pu, g)
        inf['archivos'] = sorted((os.path.basename(f) for f in archivos.values()))
        info[st] = inf
        print('integral %s: %d cambiadas, %d agregadas, sin STAFF %d, traje %d%s%s%s' % (st, inf['cambiadas'], inf['agregadas'], inf['quitados']['staff'], inf['quitados']['traje'], '  archivos %s' % inf['archivos'] if inf['archivos'] else '', '  OJO códigos del Integral: %s' % inf['codigos_del_integral'][:6] if inf['codigos_del_integral'] else '', '  sin código del USA: %d' % len(inf['sin_codigo_del_usa']) if inf['sin_codigo_del_usa'] else ''))
    if not escribir or not injertos:
        return info
    vi = [v for disco, ss in sorted(voces_int.items()) for v in exportar_voces_integral(ss, disco)]
    if vi:
        print('integral: %d voces que sólo trae el Integral en %s' % (len(vi), os.path.relpath(OUT_VOX, ASSETS)))
    res = construir(injertos, OUT, False)
    out = {'guiones': {'escenarios': res}} if res else {}
    if vi:
        out['guiones']['voces'] = {'base': VOZ_INTEGRAL, 'dir': 'integral/vox/', 'sectores': vi}
    if alterna:
        alt = {st: v for st, v in injertos.items() if st in con_alt}
        ra = construir(alt, OUT_ALT, True)
        if ra:
            out['alterna'] = {'variable': VAR_ALT, 'escenarios': ra, 'completo': True}
    return out or None

def archivos_distintos(st):
    import niveles
    di = IA._dir(INT, st)
    du = os.path.join(USA, st)
    out = {}
    if not di:
        return out
    for f in glob.glob(os.path.join(di, '*', '*.*')):
        ext = f.rsplit('.', 1)[1].lower()
        if ext not in ('hzm', 'kmd', 'oar'):
            continue
        fu = os.path.join(du, os.path.relpath(f, di))
        if os.path.exists(fu) and distinto_de_verdad(fu, f):
            out[ext, niveles.hash_archivo(f)] = f
    return out
VARS_VIVAS = ('$w:L001c', '$w:L0004')

def _condiciones(script):
    out = set()
    for b in [script['main']] + list(script['procs'].values()):
        for s in todas(b):
            if s.get('cmd') == 'if':
                out.add(_cond_texto(s))
    return out

def _cond_texto(s):
    out = []
    for a in s.get('args', []) or []:
        if isinstance(a, dict) and 'expr' in a:
            out.append(a['expr'])
        elif isinstance(a, dict) and a.get('opt') == 'i':
            out.append([v['expr'] for v in a['v'] if isinstance(v, dict) and 'expr' in v])
    return json.dumps(out, sort_keys=True)

def condicionados(d, nv, st, od, tmp, conds_usa=()):
    ks = set()

    def rec(b, dentro):
        for s in b:
            if s.get('cmd') == 'chara' and dentro and ('k' in s):
                ks.add(s['k'])
            d2 = dentro
            if s.get('cmd') == 'if':
                cond = _cond_texto(s)
                d2 = dentro or (cond not in conds_usa and any((v in cond for v in VARS_VIVAS)))
            for x in _bloques(s):
                rec(x, d2)
    rec(d['main'], False)
    for b in d['procs'].values():
        rec(b, False)
    n = 0
    acts = nv['actores']
    nivel_k = d.get('nivel') or []
    if any((k in ks and acts[i]['tipo'] == 'TELOP' for i, k in enumerate(nivel_k))):
        ks |= {k for i, k in enumerate(nivel_k) if acts[i]['tipo'] == 'TELOP' and (acts[i].get('t') or 0) > 0}
    for i, k in enumerate(nivel_k):
        a = nv['actores'][i]
        if k in ks and a['tipo'] not in ('TELOP', 'DEMODOLL'):
            continue
        if k in ks and (not a.get('evento')):
            a['evento'] = True
            a.pop('t', None)
            n += 1
        if a['tipo'] == 'TELOP' and k in ks and (not a.get('telop')):
            dd = (a.get('opts') or {}).get('d', [])
            lineas = []
            for j in range(0, len(dd) - 4, 5):
                x, y, esp, dur, tx = dd[j:j + 5]
                if not (isinstance(tx, dict) and 'id' in tx and all((isinstance(v, int) for v in (x, y, esp, dur)))):
                    continue
                png = 'tex_%04x.png' % tx['id']
                if os.path.exists(os.path.join(ASSETS, 'niveles', st, png)):
                    ruta = 'niveles/%s/%s' % (st, png)
                elif os.path.exists(os.path.join(tmp, st, png)):
                    shutil.copyfile(os.path.join(tmp, st, png), os.path.join(od, png))
                    ruta = os.path.relpath(os.path.join(od, png), ASSETS).replace(os.sep, '/')
                else:
                    continue
                lineas.append({'x': x, 'y': y, 'espera': esp, 'dur': dur, 'img': ruta})
            a['telop'] = lineas
            n += 1
    return n

def motions_doll(st, nv):
    import anims
    oars = {h: f for (ext, h), f in archivos_distintos(st).items() if ext == 'oar'}
    out = []
    for a in nv['actores']:
        if a['tipo'] != 'DEMODOLL' and (not a['tipo'].startswith('DOLL')):
            continue
        o = (a.get('opts') or {}).get('o') or []
        h = o[0].get('id') if o and isinstance(o[0], dict) else o[0] if o and isinstance(o[0], int) else None
        if h is None or h & 65535 not in oars:
            continue
        n = 'doll_%04x' % (h & 65535)
        dst = os.path.join(ASSETS, 'integral', 'anim')
        if n not in out:
            out0 = anims.OUT
            try:
                anims.OUT = dst
                anims.exportar(oars[h & 65535], n)
            finally:
                anims.OUT = out0
            out.append(n)
        a['anim_doll'] = '../integral/anim/' + n
    return out

def construir(injertos, out_dir, alterna):
    import gcx, gcl_vm, niveles, guion_vivo, codec_niveles
    if not injertos:
        return {}
    tmp = tempfile.mkdtemp(prefix='mgs_integral_')
    leer0, aplicar0, indice0, exportar0, out0 = (gcx.leer, gcl_vm.aplicar_carga, niveles.indice, niveles.exportar, niveles.OUT)
    niv0, niv_cn0 = (guion_vivo.NIV, codec_niveles.NIV)
    rutas_sc = {os.path.normcase(os.path.abspath(pu)): g for pu, g in injertos.values()}
    pedidos = []
    rel = os.path.relpath(out_dir, ASSETS).replace('\\', '/')
    del_integral = set()

    def leer(p):
        g = rutas_sc.get(os.path.normcase(os.path.abspath(p)))
        return copy.deepcopy(g) if g is not None else leer0(p)

    def aplicar(vm, st, e):
        aplicar0(vm, st, e)
        if alterna:
            vm.set(VAR_ALT, 1)
        vm.set('$w:L0004', vm.get('$w:L0004') | 256)

    def indice(stage):
        idx = indice0(stage)
        for k, f in archivos_distintos(stage).items():
            if k in idx:
                idx[k] = f
                del_integral.add(os.path.normcase(os.path.abspath(f)))
        return idx

    def exportar(src, dst, **kw):
        pedidos.append((src, dst, kw))
    res = {}
    try:
        gcx.leer = leer
        gcl_vm.aplicar_carga = aplicar
        niveles.indice = indice
        niveles.exportar = exportar
        niveles.OUT = tmp
        guion_vivo.NIV = tmp
        codec_niveles.NIV = tmp
        niveles.CARGAS.clear()
        niveles.ARISTAS.clear()
        niveles.CARGAS.update(niveles.cargas_externas())
        for st, (pu, g) in injertos.items():
            pedidos.clear()
            datos = niveles.nivel(st)
            if not datos:
                print('integral %s: niveles.py no armó el nivel' % st)
                continue
            d, extra = guion_vivo.escenario(st, niveles.CARGAS)
            if not d or not d.get('nivel'):
                print('integral %s: el guion no coincide con el nivel (%s)' % (st, d and d['resumen'].get('nivel_motivo')))
                continue
            od = os.path.join(out_dir, st)
            if os.path.isdir(od) and out_dir == OUT:
                for f in glob.glob(os.path.join(od, '*')):
                    os.remove(f)
            os.makedirs(od, exist_ok=True)
            cambios = {}
            for f in glob.glob(os.path.join(tmp, st, '*.hzm.json')):
                n = os.path.basename(f)
                usa = os.path.join(ASSETS, 'niveles', st, n)
                if os.path.exists(usa) and _md5(usa) == _md5(f):
                    continue
                shutil.copyfile(f, os.path.join(od, n))
                cambios['niveles/%s/%s' % (st, n)] = '%s/%s/%s' % (rel, st, n)
            for src, dst, kw in pedidos:
                n = os.path.basename(dst)
                es_int = os.path.normcase(os.path.abspath(src)) in del_integral
                if not es_int and os.path.exists(os.path.join(ASSETS, 'niveles', st, n)):
                    continue
                exportar0(src, os.path.join(od, n), **kw)
                cambios['niveles/%s/%s' % (st, n)] = '%s/%s/%s' % (rel, st, n)
            for f in glob.glob(os.path.join(tmp, st, '*.png')):
                n = os.path.basename(f)
                if not os.path.exists(os.path.join(ASSETS, 'niveles', st, n)):
                    shutil.copyfile(f, os.path.join(od, n))
                    cambios['niveles/%s/%s' % (st, n)] = '%s/%s/%s' % (rel, st, n)
            txt = json.dumps(datos, ensure_ascii=False, separators=(',', ':'))
            for a, b in cambios.items():
                txt = txt.replace('"%s"' % a, '"%s"' % b)
            nv = json.loads(txt)
            vivos = condicionados(d, nv, st, od, tmp, _condiciones(leer0(pu)))
            mot = motions_doll(st, nv)
            usa_nv = os.path.join(ASSETS, 'niveles', st, 'nivel.json')
            mismo = not alterna and os.path.exists(usa_nv) and (json.dumps(json.load(open(usa_nv, encoding='utf-8')), sort_keys=True) == json.dumps(nv, sort_keys=True))
            r = {'guion': '%s/%s/guion.json' % (rel, st)}
            if not mismo:
                nv['alterna' if alterna else 'integral'] = True
                json.dump(nv, open(os.path.join(od, 'nivel.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
                r['nivel'] = '%s/%s/nivel.json' % (rel, st)
            d['alterna' if alterna else 'integral'] = True
            open(os.path.join(od, 'guion.json'), 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, separators=(',', ':')))
            res[st] = r
            print('integral%s %s: guion ok, %s, %d archivos del Integral%s' % (' (alterna)' if alterna else '', st, 'nivel propio (%d actores)' % len(nv['actores']) if not mismo else 'nivel del USA', len(cambios), ', %d actores que crea el guion según el arma o el idioma' % vivos if vivos else '') + (', motions %s' % mot if mot else ''))
    finally:
        gcx.leer, gcl_vm.aplicar_carga, niveles.indice, niveles.exportar, niveles.OUT = (leer0, aplicar0, indice0, exportar0, out0)
        guion_vivo.NIV, codec_niveles.NIV = (niv0, niv_cn0)
        niveles.CARGAS.clear()
        niveles.ARISTAS.clear()
        shutil.rmtree(tmp, ignore_errors=True)
    return res
if __name__ == '__main__':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    sts = [a for a in sys.argv[1:] if not a.startswith('--')]
    if '--informe' in sys.argv:
        r = armar(sts or None, escribir=False)
        print(json.dumps({k: v for k, v in (r or {}).items() if v.get('codigos_del_integral') or v.get('sin_codigo_del_usa')}, indent=1, ensure_ascii=False))
    else:
        print(json.dumps(armar(sts or None), indent=1, ensure_ascii=False))
