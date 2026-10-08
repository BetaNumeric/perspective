const chartTouchPointers = new Map();
let chartTouchGesture = null;
let chartTouchMode = false;
let chartTouchCursor = null;
let chartTouchClickSuppressed = false;

function chartCursorPosition() {
  if (!chartTouchMode) return { x: mouseX, y: mouseY, touch: false };
  if (!chartTouchCursor || chartTouchPointers.size) return null;
  return { x: plotXFromYear(chartTouchCursor.year) - shift, y: chartTouchCursor.y, touch: true };
}

function touchGestureSuppressesClick() {
  return chartTouchClickSuppressed;
}

function chartTouchPoint(input) {
  const bounds = chartViewportBounds();
  return { x: input.clientX - bounds.left, y: input.clientY - bounds.top };
}

function chartPinchDistance() {
  const [first, second] = chartTouchPointers.values();
  return second ? Math.hypot(first.x - second.x, first.y - second.y) : 0;
}

function chartTouchDraggedPanel() {
  return chartTouchPointers.size === 1 && chartTouchGesture?.moved && !chartTouchGesture.pinched
    ? chartTouchGesture.panel?.displaySeries() : null;
}

function beginChartTouch(input) {
  if (input.pointerType !== 'touch' || dataGuideIsOpen()) return;
  const target = input.target;
  if (!target.matches?.('canvas, #timeline-event-controls button')) return;
  const point = chartTouchPoint(input);
  if (!chartTouchPointers.size) {
    const panel = data[selectedData];
    const onPanel = target.matches('canvas') && panel && point.y >= panel.rectY && point.y <= panel.rectY + panel.rectH
      && point.x + shift >= Math.min(panel.rectX, panel.rectX + panel.rectW)
      && point.x + shift <= Math.max(panel.rectX, panel.rectX + panel.rectW);
    chartTouchGesture = { moved: false, pinched: false, horizontal: null, distance: 0, panel: onPanel ? panel : null };
    chartTouchClickSuppressed = false;
  }
  chartTouchPointers.set(input.pointerId, { ...point, startX: point.x, startY: point.y, target });
  chartTouchMode = true;
  target.setPointerCapture(input.pointerId);
  if (chartTouchPointers.size >= 2) {
    chartTouchGesture.pinched = true;
    chartTouchGesture.distance = chartPinchDistance();
    chartTouchClickSuppressed = true;
    chartTouchCursor = null;
  }
  redrawRequested = true;
}

function moveChartTouch(input) {
  if (input.pointerType === 'mouse' && chartTouchMode) {
    chartTouchMode = false;
    chartTouchCursor = null;
    redrawRequested = true;
  }
  const pointer = chartTouchPointers.get(input.pointerId);
  if (!pointer) return;
  const point = chartTouchPoint(input);
  const previousX = pointer.x;
  const previousY = pointer.y;
  Object.assign(pointer, point);
  if (chartTouchPointers.size >= 2) {
    const distance = chartPinchDistance();
    if (distance > 0 && chartTouchGesture.distance > 0) {
      setZoom(scrollValue * chartTouchGesture.distance / distance);
    }
    chartTouchGesture.distance = distance;
    return;
  }
  // Lifting one finger ends the pinch; the remaining finger cannot start a drag.
  if (chartTouchGesture.pinched) return;
  const deltaX = point.x - pointer.startX;
  const deltaY = point.y - pointer.startY;
  const wasMoved = chartTouchGesture.moved;
  if (!wasMoved && Math.hypot(deltaX, deltaY) >= 6) {
    chartTouchGesture.moved = true;
    chartTouchGesture.horizontal = Math.abs(deltaX) >= Math.abs(deltaY);
    chartTouchClickSuppressed = true;
    chartTouchCursor = null;
    redrawRequested = true;
  }
  if (chartTouchGesture.moved && chartTouchGesture.horizontal) {
    zoomByHorizontalDrag(wasMoved ? point.x - previousX : deltaX, point.x);
  }
  if (chartTouchGesture.moved && chartTouchGesture.panel) {
    chartTouchGesture.panel.rectY += wasMoved ? point.y - previousY : deltaY;
    redrawRequested = true;
  }
}

function endChartTouch(input, cancelled = false) {
  const pointer = chartTouchPointers.get(input.pointerId);
  if (!pointer) return;
  let tappedButton = null;
  if (!cancelled) moveChartTouch(input);
  if (cancelled) chartTouchClickSuppressed = true;
  else if (chartTouchPointers.size === 1 && !chartTouchGesture.moved && !chartTouchGesture.pinched) {
    if (pointer.target.matches('canvas')) {
      const point = chartTouchPoint(input);
      chartTouchCursor = { year: yearFromPlotX(point.x + shift), y: point.y };
      showCursor = true;
    } else tappedButton = pointer.target;
  }
  chartTouchPointers.delete(input.pointerId);
  if (chartTouchPointers.size >= 2) chartTouchGesture.distance = chartPinchDistance();
  if (!chartTouchPointers.size) chartTouchGesture = null;
  redrawRequested = true;
  // Cancelling native touch behavior suppresses the browser's compatibility click.
  if (tappedButton) tappedButton.click();
}

function resetChartTouch() {
  const pointers = [...chartTouchPointers.entries()];
  chartTouchPointers.clear();
  chartTouchGesture = null;
  chartTouchCursor = null;
  chartTouchClickSuppressed = true;
  redrawRequested = true;
  for (const [id, pointer] of pointers) {
    if (pointer.target.hasPointerCapture?.(id)) pointer.target.releasePointerCapture(id);
  }
}

function initializeChartTouch() {
  const viewport = document.getElementById('chart-viewport');
  if (!viewport) return;
  viewport.addEventListener('pointerdown', beginChartTouch);
  viewport.addEventListener('pointermove', moveChartTouch);
  viewport.addEventListener('pointerup', input => endChartTouch(input));
  viewport.addEventListener('pointercancel', input => endChartTouch(input, true));
  viewport.addEventListener('lostpointercapture', input => endChartTouch(input, true));
  viewport.addEventListener('contextmenu', input => input.preventDefault());
  window.addEventListener('blur', resetChartTouch);
  new ResizeObserver(resizeChartViewport).observe(viewport);
}

function preventNativeChartTouch(input) {
  const chartSurface = input.target.closest?.('canvas, #timeline-event-controls button');
  if (input.cancelable && (chartSurface || input.touches.length > 1)) input.preventDefault();
}

function preventNativeChartGesture(input) {
  if (input.cancelable && (chartTouchPointers.size || input.target.closest?.('#chart-viewport'))) input.preventDefault();
}

function initializeChartTouchGuards() {
  if (typeof document === 'undefined' || !document.addEventListener) return;
  const viewport = document.getElementById('chart-viewport');
  if (!viewport) return;
  // Capture sees touches even when a native button stops propagation. Explicitly
  // non-passive listeners let Safari cancel selection and page zoom before takeover.
  for (const name of ['touchstart', 'touchmove']) {
    viewport.addEventListener(name, preventNativeChartTouch, { capture: true, passive: false });
  }
  for (const name of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(name, preventNativeChartGesture, { capture: true, passive: false });
  }
  document.addEventListener('selectstart', input => input.preventDefault(), { capture: true });
}

// Pointer events handle chart touches. Keep p5 from forwarding them to mouseDragged.
function touchMoved() {}
