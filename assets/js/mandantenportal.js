import { overlayInstance } from './app.js';

const documentListEl = document.getElementById('client-document-list');
const documentResultEl = document.getElementById('client-document-result');
const documentFeedbackEl = document.getElementById('client-document-feedback');
const documentEmptyEl = document.getElementById('client-document-empty');
const documentSearchInput = document.getElementById('client-document-search');
const documentFilterButtons = document.querySelectorAll('[data-document-filter]');
const metrics = {
  newDocs: document.getElementById('client-metric-new-docs'),
  openTasks: document.getElementById('client-metric-open-tasks'),
  docCount: document.getElementById('client-metric-doc-count'),
};
const heroHeading = document.getElementById('client-portal-heading');
const heroSummary = document.getElementById('client-portal-summary');
const taskListEl = document.getElementById('client-task-list');
const taskProgressEl = document.getElementById('client-task-progress');
const taskEmptyEl = document.getElementById('client-task-empty');
const uploadForm = document.getElementById('client-upload-form');
const uploadDropzone = document.getElementById('client-upload-dropzone');
const uploadInput = document.getElementById('client-upload-input');
const uploadSelectButton = document.getElementById('client-upload-select');
const uploadResetButton = document.getElementById('client-upload-reset');
const uploadPreviewEl = document.getElementById('client-upload-preview');
const uploadFeedbackEl = document.getElementById('client-upload-feedback');
const activityListEl = document.getElementById('client-activity-list');
const activityEmptyEl = document.getElementById('client-activity-empty');

const STATUS_LABELS = {
  action_required: 'Benötigt Freigabe',
  new: 'Neu bereitgestellt',
  review: 'In Prüfung',
  completed: 'Bereitgestellt',
};

const FILTER_MAPPINGS = {
  all: () => true,
  action: (doc) => doc.status === 'action_required' || doc.status === 'new',
  review: (doc) => doc.status === 'review',
  completed: (doc) => doc.status === 'completed',
};

const STATUS_CLASS_MAP = {
  action_required: 'action',
  new: 'new',
  review: 'review',
  completed: 'completed',
};

const ACTIVITY_TYPE_META = {
  message: { icon: '💬', label: 'Nachricht' },
  upload: { icon: '⬆', label: 'Upload' },
  note: { icon: '🗒', label: 'Notiz' },
  acknowledged: { icon: '✅', label: 'Bestätigung' },
  task: { icon: '📌', label: 'Aufgabe' },
};

const state = {
  clientName: 'Ihr Mandantenkonto',
  caseReference: '',
  documents: [],
  tasks: [],
  activities: [],
  documentFilter: 'all',
  searchTerm: '',
  selectedFiles: [],
};

function createId(prefix) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const random = Math.random().toString(16).slice(2, 10);
  return `${prefix}-${random}-${Date.now()}`;
}

function parseSeedData() {
  const seedEl = document.getElementById('client-portal-seed');
  if (!seedEl) {
    return null;
  }

  try {
    const raw = seedEl.textContent ?? '{}';
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return parsed;
  } catch (error) {
    console.error('Mandantenportal-Daten konnten nicht geladen werden.', error);
    overlayInstance?.show?.({
      title: 'Daten konnten nicht geladen werden',
      message: 'Die Startdaten des Mandantenportals sind momentan nicht erreichbar.',
      details: error,
    });
    return null;
  }
}

function formatDate(value, options = {}) {
  if (!value) {
    return '–';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const formatter = new Intl.DateTimeFormat('de-DE', {
    dateStyle: options.dateStyle ?? 'medium',
    timeStyle: options.timeStyle,
  });
  return formatter.format(date);
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return 'Größe unbekannt';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const decimals = size >= 10 || unitIndex === 0 ? 0 : 1;
  return `${size.toFixed(decimals)} ${units[unitIndex]}`;
}

function normalizeText(value) {
  return (value ?? '').toString().toLowerCase();
}

function updateHero(data) {
  if (data.clientName) {
    state.clientName = data.clientName;
    heroHeading.textContent = `Mandantenportal – ${data.clientName}`;
  }
  if (data.caseReference) {
    state.caseReference = data.caseReference;
    heroSummary.innerHTML = `Behalten Sie Dokumente, Aufgaben und Nachrichten für <strong>${data.caseReference}</strong> im Blick.`;
  }
}

function updateMetrics() {
  const newDocs = state.documents.filter((doc) => doc.status === 'new').length;
  const openTasks = state.tasks.filter((task) => task.status !== 'done').length;
  const docCount = state.documents.length;

  if (metrics.newDocs) {
    metrics.newDocs.textContent = newDocs.toString();
  }
  if (metrics.openTasks) {
    metrics.openTasks.textContent = openTasks.toString();
  }
  if (metrics.docCount) {
    metrics.docCount.textContent = docCount.toString();
  }
}

function getStatusLabel(status) {
  return STATUS_LABELS[status] ?? 'Bereitgestellt';
}

function renderDocuments() {
  if (!documentListEl || !documentResultEl || !documentEmptyEl) {
    return;
  }

  const filterFn = FILTER_MAPPINGS[state.documentFilter] ?? FILTER_MAPPINGS.all;
  const searchTerm = normalizeText(state.searchTerm);

  const filtered = state.documents.filter((doc) => {
    if (!filterFn(doc)) {
      return false;
    }
    if (!searchTerm) {
      return true;
    }
    const haystack = [
      doc.title,
      doc.description,
      doc.category,
      Array.isArray(doc.tags) ? doc.tags.join(' ') : '',
    ]
      .map(normalizeText)
      .join(' ');
    return haystack.includes(searchTerm);
  });

  const totalText = state.documents.length === 1 ? '1 Dokument' : `${state.documents.length} Dokumente`;
  const filteredText = filtered.length === 1 ? '1 Treffer' : `${filtered.length} Treffer`;
  documentResultEl.textContent = `${filteredText} · Gesamtsumme: ${totalText}`;

  documentListEl.innerHTML = '';

  if (filtered.length === 0) {
    documentEmptyEl.hidden = false;
    return;
  }

  documentEmptyEl.hidden = true;

  filtered
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .forEach((doc) => {
      const item = document.createElement('li');
      item.className = `client-document-item client-document-item--${STATUS_CLASS_MAP[doc.status] ?? 'completed'}`;
      item.dataset.documentId = doc.id;

      const header = document.createElement('div');
      header.className = 'client-document-item__header';

      const headerText = document.createElement('div');

      const title = document.createElement('h3');
      title.className = 'client-document-item__title';
      title.textContent = doc.title;
      headerText.append(title);

      const meta = document.createElement('p');
      meta.className = 'client-document-item__meta';
      const updated = formatDate(doc.updatedAt, { dateStyle: 'medium', timeStyle: 'short' });
      meta.textContent = `Aktualisiert am ${updated} · Kategorie: ${doc.category ?? 'Allgemein'}`;
      headerText.append(meta);

      header.append(headerText);

      const status = document.createElement('span');
      const statusModifier = STATUS_CLASS_MAP[doc.status] ?? 'completed';
      status.className = `client-document-item__status client-document-item__status--${statusModifier}`;
      status.textContent = getStatusLabel(doc.status);
      header.append(status);

      const description = document.createElement('p');
      description.className = 'client-document-item__description';
      description.textContent = doc.description ?? '';

      const footer = document.createElement('div');
      footer.className = 'client-document-footer';

      const tagList = document.createElement('div');
      tagList.className = 'client-document-tags';
      if (Array.isArray(doc.tags) && doc.tags.length > 0) {
        doc.tags.forEach((tag) => {
          const badge = document.createElement('span');
          badge.className = 'client-tag';
          badge.textContent = tag;
          tagList.append(badge);
        });
      }

      const actions = document.createElement('div');
      actions.className = 'client-document-actions';

      const viewLink = document.createElement('a');
      viewLink.className = 'btn btn-secondary btn-small';
      viewLink.href = doc.downloadUrl ?? '#';
      viewLink.target = '_blank';
      viewLink.rel = 'noopener noreferrer';
      viewLink.textContent = 'Ansehen';
      actions.append(viewLink);

      if (doc.status === 'action_required' || doc.status === 'new') {
        const acknowledgeButton = document.createElement('button');
        acknowledgeButton.type = 'button';
        acknowledgeButton.className = 'btn btn-primary btn-small';
        acknowledgeButton.dataset.documentAction = 'acknowledge';
        acknowledgeButton.dataset.documentId = doc.id;
        acknowledgeButton.textContent = 'Erledigt melden';
        actions.append(acknowledgeButton);
      }

      footer.append(tagList);
      footer.append(actions);

      item.append(header, description, footer);
      documentListEl.append(item);
    });
}

function renderTasks() {
  if (!taskListEl || !taskProgressEl) {
    return;
  }

  taskListEl.innerHTML = '';

  const openTasks = state.tasks.filter((task) => task.status !== 'done').length;
  const total = state.tasks.length;
  taskProgressEl.textContent = `${total - openTasks} von ${total} erledigt`;

  if (total === 0) {
    taskEmptyEl.hidden = false;
    return;
  }

  taskEmptyEl.hidden = openTasks !== 0;

  state.tasks
    .slice()
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .forEach((task) => {
      const item = document.createElement('li');
      item.className = `client-task-item${task.status === 'done' ? ' client-task-item--done' : ''}`;
      item.dataset.taskId = task.id;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'client-task-checkbox';
      checkbox.checked = task.status === 'done';
      checkbox.setAttribute('aria-label', task.title);
      checkbox.dataset.taskId = task.id;

      const content = document.createElement('div');

      const title = document.createElement('p');
      title.className = 'client-task-title';
      title.textContent = task.title;
      content.append(title);

      const due = document.createElement('p');
      due.className = 'client-task-due';
      const dueText = task.status === 'done'
        ? `Erledigt am ${formatDate(task.completedAt ?? task.dueDate)}`
        : `Fällig bis ${formatDate(task.dueDate)}`;
      due.textContent = dueText;
      content.append(due);

      item.append(checkbox, content);
      taskListEl.append(item);
    });
}

function renderActivities() {
  if (!activityListEl || !activityEmptyEl) {
    return;
  }

  activityListEl.innerHTML = '';

  if (state.activities.length === 0) {
    activityEmptyEl.hidden = false;
    return;
  }

  activityEmptyEl.hidden = true;

  state.activities
    .slice()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .forEach((entry) => {
      const meta = ACTIVITY_TYPE_META[entry.type] ?? ACTIVITY_TYPE_META.note;
      const item = document.createElement('li');
      item.className = 'timeline-item';

      const icon = document.createElement('div');
      icon.className = 'timeline-item__icon';
      icon.textContent = meta.icon;
      item.append(icon);

      const content = document.createElement('div');
      content.className = 'timeline-item__content';

      const header = document.createElement('div');
      header.className = 'timeline-item__header';

      const title = document.createElement('h3');
      title.className = 'timeline-item__title';
      title.textContent = `${meta.label} · ${entry.actor ?? state.clientName}`;
      header.append(title);

      const time = document.createElement('span');
      time.className = 'timeline-item__time';
      time.textContent = formatDate(entry.timestamp, { dateStyle: 'medium', timeStyle: 'short' });
      header.append(time);

      const description = document.createElement('p');
      description.className = 'timeline-item__description';
      description.textContent = entry.content ?? '';

      content.append(header, description);

      if (Array.isArray(entry.meta) && entry.meta.length > 0) {
        const metaList = document.createElement('div');
        metaList.className = 'timeline-meta';
        entry.meta.forEach((metaEntry) => {
          const pill = document.createElement('span');
          pill.className = 'timeline-meta__item';
          pill.textContent = metaEntry;
          metaList.append(pill);
        });
        content.append(metaList);
      }

      item.append(content);
      activityListEl.append(item);
    });
}

function showDocumentFeedback(message, type = 'info') {
  if (!documentFeedbackEl) {
    return;
  }
  if (!message) {
    documentFeedbackEl.dataset.state = 'hidden';
    documentFeedbackEl.textContent = '';
    return;
  }
  documentFeedbackEl.dataset.state = type === 'error' ? 'error' : 'success';
  documentFeedbackEl.textContent = message;
}

function showUploadFeedback(message, type = 'success') {
  if (!uploadFeedbackEl) {
    return;
  }
  if (!message) {
    uploadFeedbackEl.dataset.state = 'hidden';
    uploadFeedbackEl.textContent = '';
    return;
  }
  uploadFeedbackEl.dataset.state = type === 'error' ? 'error' : 'success';
  uploadFeedbackEl.textContent = message;
}

function setActiveFilterButton() {
  documentFilterButtons.forEach((button) => {
    const isActive = button.dataset.documentFilter === state.documentFilter;
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    if (isActive) {
      button.classList.add('timeline-filter--active');
    } else {
      button.classList.remove('timeline-filter--active');
    }
  });
}

function handleFilterClick(event) {
  const button = event.currentTarget;
  const filter = button.dataset.documentFilter;
  if (!filter || !FILTER_MAPPINGS[filter]) {
    return;
  }
  state.documentFilter = filter;
  setActiveFilterButton();
  renderDocuments();
  showDocumentFeedback('');
}

function handleSearchInput(event) {
  state.searchTerm = event.target.value;
  renderDocuments();
}

function appendActivity(entry) {
  state.activities.push({
    id: entry.id ?? createId('activity'),
    timestamp: entry.timestamp ?? new Date().toISOString(),
    type: entry.type ?? 'note',
    actor: entry.actor ?? state.clientName,
    content: entry.content ?? '',
    meta: entry.meta ?? [],
  });
  renderActivities();
}

function acknowledgeDocument(documentId) {
  const doc = state.documents.find((entry) => entry.id === documentId);
  if (!doc) {
    overlayInstance?.show?.({
      title: 'Dokument nicht gefunden',
      message: 'Das ausgewählte Dokument konnte nicht mehr gefunden werden.',
    });
    return;
  }
  if (doc.status === 'completed') {
    showDocumentFeedback('Das Dokument wurde bereits bestätigt.');
    return;
  }
  doc.status = 'completed';
  doc.updatedAt = new Date().toISOString();
  doc.tags = Array.isArray(doc.tags)
    ? Array.from(new Set([...doc.tags, 'Bestätigt']))
    : ['Bestätigt'];

  appendActivity({
    type: 'acknowledged',
    content: `${doc.title} wurde von ${state.clientName} bestätigt.`,
    meta: [`Status: ${getStatusLabel(doc.status)}`],
  });

  renderDocuments();
  updateMetrics();
  showDocumentFeedback('Vielen Dank! Wir haben Ihre Bestätigung erhalten.');
}

function handleDocumentListClick(event) {
  const actionButton = event.target.closest('[data-document-action]');
  if (!actionButton) {
    return;
  }
  const { documentAction, documentId } = actionButton.dataset;
  if (documentAction === 'acknowledge' && documentId) {
    acknowledgeDocument(documentId);
  }
}

function handleTaskToggle(event) {
  const checkbox = event.target.closest('input[type="checkbox"][data-task-id]');
  if (!checkbox) {
    return;
  }
  const { taskId } = checkbox.dataset;
  const task = state.tasks.find((entry) => entry.id === taskId);
  if (!task) {
    return;
  }
  task.status = checkbox.checked ? 'done' : 'open';
  task.completedAt = checkbox.checked ? new Date().toISOString() : null;

  appendActivity({
    type: 'task',
    content: checkbox.checked
      ? `${state.clientName} hat die Aufgabe „${task.title}“ erledigt.`
      : `${state.clientName} hat die Aufgabe „${task.title}“ wieder geöffnet.`,
    meta: [checkbox.checked ? 'Status: erledigt' : 'Status: offen'],
  });

  renderTasks();
  updateMetrics();
}

function resetSelectedFiles() {
  state.selectedFiles = [];
  if (uploadInput) {
    uploadInput.value = '';
  }
  if (uploadPreviewEl) {
    uploadPreviewEl.innerHTML = '';
  }
}

function updateUploadPreview() {
  if (!uploadPreviewEl) {
    return;
  }
  uploadPreviewEl.innerHTML = '';
  if (state.selectedFiles.length === 0) {
    return;
  }

  state.selectedFiles.forEach((file) => {
    const item = document.createElement('div');
    item.className = 'client-upload-preview__item';

    const icon = document.createElement('span');
    icon.className = 'client-upload-preview__icon';
    icon.textContent = '📄';
    item.append(icon);

    const text = document.createElement('div');

    const name = document.createElement('p');
    name.className = 'client-upload-preview__name';
    name.textContent = file.name;
    text.append(name);

    const meta = document.createElement('p');
    meta.className = 'client-upload-preview__meta';
    meta.textContent = `${formatFileSize(file.size)} · ${file.type || 'Datei'}`;
    text.append(meta);

    item.append(text);

    uploadPreviewEl.append(item);
  });
}

function handleFilesAdded(fileList) {
  const files = Array.from(fileList ?? []);
  if (files.length === 0) {
    return;
  }
  const combined = [...state.selectedFiles, ...files].slice(0, 10);
  state.selectedFiles = combined;
  updateUploadPreview();
  showUploadFeedback('Dateien bereit – senden Sie den Upload, um die Kanzlei zu informieren.');
}

function handleDrop(event) {
  event.preventDefault();
  uploadDropzone?.classList.remove('is-dragover');
  const { files } = event.dataTransfer ?? {};
  if (!files || files.length === 0) {
    return;
  }
  handleFilesAdded(files);
}

function handleDragOver(event) {
  event.preventDefault();
  uploadDropzone?.classList.add('is-dragover');
}

function handleDragLeave() {
  uploadDropzone?.classList.remove('is-dragover');
}

function addUploadedDocuments() {
  const now = new Date();
  const newDocs = state.selectedFiles.map((file) => ({
    id: createId('doc'),
    title: file.name,
    description: 'Upload durch Mandantenportal – das Kanzleiteam prüft die Datei zeitnah.',
    status: 'review',
    category: 'Upload',
    updatedAt: now.toISOString(),
    size: file.size,
    tags: ['Upload', 'Wartet auf Prüfung'],
    downloadUrl: 'about:blank',
  }));
  if (newDocs.length === 0) {
    return;
  }
  state.documents = [...newDocs, ...state.documents];
  appendActivity({
    type: 'upload',
    content: `${state.clientName} hat ${newDocs.length} Datei${newDocs.length === 1 ? '' : 'en'} hochgeladen.`,
    meta: ['Status: Prüfung ausstehend'],
  });
  renderDocuments();
  updateMetrics();
}

function handleUploadSubmit(event) {
  event.preventDefault();
  if (state.selectedFiles.length === 0) {
    showUploadFeedback('Bitte wählen Sie mindestens eine Datei aus, bevor Sie den Upload senden.', 'error');
    return;
  }
  addUploadedDocuments();
  showUploadFeedback('Vielen Dank! Ihr Upload wurde an die Kanzlei übermittelt.');
  resetSelectedFiles();
}

function bindEvents() {
  documentFilterButtons.forEach((button) => {
    button.addEventListener('click', handleFilterClick);
  });
  documentListEl?.addEventListener('click', handleDocumentListClick);
  documentSearchInput?.addEventListener('input', handleSearchInput);
  taskListEl?.addEventListener('change', handleTaskToggle);

  uploadSelectButton?.addEventListener('click', () => uploadInput?.click());
  uploadResetButton?.addEventListener('click', () => {
    resetSelectedFiles();
    showUploadFeedback('Auswahl zurückgesetzt.');
  });
  uploadInput?.addEventListener('change', () => handleFilesAdded(uploadInput.files));

  uploadDropzone?.addEventListener('dragover', handleDragOver);
  uploadDropzone?.addEventListener('dragleave', handleDragLeave);
  uploadDropzone?.addEventListener('drop', handleDrop);
  uploadDropzone?.addEventListener('click', () => uploadInput?.click());
  uploadDropzone?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      uploadInput?.click();
    }
  });

  uploadForm?.addEventListener('submit', handleUploadSubmit);
}

function bootstrap() {
  const seedData = parseSeedData();
  if (!seedData) {
    return;
  }

  updateHero(seedData);

  state.documents = Array.isArray(seedData.documents)
    ? seedData.documents.map((doc) => ({
        ...doc,
        status: doc.status ?? 'completed',
        id: doc.id ?? createId('doc'),
      }))
    : [];

  state.tasks = Array.isArray(seedData.tasks)
    ? seedData.tasks.map((task) => ({
        ...task,
        status: task.status === 'done' ? 'done' : 'open',
        completedAt: task.completedAt ?? null,
        id: task.id ?? createId('task'),
      }))
    : [];

  state.activities = Array.isArray(seedData.activities)
    ? seedData.activities.map((activity) => ({
        ...activity,
        id: activity.id ?? createId('activity'),
      }))
    : [];

  setActiveFilterButton();
  renderDocuments();
  renderTasks();
  renderActivities();
  updateMetrics();
  showDocumentFeedback('', 'info');
  showUploadFeedback('', 'success');

  bindEvents();
}

try {
  bootstrap();
} catch (error) {
  console.error('Mandantenportal konnte nicht initialisiert werden.', error);
  overlayInstance?.show?.({
    title: 'Mandantenportal nicht verfügbar',
    message: 'Beim Aufbau des Mandantenportals ist ein Fehler aufgetreten.',
    details: error,
  });
}
