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
      note: bin.count + ' days • ' + first + '–' + last + (bin.provisional ? ' • provisional' : '') });
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

  const smoothedRows = rows.map(row => ({ ...row }));
  for (let i = 0; i < denseCount; i++) {
    smoothedRows[denseCount - 1 - i].irradiance = smoothedAscending[i];
    smoothedRows[denseCount - 1 - i].note = windowDays + '-day mean' +
      (smoothedRows[denseCount - 1 - i].provisional ? ' • provisional' : '');
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
  if (nnlAlignment.offset === null) {
    throw new Error('Solar records need at least twelve months of paired NNL/TSIS observations to align their references');
  }
  const alignedNnl = offsetValueRows(nnl, 'irradiance', nnlAlignment.offset);
  const reference = alignedNnl;
  const start = reference.at(-1)?.time ?? Infinity;
  const baseAlignment = pairedSolarOffset(base, reference, start, start + SOLAR_ALIGNMENT_WINDOW_YEARS);
  if (baseAlignment.offset === null) {
    throw new Error('Solar records need at least twelve months of paired PMIP4/NNL observations near the historical join');
  }
  const alignedBase = offsetValueRows(base, 'irradiance', baseAlignment.offset);
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
  table.annualTable = buildTimeValueTable(annualSolarRows(merged), 'irradiance', 'Solar Irradiance');
  return table;
}
