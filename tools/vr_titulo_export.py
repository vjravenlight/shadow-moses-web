# MGS web — FeniXVOID · Project Ravenlight
import os, sys, json, glob, hashlib, shutil, struct
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS
from pcx_mgs import decode, modo_semi
import gcx
ST = os.path.join(EXTRAIDO, 'vr_usa', '01_stages')
ORIGEN = os.path.join(ST, 'vrtitle')
OUT = os.path.join(ASSETS, 'vr', 'disco')
DESTINO = os.path.join(OUT, 'titulo')
NOMBRES = ['d3_op_title', 'd3_title_vrdisc', 'd3_title_allrights', 'd3_title_nja1', 'd3_title_nja2', 'op_snake_waku2', 'd3_title_vr', 'd3_title_special', 'd3_title_option', 'd3_sp_backl', 'd3_sp_backr', 'd3_sp_special_head', 'd3_sp_movie', 'd3_sp_photo', 'd3_sp_album', 'd3_sp_Pocket', 'pal_sp_photo_n1', 'pal_sp_photo_n2', 'pal_sp_photo_ml']
H_VRTITLE, H_ELEGIR_MODELO = (22119, 15736)

def textos_chara(script, h):
    res = []

    def ver(b):
        for x in b:
            if not isinstance(x, dict):
                continue
            if x.get('cmd') == 'chara' and x['args'] and (x['args'][0].get('id') == h):
                for a in x['args']:
                    if isinstance(a, dict) and a.get('opt') == 't':
                        res.append([v.get('str', '') for v in a['v'] if isinstance(v, dict)])
            for k in ('bloque', 'si', 'sino', 'b', 'e', 'i'):
                if isinstance(x.get(k), list):
                    ver(x[k])
    ver(script['main'])
    for b in script['procs'].values():
        ver(b)
    return res[0] if res else []

def sonido():
    od = os.path.join(OUT, 'sonido')
    out = {'bancos': [], 'mdx': None, 'efx': None}
    for f in sorted(glob.glob(os.path.join(ORIGEN, 'sound', '*.*'))):
        ext = f.rsplit('.', 1)[1]
        if ext not in ('wvx', 'mdx', 'efx'):
            continue
        n = '%s_%s' % (os.path.basename(f).rsplit('.', 1)[0], hashlib.md5(open(f, 'rb').read()).hexdigest()[:6])
        os.makedirs(od, exist_ok=True)
        dst = os.path.join(od, n + '.' + ext)
        if not os.path.exists(dst):
            shutil.copyfile(f, dst)
        if ext == 'wvx':
            out['bancos'].append(n)
        else:
            out[ext] = n
    return out

def exportar():
    nocache = os.path.join(ORIGEN, 'nocache')
    if not os.path.isdir(nocache):
        print('vr_titulo_export: no está vrtitle del disco de VR (extraido/vr_usa/01_stages): no hay nada que exportar')
        return None
    os.makedirs(DESTINO, exist_ok=True)
    tex = {}
    for f in sorted(os.listdir(nocache)):
        if not f.lower().endswith('.pcx'):
            continue
        n = f[:-4]
        ruta = os.path.join(nocache, f)
        im = decode(ruta)
        im.save(os.path.join(DESTINO, n + '.png'))
        flag = struct.unpack('<H', open(ruta, 'rb').read(88)[76:78])[0]
        tex[n] = {'png': n + '.png', 'ancho': im.width, 'alto': im.height, 'bpp': 8 if flag & 1 else 4, 'semi': modo_semi(ruta)}
    nombres = {}
    for n in NOMBRES:
        h = '%04x' % gcx.strcode(n)
        if h in tex:
            nombres[n] = h
    script = gcx.leer(os.path.join(ORIGEN, 'cache', 'scenerio.gcx'))
    meta = {'_nota': 'Texturas de vrtitle (disco de VR Missions USA). nombres = nombre del código del overlay -> archivo; semi = modo de la cabecera .pcx (0 50/50, 1 aditivo, 2 resta, 3 +1/4). ayuda = textos de `chara VRTITLE -t` (uno por ítem de EXTRA) y de "Choose the model". Posiciones y animaciones: visor/titulo_vr_disco.js y docs/vr_disco.md §13.', 'texturas': tex, 'nombres': nombres, 'ayuda': textos_chara(script, H_VRTITLE), 'ayuda_modelo': textos_chara(script, H_ELEGIR_MODELO), 'sonido': dict(sonido(), canciones=[2, 2])}
    with open(os.path.join(DESTINO, 'titulo.json'), 'w', encoding='utf-8') as fh:
        json.dump(meta, fh, ensure_ascii=False, indent=1)
    print('vr_titulo_export: %d texturas, %d nombres, ayuda %d textos -> %s' % (len(tex), len(nombres), len(meta['ayuda']), os.path.relpath(DESTINO)))
    return meta
if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    exportar()
