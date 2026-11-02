# MGS web — FeniXVOID · Project Ravenlight
import os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
from oar import leer
RAIZ = os.path.join(os.path.dirname(__file__), '..')
ST = os.path.join(EXTRAIDO, 'disco1', '01_stages')
OUT = os.path.join(ASSETS, 'anim')
ACT_ENEMY = [19, 20, 10, 22, 9, 34, 35, 36, 45, 13, 12, 26, 15, 14, 16, 27, 8, 46, 50, 21, 30, 31, 32, 33, 37, 52, 53, 25, 5, 2, 42, 4, 39, 40, 6, 7, 38, 3, 41, 17, 18, 43, 23, 24, 28, 29, 0, 1, 51]
NOMBRES_ENEMY = ['parado', 'caminar', 'correr', 'apuntar', 'disparar', 'apuntar agachado', 'disparar agachado', 'granada', 'culatazo', 'mirar a la derecha', 'mirar a la izquierda', 'mirar abajo', 'agachado mirando', 'agachado mirando a la derecha', 'mirar arriba', 'golpe de frente', 'golpe de atrás', 'patada a la caja', 'pose caja', 'estirarse', 'dormirse parado', 'despertarse', 'hablar por radio', 'frotarse el cuello', 'estornudar', 'pose I', 'pose I 2', 'agarrado por Snake', 'antes del quiebre de cuello', 'quiebre de cuello', 'caer al piso', 'dado vuelta', 'cubrirse los ojos', 'forcejear agarrado', 'caer rápido', 'empujado atrás', 'empujado adelante', 'quiebre de cuello (adelante)', 'convulsión', 'en el piso boca abajo', 'en el piso boca arriba', 'en el piso cara abajo', 'caer de cara y levantarse', 'caer de espaldas y levantarse', 'levantarse de golpe (boca abajo)', 'levantarse de golpe (de espaldas)', 'recién caído boca abajo', 'recién caído boca arriba', 'arrastrado agarrado']
CICLICAS_ENEMY = {19, 20, 10, 22, 34, 13, 12, 26, 15, 14, 16, 30, 25, 40, 17, 18, 43, 51}

def exportar(src, nombre, nombres=None, tabla=None, ciclicas=()):
    r = leer(src, ciclicas)
    clips = {}
    idxs = tabla if tabla else list(range(len(r['motions'])))
    for k, mi in enumerate(idxs):
        if mi >= len(r['motions']):
            continue
        m = r['motions'][mi]
        clave = nombres[k] if nombres and k < len(nombres) else f'anim {mi}'
        if clave in clips:
            continue
        clips[clave] = {'n': mi, 'cuadros': len(m['cuadros']), 'rot': [v for c in m['cuadros'] for h in c for v in h], 'altura': m['altura'], 'paso': [v for p in m['paso'] for v in p]}
        if mi in ciclicas:
            clips[clave]['ciclo'] = True
    os.makedirs(OUT, exist_ok=True)
    json.dump({'huesos': r['n_joint'], 'fps': 30, 'clips': clips}, open(os.path.join(OUT, nombre + '.json'), 'w'), separators=(',', ':'))
    print(nombre, len(clips), 'clips')
if __name__ == '__main__':
    solo = sys.argv[1] if len(sys.argv) > 1 else None
    if solo == 'escenarios':
        import glob
        hashes = set()

        def buscar(o):
            if isinstance(o, dict):
                if o.get('tipo') == 'SNAKE':
                    for a in o.get('args', []):
                        if isinstance(a, dict) and a.get('opt') == 'o':
                            hashes.update(('%04x' % v['id'] for v in a['v'] if isinstance(v, dict) and 'id' in v))
                for v in o.values():
                    buscar(v)
            elif isinstance(o, list):
                for v in o:
                    buscar(v)
        for g in glob.glob(os.path.join(ASSETS, 'guion', 'st', '*.json')):
            buscar(json.load(open(g, encoding='utf-8')))
        for g in glob.glob(os.path.join(ASSETS, 'niveles', '*', 'nivel.json')):
            for x in json.load(open(g, encoding='utf-8')).get('actores', []):
                if x.get('tipo') == 'SNAKE':
                    hashes.update(('%04x' % v['id'] for v in (x.get('opts') or {}).get('o', []) if isinstance(v, dict) and 'id' in v))
        for h in sorted(hashes):
            fs = sorted(glob.glob(os.path.join(EXTRAIDO, 'disco*', '01_stages', '*', 'cache', h + '.oar')))
            if fs:
                exportar(fs[0], 'snake_' + h)
            else:
                print('snake_' + h, 'no está en el disco (s17a / s19a: quedan los motions comunes)')
        sys.exit(0)
    if solo in (None, 'enemy'):
        exportar(os.path.join(ST, 's00a', 'cache', 'enemy.oar'), 'enemy', NOMBRES_ENEMY, ACT_ENEMY, CICLICAS_ENEMY)
    if solo == 'enemy':
        sys.exit(0)
    exportar(os.path.join(ST, 'init', 'resident', 'snake.oar'), 'snake', ciclicas={0, 2, 10, 11, 12, 13, 15, 16, 17, 18, 19, 22, 23, 24, 27, 28, 29, 30, 73, 75, 79, 80, 92, 93, 97, 98, 101, 104})
