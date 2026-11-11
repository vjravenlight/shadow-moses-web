# MGS web — FeniXVOID · Project Ravenlight
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rutas import ASSETS
import gcl_vm as G
import gcx
SALIDA = os.path.join(ASSETS, 'extras', 'desarrollo.json')
MENUS = ('select', 'select1', 'select2', 'select3', 'select4', 'selectd')

def pares(lista_cmd):
    out = []
    for x in lista_cmd:
        if x.get('cmd') == 'chara' and gcx.CHARAS.get(x['args'][0].get('id'), {}).get('nombre') == 'STAGESELECT':
            for o in x['args']:
                if isinstance(o, dict) and o.get('opt') == 's':
                    v = o['v']
                    out += [(v[i]['str'], v[i + 1]['proc']) for i in range(0, len(v) - 1, 2) if isinstance(v[i], dict) and 'str' in v[i] and isinstance(v[i + 1], dict) and ('proc' in v[i + 1])]
    return out

def tiene_chara(lista_cmd, nombre):
    return any((x.get('cmd') == 'chara' and gcx.CHARAS.get(x['args'][0].get('id'), {}).get('nombre') == nombre for x in lista_cmd))

def no_cero(b):
    return [[i, v] for i, v in enumerate(b) if v]
SCRIPTS = {}

def script(st):
    if st not in SCRIPTS:
        SCRIPTS[st] = G.leer_st(st)
    return SCRIPTS[st]

def menu_de(st):
    return [nodo(st, t, p, base_de(st)) for t, p in pares(script(st)['main'])]
BASE = {}

def base_de(st):
    return BASE.get(st)

def nodo(st, texto, pid, base, prof=0):
    sc = script(st)
    if texto == 'RETURN':
        return {'texto': texto, 'tipo': 'volver'}
    cuerpo = sc['procs'].get(pid, [])
    sub = pares(cuerpo)
    if sub and prof < 4:
        return {'texto': texto, 'tipo': 'menu', 'hijos': [nodo(st, t, p, base, prof + 1) for t, p in sub]}
    if tiene_chara(cuerpo, 'VIBEDITOR'):
        return {'texto': texto, 'tipo': 'vib'}
    vm = G._correr_menu(sc, pid, base)
    if not vm:
        return {'texto': texto, 'tipo': 'nada'}
    c = vm.cargas[-1]
    a = c['a']
    if a == 'title':
        return {'texto': texto, 'tipo': 'titulo'}
    if a == 'sound':
        return {'texto': texto, 'tipo': 'sonido'}
    if a in MENUS:
        if a == 'select':
            return {'texto': texto, 'tipo': 'volver'}
        if prof >= 4:
            return {'texto': texto, 'tipo': 'nada'}
        return {'texto': texto, 'tipo': 'menu', 'st': a, 'hijos': [nodo(a, t, p, base_de(a), prof + 1) for t, p in pares(script(a)['main'])]}
    if st == 'selectd' and a == 'opening' or st == 'selectd':
        return {'texto': texto, 'tipo': 'demo', 'dmo': texto.lower() + '.dmo'}
    ids = lambda L: [x.get('id') if isinstance(x, dict) else x for x in L or []]
    return {'texto': texto, 'tipo': 'carga', 'st': a, 'm': ids(c.get('m')), 'p': ids(c.get('p')), 'g': no_cero(vm.g), 'l': no_cero(vm.l)}

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    try:
        script('select')
    except Exception as e:
        print('desarrollo: sin el escenario select del disco 1 (%s): no se hace nada' % e)
        return
    presets, _ = G.entradas()
    if presets:
        p0 = presets[0]
        for st in ('select1', 'select2', 'select3', 'select4'):
            BASE[st] = (bytearray(p0['g']), bytearray(p0['l']))
    raiz = menu_de('select')
    sonido = []
    try:
        for x in script('sound')['main']:
            if x.get('cmd') == 'chara' and gcx.CHARAS.get(x['args'][0].get('id'), {}).get('nombre') == 'SOUNDTEST':
                for o in x['args']:
                    if isinstance(o, dict) and o.get('opt') == 's':
                        v = o['v']
                        sonido = [[v[i]['str'], v[i + 1]] for i in range(0, len(v) - 1, 2) if isinstance(v[i], dict) and 'str' in v[i] and isinstance(v[i + 1], int)]
    except Exception as e:
        print('desarrollo: sin el SOUNDTEST', e)
    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    json.dump({'raiz': raiz, 'sonido': sonido}, open(SALIDA, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    cuenta = {}

    def contar(L):
        for n in L:
            cuenta[n['tipo']] = cuenta.get(n['tipo'], 0) + 1
            contar(n.get('hijos', []))
    contar(raiz)
    print('desarrollo:', ', '.join(('%s %d' % kv for kv in sorted(cuenta.items()))), '· sound test %d voces' % len(sonido), '·', os.path.getsize(SALIDA) // 1024, 'KB')
if __name__ == '__main__':
    main()
