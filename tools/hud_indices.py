# MGS web — FeniXVOID · Project Ravenlight
import os, struct, sys
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
import numpy as np
from PIL import Image
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
RES = os.path.join(EXTRAIDO, 'disco1', '01_stages', 'init', 'resident')
HUD = os.path.join(ASSETS, 'hud')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rpk

def guardar(idx, nombre):
    os.makedirs(HUD, exist_ok=True)
    Image.fromarray((idx.astype(np.uint16) * 17).astype(np.uint8)).save(os.path.join(HUD, nombre), optimize=True)
    print(nombre, idx.shape[1], 'x', idx.shape[0], 'índices', sorted(set(np.unique(idx).tolist())))

def num_tim():
    d = open(os.path.join(RES, 'num.rar'), 'rb').read()
    flag = struct.unpack_from('<I', d, 4)[0]
    p = 8
    if flag & 8:
        p += struct.unpack_from('<I', d, 8)[0]
    _, x, y, w, h = struct.unpack_from('<IHHHH', d, p)
    raw = np.frombuffer(d, np.uint8, count=w * 2 * h, offset=p + 12)
    idx = np.empty(w * 4 * h, np.uint8)
    idx[0::2] = raw & 15
    idx[1::2] = raw >> 4
    return idx.reshape(h, w * 4)
if __name__ == '__main__':
    pals, imgs = rpk.leer(os.path.join(RES, 'item.rar'))
    radar = [im for k, im in enumerate(imgs) if k + len(pals) == 41][0]
    guardar(radar['idx'], 'radar_idx.png')
    guardar(num_tim(), 'num_idx.png')
