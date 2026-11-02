# MGS web — FeniXVOID · Project Ravenlight
import json
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
import os
import shutil
import sys
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gcx
import guion_vivo
import niveles
BASE = 200000
ST1 = os.path.join(EXTRAIDO, 'disco1', '01_stages')
ST2 = os.path.join(EXTRAIDO, 'disco2', '01_stages')
GUION = os.path.join(ASSETS, 'guion', 'st')
COPIAS = os.path.join(PRUEBAS, 'escenas2', 'guion_st')
ANTES = os.path.join(PRUEBAS, 'escenas2', 'guion_antes')
NUEVOS = ['ending', 'roll']

def mezclar(a, b, cmd='', cambios=None, ruta=''):
    if isinstance(a, dict) and isinstance(b, dict):
        c = a.get('cmd') or cmd
        if 'opt' in a:
            c = '%s -%s' % (cmd, a['opt'])
        if set(a) != set(b):
            raise ValueError('estructura distinta en %s' % ruta)
        return {k: mezclar(a[k], b[k], c, cambios, ruta + '.' + k) for k in a}
    if isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            raise ValueError('largo distinto en %s' % ruta)
        return [mezclar(x, y, cmd, cambios, '%s[%d]' % (ruta, i)) for i, (x, y) in enumerate(zip(a, b))]
    if type(a) is not type(b):
        raise ValueError('tipo distinto en %s' % ruta)
    if isinstance(a, int) and a != b and (a in (0, -1)) and isinstance(b, int) and (b > 0) and (not cmd.startswith('sound -g')):
        if cambios is not None:
            cambios.append((cmd, a, b, ruta))
        return BASE + b
    return a

def script_mezclado(st, cambios):
    p1 = os.path.join(ST1, st, 'cache', 'scenerio.gcx')
    p2 = os.path.join(ST2, st, 'cache', 'scenerio.gcx')
    s1, s2 = (_leer_original(p1), _leer_original(p2))
    if set(s1['procs']) != set(s2['procs']):
        raise ValueError('procs distintos')
    return {'main': mezclar(s1['main'], s2['main'], '', cambios, 'main'), 'procs': {k: mezclar(s1['procs'][k], s2['procs'][k], '', cambios, 'proc_%04x' % k) for k in s1['procs']}}
_leer_original = gcx.leer

def escenarios_con_huecos():
    out = []
    lista = sorted((x[:-5] for x in os.listdir(GUION) if x.endswith('.json') and x != 'indice.json'))
    for st in lista + [x for x in NUEVOS if x not in lista]:
        if not (os.path.exists(os.path.join(ST1, st, 'cache', 'scenerio.gcx')) and os.path.exists(os.path.join(ST2, st, 'cache', 'scenerio.gcx'))):
            continue
        cambios = []
        try:
            script_mezclado(st, cambios)
        except ValueError as e:
            print('%s: no se mezcla (%s)' % (st, e))
            continue
        if cambios or st in NUEVOS:
            out.append((st, cambios))
    return out

def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, ValueError):
        pass
    en_lugar = '--en-el-lugar' in sys.argv
    lista = '--lista' in sys.argv
    voces_arch = sys.argv[sys.argv.index('--voces') + 1] if '--voces' in sys.argv else None
    todos = escenarios_con_huecos()
    voces, demos = ({}, {})
    for st, cambios in todos:
        for cmd, a, b, ruta in cambios:
            if cmd.startswith('demo'):
                demos.setdefault(b, set()).add(st)
            else:
                voces.setdefault(b, set()).add('%s %s' % (st, cmd))
        if lista:
            print('== %s: %d números del disco 2' % (st, len(cambios)))
            for cmd, a, b, ruta in cambios:
                print('   %-10s %3d -> %d (%d)   %s' % (cmd, a, BASE + b, b, ruta[:80]))
    print('%d escenarios con huecos; %d demos y %d voces del disco 2' % (len(todos), len(demos), len(voces)))
    if voces_arch:
        json.dump({str(k): sorted(v) for k, v in sorted(voces.items())}, open(voces_arch, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print('voces en', voces_arch)
    if lista:
        return
    destino = GUION if en_lugar else COPIAS
    os.makedirs(destino, exist_ok=True)
    niveles.CARGAS.update(niveles.cargas_externas())
    for st, _c in todos:
        if en_lugar:
            os.makedirs(ANTES, exist_ok=True)
            orig, copia = (os.path.join(GUION, st + '.json'), os.path.join(ANTES, st + '.json'))
            if os.path.exists(orig) and (not os.path.exists(copia)):
                shutil.copy2(orig, copia)
        ruta_d1 = os.path.normcase(os.path.abspath(os.path.join(ST1, st, 'cache', 'scenerio.gcx')))
        mezcla = script_mezclado(st, [])
        gcx.leer = lambda p, _m=mezcla, _r=ruta_d1: _m if os.path.normcase(os.path.abspath(p)) == _r else _leer_original(p)
        try:
            d, _extra = guion_vivo.escenario(st, niveles.CARGAS)
        finally:
            gcx.leer = _leer_original
        s = json.dumps(d, ensure_ascii=False, separators=(',', ':'))
        open(os.path.join(destino, st + '.json'), 'w', encoding='utf-8').write(s)
        print('%-7s %6.1f KB  nivel %s  -> %s' % (st, len(s) / 1024, 'ok' if d['nivel'] else 'NO: ' + d['resumen']['nivel_motivo'], os.path.relpath(os.path.join(destino, st + '.json'), RAIZ)))
if __name__ == '__main__':
    main()
