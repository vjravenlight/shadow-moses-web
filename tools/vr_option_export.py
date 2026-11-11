# MGS web — FeniXVOID · Project Ravenlight
import os, sys, json, struct
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS
from pcx_mgs import decode, modo_semi
import gcx
ORIGEN = os.path.join(EXTRAIDO, 'vr_usa', '01_stages', 'option')
DESTINO = os.path.join(ASSETS, 'vr', 'disco', 'option')
NOMBRES = ['strong_w', 'weak_w', 'sc_option_w', 'op_opt_w']
H_OPT = 38764

def ayuda(script):
    for x in script['main']:
        if isinstance(x, dict) and x.get('cmd') == 'chara' and x['args'] and (x['args'][0].get('id') == H_OPT):
            for a in x['args']:
                if isinstance(a, dict) and a.get('opt') == 'e':
                    return [v.get('str', '') for v in a['v'] if isinstance(v, dict) and 'str' in v]
    return []

def exportar():
    nocache = os.path.join(ORIGEN, 'nocache')
    if not os.path.isdir(nocache):
        print('vr_option_export: no está el escenario option del disco de VR: no se hace nada')
        return None
    os.makedirs(DESTINO, exist_ok=True)
    tex = {}
    for f in sorted(os.listdir(nocache)):
        if not f.lower().endswith('.pcx'):
            continue
        n, ruta = (f[:-4], os.path.join(nocache, f))
        im = decode(ruta)
        im.save(os.path.join(DESTINO, n + '.png'))
        flag = struct.unpack('<H', open(ruta, 'rb').read(88)[76:78])[0]
        tex[n] = {'png': n + '.png', 'ancho': im.width, 'alto': im.height, 'bpp': 8 if flag & 1 else 4, 'semi': modo_semi(ruta)}
    nombres = {n: '%04x' % gcx.strcode(n) for n in NOMBRES if '%04x' % gcx.strcode(n) in tex}
    script = gcx.leer(os.path.join(ORIGEN, 'cache', 'scenerio.gcx'))
    meta = {'_nota': 'Texturas del escenario option del disco de VR (OPT, opt.c). Posiciones y estados: visor/titulo_vr_disco.js (OPTION) y docs/vr_disco.md §15.10.', 'texturas': tex, 'nombres': nombres, 'ayuda': ayuda(script)}
    json.dump(meta, open(os.path.join(DESTINO, 'option.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('vr_option_export: %d texturas, %d nombres, %d textos de ayuda' % (len(tex), len(nombres), len(meta['ayuda'])))
    return meta
if __name__ == '__main__':
    exportar()
