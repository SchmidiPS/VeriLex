import { overlayInstance } from './app.js';
import { verilexStore } from './store.js';

const searchInput = document.getElementById('performance-search');
const clientSelect = document.getElementById('performance-client-filter');
const periodSelect = document.getElementById('performance-period-filter');
const tableBody = document.getElementById('performance-overview-table-body');
const emptyState = document.getElementById('performance-overview-empty-state');
const entryCountEl = document.getElementById('overview-entry-count');
const totalDurationEl = document.getElementById('overview-total-duration');
const averageDurationEl = document.getElementById('overview-average-duration');
const breakdownList = document.getElementById('performance-breakdown-list');
const breakdownSummary = document.getElementById('performance-breakdown-summary');
const exportButton = document.getElementById('performance-export-button');

let rawEntries = [];
let caseMetadata = { byId: new Map(), byNumber: new Map(), list: [] };
let lastFilteredEntries = [];

function buildCaseMetadata() {
  const clients = new Map((verilexStore?.getAll('Client') ?? []).map((client) => [client.id, client]));

  const cases = verilexStore?.getAll('Case') ?? [];
  const meta = {
    byId: new Map(),
    byNumber: new Map(),
    list: [],
  };

  cases.forEach((caseEntry) => {
    const caseNumber = String(caseEntry.caseNumber ?? '').trim();
    const title = String(caseEntry.title ?? '').trim();
    const clientName = clients.get(caseEntry.clientId)?.name ?? 'Unbekannter Mandant';
    const record = {
      caseId: caseEntry.id ?? '',
      caseNumber,
      title,
      client: clientName || 'Unbekannter Mandant',
    };
    meta.byId.set(record.caseId, record);
    if (record.caseNumber) {
      meta.byNumber.set(record.caseNumber, record);
    }
    meta.list.push(record);
  });

  return meta;
}

function syncEntriesFromStore() {
  try {
    caseMetadata = buildCaseMetadata();
    rawEntries = verilexStore?.getAll('TimeEntry') ?? [];
  } catch (error) {
    console.error('Zeiteinträge konnten nicht aus dem Store geladen werden.', error);
    overlayInstance?.show?.({
      title: 'Fehler beim Lesen der Leistungsdaten',
      message: 'Die gespeicherten Einträge konnten nicht aus dem zentralen Store geladen werden.',
      details: error,
    });
    rawEntries = [];
    caseMetadata = { byId: new Map(), byNumber: new Map(), list: [] };
  }
}

function normalizeEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const startedAt = entry.startedAt ? new Date(entry.startedAt) : null;
  const endedAt = entry.endedAt ? new Date(entry.endedAt) : null;
  const caseId = typeof entry.caseId === 'string' ? entry.caseId : '';
  const caseInfoFromId = caseMetadata.byId.get(caseId) ?? null;
  const normalizedCaseNumber =
    caseInfoFromId?.caseNumber ?? (typeof entry.caseNumber === 'string' ? entry.caseNumber.trim() : '');
  const caseInfo = caseInfoFromId ?? (normalizedCaseNumber ? caseMetadata.byNumber.get(normalizedCaseNumber) : null);
  const caseNumber = caseInfo?.caseNumber ?? normalizedCaseNumber;
  const caseTitle = caseInfo?.title ?? (typeof entry.caseTitle === 'string' ? entry.caseTitle : '');
  const clientName = caseInfo?.client ?? (caseTitle || 'Allgemeine Leistung');
  const durationMs = Number(entry.durationMs ?? 0) || (Number(entry.durationMinutes ?? 0) * 60000 || 0);

  return {
    id: entry.id ?? crypto.randomUUID?.() ?? `entry-${Date.now()}`,
    activity: typeof entry.activity === 'string' && entry.activity.trim() ? entry.activity.trim() : 'Ohne Titel',
    notes: typeof entry.notes === 'string' ? entry.notes.trim() : '',
    startedAt: startedAt && !Number.isNaN(startedAt.getTime()) ? startedAt : null,
    endedAt: endedAt && !Number.isNaN(endedAt.getTime()) ? endedAt : null,
    durationMs: Math.max(0, durationMs),
    caseNumber,
    caseTitle,
    caseLabel: caseNumber
      ? caseTitle
        ? `${caseNumber} – ${caseTitle}`
        : caseNumber
      : 'Keine Zuordnung',
    clientName,
  };
}

function getNormalizedEntries() {
  return rawEntries
    .map((entry) => normalizeEntry(entry))
    .filter((entry) => entry !== null)
    .sort((a, b) => {
      const aDate = a.startedAt ?? a.endedAt ?? new Date(0);
      const bDate = b.startedAt ?? b.endedAt ?? new Date(0);
      return bDate - aDate;
    });
}

function formatDuration(ms, withSeconds = true) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, '0');

  if (!withSeconds) {
    return `${hours}:${minutes} h`;
  }

  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function formatDurationForCsv(ms) {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor(totalMinutes % 60)
    .toString()
    .padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatDateTime(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return 'Unbekannt';
  }

  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function formatDateTimeForCsv(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function getDateRange(period) {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  switch (period) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { start, end };
    }
    case 'week': {
      const day = now.getDay();
      const diffToMonday = (day + 6) % 7; // Monday as start
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
      return { start, end };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end };
    }
    case 'last30': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    default:
      return null;
  }
}

function matchesSearch(entry, term) {
  if (!term) {
    return true;
  }

  const haystack = [entry.activity, entry.caseLabel, entry.clientName, entry.notes]
    .join(' ')
    .toLowerCase();
  return haystack.includes(term.toLowerCase());
}

function matchesClient(entry, client) {
  if (!client) {
    return true;
  }

  return entry.clientName === client;
}

function matchesPeriod(entry, period) {
  const range = getDateRange(period);
  if (!range) {
    return true;
  }

  const relevantDate = entry.startedAt ?? entry.endedAt;
  if (!(relevantDate instanceof Date) || Number.isNaN(relevantDate.getTime())) {
    return false;
  }

  return relevantDate >= range.start && relevantDate < range.end;
}

function applyFilters(entries) {
  const term = searchInput?.value.trim() ?? '';
  const client = clientSelect?.value ?? '';
  const period = periodSelect?.value ?? 'all';

  return entries.filter((entry) =>
    matchesSearch(entry, term) && matchesClient(entry, client) && matchesPeriod(entry, period)
  );
}

function renderTable(entries) {
  if (!tableBody || !emptyState) {
    return;
  }

  tableBody.innerHTML = '';

  if (entries.length === 0) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  const fragment = document.createDocumentFragment();

  entries.forEach((entry) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <span class="performance-table__primary">${entry.activity}</span>
        <span class="performance-table__secondary">${entry.caseLabel}</span>
      </td>
      <td>
        <span class="performance-table__primary">${entry.clientName}</span>
      </td>
      <td>${entry.caseNumber || '–'}</td>
      <td>${formatDateTime(entry.startedAt)}</td>
      <td>${formatDateTime(entry.endedAt)}</td>
      <td>${formatDuration(entry.durationMs)}</td>
      <td>${entry.notes || '–'}</td>
    `;
    fragment.appendChild(row);
  });

  tableBody.appendChild(fragment);
}

function renderSummary(entries) {
  if (!entryCountEl || !totalDurationEl || !averageDurationEl) {
    return;
  }

  const totalEntries = entries.length;
  const totalDurationMs = entries.reduce((acc, entry) => acc + entry.durationMs, 0);
  const averageDurationMs = totalEntries > 0 ? totalDurationMs / totalEntries : 0;

  entryCountEl.textContent = totalEntries.toString();
  totalDurationEl.textContent = formatDuration(totalDurationMs, false);
  averageDurationEl.textContent = formatDuration(averageDurationMs, false);
}

function renderBreakdown(entries) {
  if (!breakdownList || !breakdownSummary) {
    return;
  }

  breakdownList.innerHTML = '';

  if (entries.length === 0) {
    breakdownSummary.textContent = 'Keine Daten vorhanden.';
    return;
  }

  const totalsByClient = new Map();
  let totalDuration = 0;

  entries.forEach((entry) => {
    const current = totalsByClient.get(entry.clientName) ?? { duration: 0, count: 0 };
    current.duration += entry.durationMs;
    current.count += 1;
    totalsByClient.set(entry.clientName, current);
    totalDuration += entry.durationMs;
  });

  breakdownSummary.textContent = `${totalsByClient.size} Mandant:innen, gesamt ${formatDuration(
    totalDuration,
    false
  )}.`;

  const fragment = document.createDocumentFragment();

  Array.from(totalsByClient.entries())
    .sort((a, b) => b[1].duration - a[1].duration)
    .forEach(([clientName, info]) => {
      const percentage = totalDuration > 0 ? Math.round((info.duration / totalDuration) * 100) : 0;
      const item = document.createElement('li');
      item.className = 'performance-breakdown__item';
      item.innerHTML = `
        <h4>${clientName}</h4>
        <p class="performance-breakdown__metric">${formatDuration(info.duration, false)}</p>
        <p class="performance-breakdown__meta">${info.count} Eintrag(e) · ${percentage}% Anteil</p>
      `;
      fragment.appendChild(item);
    });

  breakdownList.appendChild(fragment);
}

function populateClientFilter(entries) {
  if (!clientSelect) {
    return;
  }

  const clients = Array.from(
    new Set(entries.filter((entry) => entry.clientName).map((entry) => entry.clientName))
  ).sort((a, b) => a.localeCompare(b, 'de'));

  const currentValue = clientSelect.value;
  clientSelect.innerHTML = '<option value="">Alle Mandanten</option>';

  clients.forEach((client) => {
    const option = document.createElement('option');
    option.value = client;
    option.textContent = client;
    clientSelect.appendChild(option);
  });

  if (clients.includes(currentValue)) {
    clientSelect.value = currentValue;
  }
}

function render() {
  const normalized = getNormalizedEntries();
  populateClientFilter(normalized);
  const filtered = applyFilters(normalized);
  lastFilteredEntries = filtered.slice();
  renderSummary(filtered);
  renderBreakdown(filtered);
  renderTable(filtered);
  updateExportButtonState(filtered);
}

function toCsvValue(value) {
  const normalized = value ?? '';
  const stringValue = typeof normalized === 'string' ? normalized : String(normalized);
  return `"${stringValue.replace(/"/g, '""')}"`;
}

function createCsvContent(entries) {
  const header = [
    'Tätigkeit',
    'Mandant',
    'Aktennummer',
    'Aktenbezeichnung',
    'Start (lokal)',
    'Ende (lokal)',
    'Dauer (hh:mm)',
    'Notiz',
  ];

  const rows = entries.map((entry) => [
    entry.activity,
    entry.clientName,
    entry.caseNumber || '',
    entry.caseTitle || '',
    formatDateTimeForCsv(entry.startedAt),
    formatDateTimeForCsv(entry.endedAt),
    formatDurationForCsv(entry.durationMs),
    entry.notes || '',
  ]);

  return [header, ...rows]
    .map((row) => row.map((cell) => toCsvValue(cell)).join(';'))
    .join('\r\n');
}

function triggerCsvDownload(content) {
  const blob = new Blob(['\ufeff', content], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const today = new Date();
  const fileDate = today.toISOString().split('T')[0];
  link.href = url;
  link.download = `verilex-leistungsdaten-${fileDate}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

function updateExportButtonState(entries) {
  if (!exportButton) {
    return;
  }

  const hasEntries = Array.isArray(entries) && entries.length > 0;
  exportButton.disabled = !hasEntries;

  if (hasEntries) {
    exportButton.removeAttribute('aria-disabled');
    exportButton.title = 'Aktuelle Leistungsdaten als CSV herunterladen';
  } else {
    exportButton.setAttribute('aria-disabled', 'true');
    exportButton.title = 'Es sind keine Daten für den Export vorhanden.';
  }
}

function handleExportClick() {
  if (!Array.isArray(lastFilteredEntries) || lastFilteredEntries.length === 0) {
    overlayInstance?.show?.({
      title: 'Keine Daten für den Export',
      message: 'Für die aktuelle Filterauswahl konnten keine Einträge gefunden werden.',
    });
    return;
  }

  try {
    const csvContent = createCsvContent(lastFilteredEntries);
    triggerCsvDownload(csvContent);
  } catch (error) {
    console.error('CSV-Export fehlgeschlagen.', error);
    overlayInstance?.show?.({
      title: 'CSV-Export fehlgeschlagen',
      message: 'Die Leistungsdaten konnten nicht exportiert werden.',
      details: error,
    });
  }
}

function init() {
  if (
    !searchInput ||
    !clientSelect ||
    !periodSelect ||
    !tableBody ||
    !emptyState ||
    !entryCountEl ||
    !totalDurationEl ||
    !averageDurationEl ||
    !breakdownList ||
    !breakdownSummary
  ) {
    return;
  }

  syncEntriesFromStore();
  render();

  searchInput.addEventListener('input', () => {
    render();
  });

  clientSelect.addEventListener('change', () => {
    render();
  });

  periodSelect.addEventListener('change', () => {
    render();
  });

  exportButton?.addEventListener('click', handleExportClick);

  verilexStore?.on?.('storeReady', () => {
    syncEntriesFromStore();
    render();
  });

  verilexStore?.on?.('storeReset', () => {
    syncEntriesFromStore();
    render();
  });

  verilexStore?.on?.('storeChanged', (event) => {
    if (!event?.entity || ['TimeEntry', 'Case', 'Client'].includes(event.entity)) {
      syncEntriesFromStore();
      render();
    }
  });
}

init();
