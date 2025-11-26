import { verilexStore } from './store.js';
import { overlayInstance } from './app.js';

const ICON_MAP = {
  document: '📄',
  deadline: '⏰',
  note: '📝',
  activity: '✅',
};

const FILTER_LABELS = {
  all: 'Alle Ereignisse',
  document: 'Dokumente',
  deadline: 'Fristen',
  note: 'Notizen',
  activity: 'Aktivitäten',
};

let currentFilter = 'all';
let currentTimelineItems = [];

function formatDateTime(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date);
}

function formatDuration(minutes) {
  if (!minutes || Number.isNaN(Number(minutes))) {
    return null;
  }

  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hrs === 0) return `${mins} Minuten`;
  if (mins === 0) return `${hrs} Stunden`;
  return `${hrs} Std ${mins} Min`;
}

function createTagElement(label) {
  const span = document.createElement('span');
  span.className = 'case-tag';
  span.textContent = label;
  span.setAttribute('role', 'listitem');
  return span;
}

function renderSidebar(caseData, lookups, timeline) {
  const numberEl = document.getElementById('case-number');
  const titleEl = document.getElementById('case-detail-title');
  const clientEl = document.getElementById('case-client');
  const responsibleEl = document.getElementById('case-responsible');
  const practiceEl = document.getElementById('case-practice');
  const updatedEl = document.getElementById('case-updated');
  const statusEl = document.getElementById('case-status');
  const priorityEl = document.getElementById('case-priority');
  const tagsContainer = document.getElementById('case-tags');
  const stepsContainer = document.getElementById('case-next-steps');

  if (!numberEl || !titleEl) {
    return;
  }

  const clientName = lookups.clients[caseData.clientId]?.name ?? 'Nicht hinterlegt';
  const responsibleUserId = Array.isArray(caseData.assignedUsers) ? caseData.assignedUsers[0] : null;
  const responsibleName = responsibleUserId
    ? lookups.users[responsibleUserId]?.name ?? 'Noch nicht zugewiesen'
    : 'Noch nicht zugewiesen';

  const latestTimestamp = timeline.length > 0 ? timeline[0].timestamp : caseData.openedAt;

  document.title = `VeriLex – ${caseData.title ?? 'Akten-Detail'}`;

  numberEl.textContent = caseData.caseNumber ?? 'Ohne Aktenzeichen';
  titleEl.textContent = caseData.title ?? 'Unbenannte Akte';
  clientEl.textContent = clientName;
  responsibleEl.textContent = responsibleName;
  practiceEl.textContent = caseData.category ?? '—';
  updatedEl.textContent = formatDateTime(latestTimestamp);
  statusEl.textContent = caseData.status ?? 'Status unbekannt';
  priorityEl.textContent = caseData.priority ?? '';

  tagsContainer.innerHTML = '';
  const tags = [caseData.category, caseData.priority, lookups.clients[caseData.clientId]?.preferredBilling]
    .filter(Boolean)
    .map((tag) => tag.toString());

  if (tags.length === 0) {
    const emptyTag = document.createElement('span');
    emptyTag.className = 'case-tags__empty';
    emptyTag.textContent = 'Keine Tags hinterlegt';
    tagsContainer.appendChild(emptyTag);
  } else {
    const fragment = document.createDocumentFragment();
    tags.forEach((tag) => fragment.appendChild(createTagElement(tag)));
    tagsContainer.appendChild(fragment);
  }

  stepsContainer.innerHTML = '';
  const steps = deriveNextSteps(caseData, lookups.complianceItemsByCase[caseData.id] ?? []);
  if (steps.length === 0) {
    const emptyStep = document.createElement('li');
    emptyStep.className = 'case-next-steps__empty';
    emptyStep.textContent = 'Keine nächsten Schritte definiert.';
    stepsContainer.appendChild(emptyStep);
  } else {
    const fragment = document.createDocumentFragment();
    steps.forEach((step) => {
      const li = document.createElement('li');
      li.textContent = step;
      fragment.appendChild(li);
    });
    stepsContainer.appendChild(fragment);
  }
}

function renderTimelineMeta(event) {
  const metaEntries = [];
  if (event.author) {
    metaEntries.push(`<span class="timeline-meta__item">Autor: ${event.author}</span>`);
  }
  if (event.attachment) {
    metaEntries.push(`<span class="timeline-meta__item">Anhang: ${event.attachment}</span>`);
  }
  if (event.status) {
    metaEntries.push(`<span class="timeline-meta__item">Status: ${event.status}</span>`);
  }
  if (event.duration) {
    metaEntries.push(`<span class="timeline-meta__item">Dauer: ${event.duration}</span>`);
  }
  if (event.risk) {
    metaEntries.push(`<span class="timeline-meta__item">Risiko: ${event.risk}</span>`);
  }

  if (metaEntries.length === 0) {
    return '';
  }

  return `<div class="timeline-meta">${metaEntries.join('')}</div>`;
}

function createTimelineItem(event) {
  const li = document.createElement('li');
  li.className = `timeline-item timeline-item--${event.type ?? 'note'}`;
  li.dataset.type = event.type ?? 'note';

  const icon = ICON_MAP[event.type] ?? '🗂️';
  const title = event.title ?? 'Unbenanntes Ereignis';
  const description = event.description ?? '';
  const timestamp = formatDateTime(event.timestamp);

  li.innerHTML = `
    <div class="timeline-item__icon" aria-hidden="true">${icon}</div>
    <div class="timeline-item__content">
      <header class="timeline-item__header">
        <h4 class="timeline-item__title">${title}</h4>
        <time class="timeline-item__time" datetime="${event.timestamp ?? ''}">${timestamp}</time>
      </header>
      <p class="timeline-item__description">${description}</p>
      ${renderTimelineMeta(event)}
    </div>
  `;

  return li;
}

function sortTimeline(events) {
  return events
    .slice()
    .sort((a, b) => {
      const dateA = new Date(a.timestamp ?? 0).getTime();
      const dateB = new Date(b.timestamp ?? 0).getTime();
      return dateB - dateA;
    });
}

function renderTimeline(events) {
  const listEl = document.getElementById('case-timeline-list');
  const summaryEl = document.getElementById('case-timeline-summary');
  const emptyEl = document.getElementById('case-timeline-empty');

  if (!listEl || !summaryEl || !emptyEl) {
    return [];
  }

  listEl.innerHTML = '';

  const sorted = sortTimeline(events);
  const fragment = document.createDocumentFragment();
  sorted.forEach((event) => fragment.appendChild(createTimelineItem(event)));
  listEl.appendChild(fragment);

  const count = sorted.length;
  summaryEl.textContent =
    count === 1 ? '1 Ereignis in der Historie' : `${count} Ereignisse in der Historie`;

  emptyEl.hidden = count !== 0;

  return Array.from(listEl.querySelectorAll('.timeline-item'));
}

function applyTimelineFilter(items, filter) {
  let visibleCount = 0;
  items.forEach((item) => {
    const matches = filter === 'all' || item.dataset.type === filter;
    item.hidden = !matches;
    if (matches) {
      visibleCount += 1;
    }
  });

  const emptyEl = document.getElementById('case-timeline-empty');
  if (emptyEl) {
    emptyEl.hidden = visibleCount !== 0;
  }

  const summaryEl = document.getElementById('case-timeline-summary');
  if (summaryEl) {
    const filterLabel = FILTER_LABELS[filter] ?? filter;
    const suffix = filter === 'all' ? '' : ` (Filter: ${filterLabel})`;
    summaryEl.textContent =
      visibleCount === 1
        ? `1 Ereignis in der Historie${suffix}`
        : `${visibleCount} Ereignisse in der Historie${suffix}`;
  }
}

function initTimelineFilters() {
  const buttons = Array.from(document.querySelectorAll('.timeline-filter'));
  if (buttons.length === 0) {
    return;
  }

  const setActive = (activeButton) => {
    buttons.forEach((btn) => {
      if (btn === activeButton) {
        btn.classList.add('timeline-filter--active');
      } else {
        btn.classList.remove('timeline-filter--active');
      }
    });
  };

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      currentFilter = button.dataset.filter ?? 'all';
      setActive(button);
      applyTimelineFilter(currentTimelineItems, currentFilter);
    });
  });
}

function toLookupMap(list) {
  return list.reduce((acc, entry) => {
    acc[entry.id] = entry;
    return acc;
  }, {});
}

function deriveNextSteps(caseData, complianceItems) {
  const nextSteps = [];
  const pendingCompliance = complianceItems
    .filter((item) => item.status !== 'erledigt')
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  pendingCompliance.slice(0, 3).forEach((item) => {
    const due = formatDateTime(item.deadline);
    nextSteps.push(`${item.title} – fällig bis ${due}`);
  });

  if (Array.isArray(caseData.deadlines)) {
    caseData.deadlines.forEach((dl) => {
      const due = formatDateTime(dl.date ?? dl.deadline);
      nextSteps.push(`${dl.title} – fällig bis ${due}`);
    });
  }

  return nextSteps.slice(0, 5);
}

function buildTimeline(caseData, lookups) {
  const documents = (lookups.documentsByCase[caseData.id] ?? []).map((doc) => ({
    id: doc.id,
    type: 'document',
    title: doc.title,
    description: `${doc.type} – ${doc.status}`,
    timestamp: doc.createdAt || doc.uploadedAt,
    author: lookups.users[doc.createdBy]?.name,
    attachment: doc.viewerUrl || doc.title,
  }));

  const complianceItems = (lookups.complianceItemsByCase[caseData.id] ?? []).map((item) => ({
    id: item.id,
    type: 'deadline',
    title: item.title,
    description: item.notes || 'Compliance-Aufgabe',
    timestamp: item.deadline,
    status: item.status,
    risk: item.risk,
    author: lookups.users[item.ownerId]?.name,
  }));

  const appointments = (lookups.appointmentsByCase[caseData.id] ?? []).map((appt) => ({
    id: appt.id,
    type: 'activity',
    title: appt.title || appt.description,
    description: appt.description,
    timestamp: appt.dateTime,
    author: (appt.participants || []).map((id) => lookups.users[id]?.name).filter(Boolean).join(', '),
  }));

  const timeEntries = (lookups.timeEntriesByCase[caseData.id] ?? []).map((entry) => ({
    id: entry.id,
    type: 'activity',
    title: entry.activity,
    description: entry.notes || 'Zeiterfassung',
    timestamp: entry.startedAt,
    duration: formatDuration(entry.durationMinutes),
    author: lookups.users[entry.userId]?.name,
  }));

  const caseDeadlines = Array.isArray(caseData.deadlines)
    ? caseData.deadlines.map((dl) => ({
        id: dl.id ?? `deadline-${dl.title}`,
        type: 'deadline',
        title: dl.title,
        description: 'Akte hinterlegte Frist',
        timestamp: dl.date ?? dl.deadline,
        status: dl.status ?? 'offen',
        risk: dl.risk,
      }))
    : [];

  return sortTimeline([...documents, ...complianceItems, ...appointments, ...timeEntries, ...caseDeadlines]);
}

function getActiveCase(cases, store) {
  const params = new URLSearchParams(window.location.search);
  const caseId = params.get('id');
  const caseNumber = params.get('case');

  const activeContextCase = store?.getActiveCase?.();
  if (activeContextCase) {
    return activeContextCase;
  }

  if (caseId) {
    const matchById = cases.find((entry) => entry.id === caseId);
    if (matchById) return matchById;
  }

  if (caseNumber) {
    const match = cases.find(
      (entry) => entry.caseNumber?.toString().toLowerCase() === caseNumber.toString().toLowerCase()
    );
    if (match) {
      return match;
    }
  }

  return cases[0];
}

function buildLookups(store) {
  const cases = store.getAll('Case');
  const clients = store.getAll('Client');
  const users = store.getAll('User');
  const documents = store.getAll('Document');
  const complianceItems = store.getAll('ComplianceItem');
  const appointments = store.getAll('Appointment');
  const timeEntries = store.getAll('TimeEntry');

  const byCase = (list) =>
    list.reduce((acc, item) => {
      const key = item.caseId;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

  return {
    cases,
    clients: toLookupMap(clients),
    users: toLookupMap(users),
    documentsByCase: byCase(documents),
    complianceItemsByCase: byCase(complianceItems),
    appointmentsByCase: byCase(appointments),
    timeEntriesByCase: byCase(timeEntries),
  };
}

function renderCaseDetailFromStore() {
  const store = window.verilexStore || verilexStore;
  if (!store) {
    overlayInstance?.show?.({
      title: 'Keine Akteninformationen',
      message: 'Der zentrale Store konnte nicht geladen werden.',
    });
    return;
  }

  const lookups = buildLookups(store);

  if (!Array.isArray(lookups.cases) || lookups.cases.length === 0) {
    overlayInstance?.show?.({
      title: 'Keine Akteninformationen',
      message: 'Für die Detailansicht konnten keine Akten geladen werden.',
    });
    return;
  }

  const currentCase = getActiveCase(lookups.cases, store);
  if (!currentCase) {
    overlayInstance?.show?.({
      title: 'Akte nicht gefunden',
      message: 'Die angeforderte Akte konnte nicht ermittelt werden.',
    });
    return;
  }

  const timeline = buildTimeline(currentCase, lookups);
  renderSidebar(currentCase, lookups, timeline);
  currentTimelineItems = renderTimeline(timeline);
  applyTimelineFilter(currentTimelineItems, currentFilter);
}

function initCaseDetail() {
  initTimelineFilters();
  renderCaseDetailFromStore();

  verilexStore.on('storeReady', renderCaseDetailFromStore);
  verilexStore.on('storeChanged', renderCaseDetailFromStore);
  verilexStore.on('storeReset', renderCaseDetailFromStore);
  verilexStore.on('activeContextChanged', renderCaseDetailFromStore);
}

initCaseDetail();

export { initCaseDetail };
