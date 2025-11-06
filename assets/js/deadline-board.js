const dataElement = document.getElementById('deadline-data');

const statusConfigurations = [
  {
    id: 'overdue',
    label: 'Überfällig',
    description: 'Fristen, deren Fälligkeit überschritten ist. Sofort handeln.',
    emptyText: 'Aktuell liegen keine überfälligen Fristen vor.',
  },
  {
    id: 'today',
    label: 'Heute fällig',
    description: 'Aufgaben, die noch am heutigen Tag abgeschlossen werden müssen.',
    emptyText: 'Heute stehen keine weiteren Fristen an.',
  },
  {
    id: 'soon',
    label: 'In den nächsten 7 Tagen',
    description: 'Fristen mit kurzem Vorlauf für die kommenden sieben Tage.',
    emptyText: 'In den nächsten sieben Tagen stehen keine Fristen an.',
  },
  {
    id: 'upcoming',
    label: 'Geplant',
    description: 'Fristen mit ausreichend Vorlaufzeit – ideal für proaktive Vorbereitung.',
    emptyText: 'Es gibt derzeit keine langfristig geplanten Fristen.',
  },
  {
    id: 'completed',
    label: 'Erledigt',
    description: 'Abgeschlossene Vorgänge zur Dokumentation und Nachverfolgung.',
    emptyText: 'Es wurden noch keine Fristen als erledigt markiert.',
  },
];

const allowedStatuses = new Set(statusConfigurations.map((status) => status.id));

const numberFormatter = new Intl.NumberFormat('de-DE');
const dateFormatter = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const timestampFormatter = new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'long',
  timeStyle: 'short',
});
const relativeFormatter = new Intl.RelativeTimeFormat('de', {
  numeric: 'auto',
});

function parseISODate(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    return null;
  }

  const [, yearStr, monthStr, dayStr] = match;
  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10);
  const day = Number.parseInt(dayStr, 10);

  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeDeadline(entry, index) {
  const statusValue = String(entry.status ?? 'upcoming').toLowerCase();
  const status = allowedStatuses.has(statusValue) ? statusValue : 'upcoming';
  const tags = Array.isArray(entry.tags)
    ? entry.tags
        .map((tag) => String(tag ?? '').trim())
        .filter(Boolean)
    : [];

  return {
    id: String(entry.id ?? `deadline-${index}`),
    title: String(entry.title ?? 'Unbenannte Frist').trim() || 'Unbenannte Frist',
    caseNumber: String(entry.caseNumber ?? '').trim(),
    client: String(entry.client ?? '').trim(),
    dueDate: parseISODate(entry.dueDate),
    dueDateRaw: String(entry.dueDate ?? '').trim(),
    completedDate: parseISODate(entry.completedDate),
    status,
    responsible: String(entry.responsible ?? 'Unzugewiesen').trim() || 'Unzugewiesen',
    type: String(entry.type ?? '').trim(),
    notes: String(entry.notes ?? '').trim(),
    location: String(entry.location ?? '').trim(),
    tags,
  };
}

function loadDeadlines() {
  if (!dataElement) {
    console.warn('Deadline data element not found.');
    return [];
  }

  try {
    const raw = dataElement.textContent ?? '[]';
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((entry, index) => normalizeDeadline(entry, index));
  } catch (error) {
    console.error('Die Fristendaten konnten nicht interpretiert werden.', error);
    window.dispatchEvent(
      new CustomEvent('verilex:error', {
        detail: {
          title: 'Fehler beim Laden der Fristen',
          message: 'Die Fristen konnten nicht geladen werden.',
          details: error,
        },
      })
    );
    return [];
  }
}

const deadlines = loadDeadlines();

const columnsContainer = document.getElementById('deadline-columns');
const emptyStateElement = document.getElementById('deadline-empty-state');
const summaryTotalElement = document.getElementById('deadline-summary-total');
const summaryElements = {
  overdue: document.getElementById('deadline-summary-overdue'),
  today: document.getElementById('deadline-summary-today'),
  soon: document.getElementById('deadline-summary-soon'),
  upcoming: document.getElementById('deadline-summary-upcoming'),
  completed: document.getElementById('deadline-summary-completed'),
};
const filterResultElement = document.getElementById('deadline-filter-result');
const lastSyncElement = document.getElementById('deadline-last-sync');

const searchInput = document.getElementById('deadline-search');
const statusFilter = document.getElementById('deadline-status-filter');
const ownerFilter = document.getElementById('deadline-owner-filter');
const hideCompletedToggle = document.getElementById('deadline-hide-completed');

const filters = {
  query: '',
  queryRaw: '',
  status: 'all',
  owner: 'all',
  hideCompleted: false,
};

function getTodayUTC() {
  const today = new Date();
  return Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
}

function toUTC(date) {
  if (!(date instanceof Date)) {
    return null;
  }
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function describeRelativeDeadline(deadline) {
  if (deadline.status === 'completed' && deadline.completedDate) {
    return `Abgeschlossen am ${dateFormatter.format(deadline.completedDate)}`;
  }

  if (!deadline.dueDate) {
    return 'Kein Fälligkeitsdatum hinterlegt';
  }

  const todayUTC = getTodayUTC();
  const dueUTC = toUTC(deadline.dueDate);

  if (dueUTC == null) {
    return 'Kein Fälligkeitsdatum hinterlegt';
  }

  const diffDays = Math.round((dueUTC - todayUTC) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Heute fällig';
  }

  if (diffDays > 0) {
    if (diffDays === 1) {
      return 'Fällig in 1 Tag';
    }

    if (diffDays <= 7) {
      return `Fällig in ${diffDays} Tagen`;
    }

    return relativeFormatter.format(diffDays, 'day');
  }

  const overdueDays = Math.abs(diffDays);
  return overdueDays === 1
    ? 'Überfällig seit 1 Tag'
    : `Überfällig seit ${overdueDays} Tagen`;
}

function formatDueDate(deadline) {
  if (deadline.status === 'completed' && deadline.completedDate) {
    return dateFormatter.format(deadline.completedDate);
  }

  if (!deadline.dueDate) {
    return 'Datum offen';
  }

  return dateFormatter.format(deadline.dueDate);
}

function matchesSearch(deadline, query) {
  if (!query) {
    return true;
  }

  const haystack = [
    deadline.title,
    deadline.caseNumber,
    deadline.client,
    deadline.responsible,
    deadline.type,
    deadline.location,
    deadline.tags.join(' '),
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

function matchesStatus(deadline) {
  switch (filters.status) {
    case 'critical':
      return deadline.status === 'overdue' || deadline.status === 'today';
    case 'open':
      return deadline.status !== 'completed';
    case 'all':
      return true;
    default:
      return deadline.status === filters.status;
  }
}

function matchesOwner(deadline) {
  if (filters.owner === 'all') {
    return true;
  }
  return deadline.responsible === filters.owner;
}

function matchesFilters(deadline) {
  if (filters.hideCompleted && deadline.status === 'completed') {
    return false;
  }

  if (!matchesStatus(deadline)) {
    return false;
  }

  if (!matchesOwner(deadline)) {
    return false;
  }

  if (!matchesSearch(deadline, filters.query)) {
    return false;
  }

  return true;
}

function sortDeadlinesForStatus(deadlineList, statusId) {
  if (statusId === 'completed') {
    return [...deadlineList].sort((a, b) => {
      const aCompleted = a.completedDate ? a.completedDate.getTime() : Number.NEGATIVE_INFINITY;
      const bCompleted = b.completedDate ? b.completedDate.getTime() : Number.NEGATIVE_INFINITY;
      return bCompleted - aCompleted;
    });
  }

  return [...deadlineList].sort((a, b) => {
    const aTime = a.dueDate ? a.dueDate.getTime() : Number.POSITIVE_INFINITY;
    const bTime = b.dueDate ? b.dueDate.getTime() : Number.POSITIVE_INFINITY;

    if (aTime !== bTime) {
      return aTime - bTime;
    }

    return a.title.localeCompare(b.title, 'de');
  });
}

function createMetaItem(term, description) {
  const wrapper = document.createElement('div');
  const dt = document.createElement('dt');
  dt.textContent = term;
  const dd = document.createElement('dd');
  dd.textContent = description || '–';
  wrapper.append(dt, dd);
  return wrapper;
}

function createTagList(tags) {
  if (!tags || tags.length === 0) {
    return null;
  }

  const list = document.createElement('ul');
  list.className = 'deadline-card__tags';

  tags.forEach((tag) => {
    const item = document.createElement('li');
    item.className = 'deadline-card__tag';
    item.textContent = tag;
    list.appendChild(item);
  });

  return list;
}

function createDeadlineCard(deadline) {
  const card = document.createElement('article');
  card.className = `deadline-card deadline-card--${deadline.status}`;
  card.setAttribute('role', 'listitem');
  card.setAttribute('tabindex', '0');

  const header = document.createElement('header');
  header.className = 'deadline-card__header';

  const date = document.createElement('p');
  date.className = 'deadline-card__date';
  date.textContent = formatDueDate(deadline);
  header.appendChild(date);

  const badge = document.createElement('span');
  badge.className = `deadline-card__badge deadline-card__badge--${deadline.status}`;
  badge.textContent = statusConfigurations.find((status) => status.id === deadline.status)?.label ?? 'Frist';
  header.appendChild(badge);

  card.appendChild(header);

  const title = document.createElement('h3');
  title.className = 'deadline-card__title';
  title.textContent = deadline.title;
  card.appendChild(title);

  const caseLine = document.createElement('p');
  caseLine.className = 'deadline-card__case';
  const caseParts = [deadline.caseNumber, deadline.client].filter(Boolean);
  caseLine.textContent = caseParts.length > 0 ? caseParts.join(' · ') : 'Mandant unbekannt';
  card.appendChild(caseLine);

  const relative = document.createElement('p');
  relative.className = 'deadline-card__relative';
  relative.textContent = describeRelativeDeadline(deadline);
  card.appendChild(relative);

  const meta = document.createElement('dl');
  meta.className = 'deadline-card__meta';
  meta.append(
    createMetaItem('Verantwortlich', deadline.responsible),
    createMetaItem('Fristtyp', deadline.type || 'Nicht angegeben'),
    createMetaItem('Ort', deadline.location || '–')
  );
  card.appendChild(meta);

  if (deadline.notes) {
    const notes = document.createElement('p');
    notes.className = 'deadline-card__note';
    notes.textContent = deadline.notes;
    card.appendChild(notes);
  }

  const tagList = createTagList(deadline.tags);
  if (tagList) {
    card.appendChild(tagList);
  }

  return card;
}

function renderColumns(filtered) {
  if (!columnsContainer) {
    return;
  }

  columnsContainer.innerHTML = '';

  statusConfigurations.forEach((status) => {
    const column = document.createElement('section');
    column.className = `deadline-column deadline-column--${status.id}`;
    column.setAttribute('role', 'listitem');

    const columnHeader = document.createElement('header');
    columnHeader.className = 'deadline-column__header';

    const title = document.createElement('h3');
    title.className = 'deadline-column__title';
    title.textContent = status.label;

    const count = document.createElement('span');
    count.className = 'deadline-column__count';
    const itemsForStatus = filtered.filter((item) => item.status === status.id);
    count.textContent = numberFormatter.format(itemsForStatus.length);

    columnHeader.append(title, count);
    column.appendChild(columnHeader);

    const description = document.createElement('p');
    description.className = 'deadline-column__description';
    description.textContent = status.description;
    column.appendChild(description);

    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'deadline-column__items';
    itemsContainer.setAttribute('role', 'list');

    if (itemsForStatus.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'deadline-column__empty';
      empty.textContent = status.emptyText;
      itemsContainer.appendChild(empty);
    } else {
      const sortedItems = sortDeadlinesForStatus(itemsForStatus, status.id);
      sortedItems.forEach((deadline) => {
        itemsContainer.appendChild(createDeadlineCard(deadline));
      });
    }

    column.appendChild(itemsContainer);
    columnsContainer.appendChild(column);
  });
}

function updateSummary(filtered, total) {
  const aggregates = {
    overdue: 0,
    today: 0,
    soon: 0,
    upcoming: 0,
    completed: 0,
  };

  filtered.forEach((deadline) => {
    if (aggregates[deadline.status] != null) {
      aggregates[deadline.status] += 1;
    }
  });

  Object.entries(summaryElements).forEach(([status, element]) => {
    if (element) {
      element.textContent = numberFormatter.format(aggregates[status] ?? 0);
    }
  });

  if (summaryTotalElement) {
    summaryTotalElement.textContent = `Insgesamt ${numberFormatter.format(filtered.length)} Fristen im aktuellen Filter.`;
  }

  if (filterResultElement) {
    const activeFilters = [];
    if (filters.queryRaw) {
      activeFilters.push(`Suche: „${filters.queryRaw}“`);
    }
    if (filters.status !== 'all') {
      const statusOptionLabel = statusFilter?.selectedOptions?.[0]?.textContent ?? 'Statusfilter aktiv';
      activeFilters.push(statusOptionLabel);
    }
    if (filters.owner !== 'all') {
      activeFilters.push(`Verantwortlich: ${filters.owner}`);
    }
    if (filters.hideCompleted) {
      activeFilters.push('Erledigte ausgeblendet');
    }

    const suffix = activeFilters.length > 0 ? activeFilters.join(' · ') : 'Keine Filter aktiv.';
    filterResultElement.textContent = `${numberFormatter.format(filtered.length)} von ${numberFormatter.format(total)} Fristen angezeigt. ${suffix}`;
  }
}

function updateEmptyState(filtered) {
  if (!emptyStateElement) {
    return;
  }

  if (filtered.length === 0) {
    emptyStateElement.removeAttribute('hidden');
  } else {
    emptyStateElement.setAttribute('hidden', '');
  }
}

function populateOwnerFilter() {
  if (!ownerFilter) {
    return;
  }

  const owners = Array.from(
    new Set(
      deadlines
        .map((deadline) => deadline.responsible)
        .filter((value) => typeof value === 'string' && value.trim() !== '')
    )
  ).sort((a, b) => a.localeCompare(b, 'de'));

  owners.forEach((owner) => {
    const option = document.createElement('option');
    option.value = owner;
    option.textContent = owner;
    ownerFilter.appendChild(option);
  });
}

function applyFilters() {
  const filtered = deadlines.filter((deadline) => matchesFilters(deadline));
  renderColumns(filtered);
  updateSummary(filtered, deadlines.length);
  updateEmptyState(filtered);
}

function initialiseFilters() {
  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      const value = event.target.value ?? '';
      filters.queryRaw = value.trim();
      filters.query = filters.queryRaw.toLowerCase();
      applyFilters();
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', (event) => {
      filters.status = event.target.value ?? 'all';
      applyFilters();
    });
  }

  if (ownerFilter) {
    ownerFilter.addEventListener('change', (event) => {
      filters.owner = event.target.value ?? 'all';
      applyFilters();
    });
  }

  if (hideCompletedToggle) {
    hideCompletedToggle.addEventListener('change', (event) => {
      filters.hideCompleted = Boolean(event.target.checked);
      applyFilters();
    });
  }
}

function updateTimestamp() {
  if (!lastSyncElement) {
    return;
  }
  lastSyncElement.textContent = `Aktualisiert am ${timestampFormatter.format(new Date())}.`;
}

function initDeadlineBoard() {
  if (!columnsContainer) {
    return;
  }

  populateOwnerFilter();
  initialiseFilters();
  updateTimestamp();
  applyFilters();
}

if (Array.isArray(deadlines) && deadlines.length > 0) {
  initDeadlineBoard();
} else {
  updateTimestamp();
  updateSummary([], 0);
  updateEmptyState([]);
  if (columnsContainer) {
    columnsContainer.innerHTML = '';
    statusConfigurations.forEach((status) => {
      const column = document.createElement('section');
      column.className = `deadline-column deadline-column--${status.id}`;
      column.setAttribute('role', 'listitem');

      const columnHeader = document.createElement('header');
      columnHeader.className = 'deadline-column__header';

      const title = document.createElement('h3');
      title.className = 'deadline-column__title';
      title.textContent = status.label;

      const count = document.createElement('span');
      count.className = 'deadline-column__count';
      count.textContent = '0';

      columnHeader.append(title, count);
      column.appendChild(columnHeader);

      const description = document.createElement('p');
      description.className = 'deadline-column__description';
      description.textContent = status.description;
      column.appendChild(description);

      const empty = document.createElement('p');
      empty.className = 'deadline-column__empty';
      empty.textContent = status.emptyText;
      column.appendChild(empty);

      columnsContainer.appendChild(column);
    });
  }
}
