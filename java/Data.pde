class Data {
  static final float MIN_Y_RANGE = 0.000001;
  static final float SNAP_THRESHOLD_PX = 5;
  static final float SPRING_BASE_SPEED = 5;
  static final float SPRING_DAMPING_DIVISOR = 10;
  static final float COLLAPSED_X_THRESHOLD_PX = 1.0;
  static final float MIN_PIXEL_SPACING = 0.01;
  static final float MIN_TARGET_VERTICES = 5000;
  static final float INITIAL_RENDERED_X = -999999;

  // Data properties
  int type, position;              // Rendering type, panel position
  float[] dataX, dataY;           // X and Y data arrays
  float defRectY;                 // Default Y position for panel
  float rectX, rectY, rectW, rectH;  // Panel rectangle properties
  String columnX, columnY, unit;  // Column names and unit
  float maxX, maxY, localMaxY, minX, minY, localMinY, distX, distY;  // Data ranges
  float BP = currentYear - 1950;      // BP offset used by datasets with 1950-based time axes
  float dataDist = 0;               // Distance to mouse for tooltip
  boolean yScrolling = true;        // Enable Y-axis autoscaling
  color c;                        // Dataset color

  // Constructor: load and process CSV data
  Data(Table sourceTable, String sourceColumnX, String sourceColumnY, String sourceUnit, int sourcePosition, color sourceColor, int sourceType, boolean sourceYScroll) {
    dataY = new float[sourceTable.getRowCount()];
    dataX = new float[sourceTable.getRowCount()];
    position = sourcePosition;   // Panel position (0=baseline, 1=overlay)
    columnX = sourceColumnX;     // Time column name
    columnY = sourceColumnY;     // Data column name
    unit = sourceUnit;           // Unit string
    c = sourceColor;             // Dataset color
    type = sourceType;           // Rendering type (0=line, 1=curve)
    yScrolling = sourceYScroll;  // Y-axis autoscaling

    // Set initial panel positions
    if (position == 0) rectY = height;      // Baseline panel at bottom
    if (position == 1) rectY = -height/3;   // Overlay panel at top

    // Initialize min/max values with first row
    maxX = sourceTable.getRow(0).getFloat(columnX);
    maxY = sourceTable.getRow(0).getFloat(columnY);
    minX = sourceTable.getRow(0).getFloat(columnX);
    minY = sourceTable.getRow(0).getFloat(columnY);

    // Load all data and find min/max ranges
    for (int i = 0; i < sourceTable.getRowCount(); i++) {
      TableRow row = sourceTable.getRow(i);
      dataX[i] = row.getFloat(columnX);
      dataY[i] = row.getFloat(columnY);
      if (dataX[i] > maxX) maxX = dataX[i];
      if (dataX[i] < minX) minX = dataX[i];
      if (dataY[i] > maxY) maxY = dataY[i];
      if (dataY[i] < minY) minY = dataY[i];
    }
    // Calculate data ranges
    distY = maxY - minY;
    distX = maxX - minX;
    println("Max X: " + maxX);
    println("Max Y: " + maxY);
    println("Min X: " + minX);
    println("Min Y: " + minY);
    println("dist X: " + distX);
    println("dist Y: " + distY);
  }

  void draw() {
    colorMode(RGB);
    defRectY = height/GUI_HEIGHT_DIVISOR;  // Default Y position below GUI
    rectX = width + oneYear * abs(maxX - BP);    // Panel X position (right edge)
    rectW = oneYear * abs(distX);            // Panel width based on time range

    int renderDistance = visiblePointCount();

    // Include one point beyond visible range for proper line drawing
    if (renderDistance < dataX.length) renderDistance++;

    // Calculate Y-axis scaling (global vs local)
    localMinY = minY;
    if (yScrolling) {
      // Use only visible data for Y-axis scaling
      localMaxY = dataY[0];
      localMinY = dataY[0];
      for (int i = 0; i < renderDistance; i += 1) {
        if (dataY[i] > localMaxY) localMaxY = dataY[i];
        if (dataY[i] < localMinY) localMinY = dataY[i];
      }
      distY = localMaxY-localMinY;
    }

    if (abs(distY) < MIN_Y_RANGE) distY = MIN_Y_RANGE;

    if (position == 1) {
      rectH = height/DATA_PANEL_HEIGHT_DIVISOR;
      // Robust hit-test using min/max bounds
      float rectLeft = min(rectX, rectX + rectW);
      float rectRight = max(rectX, rectX + rectW);
      float rectTop = min(rectY, rectY + rectH);
      float rectBottom = max(rectY, rectY + rectH);
      
      if (mousePressed && pmouseX >= rectLeft && pmouseX <= rectRight
        && pmouseY >= rectTop && pmouseY <= rectBottom) {
        rectY += (mouseY - pmouseY);
      } else {
        rectY = easeToTarget(rectY, defRectY);
      }
    } else if (position == 0) {
      rectH = height/DATA_PANEL_HEIGHT_DIVISOR;
      rectY = easeToTarget(rectY, rectH + defRectY);
    }

    // Special positioning for type 2 (follow mouse)
    if (type == 2) rectY = mouseY - rectH/2;

    // Draw panel background
    fill(0, 32, 64, BACKGROUND_ALPHA);
    stroke(255, STROKE_ALPHA_MEDIUM);
    noStroke();

    // Draw panel rectangle (extends to left edge when data continues off-screen)
    if (renderDistance < dataX.length) rect(rectX, rectY, -width, rectH);
    else rect(rectX, rectY, rectW, rectH);

    // Draw dataset label
    textSize(height/TEXT_SIZE_DIVISOR_MEDIUM);
    fill(c);
    textAlign(LEFT, TOP);
    if (rectX + rectW < shift && rectX > shift + textWidth(columnY)) text(columnY + ":", shift + 10, rectY + 5);
    else if (rectX + rectW > shift) text(columnY + ":", rectX + rectW + 10, rectY + 5);
    else if (rectX < shift + textWidth(columnY)) text(columnY + ":", rectX - textWidth(columnY) + 10, rectY + 5);

    // Begin drawing the data line/curve
    stroke(255);
    strokeWeight(1);
    noFill();
    float h = -rectH / distY;
    float w = oneYear;
    float x = width;
    float y = (rectY + rectH / 2) - (localMinY * h + ((h * distY) / 2));

    int lastVisibleIndex = max(0, renderDistance - 1);
    float visibleSpanPx = abs(oneYear * (dataX[0] - dataX[lastVisibleIndex]));
    boolean collapsedX = renderDistance > 1 && visibleSpanPx < COLLAPSED_X_THRESHOLD_PX;

    beginShape();
    if (type == 1) {
      fill(255);
      vertex(rectX, rectY);  // Start point for filled curve
    }
    if (type == 1) vertex(rectX, ((rectY + rectH / 2) - (minY * (rectH / distY) + (((rectH / distY) * distY) / 2))) + dataY[0] * (rectH / distY));

    if (collapsedX) {
      strokeWeight(1);
      stroke(c);
      float collapsedXPos = x - w * (dataX[0] - BP);
      float collapsedYPos = y + dataY[0] * h;
      if (type == 0) {
        point(collapsedXPos, collapsedYPos);
        perfDataVertices++;
      }
      if (type == 1) {
        curveVertex(collapsedXPos, collapsedYPos);
        perfDataVertices++;
      }
    } else {
      // Adaptive point thinning: target a bounded number of vertices per viewport
      float targetVertices = max(MIN_TARGET_VERTICES, (width - shift) * 2.0);
      float minPixelSpacing = max(MIN_PIXEL_SPACING, visibleSpanPx / targetVertices);
      float lastRenderedX = INITIAL_RENDERED_X; // Track X position of last rendered point

      for (int i = 0, pI = 1; i < renderDistance; i++) {
        float pointX = x - w * (dataX[i] - BP);
        float prevPointX = x - w * (dataX[pI] - BP);
        float pixelSpacing = abs(pointX - lastRenderedX);

        // Always render first point, then only render if spaced far enough apart
        if (i == 0 || pixelSpacing >= minPixelSpacing) {

          strokeWeight(1);
          stroke(c); 
          if (type == 0) {
            line(pointX, y + dataY[i] * h, prevPointX, y + dataY[pI] * h);
            perfDataVertices++;
          }
          if (type == 1) {
            curveVertex(pointX, y + dataY[i] * h);
            perfDataVertices++;
          }

          // Check if mouse is over this data segment for tooltip
          if (pointX <= mouseX + shift && prevPointX > mouseX + shift) {
            String mouseData = nfs(dataY[i], 0, 3) + " " + unit;
            dataDist = abs(mouseY - (y + dataY[i] * h));

            // Draw tooltip if cursor is enabled and in data area
            if (cursor && mouseY > height/GUI_HEIGHT_DIVISOR) {
              line(mouseX + shift, mouseY, mouseX + shift, y + dataY[i] * h);  // Vertical line to data point
              noStroke();
              rectMode(CORNER);

              // Position tooltip box to avoid screen edge
              if (mouseX + shift < width - textWidth(mouseData)) {
                fill(0, 32, 64, BACKGROUND_ALPHA_HIGH);
                rect(mouseX + shift, y + dataY[i] * h - 5, textWidth(mouseData) + 5, -height / TIMELINE_HEIGHT_DIVISOR_SMALL);
                textAlign(LEFT);          
                fill(c);
                text(mouseData + " ", mouseX + shift, y + dataY[i] * h - 10);
              } else if (mouseX + shift >= width - textWidth(mouseData)) { 
                fill(0, 32, 64, BACKGROUND_ALPHA_HIGH);
                rect(mouseX + shift, y + dataY[i] * h - 5, -textWidth(mouseData) + 5, -height / TIMELINE_HEIGHT_DIVISOR_SMALL);
                textAlign(RIGHT);          
                fill(c);
                text(mouseData, mouseX + shift, y + dataY[i] * h - 10);
              }
            }

          }
          lastRenderedX = pointX;
          pI = i;
        }
      }
    }

    // End the curve shape
    if (type == 1) vertex(rectX + rectW, rectY);
    endShape();
  }

  float easeToTarget(float current, float target) {
    if (current < target - SNAP_THRESHOLD_PX) return current + SPRING_BASE_SPEED + (target - current) / SPRING_DAMPING_DIVISOR;
    if (current > target + SNAP_THRESHOLD_PX) return current - SPRING_BASE_SPEED + (current - target) / -SPRING_DAMPING_DIVISOR;
    return target;
  }

  int visiblePointCount() {
    if (dataX.length == 0) return 0;

    boolean descendingTime = dataX[0] >= dataX[dataX.length-1];
    boolean noFuturePrefix = dataX[0] <= BP;

    // Fast path: descending datasets (newest to oldest), which all current files use.
    if (descendingTime && noFuturePrefix) {
      float oldestVisibleX = BP + (width - shift) / oneYear;
      int low = 0;
      int high = dataX.length - 1;
      int lastVisible = -1;

      while (low <= high) {
        int mid = low + (high - low) / 2;
        if (dataX[mid] >= oldestVisibleX) {
          lastVisible = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      return lastVisible + 1;
    }

    // Safety fallback for unexpected ordering/content.
    int count = 0;
    for (int i = 0; i < dataX.length; i++) {
      float screenX = width - oneYear * (dataX[i] - BP);
      if (screenX >= shift && screenX <= width) count++;
    }
    return count;
  }
}
