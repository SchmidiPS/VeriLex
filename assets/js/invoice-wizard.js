import { overlayInstance } from './app.js';
const form = document.getElementById('invoice-form');

if (!form) {
  console.warn('Invoice wizard form not found.');
}

const progressContainer = document.querySelector('.wizard-progress');
const steps = Array.from(form?.querySelectorAll('.wizard-step') ?? []);
const prevButton = document.getElementById('invoice-prev');
const nextButton = document.getElementById('invoice-next');
const submitButton = document.getElementById('invoice-submit');
const successMessage = document.getElementById('invoice-success');
const resetButton = document.getElementById('invoice-reset');
const exportButton = document.getElementById('invoice-export');

const clientSelect = document.getElementById('invoice-client');
const periodSelect = document.getElementById('invoice-period');
const caseSelect = document.getElementById('invoice-case-filter');
const summaryEl = document.getElementById('invoice-filter-summary');
const step1ErrorEl = document.getElementById('invoice-step1-error');
const clientErrorEl = document.getElementById('invoice-client-error');

const itemsTableBody = document.getElementById('invoice-line-items');
const itemsEmptyEl = document.getElementById('invoice-items-empty');
const itemsErrorEl = document.getElementById('invoice-items-error');
const totalHoursEl = document.getElementById('invoice-total-hours');
const totalNetEl = document.getElementById('invoice-total-net');
const totalTaxEl = document.getElementById('invoice-total-tax');
const totalGrossEl = document.getElementById('invoice-total-gross');

const invoiceNumberInput = document.getElementById('invoice-number');
const invoiceNumberError = document.getElementById('invoice-number-error');
const invoiceDateInput = document.getElementById('invoice-date');
const invoiceDateError = document.getElementById('invoice-date-error');
const dueDateInput = document.getElementById('invoice-due-date');
const dueDateError = document.getElementById('invoice-due-date-error');
const taxRateInput = document.getElementById('invoice-tax-rate');
const taxRateError = document.getElementById('invoice-tax-rate-error');
const referenceInput = document.getElementById('invoice-reference');
const paymentTermsInput = document.getElementById('invoice-payment-terms');
const notesInput = document.getElementById('invoice-notes');

const previewMetaEl = document.getElementById('invoice-preview-meta');
const previewClientEl = document.getElementById('invoice-preview-client');
const previewCaseEl = document.getElementById('invoice-preview-case');
const previewPeriodEl = document.getElementById('invoice-preview-period');
const previewDueEl = document.getElementById('invoice-preview-due');
const previewItemsBody = document.getElementById('invoice-preview-items');
const previewNetEl = document.getElementById('invoice-preview-net');
const previewTaxEl = document.getElementById('invoice-preview-tax');
const previewGrossEl = document.getElementById('invoice-preview-gross');
const previewNotesEl = document.getElementById('invoice-preview-notes');

const state = {
  activeStep: 1,
  maxStep: 4,
  entries: [],
  filteredEntries: [],
  lineItems: [],
  selectedEntryIds: [],
  caseDirectory: new Map(),
  selectedClient: '',
  selectedCase: '',
  selectedPeriod: 'all',
  invoiceDetails: {
    number: '',
    invoiceDate: '',
    dueDate: '',
    taxRate: 19,
    reference: '',
    paymentTerms: '',
    notes: '',
  },
};

function getStore() {
  return window.verilexStore;
}

function formatCurrency(value) {
  const number = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(number);
}

function formatHours(value) {
  const number = Number.isFinite(value) ? value : 0;
  return `${number.toFixed(2)} h`;
}

function formatDate(value) {
  if (!value) {
    return '–';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '–';
  }
  return new Intl.DateTimeFormat('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatDateRange(start, end) {
  if (!start && !end) {
    return 'Gesamter Leistungszeitraum';
  }

  const formattedStart = formatDate(start);
  const formattedEnd = formatDate(end);
  if (formattedStart === '–') {
    return `bis ${formattedEnd}`;
  }
  if (formattedEnd === '–') {
    return `ab ${formattedStart}`;
  }
  return `${formattedStart} – ${formattedEnd}`;
}

function generateInternalId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `invoice-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

function normalizeEntry(raw, userMap = new Map()) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const directoryInfo =
    state.caseDirectory.get(raw.caseNumber) || state.caseDirectory.get(raw.caseId);
  const caseNumber =
    typeof raw.caseNumber === 'string' && raw.caseNumber.trim()
      ? raw.caseNumber.trim()
      : directoryInfo?.caseNumber ?? '';

  const durationMsCandidates = [
    Number(raw.durationMs),
    Number.isFinite(Number(raw.durationMinutes)) ? Number(raw.durationMinutes) * 60000 : NaN,
  ];
  const durationMs = durationMsCandidates.find((value) => Number.isFinite(value) && value >= 0) ?? 0;

  const userRate = raw.userId ? userMap.get(raw.userId)?.billableRate : undefined;
  const rateCandidates = [raw.rate, raw.billableRate, userRate, directoryInfo?.defaultRate, 180]
    .map((value) => Number(value))
    .find((value) => Number.isFinite(value) && value >= 0);

  const normalized = {
    id:
      typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : generateInternalId(),
    activity:
      typeof raw.activity === 'string' && raw.activity.trim()
        ? raw.activity.trim()
        : 'Ohne Titel',
    caseNumber,
    caseTitle:
      typeof raw.caseTitle === 'string' && raw.caseTitle.trim()
        ? raw.caseTitle.trim()
        : directoryInfo?.title ?? '',
    client:
      typeof raw.client === 'string' && raw.client.trim()
        ? raw.client.trim()
        : directoryInfo?.client ?? 'Unzugeordneter Mandant',
    durationMs,
    endedAt: raw.endedAt ?? raw.ended_at ?? raw.startedAt ?? null,
    notes: typeof raw.notes === 'string' ? raw.notes.trim() : '',
    rate: Number.isFinite(rateCandidates) ? rateCandidates : 0,
  };

  if (!normalized.caseNumber && directoryInfo?.caseNumber) {
    normalized.caseNumber = directoryInfo.caseNumber;
  }

  return normalized;
}

function loadCaseDirectory() {
  state.caseDirectory.clear();

  const store = getStore();
  if (!store) {
    console.warn('Zentraler Store nicht verfügbar – Case Directory bleibt leer.');
    return;
  }

  const users = store.getAll('User');
  const userMap = new Map(users.map((user) => [user.id, user]));
  const cases = store.getAll('Case');
  const clients = store.getAll('Client');

  cases.forEach((caseItem) => {
    const caseNumber =
      typeof caseItem.caseNumber === 'string' && caseItem.caseNumber.trim()
        ? caseItem.caseNumber.trim()
        : caseItem.id;
    const client = clients.find((entry) => entry.id === caseItem.clientId);
    const defaultRate = (caseItem.assignedUsers ?? [])
      .map((id) => userMap.get(id)?.billableRate)
      .find((value) => Number.isFinite(value));

    const directoryEntry = {
      caseId: caseItem.id,
      caseNumber,
      title: caseItem.title,
      client: client?.name ?? 'Unbekannter Mandant',
      clientId: caseItem.clientId,
      defaultRate,
    };

    state.caseDirectory.set(caseNumber, directoryEntry);
    state.caseDirectory.set(caseItem.id, directoryEntry);
  });
}

function loadEntries() {
  const store = getStore();
  if (!store) {
    overlayInstance?.show?.({
      title: 'Kein Datenstore verfügbar',
      message: 'Der zentrale Store konnte nicht geladen werden. Leistungen können nicht übernommen werden.',
    });
    return [];
  }

  const users = store.getAll('User');
  const userMap = new Map(users.map((user) => [user.id, user]));
  const rawEntries = store.getAll('TimeEntry').filter((entry) => !entry.invoiceId);

  return rawEntries
    .map((entry) =>
      normalizeEntry(
        {
          ...entry,
          durationMs: Number.isFinite(Number(entry.durationMinutes))
            ? Number(entry.durationMinutes) * 60000
            : entry.durationMs,
          caseNumber: state.caseDirectory.get(entry.caseId)?.caseNumber ?? entry.caseNumber,
          caseId: entry.caseId,
          caseTitle: state.caseDirectory.get(entry.caseId)?.title ?? entry.caseTitle,
          client: state.caseDirectory.get(entry.caseId)?.client,
          rate: entry.billableRate ?? entry.rate,
        },
        userMap
      )
    )
    .filter((entry) => entry !== null);
}

function setFieldError(field, errorElement, message) {
  if (!field || !errorElement) {
    return;
  }

  if (message) {
    field.classList.add('is-invalid');
    errorElement.textContent = message;
  } else {
    field.classList.remove('is-invalid');
    errorElement.textContent = '';
  }
}

function clearStepMessages() {
  if (itemsErrorEl) {
    itemsErrorEl.textContent = '';
  }
  if (step1ErrorEl) {
    step1ErrorEl.textContent = '';
  }
  if (clientErrorEl) {
    clientErrorEl.textContent = '';
  }
}

function updateProgressIndicator(activeIndex) {
  if (!progressContainer) {
    return;
  }

  const stepsElements = Array.from(progressContainer.querySelectorAll('[data-progress-step]'));
  stepsElements.forEach((stepEl) => {
    const stepIndex = Number.parseInt(stepEl.dataset.progressStep ?? '0', 10);
    stepEl.classList.toggle('wizard-progress__step--current', stepIndex === activeIndex);
    stepEl.classList.toggle('wizard-progress__step--completed', stepIndex < activeIndex);
    stepEl.classList.toggle('wizard-progress__step--upcoming', stepIndex > activeIndex);
    if (stepIndex === activeIndex) {
      stepEl.setAttribute('aria-current', 'step');
    } else {
      stepEl.removeAttribute('aria-current');
    }
  });

  progressContainer.setAttribute(
    'aria-label',
    `Fortschritt Rechnungs-Wizard: Schritt ${activeIndex} von ${state.maxStep}`
  );
}

function showStep(targetStep) {
  if (!steps.length) {
    return;
  }

  const clampedStep = Math.min(Math.max(1, targetStep), state.maxStep);
  state.activeStep = clampedStep;

  steps.forEach((section) => {
    const stepIndex = Number.parseInt(section.dataset.step ?? '0', 10);
    const isActive = stepIndex === clampedStep;
    section.toggleAttribute('hidden', !isActive);
    if (isActive) {
      section.querySelector('.wizard-step__title')?.focus?.();
    }
  });

  if (prevButton) {
    prevButton.disabled = clampedStep === 1;
  }
  if (nextButton) {
    nextButton.hidden = clampedStep === state.maxStep;
  }
  if (submitButton) {
    submitButton.hidden = clampedStep !== state.maxStep;
  }

  updateProgressIndicator(clampedStep);

  if (clampedStep === 2) {
    renderLineItems();
  } else if (clampedStep === 4) {
    updatePreview();
  }
}

function parsePeriodSelection() {
  const value = periodSelect?.value ?? 'all';
  const now = new Date();
  const end = now;

  if (value === 'all') {
    return { start: null, end: null };
  }

  const days = Number.parseInt(value, 10);
  if (!Number.isFinite(days) || days <= 0) {
    return { start: null, end: null };
  }

  const start = new Date(now);
  start.setDate(now.getDate() - days);
  return { start, end };
}

function filterEntries() {
  const client = clientSelect?.value ?? '';
  const caseNumber = caseSelect?.value ?? '';
  const { start, end } = parsePeriodSelection();

  if (step1ErrorEl) {
    step1ErrorEl.textContent = '';
  }
  if (itemsErrorEl) {
    itemsErrorEl.textContent = '';
  }

  state.selectedClient = client;
  state.selectedCase = caseNumber;
  state.selectedPeriod = periodSelect?.value ?? 'all';

  const hasStart = start instanceof Date && !Number.isNaN(start.getTime());
  const hasEnd = end instanceof Date && !Number.isNaN(end.getTime());

  state.filteredEntries = state.entries.filter((entry) => {
    if (client && entry.client !== client) {
      return false;
    }
    if (caseNumber && entry.caseNumber !== caseNumber) {
      return false;
    }

    if (!hasStart && !hasEnd) {
      return true;
    }

    const endedAt = entry.endedAt ? new Date(entry.endedAt) : null;
    if (!endedAt || Number.isNaN(endedAt.getTime())) {
      return false;
    }

    if (hasStart && endedAt < start) {
      return false;
    }

    if (hasEnd && endedAt > end) {
      return false;
    }

    return true;
  });

  prepareLineItems();
  updateFilterSummary();
}

function reloadEntriesFromStore() {
  const previousClient = state.selectedClient;
  const previousCase = state.selectedCase;

  loadCaseDirectory();
  state.entries = loadEntries();

  populateClientOptions();
  if (previousClient && clientSelect?.querySelector(`option[value="${previousClient}"]`)) {
    clientSelect.value = previousClient;
    state.selectedClient = previousClient;
  }

  populateCaseOptions(clientSelect?.value ?? '');
  if (previousCase && caseSelect?.querySelector(`option[value="${previousCase}"]`)) {
    caseSelect.value = previousCase;
    state.selectedCase = previousCase;
  }

  filterEntries();
}

function prepareLineItems() {
  state.lineItems = state.filteredEntries.map((entry) => {
    const hours = entry.durationMs / 3600000;
    const roundedHours = Number.isFinite(hours) ? Math.max(0, hours) : 0;
    const rate = Number.isFinite(entry.rate) ? Math.max(0, entry.rate) : 0;
    return {
      id: entry.id,
      description: entry.activity,
      caseTitle: entry.caseTitle,
      caseNumber: entry.caseNumber,
      client: entry.client,
      hours: roundedHours,
      rate,
      amount: roundedHours * rate,
      endedAt: entry.endedAt,
      notes: entry.notes,
    };
  });

  state.selectedEntryIds = state.lineItems.map((item) => item.id);
  updateTotals();
}

function updateFilterSummary() {
  if (!summaryEl) {
    return;
  }

  if (!state.filteredEntries.length) {
    summaryEl.innerHTML = `
      <p class="invoice-summary__empty">
        Für die aktuelle Auswahl wurden keine Leistungen gefunden.
      </p>
    `;
    return;
  }

  const hours = state.lineItems.reduce((sum, item) => sum + item.hours, 0);
  const net = state.lineItems.reduce((sum, item) => sum + item.amount, 0);
  const period = parsePeriodSelection();

  summaryEl.innerHTML = `
    <div class="invoice-summary__row">
      <span class="invoice-summary__label">Vorausgewählte Leistungen</span>
      <span class="invoice-summary__value">${state.filteredEntries.length}</span>
    </div>
    <div class="invoice-summary__row">
      <span class="invoice-summary__label">Zeitraum</span>
      <span class="invoice-summary__value">${formatDateRange(period.start, period.end)}</span>
    </div>
    <div class="invoice-summary__row">
      <span class="invoice-summary__label">Stunden (gesamt)</span>
      <span class="invoice-summary__value">${hours.toFixed(2)} h</span>
    </div>
    <div class="invoice-summary__row">
      <span class="invoice-summary__label">Zwischensumme</span>
      <span class="invoice-summary__value">${formatCurrency(net)}</span>
    </div>
  `;
}

function updateTotals() {
  const taxRate = getTaxRate();
  const selectedItems = state.lineItems.filter((item) =>
    state.selectedEntryIds.includes(item.id)
  );

  const totalHours = selectedItems.reduce((sum, item) => sum + item.hours, 0);
  const net = selectedItems.reduce((sum, item) => sum + item.hours * item.rate, 0);
  const tax = net * (taxRate / 100);
  const gross = net + tax;

  if (totalHoursEl) {
    totalHoursEl.textContent = `${totalHours.toFixed(2)} h`;
  }
  if (totalNetEl) {
    totalNetEl.textContent = formatCurrency(net);
  }
  if (totalTaxEl) {
    totalTaxEl.textContent = formatCurrency(tax);
  }
  if (totalGrossEl) {
    totalGrossEl.textContent = formatCurrency(gross);
  }
}

function getTaxRate() {
  const raw = taxRateInput?.value ?? `${state.invoiceDetails.taxRate}`;
  const parsed = Number.parseFloat(raw);
  if (Number.isFinite(parsed) && parsed >= 0) {
    state.invoiceDetails.taxRate = parsed;
    return parsed;
  }
  return state.invoiceDetails.taxRate;
}

function renderLineItems() {
  if (!itemsTableBody || !itemsEmptyEl) {
    return;
  }

  itemsTableBody.innerHTML = '';

  if (!state.lineItems.length) {
    itemsEmptyEl.hidden = false;
    return;
  }

  itemsEmptyEl.hidden = true;

  state.lineItems.forEach((item, index) => {
    const row = document.createElement('tr');
    row.dataset.entryId = item.id;

    const selectionCell = document.createElement('td');
    const selectionId = `line-item-${index}`;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = selectionId;
    checkbox.className = 'invoice-line-toggle';
    checkbox.dataset.entryId = item.id;
    checkbox.checked = state.selectedEntryIds.includes(item.id);
    const selectionLabel = document.createElement('label');
    selectionLabel.htmlFor = selectionId;
    selectionLabel.className = 'visually-hidden';
    selectionLabel.textContent = 'Leistung für Rechnung berücksichtigen';
    selectionCell.appendChild(checkbox);
    selectionCell.appendChild(selectionLabel);
    row.appendChild(selectionCell);

    const descriptionCell = document.createElement('td');
    descriptionCell.innerHTML = `
      <div class="invoice-line__title">${item.description}</div>
      <div class="invoice-line__meta">
        ${item.caseTitle || 'Ohne Aktenbezug'}
        ${item.caseNumber ? ` · ${item.caseNumber}` : ''}
        ${item.endedAt ? ` · ${formatDate(item.endedAt)}` : ''}
      </div>
      ${item.notes ? `<div class="invoice-line__notes">${item.notes}</div>` : ''}
    `;
    row.appendChild(descriptionCell);

    const durationCell = document.createElement('td');
    durationCell.textContent = formatHours(item.hours);
    row.appendChild(durationCell);

    const rateCell = document.createElement('td');
    const rateInput = document.createElement('input');
    rateInput.type = 'number';
    rateInput.min = '0';
    rateInput.step = '5';
    rateInput.value = item.rate.toFixed(2);
    rateInput.dataset.entryId = item.id;
    rateInput.className = 'invoice-line__rate';
    rateCell.appendChild(rateInput);
    row.appendChild(rateCell);

    const amountCell = document.createElement('td');
    amountCell.dataset.role = 'amount';
    amountCell.textContent = formatCurrency(item.hours * item.rate);
    row.appendChild(amountCell);

    itemsTableBody.appendChild(row);
  });
}

function updateAmountDisplay(entryId) {
  const row = itemsTableBody?.querySelector(`tr[data-entry-id="${entryId}"]`);
  if (!row) {
    return;
  }
  const amountCell = row.querySelector('[data-role="amount"]');
  const item = state.lineItems.find((line) => line.id === entryId);
  if (amountCell && item) {
    amountCell.textContent = formatCurrency(item.hours * item.rate);
  }
}

function validateStep(stepIndex) {
  clearStepMessages();

  if (stepIndex === 1) {
    if (!clientSelect || !clientSelect.value) {
      if (clientSelect) {
        setFieldError(clientSelect, clientErrorEl, 'Bitte wählen Sie einen Mandanten aus.');
        clientSelect.focus();
      }
      step1ErrorEl.textContent = 'Ohne Mandant kann keine Rechnung erstellt werden.';
      return false;
    }

    if (!state.filteredEntries.length) {
      step1ErrorEl.textContent =
        'Für diese Kombination aus Mandant, Zeitraum und Akte liegen keine Leistungen vor.';
      return false;
    }

    setFieldError(clientSelect, clientErrorEl, '');
    return true;
  }

  if (stepIndex === 2) {
    if (!state.selectedEntryIds.length) {
      itemsErrorEl.textContent = 'Bitte wählen Sie mindestens eine Leistung aus.';
      return false;
    }

    const invalidRate = state.lineItems.find((item) => item.rate <= 0);
    if (invalidRate) {
      itemsErrorEl.textContent = 'Die Stundensätze müssen größer als 0 sein.';
      return false;
    }

    return true;
  }

  if (stepIndex === 3) {
    let isValid = true;

    if (!invoiceNumberInput || !invoiceNumberInput.value.trim()) {
      setFieldError(invoiceNumberInput, invoiceNumberError, 'Bitte geben Sie eine Rechnungsnummer ein.');
      invoiceNumberInput?.focus();
      isValid = false;
    } else {
      setFieldError(invoiceNumberInput, invoiceNumberError, '');
    }

    if (!invoiceDateInput || !invoiceDateInput.value) {
      setFieldError(invoiceDateInput, invoiceDateError, 'Bitte wählen Sie ein Rechnungsdatum.');
      if (isValid) {
        invoiceDateInput?.focus();
      }
      isValid = false;
    } else {
      setFieldError(invoiceDateInput, invoiceDateError, '');
    }

    if (!dueDateInput || !dueDateInput.value) {
      setFieldError(dueDateInput, dueDateError, 'Bitte wählen Sie ein Fälligkeitsdatum.');
      if (isValid) {
        dueDateInput?.focus();
      }
      isValid = false;
    } else if (invoiceDateInput && invoiceDateInput.value && dueDateInput.value < invoiceDateInput.value) {
      setFieldError(dueDateInput, dueDateError, 'Das Fälligkeitsdatum muss nach dem Rechnungsdatum liegen.');
      if (isValid) {
        dueDateInput?.focus();
      }
      isValid = false;
    } else {
      setFieldError(dueDateInput, dueDateError, '');
    }

    if (!taxRateInput || !taxRateInput.value) {
      setFieldError(taxRateInput, taxRateError, 'Bitte wählen Sie einen Umsatzsteuersatz.');
      if (isValid) {
        taxRateInput?.focus();
      }
      isValid = false;
    } else {
      setFieldError(taxRateInput, taxRateError, '');
    }

    if (!isValid) {
      return false;
    }

    persistInvoiceDetails();
    updatePreview();
    return true;
  }

  return true;
}

function persistInvoiceDetails() {
  state.invoiceDetails = {
    number: invoiceNumberInput?.value.trim() ?? '',
    invoiceDate: invoiceDateInput?.value ?? '',
    dueDate: dueDateInput?.value ?? '',
    taxRate: getTaxRate(),
    reference: referenceInput?.value.trim() ?? '',
    paymentTerms: paymentTermsInput?.value.trim() ?? '',
    notes: notesInput?.value.trim() ?? '',
  };
}

function updatePreview() {
  const selectedItems = state.lineItems.filter((item) =>
    state.selectedEntryIds.includes(item.id)
  );

  const net = selectedItems.reduce((sum, item) => sum + item.hours * item.rate, 0);
  const taxRate = getTaxRate();
  const tax = net * (taxRate / 100);
  const gross = net + tax;

  if (previewMetaEl) {
    const date = formatDate(state.invoiceDetails.invoiceDate);
    previewMetaEl.textContent = `Rechnungsnummer ${state.invoiceDetails.number || '–'} · Datum ${date}`;
  }
  if (previewClientEl) {
    previewClientEl.textContent = state.selectedClient || '–';
  }
  if (previewCaseEl) {
    previewCaseEl.textContent =
      state.selectedCase || state.lineItems[0]?.caseNumber || 'Alle Akten dieses Mandanten';
  }
  if (previewPeriodEl) {
    const { start, end } = parsePeriodSelection();
    previewPeriodEl.textContent = formatDateRange(start, end);
  }
  if (previewDueEl) {
    previewDueEl.textContent = formatDate(state.invoiceDetails.dueDate);
  }

  if (previewItemsBody) {
    previewItemsBody.innerHTML = '';
    selectedItems.forEach((item) => {
      const row = document.createElement('tr');
      const descCell = document.createElement('td');
      descCell.innerHTML = `
        <div class="invoice-line__title">${item.description}</div>
        <div class="invoice-line__meta">
          ${item.caseTitle || 'Ohne Aktenbezug'}${
            item.caseNumber ? ` · ${item.caseNumber}` : ''
          }
        </div>
      `;
      row.appendChild(descCell);

      const hoursCell = document.createElement('td');
      hoursCell.textContent = formatHours(item.hours);
      row.appendChild(hoursCell);

      const rateCell = document.createElement('td');
      rateCell.textContent = formatCurrency(item.rate);
      row.appendChild(rateCell);

      const amountCell = document.createElement('td');
      amountCell.textContent = formatCurrency(item.hours * item.rate);
      row.appendChild(amountCell);

      previewItemsBody.appendChild(row);
    });
  }

  if (previewNetEl) {
    previewNetEl.textContent = formatCurrency(net);
  }
  if (previewTaxEl) {
    previewTaxEl.textContent = formatCurrency(tax);
  }
  if (previewGrossEl) {
    previewGrossEl.textContent = formatCurrency(gross);
  }
  if (previewNotesEl) {
    const noteParts = [state.invoiceDetails.paymentTerms, state.invoiceDetails.notes].filter(Boolean);
    previewNotesEl.textContent = noteParts.join('\n\n');
  }
}

function deriveSelectedCaseInfo() {
  if (state.selectedCase) {
    return state.caseDirectory.get(state.selectedCase);
  }

  const fallbackCaseNumber = state.lineItems[0]?.caseNumber;
  if (fallbackCaseNumber) {
    return state.caseDirectory.get(fallbackCaseNumber);
  }
  return null;
}

function persistInvoiceToStore() {
  const store = getStore();
  if (!store) {
    return;
  }

  const selectedItems = state.lineItems.filter((item) => state.selectedEntryIds.includes(item.id));
  if (!selectedItems.length) {
    return;
  }

  const caseInfo = deriveSelectedCaseInfo();
  if (!caseInfo?.caseId || !caseInfo?.clientId) {
    overlayInstance?.show?.({
      title: 'Akte nicht ausgewählt',
      message: 'Bitte wählen Sie eine Akte aus, damit die Rechnung zugeordnet werden kann.',
    });
    return;
  }

  const net = selectedItems.reduce((sum, item) => sum + item.hours * item.rate, 0);
  const taxRatePercent = getTaxRate();
  const taxRateDecimal = taxRatePercent / 100;

  const invoicePayload = {
    caseId: caseInfo.caseId,
    clientId: caseInfo.clientId,
    entryIds: state.selectedEntryIds,
    issueDate: state.invoiceDetails.invoiceDate,
    dueDate: state.invoiceDetails.dueDate,
    status: 'versendet',
    totalNet: net,
    taxRate: taxRateDecimal,
    currency: 'EUR',
    invoiceNumber: state.invoiceDetails.number,
    note: state.invoiceDetails.notes,
  };

  const savedInvoice = store.addInvoice(invoicePayload);
  state.selectedEntryIds.forEach((entryId) => {
    store.updateTimeEntry(entryId, { invoiceId: savedInvoice.id });
  });
}

function handleRateChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  if (!target.classList.contains('invoice-line__rate')) {
    return;
  }

  const entryId = target.dataset.entryId;
  if (!entryId) {
    return;
  }

  const value = Number.parseFloat(target.value);
  const sanitized = Number.isFinite(value) && value >= 0 ? value : 0;
  const lineItem = state.lineItems.find((item) => item.id === entryId);
  if (!lineItem) {
    return;
  }

  lineItem.rate = sanitized;
  updateAmountDisplay(entryId);
  updateTotals();
}

function handleSelectionChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  if (target.type !== 'checkbox') {
    return;
  }

  const entryId = target.dataset.entryId;
  if (!entryId) {
    return;
  }

  if (target.checked) {
    if (!state.selectedEntryIds.includes(entryId)) {
      state.selectedEntryIds.push(entryId);
    }
  } else {
    state.selectedEntryIds = state.selectedEntryIds.filter((id) => id !== entryId);
  }

  updateTotals();
}

function populateClientOptions() {
  if (!clientSelect) {
    return;
  }

  const uniqueClients = new Map();
  state.entries.forEach((entry) => {
    if (!uniqueClients.has(entry.client)) {
      uniqueClients.set(entry.client, []);
    }
    uniqueClients.get(entry.client).push(entry);
  });

  clientSelect.innerHTML = '<option value="" disabled selected>Mandant auswählen</option>';

  uniqueClients.forEach((entries, client) => {
    const option = document.createElement('option');
    option.value = client;
    option.textContent = client;
    option.dataset.caseCount = String(entries.length);
    clientSelect.appendChild(option);
  });

  if (uniqueClients.size === 1) {
    const singleClient = uniqueClients.keys().next().value;
    clientSelect.value = singleClient;
  }
}

function populateCaseOptions(client) {
  if (!caseSelect) {
    return;
  }

  caseSelect.innerHTML = '<option value="">Alle Akten</option>';

  const casesForClient = new Map();
  state.entries
    .filter((entry) => !client || entry.client === client)
    .forEach((entry) => {
      const label = entry.caseTitle || entry.caseNumber || 'Unbekannte Akte';
      if (!casesForClient.has(entry.caseNumber)) {
        casesForClient.set(entry.caseNumber, label);
      }
    });

  casesForClient.forEach((label, caseNumber) => {
    if (!caseNumber) {
      return;
    }
    const option = document.createElement('option');
    option.value = caseNumber;
    option.textContent = `${caseNumber} – ${label}`;
    caseSelect.appendChild(option);
  });
}

function registerStoreListeners() {
  const store = getStore();
  if (!store?.on) {
    return;
  }

  const events = [
    'timeEntryAdded',
    'timeEntryUpdated',
    'timeEntryRemoved',
    'caseAdded',
    'caseUpdated',
    'caseRemoved',
    'invoiceAdded',
    'invoiceUpdated',
    'invoiceRemoved',
    'storeReset',
    'storeReady',
  ];

  events.forEach((eventName) => {
    store.on(eventName, reloadEntriesFromStore);
  });
}

function handleNext() {
  if (!validateStep(state.activeStep)) {
    return;
  }
  showStep(state.activeStep + 1);
}

function handlePrev() {
  showStep(state.activeStep - 1);
}

function handleSubmit(event) {
  event.preventDefault();
  if (!validateStep(state.activeStep)) {
    return;
  }

  persistInvoiceDetails();
  persistInvoiceToStore();
  updatePreview();
  form?.setAttribute('hidden', '');
  successMessage?.removeAttribute('hidden');
  successMessage?.focus?.();
}

function resetWizard() {
  form?.reset();
  state.selectedEntryIds = [];
  state.filteredEntries = [];
  state.selectedClient = '';
  state.selectedCase = '';
  state.selectedPeriod = 'all';
  state.invoiceDetails = {
    number: '',
    invoiceDate: '',
    dueDate: '',
    taxRate: 19,
    reference: '',
    paymentTerms: '',
    notes: '',
  };

  reloadEntriesFromStore();
  applyDefaultInvoiceValues();
  form?.removeAttribute('hidden');
  successMessage?.setAttribute('hidden', '');
  showStep(1);
}

function applyDefaultInvoiceValues() {
  const today = new Date();
  const due = new Date(today);
  due.setDate(today.getDate() + 14);

  if (invoiceNumberInput) {
    invoiceNumberInput.value = `INV-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}${String(
      today.getDate()
    ).padStart(2, '0')}`;
  }
  if (invoiceDateInput) {
    invoiceDateInput.value = today.toISOString().slice(0, 10);
  }
  if (dueDateInput) {
    dueDateInput.value = due.toISOString().slice(0, 10);
  }
  if (taxRateInput) {
    taxRateInput.value = '19';
  }
  if (paymentTermsInput) {
    paymentTermsInput.value = 'Zahlbar innerhalb von 14 Tagen ohne Abzug auf das bekannte Kanzleikonto.';
  }
}

function handleExport() {
  const blob = new Blob(['PDF-Export ist ein Platzhalter in diesem Mock.'], {
    type: 'application/pdf',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${state.invoiceDetails.number || 'verilex-rechnung'}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

function attachEventListeners() {
  nextButton?.addEventListener('click', handleNext);
  prevButton?.addEventListener('click', handlePrev);
  form?.addEventListener('submit', handleSubmit);
  resetButton?.addEventListener('click', resetWizard);
  exportButton?.addEventListener('click', handleExport);

  clientSelect?.addEventListener('change', () => {
    setFieldError(clientSelect, clientErrorEl, '');
    populateCaseOptions(clientSelect.value);
    filterEntries();
  });

  periodSelect?.addEventListener('change', filterEntries);
  caseSelect?.addEventListener('change', filterEntries);

  itemsTableBody?.addEventListener('input', handleRateChange);
  itemsTableBody?.addEventListener('change', handleSelectionChange);

  taxRateInput?.addEventListener('change', () => {
    getTaxRate();
    updateTotals();
    updatePreview();
  });

  invoiceNumberInput?.addEventListener('input', () =>
    setFieldError(invoiceNumberInput, invoiceNumberError, '')
  );
  invoiceDateInput?.addEventListener('input', () =>
    setFieldError(invoiceDateInput, invoiceDateError, '')
  );
  dueDateInput?.addEventListener('input', () =>
    setFieldError(dueDateInput, dueDateError, '')
  );
  taxRateInput?.addEventListener('input', () =>
    setFieldError(taxRateInput, taxRateError, '')
  );
}

function initializeWizard() {
  if (!form) {
    return;
  }

  reloadEntriesFromStore();
  applyDefaultInvoiceValues();
  attachEventListeners();
  registerStoreListeners();
  showStep(1);
}

initializeWizard();
