class Event {
  static final float EVENT_CULL_MARGIN = 200;

  // Event properties
  int type;        // Event type (0=duration band, 1=point event)
  String name;     // Event name/label
  float start, end;  // Start/end times
  color c;         // Event color

  // Constructor: create a timeline event
  Event(int eventType, String eventName, float eventStart, float eventEnd, int eventHue) {
    name = eventName;
    start = currentYear - eventStart;  // Convert absolute year into offset from currentYear
    end = currentYear - eventEnd;
    c = color(constrain(eventHue, 0, 255), 255, 128);     // HSB color (hue, saturation, brightness)
    type = eventType;
  }
  void draw() {
    colorMode(HSB);
    float w = (start * oneYear) - (end * oneYear);    // Event width in pixels
    float startX = width + (start * oneYear) + 1;
    float endX = width + (end * oneYear);
    float y = height / TIMELINE_HEIGHT_DIVISOR;         // Y position on timeline
    float h = (height / 4) + (height / 144) * width / ((start * oneYear) - height / 10);  // Zoom-responsive event height
    textAlign(LEFT, TOP);
    textSize(height/TEXT_SIZE_DIVISOR_SMALL);

    float visibleLeft = -EVENT_CULL_MARGIN;
    float visibleRight = width + EVENT_CULL_MARGIN;

    if (type == 0) {
      float bandLeft = min(startX, endX);
      float bandRight = max(startX, endX);
      if (bandRight < visibleLeft || bandLeft > visibleRight) {
        perfEventsCulled++;
        return;
      }
    } else if (type == 1) {
      if (startX < visibleLeft || startX > visibleRight) {
        perfEventsCulled++;
        return;
      }
    }

    perfEventsDrawn++;
    
    if (type == 0) {
      // Draw duration events as bands
      noStroke();
      fill(c);
      rect(endX, height - y, w, -h + y);  // Event band
      strokeWeight(0.7);
      stroke(255);
      line(startX, height, startX, height - h);  // Start line
      fill(255);
      text(name, (width + oneYear * start) + 5, height - h);  // Event label
    } else if (type == 1) {
      // Draw point events as labels with vertical lines
      fill(c);
      noStroke();
      rect(startX, height - h / 2 - height / TIMELINE_HEIGHT_DIVISOR_SMALL, textWidth(name) + 10, height / TIMELINE_HEIGHT_DIVISOR_SMALL);
      strokeWeight(0.7);
      stroke(255);
      line(startX, height, startX, height - h / 2 - height / TIMELINE_HEIGHT_DIVISOR_SMALL);  // Event line
      fill(255);
      text(name, (width + oneYear * start) + 5, height - h / 2 - height / TIMELINE_HEIGHT_DIVISOR_SMALL);  // Event label
    }
  }
}
