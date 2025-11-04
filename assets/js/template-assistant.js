import { overlayInstance } from './app.js';

function parseTemplateData() {
  const dataEl = document.getElementById('template-data');
  if (!dataEl) {
    return [];
  }

  try {
    const raw = dataEl.textContent ?? '[]';
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('Vorlagen-Daten müssen als Array vorliegen.');
    }

    return parsed.map((entry) => {
      const providedId = String(entry.id ?? '').trim();
      let generatedId = '';
      if (!providedId) {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
          generatedId = crypto.randomUUID();
        } else {
          generatedId = `tpl-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
        }
      }

      return {
        id: providedId || generatedId,
        name: String(entry.name ?? 'Ohne Titel').trim(),
        category: String(entry.category ?? 'Allgemein').trim(),
        summary: String(entry.summary ?? '').trim(),
        tags: Array.isArray(entry.tags)
          ? entry.tags.map((tag) => String(tag ?? '').trim()).filter(Boolean)
          : [],
        placeholders: Array.isArray(entry.placeholders)
          ? entry.placeholders.map((placeholder, index) => ({
            id:
              String(placeholder.id ?? '').trim() ||
              `placeholder-${index + 1}-${Math.random().toString(16).slice(2, 6)}`,
            label: String(placeholder.label ?? 'Platzhalter').trim(),
            type: (placeholder.type ?? 'text').toString().toLowerCase(),
            defaultValue: String(placeholder.defaultValue ?? ''),
            hint: placeholder.hint ? String(placeholder.hint) : '',
          }))
        : [],
        body: String(entry.body ?? ''),
      };
    });
  } catch (error) {
    console.error('Vorlagen-Daten konnten nicht geladen werden.', error);
    overlayInstance?.show?.({
      title: 'Vorlagen nicht verfügbar',
      message: 'Die Demo-Vorlagen konnten nicht geladen werden.',
      details: error,
    });
    return [];
  }
}

const templates = parseTemplateData();
const state = {
  templates,
  filteredTemplates: templates.slice(),
  activeTemplateId: null,
  userInputs: new Map(),
  feedbackTimeout: null,
  historyEntries: [],
};

const templateListEl = document.getElementById('template-list');
const templateEmptyStateEl = document.getElementById('template-empty-state');
const templateListSummaryEl = document.getElementById('template-list-summary');
const searchInput = document.getElementById('template-search-input');

const templateDetailsEl = document.getElementById('template-details');
const templateNameEl = document.getElementById('template-name');
const templateSummaryEl = document.getElementById('template-summary');
const templateCategoryEl = document.getElementById('template-category');
const templateTagsEl = document.getElementById('template-tags');
const placeholderHintEl = document.getElementById('template-placeholder-hint');

const templateForm = document.getElementById('template-form');
const templateFieldsContainer = document.getElementById('template-fields');
const previewOutput = document.getElementById('template-preview-output');
const previewMeta = document.getElementById('template-preview-meta');
const insertButton = document.getElementById('template-insert');
const copyButton = document.getElementById('template-copy');
const feedbackEl = document.getElementById('template-feedback');

const draftTextarea = document.getElementById('document-draft-input');
const draftClearButton = document.getElementById('document-draft-clear');

const historyListEl = document.getElementById('template-history-list');
const historyEmptyStateEl = document.getElementById('template-history-empty');
const historySummaryEl = document.getElementById('template-history-summary');

function formatTags(tags) {
  if (!tags || tags.length === 0) {
    return '–';
  }

  return tags.map((tag) => `#${tag}`).join(' · ');
}

function getWordCount(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }
  const matches = trimmed.match(/\S+/g);
  return matches ? matches.length : 0;
}

function buildTemplateText(template, values) {
  if (!template) {
    return '';
  }

  const replacements = values ?? {};
  return template.body.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (match, key) => {
    const replacement = replacements[key];
    if (replacement === undefined || replacement === null) {
      return '';
    }
    return String(replacement);
  });
}

function updatePreview(template) {
  if (!previewOutput || !previewMeta) {
    return;
  }

  const values = state.userInputs.get(template?.id ?? '') ?? {};
  const previewText = buildTemplateText(template, values);
  previewOutput.value = previewText;

  const charCount = previewText.length;
  const wordCount = getWordCount(previewText);
  previewMeta.textContent = `${charCount} Zeichen · ${wordCount} Wörter`;
}

function clearFeedback() {
  if (state.feedbackTimeout) {
    clearTimeout(state.feedbackTimeout);
    state.feedbackTimeout = null;
  }
  if (feedbackEl) {
    feedbackEl.textContent = '';
  }
}

function showFeedback(message) {
  if (!feedbackEl) {
    return;
  }
  clearFeedback();
  feedbackEl.textContent = message;
  state.feedbackTimeout = setTimeout(() => {
    feedbackEl.textContent = '';
    state.feedbackTimeout = null;
  }, 6000);
}

function renderTemplateDetails(template) {
  if (!template || !templateDetailsEl) {
    templateDetailsEl?.setAttribute('hidden', '');
    return;
  }

  templateDetailsEl.removeAttribute('hidden');
  if (templateNameEl) {
    templateNameEl.textContent = template.name;
  }
  if (templateSummaryEl) {
    templateSummaryEl.textContent = template.summary || 'Keine Beschreibung vorhanden.';
  }
  if (templateCategoryEl) {
    templateCategoryEl.textContent = template.category || 'Allgemein';
  }
  if (templateTagsEl) {
    templateTagsEl.textContent = formatTags(template.tags);
  }
}

function renderPlaceholderFields(template) {
  if (!templateFieldsContainer) {
    return;
  }

  templateFieldsContainer.innerHTML = '';

  if (!template || template.placeholders.length === 0) {
    return;
  }

  const currentValues = state.userInputs.get(template.id) ?? {};

  template.placeholders.forEach((placeholder) => {
    const fieldWrapper = document.createElement('div');
    fieldWrapper.className = 'template-form__field';

    const label = document.createElement('label');
    const fieldId = `template-field-${template.id}-${placeholder.id}`;
    label.setAttribute('for', fieldId);
    label.className = 'template-form__label';
    label.textContent = placeholder.label;

    let input;
    if (placeholder.type === 'textarea') {
      input = document.createElement('textarea');
      input.rows = 3;
      input.className = 'template-form__input template-form__input--multiline';
    } else {
      input = document.createElement('input');
      input.type = placeholder.type === 'date' ? 'text' : placeholder.type;
      input.className = 'template-form__input';
    }

    input.id = fieldId;
    input.dataset.placeholderId = placeholder.id;
    input.value = currentValues[placeholder.id] ?? placeholder.defaultValue ?? '';

    input.addEventListener('input', (event) => {
      const target = event.target;
      const placeholderId = target.dataset.placeholderId;
      if (!placeholderId) {
        return;
      }
      const newValue = target.value;
      const templateValues = state.userInputs.get(template.id) ?? {};
      templateValues[placeholderId] = newValue;
      state.userInputs.set(template.id, templateValues);
      updatePreview(template);
      clearFeedback();
    });

    fieldWrapper.appendChild(label);

    if (placeholder.hint) {
      const hint = document.createElement('p');
      hint.className = 'template-form__hint';
      hint.textContent = placeholder.hint;
      hint.id = `${fieldId}-hint`;
      fieldWrapper.appendChild(hint);
      input.setAttribute('aria-describedby', hint.id);
    }

    fieldWrapper.appendChild(input);
    templateFieldsContainer.appendChild(fieldWrapper);
  });
}

function updateListSummary() {
  if (!templateListSummaryEl) {
    return;
  }
  const total = state.templates.length;
  const current = state.filteredTemplates.length;
  const query = searchInput?.value?.trim();

  if (total === 0) {
    templateListSummaryEl.textContent = 'Keine Vorlagen verfügbar.';
    return;
  }

  if (!query) {
    templateListSummaryEl.textContent = `${current} Vorlagen verfügbar.`;
    return;
  }

  templateListSummaryEl.textContent = `${current} von ${total} Vorlagen entsprechen Ihrer Suche.`;
}

function renderTemplateList() {
  if (!templateListEl) {
    return;
  }

  templateListEl.innerHTML = '';

  if (state.filteredTemplates.length === 0) {
    templateEmptyStateEl?.removeAttribute('hidden');
    updateListSummary();
    return;
  }

  templateEmptyStateEl?.setAttribute('hidden', '');

  state.filteredTemplates.forEach((template) => {
    const listItem = document.createElement('li');
    listItem.className = 'template-list__item';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'template-card';
    button.dataset.templateId = template.id;
    button.setAttribute('aria-pressed', template.id === state.activeTemplateId ? 'true' : 'false');

    if (template.id === state.activeTemplateId) {
      button.classList.add('template-card--active');
    }

    const title = document.createElement('span');
    title.className = 'template-card__title';
    title.textContent = template.name;

    const description = document.createElement('span');
    description.className = 'template-card__summary';
    description.textContent = template.summary || 'Keine Beschreibung hinterlegt.';

    const meta = document.createElement('span');
    meta.className = 'template-card__meta';
    const tagText = template.tags.length > 0 ? template.tags.map((tag) => `#${tag}`).join(' · ') : 'Keine Tags';
    meta.textContent = `${template.category} · ${tagText}`;

    button.appendChild(title);
    button.appendChild(description);
    button.appendChild(meta);

    listItem.appendChild(button);
    templateListEl.appendChild(listItem);
  });

  updateListSummary();
}

function selectTemplate(templateId) {
  if (!templateId) {
    return;
  }

  if (templateId === state.activeTemplateId) {
    return;
  }

  const template = state.templates.find((item) => item.id === templateId);
  if (!template) {
    return;
  }

  state.activeTemplateId = templateId;
  if (!state.userInputs.has(templateId)) {
    const defaults = {};
    template.placeholders.forEach((placeholder) => {
      defaults[placeholder.id] = placeholder.defaultValue ?? '';
    });
    state.userInputs.set(templateId, defaults);
  }

  placeholderHintEl?.setAttribute('hidden', '');
  templateForm?.removeAttribute('hidden');
  renderTemplateDetails(template);
  renderPlaceholderFields(template);
  updatePreview(template);
  if (insertButton) {
    insertButton.disabled = false;
  }
  if (copyButton) {
    copyButton.disabled = false;
  }
  renderTemplateList();
  clearFeedback();
}

function resetSelection() {
  state.activeTemplateId = null;
  templateDetailsEl?.setAttribute('hidden', '');
  templateForm?.setAttribute('hidden', '');
  placeholderHintEl?.removeAttribute('hidden');
  if (templateFieldsContainer) {
    templateFieldsContainer.innerHTML = '';
  }
  if (previewOutput) {
    previewOutput.value = '';
  }
  if (previewMeta) {
    previewMeta.textContent = '';
  }
  if (insertButton) {
    insertButton.disabled = true;
  }
  if (copyButton) {
    copyButton.disabled = true;
  }
  renderTemplateList();
}

function matchesQuery(template, query) {
  if (!query) {
    return true;
  }
  const haystack = [
    template.name,
    template.category,
    template.summary,
    ...(template.tags ?? []),
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

function handleSearchInput(event) {
  const value = event.target.value.toLowerCase();
  state.filteredTemplates = state.templates.filter((template) => matchesQuery(template, value));

  if (state.filteredTemplates.length === 0) {
    resetSelection();
    return;
  }

  if (!state.filteredTemplates.some((template) => template.id === state.activeTemplateId)) {
    selectTemplate(state.filteredTemplates[0].id);
  } else {
    renderTemplateList();
  }
}

function ensureSelectionOnLoad() {
  if (state.templates.length === 0) {
    resetSelection();
    return;
  }

  const firstTemplate = state.templates[0];
  selectTemplate(firstTemplate.id);
}

function appendToDraft(template, previewText) {
  if (!draftTextarea) {
    return;
  }

  const currentValue = draftTextarea.value;
  const hasContent = currentValue.trim().length > 0;
  const sanitizedCurrent = hasContent ? currentValue.replace(/\s+$/, '') : '';
  const blockSeparator = hasContent ? '\n\n' : '';
  draftTextarea.value = `${sanitizedCurrent}${blockSeparator}${previewText}`;
  draftTextarea.focus();
  draftTextarea.setSelectionRange(draftTextarea.value.length, draftTextarea.value.length);
}

function formatHistoryEntry(template, previewText) {
  const timestamp = new Date();
  const formatter = new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return {
    id: `${template.id}-${timestamp.getTime()}`,
    templateName: template.name,
    insertedAt: formatter.format(timestamp),
    excerpt: previewText.length > 160 ? `${previewText.slice(0, 157)}…` : previewText,
  };
}

function renderHistory() {
  if (!historyListEl || !historySummaryEl) {
    return;
  }

  historyListEl.innerHTML = '';

  if (state.historyEntries.length === 0) {
    historyEmptyStateEl?.removeAttribute('hidden');
    historySummaryEl.textContent = 'Noch keine Einträge vorhanden.';
    return;
  }

  historyEmptyStateEl?.setAttribute('hidden', '');

  state.historyEntries.forEach((entry) => {
    const listItem = document.createElement('li');
    listItem.className = 'template-history__item';

    const title = document.createElement('div');
    title.className = 'template-history__item-title';
    title.textContent = entry.templateName;

    const meta = document.createElement('div');
    meta.className = 'template-history__item-meta';
    meta.textContent = `Eingefügt am ${entry.insertedAt}`;

    const excerpt = document.createElement('p');
    excerpt.className = 'template-history__item-excerpt';
    excerpt.textContent = entry.excerpt || 'Kein Text verfügbar.';

    listItem.appendChild(title);
    listItem.appendChild(meta);
    listItem.appendChild(excerpt);
    historyListEl.appendChild(listItem);
  });

  const count = state.historyEntries.length;
  historySummaryEl.textContent = `${count} ${count === 1 ? 'Eintrag' : 'Einträge'} übernommen.`;
}

function handleInsertClick() {
  const template = state.templates.find((item) => item.id === state.activeTemplateId);
  if (!template) {
    showFeedback('Bitte wählen Sie zuerst eine Vorlage aus.');
    return;
  }

  const previewText = previewOutput?.value ?? '';
  if (!previewText.trim()) {
    showFeedback('Die aktuelle Vorlage enthält keinen Text zum Einfügen.');
    return;
  }

  appendToDraft(template, previewText);
  state.historyEntries.unshift(formatHistoryEntry(template, previewText));
  if (state.historyEntries.length > 10) {
    state.historyEntries = state.historyEntries.slice(0, 10);
  }
  renderHistory();
  showFeedback(`Vorlage „${template.name}“ wurde in den Entwurf eingefügt.`);
}

async function handleCopyClick() {
  const template = state.templates.find((item) => item.id === state.activeTemplateId);
  if (!template) {
    showFeedback('Bitte wählen Sie zuerst eine Vorlage aus.');
    return;
  }

  const previewText = previewOutput?.value ?? '';
  if (!previewText.trim()) {
    showFeedback('Die aktuelle Vorlage enthält keinen Text zum Kopieren.');
    return;
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(previewText);
    } else {
      previewOutput?.focus();
      previewOutput?.select();
      const successful = document.execCommand('copy');
      previewOutput?.setSelectionRange(previewOutput.value.length, previewOutput.value.length);
      if (!successful) {
        throw new Error('Kopieren nicht unterstützt.');
      }
    }
    showFeedback('Textbaustein wurde in die Zwischenablage kopiert.');
  } catch (error) {
    console.warn('Konnte Text nicht in Zwischenablage kopieren.', error);
    overlayInstance?.show?.({
      title: 'Zwischenablage nicht verfügbar',
      message: 'Der Text konnte nicht automatisch kopiert werden.',
      details: error,
    });
  }
}

function handleDraftClear() {
  if (!draftTextarea) {
    return;
  }
  draftTextarea.value = '';
  draftTextarea.focus();
  showFeedback('Der Dokumententwurf wurde geleert.');
}

function handleListClick(event) {
  const button = event.target.closest('button[data-template-id]');
  if (!button) {
    return;
  }
  const { templateId } = button.dataset;
  selectTemplate(templateId);
}

function init() {
  if (!templateListEl) {
    return;
  }

  renderTemplateList();
  ensureSelectionOnLoad();

  templateListEl.addEventListener('click', handleListClick);
  searchInput?.addEventListener('input', handleSearchInput);
  insertButton?.addEventListener('click', handleInsertClick);
  copyButton?.addEventListener('click', handleCopyClick);
  draftClearButton?.addEventListener('click', handleDraftClear);

  if (insertButton) {
    insertButton.disabled = true;
  }
  if (copyButton) {
    copyButton.disabled = true;
  }
  renderHistory();
}

init();
