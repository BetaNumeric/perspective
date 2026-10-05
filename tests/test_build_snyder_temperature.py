"""Verify the temperature bridge against the pinned publisher workbook."""

import csv
from pathlib import Path
import sys
import unittest
import uuid
from xml.etree import ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.build_snyder_temperature import (
    CSV_HEADER, NS, OUTPUT, SOURCE, parse_gast_sheet, read_verified_rows, write_gast_csv,
)


class SnyderBuildTests(unittest.TestCase):
    def temporary_output(self, suffix):
        output = ROOT / (".test-snyder-" + uuid.uuid4().hex + suffix)
        self.addCleanup(output.unlink, missing_ok=True)
        return output

    def test_every_csv_cell_matches_the_original_gast_sheet(self):
        original = read_verified_rows()
        with OUTPUT.open(newline="", encoding="utf-8") as source:
            reader = csv.reader(source)
            self.assertEqual(next(reader), CSV_HEADER)
            self.assertEqual(list(reader), original)
        self.assertEqual(len(original), 2000)
        self.assertEqual(float(original[20][1]), -6.2575806621948002)
        self.assertEqual(float(original[20][2]), -8.5730254097818097)
        self.assertEqual(float(original[20][3]), -4.3952795987882904)
        self.assertEqual(float(original[-1][0]), 2000)
        output = self.temporary_output(".csv")
        write_gast_csv(original, output)
        self.assertEqual(output.read_bytes().replace(b"\r\n", b"\n"),
                         OUTPUT.read_bytes().replace(b"\r\n", b"\n"))

    def test_modified_workbooks_are_rejected(self):
        source = self.temporary_output(".xlsx")
        source.write_bytes(SOURCE.read_bytes() + b"modified")
        with self.assertRaisesRegex(ValueError, "checksum mismatch"):
            read_verified_rows(source)

    def test_sheet_parser_rejects_changed_units_quantiles_and_missing_cells(self):
        with ZipFile(SOURCE) as workbook:
            sheet_xml = workbook.read("xl/worksheets/sheet1.xml")
            strings = ["".join(item.itertext()) for item in ET.fromstring(workbook.read("xl/sharedStrings.xml"))]
        for address, value in [("A4", "years BP"), ("B3", "0-10ka reference"), ("E4", "0.25"), ("H4", "0.95"), ("B25", None)]:
            with self.subTest(address=address, value=value):
                sheet = ET.fromstring(sheet_xml)
                row = next(row for row in sheet.findall("m:sheetData/m:row", NS)
                           if any(cell.get("r") == address for cell in row))
                cell = next(cell for cell in row if cell.get("r") == address)
                if value is None:
                    row.remove(cell)
                else:
                    cell.attrib.pop("t", None)
                    cell.find("m:v", NS).text = value
                with self.assertRaises(ValueError):
                    parse_gast_sheet(ET.tostring(sheet), strings)

    def test_invalid_values_leave_the_reviewed_csv_unchanged(self):
        rows = read_verified_rows()
        output = self.temporary_output(".csv")
        for broken in (rows[:-1], [rows[0]] + rows, [rows[0]] + [["2", "nan", "-1", "1"]] + rows[2:],
                       [rows[0]] + [["2", "0", "1", "2"]] + rows[2:]):
            with self.subTest(rows=len(broken)):
                output.write_text("reviewed output", encoding="utf-8")
                with self.assertRaises(ValueError):
                    write_gast_csv(broken, output)
                self.assertEqual(output.read_text(encoding="utf-8"), "reviewed output")


if __name__ == "__main__":
    unittest.main()
