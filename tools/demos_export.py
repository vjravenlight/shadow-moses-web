# MGS web — FeniXVOID · Project Ravenlight
import argparse
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
import glob
import gzip
import hashlib
import json
import math
import os
import struct
import subprocess
import sys
import tempfile
import time
import wave
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import demo_dat
from kmd2obj import load as cargar_kmd
from export_glb import exportar as exportar_glb, indice_texturas
from pcx_mgs import decode as decodificar_pcx
RAIZ = demo_dat.RAIZ
ST = os.path.join(EXTRAIDO, 'disco1', '01_stages')
ST_DEMO = ST
BASE_DISCO2 = 200000

def id_demo(disco, sector):
    return sector if disco == 1 else BASE_DISCO2 + sector
ASSETS = ASSETS
DEMOS = os.path.join(ASSETS, 'demos')
ESCALA = 0.001
FPS = demo_dat.FPS_DEMO
TICK_SUBT = demo_dat.TICK_SUBT_SEG
COLS_CAMARA = 8
COLS_MODELO = 7
FORMATO = 'original'
ENVOLVENTE = False
PRIORIDAD = [5183, 6843, 7979, 8655, 0, 3209, 3920, 88829, 89151]
EF = dict(FADEIN=3, FADEOUT=4, TEXT=5, SHADOW=14, MESSAGE=16, SEPIA=27, UNSHAPEVIEW=29, STOP=31, BLUR=34, MONOTONE=36, PADVIBRATION=54, PADVIBRATION2=64, GHOST=65, TEXT2=74)
ST_DAT = struct.Struct('<Ii7hhhxxIhxxI')
ST_CHA = struct.Struct('<ii6h16h')
ST_ADJ = struct.Struct('<ihhhhhhhhI')

def md5(path):
    h = hashlib.md5()
    with open(path, 'rb') as f:
        h.update(f.read())
    return h.hexdigest()

def nodos_glb(path):
    with open(path, 'rb') as f:
        d = f.read(20)
        n = struct.unpack_from('<I', d, 12)[0]
        js = json.loads(f.read(n))
    return [x.get('name', '') for x in js.get('nodes', [])]

def kmds_llamados(nombre, stages, raiz=None):
    out = []
    for st in stages:
        for f in sorted(glob.glob(os.path.join(raiz or ST, st, '*', nombre + '.kmd'))):
            if f not in out:
                out.append(f)
    return out

def kmd_de_zmd(info, stages):
    from jefes_export import kmd_de_zmd as sacar
    h = info.get('hash')
    if h is None:
        return None
    disco = os.path.basename(os.path.dirname(ST_DEMO))
    for st in list(stages) + sorted(os.listdir(ST_DEMO)):
        for z in sorted(glob.glob(os.path.join(ST_DEMO, st, '*', '*.zmd'))):
            dst = os.path.join(EXTRAIDO, '_kmd_de_zmd', disco, st, info['nombre'] + '.kmd')
            if os.path.exists(dst):
                return dst
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            if sacar(z, h & 65535, dst):
                return dst
    return None
_indice_tipo = None

def indice_por_tipo():
    global _indice_tipo
    if _indice_tipo is None:
        p = os.path.join(EXTRAIDO, '02_por_tipo', '_indice.json')
        _indice_tipo = {}
        if os.path.exists(p):
            for r in json.load(open(p, encoding='utf-8')):
                if r['archivo'].endswith('.kmd'):
                    _indice_tipo[os.path.basename(r['archivo'])[:-4]] = r
    return _indice_tipo

class Resolutor:

    def __init__(self, stages_script, log):
        self.stages_script = stages_script
        self.log = log
        self.nuevos = []

    def candidatos(self, info):
        c = list(self.stages_script)
        for st in info['stages']:
            if st not in c:
                c.append(st)
        for st in ('init', 'init_tux'):
            if st not in c:
                c.append(st)
        return c

    def kmd(self, info):
        for f in kmds_llamados(info['nombre'], self.candidatos(info), ST_DEMO):
            return f
        for f in sorted(glob.glob(os.path.join(ST_DEMO, '*', '*', info['nombre'] + '.kmd'))):
            return f
        return kmd_de_zmd(info, self.candidatos(info))

    def glb(self, info, kmd_path, n_piezas, es_mapa):
        nombre = info['nombre']
        firma = md5(kmd_path)
        necesita_huesos = not es_mapa and n_piezas > 1

        def sirve(glb_abs):
            if not os.path.exists(glb_abs):
                return False
            if necesita_huesos and 'hueso_1' not in nodos_glb(glb_abs):
                return False
            return True
        for st in self.candidatos(info):
            glb_abs = os.path.join(ASSETS, 'niveles', st, nombre + '.glb')
            if not sirve(glb_abs):
                continue
            for k in kmds_llamados(nombre, [st, 'init']):
                if md5(k) == firma:
                    return 'niveles/%s/%s.glb' % (st, nombre)
        idx = indice_por_tipo()
        for clave in [nombre] + ['%s_%s' % (st, nombre) for st in self.candidatos(info)]:
            r = idx.get(clave)
            glb_abs = os.path.join(ASSETS, 'modelos', clave + '.glb')
            if not r or not sirve(glb_abs):
                continue
            base = clave[len(r['escenarios'][0]) + 1:] if clave.startswith(r['escenarios'][0] + '_') else clave
            for st in r['escenarios']:
                ks = kmds_llamados(base, [st])
                if ks:
                    if md5(ks[0]) == firma:
                        return 'modelos/%s.glb' % clave
                    break
        estatico = es_mapa or n_piezas <= 1
        rel = 'demos/modelos/%s_%s%s.glb' % (nombre, firma[:8], '' if estatico else '_h')
        dst = os.path.join(ASSETS, rel)
        if os.path.exists(dst):
            return rel
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        try:
            r = exportar_glb(kmd_path, dst, estatico=estatico)
            self.log('  glb nuevo %s (%d piezas, %d caras, %d texturas%s, %d KB)' % (rel, r['piezas'], r['caras'], r['texturas'], ', estatico' if estatico else '', os.path.getsize(dst) // 1024))
            self.nuevos.append((rel, os.path.getsize(dst)))
        except Exception as e:
            self.log('  ! no se pudo exportar %s: %s' % (nombre, e))
            return None
        return rel

def decodificar_adpcm_rapido(datos, estado):
    import numpy as np
    n_bloques = len(datos) // 16
    if n_bloques == 0:
        return np.zeros(0, dtype=np.int16)
    b = np.frombuffer(datos[:n_bloques * 16], dtype=np.uint8).reshape(n_bloques, 16)
    shift = (b[:, 0] & 15).astype(np.int32)
    filt = np.minimum(b[:, 0] >> 4 & 7, 4)
    nib = b[:, 2:16]
    s = np.empty((n_bloques, 28), dtype=np.int32)
    s[:, 0::2] = (nib & 15).astype(np.int32)
    s[:, 1::2] = (nib >> 4).astype(np.int32)
    s = s << 12
    s = np.where(s & 32768, s - 65536, s)
    x = (s >> shift[:, None]).astype(np.float64)
    a1 = np.array([0, 60, 115, 98, 122], dtype=np.float64)[filt] / 64.0
    a2 = np.array([0, 0, -52, -55, -60], dtype=np.float64)[filt] / 64.0
    zs = np.empty_like(x)
    h1 = np.empty_like(x)
    h2 = np.empty_like(x)
    zs[:, 0] = x[:, 0]
    h1[:, 0] = a1
    h2[:, 0] = a2
    zs[:, 1] = x[:, 1] + a1 * zs[:, 0]
    h1[:, 1] = a1 * h1[:, 0] + a2
    h2[:, 1] = a1 * h2[:, 0]
    for k in range(2, 28):
        zs[:, k] = x[:, k] + a1 * zs[:, k - 1] + a2 * zs[:, k - 2]
        h1[:, k] = a1 * h1[:, k - 1] + a2 * h1[:, k - 2]
        h2[:, k] = a1 * h2[:, k - 1] + a2 * h2[:, k - 2]
    S1 = np.empty(n_bloques)
    S2 = np.empty(n_bloques)
    s1, s2 = (float(estado[0]), float(estado[1]))
    z27, z26 = (zs[:, 27].tolist(), zs[:, 26].tolist())
    a27, a26 = (h1[:, 27].tolist(), h1[:, 26].tolist())
    b27, b26 = (h2[:, 27].tolist(), h2[:, 26].tolist())
    for i in range(n_bloques):
        S1[i] = s1
        S2[i] = s2
        n1 = z27[i] + s1 * a27[i] + s2 * b27[i]
        n2 = z26[i] + s1 * a26[i] + s2 * b26[i]
        s1, s2 = (n1, n2)
    out = zs + S1[:, None] * h1 + S2[:, None] * h2
    estado[0], estado[1] = (s1, s2)
    return np.clip(np.rint(out.ravel()), -32768, 32767).astype(np.int16)

def exportar_audio(mm, cab_pcm, bloques, salida_m4a, log):
    import numpy as np
    est_d, est_i = ([0.0, 0.0], [0.0, 0.0])
    der, izq = ([], [])
    for q, tam in bloques:
        d = bytes(mm[q + 4:q + tam])
        if cab_pcm['canales'] == 1:
            izq.append(decodificar_adpcm_rapido(d, est_i))
        else:
            der.append(decodificar_adpcm_rapido(d[:4096], est_d))
            izq.append(decodificar_adpcm_rapido(d[4096:], est_i))
    hz = int(round(cab_pcm['hz']))
    I = np.concatenate(izq) if izq else np.zeros(0, np.int16)
    if cab_pcm['canales'] == 1:
        pcm = I
    else:
        D = np.concatenate(der)
        n = min(len(I), len(D))
        pcm = np.empty(n * 2, dtype=np.int16)
        pcm[0::2] = I[:n]
        pcm[1::2] = D[:n]
    segundos = len(I) / float(hz)
    mono = I.astype(np.float32)
    v = int(hz * 0.1)
    env = [round(float(np.sqrt(np.mean(mono[i:i + v] ** 2))) / 32768, 4) for i in range(0, len(mono) - v + 1, v)]
    fd, wav_tmp = tempfile.mkstemp(suffix='.wav')
    os.close(fd)
    try:
        with wave.open(wav_tmp, 'wb') as w:
            w.setnchannels(cab_pcm['canales'])
            w.setsampwidth(2)
            w.setframerate(hz)
            w.writeframes(pcm.tobytes())
        cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-i', wav_tmp, '-ar', '44100', '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', salida_m4a]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0:
            log('  ! ffmpeg fallo: %s' % r.stderr.strip()[:300])
            return (None, env)
    finally:
        try:
            os.remove(wav_tmp)
        except OSError:
            pass
    return ({'archivo': 'audio.m4a', 'hz_original': hz, 'hz': 44100, 'canales': cab_pcm['canales'], 'segundos': round(segundos, 3), 'bytes_adpcm': cab_pcm['bytes'], 'muestras': int(len(I)), 'bytes': os.path.getsize(salida_m4a)}, env)

def envolvente(mm, cab_pcm, bloques):
    import numpy as np
    est, izq = ([0.0, 0.0], [])
    for q, tam in bloques:
        d = bytes(mm[q + 4:q + tam])
        izq.append(decodificar_adpcm_rapido(d if cab_pcm['canales'] == 1 else d[4096:], est))
    mono = (np.concatenate(izq) if izq else np.zeros(0, np.int16)).astype(np.float32)
    v = int(int(round(cab_pcm['hz'])) * 0.1)
    return [round(float(np.sqrt(np.mean(mono[i:i + v] ** 2))) / 32768, 4) for i in range(0, len(mono) - v + 1, v)]

def audio_original(mm, cab_pcm, bloques, carpeta, log):
    datos, n = demo_dat.adpcm_crudo(mm, bloques, cab_pcm['canales'])
    if datos is None:
        log('  ! audio: %s; va en m4a' % n)
        return None
    hz = int(round(cab_pcm['hz']))
    with open(os.path.join(carpeta, 'audio.adpcm'), 'wb') as f:
        f.write(datos)
    a = {'archivo': 'audio.adpcm', 'formato': 'adpcm', 'hz_original': hz, 'hz': hz, 'canales': cab_pcm['canales']}
    if cab_pcm['canales'] == 2:
        a['bloque'] = demo_dat.BLOQUE_ESTEREO
    a.update({'segundos': round(n / float(hz), 3), 'bytes_adpcm': cab_pcm['bytes'], 'muestras': n, 'bytes': len(datos)})
    return a

def i32(p16, k):
    return p16[k] & 65535 | p16[k + 1] << 16

def decodificar_efecto(tipo, p16):
    if tipo in (EF['FADEIN'], EF['FADEOUT']):
        return {'cuadros': i32(p16, 0), 'blanco': bool(p16[2])}
    if tipo == EF['TEXT']:
        return {'reload': i32(p16, 0), 'x': p16[2], 'y': p16[3], 'tex': i32(p16, 4) & 65535}
    if tipo == EF['TEXT2']:
        return {'reload': i32(p16, 0), 'x': p16[2], 'y': p16[3], 'tex': i32(p16, 4) & 65535, 'tex2': i32(p16, 6) & 65535}
    if tipo == EF['SHADOW']:
        return {'modelo': i32(p16, 0), 'huesos': list(p16[2:6]), 'sacar': p16[6] == 1, 'rgb': [p16[7] & 255, p16[8] & 255, p16[9] & 255]}
    if tipo == EF['MESSAGE']:
        return {'destino': i32(p16, 0) & 65535, 'mensaje': [i32(p16, k) for k in range(2, 16, 2)]}
    if tipo in (EF['BLUR'], EF['MONOTONE'], EF['GHOST'], EF['SEPIA'], EF['UNSHAPEVIEW']):
        return {'prender': p16[0] == 0, 'a': p16[1], 'b': p16[2], 'c': p16[3]}
    if tipo in (EF['PADVIBRATION'], EF['PADVIBRATION2']):
        return {'v1': bool(p16[0]), 'v2': i32(p16, 2) if p16[1] else None}
    return None

def leer_cuadro(mm, q):
    tag, frame, ex, ey, ez, cx, cy, cz, roll, clip, n_cha, off_cha, n_adj, off_adj = ST_DAT.unpack_from(mm, q)
    fin = q + (tag >> 8)
    efs = []
    for i in range(n_cha):
        p = q + off_cha + i * 52
        if p + 52 > fin:
            break
        efs.append(ST_CHA.unpack_from(mm, p))
    mods = []
    for i in range(n_adj):
        p = q + off_adj + i * 24
        if p + 24 > fin:
            break
        tipo, vis, rx, ry, rz, px, py, pz, nr, offr = ST_ADJ.unpack_from(mm, p)
        rots = ()
        if vis and nr and (p + offr + nr * 6 <= fin):
            rots = struct.unpack_from('<%dh' % (nr * 3), mm, p + offr)
        mods.append((tipo, vis, rx, ry, rz, px, py, pz, rots))
    return (frame, (ex, ey, ez, cx, cy, cz, roll, clip), efs, mods)
_shadow_hecho = False

def exportar_comunes(log):
    global _shadow_hecho
    if _shadow_hecho:
        return
    dst = os.path.join(DEMOS, 'comun', 'shadow.png')
    if not os.path.exists(dst):
        src = os.path.join(ST, 'init', 'nocache', 'shadow.pcx')
        if os.path.exists(src):
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            decodificar_pcx(src).save(dst)
            log('textura comun: %s' % os.path.relpath(dst, RAIZ))
    _shadow_hecho = True

def exportar_demo(mm, sector, refs, salida_base, con_audio=True, forzar=False, log=print, disco=1):
    import numpy as np
    s = demo_dat.stream_en(mm, sector)
    if not s:
        log('sector %d: no arranca ningun stream' % sector)
        return None
    id_carpeta = id_demo(disco, sector)
    salida_rel = 'demos/%d' % id_carpeta
    salida_abs = os.path.join(salida_base, str(id_carpeta))
    json_path = os.path.join(salida_abs, 'demo.json')
    if os.path.exists(json_path) and (not forzar):
        d = json.load(open(json_path, encoding='utf-8'))
        if d.get('version') == 2:
            log('sector %d: ya exportado (usa --forzar para rehacer)' % sector)
            return d
    exportar_comunes(log)
    t0 = time.time()
    guion = refs.get((disco, sector), [])
    stages_script = []
    for g in guion:
        if g['stage'] not in stages_script:
            stages_script.append(g['stage'])
    nombres_dmo = sorted(set((g['archivo_dmo'] for g in guion if g['archivo_dmo'])))
    cab = None
    cuadros = []
    pcm_cab = None
    bloques_pcm = []
    subt = []
    for q, t, tam in demo_dat.paquetes(mm, s['offset'], s['fin']):
        if t == 5:
            if cab is None:
                cab = demo_dat.leer_dmo_def(mm, q)
            else:
                cuadros.append(leer_cuadro(mm, q))
        elif t == 2:
            pcm_cab = demo_dat.leer_pcm_cab(mm, q)
        elif t == 1:
            bloques_pcm.append((q, tam))
        elif t in (3, 6):
            subt.append(demo_dat.leer_subtitulos(mm, q))
        elif t == 240:
            break
    if not cab:
        log('sector %d: sin cabecera DMO_DEF' % sector)
        return None
    n = cab['n_cuadros']
    log('sector %d: %d cuadros (%.1f s), %d mapas, %d modelos, stages %s' % (sector, n, n / float(FPS), cab['n_mapas'], cab['n_modelos'], ','.join(stages_script) or '-'))
    os.makedirs(salida_abs, exist_ok=True)
    res = Resolutor(stages_script, log)
    mapas = []
    for m in cab['mapas']:
        info = m['cache']
        k = res.kmd(info)
        ent = {'nombre': info['nombre'], 'hash': info['hash'], 'kmd': os.path.relpath(k, RAIZ).replace('\\', '/') if k else None, 'glb': None}
        if k:
            piezas = cargar_kmd(k)
            ent['caras'] = sum((len(p['vi']) // 4 for p in piezas))
            if ent['caras'] > 1:
                ent['glb'] = res.glb(info, k, len(piezas), es_mapa=True)
        else:
            log('  ! mapa %s sin kmd' % info['archivo'])
        mapas.append(ent)
    visibles, nr_max = ({}, {})
    for _, _, _, mods in cuadros:
        for tipo, vis, *_r, rots in mods:
            if vis:
                visibles[tipo] = visibles.get(tipo, 0) + 1
                nr_max[tipo] = max(nr_max.get(tipo, 0), len(rots) // 3)
    modelos = []
    for m in cab['modelos']:
        info = m['cache']
        k = res.kmd(info)
        ent = {'tipo': m['tipo'], 'nombre': info['nombre'], 'hash': info['hash'], 'una_pieza': m['una_pieza'], 'control': m['nombre_control_txt'] or None, 'visible_cuadros': visibles.get(m['tipo'], 0), 'kmd': os.path.relpath(k, RAIZ).replace('\\', '/') if k else None, 'glb': None, 'huesos': 0, 't0': [0, 0, 0]}
        if k:
            piezas = cargar_kmd(k)
            ent['huesos'] = len(piezas)
            ent['padres'] = [p['parent'] for p in piezas]
            ent['t0'] = [round(v * ESCALA, 4) for v in piezas[0]['t']]
            if ent['visible_cuadros']:
                ent['glb'] = res.glb(info, k, len(piezas), es_mapa=False)
            nr = nr_max.get(m['tipo'])
            if nr is not None and nr != len(piezas):
                log('  ! modelo %s: n_rots del stream %d != piezas del kmd %d' % (info['nombre'], nr, len(piezas)))
                ent['huesos_stream'] = nr
        else:
            ent['huesos'] = nr_max.get(m['tipo'], 0)
            log('  ! modelo %s (tipo %d) sin kmd; se reservan %d huesos' % (info['archivo'], m['tipo'], ent['huesos']))
        modelos.append(ent)
    stride = COLS_CAMARA
    for ent in modelos:
        ent['offset'] = stride
        stride += COLS_MODELO + 3 * ent['huesos']
    A = np.zeros((n, stride), dtype=np.int16)
    por_tipo = {ent['tipo']: i for i, ent in enumerate(modelos)}
    huecos, fuera, ultimo = (0, 0, None)
    for frame, cam, _, mods in cuadros:
        f = frame - 1
        if f < 0 or f >= n:
            fuera += 1
            continue
        if ultimo is not None and f != ultimo + 1:
            huecos += 1
            A[ultimo + 1:f] = A[ultimo]
        A[f, 0:8] = cam
        for tipo, vis, rx, ry, rz, px, py, pz, rots in mods:
            i = por_tipo.get(tipo)
            if i is None or not vis:
                continue
            ent = modelos[i]
            o = ent['offset']
            A[f, o:o + 7] = (1, rx, ry, rz, px, py, pz)
            nh = min(len(rots), 3 * ent['huesos'])
            if nh:
                A[f, o + 7:o + 7 + nh] = rots[:nh]
        ultimo = f
    D = A.copy()
    D[1:] = A[1:] - A[:-1]
    crudo = D.astype('<i2').tobytes()
    comprimido = gzip.compress(crudo, 9, mtime=0)
    with open(os.path.join(salida_abs, 'cuadros.bin'), 'wb') as f_out:
        f_out.write(comprimido)
    efectos = []
    abiertos = {}
    resumen = {}
    texturas = {}
    local_tex, global_tex = indice_texturas(os.path.join(ST_DEMO, stages_script[0]) if stages_script else None)
    for frame, _, efs, _ in cuadros:
        vistos = set()
        for ident, tipo, rx, ry, rz, px, py, pz, *p16 in efs:
            nombre = demo_dat.EFECTOS.get(tipo, '?')
            resumen[nombre] = resumen.get(nombre, 0) + 1
            vistos.add(ident)
            tr = abiertos.get(ident)
            if tr and tr['c1'] == frame - 1 and (tr['tipo'] == tipo):
                tr['c1'] = frame
                continue
            tr = {'id': ident, 'tipo': tipo, 'n': nombre, 'c0': frame, 'c1': frame}
            if any((rx, ry, rz)):
                tr['rot'] = [rx, ry, rz]
            if any((px, py, pz)):
                tr['pos'] = [px, py, pz]
            d = decodificar_efecto(tipo, p16)
            if d is not None:
                tr['d'] = d
            else:
                ult = max([k for k, v in enumerate(p16) if v] or [-1])
                if ult >= 0:
                    tr['p'] = list(p16[:ult + 1])
            efectos.append(tr)
            abiertos[ident] = tr
            for clave in ('tex', 'tex2'):
                h = (d or {}).get(clave)
                if h is not None and h not in texturas:
                    pcx = local_tex.get(h) or global_tex.get(h)
                    if pcx:
                        png = 'tex_%04x.png' % h
                        dst = os.path.join(salida_abs, png)
                        im = decodificar_pcx(pcx)
                        im.save(dst)
                        texturas[h] = {'png': '%s/%s' % (salida_rel, png), 'pcx': os.path.basename(pcx), 'w': im.size[0], 'h': im.size[1]}
                    else:
                        texturas[h] = None
                        log('  ! textura %04x del telop no encontrada' % h)
        for ident in [k for k in abiertos if k not in vistos]:
            del abiertos[ident]
    lineas = []
    for sb in subt:
        for l in sb['lineas']:
            lineas.append({'t': round(l['inicio'] * TICK_SUBT, 3), 'd': round(l['duracion'] * TICK_SUBT, 3), 'texto': l['texto']})
    lineas.sort(key=lambda l: l['t'])
    audio, env = (None, None)
    if pcm_cab and con_audio and (FORMATO == 'original'):
        audio = audio_original(mm, pcm_cab, bloques_pcm, salida_abs, log)
        if audio and ENVOLVENTE:
            env = envolvente(mm, pcm_cab, bloques_pcm)
    if pcm_cab and con_audio and (not audio):
        audio, env = exportar_audio(mm, pcm_cab, bloques_pcm, os.path.join(salida_abs, 'audio.m4a'), log)
    elif pcm_cab and (not audio):
        audio = {'archivo': None, 'hz_original': int(round(pcm_cab['hz'])), 'canales': pcm_cab['canales'], 'segundos': round(pcm_cab['segundos'], 3)}
    eye = A[:, 0:3].astype(np.float64)
    clips = A[:, 7]
    saltos = int(np.sum(np.linalg.norm(np.diff(eye, axis=0), axis=1) > 1500)) if n > 1 else 0
    peso_tex = sum((os.path.getsize(os.path.join(salida_abs, 'tex_%04x.png' % h)) for h, v in texturas.items() if v))
    demo = {'version': 2, 'sector': sector, 'disco': disco, 'id': id_carpeta, 'offset': s['offset'], 'bytes': s['bytes'], 'dmo': nombres_dmo, 'stages': stages_script, 'contexto': stages_script[0] if stages_script else None, 'scripts': [{k: g[k] for k in ('stage', 'script', 'proc', 'proc_fin', 'archivo_dmo')} for g in guion], 'fps': FPS, 'n_cuadros': n, 'duracion': round(n / float(FPS), 3), 'cuadros_leidos': len(cuadros), 'cuadros_huecos': huecos, 'cuadros_fuera': fuera, 'cuadros': {'archivo': 'cuadros.bin', 'codificacion': 'gzip(delta por columna de int16 little-endian)', 'stride': stride, 'bytes': len(comprimido), 'bytes_crudos': len(crudo), 'camara': ['eye_x', 'eye_y', 'eye_z', 'center_x', 'center_y', 'center_z', 'roll', 'clip_dist'], 'modelo': ['visible', 'rot_x', 'rot_y', 'rot_z', 'pos_x', 'pos_y', 'pos_z', 'huesos[n*3]'], 'unidades': 'mm y 4096 = 360 grados; raiz Euler YXZ (DG_SetPos2), huesos Euler ZYX (RotMatrixZYX)'}, 'camara': {'roll_min': int(A[:, 6].min()), 'roll_max': int(A[:, 6].max()), 'clip_min': int(clips.min()), 'clip_max': int(clips.max()), 'cortes': saltos}, 'mapas': mapas, 'modelos': modelos, 'efectos': efectos, 'efectos_resumen': resumen, 'texturas': {'%04x' % h: v for h, v in texturas.items()}, 'subtitulos': lineas, 'audio': audio, 'envolvente_audio': env, 'generado': time.strftime('%Y-%m-%d %H:%M')}
    demo['pesos'] = {'cuadros': len(comprimido), 'audio': (audio or {}).get('bytes', 0), 'texturas': peso_tex, 'glb_nuevos': sum((b for _, b in res.nuevos)), 'glb_nuevos_lista': [r for r, _ in res.nuevos]}
    txt = json.dumps(demo, ensure_ascii=False, separators=(',', ':'))
    demo['pesos']['json'] = len(txt.encode('utf-8'))
    json.dump(demo, open(json_path, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    p = demo['pesos']
    log('  listo en %.1f s: cuadros %d KB (crudo %d KB), audio %s, json %d KB, %d tramos de efectos, %d subtitulos' % (time.time() - t0, len(comprimido) // 1024, len(crudo) // 1024, '%.1f s / %d KB' % (audio['segundos'], audio['bytes'] // 1024) if audio and audio.get('archivo') else 'no', p['json'] // 1024, len(efectos), len(lineas)))
    return demo

def actualizar_indice(salida_base):
    filas = []
    for p in sorted(glob.glob(os.path.join(salida_base, '*', 'demo.json')), key=lambda x: int(os.path.basename(os.path.dirname(x)))):
        d = json.load(open(p, encoding='utf-8'))
        if d.get('version') != 2:
            continue
        carpeta = os.path.dirname(p)
        peso = sum((os.path.getsize(os.path.join(carpeta, f)) for f in os.listdir(carpeta)))
        filas.append({'sector': d['sector'], 'disco': d.get('disco', 1), 'id': d.get('id', d['sector']), 'dmo': d['dmo'], 'stages': d['stages'], 'contexto': d['contexto'], 'n_cuadros': d['n_cuadros'], 'duracion': d['duracion'], 'mapas': [m['nombre'] for m in d['mapas']], 'modelos': [m['nombre'] for m in d['modelos'] if m['visible_cuadros']], 'primer_subtitulo': d['subtitulos'][0]['texto'] if d['subtitulos'] else '', 'audio': bool(d['audio'] and d['audio'].get('archivo')), 'carpeta': 'demos/%d' % d.get('id', d['sector']), 'bytes': peso, 'bytes_glb_nuevos': d['pesos']['glb_nuevos'], 'efectos': d['efectos_resumen']})
    comp = os.path.join(salida_base, 'modelos')
    comunes = sum((os.path.getsize(os.path.join(comp, f)) for f in os.listdir(comp))) if os.path.isdir(comp) else 0
    json.dump({'demos': filas, 'bytes_demos': sum((f['bytes'] for f in filas)), 'bytes_modelos_compartidos': comunes}, open(os.path.join(salida_base, 'indice.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return filas

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('sectores', nargs='*', type=int)
    ap.add_argument('--stages', help='stages separados por coma: exporta las demos que piden sus scripts')
    ap.add_argument('--todas', action='store_true')
    ap.add_argument('--disco', type=int, default=1)
    ap.add_argument('--sin-audio', action='store_true')
    ap.add_argument('--forzar', action='store_true')
    ap.add_argument('--salida', default=DEMOS)
    ap.add_argument('--scripts', default=os.path.join(DOCS, 'demo', 'demos_scripts.json'))
    ap.add_argument('--formato', choices=('original', 'm4a'), default='original')
    ap.add_argument('--envolvente', action='store_true')
    a = ap.parse_args()
    global FORMATO, ENVOLVENTE
    FORMATO, ENVOLVENTE = (a.formato, a.envolvente)
    try:
        sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
    except Exception:
        pass
    global ST_DEMO
    ST_DEMO = os.path.join(EXTRAIDO, 'disco%d' % a.disco, '01_stages')
    refs = demo_dat.indice_scripts(a.scripts)
    sectores = list(a.sectores)
    if a.stages:
        quiero = set(a.stages.split(','))
        for (disco, sec), gs in sorted(refs.items()):
            if disco == a.disco and any((g['stage'] in quiero for g in gs)) and (sec not in sectores):
                sectores.append(sec)
    path, f, mm = demo_dat.abrir(a.disco)
    if a.todas:
        todos = [s['sector'] for s in demo_dat.hallar_streams(mm) if 'fin' in s and 'error' not in s]
        if a.disco == 2:
            todos = [x for x in todos if x not in (0, 3209, 3920)]
        for sec in (PRIORIDAD if a.disco == 1 else []) + todos:
            if sec in todos and sec not in sectores:
                sectores.append(sec)
    if not sectores:
        print('nada que exportar (dame sectores, --stages o --todas)')
        return
    os.makedirs(a.salida, exist_ok=True)
    t0 = time.time()
    ok = 0
    for sec in sectores:
        try:
            if exportar_demo(mm, sec, refs, a.salida, con_audio=not a.sin_audio, forzar=a.forzar, disco=a.disco):
                ok += 1
        except Exception as e:
            import traceback
            traceback.print_exc()
            print('sector %d: ERROR %s' % (sec, e))
        actualizar_indice(a.salida)
    filas = actualizar_indice(a.salida)
    print('\n%d/%d demos exportadas en %.0f s; indice con %d entradas en %s' % (ok, len(sectores), time.time() - t0, len(filas), os.path.join(a.salida, 'indice.json')))
if __name__ == '__main__':
    main()
