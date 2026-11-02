# MGS web — FeniXVOID · Project Ravenlight
import os, sys, json, struct, glob
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
RAIZ = os.path.join(os.path.dirname(__file__), '..')
ORIGEN = os.path.join(EXTRAIDO, '02_por_tipo', '09_otros', 'sgt')
DESTINO = os.path.join(ASSETS, 'hud', 'sgt')

def leer_sgt(datos):
    tam, cuadros, n = struct.unpack_from('<HBB', datos, 0)
    p_anc, p_buf, p_idx, p_inf, p_par = struct.unpack_from('<5I', datos, 4)
    buf = datos[p_buf:p_buf + tam]
    infos = []
    for o in range(p_inf, p_par, 4):
        sig, ant, mx, my = struct.unpack_from('<BBbb', datos, o)
        infos.append([sig, ant, mx, my])
    indices = [list(datos[o:o + 4]) for o in range(p_idx, p_inf, 4)]
    parpadeos = [list(datos[o:o + 2]) for o in range(p_par, len(datos) - 3, 4)]
    prims = []
    for i in range(n):
        idx, tpage, off = struct.unpack_from('<BBH', datos, p_anc + 4 * i)
        tag = struct.unpack_from('<I', buf, off)[0]
        anim_v = None
        if idx:
            anim_v = [infos[k - 1] if k else None for k in indices[idx - 1]]
        pr = {'off': off, 'abr': tpage >> 6}
        if tpage & 63:
            pr['parpadeo'] = parpadeos[(tpage & 63) - 1]
        if tag == 255:
            r, g, b, codigo = buf[off + 4:off + 8]
            x, y = struct.unpack_from('<hh', buf, off + 8)
            texto = buf[off + 12:off + 28].split(b'\x00')[0].decode('latin-1')
            pr.update(tipo='texto', color=[r, g, b], v=[[x, y]], texto=texto)
            if anim_v:
                anim_v = anim_v[:1]
        else:
            largo = tag & 255
            r, g, b, codigo = buf[off + 4:off + 8]
            gouraud = bool(codigo & 16)
            pr['semi'] = bool(codigo & 2)
            pal = [struct.unpack_from('<I', buf, off + 4 + 4 * k)[0] for k in range(largo)]
            if codigo & 224 == 32:
                if codigo & 4:
                    raise ValueError(f'polígono con textura en {off:#x} (código {codigo:#x}): no soportado')
                nv = 4 if codigo & 8 else 3
                pr['tipo'] = 'poly'
            elif codigo & 224 == 64:
                pr['tipo'] = 'linea'
                if codigo & 8:
                    nv = 0
                    while True:
                        k = 2 * nv if gouraud else 1 + nv
                        if nv > 0 and (k >= len(pal) or pal[k] == 1431655765):
                            break
                        if k >= len(pal):
                            break
                        nv += 1
                else:
                    nv = 2
            else:
                raise ValueError(f'primitiva desconocida en {off:#x}: código {codigo:#x}')
            v, cols = ([], [])
            for k in range(nv):
                if gouraud:
                    c = pal[2 * k]
                    xy = pal[2 * k + 1]
                    cols.append([c & 255, c >> 8 & 255, c >> 16 & 255])
                else:
                    xy = pal[1 + k]
                x = struct.unpack('<h', struct.pack('<H', xy & 65535))[0]
                y = struct.unpack('<h', struct.pack('<H', xy >> 16))[0]
                v.append([x, y])
            pr['v'] = v
            pr['color'] = cols if gouraud else [r, g, b]
            pr['gouraud'] = gouraud
            if anim_v:
                anim_v = anim_v[:nv]
        if anim_v and any(anim_v):
            pr['anim'] = anim_v
        prims.append(pr)
    return {'cuadros': cuadros, 'prims': prims}

def main():
    os.makedirs(DESTINO, exist_ok=True)
    hechos = 0
    for f in sorted(glob.glob(os.path.join(ORIGEN, '*.sgt'))):
        nombre = os.path.basename(f)[:-4]
        try:
            j = leer_sgt(open(f, 'rb').read())
        except Exception as e:
            print('ERROR', nombre, e)
            continue
        j['origen'] = os.path.basename(f)
        with open(os.path.join(DESTINO, nombre + '.json'), 'w', encoding='utf-8') as s:
            json.dump(j, s, ensure_ascii=False, separators=(',', ':'))
        hechos += 1
        print(nombre, len(j['prims']), 'primitivas,', j['cuadros'], 'cuadros de entrada')
    print('listo:', hechos, 'archivos en', os.path.relpath(DESTINO, RAIZ))
if __name__ == '__main__':
    sys.exit(main())
