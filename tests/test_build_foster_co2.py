"""Verify historical CO2 extraction against the pinned author's workbook."""

import csv
from pathlib import Path
import sys
import unittest
import uuid
from xml.etree import ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.build_foster_co2 import (
    CSV_HEADER, NS, OUTPUT, SOURCE, parse_loess_sheet, read_verified_rows, write_co2_csv,
)


class FosterBuildTests(unittest.TestCase):
    def temporary_output(self, suffix):
        output = ROOT / (".test-foster-" + uuid.uuid4().hex + suffix)
        self.addCleanup(output.unlink, missing_ok=True)
        return output

    def test_every_csv_cell_matches_original_mode_and_confidence_limits(self):
        rows = read_verified_rows()
        with OUTPUT.open(newline="", encoding="utf-8") as source:
            reader = csv.reader(source)
            self.assertEqual(next(reader), CSV_HEADER)
            self.assertEqual(list(reader), rows)
        self.assertEqual(len(rows), 840)
        self.assertEqual(float(rows[132][0]), 66.0039)
        self.assertEqual(float(rows[132][1]), 228.842556951331)
        self.assertEqual(sum(float(row[2]) < 0 for row in rows), 124)
        self.assertTrue(all(float(row[3]) > 0 for row in rows))
        output = self.temporary_output(".csv")
        write_co2_csv(rows, output)
        self.assertEqual(output.read_bytes(), OUTPUT.read_bytes().replace(b"\r\n", b"\n"))

    def test_modified_workbooks_are_rejected(self):
        source = self.temporary_output(".xlsx")
        source.write_bytes(SOURCE.read_bytes() + b"modified")
        with self.assertRaisesRegex(ValueError, "checksum mismatch"):
            read_verified_rows(source)

    def test_wrong_quantiles_units_and_missing_cells_are_rejected(self):
        with ZipFile(SOURCE) as workbook:
            sheet_xml = workbook.read("xl/worksheets/sheet1.xml")
            strings = ["".join(item.itertext()) for item in ET.fromstring(workbook.read("xl/sharedStrings.xml"))]
        for address, replacement in [("A2", "Age (ka)"), ("B2", "median"), ("D2", "lw95%"), ("E135", None)]:
            with self.subTest(address=address):
                sheet = ET.fromstring(sheet_xml)
                row = next(row for row in sheet.findall("m:sheetData/m:row", NS)
                           if any(cell.get("r") == address for cell in row))
                cell = next(cell for cell in row if cell.get("r") == address)
                if replacement is None:
                    row.remove(cell)
                else:
                    cell.attrib.pop("t", None)
                    cell.find("m:v", NS).text = replacement
                with self.assertRaises(ValueError):
                    parse_loess_sheet(ET.tostring(sheet), strings)

    def test_damaged_grid_and_intervals_leave_output_unchanged(self):
        rows = read_verified_rows()
        output = self.temporary_output(".csv")
        for broken in [rows[:-1], [rows[0]] + rows,
                       [["0", *rows[0][1:]]] + rows[1:],
                       [[rows[0][0], "nan", *rows[0][2:]]] + rows[1:],
                       [[rows[0][0], "100", "0", "200", "300", "400"]] + rows[1:]]:
            with self.subTest(rows=len(broken)):
                output.write_text("reviewed output", encoding="utf-8")
                with self.assertRaises(ValueError):
                    write_co2_csv(broken, output)
                self.assertEqual(output.read_text(encoding="utf-8"), "reviewed output")


if __name__ == "__main__":
    unittest.main()
