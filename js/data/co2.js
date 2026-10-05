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
      co2: co2Ppm, source: 'co2-ice', band: true,
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
