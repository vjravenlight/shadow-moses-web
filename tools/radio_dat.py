# MGS web — FeniXVOID · Project Ravenlight
import os, sys, json, glob, struct, argparse
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gcx
DAT_DEFECTO = os.path.join(EXTRAIDO, 'disco1', '00_disco', 'MGS', 'RADIO.DAT')
JSON_DEFECTO = os.path.join(ASSETS, 'codec', 'radio.json')
RD = {1: 'hablar', 2: 'voz', 3: 'cara', 4: 'contacto', 5: 'guardar', 6: 'sonido', 7: 'pregunta', 8: 'varsave', 16: 'if', 17: 'else', 18: 'elseif', 32: 'switch', 33: 'case', 34: 'default', 48: 'randswitch', 49: 'randcase', 64: 'eval'}
RD_SCRIPT, RD_ENDLINE = (128, 255)
PERSONAJES_JP = {'Snake': 'スネーク', 'Campbell': 'キャンベル', 'Naomi': 'ナオミ', 'Mei Ling': 'メイ・リン', 'Otacon': 'オタコン', 'Meryl': 'メリル', 'Master': 'マスター', 'Nastasha': 'ナスターシャ', 'Deepthroat': 'ディープスロート', 'Liquid': 'リキッド', 'Gray Fox': 'グレイ・フォックス', 'Ocelot': 'オセロット', 'Mantis': 'マンティス', 'Wolf': 'ウルフ', 'Raven': 'レイヴン', 'Baker': 'ベイカー', 'Anderson': 'アンダーソン', 'Houseman': 'ハウスマン', 'Jim': 'ジム', 'Johnny': 'ジョニー', 'Octopus': 'オクトパス', 'Soldado': '兵士', 'Guardia': '兵', 'Miller': 'ミラー', 'Sniper Wolf': 'スナイパー・ウルフ', 'Psycho Mantis': 'サイコ・マンティス', 'Vulcan Raven': 'バルカン・レイヴン', 'Revolver Ocelot': 'リボルバー・オセロット', 'Liquid Snake': 'リキッド・スネーク', 'Ninja': 'ニンジャ', 'Decoy Octopus': 'デコイ・オクトパス', 'Naomi Hunter': 'ナオミ・ハンター', 'Hal': 'ハル', 'Emmerich': 'エメリッヒ', 'Roy': 'ロイ', 'Kenneth Baker': 'ケネス・ベイカー', 'Donald Anderson': 'ドナルド・アンダーソン', 'Jim Houseman': 'ジム・ハウスマン', 'Operador': 'オペレーター', 'Genome': 'ゲノム兵', 'Johnny Sasaki': 'ジョニー佐々木', 'Secretario': '国防長官', 'Nadie': 'なし', 'Houseman (長官)': '長官', 'Ruido': 'ノイズ'}
PERSONAJES_JP['Mei Ling'] = 'メイリン'
OPS = {0: 'end', 1: 'neg', 2: '!', 3: '~', 4: '+', 5: '-', 6: '*', 7: '/', 8: '%', 9: '==', 10: '!=', 11: '<', 12: '<=', 13: '>', 14: '>=', 15: '|', 16: '&', 17: '^', 18: '||', 19: '&&', 20: '='}

def strcode_bytes(b):
    i = 0
    for c in b:
        i = (i << 5 | i >> 11) & 65535
        i = i + c & 65535
    return i
PERSONAJES = {strcode_bytes(jp.encode('euc_jp')): n for n, jp in PERSONAJES_JP.items()}
FACE_SECTORES_MAX = 1713

def be16(d, p):
    return d[p] << 8 | d[p + 1]

def decodificar_texto(b):
    out = []
    i = 0
    while i < len(b):
        c = b[i]
        if c < 128:
            out.append(chr(c))
            i += 1
        else:
            if i + 1 >= len(b):
                out.append('\\x%02x' % c)
                break
            hi, lo = (c & ~96, b[i + 1])
            i += 2
            if hi == 128:
                out.append(chr(lo))
            elif hi == 144:
                out.append({1: ' ', 2: '》', 4: '』', 6: '-', 9: '…', 22: '/'}.get(lo, '\\u90%02x' % lo))
            elif 150 <= hi <= 153:
                out.append('\\g%d' % ((hi << 8 | lo) - 38251 - hi))
            else:
                try:
                    out.append(bytes([hi, lo]).decode('shift_jis'))
                except UnicodeDecodeError:
                    out.append('\\x%02x\\x%02x' % (hi, lo))
    crudo = ''.join(out)
    limpio = crudo.replace('#N', '\n').replace('|', '\n').replace('#W', '').replace('#S', '…').replace('#1', '@').replace('#2', '~')
    limpio = limpio.replace('\x0c0', '').replace('\x0c1', '').replace('\x0c2', '').replace('\x0c3', '')
    return (crudo, limpio)

def cstring(d, p):
    e = d.index(b'\x00', p)
    return (d[p:e], e + 1)

class Parser:

    def __init__(self, d):
        self.d = d
        self.L = gcx.Lector(d)
        self.errores = []

    def valor(self, p):
        return self.L.valor(p)

    def strings(self, p, fin):
        out = []
        d = self.d
        while p < fin and d[p] != 0:
            if d[p] == gcx.T_STRING:
                n = d[p + 1]
                raw = d[p + 2:p + 2 + n].split(b'\x00')[0]
                out.append(decodificar_texto(raw)[1])
                p = p + 2 + n
            else:
                v, p = self.valor(p)
                out.append(v)
        return (out, p + 1)

    def bloque(self, p):
        d = self.d
        if d[p] != RD_SCRIPT:
            self.errores.append('bloque sin 0x80 en %#x (%02x)' % (p, d[p]))
            return ([], p + 1)
        tam = be16(d, p + 1)
        fin = p + tam + 1
        q = p + 3
        eventos = []
        while q < fin and d[q] != 0:
            if d[q] != RD_ENDLINE:
                self.errores.append('codigo ilegal %02x en %#x' % (d[q], q))
                q += 1
                continue
            cod = d[q + 1]
            tam_cmd = be16(d, q + 2)
            args = q + 4
            fin_cmd = q + 2 + tam_cmd
            ev = {'off': q, 'tipo': RD.get(cod, 'cmd_%02x' % cod)}
            try:
                self.comando(cod, args, fin_cmd, ev)
            except Exception as e:
                self.errores.append('error en %s @%#x: %s' % (ev['tipo'], q, e))
                ev['error'] = str(e)
            eventos.append(ev)
            q = fin_cmd
        return (eventos, fin)

    def comando(self, cod, p, fin, ev):
        d = self.d
        if cod == 1:
            ev['personaje'] = be16(d, p)
            ev['cara'] = be16(d, p + 2)
            ev['frames'] = be16(d, p + 4)
            ev['quien'] = PERSONAJES.get(ev['personaje'], '%04x' % ev['personaje'])
            raw, _ = cstring(d, p + 6)
            crudo, ev['texto'] = decodificar_texto(raw)
            if crudo.replace('#N', '\n') != ev['texto']:
                ev['texto_crudo'] = crudo
        elif cod == 2:
            ev['vox'] = struct.unpack('>I', d[p:p + 4])[0]
            ev['eventos'], _ = self.bloque(p + 4)
        elif cod == 3:
            ev['personaje'] = be16(d, p)
            ev['cara'] = be16(d, p + 2)
            v = be16(d, p + 4)
            ev['quien'] = PERSONAJES.get(ev['personaje'], '%04x' % ev['personaje'])
            ev['frames'] = v if v < 257 else v - 256
            ev['espera'] = v < 257
        elif cod == 4:
            ev['freq'] = be16(d, p)
            raw, _ = cstring(d, p + 2)
            ev['nombre'] = raw.decode('latin1')
        elif cod == 5:
            v, q = self.valor(p)
            ev['area'] = v
            ev['nombres'], _ = self.strings(q, fin)
        elif cod == 6:
            sub = d[p]
            if sub == 0:
                ev['sub'] = 'se'
                ev['codigo'] = struct.unpack('>I', d[p + 1:p + 5])[0]
            elif sub == 1:
                ev['sub'] = 'vibracion'
                ev['fuerza'] = d[p + 1]
                ev['frames'] = struct.unpack('>h', d[p + 2:p + 4])[0]
            else:
                ev['sub'] = sub
        elif cod == 7:
            ev['opciones'], _ = self.strings(p, fin)
        elif cod == 8:
            vs = []
            while p < fin and d[p] != 0:
                v, p = self.valor(p)
                vs.append(v)
            ev['vars'] = vs
        elif cod == 16:
            ramas = []
            cond, q = self.valor(p)
            evs, q = self.bloque(q)
            ramas.append({'cond': cond, 'eventos': evs})
            while q < fin and d[q] == RD_ENDLINE:
                c2 = d[q + 1]
                q += 2
                if c2 == 18:
                    cond, q = self.valor(q)
                    evs, q = self.bloque(q)
                    ramas.append({'cond': cond, 'eventos': evs})
                elif c2 == 17:
                    evs, q = self.bloque(q)
                    ramas.append({'cond': None, 'eventos': evs})
                    break
                else:
                    self.errores.append('rama rara %02x en %#x' % (c2, q))
                    break
            ev['ramas'] = ramas
        elif cod == 32:
            val, q = self.valor(p)
            casos = []
            while q < fin:
                c2 = d[q]
                q += 1
                if c2 == 33:
                    cv = be16(d, q)
                    evs, q = self.bloque(q + 2)
                    casos.append({'caso': cv, 'eventos': evs})
                elif c2 == 34:
                    evs, q = self.bloque(q)
                    casos.append({'caso': None, 'eventos': evs})
                elif c2 == 0:
                    break
                else:
                    self.errores.append('case raro %02x en %#x' % (c2, q))
                    break
            ev['valor'] = val
            ev['casos'] = casos
        elif cod == 48:
            n = be16(d, p)
            q = p + 2
            casos = []
            while q < fin:
                c2 = d[q]
                q += 1
                if c2 == 49:
                    peso = be16(d, q)
                    evs, q = self.bloque(q + 2)
                    casos.append({'peso': peso, 'eventos': evs})
                elif c2 == 0:
                    break
                else:
                    self.errores.append('randcase raro %02x en %#x' % (c2, q))
                    break
            ev['total'] = n
            ev['casos'] = casos
        elif cod == 64:
            ev['expr'], _ = self.valor(p)
        else:
            ev['bytes'] = d[p:fin].hex()

def es_header(d, p):
    if p + 12 > len(d):
        return False
    if d[p + 8] != RD_SCRIPT or d[p + 11] not in (RD_ENDLINE, 0):
        return False
    tam = be16(d, p + 9)
    if tam < 2 or p + 8 + tam + 1 > len(d):
        return False
    face_tam = d[p + 2]
    face_sec = int.from_bytes(d[p + 3:p + 6], 'big')
    return 0 < face_tam <= 128 and face_sec + face_tam <= FACE_SECTORES_MAX and (be16(d, p + 6) == 0)

def glifo_ascii(g):
    filas = []
    for y in range(12):
        v = g[y * 3] << 16 | g[y * 3 + 1] << 8 | g[y * 3 + 2]
        filas.append(''.join((' .+#'[v >> 22 - 2 * x & 3] for x in range(12))))
    return filas

def parsear(dat):
    d = open(dat, 'rb').read()
    P = Parser(d)
    llamadas, huecos = ([], [])
    p = 0
    while p < len(d):
        if not es_header(d, p):
            q = p
            while q < len(d) and (not es_header(d, q)):
                q += 1
            h = {'off': p, 'bytes': q - p, 'glifos_36': (q - p) // 36, 'resto': (q - p) % 36}
            if llamadas and llamadas[-1]['off'] + llamadas[-1]['bytes'] == p:
                ll = llamadas[-1]
                ll['glifos'] = [d[p + i * 36:p + (i + 1) * 36].hex() for i in range(h['glifos_36'])]
                ll['bytes_con_glifos'] = q - ll['off']
                h['llamada'] = ll['off']
            huecos.append(h)
            p = q
            continue
        face_tam = d[p + 2]
        face_sec = int.from_bytes(d[p + 3:p + 6], 'big')
        flags = be16(d, p + 6)
        eventos, fin = P.bloque(p + 8)
        ll = {'off': p, 'code': 0, 'freq_header': be16(d, p), 'face': {'sector': face_sec, 'sectores': face_tam, 'offset': face_sec * 2048, 'bytes': face_tam * 2048}, 'flags': flags, 'bytes': fin - p, 'bytes_con_glifos': fin - p, 'eventos': eventos}
        llamadas.append(ll)
        p = fin
    for ll in llamadas:
        n_sec = (ll['off'] + ll['bytes_con_glifos'] - 1 >> 11) - (ll['off'] >> 11)
        ll['code'] = ll['off'] | n_sec << 24
    return (d, llamadas, huecos, P.errores)

def codes_de_scripts(raiz=RAIZ):
    usos = {}

    def rec(bloque, disco, st):
        for s in bloque:
            if 'cmd' in s:
                if s['cmd'] == 'radio':
                    for a in s['args']:
                        if isinstance(a, dict) and 'opt' in a and (a['opt'] in ('c', 'b', 'o')):
                            vals = [x for x in a['v'] if isinstance(x, int)]
                            if a['opt'] == 'c':
                                if len(vals) >= 2:
                                    usos.setdefault(vals[1], []).append({'disco': disco, 'stage': st, 'opt': 'c', 'freq': vals[0]})
                            else:
                                for i in range(0, len(vals) - 1, 2):
                                    if 14000 <= vals[i] <= 14199:
                                        usos.setdefault(vals[i + 1], []).append({'disco': disco, 'stage': st, 'opt': a['opt'], 'freq': vals[i]})
                for a in s['args']:
                    if isinstance(a, dict) and 'bloque' in a:
                        rec(a['bloque'], disco, st)
                    if isinstance(a, dict) and 'opt' in a:
                        for x in a['v']:
                            if isinstance(x, dict) and 'bloque' in x:
                                rec(x['bloque'], disco, st)
    for f in sorted(glob.glob(os.path.join(EXTRAIDO if raiz == RAIZ else os.path.join(raiz, 'extraido'), 'disco*', '01_stages', '*', 'cache', 'scenerio.gcx'))):
        partes = os.path.normpath(f).split(os.sep)
        disco, st = (partes[-5], partes[-3])
        try:
            r = gcx.leer(f)
        except Exception as e:
            print('no pude leer', f, e, file=sys.stderr)
            continue
        rec(r['main'], disco, st)
        for b in r['procs'].values():
            rec(b, disco, st)
    return usos

def fmt_val(v):
    if isinstance(v, dict) and 'expr' in v:
        return '(' + ' '.join((f"op{x['op']}" if isinstance(x, dict) and 'op' in x and (x['op'] not in OPS) else OPS[x['op']] if isinstance(x, dict) and 'op' in x else fmt_val(x) for x in v['expr'])) + ')'
    return gcx.fmt(v) if isinstance(v, dict) else str(v)

def texto_eventos(evs, ind=0):
    pad = '  ' * ind
    out = []
    for e in evs:
        t = e['tipo']
        if t == 'hablar':
            out.append(f"{pad}{e['quien']} [cara {e['cara']:04x}, {e['frames']}f]: " + e['texto'].replace('\n', '\n' + pad + '    '))
        elif t == 'voz':
            out.append(f"{pad}VOZ sector {e['vox']} (VOX.DAT +{e['vox'] * 2048:#x})")
            out += texto_eventos(e.get('eventos', []), ind + 1)
        elif t == 'cara':
            out.append(f"{pad}CARA {e['quien']} {e['cara']:04x} frames={e['frames']}{('' if e['espera'] else ' (sin esperar)')}")
        elif t == 'contacto':
            out.append(f'''{pad}CONTACTO {e['freq'] / 100:.2f} "{e['nombre']}"''')
        elif t == 'guardar':
            out.append(f"{pad}GUARDAR area={fmt_val(e['area'])} nombres={e['nombres']}")
        elif t == 'sonido':
            out.append(f'{pad}SONIDO {e}')
        elif t == 'pregunta':
            out.append(f"{pad}PREGUNTA {e['opciones']}")
        elif t == 'varsave':
            out.append(f"{pad}VARSAVE {[fmt_val(v) for v in e['vars']]}")
        elif t == 'if':
            for i, r in enumerate(e['ramas']):
                out.append(f"{pad}{('IF' if i == 0 else 'ELSEIF' if r['cond'] is not None else 'ELSE')} {(fmt_val(r['cond']) if r['cond'] is not None else '')}")
                out += texto_eventos(r['eventos'], ind + 1)
        elif t == 'switch':
            out.append(f"{pad}SWITCH {fmt_val(e['valor'])}")
            for c in e['casos']:
                out.append(f"{pad}  CASE {c['caso']}" if c['caso'] is not None else f'{pad}  DEFAULT')
                out += texto_eventos(c['eventos'], ind + 2)
        elif t == 'randswitch':
            out.append(f"{pad}RANDOM de {e['total']}")
            for c in e['casos']:
                out.append(f"{pad}  PESO {c['peso']}")
                out += texto_eventos(c['eventos'], ind + 2)
        elif t == 'eval':
            out.append(f"{pad}EVAL {fmt_val(e['expr'])}")
        else:
            out.append(f'{pad}{e}')
    return out

def texto_llamada(ll):
    cab = f"== llamada off {ll['off']:#x} code {ll['code']} ({ll['code']:#x}) freq_header {ll['freq_header']} caras FACE.DAT sector {ll['face']['sector']} x{ll['face']['sectores']} bytes {ll['bytes']}"
    if ll.get('usos'):
        cab += ' | usada en ' + ', '.join(sorted({f"{u['stage']}(-{u['opt']} {u['freq']})" for u in ll['usos']}))
    return '\n'.join([cab] + texto_eventos(ll['eventos']))

def contar(evs, c):
    for e in evs:
        c[e['tipo']] = c.get(e['tipo'], 0) + 1
        for k in ('eventos',):
            if k in e:
                contar(e[k], c)
        for r in e.get('ramas', []):
            contar(r['eventos'], c)
        for r in e.get('casos', []):
            contar(r['eventos'], c)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dat', default=DAT_DEFECTO)
    ap.add_argument('--json', default=JSON_DEFECTO)
    ap.add_argument('--codigo', type=lambda s: int(s, 0), help='code del script (o offset) de una llamada a imprimir')
    ap.add_argument('--texto', action='store_true', help='volcar todas las llamadas en texto')
    ap.add_argument('--texto-a', help='archivo donde volcar todas las llamadas en texto (ademas del json)')
    ap.add_argument('--dat2', default=DAT_DEFECTO.replace('disco1', 'disco2'), help='RADIO.DAT del otro disco: mismo layout, solo cambian los sectores VOX; se agrega vox_disco2')
    ap.add_argument('--sin-gcx', action='store_true')
    ap.add_argument('--sin-json', action='store_true')
    a = ap.parse_args()
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    d, llamadas, huecos, errores = parsear(a.dat)
    por_off = {ll['off']: ll for ll in llamadas}

    def voces(evs, out):
        for e in evs:
            if e['tipo'] == 'voz':
                out[e['off']] = e
            if 'eventos' in e:
                voces(e['eventos'], out)
            for r in e.get('ramas', []):
                voces(r['eventos'], out)
            for r in e.get('casos', []):
                voces(r['eventos'], out)
    disco2 = None
    if a.dat2 and os.path.exists(a.dat2) and (os.path.abspath(a.dat2) != os.path.abspath(a.dat)):
        d2, ll2, _, _ = parsear(a.dat2)
        v1, v2 = ({}, {})
        for ll in llamadas:
            voces(ll['eventos'], v1)
        for ll in ll2:
            voces(ll['eventos'], v2)
        if [x['off'] for x in llamadas] == [x['off'] for x in ll2] and v1.keys() == v2.keys():
            for off, e in v1.items():
                e['vox_disco2'] = v2[off]['vox']
            campos_vox = set()
            for off in v1:
                campos_vox.update(range(off + 4, off + 8))
            disco2 = {'archivo': os.path.relpath(a.dat2, RAIZ), 'voces_en_cero': sum((1 for e in v2.values() if e['vox'] == 0)), 'voces_en_cero_disco1': sum((1 for e in v1.values() if e['vox'] == 0)), 'bytes_distintos_fuera_de_vox': sum((1 for i in range(min(len(d), len(d2))) if d[i] != d2[i] and i not in campos_vox)) + abs(len(d) - len(d2))}
        else:
            print('el otro disco tiene otro layout; no se cruza', file=sys.stderr)
    usos = {} if a.sin_gcx else codes_de_scripts()
    no_encontrados = []
    for code, lista in usos.items():
        ll = por_off.get(code & 16777215)
        if ll is None:
            no_encontrados.append({'code': code, 'usos': lista})
        else:
            ll.setdefault('usos', []).extend(lista)
            ll['sectores_extra_script'] = code >> 24
    for ll in llamadas:
        fr = sorted({u['freq'] for u in ll.get('usos', [])})
        ll['freq'] = fr[0] if len(fr) == 1 else fr if fr else None
    contactos = {}
    cnt = {}
    for ll in llamadas:
        contar(ll['eventos'], cnt)

        def busca(evs):
            for e in evs:
                if e['tipo'] == 'contacto':
                    contactos.setdefault(e['freq'], set()).add(e['nombre'])
                for k in ('eventos',):
                    if k in e:
                        busca(e[k])
                for r in e.get('ramas', []):
                    busca(r['eventos'])
                for r in e.get('casos', []):
                    busca(r['eventos'])
        busca(ll['eventos'])
    if a.codigo is not None:
        ll = por_off.get(a.codigo & 16777215)
        print(texto_llamada(ll) if ll else f'no hay llamada en {a.codigo:#x}')
        return
    if a.texto:
        for ll in llamadas:
            print(texto_llamada(ll))
            print()
        return
    if a.texto_a:
        with open(a.texto_a, 'w', encoding='utf-8') as f:
            f.write(f"# Volcado de {os.path.relpath(a.dat, RAIZ)}: {len(llamadas)} llamadas. Generado por tools/radio_dat.py\n# 'VOZ sector N' es el sector de 2048 bytes dentro de VOX.DAT del disco 1 (0 = la voz no esta en ese disco).\n\n")
            for ll in llamadas:
                f.write(texto_llamada(ll) + '\n\n')
    salida = {'archivo': os.path.relpath(a.dat, RAIZ), 'bytes': len(d), 'llamadas': len(llamadas), 'formato': 'ver docs/codec/radio_dat.md', 'disco2': disco2, 'personajes': {'%04x' % k: v for k, v in PERSONAJES.items()}, 'contactos': {str(k): sorted(v) for k, v in sorted(contactos.items())}, 'comandos': cnt, 'huecos_fuente': huecos, 'errores': errores, 'codes_sin_llamada': no_encontrados, 'calls': llamadas}
    if not a.sin_json:
        os.makedirs(os.path.dirname(a.json), exist_ok=True)
        json.dump(salida, open(a.json, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(f'{a.dat}: {len(d)} bytes, {len(llamadas)} llamadas, {len(huecos)} huecos de fuente, {len(errores)} errores de parseo')
    print('comandos:', cnt)
    print('contactos:', {k / 100: sorted(v) for k, v in sorted(contactos.items())})
    if usos:
        con = sum((1 for ll in llamadas if ll.get('usos')))
        print(f'scripts: {len(usos)} codes distintos, {con} llamadas referenciadas, {len(no_encontrados)} codes sin llamada, {len(llamadas) - con} llamadas sin referencia')
        malos = [ll['off'] for ll in llamadas if ll.get('usos') and ll['sectores_extra_script'] != ll['code'] >> 24]
        print('byte alto del code distinto del calculado:', [hex(x) for x in malos])
    if not a.sin_json:
        print('json:', a.json)
if __name__ == '__main__':
    main()
