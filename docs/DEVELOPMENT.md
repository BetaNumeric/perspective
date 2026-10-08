# Development and maintenance

[Project overview](../README.md) · [Data sources and methods](../data/SOURCES.md)

The browser app uses p5.js global mode. Scripts load in the order listed in `index.html`, without a bundler. CI uses Node 24 and Python 3.13.

## Code layout

| Path | Responsibility |
| --- | --- |
| `sketch.js` | Shared state, data loading, initialization and panel drawing |
| `js/config.js`, `js/time.js` | Source labels, configuration and calendar calculations |
| `js/layout.js`, `js/touch.js` | Viewport sizing, shared panel layout and touch gestures |
| `js/data/` | Dataset parsers, reference conversions and combinations |
| `js/plot.js`, `js/timeline.js` | Curves, uncertainty bands, source joins and timeline drawing |
| `js/timeline-events.js` | Timeline dates, descriptions and further-reading links |
| `js/ui.js`, `js/timeline-ui.js`, `styles.css` | Buttons, keyboard input, event cards and the info dialog |
| `scripts/`, `tests/` | Data extraction, observation updates and validation |

Required-file or reference-alignment failures display a loading error. The app requires valid calibration coverage before drawing a combined record.

## Checks

Run from the repository root:

```sh
node tests/climate.test.cjs
python -m unittest discover -s tests -p 'test_*.py'
```

The JavaScript suite loads the same script list as the page. Python checks validate the updater and compare bundled derivatives with their verified source files. These checks are offline and require no extra Python packages. The Pages workflow runs both suites before deployment.

## Rebuilding historical datasets

These commands use bundled, checksum-verified inputs and the Python standard library:

```sh
python scripts/build_kopp_sealevel.py
python scripts/build_lambeck_sealevel.py
python scripts/build_snyder_temperature.py
python scripts/build_foster_co2.py
```

For Lambeck, the ordinary rebuild uses verified Table S3 text. To re-extract the table from the bundled PDF and compare every row:

```sh
python -m pip install pypdf==6.19.0
python scripts/build_lambeck_sealevel.py --verify-pdf
```

Osman's extraction reads the bundled NOAA NetCDF file and requires `h5py`:

```sh
python -m pip install h5py
python scripts/build_osman_gmst.py
```

Marcilly's CSV transcribes the modern-land sea-level column in [corrected Table 1](../data/sealevel/marcilly2024-correction.pdf#page=2). Its transcription and checksum are documented in the source notes.

### Verifying the solar reconstruction

```sh
python scripts/verify_solar_source.py
python scripts/verify_solar_source.py --offline
```

The first command downloads the exact provider input, checks its size and SHA-256, integrates every spectrum, and compares the resulting CSV with the bundled reconstruction. The compressed input is about **604 MiB** and stays in the ignored `.cache/solar/` directory. `--offline` reuses that verified cache. Neither command replaces the bundled CSV.

Input and output checksums and the expected row count are recorded in [build-source.json](../data/solar/build-source.json). CSV checksums normalize CRLF to LF. The same verification is available under **Actions → Verify original solar reconstruction → Run workflow**.

## Observation updates

[Update climate observations](../.github/workflows/update-climate-data.yml) runs on the default branch on the **1st and 16th of each month at 07:23 UTC**, or manually through **Actions → Update climate observations → Run workflow**. It checks four current records:

- GISS monthly temperature.
- NOAA daily CO₂.
- TSIS daily solar observations.
- The selected Colorado satellite sea-level release.

Historical reconstructions, NNL, population and orbital data stay on their documented versions. Run the updater locally with Python 3.10 or later:

```sh
python scripts/update_data.py --dry-run
python scripts/update_data.py
```

`--dry-run` downloads and validates without saving. A normal run saves complete snapshots only after all four records pass. Validation rejects error pages, changed schemas or units, duplicate dates, missing GISS reference months, regressed coverage and losses exceeding 1% of stored observations. Smaller provider withdrawals are accepted and reported. Missing-value conventions and provisional flags are preserved.

[update-sources.json](../data/update-sources.json) defines provider URLs, units and minimum coverage. Successful saves record retrieval times, coverage, counts and SHA-256 in [update-metadata.json](../data/update-metadata.json). Checks without data changes leave the saved retrieval dates unchanged and produce no data commit.

Colorado release selection is explicit. Review provider release corrections and change the manifest and browser file path together when selecting a release. The updater reports newer releases; an unavailable release page does not prevent otherwise valid observation updates.

## GitHub Pages

Set **Settings → Pages → Build and deployment → Source → GitHub Actions**. The updater uses the built-in `GITHUB_TOKEN` with `contents: write` to commit validated data; no additional secret is required.

[Deploy Perspective](../.github/workflows/deploy-pages.yml) publishes app changes on `main`. After a data commit, the updater calls that workflow with the validated commit, because bot commits do not trigger a separate Pages build. For a manual deployment, select **Actions → Deploy Perspective → Run workflow**. If the default branch is renamed, update the deployment workflow's push branch.

Scheduled execution depends on GitHub Actions availability; the manual workflows provide an alternative. The static deployment contains `index.html`, `sketch.js`, `styles.css`, `js/` and `data/`. Development tools and the archived `java/` prototype are excluded.
