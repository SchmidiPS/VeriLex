class GlobalErrorOverlay {
  constructor(root) {
    this.root = root;
    this.messageEl = root.querySelector('#error-overlay-message');
    this.detailsEl = root.querySelector('#error-overlay-details');
    this.dismissButtons = root.querySelectorAll('[data-error-action="dismiss"]');
    this.reloadButton = root.querySelector('[data-error-action="reload"]');
    this.isVisible = false;

    this.dismissButtons.forEach((btn) =>
      btn.addEventListener('click', () => this.hide())
    );

    if (this.reloadButton) {
      this.reloadButton.addEventListener('click', () => {
        window.location.reload();
      });
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });
  }

  show({ title, message, details }) {
    if (title) {
      const titleEl = this.root.querySelector('#error-overlay-title');
      if (titleEl) {
        titleEl.textContent = title;
      }
    }

    this.messageEl.textContent = message ?? 'Ein unbekannter Fehler ist aufgetreten.';

    if (details) {
      this.detailsEl.textContent = details;
      this.detailsEl.parentElement.removeAttribute('hidden');
    } else {
      this.detailsEl.textContent = '';
      this.detailsEl.parentElement.setAttribute('hidden', '');
    }

    this.root.removeAttribute('hidden');
    this.root.setAttribute('aria-hidden', 'false');
    this.isVisible = true;
    this.root.querySelector('.error-overlay__content')?.focus?.();
  }

  hide() {
    this.root.setAttribute('hidden', '');
    this.root.setAttribute('aria-hidden', 'true');
    this.isVisible = false;
  }
}

function formatErrorDetails(error) {
  if (!error) return '';

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return [error.message, error.stack].filter(Boolean).join('\n');
  }

  try {
    return JSON.stringify(error, null, 2);
  } catch (jsonError) {
    return String(error);
  }
}

function initGlobalErrorHandling() {
  const overlayRoot = document.getElementById('global-error-overlay');
  if (!overlayRoot) {
    console.warn('Global error overlay root element not found.');
    return;
  }

  const overlay = new GlobalErrorOverlay(overlayRoot);

  const showFromEvent = (event) => {
    const { error, reason, message, filename, lineno, colno } = event;
    const detailSource = error ?? reason;
    const formattedDetails = formatErrorDetails(detailSource);

    const overlayTitle = 'Ein unerwarteter Fehler ist aufgetreten';
    const overlayMessage =
      (message && typeof message === 'string')
        ? message
        : 'Bitte entschuldigen Sie die Umstände. Wir kümmern uns sofort darum.';

    const meta = [];
    if (filename) {
      meta.push(`Datei: ${filename}`);
    }
    if (typeof lineno === 'number') {
      meta.push(`Zeile: ${lineno}`);
    }
    if (typeof colno === 'number') {
      meta.push(`Spalte: ${colno}`);
    }

    const details = [formattedDetails, meta.join(' | ')].filter(Boolean).join('\n\n');

    overlay.show({ title: overlayTitle, message: overlayMessage, details });
  };

  window.addEventListener('error', (event) => {
    event.preventDefault();
    showFromEvent(event);
  });

  window.addEventListener('unhandledrejection', (event) => {
    event.preventDefault();
    showFromEvent(event);
  });

  window.addEventListener('verilex:error', (event) => {
    const detail = event.detail ?? {};
    overlay.show({
      title: detail.title ?? 'Fehler',
      message:
        detail.message ??
        'Es ist ein Problem aufgetreten. Bitte versuchen Sie es erneut.',
      details: formatErrorDetails(detail.details),
    });
  });

  return overlay;
}

const overlayInstance = initGlobalErrorHandling();

const demoButton = document.getElementById('trigger-demo-error');
if (demoButton) {
  demoButton.addEventListener('click', () => {
    const demoError = new Error('Dies ist ein simuliertes Fehlerbeispiel für das Overlay.');
    window.dispatchEvent(
      new CustomEvent('verilex:error', {
        detail: {
          title: 'Demo-Fehler',
          message: 'So sieht das Fehler-Overlay bei einer Ausnahme aus.',
          details: demoError,
        },
      })
    );
  });
}

function normalizeCaseEntry(entry) {
  return {
    caseNumber: String(entry.caseNumber ?? '').trim(),
    title: String(entry.title ?? '').trim(),
    client: String(entry.client ?? '').trim(),
    deadlineStatus: String(entry.deadlineStatus ?? 'Status unbekannt').trim(),
    deadlineCategory: (entry.deadlineCategory ?? 'info').toString().trim().toLowerCase(),
  };
}

function determineBadgeModifier(category) {
  const allowed = new Set(['ok', 'warning', 'critical', 'info']);
  return allowed.has(category) ? category : 'info';
}

function initCaseDirectory() {
  const dataElement = document.getElementById('case-data');
  if (!dataElement) {
    return;
  }

  let parsedCases = [];
  try {
    const rawText = dataElement.textContent ?? '[]';
    parsedCases = JSON.parse(rawText);
  } catch (error) {
    console.error('Die Akten-Daten konnten nicht geparst werden.', error);
    overlayInstance?.show?.({
      title: 'Fehler beim Laden der Akten',
      message: 'Die Demo-Akten konnten nicht geladen werden.',
      details: error,
    });
    return;
  }

  const cases = Array.isArray(parsedCases)
    ? parsedCases.map((entry) => normalizeCaseEntry(entry))
    : [];

  const grid = document.getElementById('case-grid');
  const emptyState = document.getElementById('case-empty-state');
  const summary = document.getElementById('case-result-summary');
  const searchInput = document.getElementById('case-search-input');

  if (!grid || !emptyState || !summary || !searchInput) {
    return;
  }

  let currentList = cases.slice();
  let selectionMessage = '';
  let renderedCards = [];

  const updateSummary = (count) => {
    const baseMessage = count === 1 ? '1 Akte gefunden' : `${count} Akten gefunden`;
    summary.textContent = selectionMessage ? `${baseMessage} — ${selectionMessage}` : baseMessage;
  };

  const renderList = (list) => {
    grid.innerHTML = '';
    const fragment = document.createDocumentFragment();

    list.forEach((caseEntry, index) => {
      const badgeModifier = determineBadgeModifier(caseEntry.deadlineCategory);
      const card = document.createElement('article');
      card.className = 'case-card';
      card.tabIndex = 0;
      card.dataset.index = String(index);
      card.dataset.caseNumber = caseEntry.caseNumber;
      card.dataset.caseTitle = caseEntry.title;
      card.setAttribute('role', 'listitem');
      card.setAttribute(
        'aria-label',
        `${caseEntry.caseNumber || 'Ohne Aktenzeichen'} – ${caseEntry.title || 'Ohne Titel'}`
      );

      card.innerHTML = `
        <div class="case-card__meta">
          <span class="case-card__number" aria-hidden="true">${caseEntry.caseNumber || 'n/a'}</span>
          <span class="case-badge case-badge--${badgeModifier}">${caseEntry.deadlineStatus}</span>
        </div>
        <h3 class="case-card__title">${caseEntry.title || 'Unbenannte Akte'}</h3>
        <p class="case-card__client">
          <span class="case-card__client-label">Mandant:</span>
          <span>${caseEntry.client || 'unbekannt'}</span>
        </p>
        <div class="case-card__footer">
          <span class="case-card__action-hint">Enter oder Leertaste markiert die Akte</span>
          <span class="case-card__icon" aria-hidden="true">⟶</span>
        </div>
      `;

      fragment.appendChild(card);
    });

    grid.appendChild(fragment);
    renderedCards = Array.from(grid.querySelectorAll('.case-card'));
    grid.hidden = list.length === 0;
    emptyState.hidden = list.length !== 0;
    selectionMessage = '';
    updateSummary(list.length);
  };

  const filterCases = (query) => {
    if (!query) {
      return cases.slice();
    }

    const normalizedQuery = query.toLocaleLowerCase('de-DE');
    return cases.filter((caseEntry) => {
      const numberMatch = caseEntry.caseNumber.toLocaleLowerCase('de-DE').includes(normalizedQuery);
      const titleMatch = caseEntry.title.toLocaleLowerCase('de-DE').includes(normalizedQuery);
      return numberMatch || titleMatch;
    });
  };

  const handleSearchInput = (event) => {
    const input = event.target;
    const value = input instanceof HTMLInputElement ? input.value.trim() : '';
    currentList = filterCases(value);
    renderList(currentList);
  };

  const announceSelection = (caseEntry) => {
    if (!caseEntry) {
      selectionMessage = '';
      updateSummary(currentList.length);
      return;
    }

    selectionMessage = `Akte „${caseEntry.title || caseEntry.caseNumber}“ markiert`;
    updateSummary(currentList.length);
  };

  const handleGridKeyDown = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.classList.contains('case-card')) {
      return;
    }

    const index = Number.parseInt(target.dataset.index ?? '', 10);
    if (Number.isNaN(index)) {
      return;
    }

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      const nextIndex = Math.min(index + 1, renderedCards.length - 1);
      if (nextIndex !== index) {
        event.preventDefault();
        renderedCards[nextIndex]?.focus();
      }
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      const nextIndex = Math.max(index - 1, 0);
      if (nextIndex !== index) {
        event.preventDefault();
        renderedCards[nextIndex]?.focus();
      }
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      renderedCards[0]?.focus();
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      renderedCards[renderedCards.length - 1]?.focus();
      return;
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      announceSelection(currentList[index]);
    }
  };

  searchInput.addEventListener('input', handleSearchInput);
  grid.addEventListener('keydown', handleGridKeyDown);

  currentList = cases.slice();
  renderList(currentList);
}

initCaseDirectory();

export { GlobalErrorOverlay, overlayInstance };
