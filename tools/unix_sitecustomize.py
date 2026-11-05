# MGS web — FeniXVOID · Project Ravenlight
import os
_listdir, _scandir = (os.listdir, os.scandir)

def listdir(path='.'):
    return sorted(_listdir(path), key=lambda n: n.upper())

class _Lista:

    def __init__(self, it):
        with it:
            self._i = iter(sorted(it, key=lambda e: e.name.upper()))

    def __enter__(self):
        return self

    def __exit__(self, *a):
        pass

    def __iter__(self):
        return self

    def __next__(self):
        return next(self._i)

    def close(self):
        pass

def scandir(path='.'):
    return _Lista(_scandir(path))
os.listdir, os.scandir = (listdir, scandir)
