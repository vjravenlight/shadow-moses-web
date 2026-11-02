# MGS web — FeniXVOID · Project Ravenlight
import os
RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

def _ruta(var, *defecto):
    v = os.environ.get(var)
    return os.path.abspath(v) if v else os.path.join(RAIZ, *defecto)
EXTRAIDO = _ruta('MGS_EXTRAIDO', 'extraido')
ASSETS = _ruta('MGS_ASSETS', 'visor', 'assets')
DOCS = _ruta('MGS_DOCS', 'docs')
PRUEBAS = _ruta('MGS_PRUEBAS', '_pruebas')
REF = os.path.join(RAIZ, 'ref', 'mgs_reversing', 'source')
EXE = os.environ.get('MGS_EXE') or os.path.join(EXTRAIDO, 'disco1', '00_disco', 'SLUS_005.94')
