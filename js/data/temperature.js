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

function parseSnyderTemperatureRows(rawLines) {
  const rows = [];
  for (const rawLine of rawLines || []) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const values = line.split(',').map(Number);
    if (values.length !== 4 || !values.every(Number.isFinite)) continue;
    const [ageKaBp, temperature, lower, upper] = values;
    if (ageKaBp <= 0 || lower > temperature || upper < temperature) continue;
    rows.push({ time: -ageKaBp * 1000, temperature, lower, upper, band: true });
  }
  return sortRowsByTimeDesc(rows);
}

function parsePhanDaTemperatureRows(rawLines) {
  const lines = (rawLines || []).map(line => line.trim()).filter(Boolean);
  const header = 'Period,Epoch,Stage,UpperAge,LowerAge,AverageAge,GMST_05,GMST_16,GMST_50,GMST_84,GMST_95,CO2_05,CO2_16,CO2_50,CO2_84,CO2_95';
  if (lines[0]?.replace(/^\uFEFF/, '') !== header) throw new Error('PhanDA temperature columns have changed or are missing');
  const rows = [];
  for (const line of lines.slice(1)) {
    const fields = parseCsvLine(line);
    const values = fields.slice(3, 11).map(Number);
    if (fields.length !== 16 || fields.slice(0, 11).some(value => !value.trim()) || !values.every(Number.isFinite)) {
      throw new Error('PhanDA contains an invalid temperature row');
    }
    const [ageYoungerMa, ageOlderMa, ageMa, lower, p16, temperature, p84, upper] = values;
    if (ageYoungerMa < 0 || ageYoungerMa >= ageOlderMa || ageMa <= ageYoungerMa || ageMa >= ageOlderMa
      || lower > p16 || p16 > temperature || temperature > p84 || p84 > upper
      || (rows.length && Math.abs(rows.at(-1).ageOlderMa - ageYoungerMa) > 1e-10)) {
      throw new Error('PhanDA age intervals or temperature percentiles are invalid');
    }
    rows.push({ time: -ageMa * 1000000, temperature, lower, upper, band: true,
      ageYoungerMa, ageOlderMa, stage: fields[2] });
  }
  if (rows.length !== 85 || rows[0].ageYoungerMa !== 0 || rows.at(-1).ageOlderMa !== 486.85) {
    throw new Error('PhanDA requires its complete 85-interval reconstruction');
  }
  return sortRowsByTimeDesc(rows);
}

function buildCombinedTemperatureTable(gissRows, pagesRows, osmanRows, snyderRows, hansenRows, phanDaRows) {
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
  const snyderReference = osmanRows.filter(row => row.time > -5000 && row.time < 0);
  if (snyderReference.length !== 25 || snyderReference.some((row, index) => row.time !== -100 - index * 200)) {
    throw new Error('Snyder alignment requires all 25 Osman bins covering 0–5000 BP');
  }
  if (snyderRows.length !== 2000 || snyderRows.some((row, index) => row.time !== -(index + 1) * 1000)) {
    throw new Error('Snyder requires its complete 1–2000 ka evaluation grid');
  }
  // Snyder anomalies already use the 0–5 ka mean; convert that reference using Osman.
  const snyderOffset = snyderReference.reduce((sum, row) => sum + row.temperature + osmanOffset, 0) / snyderReference.length;
  if (phanDaRows?.length !== 85) throw new Error('PhanDA requires its complete 85-interval reconstruction');
  temperatureCalibration = { gissOffset, osmanOffset, snyderOffset,
    snyderReference: '0–5000 BP', hansenReference: DEEP_TEMPERATURE_REFERENCE_C,
    phanDaReference: DEEP_TEMPERATURE_REFERENCE_C, overlap: '150–1750 CE' };

  const rows = [];
  function append(sourceRows, source, offset, include, uncertainty = '') {
    for (const row of sourceRows) {
      if (!include(row.time, row)) continue;
      rows.push({ ...row, source, uncertainty,
        temperature: row.temperature + offset,
        lower: Number.isFinite(row.lower) ? row.lower + offset : undefined,
        upper: Number.isFinite(row.upper) ? row.upper + offset : undefined });
    }
  }
  append(gissRows, 'giss', -gissOffset, time => time >= -70);
  append(pagesRows, 'pages', 0, time => time >= -1949 && time < -70, '95% ensemble range');
  append(osmanRows, 'osman', osmanOffset, time => time < -1949, '±1σ ensemble spread');
  append(snyderRows, 'snyder', snyderOffset, time => time <= -24000, '95% reconstruction interval');
  append(hansenRows, 'hansen', -DEEP_TEMPERATURE_REFERENCE_C, time => time < -2000000 && time > -PHANDA_START_AGE_BP);
  append(phanDaRows, 'phanda', -DEEP_TEMPERATURE_REFERENCE_C,
    (_time, row) => row.ageYoungerMa * 1000000 >= PHANDA_START_AGE_BP, '90% ensemble range');
  rows.find(row => row.source === 'phanda').joinTime = -PHANDA_START_AGE_BP;
  sortRowsByTimeDesc(rows);
  const table = buildTimeValueTable(rows, 'temperature', 'Temperature');
  table.temperatureRows = rows; // Keep provenance and uncertainty with each plotted sample.
  return table;
}
