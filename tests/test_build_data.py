"""Offline validation of source extraction without changing bundled datasets."""

import csv
import gzip
import math
from pathlib import Path
import sys
import unittest
import uuid

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.build_osman_gmst import write_gmst_csv
from scripts.build_satire_tsi import build_tsi_csv


class DataBuildTests(unittest.TestCase):
    def setUp(self):
        self.root = ROOT / (".test-data-build-" + uuid.uuid4().hex)
        self.root.mkdir()
        self.addCleanup(self.remove_temporary_root)
        self.input = self.root / "ssi.txt"
        self.output = self.root / "output.csv"

    def remove_temporary_root(self):
        target = self.root.resolve()
        if target.parent != ROOT.resolve() or not target.name.startswith(".test-data-build-"):
            raise RuntimeError("Unexpected test cleanup path")
        for path in target.iterdir():
            path.unlink()
        target.rmdir()

    def test_spectral_integration_uses_bin_widths_and_keeps_original_dates(self):
        self.input.write_text("; fixture\n100 200\n2 3\n1950.5 1951.5\n10 20\n30 40\n")
        build_tsi_csv(self.input, self.output)
        with self.output.open(newline="") as output:
            rows = list(csv.DictReader(output))
        self.assertEqual([(float(row["time"]), float(row["Solar Irradiance"]),
                           float(row["year_decimal"])) for row in rows],
                         [(1.5, 180, 1951.5), (0.5, 80, 1950.5)])

    def test_invalid_spectral_arrays_do_not_replace_an_existing_output(self):
        for arrays in (
                "100 200\n2 3\n1950.5\n10 nan\n",
                "100 200\n2 -3\n1950.5\n10 20\n",
                "100 200\n2 3\n1950.5 1951.5\n10 20\n",
                "100 200\n2 3\n1950.5\n0 0\n",
                "100 200\n2 3\n1950.5\n10\n"):
            with self.subTest(arrays=arrays):
                self.input.write_text(arrays)
                self.output.write_text("reviewed output")
                with self.assertRaises(ValueError):
                    build_tsi_csv(self.input, self.output)
                self.assertEqual(self.output.read_text(), "reviewed output")

    def test_compressed_spectral_input_has_the_same_integration(self):
        compressed = self.root / "ssi.txt.gz"
        compressed.write_bytes(gzip.compress(b"100 200\n2 3\n1950.5\n10 20\n", mtime=0))
        build_tsi_csv(compressed, self.output)
        with self.output.open(newline="") as output:
            row = next(csv.DictReader(output))
        self.assertEqual(float(row["Solar Irradiance"]), 80)

    def test_extra_spectral_rows_fail_before_replacing_output(self):
        self.input.write_text("100 200\n2 3\n1950.5\n10 20\n30 40\n")
        self.output.write_text("reviewed output")
        with self.assertRaisesRegex(ValueError, "exceed"):
            build_tsi_csv(self.input, self.output)
        self.assertEqual(self.output.read_text(), "reviewed output")

    def test_osman_extraction_preserves_values_without_alignment_or_smoothing(self):
        ages = list(range(100, 24000, 200))
        means = [index / 10 for index in range(120)]
        deviations = [index / 100 for index in range(120)]
        write_gmst_csv(ages, means, deviations, self.output)
        with self.output.open(newline="") as output:
            rows = list(csv.DictReader(output))
        self.assertEqual([(float(row["age_bp"]), float(row["gmst"]),
                           float(row["gmst_std"])) for row in rows],
                         list(zip(ages, means, deviations)))

    def test_invalid_osman_arrays_do_not_replace_an_existing_output(self):
        for means, deviations in (
                ([0] * 119, [1] * 120),
                ([math.nan] + [0] * 119, [1] * 120),
                ([0] * 120, [-1] + [1] * 119)):
            with self.subTest(means=means[:1], deviations=deviations[:1]):
                self.output.write_text("reviewed output")
                with self.assertRaises(ValueError):
                    write_gmst_csv(list(range(120)), means, deviations, self.output)
                self.assertEqual(self.output.read_text(), "reviewed output")


if __name__ == "__main__":
    unittest.main()
