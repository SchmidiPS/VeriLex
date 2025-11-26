import { verilexStore } from './store.js';

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

    if (this.messageEl) {
      this.messageEl.textContent =
        message ?? 'Ein unbekannter Fehler ist aufgetreten.';
    }

    if (this.detailsEl) {
      if (details) {
        this.detailsEl.textContent = details;
        this.detailsEl.parentElement?.removeAttribute('hidden');
      } else {
        this.detailsEl.textContent = '';
        this.detailsEl.parentElement?.setAttribute('hidden', '');
      }
    }

    this.root.removeAttribute('hidden');
    this.root.setAttribute('aria-hidden', 'false');
    this.isVisible = true;
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
    return null;
  }

  const overlay = new GlobalErrorOverlay(overlayRoot);

  const showFromEvent = (event) => {
    const { error, reason, message, filename, lineno, colno } = event;
    const detailSource = error ?? reason;
    const formattedDetails = formatErrorDetails(detailSource);

    const overlayTitle = 'Ein unerwarteter Fehler ist aufgetreten';
    const overlayMessage =
      typeof message === 'string'
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

function getSteps(form) {
  return Array.from(form.querySelectorAll('.wizard-step'));
}

function findStep(form, index) {
  return form.querySelector(`.wizard-step[data-step="${index}"]`);
}

function updateProgressIndicator(container, activeIndex, maxIndex) {
  const steps = Array.from(container.querySelectorAll('[data-progress-step]'));
  steps.forEach((stepEl) => {
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

  container.setAttribute(
    'aria-label',
    `Fortschritt Mandatsanlage: Schritt ${activeIndex} von ${maxIndex}`
  );
}

function collectFormData(form) {
  const formData = new FormData(form);
  const data = {};

  for (const [key, value] of formData.entries()) {
    if (key === 'documents') {
      continue;
    }

    data[key] = typeof value === 'string' ? value.trim() : value;
  }

  const documentSelections = formData.getAll('documents');
  if (documentSelections.length > 0) {
    data.documents = documentSelections;
  } else {
    delete data.documents;
  }

  return data;
}

function formatDocumentLabel(value) {
  const labels = {
    vertrag: 'Vertragsunterlagen',
    korrespondenz: 'Schriftverkehr',
    beweise: 'Beweisstücke',
    aktennotizen: 'Interne Aktennotizen',
  };
  return labels[value] ?? value;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDisplay(value, fallback = '–') {
  if (value == null) {
    return escapeHtml(fallback);
  }

  const trimmed = typeof value === 'string' ? value.trim() : value;
  if (trimmed === '') {
    return escapeHtml(fallback);
  }

  return escapeHtml(trimmed);
}

function formatMultiline(value, fallback = 'Keine Notizen hinterlegt.') {
  const display = formatDisplay(value, fallback);
  return display.replace(/\n/g, '<br />');
}

function renderSummary(container, data) {
  const documentList = (data.documents ?? [])
    .map((doc) => `<li>${escapeHtml(formatDocumentLabel(doc))}</li>`)
    .join('');

  container.innerHTML = `
    <dl class="summary-grid">
      <div>
        <dt>Mandatsnummer</dt>
        <dd>${formatDisplay(data.mandateNumber)}</dd>
      </div>
      <div>
        <dt>Mandant*in</dt>
        <dd>${formatDisplay(data.clientName)}</dd>
      </div>
      <div>
        <dt>E-Mail</dt>
        <dd>${formatDisplay(data.contactEmail)}</dd>
      </div>
      <div>
        <dt>Telefon</dt>
        <dd>${formatDisplay(data.contactPhone)}</dd>
      </div>
      <div>
        <dt>Rechtsgebiet</dt>
        <dd>${formatDisplay(formatLabel(data.practiceArea))}</dd>
      </div>
      <div>
        <dt>Verantwortliche Person</dt>
        <dd>${formatDisplay(data.responsibleLawyer)}</dd>
      </div>
      <div>
        <dt>Gegenpartei</dt>
        <dd>${formatDisplay(data.opponentName)}</dd>
      </div>
      <div>
        <dt>Kontakt Gegenpartei</dt>
        <dd>${formatDisplay(data.opponentContact)}</dd>
      </div>
      <div class="summary-wide">
        <dt>Notizen</dt>
        <dd>${formatMultiline(data.opponentNotes)}</dd>
      </div>
      <div class="summary-wide">
        <dt>Akteninhalt</dt>
        <dd>${formatMultiline(data.matterSummary, '–')}</dd>
      </div>
      <div>
        <dt>Dringlichkeit</dt>
        <dd>${formatDisplay(formatLabel(data.urgency))}</dd>
      </div>
      <div>
        <dt>Erste Frist</dt>
        <dd>${formatDisplay(formatDate(data.initialDeadline))}</dd>
      </div>
      <div class="summary-wide">
        <dt>Dokumente</dt>
        <dd>
          ${
            documentList
              ? `<ul class="summary-list">${documentList}</ul>`
              : 'Noch keine Dokumente ausgewählt.'
          }
        </dd>
      </div>
    </dl>
  `;
}

function formatLabel(value) {
  if (!value) return '–';
  const labels = {
    arbeitsrecht: 'Arbeitsrecht',
    gesellschaftsrecht: 'Gesellschaftsrecht',
    familienrecht: 'Familienrecht',
    strafrecht: 'Strafrecht',
    zivilrecht: 'Zivilrecht',
    hoch: 'Hoch',
    mittel: 'Mittel',
    niedrig: 'Niedrig',
  };
  return labels[value] ?? value;
}

function formatDate(value) {
  if (!value) return '–';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '–';
    }
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch (error) {
    console.error('Failed to format date', error);
    overlayInstance?.show?.({
      title: 'Fehler bei der Datumsformatierung',
      message: 'Das eingegebene Datum konnte nicht verarbeitet werden.',
      details: error,
    });
    return value;
  }
}

function persistMandateToStore(data) {
  if (!verilexStore) {
    return null;
  }

  const normalizedClientName = data.clientName?.trim();
  const clientCollection = verilexStore.getAll('Client');
  const existingClient = normalizedClientName
    ? clientCollection.find((client) => client.name.toLowerCase() === normalizedClientName.toLowerCase())
    : null;

  const client =
    existingClient ||
    verilexStore.addEntity('Client', {
      name: normalizedClientName || 'Unbekannter Mandant',
      contactEmail: data.contactEmail || 'unbekannt@example.com',
      phone: data.contactPhone || '',
      organizationType: data.practiceArea || 'Allgemein',
      preferredBilling: 'nach Stunden',
    });

  const casePayload = {
    caseNumber: data.mandateNumber || data.reference || `VX-${new Date().getFullYear()}-${Math.floor(Math.random() * 9999)}`,
    title: data.matterSummary?.trim() || 'Neues Mandat',
    clientId: client.id,
    status: 'neu',
    priority: data.urgency || 'mittel',
    category: formatLabel(data.practiceArea ?? 'Allgemein'),
    openedAt: new Date().toISOString().slice(0, 10),
    deadlines: [],
  };

  const createdCase = verilexStore.addCase(casePayload);

  if (data.initialDeadline) {
    verilexStore.addEntity('Appointment', {
      caseId: createdCase.id,
      dateTime: new Date(data.initialDeadline).toISOString(),
      type: 'Frist',
      description: 'Initiale Frist aus Mandatsanlage',
      participants: [],
    });
  }

  verilexStore.setActiveCase(createdCase.id);

  return { client, createdCase };
}

function updateSuccessMessage(successMessage, persistedData) {
  if (!successMessage || !persistedData?.createdCase) {
    return;
  }

  let metaLine = successMessage.querySelector('.wizard-success__meta');
  if (!metaLine) {
    metaLine = document.createElement('p');
    metaLine.className = 'wizard-success__meta';
    successMessage.append(metaLine);
  }

  metaLine.textContent = `Akte ${persistedData.createdCase.caseNumber} für ${persistedData.client.name} wurde im zentralen Store gespeichert.`;
}

function resetErrors(step) {
  step.querySelectorAll('.field-error').forEach((el) => {
    el.textContent = '';
  });

  step
    .querySelectorAll('.is-invalid')
    .forEach((field) => {
      field.classList.remove('is-invalid');
      field.removeAttribute('aria-invalid');
    });
}

function validateStep(step) {
  resetErrors(step);

  const inputs = step.querySelectorAll('input, select, textarea');
  let isValid = true;

  inputs.forEach((input) => {
    const errorElementId = input.getAttribute('aria-describedby');
    const errorElement = errorElementId
      ? step.querySelector(`#${CSS.escape(errorElementId)}`)
      : null;

    input.classList.remove('is-invalid');

    if (input.hasAttribute('required') && !input.value.trim()) {
      isValid = false;
      input.classList.add('is-invalid');
      input.setAttribute('aria-invalid', 'true');
      if (errorElement) {
        errorElement.textContent = 'Dieses Feld ist erforderlich.';
      }
      return;
    }

    if (input.type === 'email' && input.value) {
      const emailPattern = /\S+@\S+\.\S+/;
      if (!emailPattern.test(input.value)) {
        isValid = false;
        input.classList.add('is-invalid');
        input.setAttribute('aria-invalid', 'true');
        if (errorElement) {
          errorElement.textContent = 'Bitte geben Sie eine gültige E-Mail-Adresse an.';
        }
        return;
      }
    }

    if (input.type === 'tel' && input.value) {
      const telPattern = /^[0-9+()\/\-\s]{6,}$/;
      if (!telPattern.test(input.value)) {
        isValid = false;
        input.classList.add('is-invalid');
        input.setAttribute('aria-invalid', 'true');
        if (errorElement) {
          errorElement.textContent = 'Bitte geben Sie eine gültige Telefonnummer ein.';
        }
      }
    }
  });

  if (step.dataset.step === '4') {
    const confirmation = step.querySelector('#terms-confirmation');
    const errorElement = step.querySelector('#terms-confirmation-error');
    if (confirmation && !confirmation.checked) {
      isValid = false;
      confirmation.classList.add('is-invalid');
      confirmation.setAttribute('aria-invalid', 'true');
      if (errorElement) {
        errorElement.textContent = 'Bitte bestätigen Sie die Angaben.';
      }
    }
  }

  return isValid;
}

function toggleStepVisibility(steps, activeIndex) {
  steps.forEach((step) => {
    const stepIndex = Number.parseInt(step.dataset.step ?? '0', 10);
    if (stepIndex === activeIndex) {
      step.removeAttribute('hidden');
    } else {
      step.setAttribute('hidden', '');
    }
  });
}

function updateNavigationButtons({ prevBtn, nextBtn, submitBtn }, activeIndex, maxIndex) {
  prevBtn.disabled = activeIndex === 1;
  nextBtn.hidden = activeIndex === maxIndex;
  submitBtn.hidden = activeIndex !== maxIndex;
}

function initWizard() {
  const form = document.getElementById('mandate-form');
  if (!form) {
    return;
  }

  const steps = getSteps(form);
  const maxIndex = steps.length;
  let activeIndex = 1;
  let formState = {};

  const progress = document.querySelector('.wizard-progress');
  const summaryContainer = document.getElementById('wizard-summary');
  const successMessage = document.getElementById('wizard-success');
  const resetButton = document.getElementById('wizard-reset');

  const prevBtn = document.getElementById('wizard-prev');
  const nextBtn = document.getElementById('wizard-next');
  const submitBtn = document.getElementById('wizard-submit');

  if (!progress || !prevBtn || !nextBtn || !submitBtn || !summaryContainer) {
    console.error('Wizard initialisation failed due to missing elements.');
    overlayInstance?.show?.({
      title: 'Wizard konnte nicht geladen werden',
      message: 'Bestimmte Elemente wurden nicht gefunden.',
    });
    return;
  }

  const showStep = (index) => {
    activeIndex = index;
    toggleStepVisibility(steps, activeIndex);
    updateProgressIndicator(progress, activeIndex, maxIndex);
    updateNavigationButtons({ prevBtn, nextBtn, submitBtn }, activeIndex, maxIndex);

    const stepHeading = steps[activeIndex - 1]?.querySelector('.wizard-step__title');
    if (stepHeading) {
      stepHeading.focus?.();
    }

    if (activeIndex === maxIndex) {
      formState = collectFormData(form);
      renderSummary(summaryContainer, formState);
    }
  };

  const goToNextStep = () => {
    const currentStep = findStep(form, activeIndex);
    if (!currentStep) {
      return;
    }

    if (!validateStep(currentStep)) {
      const firstInvalid = currentStep.querySelector('.is-invalid');
      firstInvalid?.focus?.();
      return;
    }

    if (activeIndex < maxIndex) {
      showStep(activeIndex + 1);
    }
  };

  const goToPreviousStep = () => {
    if (activeIndex > 1) {
      showStep(activeIndex - 1);
    }
  };

  nextBtn.addEventListener('click', goToNextStep);
  prevBtn.addEventListener('click', goToPreviousStep);

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const currentStep = findStep(form, activeIndex);
    if (!currentStep) {
      return;
    }

    if (!validateStep(currentStep)) {
      const firstInvalid = currentStep.querySelector('.is-invalid');
      firstInvalid?.focus?.();
      return;
    }

    formState = collectFormData(form);
    renderSummary(summaryContainer, formState);

    const persisted = persistMandateToStore(formState);
    updateSuccessMessage(successMessage, persisted);

    form.setAttribute('hidden', '');
    successMessage?.removeAttribute('hidden');
    successMessage?.focus?.();
  });

  resetButton?.addEventListener('click', () => {
    form.reset();
    form.removeAttribute('hidden');
    successMessage?.setAttribute('hidden', '');
    form.querySelectorAll('.field-error').forEach((el) => {
      el.textContent = '';
    });
    form
      .querySelectorAll('.is-invalid')
      .forEach((el) => {
        el.classList.remove('is-invalid');
        el.removeAttribute('aria-invalid');
      });
    summaryContainer.innerHTML = '';
    formState = {};
    showStep(1);
  });

  const handleFieldFeedback = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) {
      return;
    }

    const errorElementId = target.getAttribute('aria-describedby');
    if (!errorElementId) {
      return;
    }

    const errorElement = document.getElementById(errorElementId);
    if (!errorElement || !target.classList.contains('is-invalid')) {
      return;
    }

    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      if (target.checked) {
        target.classList.remove('is-invalid');
        target.removeAttribute('aria-invalid');
        errorElement.textContent = '';
      }
      return;
    }

    if (target.type === 'email' && target.value) {
      const emailPattern = /\S+@\S+\.\S+/;
      if (emailPattern.test(target.value)) {
        target.classList.remove('is-invalid');
        target.removeAttribute('aria-invalid');
        errorElement.textContent = '';
      }
      return;
    }

    if (target.type === 'tel' && target.value) {
      const telPattern = /^[0-9+()\/\-\s]{6,}$/;
      if (telPattern.test(target.value)) {
        target.classList.remove('is-invalid');
        target.removeAttribute('aria-invalid');
        errorElement.textContent = '';
      }
      return;
    }

    if (target instanceof HTMLSelectElement && target.value) {
      target.classList.remove('is-invalid');
      target.removeAttribute('aria-invalid');
      errorElement.textContent = '';
      return;
    }

    if (target.value.trim()) {
      target.classList.remove('is-invalid');
      target.removeAttribute('aria-invalid');
      errorElement.textContent = '';
    }
  };

  form.addEventListener('input', handleFieldFeedback);
  form.addEventListener('change', handleFieldFeedback);

  showStep(1);
}

try {
  initWizard();
} catch (error) {
  console.error('Wizard initialisation failed', error);
  overlayInstance?.show?.({
    title: 'Unerwarteter Fehler',
    message: 'Der Mandats-Wizard konnte nicht geladen werden.',
    details: error,
  });
}
