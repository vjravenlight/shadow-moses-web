# MGS web — FeniXVOID · Project Ravenlight
import json, os, re, shutil, sys, time, zipfile
FORMATO = 1
ESCENARIOS_DISCO2 = re.compile('^(s1[3-9]|s2\\d|d1[3-9]|d2\\d)[a-z]*$|^(ending|roll)$')
IDIOMAS = {'es': 'CASTELLANO', 'de': 'DEUTSCH', 'it': 'ITALIANO', 'ja': 'JAPONES', 'fr': 'FRANCAIS'}
ORDEN = ['disco1', 'disco2', 'vr_missions', 'integral']
FIJOS = ('mgs_parte.json', 'partes.json')
ANCLAS = ('vr/disco/catalogo.json',)
SIN_PEDIR = ('integral/integral.json', 'vr/disco/demos_titulo.json')

def archivo_de(parte):
    return 'MGSweb_datos.mgs' if parte == 'entero' else 'MGS_%s.mgs' % parte

def titulo_de(parte):
    if parte == 'disco1':
        return {'es': 'DISCO 1', 'en': 'DISC 1'}
    if parte == 'disco2':
        return {'es': 'DISCO 2', 'en': 'DISC 2'}
    if parte == 'vr_missions':
        return {'es': 'VR MISSIONS', 'en': 'VR MISSIONS'}
    if parte == 'integral':
        return {'es': 'INTEGRAL', 'en': 'INTEGRAL'}
    k = parte.split('_', 1)[1]
    return {'es': 'IDIOMA: ' + IDIOMAS.get(k, k.upper()), 'en': 'LANGUAGE: ' + IDIOMAS.get(k, k.upper())}

def videos_disco2(datos):
    try:
        ind = json.load(open(os.path.join(datos, 'demos', 'movie', 'indice.json'), encoding='utf-8'))
    except (OSError, ValueError):
        return set()
    return {str(v.get('id')) for v in ind.get('videos', []) if v.get('disco') == 2}

def parte_de(rel, mov2):
    m = re.match('idiomas/([^/]+)/', rel)
    if m:
        return 'idioma_' + m.group(1)
    if rel.startswith('integral/'):
        return 'integral'
    if rel.startswith('vr/disco/'):
        return 'vr_missions'
    if re.match('demos/2\\d{5}/', rel) or re.match('codec/vox/2\\d{5}\\.', rel) or rel.startswith('demos/creditos/'):
        return 'disco2'
    m = re.match('demos/movie/([0-9a-fA-F]+)\\.', rel)
    if m and m.group(1) in mov2:
        return 'disco2'
    return 'disco1'

def rutas_compactas(por_parte):
    arbol = {}
    for p, lista in por_parte.items():
        for r in lista:
            d = r
            while '/' in d:
                d = d.rsplit('/', 1)[0]
                arbol.setdefault(d, set()).add(p)
    salida = {}
    for p, lista in por_parte.items():
        if p == 'disco1':
            continue
        res = set()
        for r in lista:
            elegido, d = (r, r)
            while '/' in d:
                d = d.rsplit('/', 1)[0]
                if arbol.get(d) == {p}:
                    elegido = d + '/'
                else:
                    break
            res.add(elegido)
        salida[p] = sorted(res)
    return salida

def escribir_zip(destino, datos, archivos, extras, avance):
    temporal = destino + '.parcial'
    with zipfile.ZipFile(temporal, 'w', zipfile.ZIP_STORED, allowZip64=False) as z:
        for nombre, contenido in extras:
            z.writestr(nombre, contenido)
        for a in archivos:
            z.write(os.path.join(datos, a), a)
            avance(os.path.getsize(os.path.join(datos, a)))
    os.replace(temporal, destino)

def main():
    args = [a for a in sys.argv[1:]]
    lista_txt = None
    if '--lista' in args:
        i = args.index('--lista')
        lista_txt = args[i + 1]
        del args[i:i + 2]
    banderas = {a for a in args if a.startswith('--')}
    pos = [a for a in args if not a.startswith('--')]
    if len(pos) != 2:
        print(__doc__ if __doc__ else 'Uso: archivo_celular.py <datos> <salida> [--partes|--preguntar] [--medir]')
        return 1
    datos, salida = (os.path.abspath(pos[0]), os.path.abspath(pos[1]))
    medir = '--medir' in banderas
    if not os.path.isfile(os.path.join(datos, 'discos.json')) and (not medir):
        print('  Primero instalá el juego con INSTALAR.cmd. / Install the game with INSTALAR.cmd first.')
        return 2
    if '--preguntar' in banderas:
        print('  ¿Un solo archivo ENTERO o EN PARTES? / One WHOLE file or IN PARTS?')
        print('    E = entero: MGSweb_datos.mgs, todo junto (para la PC o aparatos con lugar de sobra).')
        print('        whole: MGSweb_datos.mgs, everything together (for PCs or devices with plenty of room).')
        print('    P = en partes: MGS_disco1.mgs y, aparte, el disco 2, VR Missions, Integral e idiomas (el juego los pide cuando hacen falta).')
        print('        in parts: MGS_disco1.mgs plus disc 2, VR Missions, Integral and languages apart (the game asks for them when needed).')
        r = ''
        while r not in ('e', 'p'):
            try:
                r = input('  [E/P]: ').strip().lower()[:1]
            except EOFError:
                r = 'e'
        if r == 'e':
            salida = os.path.join(salida, archivo_de('entero'))
        else:
            banderas.add('--partes')
    en_partes = '--partes' in banderas
    if lista_txt:
        archivos = sorted({l.strip().replace('\\', '/') for l in open(lista_txt, encoding='utf-8') if l.strip()} | ({'discos.json'} if os.path.isfile(os.path.join(datos, 'discos.json')) else set()))
        archivos = [a for a in archivos if os.path.isfile(os.path.join(datos, a))]
    else:
        archivos = sorted((os.path.relpath(os.path.join(r, a), datos).replace(os.sep, '/') for r, _, l in os.walk(datos) for a in l))
    archivos = [a for a in archivos if a not in FIJOS and (not a.endswith('.parcial'))]
    tam = {a: os.path.getsize(os.path.join(datos, a)) for a in archivos}
    generado = time.strftime('%Y-%m-%d %H:%M:%S')
    if en_partes:
        mov2 = videos_disco2(datos)
        por_parte = {}
        for a in archivos:
            por_parte.setdefault(parte_de(a, mov2), []).append(a)
        if 'disco1' not in por_parte:
            por_parte['disco1'] = []
        rutas = rutas_compactas(por_parte)
        anclas = [a for a in ANCLAS if a in tam and parte_de(a, mov2) != 'disco1']
        por_parte['disco1'] += anclas
        partes = sorted(por_parte, key=lambda p: (ORDEN.index(p) if p in ORDEN else len(ORDEN), p))
        escenarios = sorted({a.split('/')[1] for a in por_parte['disco1'] if a.startswith('niveles/') and a.count('/') >= 2})
        info = {'formato': FORMATO, 'generado': generado, 'partes': {p: {'archivo': archivo_de(p), 'archivos': len(por_parte[p]), 'bytes': sum((tam[a] for a in por_parte[p])), 'obligatoria': p == 'disco1', 'titulo': titulo_de(p)} for p in partes}, 'rutas': rutas, 'en_disco1': anclas, 'sin_pedir': [a for a in SIN_PEDIR if a in tam], 'escenarios': {'disco2': [s for s in escenarios if ESCENARIOS_DISCO2.match(s)] if 'disco2' in por_parte else []}}
        trabajos = [(p, os.path.join(salida, archivo_de(p)), por_parte[p], [('mgs_parte.json', json.dumps({'formato': FORMATO, 'parte': p, 'archivo': archivo_de(p), 'generado': generado})), ('partes.json', json.dumps(info, ensure_ascii=False, separators=(',', ':')))]) for p in partes]
    else:
        trabajos = [('entero', salida, archivos, [('mgs_parte.json', json.dumps({'formato': FORMATO, 'parte': 'entero', 'archivo': os.path.basename(salida), 'generado': generado}))])]
    for p, destino, lista, _ in trabajos:
        t = sum((tam[a] for a in lista))
        print('  %-22s %8.1f MB  %6d archivos / files%s' % (os.path.basename(destino), t / 1048576, len(lista), '' if p in ('entero', 'disco1') else '   (opcional / optional)' if p != 'disco2' else '   (cambio de disco / disc change)'))
        if len(lista) + 2 >= 65535 or t >= 4000000000:
            print('  Demasiados datos para un solo archivo. / Too much data for a single file.' + ('' if en_partes else ' Probá EN PARTES. / Try IN PARTS.'))
            return 3
    if medir:
        return 0
    total = sum((tam[a] for _, _, l, _ in trabajos for a in l))
    carpeta = salida if en_partes else os.path.dirname(salida)
    os.makedirs(carpeta, exist_ok=True)
    if shutil.disk_usage(carpeta).free < total + 100000000:
        print('  Falta espacio: hacen falta %.1f GB libres. / Not enough space: %.1f GB free needed.' % (total / 1000000000.0, total / 1000000000.0))
        return 4
    t0, hecho, ultimo = (time.time(), [0], [-1])

    def avance(n):
        hecho[0] += n
        k = int(hecho[0] * 100 / max(total, 1)) // 10 * 10
        if k != ultimo[0]:
            print('  %3d %%' % k, flush=True)
            ultimo[0] = k
    for p, destino, lista, extras in trabajos:
        escribir_zip(destino, datos, lista, extras, avance)
    for _, destino, lista, _ in trabajos:
        print('  Listo / Done: %s (%.0f MB, %d archivos / files)' % (destino, os.path.getsize(destino) / 1048576, len(lista)))
    print('  (%.0f s)' % (time.time() - t0))
    return 0
if __name__ == '__main__':
    sys.exit(main())
