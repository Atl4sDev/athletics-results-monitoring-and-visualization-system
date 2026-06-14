"""Unit tests for utils.file_locks.read_lynx_file_safely.

FinishLynx holds write locks during camera processing, so reads must retry with
exponential backoff on PermissionError (0.1, 0.2, 0.4, 0.8, 1.6s). The reader
also owns the UTF-16-LE-with-BOM contract for every Lynx file. time.sleep is
patched out so the backoff schedule is asserted without real delays.
"""
from unittest.mock import patch

import pytest

from utils import file_locks
from utils.file_locks import read_lynx_file_safely


def _write_utf16(path, text):
    # Python's 'utf-16' codec emits a BOM and native (LE) byte order.
    path.write_bytes(text.encode("utf-16"))
    return str(path)


class TestEncodingContract:
    def test_reads_utf16_and_strips_bom(self, tmp_path):
        path = _write_utf16(tmp_path / "athletes.ppl", "Петренко,Іван\nКовальчук,Олег\n")
        lines = read_lynx_file_safely(path)
        # BOM (﻿) must not survive into the first line.
        assert lines == ["Петренко,Іван", "Ковальчук,Олег"]
        assert "﻿" not in lines[0]

    def test_blank_lines_are_filtered(self, tmp_path):
        path = _write_utf16(tmp_path / "f.lif", "a\n\n   \nb\n")
        assert read_lynx_file_safely(path) == ["a", "b"]

    def test_empty_file_returns_empty_list(self, tmp_path):
        path = _write_utf16(tmp_path / "empty.lif", "")
        assert read_lynx_file_safely(path) == []


class TestMissingFile:
    def test_nonexistent_file_returns_empty_list(self, tmp_path):
        missing = str(tmp_path / "does-not-exist.lif")
        assert read_lynx_file_safely(missing) == []


class TestBackoff:
    def test_retries_then_succeeds(self, tmp_path):
        path = _write_utf16(tmp_path / "locked.lif", "row1\nrow2\n")
        real_open = open
        state = {"n": 0}

        def flaky_open(*args, **kwargs):
            state["n"] += 1
            if state["n"] <= 2:  # locked for the first two attempts
                raise PermissionError("file is locked by FinishLynx")
            return real_open(*args, **kwargs)

        with patch("utils.file_locks.open", side_effect=flaky_open, create=True), \
             patch("utils.file_locks.time.sleep") as mock_sleep:
            result = read_lynx_file_safely(path)

        assert result == ["row1", "row2"]
        # Two failures -> two backoff sleeps with the documented schedule.
        assert [c.args[0] for c in mock_sleep.call_args_list] == [0.1, 0.2]

    def test_exhausts_retries_and_returns_empty(self, tmp_path):
        path = _write_utf16(tmp_path / "stuck.lif", "data\n")

        def always_locked(*args, **kwargs):
            raise PermissionError("permanently locked")

        with patch("utils.file_locks.open", side_effect=always_locked, create=True), \
             patch("utils.file_locks.time.sleep") as mock_sleep:
            result = read_lynx_file_safely(path, max_retries=5)

        assert result == []
        # One sleep per attempt: full exponential schedule.
        assert [c.args[0] for c in mock_sleep.call_args_list] == [0.1, 0.2, 0.4, 0.8, 1.6]

    def test_respects_custom_max_retries(self, tmp_path):
        path = _write_utf16(tmp_path / "stuck.lif", "data\n")

        def always_locked(*args, **kwargs):
            raise PermissionError("locked")

        with patch("utils.file_locks.open", side_effect=always_locked, create=True), \
             patch("utils.file_locks.time.sleep") as mock_sleep:
            result = read_lynx_file_safely(path, max_retries=3)

        assert result == []
        assert len(mock_sleep.call_args_list) == 3


class TestEncodingError:
    def test_non_utf16_content_returns_empty_list(self, tmp_path):
        # Odd byte length / invalid UTF-16 surfaces as a UnicodeError, which the
        # reader swallows and returns [] (logged, parsing continues elsewhere).
        path = tmp_path / "bad.lif"
        path.write_bytes(b"\xff\xfe\x00")  # BOM + a dangling single byte
        assert read_lynx_file_safely(str(path)) == []
