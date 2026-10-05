"""Download the pinned PMIP4 source and verify every bundled solar CSV row.

Uses the standard library and an ignored local cache. It never changes the
bundled observations or reconstructions. The gzip input is about 604 MiB.
"""

import argparse
import csv
import hashlib
from http.client import HTTPException
import json
import os
from pathlib import Path
import sys
from urllib.error import URLError
from urllib.request import Request, urlopen
import uuid

if __package__:
    from .build_satire_tsi import build_tsi_csv
else:
    from build_satire_tsi import build_tsi_csv

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = "data/solar/build-source.json"
CHUNK_BYTES = 1024 * 1024


def file_sha256(path):
    checksum = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(CHUNK_BYTES), b""):
            checksum.update(chunk)
    return checksum.hexdigest()


def csv_sha256_lf(path):
    return hashlib.sha256(path.read_bytes().replace(b"\r\n", b"\n")).hexdigest()


def checked_source(manifest, cache_dir, offline=False, opener=urlopen):
    filename = manifest["cache_filename"]
    if Path(filename).name != filename or not filename.endswith(".txt.gz"):
        raise ValueError("Expected a plain gzip filename for the solar cache")
    source = cache_dir / filename
    expected_bytes = manifest["input_bytes"]
    expected_sha = manifest["input_sha256"]
    if source.exists() and source.stat().st_size == expected_bytes and file_sha256(source) == expected_sha:
        return source
    if offline:
        raise ValueError("Reviewed solar source is missing or its checksum differs; run without --offline to download it")
    url = manifest["input_url"]
    if not url.startswith("https://"):
        raise ValueError("Solar source URL must use HTTPS")
    cache_dir.mkdir(parents=True, exist_ok=True)
    temporary = cache_dir / ("." + filename + "." + uuid.uuid4().hex + ".part")
    request = Request(url, headers={"User-Agent": "Perspective-solar-verifier/1.0", "Accept-Encoding": "identity"})
    print(f"Downloading reviewed solar source ({expected_bytes / 1024**2:.1f} MiB)...", flush=True)
    try:
        checksum = hashlib.sha256()
        total = 0
        with opener(request, timeout=120) as response, temporary.open("xb") as output:
            if response.status != 200 or not response.geturl().startswith("https://"):
                raise ValueError("Expected a successful HTTPS solar-source response")
            content_length = response.headers.get("Content-Length")
            if content_length and int(content_length) != expected_bytes:
                raise ValueError("Provider source size differs from the reviewed snapshot")
            while chunk := response.read(CHUNK_BYTES):
                total += len(chunk)
                if total > expected_bytes:
                    raise ValueError("Solar download exceeds the reviewed source size")
                checksum.update(chunk)
                output.write(chunk)
                if total % (50 * CHUNK_BYTES) == 0:
                    print(f"Downloaded {total / CHUNK_BYTES:.0f} MiB", flush=True)
        if total != expected_bytes or checksum.hexdigest() != expected_sha:
            raise ValueError("Solar source size or SHA-256 differs from the reviewed snapshot")
        os.replace(temporary, source)
    finally:
        temporary.unlink(missing_ok=True)
    return source


def verify_solar_source(root=ROOT, cache_dir=None, offline=False, opener=urlopen):
    root = Path(root).resolve()
    cache_dir = Path(cache_dir) if cache_dir is not None else root / ".cache/solar"
    manifest = json.loads((root / MANIFEST).read_text(encoding="utf-8"))
    if manifest.get("schema_version") != 1:
        raise ValueError("Unsupported solar build manifest version")
    bundled = (root / manifest["output_path"]).resolve()
    if not bundled.is_relative_to(root / "data"):
        raise ValueError("Solar output must stay within the data directory")
    expected_output = manifest["output_sha256_lf"]
    if csv_sha256_lf(bundled) != expected_output:
        raise ValueError("Bundled solar CSV differs from the reviewed build manifest")
    source = checked_source(manifest, cache_dir, offline, opener)
    rebuilt = cache_dir / (".rebuilt-" + uuid.uuid4().hex + ".csv")
    try:
        print("Integrating the original spectral rows...", flush=True)
        build_tsi_csv(source, rebuilt)
        if csv_sha256_lf(rebuilt) != expected_output:
            raise ValueError("Original spectral integration does not reproduce the bundled solar CSV")
        with rebuilt.open(newline="", encoding="utf-8") as handle:
            row_count = sum(1 for row in csv.reader(handle)) - 1
        if row_count != manifest["output_rows"]:
            raise ValueError("Rebuilt solar row count differs from the reviewed manifest")
        print(f"Verified all {row_count:,} solar rows against the original spectral input.", flush=True)
        return {"rows": row_count, "input_sha256": manifest["input_sha256"],
                "output_sha256_lf": expected_output}
    finally:
        rebuilt.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--offline", action="store_true", help="Use only an already verified local source cache")
    parser.add_argument("--cache-dir", type=Path, help="Directory for the downloaded gzip input")
    args = parser.parse_args()
    try:
        verify_solar_source(cache_dir=args.cache_dir, offline=args.offline)
    except (ValueError, OSError, HTTPException, URLError) as error:
        print(error, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
