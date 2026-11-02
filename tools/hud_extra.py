# MGS web — FeniXVOID · Project Ravenlight
import os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS
import rpk, hud_indices
RES = os.path.join(EXTRAIDO, 'disco1', '01_stages', 'init', 'resident')
HUD = os.path.join(ASSETS, 'hud')

def blanco(mascara):
    a = np.zeros(mascara.shape + (4,), np.uint8)
    a[mascara] = 255
    return Image.fromarray(a)

def main():
    os.makedirs(HUD, exist_ok=True)
    pals, imgs = rpk.leer(os.path.join(RES, 'item.rar'))
    for nombre, k in (('radar.png', 41), ('fuente.png', 45)):
        blanco(imgs[k - len(pals)]['idx'] > 0).save(os.path.join(HUD, nombre))
    num = hud_indices.num_tim()
    blanco(np.isin(num, (2, 3, 4, 15))).save(os.path.join(HUD, 'num.png'))
    print('radar.png, fuente.png, num.png')
if __name__ == '__main__':
    main()
