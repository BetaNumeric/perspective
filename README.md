# Perspective

[Open the app](https://betanumeric.github.io/perspective/)

Perspective is an interactive view of climate history, from recent observations to hundreds of millions of years ago. Compare CO₂, sea level, solar irradiance, orbital eccentricity, volcanic aerosols or population with a combined global temperature curve.

Both panels share a **linear time axis**: equal distances represent equal amounts of time at every zoom level. The app is intended for exploring broad patterns and asking questions about the data.

## Using the charts

Choose a comparison with the top buttons, scroll to zoom, and hover to read values, dates and sources. Temperature stays in the bottom panel. The circular **i** button opens the guide; close it with **×**, **Escape**, or a click outside the dialog.

On a touchscreen, pinch or drag horizontally to zoom. Drag the upper graph down to overlap it with temperature; it returns when released. Tap a graph to leave a cursor at that date, with readings for both panels. Dragging or pinching clears the cursor; tap again to inspect another date. The buttons use two rows on narrow portrait screens.

Timeline labels provide familiar landmarks as you zoom. Hover or focus one for a compact name and date preview. Click or tap to open a card with a short explanation and a Wikipedia link; close it with **×**, **Escape**, or a click elsewhere. Dragging can start on a label and zooms the chart without opening its card. Ancient dates and broad periods are estimates; each card explains what its marker represents. Labels can extend beyond short bands; the band itself shows the duration.

| Control | Action |
| --- | --- |
| Scroll | Zoom in or out |
| Horizontal drag / pinch | Zoom in or out |
| Drag the upper graph vertically | Overlap the graphs while holding |
| Tap a graph | Place the cursor and read both datasets |
| `+` / `D` / Right arrow | Zoom in |
| `-` / `A` / Left arrow | Zoom out |
| `0`–`9` | Select a zoom preset |
| `C` / Space | Show or hide the cursor |
| Tab, then Enter or Space | Focus and select a dataset button |
| Left/Right, Home/End on a focused button | Select an adjacent, first or last dataset |

Most panels fit their vertical ranges to the visible data and uncertainty bands. Orbital eccentricity uses a fixed vertical range. Read the units in the hover box: similar shapes in different panels can represent very different amounts of change.

**BP** means years before 1950; **CE/BCE** are calendar years. Year markers fall on January 1. Close views show calendar dates, while each sample retains its own date or averaging period. Zooming in does not create finer data.

Dashed vertical markers identify source changes, where lines and bands are separated. Lines connect available samples within a source; they do not add observations between those samples. Shading shows the uncertainty reported for that record. The labels distinguish different ranges, such as 68%, 95% and one or two standard deviations. A missing band does not imply an exact value.

## Datasets

Coverage is approximate. The [source notes](data/SOURCES.md) list the files, exact coverage, reference conversions and limitations.

| View | Sources and coverage |
| --- | --- |
| Global temperature | PhanDA, Hansen, Snyder, Osman, PAGES2k and NASA GISS; about 485 million years ago to recent observations |
| Atmospheric CO₂ | Foster, CenCO₂PIP, Antarctic ice cores, Scripps and NOAA; about 420 million years ago to daily station observations |
| Sea level | Corrected Marcilly, Miller, Spratt & Lisiecki, Lambeck, Kopp, Jevrejeva and Colorado satellites; 520 million years ago to recent observations |
| Solar irradiance | SATIRE / CMIP6, NNL and TSIS; about 8,700 years BP to recent observations, at a fixed Sun–Earth distance of 1 AU |
| Orbital eccentricity | Zeebe ZB18a; the most recent 58 million years of the published orbital solution, ending at 2000 CE |
| Volcanic aerosols | HolVol / eVolv2k / CMIP6; annual global aerosol optical depth from 9500 BCE to 2014 CE |
| World population | Our World in Data; historical estimates through 2023 and dashed projections from 2024, displayed through the current calendar year |

### Temperature reference

Temperature is displayed as a difference (anomaly) from the **1961–1990** average. The sources use different methods and temporal resolutions:

| Period | Source | Reference conversion |
| --- | --- | --- |
| Older than 66 million years BP | PhanDA geological-stage estimates | Subtract Hansen's 14 °C reference as an application assumption |
| 66 million to 2 million years BP | Hansen global surface estimate | Subtract the author's 14 °C reference |
| 2 million to 24,000 years BP | Snyder global reconstruction | Add the aligned Osman mean over 0–5,000 BP |
| 24,000 years BP to before 1 CE | Osman, 200-year means | Align to PAGES2k over 150–1750 CE |
| 1–1879 CE | PAGES2k annual reconstruction | Use the published 1961–1990 reference |
| 1880 CE onward | GISS monthly observations | Subtract the mean of all 360 months in 1961–1990 |

Each conversion adds a constant to the central values and their bounds, preserving the source's variability. This common display reference does not make the records a homogeneous temperature product. Their joins remain visible, and their uncertainty bands exclude uncertainty introduced by the reference conversions.

### Interpreting comparisons

Use the charts to explore broad trends. Ancient reconstructions average or smooth changes over long periods; a dense evaluation grid is not a sequence of independent measurements. Different methods can disagree substantially: Foster and CenCO₂PIP, for example, give different CO₂ estimates near their 66-million-year handoff. A jump between sources does not measure an abrupt climate event.

Sea-level reconstructions also describe different contributions. Lambeck and Spratt mainly estimate changes associated with ice volume; modern observations include thermal expansion, and deep-time estimates also depend on land and ocean-basin geometry.

Visual correlation does not establish causation. Some reconstructions share models, inputs or chronologies: Osman's model priors include greenhouse-gas forcing, and Miller's sea-level calculations use temperature-related inputs. Differences in resolution, dating and methods limit precise rates, timing lags and rankings of ancient extremes.

## Installing and offline use

Open [Perspective](https://betanumeric.github.io/perspective/) in your browser. On iPhone, choose **Share → Add to Home Screen**, enable **Open as Web App** if offered, then tap **Add**. On Android or desktop, use the browser's **Install app** command. The installed app opens in its own window and supports both portrait and landscape.

The first online visit saves the app and its chart datasets for offline use. Open the installed app online once and allow caching to finish before going offline. Offline charts use the saved observations; reconnect and reload to fetch current deployed files. External source links need an internet connection. Browsers may remove cached files when storage is cleared or space is needed.

## Running locally

From the project directory, start a static web server:

```sh
python -m http.server 8000
```

Open `http://localhost:8000/`. The app includes p5.js; no bundler or package installation is required. Phone previews over a local HTTP address support the charts, while service workers require HTTPS or localhost. See the [phone-testing instructions](docs/DEVELOPMENT.md#testing-on-a-phone).

Current GISS, NOAA, TSIS and Colorado observations are checked on the **1st and 16th of each month** by GitHub Actions. The app reads bundled snapshots; reload to load the latest deployed data. Historical reconstructions remain on their documented versions.

For tests, dataset rebuilds, observation updates and GitHub Pages setup, see [Development and maintenance](docs/DEVELOPMENT.md). The [Processing prototype](java/README.md) is an archived desktop version.
