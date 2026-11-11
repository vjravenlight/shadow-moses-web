# MGS web — FeniXVOID · Project Ravenlight
import sys, os, re, json, struct, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS
ST = os.path.join(EXTRAIDO, 'vr_usa', '01_stages')
SALIDA = os.path.join(ASSETS, 'vr', 'disco', 'demos_titulo.json')

def leer_crv2(ruta):
    d = open(ruta, 'rb').read()
    w = struct.unpack('<%dH' % (len(d) // 2), d[:len(d) // 2 * 2])
    i, pasos = (4, [])
    while i < len(w):
        s = w[i]
        i += 1
        if s & 1024:
            i += 1
        n = 1
        if s & 512:
            n = w[i]
            i += 1
        pasos.append([s & 63743, n])
        if s & 256:
            break
    return {'semilla': w[2], 'pasos': pasos}

def texto_gcx(st):
    g = os.path.join(ST, st, 'cache', 'scenerio.gcx')
    return subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'gcx.py'), g], capture_output=True, text=True, encoding='utf-8', errors='replace').stdout

def proc(txt, pid):
    m = re.search('^### proc_%s\\n(.*?)(?=^### |\\Z)' % pid, txt, re.S | re.M)
    return m.group(1) if m else ''

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    if not os.path.isdir(os.path.join(ST, 'vrtitle')):
        print('vr_demos_titulo: sin el disco de VR extraído: no se hace nada')
        return
    t = texto_gcx('vrtitle')
    c494 = proc(t, 'c494')
    pids = re.findall('^\\s*proc_([0-9a-f]{4})\\s*$', c494, re.M)[:16]
    cat = json.load(open(os.path.join(ASSETS, 'vr', 'disco', 'catalogo.json'), encoding='utf-8'))
    claves = {m['clave'] for m in cat.get('misiones', [])}
    out = []
    for k, pid in enumerate(pids):
        b = proc(t, pid)
        modo = re.search('\\$b:G0002 (\\d+) op20', b)
        sala = re.search('\\$w:G0004 (\\d+) op20', b)
        st = re.search('load "([^"]+)"', b)
        if not (modo and sala and st):
            print('  demo', k, 'proc', pid, ': no se entiende')
            continue
        st = st.group(1)
        clave = '%s_%s_%s' % (st, modo.group(1), sala.group(1))
        crv = os.path.join(ST, st, 'cache', '9563.crv')
        if not os.path.exists(crv):
            print('  demo', k, st, ': sin 9563.crv')
            continue
        g = leer_crv2(crv)
        if clave not in claves:
            clave = next((c for c in sorted(claves) if c.startswith(clave + '_')), None) or clave
        e = {'n': k, 'clave': clave if clave in claves else None, 'st': st, 'modo': int(modo.group(1)), 'sala': int(sala.group(1)), 'semilla': g['semilla'], 'pasos': g['pasos']}
        out.append(e)
        print('  demo %2d: %-18s %s pasos %d, %d cuadros (%.1f s)' % (k, clave, '' if e['clave'] else '(no está en el catálogo)', len(e['pasos']), sum((p[1] for p in e['pasos'])), sum((p[1] for p in e['pasos'])) / 30))
    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    json.dump(out, open(SALIDA, 'w', encoding='utf-8'), separators=(',', ':'))
    print('vr_demos_titulo: %d demos' % len(out))
if __name__ == '__main__':
    main()
