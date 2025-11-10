import { overlayInstance } from './app.js';
import { getRoleDefinition, readStoredRole } from './auth-utils.js';

const DEFAULT_PERMISSIONS = Object.freeze({
  view: ['partner', 'associate', 'assistant'],
  manage: ['partner', 'associate', 'assistant'],
});

const ACCESS_ACTIONS = Object.freeze(['view', 'manage']);

const dropzone = document.getElementById('document-dropzone');
const selectFilesButton = document.getElementById('document-select-files');
const fileInput = document.getElementById('document-file-input');
const clearButton = document.getElementById('document-clear-all');
const documentList = document.getElementById('document-list');
const emptyState = document.getElementById('document-empty-state');
const summaryEl = document.getElementById('document-upload-summary');
const processingInfoEl = document.getElementById('document-processing-info');
const viewerRoot = document.getElementById('document-viewer');
const viewerFrame = document.getElementById('document-viewer-frame');
const viewerFallback = document.getElementById('document-viewer-fallback');
const viewerMeta = document.getElementById('document-viewer-meta');
const viewerTitle = document.getElementById('document-viewer-title');

let documents = [];
let seedDocuments = [];
let lastFocusedElement = null;
let viewerVisible = false;
let previousBodyOverflow = '';
let activeViewerDocumentId = null;

function normalizeRoleId(roleId) {
  return (roleId ?? '').toString().trim().toLowerCase();
}

function createDefaultPermissions() {
  return {
    view: [...DEFAULT_PERMISSIONS.view],
    manage: [...DEFAULT_PERMISSIONS.manage],
  };
}

function normalizePermissions(permissions) {
  if (!permissions || typeof permissions !== 'object') {
    return createDefaultPermissions();
  }

  const normalized = {};

  ACCESS_ACTIONS.forEach((action) => {
    const list = Array.isArray(permissions[action])
      ? permissions[action]
      : [];

    const normalizedList = Array.from(
      new Set(
        list
          .map((roleId) => normalizeRoleId(roleId))
          .filter((roleId) => roleId && roleId !== 'none')
      )
    );

    normalized[action] =
      normalizedList.length > 0
        ? normalizedList
        : [...DEFAULT_PERMISSIONS[action]];
  });

  return normalized;
}

function clonePermissions(permissions) {
  const normalized = normalizePermissions(permissions);
  return {
    view: [...normalized.view],
    manage: [...normalized.manage],
  };
}

function normalizeDocument(entry) {
  const normalized = { ...entry };
  normalized.id = entry.id ?? createDocumentId();
  normalized.permissions = clonePermissions(entry.permissions);
  return normalized;
}

function cloneDocument(entry) {
  const normalized = normalizeDocument(entry);
  return {
    ...normalized,
    permissions: clonePermissions(normalized.permissions),
  };
}

function getActiveRoleId() {
  const apiRole = window.verilexRoleAccess?.getActiveRole?.();
  if (apiRole) {
    return normalizeRoleId(apiRole);
  }

  const storedRole = readStoredRole();
  if (storedRole) {
    return normalizeRoleId(storedRole);
  }

  return DEFAULT_PERMISSIONS.view[0];
}

function getActiveRoleDefinition() {
  return getRoleDefinition(getActiveRoleId());
}

function getAllowedRoles(doc, action) {
  const permissions = doc?.permissions ?? DEFAULT_PERMISSIONS;
  const list = permissions[action];
  if (Array.isArray(list) && list.length > 0) {
    return list.slice();
  }

  return [...DEFAULT_PERMISSIONS[action]];
}

function canPerformAction(doc, action) {
  const allowedRoles = getAllowedRoles(doc, action);
  if (allowedRoles.includes('all')) {
    return true;
  }

  const activeRole = getActiveRoleId();
  return allowedRoles.includes(activeRole);
}

function describeAllowedRoles(doc, action) {
  const allowedRoles = getAllowedRoles(doc, action);
  if (allowedRoles.includes('all')) {
    return 'Alle Rollen';
  }

  return allowedRoles
    .map((roleId) => getRoleDefinition(roleId).label)
    .join(', ');
}

function showPermissionDenied(action, doc) {
  const actionLabel = action === 'manage' ? 'verwalten' : 'anzeigen';
  const activeRole = getActiveRoleDefinition();
  const allowedDescription = describeAllowedRoles(doc, action);
  const documentName = doc?.name ?? 'dieses Dokument';

  if (overlayInstance?.show) {
    overlayInstance.show({
      title: 'Zugriff verweigert',
      message: `Die Rolle "${activeRole.label}" darf ${documentName} derzeit nicht ${actionLabel}.`,
      details: `Berechtigte Rollen: ${allowedDescription || 'Keine Rollen freigeschaltet'}.`,
    });
  } else {
    window.alert(
      `Sie besitzen keine Berechtigung, ${documentName} zu ${actionLabel}. Erlaubt für: ${allowedDescription}.`
    );
  }
}

function ensureDocumentAccess(doc, action) {
  if (canPerformAction(doc, action)) {
    return true;
  }

  showPermissionDenied(action, doc);
  return false;
}

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
      return parsed.map((entry) => normalizeDocument(entry));
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

function isPdfDocument(doc) {
  const mime = (doc?.mimeType ?? '').toLowerCase();
  if (mime.includes('pdf')) {
    return true;
  }

  const name = (doc?.name ?? '').toLowerCase();
  return name.endsWith('.pdf');
}

function cleanupDocumentResources(doc) {
  if (doc?.inlineUrl) {
    try {
      URL.revokeObjectURL(doc.inlineUrl);
    } catch (error) {
      console.warn('Konnte temporäre URL nicht freigeben.', error);
    }
    delete doc.inlineUrl;
  }
}

function buildDocumentMetaText(doc) {
  const sizeText = formatFileSize(doc?.size);
  const uploadedAtText = formatDate(doc?.uploadedAt);
  const uploadedBy = doc?.uploadedBy ?? 'Unbekannte Person';
  return `${sizeText} · Hochgeladen am ${uploadedAtText} von ${uploadedBy}`;
}

function showViewerFrame(url) {
  if (!viewerFrame) {
    return;
  }

  viewerFrame.src = url;
  viewerFrame.removeAttribute('hidden');
  if (viewerFallback) {
    viewerFallback.textContent = '';
    viewerFallback.setAttribute('hidden', '');
  }
}

function showViewerFallback(message) {
  if (!viewerFallback) {
    return;
  }

  viewerFallback.textContent = message;
  viewerFallback.removeAttribute('hidden');
  if (viewerFrame) {
    viewerFrame.setAttribute('hidden', '');
    viewerFrame.src = 'about:blank';
  }
}

function closeDocumentViewer() {
  if (!viewerRoot) {
    return;
  }

  viewerRoot.setAttribute('hidden', '');
  viewerRoot.setAttribute('aria-hidden', 'true');
  if (viewerFrame) {
    viewerFrame.src = 'about:blank';
    viewerFrame.setAttribute('hidden', '');
  }
  if (viewerFallback) {
    viewerFallback.textContent = '';
    viewerFallback.setAttribute('hidden', '');
  }
  if (viewerMeta) {
    viewerMeta.textContent = '';
  }

  document.body.style.overflow = previousBodyOverflow;
  viewerVisible = false;
  activeViewerDocumentId = null;

  if (lastFocusedElement instanceof HTMLElement) {
    try {
      lastFocusedElement.focus();
    } catch (error) {
      console.warn('Fokus konnte nicht zurückgesetzt werden.', error);
    }
  }

  lastFocusedElement = null;
}

function openDocumentViewer(documentId) {
  if (!viewerRoot) {
    return;
  }

  const doc = documents.find((entry) => entry.id === documentId);
  if (!doc) {
    overlayInstance?.show?.({
      title: 'Dokument nicht gefunden',
      message: 'Das angeforderte Dokument steht nicht mehr zur Verfügung.',
    });
    return;
  }

  if (!ensureDocumentAccess(doc, 'view')) {
    return;
  }

  if (viewerFrame) {
    viewerFrame.setAttribute('hidden', '');
    viewerFrame.src = 'about:blank';
  }

  if (viewerFallback) {
    viewerFallback.textContent = '';
    viewerFallback.setAttribute('hidden', '');
  }

  if (viewerTitle) {
    viewerTitle.textContent = doc.name ?? 'Dokument anzeigen';
  }

  if (viewerMeta) {
    viewerMeta.textContent = buildDocumentMetaText(doc);
  }

  let resourceUrl = null;

  if (doc.viewerUrl) {
    resourceUrl = doc.viewerUrl;
  } else if (doc.inlineUrl) {
    resourceUrl = doc.inlineUrl;
  } else if (doc.file instanceof File && isPdfDocument(doc)) {
    try {
      doc.inlineUrl = URL.createObjectURL(doc.file);
      resourceUrl = doc.inlineUrl;
    } catch (error) {
      console.error('PDF-Vorschau konnte nicht vorbereitet werden.', error);
      overlayInstance?.show?.({
        title: 'Vorschau nicht möglich',
        message: `Für ${doc.name ?? 'dieses Dokument'} konnte keine Vorschau erzeugt werden.`,
        details: error,
      });
    }
  }

  if (isPdfDocument(doc) && resourceUrl) {
    showViewerFrame(resourceUrl);
  } else if (isPdfDocument(doc) && !resourceUrl) {
    showViewerFallback(
      'Die PDF-Vorschau konnte nicht geladen werden. Bitte versuchen Sie es erneut oder laden Sie die Datei herunter.'
    );
  } else {
    showViewerFallback(
      'Für dieses Dateiformat ist derzeit keine Vorschau verfügbar. Laden Sie die Datei herunter, um sie lokal zu öffnen.'
    );
  }

  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  lastFocusedElement = document.activeElement;

  viewerRoot.removeAttribute('hidden');
  viewerRoot.setAttribute('aria-hidden', 'false');
  viewerRoot.querySelector('.document-viewer__close')?.focus?.();

  viewerVisible = true;
  activeViewerDocumentId = doc.id;
}

function registerViewerEvents() {
  if (!viewerRoot) {
    return;
  }

  viewerRoot.addEventListener('click', (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.dataset.viewerAction === 'close') {
      event.preventDefault();
      closeDocumentViewer();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && viewerVisible) {
      closeDocumentViewer();
    }
  });
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

  const canView = canPerformAction(doc, 'view');
  const canManage = canPerformAction(doc, 'manage');

  const accessNote = document.createElement('p');
  accessNote.className = 'document-entry__access-note';
  if (canManage) {
    accessNote.textContent = 'Sie besitzen Vollzugriff auf dieses Dokument.';
  } else if (canView) {
    accessNote.textContent = 'Aktuell sind nur Leserechte für dieses Dokument verfügbar.';
  } else {
    accessNote.textContent = 'Mit der aktiven Rolle ist kein Zugriff möglich.';
  }

  meta.append(title, details, badges, accessNote);
  if (notes) {
    meta.appendChild(notes);
  }

  const actions = document.createElement('div');
  actions.className = 'document-entry__actions';

  const viewButton = document.createElement('button');
  viewButton.type = 'button';
  viewButton.className = 'document-entry__action-btn document-entry__action-btn--primary';
  viewButton.textContent = 'Anzeigen';
  viewButton.setAttribute('aria-label', `${doc.name} in der Vorschau öffnen`);
  if (!canView) {
    viewButton.setAttribute('aria-disabled', 'true');
    viewButton.title = 'Diese Rolle hat keine Berechtigung zur Vorschau.';
  }
  viewButton.addEventListener('click', (event) => {
    event.preventDefault();
    if (ensureDocumentAccess(doc, 'view')) {
      openDocumentViewer(doc.id);
    }
  });

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'document-entry__action-btn document-entry__action-btn--danger';
  removeButton.textContent = 'Entfernen';
  removeButton.setAttribute('aria-label', `${doc.name} aus der Liste entfernen`);
  if (!canManage) {
    removeButton.setAttribute('aria-disabled', 'true');
    removeButton.title = 'Diese Rolle kann das Dokument nicht verwalten.';
  }
  removeButton.addEventListener('click', (event) => {
    event.preventDefault();
    if (ensureDocumentAccess(doc, 'manage')) {
      removeDocument(doc.id);
    }
  });

  actions.append(viewButton, removeButton);

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

function handleRoleChanged(event) {
  renderDocumentList();

  if (!viewerVisible) {
    return;
  }

  const activeDoc = documents.find((doc) => doc.id === activeViewerDocumentId);
  if (!activeDoc) {
    closeDocumentViewer();
    return;
  }

  if (!canPerformAction(activeDoc, 'view')) {
    closeDocumentViewer();
    overlayInstance?.show?.({
      title: 'Zugriff geändert',
      message:
        'Ihre aktuelle Rolle verfügt nicht mehr über die Berechtigung, dieses Dokument anzuzeigen. Die Vorschau wurde beendet.',
    });
  }
}

function updateProcessingInfo(message) {
  if (!processingInfoEl) {
    return;
  }

  processingInfoEl.textContent = message ?? 'Bereit für neue Uploads.';
}

function removeDocument(id) {
  const target = documents.find((doc) => doc.id === id);
  if (!target) {
    return;
  }

  if (!ensureDocumentAccess(target, 'manage')) {
    updateProcessingInfo('Aktion abgebrochen: fehlende Berechtigung.');
    return;
  }

  cleanupDocumentResources(target);
  if (viewerVisible && activeViewerDocumentId === id) {
    closeDocumentViewer();
  }

  documents = documents.filter((doc) => doc.id !== id);
  renderDocumentList();
  updateProcessingInfo('Dokument wurde entfernt.');
}

function resetDocuments() {
  documents.forEach((doc) => cleanupDocumentResources(doc));
  if (viewerVisible) {
    closeDocumentViewer();
  }

  documents = seedDocuments.map((doc) => cloneDocument(doc));
  renderDocumentList();
  updateProcessingInfo('Liste wurde auf den Demo-Ausgangszustand zurückgesetzt.');
}

function createDocumentFromFile(file) {
  const doc = {
    id: createDocumentId(),
    name: file.name ?? 'Unbenannt',
    mimeType: file.type ?? 'application/octet-stream',
    size: file.size ?? 0,
    uploadedAt: new Date().toISOString(),
    uploadedBy: 'Sie (Demo)',
    status: 'Upload abgeschlossen (Mock)',
    tags: [],
    notes: 'Lokale Datei – keine Übertragung erfolgt.',
    permissions: createDefaultPermissions(),
    file,
  };

  if (isPdfDocument(doc)) {
    try {
      doc.inlineUrl = URL.createObjectURL(file);
    } catch (error) {
      console.warn('PDF-Datei konnte nicht für die Vorschau vorbereitet werden.', error);
    }
  }

  return normalizeDocument(doc);
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
  documents = seedDocuments.map((doc) => cloneDocument(doc));
  renderDocumentList();
  updateProcessingInfo('Bereit für neue Uploads.');
  registerViewerEvents();
  attachEventListeners();
  window.addEventListener('verilex:role-changed', handleRoleChanged);
}

init();
