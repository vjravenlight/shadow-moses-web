# MGS web — FeniXVOID · Project Ravenlight
import os, sys, struct, hashlib
SS = 2352
SYNC = b'\x00' + b'\xff' * 10 + b'\x00'
USA = {'SLUS_005.94': 1, 'SLUS_007.76': 2}
OTRAS = {'SLPM_861.11': 'japonesa (disco 1)', 'SLPM_861.12': 'japonesa (disco 2)', 'SLES_015.06': 'europea (inglés, disco 1)', 'SLES_115.06': 'europea (inglés, disco 2)', 'SLES_015.07': 'europea (francés)', 'SLES_015.08': 'europea (alemán)', 'SLES_015.09': 'europea (italiano)', 'SLES_015.10': 'europea (castellano)', 'SLPM_862.47': 'Integral (Japón)', 'SLUS_009.57': 'VR Missions (USA)', 'SLPM_861.14': 'Integral (Japón)'}
NO_HACEN_FALTA = {'DUMMY3M.DAT'}
TAMANOS_V10 = {1: {'MGS/STAGE.DIR': 71892992, 'MGS/DEMO.DAT': 258603008, 'MGS/VOX.DAT': 196014080}, 2: {'MGS/STAGE.DIR': 71888896, 'MGS/DEMO.DAT': 194002944, 'MGS/VOX.DAT': 188934144}}

class ErrorDisco(Exception):
    pass

def bin_de_cue(cue):
    base = os.path.dirname(os.path.abspath(cue))
    txt = open(cue, 'rb').read().decode('latin1')
    for l in txt.splitlines():
        l = l.strip()
        if l.upper().startswith('FILE'):
            a, b = (l.find('"'), l.rfind('"'))
            nombre = l[a + 1:b] if 0 <= a < b else l.split()[1]
            p = os.path.join(base, nombre)
            if not os.path.exists(p):
                bins = [f for f in os.listdir(base) if f.lower().endswith('.bin')]
                if len(bins) == 1:
                    p = os.path.join(base, bins[0])
                else:
                    raise ErrorDisco('El .cue nombra "%s", que no está al lado. / The .cue points to "%s", which is not next to it.' % (nombre, nombre))
            return p
    raise ErrorDisco('El .cue no nombra ningún archivo. / The .cue file names no data file.')

class Imagen:

    def __init__(self, ruta):
        self.ruta_original = ruta
        if not os.path.isfile(ruta):
            raise ErrorDisco('No existe el archivo: %s / File not found.' % ruta)
        ext = os.path.splitext(ruta)[1].lower()
        if ext in ('.7z', '.zip', '.rar', '.gz'):
            raise ErrorDisco('Ese archivo está comprimido (%s): descomprimilo primero y elegí el .cue o el .bin.\nThat file is compressed (%s): extract it first and choose the .cue or .bin.' % (ext, ext))
        if ext in ('.chd', '.ecm', '.pbp', '.mds', '.mdf', '.nrg', '.cdi'):
            raise ErrorDisco('El formato %s no se puede leer: hace falta .bin/.cue (o .img de 2352 bytes por sector).\nThe %s format is not supported: use .bin/.cue (or a 2352-byte .img).' % (ext, ext))
        if ext in ('.ccd', '.sub'):
            img = os.path.splitext(ruta)[0] + '.img'
            if not os.path.isfile(img):
                raise ErrorDisco('Elegí el .img que va con ese .%s. / Choose the .img that goes with that .%s.' % (ext[1:], ext[1:]))
            ruta = img
        if ruta.lower().endswith('.cue'):
            ruta = bin_de_cue(ruta)
        self.ruta = ruta
        self.f = open(ruta, 'rb')
        tam = os.path.getsize(ruta)
        self.f.seek(16 * SS)
        s = self.f.read(SS)
        if s[:12] == SYNC and tam % SS == 0:
            self.crudo = True
        else:
            self.f.seek(16 * 2048)
            s = self.f.read(2048)
            if s[1:6] == b'CD001':
                raise ErrorDisco('Es una imagen .iso de 2048 bytes por sector: le faltan los videos y las voces (sectores XA). Hace falta la copia completa en .bin/.cue (2352 bytes por sector).\nThis is a 2048-byte .iso: it lacks the XA sectors (videos and voices). Use the full .bin/.cue (2352-byte sectors).')
            raise ErrorDisco('No parece la imagen de un disco de PlayStation (.bin/.cue). / This does not look like a PlayStation disc image (.bin/.cue).')
        pvd = self.datos(16)
        if pvd[1:6] != b'CD001':
            raise ErrorDisco('La imagen no tiene un sistema de archivos de CD. / The image has no CD file system.')
        self.archivos = []
        raiz = pvd[156:156 + 34]
        self._recorrer(struct.unpack('<I', raiz[2:6])[0], struct.unpack('<I', raiz[10:14])[0], '')

    def sector(self, n):
        self.f.seek(n * SS)
        return self.f.read(SS)

    def datos(self, n):
        return self.sector(n)[24:24 + 2048]

    def _recorrer(self, lba, size, ruta):
        buf = b''.join((self.datos(lba + i) for i in range((size + 2047) // 2048)))
        i = 0
        while i < len(buf):
            l = buf[i]
            if l == 0:
                i = (i // 2048 + 1) * 2048
                continue
            rec = buf[i:i + l]
            i += l
            elba = struct.unpack('<I', rec[2:6])[0]
            esz = struct.unpack('<I', rec[10:14])[0]
            flags = rec[25]
            nl = rec[32]
            nombre = rec[33:33 + nl]
            if nombre in (b'\x00', b'\x01'):
                continue
            nombre = nombre.decode('latin1').split(';')[0]
            p = (ruta + '/' + nombre).lstrip('/')
            su = rec[33 + nl + (1 if nl % 2 == 0 else 0):]
            xa = struct.unpack('>H', su[4:6])[0] if len(su) >= 14 and su[6:8] == b'XA' else 0
            if flags & 2:
                self._recorrer(elba, esz, p)
            else:
                self.archivos.append((p, elba, esz, xa))

    def nombres(self):
        return {p.upper() for p, _, _, _ in self.archivos}

    def cual(self):
        n = self.nombres()
        for exe, d in USA.items():
            if exe in n or 'MGS/' + exe in n:
                faltan = [x for x in ('MGS/STAGE.DIR', 'MGS/DEMO.DAT', 'MGS/VOX.DAT', 'MGS/RADIO.DAT', 'MGS/FACE.DAT', 'MGS/ZMOVIE.STR') if x not in n]
                if faltan:
                    raise ErrorDisco('Es MGS USA disco %d, pero le faltan archivos: %s (imagen incompleta o dañada).\nIt is MGS USA disc %d but some files are missing: %s (incomplete or damaged image).' % (d, ', '.join(faltan), d, ', '.join(faltan)))
                tam = {p.upper(): s for p, _, s, _ in self.archivos}
                avisos = []
                if any((tam.get(k) != v for k, v in TAMANOS_V10[d].items())):
                    avisos.append('Ojo: no es la revisión v1.0 del disco %d (la que se probó). Puede andar con detalles.\nNote: this is not the v1.0 revision of disc %d (the tested one). It may work with glitches.' % (d, d))
                return (d, avisos)
        for exe, cual in OTRAS.items():
            if exe in n or 'MGS/' + exe in n:
                raise ErrorDisco('Es Metal Gear Solid, pero la versión %s. Hace falta la versión USA (SLUS-00594 / SLUS-00776).\nThis is Metal Gear Solid, but not the USA version. The USA version is needed (SLUS-00594 / SLUS-00776).' % cual)
        if 'MGS/STAGE.DIR' in n:
            raise ErrorDisco('Parece Metal Gear Solid pero no la versión USA (no tiene SLUS-00594 ni SLUS-00776).\nIt looks like Metal Gear Solid but not the USA version (no SLUS-00594 / SLUS-00776).')
        raise ErrorDisco('Este disco no es Metal Gear Solid (USA). / This disc is not Metal Gear Solid (USA).')

    def integral(self):
        n = self.nombres()
        for exe, d in (('SLPM_862.47', 1), ('SLPM_862.48', 2)):
            if (exe in n or 'MGS/' + exe in n) and 'MGS/STAGE.DIR' in n:
                return d
        return None

    def vr_missions(self):
        n = self.nombres()
        return ('SLUS_009.57' in n or 'MGS/SLUS_009.57' in n) and 'MGS/STAGE.DIR' in n

    def extraer(self, salida, avance=None, solo=None):
        elegido = lambda p: os.path.basename(p).upper() not in NO_HACEN_FALTA and (solo is None or p.upper() in solo)
        total = sum((s for p, _, s, _ in self.archivos if elegido(p)))
        hecho = 0
        for p, l, s, x in self.archivos:
            if not elegido(p):
                continue
            dst = os.path.join(salida, *p.split('/'))
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            n = (s + 2047) // 2048
            if os.path.exists(dst) and os.path.getsize(dst) == (n * 2336 if x & 12288 else s):
                hecho += s
                continue
            tmp = dst + '.parcial'
            with open(tmp, 'wb') as o:
                self.f.seek(l * SS)
                rem = s
                for k in range(0, n, 512):
                    m = min(512, n - k)
                    bloque = self.f.read(m * SS)
                    if x & 12288:
                        o.write(b''.join((bloque[j * SS + 16:j * SS + 16 + 2336] for j in range(m))))
                    else:
                        parte = b''.join((bloque[j * SS + 24:j * SS + 24 + 2048] for j in range(m)))
                        o.write(parte[:rem])
                        rem -= len(parte)
                    hecho += min(m * 2048, s)
                    if avance:
                        avance(hecho, total)
            os.replace(tmp, dst)
        return total

def huella(ruta, n=1 << 20):
    h = hashlib.sha1(str(os.path.getsize(ruta)).encode())
    with open(ruta, 'rb') as f:
        h.update(f.read(n))
        f.seek(max(0, os.path.getsize(ruta) - n))
        h.update(f.read(n))
    return h.hexdigest()[:16]
if __name__ == '__main__':
    try:
        im = Imagen(sys.argv[1])
        d, av = im.cual()
        print('disco', d, '(MGS USA)', *av)
        if len(sys.argv) > 2:
            im.extraer(sys.argv[2])
            print('extraído en', sys.argv[2])
    except ErrorDisco as e:
        print(e)
        sys.exit(2)
