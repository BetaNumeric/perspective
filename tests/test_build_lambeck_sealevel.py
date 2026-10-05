"""Offline checks for the verified original Lambeck Table S3 extraction."""

import csv
from pathlib import Path
import sys
import unittest
import uuid

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.build_lambeck_sealevel import OUTPUT, TEXT, read_verified_rows, parse_table_text, write_esl_csv


class LambeckBuildTests(unittest.TestCase):
    def test_every_csv_cell_matches_the_verified_original_table(self):
        original = read_verified_rows()
        with OUTPUT.open(newline="", encoding="utf-8") as source:
            reader = csv.reader(source)
            self.assertEqual(next(reader), ["age_ka_bp", "nominal_esl_m", "esl_m", "esl_2sigma_m"])
            self.assertEqual(list(reader), original)
        self.assertEqual(len(original), 326)
        self.assertEqual(list(map(float, original[0])), [0, 0, 0, 0])
        self.assertEqual(next(list(map(float, row)) for row in original if row[0] == "6.026"),
                         [6.026, -3.23, -2.96, 0.07])
        self.assertEqual(list(map(float, original[-1])), [34.783, -73.41, -68.39, 5.55])

    def test_rebuild_preserves_published_numeric_precision(self):
        output = ROOT / (".test-lambeck-" + uuid.uuid4().hex + ".csv")
        self.addCleanup(output.unlink, missing_ok=True)
        write_esl_csv(read_verified_rows(), output)
        self.assertEqual(output.read_bytes().replace(b"\r\n", b"\n"),
                         OUTPUT.read_bytes().replace(b"\r\n", b"\n"))

    def test_table_parser_rejects_lost_rows_and_ambiguous_uncertainty(self):
        text = TEXT.read_text(encoding="utf-8")
        for broken in (text.replace("(2 sigma)", "(1 sigma)"),
                       text.replace("6.026 -3.23 -2.96 0.07", ""),
                       text.replace("6.026 -3.23 -2.96 0.07", "6.026 -3.23 -2.96 bad")):
            with self.subTest(snippet=broken[:50]):
                with self.assertRaises(ValueError):
                    parse_table_text(broken)

    def test_invalid_rows_leave_existing_csv_unchanged(self):
        rows = read_verified_rows()
        output = ROOT / (".test-lambeck-" + uuid.uuid4().hex + ".csv")
        self.addCleanup(output.unlink, missing_ok=True)
        for broken in (rows[:-1],
                       [rows[0]] + [["0.122", "-0.21", "nan", "0.07"]] + rows[2:],
                       [rows[0]] + [["0.122", "-0.21", "-0.16", "-0.07"]] + rows[2:],
                       [rows[0]] + [["-0.122", "-0.21", "-0.16", "0.07"]] + rows[2:],
                       [rows[1], rows[0]] + rows[2:]):
            with self.subTest(first=broken[:2]):
                output.write_text("reviewed output", encoding="utf-8")
                with self.assertRaises(ValueError):
                    write_esl_csv(broken, output)
                self.assertEqual(output.read_text(encoding="utf-8"), "reviewed output")


if __name__ == "__main__":
    unittest.main()
