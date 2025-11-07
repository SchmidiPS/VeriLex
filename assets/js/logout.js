import {
  ROLE_DEFINITIONS,
  clearMockSession,
  getRoleDefinition,
  readMockSession,
  writeStoredRole,
} from './auth-utils.js';

function formatDate(isoString) {
  if (!isoString) {
    return 'Unbekannt';
  }

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return 'Unbekannt';
  }

  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date);
}

function updateSummary(session) {
  const summary = document.getElementById('logout-session-summary');
  const emptyState = document.getElementById('logout-empty-state');
  const nameEl = document.getElementById('logout-session-name');
  const roleEl = document.getElementById('logout-session-role');
  const createdEl = document.getElementById('logout-session-created');

  if (!summary || !emptyState || !nameEl || !roleEl || !createdEl) {
    return;
  }

  if (session) {
    nameEl.textContent = session.displayName || session.email || 'Unbekannt';
    roleEl.textContent = getRoleDefinition(session.roleId).label;
    createdEl.textContent = formatDate(session.createdAt);
    summary.hidden = false;
    emptyState.hidden = true;
  } else {
    summary.hidden = true;
    emptyState.hidden = false;
  }
}

function showFeedback(message) {
  const feedback = document.getElementById('logout-feedback');
  const feedbackMessage = document.getElementById('logout-feedback-message');

  if (!feedback || !feedbackMessage) {
    return;
  }

  feedbackMessage.textContent = message;
  feedback.hidden = false;
}

function handleLogout() {
  const session = readMockSession();
  if (!session) {
    showFeedback('Es war keine aktive Sitzung vorhanden.');
    updateSummary(null);
    writeStoredRole(ROLE_DEFINITIONS[0].id);
    return;
  }

  clearMockSession();
  writeStoredRole(ROLE_DEFINITIONS[0].id);
  updateSummary(null);
  showFeedback('Sitzung wurde beendet. Die Rollenwahl wurde zurückgesetzt.');
}

function initLogoutPage() {
  updateSummary(readMockSession());

  const button = document.getElementById('logout-button');
  if (button) {
    button.addEventListener('click', handleLogout);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLogoutPage, { once: true });
} else {
  initLogoutPage();
}
