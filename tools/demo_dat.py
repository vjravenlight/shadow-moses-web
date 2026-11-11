# MGS web — FeniXVOID · Project Ravenlight
import argparse
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
import glob
import json
import mmap
import os
import re
import struct
import sys
import wave
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SRC = os.path.join(RAIZ, 'ref', 'mgs_reversing', 'source')
SECTOR = 2048
FPS_DEMO = 30
TICK_SUBT_SEG = 448 * 4 / 44100.0
TIPOS = {0: 'vacio', 1: 'pcm', 2: 'pcm_cab', 3: 'subt_a', 4: 'marca_a', 5: 'demo', 6: 'subt_b', 7: 'marca_b', 16: 'control', 240: 'fin'}
ACCIONES = {1: 'pcm', 3: 'subtitulos', 5: 'demo', 6: 'subtitulos_b'}
TAM_DMO_DEF = 28
TAM_DMO_MAP = 8
TAM_DMO_MDL = 20
TAM_DMO_DAT = 40
TAM_DMO_CHA = 52
TAM_DMO_ADJ = 24

def ruta_demo(disco):
    return os.path.join(EXTRAIDO, 'disco%d' % disco, '00_disco', 'MGS', 'DEMO.DAT')

def strcode(s):
    i = 0
    for c in s.encode('latin1'):
        i = (i << 5 | i >> 11) & 65535
        i = i + c & 65535
    return i
_nombres = None
_donde = None

def cargar_nombres():
    global _nombres, _donde
    if _nombres is not None:
        return
    _nombres, _donde = ({}, {})
    nf = os.path.join(RAIZ, 'tools', 'names.txt')
    if os.path.exists(nf):
        for n in open(nf, encoding='latin1').read().split():
            _nombres.setdefault(strcode(n), n)
    for f in glob.glob(os.path.join(EXTRAIDO, 'disco*', '01_stages', '*', '*', '*.*')):
        base, ext = os.path.splitext(os.path.basename(f))
        ext = ext[1:].lower()
        if re.fullmatch('[0-9a-f]{4}', base):
            h = int(base, 16)
        else:
            h = strcode(base)
            _nombres.setdefault(h, base)
        stage = os.path.basename(os.path.dirname(os.path.dirname(f)))
        _donde.setdefault((ext, h), set()).add(stage)

def nombre(h):
    cargar_nombres()
    return _nombres.get(h & 65535, '%04x' % (h & 65535))

def cache_id_info(cid):
    cargar_nombres()
    raiz = cid & 65535
    spec = cid >> 16 & 255
    ext = chr(spec + 97) if spec < 26 else '?'
    exts = {'k': 'kmd', 'o': 'oar', 'h': 'hzm', 'l': 'lit', 'p': 'pcx', 'r': 'rpk', 'n': 'nar', 'i': 'img', 's': 'sgt'}
    ext_larga = exts.get(ext, ext)
    return {'cache_id': cid, 'hash': raiz, 'nombre': nombre(raiz), 'archivo': '%s.%s' % (nombre(raiz), ext_larga), 'residente': bool(cid & 16777216), 'stages': sorted(_donde.get((ext_larga, raiz), ()))}

def cargar_efectos():
    ef = {}
    p = os.path.join(SRC, 'kojo', 'demo.h')
    if not os.path.exists(p):
        try:
            import tablas_ref
            return tablas_ref.efectos_demo()
        except Exception:
            return ef
    if os.path.exists(p):
        for m in re.finditer('#define\\s+EFFECT_(\\w+)\\s+(\\d+)', open(p, encoding='utf-8', errors='replace').read()):
            ef[int(m.group(2))] = m.group(1)
    return ef
EFECTOS = cargar_efectos()

def paquetes(mm, off, tope=None):
    n = len(mm) if tope is None else min(len(mm), tope)
    p = off
    while p + 4 <= n:
        w = struct.unpack_from('<I', mm, p)[0]
        t, tam = (w & 255, w >> 8)
        yield (p, t, tam)
        if t == 240 or tam < 4 or t not in TIPOS or (p + tam > n):
            return
        p += tam

def leer_dmo_def(mm, off):
    tag, frame, n_frames, n_maps, n_models, off_maps, off_models = struct.unpack_from('<IiiiiII', mm, off)
    mapas, modelos = ([], [])
    for i in range(n_maps):
        cid, fn = struct.unpack_from('<Ii', mm, off + off_maps + i * TAM_DMO_MAP)
        mapas.append({'cache': cache_id_info(cid), 'archivo_hash': fn & 65535, 'archivo_nombre': nombre(fn)})
    for i in range(n_models):
        tipo, flag, cid, fn, nm = struct.unpack_from('<iiIii', mm, off + off_models + i * TAM_DMO_MDL)
        modelos.append({'tipo': tipo, 'flag': flag, 'una_pieza': bool(flag & 1), 'cache': cache_id_info(cid), 'archivo_hash': fn & 65535, 'archivo_nombre': nombre(fn), 'nombre_control': nm & 65535, 'nombre_control_txt': nombre(nm) if nm else ''})
    tam = tag >> 8
    esperado = TAM_DMO_DEF + n_maps * TAM_DMO_MAP + n_models * TAM_DMO_MDL
    return {'offset': off, 'tamanio': tam, 'tamanio_esperado': esperado, 'cuadro': frame, 'n_cuadros': n_frames, 'n_mapas': n_maps, 'n_modelos': n_models, 'mapas': mapas, 'modelos': modelos}

def leer_dmo_dat(mm, off, con_huesos=True):
    tag, frame, ex, ey, ez, cx, cy, cz, roll, clip, n_cha, off_cha, n_adj, off_adj = struct.unpack_from('<Ii7hhhxxIhxxI', mm, off)
    tam = tag >> 8
    fin = off + tam
    efectos = []
    for i in range(n_cha):
        q = off + off_cha + i * TAM_DMO_CHA
        if q + TAM_DMO_CHA > fin:
            efectos.append({'error': 'DMO_CHA fuera del paquete', 'offset': q})
            break
        ident, tipo, rx, ry, rz, px, py, pz = struct.unpack_from('<ii6h', mm, q)
        crudo = bytes(mm[q + 20:q + TAM_DMO_CHA])
        e = {'id': ident, 'tipo': tipo, 'nombre': EFECTOS.get(tipo, '?'), 'rot': [rx, ry, rz], 'pos': [px, py, pz], 'param_hex': crudo.hex(), 'param_i16': list(struct.unpack('<16h', crudo)), 'param_i32': list(struct.unpack('<8i', crudo))}
        if tipo in (3, 4):
            e['decodificado'] = {'duracion': e['param_i32'][0], 'blanco': bool(e['param_i16'][2])}
        elif tipo == 16:
            e['decodificado'] = {'destino': e['param_i32'][0] & 65535, 'mensaje': e['param_i32'][1:]}
        efectos.append(e)
    modelos = []
    for i in range(n_adj):
        q = off + off_adj + i * TAM_DMO_ADJ
        if q + TAM_DMO_ADJ > fin:
            modelos.append({'error': 'DMO_ADJ fuera del paquete', 'offset': q})
            break
        tipo, vis, rx, ry, rz, px, py, pz, n_rots, off_rots = struct.unpack_from('<ihhhhhhhhI', mm, q)
        m = {'tipo': tipo, 'visible': vis}
        if vis:
            m['pos'] = [px, py, pz]
            m['rot'] = [rx, ry, rz]
            m['n_huesos'] = n_rots
            if con_huesos and n_rots:
                r0 = q + off_rots
                if r0 + n_rots * 6 > fin:
                    m['error'] = 'rots fuera del paquete'
                else:
                    v = struct.unpack_from('<%dh' % (n_rots * 3), mm, r0)
                    m['huesos'] = [list(v[j:j + 3]) for j in range(0, len(v), 3)]
        modelos.append(m)
    return {'offset': off, 'tamanio': tam, 'cuadro': frame, 'camara': {'ojo': [ex, ey, ez], 'centro': [cx, cy, cz], 'roll': roll, 'pantalla': clip}, 'efectos': efectos, 'modelos': modelos}

def leer_pcm_cab(mm, off):
    d = bytes(mm[off + 4:off + 14])
    bytes_, vol, pitch, mono, flag = struct.unpack('>IHHBB', d)
    hz = pitch * 44100 / 4096.0
    canales = 1 if mono == 1 else 2
    muestras = bytes_ // canales // 16 * 28
    return {'offset': off, 'bytes': bytes_, 'volumen': vol, 'pitch': pitch, 'hz': hz, 'mono_raw': mono, 'canales': canales, 'flag9': flag, 'segundos': muestras / hz if hz else None}

def texto_subt(b):
    s = b.replace(b'\x80|', b'\n')
    return s.decode('latin1')

def leer_subtitulos(mm, off):
    tag = struct.unpack_from('<I', mm, off)[0]
    tam = tag >> 8
    base = off + 4
    fin = off + tam
    ini, fin_t, off_lip, off_sub, off_font = struct.unpack_from('<iihhi', mm, base)
    lineas = []
    p = base + off_sub
    while p + 16 <= fin:
        salto, t0, dur, extra = struct.unpack_from('<iiii', mm, p)
        if salto == 0 and t0 == 0 and (dur == 0):
            break
        q = p + 16
        e = mm.find(b'\x00', q, fin)
        txt = bytes(mm[q:e if e >= 0 else fin])
        lineas.append({'inicio': t0, 'duracion': dur, 'extra': extra, 'inicio_seg': round(t0 * TICK_SUBT_SEG, 3), 'duracion_seg': round(dur * TICK_SUBT_SEG, 3), 'texto': texto_subt(txt), 'crudo_hex': txt.hex()})
        if salto == 0:
            break
        p += salto
    lip = bytes(mm[base + off_lip:base + off_sub]) if off_sub > off_lip else b''
    return {'offset': off, 'tipo': tag & 255, 'tamanio': tam, 'inicio': ini, 'fin': fin_t, 'lipsync_hex': lip.hex(), 'fuente_bytes': max(0, fin - (base + off_font)), 'lineas': lineas}
FIRMA = b'\x10\x08\x00\x00'

def hallar_streams(mm):
    streams, p, n = ([], 0, len(mm))
    while p + 8 <= n:
        if mm[p:p + 4] != FIRMA:
            if any(mm[p:p + SECTOR]):
                streams.append({'sector': p // SECTOR, 'offset': p, 'error': 'sector sin cabecera de control ni ceros'})
            p += SECTOR
            continue
        fin_off, ultimo_t, roto = (None, None, False)
        for q, t, tam in paquetes(mm, p):
            ultimo_t = t
            if t == 240:
                fin_off = q + tam
                break
            if tam < 4 or t not in TIPOS or q + tam > n:
                roto = True
                fin_off = q
                break
        if fin_off is None:
            fin_off, roto = (n, True)
        s = {'sector': p // SECTOR, 'offset': p, 'fin': fin_off, 'bytes': fin_off - p}
        if roto:
            s['error'] = 'stream sin 0xF0 (ultimo tipo 0x%02x)' % (ultimo_t or 0)
        streams.append(s)
        p = (fin_off + SECTOR - 1) // SECTOR * SECTOR
    return streams

def analizar_stream(mm, s, huesos_visibles=True):
    info = dict(s)
    info.update({'control': [], 'cabecera': None, 'cuadros': {'n': 0, 'primero': None, 'ultimo': None, 'huecos': 0, 'saltos': []}, 'pcm': None, 'pcm_bloques': 0, 'pcm_bytes': 0, 'subtitulos': [], 'tipos': {}, 'efectos': {}, 'visibles': {}, 'tam_dat_min': None, 'tam_dat_max': None})
    prev = None
    def_leida = False
    for q, t, tam in paquetes(mm, s['offset'], s.get('fin')):
        info['tipos'][t] = info['tipos'].get(t, 0) + 1
        if t == 16:
            v = struct.unpack_from('<I', mm, q + 4)[0]
            info['control'].append({'offset': q, 'tick': v >> 8, 'accion': v & 255, 'accion_nombre': ACCIONES.get(v & 255, '?')})
        elif t == 5:
            if not def_leida:
                info['cabecera'] = leer_dmo_def(mm, q)
                def_leida = True
                continue
            fr = struct.unpack_from('<i', mm, q + 4)[0]
            c = info['cuadros']
            c['n'] += 1
            c['primero'] = fr if c['primero'] is None else c['primero']
            if prev is not None and fr != prev + 1:
                c['huecos'] += 1
                if len(c['saltos']) < 5:
                    c['saltos'].append([prev, fr])
            prev = fr
            c['ultimo'] = fr
            info['tam_dat_min'] = tam if info['tam_dat_min'] is None else min(info['tam_dat_min'], tam)
            info['tam_dat_max'] = tam if info['tam_dat_max'] is None else max(info['tam_dat_max'], tam)
            dat = leer_dmo_dat(mm, q, con_huesos=False)
            for e in dat['efectos']:
                k = e.get('nombre', '?')
                info['efectos'][k] = info['efectos'].get(k, 0) + 1
            for m in dat['modelos']:
                if m.get('visible'):
                    info['visibles'][m['tipo']] = info['visibles'].get(m['tipo'], 0) + 1
        elif t == 2:
            info['pcm'] = leer_pcm_cab(mm, q)
        elif t == 1:
            info['pcm_bloques'] += 1
            info['pcm_bytes'] += tam - 4
        elif t in (3, 6):
            info['subtitulos'].append(leer_subtitulos(mm, q))
        elif t == 240:
            break
    cab = info['cabecera']
    if cab:
        info['segundos'] = cab['n_cuadros'] / float(FPS_DEMO)
        info['frames_ok'] = info['cuadros']['primero'] == 1 and info['cuadros']['ultimo'] == cab['n_cuadros'] and (info['cuadros']['huecos'] == 0) and (info['cuadros']['n'] == cab['n_cuadros'])
    if info['pcm']:
        info['pcm_ok'] = info['pcm_bytes'] == info['pcm']['bytes']
    return info

def escanear_scripts():
    sys.path.insert(0, os.path.join(RAIZ, 'tools'))
    import gcx
    hallados = []

    def opts(args):
        o = {}
        for a in args:
            if isinstance(a, dict) and 'opt' in a:
                o[a['opt']] = [gcx.fmt(v) for v in a['v'] if not (isinstance(v, dict) and 'bloque' in v)]
        return o

    def recorrer(bloque, ctx, proc):
        for s in bloque:
            if isinstance(s, dict) and 'cmd' in s:
                if s['cmd'] in ('demo', 'demodebug'):
                    o = opts(s['args'])
                    sec = o.get('s', [None])[0]
                    try:
                        sec = int(sec)
                    except (TypeError, ValueError):
                        pass
                    hallados.append(dict(ctx, proc=proc, comando=s['cmd'], sector=sec, archivo_dmo=(o.get('f') or [''])[0].strip('"'), proc_fin=(o.get('p') or [''])[0], opciones=sorted(o)))
                for a in s['args']:
                    if isinstance(a, dict):
                        if 'bloque' in a:
                            recorrer(a['bloque'], ctx, proc)
                        if 'opt' in a:
                            for v in a['v']:
                                if isinstance(v, dict) and 'bloque' in v:
                                    recorrer(v['bloque'], ctx, proc)
    for disco in (1, 2):
        for path in sorted(glob.glob(os.path.join(EXTRAIDO, 'disco%d' % disco, '01_stages', '*', 'cache', '*.gcx'))):
            stage = os.path.basename(os.path.dirname(os.path.dirname(path)))
            ctx = {'disco': disco, 'stage': stage, 'script': os.path.basename(path)}
            try:
                r = gcx.leer(path)
            except Exception as e:
                hallados.append(dict(ctx, error=str(e)))
                continue
            recorrer(r['main'], ctx, 'main')
            for pid, b in r['procs'].items():
                recorrer(b, ctx, 'proc_%04x' % pid)
    return hallados

def indice_scripts(path):
    idx = {}
    if not path or not os.path.exists(path):
        return idx
    for h in json.load(open(path, encoding='utf-8')):
        if isinstance(h.get('sector'), int) and h['sector'] >= 0:
            idx.setdefault((h['disco'], h['sector']), []).append(h)
    return idx
_FILTROS = ((0, 0), (60, 0), (115, -52), (98, -55), (122, -60))

def decodificar_adpcm(datos, estado):
    out = []
    s1, s2 = estado
    for b in range(0, len(datos) - 15, 16):
        cab = datos[b]
        shift = cab & 15
        f0, f1 = _FILTROS[min(cab >> 4 & 7, 4)]
        for i in range(14):
            byte = datos[b + 2 + i]
            for nib in (byte & 15, byte >> 4):
                s = nib << 12
                if s & 32768:
                    s -= 65536
                s >>= shift
                v = s + (s1 * f0 + s2 * f1 + 32 >> 6)
                v = max(-32768, min(32767, v))
                s2, s1 = (s1, v)
                out.append(v)
    estado[0], estado[1] = (s1, s2)
    return out

def exportar_wav(mm, s, salida):
    cab = None
    der, izq = ([], [])
    est_d, est_i = ([0, 0], [0, 0])
    for q, t, tam in paquetes(mm, s['offset'], s.get('fin')):
        if t == 2:
            cab = leer_pcm_cab(mm, q)
        elif t == 1:
            d = bytes(mm[q + 4:q + tam])
            if cab and cab['canales'] == 1:
                izq += decodificar_adpcm(d, est_i)
            else:
                der += decodificar_adpcm(d[:4096], est_d)
                izq += decodificar_adpcm(d[4096:], est_i)
        elif t == 240:
            break
    if not cab:
        print('sin PCM en este stream')
        return None
    hz = int(round(cab['hz']))
    with wave.open(salida, 'wb') as w:
        if cab['canales'] == 1:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(hz)
            w.writeframes(struct.pack('<%dh' % len(izq), *izq))
        else:
            n = min(len(izq), len(der))
            inter = [0] * (2 * n)
            inter[0::2] = izq[:n]
            inter[1::2] = der[:n]
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(hz)
            w.writeframes(struct.pack('<%dh' % len(inter), *inter))
    return {'archivo': salida, 'hz': hz, 'canales': cab['canales'], 'muestras': len(izq), 'segundos': len(izq) / float(hz)}
BLOQUE_ESTEREO = 4096

def adpcm_crudo(mm, bloques, canales):
    partes, muestras_d, muestras_i = ([], 0, 0)
    for k, (q, tam) in enumerate(bloques):
        d = bytes(mm[q + 4:q + tam])
        if len(d) % 16:
            return (None, 'paquete PCM de %d bytes (no son bloques de 16)' % len(d))
        if canales == 1:
            muestras_i += len(d) // 16 * 28
        else:
            if len(d) != 2 * BLOQUE_ESTEREO and k < len(bloques) - 1:
                return (None, 'paquete PCM estéreo de %d bytes (se esperaban 8192)' % len(d))
            muestras_d += min(len(d), BLOQUE_ESTEREO) // 16 * 28
            muestras_i += max(0, len(d) - BLOQUE_ESTEREO) // 16 * 28
        partes.append(d)
    n = muestras_i if canales == 1 else min(muestras_i, muestras_d)
    return (b''.join(partes), n)

def abrir(disco):
    p = ruta_demo(disco)
    f = open(p, 'rb')
    return (p, f, mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ))

def stream_en(mm, sector):
    off = sector * SECTOR
    if off + 8 > len(mm) or mm[off:off + 4] != FIRMA:
        return None
    for q, t, tam in paquetes(mm, off):
        if t == 240:
            return {'sector': sector, 'offset': off, 'fin': q + tam, 'bytes': q + tam - off}
    return {'sector': sector, 'offset': off, 'fin': len(mm), 'bytes': len(mm) - off, 'error': 'sin 0xF0'}

def cmd_listar(a):
    path, f, mm = abrir(a.disco)
    refs = indice_scripts(a.scripts)
    streams = hallar_streams(mm)
    print('%s: %d bytes, %d sectores, %d streams' % (path, len(mm), len(mm) // SECTOR, len([s for s in streams if 'fin' in s])))
    filas = []
    for s in streams:
        if 'fin' not in s:
            print('  ! sector %d: %s' % (s['sector'], s['error']))
            continue
        info = analizar_stream(mm, s)
        cab = info['cabecera'] or {}
        mapas = ', '.join((m['cache']['archivo'] for m in cab.get('mapas', [])))
        stages_mapa = sorted(set((st for m in cab.get('mapas', []) for st in m['cache']['stages'])))
        mods = []
        for m in cab.get('modelos', []):
            vis = info['visibles'].get(m['tipo'], 0)
            mods.append('%s(t%d%s%s)' % (m['cache']['nombre'], m['tipo'], ',1pieza' if m['una_pieza'] else '', ',vis=%d' % vis if vis else ',nunca'))
        pcm = info['pcm']
        pcm_txt = '%d Hz %s %.1fs%s' % (round(pcm['hz']), 'st' if pcm['canales'] == 2 else 'mono', pcm['segundos'], '' if info.get('pcm_ok') else ' !bytes') if pcm else '-'
        sub = info['subtitulos']
        n_lineas = sum((len(x['lineas']) for x in sub))
        primera = next((l['texto'].replace('\n', ' / ') for x in sub for l in x['lineas']), '')
        guion = refs.get((a.disco, s['sector']), [])
        guion_txt = '; '.join(sorted(set(('%s%s%s' % (g['stage'], '/' + g['archivo_dmo'] if g['archivo_dmo'] else '', '' if g['script'] == 'scenerio.gcx' else '[' + g['script'] + ']') for g in guion)))) or '(sin referencia en scripts)'
        ok = 'ok' if info.get('frames_ok') else '!cuadros'
        fila = {'sector': s['sector'], 'offset': s['offset'], 'bytes': s['bytes'], 'sectores': (s['bytes'] + SECTOR - 1) // SECTOR, 'n_cuadros': cab.get('n_cuadros'), 'segundos': info.get('segundos'), 'cuadros_leidos': info['cuadros']['n'], 'cuadros_ok': info.get('frames_ok'), 'mapas': mapas, 'stages_mapa': stages_mapa, 'modelos': [dict(m, visible_cuadros=info['visibles'].get(m['tipo'], 0)) for m in cab.get('modelos', [])], 'pcm': pcm, 'pcm_ok': info.get('pcm_ok'), 'pcm_bloques': info['pcm_bloques'], 'subtitulos_bloques': len(sub), 'subtitulos_lineas': n_lineas, 'primer_subtitulo': primera, 'efectos': info['efectos'], 'control': info['control'], 'tipos': {'%#x' % k: v for k, v in info['tipos'].items()}, 'tam_dat': [info['tam_dat_min'], info['tam_dat_max']], 'scripts': guion}
        filas.append(fila)
        print('\n#%-3d sector %6d  off 0x%08x  %5d sect  %5s cuadros (%6.1fs) %s  dat %s..%s bytes' % (len(filas), s['sector'], s['offset'], fila['sectores'], cab.get('n_cuadros'), info.get('segundos', 0), ok, info['tam_dat_min'], info['tam_dat_max']))
        print('     guion : %s' % guion_txt)
        print('     mapa  : %s  [%s]' % (mapas or '-', ', '.join(stages_mapa) or '?'))
        print('     modelos (%d): %s' % (len(mods), ' '.join(mods)))
        print('     pcm   : %s (%d bloques)   subt: %d bloque(s), %d lineas%s' % (pcm_txt, info['pcm_bloques'], len(sub), n_lineas, ' - "%s"' % primera[:70] if primera else ''))
        if info['efectos']:
            print('     efectos: %s' % ', '.join(('%s x%d' % kv for kv in sorted(info['efectos'].items(), key=lambda kv: -kv[1]))))
        if info['cuadros']['saltos']:
            print('     ! saltos de cuadro: %s' % info['cuadros']['saltos'])
        raros = [k for k in info['tipos'] if k not in (1, 2, 3, 4, 5, 16, 240)]
        if raros:
            print('     ! tipos de paquete fuera de lo comun: %s' % ', '.join(('%#x(%s)' % (k, TIPOS.get(k, '?')) for k in raros)))
    if refs:
        inicios = set((s['sector'] for s in streams if 'fin' in s))
        sueltas = sorted(set((k[1] for k in refs if k[0] == a.disco and k[1] not in inicios)))
        if sueltas:
            print('\nSectores pedidos por scripts del disco %d que NO arrancan un stream aca: %s' % (a.disco, sueltas))
    tot = sum((f['segundos'] or 0 for f in filas))
    print('\nTotal: %d demos, %d cuadros, %.1f min; todos con cuadros consecutivos: %s; PCM completo: %s' % (len(filas), sum((f['n_cuadros'] or 0 for f in filas)), tot / 60.0, all((f['cuadros_ok'] for f in filas)), all((f['pcm_ok'] for f in filas if f['pcm']))))
    if a.json:
        os.makedirs(os.path.dirname(os.path.abspath(a.json)), exist_ok=True)
        json.dump({'archivo': path, 'disco': a.disco, 'bytes': len(mm), 'demos': filas}, open(a.json, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print('indice escrito en', a.json)

def cmd_paquetes(a):
    path, f, mm = abrir(a.disco)
    s = stream_en(mm, a.sector)
    if not s:
        print('en el sector %d no arranca ningun stream (firma 10 08 00 00 ausente)' % a.sector)
        return
    n = 0
    for q, t, tam in paquetes(mm, s['offset'], s['fin']):
        extra = ''
        if t == 16:
            v = struct.unpack_from('<I', mm, q + 4)[0]
            extra = 'tick=%d accion=%d(%s)' % (v >> 8, v & 255, ACCIONES.get(v & 255, '?'))
        elif t == 5:
            extra = 'cuadro=%d' % struct.unpack_from('<i', mm, q + 4)[0]
        elif t == 2:
            c = leer_pcm_cab(mm, q)
            extra = 'bytes=%d vol=%#x pitch=%#x (%d Hz) mono=%d flag=%d' % (c['bytes'], c['volumen'], c['pitch'], round(c['hz']), c['mono_raw'], c['flag9'])
        print('%09x +%07x sec %5d  tipo 0x%02x %-8s tam %6d  %s' % (q, q - s['offset'], (q - s['offset']) // SECTOR, t, TIPOS.get(t, '?'), tam, extra))
        n += 1
        if a.max and n >= a.max:
            print('...')
            break

def cmd_volcar(a):
    path, f, mm = abrir(a.disco)
    s = stream_en(mm, a.sector)
    if not s:
        print('en el sector %d no arranca ningun stream (firma 10 08 00 00 ausente)' % a.sector)
        return
    refs = indice_scripts(a.scripts)
    salida = {'archivo': path, 'disco': a.disco, 'sector': s['sector'], 'offset': s['offset'], 'fin': s['fin'], 'bytes': s['bytes'], 'fps': FPS_DEMO, 'unidad_tiempo_control': '1/60 s', 'unidad_tiempo_subtitulos_seg': TICK_SUBT_SEG, 'scripts': refs.get((a.disco, s['sector']), []), 'control': [], 'cabecera': None, 'pcm': None, 'pcm_bloques': 0, 'pcm_bytes': 0, 'subtitulos': [], 'cuadros': []}
    def_leida = False
    for q, t, tam in paquetes(mm, s['offset'], s['fin']):
        if t == 16:
            v = struct.unpack_from('<I', mm, q + 4)[0]
            salida['control'].append({'offset': q, 'tick': v >> 8, 'accion': v & 255, 'accion_nombre': ACCIONES.get(v & 255, '?')})
        elif t == 5:
            if not def_leida:
                salida['cabecera'] = leer_dmo_def(mm, q)
                def_leida = True
            elif not a.cuadros or len(salida['cuadros']) < a.cuadros:
                salida['cuadros'].append(leer_dmo_dat(mm, q, con_huesos=True))
        elif t == 2:
            salida['pcm'] = leer_pcm_cab(mm, q)
        elif t == 1:
            salida['pcm_bloques'] += 1
            salida['pcm_bytes'] += tam - 4
        elif t in (3, 6):
            salida['subtitulos'].append(leer_subtitulos(mm, q))
        elif t == 240:
            break
    cab = salida['cabecera']
    cu = salida['cuadros']
    print('stream sector %d: %d bytes, %d sectores' % (s['sector'], s['bytes'], (s['bytes'] + SECTOR - 1) // SECTOR))
    if cab:
        print('cabecera: n_cuadros=%d (%.1fs a %d fps) mapas=%d modelos=%d  [DMO_DEF %d bytes, esperado %d]' % (cab['n_cuadros'], cab['n_cuadros'] / float(FPS_DEMO), FPS_DEMO, cab['n_mapas'], cab['n_modelos'], cab['tamanio'], cab['tamanio_esperado']))
        for m in cab['mapas']:
            print('  mapa   %s  stages=%s' % (m['cache']['archivo'], ','.join(m['cache']['stages']) or '?'))
        for m in cab['modelos']:
            vis = sum((1 for c in cu for x in c['modelos'] if x['tipo'] == m['tipo'] and x.get('visible')))
            print('  modelo tipo %2d flag %d  %-14s control=%s  visible en %d/%d cuadros' % (m['tipo'], m['flag'], m['cache']['archivo'], m['nombre_control_txt'] or '-', vis, len(cu)))
    if cu:
        print('cuadros volcados: %d (del %d al %d)' % (len(cu), cu[0]['cuadro'], cu[-1]['cuadro']))
        c0 = cu[0]['camara']
        print('  cuadro %d camara: ojo=%s centro=%s roll=%d pantalla=%d' % (cu[0]['cuadro'], c0['ojo'], c0['centro'], c0['roll'], c0['pantalla']))
        ef = {}
        for c in cu:
            for e in c['efectos']:
                ef[e['nombre']] = ef.get(e['nombre'], 0) + 1
        if ef:
            print('  efectos (apariciones por cuadro): %s' % ef)
    if salida['pcm']:
        p = salida['pcm']
        print('pcm: %d bytes anunciados, %d leidos en %d bloques, %d Hz, %s, %.1fs' % (p['bytes'], salida['pcm_bytes'], salida['pcm_bloques'], round(p['hz']), 'estereo' if p['canales'] == 2 else 'mono', p['segundos']))
    for sb in salida['subtitulos']:
        print('subtitulos tipo %d: %d lineas, lipsync %d bytes, fuente %d bytes' % (sb['tipo'], len(sb['lineas']), len(sb['lipsync_hex']) // 2, sb['fuente_bytes']))
        for l in sb['lineas'][:3]:
            print('  %7.2fs +%.2fs  %s' % (l['inicio_seg'], l['duracion_seg'], l['texto'].replace('\n', ' / ')))
    if a.salida:
        os.makedirs(os.path.dirname(os.path.abspath(a.salida)), exist_ok=True)
        json.dump(salida, open(a.salida, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print('json escrito en', a.salida)
    if a.wav:
        r = exportar_wav(mm, s, a.wav)
        if r:
            print('wav escrito en %s: %d Hz, %d canal(es), %.2fs' % (r['archivo'], r['hz'], r['canales'], r['segundos']))

def cmd_scripts(a):
    h = escanear_scripts()
    os.makedirs(os.path.dirname(os.path.abspath(a.salida)), exist_ok=True)
    json.dump(h, open(a.salida, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    ok = [x for x in h if 'error' not in x]
    print('%d comandos demo/demodebug en %d scripts; escrito en %s' % (len(ok), len(set(((x['disco'], x['stage'], x['script']) for x in ok))), a.salida))
    for x in ok:
        print('  disco%d %-8s %-13s %-10s %-9s -s %-6s %s -p %s' % (x['disco'], x['stage'], x['script'], x['proc'], x['comando'], x['sector'], x['archivo_dmo'] or '', x['proc_fin']))
    for x in h:
        if 'error' in x:
            print('  ! %s/%s: %s' % (x['stage'], x['script'], x['error']))

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    p = sub.add_parser('listar', help='indice de todas las demos de un DEMO.DAT')
    p.add_argument('--disco', type=int, default=1)
    p.add_argument('--json')
    p.add_argument('--scripts', default=os.path.join(DOCS, 'demo', 'demos_scripts.json'))
    p.set_defaults(fn=cmd_listar)
    p = sub.add_parser('volcar', help='vuelca una demo a JSON (cuadro a cuadro)')
    p.add_argument('sector', type=int)
    p.add_argument('--disco', type=int, default=1)
    p.add_argument('--salida')
    p.add_argument('--cuadros', type=int, default=0, help='tope de cuadros a volcar (0 = todos)')
    p.add_argument('--wav', help='exporta el PCM del stream a WAV (ADPCM decodificado)')
    p.add_argument('--scripts', default=os.path.join(DOCS, 'demo', 'demos_scripts.json'))
    p.set_defaults(fn=cmd_volcar)
    p = sub.add_parser('paquetes', help='lista los paquetes de un stream')
    p.add_argument('sector', type=int)
    p.add_argument('--disco', type=int, default=1)
    p.add_argument('--max', type=int, default=0)
    p.set_defaults(fn=cmd_paquetes)
    p = sub.add_parser('scripts', help='busca `demo -s` en todos los .gcx extraidos')
    p.add_argument('--salida', default=os.path.join(DOCS, 'demo', 'demos_scripts.json'))
    p.set_defaults(fn=cmd_scripts)
    a = ap.parse_args()
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    a.fn(a)
if __name__ == '__main__':
    main()
