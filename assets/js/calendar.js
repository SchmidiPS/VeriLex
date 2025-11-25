import { overlayInstance } from './app.js';
import { verilexStore } from './store.js';

const calendarGrid = document.getElementById('calendar-grid');
const currentMonthEl = document.getElementById('calendar-current-month');
const summaryEl = document.getElementById('calendar-filter-summary');
const emptyStateEl = document.getElementById('calendar-empty-state');
const upcomingListEl = document.getElementById('calendar-upcoming-list');
const upcomingEmptyEl = document.getElementById('calendar-upcoming-empty');
const detailBodyEl = document.getElementById('calendar-detail-body');
const prevButton = document.getElementById('calendar-prev');
const nextButton = document.getElementById('calendar-next');
const searchInput = document.getElementById('calendar-search');
const typeSelect = document.getElementById('calendar-type-filter');
const locationSelect = document.getElementById('calendar-location-filter');
const focusCriticalCheckbox = document.getElementById('calendar-focus-critical');

if (!calendarGrid || !currentMonthEl) {
  console.warn('Kalender konnte nicht initialisiert werden.');
}

const weekdayFormatter = new Intl.DateTimeFormat('de-DE', {
  weekday: 'long',
});

const monthFormatter = new Intl.DateTimeFormat('de-DE', {
  month: 'long',
  year: 'numeric',
});

const dayFormatter = new Intl.DateTimeFormat('de-DE', {
  day: 'numeric',
  month: 'numeric',
});

const fullDateTimeFormatter = new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'full',
  timeStyle: 'short',
});

const timeFormatter = new Intl.DateTimeFormat('de-DE', {
  hour: '2-digit',
  minute: '2-digit',
});

const relativeTimeFormatter = new Intl.RelativeTimeFormat('de', {
  numeric: 'auto',
});

let events = [];
let filteredEvents = [];
let currentYear;
let currentMonthIndex;
let selectedEventId = null;

function getStore() {
  return (typeof window !== 'undefined' && window.verilexStore) || verilexStore || null;
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  // Versuch mit explizitem lokalen Datum
  const fallback = new Date(`${value}T00:00`);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback;
  }

  return null;
}

function normalizeEvent(entry) {
  const start = parseDate(entry.dateTime ?? entry.start ?? entry.date);
  if (!start) {
    return null;
  }

  const normalizedType = mapAppointmentType(entry.type ?? 'meeting');
  const locationType = (entry.locationType ?? '').toString().trim().toLowerCase();

  return {
    id: entry.id ?? crypto.randomUUID?.() ?? `event-${Math.random().toString(16).slice(2)}`,
    title: (entry.title ?? 'Unbenannter Termin').toString().trim(),
    type: normalizedType,
    location: (entry.location ?? 'Ort unbekannt').toString().trim(),
    locationType: locationType || inferLocationType(entry.location),
    caseNumber: (entry.caseNumber ?? '').toString().trim(),
    client: (entry.client ?? '').toString().trim(),
    participants: Array.isArray(entry.participants)
      ? entry.participants.map((item) => item.toString().trim()).filter(Boolean)
      : [],
    notes: (entry.notes ?? '').toString().trim(),
    start,
    dateKey: buildDateKey(start),
  };
}

function mapAppointmentType(value) {
  const normalized = (value ?? '').toString().trim().toLowerCase();
  if (['hearing', 'verhandlung', 'gerichtstermin'].includes(normalized)) {
    return 'hearing';
  }
  if (['deadline', 'frist'].includes(normalized)) {
    return 'deadline';
  }
  if (['workshop', 'training', 'schulung'].includes(normalized)) {
    return 'workshop';
  }
  return 'meeting';
}

function inferLocationType(location) {
  const value = (location ?? '').toString().toLowerCase();
  if (!value) return '';
  if (value.includes('videokonferenz') || value.includes('remote') || value.includes('teams') || value.includes('zoom')) {
    return 'remote';
  }
  if (value.includes('gericht')) {
    return 'court';
  }
  if (value.includes('kanzlei') || value.includes('büro') || value.includes('office')) {
    return 'office';
  }
  return '';
}

function buildDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function differenceInDays(startDate, endDate) {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((end - start) / msPerDay);
}

function isCritical(event) {
  const now = new Date();
  const daysUntil = differenceInDays(now, event.start);
  if (daysUntil <= 2 && daysUntil >= 0) {
    return true;
  }
  return event.type === 'hearing' || event.type === 'deadline';
}

function parseEventsFromInline() {
  const dataElement = document.getElementById('calendar-data');
  if (!dataElement) {
    events = [];
    return;
  }

  try {
    const raw = dataElement.textContent ?? '[]';
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      events = [];
      return;
    }

    events = parsed
      .map((entry) => {
        try {
          return normalizeEvent(entry);
        } catch (error) {
          console.error('Termin konnte nicht normalisiert werden.', error);
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => a.start - b.start);
  } catch (error) {
    console.error('Kalenderdaten konnten nicht geladen werden.', error);
    overlayInstance?.show?.({
      title: 'Kalender konnte nicht geladen werden',
      message: 'Die Terminliste ließ sich nicht verarbeiten.',
      details: error,
    });
    events = [];
  }
}

function buildLookup(records, key) {
  return records.reduce((acc, item) => {
    acc[item[key]] = item;
    return acc;
  }, {});
}

function mapAppointmentToEvent(appointment, lookups) {
  const start = parseDate(appointment.dateTime);
  if (!start) return null;

  const caseInfo = lookups.cases[appointment.caseId];
  const clientInfo = caseInfo ? lookups.clients[caseInfo.clientId] : undefined;

  const participants = Array.isArray(appointment.participants)
    ? appointment.participants
        .map((userId) => lookups.users[userId]?.name || userId)
        .filter(Boolean)
    : [];

  return {
    id: appointment.id,
    title: appointment.description || 'Besprechung',
    type: mapAppointmentType(appointment.type),
    location: appointment.location || 'Ort wird noch festgelegt',
    locationType: inferLocationType(appointment.location),
    caseNumber: caseInfo?.caseNumber || '',
    client: clientInfo?.name || '',
    participants,
    notes: '',
    start,
    dateKey: buildDateKey(start),
  };
}

function mapComplianceItemToEvent(item, lookups) {
  const start = parseDate(item.deadline);
  if (!start) return null;

  const caseInfo = lookups.cases[item.caseId];
  const clientInfo = caseInfo ? lookups.clients[caseInfo.clientId] : undefined;
  const owner = item.ownerId ? lookups.users[item.ownerId]?.name : null;

  const notes = [owner ? `Verantwortlich: ${owner}` : null, item.notes || null]
    .filter(Boolean)
    .join(' • ');

  return {
    id: `compliance-${item.id}`,
    title: item.title,
    type: 'deadline',
    location: 'Frist / Compliance',
    locationType: '',
    caseNumber: caseInfo?.caseNumber || '',
    client: clientInfo?.name || '',
    participants: owner ? [owner] : [],
    notes,
    start,
    dateKey: buildDateKey(start),
  };
}

function loadEventsFromStore() {
  const store = getStore();
  if (!store) {
    return false;
  }

  try {
    const cases = store.getAll('Case');
    const clients = store.getAll('Client');
    const users = store.getAll('User');
    const appointments = store.getAll('Appointment');
    const complianceItems = store.getAll('ComplianceItem');

    const lookups = {
      cases: buildLookup(cases, 'id'),
      clients: buildLookup(clients, 'id'),
      users: buildLookup(users, 'id'),
    };

    const appointmentEvents = appointments
      .map((appointment) => mapAppointmentToEvent(appointment, lookups))
      .filter(Boolean);

    const complianceEvents = complianceItems
      .map((item) => mapComplianceItemToEvent(item, lookups))
      .filter(Boolean);

    events = [...appointmentEvents, ...complianceEvents].sort((a, b) => a.start - b.start);
    return true;
  } catch (error) {
    console.warn('Kalender konnte nicht aus dem zentralen Store geladen werden.', error);
    return false;
  }
}

function initialiseCurrentMonth() {
  const today = new Date();
  const firstUpcoming = events.find((event) => event.start >= today);
  const reference = firstUpcoming ? firstUpcoming.start : today;
  currentYear = reference.getFullYear();
  currentMonthIndex = reference.getMonth();
}

function updateCurrentMonthLabel() {
  const current = new Date(currentYear, currentMonthIndex, 1);
  currentMonthEl.textContent = monthFormatter.format(current);
}

function getMonthMatrix(year, monthIndex) {
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const offset = (firstDayOfMonth.getDay() + 6) % 7; // Montag = 0
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;

  const cells = [];
  for (let index = 0; index < totalCells; index += 1) {
    const dayOffset = index - offset + 1;
    const cellDate = new Date(year, monthIndex, dayOffset);
    cells.push(cellDate);
  }
  return cells;
}

function clearCalendarGrid() {
  const cells = calendarGrid.querySelectorAll('.calendar-grid__cell');
  cells.forEach((cell) => cell.remove());
}

function renderCalendar() {
  if (!calendarGrid) {
    return;
  }

  clearCalendarGrid();

  const cells = getMonthMatrix(currentYear, currentMonthIndex);
  const today = new Date();
  const todayKey = buildDateKey(today);

  const eventsByDate = new Map();
  filteredEvents.forEach((event) => {
    const list = eventsByDate.get(event.dateKey) ?? [];
    list.push(event);
    eventsByDate.set(event.dateKey, list);
  });

  cells.forEach((date) => {
    const cell = document.createElement('div');
    cell.className = 'calendar-grid__cell';
    cell.setAttribute('role', 'gridcell');

    const dateKey = buildDateKey(date);
    const isOutsideMonth = date.getMonth() !== currentMonthIndex;
    if (isOutsideMonth) {
      cell.classList.add('calendar-grid__cell--outside');
      cell.setAttribute('aria-disabled', 'true');
    }

    if (dateKey === todayKey) {
      cell.classList.add('calendar-grid__cell--today');
    }

    const meta = document.createElement('div');
    meta.className = 'calendar-grid__meta';
    const dayNumber = document.createElement('span');
    dayNumber.className = 'calendar-grid__day';
    dayNumber.textContent = String(date.getDate());
    meta.append(dayNumber);

    const weekdayLabel = weekdayFormatter.format(date);
    cell.setAttribute('aria-label', `${weekdayLabel}, ${dayFormatter.format(date)}.`);

    if (dateKey === todayKey) {
      const badge = document.createElement('span');
      badge.className = 'calendar-grid__badge';
      badge.textContent = 'Heute';
      meta.append(badge);
    }

    cell.append(meta);

    const eventsForDay = eventsByDate.get(dateKey) ?? [];
    if (eventsForDay.length) {
      const list = document.createElement('ul');
      list.className = 'calendar-grid__events';

      eventsForDay
        .slice()
        .sort((a, b) => a.start - b.start)
        .forEach((event) => {
          const item = document.createElement('li');
          item.className = 'calendar-grid__event-item';

          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'calendar-event';
          button.dataset.eventId = event.id;
          button.textContent = `${timeFormatter.format(event.start)} • ${event.title}`;
          button.setAttribute('aria-label', `${event.title}, ${timeFormatter.format(event.start)} Uhr`);
          button.addEventListener('click', () => selectEvent(event.id, { revealMonth: false }));

          button.classList.add(`calendar-event--${event.type}`);
          if (isCritical(event)) {
            button.classList.add('calendar-event--critical');
          }
          if (event.id === selectedEventId) {
            button.classList.add('calendar-event--selected');
          }

          item.append(button);
          list.append(item);
        });

      cell.append(list);
    } else if (!isOutsideMonth) {
      const placeholder = document.createElement('p');
      placeholder.className = 'calendar-grid__empty';
      placeholder.textContent = 'Keine Termine';
      cell.append(placeholder);
    }

    calendarGrid.append(cell);
  });

  const hasEventsInMonth = cells.some((date) => {
    if (date.getMonth() !== currentMonthIndex) {
      return false;
    }
    const key = buildDateKey(date);
    return (eventsByDate.get(key)?.length ?? 0) > 0;
  });

  if (emptyStateEl) {
    if (!hasEventsInMonth) {
      emptyStateEl.removeAttribute('hidden');
    } else {
      emptyStateEl.setAttribute('hidden', '');
    }
  }
}

function getUpcomingEvents(daysRange = 30) {
  const now = new Date();
  const limit = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysRange + 1);
  return filteredEvents
    .filter((event) => event.start >= now && event.start < limit)
    .sort((a, b) => a.start - b.start)
    .slice(0, 8);
}

function renderUpcomingList() {
  if (!upcomingListEl) {
    return;
  }

  upcomingListEl.innerHTML = '';
  const upcoming = getUpcomingEvents();

  if (!upcoming.length) {
    if (upcomingEmptyEl) {
      upcomingEmptyEl.removeAttribute('hidden');
    }
    return;
  }

  if (upcomingEmptyEl) {
    upcomingEmptyEl.setAttribute('hidden', '');
  }

  upcoming.forEach((event) => {
    const item = document.createElement('li');
    item.className = 'calendar-upcoming__item';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'calendar-upcoming__button';
    button.dataset.eventId = event.id;
    button.addEventListener('click', () => selectEvent(event.id, { revealMonth: true }));

    const header = document.createElement('div');
    header.className = 'calendar-upcoming__meta';
    const dateLabel = document.createElement('span');
    dateLabel.className = 'calendar-upcoming__date';
    dateLabel.textContent = `${weekdayFormatter.format(event.start).slice(0, 2)} · ${dayFormatter.format(event.start)} · ${timeFormatter.format(event.start)} Uhr`;
    header.append(dateLabel);

    const relative = new Date();
    const diffDays = differenceInDays(relative, event.start);
    const relativeLabel = document.createElement('span');
    relativeLabel.className = 'calendar-upcoming__relative';
    relativeLabel.textContent = relativeTimeFormatter.format(diffDays, 'day');
    header.append(relativeLabel);

    button.append(header);

    const title = document.createElement('span');
    title.className = 'calendar-upcoming__title';
    title.textContent = event.title;
    button.append(title);

    if (event.caseNumber) {
      const caseInfo = document.createElement('span');
      caseInfo.className = 'calendar-upcoming__case';
      caseInfo.textContent = `${event.caseNumber}${event.client ? ` – ${event.client}` : ''}`;
      button.append(caseInfo);
    } else if (event.client) {
      const clientInfo = document.createElement('span');
      clientInfo.className = 'calendar-upcoming__case';
      clientInfo.textContent = event.client;
      button.append(clientInfo);
    }

    const badge = document.createElement('span');
    badge.className = 'calendar-upcoming__badge';
    badge.textContent = mapTypeToLabel(event.type);
    button.append(badge);

    if (event.id === selectedEventId) {
      button.classList.add('calendar-upcoming__button--selected');
    }

    item.append(button);
    upcomingListEl.append(item);
  });
}

function mapTypeToLabel(type) {
  switch (type) {
    case 'hearing':
      return 'Gerichtstermin';
    case 'meeting':
      return 'Meeting';
    case 'deadline':
      return 'Frist';
    case 'workshop':
      return 'Workshop';
    default:
      return 'Termin';
  }
}

function renderDetail(event) {
  if (!detailBodyEl) {
    return;
  }

  detailBodyEl.innerHTML = '';

  const title = document.createElement('h4');
  title.className = 'calendar-detail__title';
  title.textContent = event.title;
  detailBodyEl.append(title);

  const when = document.createElement('p');
  when.className = 'calendar-detail__datetime';
  when.textContent = fullDateTimeFormatter.format(event.start);
  detailBodyEl.append(when);

  const badgeList = document.createElement('div');
  badgeList.className = 'calendar-detail__badges';

  const typeBadge = document.createElement('span');
  typeBadge.className = `calendar-detail__badge calendar-detail__badge--${event.type}`;
  typeBadge.textContent = mapTypeToLabel(event.type);
  badgeList.append(typeBadge);

  if (event.locationType) {
    const locationBadge = document.createElement('span');
    locationBadge.className = `calendar-detail__badge calendar-detail__badge--${event.locationType}`;
    switch (event.locationType) {
      case 'court':
        locationBadge.textContent = 'Gericht';
        break;
      case 'office':
        locationBadge.textContent = 'Kanzlei';
        break;
      case 'remote':
        locationBadge.textContent = 'Remote';
        break;
      default:
        locationBadge.textContent = 'Ort';
    }
    badgeList.append(locationBadge);
  }

  if (isCritical(event)) {
    const criticalBadge = document.createElement('span');
    criticalBadge.className = 'calendar-detail__badge calendar-detail__badge--critical';
    criticalBadge.textContent = 'Kritisch';
    badgeList.append(criticalBadge);
  }

  detailBodyEl.append(badgeList);

  const descriptionList = document.createElement('dl');
  descriptionList.className = 'calendar-detail__properties';

  const addProperty = (label, value) => {
    if (!value) return;
    const term = document.createElement('dt');
    term.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    descriptionList.append(term, dd);
  };

  addProperty('Ort', event.location);
  addProperty('Aktenzeichen', event.caseNumber || undefined);
  addProperty('Mandant:in', event.client || undefined);

  if (event.participants.length) {
    addProperty('Teilnehmende', event.participants.join(', '));
  }

  if (event.notes) {
    addProperty('Hinweise', event.notes);
  }

  detailBodyEl.append(descriptionList);
}

function resetDetailView() {
  if (!detailBodyEl) {
    return;
  }
  detailBodyEl.innerHTML = '';
  const message = document.createElement('p');
  message.textContent = 'Wählen Sie einen Termin aus der Kalenderansicht oder der Liste, um Details zu sehen.';
  detailBodyEl.append(message);
}

function selectEvent(eventId, { revealMonth }) {
  const event = filteredEvents.find((item) => item.id === eventId);
  if (!event) {
    return;
  }

  selectedEventId = eventId;

  if (revealMonth) {
    currentYear = event.start.getFullYear();
    currentMonthIndex = event.start.getMonth();
    updateCurrentMonthLabel();
    renderCalendar();
  } else {
    updateSelectedEventStyling();
  }

  renderDetail(event);
  renderUpcomingList();
}

function updateSelectedEventStyling() {
  const buttons = calendarGrid.querySelectorAll('.calendar-event');
  buttons.forEach((button) => {
    if (button.dataset.eventId === selectedEventId) {
      button.classList.add('calendar-event--selected');
    } else {
      button.classList.remove('calendar-event--selected');
    }
  });

  const upcomingButtons = upcomingListEl?.querySelectorAll('.calendar-upcoming__button') ?? [];
  upcomingButtons.forEach((button) => {
    if (button.dataset.eventId === selectedEventId) {
      button.classList.add('calendar-upcoming__button--selected');
    } else {
      button.classList.remove('calendar-upcoming__button--selected');
    }
  });
}

function applyFilters() {
  const query = (searchInput?.value ?? '').trim().toLowerCase();
  const type = typeSelect?.value ?? 'all';
  const location = locationSelect?.value ?? 'all';
  const focusCritical = !!focusCriticalCheckbox?.checked;

  filteredEvents = events.filter((event) => {
    if (type !== 'all' && event.type !== type) {
      return false;
    }
    if (location !== 'all') {
      if (location === 'remote' && event.locationType !== 'remote') {
        return false;
      }
      if (location === 'court' && event.locationType !== 'court') {
        return false;
      }
      if (location === 'office' && event.locationType !== 'office') {
        return false;
      }
    }
    if (focusCritical && !isCritical(event)) {
      return false;
    }
    if (query) {
      const haystack = [
        event.title,
        event.caseNumber,
        event.client,
        event.location,
        event.participants.join(' '),
        mapTypeToLabel(event.type),
      ]
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(query)) {
        return false;
      }
    }
    return true;
  });

  updateSummary({ query, type, location, focusCritical });
  renderCalendar();
  renderUpcomingList();

  if (!filteredEvents.some((event) => event.id === selectedEventId)) {
    selectedEventId = null;
    resetDetailView();
  }
}

function reloadFromStoreAndRender() {
  const loaded = loadEventsFromStore();
  if (!loaded) {
    return;
  }
  initialiseCurrentMonth();
  updateCurrentMonthLabel();
  applyFilters();
}

function registerStoreSubscriptions() {
  const store = getStore();
  if (!store?.on) {
    return;
  }

  const refreshEvents = () => reloadFromStoreAndRender();
  const eventNames = [
    'storeReady',
    'storeReset',
    'appointmentAdded',
    'appointmentUpdated',
    'appointmentRemoved',
    'complianceItemAdded',
    'complianceItemUpdated',
    'complianceItemRemoved',
    'caseUpdated',
    'clientUpdated',
    'userUpdated',
  ];

  eventNames.forEach((eventName) => {
    store.on(eventName, refreshEvents);
  });
}

function updateSummary({ query, type, location, focusCritical }) {
  if (!summaryEl) {
    return;
  }

  const activeFilters = [];
  if (query) {
    activeFilters.push(`Suche nach "${query}"`);
  }
  if (type !== 'all') {
    activeFilters.push(mapTypeToLabel(type));
  }
  if (location !== 'all') {
    const label =
      location === 'court' ? 'Gericht' : location === 'office' ? 'Kanzlei' : 'Remote';
    activeFilters.push(label);
  }
  if (focusCritical) {
    activeFilters.push('kritische Termine');
  }

  const count = filteredEvents.length;
  const countLabel = count === 1 ? '1 Termin gefunden.' : `${count} Termine gefunden.`;
  const filterLabel = activeFilters.length ? `Aktive Filter: ${activeFilters.join(', ')}.` : 'Keine Filter aktiv.';

  summaryEl.textContent = `${countLabel} ${filterLabel}`;
}

function changeMonth(step) {
  currentMonthIndex += step;
  if (currentMonthIndex < 0) {
    currentMonthIndex = 11;
    currentYear -= 1;
  } else if (currentMonthIndex > 11) {
    currentMonthIndex = 0;
    currentYear += 1;
  }
  updateCurrentMonthLabel();
  renderCalendar();
}

function registerEvents() {
  prevButton?.addEventListener('click', () => changeMonth(-1));
  nextButton?.addEventListener('click', () => changeMonth(1));
  searchInput?.addEventListener('input', () => applyFilters());
  typeSelect?.addEventListener('change', () => applyFilters());
  locationSelect?.addEventListener('change', () => applyFilters());
  focusCriticalCheckbox?.addEventListener('change', () => applyFilters());
}

function initCalendar() {
  if (!calendarGrid || !currentMonthEl) {
    return;
  }

  const loadedFromStore = loadEventsFromStore();
  if (!loadedFromStore) {
    parseEventsFromInline();
  }

  initialiseCurrentMonth();
  updateCurrentMonthLabel();
  registerEvents();
  registerStoreSubscriptions();
  applyFilters();
}

initCalendar();
