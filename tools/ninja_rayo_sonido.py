# MGS web — FeniXVOID · Project Ravenlight
import os
import sys
import wave
import tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rutas import ASSETS
import demo_dat
SECTOR = 41866
DISPARO = (182.33, 182.8)
FONDO = (181.95, 182.32)
SALIDA = os.path.join(ASSETS, 'jefes', 'rex', 'ninjalaser.wav')

def main():
    try:
        import numpy as np
    except ImportError:
        print('ninja_rayo_sonido: falta numpy')
        return 0
    try:
        p, f, mm = demo_dat.abrir(2)
    except Exception as e:
        print('ninja_rayo_sonido: sin DEMO.DAT del disco 2 (%s); queda el SE de antes' % e)
        return 0
    s = demo_dat.stream_en(mm, SECTOR)
    if not s:
        print('ninja_rayo_sonido: no esta el stream', SECTOR)
        return 0
    tmp = os.path.join(tempfile.gettempdir(), 'mgs_241866_%d.wav' % os.getpid())
    info = demo_dat.exportar_wav(mm, s, tmp)
    if not info:
        return 0
    with wave.open(tmp) as w:
        hz, ch = (w.getframerate(), w.getnchannels())
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
    os.remove(tmp)
    if ch == 2:
        a = a.reshape(-1, 2).mean(1)
    N, H = (1024, 256)
    ven = np.hanning(N)

    def stft(x):
        return np.array([np.fft.rfft(x[i:i + N] * ven) for i in range(0, len(x) - N, H)])

    def istft(Z, n):
        y, ws = (np.zeros(n + N), np.zeros(n + N))
        for k, z in enumerate(Z):
            y[k * H:k * H + N] += np.fft.irfft(z) * ven
            ws[k * H:k * H + N] += ven * ven
        return y[:n] / np.maximum(ws[:n], 0.001)
    ruido = np.mean(np.abs(stft(a[int(FONDO[0] * hz):int(FONDO[1] * hz)])) ** 2, axis=0)
    x = a[int(DISPARO[0] * hz):int(DISPARO[1] * hz)]
    Z = stft(x)
    g = np.sqrt(np.maximum(1 - 1.6 * ruido / (np.abs(Z) ** 2 + 1e-12), 0.04))
    y = istft(Z * g, len(x))
    n = int(0.004 * hz)
    y[:n] *= np.linspace(0, 1, n)
    n = int(0.08 * hz)
    y[-n:] *= np.linspace(1, 0, n)
    y = y / max(1e-09, np.abs(y).max()) * 0.7
    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    with wave.open(SALIDA, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(hz)
        w.writeframes((y * 32767).astype('<i2').tobytes())
    print('ninja_rayo_sonido: %s (%.2f s, %d Hz)' % (SALIDA, len(y) / hz, hz))
    return 0
if __name__ == '__main__':
    sys.exit(main())
