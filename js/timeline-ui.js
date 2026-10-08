const timelineEventControls = new Map();
let timelineDetailsEvent = null;
let timelineDetailsPinned = false;
let timelineDetailsTimer = null;
let timelineDetailsDismissedEvent = null;

function initializeTimelineControls() {
  if (typeof document === 'undefined' || !document.createElement) return;
  const card = document.getElementById('timeline-details');
  const controls = document.getElementById('timeline-event-controls');
  if (!card || !controls) return;
  card.querySelector('button').addEventListener('click', () => closeTimelineDetails(true));
  card.addEventListener('pointerenter', cancelTimelineDetailsTimer);
  card.addEventListener('pointerleave', scheduleTimelineDetailsClose);
  // Reading or scrolling the card must not activate the chart beneath it.
  for (const name of ['pointerdown', 'mousedown', 'touchstart', 'wheel', 'keydown']) {
    card.addEventListener(name, input => input.stopPropagation());
  }
  document.addEventListener('pointerdown', input => {
    if (!card.contains(input.target) && !controls.contains(input.target)) closeTimelineDetails();
  });
  document.addEventListener('keydown', input => {
    if (input.key !== 'Escape' || !timelineDetailsEvent) return;
    input.preventDefault();
    input.stopPropagation();
    closeTimelineDetails(true);
  }, true);
}

function createTimelineEventControls() {
  if (typeof document === 'undefined' || !document.createElement) return;
  const controls = document.getElementById('timeline-event-controls');
  if (!controls) return;
  closeTimelineDetails();
  timelineEventControls.clear();
  controls.replaceChildren();
  for (const landmark of event) {
    const button = document.createElement('button');
    button.type = 'button';
    button.hidden = true;
    button.setAttribute('aria-label', landmark.name + ', ' + landmark.dateText());
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', 'timeline-details');
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('pointerenter', input => {
      if (input.pointerType === 'touch') return;
      timelineDetailsDismissedEvent = null;
      showTimelineDetails(landmark);
    });
    button.addEventListener('pointerleave', () => {
      timelineDetailsDismissedEvent = null;
      if (timelineDetailsEvent === landmark) scheduleTimelineDetailsClose();
    });
    button.addEventListener('focus', () => showTimelineDetails(landmark));
    button.addEventListener('blur', input => {
      timelineDetailsDismissedEvent = null;
      if (timelineDetailsEvent === landmark && !document.getElementById('timeline-details').contains(input.relatedTarget)) {
        scheduleTimelineDetailsClose();
      }
    });
    enableTimelineLabelDragging(button, landmark);
    button.addEventListener('keydown', input => {
      if (input.key === 'Enter' || input.key === ' ') input.stopPropagation();
    });
    controls.append(button);
    timelineEventControls.set(landmark, button);
  }
}

function enableTimelineLabelDragging(button, landmark) {
  let press = null;
  let dragged = false;
  const trackMovement = input => {
    if (!press || input.pointerId !== press.id) return;
    if (Math.hypot(input.clientX - press.x, input.clientY - press.y) < 6) return;
    dragged = true;
    button.setAttribute('data-dragging', 'true');
    if (timelineDetailsEvent && !timelineDetailsPinned) closeTimelineDetails();
  };
  const finish = () => {
    press = null;
    button.removeAttribute('data-dragging');
  };
  button.addEventListener('pointerdown', input => {
    if (input.button !== 0 || !input.isPrimary) return;
    press = { id: input.pointerId, x: input.clientX, y: input.clientY };
    dragged = false;
    // Capture keeps the gesture on this label as zooming moves it across the screen.
    // Mouse and touch events still reach p5's existing chart drag handlers.
    button.setPointerCapture(input.pointerId);
  });
  button.addEventListener('pointermove', trackMovement);
  button.addEventListener('pointerup', input => {
    if (!press || input.pointerId !== press.id) return;
    trackMovement(input);
    finish();
  });
  for (const name of ['pointercancel', 'lostpointercapture']) {
    button.addEventListener(name, input => {
      if (!press || input.pointerId !== press.id) return;
      dragged = true;
      finish();
    });
  }
  button.addEventListener('click', input => {
    if (input.detail > 0 && dragged) {
      input.preventDefault();
      input.stopPropagation();
      return;
    }
    showTimelineDetails(landmark, true);
  });
}

function updateTimelineEventControls() {
  if (!timelineEventControls.size) return;
  for (const [landmark, button] of timelineEventControls) {
    const label = landmark.layout()?.label;
    button.hidden = !label;
    if (!label) continue;
    button.style.left = (label.left - shift) + 'px';
    button.style.top = label.top + 'px';
    button.style.width = label.width + 'px';
    button.style.height = label.height + 'px';
  }
  if (timelineDetailsEvent) {
    if (!timelineDetailsPinned && timelineEventControls.get(timelineDetailsEvent).hidden) closeTimelineDetails();
    else positionTimelineDetails();
  }
}

function cancelTimelineDetailsTimer() {
  clearTimeout(timelineDetailsTimer);
  timelineDetailsTimer = null;
}

function scheduleTimelineDetailsClose() {
  cancelTimelineDetailsTimer();
  if (!timelineDetailsPinned) timelineDetailsTimer = setTimeout(() => closeTimelineDetails(), 250);
}

function showTimelineDetails(landmark, pinned = false) {
  if (typeof document === 'undefined' || dataGuideIsOpen()) return;
  if (!pinned && (mouseIsPressed || timelineDetailsPinned || timelineDetailsDismissedEvent === landmark)) return;
  cancelTimelineDetailsTimer();
  const card = document.getElementById('timeline-details');
  if (!card) return;
  const previousButton = timelineEventControls.get(timelineDetailsEvent);
  previousButton?.setAttribute('aria-expanded', 'false');
  previousButton?.removeAttribute('aria-describedby');
  previousButton?.removeAttribute('data-active');
  timelineDetailsEvent = landmark;
  timelineDetailsPinned = pinned;
  const button = timelineEventControls.get(landmark);
  button.setAttribute('aria-expanded', String(pinned));
  button.setAttribute('data-active', 'true');
  if (!pinned) button.setAttribute('aria-describedby', 'timeline-details');
  card.setAttribute('role', pinned ? 'dialog' : 'tooltip');
  card.setAttribute('data-expanded', String(pinned));
  card.setAttribute('aria-describedby', pinned ? 'timeline-details-date timeline-details-description' : 'timeline-details-date');
  document.getElementById('timeline-details-title').textContent = landmark.title || landmark.name;
  document.getElementById('timeline-details-date').textContent = landmark.dateText();
  document.getElementById('timeline-details-description').textContent = landmark.description;
  document.getElementById('timeline-details-link').href = 'https://en.wikipedia.org/wiki/' + encodeURI(landmark.page);
  card.hidden = false;
  positionTimelineDetails();
  if (pinned) card.querySelector('button').focus({ preventScroll: true });
}

function positionTimelineDetails() {
  const card = document.getElementById('timeline-details');
  const button = timelineEventControls.get(timelineDetailsEvent);
  if (!card || !button || card.hidden) return;
  const anchor = button.getBoundingClientRect();
  const left = Math.max(8, Math.min(anchor.left, window.innerWidth - card.offsetWidth - 8));
  let top = anchor.top - card.offsetHeight - 8;
  if (top < 8) top = anchor.bottom + 8;
  top = Math.max(8, Math.min(top, window.innerHeight - card.offsetHeight - 8));
  card.style.left = left + 'px';
  card.style.top = top + 'px';
}

function closeTimelineDetails(restoreFocus = false) {
  cancelTimelineDetailsTimer();
  const previous = timelineDetailsEvent;
  timelineDetailsEvent = null;
  timelineDetailsPinned = false;
  const previousButton = timelineEventControls.get(previous);
  previousButton?.setAttribute('aria-expanded', 'false');
  previousButton?.removeAttribute('aria-describedby');
  previousButton?.removeAttribute('data-active');
  if (typeof document === 'undefined') return;
  const card = document.getElementById('timeline-details');
  if (card) card.hidden = true;
  if (restoreFocus && previous) {
    timelineDetailsDismissedEvent = previous;
    const button = timelineEventControls.get(previous);
    if (button && !button.hidden) button.focus({ preventScroll: true });
  }
}
