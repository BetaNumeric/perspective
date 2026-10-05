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
const appScripts = [...fs.readFileSync('index.html', 'utf8').matchAll(/<script src="([^"]+)"/g)]
  .map(match => match[1]).filter(path => !path.startsWith('https://'));
function loadApp(targetContext) {
  for (const path of appScripts) vm.runInContext(fs.readFileSync(path, 'utf8'), targetContext, {filename:path});
}
loadApp(context);
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

test('temperature and ice-core bands keep the published uncertainty definitions and widths', () => {
  const result = run(`(() => {
    const temperature = data[0];
    const ice = data[1].seriesRows.filter(row => row.source === 'co2-ice');
    const originalIce = new Map(parseAntarcticaCompositeCo2Rows(sourceTables.co2AntarcticaRaw)
      .map(row => [row.time, row]));
    return { sources: [...new Set(temperature.seriesRows.filter(row => row.band).map(row => row.source))],
      temperatureBand: temperature.hasUncertaintyBands,
      valid: temperature.seriesRows.filter(row => row.band).every(row =>
        row.lower <= row.temperature && row.temperature <= row.upper &&
        row.uncertainty === (row.source === 'pages' ? '95% ensemble range' : '±1σ ensemble spread')),
      iceCount: ice.length,
      icePreserved: ice.every(row => row.band && row.uncertainty === '±1σ measurement uncertainty' &&
        row.co2 === originalIce.get(row.time).co2 && row.lower === originalIce.get(row.time).lower &&
        row.upper === originalIce.get(row.time).upper) };
  })()`);
  assert.deepEqual([...result.sources], ['pages', 'osman']);
  assert.equal(result.temperatureBand, true);
  assert.equal(result.valid, true);
  assert.ok(result.iceCount > 1000);
  assert.equal(result.icePreserved, true);
});

test('published temperature and ice-core bands render separately and fit the visible scale', () => {
  const saved = {beginShape:context.beginShape, vertex:context.vertex, endShape:context.endShape,
    clip:context.drawingContext.clip, restore:context.drawingContext.restore};
  let vertices, clipped = false;
  const polygons = [];
  context.drawingContext.clip = () => { clipped = true; };
  context.drawingContext.restore = () => { clipped = false; };
  context.beginShape = () => { vertices = []; };
  context.vertex = (x,y) => vertices.push([x,y]);
  context.endShape = () => polygons.push({vertices,clipped});
  try {
    for (const [dataset, years, expectedSources] of [[0,30000,['pages','osman']], [1,900000,['co2-ice']]]) {
      polygons.length = 0;
      const state = run(`(() => {
        setZoom(${years} * 1000 / (width - shift)); oneYear = -1000 / scrollValue;
        const series = data[${dataset}];
        series.rectY = panelTargetY(series.position); series.draw();
        const count = series.visiblePointCount();
        return {sources: [...new Set(series.seriesRows.slice(0,count).filter(row => row.band).map(row => row.source))],
          samples: series.seriesRows.slice(0,count).filter(row => row.band).map(row => ({
            x:width - oneYear * (row.time - series.BP), lower:row.lower, upper:row.upper})),
          minimum:series.localMinY, maximum:series.localMaxY,
          top:series.rectY, bottom:series.rectY+series.rectH};
      })()`);
      assert.deepEqual([...state.sources], expectedSources);
      assert.equal(polygons.length, expectedSources.length);
      for (const polygon of polygons) {
        assert.equal(polygon.clipped, true);
        assert.ok(polygon.vertices.every(([,y]) => y >= state.top-1e-9 && y <= state.bottom+1e-9));
        for (const [x] of polygon.vertices) {
          assert.ok(state.samples.some(sample => Math.abs(sample.x-x)<1e-9), 'band vertices retain published sample dates');
        }
      }
      assert.ok(state.samples.every(sample => sample.lower >= state.minimum-1e-12 && sample.upper <= state.maximum+1e-12));
    }
  } finally {
    Object.assign(context, {beginShape:saved.beginShape,vertex:saved.vertex,endShape:saved.endShape});
    Object.assign(context.drawingContext, {clip:saved.clip,restore:saved.restore});
  }
});

test('rendering preserves both sides of every source join and leaves it disconnected', () => {
  const result = run(`(() => {
    setZoom(70000000); oneYear = -1000 / scrollValue;
    const series = data[0];
    const indices = new Set(series.extremaPreservingIndices(series.dataX.length));
    const joins = [];
    for (let i = 1; i < series.dataX.length; i++) {
      if (series.seriesRows[i - 1].source !== series.seriesRows[i].source) {
        joins.push({ retained: indices.has(i - 1) && indices.has(i),
          connected: series.canConnectIndices(i - 1, i) });
      }
    }
    return joins;
  })()`);
  assert.equal(result.length, 3);
  assert.ok(result.every(join => join.retained && !join.connected));
});

test('one global sea-level view includes geological and modern records without local coastal samples', () => {
  const result = run(`({ sources: [...new Set(data[5].seriesRows.map(row => row.source))],
    oldest: data[5].minX, maximum: data[5].maxY,
    seaViews: data.filter(series => series.columnY === 'Sealevel').length })`);
  assert.deepEqual([...result.sources], ['sea-satellite', 'sea-gauges', 'sea-kopp', 'sea-lambeck', 'sea-miller']);
  assert.ok(result.oldest < -60000000);
  assert.ok(result.maximum > 100);
  assert.equal(result.seaViews, 1);
});

test('sea-level alignment preserves variability and uncertainty while using a 1950 reference', () => {
  const result = run(`(() => {
    const gp = parseGp2014SeaLevelRows(sourceTables.sealevelGpRaw);
    const satellite = parseColoradoSeaLevelRows(sourceTables.sealevelRaw);
    const miller = parseMiller2024SeaLevelRows(sourceTables.sealevelMillerRaw);
    const kopp = parseKopp2016SeaLevelRows(sourceTables.sealevelKoppRaw);
    const lambeck = parseLambeck2014SeaLevelRows(sourceTables.sealevelLambeckRaw);
    const originals = { 'sea-gauges': gp, 'sea-satellite': satellite, 'sea-miller': miller,
      'sea-kopp': kopp, 'sea-lambeck': lambeck };
    const offsets = { 'sea-gauges': -seaLevelCalibration.gpReference,
      'sea-satellite': seaLevelCalibration.satelliteOffset, 'sea-miller': -seaLevelCalibration.millerReference,
      'sea-kopp': -seaLevelCalibration.koppReference, 'sea-lambeck': -seaLevelCalibration.lambeckReference };
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

test('Kopp fills the Common Era with the global posterior on its original evaluation grid', () => {
  const published = fs.readFileSync('data/sealevel/kopp2016-global-posterior.csv', 'utf8')
    .trim().split(/\r?\n/).slice(1).map(line => line.split(',').map(Number));
  const raw = run('parseKopp2016SeaLevelRows(sourceTables.sealevelKoppRaw)');
  assert.equal(raw.length, 162);
  for (const [year, mean, deviation] of published) {
    const row = raw.find(row => row.time === year - 1950);
    assert.equal(row.sealevel, mean / 1000);
    assert.equal(row.lower, (mean - deviation) / 1000);
    assert.equal(row.upper, (mean + deviation) / 1000);
    assert.equal(row.band, true);
    assert.equal(row.uncertainty, '±1σ global posterior');
  }
  assert.ok(Math.abs(run('seaLevelCalibration.koppReference') + 0.0659) < 1e-12);
  const reference = raw.find(row => row.time === 0);
  assert.equal(reference.sealevel - run('seaLevelCalibration.koppReference'), 0);
  const retained = run('data[5].seriesRows.filter(row => row.source === "sea-kopp")');
  assert.equal(retained.length, 141);
  assert.equal(retained[0].time, 1800 - 1950);
  assert.equal(retained.at(-1).time, -1000 - 1950);
  assert.equal(run('data[5].hasUncertaintyBands'), true);
  assert.equal(run('data[5].seriesRows.some(row => row.source === "sea-miller" && row.time >= -2950)'), false);
  assert.equal(run('data[5].seriesRows.some(row => row.source === "sea-kopp" && row.time >= 1807.5417 - 1950)'), false);
});

test('invalid Kopp rows and absent reference points fail visibly', () => {
  for (const row of ['1950,nan,4.67', '1950,-65.9,-4.67', '1950,-65.9', '1950,,4.67']) {
    assert.throws(() => run(`parseKopp2016SeaLevelRows([${JSON.stringify(row)}])`), /Invalid Kopp/);
  }
  assert.throws(() => run(`buildCombinedSeaLevelTable(
    parseColoradoSeaLevelRows(sourceTables.sealevelRaw),
    parseGp2014SeaLevelRows(sourceTables.sealevelGpRaw),
    parseMiller2024SeaLevelRows(sourceTables.sealevelMillerRaw),
    parseKopp2016SeaLevelRows(sourceTables.sealevelKoppRaw).filter(row => row.time !== 0),
    parseLambeck2014SeaLevelRows(sourceTables.sealevelLambeckRaw))`), /1950 reference/);
});

test('Lambeck uses Table S3 best estimates and its published 2 sigma half-widths', () => {
  const published = fs.readFileSync('data/sealevel/lambeck2014-esl.csv', 'utf8')
    .trim().split(/\r?\n/).slice(1).map(line => line.split(',').map(Number));
  const raw = run('parseLambeck2014SeaLevelRows(sourceTables.sealevelLambeckRaw)');
  assert.equal(raw.length, 326);
  for (const [age, _nominal, best, twoSigma] of published) {
    const row = raw.find(row => row.time === -age * 1000);
    assert.equal(row.sealevel, best);
    assert.equal(row.lower, best - twoSigma);
    assert.equal(row.upper, best + twoSigma);
    assert.equal(row.band, true);
    assert.equal(row.uncertainty, '±2σ published accuracy');
  }
  const holocene = raw.find(row => row.time === -6026);
  assert.equal(holocene.sealevel, -2.96);
  assert.ok(Math.abs(holocene.lower + 3.03) < 1e-12);
  assert.ok(Math.abs(holocene.upper + 2.89) < 1e-12);
  assert.equal(Math.min(...raw.map(row => row.sealevel)), -134.28);
  assert.equal(run('seaLevelCalibration.lambeckReference'), 0);
  const retained = run('data[5].seriesRows.filter(row => row.source === "sea-lambeck")');
  assert.equal(retained.length, 285);
  assert.ok(Math.abs(retained[0].time + 2970) < 1e-8);
  assert.equal(retained.at(-1).time, -34783);
  assert.ok(retained.every(row => row.time < -2950));
  assert.equal(run('data[5].seriesRows.some(row => row.source === "sea-miller" && row.time >= -34783)'), false);
});

test('Lambeck joins keep both definitions visible without fitting endpoints or inventing samples', () => {
  const boundaries = run(`(() => {
    const rows = data[5].seriesRows;
    return rows.flatMap((row,i) => i && sourceSegment(row) !== sourceSegment(rows[i-1]) ?
      [{older:row.source, newer:rows[i-1].source, age:-row.time, newerAge:-rows[i-1].time,
        jump:rows[i-1].sealevel-row.sealevel, connected:data[5].canConnectIndices(i-1,i)}] : []);
  })()`);
  const recent = boundaries.find(join => join.older === 'sea-lambeck');
  assert.equal(recent.newer, 'sea-kopp');
  assert.equal(recent.newerAge, 2950);
  assert.ok(Math.abs(recent.age - 2970) < 1e-8);
  assert.ok(Math.abs(recent.jump - 0.46011) < 1e-10);
  assert.equal(recent.connected, false);
  const ancient = boundaries.find(join => join.older === 'sea-miller');
  assert.equal(ancient.newer, 'sea-lambeck');
  assert.equal(ancient.newerAge, 34783);
  assert.ok(ancient.age > 34783);
  assert.equal(ancient.connected, false);
});

test('invalid Lambeck rows and an absent zero-age reference fail visibly', () => {
  for (const row of ['6.026,-3.23,nan,0.07', '6.026,-3.23,-2.96,-0.07',
    '-6.026,-3.23,-2.96,0.07', '6.026,-3.23,-2.96', '6.026,-3.23,,0.07']) {
    assert.throws(() => run(`parseLambeck2014SeaLevelRows([${JSON.stringify(row)}])`), /Invalid Lambeck/);
  }
  assert.throws(() => run(`buildCombinedSeaLevelTable(
    parseColoradoSeaLevelRows(sourceTables.sealevelRaw),
    parseGp2014SeaLevelRows(sourceTables.sealevelGpRaw),
    parseMiller2024SeaLevelRows(sourceTables.sealevelMillerRaw),
    parseKopp2016SeaLevelRows(sourceTables.sealevelKoppRaw),
    parseLambeck2014SeaLevelRows(sourceTables.sealevelLambeckRaw).filter(row => row.time !== 0))`), /zero-age reference/);
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
  assert.deepEqual([...result.map(item=>item.count)], [3,4,2,4,1]);
  assert.ok(result.every(item=>item.valid));
  const gap = run(`(() => {
    const rows = data[5].seriesRows;
    const i = rows.findIndex((row,index) => index && row.source === 'sea-kopp' && rows[index-1].source === 'sea-gauges');
    return {older:rows[i].time+1950, newer:rows[i-1].time+1950, connected:data[5].canConnectIndices(i-1,i)};
  })()`);
  assert.equal(gap.older, 1800);
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
    const make = rows => new Data(buildTimeValueTable(rows,'co2','CO2'),'time','CO2','ppm',1,0, true);
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
      const series = new Data(buildTimeValueTable(rows,'co2','CO2'),'time','CO2','ppm',1,0, true);
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
      'time','Solar Irradiance','W/m²',1,0, true);
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

test('rebuilding solar data from the bundled observations is deterministic', () => {
  const result = run(`(() => {
    const build = () => parseSolarIrradianceTableRows(mergeSolarTableWithNnlAndTsis(
      sourceTables.solarBase, sourceTables.solarIrradianceNnlRaw,
      sourceTables.solarIrradianceTsisRaw
    ));
    const first = build();
    const second = build();
    return { count: first.length, equal: first.every((row, index) =>
      row.time === second[index].time && row.irradiance === second[index].irradiance) };
  })()`);
  assert.ok(result.count > 70000);
  assert.equal(result.equal, true);
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
  assert.match(result[1].note, /2 days • 2024-01-01–2024-01-10/);
  assert.match(result[0].note, /provisional/);
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

test('top buttons change only the comparison and temperature always fits visible data', () => {
  const html = fs.readFileSync('index.html','utf8');
  assert.deepEqual([...html.matchAll(/data-comparison="\d"[^>]*>([^<]+)/g)].map(match=>match[1]),
    ['CO₂','Orbit','Solar','Volcanoes','Sea level','Population']);
  run('selectComparison(4); draw()');
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
  run("key = 'Y'; keyPressed(); setZoom(25); draw()");
  assert.equal(run('data[0].yScrolling'), true);
  assert.deepEqual([...run('[data[0].localMinY, data[0].localMaxY]')], [...recentBounds]);
  run('mouseButton = LEFT; mouseX = width - 10; mouseY = data[0].rectY + 25; mousePressed(); draw()');
  assert.equal(run('data[0].yScrolling'), true);
  run('mouseY = 0; mouseX = 0; selectComparison(1)');
});

test('native dataset controls expose the selected state and own activation and navigation keys', () => {
  const makeControl = comparison => ({dataset:{comparison}, attributes:{}, style:{}, events:{},
    addEventListener(name, handler) { (this.events[name] ||= []).push(handler); },
    setAttribute(name, value) { this.attributes[name]=value; },
    focus() { context.document.activeElement=this; }});
  const buttons = Array.from({length:6},(_,index)=>makeControl(String(index+1)));
  const guide = {...makeControl(), open:false};
  const info = makeControl();
  const canvas = makeControl();
  context.document = {querySelectorAll:()=>buttons, querySelector:()=>canvas,
    getElementById:id=>id==='about-data' ? guide : info};
  try {
    run('selectComparison(1); initializeControls()');
    assert.ok(buttons.every(button=>!button.disabled));
    buttons[3].events.click[0]();
    assert.equal(run('selectedData'),4);
    assert.deepEqual(buttons.map(button=>button.attributes['aria-pressed']), ['false','false','false','true','false','false']);
    assert.match(canvas.attributes['aria-label'], /Volcanic optical depth compared with global temperature/);
    const before = run('({zoom:scrollValue,cursor:showCursor})');
    for (const key of [' ','Enter']) {
      let stopped = false;
      buttons[3].events.keydown[0]({key,stopPropagation(){stopped=true;}});
      assert.equal(stopped,true);
    }
    for (const [key,expected] of [['ArrowRight',5],['Home',1],['ArrowLeft',6],['End',6]]) {
      const focusedIndex = run('selectedData')-1;
      let stopped = false, prevented = false;
      buttons[focusedIndex].events.keydown[1]({key,stopPropagation(){stopped=true;},preventDefault(){prevented=true;}});
      assert.equal(stopped && prevented,true);
      assert.equal(run('selectedData'),expected);
      assert.equal(context.document.activeElement,buttons[expected-1]);
    }
    assert.deepEqual(run('({zoom:scrollValue,cursor:showCursor})'), before);
  } finally {
    delete context.document;
    run('selectComparison(1)');
  }
});

test('autoscaling uses the visible line intersection rather than an off-screen extreme', () => {
  const bounds = run(`(() => {
    setZoom(25); oneYear = -1000 / scrollValue;
    const bp = currentYear - 1950;
    const table = buildTimeValueTable([
      { time: bp - 1, temperature: 2 },
      { time: bp - 2, temperature: 4 },
      { time: bp - 100, temperature: 1000 }
    ], 'temperature', 'Temperature');
    const series = new Data(table, 'time', 'Temperature', '°C', 0, 0, true);
    series.draw();
    return [series.localMinY, series.localMaxY];
  })()`);
  assert.equal(bounds[0], 2);
  const expectedAtLeftEdge = 4 + ((1265 / 40 - 2) / 98) * (1000 - 4);
  assert.ok(Math.abs(bounds[1] - expectedAtLeftEdge) < 1e-9);
  assert.ok(bounds[1] < 1000);
});

test('population lines reach the left edge without being clipped below the panel', () => {
  const saved = {line:context.line,clip:context.drawingContext.clip,restore:context.drawingContext.restore,width:context.width};
  const lines = [];
  let clipped = false;
  context.line = (x1,y1,x2,y2) => { if (clipped) lines.push({x1,y1,x2,y2}); };
  context.drawingContext.clip = () => { clipped = true; };
  context.drawingContext.restore = () => { clipped = false; };
  try {
    for (const [viewportWidth,zoom] of [[1280,1],[1280,2],[1280,10],[375,3]]) {
      context.width = viewportWidth;
      lines.length = 0;
      const panel = run(`(() => {
        setZoom(${zoom}); oneYear = -1000/scrollValue;
        const series = data[6]; series.draw();
        return {top:series.rectY,bottom:series.rectY+series.rectH,samples:series.dataX.length};
      })()`);
      const crossing = lines.find(line => Math.min(line.x1,line.x2) <= 15 && Math.max(line.x1,line.x2) >= 15);
      assert.ok(crossing, `line reaches left edge at width ${viewportWidth}, zoom ${zoom}`);
      const edgeY = crossing.y1 + (15-crossing.x1)/(crossing.x2-crossing.x1)*(crossing.y2-crossing.y1);
      assert.ok(edgeY >= panel.top-1e-6 && edgeY <= panel.bottom+1e-6, 'visible edge is inside vertical clip');
      assert.equal(panel.samples, run('sourceTables.population.getRowCount()'), 'no observations are added');
    }
    context.width = 375;
    lines.length = 0;
    run('setZoom(1); oneYear = -1000/scrollValue; data[6].draw()');
    assert.equal(run('data[6].visiblePointCount()'), 0);
    assert.equal(lines.length, 0, 'annual values are not extended beyond their newest timestamp');
  } finally {
    context.width = saved.width;
    context.line = saved.line;
    Object.assign(context.drawingContext,{clip:saved.clip,restore:saved.restore});
  }
});

test('edge scaling preserves source joins, point-only samples and actual data gaps', () => {
  for (const olderMetadata of ["source:'older'", "source:'recent',mode:'points'", "source:'recent',maxGapYears:1"]) {
    const bounds = run(`(() => {
      setZoom(25); oneYear=-1000/scrollValue; const bp=currentYear-1950;
      const rows=[{time:bp-1,co2:2,source:'recent'}, {time:bp-2,co2:4,source:'recent'},
        {time:bp-100,co2:1000,${olderMetadata}}];
      const series=new Data(buildTimeValueTable(rows,'co2','CO2'),'time','CO2','ppm',1,0, true);
      series.draw(); return [series.localMinY,series.localMaxY];
    })()`);
    assert.deepEqual([...bounds],[2,4]);
  }
});

test('a continuous uncertainty band contributes only its bounds at the visible edge', () => {
  const result = run(`(() => {
    setZoom(1); oneYear=-1000; const bp=currentYear-1950;
    const rows=[{time:bp-1,co2:300,lower:250,upper:350,band:true,source:'co2-cencopip'},
      {time:bp-2,co2:200,lower:150,upper:250,band:true,source:'co2-cencopip'}];
    const series=new Data(buildTimeValueTable(rows,'co2','CO2'),'time','CO2','ppm',1,0, true);
    series.draw(); return {lower:series.localMinY,upper:series.localMaxY};
  })()`);
  assert.ok(Math.abs(result.lower - (250-0.265*100)) < 1e-9);
  assert.equal(result.upper,350);
});

test('tooltips always identify single-source datasets and retired shortcuts do nothing', () => {
  const labels = [];
  const originalText = context.text;
  context.text = value => labels.push(String(value));
  try {
    run(`setZoom(100); oneYear=-10;
      const series=data[2]; mouseX=width-oneYear*(series.dataX[0]-series.BP)-shift;
      mouseY=200; series.draw();`);
    assert.ok(labels.some(label=>label.includes('ZB18a')));
    assert.ok(!labels.some(label=>label.includes('Source:')));
    const before = run('({zoom:scrollValue,cursor:showCursor,comparison:selectedData})');
    context.fetch = () => { throw new Error('Retired shortcuts must not request data'); };
    run("for (const pressedKey of ['v','V','r','R','p','P']) { key=pressedKey; keyPressed(); }");
    assert.deepEqual(run('({zoom:scrollValue,cursor:showCursor,comparison:selectedData})'),before);
  } finally {
    context.text=originalText;
    delete context.fetch;
    run('mouseX=0;mouseY=0');
  }
});

test('compact mobile tooltips retain dates, source, uncertainty and essential solar context', () => {
  const saved = {text:context.text,rect:context.rect,width:context.width,height:context.height,
    mouseX:context.mouseX,mouseY:context.mouseY,cursor:run('showCursor')};
  const labels = [], boxes = [];
  context.text = value => labels.push(String(value));
  context.rect = (x,y,w,h) => boxes.push({x,y,w,h});
  context.width = 375;
  context.height = 844;
  try {
    for (const [dataset, source, period, uncertainty] of [
      [0,'giss','',null], [0,'pages','Apr–Mar annual','95% ensemble'],
      [0,'osman','200-year mean','±1σ ensemble'], [1,'co2-ice','','±1σ measurement'],
      [1,'co2-cencopip','500,000-year mean','95% credible'],
      [5,'sea-kopp','','±1σ posterior'], [5,'sea-lambeck','','±2σ accuracy'],
      [6,'population-projection','',null]
    ]) {
      labels.length = 0; boxes.length = 0;
      const expected = run(`(() => {
        const series=data[${dataset}], index=series.seriesRows.findIndex(row=>row.source==='${source}');
        const sample=series.seriesRows[index];
        const years=Math.max(1,(series.BP-sample.time)*1.5);
        setZoom(years*1000/(width-shift)); oneYear=-1000/scrollValue;
        mouseX=width-oneYear*(sample.time-series.BP)-shift; mouseY=200; showCursor=true;
        series.drawDataTooltip(300,-1,series.dataX.length);
        return {value:series.formatTooltipValue(series.dataY[index]), date:sampleTimeLabel(sample),
          source:SOURCE_INFO[sample.source].short,
          lower:Number.isFinite(sample.lower)?series.formatTooltipValue(sample.lower):null,
          upper:Number.isFinite(sample.upper)?series.formatTooltipValue(sample.upper):null};
      })()`);
      const rendered = labels.join(' ');
      for (const value of [expected.value,expected.date,expected.source,period,uncertainty,expected.lower,expected.upper].filter(Boolean)) {
        assert.ok(rendered.includes(value), `${source} retains ${value}`);
      }
      assert.ok(labels.length <= 5, `${source} readout stays compact`);
      assert.equal(boxes.length,1);
      assert.ok(boxes[0].x >= 8 && boxes[0].x+boxes[0].w <= 367);
      assert.ok(!rendered.includes('Source:') && !rendered.includes('years BP (1950)'));
    }
    for (const annual of [false,true]) {
      labels.length = 0;
      run(`(() => {
        const rows=sortRowsByTimeDesc([2,6,10].map(day=>({time:decimalYearFromYmd(2024,1,day)-1950,
          irradiance:1361,source:'solar-tsis',provisional:true,
          sampleDate:'2024-01-'+String(day).padStart(2,'0')})));
        const displayed=${annual ? 'annualSolarRows(rows)' : 'smoothDenseSolarRows(rows,-100,50)'};
        const series=new Data(buildTimeValueTable(displayed,'irradiance','Solar Irradiance'),
          'time','Solar Irradiance','W/m²',1,0,true);
        const index=series.seriesRows.findIndex(row=>row.source==='solar-tsis' && row.provisional);
        const sample=series.seriesRows[index];
        setZoom(1000); oneYear=-1; mouseX=width-oneYear*(sample.time-series.BP)-shift;
        series.drawDataTooltip(300,-0.1,series.dataX.length);
      })()`);
      const rendered = labels.join(' ');
      assert.match(rendered,/TSIS/);
      assert.match(rendered,/provisional/);
      assert.match(rendered,annual ? /partial-year mean/ : /50-day mean/);
      if (annual) assert.match(rendered,/\d+ days • \d{4}-\d{2}-\d{2}–\d{4}-\d{2}-\d{2}/);
    }
  } finally {
    Object.assign(context,{text:saved.text,rect:saved.rect,width:saved.width,height:saved.height,
      mouseX:saved.mouseX,mouseY:saved.mouseY});
    run(`showCursor=${saved.cursor}`);
  }
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
    const series = new Data(table, 'time', 'CO2', 'ppm', 1, 0, true);
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
      const series = new Data(table, 'time', 'CO2', 'ppm', 1, 0, true);
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
  assert.equal(run("new Data(new p5.Table(), 'time', 'Temperature', '°C', 0, 0, true).dataX.length"), 0);
  run("new Data(null, 'time', 'Temperature', '°C', 0, 0, true).draw()");
});

test('large wheel movements remain proportional and opposite movements restore the zoom', () => {
  const savedZoom = run('scrollValue');
  try {
    run('setZoom(1000); mouseWheel({delta:-600})');
    assert.ok(run('scrollValue') > 250 && run('scrollValue') < 300);
    run('mouseWheel({delta:600})');
    assert.ok(Math.abs(run('scrollValue') - 1000) < 1e-9);
  } finally {
    run(`setZoom(${savedZoom})`);
  }
});

test('reading the guide allows scrolling without changing the plot', () => {
  context.document = { getElementById: () => ({ open: true }) };
  const zoom = run('scrollValue');
  const savedMouse = {mouseIsPressed:context.mouseIsPressed, mouseY:context.mouseY,
    pmouseX:context.pmouseX, pmouseY:context.pmouseY};
  try {
    assert.equal(run('mouseWheel({delta: 100})'), true);
    run("key = '+'; keyPressed(); mouseDragged()");
    assert.equal(run('scrollValue'), zoom);
    run('data[selectedData].rectY = panelTargetY(1)');
    const target = run('data[selectedData].rectY');
    context.mouseIsPressed = true;
    context.pmouseX = context.width / 2;
    context.pmouseY = target + 20;
    context.mouseY = target + 60;
    run('data[selectedData].draw()');
    assert.equal(run('data[selectedData].rectY'), target);
  } finally {
    Object.assign(context, savedMouse);
    delete context.document;
  }
});

test('solar combination rejects unavailable calibration rather than inventing a zero offset', () => {
  assert.throws(() => run('mergeSolarTableWithNnlAndTsis(sourceTables.solarBase, sourceTables.solarIrradianceNnlRaw, [])'), /paired NNL\/TSIS/);
  assert.throws(() => run('mergeSolarTableWithNnlAndTsis(null, sourceTables.solarIrradianceNnlRaw, sourceTables.solarIrradianceTsisRaw)'), /paired PMIP4\/NNL/);
});

test('failed loads and failed calibration show an error without drawing an incomplete chart', () => {
  for (const scenario of ['download', 'calibration']) {
    const message = {textContent:''};
    const status = {hidden:true, role:'status', setAttribute:(_key,value)=>{status.role=value;}, querySelector:()=>message};
    let drew = false;
    const failureContext = {...context, background:()=>{drew=true;},
      document:{getElementById:id=>id==='app-status' ? status : null}};
    if (scenario === 'download') {
      failureContext.loadStrings = (_file,_success,failure) => { failure(); return []; };
    }
    vm.createContext(failureContext);
    loadApp(failureContext);
    if (scenario === 'download') vm.runInContext('preload()', failureContext);
    else vm.runInContext("initializeView = () => { throw new Error('Unavailable solar calibration'); }", failureContext);
    vm.runInContext('setup(); draw()', failureContext);
    assert.equal(status.hidden, false);
    assert.equal(status.role, 'alert');
    assert.match(message.textContent, scenario === 'download' ? /Could not load/ : /Unavailable solar calibration/);
    assert.equal(drew, false);
  }
});

test('visibility ignores future and invalid readings while sorting values with their sources', () => {
  const savedZoom = run('scrollValue');
  try {
    const result = run(`(() => {
      setZoom(1); oneYear = -1000;
      const bp = currentYear - 1950;
      const series = new Data(buildTimeValueTable([
        {time:bp+0.1,co2:20000,source:'future'},
        {time:bp-0.2,co2:300,source:'older'},
        {time:bp-0.1,co2:400,source:'newer'},
        {time:bp-0.3,co2:NaN,source:'invalid'}
      ],'co2','CO2'),'time','CO2','ppm',1,0,true);
      series.draw();
      return {visible:series.visiblePointCount(), values:series.dataY,
        sources:series.seriesRows.map(row=>row.source),
        min:series.localMinY,max:series.localMaxY,connected:series.canConnectIndices(0,1)};
    })()`);
    assert.equal(result.visible, 2);
    assert.deepEqual([...result.values], [400,300]);
    assert.deepEqual([...result.sources], ['newer','older']);
    assert.equal(result.min, 300);
    assert.equal(result.max, 400);
    assert.equal(result.connected, false);
  } finally {
    run(`setZoom(${savedZoom}); oneYear = -1000/scrollValue`);
  }
});

test('calendar conversion preserves early Common Era years and the 99/100 boundary', () => {
  for (const date of ['0000-02-29', '0001-01-01', '0004-02-29', '0099-12-31', '0100-01-01']) {
    const [year,month,day] = date.split('-').map(Number);
    assert.equal(run(`new Date(millisecondsFromDecimalYear(decimalYearFromYmd(${year},${month},${day}))).toISOString().slice(0,10)`), date);
  }
  assert.equal(run('decimalYearFromYmd(99,12,32)'), 100);
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
      data = [new Data(datedTable,'time','CO2','ppm',0,0, true),
        new Data(datedTable,'time','CO2','ppm',1,0, true)];
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
