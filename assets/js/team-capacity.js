import { overlayInstance } from './app.js';

const capacityDataElement = document.getElementById('team-capacity-data');
const overviewDescriptionEl = document.getElementById('capacity-overview-description');
const indicatorEl = document.querySelector('.capacity-indicator');
const indicatorValueEl = document.getElementById('capacity-indicator-value');
const indicatorMetaEl = document.getElementById('capacity-overview-meta');
const totalHoursEl = document.getElementById('capacity-total-hours');
const bookedHoursEl = document.getElementById('capacity-booked-hours');
const billableHoursEl = document.getElementById('capacity-billable-hours');
const freeHoursEl = document.getElementById('capacity-free-hours');
const searchInput = document.getElementById('capacity-search');
const roleSelect = document.getElementById('capacity-role-filter');
const loadSelect = document.getElementById('capacity-load-filter');
const tableBody = document.getElementById('capacity-table-body');
const emptyStateEl = document.getElementById('capacity-empty-state');
const bottleneckListEl = document.getElementById('capacity-bottleneck-list');
const upcomingListEl = document.getElementById('capacity-upcoming-list');

const STATUS_LABELS = {
  critical: 'Engpass',
  warning: 'Beobachten',
  ok: 'Stabil',
};

const SEVERITY_LABELS = {
  hoch: 'Hoch',
  mittel: 'Mittel',
  niedrig: 'Niedrig',
};

let rawMembers = [];
let planningPeriod = '';
let summaryTotals = null;
let bottleneckItems = [];
let upcomingItems = [];

function formatNumber(value, { maximumFractionDigits = 0 } = {}) {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits }).format(value);
}

function formatHours(value) {
  const normalized = Math.max(0, Number(value) || 0);
  return `${formatNumber(normalized)} h`;
}

function formatPercent(value, { maximumFractionDigits = 0 } = {}) {
  return `${formatNumber(value, { maximumFractionDigits })} %`;
}

function formatDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('de-AT', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

function determineStatus(utilization) {
  if (utilization >= 0.9) {
    return 'critical';
  }
  if (utilization >= 0.7) {
    return 'warning';
  }
  return 'ok';
}

function normalizeMember(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const capacity = Math.max(0, Number(entry.capacity) || 0);
  const booked = Math.min(capacity, Math.max(0, Number(entry.booked) || 0));
  const billable = Math.min(booked, Math.max(0, Number(entry.billable) || 0));
  const nonBillable = Math.min(booked, Math.max(0, Number(entry.nonBillable) || 0));
  const free = Math.max(0, capacity - booked);
  const utilization = capacity > 0 ? booked / capacity : 0;

  const requestedStatus = typeof entry.status === 'string' ? entry.status.toLowerCase() : '';
  const status = ['critical', 'warning', 'ok'].includes(requestedStatus)
    ? requestedStatus
    : determineStatus(utilization);

  const focus = typeof entry.focus === 'string' ? entry.focus.trim() : '';
  const caseLabel = typeof entry.case === 'string' ? entry.case.trim() : '';
  const nextMilestone = typeof entry.nextMilestone === 'string' ? entry.nextMilestone.trim() : '';

  return {
    id: String(entry.id ?? crypto.randomUUID?.() ?? `member-${Date.now()}`),
    name: typeof entry.name === 'string' ? entry.name.trim() : 'Unbekannt',
    roleLabel:
      typeof entry.roleLabel === 'string' && entry.roleLabel.trim()
        ? entry.roleLabel.trim()
        : 'Team',
    roleId:
      typeof entry.roleId === 'string' && entry.roleId.trim()
        ? entry.roleId.trim().toLowerCase()
        : 'team',
    capacity,
    booked,
    billable,
    nonBillable,
    free,
    utilization,
    status,
    focus,
    caseLabel,
    nextMilestone,
    searchText: [
      entry.name,
      entry.roleLabel,
      entry.roleId,
      focus,
      caseLabel,
      nextMilestone,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
  };
}

function parseCapacityData() {
  if (!capacityDataElement) {
    return null;
  }

  try {
    const rawText = capacityDataElement.textContent ?? '{}';
    const parsed = JSON.parse(rawText);

    const members = Array.isArray(parsed.members) ? parsed.members.map(normalizeMember) : [];
    rawMembers = members.filter(Boolean);
    planningPeriod = typeof parsed.planningPeriod === 'string' ? parsed.planningPeriod.trim() : '';

    const summary = parsed.summary ?? {};
    summaryTotals = {
      totalCapacity:
        typeof summary.totalCapacity === 'number' && !Number.isNaN(summary.totalCapacity)
          ? summary.totalCapacity
          : rawMembers.reduce((total, member) => total + member.capacity, 0),
      booked:
        typeof summary.booked === 'number' && !Number.isNaN(summary.booked)
          ? summary.booked
          : rawMembers.reduce((total, member) => total + member.booked, 0),
      billable:
        typeof summary.billable === 'number' && !Number.isNaN(summary.billable)
          ? summary.billable
          : rawMembers.reduce((total, member) => total + member.billable, 0),
      nonBillable:
        typeof summary.nonBillable === 'number' && !Number.isNaN(summary.nonBillable)
          ? summary.nonBillable
          : rawMembers.reduce((total, member) => total + member.nonBillable, 0),
    };

    bottleneckItems = Array.isArray(parsed.bottlenecks) ? parsed.bottlenecks : [];
    upcomingItems = Array.isArray(parsed.upcoming) ? parsed.upcoming : [];
  } catch (error) {
    console.error('Die Kapazitätsdaten konnten nicht gelesen werden.', error);
    overlayInstance?.show?.({
      title: 'Daten konnten nicht geladen werden',
      message: 'Die Team-Auslastung steht momentan nicht zur Verfügung.',
      details: error,
    });
    rawMembers = [];
    planningPeriod = '';
    summaryTotals = { totalCapacity: 0, booked: 0, billable: 0, nonBillable: 0 };
    bottleneckItems = [];
    upcomingItems = [];
  }
}

function updateOverview() {
  if (!summaryTotals) {
    return;
  }

  const totalCapacity = Math.max(0, Number(summaryTotals.totalCapacity) || 0);
  const booked = Math.min(totalCapacity, Math.max(0, Number(summaryTotals.booked) || 0));
  const billable = Math.min(booked, Math.max(0, Number(summaryTotals.billable) || 0));
  const nonBillable = Math.max(0, Number(summaryTotals.nonBillable) || 0);
  const free = Math.max(0, totalCapacity - booked);
  const utilizationPercent = totalCapacity > 0 ? (booked / totalCapacity) * 100 : 0;
  const billableShare = booked > 0 ? (billable / booked) * 100 : 0;
  const nonBillableShare = booked > 0 ? (nonBillable / booked) * 100 : 0;

  if (overviewDescriptionEl) {
    const memberCount = rawMembers.length;
    const periodText = planningPeriod ? `Planungszeitraum: ${planningPeriod}. ` : '';
    overviewDescriptionEl.textContent = `${periodText}${memberCount} Teammitglieder im Überblick.`;
  }

  if (indicatorEl) {
    indicatorEl.style.setProperty('--capacity-indicator', `${Math.max(0, Math.min(utilizationPercent, 100)) * 3.6}deg`);
    indicatorEl.dataset.status = determineStatus(utilizationPercent / 100);
  }

  if (indicatorValueEl) {
    indicatorValueEl.textContent = formatPercent(Math.max(0, Math.min(utilizationPercent, 100)), {
      maximumFractionDigits: utilizationPercent < 100 && utilizationPercent % 1 !== 0 ? 1 : 0,
    });
  }

  if (indicatorMetaEl) {
    indicatorMetaEl.textContent = `Billbar: ${formatHours(billable)} (${formatPercent(Math.round(billableShare))}) · ` +
      `Intern: ${formatHours(nonBillable)} (${formatPercent(Math.round(nonBillableShare))})`;
  }

  if (totalHoursEl) totalHoursEl.textContent = formatHours(totalCapacity);
  if (bookedHoursEl) bookedHoursEl.textContent = formatHours(booked);
  if (billableHoursEl) billableHoursEl.textContent = formatHours(billable);
  if (freeHoursEl) freeHoursEl.textContent = formatHours(free);
}

function populateRoleFilter() {
  if (!roleSelect) {
    return;
  }

  const seen = new Set();
  rawMembers.forEach((member) => {
    if (!member.roleId || seen.has(member.roleId)) {
      return;
    }
    seen.add(member.roleId);
    const option = document.createElement('option');
    option.value = member.roleId;
    option.textContent = member.roleLabel;
    roleSelect.append(option);
  });
}

function renderTable(members) {
  if (!tableBody) {
    return;
  }

  tableBody.innerHTML = '';

  if (!members.length) {
    if (emptyStateEl) {
      emptyStateEl.hidden = false;
    }
    return;
  }

  if (emptyStateEl) {
    emptyStateEl.hidden = true;
  }

  members.forEach((member) => {
    const row = document.createElement('tr');
    row.dataset.status = member.status;

    const nameCell = document.createElement('th');
    nameCell.scope = 'row';
    nameCell.innerHTML = `
      <div class="capacity-member">
        <span class="capacity-member__name">${member.name}</span>
        <span class="capacity-member__detail">${[member.focus, member.caseLabel].filter(Boolean).join(' · ')}</span>
      </div>
    `;

    const roleCell = document.createElement('td');
    roleCell.innerHTML = `<span class="capacity-role">${member.roleLabel}</span>`;

    const capacityCell = document.createElement('td');
    capacityCell.innerHTML = `<span class="capacity-highlight">${formatHours(member.capacity)}</span>`;

    const loadCell = document.createElement('td');
    const utilizationPercent = Math.max(0, Math.min(100, Math.round(member.utilization * 100)));
    const progress = document.createElement('div');
    progress.className = 'capacity-progress';
    progress.dataset.status = member.status;
    progress.style.setProperty('--capacity-progress-value', `${utilizationPercent}`);
    progress.setAttribute(
      'aria-label',
      `Auslastung ${formatPercent(utilizationPercent)} von ${formatHours(member.capacity)}`
    );

    const progressBar = document.createElement('div');
    progressBar.className = 'capacity-progress__bar';
    progress.append(progressBar);

    const progressMeta = document.createElement('div');
    progressMeta.className = 'capacity-progress__meta';
    progressMeta.innerHTML = `
      <span class="capacity-progress__value">${formatPercent(utilizationPercent)}</span>
      <span class="capacity-progress__hours">${formatHours(member.booked)} / ${formatHours(member.capacity)}</span>
    `;

    loadCell.append(progress, progressMeta);

    const billableCell = document.createElement('td');
    const billableShare = member.capacity > 0 ? Math.round((member.billable / member.capacity) * 100) : 0;
    billableCell.innerHTML = `
      <span class="capacity-highlight">${formatHours(member.billable)}</span>
      <span class="capacity-subtext">${formatPercent(billableShare)} des Plans</span>
    `;

    const availabilityCell = document.createElement('td');
    const availabilityLabel = member.free > 0 ? 'Noch frei' : 'Keine Kapazität';
    availabilityCell.innerHTML = `
      <span class="capacity-highlight">${formatHours(member.free)}</span>
      <span class="capacity-subtext">${availabilityLabel}</span>
    `;

    const noteCell = document.createElement('td');
    const statusLabel = STATUS_LABELS[member.status] ?? STATUS_LABELS.ok;
    noteCell.innerHTML = `
      <div class="capacity-note">
        <span class="capacity-status capacity-status--${member.status}">${statusLabel}</span>
        <p class="capacity-note__text">
          ${member.nextMilestone ? `<strong>${member.nextMilestone}</strong><br />` : ''}
          ${member.focus || 'Aktuelle Aufgaben' }
        </p>
      </div>
    `;

    row.append(nameCell, roleCell, capacityCell, loadCell, billableCell, availabilityCell, noteCell);
    tableBody.append(row);
  });
}

function filterMembers() {
  const searchTerm = (searchInput?.value ?? '').trim().toLowerCase();
  const selectedRole = roleSelect?.value ?? '';
  const selectedLoad = loadSelect?.value ?? 'all';

  const filtered = rawMembers.filter((member) => {
    if (selectedRole && member.roleId !== selectedRole) {
      return false;
    }

    if (selectedLoad !== 'all' && member.status !== selectedLoad) {
      return false;
    }

    if (searchTerm && !member.searchText.includes(searchTerm)) {
      return false;
    }

    return true;
  });

  const sorted = filtered.sort((a, b) => b.utilization - a.utilization);
  renderTable(sorted);
}

function renderBottlenecks() {
  if (!bottleneckListEl) {
    return;
  }

  bottleneckListEl.innerHTML = '';

  if (!bottleneckItems.length) {
    const item = document.createElement('li');
    item.className = 'capacity-list__item';
    item.textContent = 'Aktuell bestehen keine gemeldeten Engpässe.';
    bottleneckListEl.append(item);
    return;
  }

  bottleneckItems.forEach((entry) => {
    const severity = typeof entry.severity === 'string' ? entry.severity.toLowerCase() : 'mittel';
    const severityLabel = SEVERITY_LABELS[severity] ?? SEVERITY_LABELS.mittel;

    const item = document.createElement('li');
    item.className = 'capacity-list__item';
    item.innerHTML = `
      <div class="capacity-list__header">
        <span class="capacity-list__title">${entry.title ?? 'Unbenanntes Mandat'}</span>
        <span class="capacity-chip capacity-chip--${severity}">${severityLabel}</span>
      </div>
      <p class="capacity-list__meta">Verantwortlich: ${entry.owner ?? 'Team'}</p>
      <p class="capacity-list__text">${entry.action ?? 'Keine Maßnahmen definiert.'}</p>
    `;
    bottleneckListEl.append(item);
  });
}

function renderUpcoming() {
  if (!upcomingListEl) {
    return;
  }

  upcomingListEl.innerHTML = '';

  if (!upcomingItems.length) {
    const item = document.createElement('li');
    item.className = 'capacity-list__item';
    item.textContent = 'Keine anstehenden Meilensteine in dieser Woche.';
    upcomingListEl.append(item);
    return;
  }

  upcomingItems
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach((entry) => {
      const item = document.createElement('li');
      item.className = 'capacity-list__item';
      const dateLabel = formatDate(entry.date);
      item.innerHTML = `
        <div class="capacity-list__header">
          <span class="capacity-list__title">${dateLabel ? `${dateLabel} · ` : ''}${entry.label ?? 'Meilenstein'}</span>
        </div>
        <p class="capacity-list__meta">Verantwortlich: ${entry.owner ?? 'Team'}</p>
      `;
      upcomingListEl.append(item);
    });
}

function initFilters() {
  searchInput?.addEventListener('input', filterMembers);
  roleSelect?.addEventListener('change', filterMembers);
  loadSelect?.addEventListener('change', filterMembers);
}

function initialize() {
  parseCapacityData();
  updateOverview();
  populateRoleFilter();
  renderBottlenecks();
  renderUpcoming();
  initFilters();
  filterMembers();
}

initialize();
