let measuredChartHeader = null;

function chartViewportBounds() {
  const viewport = typeof document !== 'undefined' && document.getElementById('chart-viewport');
  return viewport?.getBoundingClientRect?.() || { left: 0, top: 0, width: windowWidth, height: windowHeight };
}

function chartHeaderHeight() {
  if (measuredChartHeader?.width === width && measuredChartHeader.height === height) return measuredChartHeader.value;
  return width <= 600 && height >= width ? 88 : Math.max(44, height / GUI_HEIGHT_DIVISOR);
}

function chartPanelHeight() {
  return (height * 0.75 - chartHeaderHeight()) / 2;
}

function chartTextSize(divisor, minimum = 12) {
  return Math.max(minimum, height / divisor);
}

function chartTickHeight() {
  return Math.max(10, height / TIMELINE_HEIGHT_DIVISOR_SMALL);
}

function measureChartHeader() {
  const controls = typeof document !== 'undefined' && document.getElementById('dataset-controls');
  measuredChartHeader = controls?.getBoundingClientRect ? {
    width, height, value: controls.getBoundingClientRect().height
  } : null;
}

function resizeChartViewport() {
  const bounds = chartViewportBounds();
  const nextWidth = Math.max(1, Math.round(bounds.width));
  const nextHeight = Math.max(1, Math.round(bounds.height));
  if (nextWidth !== width || nextHeight !== height) {
    resetChartTouch();
    resizeCanvas(nextWidth, nextHeight);
  }
  measureChartHeader();
  redrawRequested = true;
}
