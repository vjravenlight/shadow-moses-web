# MGS web — FeniXVOID · Project Ravenlight
import json, os, struct, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS
from pcx_mgs import decode, modo_semi
ST = os.path.join(EXTRAIDO, 'disco1', '01_stages')
BRF = os.path.join(EXTRAIDO, 'disco1', '00_disco', 'MGS', 'BRF.DAT')
DESTINO = os.path.join(ASSETS, 'extras')
PCX = b'\n\x05\x01\x08'

def tabla_fantasmas(brf):
    d = open(os.path.join(ST, 'camera', 'sound', 'camera.bin'), 'rb').read()
    for ini in range(0, min(len(d) - 12, 4096), 4):
        filas = []
        i = ini
        while i + 12 <= len(d):
            id_, sector, tam = struct.unpack('<III', d[i:i + 12])
            if id_ > 65535 or not 0 < tam < 65536 or sector * 2048 + tam > len(brf) or (brf[sector * 2048:sector * 2048 + 4] != PCX):
                break
            filas.append((id_, sector, tam))
            i += 12
        if len(filas) >= 40:
            return filas
    raise SystemExit('no se encontró la tabla de fotos en camera.bin')

def texturas(st, sub):
    origen = os.path.join(ST, st, 'nocache')
    salida = os.path.join(DESTINO, sub)
    os.makedirs(salida, exist_ok=True)
    modos = {}
    for f in sorted(os.listdir(origen)):
        if not f.lower().endswith('.pcx'):
            continue
        ruta = os.path.join(origen, f)
        nombre = f[:-4]
        decode(ruta).save(os.path.join(salida, nombre + '.png'))
        modos[nombre] = modo_semi(ruta)
    return modos

def fantasmas(brf):
    salida = os.path.join(DESTINO, 'fantasmas')
    os.makedirs(salida, exist_ok=True)
    filas = tabla_fantasmas(brf)
    fd, tmp = tempfile.mkstemp(suffix='.pcx')
    os.close(fd)
    try:
        for k, (_, sector, tam) in enumerate(filas, 1):
            with open(tmp, 'wb') as fh:
                fh.write(brf[sector * 2048:sector * 2048 + tam])
            decode(tmp).save(os.path.join(salida, '%02d.png' % k), optimize=True)
    finally:
        os.remove(tmp)
    return len(filas)

def main():
    os.makedirs(DESTINO, exist_ok=True)
    brf = open(BRF, 'rb').read()
    info = {'version': 1, 'fantasmas': fantasmas(brf), 'camera': texturas('camera', 'camera'), 'preope': texturas('preope', 'preope')}
    with open(os.path.join(DESTINO, 'extras.json'), 'w', encoding='utf-8') as fh:
        json.dump(info, fh, ensure_ascii=False, indent=1)
    print('extras: %d fantasmas, %d texturas de camera, %d de preope' % (info['fantasmas'], len(info['camera']), len(info['preope'])))
if __name__ == '__main__':
    main()
