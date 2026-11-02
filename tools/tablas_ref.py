# MGS web — FeniXVOID · Project Ravenlight
import os, re, sys, json, struct
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rutas
JSON = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tablas_ref.json')
_cache = None

def hay_ref():
    return os.path.isdir(rutas.REF)

def cargar():
    global _cache
    if _cache is None:
        _cache = json.load(open(JSON, encoding='utf-8'))
    return _cache

def _exe():
    if not os.path.exists(rutas.EXE):
        raise FileNotFoundError('falta el ejecutable del disco 1 (%s): hace falta para las tablas' % rutas.EXE)
    return open(rutas.EXE, 'rb').read()

def comandos():
    return {int(k): v for k, v in cargar()['comandos'].items()}

def charas():
    return {int(k): v for k, v in cargar()['charas'].items()}

def efectos_demo():
    return {int(k): v for k, v in cargar()['efectos_demo'].items()}

def curvas():
    off, n = cargar()['curvas']
    nums = struct.unpack_from('<%dH' % n, _exe(), off)
    return [list(nums[i * 64:(i + 1) * 64]) for i in range(n // 64)]

def blobs():
    exe = _exe()
    return {k: list(exe[o:o + n]) for k, (o, n) in cargar()['blobs'].items()}

def se_tbl():
    return cargar()['se_tbl']

def armar():
    S = rutas.REF
    out = {}
    t = open(os.path.join(S, 'game', 'script.c'), encoding='utf-8', errors='replace').read()
    out['comandos'] = {str(int(m.group(1), 16)): m.group(3) for m in re.finditer('\\{\\s*0x([0-9a-f]{4}),\\s*\\(?\\w*\\)?\\s*(\\w+)\\s*\\},\\s*//\\s*GV_StrCode\\("(\\w+)"\\)', t)}
    ch = {}
    for l in open(os.path.join(S, 'include', 'charalst.h'), encoding='utf-8', errors='replace'):
        m = re.match('#define\\s+CHARA_(\\w+)\\s+\\{\\s*0x([0-9a-fA-F]+),\\s*([^}]*)\\}\\s*(//.*)?', l)
        if m:
            jp = re.search('GV_StrCode\\("([^"]+)"\\)', m.group(4) or '')
            ch[str(int(m.group(2), 16))] = dict(nombre=m.group(1), jp=jp.group(1) if jp else '', archivo=(m.group(4) or '').split(')')[-1].strip(' /'))
    out['charas'] = ch
    p = os.path.join(S, 'kojo', 'demo.h')
    out['efectos_demo'] = {m.group(2): m.group(1) for m in re.finditer('#define\\s+EFFECT_(\\w+)\\s+(\\d+)', open(p, encoding='utf-8', errors='replace').read())}
    exe = _exe()
    t = open(os.path.join(S, 'game', 'motion.c'), encoding='utf-8', errors='replace').read()
    bloque = t[t.index('word_8009D69C'):t.index('dword_8009DE1C')]
    nums = [int(x, 16) for x in re.findall('0x([0-9A-Fa-f]{4})', bloque)]
    off = exe.find(struct.pack('<%dH' % len(nums), *nums))
    assert off >= 0, 'curvas de motion.c no encontradas en el ejecutable'
    out['curvas'] = [off, len(nums)]
    blob = open(os.path.join(S, 'sound', 'se_data', 'blob.h'), encoding='utf-8', errors='replace').read()
    bl, faltan = ({}, [])
    for m in re.finditer('unsigned char (\\w+)\\[\\]\\s*=\\s*\\{([^}]*)\\}', blob):
        b = bytes((int(x, 16) for x in re.findall('0x([0-9A-Fa-f]{2})', m.group(2))))
        o = exe.find(b)
        if o >= 0:
            bl[m.group(1)] = [o, len(b)]
        else:
            faltan.append(m.group(1))
    out['blobs'] = bl
    out['blobs_que_no_estan_en_el_exe'] = faltan
    tbl = open(os.path.join(S, 'sound', 'se_tbl.c'), encoding='utf-8', errors='replace').read()
    out['se_tbl'] = [[int(m.group(8)), int(m.group(1), 16), int(m.group(2), 16), int(m.group(3), 16), int(m.group(4), 16), [m.group(5), m.group(6), m.group(7)]] for m in re.finditer('\\{\\s*0x([0-9A-F]{2}),\\s*0x([0-9A-F]{2}),\\s*0x([0-9A-F]{2}),\\s*0x([0-9A-F]{2}),\\s*\\{\\s*(\\w+),\\s*(\\w+),\\s*(\\w+)\\s*\\}\\s*\\},\\s*/\\*\\s*(\\d+)\\s*\\*/', tbl)]
    json.dump(out, open(JSON, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('tablas_ref.json: %d comandos, %d charas, %d efectos de demo, %d efectos de sonido, blobs %d (no en el exe: %s)' % (len(out['comandos']), len(ch), len(out['efectos_demo']), len(out['se_tbl']), len(bl), ', '.join(faltan) or '-'))
if __name__ == '__main__':
    armar()
