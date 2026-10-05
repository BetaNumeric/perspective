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
      band: true,
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
      band: true,
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
