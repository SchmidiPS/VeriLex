const SUMMARY_DATA = {
  cases: 27,
  hours: 142,
  invoiceVolume: 21850,
};

const CASE_STATUS_DATA = [
  { label: 'Neu eingegangen', value: 7 },
  { label: 'In Bearbeitung', value: 12 },
  { label: 'Warten auf Rückmeldung', value: 5 },
  { label: 'Abgeschlossen', value: 9 },
];

const HOURS_SERIES = [
  { label: 'Mo', value: 18 },
  { label: 'Di', value: 22 },
  { label: 'Mi', value: 26 },
  { label: 'Do', value: 21 },
  { label: 'Fr', value: 19 },
  { label: 'Sa', value: 8 },
  { label: 'So', value: 4 },
];

const INVOICE_STATUS_DATA = [
  { label: 'Bezahlt', value: 18, color: '#34d399' },
  { label: 'Offen', value: 9, color: '#60a5fa' },
  { label: 'Überfällig', value: 4, color: '#f97316' },
];

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
    invoiceEl.textContent = `${metrics.invoiceVolume.toLocaleString('de-DE')} €`;
  }
}

function renderBarChart(container, data) {
  if (!container || !Array.isArray(data) || data.length === 0) {
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

function initDashboard() {
  updateSummary(SUMMARY_DATA);
  renderBarChart(document.getElementById('case-status-chart'), CASE_STATUS_DATA);
  renderTrendChart(
    document.getElementById('hours-trend-chart'),
    document.getElementById('hours-trend-axis'),
    HOURS_SERIES,
  );
  renderDonutChart(
    document.getElementById('invoice-status-chart'),
    document.getElementById('invoice-status-legend'),
    INVOICE_STATUS_DATA,
    {
      valueEl: document.getElementById('invoice-donut-value'),
      captionEl: document.getElementById('invoice-donut-caption'),
    },
  );
}

initDashboard();
