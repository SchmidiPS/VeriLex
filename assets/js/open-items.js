const dataElement = document.getElementById('receivables-data');
if (!dataElement) {
  console.warn('Receivables data element not found.');
}

const currencyFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
});

const numberFormatter = new Intl.NumberFormat('de-DE');
const dateFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const relativeFormatter = new Intl.RelativeTimeFormat('de', {
  numeric: 'auto',
});

const statusLabels = {
  open: 'Offen',
  overdue: 'Überfällig',
  paid: 'Bezahlt',
};

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeReceivable(entry) {
  const normalizedStatus = String(entry.status ?? 'open').toLowerCase();
  const allowedStatuses = new Set(['open', 'overdue', 'paid']);

  return {
    invoiceNumber: String(entry.invoiceNumber ?? '').trim() || '–',
    caseNumber: String(entry.caseNumber ?? '').trim(),
    matter: String(entry.matter ?? '').trim(),
    client: String(entry.client ?? '').trim() || 'Unbekannter Mandant',
    issueDate: parseDate(entry.issueDate),
    dueDate: parseDate(entry.dueDate),
    paidDate: parseDate(entry.paidDate),
    amount: typeof entry.amount === 'number' ? entry.amount : Number(entry.amount) || 0,
    status: allowedStatuses.has(normalizedStatus) ? normalizedStatus : 'open',
    note: String(entry.note ?? '').trim(),
  };
}

function loadReceivables() {
  if (!dataElement) {
    return [];
  }

  try {
    const raw = dataElement.textContent ?? '[]';
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((entry) => normalizeReceivable(entry));
  } catch (error) {
    console.error('Die Rechnungsdaten konnten nicht geladen werden.', error);
    window.dispatchEvent(
      new CustomEvent('verilex:error', {
        detail: {
          title: 'Fehler beim Laden der Rechnungen',
          message: 'Die Offene-Posten-Daten konnten nicht interpretiert werden.',
          details: error,
        },
      })
    );
    return [];
  }
}

const receivables = loadReceivables();

const tableBody = document.getElementById('receivables-table-body');
const emptyState = document.getElementById('receivables-empty-state');
const tableSummary = document.getElementById('receivables-table-summary');
const outstandingTotal = document.getElementById('receivables-outstanding-total');
const searchInput = document.getElementById('receivables-search');
const statusFilter = document.getElementById('receivables-status-filter');
const outstandingOnlyToggle = document.getElementById('receivables-outstanding-only');

const summaryElements = {
  open: {
    count: document.getElementById('receivables-summary-open-count'),
    amount: document.getElementById('receivables-summary-open-amount'),
  },
  overdue: {
    count: document.getElementById('receivables-summary-overdue-count'),
    amount: document.getElementById('receivables-summary-overdue-amount'),
  },
  paid: {
    count: document.getElementById('receivables-summary-paid-count'),
    amount: document.getElementById('receivables-summary-paid-amount'),
  },
};

const filters = {
  query: '',
  status: 'all',
  outstandingOnly: false,
};

function formatDate(date) {
  return date ? dateFormatter.format(date) : '–';
}

function formatAmount(amount) {
  return currencyFormatter.format(amount ?? 0);
}

function describeDueDate(dueDate) {
  if (!dueDate) {
    return 'Kein Fälligkeitsdatum hinterlegt';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Heute fällig';
  }

  if (diffDays < 0) {
    const days = Math.abs(diffDays);
    return days === 1 ? 'Überfällig seit 1 Tag' : `Überfällig seit ${days} Tagen`;
  }

  return `Fällig ${relativeFormatter.format(diffDays, 'day')}`;
}

function matchesSearch(entry, query) {
  if (!query) {
    return true;
  }

  const haystack = [
    entry.invoiceNumber,
    entry.client,
    entry.caseNumber,
    entry.matter,
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

function sortReceivables(list) {
  const statusPriority = {
    overdue: 0,
    open: 1,
    paid: 2,
  };

  return [...list].sort((a, b) => {
    const statusDiff = (statusPriority[a.status] ?? 99) - (statusPriority[b.status] ?? 99);
    if (statusDiff !== 0) {
      return statusDiff;
    }

    const aDue = a.dueDate ? a.dueDate.getTime() : Number.POSITIVE_INFINITY;
    const bDue = b.dueDate ? b.dueDate.getTime() : Number.POSITIVE_INFINITY;
    if (aDue !== bDue) {
      return aDue - bDue;
    }

    return a.invoiceNumber.localeCompare(b.invoiceNumber, 'de');
  });
}

function updateSummary(list) {
  const aggregates = {
    open: { count: 0, amount: 0 },
    overdue: { count: 0, amount: 0 },
    paid: { count: 0, amount: 0 },
  };

  list.forEach((entry) => {
    const bucket = aggregates[entry.status];
    if (bucket) {
      bucket.count += 1;
      bucket.amount += entry.amount;
    }
  });

  (Object.keys(summaryElements)).forEach((key) => {
    const elements = summaryElements[key];
    const data = aggregates[key] ?? { count: 0, amount: 0 };
    if (elements?.count) {
      elements.count.textContent = numberFormatter.format(data.count);
    }
    if (elements?.amount) {
      elements.amount.textContent = formatAmount(data.amount);
    }
  });

  if (outstandingTotal) {
    const openAmount = aggregates.open.amount + aggregates.overdue.amount;
    outstandingTotal.textContent = `Summe offener und überfälliger Posten: ${formatAmount(openAmount)}`;
  }
}

function renderTable(list) {
  if (!tableBody) {
    return;
  }

  tableBody.innerHTML = '';

  const fragment = document.createDocumentFragment();

  list.forEach((entry) => {
    const row = document.createElement('tr');

    const invoiceCell = document.createElement('td');
    invoiceCell.className = 'receivables-table__cell';
    const invoicePrimary = document.createElement('span');
    invoicePrimary.className = 'receivables-table__primary';
    invoicePrimary.textContent = entry.invoiceNumber;
    invoiceCell.append(invoicePrimary);

    const invoiceSecondary = document.createElement('span');
    invoiceSecondary.className = 'receivables-table__secondary';
    invoiceSecondary.textContent = entry.issueDate
      ? `Erstellt am ${formatDate(entry.issueDate)}`
      : 'Erstellungsdatum unbekannt';
    invoiceCell.append(invoiceSecondary);

    const clientCell = document.createElement('td');
    clientCell.className = 'receivables-table__cell';
    const clientPrimary = document.createElement('span');
    clientPrimary.className = 'receivables-table__primary';
    clientPrimary.textContent = entry.client;
    clientCell.append(clientPrimary);

    const clientSecondary = document.createElement('span');
    clientSecondary.className = 'receivables-table__secondary';
    const matterParts = [];
    if (entry.caseNumber) {
      matterParts.push(`Akte ${entry.caseNumber}`);
    }
    if (entry.matter) {
      matterParts.push(entry.matter);
    }
    clientSecondary.textContent = matterParts.join(' · ') || 'Kein Aktenbezug hinterlegt';
    clientCell.append(clientSecondary);

    const dueCell = document.createElement('td');
    dueCell.className = 'receivables-table__cell';
    const duePrimary = document.createElement('span');
    duePrimary.className = 'receivables-table__primary';
    duePrimary.textContent = formatDate(entry.dueDate);
    dueCell.append(duePrimary);

    const dueSecondary = document.createElement('span');
    dueSecondary.className = 'receivables-table__secondary';
    dueSecondary.textContent = describeDueDate(entry.dueDate);
    dueCell.append(dueSecondary);

    const amountCell = document.createElement('td');
    amountCell.className = 'receivables-table__cell receivables-table__cell--amount';
    const amountPrimary = document.createElement('span');
    amountPrimary.className = 'receivables-table__amount';
    amountPrimary.textContent = formatAmount(entry.amount);
    amountCell.append(amountPrimary);

    const statusCell = document.createElement('td');
    statusCell.className = 'receivables-table__cell receivables-table__cell--status';
    const statusBadge = document.createElement('span');
    statusBadge.className = `status-badge status-badge--${entry.status}`;
    statusBadge.textContent = statusLabels[entry.status] ?? entry.status;
    statusCell.append(statusBadge);

    if (entry.status === 'paid' && entry.paidDate) {
      const paidInfo = document.createElement('span');
      paidInfo.className = 'receivables-table__secondary';
      paidInfo.textContent = `Bezahlt am ${formatDate(entry.paidDate)}`;
      statusCell.append(paidInfo);
    } else if (entry.status !== 'paid' && entry.note) {
      const noteInfo = document.createElement('span');
      noteInfo.className = 'receivables-table__secondary';
      noteInfo.textContent = entry.note;
      statusCell.append(noteInfo);
    } else if (entry.status !== 'paid') {
      const dueInfo = document.createElement('span');
      dueInfo.className = 'receivables-table__secondary';
      dueInfo.textContent = entry.note || 'Noch keine Rückmeldung erfasst';
      statusCell.append(dueInfo);
    }

    row.append(invoiceCell, clientCell, dueCell, amountCell, statusCell);
    fragment.append(row);
  });

  tableBody.append(fragment);
}

function updateEmptyState(count) {
  if (!emptyState) {
    return;
  }

  if (count === 0) {
    emptyState.removeAttribute('hidden');
  } else {
    emptyState.setAttribute('hidden', '');
  }
}

function updateTableSummary(count) {
  if (!tableSummary) {
    return;
  }

  const formattedCount = numberFormatter.format(count);
  tableSummary.textContent =
    count === 1 ? '1 Rechnung gefunden.' : `${formattedCount} Rechnungen gefunden.`;
}

function applyFilters() {
  const filtered = receivables.filter((entry) => {
    if (!matchesSearch(entry, filters.query)) {
      return false;
    }

    if (filters.status !== 'all' && entry.status !== filters.status) {
      return false;
    }

    if (filters.outstandingOnly && entry.status === 'paid') {
      return false;
    }

    return true;
  });

  const sorted = sortReceivables(filtered);
  renderTable(sorted);
  updateSummary(sorted);
  updateTableSummary(sorted.length);
  updateEmptyState(sorted.length);
}

applyFilters();

if (searchInput) {
  searchInput.addEventListener('input', (event) => {
    filters.query = event.target.value.trim();
    applyFilters();
  });
}

if (statusFilter) {
  statusFilter.addEventListener('change', (event) => {
    filters.status = event.target.value;
    applyFilters();
  });
}

if (outstandingOnlyToggle) {
  outstandingOnlyToggle.addEventListener('change', (event) => {
    filters.outstandingOnly = event.target.checked;
    applyFilters();
  });
}
