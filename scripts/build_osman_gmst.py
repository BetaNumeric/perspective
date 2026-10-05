"""Extract the NOAA Osman et al. (2021) global mean series for the browser.

Requires h5py (build time only). No calibration, interpolation or smoothing is
performed here. Ages are the original 200-year bin midpoints, relative to 1950.
"""

import csv
import hashlib
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/temperature/LGMR_GMST_climo.nc"
OUTPUT = ROOT / "data/temperature/osman2021-gmst.csv"


def write_gmst_csv(ages, means, deviations, output_path):
    if not len(ages) == len(means) == len(deviations) == 120:
        raise ValueError("Expected 120 matching Osman age, temperature and uncertainty values")
    if not all(math.isfinite(float(value)) for values in (ages, means, deviations) for value in values):
        raise ValueError("Osman arrays must contain only finite values")
    if any(deviation < 0 for deviation in deviations):
        raise ValueError("Osman standard deviations must be non-negative")
    with output_path.open("w", newline="", encoding="utf-8") as output:
        writer = csv.writer(output)
        writer.writerow(["age_bp", "gmst", "gmst_std"])
        for age, mean, deviation in zip(ages, means, deviations):
            writer.writerow([format(float(age), ".0f"),
                             format(float(mean), ".9g"),
                             format(float(deviation), ".9g")])


def main():
    import h5py

    with h5py.File(SOURCE, "r") as dataset:
        ages = dataset["age"][:]
        means = dataset["gmst"][:]
        deviations = dataset["gmst_std"][:]
    write_gmst_csv(ages, means, deviations, OUTPUT)
    print(f"Wrote {len(ages)} rows to {OUTPUT.name}")
    print(f"Source SHA-256: {hashlib.sha256(SOURCE.read_bytes()).hexdigest()}")


if __name__ == "__main__":
    main()
