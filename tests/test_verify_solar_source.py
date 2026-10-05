"""Offline checks for pinned downloads and independent reconstruction matching."""

from contextlib import redirect_stdout
import gzip
import hashlib
import io
import json
from pathlib import Path
import shutil
import sys
import unittest
import uuid

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.verify_solar_source import MANIFEST, verify_solar_source


class SourceResponse(io.BytesIO):
    status = 200

    def __init__(self, payload, url, content_length=True):
        super().__init__(payload)
        self.url = url
        self.headers = {"Content-Length": str(len(payload))} if content_length else {}

    def geturl(self):
        return self.url


class SolarSourceTests(unittest.TestCase):
    def setUp(self):
        self.root = ROOT / (".test-solar-source-" + uuid.uuid4().hex)
        self.root.mkdir()
        self.addCleanup(self.remove_temporary_root)
        self.payload = gzip.compress(b"100 200\n2 3\n1950.5 1951.5\n10 20\n30 40\n", mtime=0)
        self.saved = (b"time,Solar Irradiance,year_decimal\n"
                      b"1.500000,180.000000,1951.500000\n"
                      b"0.500000,80.000000,1950.500000\n")
        self.manifest = {"schema_version": 1, "input_url": "https://example.test/reviewed.txt.gz",
                         "cache_filename": "reviewed.txt.gz", "input_bytes": len(self.payload),
                         "input_sha256": hashlib.sha256(self.payload).hexdigest(),
                         "output_path": "data/solar/output.csv", "output_rows": 2,
                         "output_sha256_lf": hashlib.sha256(self.saved).hexdigest()}
        self.output = self.root / self.manifest["output_path"]
        self.output.parent.mkdir(parents=True)
        self.output.write_bytes(self.saved)
        self.manifest_path = self.root / MANIFEST
        self.save_manifest()
        self.requests = 0

    def remove_temporary_root(self):
        target = self.root.resolve()
        if target.parent != ROOT.resolve() or not target.name.startswith(".test-solar-source-"):
            raise RuntimeError("Unexpected test cleanup path")
        shutil.rmtree(target)

    def save_manifest(self):
        self.manifest_path.write_text(json.dumps(self.manifest), encoding="utf-8")

    def fetch(self, request, timeout):
        self.assertEqual(request.full_url, self.manifest["input_url"])
        self.requests += 1
        return SourceResponse(self.payload, request.full_url)

    def verify(self, offline=False, opener=None):
        with redirect_stdout(io.StringIO()):
            return verify_solar_source(self.root, offline=offline, opener=opener or self.fetch)

    def test_download_reproduces_bundled_rows_and_reuses_verified_cache(self):
        result = self.verify()
        self.assertEqual(result["rows"], 2)
        self.assertEqual(self.requests, 1)
        self.verify(offline=True)
        self.assertEqual(self.requests, 1)
        self.assertEqual(self.output.read_bytes(), self.saved)
        self.assertEqual([path.name for path in (self.root / ".cache/solar").iterdir()], ["reviewed.txt.gz"])

    def test_incomplete_and_oversized_downloads_leave_no_partial_cache(self):
        for payload in (self.payload[:-1], self.payload + b"extra"):
            with self.subTest(size=len(payload)):
                with self.assertRaises(ValueError):
                    self.verify(opener=lambda request, timeout: SourceResponse(payload, request.full_url, False))
                self.assertEqual(list((self.root / ".cache/solar").iterdir()), [])
                self.assertEqual(self.output.read_bytes(), self.saved)

    def test_changed_source_checksum_is_rejected(self):
        self.payload = bytes([self.payload[0] ^ 1]) + self.payload[1:]
        with self.assertRaisesRegex(ValueError, "SHA-256"):
            self.verify()
        self.assertEqual(list((self.root / ".cache/solar").iterdir()), [])

    def test_corrupt_cache_fails_offline_and_is_replaced_only_by_verified_download(self):
        self.verify()
        cached = self.root / ".cache/solar/reviewed.txt.gz"
        cached.write_bytes(b"corrupt cache")
        with self.assertRaisesRegex(ValueError, "checksum"):
            self.verify(offline=True)
        self.verify()
        self.assertEqual(cached.read_bytes(), self.payload)

    def test_authentic_input_with_different_integration_never_replaces_bundled_output(self):
        self.payload = gzip.compress(b"100 200\n2 3\n1950.5 1951.5\n10 21\n30 40\n", mtime=0)
        self.manifest["input_bytes"] = len(self.payload)
        self.manifest["input_sha256"] = hashlib.sha256(self.payload).hexdigest()
        self.save_manifest()
        with self.assertRaisesRegex(ValueError, "does not reproduce"):
            self.verify()
        self.assertEqual(self.output.read_bytes(), self.saved)
        self.assertFalse(any((self.root / ".cache/solar").glob(".rebuilt-*.csv")))

    def test_bundled_csv_pin_accepts_line_endings_and_rejects_changed_values(self):
        self.output.write_bytes(self.saved.replace(b"\n", b"\r\n"))
        self.verify()
        self.output.write_bytes(self.saved.replace(b"80.000000", b"81.000000"))
        with self.assertRaisesRegex(ValueError, "Bundled solar CSV differs"):
            self.verify(offline=True)


if __name__ == "__main__":
    unittest.main()
