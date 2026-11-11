# MGS web — FeniXVOID · Project Ravenlight
import os, sys, json, struct, mmap, shutil, subprocess, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS
from pcx_mgs import decode, modo_semi
import gcx
DISCO = os.path.join(EXTRAIDO, 'vr_usa')
ST = os.path.join(DISCO, '01_stages', 'movie')
OUT = os.path.join(ASSETS, 'vr', 'disco')
H_SPECIALMOVIE, H_VRWINDOW = (None, None)
VOZ_CREDITOS = 321
NOMBRES = ['d3_sp_backl', 'd3_sp_backr', 'd3_sp_movie_head', 'sp_exit', 'd3_mv_base', 'd3_mv_ya_l', 'd3_mv_ya_r', 'd3_mv_samtgs_a1', 'd3_mv_samtgs_a2', 'd3_mv_samtgs_b1', 'd3_mv_samtgs_b2', 'd3_mv_same3_1', 'd3_mv_same3_2', 'd3_mv_samhatena_1', 'd3_mv_samhatena_2', 'd3_mv_tgs_a', 'd3_mv_tgs_b', 'd3_mv_e3']
TIEMPOS_VR = [113, 689, 1474, 1980, 2537, 3358, 4336, 5300, 5710, 6976, 7638, 8022, 8406, 8790]

def videos(crf, forzar):
    import videos_export as V
    p = os.path.join(DISCO, '00_disco', 'MGS', 'ZMOVIE.STR')
    if not os.path.exists(p):
        print('vr_movie_export: falta ZMOVIE.STR del disco de VR: sin videos')
        return []
    V.SALIDA = os.path.join(OUT, 'demos', 'movie')
    os.makedirs(V.SALIDA, exist_ok=True)
    tmp = tempfile.mkdtemp(prefix='vr_movie_')
    total = os.path.getsize(p) // V.S2336
    hechos = []
    with open(p, 'rb') as f:
        t = V.tabla(f)
        print('ZMOVIE.STR de VR: %d videos %s' % (len(t), ', '.join(('%04x' % m['id'] for m in t))))
        for k, m in enumerate(t):
            fin = t[k + 1]['pos'] if k + 1 < len(t) else total
            d = V.exportar(f, 'vr', m, fin, crf, forzar, tmp)
            if d:
                hechos.append(d)
    try:
        os.rmdir(tmp)
    except OSError:
        pass
    filas = [{k: d[k] for k in ('id', 'disco', 'cuadros', 'duracion', 'w', 'h', 'bytes')} | {'subtitulos': len(d['sub'])} for d in hechos]
    json.dump({'videos': filas, 'bytes': sum((r['bytes'] for r in filas))}, open(os.path.join(V.SALIDA, 'indice.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('  %d videos, %.1f MB' % (len(filas), sum((r['bytes'] for r in filas)) / 1000000.0))
    return filas

def creditos():
    import creditos_export as C
    src = os.path.join(ST, 'cache', 'credit.rar')
    if not os.path.exists(src):
        print('vr_movie_export: falta movie/cache/credit.rar')
        return None
    od = os.path.join(OUT, 'demos', 'creditos')
    os.makedirs(od, exist_ok=True)
    lista = []
    for k, im in enumerate(C.imagenes(open(src, 'rb').read())):
        png = 'credit_%02d.png' % k
        im.save(os.path.join(od, png), optimize=True)
        lista.append({'png': 'demos/creditos/' + png, 'w': im.size[0], 'h': im.size[1]})
    info = {'archivos': {'credit': lista}, 'tiempos_rodillo': TIEMPOS_VR, 'unidad_tiempos': 'ticks de 60 Hz (mts_get_tick_count) desde que arranca el rodillo', 'origen': 'vr_usa/01_stages/movie/cache/credit.rar'}
    json.dump(info, open(os.path.join(od, 'creditos.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('  créditos: %d páginas (%s)' % (len(lista), ', '.join(('%dx%d' % (x['w'], x['h']) for x in lista[:6]))))
    return info

def musica_creditos(forzar):
    import vox
    f = os.path.join(DISCO, '00_disco', 'MGS', 'VOX.DAT')
    if not os.path.exists(f):
        print('vr_movie_export: falta VOX.DAT del disco de VR')
        return None
    od = os.path.join(OUT, 'codec', 'vox')
    os.makedirs(od, exist_ok=True)
    dst, js = (os.path.join(od, '%d.m4a' % VOZ_CREDITOS), os.path.join(od, '%d.json' % VOZ_CREDITOS))
    if os.path.exists(dst) and os.path.exists(js) and (not forzar):
        return json.load(open(js, encoding='utf-8'))
    with open(f, 'rb') as fh:
        mm = mmap.mmap(fh.fileno(), 0, access=mmap.ACCESS_READ)
        s = vox.stream_en(mm, VOZ_CREDITOS)
        tmp = os.path.join(od, '_tmp_%d.wav' % VOZ_CREDITOS)
        try:
            if not s or not vox.exportar_wav(mm, s, tmp):
                print('  sin la voz', VOZ_CREDITOS)
                return None
            import wave
            with wave.open(tmp) as w:
                seg, hz, can = (w.getnframes() / w.getframerate(), w.getframerate(), w.getnchannels())
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'aac', '-b:a', '80k', dst], check=False)
        finally:
            if os.path.exists(tmp):
                os.remove(tmp)
    d = {'id': VOZ_CREDITOS, 'nombre': 'vr_credit', 'hz': hz, 'canales': can, 'seg': round(seg, 3), 'sub': [], 'lip': []}
    json.dump(d, open(js, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('  música de los créditos: voz %d, %.1f s, %d Hz, %d canales' % (VOZ_CREDITOS, seg, hz, can))
    return d

def _opciones(cmd):
    out = {}
    for a in cmd['args'][1:]:
        if isinstance(a, dict) and 'opt' in a:
            out[a['opt']] = a['v']
    return out

def _cadena(v):
    return (v.get('str', '') if isinstance(v, dict) else '').replace('�', '')

def menu():
    nocache = os.path.join(ST, 'nocache')
    if not os.path.isdir(nocache):
        return None
    od = os.path.join(OUT, 'movie')
    os.makedirs(od, exist_ok=True)
    tex = {}
    for f in sorted(os.listdir(nocache)):
        if not f.lower().endswith('.pcx'):
            continue
        n = f[:-4]
        ruta = os.path.join(nocache, f)
        im = decode(ruta)
        im.save(os.path.join(od, n + '.png'))
        tex[n] = {'png': n + '.png', 'ancho': im.width, 'alto': im.height, 'semi': modo_semi(ruta)}
    script = gcx.leer(os.path.join(ST, 'cache', 'scenerio.gcx'))
    titulos, ventanas = ([], [])

    def ver(x):
        if isinstance(x, list):
            for y in x:
                ver(y)
            return
        if not isinstance(x, dict):
            return
        if x.get('cmd') == 'chara' and x.get('args'):
            o = _opciones(x)
            if 't' in o and 'm' in o and ('f' in o):
                titulos[:] = [_cadena(v) for v in o['t']]
            if 'b' in o and 'w' in o:
                ventanas.append({'lineas': [_cadena(v) for v in o['b']], 'w': o['w'], 'm': o.get('m'), 'i': o.get('i')})
        for v in x.values():
            if isinstance(v, (list, dict)):
                ver(v)
    ver(script['main'])
    for k in sorted(script['procs']):
        ver(script['procs'][k])
    meta = {'_nota': 'Escenario "movie" del disco de VR: texturas del menú (SPECIALMOVIE) y textos del guion: titulos = `-t` (dos líneas por clip), ventanas = VRWINDOW de proc_0ef7 (una por clip, en el orden de $b:G0481). Videos: 0061, 0062, 0cd3 (MOVIE #0061 / #0062 / #0cd3); apertura: 538c (escenario "opening").', 'texturas': tex, 'nombres': {n: '%04x' % gcx.strcode(n) for n in NOMBRES if '%04x' % gcx.strcode(n) in tex or n in tex}, 'con_videos': all((os.path.exists(os.path.join(OUT, 'demos', 'movie', v + '.mp4')) for v in ('538c', '0061', '0062', '0cd3'))), 'titulos': titulos, 'ventanas': ventanas, 'videos': ['0061', '0062', '0cd3'], 'apertura': '538c'}
    json.dump(meta, open(os.path.join(od, 'movie.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('  menú de MOVIE: %d texturas, %d títulos, %d ventanas' % (len(tex), len(titulos), len(ventanas)))
    return meta

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    if not os.path.isdir(ST):
        print('vr_movie_export: no está el escenario "movie" del disco de VR (extraido/vr_usa/01_stages): no hay nada que exportar')
        return 0
    a = sys.argv[1:]
    crf = int(a[a.index('--crf') + 1]) if '--crf' in a else 27
    forzar = '--forzar' in a
    if '--sin-videos' not in a:
        videos(crf, forzar)
    creditos()
    musica_creditos(forzar)
    menu()
    return 0
if __name__ == '__main__':
    sys.exit(main())
