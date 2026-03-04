# Dataset Sources and Coverage

This file documents dataset provenance and approximate coverage used by `sketch.js`.

Notes
- Project time axis is generally `time = yearCE - 1950` for CE-based datasets.
- BP datasets are converted with `time = -ageBP` (or `-ageKyr * 1000`).
- Coverage is approximate and should be verified against source metadata for publication use.

## Orbital

- `data/orbit/zeebe2019orbital.txt`
  - Coverage: ~67,000 kyr BP to present (project time ~-67,000,000 to now)
  - Source: https://www.ncei.noaa.gov/pub/data/paleo/climate_forcing/orbital_variations/zeebe2019orbital.txt

## Temperature

- `data/temperature/Table.txt` (Hansen)
  - Coverage: deep-time Cenozoic (~66 Myr BP to near-present)
  - Source: https://www.columbia.edu/~mhs119/Sensitivity%2BSL%2BCO2/Table.txt

- `data/temperature/edc3deuttemp2007-noaa.txt` (EDC)
  - Coverage: ~800 kyr BP to recent Holocene
  - Source: https://www.ncei.noaa.gov/pub/data/paleo/icecore/antarctica/epica_domec/edc3deuttemp2007-noaa.txt

- `data/temperature/Full_ensemble_median_and_95pct_range.txt` (Neukom PAGES2k)
  - Coverage: Common Era to present
  - Source: https://www.ncei.noaa.gov/pub/data/paleo/pages2k/neukom2019temp/recons/Full_ensemble_median_and_95pct_range.txt

- `data/temperature/GLB.Ts+dSST.txt` (NASA GISS)
  - Coverage: 1880 CE to present
  - Source: https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.txt

## CO2

- `data/co2/antarctica2015co2composite-noaa.txt`
  - Coverage: ice-core composite, ~800 kyr BP to modern bridge
  - Source: https://www.ncei.noaa.gov/pub/data/paleo/icecore/antarctica/antarctica2015co2composite-noaa.txt

- `data/co2/rae2021co2-d11b-ph.txt`
  - Coverage: deep-time paleo CO2 (multi-Myr)
  - Source: https://www.ncei.noaa.gov/pub/data/paleo/climate_forcing/trace_gases/rae2021/rae2021co2-d11b-ph.txt

- `data/co2/rae2021alkenone-co2diffusive.txt`
  - Coverage: deep-time paleo CO2 (multi-Myr)
  - Source: https://www.ncei.noaa.gov/pub/data/paleo/climate_forcing/trace_gases/rae2021/rae2021alkenone-co2diffusive.txt

- `data/co2/b_ca_tripati_2009.txt`
  - Coverage: deep-time paleo CO2 (multi-Myr)
  - Source: https://www.ncei.noaa.gov/pub/data/paleo/climate_forcing/trace_gases/Paleo-pCO2/b_ca_tripati_2009.txt

- `data/co2/daily_in_situ_co2_mlo.csv`
  - Coverage: 1958 CE to present (daily in-situ)
  - Sources:
    - https://scrippsco2.ucsd.edu/assets/data/atmospheric/stations/in_situ_co2/daily/daily_in_situ_co2_mlo.csv
    - https://scrippsco2.ucsd.edu/data/atmospheric_co2/mlo.html

- `data/co2/co2_daily_mlo.txt`
  - Coverage: modern NOAA daily era to present
  - Source: https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_daily_mlo.txt

## Volcanic

- `data/volcanic/SAOD_merged_HolVol-v1_eVolv2k_v3_CMIP6_v3_-9500_to_2014_global_mean.csv`
  - Coverage: 9500 BCE to 2014 CE (project time -11,450 to 64)
  - Sources:
    - https://arggit.usask.ca/cj/eva-data-hub/-/raw/main/data/SAOD_merged_HolVol-v1_eVolv2k_v3_CMIP6_v3_-9500_to_2014.xlsx
    - https://cj.argpages.usask.ca/eva-data-hub/

## Solar Irradiance

- `data/solar/SATIRE-M/SSI_14C_cycle_yearly_cmip_v20160613_fc.txt`
  - Coverage: 6754.5 BCE to 2015.997 CE (yearly cadence before 1850, daily after)
  - Product: PMIP4 SATIRE-M 14C, CMIP6-scaled (`fc`), recommended for PMIP4-CMIP6 tier-1 past1000
  - Source: https://pmip4.lsce.ipsl.fr/doku.php/data:solar_satire
  - https://sharebox.lsce.ipsl.fr/index.php/s/LpiCUCkSmx0P6bb

- `data/solar/SATIRE_M_TSI_14C_fc.csv`
  - Coverage: project time ~[-8704.5, 65.9973]
  - Type: compact runtime TSI derivative used by `sketch.js`
  - Build: `python scripts/build_satire_tsi.py` (TSI computed as `sum(SSI * wavelength_bin)` for each time step)

- `data/solar/nnl_tsi_P1D.txt`
  - Coverage: ~late 1800s to near-present (daily)
  - Type: continuation segment merged on top of SATIRE in `sketch.js`
  - Source: https://lasp.colorado.edu/lisird/latis/dap/nnl_tsi_P1D.txt

- `data/solar/tsis_tsi_24hr.txt`
  - Coverage: recent years to present (24-hour cadence)
  - Type: latest continuation segment merged on top of NNL in `sketch.js`
  - Source: https://lasp.colorado.edu/lisird/latis/dap/tsis_tsi_24hr.txt

## Sea Level

- `data/sealevel/miller2024-sealevel.txt`
  - Coverage: deep-time to Quaternary (see source metadata)
  - Source: https://www.ncei.noaa.gov/pub/data/paleo/paleocean/global/miller2024/miller2024-sealevel.txt

- `data/sealevel/kopp2016-global.txt`
  - Coverage: Common Era-focused reconstruction and bridge to modern
  - Source: https://www.ncei.noaa.gov/pub/data/paleo/reconstructions/ocean/kopp2016/kopp2016-global.txt

- `data/sealevel/gslGPChange2014.txt`
  - Coverage: late 19th/20th century to recent
  - Sources:
    - https://psmsl.org/products/reconstructions/gslGPChange2014.txt
    - https://psmsl.org/products/reconstructions/

- `data/sealevel/gmsl_2026rel1_seasons_retained.txt`
  - Coverage: modern satellite era to present
  - Sources:
    - https://sealevel.colorado.edu/files/2026_rel1/gmsl_2026rel1_seasons_retained.txt
    - https://sealevel.colorado.edu/data/2026rel1-0

## Population

- `data/population/population-long-run-with-projections.csv`
  - Coverage: long-run historical to near-future projections
  - Source: https://ourworldindata.org/grapher/population-long-run-with-projections.csv
