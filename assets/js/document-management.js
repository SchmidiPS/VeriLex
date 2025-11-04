import { overlayInstance } from './app.js';

const dropzone = document.getElementById('document-dropzone');
const selectFilesButton = document.getElementById('document-select-files');
const fileInput = document.getElementById('document-file-input');
const clearButton = document.getElementById('document-clear-all');
const documentList = document.getElementById('document-list');
const emptyState = document.getElementById('document-empty-state');
const summaryEl = document.getElementById('document-upload-summary');
const processingInfoEl = document.getElementById('document-processing-info');

let documents = [];
let seedDocuments = [];

function createDocumentId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `doc-${Math.random().toString(16).slice(2, 10)}-${Date.now()}`;
}

function parseSeedData() {
  const dataEl = document.getElementById('document-seed-data');
  if (!dataEl) {
    return [];
  }

  try {
    const raw = dataEl.textContent ?? '[]';
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((entry) => ({
        ...entry,
        id: entry.id ?? createDocumentId(),
      }));
    }
  } catch (error) {
    console.error('Seed-Dokumente konnten nicht geladen werden.', error);
    overlayInstance?.show?.({
      title: 'Daten konnten nicht geladen werden',
      message: 'Die initialen Dokumente stehen derzeit nicht zur Verfügung.',
      details: error,
    });
  }

  return [];
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return 'Größe unbekannt';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDate(value) {
  if (!value) {
    return 'Unbekanntes Datum';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function determineIconForMime(mimeType = '') {
  if (mimeType.startsWith('image/')) {
    return '🖼️';
  }
  if (mimeType === 'application/pdf') {
    return '📄';
  }
  if (mimeType.includes('presentation')) {
    return '📊';
  }
  if (mimeType.includes('sheet') || mimeType.includes('excel')) {
    return '📈';
  }
  if (mimeType.includes('word') || mimeType.includes('text')) {
    return '📝';
  }
  return '📁';
}

function renderDocument(doc) {
  const listItem = document.createElement('li');
  listItem.className = 'document-entry';
  listItem.setAttribute('role', 'listitem');
  listItem.dataset.documentId = doc.id;

  const preview = document.createElement('div');
  preview.className = 'document-entry__preview';

  if (doc.previewUrl) {
    const img = document.createElement('img');
    img.src = doc.previewUrl;
    img.alt = `Vorschau für ${doc.name}`;
    preview.appendChild(img);
  } else {
    const icon = document.createElement('span');
    icon.className = 'document-entry__preview-icon';
    icon.textContent = determineIconForMime(doc.mimeType);
    icon.setAttribute('aria-hidden', 'true');
    preview.appendChild(icon);
  }

  const meta = document.createElement('div');
  meta.className = 'document-entry__meta';

  const title = document.createElement('p');
  title.className = 'document-entry__title';
  title.textContent = doc.name ?? 'Unbenanntes Dokument';

  const details = document.createElement('p');
  details.className = 'document-entry__details';
  const sizeText = formatFileSize(doc.size);
  const uploadedAtText = formatDate(doc.uploadedAt);
  const uploadedBy = doc.uploadedBy ?? 'Unbekannte Person';
  details.textContent = `${sizeText} • Hochgeladen am ${uploadedAtText} von ${uploadedBy}`;

  const badges = document.createElement('div');
  badges.className = 'document-entry__badges';

  if (doc.status) {
    const statusBadge = document.createElement('span');
    statusBadge.className = 'document-badge';
    statusBadge.textContent = doc.status;
    badges.appendChild(statusBadge);
  }

  const tags = Array.isArray(doc.tags) ? doc.tags : [];
  tags.forEach((tag) => {
    const tagBadge = document.createElement('span');
    tagBadge.className = 'document-badge';
    tagBadge.textContent = tag;
    badges.appendChild(tagBadge);
  });

  const notes = doc.notes ? document.createElement('p') : null;
  if (notes) {
    notes.className = 'document-entry__details';
    notes.textContent = doc.notes;
  }

  meta.append(title, details, badges);
  if (notes) {
    meta.appendChild(notes);
  }

  const actions = document.createElement('div');
  actions.className = 'document-entry__actions';

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'document-entry__action-btn';
  removeButton.textContent = 'Entfernen';
  removeButton.setAttribute('aria-label', `${doc.name} aus der Liste entfernen`);
  removeButton.addEventListener('click', () => removeDocument(doc.id));

  actions.appendChild(removeButton);

  listItem.append(preview, meta, actions);

  return listItem;
}

function renderDocumentList() {
  if (!documentList || !emptyState || !summaryEl) {
    return;
  }

  documentList.innerHTML = '';

  if (documents.length === 0) {
    emptyState.removeAttribute('hidden');
    summaryEl.textContent = 'Keine Dokumente vorhanden.';
    return;
  }

  emptyState.setAttribute('hidden', '');

  const fragment = document.createDocumentFragment();
  documents.forEach((doc) => {
    fragment.appendChild(renderDocument(doc));
  });

  documentList.appendChild(fragment);

  const totalSize = documents.reduce((sum, doc) => sum + (doc.size ?? 0), 0);
  summaryEl.textContent = `${documents.length} Dokumente · Gesamtgröße ${formatFileSize(totalSize)}`;
}

function updateProcessingInfo(message) {
  if (!processingInfoEl) {
    return;
  }

  processingInfoEl.textContent = message ?? 'Bereit für neue Uploads.';
}

function removeDocument(id) {
  documents = documents.filter((doc) => doc.id !== id);
  renderDocumentList();
  updateProcessingInfo('Dokument wurde entfernt.');
}

function resetDocuments() {
  documents = seedDocuments.map((doc) => ({ ...doc }));
  renderDocumentList();
  updateProcessingInfo('Liste wurde auf den Demo-Ausgangszustand zurückgesetzt.');
}

function createDocumentFromFile(file) {
  return {
    id: createDocumentId(),
    name: file.name ?? 'Unbenannt',
    mimeType: file.type ?? 'application/octet-stream',
    size: file.size ?? 0,
    uploadedAt: new Date().toISOString(),
    uploadedBy: 'Sie (Demo)',
    status: 'Upload abgeschlossen (Mock)',
    tags: [],
    notes: 'Lokale Datei – keine Übertragung erfolgt.',
    file,
  };
}

function readPreviewForFile(doc) {
  if (!doc.file || !doc.mimeType?.startsWith('image/')) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(doc.file);
  });
}

async function processFiles(fileList) {
  const files = Array.from(fileList ?? []);
  if (files.length === 0) {
    updateProcessingInfo('Es wurden keine Dateien ausgewählt.');
    return;
  }

  updateProcessingInfo(`${files.length} Datei(en) werden verarbeitet …`);

  for (const file of files) {
    const doc = createDocumentFromFile(file);
    documents.unshift(doc);
    renderDocumentList();

    try {
      const previewUrl = await readPreviewForFile(doc);
      const target = documents.find((entry) => entry.id === doc.id);

      if (target) {
        if (previewUrl) {
          target.previewUrl = previewUrl;
        }
        if (target.file) {
          delete target.file;
        }
        if (previewUrl) {
          renderDocumentList();
        }
      }
    } catch (error) {
      console.error('Vorschau konnte nicht erzeugt werden.', error);
      overlayInstance?.show?.({
        title: 'Vorschau nicht möglich',
        message: `Für ${doc.name} konnte keine Vorschau erzeugt werden.`,
        details: error,
      });
    }
  }

  updateProcessingInfo('Upload abgeschlossen. Die Liste wurde aktualisiert.');
}

function handleDrop(event) {
  event.preventDefault();
  if (!dropzone) {
    return;
  }
  dropzone.classList.remove('document-dropzone--active');
  if (event.dataTransfer?.files) {
    processFiles(event.dataTransfer.files);
  }
}

function handleDragEnter(event) {
  event.preventDefault();
  if (!dropzone) {
    return;
  }
  dropzone.classList.add('document-dropzone--active');
}

function handleDragOver(event) {
  event.preventDefault();
  if (!dropzone) {
    return;
  }
  event.dataTransfer.dropEffect = 'copy';
}

function handleDragLeave(event) {
  if (!dropzone) {
    return;
  }

  const nextTarget = event.relatedTarget;
  if (!nextTarget || !dropzone.contains(nextTarget)) {
    dropzone.classList.remove('document-dropzone--active');
  }
}

function attachEventListeners() {
  dropzone?.addEventListener('dragenter', handleDragEnter);
  dropzone?.addEventListener('dragover', handleDragOver);
  dropzone?.addEventListener('dragleave', handleDragLeave);
  dropzone?.addEventListener('drop', handleDrop);

  dropzone?.addEventListener('click', () => fileInput?.click?.());
  dropzone?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      fileInput?.click?.();
    }
  });

  selectFilesButton?.addEventListener('click', () => fileInput?.click?.());

  fileInput?.addEventListener('change', (event) => {
    const target = event.currentTarget;
    if (!(target instanceof HTMLInputElement) || !target.files) {
      return;
    }
    processFiles(target.files);
    target.value = '';
  });

  clearButton?.addEventListener('click', () => {
    const confirmed = window.confirm(
      'Möchten Sie die Liste wirklich zurücksetzen? Alle nicht gespeicherten Einträge gehen verloren.'
    );
    if (confirmed) {
      resetDocuments();
    }
  });
}

function init() {
  seedDocuments = parseSeedData();
  documents = seedDocuments.map((doc) => ({ ...doc }));
  renderDocumentList();
  updateProcessingInfo('Bereit für neue Uploads.');
  attachEventListeners();
}

init();
