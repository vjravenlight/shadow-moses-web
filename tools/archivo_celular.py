# MGS web — FeniXVOID · Project Ravenlight
import os, shutil, sys, time, zipfile

def main():
    datos, salida = (os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2]))
    if not os.path.isfile(os.path.join(datos, 'discos.json')):
        print('  Primero instalá el juego con INSTALAR.cmd. / Install the game with INSTALAR.cmd first.')
        return 2
    archivos = sorted((os.path.relpath(os.path.join(r, a), datos).replace(os.sep, '/') for r, _, l in os.walk(datos) for a in l))
    total = sum((os.path.getsize(os.path.join(datos, a)) for a in archivos))
    if len(archivos) >= 65535 or total >= 4000000000:
        print('  Demasiados datos para un solo archivo. / Too much data for a single file.')
        return 3
    if shutil.disk_usage(os.path.dirname(salida)).free < total + 100000000:
        print('  Falta espacio: hacen falta %.1f GB libres. / Not enough space: %.1f GB free needed.' % (total / 1000000000.0, total / 1000000000.0))
        return 4
    temporal = salida + '.parcial'
    t0, hecho, ultimo = (time.time(), 0, -1)
    with zipfile.ZipFile(temporal, 'w', zipfile.ZIP_STORED, allowZip64=False) as z:
        for a in archivos:
            z.write(os.path.join(datos, a), a)
            hecho += os.path.getsize(os.path.join(datos, a))
            p = int(hecho * 100 / max(total, 1)) // 10 * 10
            if p != ultimo:
                print('  %3d %%' % p, flush=True)
                ultimo = p
    os.replace(temporal, salida)
    print('  Listo / Done: %s (%.0f MB, %d archivos / files, %.0f s)' % (salida, os.path.getsize(salida) / 1048576, len(archivos), time.time() - t0))
    return 0
if __name__ == '__main__':
    sys.exit(main())
