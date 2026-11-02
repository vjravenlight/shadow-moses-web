# MGS web — FeniXVOID · Project Ravenlight
import os, sys, subprocess
sys.path.insert(0, os.path.dirname(__file__))
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
from export_glb import exportar as exportar_glb
from anims import exportar as exportar_anim
from pcx_mgs import decode
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
ST = os.path.join(EXTRAIDO, 'disco1', '01_stages')
OUT = os.path.join(ASSETS, 'jefes')
JEFES = {'ocelot': {'modelos': [('s04b', 'rev_gun', 'ocelot', True), ('s04b', 'ats_noc', 'baker', True), ('s04b', '04b_c4', 'c4', False)], 'anims': [('s04b', 'revolver'), ('s04b', 'shacho')], 'texturas': [('s04b', 'tama_01'), ('s04b', 'tama_02'), ('s04b', 'tama_03')], 'voces': [12502, 12553, 12605, 12626, 12652, 12666, 12698, 12507, 12509]}, 'ninja': {'modelos': [('s08b', 'nja_fist', 'ninja', True), ('s08b', 'njatrans', 'ninja_camuflado', True), ('s08b', 'katana', 'katana', False)], 'anims': [('s08b', 'nja_08b')], 'texturas': [], 'voces': [17807, 17850, 17879, 17917, 17990, 18049, 18064, 18083, 18101, 18122, 18150, 18171, 18193, 18209, 18211, 18228, 18245, 18261]}, 'tanque': {'modelos': [('s05a', 'm1e1', 'm1e1', True), ('s05a', 'm1e1cl1', 'm1e1cl1', False), ('s05a', 'm1e1cl2', 'm1e1cl2', False), ('s05a', 'm1e1cl3', 'm1e1cl3', False), ('s05a', 'm1e1cr1', 'm1e1cr1', False), ('s05a', 'm1e1cr2', 'm1e1cr2', False), ('s05a', 'm1e1cr3', 'm1e1cr3', False), ('s05a', 'm1e1shel', 'm1e1shel', False), ('s05a', 'out_c_m1', 'artillero', True), ('s05a', 'out_cold', 'artillero_muerto', True), ('s05a', 'valcan', 'raven_tanque', True)], 'anims': [('s05a', 'tankman')], 'texturas': [], 'voces': []}, 'mantis': {'modelos': [('s07b', 'psycho', 'mantis', True), ('s07b', 'psysonic', 'psysonic', False), ('s07b', '07b_o11', 'busto_roto', False)], 'anims': [('s07b', 'psycho'), ('s07b', 'psy_07b2')], 'texturas': [('s07b', 'hideo_b'), ('s07b', 'hideo_s')], 'voces': [22120, 22203, 22250, 22222, 20856, 20906, 20931, 20952, 20975, 21005, 21042, 21069, 21099, 21151, 21182, 21209, 21238, 21281, 21312, 21366, 21411, 21442, 21470, 21503, 21530, 21560, 21589, 21611, 21644, 21671, 21695, 21721, 21748, 21788, 21829, 21860, 21905, 21999, 22040, 22074, 22278, 22280, 22097]}, 'hind': {'modelos': [('s11h', 'hind', 'hind', True), ('s11h', 'hindmsil', 'hindmsil', False), ('s11i', '924a', 'hind_pasarela', True)] + [('s11h', '11h_o%d' % i, '11h_o%d' % i, False) for i in range(1, 16)], 'modelos_ruta': [('init/resident/stn_fr.kmd', 'stn_fr', False)], 'anims': [], 'texturas': [], 'voces': [86770, 86788, 86803, 86824, 86841, 86854, 86871, 86886, 86899, 86910, 86927, 86957, 86982, 86984, 86986, 86988, 87009, 87011, 87013, 87027, 87041, 87043, 87058, 87073, 87083, 87096, 87111, 87125, 38311]}, 'raven': {'modelos': [('s15a', 'barrel', 'raven_barril', True), ('s15a', 'crow', 'cuervo', True)], 'zmd': [('s15a', 'd9e2', 45599, 'raven', True)], 'anims': [('s15a', 'val_15a'), ('s15a', 'crow')], 'texturas': [], 'voces': []}}

def kmd_de_zmd(zmd_path, ident, dst):
    import struct
    d = open(zmd_path, 'rb').read()
    _, n, vo, _ = struct.unpack('<4sIII', d[:16])
    base = 16 + vo
    p = 16
    for _k in range(n):
        kid = struct.unpack('<I', d[p:p + 4])[0]
        nx = struct.unpack('<i', d[p + 8:p + 12])[0]
        largo = 32 + nx * 88
        if kid == ident:
            cab = bytearray(d[p + 4:p + 4 + largo])
            datos = d[base:]
            for m in range(nx):
                o = 32 + m * 88
                for campo in (14, 15, 17, 18, 19, 20):
                    v = struct.unpack('<i', cab[o + campo * 4:o + campo * 4 + 4])[0]
                    if v or campo == 14:
                        cab[o + campo * 4:o + campo * 4 + 4] = struct.pack('<i', v + largo)
            open(dst, 'wb').write(bytes(cab) + datos)
            return True
        p += 4 + largo
    return False

def elegidos(argv):
    pedidos = [argv[i + 1] for i, a in enumerate(argv) if a == '--jefe' and i + 1 < len(argv)]
    for p in pedidos:
        if p not in JEFES:
            sys.exit(f"jefe desconocido: {p} (hay: {', '.join(JEFES)})")
    return pedidos or list(JEFES)

def main():
    if '--listar' in sys.argv:
        for k, v in JEFES.items():
            print(k, '·', ', '.join((m[2] for m in v['modelos'])), '·', ', '.join((a[1] for a in v['anims'])), '·', len(v['voces']), 'voces')
        return
    os.makedirs(OUT, exist_ok=True)
    voces = []
    for jefe in elegidos(sys.argv):
        J = JEFES[jefe]
        for st, kmd, nombre, esq in J['modelos']:
            src = os.path.join(ST, st, 'cache', kmd + '.kmd')
            if not os.path.exists(src):
                print('falta', src)
                continue
            dst = os.path.join(OUT, nombre + '.glb')
            exportar_glb(src, dst, estatico=not esq)
            print('modelo', nombre, os.path.getsize(dst), 'bytes')
        for rel, nombre, esq in J.get('modelos_ruta', []):
            src = os.path.join(ST, *rel.split('/'))
            if not os.path.exists(src):
                print('falta', src)
                continue
            dst = os.path.join(OUT, nombre + '.glb')
            exportar_glb(src, dst, estatico=not esq)
            print('modelo', nombre, os.path.getsize(dst), 'bytes')
        for st, zmd, ident, nombre, esq in J.get('zmd', []):
            import tempfile
            src = os.path.join(ST, st, 'cache', zmd + '.zmd')
            tmp = os.path.join(tempfile.gettempdir(), f'jefes_{nombre}.kmd')
            if not os.path.exists(src) or not kmd_de_zmd(src, ident, tmp):
                print('falta', src, hex(ident))
                continue
            dst = os.path.join(OUT, nombre + '.glb')
            exportar_glb(tmp, dst, estatico=not esq)
            print('modelo', nombre, '(de', zmd + '.zmd)', os.path.getsize(dst), 'bytes')
        for st, oar in J['anims']:
            src = os.path.join(ST, st, 'cache', oar + '.oar')
            if os.path.exists(src):
                exportar_anim(src, oar)
            else:
                print('falta', src)
        for st, t in J['texturas']:
            src = os.path.join(ST, st, 'nocache', t + '.pcx')
            if os.path.exists(src):
                decode(src).save(os.path.join(OUT, t + '.png'))
                print('textura', t)
            else:
                print('falta', src)
        voces += J['voces']
    if '--sin-voces' not in sys.argv and voces:
        subprocess.run([sys.executable, os.path.join(RAIZ, 'tools', 'codec_voces.py'), '--solo', ','.join(map(str, voces))], cwd=RAIZ, check=False)
if __name__ == '__main__':
    main()
