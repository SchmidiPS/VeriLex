const MAX_PACKAGE_SIZE = 50 * 1024 * 1024; // 50 MB Mock-Grenze
const WARNING_THRESHOLD = MAX_PACKAGE_SIZE * 0.8;

const ROLE_OPTIONS = [
  { value: 'hauptdokument', label: 'Hauptdokument' },
  { value: 'beilage', label: 'Beilage' },
  { value: 'nachweis', label: 'Nachweis' },
  { value: 'sonstiges', label: 'Sonstiges' },
];

const VALIDATION_ICONS = {
  error: '⚠️',
  warning: 'ℹ️',
  success: '✅',
  info: '🔍',
};

const STATUS_PILL_CLASSES = {
  draft: 'status-pill--draft',
  info: 'status-pill--info',
  success: 'status-pill--success',
  warning: 'status-pill--warning',
  error: 'status-pill--error',
};

function safeParseJson(elementId, fallback = []) {
  const element = document.getElementById(elementId);
  if (!element) {
    return fallback;
  }

  try {
    const rawText = element.textContent ?? '[]';
    const parsed = JSON.parse(rawText);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    console.error(`JSON in Element #${elementId} konnte nicht geparst werden.`, error);
    window.dispatchEvent(
      new CustomEvent('verilex:error', {
        detail: {
          title: 'Datenfehler',
          message: 'Die Demo-Daten für den ERV-Builder konnten nicht geladen werden.',
          details: error,
        },
      })
    );
    return fallback;
  }
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function generateId(prefix = 'doc') {
  if (window.crypto?.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normaliseRole(role) {
  const allowed = new Set(ROLE_OPTIONS.map((option) => option.value));
  return allowed.has(role) ? role : 'beilage';
}

function initErvPackageBuilder() {
  const form = document.getElementById('erv-form');
  if (!form) {
    return;
  }

  const packageNameInput = document.getElementById('erv-package-name');
  const recipientSelect = document.getElementById('erv-recipient');
  const submissionTypeSelect = document.getElementById('erv-submission-type');
  const encryptionToggle = document.getElementById('erv-encryption');
  const dropzone = document.getElementById('erv-dropzone');
  const fileInput = document.getElementById('erv-file-input');
  const clearButton = document.getElementById('erv-clear-files');
  const selectButton = document.getElementById('erv-select-files');
  const documentList = document.getElementById('erv-document-list');
  const emptyState = document.getElementById('erv-document-empty');
  const documentSummary = document.getElementById('erv-document-summary');
  const documentCountBadge = document.getElementById('erv-documents-count');
  const validationList = document.getElementById('erv-validation-list');
  const validationEmpty = document.getElementById('erv-validation-empty');
  const validationBadge = document.getElementById('erv-validation-badge');
  const progressSteps = Array.from(document.querySelectorAll('.erv-progress__step'));
  const packageSummary = document.getElementById('erv-package-summary');
  const submitButton = document.getElementById('erv-submit');
  const exportButton = document.getElementById('erv-export');
  const submitFeedback = document.getElementById('erv-submit-feedback');
  const sampleList = document.getElementById('erv-sample-list');

  const recipients = safeParseJson('erv-recipient-data');
  const sampleDocuments = safeParseJson('erv-sample-documents');

  const state = {
    documents: [],
    validationResults: [],
  };

  function setFieldError(input, message) {
    if (!input) {
      return;
    }

    const errorId = input.getAttribute('aria-describedby');
    const errorElement = errorId ? document.getElementById(errorId) : null;

    if (message) {
      input.classList.add('is-invalid');
      input.setAttribute('aria-invalid', 'true');
      if (errorElement) {
        errorElement.textContent = message;
      }
    } else {
      input.classList.remove('is-invalid');
      input.removeAttribute('aria-invalid');
      if (errorElement) {
        errorElement.textContent = '';
      }
    }
  }

  function renderRecipientOptions() {
    if (!recipientSelect) {
      return;
    }

    const currentSelection = recipientSelect.value;
    recipientSelect.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = 'Empfangsgericht auswählen';
    recipientSelect.appendChild(placeholder);

    recipients.forEach((recipient) => {
      const option = document.createElement('option');
      option.value = recipient.id;
      option.textContent = recipient.name;
      option.dataset.supportsPriority = recipient.supportsPriority ? 'true' : 'false';
      option.dataset.address = recipient.address ?? '';
      recipientSelect.appendChild(option);
    });

    if (currentSelection) {
      recipientSelect.value = currentSelection;
    }
  }

  function ensureMainDocumentAssigned(documents) {
    if (documents.some((doc) => doc.role === 'hauptdokument')) {
      return;
    }

    const firstDoc = documents[0];
    if (firstDoc) {
      firstDoc.role = 'hauptdokument';
    }
  }

  function addDocuments(newDocs) {
    if (!Array.isArray(newDocs) || newDocs.length === 0) {
      return;
    }

    state.documents = state.documents.concat(newDocs);
    ensureMainDocumentAssigned(state.documents);
    synchronizeUI();
  }

  function createDocumentFromFile(file) {
    if (!(file instanceof File)) {
      return null;
    }

    return {
      id: generateId('file'),
      name: file.name ?? 'Unbenannt',
      size: clamp(file.size ?? 0, 0, Number.MAX_SAFE_INTEGER),
      type: file.type ?? 'unbekannt',
      role: state.documents.length === 0 ? 'hauptdokument' : 'beilage',
      signed: false,
      description: '',
      source: 'upload',
      issues: [],
    };
  }

  function createDocumentFromSample(sample) {
    if (!sample) {
      return null;
    }

    return {
      id: generateId(sample.id ?? 'sample'),
      name: sample.name ?? 'Demo-Dokument',
      size: clamp(sample.size ?? 0, 0, Number.MAX_SAFE_INTEGER),
      type: sample.type ?? 'application/octet-stream',
      role: normaliseRole(sample.role),
      signed: Boolean(sample.signed),
      description: sample.description ?? '',
      source: sample.id ?? 'sample',
      isSample: true,
      issues: [],
    };
  }

  function handleFilesFromInput(files) {
    const docs = Array.from(files ?? [])
      .map((file) => createDocumentFromFile(file))
      .filter(Boolean);

    addDocuments(docs);
  }

  function removeDocument(docId) {
    const index = state.documents.findIndex((doc) => doc.id === docId);
    if (index === -1) {
      return;
    }

    state.documents.splice(index, 1);
    ensureMainDocumentAssigned(state.documents);
    synchronizeUI();
  }

  function updateDocumentProperty(docId, property, value) {
    const doc = state.documents.find((entry) => entry.id === docId);
    if (!doc) {
      return;
    }

    if (property === 'role') {
      doc.role = normaliseRole(value);
      if (doc.role === 'hauptdokument') {
        state.documents
          .filter((entry) => entry.id !== docId)
          .forEach((entry) => {
            if (entry.role === 'hauptdokument') {
              entry.role = 'beilage';
            }
          });
      } else if (!state.documents.some((entry) => entry.role === 'hauptdokument')) {
        doc.role = 'hauptdokument';
      }
    } else if (property === 'signed') {
      doc.signed = Boolean(value);
    } else if (property === 'description') {
      doc.description = String(value ?? '').slice(0, 160);
    }

    synchronizeUI();
  }

  function renderDocumentList() {
    if (!documentList) {
      return;
    }

    documentList.innerHTML = '';

    if (state.documents.length === 0) {
      emptyState?.removeAttribute('hidden');
      return;
    }

    emptyState?.setAttribute('hidden', '');

    const fragment = document.createDocumentFragment();

    state.documents.forEach((doc) => {
      const listItem = document.createElement('li');
      listItem.className = 'erv-document';
      listItem.dataset.docId = doc.id;

      const header = document.createElement('div');
      header.className = 'erv-document__header';

      const info = document.createElement('div');
      info.className = 'erv-document__info';

      const name = document.createElement('span');
      name.className = 'erv-document__name';
      name.textContent = doc.name;

      const meta = document.createElement('span');
      meta.className = 'erv-document__meta';
      meta.textContent = `${formatBytes(doc.size)} · ${doc.type || 'Unbekannt'}`;

      info.append(name, meta);

      const badgeContainer = document.createElement('div');
      badgeContainer.className = 'erv-document__badges';

      const roleBadge = document.createElement('span');
      roleBadge.className = 'status-pill status-pill--info';
      roleBadge.textContent = ROLE_OPTIONS.find((option) => option.value === doc.role)?.label ?? 'Beilage';
      badgeContainer.appendChild(roleBadge);

      if (doc.isSample) {
        const sampleBadge = document.createElement('span');
        sampleBadge.className = 'status-pill status-pill--sample';
        sampleBadge.textContent = 'Demo';
        badgeContainer.appendChild(sampleBadge);
      }

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'erv-document__remove';
      removeButton.dataset.docAction = 'remove';
      removeButton.textContent = 'Entfernen';
      removeButton.setAttribute('aria-label', `${doc.name} aus dem Paket entfernen`);

      header.append(info, badgeContainer, removeButton);

      const controls = document.createElement('div');
      controls.className = 'erv-document__controls';

      const roleControl = document.createElement('label');
      roleControl.className = 'erv-document__control';
      roleControl.textContent = 'Rolle';

      const roleSelect = document.createElement('select');
      roleSelect.dataset.docField = 'role';
      roleSelect.setAttribute('aria-label', `Rolle für ${doc.name} auswählen`);

      ROLE_OPTIONS.forEach((option) => {
        const opt = document.createElement('option');
        opt.value = option.value;
        opt.textContent = option.label;
        if (option.value === doc.role) {
          opt.selected = true;
        }
        roleSelect.appendChild(opt);
      });

      roleControl.appendChild(roleSelect);

      const signedControl = document.createElement('label');
      signedControl.className = 'erv-document__control erv-document__control--checkbox';

      const signedCheckbox = document.createElement('input');
      signedCheckbox.type = 'checkbox';
      signedCheckbox.dataset.docField = 'signed';
      signedCheckbox.checked = Boolean(doc.signed);
      signedCheckbox.setAttribute('aria-label', `Signaturstatus für ${doc.name}`);

      const signedLabelText = document.createElement('span');
      signedLabelText.textContent = 'Signiert';

      signedControl.append(signedCheckbox, signedLabelText);

      const descriptionControl = document.createElement('label');
      descriptionControl.className = 'erv-document__control erv-document__control--full';
      descriptionControl.textContent = 'Kurzbeschreibung';

      const descriptionInput = document.createElement('input');
      descriptionInput.type = 'text';
      descriptionInput.dataset.docField = 'description';
      descriptionInput.placeholder = 'Worum geht es in diesem Dokument?';
      descriptionInput.maxLength = 160;
      descriptionInput.value = doc.description ?? '';
      descriptionInput.setAttribute('aria-label', `Kurzbeschreibung für ${doc.name}`);

      descriptionControl.appendChild(descriptionInput);

      controls.append(roleControl, signedControl, descriptionControl);

      listItem.append(header, controls);

      if (doc.issues?.length) {
        const issueList = document.createElement('ul');
        issueList.className = 'erv-document__issues';

        doc.issues.forEach((issue) => {
          const issueItem = document.createElement('li');
          issueItem.className = `erv-document__issue erv-document__issue--${issue.level}`;
          issueItem.textContent = issue.message;
          issueList.appendChild(issueItem);
        });

        listItem.appendChild(issueList);
      }

      fragment.appendChild(listItem);
    });

    documentList.appendChild(fragment);
  }

  function renderSampleList() {
    if (!sampleList) {
      return;
    }

    sampleList.innerHTML = '';

    const fragment = document.createDocumentFragment();

    sampleDocuments.forEach((sample) => {
      const listItem = document.createElement('li');
      listItem.className = 'erv-sample';

      const info = document.createElement('div');
      info.className = 'erv-sample__info';

      const title = document.createElement('span');
      title.className = 'erv-sample__name';
      title.textContent = sample.name ?? 'Demo-Dokument';

      const meta = document.createElement('span');
      meta.className = 'erv-sample__meta';
      meta.textContent = `${ROLE_OPTIONS.find((option) => option.value === normaliseRole(sample.role))?.label ?? 'Beilage'} · ${formatBytes(sample.size ?? 0)}`;

      info.append(title, meta);

      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.className = 'btn btn-secondary erv-sample__add';
      addButton.dataset.sampleId = sample.id;
      addButton.textContent = 'Übernehmen';

      const isAlreadyIncluded = state.documents.some((doc) => doc.source === sample.id);
      if (isAlreadyIncluded) {
        addButton.disabled = true;
        addButton.textContent = 'Bereits hinzugefügt';
      }

      listItem.append(info, addButton);
      fragment.appendChild(listItem);
    });

    sampleList.appendChild(fragment);
  }

  function updateDocumentSummary() {
    if (!documentSummary || !documentCountBadge) {
      return;
    }

    const totalSize = state.documents.reduce((sum, doc) => sum + (doc.size ?? 0), 0);
    const count = state.documents.length;
    const mainDocument = state.documents.find((doc) => doc.role === 'hauptdokument');

    documentSummary.textContent =
      count === 0
        ? 'Noch keine Dokumente aufgenommen.'
        : `${count} Dokument${count === 1 ? '' : 'e'} · Gesamtgröße ${formatBytes(totalSize)}${
            mainDocument ? ` · Hauptdokument: ${mainDocument.name}` : ''
          }`;

    const badgeText = `${count} Dokument${count === 1 ? '' : 'e'}`;
    documentCountBadge.textContent = badgeText;
  }

  function updatePackageSummary() {
    if (!packageSummary) {
      return;
    }

    const totalSize = state.documents.reduce((sum, doc) => sum + (doc.size ?? 0), 0);
    const recipientOption = recipientSelect?.selectedOptions?.[0];
    const recipientName = recipientOption?.textContent || 'kein Empfänger';
    const submissionType = submissionTypeSelect?.value || 'entwurf';

    const segments = [];
    if (packageNameInput?.value?.trim()) {
      segments.push(packageNameInput.value.trim());
    }

    segments.push(recipientName);
    segments.push(submissionType === 'priority' ? 'Fristsache' : submissionType === 'standard' ? 'Standardversand' : 'Entwurf');
    segments.push(formatBytes(totalSize));

    packageSummary.textContent = segments.join(' · ');
  }

  function updateValidationBadge() {
    if (!validationBadge) {
      return;
    }

    const hasErrors = state.validationResults.some((entry) => entry.level === 'error');
    const hasWarnings = state.validationResults.some((entry) => entry.level === 'warning');
    const hasDocuments = state.documents.length > 0;

    const status = hasErrors ? 'error' : hasWarnings ? 'warning' : hasDocuments ? 'success' : 'draft';

    validationBadge.textContent =
      status === 'error'
        ? 'Fehler vorhanden'
        : status === 'warning'
        ? 'Warnungen'
        : status === 'success'
        ? 'Bereit'
        : 'Entwurf';

    validationBadge.className = 'status-pill';
    validationBadge.classList.add(STATUS_PILL_CLASSES[status]);
  }

  function updateProgressIndicator() {
    if (!progressSteps.length) {
      return;
    }

    const hasPackageMeta = Boolean(
      packageNameInput?.value?.trim() && recipientSelect?.value && submissionTypeSelect?.value
    );
    const hasDocuments = state.documents.length > 0;
    const hasErrors = state.validationResults.some((entry) => entry.level === 'error');
    const hasValidations = state.validationResults.length > 0;

    let activeStep = 1;

    if (!hasPackageMeta) {
      activeStep = 1;
    } else if (!hasDocuments) {
      activeStep = 2;
    } else if (hasErrors) {
      activeStep = 3;
    } else if (hasValidations) {
      activeStep = 4;
    } else {
      activeStep = 3;
    }

    progressSteps.forEach((step, index) => {
      const stepIndex = index + 1;
      step.classList.toggle('is-active', stepIndex === activeStep);
      step.classList.toggle('is-complete', stepIndex < activeStep);
    });
  }

  function updateValidationList() {
    if (!validationList || !validationEmpty) {
      return;
    }

    validationList.innerHTML = '';

    if (state.validationResults.length === 0) {
      validationEmpty.removeAttribute('hidden');
      return;
    }

    validationEmpty.setAttribute('hidden', '');

    const fragment = document.createDocumentFragment();

    state.validationResults.forEach((entry) => {
      const item = document.createElement('li');
      item.className = `erv-validation__item erv-validation__item--${entry.level}`;

      const icon = document.createElement('span');
      icon.className = 'erv-validation__icon';
      icon.textContent = VALIDATION_ICONS[entry.level] ?? VALIDATION_ICONS.info;

      const text = document.createElement('div');
      text.className = 'erv-validation__text';

      const message = document.createElement('p');
      message.className = 'erv-validation__message';
      message.textContent = entry.message;

      text.appendChild(message);

      if (entry.hint) {
        const hint = document.createElement('p');
        hint.className = 'erv-validation__hint';
        hint.textContent = entry.hint;
        text.appendChild(hint);
      }

      item.append(icon, text);
      fragment.appendChild(item);
    });

    validationList.appendChild(fragment);
  }

  function updateActions() {
    const hasErrors = state.validationResults.some((entry) => entry.level === 'error');
    const hasDocuments = state.documents.length > 0;

    if (submitButton) {
      submitButton.disabled = hasErrors || !hasDocuments;
    }

    if (exportButton) {
      exportButton.disabled = !hasDocuments;
    }
  }

  function collectFormData() {
    return {
      packageName: packageNameInput?.value?.trim() ?? '',
      recipient: recipientSelect?.value ?? '',
      submissionType: submissionTypeSelect?.value ?? '',
      deadline: document.getElementById('erv-deadline')?.value ?? '',
      message: document.getElementById('erv-message')?.value ?? '',
      encryptionEnabled: encryptionToggle?.checked ?? false,
      documents: state.documents.map((doc) => ({
        id: doc.id,
        name: doc.name,
        size: doc.size,
        type: doc.type,
        role: doc.role,
        signed: doc.signed,
        description: doc.description,
        source: doc.source ?? 'upload',
      })),
    };
  }

  function evaluateValidations() {
    state.documents.forEach((doc) => {
      doc.issues = [];
    });

    const results = [];

    if (!packageNameInput?.value?.trim()) {
      results.push({
        level: 'error',
        message: 'Bitte vergeben Sie einen Paketnamen.',
        hint: 'Beispiel: "23 O 51/25 – Klageeinreichung"',
      });
      setFieldError(packageNameInput, 'Dieses Feld ist erforderlich.');
    } else {
      setFieldError(packageNameInput, '');
    }

    if (!recipientSelect?.value) {
      results.push({
        level: 'error',
        message: 'Wählen Sie einen Empfänger aus.',
        hint: 'Der elektronische Empfang ist an das zuständige Gericht zu adressieren.',
      });
      setFieldError(recipientSelect, 'Bitte wählen Sie ein Gericht.');
    } else {
      setFieldError(recipientSelect, '');
    }

    if (!submissionTypeSelect?.value) {
      results.push({ level: 'error', message: 'Bitte geben Sie die Versandart an.' });
      setFieldError(submissionTypeSelect, 'Bitte Versandart wählen.');
    } else {
      setFieldError(submissionTypeSelect, '');
    }

    if (state.documents.length === 0) {
      results.push({
        level: 'error',
        message: 'Fügen Sie mindestens ein Dokument hinzu.',
        hint: 'Ein ERV-Paket muss ein Hauptdokument enthalten.',
      });
    }

    const mainDocuments = state.documents.filter((doc) => doc.role === 'hauptdokument');
    if (mainDocuments.length === 0 && state.documents.length > 0) {
      results.push({
        level: 'error',
        message: 'Markieren Sie genau ein Dokument als Hauptdokument.',
      });
    } else if (mainDocuments.length > 1) {
      results.push({
        level: 'error',
        message: 'Nur ein Dokument darf als Hauptdokument markiert sein.',
      });
      mainDocuments.forEach((doc) => {
        doc.issues.push({ level: 'error', message: 'Es sind mehrere Hauptdokumente markiert.' });
      });
    }

    mainDocuments.forEach((doc) => {
      if (!doc.signed) {
        doc.issues.push({ level: 'error', message: 'Hauptdokument muss elektronisch signiert sein.' });
        results.push({
          level: 'error',
          message: `Das Hauptdokument "${doc.name}" benötigt eine Signatur.`,
        });
      }
    });

    state.documents.forEach((doc) => {
      if (doc.role !== 'hauptdokument' && !(doc.description ?? '').trim()) {
        doc.issues.push({ level: 'warning', message: 'Bitte eine Kurzbeschreibung ergänzen.' });
        results.push({
          level: 'warning',
          message: `Fügen Sie eine Kurzbeschreibung für "${doc.name}" hinzu.`,
        });
      }
    });

    const totalSize = state.documents.reduce((sum, doc) => sum + (doc.size ?? 0), 0);
    if (totalSize > MAX_PACKAGE_SIZE) {
      results.push({
        level: 'error',
        message: 'Die Paketgröße überschreitet die Mock-Grenze von 50 MB.',
        hint: 'Entfernen Sie große Anhänge oder splitten Sie das Paket.',
      });
    } else if (totalSize > WARNING_THRESHOLD && totalSize <= MAX_PACKAGE_SIZE) {
      results.push({
        level: 'warning',
        message: 'Die Paketgröße liegt nahe an der maximalen Grenze.',
        hint: 'Erwägen Sie eine Komprimierung großer Dateien.',
      });
    }

    if (submissionTypeSelect?.value === 'priority' && recipientSelect?.selectedOptions?.[0]) {
      const supportsPriority = recipientSelect.selectedOptions[0].dataset.supportsPriority === 'true';
      if (!supportsPriority) {
        results.push({
          level: 'error',
          message: 'Dieses Gericht unterstützt keine priorisierte Übertragung.',
          hint: 'Bitte wählen Sie Standardversand oder ein anderes Gericht.',
        });
      }
    }

    if (submissionTypeSelect?.value === 'priority' && encryptionToggle && !encryptionToggle.checked) {
      results.push({
        level: 'warning',
        message: 'Für Fristsachen wird eine Verschlüsselung empfohlen.',
        hint: 'Aktivieren Sie die End-zu-End-Verschlüsselung.',
      });
    }

    state.validationResults = results;
  }

  function synchronizeUI() {
    evaluateValidations();
    renderDocumentList();
    renderSampleList();
    updateDocumentSummary();
    updatePackageSummary();
    updateValidationBadge();
    updateValidationList();
    updateProgressIndicator();
    updateActions();
  }

  dropzone?.addEventListener('dragenter', (event) => {
    event.preventDefault();
    dropzone.classList.add('is-dragover');
  });

  dropzone?.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropzone.classList.add('is-dragover');
  });

  dropzone?.addEventListener('dragleave', (event) => {
    if (event.target === dropzone) {
      dropzone.classList.remove('is-dragover');
    }
  });

  dropzone?.addEventListener('drop', (event) => {
    event.preventDefault();
    dropzone.classList.remove('is-dragover');
    handleFilesFromInput(event.dataTransfer?.files ?? []);
  });

  dropzone?.addEventListener('click', () => {
    fileInput?.click();
  });

  dropzone?.addEventListener('keydown', (event) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      fileInput?.click();
    }
  });

  selectButton?.addEventListener('click', () => fileInput?.click());

  fileInput?.addEventListener('change', (event) => {
    handleFilesFromInput(event.target.files ?? []);
    fileInput.value = '';
  });

  clearButton?.addEventListener('click', () => {
    state.documents = [];
    synchronizeUI();
  });

  documentList?.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.dataset.docAction === 'remove') {
      const docId = target.closest('.erv-document')?.dataset.docId;
      if (docId) {
        removeDocument(docId);
      }
    }
  });

  documentList?.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement || target instanceof HTMLInputElement)) {
      return;
    }

    const docElement = target.closest('.erv-document');
    if (!docElement) {
      return;
    }

    const docId = docElement.dataset.docId;
    const field = target.dataset.docField;

    if (!docId || !field) {
      return;
    }

    if (target instanceof HTMLSelectElement) {
      updateDocumentProperty(docId, field, target.value);
    } else if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      updateDocumentProperty(docId, field, target.checked);
    } else if (target instanceof HTMLInputElement) {
      updateDocumentProperty(docId, field, target.value);
    }
  });

  documentList?.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const docElement = target.closest('.erv-document');
    if (!docElement) {
      return;
    }

    const docId = docElement.dataset.docId;
    const field = target.dataset.docField;
    if (docId && field === 'description') {
      updateDocumentProperty(docId, field, target.value);
    }
  });

  sampleList?.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }

    const sampleId = target.dataset.sampleId;
    if (!sampleId) {
      return;
    }

    const sample = sampleDocuments.find((entry) => entry.id === sampleId);
    const document = createDocumentFromSample(sample);
    if (document) {
      addDocuments([document]);
    }
  });

  submitButton?.addEventListener('click', () => {
    const hasErrors = state.validationResults.some((entry) => entry.level === 'error');
    if (hasErrors) {
      return;
    }

    const payload = collectFormData();
    const reference = `ERV-${Date.now().toString(36).toUpperCase()}`;
    submitFeedback.textContent = `Paket "${payload.packageName || 'Unbenannt'}" wurde erfolgreich simuliert übermittelt. Referenz: ${reference}.`;
  });

  exportButton?.addEventListener('click', () => {
    const payload = collectFormData();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${payload.packageName ? payload.packageName.replace(/[^a-z0-9_-]+/gi, '-') : 'erv-paket'}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    submitFeedback.textContent = 'Metadaten wurden als JSON exportiert.';
  });

  form.addEventListener('input', () => {
    synchronizeUI();
  });

  renderRecipientOptions();
  renderSampleList();
  synchronizeUI();
}

document.addEventListener('DOMContentLoaded', initErvPackageBuilder);
