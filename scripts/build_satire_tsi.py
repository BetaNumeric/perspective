from __future__ import annotations

import argparse
import csv
from pathlib import Path


def parse_float_row(line: str) -> list[float]:
    stripped = line.strip()
    if not stripped:
        return []
    return [float(token) for token in stripped.split()]


def read_satire_arrays(input_path: Path) -> tuple[list[float], list[float], list[float], list[list[float]]]:
    with input_path.open("r", encoding="utf-8", errors="replace") as handle:
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

        ssi_rows: list[list[float]] = []
        for line in handle:
            if not line.strip():
                continue
            values = parse_float_row(line)
            if len(values) != len(bins):
                raise ValueError(
                    f"SSI row length {len(values)} does not match wavelength bins {len(bins)}"
                )
            ssi_rows.append(values)

    if len(ssi_rows) != len(years):
        raise ValueError(
            f"Time axis length ({len(years)}) and SSI rows ({len(ssi_rows)}) do not match"
        )

    return wavelengths, bins, years, ssi_rows


def build_tsi_csv(input_path: Path, output_path: Path) -> None:
    _, bins, years, ssi_rows = read_satire_arrays(input_path)

    output_rows = []
    for index, ssi in enumerate(ssi_rows):
      tsi = 0.0
      for value, bin_width in zip(ssi, bins):
          tsi += value * bin_width

      year_decimal = years[index]
      output_rows.append((year_decimal - 1950.0, tsi, year_decimal))

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
        default=Path("data/solar/SATIRE-M/SSI_14C_cycle_yearly_cmip_v20160613_fc.txt"),
        help="Path to SATIRE-M SSI text file.",
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
