import { overlayInstance } from './app.js';

function parseCaseData() {
  const dataElement = document.getElementById('case-detail-data');
  if (!dataElement) {
    return { cases: [] };
  }

  try {
    const raw = dataElement.textContent ?? '{}';
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (error) {
    console.error('Die Falldaten konnten nicht geladen werden.', error);
    overlayInstance?.show?.({
      title: 'Daten konnten nicht geladen werden',
      message: 'Die Detailinformationen zur Akte stehen derzeit nicht zur Verfügung.',
      details: error,
    });
  }

  return { cases: [] };
}

function getCurrentCase(allCases) {
  const params = new URLSearchParams(window.location.search);
  const caseNumber = params.get('case');

  if (caseNumber) {
    const match = allCases.find(
      (entry) => entry.caseNumber?.toString().toLowerCase() === caseNumber.toString().toLowerCase()
    );
    if (match) {
      return match;
    }
  }

  return allCases[0];
}

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

function createTagElement(label) {
  const span = document.createElement('span');
  span.className = 'case-tag';
  span.textContent = label;
  span.setAttribute('role', 'listitem');
  return span;
}

function renderSidebar(caseData) {
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

  document.title = `VeriLex – ${caseData.title ?? 'Akten-Detail'}`;

  numberEl.textContent = caseData.caseNumber ?? 'Ohne Aktenzeichen';
  titleEl.textContent = caseData.title ?? 'Unbenannte Akte';
  clientEl.textContent = caseData.client ?? 'Nicht hinterlegt';
  responsibleEl.textContent = caseData.responsible ?? 'Noch nicht zugewiesen';
  practiceEl.textContent = caseData.practiceArea ?? '—';
  updatedEl.textContent = formatDateTime(caseData.lastUpdated);
  statusEl.textContent = caseData.status ?? 'Status unbekannt';
  priorityEl.textContent = caseData.priority ?? '';

  tagsContainer.innerHTML = '';
  const tags = Array.isArray(caseData.tags) ? caseData.tags : [];
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
  const steps = Array.isArray(caseData.nextSteps) ? caseData.nextSteps : [];
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

  if (metaEntries.length === 0) {
    return '';
  }

  return `<div class="timeline-meta">${metaEntries.join('')}</div>`;
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

function initTimelineFilters(items) {
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
      const filter = button.dataset.filter ?? 'all';
      setActive(button);
      applyTimelineFilter(items, filter);
    });
  });
}

function initCaseDetail() {
  const { cases } = parseCaseData();
  if (!Array.isArray(cases) || cases.length === 0) {
    overlayInstance?.show?.({
      title: 'Keine Akteninformationen',
      message: 'Für die Detailansicht konnten keine Akten geladen werden.',
    });
    return;
  }

  const currentCase = getCurrentCase(cases);
  if (!currentCase) {
    overlayInstance?.show?.({
      title: 'Akte nicht gefunden',
      message: 'Die angeforderte Akte konnte nicht ermittelt werden.',
    });
    return;
  }

  renderSidebar(currentCase);
  const timelineItems = renderTimeline(Array.isArray(currentCase.timeline) ? currentCase.timeline : []);
  initTimelineFilters(timelineItems);
}

initCaseDetail();
