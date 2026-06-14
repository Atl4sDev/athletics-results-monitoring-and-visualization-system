"""Shared pytest configuration for the sync-module unit suite.

The project modules use absolute imports rooted at the sync-module directory
(e.g. ``from models.enums import Gender``). ``pythonpath = .`` in pytest.ini
puts that directory on sys.path, so no path juggling is needed here.
"""
import pytest


@pytest.fixture
def lynx_file(tmp_path):
    """Factory that writes synthetic Lynx files in the real on-disk format.

    Every Lynx file (.cmp/.evt/.ppl/.lif) is UTF-16 LE with a BOM; Python's
    'utf-16' codec emits exactly that on a little-endian host. Tests pass plain
    text and get back a path the parsers (and read_lynx_file_safely) can consume
    for real — no mocking of the file layer.
    """
    def _make(name: str, text: str) -> str:
        path = tmp_path / name
        path.write_bytes(text.encode("utf-16"))
        return str(path)

    return _make
