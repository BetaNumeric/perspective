// Constants for UI dimensions and scaling
static final int GUI_HEIGHT_DIVISOR = 12;        // Top GUI bar height
static final int TIMELINE_HEIGHT_DIVISOR = 14;   // Bottom timeline height
static final int TIMELINE_HEIGHT_DIVISOR_SMALL = 36; // Small timeline elements
static final int TEXT_SIZE_DIVISOR_LARGE = 36;   // Large text scaling
static final int TEXT_SIZE_DIVISOR_MEDIUM = 48;  // Medium text scaling
static final int TEXT_SIZE_DIVISOR_SMALL = 60;   // Small text scaling
static final int TEXT_SIZE_DIVISOR_TINY = 70;    // Tiny text scaling
static final int SHIFT_OFFSET = 15;              // Left margin offset
static final int DATA_PANEL_HEIGHT_DIVISOR = 3;  // Data panel height

// Constants for zoom and scrolling
static final int DEFAULT_SCROLL_VALUE = 25;      // Starting zoom level
static final long MAX_SCROLL_VALUE = 15000000000L; // Max zoom out (cosmological scale)

// Constants for color and transparency
static final int BACKGROUND_ALPHA = 128;         // Standard background transparency
static final int BACKGROUND_ALPHA_HIGH = 230;    // High opacity background
static final int STROKE_ALPHA_LOW = 64;          // Low opacity stroke
static final int STROKE_ALPHA_MEDIUM = 100;      // Medium opacity stroke
static final int TIMELINE_LABEL_MIN_SPACING = 70;

// Global data structures and variables
ArrayList<Data> data = new ArrayList<Data>();    // All loaded datasets
ArrayList<Event> event = new ArrayList<Event>(); // Historical events for timeline
float scrollValue = DEFAULT_SCROLL_VALUE, pScrollValue = scrollValue, oneYear = 0; // Zoom state
int scrollSpeed = 1;                    // Current scroll speed
float currentYear = year() + 1;                    // Right-edge timeline anchor (current year plus small buffer)
float yearShift;                                 // Year alignment offset
int shift = SHIFT_OFFSET;                          // Left margin shift
boolean cursor = true;                  // Crosshair/tooltip visibility toggle
int selectedData;                                // Currently selected dataset index
int maxData;                                     // Maximum dataset count
boolean perfHUD = false;
int perfDataVertices = 0;
int perfEventsDrawn = 0;
int perfEventsCulled = 0;
int perfTimelineTicks = 0;
int perfTimelineLabels = 0;

void setup() {
  // Set window size and properties
  size(1280, 720); 
  surface.setResizable(true);  // Allow window resizing
  // Add historical events (type 0 = duration bands, type 1 = point events)
  event.add(new Event(0, "Age of the Universe", -13800000000L, currentYear*3, 255));
  event.add(new Event(0, "Age of Earth", -4540000000L, currentYear*3, 255));
  event.add(new Event(0, "Water on Earth", -4280000000L, currentYear*3, 10));
  event.add(new Event(0, "Single-celled life on Earth", -3800000000L, currentYear*3, 10));
  event.add(new Event(0, "Multicellular life on Earth", -3250000000L, currentYear*3, 10));
  event.add(new Event(0, "Dinosaurs", -243000000, -65000000, 20));

  event.add(new Event(0, "Australopithecus", -4200000, -1200000, 20));
  event.add(new Event(0, "Homo Habilis", -2400000, -1500000, 20));
  event.add(new Event(0, "Homo Erectus", -2000000, -100000, 20));
  event.add(new Event(0, "Homo Sapiens", -300000, currentYear, 20));
  event.add(new Event(0, "Agricultural Revolution", -11000, -4000, 30));
  event.add(new Event(0, "Recorded History", -7000, currentYear, 30));
  event.add(new Event(0, "Life of Buddha", -551, -479, 35));
  event.add(new Event(0, "Life of Muhammad", 570, 630, 35));
  event.add(new Event(0, "Life of Jesus Christ", -4, 70, 35));
  event.add(new Event(0, "Crusades", 1095, 1291, 255));
  event.add(new Event(0, "European Colonization", 1492, currentYear, 40));
  event.add(new Event(0, "Industrial Revolution", 1760, currentYear, 50));
  event.add(new Event(0, "WWI", 1914, 1918.5, 60));
  event.add(new Event(0, "WWII", 1933, 1945, 70));
  event.add(new Event(0, "Cold War", 1947, 1991, 80));
  event.add(new Event(0, "World Wide Web", 1989, currentYear, 90));

  event.add(new Event(1, "Beginning of Time", -13800000000L, -1000000, 255));
  event.add(new Event(1, "Formation of the Moon", -4500000000L, -4500000000L, 255));
  event.add(new Event(1, "Pangaea supercontinent breaks apart", -175000000, -175000000, 255));
  event.add(new Event(1, "Stone Tools", -3400000, -3400000, 255));
  event.add(new Event(1, "Fire", -1000000, -1000000, 255));
  event.add(new Event(1, "Wheel", -3500, -3500, 255));
  event.add(new Event(1, "Great Pyramid of Giza", -2560, -2560, 255));
  event.add(new Event(1, "Iron Tools", -1200, -1200, 255));
  event.add(new Event(1, "Printing Press", 1450, 1450, 255));
  event.add(new Event(1, "Calculus", 1665, 1665, 255));
  event.add(new Event(1, "Battery", 1800, 1800, 255));
  event.add(new Event(1, "Telegraph", 1837, 1837, 255));
  event.add(new Event(1, "Theory of Evolution", 1859, 1859, 255));
  event.add(new Event(1, "Car", 1886, 1886, 255));
  event.add(new Event(1, "Airplane", 1903, 1903, 255));
  event.add(new Event(1, "Television", 1927, 1927, 255));
  event.add(new Event(1, "Computer", 1938, 1938, 255));
  event.add(new Event(1, "Transistor", 1947.9, 1947.9, 255));
  event.add(new Event(1, "Moon Landing", 1969, 1969, 255));
  event.add(new Event(1, "Fall of Berlin Wall", 1989.856965, 1989.856965, 255));
  event.add(new Event(1, "9/11", 2001.695429, 2001.695429, 255));
  event.add(new Event(1, "Fukushima", 2011.191654, 2011.191654, 255));
  event.add(new Event(1, "Paris Agreement", 2016.309384, 2016.309384, 255));
  event.add(new Event(1, "COVID-19", 2020.082137, 2023.342238, 255));

  // Load datasets (position 0 = baseline, position 1 = overlay)
  data.add(new Data(loadTable("data/Temperature.csv", "header"), "time", "Temperature", "°C", 0, color(255), 0, true));

  data.add(new Data(loadTable("data/CO2.csv", "header"), "time", "CO2", "ppm", 1, color(255, 128, 64), 0, true));
  data.add(new Data(loadTable("data/Earth Orbit.csv", "header"), "time", "Eccentricity", "", 1, color(128, 128, 255), 0, false));
  data.add(new Data(loadTable("data/Solar Irradiance.csv", "header"), "time", "Solar Irradiance", "W/m²", 1, color(255, 220, 0), 0, true));
  data.add(new Data(loadTable("data/Sealevel.csv", "header"), "time", "Sealevel", "m", 1, color(0, 128, 255), 0, true));
  data.add(new Data(loadTable("data/Ocean Acidity.csv", "header"), "time", "Ocean pH", "(pH)", 1, color(255, 64, 32), 0, true));
  data.add(new Data(loadTable("data/Population.csv", "header"), "time", "Population", "people", 1, color(255, 128, 200), 0, true));

  maxData = data.size()-1;  // Set maximum dataset count
}

void draw() {
  // Set cursor based on mouse state
  if (mousePressed) cursor(MOVE);
  else cursor(ARROW);
  textAlign(CORNER);
  pushMatrix();
  translate(-shift, 0);  // Apply left margin shift
  
  // Calculate time-to-pixel conversion (negative = past extends left)
  oneYear = -(1 / scrollValue) * 1000;

  // Only redraw if something changed (performance optimization)
  if (dist(mouseX, mouseY, pmouseX, pmouseY) > 0
    || scrollValue != pScrollValue
    || data.get(selectedData).rectY != data.get(selectedData).defRectY
    || data.get(0).rectY != data.get(0).defRectY) {
    perfDataVertices = 0;
    perfEventsDrawn = 0;
    perfEventsCulled = 0;
    perfTimelineTicks = 0;
    perfTimelineLabels = 0;

    colorMode(RGB);
    background(0, 16, 32);  // Dark blue background

    // Draw top GUI bar background
    fill(0);
    noStroke();
    rect(0, 0, width, height/GUI_HEIGHT_DIVISOR);

    // Draw datasets (temperature baseline + selected overlay)
    data.get(0).draw();  // Always draw temperature
    if (selectedData > 0) data.get(selectedData).draw();  // Draw selected dataset

    // Draw bottom timeline background
    fill(0);
    noStroke();
    rect(0, height, width, -height/TIMELINE_HEIGHT_DIVISOR);


    // Draw historical events with color coding
    for (int i = 0; i < event.size(); i++) {
      if (event.get(i).type == 0) {
        event.get(i).c = color(128, 128, map(i, 0, event.size() - 1, 220, 0));  // Duration events
      } else if (event.get(i).type == 1) {
        event.get(i).c = color(150, 255, map(i, 0, event.size() - 1, 220, 0));  // Point events
      }
      event.get(i).draw();
    }

    // Draw crosshair and time readout
    if (cursor && mouseY > height/GUI_HEIGHT_DIVISOR) {
      fill(255);
      stroke(255, STROKE_ALPHA_LOW);
      line(mouseX + shift, height - height / TIMELINE_HEIGHT_DIVISOR_SMALL, mouseX + shift, height);  // Vertical line to timeline
      line(mouseX + shift, mouseY, mouseX + shift, height - height / 9);  // Vertical line to data
      textSize(height/TEXT_SIZE_DIVISOR_SMALL);
      textAlign(CENTER);
      // Format time display based on zoom level
      if (oneYear <= -33) text((((width - (mouseX + shift)) / oneYear) + currentYear), mouseX + shift, height - height / GUI_HEIGHT_DIVISOR);
      if (oneYear < -.1 && oneYear > -33) text(int(((width - (mouseX + shift)) / oneYear) + currentYear), mouseX + shift, height - height / GUI_HEIGHT_DIVISOR);
      if (oneYear >= -.1) text(nfc(((width - (mouseX + shift)) / oneYear + currentYear), -1), mouseX + shift, height - height / GUI_HEIGHT_DIVISOR);
    }

    // Calculate timeline tick spacing based on zoom level
    float v = 1;  // Tick interval in years
    yearShift = 0;  // Year alignment offset

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
    if (scrollValue > 3000000000L) v = 1000000000;
    if (scrollValue > 8000000000L) v = 5000000000L;

    // Draw right margin background
    fill(0);
    noStroke();
    rect(width, 0, shift, height);

    // Draw timeline ticks and labels
    fill(255);
    stroke(0);
    textAlign(CENTER);
    float minLabelSpacing = TIMELINE_LABEL_MIN_SPACING;
    float lastLabelX = -1000000;
    for (double i = width - (oneYear * yearShift), year = yearShift; i > 0; i -= (1.0 / scrollValue) * (1000.0 * v), year -= v) {
      String y = nf((float)(year + currentYear));
      if (scrollValue >= 50000) y = nfc((float)(year + currentYear), 0);  // Use comma formatting for large numbers
      if (year > -13800000000L) {  // Don't draw ticks beyond universe age
        perfTimelineTicks++;
        stroke(255);
        if (abs((float)i - lastLabelX) >= minLabelSpacing) {
          text(y, (float)i, height - height / 24);
          lastLabelX = (float)i;
          perfTimelineLabels++;
        }
        line((float)i, height - height / TIMELINE_HEIGHT_DIVISOR_SMALL, (float)i, height);
      }
    }

    // Draw universe age boundary line
    double x = 0L;
    x = width - (oneYear * yearShift) - (1.0 / scrollValue) * 1000.0 * 13800000000L;
    line((float)x, height, (float)x, -height);  // Vertical line at universe age

    textAlign(CORNER);
    fill(255);
    popMatrix();
    GUI();  // Draw top GUI bar

    textSize(height/TEXT_SIZE_DIVISOR_TINY);
    fill(255);
    if (perfHUD) {
      textAlign(LEFT, TOP);
      String perfLine1 = "FPS: " + nfs(frameRate, 0, 1) + "  Zoom: " + nfc(scrollValue, 0);
      String perfLine2 = "Data verts: " + perfDataVertices + "  Events drawn: " + perfEventsDrawn + "  culled: " + perfEventsCulled;
      String perfLine3 = "Timeline labels: " + perfTimelineLabels + " / ticks: " + perfTimelineTicks;
      fill(0, 32, 64, BACKGROUND_ALPHA_HIGH);
      rect(8, 8, max(textWidth(perfLine1), max(textWidth(perfLine2), textWidth(perfLine3))) + 12, height / TEXT_SIZE_DIVISOR_TINY * 4);
      fill(255);
      text(perfLine1, 14, 10);
      text(perfLine2, 14, 10 + height / TEXT_SIZE_DIVISOR_TINY);
      text(perfLine3, 14, 10 + 2 * (height / TEXT_SIZE_DIVISOR_TINY));
    }
  }
  pScrollValue = scrollValue;  // Store previous scroll value for change detection
}

void GUI() {
  textAlign(CENTER, CENTER);
  textSize(height/TEXT_SIZE_DIVISOR_LARGE);
  stroke(255);
  strokeWeight(.5);
  line(0, height/GUI_HEIGHT_DIVISOR, width, height/GUI_HEIGHT_DIVISOR);
  for (int i = 0; i < maxData; i++) {
    fill(128);
    if (mouseX > width / maxData * i && mouseX < width / maxData * i + width / maxData && mouseY < height / GUI_HEIGHT_DIVISOR) 
      if (mousePressed) selectedData = i + 1;
      else {
        fill(255);
      }

    if (i == selectedData - 1) fill(data.get(selectedData).c);  
    text(data.get(i + 1).columnY, width / (maxData * 2) + width / maxData * i, height / 26);
  }
}

void keyPressed() {
  if (key == '-' || key == 'a' || key == 'A' || keyCode == LEFT && scrollValue + scrollSpeed < MAX_SCROLL_VALUE)
    scrollValue += scrollSpeed + (scrollValue / 50.0);
  if (key == '+' || key == 'd' || key == 'D' || keyCode == RIGHT && scrollValue - scrollSpeed >= 1)
    scrollValue -= scrollSpeed + (scrollValue / 50.0);
  if (key == '0') scrollValue = 10;
  if (key == '1') scrollValue = 100;
  if (key == '2') scrollValue = 1000;
  if (key == '3') scrollValue = 10000;
  if (key == '4') scrollValue = 100000;
  if (key == '5') scrollValue = 1000000;
  if (key == '6') scrollValue = 10000000;
  if (key == '7') scrollValue = 100000000;
  if (key == '8') scrollValue = 1000000000;
  if (key == '9') scrollValue = 14000000000L;
  if (key == 'p' || key == 'P') perfHUD = !perfHUD;
  if (key == 'C' || key == 'c' || key == ' ') cursor = !cursor;
}

void mousePressed() {
  if (mouseButton == RIGHT) cursor = !cursor;
}

void mouseWheel(MouseEvent event) {
  // Scale zoom proportionally to current zoom level
  float zoomFactor = 1.0 + (0.25 * event.getCount()); // 25% zoom per wheel step
  
  // Apply zoom with bounds checking
  float newScrollValue = scrollValue * zoomFactor;
  if (newScrollValue >= 1 && newScrollValue < MAX_SCROLL_VALUE) {
    scrollValue = newScrollValue;
  }
}

void mouseDragged() {
  float deltaX = mouseX - pmouseX;
  float zoomDivisor;
  if (mouseX < width - 200) zoomDivisor = (scrollSpeed * width) - mouseX - shift;
  else zoomDivisor = scrollSpeed * 200;

  zoomDivisor = max(10, abs(zoomDivisor));
  scrollValue += deltaX * (scrollValue / zoomDivisor);
  scrollValue = constrain(scrollValue, 1, MAX_SCROLL_VALUE-1);
}
