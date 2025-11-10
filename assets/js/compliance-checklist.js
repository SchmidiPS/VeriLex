const STORAGE_KEY = 'verilex:compliance:completed';

const COMPLIANCE_ITEMS = [
  {
    id: 'kyc-intake',
    title: 'KYC-Unterlagen vollständig dokumentiert',
    area: 'Mandatsannahme',
    owner: 'Assistenz',
    frequency: 'case',
    risk: 'hoch',
    description:
      'Identitätsnachweise, wirtschaftliche Eigentümer und Risikobewertung müssen vor Mandatsannahme vollständig abgelegt sein.',
    guidance:
      'Checkliste im DMS aktualisieren und Uploads auf Vollständigkeit prüfen. Bei Unklarheiten Rücksprache mit dem Partnerteam.',
    tags: ['KYC', 'Geldwäsche', 'Mandat'],
    nextReview: '2025-11-12',
    references: ['RAO §8a', 'WiEReG'],
  },
  {
    id: 'conflict-check',
    title: 'Interessenskonflikt-Dokumentation',
    area: 'Mandatsannahme',
    owner: 'Partnerteam',
    frequency: 'case',
    risk: 'hoch',
    description:
      'Konfliktprüfung anhand der bestehenden Akten durchführen und Dokumentation im Mandatsblatt hinterlegen.',
    guidance:
      'Mandantenstamm durchsuchen, Ergebnis protokollieren und etwaige Rückfragen im Team besprechen.',
    tags: ['Konflikt', 'Berufspflichten'],
    nextReview: '2025-11-10',
    references: ['§ 9 RL-BA'],
  },
  {
    id: 'data-processing',
    title: 'Verzeichnis der Verarbeitungstätigkeiten aktualisiert',
    area: 'Datenschutz',
    owner: 'Kanzleimanagement',
    frequency: 'quarterly',
    risk: 'mittel',
    description:
      'Neue Tools oder Prozesse müssen in das Verzeichnis aufgenommen werden. Prüfen, ob alle Mandatsapps korrekt beschrieben sind.',
    guidance:
      'Abgleich mit den eingesetzten SaaS-Diensten und ggf. Ergänzung der TOMs durchführen.',
    tags: ['DSGVO', 'Verarbeitung'],
    nextReview: '2025-11-24',
    references: ['Art. 30 DSGVO'],
  },
  {
    id: 'deadline-control',
    title: 'Vier-Augen-Kontrolle Fristenkalender',
    area: 'Fristenmanagement',
    owner: 'Assistenz',
    frequency: 'monthly',
    risk: 'hoch',
    description:
      'Vergleich zwischen elektronischem Kalender und physischen Fristlisten, insbesondere für Gerichtstermine.',
    guidance:
      'Stichprobe von zehn Verfahren wählen, Termine mit Gerichtskorrespondenz abgleichen und Abweichungen dokumentieren.',
    tags: ['Frist', 'QS'],
    nextReview: '2025-11-08',
    references: ['§ 9 RAO'],
  },
  {
    id: 'document-retention',
    title: 'Aufbewahrungs- und Löschkonzept geprüft',
    area: 'Datenschutz',
    owner: 'Kanzleimanagement',
    frequency: 'semiannual',
    risk: 'mittel',
    description:
      'Überprüfung, ob die Löschfristen aus dem Kanzleihandbuch eingehalten werden und automatisierte Jobs laufen.',
    guidance:
      'Systemberichte abrufen, Stichprobe aus Mandatsakten ziehen und Protokoll signieren lassen.',
    tags: ['DSGVO', 'Archiv'],
    nextReview: '2025-12-15',
    references: ['Art. 5 Abs. 1 lit. e DSGVO'],
  },
  {
    id: 'invoice-approval',
    title: 'Rechnungsfreigabe dokumentiert',
    area: 'Finanzen',
    owner: 'Partnerteam',
    frequency: 'monthly',
    risk: 'mittel',
    description:
      'Vor Versand jeder Rechnung ist die Freigabe des verantwortlichen Partners schriftlich festzuhalten.',
    guidance:
      'Freigabemail oder Signatur im DMS hinterlegen, offene Freigaben in der Finanzübersicht markieren.',
    tags: ['Finanzen', 'Rechnung'],
    nextReview: '2025-11-18',
    references: ['Kanzleihandbuch Abschnitt 4'],
  },
  {
    id: 'security-training',
    title: 'Security-Awareness-Training dokumentiert',
    area: 'IT-Sicherheit',
    owner: 'Kanzleimanagement',
    frequency: 'semiannual',
    risk: 'niedrig',
    description:
      'Alle Mitarbeiter:innen absolvieren das verpflichtende Phishing-Training. Teilnahmebestätigungen müssen abgelegt sein.',
    guidance:
      'Liste der Mitarbeitenden aus dem HR-System exportieren und gegen das Trainingsportal abgleichen.',
    tags: ['Security', 'Training'],
    nextReview: '2026-01-05',
    references: ['ISO 27001 A.7.2'],
  },
  {
    id: 'document-sealing',
    title: 'Digitale Siegel für Schriftsätze getestet',
    area: 'Technologie',
    owner: 'Assistenz',
    frequency: 'quarterly',
    risk: 'mittel',
    description:
      'Regelmäßiger Funktionstest der qualifizierten Signaturkarten inkl. Ablaufkontrolle.',
    guidance:
      'Testschriftsatz an das interne Postfach signieren, Protokoll sichern und Ablaufdaten der Karten prüfen.',
    tags: ['Signatur', 'ERV'],
    nextReview: '2025-11-14',
    references: ['ERV-Richtlinien'],
  },
  {
    id: 'client-portal-audit',
    title: 'Mandantenportal-Rechte überprüft',
    area: 'IT-Sicherheit',
    owner: 'Assistenz',
    frequency: 'monthly',
    risk: 'hoch',
    description:
      'Sicherstellen, dass entlassene Mandanten keinen Zugriff mehr auf vertrauliche Dokumente besitzen.',
    guidance:
      'Zugriffsprotokolle durchsehen, Deaktivierungen testen und Ergebnis im Audit-Log speichern.',
    tags: ['Portal', 'Rechte'],
    nextReview: '2025-11-11',
    references: ['DSGVO Art. 32'],
  },
];

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
    const knownIds = new Set(COMPLIANCE_ITEMS.map((item) => item.id));
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

let completedSet = loadCompletedSet();

function hydrateFilterOptions() {
  const areas = uniqueSorted(COMPLIANCE_ITEMS.map((item) => item.area));
  const owners = uniqueSorted(COMPLIANCE_ITEMS.map((item) => item.owner));

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

function applyFilters(items) {
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
    COMPLIANCE_ITEMS.length === 0
      ? 0
      : Math.round((completedSet.size / COMPLIANCE_ITEMS.length) * 100);
  elements.progressValue.textContent = `${completionRatio}%`;
  elements.progressBar.style.width = `${completionRatio}%`;

  const outstanding = COMPLIANCE_ITEMS.length - completedSet.size;
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
    renderDetail(state.activeDetailId === item.id ? item : COMPLIANCE_ITEMS.find((entry) => entry.id === state.activeDetailId));
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
  const filtered = applyFilters(COMPLIANCE_ITEMS);

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
    const filtered = applyFilters(COMPLIANCE_ITEMS);
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

  hydrateFilterOptions();
  bindEvents();
  updateView();
  renderDetail(null);
  updateLastSyncTimestamp();
}

init();
