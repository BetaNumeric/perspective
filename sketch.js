// Constants for UI dimensions and scaling
const GUI_HEIGHT_DIVISOR = 12;        // Top GUI bar height
const TIMELINE_HEIGHT_DIVISOR = 14;   // Bottom timeline height
const TIMELINE_HEIGHT_DIVISOR_SMALL = 36; // Small timeline elements
const TEXT_SIZE_DIVISOR_MEDIUM = 48;  // Medium text scaling
const TEXT_SIZE_DIVISOR_SMALL = 60;   // Small text scaling
const TEXT_SIZE_DIVISOR_TINY = 70;    // Tiny text scaling
const SHIFT_OFFSET = 15;              // Left margin offset
const DATA_PANEL_HEIGHT_DIVISOR = 3;  // Data panel height

// Constants for zoom and scrolling
const DEFAULT_SCROLL_VALUE = 25;      // Starting zoom level
const MAX_SCROLL_VALUE = 15000000000; // Max zoom out (cosmological scale)

// Constants for color and transparency
const BACKGROUND_ALPHA = 128;         // Standard background transparency
const BACKGROUND_ALPHA_HIGH = 230;    // High opacity background
const STROKE_ALPHA_LOW = 64;          // Low opacity stroke
const STROKE_ALPHA_MEDIUM = 100;      // Medium opacity stroke
const TIMELINE_LABEL_MIN_SPACING = 70;
const CALENDAR_MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SOLAR_DENSE_SMOOTH_START_TIME = -100; // 1850 CE in year-1950 axis
const SOLAR_DENSE_SMOOTH_WINDOW_DAYS = 50; // Full width of the centered window
const SOLAR_ANNUAL_VIEW_YEARS = 200; // Match the older record's annual resolution in long views.
const SOLAR_ALIGNMENT_WINDOW_YEARS = 22; // Approximately two solar cycles near the historical join.
const SOLAR_ALIGNMENT_MIN_DAYS = 15;
const SOLAR_ALIGNMENT_MIN_MONTHS = 12;
const ORBITAL_EPOCH_CE = 2000; // ZB18a uses J2000; see Kocken & Zeebe (2026), section 2.1.

const SOURCE_INFO = {
  giss: { short: 'GISS', label: 'NASA GISS • monthly observations', cadence: 'month' },
  pages: { short: 'PAGES2k', label: 'PAGES2k • annual April–March reconstruction', cadence: 'year' },
  osman: { short: 'Osman', label: 'Osman 2021 • 200-year means • estimated baseline' },
  hansen: { short: 'Hansen', label: 'Hansen 2013 • coarse global temperature estimate' },
  'co2-noaa': { short: 'NOAA', label: 'NOAA • Mauna Loa / Maunakea daily observations', cadence: 'day' },
  'co2-scripps': { short: 'Scripps', label: 'Scripps • Mauna Loa daily observations', cadence: 'day' },
  'co2-ice': { short: 'Ice cores', label: 'Bereiter 2015 • Antarctic ice-core composite' },
  'co2-cencopip': { short: 'CenCO₂PIP', label: 'CenCO₂PIP 2023 • 500,000-year means • median reconstruction' },
  'sea-satellite': { short: 'Satellites', label: 'Colorado • satellite sea level • overlap-aligned', cadence: 'day' },
  'sea-gauges': { short: 'Tide gauges', label: 'Jevrejeva 2014 • monthly global reconstruction', cadence: 'month' },
  'sea-miller': { short: 'Miller', label: 'Miller 2024 • geological global sea-level estimate' },
  'solar-satire-m': { short: 'SATIRE-M', label: 'SATIRE-M / PMIP4 • annual proxy reconstruction • adjusted reference', cadence: 'year' },
  'solar-satire-t': { short: 'SATIRE-T', label: 'SATIRE-T / PMIP4 • annual sunspot reconstruction • adjusted reference', cadence: 'year' },
  'solar-cmip6': { short: 'CMIP6', label: 'CMIP6 • SATIRE/NRL model composite • adjusted reference', cadence: 'day' },
  'solar-nnl': { short: 'NNL', label: 'NASA/NOAA/LASP NNL • model • aligned to TSIS', cadence: 'day' },
  'solar-tsis': { short: 'TSIS', label: 'TSIS • observed irradiance at 1 AU', cadence: 'day' },
  'volcano-holvol': { short: 'HolVol', label: 'HolVol v1 • annual mean stratospheric optical depth', cadence: 'year' },
  'volcano-evolv2k': { short: 'eVolv2k', label: 'eVolv2k v3 • annual mean stratospheric optical depth', cadence: 'year' },
  'volcano-cmip6': { short: 'CMIP6', label: 'CMIP6 v3 • annual mean stratospheric optical depth', cadence: 'year' },
  'orbit-zeebe': { short: 'ZB18a', label: 'Zeebe 2019 ZB18a • 1,600-year spacing • 2000 epoch' },
  'population-history': { short: 'Estimates', label: 'OWID • historical population estimates', cadence: 'year' },
  'population-projection': { short: 'Projections', label: 'OWID • population projection, not an observation', cadence: 'year' }
};

function sourceSegment(row) {
  return row?.segment || row?.source || '';
}

function sampleTimeLabel(row) {
  const calendarYear = row.time + 1950;
  const cadence = SOURCE_INFO[row.source]?.cadence;
  if (row.sampleDate) return row.sampleDate;
  if (row.source === 'giss') {
    return Math.floor(calendarYear) + '-' + String(1 + Math.round((calendarYear % 1) * 12)).padStart(2, '0');
  }
  if (cadence === 'year') return Math.abs(Math.round(calendarYear)) + (calendarYear < 0 ? ' BCE' : ' CE');
  if (cadence === 'month' || cadence === 'day') {
    const iso = new Date(millisecondsFromDecimalYear(calendarYear)).toISOString();
    return iso.slice(0, cadence === 'month' ? 7 : 10);
  }
  return row.time <= 0 ? nfc(-row.time, row.time < -10000 ? 0 : 2) + ' years BP (1950)' : nfc(calendarYear, 2) + ' CE';
}

// Global data structures and variables
let data = [];                        // All loaded datasets
let event = [];                       // Historical events for timeline
let sourceTables = {};
let scrollValue = DEFAULT_SCROLL_VALUE;
let pScrollValue = scrollValue;
let oneYear = 0;                      // Zoom state
let scrollSpeed = 1;                  // Current scroll speed
let currentYear = 0;                  // Right-edge timeline anchor (current year plus small buffer)
let shift = SHIFT_OFFSET;             // Left margin shift
let showCursor = true;                // Crosshair/tooltip visibility toggle
let selectedData = 1;                 // Upper series index
let temperatureCalibration = {};
let seaLevelCalibration = {};
let solarCalibration = {};
let redrawRequested = true;
let perfHUD = false;
let perfDataVertices = 0;
let perfEventsDrawn = 0;
let perfEventsCulled = 0;
let perfTimelineTicks = 0;
let perfTimelineLabels = 0;
function preload() {
  // Orbital
  sourceTables.zeebeOrbitalRaw = loadStrings('data/orbit/zeebe2019orbital.txt'); // 100–0 Ma; draw only 58–0 Ma

  // Temperature (oldest -> newest)
  sourceTables.hansenTempRaw = loadStrings('data/temperature/Table.txt'); // ~[-66,000,000, now]
  sourceTables.osmanTempRaw = loadStrings('data/temperature/osman2021-gmst.csv'); // global, 24,000–0 BP
  sourceTables.neukomTempRaw = loadStrings('data/temperature/Full_ensemble_median_and_95pct_range.txt'); // ~[-1,949, now]
  sourceTables.gissTempRaw = loadStrings('data/temperature/GLB.Ts+dSST.txt'); // ~[-70, now]

  // CO2 (oldest -> newest)
  sourceTables.co2CencopipRaw = loadStrings('data/co2/cencopip2023-500kyr.csv'); // author release v1.2, 500 kyr bins
  sourceTables.co2AntarcticaRaw = loadStrings('data/co2/antarctica2015co2composite-noaa.txt'); // ~[-800,000, ~0]
  sourceTables.co2InSituRaw = loadStrings('data/co2/daily_in_situ_co2_mlo.csv'); // ~[8, now]
  sourceTables.co2DailyRaw = loadStrings('data/co2/co2_daily_mlo.txt'); // modern daily (~late 20th c, now)

  // Volcanic
  sourceTables.volcanicSaodRaw = loadStrings('data/volcanic/SAOD_merged_HolVol-v1_eVolv2k_v3_CMIP6_v3_-9500_to_2014_global_mean.csv'); // [-11,450, 64]

  // Solar Irradiance
  sourceTables.solarIrradiance = loadTable('data/solar/SATIRE_M_TSI_14C_fc.csv', 'csv', 'header'); // ~[-8,704, 66]
  sourceTables.solarIrradianceNnlRaw = loadStrings('data/solar/nnl_tsi_P1D.txt'); // ~[late 1800s, recent]
  sourceTables.solarIrradianceTsisRaw = loadStrings('data/solar/tsis_tsi_24hr.txt'); // ~[recent years, now]

  // Sea Level (oldest -> newest)
  sourceTables.sealevelMillerRaw = loadStrings('data/sealevel/miller2024-sealevel.txt'); // deep-time (multi-Myr)
  sourceTables.sealevelGpRaw = loadStrings('data/sealevel/gslGPChange2014.txt'); // ~[late 1800s, recent]
  sourceTables.sealevelRaw = loadStrings('data/sealevel/gmsl_2026rel2_seasons_retained.txt'); // satellite era -> now

  // Population
  sourceTables.populationLongRunRaw = loadStrings('data/population/population-long-run-with-projections.csv'); // ~[-11,950, >0]
}

function sortRowsByTimeDesc(rows) {
  rows.sort((a, b) => b.time - a.time);
  return rows;
}

function extractTimeValueRows(table, valueColumn, valueKey) {
  const rows = [];
  if (!table || !table.getRowCount) return rows;

  for (let i = 0; i < table.getRowCount(); i++) {
    const row = table.getRow(i);
    const time = row.getNum('time');
    const value = row.getNum(valueColumn);
    if (!Number.isFinite(time) || !Number.isFinite(value)) continue;

    rows.push({ ...table.seriesRows?.[i], time, [valueKey]: value });
  }

  return sortRowsByTimeDesc(rows);
}

function buildTimeValueTable(rows, valueKey, valueColumn, fallbackTable = null) {
  const table = new p5.Table();
  table.addColumn('time');
  table.addColumn(valueColumn);

  for (let i = 0; i < rows.length; i++) {
    const row = table.addRow();
    row.setNum('time', rows[i].time);
    row.setNum(valueColumn, rows[i][valueKey]);
  }
  table.seriesRows = rows;

  if (table.getRowCount() > 0) return table;
  return fallbackTable;
}

function cloneTimeValueRows(rows, valueKey) {
  const cloned = new Array(rows.length);
  for (let i = 0; i < rows.length; i++) {
    cloned[i] = {
      ...rows[i],
      time: rows[i].time,
      [valueKey]: rows[i][valueKey]
    };
  }
  return cloned;
}

function millisecondsFromDecimalYear(decimalYear) {
  const calendarYear = Math.floor(decimalYear);
  const start = Date.UTC(calendarYear, 0, 1);
  return Math.round(start + (decimalYear - calendarYear) * (Date.UTC(calendarYear + 1, 0, 1) - start));
}

function decimalYearFromMilliseconds(milliseconds) {
  const date = new Date(milliseconds);
  const calendarYear = date.getUTCFullYear();
  const start = Date.UTC(calendarYear, 0, 1);
  return calendarYear + (milliseconds - start) / (Date.UTC(calendarYear + 1, 0, 1) - start);
}

// Plot coordinates include the left-margin translation used by all data panels.
function plotXFromYear(calendarYear) {
  return width - oneYear * (calendarYear - currentYear);
}

function yearFromPlotX(plotX) {
  return currentYear + (width - plotX) / oneYear;
}

function cursorTimeLabel(calendarYear) {
  // Gregorian dates are useful in close views; deep time stays on the numeric axis.
  if (Math.abs(oneYear) >= 33 && calendarYear >= 100 && calendarYear < 10000) {
    return new Date(millisecondsFromDecimalYear(calendarYear)).toISOString().slice(0, 10);
  }
  if (Math.abs(oneYear) <= 0.1) return nfc(calendarYear, 0);
  const wholeYear = Math.trunc(calendarYear);
  return Math.abs(wholeYear) < 10000 ? String(wholeYear) : nfc(wholeYear, 0);
}

function timelineTicks(startYear, endYear, pixelsPerYear) {
  const ticks = [];
  if (!Number.isFinite(startYear) || !Number.isFinite(endYear)
    || startYear > endYear || !Number.isFinite(pixelsPerYear) || pixelsPerYear <= 0) return ticks;

  // Use actual first-of-month dates, including leap years, rather than year / 12.
  // Calendar conversion is deliberately limited to the modern calendar range.
  if (startYear >= 100 && endYear < 10000 && pixelsPerYear >= 2 * TIMELINE_LABEL_MIN_SPACING) {
    const monthStep = [1, 2, 3, 6].find(step => pixelsPerYear * step / 12 >= TIMELINE_LABEL_MIN_SPACING);
    const date = new Date(millisecondsFromDecimalYear(endYear));
    let monthIndex = date.getUTCFullYear() * 12 + date.getUTCMonth();
    monthIndex -= monthIndex % monthStep;
    for (; ; monthIndex -= monthStep) {
      const calendarYear = Math.floor(monthIndex / 12);
      const monthIndexInYear = monthIndex % 12;
      const tickYear = decimalYearFromYmd(calendarYear, monthIndexInYear + 1, 1);
      if (tickYear < startYear) break;
      if (tickYear <= endYear) {
        ticks.push({ year: tickYear, label: CALENDAR_MONTH_LABELS[monthIndexInYear] + ' ' + calendarYear });
      }
    }
    return ticks;
  }

  // Whole-year ticks are exact multiples of a 1/2/5 interval at every scale.
  const minimumStep = Math.max(1, TIMELINE_LABEL_MIN_SPACING / pixelsPerYear);
  const magnitude = 10 ** Math.floor(Math.log10(minimumStep));
  const step = [1, 2, 5, 10].find(value => value * magnitude >= minimumStep) * magnitude;
  const firstIndex = Math.floor(endYear / step);
  const lastIndex = Math.ceil(startYear / step);
  for (let index = firstIndex; index >= lastIndex; index--) {
    const tickYear = index * step;
    ticks.push({ year: tickYear, label: Math.abs(tickYear) < 10000 ? String(tickYear) : nfc(tickYear, 0) });
  }
  return ticks;
}

function matchedMonthlyOffset(sourceRows, referenceRows, valueKey, start = -Infinity, end = Infinity) {
  function monthlyMeans(rows) {
    const bins = new Map();
    for (const row of rows) {
      if (row.time < start || row.time > end) continue;
      const date = new Date(millisecondsFromDecimalYear(row.time + 1950));
      const key = date.getUTCFullYear() * 12 + date.getUTCMonth();
      const bin = bins.get(key) || { sum: 0, count: 0 };
      bin.sum += row[valueKey];
      bin.count++;
      bins.set(key, bin);
    }
    return bins;
  }
  const source = monthlyMeans(sourceRows);
  const reference = monthlyMeans(referenceRows);
  const differences = [];
  for (const [key, bin] of source) {
    const target = reference.get(key);
    if (target) differences.push(target.sum / target.count - bin.sum / bin.count);
  }
  return differences.length ? differences.reduce((sum, value) => sum + value, 0) / differences.length : null;
}

function offsetValueRows(rows, valueKey, offset) {
  return rows.map(row => ({ ...row, [valueKey]: row[valueKey] + offset,
    lower: Number.isFinite(row.lower) ? row.lower + offset : undefined,
    upper: Number.isFinite(row.upper) ? row.upper + offset : undefined }));
}

function parseGissTemperatureRows(rawLines) {
  const rows = [];
  if (!rawLines || rawLines.length === 0) return rows;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (line.length === 0) continue;

    const tokens = line.split(/\s+/);
    if (tokens.length < 13) continue;
    if (!/^\d{4}$/.test(tokens[0])) continue;

    const year = parseInt(tokens[0], 10);
    if (!Number.isFinite(year)) continue;

    for (let month = 0; month < 12; month++) {
      const value = tokens[month + 1];
      if (value === '****') continue;

      const anomalyHundredths = parseFloat(value);
      if (!Number.isFinite(anomalyHundredths)) continue;

      rows.push({
        time: (year - 1950) + (month / 12.0),
        temperature: anomalyHundredths / 100.0
      });
    }
  }

  return sortRowsByTimeDesc(rows);
}

function parseNeukomTemperatureRows(rawLines) {
  const rows = [];
  if (!rawLines || rawLines.length === 0) return rows;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (line.length === 0 || line.startsWith('#')) continue;

    const tokens = line.split(/\s+/);
    if (tokens.length < 3) continue;
    if (!/^\d+$/.test(tokens[0])) continue;

    const yearCe = parseInt(tokens[0], 10);
    const median = parseFloat(tokens[2]);
    if (!Number.isFinite(yearCe) || !Number.isFinite(median)) continue;

    rows.push({
      time: yearCe - 1950,
      temperature: median,
      lower: parseFloat(tokens[3]),
      upper: parseFloat(tokens[4])
    });
  }

  return sortRowsByTimeDesc(rows);
}

function parseOsmanTemperatureRows(rawLines) {
  const rows = [];
  if (!rawLines || rawLines.length === 0) return rows;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (line.length === 0 || line.startsWith('#')) continue;

    const values = line.split(',').map(Number);
    if (values.length !== 3 || !values.every(Number.isFinite)) continue;
    const [ageCalBp, temperature, standardDeviation] = values;

    rows.push({
      time: -ageCalBp,
      temperature,
      lower: temperature - standardDeviation,
      upper: temperature + standardDeviation
    });
  }

  return sortRowsByTimeDesc(rows);
}

function parseHansenTemperatureRows(rawLines) {
  const rows = [];
  if (!rawLines || rawLines.length === 0) return rows;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (line.length === 0 || line.startsWith('-')) continue;

    const tokens = line.split(/\s+/);
    if (tokens.length < 7) continue;

    const timeMyrBp = parseFloat(tokens[2]);
    const surfaceTemp = parseFloat(tokens[5]);
    if (!Number.isFinite(timeMyrBp) || !Number.isFinite(surfaceTemp)) continue;

    rows.push({
      time: -timeMyrBp * 1000000.0,
      temperature: surfaceTemp
    });
  }

  return sortRowsByTimeDesc(rows);
}

function buildCombinedTemperatureTable(gissRows, pagesRows, osmanRows, hansenRows) {
  const gissReference = gissRows.filter(row => row.time >= 11 && row.time < 41);
  if (gissReference.length !== 360) throw new Error('GISS requires all 360 months of the 1961–1990 reference period');
  const gissOffset = gissReference.reduce((sum, row) => sum + row.temperature, 0) / gissReference.length;
  const overlapBins = osmanRows.filter(row => row.time >= -1700 && row.time <= -300);
  if (overlapBins.length !== 8) throw new Error('Osman requires eight complete overlap bins');
  const binOffsets = overlapBins.map(bin => {
    const target = pagesRows.filter(row => row.time >= bin.time - 100 && row.time < bin.time + 100);
    if (target.length !== 200) throw new Error('PAGES2k requires complete 150–1750 CE overlap coverage');
    return target.reduce((sum, row) => sum + row.temperature, 0) / target.length - bin.temperature;
  });
  const osmanOffset = binOffsets.reduce((sum, value) => sum + value, 0) / binOffsets.length;
  temperatureCalibration = { gissOffset, osmanOffset, hansenReference: 14, overlap: '150–1750 CE' };

  const rows = [];
  function append(sourceRows, source, offset, include, uncertainty = '') {
    for (const row of sourceRows) {
      if (!include(row.time)) continue;
      rows.push({ ...row, source, uncertainty,
        temperature: row.temperature + offset,
        lower: Number.isFinite(row.lower) ? row.lower + offset : undefined,
        upper: Number.isFinite(row.upper) ? row.upper + offset : undefined });
    }
  }
  append(gissRows, 'giss', -gissOffset, time => time >= -70);
  append(pagesRows, 'pages', 0, time => time >= -1949 && time < -70, '95% ensemble range');
  append(osmanRows, 'osman', osmanOffset, time => time < -1949, '±1σ ensemble spread');
  append(hansenRows, 'hansen', -14, time => time < -24000);
  sortRowsByTimeDesc(rows);
  const table = buildTimeValueTable(rows, 'temperature', 'Temperature');
  table.temperatureRows = rows; // Keep provenance and uncertainty with each plotted sample.
  return table;
}

function parseNoaaDailyCo2Rows(rawLines) {
  const rows = [];
  if (!rawLines || rawLines.length === 0) return rows;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (line.length === 0 || line.startsWith('#')) continue;

    const tokens = line.split(/\s+/);
    if (tokens.length < 5) continue;

    const decimalYear = parseFloat(tokens[3]);
    const ppm = parseFloat(tokens[4]);
    if (!Number.isFinite(decimalYear) || !Number.isFinite(ppm)) continue;
    if (ppm <= 0) continue;

    rows.push({
      time: decimalYear - 1950,
      co2: ppm, source: 'co2-noaa',
      sampleDate: tokens.slice(0, 3).map((value, index) => value.padStart(index === 0 ? 4 : 2, '0')).join('-')
    });
  }

  return sortRowsByTimeDesc(rows);
}

function parseAntarcticaCompositeCo2Rows(rawLines) {
  const rows = [];
  if (!rawLines || rawLines.length === 0) return rows;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (line.length === 0 || line.startsWith('#')) continue;
    if (line.startsWith('age_gas_calBP')) continue;

    const tokens = line.split(/\s+/);
    if (tokens.length < 2) continue;

    const ageGasCalBp = parseFloat(tokens[0]);
    const co2Ppm = parseFloat(tokens[1]);
    if (!Number.isFinite(ageGasCalBp) || !Number.isFinite(co2Ppm)) continue;
    if (co2Ppm <= 0) continue;

    rows.push({
      time: -ageGasCalBp,
      co2: co2Ppm, source: 'co2-ice',
      lower: co2Ppm - parseFloat(tokens[2]), upper: co2Ppm + parseFloat(tokens[2]),
      uncertainty: '±1σ measurement uncertainty'
    });
  }

  return sortRowsByTimeDesc(rows);
}

function parseCencopipCo2Rows(rawLines) {
  const rows = [];
  for (const line of rawLines || []) {
    const tokens = line.trim().split(',').map(token => token.replaceAll('"', ''));
    if (tokens.length !== 6) continue;
    if ([tokens[0], tokens[1], tokens[3], tokens[5]].some(token => token.trim() === '')) continue;
    const [ageMa, logLower, , logMedian, , logUpper] = tokens.map(Number);
    // The author's plotting code trims the first four bins to the Cenozoic.
    // All output quantiles are natural logarithms of ppm, not ppm themselves.
    if (!Number.isFinite(ageMa) || ageMa < 0 || ageMa > 66) continue;
    const [lower, co2, upper] = [logLower, logMedian, logUpper].map(Math.exp);
    if (![lower, co2, upper].every(Number.isFinite) || lower <= 0 || lower > co2 || co2 > upper) continue;
    rows.push({
      time: -ageMa * 1000000, co2, lower, upper, source: 'co2-cencopip', band: true,
      uncertainty: '95% credible interval for the 500,000-year mean',
      note: 'Bin midpoint; line connects 500,000-year averages'
    });
  }
  return sortRowsByTimeDesc(rows);
}

function buildCombinedCo2Table() {
  const ice = parseAntarcticaCompositeCo2Rows(sourceTables.co2AntarcticaRaw);
  const noaa = parseNoaaDailyCo2Rows(sourceTables.co2DailyRaw);
  const scripps = parseScrippsDailyCo2Rows(sourceTables.co2InSituRaw);
  const oldestIce = ice.length ? ice.at(-1).time : Infinity;
  const oldestNoaa = noaa.length ? noaa.at(-1).time : Infinity;
  const modern = [...noaa, ...scripps.filter(row => row.time < oldestNoaa)];
  const oldestModern = modern.length ? Math.min(...modern.map(row => row.time)) : Infinity;
  const reconstruction = parseCencopipCo2Rows(sourceTables.co2CencopipRaw)
    .filter(row => row.time < oldestIce);
  // Use the published synthesis for deep time. Prefer ice-core samples over
  // overlapping bins, without adding an endpoint or connecting across sources.
  return buildTimeValueTable(sortRowsByTimeDesc([
    ...modern, ...ice.filter(row => row.time < oldestModern), ...reconstruction
  ]), 'co2', 'CO2');
}



function decimalYearFromYmd(yearValue, monthValue, dayValue) {
  const dateValue = new Date(Date.UTC(yearValue, monthValue - 1, dayValue));
  if (!Number.isFinite(dateValue.getTime())) return null;

  const yearStart = Date.UTC(yearValue, 0, 1);
  const nextYearStart = Date.UTC(yearValue + 1, 0, 1);
  if (nextYearStart <= yearStart) return null;

  const elapsed = dateValue.getTime() - yearStart;
  const total = nextYearStart - yearStart;
  return yearValue + (elapsed / total);
}

function parseScrippsDailyCo2Rows(rawLines) {
  const rows = [];
  if (!rawLines || rawLines.length === 0) return rows;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (line.length === 0 || line.startsWith('%')) continue;

    const tokens = line.split(',').map((token) => token.trim());
    if (tokens.length < 4) continue;

    const yearValue = parseInt(tokens[0], 10);
    const monthValue = parseInt(tokens[1], 10);
    const dayValue = parseInt(tokens[2], 10);
    const ppm = parseFloat(tokens[3]);
    if (!Number.isFinite(yearValue) || !Number.isFinite(monthValue) || !Number.isFinite(dayValue) || !Number.isFinite(ppm)) continue;
    if (ppm <= 0) continue;

    const decimalYear = decimalYearFromYmd(yearValue, monthValue, dayValue);
    if (!Number.isFinite(decimalYear)) continue;

    rows.push({
      time: decimalYear - 1950,
      co2: ppm, source: 'co2-scripps', station: tokens[6],
      sampleDate: [yearValue, monthValue, dayValue].map((value, index) => String(value).padStart(index === 0 ? 4 : 2, '0')).join('-')
    });
  }

  return sortRowsByTimeDesc(rows);
}



function parseVolcanicSaodRows(rawLines) {
  const rows = [];
  if (!rawLines || rawLines.length === 0) return rows;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (line.length === 0) continue;
    if (line.startsWith('Time:')) continue;

    const tokens = line.split(',');
    if (tokens.length < 2) continue;

    const year = parseFloat(tokens[0]);
    const saod = parseFloat(tokens[1]);
    if (!Number.isFinite(year) || !Number.isFinite(saod)) continue;
    if (saod < 0) continue;

    rows.push({
      time: year - 1950,
      saod, source: year < -500 ? 'volcano-holvol' : year < 1901 ? 'volcano-evolv2k' : 'volcano-cmip6',
      maxGapYears: 1.5
    });
  }

  return sortRowsByTimeDesc(rows);
}

function buildVolcanicSaodTable(rawLines, fallbackTable = null) {
  const saodRows = parseVolcanicSaodRows(rawLines);
  return buildTimeValueTable(saodRows, 'saod', 'Volcanic Activity', fallbackTable);
}

function parseZeebeOrbitalRows(rawLines) {
  const rows = [];
  if (!rawLines || rawLines.length === 0) return rows;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (line.length === 0 || line.startsWith('#')) continue;
    if (line.startsWith('age_kyr')) continue;

    const tokens = line.split(/\s+/);
    if (tokens.length < 2) continue;

    const ageKyr = parseFloat(tokens[0]);
    const eccentricity = parseFloat(tokens[1]);
    if (!Number.isFinite(ageKyr) || !Number.isFinite(eccentricity)) continue;
    if (ageKyr > 58000) continue; // The provider cautions that older orbital phase is unconstrained.

    // The original astronomical solution is relative to J2000, despite the
    // archive's generic BP label. Convert every sample to the common 1950 axis.
    const time = ORBITAL_EPOCH_CE - 1950 - ageKyr * 1000.0;

    rows.push({
      time,
      eccentricity, source: 'orbit-zeebe'
    });
  }

  return sortRowsByTimeDesc(rows);
}

function buildEarthOrbitTableFromZeebe(rawLines) {
  const rows = parseZeebeOrbitalRows(rawLines);
  return buildTimeValueTable(rows, 'eccentricity', 'Eccentricity');
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = i + 1 < line.length ? line[i + 1] : '';

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function parseWorldPopulationRows(rawLines, maxYearInclusive) {
  const rows = [];
  if (!rawLines || rawLines.length < 2) return rows;

  const header = parseCsvLine(rawLines[0]);
  const entityIdx = header.indexOf('Entity');
  const codeIdx = header.indexOf('Code');
  const yearIdx = header.indexOf('Year');
  const projectedIdx = header.indexOf('Population (projections) (Projected)');
  const historicalIdx = header.indexOf('Population');

  if (entityIdx < 0 || codeIdx < 0 || yearIdx < 0 || projectedIdx < 0 || historicalIdx < 0) return rows;

  for (let i = 1; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (!line || line.trim().length === 0) continue;

    const tokens = parseCsvLine(line);
    if (tokens.length <= max(entityIdx, codeIdx, yearIdx, projectedIdx, historicalIdx)) continue;

    const entity = tokens[entityIdx];
    const code = tokens[codeIdx];
    if (entity !== 'World' && code !== 'OWID_WRL') continue;

    const yearValue = parseInt(tokens[yearIdx], 10);
    if (!Number.isFinite(yearValue)) continue;
    if (yearValue > maxYearInclusive) continue;

    const historicalValue = parseFloat(tokens[historicalIdx]);
    const projectedValue = parseFloat(tokens[projectedIdx]);
    const population = Number.isFinite(historicalValue) ? historicalValue : projectedValue;
    if (!Number.isFinite(population)) continue;

    rows.push({
      time: yearValue - 1950,
      population, source: Number.isFinite(historicalValue) ? 'population-history' : 'population-projection',
      mode: Number.isFinite(historicalValue) ? 'line' : 'projection'
    });
  }

  return sortRowsByTimeDesc(rows);
}

function buildPopulationTableFromLongRun(rawLines, maxYearInclusive) {
  const rows = parseWorldPopulationRows(rawLines, maxYearInclusive);
  return buildTimeValueTable(rows, 'population', 'Population');
}

function parseColoradoSeaLevelRows(rawLines) {
  const rows = [];
  if (!rawLines || rawLines.length === 0) return rows;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (line.length === 0 || line.startsWith('#')) continue;

    const tokens = line.split(/\s+/);
    if (tokens.length < 2) continue;

    const decimalYear = parseFloat(tokens[0]);
    const seaLevelMm = parseFloat(tokens[1]);
    if (!Number.isFinite(decimalYear) || !Number.isFinite(seaLevelMm)) continue;

    rows.push({
      time: decimalYear - 1950,
      sealevel: seaLevelMm / 1000.0, source: 'sea-satellite', maxGapYears: 0.25
    });
  }

  return sortRowsByTimeDesc(rows);
}

function parseGp2014SeaLevelRows(rawLines) {
  const rows = [];
  if (!rawLines || rawLines.length === 0) return rows;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (line.length === 0 || line.startsWith('%') || line.startsWith('#')) continue;

    const tokens = line.split(/\s+/);
    if (tokens.length < 4) continue;

    const decimalYear = parseFloat(tokens[0]);
    const gslMm = parseFloat(tokens[3]);
    if (!Number.isFinite(decimalYear) || !Number.isFinite(gslMm)) continue;

    rows.push({
      time: decimalYear - 1950,
      sealevel: gslMm / 1000.0, source: 'sea-gauges', maxGapYears: 0.25,
      lower: (gslMm - parseFloat(tokens[4])) / 1000,
      upper: (gslMm + parseFloat(tokens[4])) / 1000, uncertainty: 'published reconstruction error'
    });
  }

  return sortRowsByTimeDesc(rows);
}

function parseMiller2024SeaLevelRows(rawLines) {
  const rows = [];
  if (!rawLines || rawLines.length === 0) return rows;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (line.length === 0 || line.startsWith('#')) continue;
    if (line.startsWith('Age')) continue;

    const tokens = line.split(/\s+/);
    if (tokens.length < 12) continue;

    const ageKyBp = parseFloat(tokens[0]);
    const gmgslMeters = parseFloat(tokens[11]);
    if (!Number.isFinite(ageKyBp) || !Number.isFinite(gmgslMeters)) continue;

    rows.push({
      time: -ageKyBp * 1000.0,
      sealevel: gmgslMeters, source: 'sea-miller',
      note: 'Approximate geological reference; uncertainty not quantified here'
    });
  }

  return sortRowsByTimeDesc(rows);
}

function parseSolarIrradianceTableRows(table) {
  return extractTimeValueRows(table, 'Solar Irradiance', 'irradiance');
}

function parsePmipSolarRows(table) {
  return parseSolarIrradianceTableRows(table).map(row => {
    const calendarYear = row.time + 1950;
    const yearValue = Math.floor(calendarYear);
    if (calendarYear < 1850) {
      return { ...row, source: calendarYear < 1610 ? 'solar-satire-m' : 'solar-satire-t',
        cadence: 'annual', sampleDate: Math.abs(yearValue) + (yearValue < 0 ? ' BCE' : ' CE') + ' • annual mean' };
    }
    // PMIP daily years are rounded to four decimals. The author reader rounds
    // the day index; flooring the converted date can mislabel it one day early.
    const start = Date.UTC(yearValue, 0, 1);
    const daysInYear = (Date.UTC(yearValue + 1, 0, 1) - start) / 86400000;
    const milliseconds = start + Math.round((calendarYear - yearValue) * daysInYear) * 86400000;
    return { ...row, time: decimalYearFromMilliseconds(milliseconds) - 1950,
      source: 'solar-cmip6', cadence: 'day', sampleDate: new Date(milliseconds).toISOString().slice(0, 10) };
  });
}

function medianValue(values) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function pairedSolarOffset(sourceRows, referenceRows, start = -Infinity, end = Infinity) {
  const dayKey = row => row.sampleDate?.match(/^\d{4}-\d{2}-\d{2}$/)
    ? row.sampleDate : new Date(millisecondsFromDecimalYear(row.time + 1950)).toISOString().slice(0, 10);
  const byDay = new Map();
  for (const row of sourceRows) {
    if (row.time >= start && row.time < end && !row.provisional) byDay.set(dayKey(row), row.irradiance);
  }
  const months = new Map();
  for (const row of referenceRows) {
    if (row.time < start || row.time >= end || row.provisional) continue;
    const date = dayKey(row);
    const source = byDay.get(date);
    if (!Number.isFinite(source) || !Number.isFinite(row.irradiance)) continue;
    const key = date.slice(0, 7);
    const bin = months.get(key) || { sum: 0, count: 0, first: date, last: date };
    bin.sum += row.irradiance - source;
    bin.count++;
    bin.first = bin.first < date ? bin.first : date;
    bin.last = bin.last > date ? bin.last : date;
    months.set(key, bin);
  }
  const bins = [...months.values()].filter(bin => bin.count >= SOLAR_ALIGNMENT_MIN_DAYS);
  const differences = bins.map(bin => bin.sum / bin.count);
  const offset = bins.length >= SOLAR_ALIGNMENT_MIN_MONTHS ? medianValue(differences) : null;
  return { offset, months: bins.length, days: bins.reduce((count, bin) => count + bin.count, 0),
    first: bins.length ? bins.map(bin => bin.first).sort()[0] : null,
    last: bins.length ? bins.map(bin => bin.last).sort().at(-1) : null,
    residualMad: offset === null ? null : medianValue(differences.map(value => Math.abs(value - offset))) };
}

function annualSolarRows(rows) {
  const annual = [];
  const bins = new Map();
  for (const row of rows) {
    if (row.cadence === 'annual') { annual.push({ ...row }); continue; }
    const yearValue = Math.floor(row.time + 1950);
    const key = sourceSegment(row) + ':' + yearValue;
    const bin = bins.get(key) || { source: row.source, year: yearValue, sum: 0, count: 0,
      first: row.time, last: row.time, provisional: false };
    bin.sum += row.irradiance;
    bin.count++;
    bin.first = Math.min(bin.first, row.time);
    bin.last = Math.max(bin.last, row.time);
    bin.provisional ||= row.provisional;
    bins.set(key, bin);
  }
  for (const bin of bins.values()) {
    const first = new Date(millisecondsFromDecimalYear(bin.first + 1950)).toISOString().slice(0, 10);
    const last = new Date(millisecondsFromDecimalYear(bin.last + 1950)).toISOString().slice(0, 10);
    const partial = !first.endsWith('-01-01') || !last.endsWith('-12-31');
    // Partial years sit at the midpoint of their available coverage, so a
    // short source fragment or unfinished year does not acquire a later date.
    annual.push({ time: (bin.first + bin.last) / 2, irradiance: bin.sum / bin.count,
      source: bin.source, cadence: 'annual', maxGapYears: 1.5, provisional: bin.provisional,
      sampleDate: bin.year + ' CE • ' + (partial ? 'partial-year mean' : 'annual mean'),
      note: bin.count + ' daily values, ' + first + ' to ' + last + (bin.provisional ? '; includes provisional readings' : '') });
  }
  return sortRowsByTimeDesc(annual);
}

function parseNnlSolarRows(rawLines) {
  const rows = [];
  if (!rawLines || rawLines.length === 0) return rows;

  const epoch = Date.UTC(1610, 0, 1);

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (line.length === 0 || line.startsWith('#')) continue;

    const tokens = line.split(/[\s,]+/).filter((token) => token.length > 0);
    if (tokens.length < 2) continue;

    const daysSinceBase = parseFloat(tokens[0]);
    const irradiance = parseFloat(tokens[1]);
    if (!Number.isFinite(daysSinceBase) || !Number.isFinite(irradiance)) continue;
    if (irradiance <= 0) continue;

    const decimalYear = decimalYearFromMilliseconds(epoch + daysSinceBase * 86400000);
    rows.push({
      time: decimalYear - 1950,
      irradiance, source: 'solar-nnl', cadence: 'day',
      sampleDate: new Date(millisecondsFromDecimalYear(decimalYear)).toISOString().slice(0, 10)
    });
  }

  return sortRowsByTimeDesc(rows);
}

function parseTsisSolarRows(rawLines) {
  const rows = [];
  if (!rawLines || rawLines.length === 0) return rows;


  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (line.length === 0 || line.startsWith('#')) continue;

    const tokens = line.split(/[\s,]+/).filter((token) => token.length > 0);
    if (tokens.length < 2) continue;

    const julianDate = parseFloat(tokens[0]);
    const irradiance = parseFloat(tokens[1]);
    if (!Number.isFinite(julianDate) || !Number.isFinite(irradiance)) continue;
    if (irradiance <= 0) continue;

    const decimalYear = decimalYearFromMilliseconds((julianDate - 2440587.5) * 86400000);
    rows.push({
      time: decimalYear - 1950,
      irradiance, source: 'solar-tsis', cadence: 'day', provisional: tokens[13] === '1',
      sampleDate: new Date(millisecondsFromDecimalYear(decimalYear)).toISOString().slice(0, 10)
    });
  }

  return sortRowsByTimeDesc(rows);
}

function smoothDenseSolarRows(rows, denseStartTime, windowDays) {
  if (!rows || rows.length < 3) return rows;
  if (!Number.isFinite(windowDays) || windowDays <= 0) return rows;
  // Each source is smoothed independently, so the window never blends a join.
  const sources = new Set(rows.map(row => row.source));
  if (sources.size > 1) {
    return sortRowsByTimeDesc([...sources].flatMap(source =>
      smoothDenseSolarRows(rows.filter(row => row.source === source), denseStartTime, windowDays)));
  }

  let denseCount = 0;
  while (denseCount < rows.length && rows[denseCount].time >= denseStartTime) denseCount++;
  if (denseCount < 3) return rows;

  const windowYears = windowDays / (2 * 365.2425);
  const ascendingTimes = new Array(denseCount);
  const ascendingValues = new Array(denseCount);

  for (let i = 0; i < denseCount; i++) {
    const source = rows[denseCount - 1 - i];
    ascendingTimes[i] = source.time;
    ascendingValues[i] = source.irradiance;
  }

  const prefix = new Array(denseCount + 1);
  prefix[0] = 0;
  for (let i = 0; i < denseCount; i++) {
    prefix[i + 1] = prefix[i] + ascendingValues[i];
  }

  const smoothedAscending = new Array(denseCount);
  let lower = 0;
  let upper = -1;

  for (let i = 0; i < denseCount; i++) {
    const currentTime = ascendingTimes[i];
    const minTime = currentTime - windowYears;
    const maxTime = currentTime + windowYears;

    while (lower < denseCount && ascendingTimes[lower] < minTime) lower++;
    if (upper < lower - 1) upper = lower - 1;
    while (upper + 1 < denseCount && ascendingTimes[upper + 1] <= maxTime) upper++;

    const count = max(1, upper - lower + 1);
    const sum = prefix[upper + 1] - prefix[lower];
    smoothedAscending[i] = sum / count;
  }

  const smoothedRows = cloneTimeValueRows(rows, 'irradiance');
  for (let i = 0; i < denseCount; i++) {
    smoothedRows[denseCount - 1 - i].irradiance = smoothedAscending[i];
    smoothedRows[denseCount - 1 - i].note = '50-day mean within this source' +
      (smoothedRows[denseCount - 1 - i].provisional ? '; provisional observation' : '');
  }

  return smoothedRows;
}

function mergeSolarTableWithNnlAndTsis(baseTable, nnlRawLines, tsisRawLines) {
  const base = parseSolarIrradianceTableRows(baseTable);
  const nnl = parseNnlSolarRows(nnlRawLines);
  const tsis = parseTsisSolarRows(tsisRawLines)
    .map(row => ({ ...row, source: 'solar-tsis', maxGapYears: 7 / 365.2425 }));
  // Preserve the measured TSIS irradiances. Only shift the historical models.
  const nnlAlignment = pairedSolarOffset(nnl, tsis);
  const alignedNnl = offsetValueRows(nnl, 'irradiance', nnlAlignment.offset ?? 0);
  const reference = alignedNnl.length ? alignedNnl : tsis;
  const start = reference.at(-1)?.time ?? Infinity;
  const baseAlignment = pairedSolarOffset(base, reference, start, start + SOLAR_ALIGNMENT_WINDOW_YEARS);
  const alignedBase = offsetValueRows(base, 'irradiance', baseAlignment.offset ?? 0);
  solarCalibration = {
    nnlOffset: nnlAlignment.offset, satireOffset: baseAlignment.offset,
    nnlAlignment, baseAlignment
  };
  const oldestTsis = tsis.at(-1)?.time ?? Infinity;
  const olderNnl = alignedNnl.filter(row => row.time < oldestTsis);
  const oldestContinuation = olderNnl.at(-1)?.time ?? tsis.at(-1)?.time ?? Infinity;
  const merged = sortRowsByTimeDesc([
    ...tsis, ...olderNnl, ...alignedBase.filter(row => row.time < oldestContinuation)
  ]);
  const table = buildTimeValueTable(smoothDenseSolarRows(merged,
    SOLAR_DENSE_SMOOTH_START_TIME, SOLAR_DENSE_SMOOTH_WINDOW_DAYS),
    'irradiance', 'Solar Irradiance', baseTable);
  table.solarCadence = 'detail';
  table.annualTable = buildTimeValueTable(annualSolarRows(merged), 'irradiance', 'Solar Irradiance');
  table.annualTable.solarCadence = 'annual';
  return table;
}

function buildCombinedSeaLevelTable(coloradoRows, gpRows, millerRows) {
  // Modern observations have arbitrary datums. Anchor the tide-gauge curve to
  // its 1950 mean, then align satellite observations using matching months.
  const reference = gpRows.filter(row => row.time >= 0 && row.time < 1);
  if (reference.length !== 12) throw new Error('Sea level requires all twelve tide-gauge months of 1950');
  const gpReference = reference.reduce((sum, row) => sum + row.sealevel, 0) / reference.length;
  const gp = offsetValueRows(gpRows, 'sealevel', -gpReference);
  const satelliteOffset = matchedMonthlyOffset(coloradoRows, gp, 'sealevel',
    Math.max(coloradoRows.at(-1)?.time ?? Infinity, gp.at(-1).time),
    Math.min(coloradoRows[0]?.time ?? -Infinity, gp[0].time));
  if (coloradoRows.length && satelliteOffset === null) throw new Error('Sea-level records have no shared calibration months');
  const satellites = offsetValueRows(coloradoRows, 'sealevel', satelliteOffset ?? 0);
  // Geological zero age is only an approximate modern reference. Rebase that
  // published point separately; do not fit it to the modern measurements.
  const zeroAge = millerRows.find(row => row.time === 0);
  if (!zeroAge) throw new Error('Miller requires its published zero-age reference');
  const geological = offsetValueRows(millerRows, 'sealevel', -zeroAge.sealevel);
  seaLevelCalibration = { gpReference, satelliteOffset, millerReference: zeroAge.sealevel };
  const oldestSatellite = satellites.at(-1)?.time ?? Infinity;
  const olderGp = gp.filter(row => row.time < oldestSatellite);
  const oldestModern = olderGp.at(-1)?.time ?? satellites.at(-1)?.time ?? Infinity;
  return buildTimeValueTable(sortRowsByTimeDesc([
    ...satellites, ...olderGp, ...geological.filter(row => row.time < oldestModern)
  ]), 'sealevel', 'Sealevel');
}

function setup() {
  // Set window size and properties
  createCanvas(windowWidth, windowHeight);
  currentYear = decimalYearFromYmd(year(), month(), day() + 1);
  if (!Number.isFinite(currentYear)) currentYear = year();
  sourceTables.earthOrbit = buildEarthOrbitTableFromZeebe(sourceTables.zeebeOrbitalRaw);
  sourceTables.volcanic = buildVolcanicSaodTable(sourceTables.volcanicSaodRaw, sourceTables.volcanic);
  sourceTables.population = buildPopulationTableFromLongRun(sourceTables.populationLongRunRaw, year());
  sourceTables.co2 = buildCombinedCo2Table();

  sourceTables.temperature = buildCombinedTemperatureTable(
    parseGissTemperatureRows(sourceTables.gissTempRaw),
    parseNeukomTemperatureRows(sourceTables.neukomTempRaw),
    parseOsmanTemperatureRows(sourceTables.osmanTempRaw),
    parseHansenTemperatureRows(sourceTables.hansenTempRaw));
  sourceTables.solarBase = buildTimeValueTable(
    parsePmipSolarRows(sourceTables.solarIrradiance),
    'irradiance',
    'Solar Irradiance',
    sourceTables.solarIrradiance
  );
  sourceTables.solarIrradiance = mergeSolarTableWithNnlAndTsis(
    sourceTables.solarBase,
    sourceTables.solarIrradianceNnlRaw,
    sourceTables.solarIrradianceTsisRaw
  );
  sourceTables.sealevel = buildCombinedSeaLevelTable(
    parseColoradoSeaLevelRows(sourceTables.sealevelRaw),
    parseGp2014SeaLevelRows(sourceTables.sealevelGpRaw),
    parseMiller2024SeaLevelRows(sourceTables.sealevelMillerRaw));

  // Add historical events (type 0 = duration bands, type 1 = point events)
  event.push(new TimelineEvent(0, 'Age of the Universe', -13800000000, currentYear * 3, 255));
  event.push(new TimelineEvent(0, 'Age of Earth', -4540000000, currentYear * 3, 255));
  event.push(new TimelineEvent(0, 'Water on Earth', -4280000000, currentYear * 3, 10));
  event.push(new TimelineEvent(0, 'Single-celled life on Earth', -3800000000, currentYear * 3, 10));
  event.push(new TimelineEvent(0, 'Multicellular life on Earth', -3250000000, currentYear * 3, 10));
  event.push(new TimelineEvent(0, 'Dinosaurs', -243000000, -65000000, 20));

  event.push(new TimelineEvent(0, 'Australopithecus', -4200000, -1200000, 20));
  event.push(new TimelineEvent(0, 'Homo Habilis', -2400000, -1500000, 20));
  event.push(new TimelineEvent(0, 'Homo Erectus', -2000000, -100000, 20));
  event.push(new TimelineEvent(0, 'Homo Sapiens', -300000, currentYear, 20));
  event.push(new TimelineEvent(0, 'Agricultural Revolution', -11000, -4000, 30));
  event.push(new TimelineEvent(0, 'Recorded History', -7000, currentYear, 30));
  event.push(new TimelineEvent(0, 'Life of Buddha', -551, -479, 35));
  event.push(new TimelineEvent(0, 'Life of Muhammad', 570, 630, 35));
  event.push(new TimelineEvent(0, 'Life of Jesus Christ', -4, 70, 35));
  event.push(new TimelineEvent(0, 'Crusades', 1095, 1291, 255));
  event.push(new TimelineEvent(0, 'European Colonization', 1492, currentYear, 40));
  event.push(new TimelineEvent(0, 'Industrial Revolution', 1760, currentYear, 50));
  event.push(new TimelineEvent(0, 'WWI', 1914, 1918.5, 60));
  event.push(new TimelineEvent(0, 'WWII', 1933, 1945, 70));
  event.push(new TimelineEvent(0, 'Cold War', 1947, 1991, 80));
  event.push(new TimelineEvent(0, 'World Wide Web', 1989, currentYear, 90));

  event.push(new TimelineEvent(1, 'Beginning of Time', -13800000000, -1000000, 255));
  event.push(new TimelineEvent(1, 'Formation of the Moon', -4500000000, -4500000000, 255));
  event.push(new TimelineEvent(1, 'Pangaea supercontinent breaks apart', -175000000, -175000000, 255));
  event.push(new TimelineEvent(1, 'Stone Tools', -3400000, -3400000, 255));
  event.push(new TimelineEvent(1, 'Fire', -1000000, -1000000, 255));
  event.push(new TimelineEvent(1, 'Wheel', -3500, -3500, 255));
  event.push(new TimelineEvent(1, 'Great Pyramid of Giza', -2560, -2560, 255));
  event.push(new TimelineEvent(1, 'Iron Tools', -1200, -1200, 255));
  event.push(new TimelineEvent(1, 'Printing Press', 1450, 1450, 255));
  event.push(new TimelineEvent(1, 'Calculus', 1665, 1665, 255));
  event.push(new TimelineEvent(1, 'Battery', 1800, 1800, 255));
  event.push(new TimelineEvent(1, 'Telegraph', 1837, 1837, 255));
  event.push(new TimelineEvent(1, 'Theory of Evolution', 1859, 1859, 255));
  event.push(new TimelineEvent(1, 'Car', 1886, 1886, 255));
  event.push(new TimelineEvent(1, 'Airplane', 1903, 1903, 255));
  event.push(new TimelineEvent(1, 'Television', 1927, 1927, 255));
  event.push(new TimelineEvent(1, 'Computer', 1938, 1938, 255));
  event.push(new TimelineEvent(1, 'Transistor', 1947.9, 1947.9, 255));
  event.push(new TimelineEvent(1, 'Moon Landing', 1969, 1969, 255));
  event.push(new TimelineEvent(1, 'Fall of Berlin Wall', 1989.856965, 1989.856965, 255));
  event.push(new TimelineEvent(1, '9/11', 2001.695429, 2001.695429, 255));
  event.push(new TimelineEvent(1, 'Fukushima', 2011.191654, 2011.191654, 255));
  event.push(new TimelineEvent(1, 'Paris Agreement', 2016.309384, 2016.309384, 255));
  event.push(new TimelineEvent(1, 'COVID-19', 2020.082137, 2023.342238, 255));

  // Temperature stays at the bottom; simple top buttons choose the comparison.
  data.push(new Data(sourceTables.temperature, 'time', 'Temperature', '°C', 0, color(255), 0, true, 'Global temperature'));
  data.push(new Data(sourceTables.co2, 'time', 'CO2', 'ppm', 1, color(255, 128, 64), 0, true, 'Atmospheric CO₂'));
  data.push(new Data(sourceTables.earthOrbit, 'time', 'Eccentricity', '', 1, color(128, 128, 255), 0, false, 'Orbital eccentricity'));
  data.push(new Data(sourceTables.solarIrradiance, 'time', 'Solar Irradiance', 'W/m²', 1, color(255, 220, 0), 0, true, 'Total solar irradiance'));
  data.push(new Data(sourceTables.volcanic, 'time', 'Volcanic Activity', 'OD', 1, color(255, 180, 80), 0, true, 'Volcanic optical depth'));
  data.push(new Data(sourceTables.sealevel, 'time', 'Sealevel', 'm', 1, color(0, 128, 255), 0, true, 'Global sea level'));
  data.push(new Data(sourceTables.population, 'time', 'Population', 'people', 1, color(255, 128, 200), 0, true, 'World population'));
}

function selectComparison(upperIndex) {
  if (!data[upperIndex] || upperIndex < 1) return;
  selectedData = upperIndex;
  redrawRequested = true;
}

function showDataGuide() {
  if (typeof document === 'undefined') return;
  const guide = document.getElementById('about-data');
  if (guide && !guide.open) guide.showModal();
}

function dataGuideIsOpen() {
  return typeof document !== 'undefined' && document.getElementById('about-data')?.open;
}

function panelTargetY(position) {
  return height / GUI_HEIGHT_DIVISOR + (position === 0 ? height / DATA_PANEL_HEIGHT_DIVISOR : 0);
}

function draw() {
  // Set cursor based on mouse state
  if (mouseIsPressed) {
    cursor(MOVE);
  } else {
    cursor(ARROW);
  }

  textAlign(LEFT, BASELINE);

  // Calculate time-to-pixel conversion (negative = past extends left)
  oneYear = -(1 / scrollValue) * 1000;

  // Only redraw if something changed (performance optimization)
  if (redrawRequested || dist(mouseX, mouseY, pmouseX, pmouseY) > 0
    || scrollValue !== pScrollValue
    || data[selectedData].position !== 1
    || Math.abs(data[selectedData].rectY - panelTargetY(1)) > Data.SNAP_THRESHOLD_PX
    || Math.abs(data[0].rectY - panelTargetY(0)) > Data.SNAP_THRESHOLD_PX) {
    redrawRequested = false;
    push();
    translate(-shift, 0); // Apply left margin shift
    perfDataVertices = 0;
    perfEventsDrawn = 0;
    perfEventsCulled = 0;
    perfTimelineTicks = 0;
    perfTimelineLabels = 0;

    colorMode(RGB);
    background(0, 16, 32); // Dark blue background

    // Draw top GUI bar background
    fill(0);
    noStroke();
    rect(0, 0, width, height / GUI_HEIGHT_DIVISOR);

    data[0].draw();
    data[selectedData].position = 1;
    data[selectedData].draw();

    // Draw bottom timeline background
    fill(0);
    noStroke();
    rect(0, height, width, -height / TIMELINE_HEIGHT_DIVISOR);

    // Draw historical events with color coding
    for (let i = 0; i < event.length; i++) {
      if (event[i].type === 0) {
        event[i].c = color(128, 128, map(i, 0, event.length - 1, 220, 0)); // Duration events
      } else if (event[i].type === 1) {
        event[i].c = color(150, 255, map(i, 0, event.length - 1, 220, 0)); // Point events
      }
      event[i].draw();
    }

    // Draw crosshair and time readout
    if (showCursor && mouseX >= 0 && mouseX <= width - shift && mouseY > height / GUI_HEIGHT_DIVISOR) {
      fill(255);
      stroke(255, STROKE_ALPHA_LOW);
      line(mouseX + shift, height - height / TIMELINE_HEIGHT_DIVISOR_SMALL, mouseX + shift, height); // Vertical line to timeline
      line(mouseX + shift, mouseY, mouseX + shift, height - height / 9); // Vertical line to data
      noStroke();
      textSize(Math.max(11, height / TEXT_SIZE_DIVISOR_SMALL));
      textAlign(CENTER, BASELINE);
      const label = cursorTimeLabel(yearFromPlotX(mouseX + shift));
      const halfLabelWidth = textWidth(label) / 2;
      const labelX = constrain(mouseX + shift, shift + halfLabelWidth + 4, width - halfLabelWidth - 4);
      text(label, labelX, height - height / GUI_HEIGHT_DIVISOR);
    }

    // Draw right margin background
    fill(0);
    noStroke();
    rect(width, 0, shift, height);

    // Draw timeline ticks and labels
    fill(255);
    stroke(0);
    textAlign(CENTER, BASELINE);
    textSize(Math.max(11, Math.min(14, height / TEXT_SIZE_DIVISOR_SMALL)));
    let lastLabelLeft = Infinity;
    const universeStartYear = currentYear - 13800000000;
    const ticks = timelineTicks(Math.max(universeStartYear, yearFromPlotX(shift)), currentYear, Math.abs(oneYear));
    for (const tick of ticks) {
      const x = plotXFromYear(tick.year);
      const halfLabelWidth = textWidth(tick.label) / 2;
      perfTimelineTicks++;
      if (x - halfLabelWidth >= shift + 4 && x + halfLabelWidth <= width - 4
        && x + halfLabelWidth + 8 <= lastLabelLeft) {
        noStroke();
        text(tick.label, x, height - height / 24);
        lastLabelLeft = x - halfLabelWidth;
        perfTimelineLabels++;
      }
      stroke(255);
      line(x, height - height / TIMELINE_HEIGHT_DIVISOR_SMALL, x, height);
    }

    // Draw universe age boundary line
    const x = plotXFromYear(universeStartYear);
    line(x, height, x, -height); // Vertical line at universe age

    textAlign(LEFT, BASELINE);
    fill(255);
    pop();
    GUI(); // Draw top GUI bar

    textSize(height / TEXT_SIZE_DIVISOR_TINY);
    fill(255);
    if (perfHUD) {
      textAlign(LEFT, TOP);
      const perfLine1 = `FPS: ${nfs(frameRate(), 0, 1)}  Zoom: ${nfc(scrollValue, 0)}`;
      const perfLine2 = `Data verts: ${perfDataVertices}  Events drawn: ${perfEventsDrawn}  culled: ${perfEventsCulled}`;
      const perfLine3 = `Timeline labels: ${perfTimelineLabels} / ticks: ${perfTimelineTicks}`;
      fill(0, 32, 64, BACKGROUND_ALPHA_HIGH);
      rect(8, 8, max(textWidth(perfLine1), textWidth(perfLine2), textWidth(perfLine3)) + 12, height / TEXT_SIZE_DIVISOR_TINY * 4);
      fill(255);
      noStroke();
      text(perfLine1, 14, 10);
      text(perfLine2, 14, 10 + height / TEXT_SIZE_DIVISOR_TINY);
      text(perfLine3, 14, 10 + 2 * (height / TEXT_SIZE_DIVISOR_TINY));
    }
  }
  pScrollValue = scrollValue; // Store previous scroll value for change detection
}

function GUI() {
  const labels = ['CO₂', 'Orbit', 'Solar', 'Volcanoes', 'Sea level', 'Population'];
  textAlign(CENTER, CENTER);
  textSize(max(10, min(height / 42, width / 75)));
  stroke(255);
  strokeWeight(0.5);
  line(0, height / GUI_HEIGHT_DIVISOR, width, height / GUI_HEIGHT_DIVISOR);
  noStroke();
  for (let i = 0; i < labels.length; i++) {
    fill(i + 1 === selectedData ? data[i + 1].c : 160);
    if (mouseY >= 0 && mouseY < height / GUI_HEIGHT_DIVISOR
      && mouseX >= width * i / labels.length && mouseX < width * (i + 1) / labels.length) fill(255);
    text(labels[i], width * (i + 0.5) / labels.length, height / (2 * GUI_HEIGHT_DIVISOR));
  }
}

function setZoom(value) {
  if (!Number.isFinite(value)) return;
  scrollValue = constrain(value, 1, MAX_SCROLL_VALUE);
  redrawRequested = true;
}

function keyPressed() {
  if (dataGuideIsOpen()) return;
  if (key === '-' || key === 'a' || key === 'A' || keyCode === LEFT_ARROW) {
    setZoom(scrollValue + scrollSpeed + scrollValue / 50);
  }
  if (key === '+' || key === 'd' || key === 'D' || keyCode === RIGHT_ARROW) {
    setZoom(scrollValue - scrollSpeed - scrollValue / 50);
  }
  const presets = [10, 100, 1000, 10000, 100000, 1000000, 10000000, 100000000, 1000000000, 14000000000];
  if (/^[0-9]$/.test(key)) setZoom(presets[Number(key)]);
  if (key === 'p' || key === 'P') { perfHUD = !perfHUD; redrawRequested = true; }
  if (key === 'C' || key === 'c' || key === ' ') { showCursor = !showCursor; redrawRequested = true; }
}

function sourceLabelForDataPoint(sample) {
  return sample?.source ? SOURCE_INFO[sample.source]?.label || sample.source : '';
}

function wrapTooltipText(value, availableWidth) {
  const lines = [];
  let current = '';
  for (const word of value.split(/\s+/)) {
    const candidate = current ? current + ' ' + word : word;
    if (current && textWidth(candidate) > availableWidth) {
      lines.push(current);
      current = word;
    } else current = candidate;
  }
  if (current) lines.push(current);
  return lines;
}

function mousePressed() {
  if (dataGuideIsOpen()) return;
  if (mouseButton === RIGHT) { showCursor = !showCursor; redrawRequested = true; }
  else if (mouseY >= 0 && mouseY < height / GUI_HEIGHT_DIVISOR && mouseX >= 0 && mouseX < width) {
    selectComparison(1 + Math.floor(mouseX / width * (data.length - 1)));
  }
}

function mouseWheel(event) {
  if (dataGuideIsOpen()) return true;
  // Scale zoom proportionally to current zoom level
  const wheelSteps = event.delta / 100;
  const zoomFactor = 1.0 + (0.25 * wheelSteps); // 25% zoom per wheel step

  // Apply zoom with bounds checking
  const newScrollValue = scrollValue * zoomFactor;
  setZoom(newScrollValue);

  return false;
}

function mouseMoved() {
  // p5 can update its previous-pointer coordinates before the next draw.
  // Explicitly invalidate the settled view so hover text always follows input.
  redrawRequested = true;
}

function mouseDragged() {
  if (dataGuideIsOpen()) return;
  const deltaX = mouseX - pmouseX;
  let zoomDivisor;
  if (mouseX < width - 200) zoomDivisor = (scrollSpeed * width) - mouseX - shift;
  else zoomDivisor = scrollSpeed * 200;

  zoomDivisor = max(10, abs(zoomDivisor));
  setZoom(scrollValue + deltaX * (scrollValue / zoomDivisor));
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  redrawRequested = true;
}

class Data {
  static MIN_Y_RANGE = 0.000001;
  static SNAP_THRESHOLD_PX = 5;
  static SPRING_BASE_SPEED = 5;
  static SPRING_DAMPING_DIVISOR = 10;

  // Copy a parsed source table into arrays for drawing.
  constructor(sourceTable, sourceColumnX, sourceColumnY, sourceUnit, sourcePosition, sourceColor, sourceType, sourceYScroll, displayName = sourceColumnY) {
    // Data properties
    this.type = sourceType;                    // Rendering type, panel position
    this.position = sourcePosition;
    const rowCount = sourceTable ? sourceTable.getRowCount() : 0;
    this.dataX = new Array(rowCount); // X and Y data arrays
    this.dataY = new Array(rowCount);
    this.temperatureRows = sourceTable?.temperatureRows || null;
    this.seriesRows = sourceTable?.seriesRows || this.temperatureRows;
    this.hasSourceJoins = new Set((this.seriesRows || []).map(sourceSegment).filter(Boolean)).size > 1;
    this.hasUncertaintyBands = (this.seriesRows || []).some(row => row.band);
    this.solarCadence = sourceTable?.solarCadence;
    this.annualSeries = null;
    this.defRectY = 0;                         // Default Y position for panel
    this.rectX = 0;
    this.rectY = 0;
    this.rectW = 0;
    this.rectH = 0;                            // Panel rectangle properties
    this.columnX = sourceColumnX;
    this.columnY = sourceColumnY;
    this.displayName = displayName;
    this.unit = sourceUnit;                    // Column names and unit
    this.maxX = 0;
    this.maxY = 0;
    this.localMaxY = 0;
    this.minX = 0;
    this.minY = 0;
    this.localMinY = 0;
    this.distX = 0;
    this.distY = 0;                            // Data ranges
    this.BP = currentYear - 1950;              // BP offset used by datasets with 1950-based time axes
    this.dataDist = 0;                         // Distance to mouse for tooltip
    this.yScrolling = sourceYScroll;           // Enable Y-axis autoscaling
    this.c = sourceColor;                      // Dataset color

    // Set initial panel positions
    if (this.position === 0) this.rectY = height;      // Baseline panel at bottom
    if (this.position === 1) this.rectY = -height / 3; // Overlay panel at top

    // Initialize min/max values with first row
    if (rowCount === 0) return;
    this.maxX = sourceTable.getRow(0).getNum(this.columnX);
    this.maxY = sourceTable.getRow(0).getNum(this.columnY);
    this.minX = sourceTable.getRow(0).getNum(this.columnX);
    this.minY = sourceTable.getRow(0).getNum(this.columnY);

    // Load all data and find min/max ranges
    for (let i = 0; i < sourceTable.getRowCount(); i++) {
      const row = sourceTable.getRow(i);
      this.dataX[i] = row.getNum(this.columnX);
      this.dataY[i] = row.getNum(this.columnY);
      if (this.dataX[i] > this.maxX) this.maxX = this.dataX[i];
      if (this.dataX[i] < this.minX) this.minX = this.dataX[i];
      const [lower, upper] = this.valueBoundsAt(i);
      if (upper > this.maxY) this.maxY = upper;
      if (lower < this.minY) this.minY = lower;
    }
    // Calculate data ranges
    this.distY = this.maxY - this.minY;
    this.distX = this.maxX - this.minX;
    if (sourceTable.annualTable) {
      this.annualSeries = new Data(sourceTable.annualTable, sourceColumnX, sourceColumnY,
        sourceUnit, sourcePosition, sourceColor, sourceType, sourceYScroll, displayName);
    }
  }

  displaySeries() {
    return this.annualSeries && oneYear !== 0 && Math.abs((width - shift) / oneYear) > SOLAR_ANNUAL_VIEW_YEARS
      ? this.annualSeries : this;
  }

  draw() {
    const display = this.displaySeries();
    if (display !== this) {
      display.rectY = this.rectY;
      display.position = this.position;
      display.yScrolling = this.yScrolling;
      display.draw();
      for (const key of ['rectX', 'rectY', 'rectW', 'rectH', 'localMinY', 'localMaxY', 'distY', 'dataDist']) {
        this[key] = display[key];
      }
      return;
    }
    if (this.dataX.length === 0) {
      this.rectY = panelTargetY(this.position);
      return;
    }
    colorMode(RGB);
    this.defRectY = height / GUI_HEIGHT_DIVISOR;   // Default Y position below GUI
    this.rectX = width - oneYear * (this.maxX - this.BP); // Panel X position (newest observation)
    this.rectW = oneYear * abs(this.distX);        // Panel width based on time range

    const visibleCount = this.visiblePointCount();
    let renderDistance = visibleCount;

    // Include one point beyond visible range for proper line drawing
    if (renderDistance < this.dataX.length) renderDistance++;

    // Calculate Y-axis scaling (global vs local)
    this.localMinY = this.minY;
    this.localMaxY = this.maxY;
    this.distY = this.maxY - this.minY;
    if (this.yScrolling && visibleCount > 0) {
      // Fit visible samples and the portion of a connecting line at the left edge.
      this.localMaxY = this.dataY[0];
      this.localMinY = this.dataY[0];
      for (let i = 0; i < visibleCount; i += 1) {
        const [lower, upper] = this.valueBoundsAt(i);
        if (upper > this.localMaxY) this.localMaxY = upper;
        if (lower < this.localMinY) this.localMinY = lower;
      }
      const edgeBounds = this.leftEdgeValueBounds(visibleCount);
      if (edgeBounds) {
        this.localMinY = min(this.localMinY, edgeBounds[0]);
        this.localMaxY = max(this.localMaxY, edgeBounds[1]);
      }
      this.distY = this.localMaxY - this.localMinY;
    }

    if (abs(this.distY) < Data.MIN_Y_RANGE) this.distY = Data.MIN_Y_RANGE;

    if (this.position === 1) {
      this.rectH = height / DATA_PANEL_HEIGHT_DIVISOR;
      // Robust hit-test using min/max bounds
      const rectLeft = min(this.rectX, this.rectX + this.rectW);
      const rectRight = max(this.rectX, this.rectX + this.rectW);
      const rectTop = min(this.rectY, this.rectY + this.rectH);
      const rectBottom = max(this.rectY, this.rectY + this.rectH);

      if (mouseIsPressed && pmouseX >= rectLeft && pmouseX <= rectRight
        && pmouseY >= rectTop && pmouseY <= rectBottom) {
        this.rectY += (mouseY - pmouseY);
      } else {
        this.rectY = this.easeToTarget(this.rectY, this.defRectY);
      }
    } else if (this.position === 0) {
      this.rectH = height / DATA_PANEL_HEIGHT_DIVISOR;
      this.rectY = this.easeToTarget(this.rectY, this.rectH + this.defRectY);
    }

    // Special positioning for type 2 (follow mouse)
    if (this.type === 2) this.rectY = mouseY - this.rectH / 2;

    if (visibleCount === 0) {
      noStroke();
      fill(0, 32, 64, BACKGROUND_ALPHA);
      rect(shift, this.rectY, width - shift, this.rectH);
      fill(this.c);
      textSize(height / TEXT_SIZE_DIVISOR_MEDIUM);
      textAlign(LEFT, TOP);
      text(this.displayName + ':', shift + 10, this.rectY + 5);
      textSize(height / TEXT_SIZE_DIVISOR_SMALL);
      text('No samples in view. Zoom out.', shift + 10, this.rectY + 35);
      return;
    }

    // Draw panel background
    fill(0, 32, 64, BACKGROUND_ALPHA);
    stroke(255, STROKE_ALPHA_MEDIUM);
    noStroke();

    // Draw panel rectangle (extends to left edge when data continues off-screen)
    if (renderDistance < this.dataX.length) rect(this.rectX, this.rectY, -width, this.rectH);
    else rect(this.rectX, this.rectY, this.rectW, this.rectH);

    // Draw dataset label
    textSize(height / TEXT_SIZE_DIVISOR_MEDIUM);
    fill(this.c);
    textAlign(LEFT, TOP);
    text(this.displayName + ':', shift + 10, this.rectY + 5);

    // Begin drawing the data line/curve
    // The extra point draws the connecting line at the left edge. Only its
    // visible intersection contributes to scaling; its off-screen value does not.
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(shift, this.rectY, width - shift, this.rectH);
    drawingContext.clip();
    stroke(255);
    strokeWeight(1);
    noFill();
    const h = -this.rectH / this.distY;
    const w = oneYear;
    const x = width;
    const y = (this.rectY + this.rectH / 2) - (this.localMinY * h + ((h * this.distY) / 2));

    this.drawUncertaintyBands(renderDistance, x, y, w, h);
    const plottedIndices = this.extremaPreservingIndices(renderDistance);
    let previousIndex = null;
    if (this.type === 1) {
      beginShape();
      vertex(this.rectX, this.rectY);
    }
    stroke(this.c);
    for (const index of plottedIndices) {
      const sample = this.seriesRows?.[index];
      strokeWeight(sample?.mode === 'points' ? 3 : 1);
      drawingContext.setLineDash(sample?.mode === 'projection' ? [5, 4] : []);
      stroke(this.c);
      const pointX = x - w * (this.dataX[index] - this.BP);
      const pointY = y + this.dataY[index] * h;
      if (this.type === 1) {
        curveVertex(pointX, pointY);
      } else if (previousIndex === null || !this.canConnectIndices(previousIndex, index)) {
        point(pointX, pointY);
      } else {
        const previousX = x - w * (this.dataX[previousIndex] - this.BP);
        const previousY = y + this.dataY[previousIndex] * h;
        line(previousX, previousY, pointX, pointY);
      }
      perfDataVertices++;
      previousIndex = index;
    }
    if (this.type === 1) {
      vertex(this.rectX + this.rectW, this.rectY);
      endShape();
    }
    drawingContext.restore();
    if (this.hasSourceJoins) this.drawSourceJoins(renderDistance);
    this.drawDataTooltip(y, h, renderDistance);
  }

  hasUncertaintyBand(index) {
    const row = this.seriesRows?.[index];
    return row?.band && Number.isFinite(row.lower) && Number.isFinite(row.upper);
  }

  valueBoundsAt(index) {
    const value = this.dataY[index];
    const row = this.seriesRows?.[index];
    return this.hasUncertaintyBand(index)
      ? [min(value, row.lower), max(value, row.upper)] : [value, value];
  }

  leftEdgeValueBounds(visibleCount) {
    if (this.type === 1 || visibleCount < 1 || visibleCount >= this.dataX.length || oneYear >= 0) return null;
    const newer = visibleCount - 1;
    const older = visibleCount;
    if (!this.canConnectIndices(newer, older)) return null;
    const edgeTime = this.BP + (width - shift) / oneYear;
    const fraction = (edgeTime - this.dataX[newer]) / (this.dataX[older] - this.dataX[newer]);
    if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) return null;
    const interpolate = (a, b) => a + fraction * (b - a);
    const value = interpolate(this.dataY[newer], this.dataY[older]);
    if (this.hasUncertaintyBand(newer) && this.hasUncertaintyBand(older)) {
      return [min(value, interpolate(this.seriesRows[newer].lower, this.seriesRows[older].lower)),
        max(value, interpolate(this.seriesRows[newer].upper, this.seriesRows[older].upper))];
    }
    return [value, value];
  }

  drawUncertaintyBands(renderDistance, x, y, w, h) {
    if (!this.hasUncertaintyBands) return;
    // Draw the published bounds at their original bin midpoints. Like the
    // central line, the band connects neighbors only within the same source.
    push();
    noStroke();
    fill(this.c);
    drawingContext.globalAlpha = 0.18;
    let indices = [];
    for (let i = 0; i <= renderDistance; i++) {
      const valid = i < renderDistance && this.hasUncertaintyBand(i);
      if (indices.length && (!valid || !this.canConnectIndices(i - 1, i))) {
        if (indices.length > 1) {
          beginShape();
          for (const index of indices) {
            vertex(x - w * (this.dataX[index] - this.BP), y + this.seriesRows[index].upper * h);
          }
          for (const index of indices.slice().reverse()) {
            vertex(x - w * (this.dataX[index] - this.BP), y + this.seriesRows[index].lower * h);
          }
          endShape(CLOSE);
        }
        indices = [];
      }
      if (valid) indices.push(i);
    }
    pop();
  }

  extremaPreservingIndices(renderDistance) {
    if (renderDistance <= 0) return [];
    const buckets = new Map();
    const selected = new Set([0, renderDistance - 1]);
    for (let i = 0; i < renderDistance; i++) {
      if (i > 0 && !this.canConnectIndices(i - 1, i)) {
        selected.add(i - 1);
        selected.add(i);
      }
      const screenX = width - oneYear * (this.dataX[i] - this.BP);
      if (!Number.isFinite(screenX) || !Number.isFinite(this.dataY[i])) continue;
      const pixel = Math.floor(screenX);
      const bucket = buckets.get(pixel);
      if (!bucket) {
        buckets.set(pixel, { first: i, last: i, min: i, max: i });
      } else {
        bucket.last = i;
        if (this.dataY[i] < this.dataY[bucket.min]) bucket.min = i;
        if (this.dataY[i] > this.dataY[bucket.max]) bucket.max = i;
      }
    }
    for (const bucket of buckets.values()) {
      selected.add(bucket.first);
      selected.add(bucket.last);
      selected.add(bucket.min);
      selected.add(bucket.max);
    }
    return [...selected].sort((a, b) => a - b);
  }

  canConnectIndices(first, second) {
    if (!this.seriesRows) return true;
    const a = this.seriesRows[first];
    const b = this.seriesRows[second];
    if (a.mode === 'points' || b.mode === 'points') return false;
    if (sourceSegment(a) !== sourceSegment(b)) return false;
    // Thinning may skip hundreds of valid samples. Check the original adjacent
    // gaps, rather than treating the distance between plotted points as a gap.
    for (let i = Math.min(first, second) + 1; i <= Math.max(first, second); i++) {
      const newer = this.seriesRows[i - 1];
      const older = this.seriesRows[i];
      if (sourceSegment(newer) !== sourceSegment(older)
        || Math.abs(newer.time - older.time) > Math.min(newer.maxGapYears ?? Infinity, older.maxGapYears ?? Infinity)) return false;
    }
    return true;
  }

  drawSourceJoins(renderDistance) {
    // Omit join labels that collide when several transitions share a few pixels.
    const labelRightLimit = width - 8;
    let nextLabelRight = labelRightLimit;
    const labels = [];
    textSize(max(11, min(14, height / TEXT_SIZE_DIVISOR_SMALL)));
    strokeWeight(1);
    for (let i = 1; i < renderDistance; i++) {
      const newer = this.seriesRows[i - 1];
      const older = this.seriesRows[i];
      if (sourceSegment(newer) === sourceSegment(older)) continue;
      const transitionTime = (this.dataX[i - 1] + this.dataX[i]) / 2;
      const transitionX = width - oneYear * (transitionTime - this.BP);
      if (transitionX < shift || transitionX > width) continue;
      const seaGap = newer.source === 'sea-gauges' && older.source === 'sea-miller';
      if (seaGap) {
        const gapLeft = max(shift, width - oneYear * (older.time - this.BP));
        const gapRight = min(width, width - oneYear * (newer.time - this.BP));
        noStroke();
        fill(180, 20);
        rect(gapLeft, this.rectY + 65, gapRight - gapLeft, max(0, this.rectH - 75));
      }
      stroke(180, 110);
      for (let y = this.rectY + 45; y < this.rectY + this.rectH; y += 10) {
        line(transitionX, y, transitionX, min(y + 4, this.rectY + this.rectH));
      }
      noStroke();
      fill(190);
      textAlign(RIGHT, BOTTOM);
      const label = (SOURCE_INFO[sourceSegment(older)]?.short || sourceSegment(older)) + ' / ' +
        (SOURCE_INFO[sourceSegment(newer)]?.short || sourceSegment(newer)) + (seaGap ? ' • gap' : '');
      labels.push({ label, x: transitionX });
    }
    labels.sort((a, b) => b.x - a.x);
    for (const { label, x } of labels) {
      const labelRight = min(x - 4, labelRightLimit);
      const labelLeft = labelRight - textWidth(label);
      if (labelRight <= nextLabelRight && labelLeft >= shift) {
        noStroke();
        fill(0, 32, 64, BACKGROUND_ALPHA_HIGH);
        rect(labelLeft - 2, this.rectY + this.rectH - 7 - height / TEXT_SIZE_DIVISOR_TINY,
          labelRight - labelLeft + 4, height / TEXT_SIZE_DIVISOR_TINY + 6);
        fill(220);
        text(label, labelRight, this.rectY + this.rectH - 4);
        nextLabelRight = labelLeft - 8;
      }
    }
  }

  nearestVisibleIndex(timeValue, renderDistance) {
    if (renderDistance <= 0 || timeValue > this.dataX[0]
      || timeValue < this.dataX[renderDistance - 1]) return -1;
    let low = 0;
    let high = renderDistance - 1;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (this.dataX[mid] > timeValue) low = mid + 1;
      else high = mid;
    }
    if (low > 0 && Math.abs(this.dataX[low - 1] - timeValue) < Math.abs(this.dataX[low] - timeValue)) return low - 1;
    return low;
  }

  drawDataTooltip(y, h, renderDistance) {
    if (!showCursor || mouseY <= height / GUI_HEIGHT_DIVISOR || mouseY >= height - height / TIMELINE_HEIGHT_DIVISOR) return;
    const timeAtMouse = this.BP + (width - mouseX - shift) / oneYear;
    let index = this.nearestVisibleIndex(timeAtMouse, renderDistance);
    if (index < 0) return;
    // Several proxy estimates can share an age. Let the cursor choose between
    // their values instead of always exposing only the first site's estimate.
    let firstAtAge = index;
    while (firstAtAge > 0 && this.dataX[firstAtAge - 1] === this.dataX[index]) firstAtAge--;
    for (let i = firstAtAge; i < renderDistance && this.dataX[i] === this.dataX[index]; i++) {
      if (abs(mouseY - (y + this.dataY[i] * h)) < abs(mouseY - (y + this.dataY[index] * h))) index = i;
    }
    const pointY = y + this.dataY[index] * h;
    textSize(max(11, min(14, height / TEXT_SIZE_DIVISOR_SMALL)));
    const valueText = this.formatTooltipValue(this.dataY[index]);
    const mouseData = this.unit ? valueText + ' ' + this.unit : valueText;
    const sourceLabel = sourceLabelForDataPoint(this.seriesRows?.[index]);
    const sourceLine = sourceLabel ? 'Source: ' + sourceLabel : '';
    const sample = this.seriesRows?.[index];
    let sampleLine = '';
    if (sample) {
      sampleLine = sampleTimeLabel(sample);
      if (sample.site) sampleLine += ' • site ' + sample.site;
      if (sample.station) sampleLine += ' • station ' + sample.station;
      if (Number.isFinite(sample.lower) && Number.isFinite(sample.upper)) {
        sampleLine += ' • ' + this.formatTooltipValue(sample.lower) + ' to ' + this.formatTooltipValue(sample.upper) + ' ' + this.unit + ' (' + sample.uncertainty + ')';
      } else if (sample.source === 'hansen') sampleLine += ' • uncertainty not quantified here';
      if (sample.note) sampleLine += ' • ' + sample.note;
    }
    const lines = [mouseData, sourceLine, sampleLine].filter(Boolean)
      .flatMap(value => wrapTooltipText(value, width - 32));
    const tooltipWidth = max(...lines.map(value => textWidth(value))) + 12;
    const lineHeight = max(16, height / TIMELINE_HEIGHT_DIVISOR_SMALL);
    const tooltipHeight = lines.length * lineHeight + 8;
    const tooltipX = constrain(mouseX + shift, 8, width - tooltipWidth - 8);
    const tooltipY = constrain(pointY - tooltipHeight - 8, height / GUI_HEIGHT_DIVISOR + 4,
      height - height / TIMELINE_HEIGHT_DIVISOR - tooltipHeight - 4);
    this.dataDist = abs(mouseY - pointY);
    stroke(this.c);
    line(mouseX + shift, mouseY, mouseX + shift, pointY);
    noStroke();
    rectMode(CORNER);
    fill(0, 32, 64, BACKGROUND_ALPHA_HIGH);
    rect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
    textAlign(LEFT, TOP);
    for (let i = 0; i < lines.length; i++) {
      fill(i === 0 ? this.c : 220);
      text(lines[i], tooltipX + 6, tooltipY + 4 + i * lineHeight);
    }
  }

  easeToTarget(current, target) {
    if (current < target - Data.SNAP_THRESHOLD_PX) return current + Data.SPRING_BASE_SPEED + (target - current) / Data.SPRING_DAMPING_DIVISOR;
    if (current > target + Data.SNAP_THRESHOLD_PX) return current - Data.SPRING_BASE_SPEED + (current - target) / -Data.SPRING_DAMPING_DIVISOR;
    return target;
  }

  visiblePointCount() {
    if (this.dataX.length === 0) return 0;

    const descendingTime = this.dataX[0] >= this.dataX[this.dataX.length - 1];
    const noFuturePrefix = this.dataX[0] <= this.BP;

    // Fast path: descending datasets (newest to oldest), which all current files use.
    if (descendingTime && noFuturePrefix) {
      const oldestVisibleX = this.BP + (width - shift) / oneYear;
      let low = 0;
      let high = this.dataX.length - 1;
      let lastVisible = -1;

      while (low <= high) {
        const mid = low + int((high - low) / 2);
        if (this.dataX[mid] >= oldestVisibleX) {
          lastVisible = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      return lastVisible + 1;
    }

    // Safety fallback for unexpected ordering/content.
    let count = 0;
    for (let i = 0; i < this.dataX.length; i++) {
      const screenX = width - oneYear * (this.dataX[i] - this.BP);
      if (screenX >= shift && screenX <= width) count++;
    }
    return count;
  }

  tooltipDecimalPlaces() {
    if (this.columnY === 'Eccentricity') return 6;
    if (this.columnY === 'Volcanic Activity') return 6;
    if (this.columnY === 'Population') return 0;
    return 3;
  }

  formatTooltipValue(value) {
    return nfs(value, 0, this.tooltipDecimalPlaces());
  }
}

class TimelineEvent {
  static EVENT_CULL_MARGIN = 200;

  // Constructor: create a timeline event
  constructor(eventType, eventName, eventStart, eventEnd, eventHue) {
    // Event properties
    this.type = eventType;                    // Event type (0=duration band, 1=point event)
    this.name = eventName;                    // Event name/label
    this.start = currentYear - eventStart;    // Start/end times
    this.end = currentYear - eventEnd;
    this.c = [Math.max(0, Math.min(255, eventHue)), 255, 128]; // Event color
  }

  draw() {
    colorMode(HSB, 255);
    const w = (this.start * oneYear) - (this.end * oneYear); // Event width in pixels
    const startX = width + (this.start * oneYear) + 1;
    const endX = width + (this.end * oneYear);
    const y = height / TIMELINE_HEIGHT_DIVISOR; // Y position on timeline
    const h = (height / 4) + (height / 144) * width / ((this.start * oneYear) - height / 10); // Zoom-responsive event height
    textAlign(LEFT, TOP);
    textSize(height / TEXT_SIZE_DIVISOR_SMALL);

    const visibleLeft = -TimelineEvent.EVENT_CULL_MARGIN;
    const visibleRight = width + TimelineEvent.EVENT_CULL_MARGIN;

    if (this.type === 0) {
      const bandLeft = min(startX, endX);
      const bandRight = max(startX, endX);
      if (bandRight < visibleLeft || bandLeft > visibleRight) {
        perfEventsCulled++;
        return;
      }
    } else if (this.type === 1) {
      if (startX < visibleLeft || startX > visibleRight) {
        perfEventsCulled++;
        return;
      }
    }

    perfEventsDrawn++;

    if (this.type === 0) {
      // Draw duration events as bands
      noStroke();
      fill(this.c);
      rect(endX, height - y, w, -h + y); // Event band
      strokeWeight(0.7);
      stroke(255);
      line(startX, height, startX, height - h); // Start line
      noStroke();
      fill(255);
      text(this.name, (width + oneYear * this.start) + 5, height - h); // Event label
    } else if (this.type === 1) {
      // Draw point events as labels with vertical lines
      fill(this.c);
      noStroke();
      rect(startX, height - h / 2 - height / TIMELINE_HEIGHT_DIVISOR_SMALL, textWidth(this.name) + 10, height / TIMELINE_HEIGHT_DIVISOR_SMALL);
      strokeWeight(0.7);
      stroke(255);
      line(startX, height, startX, height - h / 2 - height / TIMELINE_HEIGHT_DIVISOR_SMALL); // Event line
      noStroke();
      fill(255);
      text(this.name, (width + oneYear * this.start) + 5, height - h / 2 - height / TIMELINE_HEIGHT_DIVISOR_SMALL); // Event label
    }
  }
}
