import { verilexStore } from './store.js';

const WEEKDAY_ORDER = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const INVOICE_COLORS = {
  bezahlt: '#34d399',
  versendet: '#60a5fa',
  entwurf: '#a855f7',
  überfällig: '#f97316',
};

function updateSummary(metrics) {
  const casesEl = document.getElementById('summary-cases-value');
  const hoursEl = document.getElementById('summary-hours-value');
  const invoiceEl = document.getElementById('summary-invoices-value');

  if (casesEl) {
    casesEl.textContent = metrics.cases.toString();
  }

  if (hoursEl) {
    hoursEl.textContent = `${metrics.hours} h`;
  }

  if (invoiceEl) {
    const formatted = metrics.invoiceVolume.toLocaleString('de-DE', {
      minimumFractionDigits: metrics.invoiceVolume % 1 === 0 ? 0 : 2,
    });
    invoiceEl.textContent = `${formatted} €`;
  }
}

function deriveSummaryFromStore() {
  const cases = verilexStore.getAll('Case');
  const timeEntries = verilexStore.getAll('TimeEntry');
  const invoices = verilexStore.getAll('Invoice');

  const totalMinutes = timeEntries.reduce((sum, entry) => sum + Math.max(Number(entry.durationMinutes) || 0, 0), 0);
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
  const invoiceVolume = invoices.reduce((sum, invoice) => sum + Math.max(Number(invoice.totalNet) || 0, 0), 0);

  return {
    cases: cases.length,
    hours: Number.isFinite(totalHours) ? totalHours : 0,
    invoiceVolume: Number.isFinite(invoiceVolume) ? invoiceVolume : 0,
  };
}

function renderBarChart(container, data) {
  if (!container || !Array.isArray(data) || data.length === 0) {
    if (container) {
      container.innerHTML = '';
    }
    return;
  }

  container.innerHTML = '';
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  data.forEach((item) => {
    const column = document.createElement('div');
    column.className = 'dashboard-chart__column';

    const bar = document.createElement('div');
    bar.className = 'dashboard-chart__bar';
    const height = Math.max(6, Math.round((item.value / maxValue) * 100));
    bar.style.height = `${height}%`;
    bar.dataset.value = `${item.value} Fälle`;

    const label = document.createElement('span');
    label.className = 'dashboard-chart__label';
    label.textContent = item.label;

    column.append(bar, label);
    container.append(column);
  });
}

function renderTrendChart(svgEl, axisEl, data) {
  if (!svgEl || !Array.isArray(data) || data.length === 0) {
    if (svgEl) {
      svgEl.innerHTML = '';
    }
    if (axisEl) {
      axisEl.innerHTML = '';
    }
    return;
  }

  const sanitized = data.filter((entry) => typeof entry.value === 'number' && !Number.isNaN(entry.value));
  if (sanitized.length === 0) {
    return;
  }

  const maxValue = Math.max(...sanitized.map((entry) => entry.value), 1);
  const coordinates = sanitized.map((entry, index) => {
    const ratio = sanitized.length > 1 ? index / (sanitized.length - 1) : 0;
    const x = (ratio * 100).toFixed(2);
    const y = (100 - (entry.value / maxValue) * 100).toFixed(2);
    return `${x},${y}`;
  });

  const areaPathSegments = ['M0,100'];
  coordinates.forEach((point) => {
    areaPathSegments.push(`L${point}`);
  });
  areaPathSegments.push('L100,100 Z');

  const gradientId = 'dashboardTrendGradient';
  svgEl.innerHTML = `
    <defs>
      <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(37, 99, 235, 0.45)" />
        <stop offset="100%" stop-color="rgba(37, 99, 235, 0)" />
      </linearGradient>
    </defs>
    <path d="${areaPathSegments.join(' ')}" fill="url(#${gradientId})"></path>
    <polyline
      points="${coordinates.join(' ')}"
      fill="none"
      stroke="#2563eb"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    ></polyline>
  `;

  if (axisEl) {
    axisEl.innerHTML = sanitized
      .map((entry) => `<li><span>${entry.label}</span></li>`)
      .join('');
  }
}

function renderDonutChart(container, legendEl, data, { valueEl, captionEl } = {}) {
  if (!container || !Array.isArray(data) || data.length === 0) {
    if (container) {
      container.style.background = 'conic-gradient(#e5e7eb 0deg, #e5e7eb 360deg)';
    }
    if (valueEl) {
      valueEl.textContent = '0%';
    }
    if (captionEl) {
      captionEl.textContent = 'Keine Daten';
    }
    if (legendEl) {
      legendEl.innerHTML = '';
    }
    return;
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    container.style.background = 'conic-gradient(#d1d5db 0deg, #d1d5db 360deg)';
    if (valueEl) {
      valueEl.textContent = '0%';
    }
    if (captionEl) {
      captionEl.textContent = 'Keine Daten';
    }
    if (legendEl) {
      legendEl.innerHTML = '';
    }
    return;
  }

  let cumulative = 0;
  const segments = data
    .map((item) => {
      const start = (cumulative / total) * 360;
      cumulative += item.value;
      const end = (cumulative / total) * 360;
      return `${item.color} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`;
    })
    .join(', ');

  container.style.background = `conic-gradient(${segments})`;

  const dominant = data.reduce((best, current) => (current.value > best.value ? current : best), data[0]);
  const dominantShare = Math.round((dominant.value / total) * 100);

  if (valueEl) {
    valueEl.textContent = `${dominantShare}%`;
  }

  if (captionEl) {
    captionEl.textContent = dominant.label;
  }

  if (legendEl) {
    legendEl.innerHTML = data
      .map((item) => {
        const share = Math.round((item.value / total) * 100);
        return `
          <li class="dashboard-legend__item">
            <span class="dashboard-legend__label">
              <span class="dashboard-legend__swatch" style="--swatch-color: ${item.color}"></span>
              ${item.label}
            </span>
            <span class="dashboard-legend__value">${item.value} (${share}%)</span>
          </li>
        `;
      })
      .join('');
  }
}

function deriveCaseStatusData(cases) {
  const order = Array.isArray(window?.verilexDataModel?.enums?.caseStatus)
    ? window.verilexDataModel.enums.caseStatus
    : [];

  const counts = new Map();
  cases.forEach((item) => {
    const status = (item.status ?? 'Unbekannt').toString();
    counts.set(status, (counts.get(status) ?? 0) + 1);
  });

  const ordered = order.length > 0 ? order : Array.from(counts.keys()).sort((a, b) => a.localeCompare(b, 'de'));
  return ordered.map((status) => ({ label: status, value: counts.get(status) ?? 0 })).filter((entry) => entry.value > 0);
}

function deriveHoursSeries(timeEntries) {
  const buckets = new Map(WEEKDAY_ORDER.map((label) => [label, 0]));

  timeEntries.forEach((entry) => {
    const startedAt = new Date(entry.startedAt ?? entry.start);
    if (Number.isNaN(startedAt.getTime())) {
      return;
    }
    const weekdayIndex = startedAt.getDay();
    const label = WEEKDAY_ORDER[weekdayIndex === 0 ? 6 : weekdayIndex - 1];
    const current = buckets.get(label) ?? 0;
    const additionalHours = Math.max(Number(entry.durationMinutes) || 0, 0) / 60;
    buckets.set(label, current + additionalHours);
  });

  return WEEKDAY_ORDER.map((label) => ({ label, value: Math.round((buckets.get(label) ?? 0) * 10) / 10 }));
}

function deriveInvoiceStatusData(invoices) {
  const counts = new Map();
  invoices.forEach((invoice) => {
    const status = (invoice.status ?? 'unbekannt').toString();
    counts.set(status, (counts.get(status) ?? 0) + 1);
  });

  const entries = Array.from(counts.entries()).map(([status, value]) => {
    const normalized = status.toLowerCase();
    return {
      label: status.charAt(0).toUpperCase() + status.slice(1),
      value,
      color: INVOICE_COLORS[normalized] ?? '#60a5fa',
    };
  });

  return entries.sort((a, b) => b.value - a.value);
}

function renderDashboardFromStore() {
  updateSummary(deriveSummaryFromStore());
  renderBarChart(document.getElementById('case-status-chart'), deriveCaseStatusData(verilexStore.getAll('Case')));
  renderTrendChart(
    document.getElementById('hours-trend-chart'),
    document.getElementById('hours-trend-axis'),
    deriveHoursSeries(verilexStore.getAll('TimeEntry')),
  );
  renderDonutChart(
    document.getElementById('invoice-status-chart'),
    document.getElementById('invoice-status-legend'),
    deriveInvoiceStatusData(verilexStore.getAll('Invoice')),
    {
      valueEl: document.getElementById('invoice-donut-value'),
      captionEl: document.getElementById('invoice-donut-caption'),
    },
  );
}

function initDashboard() {
  renderDashboardFromStore();
  verilexStore.on('storeChanged', renderDashboardFromStore);
}

initDashboard();
