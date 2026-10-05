function sourceSegment(row) {
  return row?.segment || row?.source || '';
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

function medianValue(values) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
