import { overlayInstance } from './app.js';

const typingIndicatorEl = document.getElementById('assistant-typing');
const emptyStateEl = document.getElementById('assistant-empty-state');
const messagesWrapperEl = document.querySelector('.ai-chat__messages-wrapper');
const conversationListEl = document.getElementById('assistant-conversation');
const formEl = document.getElementById('assistant-form');
const inputEl = document.getElementById('assistant-input');
const quickActionsContainer = document.getElementById('assistant-quick-actions');
const followUpsSection = document.querySelector('[aria-labelledby="ai-follow-ups-title"]');
const followUpsContainer = document.getElementById('assistant-follow-ups');
const briefingContainer = document.getElementById('assistant-briefing');
const submitButtonEl = formEl?.querySelector('.ai-chat__submit');
const resetButtonEl = formEl?.querySelector('.ai-chat__reset');

const timeFormatter = new Intl.DateTimeFormat('de-DE', {
  hour: '2-digit',
  minute: '2-digit',
});

let isGeneratingResponse = false;
let defaultResponseIndex = 0;
const baseSuggestions = parseJsonArray('assistant-suggestions');
const assistantKnowledge = parseKnowledge('assistant-knowledge');
const briefingData = parseJsonObject('assistant-briefing-data');

function parseJsonElement(elementId) {
  const element = document.getElementById(elementId);
  if (!element) {
    return null;
  }

  const raw = element.textContent?.trim();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error(`JSON im Element #${elementId} konnte nicht geparst werden.`, error);
    overlayInstance?.show?.({
      title: 'Daten konnten nicht geladen werden',
      message: 'Einige Demo-Daten für den KI-Assistenten waren fehlerhaft.',
      details: error,
    });
    return null;
  }
}

function parseJsonArray(elementId) {
  const parsed = parseJsonElement(elementId);
  return Array.isArray(parsed) ? parsed : [];
}

function parseJsonObject(elementId) {
  const parsed = parseJsonElement(elementId);
  return parsed && typeof parsed === 'object' ? parsed : null;
}

function parseKnowledge(elementId) {
  const parsed = parseJsonObject(elementId);
  if (!parsed) {
    return { topics: [], defaultResponses: [] };
  }

  const topics = Array.isArray(parsed.topics) ? parsed.topics : [];
  const defaultResponses = Array.isArray(parsed.defaultResponses)
    ? parsed.defaultResponses.filter((entry) => typeof entry === 'string' && entry.trim().length > 0)
    : [];

  return {
    topics: topics
      .map((topic) => ({
        id: String(topic.id ?? '').trim() || `topic-${Math.random().toString(16).slice(2, 6)}`,
        keywords: Array.isArray(topic.keywords)
          ? topic.keywords
              .map((keyword) => String(keyword ?? '').trim().toLocaleLowerCase('de-DE'))
              .filter(Boolean)
          : [],
        response: String(topic.response ?? '').trim(),
        followUps: Array.isArray(topic.followUps)
          ? topic.followUps
              .map((item) => String(item ?? '').trim())
              .filter(Boolean)
          : [],
      }))
      .filter((topic) => topic.response.length > 0),
    defaultResponses,
  };
}

function setInteractionDisabled(isDisabled) {
  if (!formEl) {
    return;
  }

  if (submitButtonEl) {
    submitButtonEl.disabled = isDisabled;
  }

  if (resetButtonEl) {
    resetButtonEl.disabled = isDisabled;
  }

  if (inputEl) {
    inputEl.disabled = isDisabled;
  }
}

function setTypingIndicatorVisible(isVisible) {
  if (!typingIndicatorEl) {
    return;
  }

  typingIndicatorEl.hidden = !isVisible;
}

function updateEmptyState() {
  if (!emptyStateEl || !conversationListEl) {
    return;
  }

  const hasMessages = conversationListEl.children.length > 0;
  emptyStateEl.hidden = hasMessages;
}

function clearConversation() {
  if (!conversationListEl) {
    return;
  }

  conversationListEl.innerHTML = '';
  updateEmptyState();
}

function appendLineBreakAwareText(parent, text) {
  const lines = text.split('\n');
  lines.forEach((line, index) => {
    parent.append(document.createTextNode(line));
    if (index < lines.length - 1) {
      parent.append(document.createElement('br'));
    }
  });
}

const LINK_TOKEN_REGEX = /\[link:([^|\]]+)\|([^\]]+)\]/g;

function renderRichText(content) {
  const fragment = document.createDocumentFragment();
  if (!content) {
    return fragment;
  }

  const segments = content.split(LINK_TOKEN_REGEX);
  for (let index = 0; index < segments.length; index += 3) {
    const textSegment = segments[index];
    const href = segments[index + 1];
    const label = segments[index + 2];

    if (typeof textSegment === 'string' && textSegment.length > 0) {
      const span = document.createElement('span');
      appendLineBreakAwareText(span, textSegment);
      fragment.append(span);
    }

    if (href && label) {
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.textContent = label;
      anchor.className = 'ai-chat__link';
      anchor.rel = 'noopener';
      fragment.append(anchor);
    }
  }

  return fragment;
}

function createMessageElement({ role, content, timestamp }) {
  const listItem = document.createElement('li');
  listItem.className = `ai-chat__message ai-chat__message--${role}`;

  const bubble = document.createElement('div');
  bubble.className = 'ai-chat__bubble';
  bubble.dataset.role = role;

  const header = document.createElement('div');
  header.className = 'ai-chat__bubble-header';

  const sender = document.createElement('span');
  sender.className = 'ai-chat__sender';
  sender.textContent = role === 'user' ? 'Sie' : 'Assistent';
  header.append(sender);

  const timeEl = document.createElement('time');
  timeEl.className = 'ai-chat__timestamp';
  timeEl.dateTime = timestamp.toISOString();
  timeEl.textContent = timeFormatter.format(timestamp);
  header.append(timeEl);

  bubble.append(header);

  const body = document.createElement('div');
  body.className = 'ai-chat__bubble-body';
  body.append(renderRichText(content));
  bubble.append(body);

  listItem.append(bubble);
  return listItem;
}

function scrollConversationToBottom() {
  const scrollContainer = conversationListEl || messagesWrapperEl;
  if (!scrollContainer) {
    return;
  }

  requestAnimationFrame(() => {
    scrollContainer.scrollTo({
      top: scrollContainer.scrollHeight,
      behavior: 'smooth',
    });
  });
}

function addMessage(role, content) {
  if (!conversationListEl) {
    return;
  }

  const timestamp = new Date();
  const messageNode = createMessageElement({ role, content, timestamp });
  conversationListEl.append(messageNode);
  updateEmptyState();
  scrollConversationToBottom();
}

function getNextDefaultResponse() {
  const responses = assistantKnowledge.defaultResponses;
  if (!responses || responses.length === 0) {
    return 'Ich habe deine Anfrage notiert und leite dich später an ein Teammitglied weiter.';
  }

  const response = responses[defaultResponseIndex % responses.length];
  defaultResponseIndex = (defaultResponseIndex + 1) % responses.length;
  return response;
}

function findMatchingTopic(message) {
  if (!message || assistantKnowledge.topics.length === 0) {
    return null;
  }

  const normalizedMessage = message.toLocaleLowerCase('de-DE');
  return assistantKnowledge.topics.find((topic) =>
    topic.keywords.some((keyword) => normalizedMessage.includes(keyword))
  );
}

function setFollowUpActions(actions) {
  if (!followUpsSection || !followUpsContainer) {
    return;
  }

  followUpsContainer.innerHTML = '';
  if (!actions || actions.length === 0) {
    followUpsSection.hidden = true;
    return;
  }

  followUpsSection.hidden = false;
  renderActionButtons(followUpsContainer, actions.map((label) => ({ label, message: label, autoSend: true })));
}

function renderActionButtons(container, actions) {
  container.innerHTML = '';
  if (!actions || actions.length === 0) {
    return;
  }

  const list = document.createElement('div');
  list.className = 'ai-quick-actions__list';

  actions.forEach((action) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ai-quick-actions__button';
    button.textContent = action.label ?? action.message ?? 'Frage senden';
    button.addEventListener('click', () => handleSuggestionClick(action));
    list.append(button);
  });

  container.append(list);
}

function renderBriefing(data) {
  if (!briefingContainer) {
    return;
  }

  briefingContainer.innerHTML = '';
  if (!data) {
    const emptyParagraph = document.createElement('p');
    emptyParagraph.className = 'ai-briefing__empty';
    emptyParagraph.textContent = 'Keine Briefing-Informationen vorhanden.';
    briefingContainer.append(emptyParagraph);
    return;
  }

  const metaList = document.createElement('dl');
  metaList.className = 'ai-briefing__meta';

  const metaEntries = [
    ['Mandant:in', data.client],
    ['Mandat', data.matter],
    ['Phase', data.phase],
  ];

  metaEntries.forEach(([label, value]) => {
    if (!value) {
      return;
    }
    const wrapper = document.createElement('div');
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    wrapper.append(dt, dd);
    metaList.append(wrapper);
  });

  briefingContainer.append(metaList);

  if (Array.isArray(data.keyDates) && data.keyDates.length > 0) {
    const keyDateSection = document.createElement('div');
    keyDateSection.className = 'ai-briefing__section';
    const heading = document.createElement('h5');
    heading.textContent = 'Wichtige Termine';
    keyDateSection.append(heading);

    const list = document.createElement('ul');
    list.className = 'ai-briefing__list';
    data.keyDates.forEach((entry) => {
      if (!entry || !entry.value) {
        return;
      }
      const item = document.createElement('li');
      item.textContent = entry.value;
      list.append(item);
    });

    keyDateSection.append(list);
    briefingContainer.append(keyDateSection);
  }

  if (Array.isArray(data.team) && data.team.length > 0) {
    const teamSection = document.createElement('div');
    teamSection.className = 'ai-briefing__section';
    const heading = document.createElement('h5');
    heading.textContent = 'Team';
    teamSection.append(heading);

    const list = document.createElement('ul');
    list.className = 'ai-briefing__list';
    data.team.forEach((member) => {
      if (!member) {
        return;
      }
      const item = document.createElement('li');
      item.textContent = member;
      list.append(item);
    });

    teamSection.append(list);
    briefingContainer.append(teamSection);
  }

  if (Array.isArray(data.notes) && data.notes.length > 0) {
    const notesSection = document.createElement('div');
    notesSection.className = 'ai-briefing__section';
    const heading = document.createElement('h5');
    heading.textContent = 'Hinweise';
    notesSection.append(heading);

    const list = document.createElement('ul');
    list.className = 'ai-briefing__list';
    data.notes.forEach((note) => {
      if (!note) {
        return;
      }
      const item = document.createElement('li');
      item.textContent = note;
      list.append(item);
    });

    notesSection.append(list);
    briefingContainer.append(notesSection);
  }
}

function handleSuggestionClick(action) {
  if (!action || !inputEl || !formEl || isGeneratingResponse) {
    return;
  }

  inputEl.value = action.message ?? action.label ?? '';
  inputEl.focus();

  if (action.autoSend && inputEl.value.trim().length > 0) {
    if (typeof formEl.requestSubmit === 'function') {
      formEl.requestSubmit();
    } else {
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      formEl.dispatchEvent(submitEvent);
    }
  }
}

function simulateAssistantResponse(userMessage) {
  const topic = findMatchingTopic(userMessage);
  const response = topic?.response || getNextDefaultResponse();
  const followUps = topic?.followUps ?? [];

  setTimeout(() => {
    addMessage('assistant', response);
    setFollowUpActions(followUps);
    isGeneratingResponse = false;
    setTypingIndicatorVisible(false);
    setInteractionDisabled(false);
    inputEl?.focus();
  }, 450 + Math.random() * 900);
}

function handleFormSubmit(event) {
  event.preventDefault();
  if (!formEl || !inputEl || isGeneratingResponse) {
    return;
  }

  const value = inputEl.value.trim();
  if (!value) {
    return;
  }

  addMessage('user', value);
  inputEl.value = '';
  setFollowUpActions([]);
  isGeneratingResponse = true;
  setInteractionDisabled(true);
  setTypingIndicatorVisible(true);
  simulateAssistantResponse(value);
}

function handleFormReset(event) {
  event.preventDefault();
  if (!inputEl) {
    return;
  }

  inputEl.value = '';
  inputEl.focus();
}

function handleInputKeyDown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    if (!formEl) {
      return;
    }

    if (typeof formEl.requestSubmit === 'function') {
      formEl.requestSubmit();
    } else {
      formEl.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
  }
}

function initializeConversation() {
  clearConversation();
  addMessage(
    'assistant',
    'Hallo! Ich bin dein Mock-KI-Assistent. Frage mich nach Fristen, Rechnungen oder Workflows, ich verweise dich auf die passenden Module.'
  );
  setFollowUpActions([]);
}

function init() {
  if (!formEl || !conversationListEl) {
    return;
  }

  renderActionButtons(quickActionsContainer, baseSuggestions);
  renderBriefing(briefingData);
  initializeConversation();

  formEl.addEventListener('submit', handleFormSubmit);
  formEl.addEventListener('reset', handleFormReset);
  inputEl?.addEventListener('keydown', handleInputKeyDown);
}

init();
