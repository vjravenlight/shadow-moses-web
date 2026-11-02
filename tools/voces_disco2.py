# MGS web — FeniXVOID · Project Ravenlight
import json
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
import os
import shutil
import subprocess
import sys
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import guion_disco2
BASE = 200000
VOX = os.path.join(ASSETS, 'codec', 'vox')
LLAMADAS = os.path.join(ASSETS, 'codec', 'llamadas')
RADIO = os.path.join(ASSETS, 'codec', 'radio.json')
ANTES = os.path.join(PRUEBAS, 'escenas2', 'llamadas_antes')

def voces_de(evs, out):
    for e in evs or []:
        if e.get('tipo') == 'voz':
            out[e['off']] = e
        voces_de(e.get('eventos'), out)
        for r in e.get('ramas', []) or []:
            voces_de(r.get('eventos'), out)
        for r in e.get('casos', []) or []:
            voces_de(r.get('eventos'), out)

def voces_codec():
    r = json.load(open(RADIO, encoding='utf-8'))
    out = {}
    for ll in r['calls']:
        vs = {}
        voces_de(ll['eventos'], vs)
        for off, e in vs.items():
            if e.get('vox') == 0 and (e.get('vox_disco2') or 0) > 0:
                out[off] = e['vox_disco2']
    return out

def voces_guion():
    vs = {}
    for st, cambios in guion_disco2.escenarios_con_huecos():
        for cmd, a, b, ruta in cambios:
            if not cmd.startswith('demo'):
                vs.setdefault(b, set()).add('%s %s' % (st, cmd))
    return vs

def enganchar_llamadas(por_off):
    cambiadas, voces = (0, 0)
    for f in sorted(os.listdir(LLAMADAS)):
        if not f.endswith('.json'):
            continue
        p = os.path.join(LLAMADAS, f)
        d = json.load(open(p, encoding='utf-8'))
        n = [0]

        def cambiar(x):
            if isinstance(x, dict):
                if x.get('tipo') == 'voz' and x.get('vox') == 0 and (x.get('off') in por_off):
                    x['vox'] = BASE + por_off[x['off']]
                    x['vox_disco'] = 2
                    n[0] += 1
                for v in x.values():
                    cambiar(v)
            elif isinstance(x, list):
                for v in x:
                    cambiar(v)
        cambiar(d)
        if n[0]:
            os.makedirs(ANTES, exist_ok=True)
            copia = os.path.join(ANTES, f)
            if not os.path.exists(copia):
                shutil.copy2(p, copia)
            json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
            cambiadas += 1
            voces += n[0]
    return (cambiadas, voces)

def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, ValueError):
        pass
    forzar = '--forzar' in sys.argv
    vg = voces_guion()
    vc = voces_codec()
    ids = sorted(set(vg) | set(vc.values()))
    falta = [i for i in ids if forzar or not (os.path.exists(os.path.join(VOX, '%d.m4a' % (BASE + i))) and os.path.exists(os.path.join(VOX, '%d.json' % (BASE + i))))]
    print('voces del disco 2: %d de los scripts, %d del códec (%d voces de llamadas), %d en total, faltan %d' % (len(vg), len(set(vc.values())), len(vc), len(ids), len(falta)))
    if '--lista' in sys.argv:
        for i in sorted(vg):
            print('  %6d -> %d  %s' % (i, BASE + i, ', '.join(sorted(vg[i]))))
        return
    for k in range(0, len(falta), 60):
        lote = falta[k:k + 60]
        cmd = [sys.executable, os.path.join(RAIZ, 'tools', 'codec_voces.py'), '--disco', '2', '--solo', ','.join(map(str, lote))]
        if forzar:
            cmd.append('--forzar')
        subprocess.run(cmd, cwd=RAIZ, check=True)
    cambiadas, voces = enganchar_llamadas(vc)
    print('llamadas enganchadas: %d archivos, %d voces (vox 0 -> 2xxxxx)' % (cambiadas, voces))
if __name__ == '__main__':
    main()
