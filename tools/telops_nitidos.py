# MGS web — FeniXVOID · Project Ravenlight
import json, os, sys, glob
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
import numpy as np
from PIL import Image, ImageDraw, ImageFont
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ASSETS = ASSETS
SALIDA = os.path.join(ASSETS, 'telops')
TEXTOS = os.path.join(RAIZ, 'tools', 'telops_textos.json')

def texturas_de_telops():
    lista = []
    for f in sorted(glob.glob(os.path.join(ASSETS, 'niveles', '*', 'nivel.json'))):
        d = json.load(open(f, encoding='utf8'))
        for a in d.get('actores', []):
            if a.get('tipo') == 'TELOP':
                for l in a.get('telop') or []:
                    if l['img'] not in lista:
                        lista.append(l['img'])
    for f in sorted(glob.glob(os.path.join(ASSETS, 'demos', '*', 'demo.json'))):
        d = json.load(open(f, encoding='utf8'))
        texs = d.get('texturas', {})

        def walk(o):
            if isinstance(o, dict):
                if o.get('n') in ('TEXT', 'TEXT2'):
                    dd = o.get('d', {})
                    for k in ('tex', 'tex2'):
                        if dd.get(k) is not None:
                            h = '%04x' % dd[k]
                            if h in texs and texs[h]['png'] not in lista:
                                lista.append(texs[h]['png'])
                for v in o.values():
                    walk(v)
            elif isinstance(o, list):
                for v in o:
                    walk(v)
        walk(d.get('efectos', []))
    return lista

def corridas(perfil, umbral):
    r, ini = ([], None)
    for i, v in enumerate(perfil):
        if v >= umbral and ini is None:
            ini = i
        if v < umbral and ini is not None:
            r.append((ini, i))
            ini = None
    if ini is not None:
        r.append((ini, len(perfil)))
    return r

def agrupar(runs, n):
    if len(runs) < n:
        return None
    if n <= 1:
        return [(runs[0][0], runs[-1][1], runs)]
    huecos = sorted(range(len(runs) - 1), key=lambda i: -(runs[i + 1][0] - runs[i][1]))[:n - 1]
    cortes = sorted(huecos)
    grupos, ini = ([], 0)
    for c in cortes + [len(runs) - 1]:
        g = runs[ini:c + 1]
        grupos.append((g[0][0], g[-1][1], g))
        ini = c + 1
    return grupos

def borde(perfil, i, umbral, lado):
    v = perfil[i]
    j = i - 1 if lado == 'izq' else i + 1
    p = perfil[j] if 0 <= j < len(perfil) else 0.0
    t = (umbral - p) / (v - p) if v != p else 1.0
    t = min(1.0, max(0.0, t))
    return i - 1 + t + 0.5 if lado == 'izq' else i + 1 - t + 0.5

def medir(png, texto):
    im = np.asarray(Image.open(os.path.join(ASSETS, png)).convert('RGBA')).astype(np.float64)
    lum = im[:, :, :3].mean(2) * im[:, :, 3] / 255.0
    tope = lum.max()
    umbral = tope * 0.5
    yy, xx = np.unravel_index(np.argmax(lum), lum.shape)
    color = [int(round(v)) for v in im[yy, xx, :3]]
    renglones = texto.split('\n')
    filas = corridas(lum.max(1), umbral)
    suma = (lum >= umbral).sum(1)
    while len(filas) < len(renglones):
        i = max(range(len(filas)), key=lambda j: filas[j][1] - filas[j][0])
        a, b = filas[i]
        if b - a < 6:
            break
        c = min(range(a + 3, b - 2), key=lambda y: (suma[y], -abs(y - (a + b) / 2)))
        filas[i:i + 1] = [(a, c), (c + 1, b)] if suma[c] else [(a, c), (c + 1, b)]
    grupos = agrupar(filas, len(renglones))
    if not grupos:
        raise ValueError(f'{png}: {len(filas)} filas con tinta para {len(renglones)} renglones')
    L = []
    for (y0, y1, _), renglon in zip(grupos, renglones):
        palabras = renglon.split()
        sub = lum[y0:y1]
        cols = sub.max(0)
        g = agrupar(corridas(cols, umbral), len(palabras))
        if not g:
            raise ValueError(f'{png}: renglón "{renglon}" sin {len(palabras)} palabras separables')
        bajos = []
        for c in range(sub.shape[1]):
            k = np.nonzero(sub[:, c] >= umbral)[0]
            if len(k):
                bajos.append(int(k[-1]))
        fondo = int(np.bincount(bajos).argmax()) if any((c in 'gjpqy(),;' for c in renglon)) else max(bajos)
        perfil_v = sub[:, [c for c in range(sub.shape[1]) if cols[c] >= umbral]].max(1)
        base = y0 + borde(perfil_v, fondo, umbral, 'der')
        P = []
        for (a, b, _), pal in zip(g, palabras):
            x0 = borde(cols, a, umbral, 'izq')
            x1 = borde(cols, b - 1, umbral, 'der')
            pv = sub[:, a:b].max(1)
            k = np.nonzero(pv >= umbral)[0]
            top = y0 + borde(pv, int(k[0]), umbral, 'izq')
            P.append([pal, round(x0, 2), round(x1, 2), round(top, 2)])
        L.append({'b': round(base, 2), 'p': P})
    return {'w': im.shape[1], 'h': im.shape[0], 'c': color, 'L': L}

def agrandar(png, k=4):
    im = np.asarray(Image.open(os.path.join(ASSETS, png)).convert('RGBA')).astype(np.float32) / 255.0
    a = im[:, :, 3:4]
    pre = np.concatenate([im[:, :, :3] * a, a], 2)
    W, H = (im.shape[1] * k, im.shape[0] * k)
    capas = [np.asarray(Image.fromarray(pre[:, :, i]).resize((W, H), Image.LANCZOS)) for i in range(4)]
    pre = np.clip(np.stack(capas, 2), 0, 1)
    a2 = pre[:, :, 3:4]
    af = np.clip((a2 - 0.5) * 1.35 + 0.5, 0, 1)
    rgb = np.where(a2 > 0.0001, pre[:, :, :3] / np.maximum(a2, 0.0001), 0)
    out = np.concatenate([np.clip(rgb, 0, 1), af], 2)
    dst = os.path.join(SALIDA, 'x4', png)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    Image.fromarray((out * 255 + 0.5).astype(np.uint8)).save(dst, optimize=True)
    return dst

def hoja(datos, lista, salida, fuente='C:/Windows/Fonts/arialbd.ttf'):
    K = 4
    filas = []
    for png in lista:
        e = datos.get(png)
        if not isinstance(e, dict) or 'L' not in e:
            continue
        org = Image.open(os.path.join(ASSETS, png)).convert('RGBA')
        a = Image.new('RGBA', (org.width * K, org.height * K), (40, 60, 80, 255))
        a.alpha_composite(org.resize(a.size, Image.NEAREST))
        b = Image.new('RGBA', a.size, (40, 60, 80, 255))
        for ren in e['L']:
            for pal, x0, x1, top in ren['p']:
                f = ImageFont.truetype(fuente, 200)
                bb = f.getbbox(pal, anchor='ls')
                fs = 200 * (ren['b'] - top) * K / max(1, -bb[1])
                f = ImageFont.truetype(fuente, max(4, int(round(fs))))
                bb = f.getbbox(pal, anchor='ls')
                w, h = (bb[2] - bb[0], bb[3] - bb[1])
                t = Image.new('RGBA', (max(1, w), max(1, h)), (0, 0, 0, 0))
                ImageDraw.Draw(t).text((-bb[0], -bb[1]), pal, font=f, fill=tuple(e['c']) + (255,), anchor='ls')
                tw = max(1, int(round((x1 - x0) * K)))
                t = t.resize((tw, t.height), Image.LANCZOS)
                b.alpha_composite(t, (int(round(x0 * K)), int(round(ren['b'] * K + bb[1]))))
        c = Image.new('RGBA', (a.width, a.height * 2 + 6), (0, 0, 0, 255))
        c.alpha_composite(a, (0, 0))
        c.alpha_composite(b, (0, a.height + 6))
        filas.append(c)
    if not filas:
        return
    W = max((f.width for f in filas))
    H = sum((f.height + 10 for f in filas))
    out = Image.new('RGBA', (W, H), (0, 0, 0, 255))
    y = 0
    for f in filas:
        out.alpha_composite(f, (0, y))
        y += f.height + 10
    out.save(salida)
    print('hoja ->', salida)

def main():
    textos = json.load(open(TEXTOS, encoding='utf8'))
    lista = texturas_de_telops()
    os.makedirs(SALIDA, exist_ok=True)
    datos, n_txt, n_img, faltan = ({}, 0, 0, [])
    for png in lista:
        t = textos.get(png)
        if isinstance(t, str) and t.strip():
            try:
                datos[png] = medir(png, t)
                n_txt += 1
                continue
            except ValueError as e:
                print('  sin medidas, va como imagen:', e)
        elif t is None:
            faltan.append(png)
        agrandar(png)
        n_img += 1
        datos[png] = {'x4': True, **({'sombra': True} if isinstance(t, dict) and t.get('sombra') else {})}
    json.dump(datos, open(os.path.join(SALIDA, 'textos.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    print(f'{len(lista)} texturas: {n_txt} como texto, {n_img} agrandadas x4 -> {SALIDA}')
    if faltan:
        print('sin transcribir (agregar a tools/telops_textos.json):', ', '.join(faltan))
    if '--hoja' in sys.argv:
        hoja(datos, lista, sys.argv[sys.argv.index('--hoja') + 1])
if __name__ == '__main__':
    main()
