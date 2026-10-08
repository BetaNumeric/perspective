// Global data structures and variables
let data = [];                        // All loaded datasets
let event = [];                       // Historical events for timeline
let sourceTables = {};
let scrollValue = DEFAULT_SCROLL_VALUE;
let pScrollValue = scrollValue;
let oneYear = 0;                      // Zoom state
let currentYear = 0;                  // Right-edge timeline anchor (current year plus small buffer)
const shift = SHIFT_OFFSET;           // Left margin shift
let showCursor = true;                // Crosshair/tooltip visibility toggle
let selectedData = 1;                 // Upper series index
let temperatureCalibration = {};
let seaLevelCalibration = {};
let solarCalibration = {};
let redrawRequested = true;
let startupError = null;

function preload() {
  // Orbital
  sourceTables.zeebeOrbitalRaw = loadSourceLines('data/orbit/zeebe2019orbital.txt');

  // Temperature (oldest -> newest)
  sourceTables.phanDaTempRaw = loadSourceLines('data/temperature/phanda2024-percentiles.csv');
  sourceTables.hansenTempRaw = loadSourceLines('data/temperature/Table.txt');
  sourceTables.snyderTempRaw = loadSourceLines('data/temperature/snyder2016-gast.csv');
  sourceTables.osmanTempRaw = loadSourceLines('data/temperature/osman2021-gmst.csv');
  sourceTables.neukomTempRaw = loadSourceLines('data/temperature/Full_ensemble_median_and_95pct_range.txt');
  sourceTables.gissTempRaw = loadSourceLines('data/temperature/GLB.Ts+dSST.txt');

  // CO2 (oldest -> newest)
  sourceTables.co2FosterRaw = loadSourceLines('data/co2/foster2017-loess.csv');
  sourceTables.co2CencopipRaw = loadSourceLines('data/co2/cencopip2023-500kyr.csv');
  sourceTables.co2AntarcticaRaw = loadSourceLines('data/co2/antarctica2015co2composite-noaa.txt');
  sourceTables.co2InSituRaw = loadSourceLines('data/co2/daily_in_situ_co2_mlo.csv');
  sourceTables.co2DailyRaw = loadSourceLines('data/co2/co2_daily_mlo.txt');

  // Volcanic
  sourceTables.volcanicSaodRaw = loadSourceLines('data/volcanic/SAOD_merged_HolVol-v1_eVolv2k_v3_CMIP6_v3_-9500_to_2014_global_mean.csv');

  // Solar Irradiance
  sourceTables.solarIrradiance = loadTable('data/solar/SATIRE_M_TSI_14C_fc.csv', 'csv', 'header',
    () => {}, () => reportStartupError(new Error('Could not load the PMIP4 solar dataset')));
  sourceTables.solarIrradianceNnlRaw = loadSourceLines('data/solar/nnl_tsi_P1D.txt');
  sourceTables.solarIrradianceTsisRaw = loadSourceLines('data/solar/tsis_tsi_24hr.txt');

  // Sea Level (oldest -> newest)
  sourceTables.sealevelMarcillyRaw = loadSourceLines('data/sealevel/marcilly2024-modern-land.csv');
  sourceTables.sealevelMillerRaw = loadSourceLines('data/sealevel/miller2024-sealevel.txt');
  sourceTables.sealevelSprattRaw = loadSourceLines('data/sealevel/spratt2016-noaa.txt');
  sourceTables.sealevelLambeckRaw = loadSourceLines('data/sealevel/lambeck2014-esl.csv');
  sourceTables.sealevelKoppRaw = loadSourceLines('data/sealevel/kopp2016-global-posterior.csv');
  sourceTables.sealevelGpRaw = loadSourceLines('data/sealevel/gslGPChange2014.txt');
  sourceTables.sealevelRaw = loadSourceLines('data/sealevel/gmsl_2026rel2_seasons_retained.txt');

  // Population
  sourceTables.populationLongRunRaw = loadSourceLines('data/population/population-long-run-with-projections.csv');
}

function reportStartupError(error) {
  startupError = error;
  updateComparisonControls();
  if (typeof document === 'undefined') return;
  const status = document.getElementById('app-status');
  if (status) {
    status.hidden = false;
    status.setAttribute('role', 'alert');
    status.querySelector('p').textContent = 'Unable to load the chart. ' + error.message + '. Try reloading the page.';
  }
  document.getElementById('p5_loading')?.remove();
}

function loadSourceLines(path) {
  return loadStrings(path, () => {}, () => reportStartupError(new Error('Could not load ' + path)));
}

function setup() {
  if (startupError) return;
  try {
    initializeView();
    updateComparisonControls();
    if (typeof document !== 'undefined') {
      const status = document.getElementById('app-status');
      if (status) status.hidden = true;
    }
  } catch (error) {
    reportStartupError(error);
  }
}

function initializeView() {
  createCanvas(windowWidth, windowHeight);
  currentYear = decimalYearFromYmd(year(), month(), day() + 1);
  if (!Number.isFinite(currentYear)) currentYear = year();
  sourceTables.earthOrbit = buildEarthOrbitTableFromZeebe(sourceTables.zeebeOrbitalRaw);
  sourceTables.volcanic = buildVolcanicSaodTable(sourceTables.volcanicSaodRaw, sourceTables.volcanic);
  sourceTables.population = buildPopulationTableFromLongRun(sourceTables.populationLongRunRaw, year());
  sourceTables.co2 = buildCombinedCo2Table();

  sourceTables.temperature = buildCombinedTemperatureTable(
    parseGissTemperatureRows(sourceTables.gissTempRaw),
    parseNeukomTemperatureRows(sourceTables.neukomTempRaw),
    parseOsmanTemperatureRows(sourceTables.osmanTempRaw),
    parseSnyderTemperatureRows(sourceTables.snyderTempRaw),
    parseHansenTemperatureRows(sourceTables.hansenTempRaw),
    parsePhanDaTemperatureRows(sourceTables.phanDaTempRaw));
  sourceTables.solarBase = buildTimeValueTable(
    parsePmipSolarRows(sourceTables.solarIrradiance),
    'irradiance',
    'Solar Irradiance',
    sourceTables.solarIrradiance
  );
  sourceTables.solarIrradiance = mergeSolarTableWithNnlAndTsis(
    sourceTables.solarBase,
    sourceTables.solarIrradianceNnlRaw,
    sourceTables.solarIrradianceTsisRaw
  );
  sourceTables.sealevel = buildCombinedSeaLevelTable(
    parseColoradoSeaLevelRows(sourceTables.sealevelRaw),
    parseGp2014SeaLevelRows(sourceTables.sealevelGpRaw),
    parseMiller2024SeaLevelRows(sourceTables.sealevelMillerRaw),
    parseKopp2016SeaLevelRows(sourceTables.sealevelKoppRaw),
    parseLambeck2014SeaLevelRows(sourceTables.sealevelLambeckRaw),
    parseSpratt2016SeaLevelRows(sourceTables.sealevelSprattRaw),
    parseMarcillySeaLevelRows(sourceTables.sealevelMarcillyRaw));

  createTimelineEvents();

  // Temperature stays at the bottom; simple top buttons choose the comparison.
  data.push(new Data(sourceTables.temperature, 'time', 'Temperature', '°C', 0, color(255), true, 'Global temperature'));
  data.push(new Data(sourceTables.co2, 'time', 'CO2', 'ppm', 1, color(255, 128, 64), true, 'Atmospheric CO₂'));
  data.push(new Data(sourceTables.earthOrbit, 'time', 'Eccentricity', '', 1, color(128, 128, 255), false, 'Orbital eccentricity'));
  data.push(new Data(sourceTables.solarIrradiance, 'time', 'Solar Irradiance', 'W/m²', 1, color(255, 220, 0), true, 'Total solar irradiance'));
  data.push(new Data(sourceTables.volcanic, 'time', 'Volcanic Activity', 'OD', 1, color(255, 180, 80), true, 'Volcanic optical depth'));
  data.push(new Data(sourceTables.sealevel, 'time', 'Sealevel', 'm', 1, color(0, 128, 255), true, 'Global sea level'));
  data.push(new Data(sourceTables.population, 'time', 'Population', 'people', 1, color(255, 128, 200), true, 'World population'));
}

function draw() {
  if (startupError || !data.length) return;
  if (mouseIsPressed) {
    cursor(MOVE);
  } else {
    cursor(ARROW);
  }

  textAlign(LEFT, BASELINE);

  // Calculate time-to-pixel conversion (negative = past extends left)
  oneYear = -(1 / scrollValue) * 1000;

  if (redrawRequested || dist(mouseX, mouseY, pmouseX, pmouseY) > 0
    || scrollValue !== pScrollValue
    || data[selectedData].position !== 1
    || Math.abs(data[selectedData].rectY - panelTargetY(1)) > Data.SNAP_THRESHOLD_PX
    || Math.abs(data[0].rectY - panelTargetY(0)) > Data.SNAP_THRESHOLD_PX) {
    redrawRequested = false;
    push();
    translate(-shift, 0); // Apply left margin shift

    colorMode(RGB);
    background(0, 16, 32);

    fill(0);
    noStroke();
    rect(0, 0, width, height / GUI_HEIGHT_DIVISOR);

    data[0].draw();
    data[selectedData].position = 1;
    data[selectedData].draw();

    fill(0);
    noStroke();
    rect(0, height, width, -height / TIMELINE_HEIGHT_DIVISOR);

    for (let i = 0; i < event.length; i++) {
      if (event[i].type === 0) {
        event[i].c = color(128, 128, map(i, 0, event.length - 1, 220, 0)); // Duration events
      } else if (event[i].type === 1) {
        event[i].c = color(150, 255, map(i, 0, event.length - 1, 220, 0)); // Point events
      }
      event[i].draw();
    }

    // Draw crosshair and time readout
    if (showCursor && mouseX >= 0 && mouseX <= width - shift && mouseY > height / GUI_HEIGHT_DIVISOR) {
      fill(255);
      stroke(255, STROKE_ALPHA_LOW);
      line(mouseX + shift, height - height / TIMELINE_HEIGHT_DIVISOR_SMALL, mouseX + shift, height); // Vertical line to timeline
      line(mouseX + shift, mouseY, mouseX + shift, height - height / 9); // Vertical line to data
      noStroke();
      textSize(Math.max(11, height / TEXT_SIZE_DIVISOR_SMALL));
      textAlign(CENTER, BASELINE);
      const label = cursorTimeLabel(yearFromPlotX(mouseX + shift));
      const halfLabelWidth = textWidth(label) / 2;
      const labelX = constrain(mouseX + shift, shift + halfLabelWidth + 4, width - halfLabelWidth - 4);
      text(label, labelX, height - height / GUI_HEIGHT_DIVISOR);
    }

    fill(0);
    noStroke();
    rect(width, 0, shift, height);

    fill(255);
    stroke(0);
    textAlign(CENTER, BASELINE);
    textSize(Math.max(11, Math.min(14, height / TEXT_SIZE_DIVISOR_SMALL)));
    let lastLabelLeft = Infinity;
    const universeStartYear = currentYear - 13800000000;
    const ticks = timelineTicks(Math.max(universeStartYear, yearFromPlotX(shift)), currentYear, Math.abs(oneYear));
    for (const tick of ticks) {
      const x = plotXFromYear(tick.year);
      const halfLabelWidth = textWidth(tick.label) / 2;

      if (x - halfLabelWidth >= shift + 4 && x + halfLabelWidth <= width - 4
        && x + halfLabelWidth + 8 <= lastLabelLeft) {
        noStroke();
        text(tick.label, x, height - height / 24);
        lastLabelLeft = x - halfLabelWidth;

      }
      stroke(255);
      line(x, height - height / TIMELINE_HEIGHT_DIVISOR_SMALL, x, height);
    }

    // Draw universe age boundary line
    const x = plotXFromYear(universeStartYear);
    line(x, height, x, -height); // Vertical line at universe age

    textAlign(LEFT, BASELINE);
    fill(255);
    pop();
    updateTimelineEventControls();

  }
  pScrollValue = scrollValue;
}
