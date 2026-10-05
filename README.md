# Perspective

[Open the live app](https://betanumeric.github.io/perspective/)

Perspective lets you explore climate and related datasets alongside a combined global temperature view. Open the project through a local web server, for example:

```sh
python -m http.server 8000
```

Then visit `http://localhost:8000/`. The page loads p5.js from a CDN.

The simple top buttons choose the dataset above; temperature stays below. Both panels share a **linear time axis** at every zoom level. Equal distances represent equal amounts of time throughout the view, without the changes in scale used in many static deep-time diagrams.

Zooming in reveals calendar-month markers. Year markers sit on January 1, and the cursor shows dates as **YYYY-MM-DD** in close views. The sample tooltip still shows each dataset's own date and averaging period; a cursor date does not imply daily measurements in a monthly or annual record.

Temperature and most comparison panels automatically fit their vertical ranges to the visible values and drawn uncertainty bands. For a continuous line or band crossing the left edge, scaling includes its intersection with the viewport so that sparse records reach the edge without being clipped vertically. The off-screen endpoint does not set the visible range, and no measurements are added. Orbital eccentricity retains a fixed vertical range. Hover to read values and units. Similar-looking slopes across panels do not imply equal physical changes. Click the circular **i** button at the bottom left of the temperature panel for the in-app guide, dataset details and GitHub links. Close it with **×**, **Escape**, or a click outside the panel.

The bottom curve combines four global temperature estimates, relative to **1961–1990**:

| Segment | Source | Reference conversion |
| --- | --- | --- |
| Older than 24,000 years BP | Hansen et al. (2013) global surface estimate | Subtract the author's 14 °C estimate for 1961–1990 |
| 24,000 years BP to before 1 CE | Osman et al. (2021) global reconstruction, 200-year means | Constant offset estimated over the 150–1750 CE overlap with PAGES2k |
| 1–1879 CE | PAGES2k / Neukom et al. (2019), annual ensemble median | Already relative to 1961–1990 |
| 1880 CE onward | NASA GISS, monthly observations | Subtract its mean of all 360 months in 1961–1990 |

For Osman, each of eight complete 200-year bins is compared with the mean of the same 200 annual PAGES2k values. The average difference sets a single offset for the entire Osman series. This alignment is an application assumption, not a published homogeneous temperature product. No source is multiplied to match another source's variability. EPICA is retained on disk as an Antarctic record and is excluded from the global curve.

Dashed markers identify joins. The line and shading break at every source change: the app does not interpolate or force endpoints to meet. Shading shows the published PAGES2k 95% ensemble range and Osman ±1σ ensemble spread, with bounds shifted by the same reference offsets as the central values. These measures are different. They do not display horizontal dating uncertainty or add uncertainty for baseline alignment and other differences between sources. GISS and Hansen have no uncertainty band in this view; that does not imply exact values.

These records estimate global surface temperature using different methods, temporal averages and temperature definitions. GISS blends land air temperatures and sea surface temperatures; Osman reconstructs near-surface air temperature. A reference offset does not remove these differences. Older points cannot resolve the monthly changes in modern observations. This composite is useful for broad educational context, not for calculating precise warming rates or lags across its joins. Holocene reconstructions also disagree about long-term trends; the chosen Osman segment is one published estimate.

The six top buttons now provide these comparisons:

| Comparison | Combination and limitations |
| --- | --- |
| CO₂ | NOAA daily measurements from 1974 onward, Scripps before that, and the published Bereiter Antarctic ice-core composite for earlier times. Samples connect within each source, including missing observation days, without adding measurements. Ice-core shading shows the published ±1σ concentration measurement uncertainty, excluding gas-age uncertainty and unresolved changes. Older than the ice-core coverage, the published CenCO₂PIP synthesis (2023, author update v1.2) provides one median curve of 500,000-year means and a shaded 95% credible interval. That band describes uncertainty in the estimated mean, not all within-bin variability. Broad trends are interpretable; finer peaks and lags are unresolved. Concentrations retain their published ppm scales; station records are not global spatial averages. |
| Orbit | Published Zeebe ZB18a eccentricity samples every 1,600 years, consistently converted from the authors' 2000 epoch to the shared 1950-based axis. Only the most recent 58 million years of the solution are drawn; the provider warns that earlier orbital phase is unconstrained. The latest sample is at 2000 CE; no recent daily orbital record is invented. |
| Solar | The published PMIP4 base contains SATIRE-M, SATIRE-T and the CMIP6 SATIRE/NRL mixture, followed by NNL from 1874 and TSIS observations from 2018. Constant offsets use paired dates and the median of qualifying monthly differences; the older join uses 22 years of overlap near the transition. TSIS stays on its measured scale. Views wider than 200 years show annual means from raw daily values; narrower views show 50-day means from 1850 onward. Source changes remain marked and disconnected, partial years are labelled, and no averaging blends sources. |
| Volcanoes | The provider's existing HolVol / eVolv2k / CMIP6 combined annual global stratospheric aerosol optical depth product, with its values unchanged. Component transitions at −500 and 1901 CE are marked. Optical depth measures aerosol effects, rather than the number of eruptions. |
| Sea level | Miller's geological estimate before 34,783 years BP; Lambeck's postglacial ice-volume-equivalent reconstruction from 34,783 to 2,970 years BP; Kopp's global posterior from −1000 to 1800 on the published CE axis; Jevrejeva's monthly tide-gauge reconstruction from 1807; then Colorado satellites. Kopp fills the Common Era gap and Lambeck improves Holocene resolution. Bands show Kopp's ±1σ posterior and Lambeck's published ±2σ accuracy. Tide gauges are relative to their 1950 mean; satellites use matching-month offsets. Kopp's 1950 estimate, Lambeck's zero-age estimate and Miller's zero-age estimate provide separate references. These are different sea-level definitions; joins remain marked and disconnected. |
| Population | OWID's published World series, with historical estimates through 2023 and projections from 2024 shown as dashed lines. Only years through the current calendar year are displayed. Internal historical source changes cannot be identified from this CSV and are not given invented join markers. |

All identifiable source transitions have dashed markers and disconnected lines. Individual missing observations do not receive gap markers. CO₂ connects samples within a source; TSIS retains a line break for gaps longer than seven days. Drawing fewer points when zoomed out preserves the source joins and extrema. Compact tooltips show the value, short source name, sample date, averaging period where needed, site/station when available, and published uncertainty bounds. BP means years before 1950. Solar readouts retain partial-year coverage and provisional labels. Full explanations are in the info box and source notes. These uncertainty measures differ and do not include alignment uncertainty. The app preserves published variability rather than forcing endpoints to meet. Population connects annual values within its historical or projection segment and stops at its newest sample; it is not extended to today's date.

The new Kopp runtime CSV comes from the authors' **global posterior** (`GLMW-1ts.mat`), not from the local coastal samples in the older `kopp2016-global.txt` archive. Those local samples remain excluded. The original MATLAB file is bundled and checksum-pinned; every original mean, date and standard deviation can be checked offline. This is the reconstruction supplied as input to the authors' temperature-driven sea-level model, not that model's simulated sea-level output. Its statistical model constrains the long-term trend, and points on its roughly 20-year evaluation grid are not independent observations or 20-year means. Published ±1σ bounds are preserved under the reference shift and exclude alignment uncertainty. See [data/SOURCES.md](data/SOURCES.md) for provenance and limitations.

Lambeck's segment comes from the verified original **Table S3**, pages 29–36 of the [bundled supplement](data/sealevel/lambeck2014-supplement.pdf#page=29). All 326 published rows are retained in the CSV; the browser selects the part older than Kopp. The best estimates are in column 3, rather than the starting ice model in column 2; column 4 already reports a 2σ accuracy range. Two independent PDF readers agreed on every numeric cell. The late Holocene grid is about 70 years, much finer than Miller's retained samples, but these are reconstructed curve values rather than individual observations. Lambeck estimates **ice-volume-equivalent** sea level, excluding thermal expansion and other contributions to modern total sea level. Its zero-age reference is approximate under the shared 1950 BP convention, and the reported accuracy does not cover every model assumption. At the Kopp join, 20 years and about 0.46 m separate the neighboring estimates; the app preserves this difference rather than forcing them to meet. The data notes describe these limits.

The SATIRE runtime CSV is bundled. Its exact original SSI input is available through the checksum-verified rebuild command below. On 2026-10-05, integrating all 69,235 original spectral rows reproduced the bundled CSV exactly. Each page load rebuilds the solar combination from the bundled base and observations, so identical snapshots give identical results.

Scroll to zoom. `+`/`D`, `-`/`A`, and the left/right arrow keys also zoom; digits `0`–`9` select time scales. Press `C` or Space to toggle the cursor. Tab focuses the dataset buttons; Enter or Space selects one. While a dataset button is focused, Left/Right selects the adjacent button and Home/End selects the first/last. The buttons announce their selected state to screen readers. All dataset tooltips identify their source automatically. Reload the page to pick up a newer deployment from the GitHub updater.

Only finite samples at or before the timeline's right edge are drawn. Samples and their source metadata are sorted together before visibility searches. If a required file fails to load or a reference alignment fails, the app displays an error instead of an incomplete chart. Solar alignment requires the documented paired coverage; it does not substitute a zero offset when coverage is insufficient.

Run the regression checks with:

```sh
node tests/climate.test.cjs
python -m unittest discover -s tests -p 'test_*.py'
```

Rebuild the Kopp sea-level CSV from the bundled author archive without network access or extra packages:

```sh
python scripts/build_kopp_sealevel.py
```

Rebuild Lambeck's CSV from the checksum-verified table text with the standard library, or re-extract and verify every row against the original PDF using a build-time PDF reader:

```sh
python scripts/build_lambeck_sealevel.py
python -m pip install pypdf==6.19.0
python scripts/build_lambeck_sealevel.py --verify-pdf
```

The Pages workflow runs both suites before publishing normal changes or updated observations. Build-script tests use synthetic fixtures and check the bundled sea-level extractions against their verified source files, leaving the snapshots untouched. Ordinary checks need no PDF packages.

Reproduce the solar CSV from its original provider input with:

```sh
python scripts/verify_solar_source.py
python scripts/verify_solar_source.py --offline
```

The first command downloads the exact reviewed gzip input into `.cache/solar/`, checks its size and SHA-256, integrates each spectrum and compares the entire CSV with the bundled reconstruction. The compressed input is about **604 MiB**; it stays in an ignored local cache and is excluded from the website. The second command reuses that cache without network access. Neither command replaces the bundled CSV. The builder reads spectral rows one at a time, avoiding the memory cost of holding the full input in memory. The pinned URL, input checksum, output checksum and row count are recorded in [data/solar/build-source.json](data/solar/build-source.json). Output checksums normalize CRLF to LF so Windows and Linux agree.

The same check is available in **Actions → Verify original solar reconstruction → Run workflow**. It runs only when requested; the twice-monthly observations updater does not download this historical input. Ordinary tests use small offline fixtures.

Current observations are checked automatically on the **1st and 16th of each month at 07:23 UTC**. The workflow follows the download-and-commit approach in [climate_spiral](https://github.com/BetaNumeric/climate_spiral/blob/main/.github/workflows/update-climate-data.yml), with validation and regression checks before committing. It updates only GISS monthly temperature, NOAA daily CO₂, TSIS daily solar observations and the selected Colorado satellite sea-level release. Historical observations can receive provider revisions; published reconstructions, NNL, population and orbital data stay on their reviewed versions.

To activate it, push these files to the default branch and set **Settings → Pages → Build and deployment → Source → GitHub Actions**. The workflow uses the built-in `GITHUB_TOKEN`, so no additional secret is needed. Its `contents: write` permission lets the bot commit data. The Pages workflow publishes normal changes on `main`, and the updater explicitly calls it after a successful data commit: bot commits alone do not trigger another Pages build. You can also select **Actions → Update climate observations → Run workflow** on the default branch, or rerun **Deploy Perspective** if a deployment needs retrying.

Run the same updater locally using Python 3.10 or later; it needs no extra packages:

```sh
python scripts/update_data.py --dry-run
python scripts/update_data.py
```

The first command downloads and validates without saving. The second saves complete provider snapshots after all four pass. HTML/error responses, changed schemas or units, duplicate dates, missing GISS baseline months, regressed coverage and losses exceeding 1% of saved observations fail the run before any datasets are replaced. Smaller provider withdrawals are accepted and reported; discarded readings are not copied back from the previous snapshot. Missing TSIS zeros and provisional flags retain their provider meanings. Regenerated comments and identical observations produce no data commit.

Provider URLs, units and minimum coverage are in `data/update-sources.json`. Successful saves record retrieval time, coverage, observation count and SHA-256 in `data/update-metadata.json`; unchanged checks appear in the Actions log without modifying retrieval dates. Colorado uses **2026 release 2, seasons retained**; the reviewed snapshot ends on 2026-06-27, and the metadata records coverage after updates. The updater checks the provider's release page and reports newer versions as an Actions warning. Review their corrections and update the manifest and the browser's local dataset path together. If that release page is unavailable, validated observation updates still proceed. Release selection is deliberately explicit.

GitHub schedules can be delayed, and public-repository schedules are disabled after 60 days without activity. The manual workflow remains available; see [GitHub's schedule documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule). If the default branch is renamed from `main`, update the Pages workflow's push branch too.

Source URLs, snapshots and combination details are listed in [data/SOURCES.md](data/SOURCES.md). The original Rae/Tripati proxy files remain on disk for reference; the default deep-time CO₂ view uses the published synthesis instead of overlapping raw estimates. Its original output CSV and author license are bundled, with links to the model and archived release. To regenerate the small Osman CSV from the bundled NOAA NetCDF snapshot, install `h5py` in a build environment and run `python scripts/build_osman_gmst.py`. The browser needs no Python dependencies.

Visual correlations help generate questions, but do not establish causation. Dating uncertainty, averaging and shared reconstruction inputs matter. In particular, Osman uses model priors that include greenhouse-gas forcing, so comparing it with CO₂ is not a fully independent test. Miller's sea-level reconstruction also uses temperature-dependent calculations, so agreement with temperature is partly influenced by its reconstruction method.

The browser code is organized as follows:

- `sketch.js`: shared application state, preload, initialization and drawing the two panels.
- `js/config.js` and `js/time.js`: configuration, source labels and calendar calculations.
- `js/data/`: common helpers and separate parsers and combinations for temperature, CO₂, solar, sea level and the other comparisons.
- `js/plot.js` and `js/timeline.js`: drawing series, uncertainty, source joins and historical context.
- `js/ui.js` and `styles.css`: native controls, keyboard input, the info dialog and appearance.

These files use p5's global mode and are loaded in the order listed in `index.html`; no bundler or package installation is needed. Regression tests load the same list of scripts as the page. The [Processing sketch in `java/`](java/README.md) is an archived desktop prototype with older data and behavior, excluded from web deployments and tests. Historical source files remain available for provenance.
