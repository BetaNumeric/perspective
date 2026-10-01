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

Dashed markers identify joins. The line breaks at every source change: the app does not interpolate or force endpoints to meet. Hovering shows the source and actual sample date, plus the PAGES2k 95% ensemble range or Osman ±1σ ensemble spread where available. These measures are different and exclude uncertainty in the baseline alignment and systematic differences between reconstructions. Hansen's uncertainty is not quantified here.

These records estimate global surface temperature using different methods, temporal averages and temperature definitions. GISS blends land air temperatures and sea surface temperatures; Osman reconstructs near-surface air temperature. A reference offset does not remove these differences. Older points cannot resolve the monthly changes in modern observations. This composite is useful for broad educational context, not for calculating precise warming rates or lags across its joins. Holocene reconstructions also disagree about long-term trends; the chosen Osman segment is one published estimate.

The six top buttons now provide these comparisons:

| Comparison | Combination and limitations |
| --- | --- |
| CO₂ | NOAA daily measurements from 1974 onward, Scripps before that, and the published Bereiter Antarctic ice-core composite for earlier times. Samples connect within each source, including missing observation days, without adding measurements. Older than the ice-core coverage, the published CenCO₂PIP synthesis (2023, author update v1.2) provides one median curve of 500,000-year means and a shaded 95% credible interval. The band describes uncertainty in the estimated mean, not all within-bin variability. Broad trends are interpretable; finer peaks and lags are unresolved. Concentrations retain their published ppm scales; station records are not global spatial averages. |
| Orbit | Published Zeebe ZB18a eccentricity samples every 1,600 years, consistently converted from the authors' 2000 epoch to the shared 1950-based axis. Only the most recent 58 million years of the solution are drawn; the provider warns that earlier orbital phase is unconstrained. The latest sample is at 2000 CE; no recent daily orbital record is invented. |
| Solar | The published PMIP4 base contains SATIRE-M, SATIRE-T and the CMIP6 SATIRE/NRL mixture, followed by NNL from 1874 and TSIS observations from 2018. Constant offsets use paired dates and the median of qualifying monthly differences; the older join uses 22 years of overlap near the transition. TSIS stays on its measured scale. Views wider than 200 years show annual means from raw daily values; narrower views show 50-day means from 1850 onward. Source changes remain marked and disconnected, partial years are labelled, and no averaging blends sources. |
| Volcanoes | The provider's existing HolVol / eVolv2k / CMIP6 combined annual global stratospheric aerosol optical depth product, with its values unchanged. Component transitions at −500 and 1901 CE are marked. Optical depth measures aerosol effects, rather than the number of eruptions. |
| Sea level | One view containing Miller's geological global estimate, Jevrejeva's monthly global tide-gauge reconstruction and Colorado satellite observations. Tide gauges are relative to their 1950 mean; satellites receive a constant offset from matching months in their 1992–2010 overlap. Miller's published zero-age value is set to zero separately: this is an approximate reference, not an instrumental calibration. A shaded gap separates the last retained geological sample near 640 CE from the first tide-gauge sample in 1807. Geological estimates have much coarser resolution and uncertainty than modern measurements. |
| Population | OWID's published World series, with historical estimates through 2023 and projections from 2024 shown as dashed lines. Only years through the current calendar year are displayed. Internal historical source changes cannot be identified from this CSV and are not given invented join markers. |

All identifiable source transitions have dashed markers and disconnected lines. Individual missing observations do not receive gap markers. CO₂ connects samples within a source; TSIS retains a line break for gaps longer than seven days. Drawing fewer points when zoomed out preserves the source joins and extrema. All dataset tooltips show their actual source, sample date, site/station when available, and published uncertainty bounds. These uncertainty measures differ and do not include alignment uncertainty. The app preserves published variability rather than forcing endpoints to meet. Population connects annual values within its historical or projection segment and stops at its newest sample; it is not extended to today's date.

The Kopp file in `data/sealevel` contains measurements from individual coastal sites; it is retained for reference and excluded from the global curve. To fill sea level's Common Era gap, we would need a published **global reconstruction**, rather than merging those local samples. A geological reference shift does not make its sea-level definition, land-motion corrections or uncertainty identical to modern observations.

The SATIRE runtime CSV is bundled; its large original SSI input is not. Its integration script can regenerate TSI after obtaining the cited input file. The regression checks cover the CSV and combination logic, but do not independently reproduce that missing source's spectral integration. Each page load rebuilds the solar combination from the bundled base and observations, so identical snapshots give identical results.

Scroll to zoom. `+`/`D`, `-`/`A`, and the left/right arrow keys also zoom; digits `0`–`9` select time scales. Press `C` or Space to toggle the cursor and `P` for performance information. All dataset tooltips identify their source automatically. The former `V` source toggle and `R` browser-download shortcut have been removed. The app loads the published dataset snapshots; reload the page to pick up a newer deployment from the GitHub updater.

Run the regression checks with:

```sh
node tests/climate.test.cjs
python -m unittest discover -s tests -p 'test_update_data.py'
```

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
