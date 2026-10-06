function sourceLabelForDataPoint(sample) {
  return sample?.source ? SOURCE_INFO[sample.source]?.short || sample.source : '';
}

function wrapTooltipText(value, availableWidth) {
  const lines = [];
  let current = '';
  for (const word of value.split(/\s+/)) {
    const candidate = current ? current + ' ' + word : word;
    if (current && textWidth(candidate) > availableWidth) {
      lines.push(current);
      current = word;
    } else current = candidate;
  }
  if (current) lines.push(current);
  return lines;
}

function panelTargetY(position) {
  return height / GUI_HEIGHT_DIVISOR + (position === 0 ? height / DATA_PANEL_HEIGHT_DIVISOR : 0);
}

class Data {
  static MIN_Y_RANGE = 0.000001;
  static SNAP_THRESHOLD_PX = 5;
  static SPRING_BASE_SPEED = 5;
  static SPRING_DAMPING_DIVISOR = 10;

  // Copy a parsed source table into arrays for drawing.
  constructor(sourceTable, sourceColumnX, sourceColumnY, sourceUnit, sourcePosition, sourceColor, sourceYScroll, displayName = sourceColumnY) {
    this.position = sourcePosition;
    this.BP = currentYear - 1950;
    const metadata = sourceTable?.seriesRows || sourceTable?.temperatureRows;
    const samples = [];
    for (let i = 0; i < (sourceTable?.getRowCount() || 0); i++) {
      const row = sourceTable.getRow(i);
      const time = row.getNum(sourceColumnX);
      const value = row.getNum(sourceColumnY);
      if (Number.isFinite(time) && Number.isFinite(value) && time <= this.BP) {
        samples.push({ time, value, metadata: metadata?.[i] });
      }
    }
    // Visibility and nearest-sample searches require newest-first, past-only data.
    samples.sort((a, b) => b.time - a.time);
    this.dataX = samples.map(sample => sample.time);
    this.dataY = samples.map(sample => sample.value);
    this.seriesRows = metadata ? samples.map(sample => sample.metadata) : null;
    this.hasSourceJoins = new Set((this.seriesRows || []).map(sourceSegment).filter(Boolean)).size > 1;
    this.hasUncertaintyBands = (this.seriesRows || []).some(row => row.band);
    this.annualSeries = null;
    this.defRectY = 0;
    this.rectX = 0;
    this.rectY = 0;
    this.rectW = 0;
    this.rectH = 0;
    this.columnY = sourceColumnY;
    this.displayName = displayName;
    this.unit = sourceUnit;
    this.maxX = 0;
    this.maxY = 0;
    this.localMaxY = 0;
    this.minX = 0;
    this.minY = 0;
    this.localMinY = 0;
    this.distX = 0;
    this.distY = 0;
    this.yScrolling = sourceYScroll;
    this.c = sourceColor;

    // Set initial panel positions
    if (this.position === 0) this.rectY = height;      // Baseline panel at bottom
    if (this.position === 1) this.rectY = -height / 3; // Overlay panel at top

    if (samples.length === 0) return;
    this.maxX = this.dataX[0];
    this.minX = this.dataX.at(-1);
    this.maxY = -Infinity;
    this.minY = Infinity;

    for (let i = 0; i < samples.length; i++) {
      const [lower, upper] = this.valueBoundsAt(i);
      if (upper > this.maxY) this.maxY = upper;
      if (lower < this.minY) this.minY = lower;
    }
    this.distY = this.maxY - this.minY;
    this.distX = this.maxX - this.minX;
    if (sourceTable.annualTable) {
      this.annualSeries = new Data(sourceTable.annualTable, sourceColumnX, sourceColumnY,
        sourceUnit, sourcePosition, sourceColor, sourceYScroll, displayName);
    }
  }

  displaySeries() {
    return this.annualSeries && oneYear !== 0 && Math.abs((width - shift) / oneYear) > SOLAR_ANNUAL_VIEW_YEARS
      ? this.annualSeries : this;
  }

  draw() {
    const display = this.displaySeries();
    if (display !== this) {
      display.rectY = this.rectY;
      display.position = this.position;
      display.yScrolling = this.yScrolling;
      display.draw();
      for (const key of ['rectX', 'rectY', 'rectW', 'rectH', 'localMinY', 'localMaxY', 'distY']) {
        this[key] = display[key];
      }
      return;
    }
    if (this.dataX.length === 0) {
      this.rectY = panelTargetY(this.position);
      return;
    }
    colorMode(RGB);
    this.defRectY = height / GUI_HEIGHT_DIVISOR;
    this.rectX = width - oneYear * (this.maxX - this.BP); // Panel X position (newest observation)
    this.rectW = oneYear * abs(this.distX);        // Panel width based on time range

    const visibleCount = this.visiblePointCount();
    let renderDistance = visibleCount;

    // Include one point beyond visible range for proper line drawing
    if (renderDistance < this.dataX.length) renderDistance++;

    // Calculate Y-axis scaling (global vs local)
    this.localMinY = this.minY;
    this.localMaxY = this.maxY;
    this.distY = this.maxY - this.minY;
    if (this.yScrolling && visibleCount > 0) {
      // Fit visible samples and the portion of a connecting line at the left edge.
      this.localMaxY = this.dataY[0];
      this.localMinY = this.dataY[0];
      for (let i = 0; i < visibleCount; i += 1) {
        const [lower, upper] = this.valueBoundsAt(i);
        if (upper > this.localMaxY) this.localMaxY = upper;
        if (lower < this.localMinY) this.localMinY = lower;
      }
      const edgeBounds = this.leftEdgeValueBounds(visibleCount);
      if (edgeBounds) {
        this.localMinY = min(this.localMinY, edgeBounds[0]);
        this.localMaxY = max(this.localMaxY, edgeBounds[1]);
      }
      this.distY = this.localMaxY - this.localMinY;
    }

    if (abs(this.distY) < Data.MIN_Y_RANGE) this.distY = Data.MIN_Y_RANGE;

    if (this.position === 1) {
      this.rectH = height / DATA_PANEL_HEIGHT_DIVISOR;
      const rectLeft = min(this.rectX, this.rectX + this.rectW);
      const rectRight = max(this.rectX, this.rectX + this.rectW);
      const rectTop = min(this.rectY, this.rectY + this.rectH);
      const rectBottom = max(this.rectY, this.rectY + this.rectH);

      if (!dataGuideIsOpen() && mouseIsPressed && pmouseX >= rectLeft && pmouseX <= rectRight
        && pmouseY >= rectTop && pmouseY <= rectBottom) {
        this.rectY += (mouseY - pmouseY);
      } else {
        this.rectY = this.easeToTarget(this.rectY, this.defRectY);
      }
    } else if (this.position === 0) {
      this.rectH = height / DATA_PANEL_HEIGHT_DIVISOR;
      this.rectY = this.easeToTarget(this.rectY, this.rectH + this.defRectY);
    }

    if (visibleCount === 0) {
      noStroke();
      fill(0, 32, 64, BACKGROUND_ALPHA);
      rect(shift, this.rectY, width - shift, this.rectH);
      fill(this.c);
      textSize(height / TEXT_SIZE_DIVISOR_MEDIUM);
      textAlign(LEFT, TOP);
      text(this.displayName + ':', shift + 10, this.rectY + 5);
      textSize(height / TEXT_SIZE_DIVISOR_SMALL);
      text('No samples in view. Zoom out.', shift + 10, this.rectY + 35);
      return;
    }

    fill(0, 32, 64, BACKGROUND_ALPHA);
    noStroke();

    // Draw panel rectangle (extends to left edge when data continues off-screen)
    if (renderDistance < this.dataX.length) rect(this.rectX, this.rectY, -width, this.rectH);
    else rect(this.rectX, this.rectY, this.rectW, this.rectH);

    textSize(height / TEXT_SIZE_DIVISOR_MEDIUM);
    fill(this.c);
    textAlign(LEFT, TOP);
    text(this.displayName + ':', shift + 10, this.rectY + 5);

    // The extra point draws the connecting line at the left edge. Only its
    // visible intersection contributes to scaling; its off-screen value does not.
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(shift, this.rectY, width - shift, this.rectH);
    drawingContext.clip();
    stroke(255);
    strokeWeight(1);
    noFill();
    const h = -this.rectH / this.distY;
    const w = oneYear;
    const x = width;
    const y = (this.rectY + this.rectH / 2) - (this.localMinY * h + ((h * this.distY) / 2));

    this.drawUncertaintyBands(renderDistance, x, y, w, h);
    const plottedIndices = this.extremaPreservingIndices(renderDistance);
    let previousIndex = null;
    stroke(this.c);
    for (const index of plottedIndices) {
      const sample = this.seriesRows?.[index];
      strokeWeight(sample?.mode === 'points' ? 3 : 1);
      drawingContext.setLineDash(sample?.mode === 'projection' ? [5, 4] : []);
      stroke(this.c);
      const pointX = x - w * (this.dataX[index] - this.BP);
      const pointY = y + this.dataY[index] * h;
      if (previousIndex === null || !this.canConnectIndices(previousIndex, index)) {
        point(pointX, pointY);
      } else {
        const previousX = x - w * (this.dataX[previousIndex] - this.BP);
        const previousY = y + this.dataY[previousIndex] * h;
        line(previousX, previousY, pointX, pointY);
      }

      previousIndex = index;
    }
    drawingContext.restore();
    if (this.hasSourceJoins) this.drawSourceJoins(renderDistance);
    this.drawDataTooltip(y, h, renderDistance);
  }

  hasUncertaintyBand(index) {
    const row = this.seriesRows?.[index];
    return row?.band && Number.isFinite(row.lower) && Number.isFinite(row.upper);
  }

  valueBoundsAt(index) {
    const value = this.dataY[index];
    const row = this.seriesRows?.[index];
    return this.hasUncertaintyBand(index)
      ? [min(value, row.lower), max(value, row.upper)] : [value, value];
  }

  leftEdgeValueBounds(visibleCount) {
    if (visibleCount < 1 || visibleCount >= this.dataX.length || oneYear >= 0) return null;
    const newer = visibleCount - 1;
    const older = visibleCount;
    if (!this.canConnectIndices(newer, older)) return null;
    const edgeTime = this.BP + (width - shift) / oneYear;
    const fraction = (edgeTime - this.dataX[newer]) / (this.dataX[older] - this.dataX[newer]);
    if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) return null;
    const interpolate = (a, b) => a + fraction * (b - a);
    const value = interpolate(this.dataY[newer], this.dataY[older]);
    if (this.hasUncertaintyBand(newer) && this.hasUncertaintyBand(older)) {
      return [min(value, interpolate(this.seriesRows[newer].lower, this.seriesRows[older].lower)),
        max(value, interpolate(this.seriesRows[newer].upper, this.seriesRows[older].upper))];
    }
    return [value, value];
  }

  drawUncertaintyBands(renderDistance, x, y, w, h) {
    if (!this.hasUncertaintyBands) return;
    // Draw the published bounds at their original bin midpoints. Like the
    // central line, the band connects neighbors only within the same source.
    push();
    noStroke();
    fill(this.c);
    drawingContext.globalAlpha = 0.18;
    let indices = [];
    for (let i = 0; i <= renderDistance; i++) {
      const valid = i < renderDistance && this.hasUncertaintyBand(i);
      if (indices.length && (!valid || !this.canConnectIndices(i - 1, i))) {
        if (indices.length > 1) {
          beginShape();
          for (const index of indices) {
            vertex(x - w * (this.dataX[index] - this.BP), y + this.seriesRows[index].upper * h);
          }
          for (const index of indices.slice().reverse()) {
            vertex(x - w * (this.dataX[index] - this.BP), y + this.seriesRows[index].lower * h);
          }
          endShape(CLOSE);
        }
        indices = [];
      }
      if (valid) indices.push(i);
    }
    pop();
  }

  extremaPreservingIndices(renderDistance) {
    if (renderDistance <= 0) return [];
    const buckets = new Map();
    const selected = new Set([0, renderDistance - 1]);
    for (let i = 0; i < renderDistance; i++) {
      if (i > 0 && !this.canConnectIndices(i - 1, i)) {
        selected.add(i - 1);
        selected.add(i);
      }
      const screenX = width - oneYear * (this.dataX[i] - this.BP);
      if (!Number.isFinite(screenX) || !Number.isFinite(this.dataY[i])) continue;
      const pixel = Math.floor(screenX);
      const bucket = buckets.get(pixel);
      if (!bucket) {
        buckets.set(pixel, { first: i, last: i, min: i, max: i });
      } else {
        bucket.last = i;
        if (this.dataY[i] < this.dataY[bucket.min]) bucket.min = i;
        if (this.dataY[i] > this.dataY[bucket.max]) bucket.max = i;
      }
    }
    for (const bucket of buckets.values()) {
      selected.add(bucket.first);
      selected.add(bucket.last);
      selected.add(bucket.min);
      selected.add(bucket.max);
    }
    return [...selected].sort((a, b) => a - b);
  }

  canConnectIndices(first, second) {
    if (!this.seriesRows) return true;
    const a = this.seriesRows[first];
    const b = this.seriesRows[second];
    if (a.mode === 'points' || b.mode === 'points') return false;
    if (sourceSegment(a) !== sourceSegment(b)) return false;
    // Thinning may skip hundreds of valid samples. Check the original adjacent
    // gaps, rather than treating the distance between plotted points as a gap.
    for (let i = Math.min(first, second) + 1; i <= Math.max(first, second); i++) {
      const newer = this.seriesRows[i - 1];
      const older = this.seriesRows[i];
      if (sourceSegment(newer) !== sourceSegment(older)
        || Math.abs(newer.time - older.time) > Math.min(newer.maxGapYears ?? Infinity, older.maxGapYears ?? Infinity)) return false;
    }
    return true;
  }

  drawSourceJoins(renderDistance) {
    // Older visible joins take priority when recent transitions share a few pixels.
    const labelRightLimit = width - 8;
    const occupiedLabels = [];
    const labels = [];
    textSize(max(11, min(14, height / TEXT_SIZE_DIVISOR_SMALL)));
    strokeWeight(1);
    for (let i = 1; i < renderDistance; i++) {
      const newer = this.seriesRows[i - 1];
      const older = this.seriesRows[i];
      if (sourceSegment(newer) === sourceSegment(older)) continue;
      const transitionTime = Number.isFinite(older.joinTime) && older.joinTime >= older.time && older.joinTime <= newer.time
        ? older.joinTime : (this.dataX[i - 1] + this.dataX[i]) / 2;
      const transitionX = width - oneYear * (transitionTime - this.BP);
      if (transitionX < shift || transitionX > width) continue;
      stroke(180, 110);
      for (let y = this.rectY + 45; y < this.rectY + this.rectH; y += 10) {
        line(transitionX, y, transitionX, min(y + 4, this.rectY + this.rectH));
      }
      noStroke();
      fill(190);
      textAlign(RIGHT, BOTTOM);
      const label = (SOURCE_INFO[sourceSegment(older)]?.short || sourceSegment(older)) + ' / ' +
        (SOURCE_INFO[sourceSegment(newer)]?.short || sourceSegment(newer));
      labels.push({ label, x: transitionX });
    }
    labels.sort((a, b) => a.x - b.x);
    for (const { label, x } of labels) {
      const labelRight = min(x - 4, labelRightLimit);
      const labelLeft = labelRight - textWidth(label);
      if (labelLeft >= shift && occupiedLabels.every(([left, right]) => labelLeft > right + 8 || labelRight < left - 8)) {
        noStroke();
        fill(0, 32, 64, BACKGROUND_ALPHA_HIGH);
        rect(labelLeft - 2, this.rectY + this.rectH - 7 - height / TEXT_SIZE_DIVISOR_TINY,
          labelRight - labelLeft + 4, height / TEXT_SIZE_DIVISOR_TINY + 6);
        fill(220);
        text(label, labelRight, this.rectY + this.rectH - 4);
        occupiedLabels.push([labelLeft, labelRight]);
      }
    }
  }

  nearestVisibleIndex(timeValue, renderDistance) {
    if (renderDistance <= 0 || !Number.isFinite(timeValue)) return -1;
    const newest = this.dataX[0], oldest = this.dataX[renderDistance - 1];
    // Screen-to-time conversion can round an endpoint by a few floating-point steps.
    const tolerance = 4 * Number.EPSILON * Math.max(1, Math.abs(timeValue), Math.abs(newest), Math.abs(oldest));
    if (timeValue > newest + tolerance || timeValue < oldest - tolerance) return -1;
    timeValue = Math.max(oldest, Math.min(newest, timeValue));
    let low = 0;
    let high = renderDistance - 1;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (this.dataX[mid] > timeValue) low = mid + 1;
      else high = mid;
    }
    if (low > 0 && Math.abs(this.dataX[low - 1] - timeValue) < Math.abs(this.dataX[low] - timeValue)) return low - 1;
    return low;
  }

  drawDataTooltip(y, h, renderDistance) {
    if (!showCursor || mouseY <= height / GUI_HEIGHT_DIVISOR || mouseY >= height - height / TIMELINE_HEIGHT_DIVISOR) return;
    const timeAtMouse = this.BP + (width - mouseX - shift) / oneYear;
    let index = this.nearestVisibleIndex(timeAtMouse, renderDistance);
    if (index < 0) return;
    // Several proxy estimates can share an age. Let the cursor choose between
    // their values instead of always exposing only the first site's estimate.
    let firstAtAge = index;
    while (firstAtAge > 0 && this.dataX[firstAtAge - 1] === this.dataX[index]) firstAtAge--;
    for (let i = firstAtAge; i < renderDistance && this.dataX[i] === this.dataX[index]; i++) {
      if (abs(mouseY - (y + this.dataY[i] * h)) < abs(mouseY - (y + this.dataY[index] * h))) index = i;
    }
    const pointY = y + this.dataY[index] * h;
    textSize(max(11, min(14, height / TEXT_SIZE_DIVISOR_SMALL)));
    const valueText = this.formatTooltipValue(this.dataY[index]);
    const mouseData = this.unit ? valueText + ' ' + this.unit : valueText;
    const sourceLabel = sourceLabelForDataPoint(this.seriesRows?.[index]);
    const sample = this.seriesRows?.[index];
    const sourceInfo = SOURCE_INFO[sample?.source];
    let sampleLine = '';
    let uncertaintyLine = '';
    if (sample) {
      sampleLine = sampleTimeLabel(sample);
      if (sourceInfo?.period) sampleLine += ' • ' + sourceInfo.period;
      if (sample.site) sampleLine += ' • site ' + sample.site;
      if (sample.station) sampleLine += ' • ' + sample.station;
      if (Number.isFinite(sample.lower) && Number.isFinite(sample.upper)) {
        uncertaintyLine = this.formatTooltipValue(sample.lower) + ' to ' + this.formatTooltipValue(sample.upper) +
          (this.unit ? ' ' + this.unit : '') + ' • ' + (sourceInfo?.uncertainty || sample.uncertainty || 'range');
      }
    }
    const lines = [mouseData + (sourceLabel ? ' • ' + sourceLabel : ''), sampleLine, uncertaintyLine,
      sample?.source?.startsWith('solar-') ? sample.note : ''].filter(Boolean)
      .flatMap(value => wrapTooltipText(value, min(320, width - 32)));
    const tooltipWidth = max(...lines.map(value => textWidth(value))) + 12;
    const lineHeight = max(16, height / TIMELINE_HEIGHT_DIVISOR_SMALL);
    const tooltipHeight = lines.length * lineHeight + 8;
    const tooltipX = constrain(mouseX + shift, 8, width - tooltipWidth - 8);
    const tooltipY = constrain(pointY - tooltipHeight - 8, height / GUI_HEIGHT_DIVISOR + 4,
      height - height / TIMELINE_HEIGHT_DIVISOR - tooltipHeight - 4);
    stroke(this.c);
    line(mouseX + shift, mouseY, mouseX + shift, pointY);
    noStroke();
    rectMode(CORNER);
    fill(0, 32, 64, BACKGROUND_ALPHA_HIGH);
    rect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
    textAlign(LEFT, TOP);
    for (let i = 0; i < lines.length; i++) {
      fill(i === 0 ? this.c : 220);
      text(lines[i], tooltipX + 6, tooltipY + 4 + i * lineHeight);
    }
  }

  easeToTarget(current, target) {
    if (current < target - Data.SNAP_THRESHOLD_PX) return current + Data.SPRING_BASE_SPEED + (target - current) / Data.SPRING_DAMPING_DIVISOR;
    if (current > target + Data.SNAP_THRESHOLD_PX) return current - Data.SPRING_BASE_SPEED + (current - target) / -Data.SPRING_DAMPING_DIVISOR;
    return target;
  }

  visiblePointCount() {
    if (this.dataX.length === 0) return 0;
    const oldestVisibleX = this.BP + (width - shift) / oneYear;
    let low = 0;
    let high = this.dataX.length - 1;
    let lastVisible = -1;
    while (low <= high) {
      const mid = low + Math.floor((high - low) / 2);
      if (this.dataX[mid] >= oldestVisibleX) {
        lastVisible = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return lastVisible + 1;
  }

  tooltipDecimalPlaces() {
    if (this.columnY === 'Eccentricity') return 6;
    if (this.columnY === 'Volcanic Activity') return 6;
    if (this.columnY === 'Population') return 0;
    return 3;
  }

  formatTooltipValue(value) {
    return nfs(value, 0, this.tooltipDecimalPlaces());
  }
}
