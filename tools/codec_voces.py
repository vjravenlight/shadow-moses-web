# MGS web — FeniXVOID · Project Ravenlight
import argparse
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
import json
import mmap
import os
import struct
import subprocess
import sys
import time
from multiprocessing import Pool
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import vox as V
import demo_dat as D
SALIDA = os.path.join(ASSETS, 'codec', 'vox')
DISCO = 1
BASE = 0
REFS = os.path.join(DOCS, 'codec', 'vox_refs.json')
TICK = V.TICK_SUBT_SEG
FORMATO = 'original'
_mm = None

def ids_necesarios():
    refs = json.load(open(REFS, encoding='utf-8'))
    usos = {}
    for r in refs:
        if r.get('disco') == 1 and r.get('tipo') in ('radio VOZ', 'sound -g', 'sound -v') and r.get('es_stream'):
            usos.setdefault(r['id'], set()).add(r['tipo'])
    return usos

def _abrir():
    global _mm
    if _mm is None:
        f = open(V.ruta_vox(DISCO), 'rb')
        _mm = mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ)
    return _mm

def pcm(mm, s):
    cab = None
    der, izq = ([], [])
    ed, ei = ([0, 0], [0, 0])
    for q, t, tam in D.paquetes(mm, s['offset'], s.get('fin')):
        if t == 2:
            cab = D.leer_pcm_cab(mm, q)
        elif t == 1:
            d = bytes(mm[q + 4:q + tam])
            if cab and cab['canales'] == 1:
                izq += V.decodificar_adpcm(d, ei)
            else:
                der += V.decodificar_adpcm(d[:4096], ed)
                izq += V.decodificar_adpcm(d[4096:], ei)
        elif t == 240:
            break
    if not cab:
        return (None, None)
    if cab['canales'] == 1:
        return (cab, izq)
    n = min(len(izq), len(der))
    m = [0] * (2 * n)
    m[0::2] = izq[:n]
    m[1::2] = der[:n]
    return (cab, m)

def subtitulos_y_lip(info):
    sub, lip = ([], [])
    for x in info['subtitulos']:
        for l in x['lineas']:
            sub.append([round(l['inicio'] * TICK, 3), round((l['inicio'] + l['duracion']) * TICK, 3), l['texto']])
        ids, actual = ({}, 0)
        for e in x['lipsync']['eventos']:
            if 'set_id' in e:
                ids[e['set_id']] = e['id']
            elif 'personaje_activo' in e:
                actual = e['personaje_activo']
            elif 'boca' in e or 'parpadeo' in e:
                actual = e['personaje']
                v = 4 if e.get('parpadeo') else e['boca']
                lip.append([round((e['tick'] + 1) * TICK, 3), ids.get(e['personaje'], '0000'), v])
            elif e.get('fin'):
                lip.append([round((e['tick'] + 1) * TICK, 3), ids.get(actual, '0000'), 0])
    return (sub, lip)
TMP = None

def ya_hecha(js):
    if not os.path.exists(js):
        return None
    try:
        d = json.load(open(js, encoding='utf-8'))
    except ValueError:
        return None
    es_original = d.get('formato') == 'adpcm'
    if es_original != (FORMATO == 'original') and (not d.get('respaldo_m4a')):
        return None
    return d if os.path.exists(os.path.join(SALIDA, d.get('archivo') or '%d.m4a' % d['id'])) else None

def original(mm, s, vid, nombre, info):
    cab, bloques = (None, [])
    for q, t, tam in D.paquetes(mm, s['offset'], s.get('fin')):
        if t == 2:
            cab = D.leer_pcm_cab(mm, q)
        elif t == 1:
            bloques.append((q, tam))
        elif t == 240:
            break
    if not cab:
        return None
    datos, n = D.adpcm_crudo(mm, bloques, cab['canales'])
    if datos is None:
        print('  %d: %s; va en m4a' % (vid, n))
        return None
    hz, ch = (int(round(cab['hz'])), cab['canales'])
    archivo = '%d.adpcm' % (vid + BASE)
    with open(os.path.join(SALIDA, archivo), 'wb') as f:
        f.write(datos)
    sub, lip = subtitulos_y_lip(info)
    d = {'id': vid + BASE, 'nombre': nombre, 'formato': 'adpcm', 'archivo': archivo, 'hz': hz, 'canales': ch}
    if ch == 2:
        d['bloque'] = D.BLOQUE_ESTEREO
    d.update({'seg': round(n / hz, 4), 'muestras': n, 'sub': sub, 'lip': lip})
    if BASE:
        d['disco'] = DISCO
        d['sector'] = vid
    json.dump(d, open(os.path.join(SALIDA, '%d.json' % (vid + BASE)), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    return d

def decodificar(args):
    vid, nombre, forzar, tmp, disco, formato = args
    global DISCO, BASE, FORMATO
    DISCO, BASE, FORMATO = (disco, 200000 if disco == 2 else 0, formato)
    js = os.path.join(SALIDA, '%d.json' % (vid + BASE))
    hecha = None if forzar else ya_hecha(js)
    if hecha:
        return (vid, hecha, None, None)
    mm = _abrir()
    s = V.stream_en(mm, vid)
    if not s:
        return (vid, None, None, 'no arranca un stream')
    info = V.analizar(mm, s)
    if FORMATO == 'original':
        d = original(mm, s, vid, nombre, info)
        if d:
            return (vid, d, None, None)
    cab, muestras = pcm(mm, s)
    if not cab:
        return (vid, None, None, 'sin PCM')
    hz = int(round(cab['hz']))
    ch = cab['canales']
    hz_out = hz if hz in (8000, 11025, 16000, 22050, 24000, 32000, 44100, 48000) else 32000 if hz < 40000 else 44100
    wav = os.path.join(tmp, '%d.wav' % vid)
    import wave
    with wave.open(wav, 'wb') as w:
        w.setnchannels(ch)
        w.setsampwidth(2)
        w.setframerate(hz)
        w.writeframes(struct.pack('<%dh' % len(muestras), *muestras))
    n = len(muestras) // ch
    sub, lip = subtitulos_y_lip(info)
    d = {'id': vid + BASE, 'nombre': nombre, 'hz': hz, 'canales': ch, 'seg': round(n / hz, 4), 'muestras': int(round(n * hz_out / hz)), 'hz_m4a': hz_out, 'sub': sub, 'lip': lip}
    if FORMATO == 'original':
        d['respaldo_m4a'] = True
    if BASE:
        d['disco'] = DISCO
        d['sector'] = vid
    json.dump(d, open(js, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    return (vid, d, wav, None)

def codificar(lote):
    cmd = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y']
    for vid, d, wav in lote:
        cmd += ['-i', wav]
    for k, (vid, d, wav) in enumerate(lote):
        cmd += ['-map', '%d:a' % k]
        if d['hz_m4a'] != d['hz']:
            cmd += ['-af', 'aresample=%d' % d['hz_m4a']]
        cmd += ['-c:a', 'aac', '-b:a', '40k' if d['canales'] == 1 else '48k', '-ar', str(d['hz_m4a']), '-movflags', '+faststart', os.path.join(SALIDA, '%d.m4a' % d['id'])]
    p = subprocess.run(cmd, capture_output=True)
    return [(vid, p.returncode, p.stderr.decode('utf-8', 'replace')[:300]) for vid, d, wav in lote]

def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, ValueError):
        pass
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--solo', help='ids separados por coma')
    ap.add_argument('--procesos', type=int, default=max(1, os.cpu_count() or 2))
    ap.add_argument('--forzar', action='store_true')
    ap.add_argument('--disco', type=int, default=1)
    ap.add_argument('--formato', choices=('original', 'm4a'), default='original')
    a = ap.parse_args()
    global DISCO, BASE, FORMATO
    DISCO, BASE, FORMATO = (a.disco, 200000 if a.disco == 2 else 0, a.formato)
    if DISCO != 1 and (not a.solo):
        sys.exit('con --disco 2 hay que decir qué voces (--solo); las pide tools/voces_disco2.py')
    os.makedirs(SALIDA, exist_ok=True)
    usos = ids_necesarios() if DISCO == 1 else {}
    ids = sorted(usos) if not a.solo else [int(x) for x in a.solo.split(',')]
    nombres = V.nombres_soundtest(DISCO)
    t0 = time.time()
    indice, errores, total_b, total_s = ({}, [], 0, 0.0)
    import tempfile
    from concurrent.futures import ThreadPoolExecutor
    tmp = tempfile.mkdtemp(prefix='codec_voces_')
    trabajos = [(i, nombres.get(i), a.forzar, tmp, DISCO, FORMATO) for i in ids]
    datos, pendientes = ({}, [])
    procesos = a.procesos if FORMATO == 'm4a' else 1
    pool = Pool(procesos) if procesos > 1 else None
    try:
        resultados = pool.imap_unordered(decodificar, trabajos, chunksize=4) if pool else map(decodificar, trabajos)
        for k, (vid, d, wav, err) in enumerate(resultados):
            if err:
                errores.append((vid, err))
                print('  ! %d: %s' % (vid, err))
                continue
            datos[vid] = d
            if wav:
                pendientes.append((vid, d, wav))
            if (k + 1) % 100 == 0:
                print('  leídas %d/%d (%.0f s)' % (k + 1, len(ids), time.time() - t0), flush=True)
    finally:
        if pool:
            pool.close()
            pool.join()
    lotes = [pendientes[i:i + 40] for i in range(0, len(pendientes), 40)]
    if lotes:
        print('  codificando %d archivos en %d lotes...' % (len(pendientes), len(lotes)), flush=True)
    with ThreadPoolExecutor(max(1, a.procesos)) as ex:
        for res in ex.map(codificar, lotes):
            for vid, rc, err in res:
                if rc != 0:
                    errores.append((vid, err))
                    print('  ! ffmpeg %d: %s' % (vid, err))
    for vid, d, wav in pendientes:
        try:
            os.remove(wav)
        except OSError:
            pass
    try:
        os.rmdir(tmp)
    except OSError:
        pass
    for vid, d in datos.items():
        audio = os.path.join(SALIDA, d.get('archivo') or '%d.m4a' % (vid + BASE))
        if not os.path.exists(audio):
            continue
        b = os.path.getsize(audio)
        indice[str(vid + BASE)] = [d['seg'], d['canales'], b, sorted(usos.get(vid, []))]
        total_b += b
        total_s += d['seg']
    if DISCO == 2:
        pi = os.path.join(SALIDA, 'indice_disco2.json')
        viejo = json.load(open(pi, encoding='utf-8')).get('ids', {}) if os.path.exists(pi) else {}
        viejo.update(indice)
        json.dump({'voces': len(viejo), 'segundos': round(sum((v[0] for v in viejo.values())), 1), 'bytes_audio': sum((v[2] for v in viejo.values())), 'tipos': 'voces del VOX.DAT del disco 2: archivo <200000 + sector> (tools/voces_disco2.py)', 'ids': dict(sorted(viejo.items(), key=lambda x: int(x[0])))}, open(pi, 'w', encoding='utf-8'), separators=(',', ':'))
    if not a.solo:
        json.dump({'voces': len(indice), 'segundos': round(total_s, 1), 'bytes_audio': total_b, 'formato': FORMATO, 'tipos': 'radio VOZ / sound -g / sound -v (disco 1)', 'ids': dict(sorted(indice.items(), key=lambda x: int(x[0])))}, open(os.path.join(SALIDA, 'indice.json'), 'w', encoding='utf-8'), separators=(',', ':'))
    print('listo: %d voces, %.1f s (%.2f h), %.2f MB (%s), %d errores, %.0f s' % (len(indice), total_s, total_s / 3600, total_b / 1000000.0, FORMATO, len(errores), time.time() - t0))
if __name__ == '__main__':
    main()
