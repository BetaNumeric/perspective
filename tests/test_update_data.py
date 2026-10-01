"""Offline checks for validated observation updates and unchanged historical data."""

from contextlib import redirect_stdout
from datetime import date, datetime, timedelta, timezone
import hashlib
import io
import json
from pathlib import Path
import shutil
import sys
import unittest
from urllib.error import URLError
import uuid

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.update_data import (MANIFEST, METADATA, ROOT, UpdateError,
                                 latest_colorado_release, parse_snapshot, update_data)


class ObservationUpdateTests(unittest.TestCase):
    def setUp(self):
        # Normal inherited permissions also work in a restricted Windows shell.
        self.root = ROOT / (".test-observations-" + uuid.uuid4().hex)
        self.root.mkdir()
        self.addCleanup(self.remove_temporary_root)
        self.today = datetime.now(timezone.utc).date()
        self.manifest = json.loads((ROOT / MANIFEST).read_text(encoding="utf-8"))
        self.sources = {source["id"]: source for source in self.manifest["sources"]}
        manifest_path = self.root / MANIFEST
        manifest_path.parent.mkdir(parents=True)
        manifest_path.write_text(json.dumps(self.manifest), encoding="utf-8")
        self.responses = {}
        for source in self.sources.values():
            path = self.root / source["path"]
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes((ROOT / source["path"]).read_bytes())
            self.responses[source["url"]] = path.read_text(encoding="utf-8")
            if source.get("release_page"):
                self.responses[source["release_page"]] = f"<h3>{source['release']}</h3>"
        self.paleo = self.root / "data/temperature/Table.txt"
        self.paleo.write_bytes(b"A pinned published reconstruction.\n")

    def remove_temporary_root(self):
        target = self.root.resolve()
        if target.parent != ROOT.resolve() or not target.name.startswith(".test-observations-"):
            raise RuntimeError("Unexpected test cleanup path")
        shutil.rmtree(target)

    def fetch(self, url):
        response = self.responses[url]
        if isinstance(response, Exception):
            raise response
        return response

    def update(self, dry_run=False):
        with redirect_stdout(io.StringIO()):
            return update_data(self.root, dry_run=dry_run, fetcher=self.fetch,
                               today=self.today)

    def saved(self):
        paths = [source["path"] for source in self.sources.values()] + [METADATA]
        return {path: (self.root / path).read_bytes() if (self.root / path).exists() else None
                for path in paths}

    def revise_co2(self):
        url = self.sources["noaa-co2"]["url"]
        lines = self.responses[url].splitlines()
        index = next(i for i, line in enumerate(lines) if line.strip() and not line.startswith("#"))
        fields = lines[index].split()
        fields[4] = f"{float(fields[4]) + 0.02:.2f}"
        lines[index] = "  ".join(fields)
        self.responses[url] = "\n".join(lines) + "\n"

    def test_manifest_updates_only_current_observations(self):
        self.assertEqual(set(self.sources), {"giss", "noaa-co2", "tsis", "colorado"})
        for source in self.sources.values():
            snapshot = parse_snapshot(self.responses[source["url"]], source)
            self.assertGreaterEqual(len(snapshot["observations"]), source["minimum_observations"])
            self.assertLessEqual(snapshot["first"], snapshot["last"])

    def test_new_readings_and_older_revisions_are_saved_with_provenance(self):
        self.revise_co2()
        source = self.sources["noaa-co2"]
        old = parse_snapshot(self.responses[source["url"]], source)
        next_day = old["last"] + timedelta(days=1)
        year_start = date(next_day.year, 1, 1)
        year_days = (date(next_day.year + 1, 1, 1) - year_start).days
        decimal_year = next_day.year + (next_day - year_start).days / year_days
        self.responses[source["url"]] += (
            f"{next_day.year} {next_day.month} {next_day.day} {decimal_year:.4f} 430.00\n")
        report = self.update()
        saved_text = (self.root / source["path"]).read_text(encoding="utf-8")
        self.assertEqual(saved_text, self.responses[source["url"]])
        self.assertIn("1 added, 1 revised", "\n".join(report))
        metadata = json.loads((self.root / METADATA).read_text(encoding="utf-8"))
        entry = metadata["datasets"]["noaa-co2"]
        self.assertEqual(entry["latest_observation"], next_day.isoformat())
        self.assertEqual(entry["url"], source["url"])
        self.assertEqual(entry["observation_count"], len(old["observations"]) + 1)
        self.assertEqual(entry["sha256"], hashlib.sha256((self.root / source["path"]).read_bytes()).hexdigest())
        self.assertEqual(self.paleo.read_bytes(), b"A pinned published reconstruction.\n")

    def test_identical_downloads_leave_files_and_metadata_unchanged(self):
        self.update()
        before = self.saved()
        self.update()
        self.assertEqual(self.saved(), before)
        metadata = json.loads(before[METADATA])
        for source in self.sources.values():
            self.assertEqual(metadata["datasets"][source["id"]]["sha256"],
                             hashlib.sha256(before[source["path"]]).hexdigest())

    def test_regenerated_comments_and_line_endings_do_not_create_updates(self):
        self.update()
        before = self.saved()
        for url, text in self.responses.items():
            self.responses[url] = ("# New file-creation date\n" + text).replace("\n", "\r\n")
        self.update()
        self.assertEqual(self.saved(), before)

    def test_a_failed_provider_leaves_all_files_and_metadata_unchanged(self):
        self.update()
        before = self.saved()
        self.revise_co2()
        self.responses[self.sources["tsis"]["url"]] = URLError("Provider unavailable")
        with self.assertRaisesRegex(UpdateError, "No files saved"):
            self.update()
        self.assertEqual(self.saved(), before)

    def test_html_response_leaves_all_planned_updates_unsaved(self):
        before = self.saved()
        self.revise_co2()
        self.responses[self.sources["colorado"]["url"]] = "<!doctype html><html>Unavailable</html>"
        with self.assertRaisesRegex(UpdateError, "HTML page"):
            self.update()
        self.assertEqual(self.saved(), before)

    def test_truncated_response_is_rejected_even_with_the_same_latest_date(self):
        source = self.sources["noaa-co2"]
        lines = self.responses[source["url"]].splitlines()
        rows = [line for line in lines if line.strip() and not line.startswith("#")]
        comments = [line for line in lines if line.startswith("#")]
        self.responses[source["url"]] = "\n".join(comments + rows[:1] + rows[500:]) + "\n"
        before = self.saved()
        with self.assertRaisesRegex(UpdateError, "lost more than 1%"):
            self.update()
        self.assertEqual(self.saved(), before)

    def test_stale_latest_observation_is_rejected(self):
        source = self.sources["noaa-co2"]
        self.responses[source["url"]] = self.responses[source["url"]].rstrip().rsplit("\n", 1)[0] + "\n"
        with self.assertRaisesRegex(UpdateError, "coverage regressed"):
            self.update()

    def test_provider_withdrawals_are_reported_and_not_resurrected(self):
        source = self.sources["noaa-co2"]
        lines = self.responses[source["url"]].splitlines()
        indices = [i for i, line in enumerate(lines) if line.strip() and not line.startswith("#")]
        del lines[indices[100]]
        self.responses[source["url"]] = "\n".join(lines) + "\n"
        report = self.update()
        self.assertIn("1 removed rows", "\n".join(report))
        self.assertEqual((self.root / source["path"]).read_text(encoding="utf-8"), self.responses[source["url"]])

    def test_provisional_flags_and_missing_tsis_readings_are_preserved(self):
        source = self.sources["tsis"]
        lines = self.responses[source["url"]].splitlines()
        # The first row is a zero/missing value; the second is a real reading.
        fields = lines[1].split(", ")
        self.assertEqual(len(fields), 14)
        fields[-1] = "1"
        lines[1] = ", ".join(fields)
        self.responses[source["url"]] = "\n".join(lines) + "\n"
        self.update()
        snapshot = parse_snapshot(self.responses[source["url"]], source)
        self.assertGreater(len(snapshot["records"]), len(snapshot["observations"]))
        saved = (self.root / source["path"]).read_text(encoding="utf-8").splitlines()
        self.assertEqual(saved[0], lines[0])
        self.assertEqual(saved[1].split(", ")[-1], "1")

    def test_changed_schema_units_and_release_are_rejected(self):
        for source_id, old, new in [
            ("giss", "1951-1980", "1981-2010"),
            ("noaa-co2", "(ppm)", "(percent)"),
            ("colorado", "2026_rel2", "2027_rel1"),
        ]:
            with self.subTest(source=source_id):
                source = self.sources[source_id]
                changed = self.responses[source["url"]].replace(old, new)
                with self.assertRaises(UpdateError):
                    parse_snapshot(changed, source)
        source = self.sources["tsis"]
        lines = self.responses[source["url"]].splitlines()
        lines[0] = ", ".join(lines[0].split(", ")[:-1])
        with self.assertRaisesRegex(UpdateError, "14 TSIS columns"):
            parse_snapshot("\n".join(lines), source)

    def test_duplicate_dates_and_nonfinite_values_are_rejected(self):
        source = self.sources["tsis"]
        text = self.responses[source["url"]]
        with self.assertRaisesRegex(UpdateError, "Duplicate or unordered"):
            parse_snapshot(text + text.splitlines()[0] + "\n", source)
        with self.assertRaisesRegex(UpdateError, "Non-finite"):
            parse_snapshot(text.replace("1361.6251", "nan", 1), source)

    def test_missing_giss_baseline_month_is_rejected(self):
        source = self.sources["giss"]
        text = self.responses[source["url"]]
        lines = text.splitlines()
        index = next(i for i, line in enumerate(lines) if line.startswith("1961 "))
        fields = lines[index].split()
        fields[1] = "****"
        lines[index] = " ".join(fields)
        with self.assertRaisesRegex(UpdateError, "calibration interval is incomplete"):
            parse_snapshot("\n".join(lines), source)

    def test_future_observations_are_rejected(self):
        source = self.sources["giss"]
        self.responses[source["url"]] = (self.responses[source["url"]].rstrip() + f"\n{self.today.year + 2} 100 "
                                         + " ".join(["****"] * 11) + "\n")
        with self.assertRaisesRegex(UpdateError, "extend into the future"):
            self.update()

    def test_dry_run_never_writes_data_or_metadata(self):
        before = self.saved()
        self.revise_co2()
        self.update(dry_run=True)
        self.assertEqual(self.saved(), before)

    def test_new_colorado_releases_are_reported_without_switching_products(self):
        self.update()
        before = self.saved()
        self.responses[self.sources["colorado"]["release_page"]] = "<h3>2027_rel1</h3><p>2026_rel2</p>"
        report = self.update()
        self.assertIn("New Colorado release 2027_rel1", "\n".join(report))
        self.assertEqual(self.saved(), before)
        self.assertEqual(latest_colorado_release("2025_rel99 2026_rel9 2026_rel10"), "2026_rel10")

    def test_unavailable_release_page_does_not_block_valid_observations(self):
        self.responses[self.sources["colorado"]["release_page"]] = URLError("Release page unavailable")
        self.revise_co2()
        report = self.update()
        self.assertIn("release check unavailable", "\n".join(report))
        self.assertEqual((self.root / self.sources["noaa-co2"]["path"]).read_text(encoding="utf-8"),
                         self.responses[self.sources["noaa-co2"]["url"]])


if __name__ == "__main__":
    unittest.main()
