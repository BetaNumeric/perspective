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
