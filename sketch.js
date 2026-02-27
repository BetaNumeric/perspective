// Constants for UI dimensions and scaling
const GUI_HEIGHT_DIVISOR = 12;        // Top GUI bar height
const TIMELINE_HEIGHT_DIVISOR = 14;   // Bottom timeline height
const TIMELINE_HEIGHT_DIVISOR_SMALL = 36; // Small timeline elements
const TEXT_SIZE_DIVISOR_LARGE = 36;   // Large text scaling
const TEXT_SIZE_DIVISOR_MEDIUM = 48;  // Medium text scaling
const TEXT_SIZE_DIVISOR_SMALL = 60;   // Small text scaling
const TEXT_SIZE_DIVISOR_TINY = 70;    // Tiny text scaling
const SHIFT_OFFSET = 15;              // Left margin offset
const DATA_PANEL_HEIGHT_DIVISOR = 3;  // Data panel height

// Constants for zoom and scrolling
const DEFAULT_SCROLL_VALUE = 25;      // Starting zoom level
const MAX_SCROLL_VALUE = 15000000000; // Max zoom out (cosmological scale)

// Constants for color and transparency
const BACKGROUND_ALPHA = 128;         // Standard background transparency
const BACKGROUND_ALPHA_HIGH = 230;    // High opacity background
const STROKE_ALPHA_LOW = 64;          // Low opacity stroke
const STROKE_ALPHA_MEDIUM = 100;      // Medium opacity stroke
const TIMELINE_LABEL_MIN_SPACING = 70;

// Global data structures and variables
let data = [];                        // All loaded datasets
let event = [];                       // Historical events for timeline
let sourceTables = {};
let scrollValue = DEFAULT_SCROLL_VALUE;
let pScrollValue = scrollValue;
let oneYear = 0;                      // Zoom state
let scrollSpeed = 1;                  // Current scroll speed
let currentYear = 0;                  // Right-edge timeline anchor (current year plus small buffer)
let yearShift = 0;                    // Year alignment offset
let shift = SHIFT_OFFSET;             // Left margin shift
let showCursor = true;                // Crosshair/tooltip visibility toggle
let selectedData = 0;                 // Currently selected dataset index
let maxData = 0;                      // Maximum dataset count
let perfHUD = false;
let perfDataVertices = 0;
let perfEventsDrawn = 0;
let perfEventsCulled = 0;
let perfTimelineTicks = 0;
let perfTimelineLabels = 0;

function preload() {
  sourceTables.temperature = loadTable('data/Temperature.csv', 'csv', 'header');
  sourceTables.co2 = loadTable('data/CO2.csv', 'csv', 'header');
  sourceTables.earthOrbit = loadTable('data/Earth Orbit.csv', 'csv', 'header');
  sourceTables.solarIrradiance = loadTable('data/Solar Irradiance.csv', 'csv', 'header');
  sourceTables.sealevel = loadTable('data/Sealevel.csv', 'csv', 'header');
  sourceTables.oceanAcidity = loadTable('data/Ocean Acidity.csv', 'csv', 'header');
  sourceTables.population = loadTable('data/Population.csv', 'csv', 'header');
}

function setup() {
  // Set window size and properties
  createCanvas(windowWidth, windowHeight);
  currentYear = year() + 1;

  // Add historical events (type 0 = duration bands, type 1 = point events)
  event.push(new TimelineEvent(0, 'Age of the Universe', -13800000000, currentYear * 3, 255));
  event.push(new TimelineEvent(0, 'Age of Earth', -4540000000, currentYear * 3, 255));
  event.push(new TimelineEvent(0, 'Water on Earth', -4280000000, currentYear * 3, 10));
  event.push(new TimelineEvent(0, 'Single-celled life on Earth', -3800000000, currentYear * 3, 10));
  event.push(new TimelineEvent(0, 'Multicellular life on Earth', -3250000000, currentYear * 3, 10));
  event.push(new TimelineEvent(0, 'Dinosaurs', -243000000, -65000000, 20));

  event.push(new TimelineEvent(0, 'Australopithecus', -4200000, -1200000, 20));
  event.push(new TimelineEvent(0, 'Homo Habilis', -2400000, -1500000, 20));
  event.push(new TimelineEvent(0, 'Homo Erectus', -2000000, -100000, 20));
  event.push(new TimelineEvent(0, 'Homo Sapiens', -300000, currentYear, 20));
  event.push(new TimelineEvent(0, 'Agricultural Revolution', -11000, -4000, 30));
  event.push(new TimelineEvent(0, 'Recorded History', -7000, currentYear, 30));
  event.push(new TimelineEvent(0, 'Life of Buddha', -551, -479, 35));
  event.push(new TimelineEvent(0, 'Life of Muhammad', 570, 630, 35));
  event.push(new TimelineEvent(0, 'Life of Jesus Christ', -4, 70, 35));
  event.push(new TimelineEvent(0, 'Crusades', 1095, 1291, 255));
  event.push(new TimelineEvent(0, 'European Colonization', 1492, currentYear, 40));
  event.push(new TimelineEvent(0, 'Industrial Revolution', 1760, currentYear, 50));
  event.push(new TimelineEvent(0, 'WWI', 1914, 1918.5, 60));
  event.push(new TimelineEvent(0, 'WWII', 1933, 1945, 70));
  event.push(new TimelineEvent(0, 'Cold War', 1947, 1991, 80));
  event.push(new TimelineEvent(0, 'World Wide Web', 1989, currentYear, 90));

  event.push(new TimelineEvent(1, 'Beginning of Time', -13800000000, -1000000, 255));
  event.push(new TimelineEvent(1, 'Formation of the Moon', -4500000000, -4500000000, 255));
  event.push(new TimelineEvent(1, 'Pangaea supercontinent breaks apart', -175000000, -175000000, 255));
  event.push(new TimelineEvent(1, 'Stone Tools', -3400000, -3400000, 255));
  event.push(new TimelineEvent(1, 'Fire', -1000000, -1000000, 255));
  event.push(new TimelineEvent(1, 'Wheel', -3500, -3500, 255));
  event.push(new TimelineEvent(1, 'Great Pyramid of Giza', -2560, -2560, 255));
  event.push(new TimelineEvent(1, 'Iron Tools', -1200, -1200, 255));
  event.push(new TimelineEvent(1, 'Printing Press', 1450, 1450, 255));
  event.push(new TimelineEvent(1, 'Calculus', 1665, 1665, 255));
  event.push(new TimelineEvent(1, 'Battery', 1800, 1800, 255));
  event.push(new TimelineEvent(1, 'Telegraph', 1837, 1837, 255));
  event.push(new TimelineEvent(1, 'Theory of Evolution', 1859, 1859, 255));
  event.push(new TimelineEvent(1, 'Car', 1886, 1886, 255));
  event.push(new TimelineEvent(1, 'Airplane', 1903, 1903, 255));
  event.push(new TimelineEvent(1, 'Television', 1927, 1927, 255));
  event.push(new TimelineEvent(1, 'Computer', 1938, 1938, 255));
  event.push(new TimelineEvent(1, 'Transistor', 1947.9, 1947.9, 255));
  event.push(new TimelineEvent(1, 'Moon Landing', 1969, 1969, 255));
  event.push(new TimelineEvent(1, 'Fall of Berlin Wall', 1989.856965, 1989.856965, 255));
  event.push(new TimelineEvent(1, '9/11', 2001.695429, 2001.695429, 255));
  event.push(new TimelineEvent(1, 'Fukushima', 2011.191654, 2011.191654, 255));
  event.push(new TimelineEvent(1, 'Paris Agreement', 2016.309384, 2016.309384, 255));
  event.push(new TimelineEvent(1, 'COVID-19', 2020.082137, 2023.342238, 255));

  // Load datasets (position 0 = baseline, position 1 = overlay)
  data.push(new Data(sourceTables.temperature, 'time', 'Temperature', '°C', 0, color(255), 0, true));

  data.push(new Data(sourceTables.co2, 'time', 'CO2', 'ppm', 1, color(255, 128, 64), 0, true));
  data.push(new Data(sourceTables.earthOrbit, 'time', 'Eccentricity', '', 1, color(128, 128, 255), 0, false));
  data.push(new Data(sourceTables.solarIrradiance, 'time', 'Solar Irradiance', 'W/m²', 1, color(255, 220, 0), 0, true));
  data.push(new Data(sourceTables.sealevel, 'time', 'Sealevel', 'm', 1, color(0, 128, 255), 0, true));
  data.push(new Data(sourceTables.oceanAcidity, 'time', 'Ocean pH', '(pH)', 1, color(255, 64, 32), 0, true));
  data.push(new Data(sourceTables.population, 'time', 'Population', 'people', 1, color(255, 128, 200), 0, true));

  maxData = data.length - 1; // Set maximum dataset count
}

function draw() {
  // Set cursor based on mouse state
  if (mouseIsPressed) {
    cursor(MOVE);
  } else {
    cursor(ARROW);
  }

  textAlign(LEFT, BASELINE);
  push();
  translate(-shift, 0); // Apply left margin shift

  // Calculate time-to-pixel conversion (negative = past extends left)
  oneYear = -(1 / scrollValue) * 1000;

  // Only redraw if something changed (performance optimization)
  if (dist(mouseX, mouseY, pmouseX, pmouseY) > 0
    || scrollValue !== pScrollValue
    || data[selectedData].rectY !== data[selectedData].defRectY
    || data[0].rectY !== data[0].defRectY) {
    perfDataVertices = 0;
    perfEventsDrawn = 0;
    perfEventsCulled = 0;
    perfTimelineTicks = 0;
    perfTimelineLabels = 0;

    colorMode(RGB);
    background(0, 16, 32); // Dark blue background

    // Draw top GUI bar background
    fill(0);
    noStroke();
    rect(0, 0, width, height / GUI_HEIGHT_DIVISOR);

    // Draw datasets (temperature baseline + selected overlay)
    data[0].draw(); // Always draw temperature
    if (selectedData > 0) data[selectedData].draw(); // Draw selected dataset

    // Draw bottom timeline background
    fill(0);
    noStroke();
    rect(0, height, width, -height / TIMELINE_HEIGHT_DIVISOR);

    // Draw historical events with color coding
    for (let i = 0; i < event.length; i++) {
      if (event[i].type === 0) {
        event[i].c = color(128, 128, map(i, 0, event.length - 1, 220, 0)); // Duration events
      } else if (event[i].type === 1) {
        event[i].c = color(150, 255, map(i, 0, event.length - 1, 220, 0)); // Point events
      }
      event[i].draw();
    }

    // Draw crosshair and time readout
    if (showCursor && mouseY > height / GUI_HEIGHT_DIVISOR) {
      fill(255);
      stroke(255, STROKE_ALPHA_LOW);
      line(mouseX + shift, height - height / TIMELINE_HEIGHT_DIVISOR_SMALL, mouseX + shift, height); // Vertical line to timeline
      line(mouseX + shift, mouseY, mouseX + shift, height - height / 9); // Vertical line to data
      noStroke();
      textSize(height / TEXT_SIZE_DIVISOR_SMALL);
      textAlign(CENTER, BASELINE);
      // Format time display based on zoom level
      if (oneYear <= -33) text(((width - (mouseX + shift)) / oneYear) + currentYear, mouseX + shift, height - height / GUI_HEIGHT_DIVISOR);
      if (oneYear < -0.1 && oneYear > -33) text(int(((width - (mouseX + shift)) / oneYear) + currentYear), mouseX + shift, height - height / GUI_HEIGHT_DIVISOR);
      if (oneYear >= -0.1) text(nfc(((width - (mouseX + shift)) / oneYear + currentYear), 0), mouseX + shift, height - height / GUI_HEIGHT_DIVISOR);
    }

    // Calculate timeline tick spacing based on zoom level
    let v = 1; // Tick interval in years
    yearShift = 0; // Year alignment offset

    // Progressive tick spacing for different zoom levels
    if (scrollValue > 30) v = 10;
    if (scrollValue > 30) yearShift = round((currentYear * 0.1)) * 10 - currentYear;
    if (scrollValue > 150) v = 50;
    if (scrollValue > 150) yearShift = round((currentYear * 0.01)) * 100 - currentYear;
    if (scrollValue > 500) v = 100;
    if (scrollValue > 500) yearShift = round((currentYear * 0.001)) * 1000 - currentYear;
    if (scrollValue > 1000) v = 500;
    if (scrollValue > 5000) v = 1000;
    if (scrollValue > 10000) v = 5000;
    if (scrollValue > 50000) v = 10000;
    if (scrollValue > 50000) yearShift = round((currentYear * 0.0001)) * 10000 - currentYear;
    if (scrollValue > 100000) v = 50000;
    if (scrollValue > 500000) v = 100000;
    if (scrollValue > 1000000) v = 500000;
    if (scrollValue > 5000000) v = 1000000;
    if (scrollValue > 10000000) v = 5000000;
    if (scrollValue > 50000000) v = 10000000;
    if (scrollValue > 100000000) v = 50000000;
    if (scrollValue > 400000000) v = 100000000;
    if (scrollValue > 800000000) v = 500000000;
    if (scrollValue > 3000000000) v = 1000000000;
    if (scrollValue > 8000000000) v = 5000000000;

    // Draw right margin background
    fill(0);
    noStroke();
    rect(width, 0, shift, height);

    // Draw timeline ticks and labels
    fill(255);
    stroke(0);
    textAlign(CENTER, BASELINE);
    const minLabelSpacing = TIMELINE_LABEL_MIN_SPACING;
    let lastLabelX = -1000000;
    for (let i = width - (oneYear * yearShift), y = yearShift; i > 0; i -= (1.0 / scrollValue) * (1000.0 * v), y -= v) {
      let label = nf(y + currentYear, 0, 0);
      if (scrollValue >= 50000) label = nfc(y + currentYear, 0); // Use comma formatting for large numbers
      if (y > -13800000000) { // Don't draw ticks beyond universe age
        perfTimelineTicks++;
        stroke(255);
        if (abs(i - lastLabelX) >= minLabelSpacing) {
          noStroke();
          text(label, i, height - height / 24);
          lastLabelX = i;
          perfTimelineLabels++;
        }
        stroke(255);
        line(i, height - height / TIMELINE_HEIGHT_DIVISOR_SMALL, i, height);
      }
    }

    // Draw universe age boundary line
    let x = 0;
    x = width - (oneYear * yearShift) - (1.0 / scrollValue) * 1000.0 * 13800000000;
    line(x, height, x, -height); // Vertical line at universe age

    textAlign(LEFT, BASELINE);
    fill(255);
    pop();
    GUI(); // Draw top GUI bar

    textSize(height / TEXT_SIZE_DIVISOR_TINY);
    fill(255);
    if (perfHUD) {
      textAlign(LEFT, TOP);
      const perfLine1 = `FPS: ${nfs(frameRate(), 0, 1)}  Zoom: ${nfc(scrollValue, 0)}`;
      const perfLine2 = `Data verts: ${perfDataVertices}  Events drawn: ${perfEventsDrawn}  culled: ${perfEventsCulled}`;
      const perfLine3 = `Timeline labels: ${perfTimelineLabels} / ticks: ${perfTimelineTicks}`;
      fill(0, 32, 64, BACKGROUND_ALPHA_HIGH);
      rect(8, 8, max(textWidth(perfLine1), max(textWidth(perfLine2), textWidth(perfLine3))) + 12, height / TEXT_SIZE_DIVISOR_TINY * 4);
      fill(255);
      noStroke();
      text(perfLine1, 14, 10);
      text(perfLine2, 14, 10 + height / TEXT_SIZE_DIVISOR_TINY);
      text(perfLine3, 14, 10 + 2 * (height / TEXT_SIZE_DIVISOR_TINY));
    }
  }
  pScrollValue = scrollValue; // Store previous scroll value for change detection
}

function GUI() {
  textAlign(CENTER, CENTER);
  textSize(height / TEXT_SIZE_DIVISOR_LARGE);
  stroke(255);
  strokeWeight(0.5);
  line(0, height / GUI_HEIGHT_DIVISOR, width, height / GUI_HEIGHT_DIVISOR);
  noStroke();
  for (let i = 0; i < maxData; i++) {
    fill(128);
    if (mouseX > width / maxData * i && mouseX < width / maxData * i + width / maxData && mouseY < height / GUI_HEIGHT_DIVISOR) {
      if (mouseIsPressed) {
        selectedData = i + 1;
      } else {
        fill(255);
      }
    }

    if (i === selectedData - 1) fill(data[selectedData].c);
    text(data[i + 1].columnY, width / (maxData * 2) + width / maxData * i, height / 26);
  }
}

function keyPressed() {
  if (key === '-' || key === 'a' || key === 'A' || (keyCode === LEFT_ARROW && scrollValue + scrollSpeed < MAX_SCROLL_VALUE)) {
    scrollValue += scrollSpeed + (scrollValue / 50.0);
  }
  if (key === '+' || key === 'd' || key === 'D' || (keyCode === RIGHT_ARROW && scrollValue - scrollSpeed >= 1)) {
    scrollValue -= scrollSpeed + (scrollValue / 50.0);
  }
  if (key === '0') scrollValue = 10;
  if (key === '1') scrollValue = 100;
  if (key === '2') scrollValue = 1000;
  if (key === '3') scrollValue = 10000;
  if (key === '4') scrollValue = 100000;
  if (key === '5') scrollValue = 1000000;
  if (key === '6') scrollValue = 10000000;
  if (key === '7') scrollValue = 100000000;
  if (key === '8') scrollValue = 1000000000;
  if (key === '9') scrollValue = 14000000000;
  if (key === 'p' || key === 'P') perfHUD = !perfHUD;
  if (key === 'C' || key === 'c' || key === ' ') showCursor = !showCursor;
}

function mousePressed() {
  if (mouseButton === RIGHT) showCursor = !showCursor;
}

function mouseWheel(event) {
  // Scale zoom proportionally to current zoom level
  const wheelSteps = event.delta / 100;
  const zoomFactor = 1.0 + (0.25 * wheelSteps); // 25% zoom per wheel step

  // Apply zoom with bounds checking
  const newScrollValue = scrollValue * zoomFactor;
  if (newScrollValue >= 1 && newScrollValue < MAX_SCROLL_VALUE) {
    scrollValue = newScrollValue;
  }

  return false;
}

function mouseDragged() {
  const deltaX = mouseX - pmouseX;
  let zoomDivisor;
  if (mouseX < width - 200) zoomDivisor = (scrollSpeed * width) - mouseX - shift;
  else zoomDivisor = scrollSpeed * 200;

  zoomDivisor = max(10, abs(zoomDivisor));
  scrollValue += deltaX * (scrollValue / zoomDivisor);
  scrollValue = constrain(scrollValue, 1, MAX_SCROLL_VALUE - 1);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

class Data {
  static MIN_Y_RANGE = 0.000001;
  static SNAP_THRESHOLD_PX = 5;
  static SPRING_BASE_SPEED = 5;
  static SPRING_DAMPING_DIVISOR = 10;
  static COLLAPSED_X_THRESHOLD_PX = 1.0;
  static MIN_PIXEL_SPACING = 0.01;
  static MIN_TARGET_VERTICES = 4000;
  static INITIAL_RENDERED_X = -999999;

  // Constructor: load and process CSV data
  constructor(sourceTable, sourceColumnX, sourceColumnY, sourceUnit, sourcePosition, sourceColor, sourceType, sourceYScroll) {
    // Data properties
    this.type = sourceType;                    // Rendering type, panel position
    this.position = sourcePosition;
    this.dataX = new Array(sourceTable.getRowCount()); // X and Y data arrays
    this.dataY = new Array(sourceTable.getRowCount());
    this.defRectY = 0;                         // Default Y position for panel
    this.rectX = 0;
    this.rectY = 0;
    this.rectW = 0;
    this.rectH = 0;                            // Panel rectangle properties
    this.columnX = sourceColumnX;
    this.columnY = sourceColumnY;
    this.unit = sourceUnit;                    // Column names and unit
    this.maxX = 0;
    this.maxY = 0;
    this.localMaxY = 0;
    this.minX = 0;
    this.minY = 0;
    this.localMinY = 0;
    this.distX = 0;
    this.distY = 0;                            // Data ranges
    this.BP = currentYear - 1950;              // BP offset used by datasets with 1950-based time axes
    this.dataDist = 0;                         // Distance to mouse for tooltip
    this.yScrolling = sourceYScroll;           // Enable Y-axis autoscaling
    this.c = sourceColor;                      // Dataset color

    // Set initial panel positions
    if (this.position === 0) this.rectY = height;      // Baseline panel at bottom
    if (this.position === 1) this.rectY = -height / 3; // Overlay panel at top

    // Initialize min/max values with first row
    this.maxX = sourceTable.getRow(0).getNum(this.columnX);
    this.maxY = sourceTable.getRow(0).getNum(this.columnY);
    this.minX = sourceTable.getRow(0).getNum(this.columnX);
    this.minY = sourceTable.getRow(0).getNum(this.columnY);

    // Load all data and find min/max ranges
    for (let i = 0; i < sourceTable.getRowCount(); i++) {
      const row = sourceTable.getRow(i);
      this.dataX[i] = row.getNum(this.columnX);
      this.dataY[i] = row.getNum(this.columnY);
      if (this.dataX[i] > this.maxX) this.maxX = this.dataX[i];
      if (this.dataX[i] < this.minX) this.minX = this.dataX[i];
      if (this.dataY[i] > this.maxY) this.maxY = this.dataY[i];
      if (this.dataY[i] < this.minY) this.minY = this.dataY[i];
    }
    // Calculate data ranges
    this.distY = this.maxY - this.minY;
    this.distX = this.maxX - this.minX;
    console.log('Max X: ' + this.maxX);
    console.log('Max Y: ' + this.maxY);
    console.log('Min X: ' + this.minX);
    console.log('Min Y: ' + this.minY);
    console.log('dist X: ' + this.distX);
    console.log('dist Y: ' + this.distY);
  }

  draw() {
    colorMode(RGB);
    this.defRectY = height / GUI_HEIGHT_DIVISOR;   // Default Y position below GUI
    this.rectX = width + oneYear * abs(this.maxX - this.BP); // Panel X position (right edge)
    this.rectW = oneYear * abs(this.distX);        // Panel width based on time range

    let renderDistance = this.visiblePointCount();

    // Include one point beyond visible range for proper line drawing
    if (renderDistance < this.dataX.length) renderDistance++;

    // Calculate Y-axis scaling (global vs local)
    this.localMinY = this.minY;
    if (this.yScrolling) {
      // Use only visible data for Y-axis scaling
      this.localMaxY = this.dataY[0];
      this.localMinY = this.dataY[0];
      for (let i = 0; i < renderDistance; i += 1) {
        if (this.dataY[i] > this.localMaxY) this.localMaxY = this.dataY[i];
        if (this.dataY[i] < this.localMinY) this.localMinY = this.dataY[i];
      }
      this.distY = this.localMaxY - this.localMinY;
    }

    if (abs(this.distY) < Data.MIN_Y_RANGE) this.distY = Data.MIN_Y_RANGE;

    if (this.position === 1) {
      this.rectH = height / DATA_PANEL_HEIGHT_DIVISOR;
      // Robust hit-test using min/max bounds
      const rectLeft = min(this.rectX, this.rectX + this.rectW);
      const rectRight = max(this.rectX, this.rectX + this.rectW);
      const rectTop = min(this.rectY, this.rectY + this.rectH);
      const rectBottom = max(this.rectY, this.rectY + this.rectH);

      if (mouseIsPressed && pmouseX >= rectLeft && pmouseX <= rectRight
        && pmouseY >= rectTop && pmouseY <= rectBottom) {
        this.rectY += (mouseY - pmouseY);
      } else {
        this.rectY = this.easeToTarget(this.rectY, this.defRectY);
      }
    } else if (this.position === 0) {
      this.rectH = height / DATA_PANEL_HEIGHT_DIVISOR;
      this.rectY = this.easeToTarget(this.rectY, this.rectH + this.defRectY);
    }

    // Special positioning for type 2 (follow mouse)
    if (this.type === 2) this.rectY = mouseY - this.rectH / 2;

    // Draw panel background
    fill(0, 32, 64, BACKGROUND_ALPHA);
    stroke(255, STROKE_ALPHA_MEDIUM);
    noStroke();

    // Draw panel rectangle (extends to left edge when data continues off-screen)
    if (renderDistance < this.dataX.length) rect(this.rectX, this.rectY, -width, this.rectH);
    else rect(this.rectX, this.rectY, this.rectW, this.rectH);

    // Draw dataset label
    textSize(height / TEXT_SIZE_DIVISOR_MEDIUM);
    fill(this.c);
    textAlign(LEFT, TOP);
    if (this.rectX + this.rectW < shift && this.rectX > shift + textWidth(this.columnY)) text(this.columnY + ':', shift + 10, this.rectY + 5);
    else if (this.rectX + this.rectW > shift) text(this.columnY + ':', this.rectX + this.rectW + 10, this.rectY + 5);
    else if (this.rectX < shift + textWidth(this.columnY)) text(this.columnY + ':', this.rectX - textWidth(this.columnY) + 10, this.rectY + 5);

    // Begin drawing the data line/curve
    stroke(255);
    strokeWeight(1);
    noFill();
    const h = -this.rectH / this.distY;
    const w = oneYear;
    const x = width;
    const y = (this.rectY + this.rectH / 2) - (this.localMinY * h + ((h * this.distY) / 2));

    const lastVisibleIndex = max(0, renderDistance - 1);
    const visibleSpanPx = abs(oneYear * (this.dataX[0] - this.dataX[lastVisibleIndex]));
    const collapsedX = renderDistance > 1 && visibleSpanPx < Data.COLLAPSED_X_THRESHOLD_PX;

    beginShape();
    if (this.type === 1) {
      fill(255);
      vertex(this.rectX, this.rectY); // Start point for filled curve
    }
    if (this.type === 1) vertex(this.rectX, ((this.rectY + this.rectH / 2) - (this.minY * (this.rectH / this.distY) + (((this.rectH / this.distY) * this.distY) / 2))) + this.dataY[0] * (this.rectH / this.distY));

    if (collapsedX) {
      strokeWeight(1);
      stroke(this.c);
      const collapsedXPos = x - w * (this.dataX[0] - this.BP);
      const collapsedYPos = y + this.dataY[0] * h;
      if (this.type === 0) {
        point(collapsedXPos, collapsedYPos);
        perfDataVertices++;
      }
      if (this.type === 1) {
        curveVertex(collapsedXPos, collapsedYPos);
        perfDataVertices++;
      }
    } else {
      // Adaptive point thinning: target a bounded number of vertices per viewport
      const targetVertices = max(Data.MIN_TARGET_VERTICES, (width - shift) * 2.0);
      const minPixelSpacing = max(Data.MIN_PIXEL_SPACING, visibleSpanPx / targetVertices);
      let lastRenderedX = Data.INITIAL_RENDERED_X; // Track X position of last rendered point

      for (let i = 0, pI = 1; i < renderDistance; i++) {
        const pointX = x - w * (this.dataX[i] - this.BP);
        const prevPointX = x - w * (this.dataX[pI] - this.BP);
        const pixelSpacing = abs(pointX - lastRenderedX);

        // Always render first point, then only render if spaced far enough apart
        if (i === 0 || pixelSpacing >= minPixelSpacing) {

          strokeWeight(1);
          stroke(this.c);
          if (this.type === 0) {
            line(pointX, y + this.dataY[i] * h, prevPointX, y + this.dataY[pI] * h);
            perfDataVertices++;
          }
          if (this.type === 1) {
            curveVertex(pointX, y + this.dataY[i] * h);
            perfDataVertices++;
          }

          // Check if mouse is over this data segment for tooltip
          if (pointX <= mouseX + shift && prevPointX > mouseX + shift) {
            const mouseData = nfs(this.dataY[i], 0, 0) + ' ' + this.unit;
            this.dataDist = abs(mouseY - (y + this.dataY[i] * h));

            // Draw tooltip if cursor is enabled and in data area
            if (showCursor && mouseY > height / GUI_HEIGHT_DIVISOR) {
              line(mouseX + shift, mouseY, mouseX + shift, y + this.dataY[i] * h); // Vertical line to data point
              noStroke();
              rectMode(CORNER);

              // Position tooltip box to avoid screen edge
              if (mouseX + shift < width - textWidth(mouseData)) {
                fill(0, 32, 64, BACKGROUND_ALPHA_HIGH);
                rect(mouseX + shift, y + this.dataY[i] * h - 5, textWidth(mouseData) + 5, -height / TIMELINE_HEIGHT_DIVISOR_SMALL);
                textAlign(LEFT, BASELINE);
                fill(this.c);
                text(mouseData + ' ', mouseX + shift, y + this.dataY[i] * h - 10);
              } else if (mouseX + shift >= width - textWidth(mouseData)) {
                fill(0, 32, 64, BACKGROUND_ALPHA_HIGH);
                rect(mouseX + shift, y + this.dataY[i] * h - 5, -textWidth(mouseData) + 5, -height / TIMELINE_HEIGHT_DIVISOR_SMALL);
                textAlign(RIGHT, BASELINE);
                fill(this.c);
                text(mouseData, mouseX + shift, y + this.dataY[i] * h - 10);
              }
            }

          }
          lastRenderedX = pointX;
          pI = i;
        }
      }
    }

    // End the curve shape
    if (this.type === 1) vertex(this.rectX + this.rectW, this.rectY);
    endShape();
  }

  easeToTarget(current, target) {
    if (current < target - Data.SNAP_THRESHOLD_PX) return current + Data.SPRING_BASE_SPEED + (target - current) / Data.SPRING_DAMPING_DIVISOR;
    if (current > target + Data.SNAP_THRESHOLD_PX) return current - Data.SPRING_BASE_SPEED + (current - target) / -Data.SPRING_DAMPING_DIVISOR;
    return target;
  }

  visiblePointCount() {
    if (this.dataX.length === 0) return 0;

    const descendingTime = this.dataX[0] >= this.dataX[this.dataX.length - 1];
    const noFuturePrefix = this.dataX[0] <= this.BP;

    // Fast path: descending datasets (newest to oldest), which all current files use.
    if (descendingTime && noFuturePrefix) {
      const oldestVisibleX = this.BP + (width - shift) / oneYear;
      let low = 0;
      let high = this.dataX.length - 1;
      let lastVisible = -1;

      while (low <= high) {
        const mid = low + int((high - low) / 2);
        if (this.dataX[mid] >= oldestVisibleX) {
          lastVisible = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      return lastVisible + 1;
    }

    // Safety fallback for unexpected ordering/content.
    let count = 0;
    for (let i = 0; i < this.dataX.length; i++) {
      const screenX = width - oneYear * (this.dataX[i] - this.BP);
      if (screenX >= shift && screenX <= width) count++;
    }
    return count;
  }
}

class TimelineEvent {
  static EVENT_CULL_MARGIN = 200;

  // Constructor: create a timeline event
  constructor(eventType, eventName, eventStart, eventEnd, eventHue) {
    // Event properties
    this.type = eventType;                    // Event type (0=duration band, 1=point event)
    this.name = eventName;                    // Event name/label
    this.start = currentYear - eventStart;    // Start/end times
    this.end = currentYear - eventEnd;
    this.c = [Math.max(0, Math.min(255, eventHue)), 255, 128]; // Event color
  }

  draw() {
    colorMode(HSB, 255);
    const w = (this.start * oneYear) - (this.end * oneYear); // Event width in pixels
    const startX = width + (this.start * oneYear) + 1;
    const endX = width + (this.end * oneYear);
    const y = height / TIMELINE_HEIGHT_DIVISOR; // Y position on timeline
    const h = (height / 4) + (height / 144) * width / ((this.start * oneYear) - height / 10); // Zoom-responsive event height
    textAlign(LEFT, TOP);
    textSize(height / TEXT_SIZE_DIVISOR_SMALL);

    const visibleLeft = -TimelineEvent.EVENT_CULL_MARGIN;
    const visibleRight = width + TimelineEvent.EVENT_CULL_MARGIN;

    if (this.type === 0) {
      const bandLeft = min(startX, endX);
      const bandRight = max(startX, endX);
      if (bandRight < visibleLeft || bandLeft > visibleRight) {
        perfEventsCulled++;
        return;
      }
    } else if (this.type === 1) {
      if (startX < visibleLeft || startX > visibleRight) {
        perfEventsCulled++;
        return;
      }
    }

    perfEventsDrawn++;

    if (this.type === 0) {
      // Draw duration events as bands
      noStroke();
      fill(this.c);
      rect(endX, height - y, w, -h + y); // Event band
      strokeWeight(0.7);
      stroke(255);
      line(startX, height, startX, height - h); // Start line
      noStroke();
      fill(255);
      text(this.name, (width + oneYear * this.start) + 5, height - h); // Event label
    } else if (this.type === 1) {
      // Draw point events as labels with vertical lines
      fill(this.c);
      noStroke();
      rect(startX, height - h / 2 - height / TIMELINE_HEIGHT_DIVISOR_SMALL, textWidth(this.name) + 10, height / TIMELINE_HEIGHT_DIVISOR_SMALL);
      strokeWeight(0.7);
      stroke(255);
      line(startX, height, startX, height - h / 2 - height / TIMELINE_HEIGHT_DIVISOR_SMALL); // Event line
      noStroke();
      fill(255);
      text(this.name, (width + oneYear * this.start) + 5, height - h / 2 - height / TIMELINE_HEIGHT_DIVISOR_SMALL); // Event label
    }
  }
}
