"""Refresh complete provider snapshots of the app's current observations.

Uses only the Python standard library. All downloads are validated before any
files are replaced; use --dry-run to check providers without changing the repo.
Published reconstructions and the app's calibration code are not updated here.
"""

import argparse
import hashlib
from http.client import HTTPException
import json
import math
import os
from pathlib import Path
import re
import sys
import tempfile
import time
from datetime import date, datetime, timedelta, timezone
from urllib.error import URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = "data/update-sources.json"
METADATA = "data/update-metadata.json"
MAX_BYTES = 10 * 1024 * 1024


class UpdateError(ValueError):
    """A download or snapshot cannot safely replace the saved observations."""


def finite_number(token):
    try:
        value = float(token)
    except ValueError as error:
        raise UpdateError(f"Invalid numeric field: {token!r}") from error
    if not math.isfinite(value):
        raise UpdateError(f"Non-finite numeric field: {token!r}")
    return value


def decimal_year_date(value):
    year = math.floor(value)
    start = datetime(year, 1, 1)
    return (start + (datetime(year + 1, 1, 1) - start) * (value - year)).date()


def parse_snapshot(text, source):
    """Validate the provider format and retain every observation's raw fields."""
    if re.search(r"<!doctype|<html|<body", text, re.IGNORECASE):
        raise UpdateError("Provider returned an HTML page instead of data")
    kind = source["format"]
    if kind == "giss":
        if not all(marker in text for marker in (
                "GLOBAL Land-Ocean Temperature Index", "0.01 degrees Celsius", "1951-1980")):
            raise UpdateError("GISS product, units or reference period changed")
        if not re.search(r"Year\s+Jan\s+Feb\s+Mar\s+Apr\s+May\s+Jun\s+Jul\s+Aug\s+Sep\s+Oct\s+Nov\s+Dec", text):
            raise UpdateError("GISS monthly columns changed")
    elif kind == "noaa-co2":
        if "ppm" not in text or "CO2" not in text:
            raise UpdateError("NOAA CO2 unit/header missing")
    elif kind == "colorado":
        if not all(marker in text for marker in (source["release"], "GIA removed", "(mm)")):
            raise UpdateError("Colorado release, correction or units changed")
    elif kind != "tsis":
        raise UpdateError(f"Unsupported format: {kind}")

    records = {}
    observations = {}
    previous = None

    def add(key, sample_date, fields, valid=True):
        nonlocal previous
        if key in records or (previous is not None and key <= previous):
            raise UpdateError("Duplicate or unordered observation dates")
        previous = key
        records[key] = tuple(fields)
        if valid:
            observations[key] = sample_date

    for line_number, line in enumerate(text.splitlines(), 1):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        fields = re.split(r"[\s,]+", line)
        try:
            if kind == "giss":
                if not re.fullmatch(r"\d{4}", fields[0]):
                    continue  # Provider title, column headings and explanatory footer.
                if len(fields) < 13:
                    raise UpdateError("Incomplete GISS year")
                year = int(fields[0])
                for month, token in enumerate(fields[1:13], 1):
                    missing = bool(re.fullmatch(r"\*{3,5}", token))
                    value = None if missing else finite_number(token)
                    if value is not None and (not value.is_integer() or abs(value) > 1000):
                        raise UpdateError("GISS monthly values must be hundredths of a degree")
                    add(f"{year:04d}-{month:02d}", date(year, month, 1), [value], not missing)
            elif kind == "noaa-co2":
                if len(fields) != 5:
                    raise UpdateError("Expected five NOAA daily CO2 columns")
                sample_date = date(*(int(token) for token in fields[:3]))
                decimal_year, ppm = map(finite_number, fields[3:])
                if abs((decimal_year_date(decimal_year) - sample_date).days) > 1:
                    raise UpdateError("NOAA calendar and decimal-year dates disagree")
                if ppm > 0 and not 100 <= ppm <= 2000:
                    raise UpdateError("NOAA value is outside the expected ppm units")
                add(sample_date.isoformat(), sample_date, [decimal_year, ppm], ppm > 0)
            elif kind == "tsis":
                if len(fields) != 14:
                    raise UpdateError("Expected the documented 14 TSIS columns")
                values = list(map(finite_number, fields))
                julian_day, irradiance = values[:2]
                sample_date = (datetime(1970, 1, 1) + timedelta(days=julian_day - 2440587.5)).date()
                if sample_date < date(2017, 1, 1) or values[13] not in (0, 1):
                    raise UpdateError("TSIS time epoch or provisional flag changed")
                if irradiance != 0 and not 1300 <= irradiance <= 1450:
                    raise UpdateError("Expected nominal TSIS irradiance at 1 AU in column 2")
                add(julian_day, sample_date, values, irradiance > 0)
            else:
                if len(fields) != 2:
                    raise UpdateError("Expected two Colorado sea-level columns")
                decimal_year, millimetres = map(finite_number, fields)
                if not 1992 <= decimal_year <= 2200 or abs(millimetres) > 10000:
                    raise UpdateError("Colorado time or millimetre units changed")
                add(decimal_year, decimal_year_date(decimal_year), [millimetres])
        except (ValueError, OverflowError) as error:
            raise UpdateError(f"Line {line_number}: {error}") from error

    if len(observations) < source["minimum_observations"]:
        raise UpdateError(f"Only {len(observations)} observations; snapshot appears incomplete")
    if kind == "giss" and any(
            f"{year}-{month:02d}" not in observations
            for year in range(1961, 1991) for month in range(1, 13)):
        raise UpdateError("GISS 1961-1990 calibration interval is incomplete")
    return {"records": records, "observations": observations,
            "first": min(observations.values()), "last": max(observations.values())}


def validate_replacement(old, new, today):
    if new["first"] > old["first"] or new["last"] < old["last"]:
        raise UpdateError("Downloaded observation coverage regressed")
    if len(new["observations"]) < len(old["observations"]) * 0.99:
        raise UpdateError("Download lost more than 1% of saved observations")
    if new["last"] > today + timedelta(days=7):
        raise UpdateError("Observation dates extend into the future")


def fetch_text(url):
    if not url.startswith("https://"):
        raise UpdateError("Provider URL must use HTTPS")
    request = Request(url, headers={"User-Agent": "Perspective-observation-updater/1.0",
                                   "Accept": "text/plain", "Accept-Encoding": "identity"})
    for attempt in range(3):
        try:
            with urlopen(request, timeout=40) as response:
                if response.status != 200 or not response.geturl().startswith("https://"):
                    raise UpdateError("Expected a successful HTTPS response")
                payload = response.read(MAX_BYTES + 1)
                if len(payload) > MAX_BYTES:
                    raise UpdateError("Download exceeds the 10 MiB size limit")
                expected = response.headers.get("Content-Length")
                if expected and len(payload) != int(expected):
                    raise UpdateError("Download ended before its advertised length")
                return payload.decode("utf-8-sig")
        except (URLError, OSError, HTTPException) as error:
            if attempt == 2:
                raise UpdateError(f"Download failed after three attempts: {error}") from error
            time.sleep(2 ** (attempt + 1))


def atomic_write(path, payload):
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as temporary:
        temporary.write(payload)
        temporary_path = Path(temporary.name)
    try:
        os.replace(temporary_path, path)
    finally:
        temporary_path.unlink(missing_ok=True)


def latest_colorado_release(text):
    releases = {(int(year), int(revision)) for year, revision in re.findall(r"\b(20\d{2})_rel(\d+)\b", text)}
    if not releases:
        raise UpdateError("No release labels found on the Colorado release page")
    year, revision = max(releases)
    return f"{year}_rel{revision}"


def check_colorado_release(source, fetcher):
    try:
        latest = latest_colorado_release(fetcher(source["release_page"]))
        latest_version = tuple(map(int, latest.split("_rel")))
        selected_version = tuple(map(int, source["release"].split("_rel")))
        if latest_version > selected_version:
            message = (f"New Colorado release {latest} is available; selected release is {source['release']}. "
                       "Review the seasons-retained product and update the manifest and browser source together.")
            print("::warning::" + message)
            return message
    except (UpdateError, OSError, UnicodeError, ValueError) as error:
        message = f"Colorado release check unavailable: {error}. The selected observation file was still validated."
        print("::warning::" + message)
        return message
    return None


def update_data(root=ROOT, dry_run=False, fetcher=fetch_text, today=None):
    root = Path(root).resolve()
    today = today or datetime.now(timezone.utc).date()
    manifest = json.loads((root / MANIFEST).read_text(encoding="utf-8"))
    if manifest.get("schema_version") != 1:
        raise UpdateError("Unsupported source manifest version")
    metadata_path = root / METADATA
    metadata = json.loads(metadata_path.read_text(encoding="utf-8")) if metadata_path.exists() else {
        "schema_version": 1, "datasets": {}}
    prepared, report, failures = [], [], []
    for source in manifest["sources"]:
        print(f"Checking {source['label']}...", flush=True)
        try:
            path = (root / source["path"]).resolve()
            if not path.is_relative_to(root / "data"):
                raise UpdateError("Dataset path must stay within the data directory")
            old_bytes = path.read_bytes()
            old = parse_snapshot(old_bytes.decode("utf-8-sig"), source)
            text = fetcher(source["url"]).replace("\r\n", "\n").replace("\r", "\n")
            new = parse_snapshot(text, source)
            validate_replacement(old, new, today)
            if source.get("release_page"):
                notice = check_colorado_release(source, fetcher)
                if notice:
                    report.append(notice)
            payload = (text.rstrip("\n") + "\n").encode("utf-8")
            changed = old["records"] != new["records"]
            # Ignore regenerated file-creation comments and line-ending changes.
            # Auxiliary TSIS columns, including provisional flags, are compared too.
            saved_bytes = payload if changed else old_bytes
            checksum = hashlib.sha256(saved_bytes).hexdigest()
            old_entry = metadata["datasets"].get(source["id"], {})
            if changed or old_entry.get("sha256") != checksum or old_entry.get("url") != source["url"]:
                metadata["datasets"][source["id"]] = {
                    "url": source["url"], "path": source["path"], "units": source["units"],
                    "retrieved_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                    "first_observation": new["first"].isoformat(),
                    "latest_observation": new["last"].isoformat(),
                    "observation_count": len(new["observations"]), "sha256": checksum}
            previous = old["records"]
            revised = sum(key in previous and previous[key] != values for key, values in new["records"].items())
            added = len(new["records"].keys() - previous.keys())
            removed = len(previous.keys() - new["records"].keys())
            report.append(f"{source['label']}: {'updated' if changed else 'unchanged'}; "
                          f"latest {new['last']}; {added} added, {revised} revised, {removed} removed rows")
            if changed:
                prepared.append((path, payload))
        except (UpdateError, OSError, UnicodeError, ValueError) as error:
            failures.append(f"{source['label']}: {error}")
    for message in report:
        print(message)
    if failures:
        raise UpdateError("No files saved.\n" + "\n".join(failures))
    if not dry_run:
        for path, payload in prepared:
            atomic_write(path, payload)
        metadata_bytes = (json.dumps(metadata, indent=2, ensure_ascii=False) + "\n").encode("utf-8")
        if not metadata_path.exists() or metadata_path.read_bytes() != metadata_bytes:
            atomic_write(metadata_path, metadata_bytes)
    else:
        print("Dry run: no files saved.")
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Download and validate without saving")
    args = parser.parse_args()
    try:
        update_data(dry_run=args.dry_run)
    except (UpdateError, OSError, ValueError) as error:
        print(error, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
