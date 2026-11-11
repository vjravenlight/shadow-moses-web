# MGS web — FeniXVOID · Project Ravenlight
import struct, json, os, sys, io, math, glob, re
sys.path.insert(0, os.path.dirname(__file__))
import sys as _sys_rutas, os as _os_rutas
_sys_rutas.path.insert(0, _os_rutas.path.dirname(_os_rutas.path.abspath(__file__)))
from rutas import EXTRAIDO, ASSETS, DOCS, PRUEBAS
from kmd2obj import load
from pcx_mgs import decode, modo_semi
from preshade import normales_kmd, color_vertice
ESCALA = 0.001
STAGES = os.path.join(EXTRAIDO, 'disco1', '01_stages')

def strcode(s):
    i = 0
    for c in s.encode():
        i = (i << 5 | i >> 11) & 65535
        i = i + c & 65535
    return i

def pcx_hash(path):
    n = os.path.basename(path)[:-4]
    return int(n, 16) if re.fullmatch('[0-9a-f]{4}', n) else strcode(n)
_global = None

def indice_texturas(stage_dir):
    global _global
    local = {pcx_hash(p): p for p in glob.glob(os.path.join(stage_dir, '*', '*.pcx'))} if stage_dir else {}
    if _global is None:
        _global = {}
        for p in glob.glob(os.path.join(STAGES, '*', '*', '*.pcx')):
            _global.setdefault(pcx_hash(p), p)
    return (local, _global)

def exportar(kmd_path, out_path, estatico=False, luz=None, normales_juego=False):
    mdls = load(kmd_path)
    normales = normales_kmd(kmd_path) if luz or normales_juego else None
    stage_dir = os.path.dirname(os.path.dirname(os.path.abspath(kmd_path)))
    if os.path.basename(os.path.dirname(stage_dir)) != '01_stages':
        stage_dir = None
    local, glob_idx = indice_texturas(stage_dir)
    grupos = {}
    for pi, m in enumerate(mdls):
        for f in range(len(m['vi']) // 4):
            tid = m['tex'][f] if m['tex'] else 0
            grupos.setdefault((tid, bool(m['flag'] & 2)), []).append((pi, f))

    def pos(m, k):
        x, y, z = m['world'][k]
        return (x * ESCALA, y * ESCALA, z * ESCALA)

    def joint(pi, m, k):
        if estatico:
            return 0
        pad = m['verts'][k][3]
        return m['parent'] if pad != -1 and m['parent'] >= 0 else pi
    buf = bytearray()
    views = []
    accs = []

    def add_view(data, target=None):
        while len(buf) % 4:
            buf.append(0)
        off = len(buf)
        buf.extend(data)
        v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(data)}
        if target:
            v['target'] = target
        views.append(v)
        return len(views) - 1

    def add_acc(data, ctype, count, typ, mn=None, mx=None, target=None):
        a = {'bufferView': add_view(data, target), 'componentType': ctype, 'count': count, 'type': typ}
        if mn is not None:
            a['min'] = mn
            a['max'] = mx
        accs.append(a)
        return len(accs) - 1
    if luz:
        import math as _m
        ca, sa = (_m.cos(luz.get('rot', 0)), _m.sin(luz.get('rot', 0)))
        ox, oy, oz = luz.get('pos', (0, 0, 0))

        def a_mundo(v):
            x, y, z = v
            return (x * ca + z * sa + ox, y + oy, -x * sa + z * ca + oz)

        def n_mundo(n):
            x, y, z = n
            return (x * ca + z * sa, y, -x * sa + z * ca)
    images = []
    textures = []
    materials = []
    prims = []
    for (tid, trans), caras in grupos.items():
        P = []
        N = []
        UV = []
        J = []
        I = []
        C = []
        for pi, f in caras:
            m = mdls[pi]
            ks = [m['vi'][f * 4 + j] & 127 for j in range(4)]
            ps = [pos(m, k) for k in ks]
            a, b, c = (ps[0], ps[1], ps[2])
            u = [b[i] - a[i] for i in range(3)]
            w = [c[i] - a[i] for i in range(3)]
            n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
            nl = math.sqrt(sum((t * t for t in n))) or 1
            n = [t / nl for t in n]
            base = len(P)
            for j in range(4):
                P.append(ps[j])
                if normales_juego and normales and (normales[pi] is not None):
                    q = normales[pi][f * 4 + j]
                    ql = math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2]) or 1
                    N.append([-q[0] / ql, -q[1] / ql, -q[2] / ql])
                else:
                    N.append(n)
                if m['uv']:
                    UV.append(((m['uv'][f * 8 + j * 2] + 0.5) / 256, (m['uv'][f * 8 + j * 2 + 1] + 0.5) / 256))
                else:
                    UV.append((0, 0))
                J.append(joint(pi, m, ks[j]))
                if luz:
                    if m['flag'] & 4 or not normales or normales[pi] is None:
                        C.append((0.5, 0.5, 0.5))
                    else:
                        c = color_vertice(a_mundo(m['world'][ks[j]]), n_mundo(normales[pi][f * 4 + j]), luz['luces'], luz.get('amb', (0, 0, 0)), luz.get('main'))
                        C.append(tuple((min(1.0, v / 2) for v in c)))
            I += [base, base + 1, base + 2, base, base + 2, base + 3]
        nv = len(P)
        mn = [min((p[i] for p in P)) for i in range(3)]
        mx = [max((p[i] for p in P)) for i in range(3)]
        attrs = {'POSITION': add_acc(struct.pack(f'<{nv * 3}f', *[c for p in P for c in p]), 5126, nv, 'VEC3', mn, mx, 34962), 'NORMAL': add_acc(struct.pack(f'<{nv * 3}f', *[c for p in N for c in p]), 5126, nv, 'VEC3', target=34962), 'TEXCOORD_0': add_acc(struct.pack(f'<{nv * 2}f', *[c for p in UV for c in p]), 5126, nv, 'VEC2', target=34962)}
        if C:
            attrs['COLOR_0'] = add_acc(struct.pack(f'<{nv * 3}f', *[c for p in C for c in p]), 5126, nv, 'VEC3', target=34962)
        if not estatico:
            attrs['JOINTS_0'] = add_acc(struct.pack(f'<{nv * 4}H', *[c for j in J for c in (j, 0, 0, 0)]), 5123, nv, 'VEC4', target=34962)
            attrs['WEIGHTS_0'] = add_acc(struct.pack(f'<{nv * 4}f', *[c for _ in J for c in (1, 0, 0, 0)]), 5126, nv, 'VEC4', target=34962)
        idx = add_acc(struct.pack(f'<{len(I)}I', *I), 5125, len(I), 'SCALAR', target=34963)
        pcx = local.get(tid) or glob_idx.get(tid)
        abr = modo_semi(pcx) if pcx and trans else None
        mat = {'name': f'tex_{tid:04x}' + (f'_t{abr}' if abr is not None else ''), 'doubleSided': True, 'pbrMetallicRoughness': {'metallicFactor': 0, 'roughnessFactor': 1}}
        if pcx:
            png = io.BytesIO()
            decode(pcx, semi=128 if abr == 0 else None).save(png, 'PNG')
            images.append({'bufferView': add_view(png.getvalue()), 'mimeType': 'image/png', 'name': os.path.basename(pcx)})
            textures.append({'source': len(images) - 1, 'sampler': 0})
            mat['pbrMetallicRoughness']['baseColorTexture'] = {'index': len(textures) - 1}
            if abr == 0:
                mat['alphaMode'] = 'BLEND'
            else:
                mat['alphaMode'] = 'MASK'
                mat['alphaCutoff'] = 0.5
        else:
            mat['pbrMetallicRoughness']['baseColorFactor'] = [0.5, 0.55, 0.5, 1]
        materials.append(mat)
        prims.append({'attributes': attrs, 'indices': idx, 'material': len(materials) - 1})
    nombre = os.path.basename(kmd_path)[:-4]
    gltf = {'asset': {'version': '2.0', 'generator': 'MGS_web export_glb.py'}, 'scene': 0, 'meshes': [{'name': nombre, 'primitives': prims}], 'samplers': [{'magFilter': 9728, 'minFilter': 9728, 'wrapS': 33071, 'wrapT': 33071}], 'materials': materials, 'buffers': [{}], 'bufferViews': views, 'accessors': accs}
    if images:
        gltf['images'] = images
        gltf['textures'] = textures
    if estatico:
        gltf['nodes'] = [{'name': nombre, 'mesh': 0}]
        gltf['scenes'] = [{'nodes': [0]}]
    else:
        nodes = [{'name': nombre, 'mesh': 0, 'skin': 0}]
        for pi, m in enumerate(mdls):
            t = m['t']
            nodes.append({'name': f'hueso_{pi}', 'translation': [t[0] * ESCALA, t[1] * ESCALA, t[2] * ESCALA]})
        for pi, m in enumerate(mdls):
            hijos = [ci + 1 for ci, c in enumerate(mdls) if c['parent'] == pi]
            if hijos:
                nodes[pi + 1]['children'] = hijos
        raices = [pi + 1 for pi, m in enumerate(mdls) if m['parent'] < 0]
        ibm = []
        for m in mdls:
            o = m['org']
            ibm += [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -o[0] * ESCALA, -o[1] * ESCALA, -o[2] * ESCALA, 1]
        gltf['skins'] = [{'joints': [pi + 1 for pi in range(len(mdls))], 'skeleton': raices[0], 'inverseBindMatrices': add_acc(struct.pack(f'<{len(ibm)}f', *ibm), 5126, len(mdls), 'MAT4')}]
        gltf['nodes'] = nodes
        gltf['scenes'] = [{'nodes': [0] + raices}]
    while len(buf) % 4:
        buf.append(0)
    gltf['buffers'][0]['byteLength'] = len(buf)
    js = json.dumps(gltf, separators=(',', ':')).encode()
    while len(js) % 4:
        js += b' '
    with open(out_path, 'wb') as o:
        o.write(struct.pack('<III', 1179937895, 2, 12 + 8 + len(js) + 8 + len(buf)))
        o.write(struct.pack('<II', len(js), 1313821514))
        o.write(js)
        o.write(struct.pack('<II', len(buf), 5130562))
        o.write(buf)
    sin_tex = sum((1 for m in materials if 'baseColorTexture' not in m['pbrMetallicRoughness']))
    return dict(piezas=len(mdls), caras=sum((len(c) for c in grupos.values())), texturas=len(images), sin_textura=sin_tex)
if __name__ == '__main__':
    print(exportar(sys.argv[1], sys.argv[2], '--estatico' in sys.argv))
