# MGS web — FeniXVOID · Project Ravenlight
import argparse
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
import glob
import json
import math
import mmap
import os
import struct
import sys
import wave
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import demo_dat as D
SECTOR = 2048
TICK_SUBT_SEG = D.TICK_SUBT_SEG
FILT = ((0, 0), (60, 0), (115, -52), (98, -55), (122, -60))

def ruta_vox(disco):
    return os.path.join(EXTRAIDO, 'disco%d' % disco, '00_disco', 'MGS', 'VOX.DAT')

def abrir(disco):
    p = ruta_vox(disco)
    f = open(p, 'rb')
    return (p, f, mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ))

def decodificar_adpcm(datos, estado):
    out = []
    s1, s2 = estado
    for b in range(0, len(datos) - 15, 16):
        cab = datos[b]
        sh = cab & 15
        k1, k2 = FILT[min(4, cab >> 4)]
        for i in range(2, 16):
            byte = datos[b + i]
            for n in (byte & 15, byte >> 4):
                if n & 8:
                    n -= 16
                s = (n << 12 >> sh) + (s1 * k1 + s2 * k2 + 32 >> 6)
                if s < -32768:
                    s = -32768
                elif s > 32767:
                    s = 32767
                out.append(s)
                s2, s1 = (s1, s)
    estado[0], estado[1] = (s1, s2)
    return out

def decodificar_lipsync(lip, tick0=0):
    ev = []
    p = 0
    t = tick0
    slot = 0
    ids = {}

    def paku(v):
        return {'parpadeo': True} if v == 4 else {'boca': v} if v < 4 else {'valor': v}
    while p < len(lip):
        b = lip[p]
        p += 1
        if b & 128:
            ev.append(dict(tick=t, seg=round(t * TICK_SUBT_SEG, 3), personaje=slot, dur=b & 15, **paku(b >> 4 & 7)))
            t += b & 15
            continue
        op = b >> 4
        if op == 0:
            ev.append({'tick': t, 'seg': round(t * TICK_SUBT_SEG, 3), 'fin': True})
            break
        elif op == 1:
            d = lip[p] if p < len(lip) else 0
            p += 1
            ev.append(dict(tick=t, seg=round(t * TICK_SUBT_SEG, 3), personaje=slot, dur=d, **paku(b & 15)))
            t += d
        elif op == 2:
            ident = lip[p] << 8 | lip[p + 1] if p + 1 < len(lip) else 0
            p += 2
            ids[b & 15] = ident
            ev.append({'tick': t, 'seg': round(t * TICK_SUBT_SEG, 3), 'set_id': b & 15, 'id': '%04x' % ident})
        elif op == 4:
            slot = b & 15
            ev.append({'tick': t, 'seg': round(t * TICK_SUBT_SEG, 3), 'personaje_activo': slot})
        elif op == 5:
            d = lip[p] << 8 | lip[p + 1] if p + 1 < len(lip) else 0
            p += 2
            ev.append(dict(tick=t, seg=round(t * TICK_SUBT_SEG, 3), personaje=slot, dur=d, **paku(b & 15)))
            t += d
        elif op == 6:
            d = lip[p] if p < len(lip) else 0
            p += 1
            ev.append({'tick': t, 'seg': round(t * TICK_SUBT_SEG, 3), 'motion': lip[p:p + 4].hex(), 'dur': d})
            t += d
        else:
            ev.append({'tick': t, 'seg': round(t * TICK_SUBT_SEG, 3), 'desconocido': '%02x' % b})
    return {'eventos': ev, 'ids': {k: '%04x' % v for k, v in ids.items()}, 'bytes_leidos': p, 'bytes': len(lip)}
_nombres = {}

def nombres_soundtest(disco):
    if disco in _nombres:
        return _nombres[disco]
    tabla = {}
    path = os.path.join(EXTRAIDO, 'disco%d' % disco, '01_stages', 'sound', 'cache', 'scenerio.gcx')
    if os.path.exists(path):
        import gcx

        def rec(bloque):
            for s in bloque:
                if isinstance(s, dict) and s.get('cmd') == 'chara':
                    for a in s['args']:
                        if isinstance(a, dict) and a.get('opt') == 's':
                            vals = [gcx.fmt(v) for v in a['v']]
                            for i in range(0, len(vals) - 1, 2):
                                try:
                                    tabla.setdefault(int(vals[i + 1]), vals[i].strip('"'))
                                except ValueError:
                                    pass
        try:
            r = gcx.leer(path)
            rec(r['main'])
            for b in r['procs'].values():
                rec(b)
        except Exception as e:
            print('aviso: no pude leer la tabla del sound test (%s)' % e, file=sys.stderr)
    _nombres[disco] = tabla
    return tabla

def stream_en(mm, sector):
    return D.stream_en(mm, sector)

def analizar(mm, s):
    info = {'sector': s['sector'], 'offset': s['offset'], 'fin': s['fin'], 'bytes': s['bytes'], 'sectores': (s['bytes'] + SECTOR - 1) // SECTOR, 'control': [], 'pcm': None, 'pcm_bloques': 0, 'pcm_bytes': 0, 'subtitulos': [], 'tipos': {}, 'paquetes': []}
    for q, t, tam in D.paquetes(mm, s['offset'], s.get('fin')):
        info['tipos']['%02x' % t] = info['tipos'].get('%02x' % t, 0) + 1
        if t != 1:
            info['paquetes'].append({'offset': q, 'tipo': '%02x' % t, 'nombre': D.TIPOS.get(t, '?'), 'tamanio': tam})
        if t == 16:
            v = struct.unpack_from('<I', mm, q + 4)[0]
            info['control'].append({'offset': q, 'tick': v >> 8, 'accion': v & 255, 'accion_nombre': D.ACCIONES.get(v & 255, '?')})
        elif t == 2:
            info['pcm'] = D.leer_pcm_cab(mm, q)
        elif t == 1:
            info['pcm_bloques'] += 1
            info['pcm_bytes'] += tam - 4
        elif t in (3, 6):
            sub = D.leer_subtitulos(mm, q)
            for l in sub['lineas']:
                l['texto'] = l['texto'].replace('\r', '\n')
            sub['lipsync'] = decodificar_lipsync(bytes.fromhex(sub['lipsync_hex']), sub['inicio'])
            info['subtitulos'].append(sub)
        elif t == 240:
            break
    if info['pcm']:
        info['pcm_ok'] = info['pcm_bytes'] == info['pcm']['bytes']
        info['segundos'] = info['pcm']['segundos']
    return info

def exportar_wav(mm, s, salida):
    cab = None
    der, izq = ([], [])
    est_d, est_i = ([0, 0], [0, 0])
    for q, t, tam in D.paquetes(mm, s['offset'], s.get('fin')):
        if t == 2:
            cab = D.leer_pcm_cab(mm, q)
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
        return None
    hz = int(round(cab['hz']))
    canales = cab['canales']
    if canales == 1:
        muestras = izq
    else:
        n = min(len(izq), len(der))
        muestras = [0] * (2 * n)
        muestras[0::2] = izq[:n]
        muestras[1::2] = der[:n]
    with wave.open(salida, 'wb') as w:
        w.setnchannels(canales)
        w.setsampwidth(2)
        w.setframerate(hz)
        w.writeframes(struct.pack('<%dh' % len(muestras), *muestras))
    n = len(muestras) // canales
    pico = max((abs(v) for v in muestras), default=0)
    rms = math.sqrt(sum((v * v for v in muestras)) / len(muestras)) if muestras else 0.0
    vent = max(1, hz // 50 * canales)
    vivas = 0
    tot = 0
    for i in range(0, len(muestras) - vent + 1, vent):
        tot += 1
        r = math.sqrt(sum((v * v for v in muestras[i:i + vent])) / vent)
        if r > 32768 * 10 ** (-45 / 20.0):
            vivas += 1
    e = sum((v * v for v in izq))
    c1 = sum((izq[i] * izq[i + 1] for i in range(len(izq) - 1))) / e if e else None
    return {'archivo': salida, 'hz': hz, 'canales': canales, 'muestras': n, 'segundos': n / float(hz), 'pico': pico, 'pico_dbfs': round(20 * math.log10(pico / 32768.0), 1) if pico else None, 'rms': round(rms, 1), 'rms_dbfs': round(20 * math.log10(rms / 32768.0), 1) if rms else None, 'ventanas_con_sonido_pct': round(100.0 * vivas / tot, 1) if tot else None, 'autocorrelacion_lag1': round(c1, 3) if c1 is not None else None}

def escanear_refs(sectores_por_disco):
    import gcx
    refs = []

    def valores(args):
        for a in args:
            if isinstance(a, dict):
                if 'opt' in a:
                    for v in a['v']:
                        if isinstance(v, dict) and 'bloque' in v:
                            continue
                        yield (a['opt'], gcx.fmt(v))
                elif 'bloque' in a:
                    continue
                else:
                    yield (None, gcx.fmt(a))
            else:
                yield (None, gcx.fmt(a))

    def recorrer(bloque, ctx, proc, disco):
        for s in bloque:
            if isinstance(s, dict) and 'cmd' in s:
                for opt, v in valores(s['args']):
                    try:
                        n = int(v)
                    except (TypeError, ValueError):
                        continue
                    seguro = s['cmd'] == 'sound' and opt in ('v', 'g')
                    if seguro or (s['cmd'] == 'chara' and n >= 1000 and (n in sectores_por_disco.get(disco, ()))):
                        refs.append(dict(ctx, proc=proc, comando=s['cmd'], opcion=opt, id=n, tipo='sound -%s' % opt if seguro else 'candidato', es_stream=n in sectores_por_disco.get(disco, ())))
                for a in s['args']:
                    if isinstance(a, dict):
                        if 'bloque' in a:
                            recorrer(a['bloque'], ctx, proc, disco)
                        if 'opt' in a:
                            for v in a['v']:
                                if isinstance(v, dict) and 'bloque' in v:
                                    recorrer(v['bloque'], ctx, proc, disco)
    for disco in (1, 2):
        for path in sorted(glob.glob(os.path.join(EXTRAIDO, 'disco%d' % disco, '01_stages', '*', 'cache', '*.gcx'))):
            stage = os.path.basename(os.path.dirname(os.path.dirname(path)))
            ctx = {'disco': disco, 'stage': stage, 'script': os.path.basename(path)}
            try:
                r = gcx.leer(path)
            except Exception as e:
                refs.append(dict(ctx, error=str(e)))
                continue
            recorrer(r['main'], ctx, 'main', disco)
            for pid, b in r['procs'].items():
                recorrer(b, ctx, 'proc_%04x' % pid, disco)
    rj = os.path.join(ASSETS, 'codec', 'radio.json')
    if os.path.exists(rj):
        radio = json.load(open(rj, encoding='utf-8'))

        def rec(x, llamada):
            if isinstance(x, dict):
                if 'vox' in x and isinstance(x['vox'], int):
                    refs.append({'disco': 1, 'stage': 'RADIO.DAT', 'script': 'RADIO.DAT', 'proc': llamada, 'comando': 'radio', 'opcion': 'voz', 'id': x['vox'], 'tipo': 'radio VOZ', 'es_stream': x['vox'] in sectores_por_disco.get(1, ())})
                for v in x.values():
                    rec(v, llamada)
            elif isinstance(x, list):
                for v in x:
                    rec(v, llamada)
        for ll in radio.get('calls', []):
            nombre = 'code %s freq %s' % (ll.get('code', ll.get('off', '?')), ll.get('freq', '?'))
            rec(ll, nombre)
            for ev in ll.get('eventos', []):
                pila = [ev]
                while pila:
                    x = pila.pop()
                    if isinstance(x, dict):
                        if isinstance(x.get('vox_disco2'), int) and x['vox_disco2'] > 0 and (2 in sectores_por_disco):
                            refs.append({'disco': 2, 'stage': 'RADIO.DAT', 'script': 'RADIO.DAT', 'proc': nombre, 'comando': 'radio', 'opcion': 'voz', 'id': x['vox_disco2'], 'tipo': 'radio VOZ', 'es_stream': x['vox_disco2'] in sectores_por_disco[2]})
                        pila.extend(x.values())
                    elif isinstance(x, list):
                        pila.extend(x)
    return refs

def indice_refs(path):
    idx = {}
    if path and os.path.exists(path):
        for r in json.load(open(path, encoding='utf-8')):
            if 'id' in r:
                idx.setdefault((r['disco'], r['id']), []).append(r)
    return idx

def texto_refs(lst, maximo=6):
    out = []
    for r in lst:
        if r['tipo'] == 'radio VOZ':
            out.append('radio %s' % r['proc'])
        elif r['tipo'].startswith('sound'):
            out.append('%s %s' % (r['stage'], r['tipo']))
        else:
            out.append('%s: chara%s?' % (r['stage'], ' -' + r['opcion'] if r['opcion'] else ''))
    out = sorted(set(out))
    if len(out) > maximo:
        out = out[:maximo] + ['+%d mas' % (len(out) - maximo)]
    return '; '.join(out)

def cmd_listar(a):
    path, f, mm = abrir(a.disco)
    streams = D.hallar_streams(mm)
    refs = indice_refs(a.refs)
    ok = [s for s in streams if 'fin' in s]
    nombres = nombres_soundtest(a.disco)
    print('%s: %d bytes, %d sectores, %d streams, %d nombres en el sound test' % (path, len(mm), len(mm) // SECTOR, len(ok), len(nombres)))
    print('%7s %-9s %10s %5s %6s %3s %8s %4s  %s' % ('id', 'nombre', 'offset', 'sect', 'Hz', 'ch', 'seg', 'lin', 'primer subtitulo | referencias'))
    filas = []
    total = 0.0
    for s in streams:
        if 'fin' not in s:
            print('  ! sector %d: %s' % (s['sector'], s['error']))
            continue
        info = analizar(mm, s)
        c = info['pcm'] or {}
        lineas = [l for x in info['subtitulos'] for l in x['lineas']]
        primera = lineas[0]['texto'].replace('\n', ' / ') if lineas else ''
        r = refs.get((a.disco, s['sector']), [])
        seg = c.get('segundos') or 0
        total += seg
        fila = {'id': s['sector'], 'nombre': nombres.get(s['sector']), 'offset': s['offset'], 'bytes': s['bytes'], 'sectores': info['sectores'], 'hz': int(round(c['hz'])) if c else None, 'canales': c.get('canales'), 'pitch': c.get('pitch'), 'volumen': c.get('volumen'), 'flag9': c.get('flag9'), 'segundos': round(seg, 3), 'pcm_ok': info.get('pcm_ok'), 'control': [(x['tick'], x['accion']) for x in info['control']], 'n_subtitulos': len(lineas), 'subtitulos': [l['texto'] for l in lineas], 'lipsync_ids': sorted(set((v for x in info['subtitulos'] for v in x['lipsync']['ids'].values()))), 'referencias': r, 'error': None if info.get('pcm_ok', True) and 'error' not in s else s.get('error', 'pcm bytes')}
        filas.append(fila)
        print('%7d %-9s %10x %5d %6s %3s %8.2f %4d  %s%s' % (s['sector'], fila['nombre'] or '-', s['offset'], info['sectores'], fila['hz'] or '-', fila['canales'] or '-', seg, len(lineas), primera[:60], ' | ' + texto_refs(r) if r else ''))
    print('total: %d voces, %.1f s (%.2f h)' % (len(filas), total, total / 3600.0))
    if a.json:
        os.makedirs(os.path.dirname(os.path.abspath(a.json)), exist_ok=True)
        json.dump({'archivo': path, 'bytes': len(mm), 'sectores': len(mm) // SECTOR, 'voces': filas}, open(a.json, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print('json:', a.json)

def cmd_info(a):
    path, f, mm = abrir(a.disco)
    s = stream_en(mm, a.id)
    if not s:
        print('el sector %d no arranca un stream (no tiene el paquete de control 10 08 00 00)' % a.id)
        return 1
    info = analizar(mm, s)
    print('VOX.DAT disco %d, voz %d (%s): offset 0x%x, %d bytes, %d sectores (%d..%d)' % (a.disco, a.id, nombres_soundtest(a.disco).get(a.id, 'sin nombre en el sound test'), s['offset'], s['bytes'], info['sectores'], a.id, a.id + info['sectores'] - 1))
    for p in info['paquetes']:
        print('  paquete 0x%08x tipo %s (%s) %d bytes' % (p['offset'], p['tipo'], p['nombre'], p['tamanio']))
    print('  paquetes PCM (tipo 01): %d, %d bytes' % (info['pcm_bloques'], info['pcm_bytes']))
    for c in info['control']:
        print('control: tick %d accion %d (%s)' % (c['tick'], c['accion'], c['accion_nombre']))
    c = info['pcm']
    if c:
        print('pcm: %d bytes, volumen 0x%x, pitch 0x%x = %.0f Hz, mono_raw %d -> %d canal(es), flag %d, %.3f s%s' % (c['bytes'], c['volumen'], c['pitch'], c['hz'], c['mono_raw'], c['canales'], c['flag9'], c['segundos'], '' if info.get('pcm_ok') else '  !! los bytes de los paquetes no coinciden'))
    for x in info['subtitulos']:
        print('subtitulos 0x%x: tipo %02x, %d bytes, ventana ticks %d..%s (%.2f s..%s), lipsync %d bytes, fuente %d bytes' % (x['offset'], x['tipo'], x['tamanio'], x['inicio'], x['fin'] if x['fin'] != 2147483647 else 'inf', x['inicio'] * TICK_SUBT_SEG, '%.2f s' % (x['fin'] * TICK_SUBT_SEG) if x['fin'] != 2147483647 else 'inf', len(x['lipsync_hex']) // 2, x['fuente_bytes']))
        for l in x['lineas']:
            print('  %7.3f +%6.3f  %s' % (l['inicio_seg'], l['duracion_seg'], l['texto'].replace('\n', ' / ')))
        lip = x['lipsync']
        print('  lipsync: %d eventos, ids %s%s' % (len(lip['eventos']), lip['ids'], '' if lip['bytes_leidos'] >= lip['bytes'] - 3 else ' (quedaron %d bytes sin leer)' % (lip['bytes'] - lip['bytes_leidos'])))
        if a.lipsync:
            for e in lip['eventos']:
                print('    ', e)
    return 0

def cmd_wav(a):
    path, f, mm = abrir(a.disco)
    s = stream_en(mm, a.id)
    if not s:
        print('el sector %d no arranca un stream' % a.id)
        return 1
    os.makedirs(os.path.dirname(os.path.abspath(a.salida)) or '.', exist_ok=True)
    r = exportar_wav(mm, s, a.salida)
    if not r:
        print('sin PCM')
        return 1
    print('%s: %d Hz, %d canal(es), %d muestras = %.3f s, pico %d (%s dBFS), RMS %.1f (%s dBFS), ventanas con sonido %s%%, autocorr lag1 %s' % (r['archivo'], r['hz'], r['canales'], r['muestras'], r['segundos'], r['pico'], r['pico_dbfs'], r['rms'], r['rms_dbfs'], r['ventanas_con_sonido_pct'], r['autocorrelacion_lag1']))
    return 0

def cmd_refs(a):
    sect = {}
    for disco in (1, 2):
        if os.path.exists(ruta_vox(disco)):
            _, f, mm = abrir(disco)
            sect[disco] = set((s['sector'] for s in D.hallar_streams(mm) if 'fin' in s))
    refs = escanear_refs(sect)
    os.makedirs(os.path.dirname(os.path.abspath(a.salida)), exist_ok=True)
    json.dump(refs, open(a.salida, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    por_tipo = {}
    for r in refs:
        if 'id' in r:
            por_tipo.setdefault(r['tipo'], set()).add((r['disco'], r['id']))
    for t, v in sorted(por_tipo.items()):
        malos = [x for x in v if x[1] not in sect.get(x[0], ())]
        print('%-10s %5d referencias, %4d ids distintos, %d que no caen en un stream%s' % (t, sum((1 for r in refs if r.get('tipo') == t)), len(v), len(malos), ' ' + str(sorted(malos)[:8]) if malos else ''))
    for disco in sorted(sect):
        con = set((r['id'] for r in refs if r.get('disco') == disco and r.get('es_stream') and (r['tipo'] != 'candidato')))
        cand = set((r['id'] for r in refs if r.get('disco') == disco and r.get('es_stream') and (r['tipo'] == 'candidato')))
        print('disco %d: %d streams; %d con referencia segura (sound -v/-g o radio), %d mas solo como candidato (parametro de chara, poco confiable), %d sin referencia' % (disco, len(sect[disco]), len(con), len(cand - con), len(sect[disco] - con - cand)))
    print('json:', a.salida)

def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, ValueError):
        pass
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    p = sub.add_parser('listar')
    p.add_argument('--disco', type=int, default=1)
    p.add_argument('--json')
    p.add_argument('--refs', default=os.path.join(DOCS, 'codec', 'vox_refs.json'))
    p.set_defaults(fn=cmd_listar)
    p = sub.add_parser('info')
    p.add_argument('id', type=int)
    p.add_argument('--disco', type=int, default=1)
    p.add_argument('--lipsync', action='store_true', help='imprimir cada evento de lipsync')
    p.set_defaults(fn=cmd_info)
    p = sub.add_parser('wav')
    p.add_argument('id', type=int)
    p.add_argument('salida')
    p.add_argument('--disco', type=int, default=1)
    p.set_defaults(fn=cmd_wav)
    p = sub.add_parser('refs')
    p.add_argument('--salida', default=os.path.join(DOCS, 'codec', 'vox_refs.json'))
    p.set_defaults(fn=cmd_refs)
    a = ap.parse_args()
    sys.exit(a.fn(a) or 0)
if __name__ == '__main__':
    main()
