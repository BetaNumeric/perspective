function createTimelineEvents() {
  event = [];
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
  event.push(new TimelineEvent(0, 'Written records (approx.)', -3499, currentYear, 30));
  event.push(new TimelineEvent(0, 'Life of Confucius', -550, -478, 35)); // 551–479 BCE on the astronomical year axis.
  event.push(new TimelineEvent(0, 'Life of Muhammad (approx.)', 570, 632, 35));
  event.push(new TimelineEvent(0, 'Life of Jesus (approx.)', -3, 30, 35));
  event.push(new TimelineEvent(0, 'Crusades', 1095, 1291, 255));
  event.push(new TimelineEvent(0, 'European Colonization', 1492, currentYear, 40));
  event.push(new TimelineEvent(0, 'Industrial Revolution', 1760, currentYear, 50));
  event.push(new TimelineEvent(0, 'WWI', decimalYearFromYmd(1914, 7, 28), decimalYearFromYmd(1918, 11, 11), 60));
  event.push(new TimelineEvent(0, 'WWII', decimalYearFromYmd(1939, 9, 1), decimalYearFromYmd(1945, 9, 2), 70));
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
  const parisAgreementDate = decimalYearFromYmd(2015, 12, 12);
  event.push(new TimelineEvent(1, 'Paris Agreement adopted', parisAgreementDate, parisAgreementDate, 255));
  event.push(new TimelineEvent(1, 'COVID-19', 2020.082137, 2023.342238, 255));

}

class TimelineEvent {
  static EVENT_CULL_MARGIN = 200;

  constructor(eventType, eventName, eventStart, eventEnd, eventHue) {
    this.type = eventType;                    // Event type (0=duration band, 1=point event)
    this.name = eventName;
    this.start = currentYear - eventStart;    // Start/end times
    this.end = currentYear - eventEnd;
    this.c = [Math.max(0, Math.min(255, eventHue)), 255, 128];
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

        return;
      }
    } else if (this.type === 1) {
      if (startX < visibleLeft || startX > visibleRight) {

        return;
      }
    }

    if (this.type === 0) {
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
