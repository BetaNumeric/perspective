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

function parseKopp2016SeaLevelRows(rawLines) {
  const rows = [];
  for (const raw of rawLines || []) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('year_ce,')) continue;
    const tokens = line.split(',');
    const values = tokens.map(Number);
    if (values.length !== 3 || tokens.some(token => !token.trim())
      || !values.every(Number.isFinite) || values[2] < 0) {
      throw new Error('Invalid Kopp global posterior row');
    }
    const [yearCe, meanMm, standardDeviationMm] = values;
    rows.push({
      time: yearCe - 1950, sealevel: meanMm / 1000,
      lower: (meanMm - standardDeviationMm) / 1000,
      upper: (meanMm + standardDeviationMm) / 1000,
      source: 'sea-kopp', band: true, uncertainty: '±1σ global posterior',
      note: 'Reconstruction grid; short-term changes are unresolved'
    });
  }
  return sortRowsByTimeDesc(rows);
}

function parseLambeck2014SeaLevelRows(rawLines) {
  const rows = [];
  for (const raw of rawLines || []) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('age_ka_bp,')) continue;
    const tokens = line.split(',');
    const values = tokens.map(Number);
    if (values.length !== 4 || tokens.some(token => !token.trim())
      || !values.every(Number.isFinite) || values[0] < 0 || values[3] < 0) {
      throw new Error('Invalid Lambeck Table S3 row');
    }
    const [ageKaBp, , bestEstimate, twoSigma] = values;
    rows.push({
      time: -ageKaBp * 1000, sealevel: bestEstimate,
      lower: bestEstimate - twoSigma, upper: bestEstimate + twoSigma,
      source: 'sea-lambeck', band: true, uncertainty: '±2σ published accuracy',
      note: 'Ice-volume equivalent; excludes thermal expansion'
    });
  }
  return sortRowsByTimeDesc(rows);
}

function parseSpratt2016SeaLevelRows(rawLines) {
  const columns = ['age_calkaBP', 'SeaLev_shortPC1', 'SeaLev_shortPC1_err_sig',
    'SeaLev_shortPC1_err_lo', 'SeaLev_shortPC1_err_up', 'SeaLev_longPC1',
    'SeaLev_longPC1_err_sig', 'SeaLev_longPC1_err_lo', 'SeaLev_longPC1_err_up'];
  const header = (rawLines || []).findIndex(line => line.trim().startsWith('age_calkaBP'));
  if (header < 0 || rawLines[header].trim().split(/\s+/).join('|') !== columns.join('|')) {
    throw new Error('Spratt requires the published age, stack and uncertainty columns');
  }
  const rows = [];
  for (const raw of rawLines.slice(header + 1)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const tokens = line.split(/\s+/);
    const values = tokens.map(Number);
    const ageKaBp = values[0];
    const short = ageKaBp <= 430;
    if (values.length !== 9 || !Number.isInteger(ageKaBp) || ageKaBp < 0 || ageKaBp > 798
      || !values.slice(5).every(Number.isFinite)
      || (short ? !values.slice(1, 5).every(Number.isFinite) : tokens.slice(1, 5).some(token => token !== 'NaN'))
      || values[6] < 0 || values[7] > values[5] || values[8] < values[5]
      || (short && (values[2] < 0 || values[3] > values[1] || values[4] < values[1]))) {
      throw new Error('Invalid Spratt sea-level stack row');
    }
    // Follow the authors' composite: seven records through 430 ka, five thereafter.
    const start = short ? 1 : 5;
    rows.push({ time: -ageKaBp * 1000, sealevel: values[start],
      lower: values[start + 2], upper: values[start + 3],
      source: short ? 'sea-spratt-short' : 'sea-spratt-long', band: true,
      uncertainty: '95% bootstrap interval' });
  }
  sortRowsByTimeDesc(rows);
  if (rows.length !== 799 || rows.some((row, index) => row.time !== -index * 1000)) {
    throw new Error('Spratt requires its complete 0–798 ka evaluation grid');
  }
  return rows;
}

function buildCombinedSeaLevelTable(coloradoRows, gpRows, millerRows, koppRows, lambeckRows, sprattRows) {
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
  const koppReference = koppRows.find(row => row.time === 0);
  if (!koppReference) throw new Error('Kopp requires its published 1950 reference point');
  const commonEra = offsetValueRows(koppRows, 'sealevel', -koppReference.sealevel);
  const lambeckReference = lambeckRows.find(row => row.time === 0);
  if (!lambeckReference) throw new Error('Lambeck requires its published zero-age reference');
  const postglacial = offsetValueRows(lambeckRows, 'sealevel', -lambeckReference.sealevel);
  // The authors use 5 ka, rather than the potentially biased zero-age estimate.
  const sprattReference = sprattRows.find(row => row.time === -5000);
  const sprattLgm = sprattRows.find(row => row.time === -SPRATT_LGM_AGE_BP);
  if (!sprattReference || sprattReference.sealevel !== 0 || !sprattLgm || sprattLgm.sealevel !== -130) {
    throw new Error('Spratt requires its published 5 ka and 24 ka calibration anchors');
  }
  seaLevelCalibration = { gpReference, satelliteOffset, millerReference: zeroAge.sealevel,
    koppReference: koppReference.sealevel, lambeckReference: lambeckReference.sealevel,
    sprattReference: sprattReference.sealevel, sprattReferenceAge: 5000 };
  const oldestSatellite = satellites.at(-1)?.time ?? Infinity;
  const olderGp = gp.filter(row => row.time < oldestSatellite);
  const oldestModern = olderGp.at(-1)?.time ?? satellites.at(-1)?.time ?? Infinity;
  const olderKopp = commonEra.filter(row => row.time < oldestModern);
  if (!olderKopp.length) throw new Error('Kopp must supply the pre-instrumental sea-level segment');
  const oldestKopp = olderKopp.at(-1).time;
  const olderLambeck = postglacial.filter(row => row.time < oldestKopp && row.time > -SPRATT_LGM_AGE_BP);
  if (!olderLambeck.length) throw new Error('Lambeck must supply the postglacial sea-level segment');
  const olderSpratt = sprattRows.filter(row => row.time <= -SPRATT_LGM_AGE_BP);
  const oldestSpratt = olderSpratt.at(-1).time;
  return buildTimeValueTable(sortRowsByTimeDesc([
    ...satellites, ...olderGp, ...olderKopp, ...olderLambeck, ...olderSpratt,
    ...geological.filter(row => row.time < oldestSpratt)
  ]), 'sealevel', 'Sealevel');
}
