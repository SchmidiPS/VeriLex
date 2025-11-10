import { overlayInstance } from './app.js';

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

const CASE_DATA = [
  {
    id: 'AKT-2025-014',
    title: 'Kartellverfahren Alpine vs. Bundeswettbewerbsbehörde',
    client: 'Alpine Hochbau AG',
    stage: 'Beweisaufnahme',
    probability: 'hoch',
    impact: 'hoch',
    owner: 'Dr. Anna Leitner',
    nextDeadline: '2025-11-14',
    nextAction: 'Gegenäußerung zu Sachverständigengutachten finalisieren',
    notes: 'Vergleichsangebot prüfen, bevor Stellungnahme eingereicht wird.',
    category: 'Kartell- & Wettbewerbsrecht',
    lastUpdated: '2025-11-09T07:45:00+01:00',
  },
  {
    id: 'AKT-2025-011',
    title: 'Arbeitsrechtliche Sammelklage Vertrieb',
    client: 'Nordalpine Maschinenbau GmbH',
    stage: 'Vergleichsverhandlung',
    probability: 'mittel',
    impact: 'hoch',
    owner: 'Mag. Felix Gruber',
    nextDeadline: '2025-11-19',
    nextAction: 'Vergleichsparameter mit Personalabteilung abstimmen',
    notes: 'Stimmung im Gremium kritisch, Vorbereitung auf Güteverhandlung läuft.',
    category: 'Arbeitsrecht',
    lastUpdated: '2025-11-08T16:20:00+01:00',
  },
  {
    id: 'AKT-2025-009',
    title: 'Produkthaftung SmartHome-System',
    client: 'Lumos Living GmbH',
    stage: 'Sachverständigenverfahren',
    probability: 'hoch',
    impact: 'mittel',
    owner: 'Dr. Anna Leitner',
    nextDeadline: '2025-11-22',
    nextAction: 'Technische Stellungnahme nachbesprechen',
    notes: 'Einholung eines Zweitgutachtens empfohlen.',
    category: 'Produkthaftung',
    lastUpdated: '2025-11-07T10:05:00+01:00',
  },
  {
    id: 'AKT-2024-118',
    title: 'Vergaberecht: Landesklinikum Süd',
    client: 'MedCare Infrastruktur GmbH',
    stage: 'Anfechtung',
    probability: 'mittel',
    impact: 'mittel',
    owner: 'Dr.in Lara Stein',
    nextDeadline: '2025-11-18',
    nextAction: 'Sofortmaßnahmen mit Einkaufsteam abstimmen',
    notes: 'Zusätzliche Unterlagen vom Mandanten angefordert.',
    category: 'Vergaberecht',
    lastUpdated: '2025-11-08T09:40:00+01:00',
  },
  {
    id: 'AKT-2025-004',
    title: 'Urheberrechtsstreit Streamingplattform',
    client: 'Streamly Media KG',
    stage: 'Hauptverhandlung',
    probability: 'mittel',
    impact: 'hoch',
    owner: 'Mag. Felix Gruber',
    nextDeadline: '2025-11-12',
    nextAction: 'Beweislastanalyse finalisieren',
    notes: 'Gegenpartei hat Antrag auf einstweilige Verfügung gestellt.',
    category: 'IP & Medienrecht',
    lastUpdated: '2025-11-09T12:10:00+01:00',
  },
  {
    id: 'AKT-2025-017',
    title: 'Datenschutzprüfung Konzern HR-System',
    client: 'WestBank AG',
    stage: 'Audit',
    probability: 'niedrig',
    impact: 'hoch',
    owner: 'Dr.in Lara Stein',
    nextDeadline: '2025-11-28',
    nextAction: 'Technische und organisatorische Maßnahmen dokumentieren',
    notes: 'Offen: Nachweis des Data-Mapping-Prozesses.',
    category: 'Datenschutz & Compliance',
    lastUpdated: '2025-11-05T14:00:00+01:00',
  },
  {
    id: 'AKT-2025-020',
    title: 'Gesellschafterstreit Software-Start-up',
    client: 'BrightLayer Technologies OG',
    stage: 'Einstweiliger Rechtsschutz',
    probability: 'hoch',
    impact: 'hoch',
    owner: 'Dr. Anna Leitner',
    nextDeadline: '2025-11-15',
    nextAction: 'Sicherungsantrag begründen und Finanzkennzahlen ergänzen',
    notes: 'Verhandlungstermin bereits fixiert, Liquidität angespannt.',
    category: 'Gesellschaftsrecht',
    lastUpdated: '2025-11-09T18:30:00+01:00',
  },
  {
    id: 'AKT-2025-021',
    title: 'Gewährleistungsprozess Bauprojekt Donauufer',
    client: 'CityBuild Projekt GmbH',
    stage: 'Mediation',
    probability: 'niedrig',
    impact: 'mittel',
    owner: 'Mag. Felix Gruber',
    nextDeadline: '2025-11-25',
    nextAction: 'Mediationsstrategie mit Mandant abstimmen',
    notes: 'Gegenpartei signalisiert Vergleichsbereitschaft.',
    category: 'Bau- & Immobilienrecht',
    lastUpdated: '2025-11-06T11:05:00+01:00',
  },
];

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

const enhancedCases = CASE_DATA.map((entry) => {
  const probabilityValue = PROBABILITY_SCALE[entry.probability] ?? 1;
  const impactValue = IMPACT_SCALE[entry.impact] ?? 1;
  const score = probabilityValue * impactValue;
  return {
    ...entry,
    probabilityValue,
    impactValue,
    score,
    bucket: getBucket(score),
  };
});

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

  const owners = Array.from(new Set(enhancedCases.map((entry) => entry.owner))).sort((a, b) => a.localeCompare(b, 'de-AT'));
  const stages = Array.from(new Set(enhancedCases.map((entry) => entry.stage))).sort((a, b) => a.localeCompare(b, 'de-AT'));

  owners.forEach((owner) => {
    const option = document.createElement('option');
    option.value = owner;
    option.textContent = owner;
    elements.ownerFilter.append(option);
  });

  stages.forEach((stage) => {
    const option = document.createElement('option');
    option.value = stage;
    option.textContent = stage;
    elements.stageFilter.append(option);
  });
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

function init() {
  try {
    populateFilters();
    updateLastUpdatedLabel();
    registerEvents();
    render();
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
