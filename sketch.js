// Constants for UI dimensions and scaling
const GUI_HEIGHT_DIVISOR = 12;        // Top GUI bar height
const TIMELINE_HEIGHT_DIVISOR = 14;   // Bottom timeline height
const TIMELINE_HEIGHT_DIVISOR_SMALL = 36; // Small timeline elements
const TEXT_SIZE_DIVISOR_LARGE = 36;   // Large text scaling
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

// Solar processing controls
const SOLAR_DESPIKE_HAMPEL_RADIUS = 50;
const SOLAR_DESPIKE_SIGMA_THRESHOLD = 4.0;
const SOLAR_DESPIKE_MAD_SCALE = 1.4826;
const SOLAR_DENSE_THRESHOLD_YEARS = 0.03;
const SOLAR_SMOOTHING_WINDOW_DAYS_NEAR = 10.0;
const SOLAR_SMOOTHING_WINDOW_DAYS_FAR = 100.0;
const SOLAR_SMOOTHING_GRADIENT_EXPONENT = 1.5;
const CO2_RAE_D11B_FILL_BEFORE_TIME = -4000000;
const CO2_HOLE_FILL_TOLERANCE_YEARS = 50000;
const GISS_REMOTE_UPDATE_ENABLED = true;
const GISS_REMOTE_UPDATE_WINDOW_YEARS = 15;
const GISS_REMOTE_URL = 'https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.txt';
const GISS_REMOTE_URL_CANDIDATES = [
  GISS_REMOTE_URL,
  'https://corsproxy.io/?https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.txt',
  'https://r.jina.ai/http://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.txt'
];
const CO2_REMOTE_UPDATE_ENABLED = true;
const CO2_REMOTE_UPDATE_WINDOW_YEARS = 15;
const CO2_REMOTE_DAILY_URL = 'https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_daily_mlo.txt';
const CO2_REMOTE_DAILY_URL_CANDIDATES = [
  CO2_REMOTE_DAILY_URL,
  'https://corsproxy.io/?https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_daily_mlo.txt',
  'https://r.jina.ai/http://gml.noaa.gov/webdata/ccgg/trends/co2/co2_daily_mlo.txt'
];
const SEALEVEL_REMOTE_UPDATE_ENABLED = true;
const SEALEVEL_REMOTE_UPDATE_WINDOW_YEARS = 20;
const SEALEVEL_REMOTE_URL = 'https://sealevel.colorado.edu/files/2026_rel1/gmsl_2026rel1_seasons_retained.txt';
const SEALEVEL_REMOTE_URL_CANDIDATES = [
  SEALEVEL_REMOTE_URL,
  'https://corsproxy.io/?https://sealevel.colorado.edu/files/2026_rel1/gmsl_2026rel1_seasons_retained.txt',
  'https://r.jina.ai/http://sealevel.colorado.edu/files/2026_rel1/gmsl_2026rel1_seasons_retained.txt'
];
const SOLAR_REMOTE_UPDATE_ENABLED = true;
const SOLAR_REMOTE_UPDATE_WINDOW_YEARS = 5;
const SOLAR_REMOTE_TSIS_URL = 'https://lasp.colorado.edu/lisird/latis/dap/tsis_tsi_24hr.txt';
const SOLAR_REMOTE_TSIS_URL_CANDIDATES = [
  SOLAR_REMOTE_TSIS_URL,
  'https://corsproxy.io/?https://lasp.colorado.edu/lisird/latis/dap/tsis_tsi_24hr.txt',
  'https://r.jina.ai/http://lasp.colorado.edu/lisird/latis/dap/tsis_tsi_24hr.txt'
];

// Global data structures and variables
let data = [];                        // All loaded datasets
let event = [];                       // Historical events for timeline
let sourceTables = {};
let scrollValue = DEFAULT_SCROLL_VALUE;
let pScrollValue = scrollValue;
let oneYear = 0;                      // Zoom state
let scrollSpeed = 1;                  // Current scroll speed
let currentYear = 0;                  // Right-edge timeline anchor (current year plus small buffer)
let yearShift = 0;                    // Year alignment offset
let shift = SHIFT_OFFSET;             // Left margin shift
let showCursor = true;                // Crosshair/tooltip visibility toggle
let selectedData = 0;                 // Currently selected dataset index
let maxData = 0;                      // Maximum dataset count
let perfHUD = false;
let perfDataVertices = 0;
let perfEventsDrawn = 0;
let perfEventsCulled = 0;
let perfTimelineTicks = 0;
let perfTimelineLabels = 0;
let solarCalibrationEnabled = true;
let solarDespikeEnabled = true;
let solarSmoothingEnabled = true;
let gissRefreshStatus = 'local';
let gissRefreshSource = 'local file';
let co2RefreshStatus = 'local';
let co2RefreshSource = 'local file';
let sealevelRefreshStatus = 'local';
let sealevelRefreshSource = 'local file';
let solarRefreshStatus = 'local';
let solarRefreshSource = 'local file';

function preload() {
  // Orbital
  sourceTables.zeebeOrbitalRaw = loadStrings('data/orbit/zeebe2019orbital.txt'); // ~[-67,000,000, now]

  // Temperature (oldest -> newest)
  sourceTables.hansenTempRaw = loadStrings('data/temperature/Table.txt'); // ~[-66,000,000, now]
  sourceTables.edcTempRaw = loadStrings('data/temperature/edc3deuttemp2007-noaa.txt'); // ~[-800,000, ~0]
  sourceTables.neukomTempRaw = loadStrings('data/temperature/Full_ensemble_median_and_95pct_range.txt'); // ~[-1,949, now]
  sourceTables.gissTempRaw = loadStrings('data/temperature/GLB.Ts+dSST.txt'); // ~[-70, now]

  // CO2 (oldest -> newest)
  sourceTables.co2RaeAlkenoneRaw = loadStrings('data/co2/rae2021alkenone-co2diffusive.txt'); // deep-time (multi-Myr)
  sourceTables.co2TripatiRaw = loadStrings('data/co2/b_ca_tripati_2009.txt'); // deep-time (multi-Myr)
  sourceTables.co2RaeD11bRaw = loadStrings('data/co2/rae2021co2-d11b-ph.txt'); // deep-time (multi-Myr)
  sourceTables.co2AntarcticaRaw = loadStrings('data/co2/antarctica2015co2composite-noaa.txt'); // ~[-800,000, ~0]
  sourceTables.co2InSituRaw = loadStrings('data/co2/daily_in_situ_co2_mlo.csv'); // ~[8, now]
  sourceTables.co2DailyRaw = loadStrings('data/co2/co2_daily_mlo.txt'); // modern daily (~late 20th c, now)

  // Volcanic
  sourceTables.volcanicSaodRaw = loadStrings('data/volcanic/SAOD_merged_HolVol-v1_eVolv2k_v3_CMIP6_v3_-9500_to_2014_global_mean.csv'); // [-11,450, 64]

  // Solar Irradiance (oldest -> newest)
  //sourceTables.solarIrradianceSteinhilberRaw = loadStrings('data/solar/steinhilber2012.txt'); // ~[-9,400, ~0]
  //sourceTables.solarIrradianceLeanRaw = loadStrings('data/solar/lean2000_irradiance.txt'); // ~[-340, now]
  sourceTables.solarIrradianceRaw = loadStrings('data/solar/nnl_tsi_P1D.txt'); // modern daily
  sourceTables.solarIrradianceTsisRaw = loadStrings('data/solar/tsis_tsi_24hr.txt'); // recent years
  sourceTables.solarIrradianceProcessed = loadTable('data/solar/Solar Irradiance Processed.csv', 'csv', 'header'); // processed cache

  // Sea Level (oldest -> newest)
  sourceTables.sealevelMillerRaw = loadStrings('data/sealevel/miller2024-sealevel.txt'); // deep-time (multi-Myr)
  sourceTables.sealevelKoppRaw = loadStrings('data/sealevel/kopp2016-global.txt'); // CE-focused reconstruction
  sourceTables.sealevelGpRaw = loadStrings('data/sealevel/gslGPChange2014.txt'); // ~[late 1800s, recent]
  sourceTables.sealevelRaw = loadStrings('data/sealevel/gmsl_2026rel1_seasons_retained.txt'); // satellite era -> now

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

    rows.push({ time, [valueKey]: value });
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

  if (table.getRowCount() > 0) return table;
  return fallbackTable;
}

function cloneTimeValueRows(rows, valueKey) {
  const cloned = new Array(rows.length);
  for (let i = 0; i < rows.length; i++) {
    cloned[i] = {
      time: rows[i].time,
      [valueKey]: rows[i][valueKey]
    };
  }
  return cloned;
}

function appendRowsOutsideInclusiveRange(targetRows, sourceRows, valueKey, newestTime, oldestTime) {
  for (let i = 0; i < sourceRows.length; i++) {
    const timeValue = sourceRows[i].time;
    const value = sourceRows[i][valueKey];
    if (!Number.isFinite(timeValue) || !Number.isFinite(value)) continue;
    if (timeValue <= newestTime && timeValue >= oldestTime) continue;

    targetRows.push({
      time: timeValue,
      [valueKey]: value
    });
  }
}

function averageRowsInRange(rows, valueKey, startTime, endTime) {
  let sum = 0;
  let count = 0;

  for (let i = 0; i < rows.length; i++) {
    const timeValue = rows[i].time;
    const value = rows[i][valueKey];
    if (timeValue < startTime || timeValue > endTime) continue;
    if (!Number.isFinite(value)) continue;

    sum += value;
    count++;
  }

  if (count === 0) return null;
  return sum / count;
}

function calibrateRowsToReferenceByOverlap(sourceRows, referenceRows, valueKey) {
  if (sourceRows.length === 0 || referenceRows.length === 0) return sourceRows;

  const sourceNewest = sourceRows[0].time;
  const sourceOldest = sourceRows[sourceRows.length - 1].time;
  const referenceNewest = referenceRows[0].time;
  const referenceOldest = referenceRows[referenceRows.length - 1].time;

  const overlapStart = max(sourceOldest, referenceOldest);
  const overlapEnd = min(sourceNewest, referenceNewest);
  if (overlapEnd <= overlapStart) return sourceRows;

  const sourceMean = averageRowsInRange(sourceRows, valueKey, overlapStart, overlapEnd);
  const referenceMean = averageRowsInRange(referenceRows, valueKey, overlapStart, overlapEnd);
  if (sourceMean === null || referenceMean === null) return sourceRows;

  const offset = referenceMean - sourceMean;
  const calibrated = new Array(sourceRows.length);
  for (let i = 0; i < sourceRows.length; i++) {
    calibrated[i] = {
      ...sourceRows[i],
      [valueKey]: sourceRows[i][valueKey] + offset
    };
  }

  return calibrated;
}

function boundaryWindowMeanForKey(rows, boundaryTime, windowYears, side, valueKey) {
  if (!Number.isFinite(boundaryTime) || !Number.isFinite(windowYears) || windowYears <= 0) return null;

  let startTime = boundaryTime - windowYears;
  let endTime = boundaryTime + windowYears;

  if (side === 'older') {
    startTime = boundaryTime - windowYears;
    endTime = boundaryTime;
  } else if (side === 'newer') {
    startTime = boundaryTime;
    endTime = boundaryTime + windowYears;
  }

  return averageRowsInRange(rows, valueKey, startTime, endTime);
}

function calibrateRowsToReferenceByBoundary(sourceRows, referenceRows, valueKey, windowYears = 30) {
  if (sourceRows.length === 0 || referenceRows.length === 0) return sourceRows;

  const boundaryTime = referenceRows[referenceRows.length - 1].time;
  const sourceMean = boundaryWindowMeanForKey(sourceRows, boundaryTime, windowYears, 'older', valueKey);
  const referenceMean = boundaryWindowMeanForKey(referenceRows, boundaryTime, windowYears, 'newer', valueKey);
  if (sourceMean === null || referenceMean === null) return sourceRows;

  const offset = referenceMean - sourceMean;
  const calibrated = new Array(sourceRows.length);
  for (let i = 0; i < sourceRows.length; i++) {
    calibrated[i] = {
      ...sourceRows[i],
      [valueKey]: sourceRows[i][valueKey] + offset
    };
  }

  return calibrated;
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
      temperature: median
    });
  }

  return sortRowsByTimeDesc(rows);
}

function parseEdcTemperatureRows(rawLines) {
  const rows = [];
  if (!rawLines || rawLines.length === 0) return rows;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (line.length === 0 || line.startsWith('#')) continue;

    const tokens = line.split(/\s+/);
    if (tokens.length < 5) continue;
    if (tokens[0] === 'Bag') continue;

    const ageCalBp = parseFloat(tokens[2]);
    const temperature = parseFloat(tokens[4]);
    if (!Number.isFinite(ageCalBp) || !Number.isFinite(temperature)) continue;

    rows.push({
      time: -ageCalBp,
      temperature
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

function parseTemperatureTableRows(table) {
  return extractTimeValueRows(table, 'Temperature', 'temperature');
}

function averageTemperatureInRange(rows, startTime, endTime) {
  return averageRowsInRange(rows, 'temperature', startTime, endTime);
}

function calibrateTemperatureRowsToReference(sourceRows, referenceRows) {
  return calibrateRowsToReferenceByOverlap(sourceRows, referenceRows, 'temperature');
}

function mergeTemperatureTableWithHansen(baseTable, hansenRawLines) {
  const hansenRows = parseHansenTemperatureRows(hansenRawLines);
  if (hansenRows.length === 0) return baseTable;

  const baseRows = parseTemperatureTableRows(baseTable);
  const newestHansenTime = hansenRows[0].time;
  const oldestHansenTime = hansenRows[hansenRows.length - 1].time;
  const mergedRows = cloneTimeValueRows(hansenRows, 'temperature');
  appendRowsOutsideInclusiveRange(mergedRows, baseRows, 'temperature', newestHansenTime, oldestHansenTime);

  sortRowsByTimeDesc(mergedRows);
  return buildTimeValueTable(mergedRows, 'temperature', 'Temperature', baseTable);
}

function mergeTemperatureTableWithEdc(baseTable, edcRawLines) {
  const edcRows = parseEdcTemperatureRows(edcRawLines);
  if (edcRows.length === 0) return baseTable;

  const baseRows = parseTemperatureTableRows(baseTable);
  const calibratedBaseRows = calibrateTemperatureRowsToReference(baseRows, edcRows);

  const newestEdcTime = edcRows[0].time;
  const oldestEdcTime = edcRows[edcRows.length - 1].time;
  const mergedRows = cloneTimeValueRows(edcRows, 'temperature');
  appendRowsOutsideInclusiveRange(mergedRows, calibratedBaseRows, 'temperature', newestEdcTime, oldestEdcTime);

  sortRowsByTimeDesc(mergedRows);
  return buildTimeValueTable(mergedRows, 'temperature', 'Temperature', baseTable);
}

function mergeTemperatureTableWithNeukom(baseTable, neukomRawLines) {
  const neukomRows = parseNeukomTemperatureRows(neukomRawLines);
  if (neukomRows.length === 0) return baseTable;

  const baseRows = parseTemperatureTableRows(baseTable);
  const newestNeukomTime = neukomRows[0].time;
  const oldestNeukomTime = neukomRows[neukomRows.length - 1].time;
  const mergedRows = cloneTimeValueRows(neukomRows, 'temperature');
  appendRowsOutsideInclusiveRange(mergedRows, baseRows, 'temperature', newestNeukomTime, oldestNeukomTime);

  sortRowsByTimeDesc(mergedRows);
  return buildTimeValueTable(mergedRows, 'temperature', 'Temperature', baseTable);
}

function mergeTemperatureTableWithGiss(paleoTable, gissRawLines) {
  const mergedTable = new p5.Table();
  mergedTable.addColumn('time');
  mergedTable.addColumn('Temperature');

  const modernStartTime = -70; // 1880 CE in the project's 1950-based axis
  const gissRows = parseGissTemperatureRows(gissRawLines);

  for (let i = 0; i < gissRows.length; i++) {
    const row = mergedTable.addRow();
    row.setNum('time', gissRows[i].time);
    row.setNum('Temperature', gissRows[i].temperature);
  }

  for (let i = 0; i < paleoTable.getRowCount(); i++) {
    const sourceRow = paleoTable.getRow(i);
    const timeValue = sourceRow.getNum('time');
    const tempValue = sourceRow.getNum('Temperature');

    if (!Number.isFinite(timeValue) || !Number.isFinite(tempValue)) continue;
    if (timeValue >= modernStartTime) continue;

    const row = mergedTable.addRow();
    row.setNum('time', timeValue);
    row.setNum('Temperature', tempValue);
  }

  if (mergedTable.getRowCount() > 0) return mergedTable;
  return paleoTable;
}

function mergeRecentTemperatureRows(baseTable, remoteRows, recentWindowYears) {
  return mergeRecentRowsByWindow(
    baseTable,
    remoteRows,
    recentWindowYears,
    (table) => parseTemperatureTableRows(table),
    'temperature',
    'Temperature'
  );
}

function mergeRecentRowsByWindow(baseTable, remoteRows, recentWindowYears, extractRowsFn, valueKey, valueColumn) {
  if (!baseTable || !remoteRows || remoteRows.length === 0) return baseTable;

  const baseRows = extractRowsFn(baseTable);
  if (baseRows.length === 0) return baseTable;

  const newestBaseTime = baseRows[0].time;
  const cutoffTime = newestBaseTime - recentWindowYears;
  const mergedRows = [];

  for (let i = 0; i < baseRows.length; i++) {
    if (baseRows[i].time >= cutoffTime) continue;
    mergedRows.push({
      time: baseRows[i].time,
      [valueKey]: baseRows[i][valueKey]
    });
  }

  for (let i = 0; i < remoteRows.length; i++) {
    if (remoteRows[i].time < cutoffTime) continue;
    mergedRows.push({
      time: remoteRows[i].time,
      [valueKey]: remoteRows[i][valueKey]
    });
  }

  sortRowsByTimeDesc(mergedRows);
  return buildTimeValueTable(mergedRows, valueKey, valueColumn, baseTable);
}

function mergeRecentCo2Rows(baseTable, remoteRows, recentWindowYears) {
  return mergeRecentRowsByWindow(
    baseTable,
    remoteRows,
    recentWindowYears,
    (table) => parseCo2TableRows(table),
    'co2',
    'CO2'
  );
}

function mergeRecentSealevelRows(baseTable, remoteRows, recentWindowYears) {
  return mergeRecentRowsByWindow(
    baseTable,
    remoteRows,
    recentWindowYears,
    (table) => parseSeaLevelTableRows(table),
    'sealevel',
    'Sealevel'
  );
}

function mergeRecentSolarRows(baseTable, remoteRows, recentWindowYears) {
  return mergeRecentRowsByWindow(
    baseTable,
    remoteRows,
    recentWindowYears,
    (table) => extractTimeValueRows(table, 'Solar Irradiance', 'irradiance'),
    'irradiance',
    'Solar Irradiance'
  );
}

function sourceLabelFromUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch (error) {
    return url;
  }
}

async function refreshSeriesFromRemote(options) {
  if (!options.enabled) return;
  if (typeof fetch !== 'function') return;

  options.setStatus('refreshing');
  options.setSource('remote');
  let lastError = null;

  for (let i = 0; i < options.urlCandidates.length; i++) {
    const candidateUrl = options.urlCandidates[i];

    try {
      const response = await fetch(candidateUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP ' + response.status);

      const rawText = await response.text();
      const remoteRows = options.parseRows(rawText);
      if (!remoteRows || remoteRows.length === 0) throw new Error('No parseable rows');

      options.applyRows(remoteRows);
      options.setStatus('remote-ok');
      options.setSource(sourceLabelFromUrl(candidateUrl));
      return;
    } catch (error) {
      lastError = error;
    }
  }

  options.setStatus('local-fallback');
  options.setSource('local file');
  console.warn(options.warnLabel + ' failed; using local fallback.', lastError);
}

async function refreshTemperatureWithRemoteGiss() {
  await refreshSeriesFromRemote({
    enabled: GISS_REMOTE_UPDATE_ENABLED,
    urlCandidates: GISS_REMOTE_URL_CANDIDATES,
    parseRows: (rawText) => parseGissTemperatureRows(rawText.split(/\r?\n/)),
    applyRows: (remoteRows) => {
      sourceTables.temperature = mergeRecentTemperatureRows(
        sourceTables.temperature,
        remoteRows,
        GISS_REMOTE_UPDATE_WINDOW_YEARS
      );

      if (data.length > 0 && data[0] && data[0].columnY === 'Temperature') {
        data[0] = new Data(sourceTables.temperature, 'time', 'Temperature', '°C', 0, color(255), 0, true);
        pScrollValue = -1;
      }
    },
    setStatus: (status) => { gissRefreshStatus = status; },
    setSource: (source) => { gissRefreshSource = source; },
    warnLabel: 'Remote GISS refresh'
  });
}

async function refreshCo2WithRemoteNoaaDaily() {
  await refreshSeriesFromRemote({
    enabled: CO2_REMOTE_UPDATE_ENABLED,
    urlCandidates: CO2_REMOTE_DAILY_URL_CANDIDATES,
    parseRows: (rawText) => parseNoaaDailyCo2Rows(rawText.split(/\r?\n/)),
    applyRows: (remoteRows) => {
      sourceTables.co2 = mergeRecentCo2Rows(
        sourceTables.co2,
        remoteRows,
        CO2_REMOTE_UPDATE_WINDOW_YEARS
      );

      for (let j = 0; j < data.length; j++) {
        if (data[j].columnY !== 'CO2') continue;
        data[j] = new Data(sourceTables.co2, 'time', 'CO2', 'ppm', 1, color(255, 128, 64), 0, true);
        pScrollValue = -1;
        break;
      }
    },
    setStatus: (status) => { co2RefreshStatus = status; },
    setSource: (source) => { co2RefreshSource = source; },
    warnLabel: 'Remote CO2 refresh'
  });
}

async function refreshSealevelWithRemoteColorado() {
  await refreshSeriesFromRemote({
    enabled: SEALEVEL_REMOTE_UPDATE_ENABLED,
    urlCandidates: SEALEVEL_REMOTE_URL_CANDIDATES,
    parseRows: (rawText) => parseColoradoSeaLevelRows(rawText.split(/\r?\n/)),
    applyRows: (remoteRows) => {
      sourceTables.sealevel = mergeRecentSealevelRows(
        sourceTables.sealevel,
        remoteRows,
        SEALEVEL_REMOTE_UPDATE_WINDOW_YEARS
      );

      for (let j = 0; j < data.length; j++) {
        if (data[j].columnY !== 'Sealevel') continue;
        data[j] = new Data(sourceTables.sealevel, 'time', 'Sealevel', 'm', 1, color(0, 128, 255), 0, true);
        pScrollValue = -1;
        break;
      }
    },
    setStatus: (status) => { sealevelRefreshStatus = status; },
    setSource: (source) => { sealevelRefreshSource = source; },
    warnLabel: 'Remote sea level refresh'
  });
}

async function refreshSolarWithRemoteTsis() {
  await refreshSeriesFromRemote({
    enabled: SOLAR_REMOTE_UPDATE_ENABLED,
    urlCandidates: SOLAR_REMOTE_TSIS_URL_CANDIDATES,
    parseRows: (rawText) => parseTsis24hrSolarRows(rawText.split(/\r?\n/)),
    applyRows: (remoteRows) => {
      sourceTables.solarIrradiance = mergeRecentSolarRows(
        sourceTables.solarIrradiance,
        remoteRows,
        SOLAR_REMOTE_UPDATE_WINDOW_YEARS
      );

      for (let j = 0; j < data.length; j++) {
        if (data[j].columnY !== 'Solar Irradiance') continue;
        data[j] = new Data(sourceTables.solarIrradiance, 'time', 'Solar Irradiance', 'W/m²', 1, color(255, 220, 0), 0, true);
        pScrollValue = -1;
        break;
      }
    },
    setStatus: (status) => { solarRefreshStatus = status; },
    setSource: (source) => { solarRefreshSource = source; },
    warnLabel: 'Remote solar refresh'
  });
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
      co2: ppm
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
      co2: co2Ppm
    });
  }

  return sortRowsByTimeDesc(rows);
}

function buildCo2TableFromAntarcticaComposite(rawLines) {
  const rows = parseAntarcticaCompositeCo2Rows(rawLines);
  return buildTimeValueTable(rows, 'co2', 'CO2');
}

function parseRaeD11bCo2Rows(rawLines) {
  const rows = [];
  if (!rawLines || rawLines.length === 0) return rows;

  let ageIdx = -1;
  let xco2Idx = -1;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (line.length === 0 || line.startsWith('#')) continue;

    const tokens = line.split(/\s+/);
    if (tokens.length < 2) continue;

    if (tokens[0] === 'site') {
      ageIdx = tokens.indexOf('age');
      xco2Idx = tokens.indexOf('xco2');
      continue;
    }

    if (ageIdx < 0 || xco2Idx < 0) continue;
    if (tokens.length <= max(ageIdx, xco2Idx)) continue;

    const ageKyrBp = parseFloat(tokens[ageIdx]);
    const xco2 = parseFloat(tokens[xco2Idx]);
    if (!Number.isFinite(ageKyrBp) || !Number.isFinite(xco2)) continue;
    if (xco2 <= 0) continue;

    rows.push({
      time: -ageKyrBp * 1000.0,
      co2: xco2
    });
  }

  return sortRowsByTimeDesc(rows);
}

function parseCo2TableRows(table) {
  return extractTimeValueRows(table, 'CO2', 'co2');
}

function hasCo2PointNearTime(rows, targetTime, toleranceYears) {
  if (!Number.isFinite(toleranceYears) || toleranceYears <= 0) return false;

  for (let i = 0; i < rows.length; i++) {
    if (abs(rows[i].time - targetTime) <= toleranceYears) return true;
  }

  return false;
}

function mergeCo2TableWithRaeD11b(baseTable, raeRawLines, fillBeforeTime = Number.NEGATIVE_INFINITY, holeToleranceYears = 0) {
  const raeRows = parseRaeD11bCo2Rows(raeRawLines);
  if (raeRows.length === 0) return baseTable;

  const baseRows = parseCo2TableRows(baseTable);
  if (baseRows.length === 0) {
    const filteredRows = [];

    for (let i = 0; i < raeRows.length; i++) {
      if (raeRows[i].time > fillBeforeTime) continue;

      filteredRows.push({
        time: raeRows[i].time,
        co2: raeRows[i].co2
      });
    }

    return buildTimeValueTable(filteredRows, 'co2', 'CO2', baseTable);
  }
  const mergedRows = cloneTimeValueRows(baseRows, 'co2');

  for (let i = 0; i < raeRows.length; i++) {
    const timeValue = raeRows[i].time;
    if (timeValue > fillBeforeTime) continue;
    if (hasCo2PointNearTime(baseRows, timeValue, holeToleranceYears)) continue;

    mergedRows.push({
      time: timeValue,
      co2: raeRows[i].co2
    });
  }

  sortRowsByTimeDesc(mergedRows);
  return buildTimeValueTable(mergedRows, 'co2', 'CO2', baseTable);
}

function parseRaeAlkenoneCo2Rows(rawLines) {
  const rows = [];
  if (!rawLines || rawLines.length === 0) return rows;

  let ageIdx = -1;
  let co2Idx = -1;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (line.length === 0 || line.startsWith('#')) continue;

    const tokens = line.split(/\s+/);
    if (tokens.length < 2) continue;

    if (tokens[0] === 'site') {
      ageIdx = tokens.indexOf('age');
      co2Idx = tokens.indexOf('co2_benthic');
      if (co2Idx < 0) co2Idx = tokens.indexOf('co2');
      continue;
    }

    if (ageIdx < 0 || co2Idx < 0) continue;
    if (tokens.length <= max(ageIdx, co2Idx)) continue;

    const ageKyrBp = parseFloat(tokens[ageIdx]);
    const co2Ppm = parseFloat(tokens[co2Idx]);
    if (!Number.isFinite(ageKyrBp) || !Number.isFinite(co2Ppm)) continue;
    if (co2Ppm <= 0) continue;

    rows.push({
      time: -ageKyrBp * 1000.0,
      co2: co2Ppm
    });
  }

  return sortRowsByTimeDesc(rows);
}

function mergeCo2TableWithRaeAlkenone(baseTable, alkenoneRawLines, antarcticaRawLines) {
  const alkenoneRows = parseRaeAlkenoneCo2Rows(alkenoneRawLines);
  if (alkenoneRows.length === 0) return baseTable;

  const antarcticaRows = parseAntarcticaCompositeCo2Rows(antarcticaRawLines);
  const hasAntarcticaRange = antarcticaRows.length > 0;
  const newestAntarcticaTime = hasAntarcticaRange ? antarcticaRows[0].time : Number.NEGATIVE_INFINITY;
  const oldestAntarcticaTime = hasAntarcticaRange ? antarcticaRows[antarcticaRows.length - 1].time : Number.POSITIVE_INFINITY;

  const baseRows = parseCo2TableRows(baseTable);
  const mergedRows = cloneTimeValueRows(baseRows, 'co2');
  appendRowsOutsideInclusiveRange(mergedRows, alkenoneRows, 'co2', newestAntarcticaTime, oldestAntarcticaTime);

  sortRowsByTimeDesc(mergedRows);
  return buildTimeValueTable(mergedRows, 'co2', 'CO2', baseTable);
}

function parseTripatiCo2Rows(rawLines) {
  const rows = [];
  if (!rawLines || rawLines.length === 0) return rows;

  let ageIdx = -1;
  let co2Idx = -1;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (!line || line.trim().length === 0) continue;

    const trimmed = line.trimStart();
    if (trimmed.startsWith('#')) continue;

    if ((ageIdx < 0 || co2Idx < 0) && trimmed.startsWith('proxy')) {
      const headerTokens = trimmed.split('\t');
      ageIdx = headerTokens.indexOf('age_ka');
      co2Idx = headerTokens.indexOf('CO2_ppm');
      continue;
    }

    if (!trimmed.startsWith('B/Ca')) continue;
    if (ageIdx < 0 || co2Idx < 0) continue;

    const tokens = trimmed.split('\t');
    if (tokens.length <= max(ageIdx, co2Idx)) continue;

    const ageKa = parseFloat(tokens[ageIdx]);
    const co2Ppm = parseFloat(tokens[co2Idx]);
    if (!Number.isFinite(ageKa) || !Number.isFinite(co2Ppm)) continue;
    if (co2Ppm <= 0) continue;

    rows.push({
      time: -ageKa * 1000.0,
      co2: co2Ppm
    });
  }

  return sortRowsByTimeDesc(rows);
}

function mergeCo2TableWithTripati(baseTable, tripatiRawLines, antarcticaRawLines) {
  const tripatiRows = parseTripatiCo2Rows(tripatiRawLines);
  if (tripatiRows.length === 0) return baseTable;

  const antarcticaRows = parseAntarcticaCompositeCo2Rows(antarcticaRawLines);
  const hasAntarcticaRange = antarcticaRows.length > 0;
  const newestAntarcticaTime = hasAntarcticaRange ? antarcticaRows[0].time : Number.NEGATIVE_INFINITY;
  const oldestAntarcticaTime = hasAntarcticaRange ? antarcticaRows[antarcticaRows.length - 1].time : Number.POSITIVE_INFINITY;

  const baseRows = parseCo2TableRows(baseTable);
  const mergedRows = cloneTimeValueRows(baseRows, 'co2');
  appendRowsOutsideInclusiveRange(mergedRows, tripatiRows, 'co2', newestAntarcticaTime, oldestAntarcticaTime);

  sortRowsByTimeDesc(mergedRows);
  return buildTimeValueTable(mergedRows, 'co2', 'CO2', baseTable);
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

function parseNoaaInSituDailyCo2Rows(rawLines) {
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
      co2: ppm
    });
  }

  return sortRowsByTimeDesc(rows);
}

function mergeCo2TableWithNoaaDaily(paleoTable, noaaRawLines, inSituRawLines) {
  const mergedTable = new p5.Table();
  mergedTable.addColumn('time');
  mergedTable.addColumn('CO2');

  const noaaRows = parseNoaaDailyCo2Rows(noaaRawLines);
  const inSituRows = parseNoaaInSituDailyCo2Rows(inSituRawLines);
  const modernRows = noaaRows.slice();
  const oldestNoaaTime = noaaRows.length > 0 ? noaaRows[noaaRows.length - 1].time : Number.POSITIVE_INFINITY;

  for (let i = 0; i < inSituRows.length; i++) {
    if (oldestNoaaTime !== Number.POSITIVE_INFINITY && inSituRows[i].time >= oldestNoaaTime) continue;
    modernRows.push(inSituRows[i]);
  }

  modernRows.sort((a, b) => b.time - a.time);
  const modernStartTime = modernRows.length > 0 ? modernRows[modernRows.length - 1].time : Number.POSITIVE_INFINITY;

  for (let i = 0; i < modernRows.length; i++) {
    const row = mergedTable.addRow();
    row.setNum('time', modernRows[i].time);
    row.setNum('CO2', modernRows[i].co2);
  }

  for (let i = 0; i < paleoTable.getRowCount(); i++) {
    const sourceRow = paleoTable.getRow(i);
    const timeValue = sourceRow.getNum('time');
    const co2Value = sourceRow.getNum('CO2');

    if (!Number.isFinite(timeValue) || !Number.isFinite(co2Value)) continue;
    if (timeValue >= modernStartTime) continue;

    const row = mergedTable.addRow();
    row.setNum('time', timeValue);
    row.setNum('CO2', co2Value);
  }

  if (mergedTable.getRowCount() > 0) return mergedTable;
  return paleoTable;
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
      saod
    });
  }

  return sortRowsByTimeDesc(rows);
}

function buildVolcanicSaodTable(rawLines, fallbackTable = null) {
  const saodRows = parseVolcanicSaodRows(rawLines);
  return buildTimeValueTable(saodRows, 'saod', 'Volcanic Activity', fallbackTable);
}

function parseZeebeOrbitalRows(rawLines, modernOffset) {
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

    let time = -ageKyr * 1000.0;
    if (ageKyr === 0) time = modernOffset;

    rows.push({
      time,
      eccentricity
    });
  }

  return sortRowsByTimeDesc(rows);
}

function buildEarthOrbitTableFromZeebe(rawLines, modernOffset) {
  const rows = parseZeebeOrbitalRows(rawLines, modernOffset);
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
      population
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
      sealevel: seaLevelMm / 1000.0
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
      sealevel: gslMm / 1000.0
    });
  }

  return sortRowsByTimeDesc(rows);
}

function parseKopp2016GlobalSeaLevelRows(rawLines) {
  const groupedByAge = new Map();
  if (!rawLines || rawLines.length === 0) return [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (line.length === 0 || line.startsWith('#')) continue;
    if (line.startsWith('region\t')) continue;

    const tokens = line.split(/\t+/);
    if (tokens.length < 10) continue;

    const rslMeters = parseFloat(tokens[6]);
    const ageAd = parseFloat(tokens[9]);
    if (!Number.isFinite(rslMeters) || !Number.isFinite(ageAd)) continue;

    const time = ageAd - 1950;
    const key = time.toString();
    if (!groupedByAge.has(key)) groupedByAge.set(key, []);
    groupedByAge.get(key).push(rslMeters);
  }

  const rows = [];
  groupedByAge.forEach((values, key) => {
    const time = parseFloat(key);
    const sealevel = median(values);
    if (!Number.isFinite(time) || !Number.isFinite(sealevel)) return;

    rows.push({ time, sealevel });
  });

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
      sealevel: gmgslMeters
    });
  }

  return sortRowsByTimeDesc(rows);
}

function parseSeaLevelTableRows(table) {
  return extractTimeValueRows(table, 'Sealevel', 'sealevel');
}

function averageSeaLevelInRange(rows, startTime, endTime) {
  return averageRowsInRange(rows, 'sealevel', startTime, endTime);
}

function calibrateSeaLevelRowsToReference(sourceRows, referenceRows) {
  return calibrateRowsToReferenceByOverlap(sourceRows, referenceRows, 'sealevel');
}

function mergeSeaLevelTableWithColorado(legacyTable, coloradoRawLines, gpRawLines, koppRawLines, millerRawLines) {
  const mergedTable = new p5.Table();
  mergedTable.addColumn('time');
  mergedTable.addColumn('Sealevel');

  const coloradoRows = parseColoradoSeaLevelRows(coloradoRawLines);
  const legacyRowsUncalibrated = parseSeaLevelTableRows(legacyTable);
  const gpRowsUncalibrated = parseGp2014SeaLevelRows(gpRawLines);
  const koppRowsUncalibrated = parseKopp2016GlobalSeaLevelRows(koppRawLines);
  const millerRowsUncalibrated = parseMiller2024SeaLevelRows(millerRawLines);

  const newestReferenceRows = coloradoRows.length > 0 ? coloradoRows : legacyRowsUncalibrated;
  const gpRows = gpRowsUncalibrated.length > 0
    ? calibrateSeaLevelRowsToReference(gpRowsUncalibrated, newestReferenceRows)
    : [];
  const koppReferenceRows = gpRows.length > 0 ? gpRows : newestReferenceRows;
  const koppRows = koppRowsUncalibrated.length > 0
    ? calibrateSeaLevelRowsToReference(koppRowsUncalibrated, koppReferenceRows)
    : [];

  const legacyReferenceRows = koppRows.length > 0
    ? koppRows
    : (gpRows.length > 0 ? gpRows : newestReferenceRows);
  const legacyRows = legacyRowsUncalibrated.length > 0
    ? calibrateSeaLevelRowsToReference(legacyRowsUncalibrated, legacyReferenceRows)
    : [];

  const millerReferenceRows = legacyRows.length > 0
    ? legacyRows
    : legacyReferenceRows;
  const millerRows = millerRowsUncalibrated.length > 0
    ? calibrateSeaLevelRowsToReference(millerRowsUncalibrated, millerReferenceRows)
    : [];

  const modernStartTime = coloradoRows.length > 0 ? coloradoRows[coloradoRows.length - 1].time : Number.POSITIVE_INFINITY;
  const gpStartTime = gpRows.length > 0 ? gpRows[gpRows.length - 1].time : modernStartTime;
  const koppStartTime = koppRows.length > 0 ? koppRows[koppRows.length - 1].time : gpStartTime;
  const legacyOldestTime = legacyRows.length > 0 ? legacyRows[legacyRows.length - 1].time : koppStartTime;

  for (let i = 0; i < coloradoRows.length; i++) {
    const row = mergedTable.addRow();
    row.setNum('time', coloradoRows[i].time);
    row.setNum('Sealevel', coloradoRows[i].sealevel);
  }

  for (let i = 0; i < gpRows.length; i++) {
    if (gpRows[i].time >= modernStartTime) continue;

    const row = mergedTable.addRow();
    row.setNum('time', gpRows[i].time);
    row.setNum('Sealevel', gpRows[i].sealevel);
  }

  for (let i = 0; i < koppRows.length; i++) {
    if (koppRows[i].time >= gpStartTime) continue;

    const row = mergedTable.addRow();
    row.setNum('time', koppRows[i].time);
    row.setNum('Sealevel', koppRows[i].sealevel);
  }

  for (let i = 0; i < legacyRows.length; i++) {
    if (legacyRows[i].time >= koppStartTime) continue;

    const row = mergedTable.addRow();
    row.setNum('time', legacyRows[i].time);
    row.setNum('Sealevel', legacyRows[i].sealevel);
  }

  for (let i = 0; i < millerRows.length; i++) {
    if (millerRows[i].time >= legacyOldestTime) continue;

    const row = mergedTable.addRow();
    row.setNum('time', millerRows[i].time);
    row.setNum('Sealevel', millerRows[i].sealevel);
  }

  if (mergedTable.getRowCount() > 0) return mergedTable;
  return legacyTable;
}

function parseLaspDailySolarRows(rawLines) {
  const rows = [];
  if (!rawLines || rawLines.length === 0) return rows;

  const daysPerYear = 365.2425;
  const baseYear = 1610;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (line.length === 0 || line.startsWith('#')) continue;

    const tokens = line.split(/[\s,]+/).filter((token) => token.length > 0);
    if (tokens.length < 2) continue;

    const daysSinceBase = parseFloat(tokens[0]);
    const irradiance = parseFloat(tokens[1]);
    if (!Number.isFinite(daysSinceBase) || !Number.isFinite(irradiance)) continue;

    const decimalYear = baseYear + (daysSinceBase / daysPerYear);
    rows.push({
      time: decimalYear - 1950,
      irradiance
    });
  }

  return sortRowsByTimeDesc(rows);
}

function parseTsis24hrSolarRows(rawLines) {
  const rows = [];
  if (!rawLines || rawLines.length === 0) return rows;

  const julianAt2000 = 2451545.0;
  const daysPerYear = 365.2425;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (line.length === 0 || line.startsWith('#')) continue;

    const tokens = line.split(/[\s,]+/).filter((token) => token.length > 0);
    if (tokens.length < 2) continue;

    const julianDate = parseFloat(tokens[0]);
    const irradiance = parseFloat(tokens[1]);
    if (!Number.isFinite(julianDate) || !Number.isFinite(irradiance)) continue;
    if (irradiance <= 0) continue;

    const decimalYear = 2000 + ((julianDate - julianAt2000) / daysPerYear);
    rows.push({
      time: decimalYear - 1950,
      irradiance
    });
  }

  return sortRowsByTimeDesc(rows);
}

function parseLean2000SolarRows(rawLines) {
  const rows = [];
  if (!rawLines || rawLines.length === 0) return rows;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (line.length === 0) continue;

    const tokens = line.split(/\s+/);
    if (tokens.length < 3) continue;

    const decimalYear = parseFloat(tokens[0]);
    const irradianceWithBackground = parseFloat(tokens[2]);
    if (!Number.isFinite(decimalYear) || !Number.isFinite(irradianceWithBackground)) continue;

    rows.push({
      time: decimalYear - 1950,
      irradiance: irradianceWithBackground
    });
  }

  return sortRowsByTimeDesc(rows);
}

function averageIrradianceInRange(rows, startTime, endTime) {
  return averageRowsInRange(rows, 'irradiance', startTime, endTime);
}

function boundaryWindowMean(rows, boundaryTime, windowYears, side) {
  return boundaryWindowMeanForKey(rows, boundaryTime, windowYears, side, 'irradiance');
}

function calibrateLeanToLasp(leanRows, laspRows) {
  return calibrateRowsToReferenceByBoundary(leanRows, laspRows, 'irradiance', 30);
}

function calibrateRowsToReference(sourceRows, referenceRows) {
  return calibrateRowsToReferenceByBoundary(sourceRows, referenceRows, 'irradiance', 30);
}

function parseSteinhilber2012SolarRows(rawLines) {
  const rows = [];
  if (!rawLines || rawLines.length === 0) return rows;

  const pmod1986Tsi = 1365.57;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (line.length === 0) continue;

    const tokens = line.split(/\s+/);
    if (tokens.length < 7) continue;

    const yearBp = parseFloat(tokens[0]);
    const tsiAnomaly = parseFloat(tokens[5]);
    if (!Number.isFinite(yearBp) || !Number.isFinite(tsiAnomaly)) continue;

    rows.push({
      time: -yearBp,
      irradiance: pmod1986Tsi + tsiAnomaly
    });
  }

  return sortRowsByTimeDesc(rows);
}

function median(values) {
  if (!values || values.length === 0) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = int(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

function smoothSolarTable(sourceTable, applyDespike = true, applySmoothing = true) {
  if (!sourceTable || sourceTable.getRowCount() < 3) return sourceTable;
  if (!applyDespike && !applySmoothing) return sourceTable;

  const rowCount = sourceTable.getRowCount();
  const times = new Array(rowCount);
  const values = new Array(rowCount);

  for (let i = 0; i < rowCount; i++) {
    const row = sourceTable.getRow(i);
    times[i] = row.getNum('time');
    values[i] = row.getNum('Solar Irradiance');
  }

  const processed = values.slice();

  if (applyDespike) {
    for (let i = 0; i < rowCount; i++) {
      const local = [];
      const start = max(0, i - SOLAR_DESPIKE_HAMPEL_RADIUS);
      const end = min(rowCount - 1, i + SOLAR_DESPIKE_HAMPEL_RADIUS);

      for (let j = start; j <= end; j++) {
        if (Number.isFinite(values[j])) local.push(values[j]);
      }

      if (local.length < 5) continue;

      const localMedian = median(local);
      if (!Number.isFinite(localMedian)) continue;

      const absoluteDeviations = new Array(local.length);
      for (let k = 0; k < local.length; k++) {
        absoluteDeviations[k] = abs(local[k] - localMedian);
      }
      const localMad = median(absoluteDeviations);
      if (!Number.isFinite(localMad) || localMad <= 0) continue;

      const sigma = SOLAR_DESPIKE_MAD_SCALE * localMad;
      if (abs(values[i] - localMedian) > SOLAR_DESPIKE_SIGMA_THRESHOLD * sigma) {
        processed[i] = localMedian;
      }
    }
  }

  const smoothed = processed.slice();

  if (applySmoothing) {
    let denseNewestTime = -Number.MAX_VALUE;
    let denseOldestTime = Number.MAX_VALUE;

    for (let i = 0; i < rowCount; i++) {
      const prevDt = i > 0 ? abs(times[i - 1] - times[i]) : Number.POSITIVE_INFINITY;
      const nextDt = i < rowCount - 1 ? abs(times[i] - times[i + 1]) : Number.POSITIVE_INFINITY;
      const isDense = prevDt < SOLAR_DENSE_THRESHOLD_YEARS || nextDt < SOLAR_DENSE_THRESHOLD_YEARS;

      if (isDense) {
        if (times[i] > denseNewestTime) denseNewestTime = times[i];
        if (times[i] < denseOldestTime) denseOldestTime = times[i];
      }
    }

    const fallbackNewest = times[0];
    const fallbackOldest = times[rowCount - 1];
    if (!Number.isFinite(denseNewestTime) || !Number.isFinite(denseOldestTime)) {
      denseNewestTime = fallbackNewest;
      denseOldestTime = fallbackOldest;
    }

    const denseTimeSpan = max(0.000001, denseNewestTime - denseOldestTime);

    for (let i = 0; i < rowCount; i++) {
      const gradientAgeFraction = constrain((denseNewestTime - times[i]) / denseTimeSpan, 0, 1);
      const ramp = pow(gradientAgeFraction, SOLAR_SMOOTHING_GRADIENT_EXPONENT);
      const windowDays = lerp(SOLAR_SMOOTHING_WINDOW_DAYS_NEAR, SOLAR_SMOOTHING_WINDOW_DAYS_FAR, ramp);
      const windowYears = windowDays / 365.2425;

      let sum = 0;
      let count = 0;
      for (let j = 0; j < rowCount; j++) {
        if (abs(times[j] - times[i]) <= windowYears) {
          sum += processed[j];
          count++;
        }
      }

      if (count > 0) smoothed[i] = sum / count;
    }
  }

  const outputTable = new p5.Table();
  outputTable.addColumn('time');
  outputTable.addColumn('Solar Irradiance');

  for (let i = 0; i < rowCount; i++) {
    const row = outputTable.addRow();
    row.setNum('time', times[i]);
    row.setNum('Solar Irradiance', smoothed[i]);
  }

  return outputTable;
}

function mergeSolarTableWithLaspTsisLeanAndSteinhilber(laspRawLines, tsisRawLines, leanRawLines, steinhilberRawLines, fallbackTable, applyCalibration = true) {
  const mergedTable = new p5.Table();
  mergedTable.addColumn('time');
  mergedTable.addColumn('Solar Irradiance');

  const laspRows = parseLaspDailySolarRows(laspRawLines);
  const tsisRows = parseTsis24hrSolarRows(tsisRawLines);
  const leanRowsUncalibrated = parseLean2000SolarRows(leanRawLines);
  const leanRows = applyCalibration ? calibrateLeanToLasp(leanRowsUncalibrated, laspRows) : leanRowsUncalibrated;
  const steinhilberRowsUncalibrated = parseSteinhilber2012SolarRows(steinhilberRawLines);
  const steinhilberRows = applyCalibration ? calibrateRowsToReference(steinhilberRowsUncalibrated, leanRows) : steinhilberRowsUncalibrated;
  const laspStartTime = laspRows.length > 0 ? laspRows[laspRows.length - 1].time : Number.POSITIVE_INFINITY;
  const tsisStartTime = tsisRows.length > 0 ? tsisRows[tsisRows.length - 1].time : Number.POSITIVE_INFINITY;
  const leanStartTime = leanRows.length > 0 ? leanRows[leanRows.length - 1].time : Number.POSITIVE_INFINITY;

  for (let i = 0; i < tsisRows.length; i++) {
    const row = mergedTable.addRow();
    row.setNum('time', tsisRows[i].time);
    row.setNum('Solar Irradiance', tsisRows[i].irradiance);
  }

  for (let i = 0; i < laspRows.length; i++) {
    if (laspRows[i].time >= tsisStartTime) continue;

    const row = mergedTable.addRow();
    row.setNum('time', laspRows[i].time);
    row.setNum('Solar Irradiance', laspRows[i].irradiance);
  }

  for (let i = 0; i < leanRows.length; i++) {
    if (leanRows[i].time >= laspStartTime) continue;

    const row = mergedTable.addRow();
    row.setNum('time', leanRows[i].time);
    row.setNum('Solar Irradiance', leanRows[i].irradiance);
  }

  for (let i = 0; i < steinhilberRows.length; i++) {
    if (steinhilberRows[i].time >= leanStartTime) continue;

    const row = mergedTable.addRow();
    row.setNum('time', steinhilberRows[i].time);
    row.setNum('Solar Irradiance', steinhilberRows[i].irradiance);
  }

  if (mergedTable.getRowCount() > 0) return mergedTable;
  return fallbackTable;
}

function shouldUseCachedSolarProcessing() {
  return solarCalibrationEnabled && solarDespikeEnabled && solarSmoothingEnabled;
}

function hasUsableSolarCache(table) {
  return !!(table && table.getRowCount && table.getRowCount() > 0);
}

function buildSolarIrradianceDataset(fallbackTable) {
  if (shouldUseCachedSolarProcessing() && hasUsableSolarCache(sourceTables.solarIrradianceProcessed)) {
    return sourceTables.solarIrradianceProcessed;
  }

  const merged = mergeSolarTableWithLaspTsisLeanAndSteinhilber(
    sourceTables.solarIrradianceRaw,
    sourceTables.solarIrradianceTsisRaw,
    sourceTables.solarIrradianceLeanRaw,
    sourceTables.solarIrradianceSteinhilberRaw,
    fallbackTable,
    solarCalibrationEnabled
  );

  return smoothSolarTable(merged, solarDespikeEnabled, solarSmoothingEnabled);
}

function rebuildSolarIrradianceDataset() {
  sourceTables.solarIrradiance = buildSolarIrradianceDataset(sourceTables.solarIrradiance);

  for (let i = 0; i < data.length; i++) {
    if (data[i].columnY === 'Solar Irradiance') {
      data[i] = new Data(sourceTables.solarIrradiance, 'time', 'Solar Irradiance', 'W/m²', 1, color(255, 220, 0), 0, true);
      break;
    }
  }

  pScrollValue = -1;
}

function setup() {
  // Set window size and properties
  createCanvas(windowWidth, windowHeight);
  currentYear = year() + 1;
  sourceTables.earthOrbit = buildEarthOrbitTableFromZeebe(sourceTables.zeebeOrbitalRaw, currentYear - 1950);
  sourceTables.volcanic = buildVolcanicSaodTable(sourceTables.volcanicSaodRaw, sourceTables.volcanic);
  sourceTables.population = buildPopulationTableFromLongRun(sourceTables.populationLongRunRaw, year());
  sourceTables.co2 = buildCo2TableFromAntarcticaComposite(sourceTables.co2AntarcticaRaw);
  sourceTables.co2 = mergeCo2TableWithRaeAlkenone(sourceTables.co2, sourceTables.co2RaeAlkenoneRaw, sourceTables.co2AntarcticaRaw);
  sourceTables.co2 = mergeCo2TableWithTripati(sourceTables.co2, sourceTables.co2TripatiRaw, sourceTables.co2AntarcticaRaw);
  sourceTables.co2 = mergeCo2TableWithRaeD11b(
    sourceTables.co2,
    sourceTables.co2RaeD11bRaw,
    CO2_RAE_D11B_FILL_BEFORE_TIME,
    CO2_HOLE_FILL_TOLERANCE_YEARS
  );

  const mergedTemperature = new p5.Table();
  mergedTemperature.addColumn('time');
  mergedTemperature.addColumn('Temperature');
  sourceTables.temperature = mergedTemperature;

  sourceTables.temperature = mergeTemperatureTableWithHansen(sourceTables.temperature, sourceTables.hansenTempRaw);
  sourceTables.temperature = mergeTemperatureTableWithEdc(sourceTables.temperature, sourceTables.edcTempRaw);
  sourceTables.temperature = mergeTemperatureTableWithNeukom(sourceTables.temperature, sourceTables.neukomTempRaw);
  sourceTables.temperature = mergeTemperatureTableWithGiss(sourceTables.temperature, sourceTables.gissTempRaw);
  sourceTables.co2 = mergeCo2TableWithNoaaDaily(sourceTables.co2, sourceTables.co2DailyRaw, sourceTables.co2InSituRaw);
  sourceTables.solarIrradiance = buildSolarIrradianceDataset(sourceTables.solarIrradiance);
  sourceTables.sealevel = mergeSeaLevelTableWithColorado(
    sourceTables.sealevel,
    sourceTables.sealevelRaw,
    sourceTables.sealevelGpRaw,
    sourceTables.sealevelKoppRaw,
    sourceTables.sealevelMillerRaw
  );

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

  // Load datasets (position 0 = baseline, position 1 = overlay)
  data.push(new Data(sourceTables.temperature, 'time', 'Temperature', '°C', 0, color(255), 0, true));

  data.push(new Data(sourceTables.co2, 'time', 'CO2', 'ppm', 1, color(255, 128, 64), 0, true));
  data.push(new Data(sourceTables.earthOrbit, 'time', 'Eccentricity', '', 1, color(128, 128, 255), 0, false));
  data.push(new Data(sourceTables.solarIrradiance, 'time', 'Solar Irradiance', 'W/m²', 1, color(255, 220, 0), 0, true));
  data.push(new Data(sourceTables.volcanic, 'time', 'Volcanic Activity', 'OD', 1, color(255, 180, 80), 0, true));
  data.push(new Data(sourceTables.sealevel, 'time', 'Sealevel', 'm', 1, color(0, 128, 255), 0, true));
  
  data.push(new Data(sourceTables.population, 'time', 'Population', 'people', 1, color(255, 128, 200), 0, true));

  maxData = data.length - 1; // Set maximum dataset count

  refreshTemperatureWithRemoteGiss();
  refreshCo2WithRemoteNoaaDaily();
  refreshSealevelWithRemoteColorado();
  refreshSolarWithRemoteTsis();
}

function draw() {
  // Set cursor based on mouse state
  if (mouseIsPressed) {
    cursor(MOVE);
  } else {
    cursor(ARROW);
  }

  textAlign(LEFT, BASELINE);
  push();
  translate(-shift, 0); // Apply left margin shift

  // Calculate time-to-pixel conversion (negative = past extends left)
  oneYear = -(1 / scrollValue) * 1000;

  // Only redraw if something changed (performance optimization)
  if (dist(mouseX, mouseY, pmouseX, pmouseY) > 0
    || scrollValue !== pScrollValue
    || data[selectedData].rectY !== data[selectedData].defRectY
    || data[0].rectY !== data[0].defRectY) {
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

    // Draw datasets (temperature baseline + selected overlay)
    data[0].draw(); // Always draw temperature
    if (selectedData > 0) data[selectedData].draw(); // Draw selected dataset

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
    if (showCursor && mouseY > height / GUI_HEIGHT_DIVISOR) {
      fill(255);
      stroke(255, STROKE_ALPHA_LOW);
      line(mouseX + shift, height - height / TIMELINE_HEIGHT_DIVISOR_SMALL, mouseX + shift, height); // Vertical line to timeline
      line(mouseX + shift, mouseY, mouseX + shift, height - height / 9); // Vertical line to data
      noStroke();
      textSize(height / TEXT_SIZE_DIVISOR_SMALL);
      textAlign(CENTER, BASELINE);
      // Format time display based on zoom level
      if (oneYear <= -33) text(((width - (mouseX + shift)) / oneYear) + currentYear, mouseX + shift, height - height / GUI_HEIGHT_DIVISOR);
      if (oneYear < -0.1 && oneYear > -33) text(int(((width - (mouseX + shift)) / oneYear) + currentYear), mouseX + shift, height - height / GUI_HEIGHT_DIVISOR);
      if (oneYear >= -0.1) text(nfc(((width - (mouseX + shift)) / oneYear + currentYear), 0), mouseX + shift, height - height / GUI_HEIGHT_DIVISOR);
    }

    // Calculate timeline tick spacing based on zoom level
    let v = 1; // Tick interval in years
    yearShift = 0; // Year alignment offset

    // Progressive tick spacing for different zoom levels
    if (scrollValue > 30) v = 10;
    if (scrollValue > 30) yearShift = round((currentYear * 0.1)) * 10 - currentYear;
    if (scrollValue > 150) v = 50;
    if (scrollValue > 150) yearShift = round((currentYear * 0.01)) * 100 - currentYear;
    if (scrollValue > 500) v = 100;
    if (scrollValue > 500) yearShift = round((currentYear * 0.001)) * 1000 - currentYear;
    if (scrollValue > 1000) v = 500;
    if (scrollValue > 5000) v = 1000;
    if (scrollValue > 10000) v = 5000;
    if (scrollValue > 50000) v = 10000;
    if (scrollValue > 50000) yearShift = round((currentYear * 0.0001)) * 10000 - currentYear;
    if (scrollValue > 100000) v = 50000;
    if (scrollValue > 500000) v = 100000;
    if (scrollValue > 1000000) v = 500000;
    if (scrollValue > 5000000) v = 1000000;
    if (scrollValue > 10000000) v = 5000000;
    if (scrollValue > 50000000) v = 10000000;
    if (scrollValue > 100000000) v = 50000000;
    if (scrollValue > 400000000) v = 100000000;
    if (scrollValue > 800000000) v = 500000000;
    if (scrollValue > 3000000000) v = 1000000000;
    if (scrollValue > 8000000000) v = 5000000000;

    // Draw right margin background
    fill(0);
    noStroke();
    rect(width, 0, shift, height);

    // Draw timeline ticks and labels
    fill(255);
    stroke(0);
    textAlign(CENTER, BASELINE);
    const minLabelSpacing = TIMELINE_LABEL_MIN_SPACING;
    let lastLabelX = -1000000;
    for (let i = width - (oneYear * yearShift), y = yearShift; i > 0; i -= (1.0 / scrollValue) * (1000.0 * v), y -= v) {
      let label = nf(y + currentYear, 0, 0);
      if (scrollValue >= 50000) label = nfc(y + currentYear, 0); // Use comma formatting for large numbers
      if (y > -13800000000) { // Don't draw ticks beyond universe age
        perfTimelineTicks++;
        stroke(255);
        if (abs(i - lastLabelX) >= minLabelSpacing) {
          noStroke();
          text(label, i, height - height / 24);
          lastLabelX = i;
          perfTimelineLabels++;
        }
        stroke(255);
        line(i, height - height / TIMELINE_HEIGHT_DIVISOR_SMALL, i, height);
      }
    }

    // Draw universe age boundary line
    let x = 0;
    x = width - (oneYear * yearShift) - (1.0 / scrollValue) * 1000.0 * 13800000000;
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
      const perfLine4 = `Temp refresh: ${gissRefreshStatus} (${gissRefreshSource})`;
      const perfLine5 = `CO2 refresh: ${co2RefreshStatus} (${co2RefreshSource})`;
      const perfLine6 = `Sea lvl refresh: ${sealevelRefreshStatus} (${sealevelRefreshSource})`;
      const perfLine7 = `Solar refresh: ${solarRefreshStatus} (${solarRefreshSource})`;
      fill(0, 32, 64, BACKGROUND_ALPHA_HIGH);
      rect(8, 8, max(textWidth(perfLine1), max(textWidth(perfLine2), max(textWidth(perfLine3), max(textWidth(perfLine4), max(textWidth(perfLine5), max(textWidth(perfLine6), textWidth(perfLine7))))))) + 12, height / TEXT_SIZE_DIVISOR_TINY * 8);
      fill(255);
      noStroke();
      text(perfLine1, 14, 10);
      text(perfLine2, 14, 10 + height / TEXT_SIZE_DIVISOR_TINY);
      text(perfLine3, 14, 10 + 2 * (height / TEXT_SIZE_DIVISOR_TINY));
      text(perfLine4, 14, 10 + 3 * (height / TEXT_SIZE_DIVISOR_TINY));
      text(perfLine5, 14, 10 + 4 * (height / TEXT_SIZE_DIVISOR_TINY));
      text(perfLine6, 14, 10 + 5 * (height / TEXT_SIZE_DIVISOR_TINY));
      text(perfLine7, 14, 10 + 6 * (height / TEXT_SIZE_DIVISOR_TINY));
    }
  }
  pScrollValue = scrollValue; // Store previous scroll value for change detection
}

function GUI() {
  textAlign(CENTER, CENTER);
  textSize(height / TEXT_SIZE_DIVISOR_LARGE);
  stroke(255);
  strokeWeight(0.5);
  line(0, height / GUI_HEIGHT_DIVISOR, width, height / GUI_HEIGHT_DIVISOR);
  noStroke();
  for (let i = 0; i < maxData; i++) {
    fill(128);
    if (mouseX > width / maxData * i && mouseX < width / maxData * i + width / maxData && mouseY < height / GUI_HEIGHT_DIVISOR) {
      if (mouseIsPressed) {
        selectedData = i + 1;
      } else {
        fill(255);
      }
    }

    if (i === selectedData - 1) fill(data[selectedData].c);
    text(data[i + 1].columnY, width / (maxData * 2) + width / maxData * i, height / 26);
  }
}

function keyPressed() {
  if (key === '-' || key === 'a' || key === 'A' || (keyCode === LEFT_ARROW && scrollValue + scrollSpeed < MAX_SCROLL_VALUE)) {
    scrollValue += scrollSpeed + (scrollValue / 50.0);
  }
  if (key === '+' || key === 'd' || key === 'D' || (keyCode === RIGHT_ARROW && scrollValue - scrollSpeed >= 1)) {
    scrollValue -= scrollSpeed + (scrollValue / 50.0);
  }
  if (key === '0') scrollValue = 10;
  if (key === '1') scrollValue = 100;
  if (key === '2') scrollValue = 1000;
  if (key === '3') scrollValue = 10000;
  if (key === '4') scrollValue = 100000;
  if (key === '5') scrollValue = 1000000;
  if (key === '6') scrollValue = 10000000;
  if (key === '7') scrollValue = 100000000;
  if (key === '8') scrollValue = 1000000000;
  if (key === '9') scrollValue = 14000000000;
  if (key === 'p' || key === 'P') perfHUD = !perfHUD;
  if (key === 'C' || key === 'c' || key === ' ') showCursor = !showCursor;
  if (key === 'K' || key === 'k') {
    solarCalibrationEnabled = !solarCalibrationEnabled;
    rebuildSolarIrradianceDataset();
  }
  if (key === 'H' || key === 'h') {
    solarDespikeEnabled = !solarDespikeEnabled;
    rebuildSolarIrradianceDataset();
  }
  if (key === 'J' || key === 'j') {
    solarSmoothingEnabled = !solarSmoothingEnabled;
    rebuildSolarIrradianceDataset();
  }
}

function mousePressed() {
  if (mouseButton === RIGHT) showCursor = !showCursor;
}

function mouseWheel(event) {
  // Scale zoom proportionally to current zoom level
  const wheelSteps = event.delta / 100;
  const zoomFactor = 1.0 + (0.25 * wheelSteps); // 25% zoom per wheel step

  // Apply zoom with bounds checking
  const newScrollValue = scrollValue * zoomFactor;
  if (newScrollValue >= 1 && newScrollValue < MAX_SCROLL_VALUE) {
    scrollValue = newScrollValue;
  }

  return false;
}

function mouseDragged() {
  const deltaX = mouseX - pmouseX;
  let zoomDivisor;
  if (mouseX < width - 200) zoomDivisor = (scrollSpeed * width) - mouseX - shift;
  else zoomDivisor = scrollSpeed * 200;

  zoomDivisor = max(10, abs(zoomDivisor));
  scrollValue += deltaX * (scrollValue / zoomDivisor);
  scrollValue = constrain(scrollValue, 1, MAX_SCROLL_VALUE - 1);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

class Data {
  static MIN_Y_RANGE = 0.000001;
  static SNAP_THRESHOLD_PX = 5;
  static SPRING_BASE_SPEED = 5;
  static SPRING_DAMPING_DIVISOR = 10;
  static COLLAPSED_X_THRESHOLD_PX = 1.0;
  static MIN_PIXEL_SPACING = 0.01;
  static MIN_TARGET_VERTICES = 4000;
  static INITIAL_RENDERED_X = -999999;

  // Constructor: load and process CSV data
  constructor(sourceTable, sourceColumnX, sourceColumnY, sourceUnit, sourcePosition, sourceColor, sourceType, sourceYScroll) {
    // Data properties
    this.type = sourceType;                    // Rendering type, panel position
    this.position = sourcePosition;
    this.dataX = new Array(sourceTable.getRowCount()); // X and Y data arrays
    this.dataY = new Array(sourceTable.getRowCount());
    this.defRectY = 0;                         // Default Y position for panel
    this.rectX = 0;
    this.rectY = 0;
    this.rectW = 0;
    this.rectH = 0;                            // Panel rectangle properties
    this.columnX = sourceColumnX;
    this.columnY = sourceColumnY;
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
      if (this.dataY[i] > this.maxY) this.maxY = this.dataY[i];
      if (this.dataY[i] < this.minY) this.minY = this.dataY[i];
    }
    // Calculate data ranges
    this.distY = this.maxY - this.minY;
    this.distX = this.maxX - this.minX;
    console.log('Max X: ' + this.maxX);
    console.log('Max Y: ' + this.maxY);
    console.log('Min X: ' + this.minX);
    console.log('Min Y: ' + this.minY);
    console.log('dist X: ' + this.distX);
    console.log('dist Y: ' + this.distY);
  }

  draw() {
    colorMode(RGB);
    this.defRectY = height / GUI_HEIGHT_DIVISOR;   // Default Y position below GUI
    this.rectX = width + oneYear * abs(this.maxX - this.BP); // Panel X position (right edge)
    this.rectW = oneYear * abs(this.distX);        // Panel width based on time range

    let renderDistance = this.visiblePointCount();

    // Include one point beyond visible range for proper line drawing
    if (renderDistance < this.dataX.length) renderDistance++;

    // Calculate Y-axis scaling (global vs local)
    this.localMinY = this.minY;
    if (this.yScrolling) {
      // Use only visible data for Y-axis scaling
      this.localMaxY = this.dataY[0];
      this.localMinY = this.dataY[0];
      for (let i = 0; i < renderDistance; i += 1) {
        if (this.dataY[i] > this.localMaxY) this.localMaxY = this.dataY[i];
        if (this.dataY[i] < this.localMinY) this.localMinY = this.dataY[i];
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
    if (this.rectX + this.rectW < shift && this.rectX > shift + textWidth(this.columnY)) text(this.columnY + ':', shift + 10, this.rectY + 5);
    else if (this.rectX + this.rectW > shift) text(this.columnY + ':', this.rectX + this.rectW + 10, this.rectY + 5);
    else if (this.rectX < shift + textWidth(this.columnY)) text(this.columnY + ':', this.rectX - textWidth(this.columnY) + 10, this.rectY + 5);

    // Begin drawing the data line/curve
    stroke(255);
    strokeWeight(1);
    noFill();
    const h = -this.rectH / this.distY;
    const w = oneYear;
    const x = width;
    const y = (this.rectY + this.rectH / 2) - (this.localMinY * h + ((h * this.distY) / 2));

    const lastVisibleIndex = max(0, renderDistance - 1);
    const visibleSpanPx = abs(oneYear * (this.dataX[0] - this.dataX[lastVisibleIndex]));
    const collapsedX = renderDistance > 1 && visibleSpanPx < Data.COLLAPSED_X_THRESHOLD_PX;

    beginShape();
    if (this.type === 1) {
      fill(255);
      vertex(this.rectX, this.rectY); // Start point for filled curve
    }
    if (this.type === 1) vertex(this.rectX, ((this.rectY + this.rectH / 2) - (this.minY * (this.rectH / this.distY) + (((this.rectH / this.distY) * this.distY) / 2))) + this.dataY[0] * (this.rectH / this.distY));

    if (collapsedX) {
      strokeWeight(1);
      stroke(this.c);
      const collapsedXPos = x - w * (this.dataX[0] - this.BP);
      const collapsedYPos = y + this.dataY[0] * h;
      if (this.type === 0) {
        point(collapsedXPos, collapsedYPos);
        perfDataVertices++;
      }
      if (this.type === 1) {
        curveVertex(collapsedXPos, collapsedYPos);
        perfDataVertices++;
      }
    } else {
      // Adaptive point thinning: target a bounded number of vertices per viewport
      const targetVertices = max(Data.MIN_TARGET_VERTICES, (width - shift) * 2.0);
      const minPixelSpacing = max(Data.MIN_PIXEL_SPACING, visibleSpanPx / targetVertices);
      let lastRenderedX = Data.INITIAL_RENDERED_X; // Track X position of last rendered point

      for (let i = 0, pI = 1; i < renderDistance; i++) {
        const pointX = x - w * (this.dataX[i] - this.BP);
        const prevPointX = x - w * (this.dataX[pI] - this.BP);
        const pixelSpacing = abs(pointX - lastRenderedX);

        // Always render first point, then only render if spaced far enough apart
        if (i === 0 || pixelSpacing >= minPixelSpacing) {

          strokeWeight(1);
          stroke(this.c);
          if (this.type === 0) {
            line(pointX, y + this.dataY[i] * h, prevPointX, y + this.dataY[pI] * h);
            perfDataVertices++;
          }
          if (this.type === 1) {
            curveVertex(pointX, y + this.dataY[i] * h);
            perfDataVertices++;
          }

          // Check if mouse is over this data segment for tooltip
          if (pointX <= mouseX + shift && prevPointX > mouseX + shift) {
            const valueText = this.formatTooltipValue(this.dataY[i]);
            const mouseData = this.unit && this.unit.length > 0 ? valueText + ' ' + this.unit : valueText;
            this.dataDist = abs(mouseY - (y + this.dataY[i] * h));

            // Draw tooltip if cursor is enabled and in data area
            if (showCursor && mouseY > height / GUI_HEIGHT_DIVISOR) {
              line(mouseX + shift, mouseY, mouseX + shift, y + this.dataY[i] * h); // Vertical line to data point
              noStroke();
              rectMode(CORNER);

              // Position tooltip box to avoid screen edge
              if (mouseX + shift < width - textWidth(mouseData)) {
                fill(0, 32, 64, BACKGROUND_ALPHA_HIGH);
                rect(mouseX + shift, y + this.dataY[i] * h - 5, textWidth(mouseData) + 5, -height / TIMELINE_HEIGHT_DIVISOR_SMALL);
                textAlign(LEFT, BASELINE);
                fill(this.c);
                text(mouseData + ' ', mouseX + shift, y + this.dataY[i] * h - 10);
              } else if (mouseX + shift >= width - textWidth(mouseData)) {
                fill(0, 32, 64, BACKGROUND_ALPHA_HIGH);
                rect(mouseX + shift, y + this.dataY[i] * h - 5, -textWidth(mouseData) + 5, -height / TIMELINE_HEIGHT_DIVISOR_SMALL);
                textAlign(RIGHT, BASELINE);
                fill(this.c);
                text(mouseData, mouseX + shift, y + this.dataY[i] * h - 10);
              }
            }

          }
          lastRenderedX = pointX;
          pI = i;
        }
      }
    }

    // End the curve shape
    if (this.type === 1) vertex(this.rectX + this.rectW, this.rectY);
    endShape();
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
