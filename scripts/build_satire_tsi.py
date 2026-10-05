from __future__ import annotations

import argparse
import csv
import gzip
import math
from pathlib import Path


def parse_float_row(line: str) -> list[float]:
    stripped = line.strip()
    if not stripped:
        return []
    values = [float(token) for token in stripped.split()]
    if not all(math.isfinite(value) for value in values):
        raise ValueError("SATIRE arrays must contain only finite values.")
    return values


def iter_tsi_rows(input_path: Path):
    """Integrate one spectral row at a time, including compressed provider files."""
    open_input = gzip.open if input_path.suffix == ".gz" else open
    with open_input(input_path, "rt", encoding="utf-8") as handle:
        first_non_comment = None

        while True:
            line = handle.readline()
            if not line:
                break
            if line.startswith(";") or line.strip() == "":
                continue
            first_non_comment = line
            break

        if first_non_comment is None:
            raise ValueError("No SATIRE data arrays found in input file.")

        wavelengths = parse_float_row(first_non_comment)
        bins = parse_float_row(handle.readline())
        years = parse_float_row(handle.readline())

        if not wavelengths or not bins or not years:
            raise ValueError("Failed to parse SATIRE wavelength/bin/year arrays.")
        if len(wavelengths) != len(bins):
            raise ValueError(
                f"Wavelength and bin length mismatch: {len(wavelengths)} vs {len(bins)}"
            )
        if any(width <= 0 for width in bins):
            raise ValueError("SATIRE wavelength bins must have positive widths.")

        index = 0
        for line in handle:
            if not line.strip():
                continue
            values = parse_float_row(line)
            if len(values) != len(bins):
                raise ValueError(
                    f"SSI row length {len(values)} does not match wavelength bins {len(bins)}"
                )
            if index >= len(years):
                raise ValueError("SSI rows exceed the time axis length")
            tsi = 0.0
            for value, bin_width in zip(values, bins):
                tsi += value * bin_width
            if not math.isfinite(tsi) or tsi <= 0:
                raise ValueError("Integrated SATIRE irradiance must be positive and finite.")
            year_decimal = years[index]
            yield year_decimal - 1950.0, tsi, year_decimal
            index += 1
        if index != len(years):
            raise ValueError(f"Time axis length ({len(years)}) and SSI rows ({index}) do not match")


def build_tsi_csv(input_path: Path, output_path: Path) -> None:
    output_rows = list(iter_tsi_rows(input_path))
    output_rows.sort(key=lambda row: row[0], reverse=True)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["time", "Solar Irradiance", "year_decimal"])

        for time_value, tsi_value, year_decimal in output_rows:
            writer.writerow([f"{time_value:.6f}", f"{tsi_value:.6f}", f"{year_decimal:.6f}"])


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Build compact TSI CSV from PMIP4 SATIRE-M SSI text dataset."
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=Path(".cache/solar/SSI_14C_cycle_yearly_cmip_v20160613_fc.txt.gz"),
        help="Path to SATIRE-M SSI text or gzip file; scripts/verify_solar_source.py downloads the pinned source.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/solar/SATIRE_M_TSI_14C_fc.csv"),
        help="Output CSV path.",
    )

    args = parser.parse_args()
    build_tsi_csv(args.input, args.output)
    print(f"Wrote {args.output}")
