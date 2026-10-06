# Data sources and methods

This catalog documents the files, coverage, reference conversions and uncertainty used by the browser's `js/data/` modules. Coverage and calibration values refer to the documented snapshots; observation updates can change them. Exact source versions, retrieval dates and checksums provide provenance.

[Temperature](#temperature) · [CO₂](#co2) · [Sea level](#sea-level) · [Solar](#solar-irradiance) · [Orbit](#orbital) · [Volcanic aerosols](#volcanic) · [Population](#population) · [Timeline](#timeline-context) · [Reference archives](#reference-archives)

## Conventions

- The shared time coordinate is `yearCE − 1950`. BP means years before 1950; paleo ages use `time = −ageBP`. `ka` is a thousand years and `Ma` a million years. The orbital solution uses its documented J2000 epoch, converted to this shared axis.
- Each source keeps its published sample dates, evaluation grid or stage intervals. Lines connect samples within a source. Source changes have disconnected lines and bands, with dashed markers. In crowded views, older visible join labels take priority.
- Most panels scale to visible central values, drawn uncertainty bounds and a continuous line or band's intersection with the left edge. Orbital eccentricity keeps a fixed vertical range. Scaling changes the display, not the stored observations.
- Tooltips identify the sample source, date or interval, averaging period and supplied uncertainty. Solar labels also identify partial-year coverage and provisional values. Published uncertainty measures differ and exclude additional cross-source alignment uncertainty; horizontal dating uncertainty is not drawn.
- Source files listed under **Reference archives** are excluded from the displayed curves. Provider documentation and licenses remain with their datasets.

Current GISS, NOAA, TSIS and Colorado observations are eligible for updates on the 1st and 16th of each month. `update-sources.json` defines the providers and units; `update-metadata.json` records retrieval dates, coverage, counts and checksums. The updater validates complete snapshots before saving. Reference offsets are recomputed from the loaded observations. See [Development and maintenance](../docs/DEVELOPMENT.md) for commands and workflow setup.

## Orbital

- `data/orbit/zeebe2019orbital.txt`
  - File coverage: 100,000–0 kyr BP, with 1.6 kyr sample spacing
  - Source: https://www.ncei.noaa.gov/pub/data/paleo/climate_forcing/orbital_variations/zeebe2019orbital.txt
  - Epoch documentation: https://doi.org/10.1029/2025PA005287 (Kocken & Zeebe 2026, section 2.1, explicitly identifies ZB18a's epoch as J2000.0)
  - Runtime use: eccentricity at the published relative ages, `time = 2000 - 1950 - age_kyr * 1000`. The astronomical epoch is 2000 CE, despite the NOAA file's generic calendar-BP label. The same constant conversion applies to every sample. Zero age is not moved to today's date. The file has no recent daily observations, so a sufficiently recent view is empty; wider views may show only the single 2000 CE point.
  - Only 58–0 Ma is drawn. The authors explicitly caution that the supplied 100–58 Ma interval is unconstrained due to chaos. Omitting that interval prevents visually precise phase comparisons with temperature there; it does not assert zero dating or phase uncertainty in the retained interval.

## Temperature

- `data/temperature/phanda2024-percentiles.csv` (PhanDA / Judd et al. 2024)
  - Product: Emily J. Judd et al., *A 485-million-year history of Earth's surface temperature*, Science 385, eadk3705 (2024).
  - Publication: https://doi.org/10.1126/science.adk3705
  - Author repository and methods: https://github.com/EJJudd/PhanDA
  - Pinned original CSV: https://raw.githubusercontent.com/EJJudd/PhanDA/9f06c0d9764f3da77cb0819e0ac87c01182ba341/5_Outputs/PhanDA_GMSTandCO2_percentiles.csv
  - Downloaded: 2026-10-06. SHA-256, normalizing CRLF to LF: `22cad7964bac3b679ad83bf8a9c83eb66e995898a01eb9e93142087b2d4f6e1f`.
  - The complete original 85-row CSV is archived without column removal, resampling or rounding. `UpperAge` is the younger boundary, `LowerAge` the older boundary, and `AverageAge` the author's representative date, all in millions of years. Preserve `AverageAge` rather than recomputing it; the Ypresian date is not the exact arithmetic midpoint of its listed bounds.
  - `GMST_50` is the ensemble median global near-surface air temperature in absolute °C; `GMST_05` and `GMST_95` are the 5th/95th percentiles. The band is a **90% ensemble range**, not 95% or ±2σ. The source also publishes 16th/84th percentiles and CO₂ columns; those additional columns are archived but not used by this app.
  - Runtime use: 63 complete stages with younger boundaries at or older than 66 Ma. Plot `time = -AverageAge * 1,000,000`, from 69.085 to 481.965 million BP. The oldest represented interval spans 477.08–486.85 Ma; the approximate 485 Ma title does not justify changing the original dates or inventing an endpoint. Tooltips display the actual interval boundaries.
  - PhanDA combines the PhanSST marine proxy database with HadCM3L model priors and alternative seawater-chemistry assumptions. Geological stages commonly span several million years. Connecting representative ages is a display of broad trends, not a reconstruction of every intervening instant or of brief glacial extremes. The plotted vertical ensemble range does not include horizontal age uncertainty or every structural model error.
  - Older suitable proxy evidence is sparse: https://news.arizona.edu/news/study-over-nearly-half-billion-years-earths-temperature-has-changed-drastically-driven-carbon. The composite uses only the documented PhanDA stages.

- `data/temperature/Table.txt` (Hansen)
  - Coverage: deep-time Cenozoic (~66 Myr BP to near-present)
  - Source: https://www.columbia.edu/~mhs119/Sensitivity%2BSL%2BCO2/Table.txt
  - Publication: https://doi.org/10.1098/rsta.2012.0294
  - Reference definition: https://arxiv.org/pdf/1211.4846 (section 4, absolute global mean of 14 °C for 1961–1990)
  - Runtime use: smoothed age and global surface temperature `Ts` columns; only ages older than 2 million BP and younger than 66 million BP, with 14 °C subtracted. This preserves the author's proxy-to-global-temperature conversion; it is not a direct thermometer record. Hansen's 4.5 °C Last Glacial Maximum–Holocene calibration produces substantially smaller cooling than Osman; Snyder supplies the 24–2000 ka segment. Hansen retains its independent reference and variability.

- `data/temperature/snyder2016-supplement.xlsx` (Snyder 2016)
  - Product: Carolyn W. Snyder, *Evolution of global temperature over the past two million years*, Nature 538, 226–228 (2016).
  - Publication: https://doi.org/10.1038/nature19798
  - Exact publisher workbook: https://static-content.springer.com/esm/art%3A10.1038%2Fnature19798/MediaObjects/41586_2016_BFnature19798_MOESM258_ESM.xlsx
  - Downloaded: 2026-10-06. SHA-256: `8ef09c959caf0fdaa27153bdcdcb5c8c51fcf7d3e88f893f5c7152ba9f4334ae`.
  - Source: first worksheet, `GAST reconstruction`. Coverage: 1–2000 ka BP on a 1 ka evaluation grid. Published reference: mean over 0–5 ka BP. `GAST` is global average surface temperature, estimated from spatially weighted marine sea-surface proxies with the author's climate-model conversion already applied. It is not an unconverted ocean-only or Antarctic temperature record.
  - `data/temperature/snyder2016-gast.csv` preserves all 2000 published ages, 50th percentile medians and 2.5th/97.5th percentile bounds without rounding, resampling, baseline changes or additional scaling. Rebuild using `python scripts/build_snyder_temperature.py`; no network or extra packages are required. The script verifies the original workbook checksum, reference definition, quantile labels, complete evaluation grid and valid bounds before writing.
  - Runtime use: `time = -age_ka_bp * 1000`, retaining only ages 24–2000 ka BP (1977 rows); Osman supplies the younger segment and Hansen ages older than 2000 ka. The median and both bounds receive the same constant reference shift described below.
  - Shading: published 2.5th–97.5th percentile empirical interval (95%) from Monte Carlo-style simulations, incorporating proxy, dating, spatial weighting, record resampling and sea-surface-to-global-temperature conversion uncertainties. It excludes the application's baseline-alignment uncertainty. The author's conversion uses a model-derived factor of 1.9 with uncertainty; the application does not repeat or modify it.
  - The 1 ka grid is not an effective 1 ka resolution or 1 ka mean. The author's kernel reconstruction is smoothed by dating uncertainty (typically a 10 ka 95% interval unless more specific dating estimates exist). Rapid transitions and exact timings of minima should not be compared as if these were independent millennial observations. The global conversion assumes a constant relationship across the 2 million years, and proxy coverage becomes sparser further back.

- `data/temperature/LGMR_GMST_climo.nc` (Osman et al. 2021)
  - Coverage: 24,000–0 BP; 120 bin midpoints at 100, 300, …, 23,900 BP, each representing 200 years
  - Source: https://www.ncei.noaa.gov/pub/data/paleo/reconstructions/osman2021/LGMR_GMST_climo.nc
  - Metadata: https://www.ncei.noaa.gov/pub/data/paleo/reconstructions/osman2021/readme-osman2021.txt
  - Publication: https://doi.org/10.1038/s41586-021-03984-4
  - Downloaded: 2026-10-01
  - Source SHA-256: `3c62f06b89a2f613d914bce77200358305e13279236fd6d1db48671bea3a4bb1`
  - Variables: `age` (bin midpoint, years before 1950), `gmst` (global mean annual air temperature in °C), `gmst_std` (500-member ensemble standard deviation in °C). Shading shows mean ±this published standard deviation (±1σ), with the same constant baseline offset applied to both bounds; it is not labelled a 95% interval or doubled to ±2σ.
  - `data/temperature/osman2021-gmst.csv` is the compact browser derivative; regenerate with `python scripts/build_osman_gmst.py` (requires `h5py`). No calibration, smoothing or interpolation occurs in that extraction.

- `data/temperature/Full_ensemble_median_and_95pct_range.txt` (Neukom PAGES2k)
  - Coverage: Common Era to present
  - Source: https://www.ncei.noaa.gov/pub/data/paleo/pages2k/neukom2019temp/recons/Full_ensemble_median_and_95pct_range.txt
  - Runtime use: annual median and 2.5th/97.5th percentiles for 1–1879 CE. Shading shows these published percentiles as the 95% ensemble range, without treating them as symmetric ±2σ bounds. Published April–March anomalies relative to 1961–1990 are unchanged.

- `data/temperature/GLB.Ts+dSST.txt` (NASA GISS)
  - Coverage: 1880 CE to present
  - Source: https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.txt
  - Runtime use: monthly anomalies from 1880 onward, converted from hundredths of °C. Subtract the 360-month mean for January 1961–December 1990 to change from the 1951–1980 reference to 1961–1990. The bundled snapshot gives an offset of −0.0993333333 °C.

### Temperature combination method and limitations

The composite uses GISS from 1880 onward, PAGES2k for 1–1879 CE, Osman at bin midpoints 2100–23,900 BP, Snyder at its evaluation dates 24,000–2,000,000 BP, Hansen from 2 to 66 million BP, and PhanDA for complete stages older than 66 million BP. BP always means years before 1950. Actual samples remain at their original timestamps; missing endpoints are not invented. Every source boundary breaks the line and has a dashed marker located between the two neighboring samples. The PhanDA/Hansen marker uses their defined 66 Ma handoff rather than the midpoint between representative dates.

PhanDA's absolute median and both published bounds receive the same constant −14 °C shift as Hansen. This adopts Hansen's absolute 1961–1990 reference for the display; it is an explicit application assumption, not a measured PhanDA baseline or an overlap fit. The two sources need not meet. Their neighboring estimates are Hansen at 65.5228 Ma (23.29 °C absolute) and PhanDA's Maastrichtian at 69.085 Ma (24.5068077268 °C absolute), a 1.2168077268 °C difference across 3.5622 million years. That break is not evidence of an abrupt climate event. In the unused 59.24–66 Ma PhanDA interval the median is about 28.85 °C, versus a time-weighted Hansen mean of 24.51 °C over its available 59.24–65.5228 Ma overlap. Different methods, sampling and averaging explain why endpoint matching cannot make the sources homogeneous.

Osman is aligned to PAGES2k over 150–1750 CE: its eight bin midpoints from 1700 to 300 BP each represent a complete 200-year interval. For each bin, average the 200 annual PAGES2k values over that same interval, then subtract the Osman value. Average those eight differences and add that one constant to every Osman mean and uncertainty bound. The documented snapshots give an offset of −13.7040599625 °C. This estimates a compatible anomaly reference; it does not validate either reconstruction or remove disagreements at the joins. Hansen uses its published 14 °C reference independently and is not fitted to Osman.

Snyder's published anomalies already reference the 0–5 ka average. Add the aligned Osman mean over the same 0–5,000 BP interval: all 25 complete 200-year bins at 100–4900 BP. Equal weighting is appropriate for these equal-duration bins. The documented reference shift is −0.3692762585 °C, applied unchanged to every Snyder median and uncertainty bound. Do not fit the Last Glacial Maximum values, renormalize the median curve, match endpoint values or scale glacial amplitudes. This application assumption transfers Osman's uncertainty in its Holocene trend and anomaly reference; that additional uncertainty is not quantified in the band.

In the documented snapshots, neighboring Osman/Snyder estimates differ by about 0.25 °C at 23,900 and 24,000 BP. Snyder has an earlier central minimum of −7.58 °C at 802 ka BP, comparable to Osman's −7.63 °C at 17.9 ka BP. This does not establish which glacial maximum was coldest: their uncertainty bounds and methods differ, and the finer Osman series resolves sharper minima. The Hansen/Snyder join differs by about 1.53 °C at 2,000,600 and 2,000,000 BP and is marked and disconnected. Differing methods and resolution prevent precise rankings of cold extremes across the composite.

No standard-deviation matching, amplitude scaling, cross-fading or added smoothing is used for the temperature composite. Shading and hover ranges retain PhanDA's 90% ensemble range, PAGES2k's 95% ensemble interval, Snyder's 95% reconstruction interval and Osman's ±1σ ensemble spread. These are different measures; none includes the added uncertainty of the cross-source alignment. The bands describe value bounds at the published dates, without displaying horizontal dating uncertainty. GISS and Hansen uncertainty is not quantified in the loaded files or this interface.

The component products use different definitions (including blended air/sea surface temperature versus near-surface air temperature), calibration assumptions, temporal resolution and dating methods. They are global estimates, but the composite is not a homogeneous climate data product. Use it for broad educational context. Do not infer precise warming rates or causal lags across joins, or interpret a coarse ancient point as equivalent to a modern monthly observation. Other Holocene reconstructions can disagree with Osman's trend. Its assimilation also uses model priors with greenhouse-gas forcing, so the temperature–CO₂ comparison is not fully independent.

## CO2

- `data/co2/foster2017-supplement-data2.xlsx`
  - Product: Foster, Royer & Lunt (2017), *Future climate forcing potentially without precedent in the last 420 million years*, Nature Communications 8, 14845. Publication: https://doi.org/10.1038/ncomms14845 (CC BY 4.0).
  - Original Supplementary Data 2, linked by the authors at https://www.thefosterlab.org/our-publications: https://www.thefosterlab.org/s/ncomms14845-s3-1.xlsx. Retrieved 2026-10-06; SHA-256 `4663a546566858dbef345c638aef6888d34d64d20eb6b432c2748954e10ac17f`.
  - Worksheet `LOESS Fit`: all 840 ages from 0.0039 to 419.5039 Ma, spaced by 0.5 Ma. The central column is **pCO₂ probability maximum**, not a median, in ppm; the remaining columns are the published 68% and 95% confidence limits. The Monte Carlo LOESS reconstruction incorporates proxy-value and age uncertainty. The evaluation grid does not mean independent 500,000-year observations or 500,000-year averages.
  - `data/co2/foster2017-loess.csv` preserves every numeric cell of these six columns, including 124 negative 95% lower bounds produced by the unconstrained smoother. Rebuild offline with `python scripts/build_foster_co2.py`; standard library only. The extraction verifies checksum, worksheet, header meanings, full age grid and ordered confidence limits before writing.
  - Runtime use: retain 708 ages at or older than 66 Ma, beginning at 66.0039 Ma. Plot the unchanged central estimate with its **68%** confidence range, which is positive throughout. The 95% range is retained for inspection, but is neither clipped to zero nor drawn as physically possible negative concentrations. Different datasets' band probabilities are identified separately in the tooltip and info dialog.

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
  - Runtime use: published gas ages and corrected CO₂ concentrations, with shading at concentration ±the provided one-standard-deviation measurement uncertainty (±1σ). These bounds exclude gas-age uncertainty and do not describe all short-term variability blurred by the record. The provider uses the average uncertainty for a system/record where individual measurement deviations were unavailable. No concentration offset or new uncertainty estimate is added. The input is the published Bereiter et al. (2015) Antarctic composite.

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

Foster supplies ages older than the Cenozoic boundary at 66 Ma, with that handoff explicitly marked; CenCO₂PIP supplies the retained Cenozoic bins. Both reconstructions retain their published ppm values, without fitting or rescaling. The neighboring Foster estimate is 228.84 ppm at 66.0039 Ma, versus CenCO₂PIP's 978.82 ppm at 65.75 Ma, with non-overlapping displayed intervals. This disagreement reflects different proxy compilations, treatments and smoothing, as well as different representative ages; it must not be interpreted as a measured abrupt change at 66 Ma. The extension is useful for broad older trends, not for ranking exact peaks or measuring correlations across the join. CO₂ ends at its published 419.5039 Ma sample even though temperature reaches older ages.

The CenCO₂PIP line connects medians of published 500,000-year means. Its shaded band is the 2.5th–97.5th percentile credible interval for those means, incorporating the model's proxy and age uncertainties. It is not the raw spread of proxy measurements, total systematic uncertainty, or the full range of changes within a bin. These averages cannot resolve orbital or shorter changes, and smoothing can obscure brief events. Broad trends over millions of years are the appropriate comparison; finer temperature features do not acquire reliable CO₂ counterparts simply by zooming in. The CO₂ inversion uses proxy CO₂ and ages, separately from the repository's temperature inversion; the chosen curve is not inferred by reversing our plotted temperature curve.

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

- `.cache/solar/SSI_14C_cycle_yearly_cmip_v20160613_fc.txt.gz`
  - Coverage: 6754.5 BCE to 2015.997 CE (yearly cadence before 1850, daily after)
  - Product: PMIP4 SATIRE-M 14C, CMIP6-scaled (`fc`), recommended for PMIP4-CMIP6 tier-1 past1000
  - Source: https://pmip4.lsce.ipsl.fr/doku.php/data:solar_satire
  - https://sharebox.lsce.ipsl.fr/index.php/s/LpiCUCkSmx0P6bb
  - Exact provider download: https://www2.mps.mpg.de/projects/sun-climate/data/PMIP6/SSI_14C_cycle_yearly_cmip_v20160613_fc.txt.gz
  - Original build input, cached locally rather than included in the website or repository. The compressed source is 633,841,999 bytes. SHA-256: `61956041de06ecae484eb75e3ed40792a7e9901e898bbc3cee7d8eadb20456a8`.
  - `python scripts/verify_solar_source.py` downloads and verifies this exact input, streams its integration and compares every output row with the bundled CSV. `--offline` reuses the verified cache. A manual GitHub workflow runs the same check. Neither command changes the bundled dataset.
  - Verification: all 69,235 rows match the original input exactly (2026-10-05). The input/output checksums and row count are pinned in `data/solar/build-source.json`. The output SHA-256 after normalizing CRLF to LF is `65751933b4590d37b0129f4c31af84c0cb12d60225b9e9770689200d1683e4db`.

- `data/solar/SATIRE_M_TSI_14C_fc.csv`
  - Coverage: project time ~[-8704.5, 65.9973]
  - Type: compact runtime TSI derivative used by `js/data/solar.js`
  - Build: `python scripts/build_satire_tsi.py` (TSI computed as `sum(SSI * wavelength_bin)` for each time step)
  - This is already a **PMIP4/CMIP6 composite**, despite the abbreviated filename. The retained components are SATIRE-M before 1610, SATIRE-T for 1610–1849, and the CMIP6 SATIRE/NRL mixture from 1850 until the NNL continuation begins in 1874. The component identities follow the author's data page and PMIP4 documentation; all identifiable boundaries are marked and disconnected.
  - Author component documentation: https://www2.mps.mpg.de/projects/sun-climate/data_body.html
  - Reader documentation: https://www2.mps.mpg.de/projects/sun-climate/data/PMIP6/readme.txt
  - PMIP4 combination paper: https://doi.org/10.5194/gmd-10-4005-2017
  - Before 1850, values are annual means at the published mid-year timestamps. From 1850, rounded decimal years are converted by rounding the Gregorian day index, following the author's reader. Directly flooring these dates can label a daily value one day early, spoiling paired-date calibration. Irradiance values are unchanged by this date correction.

- `data/solar/nnl_tsi_P1D.txt`
  - Coverage: ~late 1800s to near-present (daily)
  - Type: continuation segment merged on top of SATIRE in `js/data/solar.js`
  - Source: https://lasp.colorado.edu/lisird/latis/dap/nnl_tsi_P1D.txt
  - Metadata: https://lasp.colorado.edu/lisird/latis/dap/nnl_tsi_P1D.das
  - Product identity: NASA/NOAA/LASP NNL daily TSI model, rather than NRLTSI2. The text time column is days since 1610-01-01; it is converted using the Gregorian calendar instead of dividing by a fixed mean year length.

- `data/solar/tsis_tsi_24hr.txt`
  - Coverage: recent years to present (24-hour cadence)
  - Type: latest continuation segment merged on top of NNL in `js/data/solar.js`
  - Source: https://lasp.colorado.edu/lisird/latis/dap/tsis_tsi_24hr.txt
  - Metadata: https://lasp.colorado.edu/lisird/latis/dap/tsis_tsi_24hr.das
  - Documentation: https://lasp.colorado.edu/media/projects/tsis/documentation/README.TSIS.pdf
  - Runtime use: nominal Julian date (first column) and daily TSI at 1 AU (second column). Julian date is converted with the standard Unix epoch JD 2440587.5, then to a Gregorian decimal year. Zero TSI denotes missing data and is skipped. Column 14 is a **provisional flag** (1 preliminary, 0 final), not a quality flag for discarding all flagged readings.

### Solar combination method and limitations

All solar values represent total solar irradiance at **1 AU**, excluding the variation caused solely by Earth's changing distance from the Sun. TSIS observations retain their measured level. Extremes are not removed merely for being unusually large or small: solar rotation, sunspots and the approximately 11-year activity cycle produce real variations (https://scdi.smce.nasa.gov/solar_data_access.html). Zeros/missing values are omitted according to provider metadata; provisional TSIS readings remain visible and labelled but do not calibrate the models.

For each calibration, pair the two records by the **same Gregorian date**. Average their paired daily differences within each calendar month, require at least 15 paired days per month and 12 qualifying months overall, then use the **median of those monthly differences** as one constant offset. This avoids comparing differently sampled days and reduces the influence of exceptional months, without deleting plotted readings or scaling variability. Insufficient paired coverage stops the combination with a visible error rather than substituting a zero offset; calibration diagnostics record coverage and median absolute residual deviation. That residual spread is a diagnostic, not a confidence interval or a complete uncertainty estimate.

NNL is aligned to final TSIS observations over their available overlap. The PMIP4 base is then aligned to the adjusted NNL over the **first 22 years of overlap near the 1874 join**, roughly two solar cycles, instead of averaging changing model differences across 140 years. The interval is selected by this fixed rule, not tuned to make endpoint values meet. One common offset is applied to every PMIP4 component, preserving the provider's internal combination. With the bundled snapshots: NNL offset **+0.24962201 W/m²**, from 83 qualifying months / 2,157 matched days (2018-02-01 to 2024-12-31); PMIP4 offset **+1.02177973 W/m²**, from 264 months / 8,028 matched days (1874-05-09 to 1896-04-30). The neighboring 50-day means differ by **0.0539 W/m²** at the 1874 join and about −0.0207 W/m² at the 2018 join. Small remaining differences are retained and the joins stay disconnected.

These offsets are an **application alignment**, not an author-validated homogeneous solar product. Models differ in long-term trends and cycle amplitudes; a constant shift cannot reconcile those differences everywhere. Real solar changes can also occur between samples on opposite sides of a join. A smoother boundary is not evidence that the ancient baseline is known precisely. The current sources do not supply a comparable, complete uncertainty range for the whole composite, so no synthetic confidence band is drawn.

For views spanning more than **200 years**, the panel shows **annual means**, matching the older annual record's temporal resolution. Each year's available raw daily values are averaged separately within each retained source; the 50-day-smoothed values are not averaged again. Missing days are not filled. Partial years and short source fragments are labelled, include their sample count and coverage dates in the tooltip, and sit at the midpoint of actual coverage. An annual mean from incomplete observations can have sampling bias. Source joins remain disconnected. Older published annual values and their timestamps are unchanged.

For views spanning 200 years or less, daily sample dates are shown with a centered 50-day arithmetic mean from 1850 onward. Endpoint windows are shorter and no window blends sources. Tooltips identify the averaging period. TSIS gaps longer than seven days break the detailed line; annual means only break for missing years or source changes. Both representations are rebuilt on page load from the bundled PMIP4 base and raw TSIS observations; identical snapshots produce identical results. TSIS snapshot updates are validated by the GitHub updater.

## Sea Level

- `data/sealevel/marcilly2024-modern-land.csv`
  - Product: Marcilly, Torsvik & Conrad (2022), *Global Phanerozoic sea levels from paleogeographic flooding maps*, corrected in 2024. Publications: https://doi.org/10.1016/j.gr.2022.05.011 and https://doi.org/10.1016/j.gr.2024.01.006.
  - Source: column 8, **Modern land sea level**, relative metres, of corrected Table 1. Author-hosted correction: https://www.clintconrad.no/papers/Marcilly_etal_GR2022err.pdf. The exact two-page correction is bundled as `marcilly2024-correction.pdf`; retrieved 2026-10-06, SHA-256 `6ea8ebacfb6186a98de74e3084689458cfd9c7e42792552ac52efec503167d86`.
  - The CSV transcribes all 53 published ages and sea levels, in ascending age order, without rounding or interpolation. Reviewed against the supplied corrected image and author PDF; all selected values also match the original article's numerical sea-level column (the correction changes the flooding column). CSV SHA-256, with LF newlines: `f296c85377776f26863d27538a3fb6099b6512706802dce6e14822c5340dcbbd`.
  - Coverage: 0–520 Ma on a 10 Ma grid. Estimates derive from paleogeographic flooding of modern land and the modern hypsometric slope, **C = 0.0057 km/(10⁶ km²)**. The reference is present sea level, 0 m at 0 Ma; it is not a precisely measured 1950 instrumental datum. Changing land geometry, assumed slope, tectonics and ocean-basin evolution limit detailed comparison with younger ice-volume reconstructions.
  - Runtime use: 46 ages, 70–520 Ma, older than Miller's oldest sample at 66.610889 Ma. Published metres are used unchanged, with no fitted offset. The neighboring samples are 138.84 m (Marcilly, 70 Ma) and 144.0937 m (rebased Miller, 66.610889 Ma), a 5.2537 m difference at different dates. The source join is marked and disconnected.
  - No quantified confidence band is provided in this table. The two **continental sea-level** columns use different definitions and are not upper/lower confidence limits. They are excluded. The 10 Ma grid cannot reveal annual changes or establish the timing of short events by zooming in.

- `data/sealevel/miller2024-sealevel.txt`
  - Coverage: deep-time to Quaternary (see source metadata)
  - Source: https://www.ncei.noaa.gov/pub/data/paleo/paleocean/global/miller2024/miller2024-sealevel.txt
  - Publication: https://doi.org/10.3389/esss.2023.10091
  - Runtime use: `Age` in kyr BP and `GMGSL` in metres (column 12), the author's global mean geocentric estimate combining barystatic, thermosteric and ocean basin-volume changes. This uses the global estimate rather than a coastal relative sea-level or barystatic-only column.
  - Runtime use is limited to ages older than 798 ka; Spratt & Lisiecki supplies 24–798 ka. Miller's values retain their separate zero-age reference conversion, without fitting to Spratt.

- `data/sealevel/spratt2016-noaa.txt` (Spratt & Lisiecki 2016)
  - Publication: *A Late Pleistocene sea level stack*, Climate of the Past 12, 1079–1092, https://doi.org/10.5194/cp-12-1079-2016
  - NOAA study and original archive: https://www.ncei.noaa.gov/access/paleo-search/study/19982 and https://www.ncei.noaa.gov/pub/data/paleo/contributions_by_author/spratt2016/spratt2016-noaa.txt
  - Dataset DOI: https://doi.org/10.25921/rd66-5820
  - Cross-checked archive: https://doi.org/10.1594/PANGAEA.979830 (Spratt & Lisiecki 2025, version 2). This version contains the final published data and replaces the older discussion-paper dataset, PANGAEA.854045. Every numeric cell in all 799 NOAA rows agrees with version 2, including missing values. PANGAEA license: [CC-BY-3.0](https://creativecommons.org/licenses/by/3.0/); credit Rachel M. Spratt and Lorraine E. Lisiecki and cite both the publication and data releases.
  - Downloaded and compared: 2026-10-06. NOAA source's last-modified metadata: 2024-08-16. SHA-256 with CRLF normalized to LF: `748ddcc489f11b4075e0b6dbf41caf3d641574430e7ec9d30c4ff294f1971f96`. The raw file is retained unchanged, including original metadata; no extraction or extra build package is needed.
  - Coverage: 0–798 ka BP on a 1 ka evaluation grid. Ages convert to `time = -age_calkaBP * 1000`. The authors' section 3 combines the scaled first principal component of seven records through 430 ka (`SeaLev_shortPC1`) with five records from 431–798 ka (`SeaLev_longPC1`), without another correction. The browser follows that choice and marks and disconnects the 430/431 ka component change.
  - Runtime selects 24–798 ka BP (775 rows: 407 seven-record and 368 five-record estimates). Lines show the published scaled first principal component, not a newly averaged or fitted mixture. Shading uses the corresponding `err_lo` / `err_up` columns directly: the published 95% bootstrap confidence bounds. The `err_sig` columns are one standard deviation and are not doubled or substituted for those asymmetric bounds.
  - Published calibration: 0 m at 5 ka and −130 m at 24 ka, using a GIA-corrected coral compilation (Clark et al. 2009). These represent an approximate modern sea-level datum. The authors choose the mid-Holocene reference because sediment mixing may bias the Holocene trend. The central curve's apparent zero-age value is +8.49 m; subtracting that point would incorrectly move every glacial low and highstand away from the published calibration. The app applies no new reference offset or amplitude scaling. The complete 799-row grid and both published calibration anchors are required.
  - The stack targets eustatic sea-level changes, primarily from ice volume, using multiple proxy and model reconstructions. Its temperature corrections, isotope-to-ice-volume conversions and LR04-related chronology differ from Lambeck, Miller and modern total sea level. Some constraints and chronological assumptions are shared with other climate reconstructions; agreement is not independent validation.
  - Bootstrap uncertainty includes resampling the component records, discrete ±2 ka age shifts and random Holocene/LGM calibration choices. It does not quantify every systematic proxy or model error or uncertainty introduced by this application's reference choices and joins. The bounds are not the full spread of all observations. No horizontal dating bounds are drawn. Interpolating components to a 1 ka grid does not create independent observations or true 1 ka resolution; age uncertainty can blur fast changes and bias brief highstands. See the authors' sections 3 and 4.2.

- `data/sealevel/lambeck2014-supplement.pdf`, `lambeck2014-table-s3.txt` and `lambeck2014-esl.csv`
  - Publication: Lambeck et al. (2014), *Sea level and global ice volumes from the Last Glacial Maximum to the Holocene*, https://doi.org/10.1073/pnas.1411762111
  - Original supplement: https://www.pnas.org/doi/suppl/10.1073/pnas.1411762111/suppl_file/pnas.1411762111.sapp.pdf
  - Archived source PDF, retrieved 2026-10-05. PDF SHA-256: `3ea96cf244e1221ca11c45b3ff450f14fc14b2267f4a8de46baf96e0a013cd27`. No source PDF contents were modified.
  - Table S3 on PDF pages 29–36 has 326 rows. Columns are time in ka BP, nominal ice-volume-equivalent sea level in metres, best ESL estimate in metres, and its published accuracy estimate. **The caption explicitly defines column 4 as 2 sigma** despite the shorter “sigma esl” column heading. The plotted band is best estimate ±column 4, without doubling it again or labelling it ±1σ. Column 2 is the starting ice model and is not plotted.
  - Coverage: 0–34.783 ka BP. All rows and their tabulated precision are preserved. The browser converts ages to `time = -age_ka_bp * 1000` under the shared BP (1950) convention and uses the preferred high-viscosity solution's published ESL estimates without fitting or resampling. The zero-age row is exactly 0 m with 0 stated error: it defines a model reference, not a zero-uncertainty modern measurement, and is excluded from the displayed segment.
  - Extraction: pypdf 6.19.0 generated the bundled table text; PyMuPDF 1.28.2 independently reproduced every numeric cell, and the caption and representative pages were checked visually. Text SHA-256 (CRLF normalized to LF): `f4a2a25e1a03cb55f52b1869f0af2dee5d81d298047d19cb904bd1c6cddffc26`.
  - Rebuild: `python scripts/build_lambeck_sealevel.py` verifies the PDF and text checksums, validates all rows, and reproduces the CSV with only the standard library. With build-time `pypdf==6.19.0` installed, `python scripts/build_lambeck_sealevel.py --verify-pdf` re-extracts and compares the full table before writing. CI checks every CSV cell against the verified table text without extra dependencies. This source is not a digitized graph or a merge of local relative sea-level observations.

- `data/sealevel/kopp2016-global-posterior.mat` and `kopp2016-global-posterior.csv`
  - Publication: Kopp et al. (2016), *Temperature-driven global sea-level variability in the Common Era*, https://doi.org/10.1073/pnas.1517056113
  - Author archive: https://github.com/bobkopp/SESL
  - Pinned original: https://raw.githubusercontent.com/bobkopp/SESL/2480e56bdb15b49aaf0e3ca42b310e0c6160e62c/Data/GLMW-1ts.mat
  - Downloaded and verified: 2026-10-05. Original SHA-256: `dcbc6219ab2c310029cff314f3c9805ac24f76d58987d125c741fab7693050e5`.
  - Original variable `sl` has 162 rows: published CE year, global posterior mean in mm, and posterior standard deviation in mm. The authors' `LoadData_SESL.m` confirms the units and interpretation. The covariance matrix `C` is in mm²; its diagonal reproduces those deviations to the published 0.01 mm rounding. This is the statistical reconstruction used as an input to the semi-empirical model, not its temperature-driven forward simulation output.
  - Coverage: −1000 to 2010 on the published CE axis. The runtime retains −1000 through 1800, before the tide-gauge record begins. Earlier years retain the archive's numeric year coordinate without imposing an unverified BCE/year-zero conversion; tooltips use years BP (1950). The mostly 20-year evaluation grid samples a continuous reconstruction, not independent observations or fixed-duration means.
  - Rebuild: `python scripts/build_kopp_sealevel.py`, using only the Python standard library and the bundled source. The checksum is required, and no date conversion, reference fitting, interpolation or smoothing occurs during extraction. All 162 original triples remain in the CSV; source selection and mm-to-m conversion occur in the browser.
  - Author citation and distribution notice: `data/sealevel/kopp2016-source-readme.md`, copied from the pinned author archive (GPL-3.0-or-later notice for its software). The browser and extractor implementations are original to this project.

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
  - Runtime use: decimal year and global mean sea-level variation in mm (columns 1–2), converted to metres. The browser and GitHub updater use the same seasons-retained product. Its arbitrary reference is replaced by a constant offset estimated against the rebased tide-gauge reconstruction.
  - Selected product: 2026 release 2, seasons retained, with the provider's GIA-removed convention. Release 1 is a reference archive and is excluded from runtime. The scheduled updater checks https://sealevel.colorado.edu/data for newer release labels and reports them in the Actions log; changing releases requires checking the matching product and updating the manifest and browser source together.

### Sea-level combination method and limitations

The **Global sea level** view combines geological, glacial-cycle, postglacial, Common Era, tide-gauge and satellite records. The modern reference is the Jevrejeva 1950 annual mean. Colorado is aligned to that curve by averaging satellite measurements into calendar months, comparing only matching months within the actual 1992–2010 overlap, and averaging the monthly differences equally. With the bundled snapshots, subtract 0.06986125 m from Jevrejeva and add 0.07363510 m to Colorado. Variability, ages and uncertainty widths are preserved. Colorado supplies the satellite-era segment; Jevrejeva supplies earlier monthly samples from 1807.5417 on its decimal-year axis.

Kopp's posterior is rebased by subtracting its exact 1950 evaluation value, −0.0659 m. This makes a constant +0.0659 m shift, without fitting its amplitude or endpoints to tide gauges. It uses an estimated point reference rather than Jevrejeva's observed annual mean, so their datums are approximate counterparts. The latest retained Kopp node is 1800, leaving only about 7.54 years to the first tide-gauge sample. Its shaded band and tooltips show the original marginal ±1σ posterior spread, shifted by the same constant. They are not covariance-propagated uncertainties of differences from an uncertain 1950 value; they exclude reference-alignment uncertainty.

Lambeck supplies 220 estimates older than Kopp's oldest node and younger than Spratt's Last Glacial Maximum calibration, from 2,970 to 23,947 years BP (1950). Its published zero-age estimate is already 0 m, so its values receive no vertical offset. This is an approximate compatible model reference, not an observed 1950 calibration. At 2,970 years BP, Lambeck is −0.54 m with a ±0.07 m published 2σ accuracy; Kopp's neighboring point at 2,950 years BP is −0.07989 m after its documented reference shift. The approximately 0.46 m difference is retained. Twenty years separate the neighboring Lambeck and Kopp estimates. The late Holocene spacing is mostly 69–70 years, with generally wider spacing earlier. These are tabulated reconstruction estimates, not independent observations or annual means. Its older 24–34.783 ka estimates remain in the complete original CSV and supplement, excluded from the default composite.

Spratt supplies 24–798 ka using the authors' published composite and original metre values, with no application offset. The handoff is fixed at its published 24 ka Last Glacial Maximum calibration, where coastal constraints are stronger than further back; it is not selected by searching for the closest pair of values or fitting amplitudes. Lambeck's adjacent 23,947 BP estimate is −130.94 m (±1.15 m, 2σ), whereas Spratt's 24,000 BP estimate is −130 m (95% bootstrap bounds −134.58 to −118.09 m): 53 years and 0.94 m separate them. Extending Lambeck to its full 34,783 BP endpoint before switching to Spratt at 35,000 BP would introduce a 30.44 m central-value step, reflecting a substantial disagreement in the older overlap. That disagreement remains documented rather than removed with a fitted shift.

Miller is rebased separately by subtracting its published zero-age GMGSL value of −0.83 m, setting that point to zero. Its reference is likewise approximate. Its geological samples are retained only before Spratt's oldest estimate, 798,000 BP. Spratt is −92.37 m there (95% bounds −114.68 to −75.73 m); Miller's adjacent 798,259 BP point is −69.5885 m after rebasing. Their 22.7815 m discrepancy is retained and does not describe an observed rapid sea-level change. Every source and Spratt component join has a dashed marker and a disconnected line and band. No extra samples, interpolation across sources or forced endpoint matching are added.

Earlier glacial-cycle estimates have sea-level lows comparable to the last ice age. For example, Spratt's 136 ka point is −123.95 m with 95% bounds of −140.25 to −109.67 m; Lambeck's retained minimum is −134.28 m at 20,648 BP. These are different reconstructions and uncertainty measures, with coarse older grids, so the composite cannot establish which interval had the lowest sea level over the full record. Differences in resolution and dating also limit timing-lag comparisons with temperature.

The seven products (eight component segments) differ in temporal resolution, datum definitions, land-motion/basin corrections, sampling and uncertainty. An offset cannot remove those differences. **Lambeck is ice-volume-equivalent sea level**, inferred from far-field evidence corrected for isostatic and tectonic effects; it excludes thermal expansion and is not the same quantity as Miller's total geocentric estimate or modern global mean sea level. Spratt primarily targets eustatic ice-volume changes with different proxy/model assumptions. Lambeck's reported 2σ accuracy is not a full uncertainty budget for model selection, earth rheology, missing contributions or alignment. These limitations can produce disagreement at joins and limit temperature correlations. Kopp's reconstruction constrains the mean sea level of −100 to 100 and 1600 to 1800 on its CE axis to be equal; this constrains its long-term trend. The modern part of that reconstruction also uses instrumental information, so its agreement with tide gauges is not an independent validation. Miller's uncertainty is not tabulated point by point here; its metre-scale estimates are not comparable to modern millimetre precision. Miller and some Spratt inputs use temperature-related calculations, so this is not an independent test of temperature–sea-level correlation. Duplicate published ages/values are retained without inventing an average.

The NOAA `kopp2016-global.txt` reference archive contains local coastal samples and is excluded. It is distinct from the author global posterior; local relative sea levels are not treated as global observations. All historical reconstructions, including Marcilly and Foster, are excluded from the automatic updater, which checks current observations only.

## Population

- `data/population/population-long-run-with-projections.csv`
  - Coverage: long-run historical to near-future projections
  - Source: https://ourworldindata.org/grapher/population-long-run-with-projections.csv
  - Runtime use: only `World` / `OWID_WRL`. Prefer the historical `Population` column when supplied; use the projection column otherwise. The bundled historical series ends in 2023; 2024 onward are projections, labelled in tooltips and drawn as dashed lines. Years beyond the current calendar year are excluded.
  - Historical values are already a provider composite and remain unchanged. This CSV has no per-row provenance for the historical component estimates; internal source transitions are not inferred or given invented markers. Population estimates and projections have uncertainty that is not supplied in this file.
  - Lines connect annual samples only within each historical or projection segment. Their visible intersection at the left edge contributes to vertical scaling; no extra daily estimates or extension past the latest sample are added. Population is not part of the automatic observation updater.

## Timeline context

Historical events provide orientation rather than climate measurements. Ancient dates and durations are approximate. The Confucius band uses the traditional 551–479 BCE dates, converted to astronomical years −550 to −478 (year 0 corresponds to 1 BCE); see the [Stanford Encyclopedia of Philosophy](https://plato.stanford.edu/entries/confucius/). The Paris Agreement marker identifies its adoption on 12 December 2015; see the [UNFCCC announcement](https://unfccc.int/news/finale-cop21).

The approximate boundary for written records is placed near 3500 BCE; the development of writing spans the fourth millennium BCE and is not a single precise event ([Metropolitan Museum of Art](https://www.metmuseum.org/essays/the-origins-of-writing)). Muhammad’s lifespan is shown as approximately 570–632 CE ([Metropolitan Museum of Art](https://www.metmuseum.org/essays/the-birth-of-islam)); Jesus’s as approximately 4 BCE–30 CE, within the scholarly dating range ([Oklahoma State University open textbook](https://open.library.okstate.edu/interculturalcommunication/chapter/history-3/)).

The WWI band runs from 28 July 1914 to the 11 November 1918 armistice ([National Army Museum timeline](https://ww1.nam.ac.uk/timeline/)); it identifies the usual fighting period rather than the 1919 peace treaty. WWII runs from the 1 September 1939 invasion of Poland in Europe ([USHMM](https://encyclopedia.ushmm.org/content/en/article/the-holocaust-and-world-war-ii-key-dates?series=7)) to Japan’s formal surrender on 2 September 1945 ([National Archives](https://www.archives.gov/milestone-documents/surrender-of-japan)).

## Reference archives

These files document regional records, individual proxy estimates or provider snapshots. They are excluded from the browser composites.

- `data/temperature/edc3deuttemp2007-noaa.txt` (EDC)
  - Coverage: ~800 kyr BP to recent Holocene
  - Source: https://www.ncei.noaa.gov/pub/data/paleo/icecore/antarctica/epica_domec/edc3deuttemp2007-noaa.txt
  - Retained for reference; not used in the global curve. It measures local Antarctic temperature relative to the last 1,000 years, not global mean temperature.

- `data/co2/rae2021co2-d11b-ph.txt`
  - Coverage: deep-time paleo CO2 (multi-Myr)
  - Source: https://www.ncei.noaa.gov/pub/data/paleo/climate_forcing/trace_gases/rae2021/rae2021co2-d11b-ph.txt
  - Reference archive; excluded from the displayed curve. `xco2`, `xco2_16pc`, `xco2_84pc`, sample age and site identify the individual estimates. The archive describes their bounds as illustrative; they do not include seawater boron-isotope systematic uncertainty.

- `data/co2/rae2021alkenone-co2diffusive.txt`
  - Coverage: deep-time paleo CO2 (multi-Myr)
  - Source: https://www.ncei.noaa.gov/pub/data/paleo/climate_forcing/trace_gases/rae2021/rae2021alkenone-co2diffusive.txt
  - Reference archive; excluded from the displayed curve. `co2_benthic` and its 16th/84th percentile columns use the compilation's benthic carbon-isotope correction; these are individual site estimates, not a continuous reconstruction.

- `data/co2/b_ca_tripati_2009.txt`
  - Coverage: deep-time paleo CO2 (multi-Myr)
  - Source: https://www.ncei.noaa.gov/pub/data/paleo/climate_forcing/trace_gases/Paleo-pCO2/b_ca_tripati_2009.txt
  - Reference archive of individual proxy estimates; excluded from the displayed curve.

- `data/sealevel/kopp2016-global.txt`
  - Coverage: Common Era coastal relative sea-level samples; retained for reference but not plotted as a global series
  - Source: https://www.ncei.noaa.gov/pub/data/paleo/reconstructions/ocean/kopp2016/kopp2016-global.txt

- `data/sealevel/gmsl_2026rel1_seasons_retained.txt`
  - Colorado release-1 satellite snapshot; excluded from runtime. The selected release is documented in the Sea Level section.
