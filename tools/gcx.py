# MGS web — FeniXVOID · Project Ravenlight
import struct, sys, os, re, json
RAIZ = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(RAIZ, 'ref', 'mgs_reversing', 'source')

def strcode(s):
    i = 0
    for c in s.encode():
        i = (i << 5 | i >> 11) & 65535
        i = i + c & 65535
    return i
COMANDOS = {3462: 'if', 25792: 'eval', 52538: 'return', 30262: 'foreach'}
if not os.path.isdir(SRC):
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import tablas_ref as _tr
for m in [] if not os.path.isdir(SRC) else re.finditer('\\{\\s*0x([0-9a-f]{4}),\\s*\\(?\\w*\\)?\\s*(\\w+)\\s*\\},\\s*//\\s*GV_StrCode\\("(\\w+)"\\)', open(os.path.join(SRC, 'game', 'script.c'), encoding='utf-8', errors='replace').read()):
    COMANDOS[int(m.group(1), 16)] = m.group(3)
if not os.path.isdir(SRC):
    COMANDOS.update(_tr.comandos())
CHARAS = {} if os.path.isdir(SRC) else _tr.charas()
for l in [] if not os.path.isdir(SRC) else open(os.path.join(SRC, 'include', 'charalst.h'), encoding='utf-8', errors='replace'):
    m = re.match('#define\\s+CHARA_(\\w+)\\s+\\{\\s*0x([0-9a-fA-F]+),\\s*([^}]*)\\}\\s*(//.*)?', l)
    if m:
        jp = re.search('GV_StrCode\\("([^"]+)"\\)', m.group(4) or '')
        CHARAS[int(m.group(2), 16)] = dict(nombre=m.group(1), jp=jp.group(1) if jp else '', archivo=(m.group(4) or '').split(')')[-1].strip(' /'))
NOMBRES = {}
nf = os.path.join(os.path.dirname(__file__), 'names.txt')
if os.path.exists(nf):
    for n in open(nf, encoding='latin1').read().split():
        NOMBRES.setdefault(strcode(n), n)
T_END, T_SHORT, T_BYTE, T_CHAR, T_BOOL, T_VECTOR, T_STRID, T_STRING, T_PROCID, T_INT, T_SYMBOL = range(11)
TIPOS_VAR = {1: 'w', 2: 'b', 3: 'c', 4: 'f', 6: 's', 8: 'p', 9: 'i'}

def be16(d, p):
    return struct.unpack('>h', d[p:p + 2])[0]

def ube16(d, p):
    return struct.unpack('>H', d[p:p + 2])[0]

def be32(d, p):
    return struct.unpack('>i', d[p:p + 4])[0]

class Lector:

    def __init__(self, d):
        self.d = d

    def valor(self, p):
        d = self.d
        t = d[p]
        if t & 240 == 16:
            v = be32(d, p)
            code = v << 1 >> 25 & 15
            link = v & 15728640 == 8388608
            return ({'var': f"${TIPOS_VAR.get(code, '?')}:{('L' if link else 'G')}{v & 65535:04x}" + (f'.{v << 1 >> 17 & 15}' if code == 4 else '')}, p + 4)
        q = p + 1
        if t == T_END:
            return (None, q)
        if t == T_SHORT:
            return (be16(d, q), q + 2)
        if t in (T_INT, T_SYMBOL):
            return (be32(d, q), q + 4)
        if t == T_STRID:
            v = ube16(d, q)
            return ({'id': v, 'n': NOMBRES.get(v)}, q + 2)
        if t == T_PROCID:
            return ({'proc': ube16(d, q)}, q + 2)
        if t in (T_BYTE, T_CHAR, T_BOOL):
            return (d[q], q + 1)
        if t == T_STRING:
            n = d[q]
            s = d[q + 1:q + 1 + n].split(b'\x00')[0]
            return ({'str': s.decode('shift_jis', 'replace')}, q + n + 1)
        if t == 32:
            return ({'arg': d[q]}, q + 1)
        if t == 48:
            return ({'expr': self.expr(q + 1, q + d[q])}, q + d[q])
        if t == 64:
            n = ube16(d, q)
            return ({'bloque': self.bloque(q + 2, q + n)}, q + n)
        if t == 80:
            c = chr(d[q])
            vals = []
            r = q + 2
            while d[r] not in (0, 80):
                v, r = self.valor(r)
                vals.append(v)
            return ({'opt': c, 'v': vals}, r)
        raise ValueError(f'codigo raro {t:#x} en {p:#x}')

    def expr(self, p, fin):
        out = []
        while p < fin:
            t = self.d[p]
            if t == 49:
                out.append({'op': self.d[p + 1]})
                p += 2
            elif t == 0:
                break
            else:
                v, p = self.valor(p)
                out.append(v)
        return out

    def valores(self, p, fin=None):
        out = []
        while fin is None or p < fin:
            v, p = self.valor(p)
            if v is None:
                break
            out.append(v)
        return (out, p)

    def bloque(self, p, fin=None):
        d = self.d
        out = []
        while fin is None or p < fin:
            t = d[p]
            if t == 0:
                break
            if t == 96:
                n = ube16(d, p + 1)
                cid = ube16(d, p + 3)
                args, _ = self.valores(p + 6, p + 1 + n)
                out.append({'cmd': COMANDOS.get(cid, f'cmd_{cid:04x}'), 'args': args})
                p = p + 1 + n
            elif t == 112:
                n = d[p + 1]
                pid = ube16(d, p + 2)
                args, _ = self.valores(p + 4, p + 1 + n)
                out.append({'call': pid, 'args': args})
                p = p + 1 + n
            elif t == 48:
                n = d[p + 1]
                out.append({'eval': self.expr(p + 2, p + 1 + n)})
                p = p + 1 + n
            else:
                raise ValueError(f'sentencia rara {t:#x} en {p:#x}')
        return out

def leer(path):
    d = open(path, 'rb').read()
    proclen = be32(d, 0)
    tabla = []
    p = 4
    while struct.unpack('<i', d[p:p + 4])[0] != 0:
        tabla.append((ube16(d, p), ube16(d, p + 2)))
        p += 4
    cuerpo_procs = p + 4
    script = 4 + proclen
    L = Lector(d)
    procs = {}
    for pid, off in tabla:
        b = cuerpo_procs + off
        try:
            procs[pid] = L.bloque(b + 3, b + 1 + ube16(d, b + 1))
        except Exception as e:
            procs[pid] = [{'error': str(e)}]
    s = script + 4
    assert d[s] == 64, 'no es script'
    principal = L.bloque(s + 3, s + 1 + ube16(d, s + 1))
    return {'procs': procs, 'main': principal}

def fmt(v):
    if isinstance(v, dict):
        if 'var' in v:
            return v['var']
        if 'id' in v:
            return v['n'] or f"#{v['id']:04x}"
        if 'proc' in v:
            return f"proc_{v['proc']:04x}"
        if 'str' in v:
            return json.dumps(v['str'], ensure_ascii=False)
        if 'arg' in v:
            return f"arg{v['arg']}"
        if 'expr' in v:
            return '(' + ' '.join((f"op{x['op']}" if isinstance(x, dict) and 'op' in x else fmt(x) for x in v['expr'])) + ')'
        if 'opt' in v:
            return f"-{v['opt']} " + ' '.join((fmt(x) for x in v['v']))
        if 'bloque' in v:
            return '{…}'
    return str(v)

def texto(bloque, ind=0):
    out = []
    pad = '  ' * ind
    for s in bloque:
        if 'cmd' in s:
            args = s['args']
            linea = s['cmd']
            if s['cmd'] == 'chara' and args and isinstance(args[0], dict) and ('id' in args[0]):
                c = CHARAS.get(args[0]['id'])
                linea += f" {(c['nombre'] if c else '#%04x' % args[0]['id'])}"
                args = args[1:]
            partes = [fmt(a) for a in args if not (isinstance(a, dict) and 'bloque' in a)]
            out.append(pad + linea + ' ' + ' '.join(partes))
            for a in s['args']:
                if isinstance(a, dict) and 'bloque' in a:
                    out.append(pad + '{')
                    out += texto(a['bloque'], ind + 1)
                    out.append(pad + '}')
                if isinstance(a, dict) and 'opt' in a:
                    for x in a['v']:
                        if isinstance(x, dict) and 'bloque' in x:
                            out.append(pad + f"  -{a['opt']} {{")
                            out += texto(x['bloque'], ind + 2)
                            out.append(pad + '  }')
        elif 'call' in s:
            out.append(pad + f"proc_{s['call']:04x} " + ' '.join((fmt(a) for a in s['args'])))
        elif 'eval' in s:
            out.append(pad + 'eval ' + fmt({'expr': s['eval']}))
        else:
            out.append(pad + json.dumps(s, ensure_ascii=False))
    return out
if __name__ == '__main__':
    r = leer(sys.argv[1])
    sys.stdout.reconfigure(encoding='utf-8')
    print('### MAIN')
    print('\n'.join(texto(r['main'])))
    for pid, b in r['procs'].items():
        print(f'\n### proc_{pid:04x}')
        print('\n'.join(texto(b)))
    if '--json' in sys.argv:
        json.dump(r, open(sys.argv[sys.argv.index('--json') + 1], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
