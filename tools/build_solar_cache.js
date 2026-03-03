const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'solar');
const OUTPUT_FILE = path.join(DATA_DIR, 'Solar Irradiance Processed.csv');

const SOLAR_DESPIKE_HAMPEL_RADIUS = 50;
const SOLAR_DESPIKE_SIGMA_THRESHOLD = 4.0;
const SOLAR_DESPIKE_MAD_SCALE = 1.4826;
const SOLAR_DENSE_THRESHOLD_YEARS = 0.03;
const SOLAR_SMOOTHING_WINDOW_DAYS_NEAR = 10.0;
const SOLAR_SMOOTHING_WINDOW_DAYS_FAR = 100.0;
const SOLAR_SMOOTHING_GRADIENT_EXPONENT = 1.5;

function readLines(fileName) {
  const fullPath = path.join(DATA_DIR, fileName);
  return fs.readFileSync(fullPath, 'utf8').split(/\r?\n/);
}

function median(values) {
  if (!values || values.length === 0) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

function averageIrradianceInRange(rows, startTime, endTime) {
  let sum = 0;
  let count = 0;

  for (const row of rows) {
    if (row.time < startTime || row.time > endTime) continue;
    sum += row.irradiance;
    count++;
  }

  return count > 0 ? sum / count : null;
}

function boundaryWindowMean(rows, boundaryTime, windowYears, side) {
  let startTime = boundaryTime - windowYears;
  let endTime = boundaryTime + windowYears;

  if (side === 'older') {
    endTime = boundaryTime;
  } else if (side === 'newer') {
    startTime = boundaryTime;
  }

  return averageIrradianceInRange(rows, startTime, endTime);
}

function calibrateLeanToLasp(leanRows, laspRows) {
  if (leanRows.length === 0 || laspRows.length === 0) return leanRows;

  const boundaryTime = laspRows[laspRows.length - 1].time;
  const windowYears = 30;
  const leanMean = boundaryWindowMean(leanRows, boundaryTime, windowYears, 'older');
  const laspMean = boundaryWindowMean(laspRows, boundaryTime, windowYears, 'newer');
  if (leanMean === null || laspMean === null) return leanRows;

  const offset = laspMean - leanMean;
  return leanRows.map((row) => ({ time: row.time, irradiance: row.irradiance + offset }));
}

function calibrateRowsToReference(sourceRows, referenceRows) {
  if (sourceRows.length === 0 || referenceRows.length === 0) return sourceRows;

  const boundaryTime = referenceRows[referenceRows.length - 1].time;
  const windowYears = 30;
  const sourceMean = boundaryWindowMean(sourceRows, boundaryTime, windowYears, 'older');
  const referenceMean = boundaryWindowMean(referenceRows, boundaryTime, windowYears, 'newer');
  if (sourceMean === null || referenceMean === null) return sourceRows;

  const offset = referenceMean - sourceMean;
  return sourceRows.map((row) => ({ time: row.time, irradiance: row.irradiance + offset }));
}

function parseLaspDailySolarRows(rawLines) {
  const rows = [];
  const daysPerYear = 365.2425;
  const baseYear = 1610;

  for (const lineRaw of rawLines) {
    const line = lineRaw.trim();
    if (!line || line.startsWith('#')) continue;

    const tokens = line.split(/[\s,]+/).filter(Boolean);
    if (tokens.length < 2) continue;

    const daysSinceBase = parseFloat(tokens[0]);
    const irradiance = parseFloat(tokens[1]);
    if (!Number.isFinite(daysSinceBase) || !Number.isFinite(irradiance)) continue;

    const decimalYear = baseYear + (daysSinceBase / daysPerYear);
    rows.push({ time: decimalYear - 1950, irradiance });
  }

  rows.sort((a, b) => b.time - a.time);
  return rows;
}

function parseTsis24hrSolarRows(rawLines) {
  const rows = [];
  const julianAt2000 = 2451545.0;
  const daysPerYear = 365.2425;

  for (const lineRaw of rawLines) {
    const line = lineRaw.trim();
    if (!line || line.startsWith('#')) continue;

    const tokens = line.split(/[\s,]+/).filter(Boolean);
    if (tokens.length < 2) continue;

    const julianDate = parseFloat(tokens[0]);
    const irradiance = parseFloat(tokens[1]);
    if (!Number.isFinite(julianDate) || !Number.isFinite(irradiance) || irradiance <= 0) continue;

    const decimalYear = 2000 + ((julianDate - julianAt2000) / daysPerYear);
    rows.push({ time: decimalYear - 1950, irradiance });
  }

  rows.sort((a, b) => b.time - a.time);
  return rows;
}

function parseLean2000SolarRows(rawLines) {
  const rows = [];

  for (const lineRaw of rawLines) {
    const line = lineRaw.trim();
    if (!line) continue;

    const tokens = line.split(/\s+/);
    if (tokens.length < 3) continue;

    const decimalYear = parseFloat(tokens[0]);
    const irradianceWithBackground = parseFloat(tokens[2]);
    if (!Number.isFinite(decimalYear) || !Number.isFinite(irradianceWithBackground)) continue;

    rows.push({ time: decimalYear - 1950, irradiance: irradianceWithBackground });
  }

  rows.sort((a, b) => b.time - a.time);
  return rows;
}

function parseSteinhilber2012SolarRows(rawLines) {
  const rows = [];
  const pmod1986Tsi = 1365.57;

  for (const lineRaw of rawLines) {
    const line = lineRaw.trim();
    if (!line) continue;

    const tokens = line.split(/\s+/);
    if (tokens.length < 7) continue;

    const yearBp = parseFloat(tokens[0]);
    const tsiAnomaly = parseFloat(tokens[5]);
    if (!Number.isFinite(yearBp) || !Number.isFinite(tsiAnomaly)) continue;

    rows.push({ time: -yearBp, irradiance: pmod1986Tsi + tsiAnomaly });
  }

  rows.sort((a, b) => b.time - a.time);
  return rows;
}

function mergeSolar() {
  const laspRows = parseLaspDailySolarRows(readLines('nnl_tsi_P1D.txt'));
  const tsisRows = parseTsis24hrSolarRows(readLines('tsis_tsi_24hr.txt'));
  const leanRows = calibrateLeanToLasp(parseLean2000SolarRows(readLines('lean2000_irradiance.txt')), laspRows);
  const steinhilberRows = calibrateRowsToReference(parseSteinhilber2012SolarRows(readLines('steinhilber2012.txt')), leanRows);

  const laspStartTime = laspRows.length > 0 ? laspRows[laspRows.length - 1].time : Number.POSITIVE_INFINITY;
  const tsisStartTime = tsisRows.length > 0 ? tsisRows[tsisRows.length - 1].time : Number.POSITIVE_INFINITY;
  const leanStartTime = leanRows.length > 0 ? leanRows[leanRows.length - 1].time : Number.POSITIVE_INFINITY;

  const merged = [];
  for (const row of tsisRows) merged.push(row);
  for (const row of laspRows) if (row.time < tsisStartTime) merged.push(row);
  for (const row of leanRows) if (row.time < laspStartTime) merged.push(row);
  for (const row of steinhilberRows) if (row.time < leanStartTime) merged.push(row);

  return merged;
}

function smoothSolarRows(rows) {
  if (!rows || rows.length < 3) return rows;

  const rowCount = rows.length;
  const times = rows.map((row) => row.time);
  const values = rows.map((row) => row.irradiance);
  const processed = values.slice();

  for (let i = 0; i < rowCount; i++) {
    const start = Math.max(0, i - SOLAR_DESPIKE_HAMPEL_RADIUS);
    const end = Math.min(rowCount - 1, i + SOLAR_DESPIKE_HAMPEL_RADIUS);
    const local = [];

    for (let j = start; j <= end; j++) {
      if (Number.isFinite(values[j])) local.push(values[j]);
    }

    if (local.length < 5) continue;
    const localMedian = median(local);
    if (!Number.isFinite(localMedian)) continue;

    const deviations = local.map((value) => Math.abs(value - localMedian));
    const localMad = median(deviations);
    if (!Number.isFinite(localMad) || localMad <= 0) continue;

    const sigma = SOLAR_DESPIKE_MAD_SCALE * localMad;
    if (Math.abs(values[i] - localMedian) > SOLAR_DESPIKE_SIGMA_THRESHOLD * sigma) {
      processed[i] = localMedian;
    }
  }

  const smoothed = processed.slice();

  let denseNewestTime = -Number.MAX_VALUE;
  let denseOldestTime = Number.MAX_VALUE;

  for (let i = 0; i < rowCount; i++) {
    const prevDt = i > 0 ? Math.abs(times[i - 1] - times[i]) : Number.POSITIVE_INFINITY;
    const nextDt = i < rowCount - 1 ? Math.abs(times[i] - times[i + 1]) : Number.POSITIVE_INFINITY;
    const isDense = prevDt < SOLAR_DENSE_THRESHOLD_YEARS || nextDt < SOLAR_DENSE_THRESHOLD_YEARS;

    if (isDense) {
      if (times[i] > denseNewestTime) denseNewestTime = times[i];
      if (times[i] < denseOldestTime) denseOldestTime = times[i];
    }
  }

  if (!Number.isFinite(denseNewestTime) || !Number.isFinite(denseOldestTime)) {
    denseNewestTime = times[0];
    denseOldestTime = times[rowCount - 1];
  }

  const denseTimeSpan = Math.max(0.000001, denseNewestTime - denseOldestTime);

  for (let i = 0; i < rowCount; i++) {
    const gradientAgeFraction = Math.max(0, Math.min(1, (denseNewestTime - times[i]) / denseTimeSpan));
    const ramp = Math.pow(gradientAgeFraction, SOLAR_SMOOTHING_GRADIENT_EXPONENT);
    const windowDays = SOLAR_SMOOTHING_WINDOW_DAYS_NEAR + (SOLAR_SMOOTHING_WINDOW_DAYS_FAR - SOLAR_SMOOTHING_WINDOW_DAYS_NEAR) * ramp;
    const windowYears = windowDays / 365.2425;

    let sum = 0;
    let count = 0;
    for (let j = 0; j < rowCount; j++) {
      if (Math.abs(times[j] - times[i]) <= windowYears) {
        sum += processed[j];
        count++;
      }
    }
    if (count > 0) smoothed[i] = sum / count;
  }

  return rows.map((row, index) => ({ time: row.time, irradiance: smoothed[index] }));
}

function writeCsv(rows) {
  let out = 'time,Solar Irradiance\n';
  for (const row of rows) {
    out += `${row.time.toFixed(6)},${row.irradiance.toFixed(6)}\n`;
  }
  fs.writeFileSync(OUTPUT_FILE, out, 'utf8');
}

const merged = mergeSolar();
const processed = smoothSolarRows(merged);
writeCsv(processed);
console.log(`Wrote ${processed.length} rows to ${OUTPUT_FILE}`);
