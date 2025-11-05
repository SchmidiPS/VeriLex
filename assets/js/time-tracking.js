import { overlayInstance } from './app.js';

const STORAGE_KEY = 'verilex:time-entries';

const form = document.getElementById('time-tracking-form');
const activityInput = document.getElementById('activity-title');
const caseSelect = document.getElementById('activity-case');
const notesInput = document.getElementById('activity-notes');
const statusEl = document.getElementById('time-tracking-status');
const displayEl = document.getElementById('stopwatch-display');
const metaEl = document.getElementById('stopwatch-meta');
const startButton = document.getElementById('stopwatch-start');
const pauseButton = document.getElementById('stopwatch-pause');
const resumeButton = document.getElementById('stopwatch-resume');
const stopButton = document.getElementById('stopwatch-stop');
const resetButton = document.getElementById('stopwatch-reset');
const tableBody = document.getElementById('performance-table-body');
const emptyState = document.getElementById('performance-empty-state');
const entryCountEl = document.getElementById('performance-entry-count');
const totalDurationEl = document.getElementById('performance-total-duration');

if (!form || !activityInput || !caseSelect || !notesInput) {
  console.warn('Time tracking form could not be initialized.');
}

let entries = [];

let stopwatchState = 'idle';
let animationFrameId = null;
let startHighResTimestamp = 0;
let accumulatedDurationMs = 0;
let startedAt = null;

function generateEntryId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `entry-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

function setStatus(message, variant = 'info') {
  if (!statusEl) {
    return;
  }

  statusEl.textContent = message ?? '';
  statusEl.className = 'time-tracking-card__status';
  if (message) {
    statusEl.classList.add(`time-tracking-card__status--${variant}`);
  }
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
}

function formatDurationSummary(ms) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor(totalMinutes % 60)
    .toString()
    .padStart(2, '0');
  return `${hours}:${minutes} h`;
}

function formatDateTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unbekannt';
  }

  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function formatCaseLabel(entry) {
  if (!entry.caseNumber) {
    return 'Keine Zuordnung';
  }

  if (entry.caseTitle) {
    return `${entry.caseNumber} – ${entry.caseTitle}`;
  }

  return entry.caseNumber;
}

function stopAnimation() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

function updateDisplay() {
  if (!displayEl) {
    return;
  }

  let elapsed = accumulatedDurationMs;
  if (stopwatchState === 'running') {
    elapsed += performance.now() - startHighResTimestamp;
  }

  displayEl.textContent = formatDuration(elapsed);
  animationFrameId = requestAnimationFrame(updateDisplay);
}

function setButtonsState(state) {
  if (!startButton || !pauseButton || !resumeButton || !stopButton || !resetButton) {
    return;
  }

  if (state === 'idle') {
    startButton.disabled = false;
    pauseButton.disabled = true;
    resumeButton.disabled = true;
    resumeButton.hidden = true;
    stopButton.disabled = true;
    resetButton.disabled = true;
  } else if (state === 'running') {
    startButton.disabled = true;
    pauseButton.disabled = false;
    resumeButton.disabled = true;
    resumeButton.hidden = true;
    stopButton.disabled = false;
    resetButton.disabled = false;
  } else if (state === 'paused') {
    startButton.disabled = true;
    pauseButton.disabled = true;
    resumeButton.disabled = false;
    resumeButton.hidden = false;
    resumeButton.disabled = false;
    stopButton.disabled = false;
    resetButton.disabled = false;
  }
}

function resetStopwatch({ announce = false } = {}) {
  stopAnimation();
  stopwatchState = 'idle';
  accumulatedDurationMs = 0;
  startHighResTimestamp = 0;
  startedAt = null;
  if (displayEl) {
    displayEl.textContent = '00:00:00';
  }
  if (metaEl) {
    metaEl.textContent = 'Noch nicht gestartet.';
  }
  setButtonsState('idle');

  if (announce) {
    setStatus('Die Stoppuhr wurde zurückgesetzt.', 'info');
  }
}

function persistEntries() {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error('Zeitbuchungen konnten nicht gespeichert werden.', error);
    overlayInstance?.show?.({
      title: 'Speichern nicht möglich',
      message: 'Die Zeiterfassungsdaten konnten nicht im Browser gespeichert werden.',
      details: error,
    });
  }
}

function loadEntries() {
  if (typeof localStorage === 'undefined') {
    entries = [];
    return;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      entries = [];
      return;
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      entries = parsed
        .filter((entry) => typeof entry === 'object' && entry !== null)
        .map((entry) => {
          const duration = Number(entry.durationMs);
          return {
            id: typeof entry.id === 'string' && entry.id ? entry.id : generateEntryId(),
            activity: String(entry.activity ?? '').trim() || 'Ohne Titel',
            caseNumber: String(entry.caseNumber ?? '').trim(),
            caseTitle: String(entry.caseTitle ?? '').trim(),
            notes: String(entry.notes ?? '').trim(),
            startedAt: entry.startedAt ?? null,
            endedAt: entry.endedAt ?? null,
            durationMs: Number.isFinite(duration) ? duration : 0,
            createdLabel: typeof entry.createdLabel === 'string' ? entry.createdLabel : '',
          };
        });
    } else {
      entries = [];
    }
  } catch (error) {
    console.error('Gespeicherte Zeiterfassung konnte nicht geladen werden.', error);
    entries = [];
    overlayInstance?.show?.({
      title: 'Daten konnten nicht geladen werden',
      message: 'Die gespeicherten Zeitbucheinträge stehen derzeit nicht zur Verfügung.',
      details: error,
    });
  }
}

function renderEntries() {
  if (!tableBody || !emptyState || !entryCountEl || !totalDurationEl) {
    return;
  }

  tableBody.innerHTML = '';
  if (!Array.isArray(entries) || entries.length === 0) {
    emptyState.hidden = false;
    entryCountEl.textContent = '0';
    totalDurationEl.textContent = '00:00 h';
    return;
  }

  emptyState.hidden = true;
  entryCountEl.textContent = String(entries.length);

  let totalDuration = 0;

  entries
    .slice()
    .sort((a, b) => {
      const timeA = new Date(a.startedAt).getTime();
      const timeB = new Date(b.startedAt).getTime();
      const isValidA = Number.isFinite(timeA);
      const isValidB = Number.isFinite(timeB);

      if (isValidA && isValidB) {
        return timeB - timeA;
      }

      if (isValidA) {
        return -1;
      }

      if (isValidB) {
        return 1;
      }

      return 0;
    })
    .forEach((entry) => {
      const row = document.createElement('tr');

      const activityCell = document.createElement('td');
      const activityPrimary = document.createElement('span');
      activityPrimary.className = 'performance-table__primary';
      activityPrimary.textContent = entry.activity || 'Ohne Titel';
      activityCell.appendChild(activityPrimary);

      const createdLabelText = entry.createdLabel || (entry.endedAt ? `Erfasst am ${formatDateTime(entry.endedAt)}` : '');
      if (createdLabelText) {
        const activitySecondary = document.createElement('span');
        activitySecondary.className = 'performance-table__secondary';
        activitySecondary.textContent = createdLabelText;
        activityCell.appendChild(activitySecondary);
      }
      row.appendChild(activityCell);

      const caseCell = document.createElement('td');
      caseCell.textContent = formatCaseLabel(entry);
      row.appendChild(caseCell);

      const startCell = document.createElement('td');
      startCell.textContent = formatDateTime(entry.startedAt);
      row.appendChild(startCell);

      const endCell = document.createElement('td');
      endCell.textContent = formatDateTime(entry.endedAt);
      row.appendChild(endCell);

      const durationMs = Number.isFinite(entry.durationMs) ? entry.durationMs : 0;
      totalDuration += Math.max(0, durationMs);
      const durationCell = document.createElement('td');
      durationCell.textContent = formatDuration(durationMs);
      row.appendChild(durationCell);

      const notesCell = document.createElement('td');
      notesCell.textContent = entry.notes ? entry.notes : '–';
      row.appendChild(notesCell);

      const actionsCell = document.createElement('td');
      actionsCell.classList.add('performance-table__actions');
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'performance-table__action';
      deleteButton.dataset.entryAction = 'delete';
      deleteButton.dataset.entryId = entry.id;
      deleteButton.textContent = 'Entfernen';
      actionsCell.appendChild(deleteButton);
      row.appendChild(actionsCell);

      tableBody.appendChild(row);
    });

  totalDurationEl.textContent = formatDurationSummary(totalDuration);
}

function upsertCaseOptions() {
  if (!caseSelect) {
    return;
  }

  const dataEl = document.getElementById('time-tracking-case-data');
  if (!dataEl) {
    return;
  }

  try {
    const raw = dataEl.textContent ?? '[]';
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return;
    }

    parsed
      .map((item) => ({
        caseNumber: String(item.caseNumber ?? '').trim(),
        title: String(item.title ?? '').trim(),
      }))
      .filter((item) => item.caseNumber || item.title)
      .forEach((item) => {
        const option = document.createElement('option');
        option.value = item.caseNumber;
        option.textContent = item.title
          ? `${item.caseNumber} – ${item.title}`
          : item.caseNumber;
        option.dataset.caseTitle = item.title;
        caseSelect.appendChild(option);
      });
  } catch (error) {
    console.error('Aktenliste für Zeiterfassung konnte nicht geladen werden.', error);
    overlayInstance?.show?.({
      title: 'Fehler beim Laden der Akten',
      message: 'Die Aktenauswahl für die Zeiterfassung steht derzeit nicht zur Verfügung.',
      details: error,
    });
  }
}

function getSelectedCaseTitle(caseNumber) {
  if (!caseNumber || !caseSelect) {
    return '';
  }

  const option = Array.from(caseSelect.options).find((item) => item.value === caseNumber);
  return option?.dataset.caseTitle ?? '';
}

function handleStart() {
  if (!activityInput) {
    return;
  }

  const activity = activityInput.value.trim();
  if (!activity) {
    setStatus('Bitte geben Sie eine Tätigkeitsbeschreibung ein.', 'error');
    activityInput.focus();
    return;
  }

  if (stopwatchState !== 'idle') {
    setStatus('Die Stoppuhr läuft bereits.', 'warning');
    return;
  }

  stopwatchState = 'running';
  startedAt = new Date();
  accumulatedDurationMs = 0;
  startHighResTimestamp = performance.now();
  setButtonsState('running');
  stopAnimation();
  updateDisplay();

  if (metaEl) {
    metaEl.textContent = `Gestartet um ${new Intl.DateTimeFormat('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(startedAt)} Uhr.`;
  }

  setStatus(`Zeiterfassung für „${activity}“ gestartet.`, 'success');
}

function handlePause() {
  if (stopwatchState !== 'running') {
    return;
  }

  accumulatedDurationMs += performance.now() - startHighResTimestamp;
  stopwatchState = 'paused';
  stopAnimation();
  setButtonsState('paused');

  if (metaEl) {
    metaEl.textContent = 'Pausiert. Fortsetzen, um die Zeitnahme wieder aufzunehmen.';
  }

  setStatus('Zeiterfassung pausiert.', 'info');
}

function handleResume() {
  if (stopwatchState !== 'paused') {
    return;
  }

  stopwatchState = 'running';
  startHighResTimestamp = performance.now();
  setButtonsState('running');
  stopAnimation();
  updateDisplay();

  if (metaEl) {
    metaEl.textContent = `Fortgesetzt um ${new Intl.DateTimeFormat('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date())} Uhr.`;
  }

  setStatus('Zeiterfassung fortgesetzt.', 'success');
}

function resetFormFields() {
  if (!form) {
    return;
  }

  form.reset();
  if (activityInput) {
    activityInput.focus();
  }
}

function handleStop() {
  if (stopwatchState !== 'running' && stopwatchState !== 'paused') {
    return;
  }

  const finishedAt = new Date();
  let durationMs = accumulatedDurationMs;
  if (stopwatchState === 'running') {
    durationMs += performance.now() - startHighResTimestamp;
  }

  durationMs = Math.round(Math.max(0, durationMs));

  const activity = activityInput?.value.trim() ?? '';
  const caseNumber = caseSelect?.value ?? '';
  const notes = notesInput?.value.trim() ?? '';
  const caseTitle = getSelectedCaseTitle(caseNumber);

  const entry = {
    id: generateEntryId(),
    activity: activity || 'Ohne Titel',
    caseNumber,
    caseTitle,
    notes,
    startedAt: startedAt ? startedAt.toISOString() : finishedAt.toISOString(),
    endedAt: finishedAt.toISOString(),
    durationMs,
    createdLabel: `Erfasst am ${formatDateTime(finishedAt)}`,
  };

  entries = [entry, ...entries.filter((item) => item && item.id !== entry.id)];
  persistEntries();
  renderEntries();

  setStatus(`Eintrag „${entry.activity}“ wurde gespeichert.`, 'success');
  resetFormFields();
  resetStopwatch();
  if (metaEl) {
    metaEl.textContent = `Zuletzt gespeichert um ${new Intl.DateTimeFormat('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(finishedAt)} Uhr.`;
  }
}

function handleReset() {
  resetStopwatch({ announce: true });
}

function handleDelete(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const action = target.dataset.entryAction;
  if (action !== 'delete') {
    return;
  }

  const id = target.dataset.entryId;
  if (!id) {
    return;
  }

  entries = entries.filter((entry) => entry.id !== id);
  persistEntries();
  renderEntries();
  setStatus('Eintrag wurde entfernt.', 'info');
}

function handleStorageUpdate(event) {
  if (event.key && event.key !== STORAGE_KEY) {
    return;
  }
  loadEntries();
  renderEntries();
}

function init() {
  if (
    !form ||
    !activityInput ||
    !caseSelect ||
    !notesInput ||
    !displayEl ||
    !metaEl ||
    !startButton ||
    !pauseButton ||
    !resumeButton ||
    !stopButton ||
    !resetButton ||
    !tableBody ||
    !emptyState ||
    !entryCountEl ||
    !totalDurationEl
  ) {
    return;
  }

  upsertCaseOptions();
  loadEntries();
  renderEntries();
  setButtonsState('idle');

  startButton.addEventListener('click', handleStart);
  pauseButton.addEventListener('click', handlePause);
  resumeButton.addEventListener('click', handleResume);
  stopButton.addEventListener('click', handleStop);
  resetButton.addEventListener('click', handleReset);
  tableBody.addEventListener('click', handleDelete);
  window.addEventListener('storage', handleStorageUpdate);
}

init();
