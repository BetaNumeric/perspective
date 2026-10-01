const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const testDate = new Date();

class Row {
  constructor() { this.values = {}; }
  setNum(key, value) { this.values[key] = value; }
  getNum(key) { return Number.parseFloat(this.values[key]); }
}

class Table {
  constructor() { this.rows = []; }
  addColumn() {}
  addRow() { const row = new Row(); this.rows.push(row); return row; }
  getRowCount() { return this.rows.length; }
  getRow(index) { return this.rows[index]; }
}

const frames = { backgrounds: 0, pushes: 0, pops: 0 };
const context = {
  p5: { Table }, console: { log() {}, warn() {} }, URL, Date, Math,
  drawingContext: { save() {}, beginPath() {}, rect() {}, clip() {}, restore() {}, setLineDash() {} },
  width: 1280, height: 720, windowWidth: 1280, windowHeight: 720,
  mouseX: 0, mouseY: 0, pmouseX: 0, pmouseY: 0, mouseIsPressed: false,
  key: '', keyCode: 0,
  max: Math.max, min: Math.min, abs: Math.abs, sqrt: Math.sqrt,
  int: Math.trunc, round: Math.round,
  constrain: (value, min, max) => Math.max(min, Math.min(max, value)),
  dist: (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2),
  map: (value, a, b, c, d) => c + (value - a) * (d - c) / (b - a),
  color: (...parts) => parts,
  textWidth: (value) => String(value).length * 8,
  frameRate: () => 60,
  nfs: (value, _a, decimals) => value.toFixed(decimals),
  nf: (value, _a, decimals) => value.toFixed(decimals),
  nfc: (value, decimals) => value.toFixed(decimals),
  year: () => testDate.getUTCFullYear(), month: () => testDate.getUTCMonth() + 1, day: () => testDate.getUTCDate(),
  loadStrings: (file) => fs.readFileSync(file, 'utf8').split(/\r?\n/),
  loadTable: (file) => {
    const lines = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/);
    const headers = lines.shift().split(',');
    const table = new Table();
    for (const line of lines) {
      const row = table.addRow();
      line.split(',').forEach((value, index) => row.setNum(headers[index], Number(value)));
    }
    return table;
  },
  background: () => { frames.backgrounds++; },
  push: () => { frames.pushes++; },
  pop: () => { frames.pops++; },
};

for (const name of ['RGB', 'HSB', 'MOVE', 'ARROW', 'LEFT', 'RIGHT', 'TOP',
  'BOTTOM', 'BASELINE', 'CENTER', 'CORNER', 'CLOSE', 'LEFT_ARROW', 'RIGHT_ARROW']) {
  context[name] = name;
}
for (const name of ['createCanvas', 'resizeCanvas', 'cursor', 'textAlign',
  'translate', 'colorMode', 'fill', 'noFill', 'noStroke', 'stroke',
  'strokeWeight', 'rect', 'rectMode', 'textSize', 'text', 'line',
  'beginShape', 'endShape', 'vertex', 'curveVertex', 'point']) {
  context[name] = () => {};
}

vm.createContext(context);
vm.runInContext(fs.readFileSync('sketch.js', 'utf8'), context);
const run = (expression) => vm.runInContext(expression, context);
run('preload(); setup()');

test('global temperature uses baseline offsets without changing variability', () => {
  assert.equal(run('data.length'), 7);
  const result = run(`(() => {
    const rows = sourceTables.temperature.temperatureRows;
    const originals = {
      giss: parseGissTemperatureRows(sourceTables.gissTempRaw),
      pages: parseNeukomTemperatureRows(sourceTables.neukomTempRaw),
      osman: parseOsmanTemperatureRows(sourceTables.osmanTempRaw),
      hansen: parseHansenTemperatureRows(sourceTables.hansenTempRaw)
    };
    const offsets = { giss: -temperatureCalibration.gissOffset, pages: 0,
      osman: temperatureCalibration.osmanOffset, hansen: -14 };
    let preserved = true;
    for (const source of Object.keys(originals)) {
      const byTime = new Map();
      for (const row of originals[source]) {
        if (!byTime.has(row.time)) byTime.set(row.time, []);
        byTime.get(row.time).push(row);
      }
      for (const row of rows.filter(row => row.source === source)) {
        const original = byTime.get(row.time)?.find(value => Math.abs(row.temperature - value.temperature - offsets[source]) < 1e-12);
        if (!original) { preserved = false; continue; }
        if (Number.isFinite(row.lower) && Math.abs((row.upper - row.lower) - (original.upper - original.lower)) > 1e-12) preserved = false;
      }
    }
    const reference = rows.filter(row => row.source === 'giss' && row.time >= 11 && row.time < 41);
    return { sources: [...new Set(rows.map(row => row.source))], preserved,
      referenceMean: reference.reduce((sum, row) => sum + row.temperature, 0) / reference.length,
      deepMaximum: Math.max(...rows.filter(row => row.source === 'hansen').map(row => row.temperature)) };
  })()`);
  assert.deepEqual([...result.sources], ['giss', 'pages', 'osman', 'hansen']);
  assert.equal(result.preserved, true);
  assert.ok(Math.abs(result.referenceMean) < 1e-12);
  assert.ok(result.deepMaximum > 10);
  assert.equal(run('data.every(series => series.dataX.every((time, index) => index === 0 || time <= series.dataX[index - 1]))'), true);
});

test('Osman alignment compares the same complete 200-year periods with PAGES2k', () => {
  const result = run(`(() => {
    const pages = parseNeukomTemperatureRows(sourceTables.neukomTempRaw).filter(row => row.time >= -1800 && row.time < -200);
    const osman = parseOsmanTemperatureRows(sourceTables.osmanTempRaw).filter(row => row.time >= -1700 && row.time <= -300);
    return { count: pages.length, bins: osman.length,
      difference: osman.reduce((sum, row) => sum + row.temperature + temperatureCalibration.osmanOffset, 0) / osman.length -
        pages.reduce((sum, row) => sum + row.temperature, 0) / pages.length };
  })()`);
  assert.equal(result.count, 1600);
  assert.equal(result.bins, 8);
  assert.ok(Math.abs(result.difference) < 1e-12);
});

test('rendering preserves both sides of every source join and leaves it disconnected', () => {
  const result = run(`(() => {
    setZoom(70000000); oneYear = -1000 / scrollValue;
    const series = data[0];
    const indices = new Set(series.extremaPreservingIndices(series.dataX.length));
    const joins = [];
    for (let i = 1; i < series.dataX.length; i++) {
      if (series.temperatureRows[i - 1].source !== series.temperatureRows[i].source) {
        joins.push({ retained: indices.has(i - 1) && indices.has(i),
          connected: series.canConnectIndices(i - 1, i) });
      }
    }
    return joins;
  })()`);
  assert.equal(result.length, 3);
  assert.ok(result.every(join => join.retained && !join.connected));
});

test('a temperature refresh rebases GISS while preserving all paleo samples and provenance', async () => {
  const before = run('JSON.stringify(sourceTables.temperature.temperatureRows.filter(row => row.source !== "giss"))');
  const newest = run('sourceTables.gissTemperature.getRow(0).getNum("time")');
  const year = Math.floor(newest + 1950);
  const month = Math.round((newest - Math.floor(newest)) * 12);
  const monthly = Array(12).fill('****');
  monthly[month] = '150';
  context.fetch = async () => ({ ok: true, text: async () => `${year} ${monthly.join(' ')}` });
  await run('refreshTemperatureWithRemoteGiss()');
  delete context.fetch;
  assert.equal(run('JSON.stringify(sourceTables.temperature.temperatureRows.filter(row => row.source !== "giss"))'), before);
  assert.ok(Math.abs(run('data[0].dataY[0]') - (1.5 - run('temperatureCalibration.gissOffset'))) < 1e-12);
  assert.equal(run('data[0].temperatureRows[0].source'), 'giss');
  assert.equal(run('data[0].yScrolling'), true);
});

test('one global sea-level view includes geological and modern records without local coastal samples', () => {
  const result = run(`({ sources: [...new Set(data[5].seriesRows.map(row => row.source))],
    oldest: data[5].minX, maximum: data[5].maxY,
    seaViews: data.filter(series => series.columnY === 'Sealevel').length })`);
  assert.deepEqual([...result.sources], ['sea-satellite', 'sea-gauges', 'sea-miller']);
  assert.ok(result.oldest < -60000000);
  assert.ok(result.maximum > 100);
  assert.equal(result.seaViews, 1);
});

test('sea-level alignment preserves variability and uncertainty while using a 1950 reference', () => {
  const result = run(`(() => {
    const gp = parseGp2014SeaLevelRows(sourceTables.sealevelGpRaw);
    const satellite = parseColoradoSeaLevelRows(sourceTables.sealevelRaw);
    const miller = parseMiller2024SeaLevelRows(sourceTables.sealevelMillerRaw);
    const originals = { 'sea-gauges': gp, 'sea-satellite': satellite, 'sea-miller': miller };
    const offsets = { 'sea-gauges': -seaLevelCalibration.gpReference,
      'sea-satellite': seaLevelCalibration.satelliteOffset, 'sea-miller': -seaLevelCalibration.millerReference };
    const lookup = Object.fromEntries(Object.entries(originals).map(([id,rows])=> {
      const byTime = new Map();
      for (const row of rows) byTime.set(row.time, [...(byTime.get(row.time)||[]), row]);
      return [id,byTime];
    }));
    const preserved = data[5].seriesRows.every(row => {
      const original = lookup[row.source].get(row.time)?.find(value=>Math.abs(row.sealevel-value.sealevel-offsets[row.source])<1e-10);
      return original && Math.abs(row.sealevel - original.sealevel - offsets[row.source]) < 1e-10 &&
        (!Number.isFinite(row.lower) || Math.abs((row.upper-row.lower)-(original.upper-original.lower)) < 1e-12);
    });
    const reference = data[5].seriesRows.filter(row => row.source === 'sea-gauges' && row.time >= 0 && row.time < 1);
    return { preserved, months: reference.length, referenceMean: reference.reduce((sum,row)=>sum+row.sealevel,0)/reference.length };
  })()`);
  assert.equal(result.preserved, true);
  assert.equal(result.months, 12);
  assert.ok(Math.abs(result.referenceMean) < 1e-12);
});

test('calibration gives matching months equal weight despite different sample counts', () => {
  const offset = run(`matchedMonthlyOffset([
    {time: 50.01, value: 100}, {time: 50.02, value: 100}, {time: 50.12, value: 0}
  ], [{time: 50.04, value: 110}, {time: 50.14, value: 10},
      {time: 50.25, value: 9999}], 'value')`);
  assert.ok(Math.abs(offset - 10) < 1e-12);
  assert.equal(run("matchedMonthlyOffset([{time: 0, value: 1}], [{time: 1, value: 2}], 'value')"), null);
});

test('all comparison source boundaries survive thinning and stay disconnected', () => {
  const result = run(`(() => {
    setZoom(70000000); oneYear = -1000 / scrollValue;
    return [1,3,4,5,6].map(index => {
      const series = data[index];
      const retained = new Set(series.extremaPreservingIndices(series.dataX.length));
      const joins = series.seriesRows.flatMap((row,i,rows) => i && sourceSegment(row) !== sourceSegment(rows[i-1]) ?
        [{retained:retained.has(i-1)&&retained.has(i), connected:series.canConnectIndices(i-1,i)}] : []);
      return {count:joins.length, valid:joins.every(join=>join.retained&&!join.connected)};
    });
  })()`);
  assert.deepEqual([...result.map(item=>item.count)], [3,4,2,2,1]);
  assert.ok(result.every(item=>item.valid));
  const gap = run(`(() => {
    const rows = data[5].seriesRows;
    const i = rows.findIndex((row,index) => index && row.source === 'sea-miller' && rows[index-1].source === 'sea-gauges');
    return {older:rows[i].time+1950, newer:rows[i-1].time+1950, connected:data[5].canConnectIndices(i-1,i)};
  })()`);
  assert.ok(Math.abs(gap.older - 640.2) < 1e-8);
  assert.ok(Math.abs(gap.newer - 1807.5417) < 1e-8);
  assert.equal(gap.connected, false);
});

test('deep-time CO2 uses the original published median and bounds on the ppm scale', () => {
  const raw = fs.readFileSync('data/co2/cencopip2023-500kyr.csv');
  assert.equal(require('node:crypto').createHash('sha256').update(raw).digest('hex'),
    '8754757776b2faf9e539c599d3097c9e237a01bf1ce79563d903d79579424ac1');
  const published = new Map(raw.toString().trim().split(/\r?\n/).slice(1).map(line => {
    const values = line.split(',').map(Number);
    return [-values[0] * 1e6, [Math.exp(values[3]), Math.exp(values[1]), Math.exp(values[5])]];
  }));
  const bins = run('data[1].seriesRows.filter(row => row.source === "co2-cencopip")');
  assert.equal(bins.length, 130);
  assert.equal(bins[0].time, -1250000);
  assert.equal(bins.at(-1).time, -65750000);
  for (let i = 0; i < bins.length; i++) {
    assert.deepEqual([bins[i].co2, bins[i].lower, bins[i].upper], published.get(bins[i].time));
    assert.ok(bins[i].band && bins[i].lower <= bins[i].co2 && bins[i].co2 <= bins[i].upper);
    if (i) assert.equal(bins[i-1].time - bins[i].time, 500000);
  }
  const result = run(`(() => {
    const noaa = new Map(parseNoaaDailyCo2Rows(sourceTables.co2DailyRaw).map(row=>[row.time,row.co2]));
    const series = data[1];
    const firstBin = series.seriesRows.findIndex(row => row.source === 'co2-cencopip');
    return { sources:[...new Set(series.seriesRows.map(row=>row.source))],
      connected:series.seriesRows.slice(firstBin+1).every((row,i)=>series.canConnectIndices(firstBin+i,firstBin+i+1)),
      joinConnected:series.canConnectIndices(firstBin-1,firstBin),
      oldestIce:series.seriesRows[firstBin-1].time,
      measured:data[1].seriesRows.filter(row=>row.source==='co2-noaa').every(row=>row.co2===noaa.get(row.time)) };
  })()`);
  assert.deepEqual([...result.sources], ['co2-noaa','co2-scripps','co2-ice','co2-cencopip']);
  assert.equal(result.connected, true);
  assert.equal(result.joinConnected, false);
  assert.ok(result.oldestIce > bins[0].time && result.oldestIce < -805668);
  assert.equal(result.measured, true);
});

test('modern CO2 connects available observations without adding missing samples', () => {
  const result = run(`(() => {
    const noaa = parseNoaaDailyCo2Rows(['2020 1 1 2020.0 410', '2020 2 1 2020.0847 420']);
    const scripps = parseScrippsDailyCo2Rows(['1960,1,1,310,,,MLO', '1960,2,1,320,,,MLO']);
    const make = rows => new Data(buildTimeValueTable(rows,'co2','CO2'),'time','CO2','ppm',1,0,0,true);
    return [noaa,scripps].map(rows => ({ count: rows.length, values: rows.map(row => row.co2),
      connected:make(rows).canConnectIndices(0,1) }));
  })()`);
  assert.deepEqual([...result.map(item => item.count)], [2,2]);
  assert.deepEqual([...result[0].values], [420,410]);
  assert.deepEqual([...result[1].values], [320,310]);
  assert.ok(result.every(item => item.connected));
});

test('missing observations receive no markers while source changes remain marked', () => {
  const originalLine = context.line;
  const originalText = context.text;
  const lines = [];
  const labels = [];
  context.line = (...args) => lines.push(args);
  context.text = value => labels.push(String(value));
  try {
    run(`(() => {
      setZoom(20); oneYear = -1000 / scrollValue;
      const bp = currentYear - 1950;
      const rows = [
        {time:bp-1,co2:420,source:'co2-noaa',maxGapYears:0.01},
        {time:bp-5,co2:410,source:'co2-noaa',maxGapYears:0.01},
        {time:bp-10,co2:400,source:'co2-scripps'}
      ];
      const series = new Data(buildTimeValueTable(rows,'co2','CO2'),'time','CO2','ppm',1,0,0,true);
      series.rectY = 60; series.rectH = 240;
      series.drawSourceJoins(3);
    })()`);
    assert.deepEqual(labels, ['Scripps / NOAA']);
    assert.ok(lines.length > 0);
    // Only the source change at 7.5 years gets a vertical marker; the missing
    // observations at 3 years receive neither a marker nor a label.
    assert.ok(lines.every(([x1,,x2]) => x1 === 905 && x2 === 905));
  } finally {
    context.line = originalLine;
    context.text = originalText;
  }
});

test('drawing fewer points preserves continuous solar segments and actual long gaps', () => {
  const result = run(`(() => {
    const make = days => new Data(buildTimeValueTable(days.map(day=>({time:day/365.2425,
      irradiance:1361, source:'solar-tsis', maxGapYears:7/365.2425})), 'irradiance','Solar Irradiance'),
      'time','Solar Irradiance','W/m²',1,0,0,true);
    return { continuous:make([30,25,20,15,10,5,0]).canConnectIndices(0,6),
      missing:make([30,25,5,0]).canConnectIndices(0,3) };
  })()`);
  assert.equal(result.continuous, true);
  assert.equal(result.missing, false);
});

test('orbital samples keep their published ages and exclude the unconstrained interval', () => {
  assert.equal(run('data[2].maxX'), 50);
  assert.equal(run('data[2].minX'), 50-58000000);
  assert.equal(run('data[2].dataX[1]'), 50-1600);
  run('setZoom(10); oneYear = -1000 / scrollValue');
  assert.equal(run('data[2].visiblePointCount()'), 0);
  run('data[2].draw()');
  run('setZoom(25); oneYear = -1000 / scrollValue');
  assert.equal(run('data[2].visiblePointCount()'), 1);
});

test('population labels projections from 2024 and retains historical estimates unchanged', () => {
  const result = run(`({ projections:data[6].seriesRows.filter(row=>row.mode==='projection').map(row=>row.time+1950),
    latestHistorical:Math.max(...data[6].seriesRows.filter(row=>row.source==='population-history').map(row=>row.time+1950)) })`);
  const currentCalendarYear = testDate.getUTCFullYear();
  assert.deepEqual([...result.projections],
    Array.from({length: currentCalendarYear - 2023}, (_, index) => currentCalendarYear - index));
  assert.equal(result.latestHistorical, 2023);
});

test('volcanic values retain the published annual product and correct component dates', () => {
  assert.equal(run("data[4].seriesRows.find(row=>row.time===-2451).source"), 'volcano-holvol');
  assert.equal(run("data[4].seriesRows.find(row=>row.time===-2450).source"), 'volcano-evolv2k');
  assert.equal(run("data[4].seriesRows.find(row=>row.time===-50).source"), 'volcano-evolv2k');
  assert.equal(run("data[4].seriesRows.find(row=>row.time===-49).source"), 'volcano-cmip6');
  assert.equal(run('data[4].seriesRows.every((row,i,rows)=>!i || rows[i-1].time-row.time===1)'), true);
  assert.equal(run('data[4].dataY[0]'), Number(fs.readFileSync('data/volcanic/SAOD_merged_HolVol-v1_eVolv2k_v3_CMIP6_v3_-9500_to_2014_global_mean.csv','utf8').trim().split(/\r?\n/).at(-1).split(',')[1]));
});

test('partial sea-level refresh keeps older values, calibration and source metadata', async () => {
  const before = run('JSON.stringify(data[5].seriesRows.slice(1))');
  const latest = run('data[5].dataX[0]');
  context.fetch = async () => ({ok:true, text:async()=>`${latest+1950} 120`});
  await run('refreshSealevelWithRemoteColorado()');
  delete context.fetch;
  assert.equal(run('JSON.stringify(data[5].seriesRows.slice(1))'), before);
  assert.ok(Math.abs(run('data[5].dataY[0]') - (0.120+run('seaLevelCalibration.satelliteOffset'))) < 1e-12);
  assert.equal(run('data[5].seriesRows[0].source'), 'sea-satellite');
});

test('partial remote responses preserve unmatched local measurements', () => {
  const result = run(`(() => {
    const table = buildTimeValueTable([
      { time: 76, co2: 426 }, { time: 75, co2: 424 },
      { time: 70, co2: 415 }, { time: 50, co2: 390 }
    ], 'co2', 'CO2');
    return parseCo2TableRows(mergeRecentCo2Rows(table, [{ time: 76, co2: 427 }], 15));
  })()`);
  assert.deepEqual([...result.map((row) => row.co2)], [427, 424, 415, 390]);
  const staleResult = run(`(() => {
    const table = buildTimeValueTable([
      { time: 76, co2: 426 }, { time: 75, co2: 424 }
    ], 'co2', 'CO2');
    return parseCo2TableRows(mergeRecentCo2Rows(table, [{ time: 75, co2: 410 }], 15));
  })()`);
  assert.deepEqual([...staleResult.map((row) => row.co2)], [426, 424]);
});

test('modern CO2 refresh preserves historical samples and reconstruction uncertainty', async () => {
  const before = run('JSON.stringify(data[1].seriesRows.filter(row=>row.source!=="co2-noaa"))');
  const newest = run('data[1].seriesRows[0]');
  const date = newest.sampleDate.split('-').map(Number);
  context.fetch = async () => ({ok:true, text:async()=>`${date.join(' ')} ${newest.time+1950} 431.25`});
  await run('refreshCo2WithRemoteNoaaDaily()');
  delete context.fetch;
  assert.equal(run('JSON.stringify(data[1].seriesRows.filter(row=>row.source!=="co2-noaa"))'), before);
  assert.equal(run('data[1].seriesRows[0].co2'), 431.25);
  assert.equal(run('data[1].seriesRows[0].sampleDate'), newest.sampleDate);
});

test('identical solar refreshes produce identical data from the raw base', () => {
  const result = run(`(() => {
    const remote = parseTsisSolarRows(sourceTables.solarIrradianceTsisRaw);
    const build = () => parseSolarIrradianceTableRows(mergeSolarTableWithNnlAndTsis(
      sourceTables.solarBase, sourceTables.solarIrradianceNnlRaw,
      sourceTables.solarIrradianceTsisRaw, remote
    ));
    const first = build();
    const second = build();
    return { count: first.length, equal: first.every((row, index) =>
      row.time === second[index].time && row.irradiance === second[index].irradiance) };
  })()`);
  assert.ok(result.count > 70000);
  assert.equal(result.equal, true);
});

test('partial solar downloads retain local TSIS observations', () => {
  const result = run(`(() => {
    const local = parseTsisSolarRows(sourceTables.solarIrradianceTsisRaw);
    const updated = mergeTsisObservations(local, [{ time: local[0].time, irradiance: 1361.5 }]);
    return { count: updated.length, originalCount: local.length,
      latest: updated[0].irradiance, older: updated[1].irradiance,
      originalOlder: local[1].irradiance };
  })()`);
  assert.equal(result.count, result.originalCount);
  assert.equal(result.latest, 1361.5);
  assert.equal(result.older, result.originalOlder);
});

test('solar timestamps use the documented epochs, missing zeros are omitted, and provisional readings retained', () => {
  assert.equal(run("parseNnlSolarRows(['0 1361'])[0].time"), 1610-1950);
  assert.equal(run("parseTsisSolarRows(['2440587.5 1361'])[0].time"), 1970-1950);
  assert.equal(run("parseTsisSolarRows(['2440587.5 0']).length"), 0);
  assert.equal(run("parseTsisSolarRows(['2440587.5 1361 0 0 0 0 0 0 0 0 0 0 0 1'])[0].provisional"), true);
  assert.equal(run("sampleTimeLabel({source:'solar-nnl', time:decimalYearFromYmd(2024,2,29)-1950})"), '2024-02-29');
  assert.equal(run("sampleTimeLabel({source:'giss',time:2024+1/12-1950})"), '2024-02');
  assert.equal(run("sampleTimeLabel(parseNoaaDailyCo2Rows(['2026 2 28 2026.1589 429.60'])[0])"), '2026-02-28');
});

test('PMIP source identities and rounded daily dates follow the author documentation', () => {
  const result = run(`parsePmipSolarRows(buildTimeValueTable([
    {time:2000.0027-1950,irradiance:1361}, {time:1850-1950,irradiance:1362},
    {time:1610.5-1950,irradiance:1360}, {time:1609.5-1950,irradiance:1359}
  ],'irradiance','Solar Irradiance'))`);
  assert.deepEqual([...result.map(row => row.source)],
    ['solar-cmip6','solar-cmip6','solar-satire-t','solar-satire-m']);
  assert.equal(result[0].sampleDate, '2000-01-02');
  assert.equal(result[0].time, run('decimalYearFromYmd(2000,1,2)-1950'));
  assert.equal(result[1].sampleDate, '1850-01-01');
  assert.equal(result[2].time, 1610.5-1950);
  assert.equal(result[2].sampleDate, '1610 CE • annual mean');
});

test('solar calibration pairs the same days and resists exceptional months and provisional readings', () => {
  const result = run(`(() => {
    const source=[], reference=[];
    for(let month=0;month<14;month++) {
      for(let day=1;day<=15;day++) {
        const time=decimalYearFromMilliseconds(Date.UTC(2020,month,day))-1950;
        source.push({time,irradiance:1300+day*10});
        reference.push({time,irradiance:1300+day*10+(month===6?500:5),provisional:month===13});
      }
      // These large values fall on dates missing from the other record.
      source.push({time:decimalYearFromMilliseconds(Date.UTC(2020,month,20))-1950,irradiance:10000});
      reference.push({time:decimalYearFromMilliseconds(Date.UTC(2020,month,21))-1950,irradiance:100});
    }
    return pairedSolarOffset(source,reference);
  })()`);
  assert.equal(result.offset, 5);
  assert.equal(result.months, 13);
  assert.equal(result.days, 195);
  assert.equal(result.residualMad, 0);
  assert.equal(result.first, '2020-01-01');
  assert.equal(result.last, '2021-01-15');
  assert.equal(run("pairedSolarOffset([{time:70,irradiance:100}], [{time:70,irradiance:105}]).offset"), null);
});

test('historical solar alignment uses a fixed window near the join and preserves model variability', () => {
  const result = run(`(() => {
    const rows=data[3].seriesRows, base=parseSolarIrradianceTableRows(sourceTables.solarBase);
    const byTime=new Map(base.map(row=>[row.time,row.irradiance]));
    const annual=rows.filter(row=>row.time < -100);
    const nnlStart=parseNnlSolarRows(sourceTables.solarIrradianceNnlRaw).at(-1).time+1950;
    const join=rows.findIndex(row=>row.source==='solar-cmip6');
    return { preserved:annual.every(row=>Math.abs(row.irradiance-byTime.get(row.time)-solarCalibration.satireOffset)<1e-9),
      first:solarCalibration.baseAlignment.first,last:solarCalibration.baseAlignment.last,nnlStart,
      months:solarCalibration.baseAlignment.months,jump:rows[join-1].irradiance-rows[join].irradiance };
  })()`);
  assert.equal(result.preserved, true);
  assert.ok(result.first.startsWith('1874-'));
  assert.ok(result.last.startsWith('1896-'));
  assert.ok(result.months >= 250);
  assert.ok(Math.abs(result.jump) < 0.1);
});

test('annual solar means keep source fragments separate and date partial years by actual coverage', () => {
  const result = run(`annualSolarRows([
    {time:decimalYearFromYmd(2024,1,1)-1950,irradiance:100,source:'old'},
    {time:decimalYearFromYmd(2024,1,10)-1950,irradiance:200,source:'old'},
    {time:decimalYearFromYmd(2024,1,11)-1950,irradiance:1000,source:'new'},
    {time:decimalYearFromYmd(2024,12,31)-1950,irradiance:1100,source:'new',provisional:true},
    {time:1600.5-1950,irradiance:1360,source:'solar-satire-m',cadence:'annual'}
  ])`);
  assert.deepEqual([...result.map(row=>row.irradiance)], [1050,150,1360]);
  assert.deepEqual([...result.map(row=>row.source)], ['new','old','solar-satire-m']);
  assert.ok(Math.abs(result[1].time-run('(decimalYearFromYmd(2024,1,1)+decimalYearFromYmd(2024,1,10))/2-1950')) < 1e-10);
  assert.match(result[1].sampleDate, /partial-year mean/);
  assert.match(result[1].note, /2 daily values, 2024-01-01 to 2024-01-10/);
  assert.equal(result[0].provisional, true);
  assert.equal(result[2].time, 1600.5-1950);
});

test('long solar views use annual means from raw daily values and switch back when zooming in', () => {
  const result = run(`(() => {
    const series=data[3], originalCursor=showCursor;
    const original=parseNnlSolarRows(sourceTables.solarIrradianceNnlRaw).filter(row=>row.time>=50&&row.time<51);
    const expected=original.reduce((sum,row)=>sum+row.irradiance,0)/original.length+solarCalibration.nnlOffset;
    const annual=series.annualSeries.seriesRows.find(row=>row.source==='solar-nnl'&&row.sampleDate==='2000 CE • annual mean');
    setZoom(8000);oneYear=-1000/scrollValue;showCursor=false;series.draw();
    const visible=series.displaySeries(), values=visible.dataY.slice(0,visible.visiblePointCount());
    const fitted=series.localMinY===Math.min(...values)&&series.localMaxY===Math.max(...values);
    const isAnnual=visible===series.annualSeries;
    const retained=new Set(visible.extremaPreservingIndices(visible.dataX.length));
    const joins=visible.seriesRows.flatMap((row,i,rows)=>i&&sourceSegment(row)!==sourceSegment(rows[i-1])?[i]:[]);
    const disconnected=joins.every(i=>retained.has(i-1)&&retained.has(i)&&!visible.canConnectIndices(i-1,i));
    setZoom(25);oneYear=-1000/scrollValue;series.draw();showCursor=originalCursor;
    return {expected,actual:annual.irradiance,isAnnual,fitted,disconnected,joins:joins.length,
      isDetail:series.displaySeries()===series};
  })()`);
  assert.ok(Math.abs(result.actual-result.expected)<1e-8);
  assert.equal(result.isAnnual, true);
  assert.equal(result.fitted, true);
  assert.equal(result.disconnected, true);
  assert.equal(result.joins, 4);
  assert.equal(result.isDetail, true);
});

test('solar smoothing keeps the observed TSIS scale and never blends source boundaries', () => {
  const result = run(`(() => {
    const expected = smoothDenseSolarRows(parseTsisSolarRows(sourceTables.solarIrradianceTsisRaw), -100, 50);
    const actual = data[3].seriesRows.filter(row=>row.source==='solar-tsis');
    const synthetic = sortRowsByTimeDesc(Array.from({length:8},(_,i)=>({time:i/365.2425,
      irradiance:i<4?100:200, source:i<4?'old':'new'})));
    const smoothed = smoothDenseSolarRows(synthetic, -100, 50);
    return { preserved:actual.every((row,i)=>Math.abs(row.irradiance-expected[i].irradiance)<1e-9),
      separated:smoothed.every(row=>row.irradiance===(row.source==='old'?100:200)) };
  })()`);
  assert.equal(result.preserved, true);
  assert.equal(result.separated, true);
});

test('successive partial solar downloads preserve previously fetched observations', async () => {
  const original = run('sourceTables.solarTsisRows.length');
  const newest = run('sourceTables.solarTsisRows[0].time');
  const jd = run(`millisecondsFromDecimalYear(${newest}+1950)/86400000+2440587.5`);
  context.fetch = async () => ({ok:true, text:async()=>`${jd+1} 1362`});
  await run('refreshSolarWithRemoteTsis()');
  context.fetch = async () => ({ok:true, text:async()=>`${jd} 1361`});
  await run('refreshSolarWithRemoteTsis()');
  delete context.fetch;
  assert.equal(run('sourceTables.solarTsisRows.length'), original+1);
  assert.ok(run('sourceTables.solarTsisRows[0].time') > newest);
  assert.equal(run('sourceTables.solarTsisRows[0].irradiance'), 1362);
});

test('keyboard zoom stays positive and draw returns', () => {
  run("setZoom(25); key = 'd'; keyCode = 0; for (let i = 0; i < 100; i++) keyPressed()");
  assert.equal(run('scrollValue'), 1);
  vm.runInContext('draw()', context, { timeout: 1000 });
  run("key = '-'; for (let i = 0; i < 100; i++) keyPressed()");
  assert.ok(run('scrollValue') <= 15000000000);
});

test('pixel thinning retains the visible volcanic maximum', () => {
  const result = run(`(() => {
    setZoom(10000);
    oneYear = -1000 / scrollValue;
    const series = data[4];
    const count = Math.min(series.dataX.length, series.visiblePointCount() + 1);
    const selected = series.extremaPreservingIndices(count);
    return {
      input: count,
      output: selected.length,
      rawMaximum: Math.max(...series.dataY.slice(0, count)),
      plottedMaximum: Math.max(...selected.map(index => series.dataY[index]))
    };
  })()`);
  assert.ok(result.output < result.input);
  assert.equal(result.plottedMaximum, result.rawMaximum);
});

test('top buttons change only the comparison and temperature fits visible data by default', () => {
  const buttonLabels = [];
  const originalText = context.text;
  context.text = value => buttonLabels.push(value);
  run('GUI()');
  context.text = originalText;
  assert.deepEqual(buttonLabels, ['CO₂','Orbit','Solar','Volcanoes','Sea level','Population']);
  run('mouseButton = LEFT; mouseY = 10; mouseX = width * 3.5 / 6; mousePressed(); draw()');
  assert.equal(run('selectedData'), 4);
  assert.equal(run('data[0].position'), 0);
  run('setZoom(25); draw()');
  assert.equal(run('data[0].yScrolling'), true);
  const recentBounds = run('[data[0].localMinY, data[0].localMaxY]');
  const visibleBounds = run('(() => { const values = data[0].dataY.slice(0, data[0].visiblePointCount()); return [Math.min(...values), Math.max(...values)]; })()');
  assert.deepEqual([...recentBounds], [...visibleBounds]);
  run('setZoom(70000000); draw()');
  const fullBounds = run('[data[0].localMinY, data[0].localMaxY]');
  assert.ok(fullBounds[1] - fullBounds[0] > recentBounds[1] - recentBounds[0]);
  run('toggleTemperatureScale(); setZoom(25); draw()');
  assert.equal(run('data[0].yScrolling'), false);
  assert.deepEqual([...run('[data[0].localMinY, data[0].localMaxY]')], [...fullBounds]);
  run('toggleTemperatureScale(); draw()');
  assert.deepEqual([...run('[data[0].localMinY, data[0].localMaxY]')], [...recentBounds]);
  run('mouseY = 0; mouseX = 0; selectComparison(1)');
});

test('an off-screen extreme does not set the visible vertical scale', () => {
  const bounds = run(`(() => {
    setZoom(25); oneYear = -1000 / scrollValue;
    const bp = currentYear - 1950;
    const table = buildTimeValueTable([
      { time: bp - 1, temperature: 2 },
      { time: bp - 2, temperature: 4 },
      { time: bp - 100, temperature: 1000 }
    ], 'temperature', 'Temperature');
    const series = new Data(table, 'time', 'Temperature', '°C', 0, 0, 0, true);
    series.draw();
    return [series.localMinY, series.localMaxY];
  })()`);
  assert.deepEqual([...bounds], [2, 4]);
});

test('a drawn uncertainty band fits the visible scale without using off-screen bounds', () => {
  const bounds = run(`(() => {
    setZoom(25); oneYear = -1000 / scrollValue;
    const bp = currentYear - 1950;
    const table = buildTimeValueTable([
      {time:bp-1,co2:300,lower:200,upper:400,band:true,source:'co2-cencopip'},
      {time:bp-2,co2:400,lower:300,upper:500,band:true,source:'co2-cencopip'},
      {time:bp-3,co2:350,lower:0,upper:20000,source:'co2-ice'},
      {time:bp-100,co2:900,lower:10,upper:2000,band:true,source:'co2-cencopip'}
    ], 'co2', 'CO2');
    const series = new Data(table, 'time', 'CO2', 'ppm', 1, 0, 0, true);
    series.draw();
    const visible = [series.localMinY,series.localMaxY];
    series.yScrolling = false; series.draw();
    return {visible, fixed:[series.localMinY,series.localMaxY]};
  })()`);
  assert.deepEqual([...bounds.visible], [200,500]);
  assert.deepEqual([...bounds.fixed], [10,2000]);
});

test('uncertainty polygons stay inside the panel clip and never bridge a source join', () => {
  const saved = {beginShape:context.beginShape, vertex:context.vertex, endShape:context.endShape,
    clip:context.drawingContext.clip, restore:context.drawingContext.restore};
  const polygons = [];
  let vertices, clipped = false;
  context.drawingContext.clip = () => { clipped = true; };
  context.drawingContext.restore = () => { clipped = false; };
  context.beginShape = () => { vertices = []; };
  context.vertex = (x,y) => { vertices.push([x,y]); };
  context.endShape = mode => { polygons.push({vertices,clipped,mode}); };
  try {
    const panel = run(`(() => {
      setZoom(20); oneYear = -1000 / scrollValue;
      const bp = currentYear - 1950;
      const table = buildTimeValueTable([
        {time:bp-1,co2:300,lower:200,upper:400,band:true,source:'co2-cencopip'},
        {time:bp-2,co2:350,lower:250,upper:450,band:true,source:'co2-cencopip'},
        {time:bp-3,co2:360,source:'co2-ice'},
        {time:bp-4,co2:400,lower:300,upper:500,band:true,source:'co2-cencopip',segment:'older'},
        {time:bp-5,co2:450,lower:350,upper:550,band:true,source:'co2-cencopip',segment:'older'}
      ], 'co2', 'CO2');
      const series = new Data(table, 'time', 'CO2', 'ppm', 1, 0, 0, true);
      series.rectY = height / GUI_HEIGHT_DIVISOR;
      series.draw();
      return {top:series.rectY,bottom:series.rectY+series.rectH};
    })()`);
    assert.equal(polygons.length, 2);
    assert.deepEqual(polygons.map(polygon => polygon.vertices.map(([x]) => x)),
      [[1230,1180,1180,1230], [1080,1030,1030,1080]]);
    for (const polygon of polygons) {
      assert.ok(polygon.clipped);
      assert.equal(polygon.mode, 'CLOSE');
      assert.ok(polygon.vertices.every(([,y]) => y >= panel.top - 1e-9 && y <= panel.bottom + 1e-9));
    }
    assert.ok(Math.abs(polygons[0].vertices.at(-1)[1] - panel.bottom) < 1e-9);
    assert.ok(Math.abs(polygons[1].vertices[1][1] - panel.top) < 1e-9);
  } finally {
    Object.assign(context, {beginShape:saved.beginShape,vertex:saved.vertex,endShape:saved.endShape});
    Object.assign(context.drawingContext, {clip:saved.clip,restore:saved.restore});
  }
});

test('empty datasets do not crash the renderer', () => {
  assert.equal(run("new Data(new p5.Table(), 'time', 'Temperature', '°C', 0, 0, 0, true).dataX.length"), 0);
  run("new Data(null, 'time', 'Temperature', '°C', 0, 0, 0, true).draw()");
});

test('reading the guide allows scrolling without changing the plot', () => {
  context.document = { getElementById: () => ({ open: true }) };
  const zoom = run('scrollValue');
  assert.equal(run('mouseWheel({delta: 100})'), true);
  run("key = '+'; keyPressed(); mouseDragged()");
  assert.equal(run('scrollValue'), zoom);
  delete context.document;
});

test('calendar ticks use real month boundaries and cursor dates include leap days', () => {
  const ticks = run('timelineTicks(2024, decimalYearFromYmd(2024,4,1), 1000)');
  assert.deepEqual([...ticks].map(tick => tick.label), ['Apr 2024', 'Mar 2024', 'Feb 2024', 'Jan 2024']);
  assert.ok(Math.abs((ticks[1].year - ticks[2].year) * 366 - 29) < 1e-9);
  assert.ok(Math.abs((ticks[2].year - ticks[3].year) * 366 - 31) < 1e-9);
  const savedYearScale = run('oneYear');
  try {
    run('oneYear = -1000');
    for (const date of ['2024-02-29', '2024-03-01', '2025-03-01', '2025-12-31', '2026-01-01']) {
      const [year, month, day] = date.split('-').map(Number);
      assert.equal(run(`cursorTimeLabel(decimalYearFromYmd(${year},${month},${day}))`), date);
    }
  } finally {
    context.savedYearScale = savedYearScale;
    run('oneYear = savedYearScale');
    delete context.savedYearScale;
  }
});

test('rendered ticks, cursor and observations agree on calendar dates at desktop and narrow widths', () => {
  const savedFunctions = { text:context.text, line:context.line, translate:context.translate };
  const savedWidth = context.width;
  const savedMouse = { mouseX:context.mouseX, mouseY:context.mouseY };
  context.savedTimelineState = run('({currentYear, scrollValue, data, event, selectedData, showCursor})');
  const labels = [], lines = [];
  let translationX = 0;
  context.translate = x => { translationX = x; };
  context.text = (label,x,y) => labels.push({label,x:x+translationX,y});
  context.line = (x1,y1,x2,y2) => lines.push({x1:x1+translationX,y1,x2:x2+translationX,y2});
  try {
    run(`currentYear = decimalYearFromYmd(2026,10,2);
      const datedRows = [
        {time:decimalYearFromYmd(2026,9,15)-1950,co2:340,source:'co2-noaa',sampleDate:'2026-09-15'},
        {time:2026-1950,co2:330,source:'co2-noaa',sampleDate:'2026-01-01'},
        {time:decimalYearFromYmd(2025,11,1)-1950,co2:320,source:'co2-noaa',sampleDate:'2025-11-01'}
      ];
      const datedTable = buildTimeValueTable(datedRows, 'co2', 'CO2');
      data = [new Data(datedTable,'time','CO2','ppm',0,0,0,true),
        new Data(datedTable,'time','CO2','ppm',1,0,0,true)];
      event = []; selectedData = 1; showCursor = true;`);
    for (const zoom of [1, 10]) {
      labels.length = 0; lines.length = 0;
      // October 2 is 274 days after January 1 in this non-leap year.
      const januaryX = 1280 - (1000 / zoom) * 274 / 365 - 15;
      context.mouseX = januaryX;
      context.mouseY = 400;
      run(`setZoom(${zoom}); draw()`);
      const tickLabel = labels.find(label => label.y === 690 && label.label === (zoom === 1 ? 'Jan 2026' : '2026'));
      assert.ok(tickLabel, 'January/year marker is visible');
      assert.ok(Math.abs(tickLabel.x - januaryX) < 1e-9);
      assert.equal(labels.find(label => label.y === 660).label, '2026-01-01');
      assert.ok(lines.some(line => Math.abs(line.x1-januaryX) < 1e-9 && line.y1 === 700 && line.y2 === 720));
      assert.ok(lines.some(line => line.y1 < 600 && line.y2 < 600
        && Math.abs(line.x1-line.x2) > 1 && Math.abs(line.x2-januaryX) < 1e-9), 'observation endpoint agrees with marker');
      assert.ok(labels.some(label => label.label === '2026-01-01' && label.y !== 660), 'sample tooltip agrees with cursor');
      assert.ok(!labels.some(label => /2027/.test(label.label)), 'no future year is labelled');
    }
    context.width = 375;
    labels.length = 0;
    context.mouseX = 375 - 1000 * 31 / 365 - 15;
    run('setZoom(1); draw()');
    const septemberLabel = labels.find(label => label.y === 690 && label.label === 'Sep 2026');
    assert.ok(septemberLabel);
    assert.ok(Math.abs(septemberLabel.x - context.mouseX) < 1e-9);
    assert.equal(labels.find(label => label.y === 660).label, '2026-09-01');
    context.mouseX = 0;
    run('mouseMoved(); draw()');
    const cursorLabel = labels.filter(label => label.y === 660).at(-1);
    assert.ok(cursorLabel.x - context.textWidth(cursorLabel.label)/2 >= 4, 'cursor date stays inside viewport');
  } finally {
    Object.assign(context, savedFunctions, savedMouse);
    context.width = savedWidth;
    run('({currentYear,scrollValue,data,event,selectedData,showCursor} = savedTimelineState); oneYear = -1000/scrollValue; redrawRequested = true');
    delete context.savedTimelineState;
  }
});

test('timeline tick generation stays bounded and aligned from years to cosmological time', () => {
  for (const zoom of [1,2,5,7,8,25,31,150,500,1000,50000,1000000,70000000,15000000000]) {
    const ticks = run(`timelineTicks(Math.max(currentYear-13800000000, currentYear-1265*${zoom}/1000), currentYear, 1000/${zoom})`);
    assert.ok(ticks.length > 0 && ticks.length <= 20);
    assert.ok(ticks.every(tick => tick.year <= run('currentYear')));
    assert.ok(ticks.every((tick,index) => index === 0 || tick.year < ticks[index-1].year));
    if (zoom >= 8) assert.ok(ticks.every(tick => Number.isInteger(tick.year)));
  }
  const ancientTicks = run('timelineTicks(50,55,1000)');
  assert.deepEqual([...ancientTicks].map(tick => tick.year), [55,54,53,52,51,50]);
  assert.equal(run('timelineTicks(0,Infinity,1).length'), 0);
  assert.equal(run('timelineTicks(0,2026,0).length'), 0);
});

test('settled view stops rendering and drawing state remains balanced', () => {
  run('selectComparison(1); setZoom(25)');
  const start = frames.backgrounds;
  for (let i = 0; i < 120; i++) run('draw()');
  assert.ok(frames.backgrounds - start < 30);
  assert.equal(frames.pushes, frames.pops);
  const settledFrames = frames.backgrounds;
  run('mouseMoved(); draw()');
  assert.equal(frames.backgrounds, settledFrames+1);
});
