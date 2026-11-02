# MGS web — FeniXVOID · Project Ravenlight
import os, sys, json, struct, tempfile, shutil
sys.path.insert(0, os.path.dirname(__file__))
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
import export_glb
from export_glb import exportar, strcode
from preshade import leer_lit
from anims import exportar as exportar_anim, NOMBRES_ENEMY
RAIZ = os.path.join(os.path.dirname(__file__), '..')
ST = os.path.join(EXTRAIDO, 'disco1', '01_stages')
OUT = ASSETS
FORZAR = '--forzar' in sys.argv
ESCENARIOS = ['s03a', 's03d', 's03e', 's10a', 's10ar', 's11a', 's11e', 's11i', 's14e', 's19a']
ACT_ZAKO11A = [19, 20, 10, 22, 9, 34, 35, 36, 45, 13, 12, 26, 15, 14, 16, 27, 8, 55, 19, 21, 30, 31, 32, 33, 37, 19, 19, 25, 5, 2, 42, 4, 39, 40, 6, 7, 38, 3, 41, 17, 18, 43, 23, 24, 28, 29, 0, 1, 59, 17, 18, 43, 22]
NOMBRES_ZAKO11A = NOMBRES_ENEMY + ['muerto boca abajo', 'muerto boca arriba', 'muerto cara abajo', 'apuntar (2)']

def personajes():
    hechos = []
    for st in ESCENARIOS:
        cache = os.path.join(ST, st, 'cache')
        if not os.path.isdir(cache):
            continue
        od = os.path.join(OUT, 'niveles', st)
        os.makedirs(od, exist_ok=True)
        for nombre in ('ippanhei', 'lopryhei'):
            src = os.path.join(cache, nombre + '.kmd')
            dst = os.path.join(od, nombre + '.glb')
            if not os.path.exists(src) or (os.path.exists(dst) and (not FORZAR)):
                continue
            exportar(src, dst)
            hechos.append(f'niveles/{st}/{nombre}.glb')
    return hechos

def animaciones():
    dst = os.path.join(OUT, 'anim', 'ene_11a.json')
    if os.path.exists(dst) and (not FORZAR):
        return []
    exportar_anim(os.path.join(ST, 's11a', 'cache', 'ene_11a.oar'), 'ene_11a', NOMBRES_ZAKO11A, ACT_ZAKO11A)
    return ['anim/ene_11a.json']

def partir_zmd(path, carpeta):
    d = open(path, 'rb').read()
    _, n_kmd, vert_offset, _ = struct.unpack_from('<IIII', d, 0)
    datos = d[16 + vert_offset:]
    p = 16
    out = {}
    for _ in range(n_kmd):
        kid = struct.unpack_from('<I', d, p)[0]
        cab = bytearray(d[p + 4:p + 36])
        n_x = struct.unpack_from('<i', cab, 4)[0]
        base = 32 + 88 * n_x
        mdls = bytearray()
        for m in range(n_x):
            f = list(struct.unpack_from('<22i', d, p + 36 + m * 88))
            f[14] += base
            for i in (15, 17, 18, 19, 20):
                if f[i]:
                    f[i] += base
            mdls += struct.pack('<22i', *f)
        ruta = os.path.join(carpeta, f'{kid & 65535:04x}.kmd')
        open(ruta, 'wb').write(bytes(cab) + bytes(mdls) + datos)
        out[kid & 65535] = ruta
        p += 36 + 88 * n_x
    return out
ZMD_RASEN = {'s11a': 'ca81.zmd', 's11c': 'ca83.zmd'}

def rasen():
    hechos = []
    for st, zmd in ZMD_RASEN.items():
        od = os.path.join(OUT, 'niveles', st)
        nv = json.load(open(os.path.join(od, 'nivel.json'), encoding='utf-8'))
        acts = [a for a in nv['actores'] if a['tipo'] == 'RASEN']
        act = next((a for a in acts if not a.get('evento')), acts[0] if acts else None)
        if not act:
            continue
        o = act['opts']
        hid = lambda x: x['id'] if isinstance(x, dict) else x
        ids = [hid(x) for x in o.get('o', [])]
        todos = []
        for a in acts:
            for x in a['opts'].get('o', []):
                if hid(x) not in todos:
                    todos.append(hid(x))
        tabla = [x for x in o.get('l', []) if isinstance(x, int)]
        mapas = [hid(x) for x in o.get('n', [])]
        tmp = tempfile.mkdtemp(prefix='zmd_')
        real = os.path.join(ST, st)
        orig = export_glb.indice_texturas
        export_glb.indice_texturas = lambda _sd, real=real: orig(real)
        modelos = {}
        try:
            kmds = partir_zmd(os.path.join(ST, st, 'cache', zmd), tmp)
            luz = nv.get('luz') or {}
            for h in todos:
                if h not in kmds:
                    continue
                dst = os.path.join(od, f'rasen_{h:04x}.glb')
                lit = os.path.join(ST, st, 'cache', f'{h:04x}.lit')
                if FORZAR or not os.path.exists(dst):
                    L = {'luces': leer_lit(lit) if os.path.exists(lit) else [], 'amb': tuple(luz.get('amb') or (0, 0, 0)), 'main': (tuple(luz['main'][0]), tuple(luz['main'][1])) if luz.get('main') else None, 'pos': (0, 0, 0), 'rot': 0}
                    exportar(kmds[h], dst, estatico=True, luz=L)
                    hechos.append(f'niveles/{st}/rasen_{h:04x}.glb')
                modelos['%04x' % h] = f'niveles/{st}/rasen_{h:04x}.glb'
        finally:
            export_glb.indice_texturas = orig
            shutil.rmtree(tmp, ignore_errors=True)
        piezas = [modelos.get('%04x' % h) for h in ids]
        ascensor = None
        el = next((a for a in nv['actores'] if a['tipo'] == 'RASEN_EL'), None)
        if el:
            m = hid((el['opts'].get('m') or [None])[0])
            kmd = os.path.join(ST, st, 'cache', f'{m:04x}.kmd') if isinstance(m, int) else None
            ux = uz = None
            if kmd and os.path.exists(kmd):
                _n, _nx, _lx, _ly, _lz, ux, _uy, uz = struct.unpack('<8i', open(kmd, 'rb').read(32))
            b = el['opts'].get('b') or []
            tex = hid(b[-1]) if b else 2881
            pcx = os.path.join(ST, st, 'nocache', f'{tex:04x}.pcx')
            png = None
            if os.path.exists(pcx):
                import pcx_mgs
                dst = os.path.join(od, f'rasen_el_{tex:04x}.png')
                if FORZAR or not os.path.exists(dst):
                    pcx_mgs.decode(pcx).save(dst)
                    hechos.append(f'niveles/{st}/rasen_el_{tex:04x}.png')
                png = f'niveles/{st}/rasen_el_{tex:04x}.png'
            ascensor = {'modelo': el.get('modelo'), 'ux': ux, 'uz': uz, 'textura': png, 'fuente': 'takabe/rasen_el.c RasenElGetResources_800CCB9C (piso: THING_Hzd_800C46D8; panel: s11c_800CD958)'}
        largos = {}
        for s_i, mid in enumerate(mapas):
            mp = next((x for x in nv['mapas'] if x['id'] == mid), None)
            for hj in (mp or {}).get('hzm_json', [])[:1]:
                raw_hzm = os.path.join(ST, st, 'cache', os.path.basename(hj).replace('.hzm.json', '.hzm'))
                if not os.path.exists(raw_hzm):
                    continue
                d = open(raw_hzm, 'rb').read()
                ng, pg = (struct.unpack_from('<h', d, 10)[0], struct.unpack_from('<i', d, 16)[0])
                for g in range(ng):
                    o = pg + g * 24
                    nt = struct.unpack_from('<h', d, o)[0]
                    pt = struct.unpack_from('<i', d, o + 16)[0]
                    for k in range(nt):
                        nombre = d[pt + k * 32 + 16:pt + k * 32 + 32]
                        if nombre[13] == 255:
                            continue
                        n13 = nombre[:13]
                        j = n13.find(b' ')
                        n13 = (n13[:j] if j >= 0 else n13).split(b'\x00')[0]
                        if len(n13) == 13 and all((32 <= c < 127 for c in n13)):
                            largos[f'{s_i}:{g}:{k}'] = n13.decode()
        json.dump({'mapas': mapas, 'piezas': piezas, 'tabla': tabla, 'modelos': modelos, 'paso': 4000, 'base': -32250, 'seccion': 32000, 'umbral': 16000, 'altura_snake': 1100, 'umbral_menos': 2250 if len(ids) > 10 else 0, 'ascensor': ascensor, 'trampas_largas': largos, 'fuente': f'takabe/rasen.c Rasen2GetResources_800CAC64 + RasenAct_800CB530; piezas de {zmd}'}, open(os.path.join(od, 'rasen.json'), 'w', encoding='utf-8'), indent=1)
        hechos.append(f'niveles/{st}/rasen.json')
    return hechos

def rapel():
    hechos = []
    for nombre in ('sne_11d', 'sne_11d2'):
        src = os.path.join(ST, 's11d', 'cache', nombre + '.oar')
        dst = os.path.join(OUT, 'anim', nombre + '.json')
        if not os.path.exists(src):
            continue
        if FORZAR or not os.path.exists(dst):
            exportar_anim(src, nombre)
            hechos.append(f'anim/{nombre}.json')
    return hechos
if __name__ == '__main__':
    todo = rasen() if '--rasen' in sys.argv else rapel() if '--rapel' in sys.argv else personajes() + animaciones() + rasen() + rapel()
    print(len(todo), 'archivos')
    [print('  ', x) for x in todo]
