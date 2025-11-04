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

export { GlobalErrorOverlay, overlayInstance };
