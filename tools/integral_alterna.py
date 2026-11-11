# MGS web — FeniXVOID · Project Ravenlight
import os, sys, json, copy, glob, difflib, tempfile, shutil, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS
VAR = '$f:G0435.3'
INT = [os.path.join(EXTRAIDO, 'integral%d' % n, '01_stages') for n in (1, 2)]
USA = os.path.join(EXTRAIDO, 'disco1', '01_stages')
OUT = os.path.join(ASSETS, 'integral', 'alterna')

def _dir(bases, st):
    return next((os.path.join(b, st) for b in bases if os.path.isdir(os.path.join(b, st))), None)

def _masc(x, bloques=True):
    if isinstance(x, bool):
        return x
    if isinstance(x, (int, float)):
        return 'N'
    if isinstance(x, list):
        return [_masc(v, bloques) for v in x]
    if isinstance(x, dict):
        if 'bloque' in x:
            return {'bloque': _masc(x['bloque']) if bloques else 'B'}
        return {k: _masc(v, bloques) if k not in ('op', 'var', 'proc', 'call', 'str', 'cmd', 'id') else v for k, v in x.items()}
    return x

def _clave(s, bloques=True):
    return json.dumps(_masc(s, bloques), sort_keys=True, ensure_ascii=False)

def _procs_de(x, out):
    if isinstance(x, list):
        for v in x:
            _procs_de(v, out)
    elif isinstance(x, dict):
        if 'call' in x:
            out.add(x['call'])
        if 'proc' in x and isinstance(x['proc'], int):
            out.add(x['proc'])
        for v in x.values():
            _procs_de(v, out)
    return out

def _alterna(s, nuevos):
    return VAR in json.dumps(s, ensure_ascii=False) or bool(_procs_de(s, set()) & nuevos)

def _bloques(s):
    out = []
    for a in s.get('args', []) or []:
        if isinstance(a, dict) and 'bloque' in a:
            out.append(a['bloque'])
        if isinstance(a, dict) and 'opt' in a:
            for v in a['v']:
                if isinstance(v, dict) and 'bloque' in v:
                    out.append(v['bloque'])
    return out

def _poner_bloques(s, nuevos):
    it = iter(nuevos)
    for a in s.get('args', []) or []:
        if isinstance(a, dict) and 'bloque' in a:
            a['bloque'] = next(it)
        if isinstance(a, dict) and 'opt' in a:
            for v in a['v']:
                if isinstance(v, dict) and 'bloque' in v:
                    v['bloque'] = next(it)

def _todas(b, out):
    for s in b:
        out.append(s)
        for x in _bloques(s):
            _todas(x, out)
    return out
CODIGOS = ('radio', 'sound', 'demo')

def _arreglar(s, pozo):
    mapa = {}
    for u in _todas(pozo, []):
        if u.get('cmd') in CODIGOS:
            mapa.setdefault(_clave(u), u)
    s = copy.deepcopy(s)

    def rec(b):
        for i, x in enumerate(b):
            u = mapa.get(_clave(x)) if x.get('cmd') in CODIGOS else None
            if u is not None:
                b[i] = copy.deepcopy(u)
                continue
            for y in _bloques(x):
                rec(y)
    lista = [s]
    rec(lista)
    return lista[0]

class Injerto:

    def __init__(self, nuevos):
        self.nuevos = nuevos
        self.agregadas = 0
        self.cambiadas = 0

    def lista(self, U, I):
        sm = difflib.SequenceMatcher(None, [_clave(s, False) for s in U], [_clave(s, False) for s in I], autojunk=False)
        out = []
        for tag, i1, i2, j1, j2 in sm.get_opcodes():
            if tag == 'equal':
                out += [self.sentencia(U[i1 + k], I[j1 + k]) for k in range(i2 - i1)]
            elif tag == 'delete':
                out += U[i1:i2]
            elif tag == 'insert':
                for s in I[j1:j2]:
                    if _alterna(s, self.nuevos):
                        out.append(_arreglar(s, []))
                        self.agregadas += 1
            else:
                pozo = list(U[i1:i2])
                alts = [s for s in I[j1:j2] if _alterna(s, self.nuevos)]
                if not alts:
                    out += pozo
                    continue
                textos = [_clave(s) for s in alts]
                usados = set()
                for k, u in enumerate(pozo):
                    cu = _clave(u)
                    if any((cu in t for t in textos)):
                        usados.add(k)
                        continue
                    if u.get('cmd') == 'chara' and any((a.get('cmd') == 'chara' and a['args'][:2] == u['args'][:2] for a in alts)):
                        usados.add(k)
                quedan = [u for k, u in enumerate(pozo) if k not in usados]
                out += quedan + [_arreglar(s, pozo) for s in alts]
                self.cambiadas += len(alts)
        return out

    def sentencia(self, u, i):
        if _clave(u) == _clave(i):
            return u
        bu, bi = (_bloques(u), _bloques(i))
        if len(bu) == len(bi) and _clave(u, False) == _clave(i, False):
            r = copy.deepcopy(u)
            _poner_bloques(r, [self.lista(a, b) for a, b in zip(bu, bi)])
            return r
        if _alterna(i, self.nuevos):
            self.cambiadas += 1
            return _arreglar(i, [u])
        return u

    def guion(self, U, I):
        r = {k: v for k, v in U.items() if k not in ('main', 'procs')}
        r['main'] = self.lista(U['main'], I['main'])
        r['procs'] = {}
        for pid, b in U['procs'].items():
            r['procs'][pid] = self.lista(b, I['procs'][pid]) if pid in I['procs'] else b
        for pid, b in I['procs'].items():
            if pid not in U['procs']:
                r['procs'][pid] = b
        return r

def injertar(usa, integral):
    nuevos = set(integral['procs']) - set(usa['procs'])
    inj = Injerto(nuevos)
    g = inj.guion(usa, integral)
    return (g, {'sentencias_nuevas': inj.agregadas, 'sentencias_cambiadas': inj.cambiadas, 'procs_nuevos': sorted(('%04x' % p for p in nuevos))})

def _numeros_de_codigo(script):
    out = set()

    def rec(b):
        for s in b:
            c = s.get('cmd')
            if c in ('radio', 'sound', 'demo'):
                for a in s.get('args', []):
                    if isinstance(a, dict) and 'opt' in a and (a['opt'] in 'bocvgs'):
                        out.update((v for v in a['v'] if isinstance(v, int) and v > 10000))
            for x in _bloques(s):
                rec(x)
    rec(script['main'])
    for b in script['procs'].values():
        rec(b)
    return out

def escenarios_con_alterna():
    import gcx
    out = []
    for base in INT:
        for p in sorted(glob.glob(os.path.join(base, '*', 'cache', 'scenerio.gcx'))):
            st = os.path.basename(os.path.dirname(os.path.dirname(p)))
            if st in out or not st.startswith('s') or (not os.path.exists(os.path.join(USA, st, 'cache', 'scenerio.gcx'))):
                continue
            try:
                r = gcx.leer(p)
            except Exception:
                continue
            if VAR in json.dumps(r['main']) or any((VAR in json.dumps(b) for b in r['procs'].values())):
                out.append(st)
    return out

def _md5(p):
    return hashlib.md5(open(p, 'rb').read()).hexdigest()

def armar(sts=None, escribir=True):
    import gcx, gcl_vm, niveles, guion_vivo, codec_niveles, export_glb
    if not any((os.path.isdir(b) for b in INT)) or not os.path.isdir(USA):
        return None
    if not os.path.exists(os.path.join(ASSETS, 'niveles')) or not os.path.exists(os.path.join(ASSETS, 'guion', 'st')):
        print('alterna: faltan niveles/ o guion/st/ del USA (tools/niveles.py y tools/guion_vivo.py)')
        return None
    sts = sts or escenarios_con_alterna()
    injertos, info = ({}, {})
    for st in sts:
        pu = os.path.join(USA, st, 'cache', 'scenerio.gcx')
        di = _dir(INT, st)
        if not di or not os.path.exists(pu):
            continue
        u, i = (gcx.leer(pu), gcx.leer(os.path.join(di, 'cache', 'scenerio.gcx')))
        g, inf = injertar(u, i)
        raros = sorted(_numeros_de_codigo(g) - _numeros_de_codigo(u))
        inf['codigos_del_integral'] = raros
        injertos[st] = (pu, g)
        info[st] = inf
        print('alterna %s: %d sentencias nuevas, %d cambiadas, procs nuevos %s%s' % (st, inf['sentencias_nuevas'], inf['sentencias_cambiadas'], ','.join(inf['procs_nuevos']) or '-', '  OJO códigos del Integral: %s' % raros if raros else ''))
    if not escribir or not injertos:
        return info
    tmp = tempfile.mkdtemp(prefix='mgs_alterna_')
    leer0, aplicar0, indice0, exportar0, out0 = (gcx.leer, gcl_vm.aplicar_carga, niveles.indice, niveles.exportar, niveles.OUT)
    niv0, niv_cn0 = (guion_vivo.NIV, codec_niveles.NIV)
    rutas_sc = {os.path.normcase(os.path.abspath(pu)): g for pu, g in injertos.values()}
    pedidos = []

    def leer(p):
        g = rutas_sc.get(os.path.normcase(os.path.abspath(p)))
        return copy.deepcopy(g) if g is not None else leer0(p)

    def aplicar(vm, st, e):
        aplicar0(vm, st, e)
        vm.set(VAR, 1)

    def indice(stage):
        idx = indice0(stage)
        di = _dir(INT, stage)
        if di:
            for f in glob.glob(os.path.join(di, '*', '*.hzm')):
                k = ('hzm', niveles.hash_archivo(f))
                if k in idx:
                    idx[k] = f
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
                print('alterna %s: niveles.py no armó el nivel' % st)
                continue
            d, extra = guion_vivo.escenario(st, niveles.CARGAS)
            if not d or not d.get('nivel'):
                print('alterna %s: el guion no coincide con el nivel (%s)' % (st, d and d['resumen'].get('nivel_motivo')))
                continue
            od = os.path.join(OUT, st)
            os.makedirs(od, exist_ok=True)
            cambios = {}
            for f in glob.glob(os.path.join(tmp, st, '*.hzm.json')):
                n = os.path.basename(f)
                usa = os.path.join(ASSETS, 'niveles', st, n)
                if os.path.exists(usa) and _md5(usa) == _md5(f):
                    continue
                shutil.copyfile(f, os.path.join(od, n))
                cambios['niveles/%s/%s' % (st, n)] = 'integral/alterna/%s/%s' % (st, n)
            for src, dst, kw in pedidos:
                n = os.path.basename(dst)
                if os.path.exists(os.path.join(ASSETS, 'niveles', st, n)):
                    continue
                exportar0(src, os.path.join(od, n), **kw)
                cambios['niveles/%s/%s' % (st, n)] = 'integral/alterna/%s/%s' % (st, n)
            for x in ('png',):
                for f in glob.glob(os.path.join(tmp, st, '*.' + x)):
                    n = os.path.basename(f)
                    if not os.path.exists(os.path.join(ASSETS, 'niveles', st, n)):
                        shutil.copyfile(f, os.path.join(od, n))
                        cambios['niveles/%s/%s' % (st, n)] = 'integral/alterna/%s/%s' % (st, n)
            txt = json.dumps(datos, ensure_ascii=False, separators=(',', ':'))
            for a, b in cambios.items():
                txt = txt.replace('"%s"' % a, '"%s"' % b)
            nv = json.loads(txt)
            nv['alterna'] = True
            json.dump(nv, open(os.path.join(od, 'nivel.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
            d['alterna'] = True
            open(os.path.join(od, 'guion.json'), 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, separators=(',', ':')))
            n_g = sum((1 for a in nv['actores'] if a['tipo'] == 'WATCHER'))
            res[st] = {'nivel': 'integral/alterna/%s/nivel.json' % st, 'guion': 'integral/alterna/%s/guion.json' % st}
            print('alterna %s: nivel con %d actores (%d guardias), guion ok, %d archivos del Integral' % (st, len(nv['actores']), n_g, len(cambios)))
    finally:
        gcx.leer, gcl_vm.aplicar_carga, niveles.indice, niveles.exportar, niveles.OUT = (leer0, aplicar0, indice0, exportar0, out0)
        guion_vivo.NIV, codec_niveles.NIV = (niv0, niv_cn0)
        niveles.CARGAS.clear()
        niveles.ARISTAS.clear()
        shutil.rmtree(tmp, ignore_errors=True)
    return {'variable': VAR, 'escenarios': res} if res else None
if __name__ == '__main__':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    if '--informe' in sys.argv:
        print(json.dumps(armar(escribir=False), indent=1, ensure_ascii=False))
    else:
        print(json.dumps(armar(), indent=1, ensure_ascii=False))
