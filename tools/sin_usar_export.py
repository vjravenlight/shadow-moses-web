# MGS web — FeniXVOID · Project Ravenlight
import sys, os, re, json, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS
import gcx
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
REF = os.path.join(RAIZ, 'ref', 'mgs_reversing', 'source')
SALIDA = os.path.join(ASSETS, 'extras', 'sin_usar.json')

def strcode(s):
    i = 0
    for c in s.encode('latin1', 'replace'):
        i = (i << 5 | i >> 11) & 65535
        i = i + c & 65535
    return i

def recorrer(x, ids, textos):
    if isinstance(x, dict):
        for k, v in x.items():
            if k == 'id' and isinstance(v, int):
                ids.add(v & 65535)
            elif k == 'str' and isinstance(v, str):
                textos.add(v)
            else:
                recorrer(v, ids, textos)
    elif isinstance(x, list):
        for v in x:
            recorrer(v, ids, textos)
    elif isinstance(x, int) and 0 <= x <= 65535:
        ids.add(x)

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    cat = json.load(open(os.path.join(ASSETS, 'catalogo.json'), encoding='utf-8'))
    ids, textos = (set(), set())
    n_guiones = 0
    for disco in ('disco1', 'disco2'):
        for g in glob.glob(os.path.join(EXTRAIDO, disco, '01_stages', '*', 'cache', 'scenerio.gcx')):
            try:
                recorrer(gcx.leer(g), ids, textos)
                n_guiones += 1
            except Exception as e:
                print('  guion', g, e)
    usados_guion = set(ids) | {strcode(t) for t in textos}
    ind = json.load(open(os.path.join(ASSETS, 'demos', 'indice.json'), encoding='utf-8'))
    usados_demo = set()
    for d in ind.get('demos', []):
        for k in d.get('modelos', []) + d.get('mapas', []):
            try:
                usados_demo.add(int(k, 16))
            except Exception:
                usados_demo.add(strcode(k))
    usados_codigo, n_c = (set(), 0)
    for f in glob.glob(os.path.join(REF, '**', '*.[ch]'), recursive=True):
        t = open(f, encoding='utf-8', errors='replace').read()
        n_c += 1
        for s in re.findall('"((?:[^"\\\\\\n]|\\\\.){1,40})"', t):
            usados_codigo.add(strcode(s))
            if re.search('%0?\\d?d', s):
                for n in range(41):
                    try:
                        usados_codigo.add(strcode(re.sub('%(0?\\d?)d', lambda m: ('%' + m.group(1) + 'd') % n, s)))
                    except Exception:
                        pass
        for h in re.findall('0x([0-9a-fA-F]{1,4})\\b', t):
            usados_codigo.add(int(h, 16))
        if f.endswith('strcode.h'):
            for h in re.findall('#define\\s+KMD_\\w+\\s+0x([0-9a-fA-F]{1,4})', t):
                usados_codigo.update(range(int(h, 16), int(h, 16) + 16))
    extra = glob.glob(os.path.join(RAIZ, 'ref', 'mgs_reversing', 'asm', '**', '*.s'), recursive=True) + glob.glob(os.path.join(RAIZ, '_pruebas', 'ghidra', 'salida', '*.c')) + glob.glob(os.path.join(RAIZ, '_pruebas', 'vrmisiones', 'asm', '**', '*.*'), recursive=True)
    for f in extra:
        try:
            t = open(f, encoding='utf-8', errors='replace').read()
        except Exception:
            continue
        n_c += 1
        for h in re.findall('0x([0-9a-fA-F]{1,4})\\b', t):
            usados_codigo.add(int(h, 16))
        for s in re.findall('"((?:[^"\\\\\\n]|\\\\.){1,40})"', t):
            usados_codigo.add(strcode(s))
    TABLA = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sin_usar_codigo.json')
    if os.path.isdir(REF):
        json.dump({'n': n_c, 'codigos': sorted(usados_codigo)}, open(TABLA, 'w', encoding='utf-8'), separators=(',', ':'))
    elif os.path.exists(TABLA):
        t = json.load(open(TABLA, encoding='utf-8'))
        usados_codigo = set(t['codigos'])
        n_c = t['n']
    else:
        print('sin_usar: sin ref/ ni tools/sin_usar_codigo.json: no se puede saber qué nombra el código; no se escribe nada')
        return
    usados = usados_guion | usados_demo | usados_codigo

    def cod_de(x):
        n = x['nombre']
        r = next((n[len(st) + 1:] for st in x.get('escenarios', []) if n.startswith(st + '_')), n)
        return int(r, 16) if re.fullmatch('[0-9a-f]{4}', r) else strcode(r)
    por_st = {}
    for x in cat:
        for st in x.get('escenarios', []):
            por_st.setdefault(st, set()).add(cod_de(x))

    def familia_usada(cod, sts):
        return any((cod - k in usados and any((cod - k in por_st.get(st, ()) for st in sts)) for k in range(1, 16)))
    modelos = []
    for x in cat:
        nombre = x['nombre']
        resto = next((nombre[len(st) + 1:] for st in x.get('escenarios', []) if nombre.startswith(st + '_')), nombre)
        cod = int(resto, 16) if re.fullmatch('[0-9a-f]{4}', resto) else strcode(resto)
        if cod in usados or familia_usada(cod, x.get('escenarios', [])):
            continue
        if all((re.fullmatch('vr\\d\\d|selectvr|vrdemo', st) for st in x.get('escenarios', []) or ['?'])):
            continue
        modelos.append({'nombre': nombre, 'codigo': '%04x' % cod, 'archivo': x['archivo'], 'categoria': x['categoria'], 'escenarios': x.get('escenarios', []), 'piezas': x.get('piezas'), 'caras': x.get('caras'), 'alto': x.get('alto'), 'ancho': x.get('ancho'), 'esqueleto': x.get('esqueleto')})
    documentado = [{'titulo': 'Tres caras del códec sin llamada', 'texto': 'FACE.DAT trae tres caras que ningún TALK ni ANIM de RADIO.DAT usa: una pose más de Snake, Liquid Snake y una pose de Campbell (los nombres no están en el decomp).', 'fuente': 'docs/codec/face_dat.md §5', 'imagenes': ['codec/caras/desconocido_2089/base.png', 'codec/caras/desconocido_80d8/base.png', 'codec/caras/desconocido_bb69/base.png']}, {'titulo': 'SCN_ANIM en PHOTOGRAPH', 'texto': 'Corazones (HEART) y enojo (PUNPUN) de scn_anim.c: el actor está en el disco de VR pero ninguna sesión de fotos lo crea.', 'fuente': 'docs/vr_foto.md §5'}, {'titulo': 'Menús de desarrollo', 'texto': 'STAGE SELECT, DEMO ALL, VAR INIT, SOUND TEST y VIBRATION EDITER: en el disco 1, sin entrada en el juego normal. En el visor: DESARROLLO del título.', 'fuente': 'docs/menu/titulo_js.md §9'}]
    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    json.dump({'modelos': modelos, 'documentado': documentado, 'cuenta': {'catalogo': len(cat), 'guiones': n_guiones, 'fuentes_c': n_c, 'sin_usar': len(modelos)}}, open(SALIDA, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('sin_usar: %d de %d modelos sin usar (%d guiones, %d archivos del decomp)' % (len(modelos), len(cat), n_guiones, n_c))
    for m in modelos[:40]:
        print('  ', m['nombre'], m['categoria'], m['escenarios'][:4])
if __name__ == '__main__':
    main()
