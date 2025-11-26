import { verilexStore } from './store.js';

const STORAGE_KEY = 'verilex:compliance:completed';

let complianceItems = [];
let completedSet = new Set();

function resolveStore() {
  if (typeof window !== 'undefined' && window.verilexStore) {
    return window.verilexStore;
  }
  return verilexStore;
}

function normalizeString(value) {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '');
}

function loadCompletedSet() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    const knownIds = new Set(complianceItems.map((item) => item.id));
    if (knownIds.size === 0) {
      return new Set(parsed);
    }
    return new Set(parsed.filter((id) => knownIds.has(id)));
  } catch (error) {
    console.warn('Fortschritt konnte nicht gelesen werden.', error);
    return new Set();
  }
}

function persistCompletedSet(set) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch (error) {
    console.warn('Fortschritt konnte nicht gespeichert werden.', error);
  }
}

function uniqueSorted(values) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'de')); 
}

function formatDateGerman(date) {
  return new Intl.DateTimeFormat('de-AT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function startOfDay(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function differenceInDays(targetDate, baseDate = new Date()) {
  const base = startOfDay(baseDate);
  const target = startOfDay(targetDate);
  const diffMs = target.getTime() - base.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function toLookupMap(items, key = 'id') {
  return (items || []).reduce((acc, item) => {
    if (item && item[key]) {
      acc[item[key]] = item;
    }
    return acc;
  }, {});
}

function deriveAreaFromCase(caseRecord) {
  if (!caseRecord) {
    return 'Allgemein';
  }
  return caseRecord.category || caseRecord.title || 'Allgemein';
}

function mapComplianceItemsFromStore() {
  const store = resolveStore();
  if (!store) {
    return [];
  }

  const casesById = toLookupMap(store.getAll('Case'));
  const usersById = toLookupMap(store.getAll('User'));

  return store.getAll('ComplianceItem').map((item) => {
    const relatedCase = casesById[item.caseId];
    const owner = item.ownerId ? usersById[item.ownerId]?.name : null;

    return {
      id: item.id,
      title: item.title,
      area: item.area || deriveAreaFromCase(relatedCase),
      owner: owner || 'Unzugewiesen',
      frequency: item.frequency || 'case',
      risk: item.risk || 'mittel',
      description: item.notes || 'Keine Beschreibung hinterlegt.',
      guidance: item.guidance || 'Bitte weitere Details im Fallverlauf dokumentieren.',
      tags: item.tags || (relatedCase ? [relatedCase.caseNumber] : []),
      references: item.references || [],
      nextReview: item.deadline,
      caseNumber: relatedCase?.caseNumber,
    };
  });
}

function findComplianceItemById(id) {
  return complianceItems.find((item) => item.id === id) || null;
}

function describeDueState(dateString) {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return { label: 'kein Termin', state: 'none', days: null };
  }

  const days = differenceInDays(parsed);
  if (days < 0) {
    return {
      label: `Überfällig seit ${Math.abs(days)} Tag${Math.abs(days) === 1 ? '' : 'en'} (${formatDateGerman(parsed)})`,
      state: 'overdue',
      days,
    };
  }
  if (days === 0) {
    return { label: `Heute fällig (${formatDateGerman(parsed)})`, state: 'due-today', days };
  }
  return {
    label: `Fällig in ${days} Tag${days === 1 ? '' : 'en'} (${formatDateGerman(parsed)})`,
    state: days <= 7 ? 'upcoming' : 'scheduled',
    days,
  };
}

const state = {
  search: '',
  area: '',
  owner: '',
  frequency: '',
  risk: '',
  activeDetailId: null,
};

function syncCompletedSet() {
  completedSet = loadCompletedSet();
  const knownIds = new Set(complianceItems.map((item) => item.id));
  if (knownIds.size === 0) {
    return;
  }
  completedSet = new Set(Array.from(completedSet).filter((id) => knownIds.has(id)));
  persistCompletedSet(completedSet);
}

function refreshComplianceDataFromStore() {
  complianceItems = mapComplianceItemsFromStore();
  syncCompletedSet();
  hydrateFilterOptions();
  updateView();

  const activeItem = state.activeDetailId ? findComplianceItemById(state.activeDetailId) : null;
  if (activeItem) {
    renderDetail(activeItem);
  } else {
    state.activeDetailId = null;
    renderDetail(null);
  }

  updateLastSyncTimestamp();
}

const elements = {
  totalValue: document.getElementById('compliance-total-value'),
  criticalValue: document.getElementById('compliance-critical-value'),
  upcomingValue: document.getElementById('compliance-upcoming-value'),
  progressValue: document.getElementById('compliance-progress-value'),
  progressBar: document.getElementById('compliance-progress-bar'),
  progressSummary: document.getElementById('compliance-progress-summary'),
  listContainer: document.getElementById('compliance-list'),
  listSummary: document.getElementById('compliance-list-summary'),
  emptyState: document.getElementById('compliance-empty-state'),
  detailCard: document.getElementById('compliance-detail-content'),
  upcomingList: document.getElementById('compliance-upcoming-list'),
  lastSync: document.getElementById('compliance-last-sync'),
  areaFilter: document.getElementById('compliance-area-filter'),
  ownerFilter: document.getElementById('compliance-owner-filter'),
  frequencyFilter: document.getElementById('compliance-frequency-filter'),
  riskFilter: document.getElementById('compliance-risk-filter'),
  searchInput: document.getElementById('compliance-search'),
  resetButton: document.getElementById('compliance-reset'),
  exportButton: document.getElementById('compliance-export'),
};

function hydrateFilterOptions() {
  const defaultAreaOption = elements.areaFilter.querySelector('option[value=""]');
  const defaultOwnerOption = elements.ownerFilter.querySelector('option[value=""]');

  elements.areaFilter.innerHTML = '';
  elements.ownerFilter.innerHTML = '';
  if (defaultAreaOption) elements.areaFilter.append(defaultAreaOption.cloneNode(true));
  if (defaultOwnerOption) elements.ownerFilter.append(defaultOwnerOption.cloneNode(true));

  const areas = uniqueSorted(complianceItems.map((item) => item.area).filter(Boolean));
  const owners = uniqueSorted(complianceItems.map((item) => item.owner).filter(Boolean));

  areas.forEach((area) => {
    const option = document.createElement('option');
    option.value = area;
    option.textContent = area;
    elements.areaFilter.append(option);
  });

  owners.forEach((owner) => {
    const option = document.createElement('option');
    option.value = owner;
    option.textContent = owner;
    elements.ownerFilter.append(option);
  });
}

function applyFilters(items = complianceItems) {
  return items.filter((item) => {
    if (state.area && item.area !== state.area) {
      return false;
    }
    if (state.owner && item.owner !== state.owner) {
      return false;
    }
    if (state.frequency && item.frequency !== state.frequency) {
      return false;
    }
    if (state.risk && item.risk !== state.risk) {
      return false;
    }

    if (state.search) {
      const haystack = normalizeString(
        [
          item.title,
          item.area,
          item.owner,
          item.description,
          item.guidance,
          ...(item.tags ?? []),
          ...(item.references ?? []),
        ].join(' ')
      );
      if (!haystack.includes(state.search)) {
        return false;
      }
    }

    return true;
  });
}

function renderSummary(filteredItems) {
  elements.totalValue.textContent = filteredItems.length.toString();

  const criticalOpen = filteredItems.filter(
    (item) => item.risk === 'hoch' && !completedSet.has(item.id)
  ).length;
  elements.criticalValue.textContent = criticalOpen.toString();

  const upcoming = filteredItems.filter((item) => {
    const { state: dueState } = describeDueState(item.nextReview);
    return (dueState === 'upcoming' || dueState === 'due-today' || dueState === 'overdue') && !completedSet.has(item.id);
  }).length;
  elements.upcomingValue.textContent = upcoming.toString();

  const completionRatio =
    complianceItems.length === 0 ? 0 : Math.round((completedSet.size / complianceItems.length) * 100);
  elements.progressValue.textContent = `${completionRatio}%`;
  elements.progressBar.style.width = `${completionRatio}%`;

  const outstanding = complianceItems.length - completedSet.size;
  const outstandingLabel = outstanding === 1 ? 'Prüfpunkt' : 'Prüfpunkte';
  elements.progressSummary.textContent =
    outstanding === 0
      ? 'Alle Prüfpunkte wurden abgehakt.'
      : `${outstanding} ${outstandingLabel} warten noch auf Dokumentation.`;
}

function renderDetail(item) {
  if (!item) {
    elements.detailCard.innerHTML = `
      <h4 class="compliance-detail__headline">Eintrag wählen</h4>
      <p class="compliance-detail__description">
        Wählen Sie einen Prüfpunkt aus der Liste, um Details, Wiedervorlagen und empfohlene Maßnahmen einzusehen.
      </p>
    `;
    return;
  }

  const due = describeDueState(item.nextReview);
  const completed = completedSet.has(item.id);

  elements.detailCard.innerHTML = `
    <header class="compliance-detail__header">
      <div>
        <span class="compliance-detail__badge">${item.area}</span>
        <h4 class="compliance-detail__headline">${item.title}</h4>
      </div>
      <span class="compliance-detail__status ${completed ? 'is-complete' : ''}">
        ${completed ? 'Abgeschlossen' : 'Offen'}
      </span>
    </header>
    <p class="compliance-detail__description">${item.description}</p>
    <section class="compliance-detail__section">
      <h5>Empfohlene Maßnahmen</h5>
      <p>${item.guidance}</p>
    </section>
    <section class="compliance-detail__section compliance-detail__section--meta">
      <dl class="compliance-detail__meta">
        <div>
          <dt>Verantwortlich</dt>
          <dd>${item.owner}</dd>
        </div>
        <div>
          <dt>Aktenzeichen</dt>
          <dd>${item.caseNumber || 'ohne Zuordnung'}</dd>
        </div>
        <div>
          <dt>Rhythmus</dt>
          <dd>${translateFrequency(item.frequency)}</dd>
        </div>
        <div>
          <dt>Risiko</dt>
          <dd>${translateRisk(item.risk)}</dd>
        </div>
        <div>
          <dt>Nächste Wiedervorlage</dt>
          <dd class="compliance-detail__due compliance-detail__due--${due.state}">${due.label}</dd>
        </div>
      </dl>
    </section>
    ${renderReferences(item)}
  `;
}

function renderReferences(item) {
  if (!item.references || item.references.length === 0) {
    return '';
  }
  const listItems = item.references
    .map((reference) => `<li>${reference}</li>`)
    .join('');
  return `
    <section class="compliance-detail__section">
      <h5>Rechtsgrundlagen &amp; Quellen</h5>
      <ul class="compliance-detail__references">${listItems}</ul>
    </section>
  `;
}

function translateRisk(risk) {
  switch (risk) {
    case 'hoch':
      return 'Hohes Risiko';
    case 'mittel':
      return 'Mittleres Risiko';
    case 'niedrig':
      return 'Niedriges Risiko';
    default:
      return risk;
  }
}

function translateFrequency(frequency) {
  switch (frequency) {
    case 'case':
      return 'je Mandat';
    case 'monthly':
      return 'monatlich';
    case 'quarterly':
      return 'quartalsweise';
    case 'semiannual':
      return 'halbjährlich';
    default:
      return frequency;
  }
}

function createComplianceItemNode(item) {
  const article = document.createElement('article');
  article.className = 'compliance-item';
  article.setAttribute('role', 'listitem');
  article.dataset.id = item.id;

  const due = describeDueState(item.nextReview);

  const header = document.createElement('header');
  header.className = 'compliance-item__header';

  const checkboxWrapper = document.createElement('div');
  checkboxWrapper.className = 'compliance-item__checkbox';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = `compliance-checkbox-${item.id}`;
  checkbox.checked = completedSet.has(item.id);
  checkbox.setAttribute('aria-describedby', `compliance-risk-${item.id}`);

  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      completedSet.add(item.id);
    } else {
      completedSet.delete(item.id);
    }
    persistCompletedSet(completedSet);
    updateView();
    renderDetail(state.activeDetailId === item.id ? item : findComplianceItemById(state.activeDetailId));
  });

  const label = document.createElement('label');
  label.htmlFor = checkbox.id;
  label.className = 'compliance-item__title';
  label.innerHTML = `
    <span class="compliance-item__area">${item.area}</span>
    <span>${item.title}</span>
  `;

  checkboxWrapper.append(checkbox, label);

  const riskBadge = document.createElement('span');
  riskBadge.id = `compliance-risk-${item.id}`;
  riskBadge.className = `compliance-item__risk compliance-item__risk--${item.risk}`;
  riskBadge.textContent = translateRisk(item.risk);

  header.append(checkboxWrapper, riskBadge);

  const description = document.createElement('p');
  description.className = 'compliance-item__description';
  description.textContent = item.description;

  const metaList = document.createElement('dl');
  metaList.className = 'compliance-item__meta';
  metaList.innerHTML = `
    <div>
      <dt>Verantwortlich</dt>
      <dd>${item.owner}</dd>
    </div>
    <div>
      <dt>Rhythmus</dt>
      <dd>${translateFrequency(item.frequency)}</dd>
    </div>
    <div>
      <dt>Nächste Wiedervorlage</dt>
      <dd class="compliance-item__due compliance-item__due--${due.state}">${due.label}</dd>
    </div>
  `;

  const tags = document.createElement('ul');
  tags.className = 'compliance-item__tags';
  (item.tags ?? []).forEach((tag) => {
    const li = document.createElement('li');
    li.textContent = tag;
    tags.append(li);
  });

  const detailButton = document.createElement('button');
  detailButton.type = 'button';
  detailButton.className = 'compliance-item__detail-button btn-link';
  detailButton.textContent = 'Details anzeigen';
  detailButton.addEventListener('click', () => {
    state.activeDetailId = item.id;
    renderDetail(item);
    elements.listContainer
      .querySelectorAll('.compliance-item.is-active')
      .forEach((node) => node.classList.remove('is-active'));
    article.classList.add('is-active');
  });

  article.append(header, description, metaList, tags, detailButton);

  if (state.activeDetailId === item.id) {
    article.classList.add('is-active');
  }

  article.addEventListener('mouseenter', () => {
    if (state.activeDetailId) {
      return;
    }
    renderDetail(item);
  });

  article.addEventListener('focusin', () => {
    if (state.activeDetailId) {
      return;
    }
    renderDetail(item);
  });

  return article;
}

function renderList(filteredItems) {
  elements.listContainer.innerHTML = '';
  const listLabel = filteredItems.length === 1 ? 'Prüfpunkt' : 'Prüfpunkte';
  elements.listSummary.textContent = `${filteredItems.length} ${listLabel} im Fokus`;

  if (filteredItems.length === 0) {
    elements.emptyState.hidden = false;
    return;
  }

  elements.emptyState.hidden = true;
  filteredItems.forEach((item) => {
    const node = createComplianceItemNode(item);
    elements.listContainer.append(node);
  });
}

function renderUpcoming(filteredItems) {
  elements.upcomingList.innerHTML = '';
  const withDates = filteredItems
    .map((item) => ({ item, due: describeDueState(item.nextReview) }))
    .filter(({ due }) => due.state !== 'none')
    .sort((a, b) => {
      if (a.due.days === null) return 1;
      if (b.due.days === null) return -1;
      return a.due.days - b.due.days;
    });

  if (withDates.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'compliance-upcoming__empty';
    empty.textContent = 'Keine Wiedervorlagen im gewählten Filterbereich.';
    elements.upcomingList.append(empty);
    return;
  }

  withDates.forEach(({ item, due }) => {
    const li = document.createElement('li');
    li.className = `compliance-upcoming__item compliance-upcoming__item--${due.state}`;
    li.innerHTML = `
      <div>
        <p class="compliance-upcoming__title">${item.title}</p>
        <p class="compliance-upcoming__meta">${item.owner} · ${translateFrequency(item.frequency)} · ${item.area}</p>
      </div>
      <span class="compliance-upcoming__due">${due.label}</span>
    `;
    li.addEventListener('click', () => {
      state.activeDetailId = item.id;
      renderDetail(item);
      const targetArticle = elements.listContainer.querySelector(`[data-id="${item.id}"]`);
      targetArticle?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    elements.upcomingList.append(li);
  });
}

function updateView() {
  const filtered = applyFilters(complianceItems);

  renderSummary(filtered);
  renderList(filtered);
  renderUpcoming(filtered);

  if (state.activeDetailId) {
    const activeStillVisible = filtered.some((item) => item.id === state.activeDetailId);
    if (!activeStillVisible) {
      state.activeDetailId = null;
      renderDetail(null);
    }
  }
}

function updateLastSyncTimestamp() {
  const now = new Date();
  if (!elements.lastSync) {
    return;
  }
  const formatted = new Intl.DateTimeFormat('de-AT', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(now);
  elements.lastSync.textContent = `Letzte Aktualisierung: ${formatted}`;
}

function bindEvents() {
  elements.areaFilter.addEventListener('change', (event) => {
    state.area = event.target.value;
    updateView();
  });
  elements.ownerFilter.addEventListener('change', (event) => {
    state.owner = event.target.value;
    updateView();
  });
  elements.frequencyFilter.addEventListener('change', (event) => {
    state.frequency = event.target.value;
    updateView();
  });
  elements.riskFilter.addEventListener('change', (event) => {
    state.risk = event.target.value;
    updateView();
  });
  elements.searchInput.addEventListener('input', (event) => {
    state.search = normalizeString(event.target.value);
    updateView();
  });

  elements.resetButton.addEventListener('click', () => {
    state.search = '';
    state.area = '';
    state.owner = '';
    state.frequency = '';
    state.risk = '';
    state.activeDetailId = null;

    elements.searchInput.value = '';
    elements.areaFilter.value = '';
    elements.ownerFilter.value = '';
    elements.frequencyFilter.value = '';
    elements.riskFilter.value = '';

    renderDetail(null);
    updateView();
  });

  elements.exportButton.addEventListener('click', () => {
    const filtered = applyFilters(complianceItems);
    const outstanding = filtered.filter((item) => !completedSet.has(item.id));
    const lines = [
      'VeriLex – Maßnahmenliste',
      `Generiert am ${formatDateGerman(new Date())}`,
      '',
    ];

    if (outstanding.length === 0) {
      lines.push('Alle gefilterten Prüfpunkte sind abgeschlossen.');
    } else {
      outstanding.forEach((item, index) => {
        const due = describeDueState(item.nextReview);
        lines.push(
          `${index + 1}. ${item.title} (${item.area}) – Verantwortlich: ${item.owner} – Wiedervorlage: ${due.label}`
        );
      });
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'verilex-massnahmenliste.txt';
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });

  window.addEventListener('verilex:role-changed', () => {
    state.activeDetailId = null;
    renderDetail(null);
  });
}

function init() {
  if (!elements.listContainer) {
    return;
  }

  bindEvents();

  refreshComplianceDataFromStore();

  const store = resolveStore();
  if (store) {
    store.on('storeReady', refreshComplianceDataFromStore);
    store.on('storeReset', refreshComplianceDataFromStore);
    store.on('storeChanged', refreshComplianceDataFromStore);
  }
}

init();
