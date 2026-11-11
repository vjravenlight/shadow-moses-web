# MGS web — FeniXVOID · Project Ravenlight
import sys, os, json, re, datetime, statistics
from collections import defaultdict, Counter
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
DIR = os.path.join(os.path.abspath(os.environ['MGS_PRUEBAS']) if os.environ.get('MGS_PRUEBAS') else os.path.join(RAIZ, '_pruebas'), 'telemetria')

def arg(k, d=None):
    return sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d

def libres():
    out, saltar = ([], False)
    for i, a in enumerate(sys.argv[1:], 1):
        if saltar:
            saltar = False
            continue
        if a in ('--ip', '--sid', '--salida'):
            saltar = True
            continue
        out.append(a)
    return out

def archivo():
    l = libres()
    if l and os.path.isfile(l[0]):
        return l[0]
    dia = l[0] if l else datetime.date.today().isoformat()
    return os.path.join(DIR, dia + '.jsonl')

def leer(f):
    evs = []
    with open(f, encoding='utf-8', errors='replace') as fh:
        for l in fh:
            try:
                evs.append(json.loads(l))
            except Exception:
                pass
    ip, sid = (arg('--ip'), arg('--sid'))
    pruebas = set() if '--con-pruebas' in sys.argv else {e.get('sid') for e in evs if e.get('tipo') == 'inicio' and 'HeadlessChrome' in str((e.get('aparato') or {}).get('ua', ''))}
    return [e for e in evs if (not ip or e.get('ip') == ip) and (not sid or e.get('sid') == sid) and (e.get('sid') not in pruebas)]

def hora(e):
    return (e.get('srv') or '')[11:19]

def aparato(ua):
    ua = ua or ''
    if 'OculusBrowser' in ua or 'Quest' in ua:
        m = re.search('Quest ?(\\d\\w*)', ua)
        return 'Quest ' + (m.group(1) if m else '') + ' (navegador del casco)'
    if 'Android' in ua:
        return 'Android'
    nav = 'Edge' if 'Edg/' in ua else 'Chrome' if 'Chrome/' in ua else 'Firefox' if 'Firefox' in ua else 'Safari' if 'Safari' in ua else '?'
    so = 'Windows' if 'Windows' in ua else 'Mac' if 'Mac OS' in ua else 'Linux' if 'Linux' in ua else '?'
    if 'HeadlessChrome' in ua:
        nav = 'Chrome sin ventana (prueba)'
    return f'{nav} en {so}'

def normalizar(msg):
    m = re.sub('\\b\\d+(\\.\\d+)?\\b', '#', msg or '')
    m = re.sub('#[0-9a-f]{2,}\\b', '#', m)
    return m[:160]

def mediana(l):
    return round(statistics.median(l), 1) if l else '-'

def pct(a, b):
    return f'{round(100 * a / b)} %' if b else '-'

def resumir(evs, f):
    out = []
    p = out.append
    if not evs:
        return f'Sin telemetría en {f}'
    p(f'TELEMETRÍA  {f}  ({len(evs)} eventos, {hora(evs[0])} a {hora(evs[-1])})')
    ses = {}
    for e in evs:
        s = ses.setdefault(e.get('sid'), {'ip': e.get('ip'), 'ini': hora(e), 'fin': hora(e), 'aparato': '?', 'gpu': '', 'escs': [], 'n': 0, 'xr': 0.0})
        s['fin'] = hora(e)
        s['n'] += 1
        if e.get('tipo') == 'inicio' and isinstance(e.get('aparato'), dict):
            a = e['aparato']
            s['aparato'] = aparato(a.get('ua'))
            s['gpu'] = (a.get('gpu') or '')[:60]
        if e.get('tipo') == 'escenario' and (not s['escs'] or s['escs'][-1] != e.get('esc')):
            s['escs'].append(e.get('esc'))
        if e.get('tipo') == 'xr' and e.get('fase') == 'fin':
            s['xr'] += e.get('dur') or 0
    p('\n== SESIONES')
    for sid, s in ses.items():
        p(f"  {s['ini']}-{s['fin']}  {sid}  {s['ip']:<15} {s['aparato']}  {s['gpu']}")
        if s['escs'] or s['xr']:
            p(f"      escenarios: {' > '.join(map(str, s['escs'][:30]))}{(' …' if len(s['escs']) > 30 else '')}{('  · casco ' + str(round(s['xr'])) + ' s' if s['xr'] else '')}")
    mar = [e for e in evs if e.get('tipo') == 'marca']
    if mar:
        man = sum((1 for e in mar if e.get('motivo') == 'Charles'))
        p(f"\n== MARCAS ({len(mar)}, {man} con el botón) · fotos en {os.path.join(os.path.dirname(f), 'fotos')}")
        for e in mar[:120]:
            est = []
            if e.get('cine'):
                est.append(f"cine {e['cine'].get('id')} {e['cine'].get('estado')}")
            if e.get('codec'):
                est.append(f"códec {e['codec'].get('freq')}")
            if e.get('trabas'):
                est.append('trabas ' + ','.join(e['trabas'][:6]))
            if e.get('titulo'):
                est.append('título')
            if e.get('vrm'):
                est.append('VR ' + str(e['vrm']))
            if e.get('error'):
                est.append('error: ' + e['error'][:80])
            p(f"  {hora(e)} {e.get('sid')} {('BOTÓN' if e.get('motivo') == 'Charles' else e.get('motivo')):<17} {e.get('esc')} prog {e.get('progreso')} {('casco' if e.get('xr') else 'PC')} luz {e.get('luz')}/{e.get('luzMax')} arma {e.get('arma')}  {' · '.join(est)}")
            p(f"      pasadas {e.get('pasadas')}  foto: {e.get('foto') or ('sin foto' if e.get('sinFoto') else '(el servidor no la guardó)')}")
    rar = [e for e in evs if e.get('tipo') == 'rareza']
    if rar:
        p(f'\n== RAREZAS ({len(rar)})')
        for e in rar[:60]:
            p(f"  {hora(e)} {e.get('sid')} {e.get('que')}: {e.get('esc')} desde {e.get('desde')}, {e.get('de')} -> {e.get('a')} (modo {e.get('modo')})")
    esc = defaultdict(lambda: {'cargas': [], 'tiempo': 0.0, 'muertes': 0, 'alertas': 0, 'fps': [], 'fpsvr': []})
    for e in evs:
        t = e.get('tipo')
        if t == 'escenario':
            esc[e.get('esc')]['cargas'].append(e.get('s') or 0)
        if t == 'fps' and e.get('esc') and (not e.get('titulo')):
            E = esc[e['esc']]
            E['tiempo'] += 5
            (E['fpsvr'] if e.get('xr') else E['fps']).append(e.get('fps') or 0)
        if t == 'muerte':
            esc[e.get('esc')]['muertes'] += 1
        if t == 'alerta':
            esc[e.get('esc')]['alertas'] += 1
    if esc:
        p('\n== ESCENARIOS (tiempo aprox. por las muestras de 5 s)')
        p('  escenario  cargas  carga(s) med/máx   tiempo   fps PC med/mín   fps casco med/mín   muertes  alertas')
        for k, E in sorted(esc.items(), key=lambda kv: -kv[1]['tiempo']):
            c = E['cargas']
            p(f"  {str(k):<9}  {len(c):>6}  {mediana(c):>6} / {(max(c) if c else '-'):<6}  {int(E['tiempo']):>5} s   {mediana(E['fps']):>6} / {(min(E['fps']) if E['fps'] else '-'):<6}   {mediana(E['fpsvr']):>6} / {(min(E['fpsvr']) if E['fpsvr'] else '-'):<8}  {E['muertes']:>6}  {E['alertas']:>7}")
    fps = [e for e in evs if e.get('tipo') == 'fps']
    if fps:
        p('\n== RENDIMIENTO')
        for nombre, sel in (('PC/celular', [e for e in fps if not e.get('xr')]), ('casco', [e for e in fps if e.get('xr')])):
            if not sel:
                continue
            v = [e.get('fps') or 0 for e in sel]
            lent = sum((e.get('lentos') or 0 for e in sel))
            cu = sum((e.get('cuadros') or 0 for e in sel))
            mem = [e['mem'] for e in sel if e.get('mem')]
            p(f"  {nombre}: {len(sel)} muestras, fps mediana {mediana(v)}, mín {min(v)}; cuadros lentos {lent} de {cu} ({pct(lent, cu)}); cuadros > 100 ms: {sum((e.get('muyLentos') or 0 for e in sel))}" + (f'; memoria JS {min(mem)}-{max(mem)} MB' if mem else ''))
        lentos = []
        for e in fps:
            obj = e.get('hz') or 72 if e.get('xr') else 60
            if (e.get('fps') or 0) < obj * 0.75 and (not e.get('titulo')):
                lentos.append(e)
        if lentos:
            p(f'  Momentos lentos (fps < 75 % del objetivo): {len(lentos)}')
            for e in lentos[:25]:
                extra = ' '.join((f'{k}={e[k]}' for k in ('cine', 'codec', 'trabas', 'postura', 'mem', 'texs') if e.get(k) is not None))
                p(f"    {hora(e)} {e.get('sid')} {str(e.get('esc')):<6} {('casco' if e.get('xr') else 'PC   ')} fps {e.get('fps')} peor {e.get('peor')} ms  {extra}")
            if len(lentos) > 25:
                p(f'    … y {len(lentos) - 25} más')
    errs = defaultdict(lambda: {'n': 0, 'ses': set(), 'escs': Counter(), 'ej': None, 'pila': None, 'primera': None})
    for e in evs:
        if e.get('tipo') not in ('error', 'aviso'):
            continue
        k = (e['tipo'], normalizar(e.get('msg')))
        G = errs[k]
        G['n'] += e.get('n') or 1
        G['ses'].add(e.get('sid'))
        G['escs'][e.get('esc')] += 1
        G['primera'] = G['primera'] or hora(e)
        G['ej'] = G['ej'] or e.get('msg')
        G['pila'] = G['pila'] or e.get('pila')
    if errs:
        p(f"\n== ERRORES Y AVISOS AGRUPADOS ({sum((G['n'] for G in errs.values()))} en {len(errs)} grupos)")
        for (tipo, _), G in sorted(errs.items(), key=lambda kv: (kv[0][0] != 'error', -kv[1]['n'])):
            escs = ', '.join((f'{k}×{v}' for k, v in G['escs'].most_common(4) if k))
            p(f"  [{tipo}] ×{G['n']} ({len(G['ses'])} sesión/es, desde {G['primera']}{(', en ' + escs if escs else '')}): {G['ej'][:200]}")
            if G['pila']:
                l = [x.strip() for x in G['pila'].split('\n') if x.strip().startswith('at ')][:2]
                for x in l:
                    p(f'        {x[:150]}')
    muertes = [e for e in evs if e.get('tipo') == 'muerte']
    if muertes:
        p(f"\n== MUERTES ({len(muertes)}; GAME OVER: {sum((1 for e in evs if e.get('tipo') == 'gameover'))})")
        for (es, c), n in Counter(((e.get('esc'), e.get('causa')) for e in muertes)).most_common():
            p(f'  {str(es):<7} ×{n}  {c}')
        for e in muertes[:15]:
            p(f"    {hora(e)} {e.get('esc')} pos {e.get('pos')} {('alerta ' + str(e.get('alerta')) if e.get('alerta') else '')} {e.get('jefe') or ''} {('(casco)' if e.get('vr') else '')}")
    alertas = [e for e in evs if e.get('tipo') == 'alerta']
    if alertas:
        p(f'\n== ALERTAS ({len(alertas)})')
        por = defaultdict(list)
        for e in alertas:
            por[e.get('esc')].append(e)
        for k, l in sorted(por.items(), key=lambda kv: -len(kv[1])):
            quien = Counter((e.get('quien') for e in l)).most_common(3)
            p(f"  {str(k):<7} ×{len(l)}  duración med {mediana([e.get('total_s') or 0 for e in l])} s (evasión {mediana([e.get('evasion_s') or 0 for e in l])} s)  vio: {', '.join((f'{q} ×{n}' for q, n in quien))}")
    daños = [e for e in evs if e.get('tipo') == 'daño']
    if daños:
        tot = Counter()
        for e in daños:
            for k, v in (e.get('fuentes') or {}).items():
                tot[e.get('esc'), k] += v
        p('\n== DAÑO RECIBIDO (unidades de vida del juego)')
        for (es, k), v in tot.most_common(20):
            p(f'  {str(es):<7} {k:<34} {round(v)}')
    jefes = [e for e in evs if e.get('tipo') == 'jefe']
    if jefes:
        p('\n== JEFES')
        for e in jefes:
            if e.get('fase') == 'cambio':
                continue
            p(f"  {hora(e)} {e.get('esc')} {e.get('jefe')} {e.get('fase')} {e.get('motivo') or ''} {(str(e.get('dur')) + ' s' if e.get('dur') is not None else '')}")
        c = Counter((e.get('jefe') for e in jefes if e.get('fase') == 'cambio'))
        if c:
            p('  cambios de fase: ' + ', '.join((f'{k} {v}' for k, v in c.items())))
    vrm = [e for e in evs if e.get('tipo') == 'vrm']
    if vrm:
        p('\n== VR MISSIONS')
        for e in vrm:
            p(f"  {hora(e)} {e.get('mision') or e.get('st')} (modo {e.get('modo')}) {e.get('fase')} {e.get('causa') or ''} {(str(e.get('tiempo_s')) + ' s' if e.get('tiempo_s') is not None else '')}")
    gui = [e for e in evs if e.get('tipo') == 'guion' and e.get('falla')]
    if gui:
        p(f'\n== GUION ({len(gui)})')
        for e in gui[:30]:
            p(f"  {e.get('esc')} {e.get('falla')}: {e.get('proc') or e.get('que')} {('desde ' + e['desde'] if e.get('desde') else '')}")
    pu = [e for e in evs if e.get('tipo') == 'puerta']
    if pu:
        p(f'\n== PUERTAS QUE NO ABREN ({len(pu)})')
        for e in pu[:30]:
            p(f"  {hora(e)} {e.get('esc')} puerta {e.get('puerta')} {('de evento (la abre el guion)' if e.get('evento') else 'pide tarjeta ' + str(e.get('nivel')))}, tiene {e.get('tarjeta')}, en la mano {e.get('item')}")
    trabas = [e for e in evs if e.get('tipo') in ('traba', 'trabon', 'congelado')]
    if trabas:
        p(f'\n== TRABAS ({len(trabas)}) y el último error antes de cada una')
        ult, ids = ({}, {id(e) for e in trabas})
        for e in evs:
            if e.get('tipo') == 'error':
                ult[e.get('sid')] = e
            if id(e) in ids:
                er = ult.get(e.get('sid'))
                que = f"sin control {e.get('s')} s por {', '.join(e.get('motivos') or [])}" if e['tipo'] == 'traba' else e.get('msg')
                es = e.get('esc') or (e['x'].get('esc') if isinstance(e.get('x'), dict) else None)
                p(f"  {hora(e)} {e.get('sid')} {es} {e['tipo']}: {que}")
                p(f"      último error: {('[' + hora(er) + '] ' + (er.get('msg') or '')[:180] if er else 'ninguno en esta sesión')}")
    xr = [e for e in evs if e.get('tipo') == 'xr' and e.get('fase') in ('inicio', 'fin')]
    if xr:
        p('\n== CASCO')
        for e in xr:
            if e['fase'] == 'inicio':
                p(f"  {hora(e)} {e.get('sid')} entra: {('sentado' if e.get('sentado') else 'de pie')}, altura real {e.get('alturaReal')} m, ojos {e.get('ojos')}, {e.get('hz')} Hz, mandos {e.get('mandos')}")
            else:
                p(f"  {hora(e)} {e.get('sid')} sale tras {e.get('dur')} s")
        oj = [e for e in fps if e.get('xr') and e.get('vista') is not None]
        if oj:
            pos = Counter((e.get('postura') for e in oj))
            p(f"  vista sobre el piso: mediana {mediana([e['vista'] for e in oj])} m; posturas: {dict(pos)}")
    md = [e for e in evs if e.get('tipo') == 'mandos' and (e.get('botones') or e.get('teclas'))]
    if md:
        bot, tec, pal = (Counter(), Counter(), {})
        for e in md:
            bot.update(e.get('botones') or {})
            tec.update(e.get('teclas') or {})
            for k, v in (e.get('palancas') or {}).items():
                pal[k] = max(pal.get(k, 0), v)
        p('\n== CONTROLES')
        if bot:
            p('  botones (lado.índice ×veces): ' + ', '.join((f'{k}×{v}' for k, v in bot.most_common(16))))
        if pal:
            p('  palancas (máximo): ' + ', '.join((f'{k} {v}' for k, v in sorted(pal.items()))))
        if tec:
            p('  teclas: ' + ', '.join((f'{k}×{v}' for k, v in tec.most_common(16))))
    it = [e for e in evs if e.get('tipo') == 'items']
    if it:
        eq, rec, usa = (Counter(), Counter(), Counter())
        for e in it:
            eq.update(e.get('equipa') or [])
            rec.update(e.get('recoge') or {})
            usa.update(e.get('usa') or {})
        p('\n== ARMAS E ÍTEMS')
        if eq:
            p('  equipa: ' + ', '.join((f'{k}×{v}' for k, v in eq.most_common(12))))
        if rec:
            p('  recoge: ' + ', '.join((f'{k}×{v}' for k, v in rec.most_common(12))))
        if usa:
            p('  usa/gasta: ' + ', '.join((f'{k}×{v}' for k, v in usa.most_common(12))))
    op = [e for e in evs if e.get('tipo') == 'opcion']
    if op:
        ultimas = {}
        for e in op:
            if isinstance(e.get('todas'), dict):
                ultimas.update(e['todas'])
            elif e.get('k'):
                ultimas[e['k']] = e.get('v')
        cambios = [e for e in op if e.get('k')]
        p('\n== OPCIONES (las últimas)')
        p('  ' + ', '.join((f'{k}={v}' for k, v in sorted(ultimas.items()) if not k.startswith('sm_go_'))))
        if cambios:
            p('  cambios: ' + ', '.join((f"{hora(e)} {e['k']}: {e.get('antes')} -> {e.get('v')}" for e in cambios[:15])))
    clave = lambda e: (e['tipo'], e.get('id') if e['tipo'] == 'cine' else e.get('freq'))
    ini = Counter((clave(e) for e in evs if e.get('tipo') in ('cine', 'codec') and e.get('fase') == 'inicio'))
    fin = defaultdict(list)
    for e in evs:
        if e.get('tipo') in ('cine', 'codec') and e.get('fase') == 'fin':
            fin[clave(e)].append(e.get('dur') or 0)
    if ini:
        p('\n== CINEMÁTICAS Y CÓDEC (empezadas, terminadas y duración mediana)')
        for (t, k), n in ini.most_common(30):
            d = fin.get((t, k), [])
            p(f"  {('demo' if t == 'cine' else 'códec')} {k}: ×{n}, terminadas {len(d)}" + (f', {mediana(d)} s' if d else ''))
    pr = [e for e in evs if e.get('tipo') == 'progreso']
    if pr:
        p('\n== PROGRESO DE LA HISTORIA ($w:G000a)\n  ' + ', '.join((f"{hora(e)} {e.get('esc')} {e.get('de')}->{e.get('a')}" for e in pr[:30])))
    return '\n'.join(out)
if __name__ == '__main__':
    f = archivo()
    if not os.path.isfile(f):
        print(f'No hay telemetría en {f}. La guarda tools/servidor.mjs cuando el juego corre contra él (JUGAR_EN_RED.cmd o ABRIR_VISOR.cmd).')
        sys.exit(1)
    txt = resumir(leer(f), f)
    if arg('--salida'):
        with open(arg('--salida'), 'w', encoding='utf-8') as fh:
            fh.write(txt + '\n')
    print(txt)
