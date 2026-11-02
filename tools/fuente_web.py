# MGS web — FeniXVOID · Project Ravenlight
import os, sys, numpy as np
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
from PIL import Image
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
RAIZ = os.path.join(os.path.dirname(__file__), '..')
HUD = os.path.join(ASSETS, 'hud')
PX = 100

def mascara(png):
    return np.array(Image.open(png).convert('RGBA'))[:, :, 3] > 0

def glifo(m, x, y, w, h):
    pen = TTGlyphPen(None)
    sub = m[y:y + h, x:x + w]
    vacio = True
    for r in range(h):
        for c in range(w):
            if sub[r, c]:
                vacio = False
                x0, y0 = (c * PX, (h - 1 - r) * PX)
                pen.moveTo((x0, y0))
                pen.lineTo((x0, y0 + PX))
                pen.lineTo((x0 + PX, y0 + PX))
                pen.lineTo((x0 + PX, y0))
                pen.closePath()
    return pen.glyph()

def armar(nombre, celdas, alto, avance, salida):
    orden = ['.notdef', 'space'] + [f'g{ord(c):04x}' for c in celdas]
    fb = FontBuilder(alto * PX + 300, isTTF=True)
    fb.setupGlyphOrder(orden)
    cmap = {32: 'space'}
    glyphs = {'.notdef': TTGlyphPen(None).glyph(), 'space': TTGlyphPen(None).glyph()}
    metrics = {'.notdef': (avance * PX, 0), 'space': (avance * PX, 0)}
    for c, (m, x, y, w, h, av) in celdas.items():
        g = f'g{ord(c):04x}'
        glyphs[g] = glifo(m, x, y, w, h)
        metrics[g] = ((av or avance) * PX, 0)
        cmap[ord(c)] = g
        for extra in {c.lower(), *{'A': 'ÁÀÄáàä', 'E': 'ÉÈËéèë', 'I': 'ÍÌÏíìï', 'O': 'ÓÒÖóòö', 'U': 'ÚÙÜúùü', 'N': 'Ññ'}.get(c, '')}:
            if extra and ord(extra) not in cmap:
                cmap[ord(extra)] = g
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=(alto + 1) * PX, descent=-2 * PX)
    fb.setupNameTable({'familyName': nombre, 'styleName': 'Regular'})
    fb.setupOS2(sTypoAscender=(alto + 1) * PX, sTypoDescender=-2 * PX, usWinAscent=(alto + 1) * PX, usWinDescent=2 * PX)
    fb.setupPost()
    fb.font.flavor = 'woff'
    fb.save(salida)
    print(nombre, len(celdas), 'glifos ->', salida)
n = mascara(os.path.join(HUD, 'num.png'))
c1 = {}
for k in range(10):
    c1[str(k)] = (n, k * 6, 0, 5, 5, None)
for k in range(26):
    c1[chr(65 + k)] = (n, k * 6, 5, 5, 5, 4 if chr(65 + k) == 'I' else None)
SIGNOS = {'.': (10, 3), '·': (11, 3), ',': (11, 3), ':': (12, 3), '-': (13, 5), '!': (14, 3), '?': (15, 6), '+': (16, 6), '_': (17, 6), '=': (18, 6), '%': (19, 6), '[': (20, 4), '(': (20, 4), ']': (21, 4), ')': (21, 4), '□': (22, 6), '△': (23, 6)}
for ch, (k, av) in SIGNOS.items():
    c1[ch] = (n, k * 6, 0, 5, 5, av)
armar('MGS', c1, 5, 6, os.path.join(HUD, 'mgs.woff'))
f = mascara(os.path.join(HUD, 'fuente.png'))
c2 = {}
for k in range(26):
    c2[chr(65 + k)] = (f, k * 8, 0, 8, 6, 5 if chr(65 + k) == 'I' else None)
for k in range(10):
    c2[str(k)] = (f, k * 8, 6, 8, 6, None)
armar('MGS8', c2, 6, 8, os.path.join(HUD, 'mgs8.woff'))
