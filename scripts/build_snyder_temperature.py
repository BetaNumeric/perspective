"""Extract Snyder (2016) GAST median and 95% bounds from the original workbook.

Uses only the standard library. Values retain their published precision and
0–5 ka reference; the browser applies the documented constant reference shift.
"""

import csv
import hashlib
import math
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/temperature/snyder2016-supplement.xlsx"
OUTPUT = ROOT / "data/temperature/snyder2016-gast.csv"
SOURCE_SHA256 = "8ef09c959caf0fdaa27153bdcdcb5c8c51fcf7d3e88f893f5c7152ba9f4334ae"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
CSV_HEADER = ["age_ka_bp", "gast_median_c", "gast_p2_5_c", "gast_p97_5_c"]


def validate_rows(rows):
    if len(rows) != 2000 or any(len(row) != 4 for row in rows):
        raise ValueError("Expected all 2000 Snyder ages, medians and 95% bounds")
    values = [list(map(float, row)) for row in rows]
    if not all(math.isfinite(value) for row in values for value in row):
        raise ValueError("Snyder values must be finite")
    if any(row[0] != index for index, row in enumerate(values, start=1)):
        raise ValueError("Expected the published 1–2000 ka evaluation grid")
    if any(not row[2] <= row[1] <= row[3] for row in values):
        raise ValueError("Published bounds must enclose the GAST median")


def parse_gast_sheet(sheet_xml, strings):
    cells = {}
    for cell in ET.fromstring(sheet_xml).findall("m:sheetData/m:row/m:c", NS):
        value = cell.find("m:v", NS)
        if value is None:
            continue
        cells[cell.attrib["r"]] = strings[int(value.text)] if cell.get("t") == "s" else value.text
    if cells.get("A1") != "GAST empirical quantiles from Monte Carlo-style simulations of uncertainty (see Methods)":
        raise ValueError("Expected the published GAST reconstruction sheet")
    if cells.get("B3") != "Change in Global Average Surface Temperature (GAST) from present (0-5ka average)":
        raise ValueError("Expected the published 0–5 ka GAST reference")
    if cells.get("A4") != "Time (kyr BP)":
        raise ValueError("Expected ages in kyr BP")
    quantiles = [float(cells.get(column + "4", "nan")) for column in "BCDEFGH"]
    if quantiles != [0.025, 0.05, 0.25, 0.5, 0.75, 0.95, 0.975]:
        raise ValueError("Expected the published quantiles, including the median and 95% interval")
    row_numbers = sorted({int(address[1:]) for address in cells if address.startswith("A") and int(address[1:]) >= 5})
    try:
        rows = [[cells[column + str(index)] for column in "AEBH"] for index in row_numbers]
    except KeyError as error:
        raise ValueError("Missing Snyder age, median or uncertainty bound") from error
    validate_rows(rows)
    return rows


def read_verified_rows(source_path=SOURCE):
    if hashlib.sha256(source_path.read_bytes()).hexdigest() != SOURCE_SHA256:
        raise ValueError("Snyder workbook checksum mismatch")
    with ZipFile(source_path) as workbook:
        sheets = ET.fromstring(workbook.read("xl/workbook.xml")).find("m:sheets", NS)
        if sheets[0].get("name") != "GAST reconstruction":
            raise ValueError("Expected GAST in the original workbook's first sheet")
        strings = ["".join(item.itertext()) for item in ET.fromstring(workbook.read("xl/sharedStrings.xml"))]
        return parse_gast_sheet(workbook.read("xl/worksheets/sheet1.xml"), strings)


def write_gast_csv(rows, output_path):
    validate_rows(rows)
    with output_path.open("w", newline="", encoding="utf-8") as output:
        writer = csv.writer(output, lineterminator="\n")
        writer.writerow(CSV_HEADER)
        writer.writerows(rows)


def main():
    rows = read_verified_rows()
    write_gast_csv(rows, OUTPUT)
    print(f"Wrote {len(rows)} unchanged GAST estimates to {OUTPUT.name}")


if __name__ == "__main__":
    main()
