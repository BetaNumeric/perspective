# Dataset Sources and Coverage

This file documents dataset provenance and approximate coverage used by `sketch.js`.

Current GISS, NOAA daily CO₂, TSIS and Colorado satellite observations are eligible for automatic updates twice a month. The provider selection and units are in `update-sources.json`; successful updates create `update-metadata.json` with retrieval dates, actual observation coverage, counts and checksums. The updater downloads complete raw snapshots, preserves provider revisions and missing-value conventions, and validates every response before saving. It does not change the reconstruction inputs or the combination methods described below. Coverage and calibration values quoted here describe the reviewed snapshots; the app recomputes reference offsets from whichever validated observation snapshots are loaded. See the README for activation and local commands.

Notes
- Project time axis is generally `time = yearCE - 1950` for CE-based datasets.
- BP datasets are converted with `time = -ageBP` (or `-ageKyr * 1000`); the astronomical ZB18a solution is the documented exception, using its authors' J2000 epoch.
- Coverage is approximate and should be verified against source metadata for publication use.
- The bottom panel combines global temperature estimates using constant reference offsets only. Source changes are marked and disconnected. See the temperature combination method below.
- All identifiable component changes in the top composites have dashed markers and disconnected lines. Published provider composites retain their values; the markers explain their provenance.
- Sea level uses one view with explicitly separated geological, tide-gauge and satellite segments. Local relative sea-level samples are not treated as a global reconstruction.

## Orbital

- `data/orbit/zeebe2019orbital.txt`
  - File coverage: 100,000–0 kyr BP, with 1.6 kyr sample spacing
  - Source: https://www.ncei.noaa.gov/pub/data/paleo/climate_forcing/orbital_variations/zeebe2019orbital.txt
  - Epoch documentation: https://doi.org/10.1029/2025PA005287 (Kocken & Zeebe 2026, section 2.1, explicitly identifies ZB18a's epoch as J2000.0)
  - Runtime use: eccentricity at the published relative ages, `time = 2000 - 1950 - age_kyr * 1000`. The astronomical epoch is 2000 CE, despite the NOAA file's generic calendar-BP label. The same constant conversion applies to every sample. Zero age is not moved to today's date. The file has no recent daily observations, so a sufficiently recent view is empty; wider views may show only the single 2000 CE point.
  - Only 58–0 Ma is drawn. The authors explicitly caution that the supplied 100–58 Ma interval is unconstrained due to chaos. Omitting that interval prevents visually precise phase comparisons with temperature there; it does not assert zero dating or phase uncertainty in the retained interval.

## Temperature

- `data/temperature/Table.txt` (Hansen)
  - Coverage: deep-time Cenozoic (~66 Myr BP to near-present)
  - Source: https://www.columbia.edu/~mhs119/Sensitivity%2BSL%2BCO2/Table.txt
  - Publication: https://doi.org/10.1098/rsta.2012.0294
  - Reference definition: https://arxiv.org/pdf/1211.4846 (section 4, absolute global mean of 14 °C for 1961–1990)
  - Runtime use: smoothed age and global surface temperature `Ts` columns; only ages older than 24,000 BP, with 14 °C subtracted. This preserves the author's proxy-to-global-temperature conversion; it is not a direct thermometer record.

- `data/temperature/LGMR_GMST_climo.nc` (Osman et al. 2021)
  - Coverage: 24,000–0 BP; 120 bin midpoints at 100, 300, …, 23,900 BP, each representing 200 years
  - Source: https://www.ncei.noaa.gov/pub/data/paleo/reconstructions/osman2021/LGMR_GMST_climo.nc
  - Metadata: https://www.ncei.noaa.gov/pub/data/paleo/reconstructions/osman2021/readme-osman2021.txt
  - Publication: https://doi.org/10.1038/s41586-021-03984-4
  - Downloaded: 2026-10-01
  - Source SHA-256: `3c62f06b89a2f613d914bce77200358305e13279236fd6d1db48671bea3a4bb1`
  - Variables: `age` (bin midpoint, years before 1950), `gmst` (global mean annual air temperature in °C), `gmst_std` (500-member ensemble standard deviation in °C)
  - `data/temperature/osman2021-gmst.csv` is the compact browser derivative; regenerate with `python scripts/build_osman_gmst.py` (requires `h5py`). No calibration, smoothing or interpolation occurs in that extraction.

- `data/temperature/edc3deuttemp2007-noaa.txt` (EDC)
  - Coverage: ~800 kyr BP to recent Holocene
  - Source: https://www.ncei.noaa.gov/pub/data/paleo/icecore/antarctica/epica_domec/edc3deuttemp2007-noaa.txt
  - Retained for reference; not used in the global curve. It measures local Antarctic temperature relative to the last 1,000 years, not global mean temperature.

- `data/temperature/Full_ensemble_median_and_95pct_range.txt` (Neukom PAGES2k)
  - Coverage: Common Era to present
  - Source: https://www.ncei.noaa.gov/pub/data/paleo/pages2k/neukom2019temp/recons/Full_ensemble_median_and_95pct_range.txt
  - Runtime use: annual median and 2.5th/97.5th percentiles for 1–1879 CE. Published April–March anomalies relative to 1961–1990 are unchanged.

- `data/temperature/GLB.Ts+dSST.txt` (NASA GISS)
  - Coverage: 1880 CE to present
  - Source: https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.txt
  - Runtime use: monthly anomalies from 1880 onward, converted from hundredths of °C. Subtract the 360-month mean for January 1961–December 1990 to change from the 1951–1980 reference to 1961–1990. The bundled snapshot gives an offset of −0.0993333333 °C.

### Temperature combination method and limitations

The composite uses GISS from 1880 onward, PAGES2k for 1–1879 CE, Osman at bin midpoints older than 1949 BP (the first retained midpoint is 2100 BP), and Hansen older than 24,000 BP. BP always means years before 1950. Actual samples remain at their original timestamps; missing endpoints are not invented. Every source boundary breaks the line and has a dashed marker located between the two neighboring samples.

Osman is aligned to PAGES2k over 150–1750 CE: its eight bin midpoints from 1700 to 300 BP each represent a complete 200-year interval. For each bin, average the 200 annual PAGES2k values over that same interval, then subtract the Osman value. Average those eight differences and add that one constant to every Osman mean and uncertainty bound. The current snapshots give an offset of −13.7040599625 °C. This estimates a compatible anomaly reference; it does not validate either reconstruction or remove disagreements at the joins. Hansen uses its published 14 °C reference independently and is not fitted to Osman.

No standard-deviation matching, amplitude scaling, cross-fading or added smoothing is used for the temperature composite. The hover ranges retain PAGES2k's 95% ensemble interval and Osman's ±1σ ensemble spread. These are different measures; neither includes the added uncertainty of the cross-source alignment. Hansen uncertainty is not quantified in the source table or this interface.

The component products use different definitions (including blended air/sea surface temperature versus near-surface air temperature), calibration assumptions, temporal resolution and dating methods. They are global estimates, but the composite is not a homogeneous climate data product. Use it for broad educational context. Do not infer precise warming rates or causal lags across joins, or interpret a coarse ancient point as equivalent to a modern monthly observation. Other Holocene reconstructions can disagree with Osman's trend. Its assimilation also uses model priors with greenhouse-gas forcing, so the temperature–CO₂ comparison is not fully independent.

## CO2

- `data/co2/cencopip2023-500kyr.csv`
  - Product: CenCO₂PIP Consortium (2023), published multiproxy Bayesian reconstruction of Cenozoic atmospheric CO₂; author release **v1.2, 2024-01-08**, incorporating the authors' correction for about 20 omitted observations. This is the model output, not the separate December 2024 raw proxy compilation.
  - Publication: https://doi.org/10.1126/science.adi5177
  - Archived release: https://zenodo.org/records/10471529
  - Exact source: https://raw.githubusercontent.com/SPATIAL-Lab/CenoCO2/v1.2/out/500kyrCO2.csv
  - Output definitions and model source: https://github.com/SPATIAL-Lab/CenoCO2/tree/v1.2
  - Downloaded: 2026-10-01. SHA-256: `8754757776b2faf9e539c599d3097c9e237a01bf1ce79563d903d79579424ac1`
  - Original CSV retained unchanged. Ages are bin midpoints in Ma BP; all concentration quantiles are **natural logarithms of ppm**. Runtime uses `time = -ages * 1000000`, `CO2 = exp(50%)`, and `exp(2.5%)` / `exp(97.5%)` for the shaded 95% credible interval. No fitted concentration offset, amplitude scaling, or additional smoothing is applied.
  - The author's `code/PrepForPlots.R` drops the first four pre-Cenozoic bins; the app likewise excludes ages greater than 66 Ma. Before excluding overlap with ice cores, midpoints cover 65.75–0.25 Ma at 0.5 Ma spacing. The retained deep-time segment is 65.75–1.25 Ma (130 bins); ice-core samples take precedence over younger overlapping bins.
  - Author repository license: GPL-3.0, retained verbatim in `data/co2/cencopip2023-LICENSE.txt`. Attribution: CenCO₂PIP Consortium; reconstruction code and archived release by Gabriel Bowen / SPATIAL-Lab. No author model code is copied into the application; the bundled output remains available as the original CSV, with links to the model and underlying data.

- `data/co2/antarctica2015co2composite-noaa.txt`
  - Coverage: ice-core composite, ~800 kyr BP to modern bridge
  - Source: https://www.ncei.noaa.gov/pub/data/paleo/icecore/antarctica/antarctica2015co2composite-noaa.txt
  - Runtime use: published gas ages and corrected CO₂ concentrations, with the provided one-standard-deviation measurement uncertainty. This is already the Bereiter et al. (2015) Antarctic composite, rather than raw data requiring another ice-core merge.

- `data/co2/rae2021co2-d11b-ph.txt`
  - Coverage: deep-time paleo CO2 (multi-Myr)
  - Source: https://www.ncei.noaa.gov/pub/data/paleo/climate_forcing/trace_gases/rae2021/rae2021co2-d11b-ph.txt
  - Retained for reference; no longer loaded into the default curve. `xco2`, `xco2_16pc`, `xco2_84pc`, sample age and site identify the individual estimates. The archive describes their bounds as illustrative; they do not include seawater boron-isotope systematic uncertainty.

- `data/co2/rae2021alkenone-co2diffusive.txt`
  - Coverage: deep-time paleo CO2 (multi-Myr)
  - Source: https://www.ncei.noaa.gov/pub/data/paleo/climate_forcing/trace_gases/rae2021/rae2021alkenone-co2diffusive.txt
  - Retained for reference; no longer loaded into the default curve. `co2_benthic` and its 16th/84th percentile columns use the compilation's benthic carbon-isotope correction; these are individual site estimates, not a continuous reconstruction.

- `data/co2/b_ca_tripati_2009.txt`
  - Coverage: deep-time paleo CO2 (multi-Myr)
  - Source: https://www.ncei.noaa.gov/pub/data/paleo/climate_forcing/trace_gases/Paleo-pCO2/b_ca_tripati_2009.txt
  - Retained for reference; no longer loaded into the curve. The earlier ad hoc proxy mixture has been replaced by the published CenCO₂PIP synthesis.

- `data/co2/daily_in_situ_co2_mlo.csv`
  - Coverage: 1958 CE to present (daily in-situ)
  - Sources:
    - https://scrippsco2.ucsd.edu/assets/data/atmospheric/stations/in_situ_co2/daily/daily_in_situ_co2_mlo.csv
    - https://scrippsco2.ucsd.edu/data/atmospheric_co2/mlo.html
  - Runtime use: valid daily ppm values before the first NOAA daily sample (1974), with the actual date and station retained. Later Scripps observations are not interleaved with NOAA.

- `data/co2/co2_daily_mlo.txt`
  - Coverage: modern NOAA daily era to present
  - Source: https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_daily_mlo.txt
  - Runtime use: valid daily ppm values from 1974 onward, without a reference offset or smoothing. Actual calendar dates are retained separately because rounded decimal-year values can fall just before a day boundary. NOAA includes Maunakea measurements during the 2022–2023 interruption at Mauna Loa; the source label identifies both sites.

### CO₂ combination method and limitations

NOAA provides the newest segment, Scripps the 1958–1974 continuation, and the published ice-core composite older samples. CenCO₂PIP supplies the deep-time segment, retaining only bin midpoints older than the oldest ice-core sample (about 805.7 ka). Its newest retained midpoint is 1.25 Ma; no endpoint is invented between that bin and the oldest ice-core sample. Source transitions remain marked and disconnected; neither the curve nor its shaded band bridges a join.

The deep-time line connects the median estimates of the published 500,000-year means. Its single shaded band is the 2.5th–97.5th percentile credible interval for those means, incorporating the model's proxy and age uncertainties. It is not the raw spread of proxy measurements, total systematic uncertainty, or the full range of changes within a bin. These averages cannot resolve orbital or shorter changes, and smoothing can obscure brief events. Broad trends over millions of years are the appropriate comparison; finer temperature features do not acquire reliable CO₂ counterparts simply by zooming in. The CO₂ inversion uses proxy CO₂ and ages, separately from the repository's temperature inversion; the chosen curve is not inferred by reversing our plotted temperature curve.

Modern concentrations and paleo estimates stay on their published ppm scales. Different calibration scales, site coverage, gas-age chronologies and averaging can affect comparability; no offset has been invented to remove those differences. Daily station records are not a global spatial average. Available station and ice-core samples are connected within each source; missing observation days do not break the CO₂ line or create gap markers. Connecting samples is a display convention, not a claim that intervening values were measured. Drawing fewer points when zoomed out preserves the extrema and source boundaries. Visible CO₂ scaling includes the shaded bounds; panels without a drawn uncertainty band continue to scale to their central values.

## Volcanic

- `data/volcanic/SAOD_merged_HolVol-v1_eVolv2k_v3_CMIP6_v3_-9500_to_2014_global_mean.csv`
  - Coverage: 9500 BCE to 2014 CE (project time -11,450 to 64)
  - Sources:
    - https://arggit.usask.ca/cj/eva-data-hub/-/raw/main/data/SAOD_merged_HolVol-v1_eVolv2k_v3_CMIP6_v3_-9500_to_2014.xlsx
    - https://cj.argpages.usask.ca/eva-data-hub/
  - Runtime use: unchanged annual global mean values from the provider's merged product. HolVol v1 supplies −9500 to −501 CE, eVolv2k v3 supplies −500 to 1900, and CMIP6 v3 supplies 1901–2014, following the provider's Holocene combination specification. Component boundaries are marked and disconnected for provenance, without recalibration.
  - This is stratospheric aerosol optical depth, not an eruption count or direct sulfur emission rate. The early HolVol segment uses fewer ice cores and has greater reconstruction uncertainty than eVolv2k. The CMIP6 segment itself includes multiple observational/reconstruction inputs whose internal changes cannot be tagged from this two-column annual CSV.

## Solar Irradiance

- `data/solar/SATIRE-M/SSI_14C_cycle_yearly_cmip_v20160613_fc.txt`
  - Coverage: 6754.5 BCE to 2015.997 CE (yearly cadence before 1850, daily after)
  - Product: PMIP4 SATIRE-M 14C, CMIP6-scaled (`fc`), recommended for PMIP4-CMIP6 tier-1 past1000
  - Source: https://pmip4.lsce.ipsl.fr/doku.php/data:solar_satire
  - https://sharebox.lsce.ipsl.fr/index.php/s/LpiCUCkSmx0P6bb
  - Original build input, **not bundled in this checkout**. The compact CSV below is bundled. The spectral integration cannot be independently reproduced here without obtaining this original input.

- `data/solar/SATIRE_M_TSI_14C_fc.csv`
  - Coverage: project time ~[-8704.5, 65.9973]
  - Type: compact runtime TSI derivative used by `sketch.js`
  - Build: `python scripts/build_satire_tsi.py` (TSI computed as `sum(SSI * wavelength_bin)` for each time step)
  - This is already a **PMIP4/CMIP6 composite**, despite the abbreviated filename. The retained components are SATIRE-M before 1610, SATIRE-T for 1610–1849, and the CMIP6 SATIRE/NRL mixture from 1850 until the NNL continuation begins in 1874. The component identities follow the author's data page and PMIP4 documentation; all identifiable boundaries are marked and disconnected.
  - Author component documentation: https://www2.mps.mpg.de/projects/sun-climate/data_body.html
  - Reader documentation: https://www2.mps.mpg.de/projects/sun-climate/data/PMIP6/readme.txt
  - PMIP4 combination paper: https://doi.org/10.5194/gmd-10-4005-2017
  - Before 1850, values are annual means at the published mid-year timestamps. From 1850, rounded decimal years are converted by rounding the Gregorian day index, following the author's reader. Directly flooring these dates can label a daily value one day early, spoiling paired-date calibration. Irradiance values are unchanged by this date correction.

- `data/solar/nnl_tsi_P1D.txt`
  - Coverage: ~late 1800s to near-present (daily)
  - Type: continuation segment merged on top of SATIRE in `sketch.js`
  - Source: https://lasp.colorado.edu/lisird/latis/dap/nnl_tsi_P1D.txt
  - Metadata: https://lasp.colorado.edu/lisird/latis/dap/nnl_tsi_P1D.das
  - Product identity: NASA/NOAA/LASP NNL daily TSI model, rather than NRLTSI2. The text time column is days since 1610-01-01; it is converted using the Gregorian calendar instead of dividing by a fixed mean year length.

- `data/solar/tsis_tsi_24hr.txt`
  - Coverage: recent years to present (24-hour cadence)
  - Type: latest continuation segment merged on top of NNL in `sketch.js`
  - Source: https://lasp.colorado.edu/lisird/latis/dap/tsis_tsi_24hr.txt
  - Metadata: https://lasp.colorado.edu/lisird/latis/dap/tsis_tsi_24hr.das
  - Documentation: https://lasp.colorado.edu/media/projects/tsis/documentation/README.TSIS.pdf
  - Runtime use: nominal Julian date (first column) and daily TSI at 1 AU (second column). Julian date is converted with the standard Unix epoch JD 2440587.5, then to a Gregorian decimal year. Zero TSI denotes missing data and is skipped. Column 14 is a **provisional flag** (1 preliminary, 0 final), not a quality flag for discarding all flagged readings.

### Solar combination method and limitations

All solar values represent total solar irradiance at **1 AU**, excluding the variation caused solely by Earth's changing distance from the Sun. TSIS observations retain their measured level. Extremes are not removed merely for being unusually large or small: solar rotation, sunspots and the approximately 11-year activity cycle produce real variations (https://scdi.smce.nasa.gov/solar_data_access.html). Zeros/missing values are omitted according to provider metadata; provisional TSIS readings remain visible and labelled but do not calibrate the models.

For each calibration, pair the two records by the **same Gregorian date**. Average their paired daily differences within each calendar month, require at least 15 paired days per month and 12 qualifying months overall, then use the **median of those monthly differences** as one constant offset. This avoids comparing differently sampled days and reduces the influence of exceptional months, without deleting plotted readings or scaling variability. Insufficient paired coverage returns an unavailable offset rather than an invented estimate; calibration diagnostics record coverage and median absolute residual deviation. That residual spread is a diagnostic, not a confidence interval or a complete uncertainty estimate.

NNL is aligned to final TSIS observations over their available overlap. The PMIP4 base is then aligned to the adjusted NNL over the **first 22 years of overlap near the 1874 join**, roughly two solar cycles, instead of averaging changing model differences across 140 years. The interval is selected by this fixed rule, not tuned to make endpoint values meet. One common offset is applied to every PMIP4 component, preserving the provider's internal combination. With the bundled snapshots: NNL offset **+0.24962201 W/m²**, from 83 qualifying months / 2,157 matched days (2018-02-01 to 2024-12-31); PMIP4 offset **+1.02177973 W/m²**, from 264 months / 8,028 matched days (1874-05-09 to 1896-04-30). The 50-day-mean step at the 1874 join falls from about 0.2064 to **0.0539 W/m²**; the 2018 step is about −0.0207 W/m². Small remaining differences are retained and the joins stay disconnected.

These offsets are an **application alignment**, not an author-validated homogeneous solar product. Models differ in long-term trends and cycle amplitudes; a constant shift cannot reconcile those differences everywhere. Real solar changes can also occur between samples on opposite sides of a join. A smoother boundary is not evidence that the ancient baseline is known precisely. The current sources do not supply a comparable, complete uncertainty range for the whole composite, so no synthetic confidence band is drawn.

For views spanning more than **200 years**, the panel shows **annual means**, matching the older annual record's temporal resolution. Each year's available raw daily values are averaged separately within each retained source; the 50-day-smoothed values are not averaged again. Missing days are not filled. Partial years and short source fragments are labelled, include their sample count and coverage dates in the tooltip, and sit at the midpoint of actual coverage. An annual mean from incomplete observations can have sampling bias. Source joins remain disconnected. Older published annual values and their timestamps are unchanged.

For narrower views, the original daily sample dates return with the existing centered 50-day arithmetic mean from 1850 onward. Endpoint windows are shorter and no window blends sources. The panel caption always identifies its averaging. TSIS gaps longer than seven days break the detailed line; annual means only break for missing years or source changes. Both representations are rebuilt from the immutable PMIP4 base and accumulated raw TSIS observations, so identical refreshes remain identical and partial downloads retain local data.

Alternatives reviewed: the final CMIP7 historical solar forcing v4.6 covers 1850–2023 and uses an NNL-based reference reconstruction (https://www.solarisheppa.kit.edu/75.php; https://doi.org/10.5194/gmd-17-1217-2024). Updated SATIRE-S (since 1974) is available from the model authors (https://doi.org/10.1051/0004-6361/202554044; author data page above). Neither alone provides the full 9,000-year context; both would still need a documented historical join. CMIP7 scenario files include future simulated solar activity and must not be treated as recent observations. This review keeps the current source snapshots and improves their combination and presentation.

## Sea Level

- `data/sealevel/miller2024-sealevel.txt`
  - Coverage: deep-time to Quaternary (see source metadata)
  - Source: https://www.ncei.noaa.gov/pub/data/paleo/paleocean/global/miller2024/miller2024-sealevel.txt
  - Publication: https://doi.org/10.3389/esss.2023.10091
  - Runtime use: `Age` in kyr BP and `GMGSL` in metres (column 12), the author's global mean geocentric estimate combining barystatic, thermosteric and ocean basin-volume changes. This uses the global estimate rather than a coastal relative sea-level or barystatic-only column.

- `data/sealevel/kopp2016-global.txt`
  - Coverage: Common Era coastal relative sea-level samples; retained for reference but not plotted as a global series
  - Source: https://www.ncei.noaa.gov/pub/data/paleo/reconstructions/ocean/kopp2016/kopp2016-global.txt

- `data/sealevel/gslGPChange2014.txt`
  - Coverage: monthly global reconstruction, 1807–2010 CE
  - Runtime use: GSL in millimetres (column 4) and the published reconstruction error (column 5), converted to metres. All twelve months of 1950 define the tide-gauge zero reference. The provider describes a reconstruction from 1,277 tide gauges with corrections for glacial isostatic adjustment; it is not a simple mean of local relative levels.
  - Sources:
    - https://psmsl.org/products/reconstructions/gslGPChange2014.txt
    - https://psmsl.org/products/reconstructions/

- `data/sealevel/gmsl_2026rel2_seasons_retained.txt`
  - Coverage: 1992-12-17 to 2026-06-27 (1,203 satellite observations in this snapshot)
  - Sources:
    - https://sealevel.colorado.edu/files/2026_rel2/gmsl_2026rel2_seasons_retained.txt
    - https://sealevel.colorado.edu/data/2026rel2-0
  - Downloaded and checked: 2026-10-01. SHA-256: `862cd6728dba3751724250ed45d3b62bcfa2552fbc2ae605bf7d90f4b0472136`.
  - Runtime use: decimal year and global mean sea-level variation in mm (columns 1–2), converted to metres. The seasons-retained product is used consistently for the local snapshot and remote refresh. Its arbitrary reference is replaced by a constant offset estimated against the rebased tide-gauge reconstruction.
  - Release 2 extends the observations through mid-2026 and retains the same units, seasonal convention and GIA-removed header. The older release-1 file stays on disk as a previous snapshot and is excluded from runtime. The scheduled updater checks https://sealevel.colorado.edu/data for newer release labels and reports them in the Actions log; changing releases requires checking the matching product and updating the manifest and browser source together.

### Sea-level combination method and limitations

The former geological and instrumental buttons are one **Global sea level** view. The modern reference is the Jevrejeva 1950 annual mean. Colorado is aligned to that curve by averaging satellite measurements into calendar months, comparing only matching months within the actual 1992–2010 overlap, and averaging the monthly differences equally. With the bundled snapshots, subtract 0.06986125 m from Jevrejeva and add 0.07363510 m to Colorado. Variability, ages and uncertainty widths are preserved. Colorado supplies the satellite-era segment; Jevrejeva supplies earlier monthly samples.

Miller is rebased separately by subtracting its published zero-age GMGSL value of −0.83 m, setting that point to zero. This is only an approximate compatible geological reference under the archive's BP convention, not an observed 1950 calibration. Geological samples are retained only before the earliest tide-gauge sample. Consequently the newest retained geological point is about 640.2 CE and the first tide-gauge sample is 1807.5417 CE. That interval is shaded and labelled as a gap, with no interpolation. All source joins are disconnected.

The three sources differ in temporal resolution, datum definitions, land-motion/basin corrections, sampling and uncertainty. An offset cannot remove those differences. Miller's derived thermosteric and ice-volume estimates also depend on temperature-related inputs, so this is not an independent test of temperature–sea-level correlation. Geological uncertainty is not tabulated point by point here; its metre-scale estimates are not comparable to modern millimetre precision. Duplicate published ages/values are retained without inventing an average.

The Kopp archive contains local coastal samples, not the published global posterior curve. It remains excluded. Filling the gap would require obtaining a published global Common Era reconstruction and validating its reference and temporal resolution; merging the local points would give a misleading result.

## Population

- `data/population/population-long-run-with-projections.csv`
  - Coverage: long-run historical to near-future projections
  - Source: https://ourworldindata.org/grapher/population-long-run-with-projections.csv
  - Runtime use: only `World` / `OWID_WRL`. Prefer the historical `Population` column when supplied; use the projection column otherwise. The bundled historical series ends in 2023; 2024 onward are projections, labelled in tooltips and drawn as dashed lines. Years beyond the current calendar year are excluded.
  - Historical values are already a provider composite and remain unchanged. This CSV has no per-row provenance for the historical component estimates; internal source transitions are not inferred or given invented markers. Population estimates and projections have uncertainty that is not supplied in this file.
