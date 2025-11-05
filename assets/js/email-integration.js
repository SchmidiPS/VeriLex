const dataElement = document.getElementById('mail-data');

function parseMailData() {
  if (!dataElement) {
    console.warn('Mail data element not found.');
    return [];
  }

  try {
    const raw = dataElement.textContent ?? '[]';
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(normalizeMessage).sort(sortByReceivedDesc);
  } catch (error) {
    console.error('Die Mail-Daten konnten nicht geladen werden.', error);
    window.dispatchEvent(
      new CustomEvent('verilex:error', {
        detail: {
          title: 'Maildaten nicht verfügbar',
          message: 'Die Demo-Nachrichten konnten nicht interpretiert werden.',
          details: error,
        },
      })
    );
    return [];
  }
}

function sortByReceivedDesc(a, b) {
  return b.receivedAt.getTime() - a.receivedAt.getTime();
}

function normalizeMessage(entry) {
  const receivedAt = parseDate(entry.receivedAt);
  const status = normalizeStatus(entry.status);
  const generatedId =
    entry.id ??
    (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `mail-${Math.random().toString(36).slice(2, 10)}`);

  return {
    id: String(generatedId),
    subject: String(entry.subject ?? 'Ohne Betreff').trim() || 'Ohne Betreff',
    caseNumber: String(entry.caseNumber ?? '').trim() || '–',
    client: String(entry.client ?? '').trim() || '–',
    sender: normalizePerson(entry.sender),
    to: normalizePeople(entry.to),
    cc: normalizePeople(entry.cc),
    receivedAt,
    status,
    tags: Array.isArray(entry.tags) ? entry.tags.map((tag) => String(tag).trim()).filter(Boolean) : [],
    body: Array.isArray(entry.body)
      ? entry.body.map((line) => String(line ?? '').trim()).filter(Boolean)
      : [String(entry.body ?? '').trim()].filter(Boolean),
    attachments: Array.isArray(entry.attachments)
      ? entry.attachments
          .map((attachment) => ({
            name: String(attachment?.name ?? '').trim(),
            url: String(attachment?.url ?? '').trim(),
          }))
          .filter((attachment) => attachment.name && attachment.url)
      : [],
    snippet: createSnippet(entry),
  };
}

function normalizeStatus(value) {
  const normalized = String(value ?? 'unread').toLowerCase();
  if (normalized === 'archived') {
    return 'archived';
  }
  if (normalized === 'read') {
    return 'read';
  }
  return 'unread';
}

function normalizePerson(person) {
  if (!person) {
    return { name: 'Unbekannt', email: 'unbekannt@example.com' };
  }

  return {
    name: String(person.name ?? 'Unbekannt').trim() || 'Unbekannt',
    email: String(person.email ?? '').trim() || 'unbekannt@example.com',
  };
}

function normalizePeople(list) {
  if (!Array.isArray(list)) {
    return [];
  }
  return list
    .map((person) => normalizePerson(person))
    .filter((person) => person.email && person.name);
}

function parseDate(value) {
  const date = new Date(value ?? Date.now());
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }
  return date;
}

function createSnippet(entry) {
  if (Array.isArray(entry.body) && entry.body.length > 0) {
    return truncateText(entry.body.join(' '), 140);
  }
  if (typeof entry.body === 'string') {
    return truncateText(entry.body, 140);
  }
  return '';
}

function truncateText(text, length) {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.length <= length) {
    return trimmed;
  }
  return `${trimmed.slice(0, length - 1).trim()}…`;
}

const messages = parseMailData();
const messageMap = new Map(messages.map((message) => [message.id, message]));

const state = {
  selectedId: null,
  filters: {
    query: '',
    status: 'all',
    tag: 'all',
  },
};

const listElement = document.getElementById('mail-list');
const emptyStateElement = document.getElementById('mail-empty-state');
const listSummaryElement = document.getElementById('mail-list-summary');
const searchInput = document.getElementById('mail-search');
const statusFilter = document.getElementById('mail-status-filter');
const tagFilter = document.getElementById('mail-tag-filter');
const unreadShortcutButton = document.getElementById('mail-filter-unread');

const detailContent = document.getElementById('mail-detail-content');
const detailPlaceholder = document.getElementById('mail-detail-placeholder');
const detailSubject = document.getElementById('mail-detail-subject');
const detailCase = document.getElementById('mail-detail-case');
const detailClient = document.getElementById('mail-detail-client');
const detailSenderName = document.getElementById('mail-detail-sender-name');
const detailSenderAddress = document.getElementById('mail-detail-sender-address');
const detailRecipients = document.getElementById('mail-detail-recipients');
const detailReceived = document.getElementById('mail-detail-received');
const detailRelative = document.getElementById('mail-detail-relative');
const detailStatus = document.getElementById('mail-detail-status');
const detailTags = document.getElementById('mail-detail-tags');
const detailBody = document.getElementById('mail-detail-body');
const detailAttachments = document.getElementById('mail-detail-attachments');
const toggleReadButton = document.getElementById('mail-action-toggle-read');
const archiveButton = document.getElementById('mail-action-archive');

const totalCountElement = document.getElementById('mail-count-total');
const unreadCountElement = document.getElementById('mail-count-unread');
const archivedCountElement = document.getElementById('mail-count-archived');

const dateTimeFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const relativeFormatter = new Intl.RelativeTimeFormat('de', { numeric: 'auto' });

function getFilteredMessages() {
  return messages
    .filter((message) => {
      if (state.filters.status === 'unread' && message.status !== 'unread') {
        return false;
      }
      if (state.filters.status === 'archived' && message.status !== 'archived') {
        return false;
      }
      if (state.filters.tag !== 'all' && !message.tags.includes(state.filters.tag)) {
        return false;
      }
      if (!state.filters.query) {
        return true;
      }
      const haystack = [
        message.subject,
        message.client,
        message.caseNumber,
        message.sender.name,
        message.sender.email,
        message.tags.join(' '),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(state.filters.query.toLowerCase());
    })
    .sort(sortByReceivedDesc);
}

function updateCounts() {
  totalCountElement.textContent = messages.length.toString();
  const unreadCount = messages.filter((message) => message.status === 'unread').length;
  const archivedCount = messages.filter((message) => message.status === 'archived').length;
  unreadCountElement.textContent = unreadCount.toString();
  archivedCountElement.textContent = archivedCount.toString();
}

function updateUnreadShortcutState() {
  const isStrictUnread =
    state.filters.status === 'unread' &&
    state.filters.tag === 'all' &&
    state.filters.query === '';
  unreadShortcutButton?.setAttribute('aria-pressed', isStrictUnread ? 'true' : 'false');
}

function updateFilterControls() {
  if (searchInput) {
    searchInput.value = state.filters.query;
  }
  if (statusFilter) {
    statusFilter.value = state.filters.status;
  }
  if (tagFilter) {
    tagFilter.value = state.filters.tag;
  }
  updateUnreadShortcutState();
}

function populateTagFilterOptions() {
  if (!tagFilter) {
    return;
  }

  const uniqueTags = new Set();
  messages.forEach((message) => {
    message.tags.forEach((tag) => uniqueTags.add(tag));
  });

  const currentValue = tagFilter.value || 'all';
  const options = ['all', ...Array.from(uniqueTags).sort((a, b) => a.localeCompare(b, 'de'))];

  tagFilter.innerHTML = '';
  options.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value === 'all' ? 'Alle Kategorien' : value;
    tagFilter.append(option);
  });

  if (options.includes(currentValue)) {
    tagFilter.value = currentValue;
  } else {
    state.filters.tag = 'all';
    tagFilter.value = 'all';
  }
}

function renderList(filteredMessages) {
  if (!listElement) {
    return;
  }

  listElement.innerHTML = '';

  if (filteredMessages.length === 0) {
    listSummaryElement.textContent = '0 Nachrichten';
    emptyStateElement?.removeAttribute('hidden');
    listElement.setAttribute('aria-activedescendant', '');
    return;
  }

  emptyStateElement?.setAttribute('hidden', '');
  listSummaryElement.textContent =
    filteredMessages.length === 1
      ? '1 Nachricht'
      : `${filteredMessages.length} Nachrichten`;

  filteredMessages.forEach((message) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'mail-item';
    if (message.status === 'unread') {
      item.classList.add('mail-item--unread');
    }
    if (message.status === 'archived') {
      item.classList.add('mail-item--archived');
    }
    const itemId = `mail-item-${message.id}`;
    item.id = itemId;
    if (message.id === state.selectedId) {
      item.classList.add('mail-item--selected');
    }
    item.dataset.messageId = message.id;
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', message.id === state.selectedId ? 'true' : 'false');

    item.innerHTML = `
      <span class="mail-item__subject">${escapeHtml(message.subject)}</span>
      <span class="mail-item__meta">
        <span class="mail-item__sender">${escapeHtml(message.sender.name)}</span>
        <span class="mail-item__case">${escapeHtml(message.caseNumber)}</span>
        <span class="mail-item__time">${formatRelative(message.receivedAt)}</span>
      </span>
      <span class="mail-item__snippet">${escapeHtml(message.snippet)}</span>
    `;

    if (message.tags.length > 0) {
      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'mail-item__tags';
      message.tags.slice(0, 3).forEach((tag) => {
        const badge = document.createElement('span');
        badge.className = 'mail-badge';
        badge.textContent = tag;
        tagsContainer.append(badge);
      });
      item.append(tagsContainer);
    }

    listElement.append(item);
  });

  const selectedItem = listElement.querySelector('.mail-item--selected');
  if (selectedItem) {
    listElement.setAttribute('aria-activedescendant', selectedItem.id);
  } else {
    listElement.setAttribute('aria-activedescendant', '');
  }
}

function renderDetail(message) {
  if (!detailContent || !detailPlaceholder) {
    return;
  }

  if (!message) {
    detailPlaceholder.removeAttribute('hidden');
    detailContent.setAttribute('hidden', '');
    return;
  }

  detailPlaceholder.setAttribute('hidden', '');
  detailContent.removeAttribute('hidden');

  detailSubject.textContent = message.subject;
  detailCase.textContent = message.caseNumber;
  detailClient.textContent = message.client;
  detailSenderName.textContent = message.sender.name;
  detailSenderAddress.textContent = formatSingleRecipient(message.sender);
  detailRecipients.textContent = formatRecipientList(message.to, message.cc);
  detailReceived.textContent = dateTimeFormatter.format(message.receivedAt);
  detailRelative.textContent = formatRelative(message.receivedAt);
  detailStatus.textContent = describeStatus(message.status);
  renderTagList(detailTags, message.tags);
  renderBody(detailBody, message.body);
  renderAttachments(detailAttachments, message.attachments);

  toggleReadButton.textContent =
    message.status === 'unread' ? 'Als gelesen markieren' : 'Als ungelesen markieren';
  toggleReadButton.setAttribute('data-status', message.status);

  archiveButton.textContent = message.status === 'archived' ? 'In Posteingang verschieben' : 'Archivieren';
}

function describeStatus(status) {
  switch (status) {
    case 'unread':
      return 'Ungelesen';
    case 'archived':
      return 'Archiviert';
    default:
      return 'Gelesen';
  }
}

function formatRelative(date) {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSeconds = Math.round(diffMs / 1000);
  const absSeconds = Math.abs(diffSeconds);

  if (absSeconds < 60) {
    return relativeFormatter.format(Math.round(diffSeconds), 'second');
  }
  if (absSeconds < 3600) {
    return relativeFormatter.format(Math.round(diffSeconds / 60), 'minute');
  }
  if (absSeconds < 86400) {
    return relativeFormatter.format(Math.round(diffSeconds / 3600), 'hour');
  }
  if (absSeconds < 86400 * 30) {
    return relativeFormatter.format(Math.round(diffSeconds / 86400), 'day');
  }
  return dateTimeFormatter.format(date);
}

function renderTagList(container, tags) {
  if (!container) {
    return;
  }
  container.innerHTML = '';
  if (!tags || tags.length === 0) {
    container.textContent = 'Keine';
    return;
  }
  tags.forEach((tag) => {
    const badge = document.createElement('span');
    badge.className = 'mail-badge';
    badge.textContent = tag;
    container.append(badge);
  });
}

function renderBody(container, paragraphs) {
  if (!container) {
    return;
  }
  container.innerHTML = '';
  const fragment = document.createDocumentFragment();
  if (!paragraphs || paragraphs.length === 0) {
    const paragraph = document.createElement('p');
    paragraph.textContent = 'Keine Nachricht verfügbar.';
    fragment.append(paragraph);
  } else {
    paragraphs.forEach((text) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      fragment.append(paragraph);
    });
  }
  container.append(fragment);
}

function renderAttachments(container, attachments) {
  if (!container) {
    return;
  }
  container.innerHTML = '';
  if (!attachments || attachments.length === 0) {
    const listItem = document.createElement('li');
    listItem.textContent = 'Keine Anhänge vorhanden.';
    container.append(listItem);
    return;
  }
  attachments.forEach((attachment) => {
    const listItem = document.createElement('li');
    const link = document.createElement('a');
    link.href = attachment.url;
    link.textContent = attachment.name;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    listItem.append(link);
    container.append(listItem);
  });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return char;
    }
  });
}

function formatSingleRecipient(person) {
  if (!person) {
    return '–';
  }
  return `${person.name} <${person.email}>`;
}

function formatRecipientList(to, cc) {
  const segments = [];
  if (Array.isArray(to) && to.length > 0) {
    const toList = to.map((person) => formatSingleRecipient(person)).join(', ');
    segments.push(`An: ${toList}`);
  }
  if (Array.isArray(cc) && cc.length > 0) {
    const ccList = cc.map((person) => formatSingleRecipient(person)).join(', ');
    segments.push(`Cc: ${ccList}`);
  }
  return segments.length > 0 ? segments.join(' · ') : '–';
}

function selectMessage(id) {
  if (!messageMap.has(id)) {
    return;
  }
  state.selectedId = id;
  updateView();
  focusSelectedItem();
}

function focusSelectedItem() {
  if (!listElement) {
    return;
  }
  const selectedItem = listElement.querySelector('.mail-item--selected');
  selectedItem?.focus?.();
}

function toggleReadStatus() {
  const message = messageMap.get(state.selectedId);
  if (!message) {
    return;
  }
  message.status = message.status === 'unread' ? 'read' : 'unread';
  updateView();
}

function toggleArchiveStatus() {
  const message = messageMap.get(state.selectedId);
  if (!message) {
    return;
  }
  message.status = message.status === 'archived' ? 'read' : 'archived';
  updateView();
}

function updateView() {
  const filtered = getFilteredMessages();

  if (filtered.length === 0) {
    state.selectedId = null;
  } else if (!state.selectedId || !filtered.some((message) => message.id === state.selectedId)) {
    state.selectedId = filtered[0].id;
  }

  renderList(filtered);
  renderDetail(state.selectedId ? messageMap.get(state.selectedId) ?? null : null);
  updateCounts();
  updateFilterControls();
}

if (searchInput) {
  searchInput.addEventListener('input', (event) => {
    state.filters.query = event.target.value.trim();
    updateView();
  });
}

if (statusFilter) {
  statusFilter.addEventListener('change', (event) => {
    state.filters.status = event.target.value;
    updateView();
  });
}

if (tagFilter) {
  tagFilter.addEventListener('change', (event) => {
    state.filters.tag = event.target.value;
    updateView();
  });
}

if (unreadShortcutButton) {
  unreadShortcutButton.addEventListener('click', () => {
    const isActive = unreadShortcutButton.getAttribute('aria-pressed') === 'true';
    if (isActive) {
      state.filters.status = 'all';
    } else {
      state.filters.status = 'unread';
      state.filters.tag = 'all';
      state.filters.query = '';
    }
    updateView();
  });
}

if (listElement) {
  listElement.addEventListener('click', (event) => {
    const item = event.target.closest('.mail-item');
    if (!item) {
      return;
    }
    selectMessage(item.dataset.messageId);
  });

  listElement.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
      return;
    }
    const filtered = getFilteredMessages();
    if (filtered.length === 0) {
      return;
    }
    event.preventDefault();
    const currentIndex = filtered.findIndex((message) => message.id === state.selectedId);
    if (event.key === 'ArrowUp' && currentIndex > 0) {
      selectMessage(filtered[currentIndex - 1].id);
    }
    if (event.key === 'ArrowDown' && currentIndex < filtered.length - 1) {
      selectMessage(filtered[currentIndex + 1].id);
    }
  });

  listElement.addEventListener('focus', (event) => {
    if (event.target === listElement) {
      const selectedItem = listElement.querySelector('.mail-item--selected');
      if (selectedItem) {
        selectedItem.focus();
      } else {
        const firstItem = listElement.querySelector('.mail-item');
        firstItem?.focus?.();
      }
    }
  });
}

if (toggleReadButton) {
  toggleReadButton.addEventListener('click', () => {
    toggleReadStatus();
  });
}

if (archiveButton) {
  archiveButton.addEventListener('click', () => {
    toggleArchiveStatus();
  });
}

populateTagFilterOptions();
updateView();

