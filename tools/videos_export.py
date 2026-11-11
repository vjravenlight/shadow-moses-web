# MGS web — FeniXVOID · Project Ravenlight
import argparse
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
import json
import os
import struct
import subprocess
import sys
import tempfile
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SALIDA = os.path.join(ASSETS, 'demos', 'movie')
S2336 = 2336
TICK = 256.0 / (105 * 60)
SYNC = b'\x00' + b'\xff' * 10 + b'\x00'

def duracion_mp4(p):
    d = open(p, 'rb').read()

    def cajas(i, f):
        while i + 8 <= f:
            n, t = struct.unpack('>I4s', d[i:i + 8])
            h = 8
            if n == 1:
                n = struct.unpack('>Q', d[i + 8:i + 16])[0]
                h = 16
            if n == 0:
                n = f - i
            yield (t, i + h, i + n)
            i += n
    for t, a, f in cajas(0, len(d)):
        if t == b'moov':
            for t2, a2, f2 in cajas(a, f):
                if t2 == b'mvhd':
                    ts, du = struct.unpack('>IQ', d[a2 + 20:a2 + 32]) if d[a2] == 1 else struct.unpack('>II', d[a2 + 12:a2 + 20])
                    return int(du * 1000 // ts) / 1000
    return None

def ruta(disco):
    return os.path.join(EXTRAIDO, 'disco%d' % disco, '00_disco', 'MGS', 'ZMOVIE.STR')

def tabla(f):
    f.seek(0)
    d = f.read(S2336)[8:8 + 2048]
    n = struct.unpack_from('<i', d, 0)[0]
    out = []
    for i in range(min(n, 8)):
        ident, cuadros, pos = struct.unpack_from('<HHi', d, 4 + 8 * i)
        out.append({'id': ident, 'cuadros': cuadros, 'pos': pos})
    return out

def bcd(x):
    return x // 10 << 4 | x % 10

def subtitulos(bloque, idioma=None):
    out = []
    if len(bloque) < 16:
        return out
    j = struct.unpack_from('<h', bloque, 10)[0]
    if j <= 0 or j >= len(bloque):
        return out
    if bloque[j:j + 12] == b'\x00' * 12:
        return out
    for _ in range(200):
        salto, t0, dur, _x = struct.unpack_from('<4i', bloque, j)
        txt = bloque[j + 16:j + (salto if salto > 16 else 200)].split(b'\x00')[0]
        if idioma == 'ja':
            import idiomas_export as IE
            crudo, i = (bloque[j + 16:j + (salto if salto > 16 else 200)], 0)
            while i < len(crudo) and crudo[i] != 0:
                i += 2 if crudo[i] >= 128 or crudo[i] == 31 else 1
            tj = IE.texto_js_eu(crudo[:i]).replace('\r', '|')
            base = struct.unpack_from('<i', bloque, 12)[0]
            gl = {}
            for ch in tj:
                c = ord(ch) & 40959
                if c >= 39424:
                    tb, k = IE._tabla_zen(c)
                    if tb == 3 and k >= 0 and (base > 0) and (base + 36 * (k + 1) <= len(bloque)):
                        gl[k] = bloque[base + 36 * k:base + 36 * (k + 1)].hex()
            out.append([round(t0 * TICK, 3), round((t0 + dur) * TICK, 3), '', {'tj': tj, 'glifos': gl, 'i': 'ja'}])
        else:
            texto = txt.replace(b'\x80|', b'\n').decode('latin-1')
            if idioma:
                import idiomas_export as IE
                texto = IE.unicode_eu(texto)
            out.append([round(t0 * TICK, 3), round((t0 + dur) * TICK, 3), texto])
        if salto == 0:
            break
        j += salto
        if j + 16 > len(bloque):
            break
    return out

def exportar(f, disco, mov, fin, crf, forzar, tmpdir, salida=SALIDA, idioma=None):
    nombre = '%04x' % mov['id']
    mp4 = os.path.join(salida, nombre + '.mp4')
    js = os.path.join(salida, nombre + '.json')
    if not forzar and os.path.exists(mp4) and os.path.exists(js):
        print('  %s ya está' % nombre)
        return json.load(open(js, encoding='utf-8'))
    crudo = os.path.join(tmpdir, nombre + '.str')
    sub, w, h, saltados, video, audio = ([], 0, 0, 0, 0, 0)
    with open(crudo, 'wb') as o:
        for i in range(mov['pos'], fin):
            f.seek(S2336 * i)
            s = f.read(S2336)
            if len(s) < S2336:
                break
            sm = s[2]
            if sm & 8:
                mag, tipo, sc, ns = struct.unpack_from('<HHHH', s, 8)
                if mag == 352 and tipo != 32769:
                    if sc == 0:
                        datos = b''.join((_leer_datos(f, i + k)[32 if k else 0:] for k in range(max(1, ns))))
                        sub = subtitulos(datos[32:], idioma)
                    saltados += 1
                    continue
                if mag == 352 and tipo == 32769 and (not w):
                    w, h = struct.unpack_from('<HH', s, 8 + 16)
                video += 1
            elif sm & 4:
                audio += 1
            lba = i + 150
            o.write(SYNC + bytes([bcd(lba // 4500), bcd(lba // 75 % 60), bcd(lba % 75), 2]) + s)
    fps = mov['cuadros'] * 150.0 / max(1, fin - mov['pos'])
    filtro = ['-vf', 'setpts=PTS*%.6f' % (15.0 / fps)] if abs(fps - 15.0) > 0.2 else []
    cmd = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'psxstr', '-i', crudo] + filtro + ['-c:v', 'libx264', '-crf', str(crf), '-preset', 'slower', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '80k', '-ar', '44100', '-movflags', '+faststart', mp4]
    p = subprocess.run(cmd, capture_output=True)
    try:
        os.remove(crudo)
    except OSError:
        pass
    if p.returncode != 0:
        print('  ! ffmpeg %s: %s' % (nombre, p.stderr.decode('utf-8', 'replace')[:300]))
        return None
    dur = None
    try:
        q = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', mp4], capture_output=True)
        dur = round(float(q.stdout.decode().strip()), 3)
    except ValueError:
        pass
    except FileNotFoundError:
        dur = duracion_mp4(mp4)
    d = {'id': nombre, 'disco': disco, 'cuadros': mov['cuadros'], 'fps': round(fps, 3), 'duracion_video': round(mov['cuadros'] / fps, 3), 'duracion': dur, 'w': w, 'h': h, 'sectores': fin - mov['pos'], 'sectores_video': video, 'sectores_audio': audio, 'sub': sub, 'bytes': os.path.getsize(mp4), 'archivo': ('idiomas/%s/' % idioma if idioma else '') + 'demos/movie/%s.mp4' % nombre}
    if idioma:
        d['idioma'] = idioma
    json.dump(d, open(js, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('  %s: %d cuadros a %.2f por segundo (%.1f s de video, %.1f s el mp4), %dx%d, %d subtítulos, %d KB' % (nombre, mov['cuadros'], fps, mov['cuadros'] / fps, dur or 0, w, h, len(sub), d['bytes'] // 1024))
    return d

def _leer_datos(f, i):
    f.seek(S2336 * i)
    return f.read(S2336)[8:8 + 2048]

def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, ValueError):
        pass
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--disco', type=int, choices=(1, 2))
    ap.add_argument('--crf', type=int, default=24)
    ap.add_argument('--forzar', action='store_true')
    ap.add_argument('--solo')
    ap.add_argument('--idioma', choices=('es', 'de', 'it', 'ja'))
    a = ap.parse_args()
    solo = set((x.lower() for x in a.solo.split(','))) if a.solo else None
    salida = os.path.join(ASSETS, 'idiomas', a.idioma, 'demos', 'movie') if a.idioma else SALIDA
    pref = {'es': 'espana', 'de': 'alemania', 'it': 'italia', 'ja': 'japon'}.get(a.idioma)
    os.makedirs(salida, exist_ok=True)
    tmp = tempfile.mkdtemp(prefix='videos_mgs_')
    for disco in [a.disco] if a.disco else [1, 2]:
        p = os.path.join(EXTRAIDO, '%s%d' % (pref, disco), '00_disco', 'MGS', 'ZMOVIE.STR') if pref else ruta(disco)
        if pref and (not os.path.exists(p)):
            print('disco %d del idioma %s: falta %s' % (disco, a.idioma, p))
            continue
        total = os.path.getsize(p) // S2336
        with open(p, 'rb') as f:
            t = tabla(f)
            print('disco %d: %d videos %s' % (disco, len(t), ', '.join(('%04x' % m['id'] for m in t))))
            for k, m in enumerate(t):
                if solo and '%04x' % m['id'] not in solo:
                    continue
                fin = t[k + 1]['pos'] if k + 1 < len(t) else total
                exportar(f, disco, m, fin, a.crf, a.forzar, tmp, salida, a.idioma)
    try:
        os.rmdir(tmp)
    except OSError:
        pass
    filas = []
    for x in sorted(os.listdir(salida)):
        if x.endswith('.json') and x != 'indice.json':
            d = json.load(open(os.path.join(salida, x), encoding='utf-8'))
            filas.append({k: d[k] for k in ('id', 'disco', 'cuadros', 'duracion', 'w', 'h', 'bytes')} | {'subtitulos': len(d['sub']), 'primer_subtitulo': d['sub'][0][2] if d['sub'] else ''})
    json.dump({'videos': filas, 'bytes': sum((r['bytes'] for r in filas))}, open(os.path.join(salida, 'indice.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('%d videos, %.1f MB' % (len(filas), sum((r['bytes'] for r in filas)) / 1000000.0))
if __name__ == '__main__':
    main()
