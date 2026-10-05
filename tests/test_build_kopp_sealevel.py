"""Check the published global posterior against its offline MATLAB source."""

import csv
from pathlib import Path
import sys
import unittest
import uuid

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.build_kopp_sealevel import SOURCE, OUTPUT, extract_posterior, write_posterior_csv


class KoppBuildTests(unittest.TestCase):
    def test_bundled_csv_matches_every_original_date_mean_and_deviation(self):
        original = extract_posterior(SOURCE.read_bytes())
        with OUTPUT.open(newline="", encoding="utf-8") as source:
            rows = [[float(row[key]) for key in ("year_ce", "sealevel_mm", "sealevel_sd_mm")]
                    for row in csv.DictReader(source)]
        self.assertEqual(rows, [list(row) for row in original])
        self.assertEqual(rows[0], [-1000, -145.79, 54.44])
        self.assertEqual(next(row for row in rows if row[0] == 1950), [1950, -65.9, 4.67])
        self.assertEqual(rows[-1], [2010, 21.87, 3.85])

    def test_altered_or_truncated_source_is_rejected(self):
        source = SOURCE.read_bytes()
        for broken in (source[:-1], source[:128], source[:-1] + bytes([source[-1] ^ 1])):
            with self.subTest(size=len(broken)):
                with self.assertRaisesRegex(ValueError, "checksum"):
                    extract_posterior(broken)

    def test_invalid_arrays_leave_existing_output_unchanged(self):
        rows = extract_posterior(SOURCE.read_bytes())
        output = ROOT / (".test-kopp-" + uuid.uuid4().hex + ".csv")
        self.addCleanup(output.unlink, missing_ok=True)
        for broken in (
                rows[:-1],
                [(rows[0][0], float("nan"), rows[0][2])] + rows[1:],
                [(rows[0][0], rows[0][1], -1)] + rows[1:],
                [rows[1], rows[0]] + rows[2:],
                [rows[0]] + rows,
                [row for row in rows if row[0] != 1950] + [(2011, 0, 1)]):
            with self.subTest(first=broken[:1]):
                output.write_text("reviewed output", encoding="utf-8")
                with self.assertRaises(ValueError):
                    write_posterior_csv(broken, output)
                self.assertEqual(output.read_text(encoding="utf-8"), "reviewed output")


if __name__ == "__main__":
    unittest.main()
