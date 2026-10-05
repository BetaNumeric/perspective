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
  return row.time <= 0 ? nfc(-row.time, row.time < -10000 ? 0 : 2).replace(/\.00$/, '') + ' BP' : nfc(calendarYear, 2) + ' CE';
}

function utcDateMilliseconds(calendarYear, monthIndex = 0, dayOfMonth = 1) {
  // Date.UTC interprets years 0–99 as 1900–1999; setUTCFullYear keeps the actual year.
  const date = new Date(0);
  date.setUTCFullYear(calendarYear, monthIndex, dayOfMonth);
  return date.getTime();
}

function millisecondsFromDecimalYear(decimalYear) {
  const calendarYear = Math.floor(decimalYear);
  const start = utcDateMilliseconds(calendarYear);
  return Math.round(start + (decimalYear - calendarYear) * (utcDateMilliseconds(calendarYear + 1) - start));
}

function decimalYearFromMilliseconds(milliseconds) {
  const date = new Date(milliseconds);
  const calendarYear = date.getUTCFullYear();
  const start = utcDateMilliseconds(calendarYear);
  return calendarYear + (milliseconds - start) / (utcDateMilliseconds(calendarYear + 1) - start);
}

// Plot coordinates include the left-margin translation used by all data panels.

function decimalYearFromYmd(yearValue, monthValue, dayValue) {
  const dateValue = new Date(utcDateMilliseconds(yearValue, monthValue - 1, dayValue));
  if (!Number.isFinite(dateValue.getTime())) return null;

  const yearStart = utcDateMilliseconds(yearValue);
  const nextYearStart = utcDateMilliseconds(yearValue + 1);
  if (nextYearStart <= yearStart) return null;

  const elapsed = dateValue.getTime() - yearStart;
  const total = nextYearStart - yearStart;
  return yearValue + (elapsed / total);
}

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
