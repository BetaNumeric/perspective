"""Extract Kopp et al. (2016)'s global posterior, without fitting or resampling.

The bundled, checksum-pinned MATLAB v5 file contains `sl`: year CE, mean mm,
and standard deviation mm. This small reader handles that archive's real,
little-endian double matrices only; no MATLAB or Python packages are needed.
"""

import csv
import hashlib
import math
from pathlib import Path
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/sealevel/kopp2016-global-posterior.mat"
OUTPUT = ROOT / "data/sealevel/kopp2016-global-posterior.csv"
SOURCE_SHA256 = "dcbc6219ab2c310029cff314f3c9805ac24f76d58987d125c741fab7693050e5"


def elements(data):
    position = 0
    while position < len(data):
        if position + 8 > len(data):
            raise ValueError("Truncated MATLAB element header")
        tag, size = struct.unpack_from("<II", data, position)
        small_size = tag >> 16
        if small_size:
            if small_size > 4:
                raise ValueError("Invalid MATLAB small element")
            yield tag & 0xffff, data[position + 4:position + 4 + small_size]
            position += 8
        else:
            end = position + 8 + size
            if end > len(data):
                raise ValueError("Truncated MATLAB element")
            yield tag, data[position + 8:end]
            # miCOMPRESSED elements in this archive have no alignment padding.
            position = end + (0 if tag == 15 else (-size) % 8)


def extract_posterior(source_bytes):
    if hashlib.sha256(source_bytes).hexdigest() != SOURCE_SHA256:
        raise ValueError("Kopp source checksum mismatch")
    if source_bytes[126:128] != b"IM":
        raise ValueError("Expected the little-endian MATLAB v5 archive")
    matrices = {}
    for kind, payload in elements(source_bytes[128:]):
        if kind != 15:
            raise ValueError("Expected compressed MATLAB matrices")
        for matrix_kind, matrix in elements(zlib.decompress(payload)):
            if matrix_kind != 14:
                raise ValueError("Expected a MATLAB matrix")
            parts = list(elements(matrix))
            if len(parts) != 4 or [part[0] for part in parts] != [6, 5, 1, 9]:
                raise ValueError("Expected a real double matrix")
            dimensions = struct.unpack("<ii", parts[1][1])
            name = parts[2][1].decode("ascii")
            values = struct.unpack("<" + "d" * (len(parts[3][1]) // 8), parts[3][1])
            if len(values) != math.prod(dimensions):
                raise ValueError("MATLAB matrix dimensions do not match its values")
            matrices[name] = (dimensions, values)
    if matrices.get("sl", (None,))[0] != (162, 3) or matrices.get("C", (None,))[0] != (162, 162):
        raise ValueError("Expected the published 162-point posterior and covariance")
    values = matrices["sl"][1]
    rows = list(zip(values[:162], values[162:324], values[324:]))
    covariance = matrices["C"][1]
    for index, (_, _, deviation) in enumerate(rows):
        variance = covariance[index * 163]
        if variance < 0 or abs(math.sqrt(variance) - deviation) > 0.0051:
            raise ValueError("Posterior deviations disagree with the covariance diagonal")
    return rows


def write_posterior_csv(rows, output_path):
    if len(rows) != 162 or any(len(row) != 3 for row in rows):
        raise ValueError("Expected 162 year, sea-level and standard-deviation rows")
    if not all(math.isfinite(value) for row in rows for value in row):
        raise ValueError("Posterior values must be finite")
    if any(row[2] < 0 for row in rows):
        raise ValueError("Posterior standard deviations must be non-negative")
    if any(newer[0] <= older[0] for older, newer in zip(rows, rows[1:])):
        raise ValueError("Posterior years must be unique and increasing")
    if rows[0][0] != -1000 or rows[-1][0] != 2010 or not any(row[0] == 1950 for row in rows):
        raise ValueError("Expected the published coverage and 1950 reference point")
    with output_path.open("w", newline="", encoding="utf-8") as output:
        writer = csv.writer(output)
        writer.writerow(["year_ce", "sealevel_mm", "sealevel_sd_mm"])
        writer.writerows([[format(value, ".12g") for value in row] for row in rows])


def main():
    rows = extract_posterior(SOURCE.read_bytes())
    write_posterior_csv(rows, OUTPUT)
    print(f"Wrote {len(rows)} unchanged posterior rows to {OUTPUT.name}")


if __name__ == "__main__":
    main()
