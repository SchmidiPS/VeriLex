import { overlayInstance } from './app.js';
import { readMockSession } from './auth-utils.js';
import { verilexStore } from './store.js';

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

const ROLE_TO_USER_ID = {
  partner: 'u-partner',
  associate: 'u-associate',
  assistant: 'u-associate',
  accounting: 'u-accounting',
};

let entries = [];
let caseIndex = new Map();

let stopwatchState = 'idle';
let animationFrameId = null;
let startHighResTimestamp = 0;
let accumulatedDurationMs = 0;
let startedAt = null;

function resolveActiveUserId() {
  const session = readMockSession();
  const roleId = session?.roleId?.toLowerCase?.() ?? '';
  return ROLE_TO_USER_ID[roleId] ?? ROLE_TO_USER_ID.associate;
}

function buildCaseIndex(cases) {
  caseIndex = new Map();
  cases
    .filter((item) => item && item.id)
    .forEach((item) => {
      caseIndex.set(item.id, {
        caseNumber: item.caseNumber ?? '',
        title: item.title ?? '',
      });
    });
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
  if (!entry.caseId) {
    return 'Keine Zuordnung';
  }

  const info = caseIndex.get(entry.caseId);
  if (!info) {
    return 'Unbekannte Akte';
  }

  if (info.caseNumber && info.title) {
    return `${info.caseNumber} – ${info.title}`;
  }

  return info.caseNumber || info.title || 'Unbenannte Akte';
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

function loadCasesIntoSelect() {
  if (!caseSelect) {
    return;
  }

  const cases = verilexStore.getAll('Case');
  buildCaseIndex(cases);

  caseSelect.innerHTML = '';
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Keine Zuordnung';
  caseSelect.append(defaultOption);

  cases
    .slice()
    .sort((a, b) => (a.caseNumber || '').localeCompare(b.caseNumber || ''))
    .forEach((item) => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.title
        ? `${item.caseNumber} – ${item.title}`
        : item.caseNumber || 'Unbenannte Akte';
      caseSelect.append(option);
    });
}

function normalizeTimeEntry(rawEntry) {
  if (!rawEntry) return null;

  const durationMinutes = Number(rawEntry.durationMinutes);
  const startedAt = rawEntry.startedAt ?? null;
  const endedAt = rawEntry.endedAt ?? null;
  const derivedDuration = (() => {
    if (Number.isFinite(durationMinutes)) {
      return Math.max(0, durationMinutes) * 60000;
    }

    const start = new Date(startedAt).getTime();
    const end = new Date(endedAt).getTime();
    if (Number.isFinite(start) && Number.isFinite(end)) {
      return Math.max(0, end - start);
    }
    return 0;
  })();

  return {
    id: rawEntry.id,
    activity: String(rawEntry.activity ?? '').trim() || 'Ohne Titel',
    caseId: rawEntry.caseId || '',
    notes: String(rawEntry.notes ?? '').trim(),
    startedAt,
    endedAt,
    durationMs: derivedDuration,
    createdLabel: endedAt ? `Erfasst am ${formatDateTime(endedAt)}` : '',
  };
}

function syncEntriesFromStore() {
  try {
    const rawEntries = verilexStore.getAll('TimeEntry');
    entries = rawEntries
      .map(normalizeTimeEntry)
      .filter((entry) => entry && entry.id);
  } catch (error) {
    console.error('Zeitbucheinträge konnten nicht aus dem Store geladen werden.', error);
    overlayInstance?.show?.({
      title: 'Daten nicht verfügbar',
      message: 'Die Zeiterfassungsdaten konnten nicht geladen werden.',
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
  const caseId = caseSelect?.value ?? '';
  const notes = notesInput?.value.trim() ?? '';

  const newEntry = {
    activity: activity || 'Ohne Titel',
    caseId: caseId || null,
    userId: resolveActiveUserId(),
    notes,
    startedAt: startedAt ? startedAt.toISOString() : finishedAt.toISOString(),
    endedAt: finishedAt.toISOString(),
    durationMinutes: Math.max(0, Math.round(durationMs / 60000)),
    billableRate: null,
    invoiceId: null,
  };

  try {
    const saved = verilexStore.addTimeEntry(newEntry);
    const normalized = normalizeTimeEntry(saved);
    if (normalized) {
      entries = [normalized, ...entries.filter((item) => item && item.id !== normalized.id)];
      renderEntries();
    }

    const caseLabel = formatCaseLabel({ caseId: saved.caseId });
    const statusLabel = caseLabel ? ` (${caseLabel})` : '';
    setStatus(`Eintrag „${saved.activity}“ wurde gespeichert${statusLabel}.`, 'success');
  } catch (error) {
    console.error('Zeitbuchung konnte nicht gespeichert werden.', error);
    overlayInstance?.show?.({
      title: 'Speichern fehlgeschlagen',
      message: 'Der Eintrag konnte nicht im zentralen Store abgelegt werden.',
      details: error,
    });
    return;
  }

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

  try {
    const removed = verilexStore.removeEntity('TimeEntry', id);
    if (removed) {
      syncEntriesFromStore();
      renderEntries();
      setStatus('Eintrag wurde entfernt.', 'info');
    }
  } catch (error) {
    console.error('Eintrag konnte nicht gelöscht werden.', error);
    overlayInstance?.show?.({
      title: 'Löschen fehlgeschlagen',
      message: 'Der Zeitbucheintrag konnte nicht aus dem Store entfernt werden.',
      details: error,
    });
  }
}

function handleStoreChange(event) {
  if (!event || !event.entity) {
    return;
  }

  if (event.entity === 'Case') {
    loadCasesIntoSelect();
  }

  if (event.entity === 'TimeEntry') {
    syncEntriesFromStore();
    renderEntries();
  }
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

  loadCasesIntoSelect();
  syncEntriesFromStore();
  renderEntries();
  setButtonsState('idle');

  startButton.addEventListener('click', handleStart);
  pauseButton.addEventListener('click', handlePause);
  resumeButton.addEventListener('click', handleResume);
  stopButton.addEventListener('click', handleStop);
  resetButton.addEventListener('click', handleReset);
  tableBody.addEventListener('click', handleDelete);

  verilexStore.on('storeReady', () => {
    loadCasesIntoSelect();
    syncEntriesFromStore();
    renderEntries();
  });

  verilexStore.on('storeReset', () => {
    loadCasesIntoSelect();
    syncEntriesFromStore();
    renderEntries();
  });

  verilexStore.on('storeChanged', handleStoreChange);
}

init();
