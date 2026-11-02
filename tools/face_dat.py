# MGS web — FeniXVOID · Project Ravenlight
import argparse
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
import hashlib
import json
import os
import struct
import sys
try:
    from PIL import Image
except ImportError:
    Image = None
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
FACE_DEF = os.path.join(EXTRAIDO, 'disco1', '00_disco', 'MGS', 'FACE.DAT')
RADIO_DEF = os.path.join(EXTRAIDO, 'disco1', '00_disco', 'MGS', 'RADIO.DAT')
SALIDA_DEF = os.path.join(ASSETS, 'codec', 'caras')
SECTOR = 2048
ANCHO_BASE, ALTO_BASE = (52, 89)

def strcode(b):
    i = 0
    for c in b:
        i = (i << 5 | i >> 11) & 65535
        i = i + c & 65535
    return i
PERSONAJES_JP = {'スネーク': 'snake', 'キャンベル': 'campbell', 'ナオミ': 'naomi', 'メリル': 'meryl', 'メイリン': 'meiling', 'オタコン': 'otacon', 'マスター': 'master', 'ナスターシャ': 'nastasha', 'ウルフ': 'wolf', 'ディープスロート': 'deepthroat', 'ノイズ': 'ruido', '長官': 'houseman'}
PERSONAJES = {strcode(jp.encode('euc_jp')): (nombre, jp) for jp, nombre in PERSONAJES_JP.items()}
FRECUENCIAS = {14085: 'Campbell / Naomi', 14015: 'Meryl', 14096: 'Mei Ling', 14112: 'Otacon', 14152: 'Nastasha', 14180: 'Master Miller', 14048: 'Deepthroat (140.48)'}

def leer_grupos(d):
    grupos = []
    s = 0
    while s + 4 <= len(d):
        n = struct.unpack_from('<I', d, s)[0]
        ok = 1 <= n <= 256 and s + 4 + 12 * n <= len(d)
        caras = []
        esperado = 12 * n
        if ok:
            for i in range(n):
                tipo, codigo, tam, off = struct.unpack_from('<HHiI', d, s + 4 + 12 * i)
                if tipo not in (0, 1) or off != esperado or tam <= 0 or (s + 4 + off + tam > len(d)):
                    ok = False
                    break
                caras.append(dict(indice=i, tipo=tipo, codigo=codigo, tam=tam, abs=s + 4 + off))
                esperado = off + tam
        if not ok:
            s += SECTOR
            continue
        fin = s + 4 + esperado
        sectores = -(-(fin - s) // SECTOR)
        grupos.append(dict(indice=len(grupos), offset=s, sector=s // SECTOR, sectores=sectores, fin=fin, caras=caras))
        s = s + sectores * SECTOR
    return grupos

def leer_imagen(d, a):
    x, y, w, h = struct.unpack_from('<4B', d, a)
    px = d[a + 4:a + 4 + w * h]
    return dict(x=x, y=y, w=w, h=h, px=px)

def leer_paleta(d, a):
    return struct.unpack_from('<256H', d, a)

def leer_simple(d, a):
    p = struct.unpack_from('<8I', d, a)
    r = dict(paleta=leer_paleta(d, a + p[0]), base=leer_imagen(d, a + p[1]), ojos=[leer_imagen(d, a + q) if q else None for q in p[2:5]], boca=[leer_imagen(d, a + q) if q else None for q in p[5:8]], punteros=list(p))
    return r

def leer_completa(d, a):
    n = struct.unpack_from('<I', d, a)[0]
    cuadros = []
    for k in range(n):
        pal, img, espera, fundido = struct.unpack_from('<IIhh', d, a + 4 + 12 * k)
        if pal == 0 and img == 0:
            cuadros.append(dict(comando=espera, arg=fundido))
        else:
            cuadros.append(dict(paleta=leer_paleta(d, a + pal), imagen=leer_imagen(d, a + img), espera=espera, fundido=fundido))
    return dict(cuadros=cuadros)

def huella(anim):
    h = hashlib.md5()

    def img(i):
        h.update(bytes((i['x'], i['y'], i['w'], i['h'])))
        h.update(i['px'])
    if 'base' in anim:
        h.update(struct.pack('<256H', *anim['paleta']))
        img(anim['base'])
        for o in anim['ojos'] + anim['boca']:
            h.update(b'-' if o is None else b'+')
            if o:
                img(o)
    else:
        for q in anim['cuadros']:
            if 'comando' in q:
                h.update(struct.pack('<hh', q['comando'], q['arg']))
            else:
                h.update(struct.pack('<256Hhh', *q['paleta'], q['espera'], q['fundido']))
                img(q['imagen'])
    return h.hexdigest()

def decodificar_cara(d, cara):
    a = cara['abs']
    anim = leer_simple(d, a) if cara['tipo'] == 0 else leer_completa(d, a)
    anim['md5'] = huella(anim)
    return anim

def color15(v):
    if v == 0:
        return (0, 0, 0, 0)
    r, g, b = (v & 31, v >> 5 & 31, v >> 10 & 31)
    return (r << 3 | r >> 2, g << 3 | g >> 2, b << 3 | b >> 2, 255)

def a_rgba(img, paleta):
    tabla = [color15(v) for v in paleta]
    im = Image.new('RGBA', (img['w'], img['h']))
    im.putdata([tabla[i] for i in img['px']])
    return im

def paleta_png(paleta):
    im = Image.new('RGBA', (256, 1))
    im.putdata([color15(v) for v in paleta])
    return im

def leer_radio(dr, grupos):
    por_sector = {g['sector']: g for g in grupos}
    frags = []
    for s in range(0, len(dr) - 10):
        v = struct.unpack_from('>I', dr, s + 2)[0]
        g = por_sector.get(v & 16777215)
        if g is not None and g['sectores'] == v >> 24:
            frec = struct.unpack_from('>H', dr, s)[0]
            tam = dr[s + 9] << 8 | dr[s + 10]
            frags.append(dict(offset=s, frecuencia=frec, grupo=g['indice'], fin=s + 8 + 1 + tam))
    pares = []

    def caminar(p, fin, fr):
        tot = dr[p + 1] << 8 | dr[p + 2]
        q = p + 3
        bfin = min(p + 1 + tot, fin)
        while q + 4 <= bfin and dr[q] == 255:
            cod = dr[q + 1]
            tam = dr[q + 2] << 8 | dr[q + 3]
            cuerpo = q + 4
            if cod in (1, 3):
                pares.append((fr, cod) + struct.unpack_from('>3H', dr, cuerpo))
            elif cod == 2:
                caminar(cuerpo + 4, cuerpo + tam - 2, fr)
            q = cuerpo + tam - 2
    for i, fr in enumerate(frags):
        caminar(fr['offset'] + 8, len(dr), i)
    personajes = {p[2] for p in pares}
    vistos = set()
    for i, fr in enumerate(frags):
        g = grupos[fr['grupo']]
        codigos = {c['codigo'] for c in g['caras']}
        region = dr[fr['offset']:fr['fin']]
        j = region.find(b'\xff')
        while j >= 0:
            if j + 10 <= len(region) and region[j + 1] in (1, 3):
                ch, fc, fund = struct.unpack_from('>3H', region, j + 4)
                if ch in personajes and (fc in codigos or fc == 0):
                    vistos.add((i, region[j + 1], ch, fc, fund))
            j = region.find(b'\xff', j + 1)
    return (frags, sorted(vistos))

def nombre_personaje(ch):
    return PERSONAJES.get(ch, ('x%04x' % ch, ''))[0]

def exportar(d, grupos, frags, pares, salida, solo=None, hoja=True):
    os.makedirs(salida, exist_ok=True)
    usos = {}
    for fi, cod, ch, fc, fund in pares:
        u = usos.setdefault((grupos[frags[fi]['grupo']]['indice'], fc), dict(personajes={}, frecuencias=set(), fundidos=set()))
        u['personajes'][ch] = u['personajes'].get(ch, 0) + 1
        u['frecuencias'].add(frags[fi]['frecuencia'])
        u['fundidos'].add(fund)
    por_codigo_global = {}
    for fi, cod, ch, fc, fund in pares:
        por_codigo_global.setdefault(fc, {}).setdefault(ch, 0)
        por_codigo_global[fc][ch] += 1
    variantes = {}
    por_codigo = {}
    salida_json = dict(archivo='FACE.DAT', tamanio=len(d), grupos=[], caras={}, personajes={'0x%04x' % k: dict(nombre=v[0], jp=v[1]) for k, v in PERSONAJES.items()})
    for g in grupos:
        gj = dict(indice=g['indice'], offset=g['offset'], sector=g['sector'], sectores=g['sectores'], caras=[], frecuencias=sorted({fr['frecuencia'] for fr in frags if fr['grupo'] == g['indice']}), conversaciones=sum((1 for fr in frags if fr['grupo'] == g['indice'])))
        for c in g['caras']:
            anim = decodificar_cara(d, c)
            u = usos.get((g['indice'], c['codigo']))
            ch = max(por_codigo_global.get(c['codigo'], {0: 0}).items(), key=lambda kv: kv[1])[0]
            pers = nombre_personaje(ch) if ch else 'desconocido'
            if solo and pers not in solo:
                continue
            if anim['md5'] in variantes:
                carpeta = variantes[anim['md5']]
            else:
                n = por_codigo.get(c['codigo'], 0) + 1
                por_codigo[c['codigo']] = n
                carpeta = '%s_%04x' % (pers, c['codigo']) + ('' if n == 1 else '_v%d' % n)
                variantes[anim['md5']] = carpeta
                escribir_cara(os.path.join(salida, carpeta), c, anim, hoja)
                salida_json['caras'][carpeta] = describir(c, anim, g, pers, ch, u, carpeta)
            gj['caras'].append(dict(indice=c['indice'], codigo='0x%04x' % c['codigo'], tipo=c['tipo'], carpeta=carpeta, offset=c['abs'], tam=c['tam']))
        salida_json['grupos'].append(gj)
    salida_json['conversaciones'] = [dict(offset=f['offset'], frecuencia=f['frecuencia'], grupo=f['grupo']) for f in frags]
    with open(os.path.join(salida, 'caras.json'), 'w', encoding='utf-8') as f:
        json.dump(salida_json, f, ensure_ascii=False, indent=1)
    return salida_json

def describir(c, anim, g, pers, ch, u, carpeta):
    j = dict(codigo='0x%04x' % c['codigo'], tipo=('simple', 'completa')[c['tipo']], personaje=pers, personaje_codigo='0x%04x' % ch, grupo=g['indice'], offset=c['abs'], tam=c['tam'], md5=anim['md5'], carpeta=carpeta)
    if u:
        j['usos'] = dict(veces=sum(u['personajes'].values()), frecuencias=sorted(u['frecuencias']), fundidos=sorted(u['fundidos']))
    if c['tipo'] == 0:
        b = anim['base']
        j['base'] = dict(archivo='base.png', x=b['x'], y=b['y'], w=b['w'], h=b['h'])
        j['ojos'] = [dict(archivo='ojos_%d.png' % k, x=o['x'], y=o['y'], w=o['w'], h=o['h']) if o else None for k, o in enumerate(anim['ojos'])]
        j['boca'] = [dict(archivo='boca_%d.png' % k, x=o['x'], y=o['y'], w=o['w'], h=o['h']) if o else None for k, o in enumerate(anim['boca'])]
        j['parpadeo'] = 'ojos_0 x2 cuadros, ojos_1 x2, ojos_2 x2 (6 cuadros), disparado por el flag eye del stream'
        j['boca_regla'] = 'mouth 0 = base; 1..3 = boca_0..boca_2 (viene del track paku del VOX)'
    else:
        cu = []
        for k, q in enumerate(anim['cuadros']):
            if 'comando' in q:
                cu.append(dict(comando=('sonido_se', 'repetir')[q['comando']] if q['comando'] in (0, 1) else q['comando'], arg=q['arg']))
            else:
                im = q['imagen']
                cu.append(dict(archivo='cuadro_%02d.png' % k, paleta='paleta_%02d.png' % k, x=im['x'], y=im['y'], w=im['w'], h=im['h'], fundido=q['fundido'], espera=q['espera']))
        j['cuadros'] = cu
    return j

def escribir_cara(carpeta, c, anim, hoja):
    os.makedirs(carpeta, exist_ok=True)
    if c['tipo'] == 0:
        pal = anim['paleta']
        base = a_rgba(anim['base'], pal)
        base.save(os.path.join(carpeta, 'base.png'))
        paleta_png(pal).save(os.path.join(carpeta, 'paleta.png'))
        parches = []
        for nombre, lista in (('ojos', anim['ojos']), ('boca', anim['boca'])):
            for k, o in enumerate(lista):
                if o:
                    im = a_rgba(o, pal)
                    im.save(os.path.join(carpeta, '%s_%d.png' % (nombre, k)))
                    parches.append((o, im))
        if hoja:
            h = Image.new('RGBA', (ANCHO_BASE * (1 + len(parches)), ALTO_BASE), (0, 0, 0, 255))
            h.paste(base, (0, 0))
            for k, (o, im) in enumerate(parches):
                comp = base.copy()
                comp.paste(im, (o['x'], o['y']))
                h.paste(comp, (ANCHO_BASE * (k + 1), 0))
            h.save(os.path.join(carpeta, 'hoja.png'))
    else:
        tiras = []
        for k, q in enumerate(anim['cuadros']):
            if 'comando' in q:
                continue
            im = a_rgba(q['imagen'], q['paleta'])
            im.save(os.path.join(carpeta, 'cuadro_%02d.png' % k))
            paleta_png(q['paleta']).save(os.path.join(carpeta, 'paleta_%02d.png' % k))
            tiras.append(im)
        if hoja and tiras:
            h = Image.new('RGBA', (ANCHO_BASE * len(tiras), ALTO_BASE), (0, 0, 0, 255))
            for k, im in enumerate(tiras):
                h.paste(im, (ANCHO_BASE * k, 0))
            h.save(os.path.join(carpeta, 'hoja.png'))

def listar(d, grupos, frags, pares):
    por_codigo = {}
    for fi, cod, ch, fc, fund in pares:
        por_codigo.setdefault(fc, {}).setdefault(ch, 0)
        por_codigo[fc][ch] += 1
    print('FACE.DAT: %d bytes, %d grupos, %d caras (%d codigos distintos)' % (len(d), len(grupos), sum((len(g['caras']) for g in grupos)), len({c['codigo'] for g in grupos for c in g['caras']})))
    for g in grupos:
        frecs = sorted({f['frecuencia'] for f in frags if f['grupo'] == g['indice']})
        print('grupo %2d  off 0x%06x  sector %4d  %3d sectores  %2d caras  conversaciones %3d  frec %s' % (g['indice'], g['offset'], g['sector'], g['sectores'], len(g['caras']), sum((1 for f in frags if f['grupo'] == g['indice'])), frecs))
        for c in g['caras']:
            anim = decodificar_cara(d, c)
            usos = por_codigo.get(c['codigo'], {})
            pers = ','.join(('%s(%d)' % (nombre_personaje(k), v) for k, v in sorted(usos.items(), key=lambda kv: -kv[1])))
            if c['tipo'] == 0:
                det = 'base %dx%d ojos %d boca %d' % (anim['base']['w'], anim['base']['h'], sum((1 for o in anim['ojos'] if o)), sum((1 for o in anim['boca'] if o)))
            else:
                det = 'completa %d cuadros' % len(anim['cuadros'])
            print('   [%2d] 0x%04x  @0x%06x  %6d B  %-28s %s' % (c['indice'], c['codigo'], c['abs'], c['tam'], det, pers))

def main():
    ap = argparse.ArgumentParser(description='Exporta las caras del codec (FACE.DAT) a PNG + JSON')
    ap.add_argument('--face', default=FACE_DEF)
    ap.add_argument('--radio', default=RADIO_DEF, help='RADIO.DAT para asociar caras con personajes (vacio = no usar)')
    ap.add_argument('--salida', default=SALIDA_DEF)
    ap.add_argument('--listar', action='store_true', help='solo imprime la tabla')
    ap.add_argument('--solo', nargs='*', help='exportar solo estos personajes (snake, campbell, meiling, ...)')
    ap.add_argument('--sin-hoja', action='store_true', help='no generar hoja.png de contacto')
    a = ap.parse_args()
    d = open(a.face, 'rb').read()
    grupos = leer_grupos(d)
    frags, pares = ([], [])
    if a.radio and os.path.exists(a.radio):
        frags, pares = leer_radio(open(a.radio, 'rb').read(), grupos)
    if a.listar:
        listar(d, grupos, frags, pares)
        return
    if Image is None:
        sys.exit('hace falta Pillow (pip install pillow)')
    j = exportar(d, grupos, frags, pares, a.salida, set(a.solo) if a.solo else None, not a.sin_hoja)
    print('grupos %d, caras %d, carpetas exportadas %d, conversaciones en RADIO.DAT %d, pares TALK/ANIM %d' % (len(grupos), sum((len(g['caras']) for g in grupos)), len(j['caras']), len(frags), len(pares)))
    print('salida:', a.salida)
if __name__ == '__main__':
    main()
