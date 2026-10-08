function selectComparison(upperIndex) {
  if (!data[upperIndex] || upperIndex < 1) return;
  selectedData = upperIndex;
  updateComparisonControls();
  redrawRequested = true;
}

function updateComparisonControls() {
  if (typeof document === 'undefined') return;
  for (const button of document.querySelectorAll?.('[data-comparison]') || []) {
    const index = Number(button.dataset.comparison);
    const selected = index === selectedData;
    button.disabled = !data[index] || Boolean(startupError);
    button.setAttribute('aria-pressed', String(selected));
    button.style.color = selected ? data[index]?.c?.toString() || '' : '';
  }
  const canvas = document.querySelector?.('canvas');
  if (canvas && data[selectedData]) {
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', data[selectedData].displayName + ' compared with global temperature on a shared linear time axis');
  }
}

function initializeControls() {
  const infoButton = document.getElementById('data-info-button');
  const guide = document.getElementById('about-data');
  const buttons = [...document.querySelectorAll('[data-comparison]')];
  for (const button of [...buttons, infoButton]) {
    // Native controls own their pointer and activation keys, keeping chart input separate.
    for (const eventName of ['pointerdown', 'mousedown', 'touchstart', 'wheel']) {
      button.addEventListener(eventName, event => event.stopPropagation());
    }
    button.addEventListener('keydown', event => {
      if (event.key === ' ' || event.key === 'Enter') event.stopPropagation();
    });
  }
  for (const [index, button] of buttons.entries()) {
    button.addEventListener('click', () => selectComparison(Number(button.dataset.comparison)));
    button.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % buttons.length;
      else if (event.key === 'ArrowLeft') next = (index + buttons.length - 1) % buttons.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = buttons.length - 1;
      else return;
      event.preventDefault();
      event.stopPropagation();
      buttons[next].focus();
      selectComparison(Number(buttons[next].dataset.comparison));
    });
  }
  infoButton.addEventListener('click', showDataGuide);
  guide.addEventListener('click', event => {
    if (event.target !== guide) return;
    const bounds = guide.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom) guide.close();
  });
  guide.addEventListener('close', () => { redrawRequested = true; });
  initializeTimelineControls();
  updateComparisonControls();
}

function showDataGuide() {
  if (typeof document === 'undefined') return;
  const guide = document.getElementById('about-data');
  if (guide && !guide.open) {
    closeTimelineDetails();
    guide.showModal();
  }
}

function dataGuideIsOpen() {
  return typeof document !== 'undefined' && document.getElementById('about-data')?.open;
}

function setZoom(value) {
  if (!Number.isFinite(value)) return;
  if (timelineDetailsEvent && !timelineDetailsPinned) closeTimelineDetails();
  scrollValue = constrain(value, 1, MAX_SCROLL_VALUE);
  redrawRequested = true;
}

function keyPressed() {
  if (dataGuideIsOpen()) return;
  if (key === '-' || key === 'a' || key === 'A' || keyCode === LEFT_ARROW) {
    setZoom(scrollValue + 1 + scrollValue / 50);
  }
  if (key === '+' || key === 'd' || key === 'D' || keyCode === RIGHT_ARROW) {
    setZoom(scrollValue - 1 - scrollValue / 50);
  }
  const presets = [10, 100, 1000, 10000, 100000, 1000000, 10000000, 100000000, 1000000000, 14000000000];
  if (/^[0-9]$/.test(key)) setZoom(presets[Number(key)]);
  if (key === 'C' || key === 'c' || key === ' ') { showCursor = !showCursor; redrawRequested = true; }
}

function mousePressed() {
  if (dataGuideIsOpen()) return;
  if (mouseButton === RIGHT) { showCursor = !showCursor; redrawRequested = true; }
}

function mouseWheel(event) {
  if (dataGuideIsOpen()) return true;
  // Opposite wheel movements undo one another, even for large trackpad deltas.
  const wheelSteps = event.delta / 100;
  const zoomFactor = Math.pow(1.25, wheelSteps);

  const newScrollValue = scrollValue * zoomFactor;
  setZoom(newScrollValue);

  return false;
}

function mouseMoved() {
  // p5 can update its previous-pointer coordinates before the next draw.
  // Explicitly invalidate the settled view so hover text always follows input.
  redrawRequested = true;
}

function mouseDragged() {
  if (dataGuideIsOpen()) return;
  const deltaX = mouseX - pmouseX;
  let zoomDivisor;
  if (mouseX < width - 200) zoomDivisor = width - mouseX - shift;
  else zoomDivisor = 200;

  zoomDivisor = max(10, abs(zoomDivisor));
  setZoom(scrollValue + deltaX * (scrollValue / zoomDivisor));
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  redrawRequested = true;
}
