import { overlayInstance } from './app.js';
import { verilexStore } from './store.js';

const PROBABILITY_SCALE = {
  niedrig: 1,
  mittel: 2,
  hoch: 3,
};

const IMPACT_SCALE = {
  niedrig: 1,
  mittel: 2,
  hoch: 3,
};

const PROBABILITY_ORDER = ['niedrig', 'mittel', 'hoch'];
const IMPACT_ORDER = ['hoch', 'mittel', 'niedrig'];

let enhancedCases = [];

const elements = {
  lastUpdateLabel: document.getElementById('risk-last-update-label'),
  totalValue: document.getElementById('risk-total-value'),
  criticalValue: document.getElementById('risk-critical-value'),
  deadlineValue: document.getElementById('risk-deadline-value'),
  searchInput: document.getElementById('risk-search'),
  ownerFilter: document.getElementById('risk-owner-filter'),
  stageFilter: document.getElementById('risk-stage-filter'),
  levelFilter: document.getElementById('risk-level-filter'),
  resetFiltersButton: document.getElementById('risk-reset-filters'),
  matrixBody: document.getElementById('risk-matrix-body'),
  detailSummary: document.getElementById('risk-detail-summary'),
  detailTableBody: document.getElementById('risk-detail-table-body'),
  emptyState: document.getElementById('risk-empty-state'),
  exportButton: document.getElementById('risk-export-button'),
  briefingContent: document.getElementById('risk-briefing-content'),
};

function toLookupMap(list, key = 'id') {
  return new Map(list.map((item) => [item[key], item]));
}

function groupByCaseId(list) {
  return list.reduce((acc, item) => {
    const caseId = item.caseId;
    if (!caseId) {
      return acc;
    }
    const bucket = acc.get(caseId) ?? [];
    bucket.push(item);
    acc.set(caseId, bucket);
    return acc;
  }, new Map());
}

function determineImpact(priority) {
  if (priority === 'hoch') return 'hoch';
  if (priority === 'mittel') return 'mittel';
  return 'niedrig';
}

function determineProbability(nextDeadline, priority) {
  const impactFallback = determineImpact(priority);

  if (!nextDeadline) {
    return impactFallback;
  }

  const deadlineDate = parseDate(nextDeadline.date);
  if (!deadlineDate) {
    return nextDeadline.risk ?? impactFallback;
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const compareDate = new Date(deadlineDate);
  compareDate.setHours(0, 0, 0, 0);
  const diffDays = (compareDate - now) / (24 * 60 * 60 * 1000);

  if (nextDeadline.risk === 'hoch' || diffDays <= 7) {
    return 'hoch';
  }
  if (nextDeadline.risk === 'mittel' || diffDays <= 14) {
    return 'mittel';
  }
  return impactFallback;
}

function selectNextDeadline(deadlines) {
  if (!Array.isArray(deadlines) || deadlines.length === 0) {
    return null;
  }

  const sorted = [...deadlines].sort((a, b) => {
    const timeA = parseDate(a.date)?.getTime() ?? Infinity;
    const timeB = parseDate(b.date)?.getTime() ?? Infinity;
    return timeA - timeB;
  });

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const upcoming = sorted.find((deadline) => {
    const parsed = parseDate(deadline.date);
    if (!parsed) return false;
    parsed.setHours(0, 0, 0, 0);
    return parsed.getTime() >= now.getTime();
  });

  return upcoming ?? sorted[0];
}

function getResponsible(caseItem, userLookup) {
  const firstUserId = Array.isArray(caseItem.assignedUsers) ? caseItem.assignedUsers[0] : null;
  if (!firstUserId) {
    return 'Noch nicht zugewiesen';
  }
  return userLookup.get(firstUserId)?.name ?? 'Unbekanntes Teammitglied';
}

function getDeadlineCandidates(caseItem, complianceItems, appointments) {
  const caseDeadlines = Array.isArray(caseItem.deadlines)
    ? caseItem.deadlines.map((deadline) => ({
        date: deadline.date,
        title: deadline.title,
        risk: deadline.risk,
      }))
    : [];

  const complianceDeadlines = complianceItems.map((item) => ({
    date: item.deadline,
    title: `Compliance: ${item.title}`,
    risk: item.risk,
    notes: item.notes,
  }));

  const appointmentDeadlines = appointments.map((appointment) => ({
    date: appointment.dateTime,
    title: `Termin: ${appointment.description}`,
    risk: 'mittel',
  }));

  return [...caseDeadlines, ...complianceDeadlines, ...appointmentDeadlines];
}

function computeLastUpdated(caseItem, complianceItems, appointments, timeEntries, documents) {
  const candidates = [
    caseItem.openedAt,
    ...caseItem.deadlines?.map((deadline) => deadline.date) ?? [],
    ...complianceItems.map((item) => item.deadline),
    ...appointments.map((item) => item.dateTime),
    ...timeEntries.map((item) => item.startedAt ?? item.endedAt),
    ...documents.map((doc) => doc.createdAt),
  ]
    .map((value) => parseDate(value))
    .filter(Boolean)
    .map((date) => date.getTime());

  if (!candidates.length) {
    return caseItem.openedAt ?? null;
  }

  return new Date(Math.max(...candidates)).toISOString();
}

function buildEnhancedCase(caseItem, lookups) {
  const clientName = lookups.clients.get(caseItem.clientId)?.name ?? 'Unbekannter Mandant';
  const complianceItems = lookups.complianceByCase.get(caseItem.id) ?? [];
  const appointments = lookups.appointmentsByCase.get(caseItem.id) ?? [];
  const timeEntries = lookups.timeEntriesByCase.get(caseItem.id) ?? [];
  const documents = lookups.documentsByCase.get(caseItem.id) ?? [];

  const deadlineCandidates = getDeadlineCandidates(caseItem, complianceItems, appointments);
  const nextDeadline = selectNextDeadline(deadlineCandidates);
  const probability = determineProbability(nextDeadline, caseItem.priority);
  const impact = determineImpact(caseItem.priority);
  const probabilityValue = PROBABILITY_SCALE[probability] ?? 1;
  const impactValue = IMPACT_SCALE[impact] ?? 1;
  const score = probabilityValue * impactValue;
  const lastUpdated = computeLastUpdated(
    caseItem,
    complianceItems,
    appointments,
    timeEntries,
    documents
  );

  const notes =
    nextDeadline?.notes ??
    complianceItems[0]?.notes ??
    `Fokus: ${caseItem.category ?? 'Allgemeines Kanzleirisiko'}`;

  return {
    id: caseItem.caseNumber ?? caseItem.id,
    title: caseItem.title ?? 'Unbenanntes Mandat',
    client: clientName,
    stage: caseItem.status ?? 'Bearbeitung',
    probability,
    impact,
    probabilityValue,
    impactValue,
    score,
    owner: getResponsible(caseItem, lookups.users),
    nextDeadline: nextDeadline?.date ?? null,
    nextAction: nextDeadline?.title ?? 'Nächste Maßnahme planen',
    notes,
    category: caseItem.category ?? '',
    lastUpdated,
    bucket: getBucket(score),
  };
}

function rebuildEnhancedCases() {
  try {
    const clients = toLookupMap(verilexStore.getAll('Client'));
    const users = toLookupMap(verilexStore.getAll('User'));
    const complianceByCase = groupByCaseId(verilexStore.getAll('ComplianceItem'));
    const appointmentsByCase = groupByCaseId(verilexStore.getAll('Appointment'));
    const timeEntriesByCase = groupByCaseId(verilexStore.getAll('TimeEntry'));
    const documentsByCase = groupByCaseId(verilexStore.getAll('Document'));

    const cases = verilexStore.getAll('Case');
    enhancedCases = cases.map((caseItem) =>
      buildEnhancedCase(caseItem, {
        clients,
        users,
        complianceByCase,
        appointmentsByCase,
        timeEntriesByCase,
        documentsByCase,
      })
    );
  } catch (error) {
    console.error('Konnte Risiko-Daten nicht aus dem Store lesen.', error);
    overlayInstance?.show?.({
      title: 'Keine Risikodaten verfügbar',
      message: 'Der zentrale Datenstore konnte nicht geladen werden. Bitte aktualisieren Sie die Seite.',
      details: error,
    });
    enhancedCases = [];
  }
}

function getBucket(score) {
  if (score >= 9) {
    return 'critical';
  }
  if (score >= 6) {
    return 'high';
  }
  if (score >= 3) {
    return 'medium';
  }
  return 'low';
}

function capitalize(value) {
  if (!value) {
    return '';
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function formatDate(value) {
  const date = parseDate(value);
  if (!date) {
    return 'Keine Angabe';
  }
  return new Intl.DateTimeFormat('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatDeadline(value) {
  const date = parseDate(value);
  if (!date) {
    return 'Keine Angabe';
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  const diffDays = Math.round((compareDate - now) / (24 * 60 * 60 * 1000));

  const formatted = formatDate(compareDate);
  if (Number.isNaN(diffDays)) {
    return formatted;
  }

  if (diffDays > 0) {
    return `${formatted} (in ${diffDays} ${diffDays === 1 ? 'Tag' : 'Tagen'})`;
  }
  if (diffDays === 0) {
    return `${formatted} (heute)`;
  }
  return `${formatted} (${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'Tag' : 'Tagen'} überfällig)`;
}

function toSearchString(value) {
  return (value ?? '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function matchesSearch(entry, searchTerm) {
  if (!searchTerm) {
    return true;
  }

  const candidate = [entry.id, entry.title, entry.client, entry.owner, entry.category, entry.notes]
    .map(toSearchString)
    .join(' ');

  return candidate.includes(searchTerm);
}

function filterCases() {
  const searchTerm = toSearchString(elements.searchInput?.value ?? '');
  const owner = elements.ownerFilter?.value ?? '';
  const stage = elements.stageFilter?.value ?? '';
  const level = elements.levelFilter?.value ?? '';

  return enhancedCases
    .filter((entry) => matchesSearch(entry, searchTerm))
    .filter((entry) => (!owner ? true : entry.owner === owner))
    .filter((entry) => (!stage ? true : entry.stage === stage))
    .filter((entry) => (!level ? true : entry.bucket === level))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const deadlineA = parseDate(a.nextDeadline)?.getTime() ?? Infinity;
      const deadlineB = parseDate(b.nextDeadline)?.getTime() ?? Infinity;
      return deadlineA - deadlineB;
    });
}

function populateFilters() {
  if (!elements.ownerFilter || !elements.stageFilter) {
    return;
  }

  const previousOwner = elements.ownerFilter.value;
  const previousStage = elements.stageFilter.value;

  elements.ownerFilter.innerHTML = '';
  elements.stageFilter.innerHTML = '';

  const ownerPlaceholder = document.createElement('option');
  ownerPlaceholder.value = '';
  ownerPlaceholder.textContent = 'Alle Teams';
  elements.ownerFilter.append(ownerPlaceholder);

  const stagePlaceholder = document.createElement('option');
  stagePlaceholder.value = '';
  stagePlaceholder.textContent = 'Alle Stände';
  elements.stageFilter.append(stagePlaceholder);

  const owners = Array.from(new Set(enhancedCases.map((entry) => entry.owner))).sort((a, b) => a.localeCompare(b, 'de-AT'));
  const stages = Array.from(new Set(enhancedCases.map((entry) => entry.stage))).sort((a, b) => a.localeCompare(b, 'de-AT'));

  owners
    .filter(Boolean)
    .forEach((owner) => {
      const option = document.createElement('option');
      option.value = owner;
      option.textContent = owner;
      elements.ownerFilter.append(option);
    });

  stages
    .filter(Boolean)
    .forEach((stage) => {
      const option = document.createElement('option');
      option.value = stage;
      option.textContent = stage;
      elements.stageFilter.append(option);
    });

  if (previousOwner && owners.includes(previousOwner)) {
    elements.ownerFilter.value = previousOwner;
  }

  if (previousStage && stages.includes(previousStage)) {
    elements.stageFilter.value = previousStage;
  }
}

function renderSummary(cases) {
  if (!elements.totalValue || !elements.criticalValue || !elements.deadlineValue) {
    return;
  }

  const criticalCount = cases.filter((entry) => entry.bucket === 'critical').length;
  const upcomingCount = cases.filter((entry) => {
    const deadline = parseDate(entry.nextDeadline);
    if (!deadline) {
      return false;
    }
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = (deadline.setHours(0, 0, 0, 0) - now.getTime()) / (24 * 60 * 60 * 1000);
    return diff >= 0 && diff <= 14;
  }).length;

  elements.totalValue.textContent = cases.length.toString();
  elements.criticalValue.textContent = criticalCount.toString();
  elements.deadlineValue.textContent = upcomingCount.toString();
}

function describeCell(cases, probability, impact) {
  const count = cases.length;
  const base = `${count} ${count === 1 ? 'Mandat' : 'Mandate'} mit ${capitalize(impact)}er Auswirkung und ${capitalize(probability)}er Eintrittswahrscheinlichkeit`;
  if (count === 0) {
    return base;
  }
  const examples = cases
    .slice(0, 3)
    .map((entry) => `${entry.id} – ${entry.client}`)
    .join('; ');
  return `${base}. Beispiele: ${examples}`;
}

function renderMatrix(cases) {
  if (!elements.matrixBody) {
    return;
  }

  elements.matrixBody.innerHTML = '';

  IMPACT_ORDER.forEach((impact) => {
    const row = document.createElement('tr');
    const headerCell = document.createElement('th');
    headerCell.scope = 'row';
    headerCell.textContent = capitalize(impact);
    row.append(headerCell);

    PROBABILITY_ORDER.forEach((probability) => {
      const cellCases = cases.filter(
        (entry) => entry.impact === impact && entry.probability === probability
      );
      const bucket = cellCases.length > 0 ? getBucket(PROBABILITY_SCALE[probability] * IMPACT_SCALE[impact]) : 'empty';
      const cell = document.createElement('td');
      cell.className = `risk-matrix__cell ${bucket !== 'empty' ? `risk-matrix__cell--${bucket}` : ''}`.trim();
      cell.tabIndex = 0;
      cell.setAttribute('aria-label', describeCell(cellCases, probability, impact));

      const countEl = document.createElement('span');
      countEl.className = 'risk-matrix__cell-count';
      countEl.textContent = cellCases.length.toString();
      cell.append(countEl);

      if (cellCases.length > 0) {
        const list = document.createElement('ul');
        list.className = 'risk-matrix__cell-list';
        cellCases.slice(0, 3).forEach((entry) => {
          const item = document.createElement('li');
          item.textContent = `${entry.id} · ${entry.client}`;
          list.append(item);
        });
        if (cellCases.length > 3) {
          const moreItem = document.createElement('li');
          moreItem.textContent = `… +${cellCases.length - 3} weitere`;
          list.append(moreItem);
        }
        cell.append(list);
      }

      row.append(cell);
    });

    elements.matrixBody.append(row);
  });
}

function renderDetailSummary(cases) {
  if (!elements.detailSummary) {
    return;
  }

  if (cases.length === 0) {
    elements.detailSummary.textContent = 'Kein Mandat für die aktuelle Filterauswahl gefunden.';
    return;
  }

  const criticalCount = cases.filter((entry) => entry.bucket === 'critical').length;
  const highCount = cases.filter((entry) => entry.bucket === 'high').length;
  const mediumCount = cases.filter((entry) => entry.bucket === 'medium').length;
  const lowCount = cases.filter((entry) => entry.bucket === 'low').length;

  elements.detailSummary.textContent = `${cases.length} Mandate – ${criticalCount} kritisch, ${highCount} hoch, ${mediumCount} mittel, ${lowCount} niedrig.`;
}

function renderTable(cases) {
  if (!elements.detailTableBody || !elements.emptyState) {
    return;
  }

  elements.detailTableBody.innerHTML = '';

  if (cases.length === 0) {
    elements.emptyState.hidden = false;
    return;
  }

  elements.emptyState.hidden = true;

  cases.forEach((entry) => {
    const row = document.createElement('tr');
    row.dataset.riskBucket = entry.bucket;

    const cells = [
      `${entry.id} – ${entry.title}`,
      entry.client,
      entry.owner,
      entry.stage,
      capitalize(entry.probability),
      capitalize(entry.impact),
      `${entry.score} (${bucketLabel(entry.bucket)})`,
      formatDeadline(entry.nextDeadline),
      entry.nextAction,
    ];

    cells.forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    });

    elements.detailTableBody.append(row);
  });
}

function bucketLabel(bucket) {
  switch (bucket) {
    case 'critical':
      return 'kritisch';
    case 'high':
      return 'hoch';
    case 'medium':
      return 'mittel';
    default:
      return 'niedrig';
  }
}

function renderBriefing(cases) {
  if (!elements.briefingContent) {
    return;
  }

  elements.briefingContent.innerHTML = '';

  if (cases.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.textContent = 'Für die aktuelle Filterauswahl liegen keine Risiken vor, die ein Briefing erfordern.';
    elements.briefingContent.append(emptyMessage);
    return;
  }

  const highestRiskCase = [...cases].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const deadlineA = parseDate(a.nextDeadline)?.getTime() ?? Infinity;
    const deadlineB = parseDate(b.nextDeadline)?.getTime() ?? Infinity;
    return deadlineA - deadlineB;
  })[0];

  const upcomingDeadlines = cases
    .filter((entry) => {
      const deadline = parseDate(entry.nextDeadline);
      if (!deadline) {
        return false;
      }
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const diff = (deadline.setHours(0, 0, 0, 0) - now.getTime()) / (24 * 60 * 60 * 1000);
      return diff >= 0 && diff <= 14;
    })
    .sort((a, b) => {
      const deadlineA = parseDate(a.nextDeadline)?.getTime() ?? Infinity;
      const deadlineB = parseDate(b.nextDeadline)?.getTime() ?? Infinity;
      return deadlineA - deadlineB;
    });

  const briefingCard = document.createElement('article');
  briefingCard.className = 'risk-briefing__card';

  const heading = document.createElement('h4');
  heading.className = 'risk-briefing__headline';
  heading.textContent = `${highestRiskCase.id} – ${highestRiskCase.title}`;
  briefingCard.append(heading);

  const briefingMeta = document.createElement('p');
  briefingMeta.className = 'risk-briefing__meta';
  briefingMeta.textContent = `${highestRiskCase.client} · Verantwortlich: ${highestRiskCase.owner} · Score ${highestRiskCase.score} (${bucketLabel(highestRiskCase.bucket)})`;
  briefingCard.append(briefingMeta);

  const actionList = document.createElement('ul');
  actionList.className = 'risk-briefing__list';

  const topAction = document.createElement('li');
  topAction.textContent = `Nächster Schritt: ${highestRiskCase.nextAction} (Frist ${formatDeadline(highestRiskCase.nextDeadline)})`;
  actionList.append(topAction);

  const recommendation = document.createElement('li');
  recommendation.textContent = `Empfehlung: ${highestRiskCase.notes}`;
  actionList.append(recommendation);

  const distribution = buildDistributionInsight(cases);
  if (distribution) {
    const distributionItem = document.createElement('li');
    distributionItem.textContent = distribution;
    actionList.append(distributionItem);
  }

  if (upcomingDeadlines.length > 0) {
    const deadlineItem = document.createElement('li');
    const labels = upcomingDeadlines
      .slice(0, 3)
      .map((entry) => `${entry.id} (${formatDeadline(entry.nextDeadline)})`)
      .join(', ');
    deadlineItem.textContent = `Fristenradar (≤ 14 Tage): ${labels}${upcomingDeadlines.length > 3 ? `, … +${upcomingDeadlines.length - 3} weitere` : ''}`;
    actionList.append(deadlineItem);
  }

  briefingCard.append(actionList);
  elements.briefingContent.append(briefingCard);
}

function buildDistributionInsight(cases) {
  if (!cases.length) {
    return '';
  }
  const distribution = cases.reduce(
    (acc, entry) => ({
      ...acc,
      [entry.bucket]: (acc[entry.bucket] ?? 0) + 1,
    }),
    {}
  );
  const parts = ['critical', 'high', 'medium', 'low']
    .filter((bucket) => distribution[bucket])
    .map((bucket) => `${distribution[bucket]}× ${bucketLabel(bucket)}`);
  if (parts.length === 0) {
    return '';
  }
  return `Verteilung: ${parts.join(', ')}`;
}

function updateLastUpdatedLabel() {
  if (!elements.lastUpdateLabel) {
    return;
  }

  const mostRecent = enhancedCases.reduce((latest, entry) => {
    const date = parseDate(entry.lastUpdated)?.getTime();
    if (!date) {
      return latest;
    }
    return date > latest ? date : latest;
  }, 0);

  if (!mostRecent) {
    elements.lastUpdateLabel.textContent = 'Aktualisiert: keine Angabe';
    return;
  }

  const formatted = new Intl.DateTimeFormat('de-AT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(mostRecent));

  elements.lastUpdateLabel.textContent = `Aktualisiert: ${formatted}`;
}

function exportCsv(cases) {
  if (!cases.length) {
    overlayInstance?.show?.({
      title: 'Kein Export möglich',
      message: 'Bitte wählen Sie mindestens ein Mandat aus, um einen Export zu erzeugen.',
    });
    return;
  }

  const header = [
    'Aktenzeichen',
    'Mandant',
    'Verantwortlich',
    'Verfahrensstand',
    'Eintrittswahrscheinlichkeit',
    'Auswirkung',
    'Risikoscore',
    'Risikostufe',
    'Nächste Frist',
    'Nächster Schritt',
  ];

  const rows = cases.map((entry) => [
    entry.id,
    entry.client,
    entry.owner,
    entry.stage,
    capitalize(entry.probability),
    capitalize(entry.impact),
    entry.score.toString(),
    bucketLabel(entry.bucket),
    formatDeadline(entry.nextDeadline),
    entry.nextAction,
  ]);

  const csvContent = [header, ...rows]
    .map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(';'))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `verilex-risk-monitor-${Date.now()}.csv`;
  document.body.append(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function resetFilters() {
  if (elements.searchInput) {
    elements.searchInput.value = '';
  }
  if (elements.ownerFilter) {
    elements.ownerFilter.value = '';
  }
  if (elements.stageFilter) {
    elements.stageFilter.value = '';
  }
  if (elements.levelFilter) {
    elements.levelFilter.value = '';
  }
  render();
}

function registerEvents() {
  elements.searchInput?.addEventListener('input', handleFilterChange);
  elements.ownerFilter?.addEventListener('change', handleFilterChange);
  elements.stageFilter?.addEventListener('change', handleFilterChange);
  elements.levelFilter?.addEventListener('change', handleFilterChange);
  elements.resetFiltersButton?.addEventListener('click', resetFilters);
  elements.exportButton?.addEventListener('click', () => {
    const filtered = filterCases();
    exportCsv(filtered);
  });
}

function handleFilterChange() {
  render();
}

function render() {
  const filtered = filterCases();
  renderSummary(filtered);
  renderMatrix(filtered);
  renderDetailSummary(filtered);
  renderTable(filtered);
  renderBriefing(filtered);
}

function refreshUiFromStore() {
  rebuildEnhancedCases();
  populateFilters();
  updateLastUpdatedLabel();
  render();
}

function init() {
  try {
    refreshUiFromStore();
    registerEvents();
    verilexStore.on('storeReady', refreshUiFromStore);
    verilexStore.on('storeChanged', refreshUiFromStore);
  } catch (error) {
    console.error('Risikomonitor konnte nicht initialisiert werden.', error);
    overlayInstance?.show?.({
      title: 'Risikomonitor nicht verfügbar',
      message: 'Beim Laden der Risikoanalyse ist ein Fehler aufgetreten.',
      details: error,
    });
  }
}

init();
