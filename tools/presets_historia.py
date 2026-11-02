# MGS web — FeniXVOID · Project Ravenlight
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
import gcl_vm
MENUS = {'title', 'select1', 'select2', 'select3', 'select4', 'selectd', 'sound'}

def ralo(b):
    return [[i, v] for i, v in enumerate(b) if v]

def main():
    presets, _ = gcl_vm.entradas()
    vm = gcl_vm.VM(gcl_vm.leer_st('s00a'))
    salida = []
    for p in presets:
        if p['st'] in MENUS:
            continue
        vm.g[:] = p['g']
        vm.l[:] = p['l']
        c = p['carga']
        m = c.get('m') or []
        m = m[0] if m else None
        if isinstance(m, dict):
            m = m.get('id')
        pos = [x for x in (c.get('p') or [])[:3] if isinstance(x, int)]
        salida.append({'etiqueta': p['etiqueta'], 'st': p['st'], 'progreso': vm.get('$w:G000a'), 'tarjeta': vm.get('$w:L006c'), 'g': ralo(p['g']), 'l': ralo(p['l']), 'carga': {'m': m if isinstance(m, int) else None, 'p': pos if len(pos) == 3 else None}})
    dst = os.path.join(ASSETS, 'partida', 'presets.json')
    json.dump(salida, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(f'{len(salida)} presets -> {dst}')
if __name__ == '__main__':
    main()
