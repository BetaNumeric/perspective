class TimelineEvent {
  constructor(definition) {
    const { start, end, ...details } = definition;
    Object.assign(this, details);
    this.startYear = start;
    this.endYear = end;
    this.c = [128, 128, 128];
  }

  layout() {
    const startX = plotXFromYear(this.startYear);
    const endX = plotXFromYear(this.endYear);
    const bottom = height - height / TIMELINE_HEIGHT_DIVISOR;
    const h = height / 4 + (height / 144) * width / (startX - width - height / 10);
    const fontSize = height / TEXT_SIZE_DIVISOR_SMALL;
    textSize(fontSize);
    const labelWidth = textWidth(this.name) + 10;
    if (this.type === 0) {
      const left = Math.max(shift, startX);
      const right = Math.min(width, endX);
      const top = height - h;
      if (right <= left || bottom <= top) return null;
      return { startX, left, right, top, bottom, fontSize,
        label: { left, top, width: Math.min(labelWidth, width - left), height: fontSize + 6 } };
    }
    const top = height - h / 2 - height / TIMELINE_HEIGHT_DIVISOR_SMALL;
    const left = Math.max(shift, startX);
    const right = Math.min(width, startX + labelWidth);
    if (right <= left) return null;
    return { startX, left, right, top, bottom: top + height / TIMELINE_HEIGHT_DIVISOR_SMALL, fontSize,
      label: { left, top, width: right - left, height: height / TIMELINE_HEIGHT_DIVISOR_SMALL } };
  }

  draw() {
    const bounds = this.layout();
    if (!bounds) return;
    colorMode(HSB, 255);
    noStroke();
    fill(this.c);
    rect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
    strokeWeight(0.7);
    stroke(255);
    line(bounds.startX, height, bounds.startX, bounds.top);
    noStroke();
    fill(255);
    textAlign(LEFT, TOP);
    textSize(bounds.fontSize);
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(bounds.label.left, bounds.label.top, bounds.label.width, bounds.label.height);
    drawingContext.clip();
    text(this.name, (this.type === 0 ? bounds.left : bounds.startX) + 5, bounds.top + 3);
    drawingContext.restore();
  }

  dateText() {
    const format = calendarYear => {
      if (calendarYear < -10000) {
        const age = 1950 - calendarYear;
        if (age >= 1000000000) return Number((age / 1000000000).toPrecision(3)) + ' billion years BP';
        if (age >= 1000000) return Number((age / 1000000).toPrecision(3)) + ' million years BP';
        return Math.round(age).toLocaleString('en') + ' years BP';
      }
      if (this.exactDate) {
        return new Date(millisecondsFromDecimalYear(calendarYear)).toLocaleDateString('en-GB',
          { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
      }
      const year = Math.round(calendarYear);
      return year <= 0 ? (1 - year).toLocaleString('en') + ' BCE' : year + ' CE';
    };
    const start = format(this.startYear);
    const period = this.type === 1 ? start : start + ' – ' + (this.ongoing ? 'present' : format(this.endYear));
    return (this.approximate ? 'Approximately ' : '') + period;
  }
}
