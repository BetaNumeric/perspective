"""Extract the unchanged Foster et al. (2017) LOESS fit and confidence limits.

The workbook's 95% lower limits can be negative. Preserve them in the CSV;
the browser displays the published, positive 68% interval instead.
"""

import csv
import hashlib
import math
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/co2/foster2017-supplement-data2.xlsx"
OUTPUT = ROOT / "data/co2/foster2017-loess.csv"
SOURCE_SHA256 = "4663a546566858dbef345c638aef6888d34d64d20eb6b432c2748954e10ac17f"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
CSV_HEADER = ["age_ma_bp", "co2_mode_ppm", "co2_lower95_ppm", "co2_lower68_ppm",
              "co2_upper68_ppm", "co2_upper95_ppm"]


def validate_rows(rows):
    if len(rows) != 840 or any(len(row) != 6 for row in rows):
        raise ValueError("Expected all 840 Foster ages, modes and confidence limits")
    values = [list(map(float, row)) for row in rows]
    if not all(math.isfinite(value) for row in values for value in row):
        raise ValueError("Foster values must be finite")
    if any(abs(row[0] - (0.0039 + index * 0.5)) > 1e-10 for index, row in enumerate(values)):
        raise ValueError("Expected the published 0.0039–419.5039 Ma evaluation grid")
    if any(not row[2] <= row[3] <= row[1] <= row[4] <= row[5] or row[3] <= 0 for row in values):
        raise ValueError("Expected ordered confidence limits and positive 68% bounds")


def parse_loess_sheet(sheet_xml, strings):
    cells = {}
    for cell in ET.fromstring(sheet_xml).findall("m:sheetData/m:row/m:c", NS):
        value = cell.find("m:v", NS)
        if value is not None:
            cells[cell.attrib["r"]] = strings[int(value.text)] if cell.get("t") == "s" else value.text
    if cells.get("A1", "").strip() != "Supplementary Data 2. LOESS fit to the CO2 data set in Sup. Data 1.":
        raise ValueError("Expected Supplementary Data 2, the published LOESS fit")
    if [cells.get(column + "2") for column in "ABCDEF"] != [
            "Age (Ma)", "pCO2 probability maximum", "lw95%", "lw68%", "up68%", "up95%"]:
        raise ValueError("Expected published ages, probability maximum and 68%/95% limits")
    row_numbers = sorted({int(address[1:]) for address in cells
                          if address.startswith("A") and int(address[1:]) >= 3})
    try:
        rows = [[cells[column + str(index)] for column in "ABCDEF"] for index in row_numbers]
    except KeyError as error:
        raise ValueError("Missing Foster age, mode or confidence limit") from error
    validate_rows(rows)
    return rows


def read_verified_rows(source_path=SOURCE):
    if hashlib.sha256(source_path.read_bytes()).hexdigest() != SOURCE_SHA256:
        raise ValueError("Foster workbook checksum mismatch")
    with ZipFile(source_path) as workbook:
        sheets = ET.fromstring(workbook.read("xl/workbook.xml")).find("m:sheets", NS)
        if len(sheets) != 1 or sheets[0].get("name") != "LOESS Fit":
            raise ValueError("Expected the original LOESS Fit worksheet")
        strings = ["".join(item.itertext()) for item in ET.fromstring(workbook.read("xl/sharedStrings.xml"))]
        return parse_loess_sheet(workbook.read("xl/worksheets/sheet1.xml"), strings)


def write_co2_csv(rows, output_path):
    validate_rows(rows)
    with output_path.open("w", newline="", encoding="utf-8") as output:
        writer = csv.writer(output, lineterminator="\n")
        writer.writerow(CSV_HEADER)
        writer.writerows(rows)


if __name__ == "__main__":
    rows = read_verified_rows()
    write_co2_csv(rows, OUTPUT)
    print(f"Wrote {len(rows)} unchanged CO2 estimates to {OUTPUT.name}")
