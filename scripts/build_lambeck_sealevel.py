"""Extract the published Lambeck (2014) Table S3 without fitting or resampling.

Normal rebuilds use the verified text of PDF pages 29–36 and need only the
standard library. `--verify-pdf` re-extracts the attached original with pypdf
(build time only) and compares every table value before writing the CSV.
"""

import argparse
import csv
import hashlib
import logging
import math
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "data/sealevel/lambeck2014-supplement.pdf"
TEXT = ROOT / "data/sealevel/lambeck2014-table-s3.txt"
OUTPUT = ROOT / "data/sealevel/lambeck2014-esl.csv"
PDF_SHA256 = "3ea96cf244e1221ca11c45b3ff450f14fc14b2267f4a8de46baf96e0a013cd27"
TEXT_SHA256 = "f4a2a25e1a03cb55f52b1869f0af2dee5d81d298047d19cb904bd1c6cddffc26"
NUMBER = r"[+-]?\d+(?:\.\d+)?"


def parse_table_text(text):
    if "Table S3." not in text or "(2 sigma)" not in text:
        raise ValueError("Expected Table S3 and its published 2 sigma accuracy definition")
    rows = []
    for line in text[text.index("Table S3."):].splitlines():
        tokens = line.split()
        if len(tokens) == 4 and all(re.fullmatch(NUMBER, token) for token in tokens):
            rows.append(tokens)
        elif re.match(r"\s*[+-]?\d", line) and not (len(tokens) == 1 and tokens[0].isdigit()):
            raise ValueError("Invalid numeric row in Lambeck Table S3")
    validate_rows(rows)
    return rows


def validate_rows(rows):
    if len(rows) != 326 or any(len(row) != 4 for row in rows):
        raise ValueError("Expected all 326 age, nominal ESL, best ESL and 2 sigma values")
    values = [list(map(float, row)) for row in rows]
    if not all(math.isfinite(value) for row in values for value in row):
        raise ValueError("Lambeck values must be finite")
    if any(row[0] < 0 or row[3] < 0 for row in values):
        raise ValueError("Lambeck ages and 2 sigma accuracy values must be non-negative")
    if any(older[0] <= newer[0] for newer, older in zip(values, values[1:])):
        raise ValueError("Lambeck ages must be unique and increasing")
    if values[0] != [0, 0, 0, 0] or values[-1] != [34.783, -73.41, -68.39, 5.55]:
        raise ValueError("Expected the published zero-age reference and oldest estimate")


def write_esl_csv(rows, output_path):
    validate_rows(rows)
    with output_path.open("w", newline="", encoding="utf-8") as output:
        writer = csv.writer(output)
        writer.writerow(["age_ka_bp", "nominal_esl_m", "esl_m", "esl_2sigma_m"])
        writer.writerows(rows)


def read_verified_rows():
    if hashlib.sha256(PDF.read_bytes()).hexdigest() != PDF_SHA256:
        raise ValueError("Lambeck PDF checksum mismatch")
    text_bytes = TEXT.read_bytes().replace(b"\r\n", b"\n")
    if hashlib.sha256(text_bytes).hexdigest() != TEXT_SHA256:
        raise ValueError("Lambeck extracted table checksum mismatch")
    return parse_table_text(text_bytes.decode("utf-8"))


def verify_original_pdf(rows):
    from pypdf import PdfReader

    logging.getLogger("pypdf").setLevel(logging.ERROR)
    reader = PdfReader(PDF)
    if len(reader.pages) != 36:
        raise ValueError("Expected the original 36-page supplement")
    extracted = parse_table_text("\n".join(page.extract_text() for page in reader.pages[28:36]))
    if [list(map(float, row)) for row in extracted] != [list(map(float, row)) for row in rows]:
        raise ValueError("Extracted table differs from the original PDF")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify-pdf", action="store_true", help="Re-extract the original with pypdf")
    args = parser.parse_args()
    rows = read_verified_rows()
    if args.verify_pdf:
        verify_original_pdf(rows)
    write_esl_csv(rows, OUTPUT)
    print(f"Wrote {len(rows)} unchanged Table S3 rows to {OUTPUT.name}")


if __name__ == "__main__":
    main()
