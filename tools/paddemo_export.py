# MGS web — FeniXVOID · Project Ravenlight
import json, os, re, struct, subprocess, sys
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
DISCO = sys.argv[1] if len(sys.argv) > 1 else 'disco1'
BASE = os.path.join(EXTRAIDO, DISCO, '01_stages')
SALIDA = os.path.join(ASSETS, 'guion', 'paddemo')

def leer_crv(ruta):
    d = open(ruta, 'rb').read()
    w = struct.unpack('<%dH' % (len(d) // 2), d[:len(d) // 2 * 2])
    i, pasos, total = (2, [], 0)
    while i < len(w):
        s = w[i]
        i += 1
        n = 1
        if s & 512:
            n = w[i]
            i += 1
        pasos.append([s & ~512, n])
        total += n
        if s & 2048:
            break
    return (pasos, total)

def main():
    os.makedirs(SALIDA, exist_ok=True)
    hechos = []
    for st in sorted(os.listdir(BASE)):
        gcx = os.path.join(BASE, st, 'cache', 'scenerio.gcx')
        if not os.path.isfile(gcx):
            continue
        txt = subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'gcx.py'), gcx], capture_output=True, text=True, encoding='utf-8', errors='replace').stdout
        for m in re.finditer('chara PADDEMO \\S+ -d #([0-9a-f]{4})([^\\n]*)', txt):
            h = m.group(1)
            crv = os.path.join(BASE, st, 'cache', h + '.crv')
            if not os.path.isfile(crv):
                print('falta', crv)
                continue
            pasos, total = leer_crv(crv)
            dst = os.path.join(SALIDA, '%s_%s.json' % (st, h))
            json.dump({'st': st, 'archivo': h + '.crv', 'opciones': m.group(2).strip(), 'total': total, 'pasos': pasos}, open(dst, 'w', encoding='utf-8'), separators=(',', ':'))
            hechos.append((st, h, total))
    for st, h, total in hechos:
        print('%s #%s: %d cuadros (%.1f s)' % (st, h, total, total / 30))
if __name__ == '__main__':
    main()
