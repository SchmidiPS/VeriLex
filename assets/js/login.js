import {
  ROLE_DEFINITIONS,
  getRoleDefinition,
  readMockSession,
  readStoredRole,
  writeMockSession,
  writeStoredRole,
} from './auth-utils.js';

function populateRoleOptions(select) {
  const fragment = document.createDocumentFragment();
  ROLE_DEFINITIONS.forEach((role) => {
    const option = document.createElement('option');
    option.value = role.id;
    option.textContent = `${role.label}`;
    option.title = role.description;
    fragment.append(option);
  });
  select.append(fragment);
}

function formatSessionSummary(session) {
  if (!session) {
    return '';
  }

  const roleLabel = getRoleDefinition(session.roleId)?.label ?? session.roleId;
  const displayName = session.displayName || session.email;
  const parts = [];
  if (displayName) {
    parts.push(`Aktuell angemeldet als ${displayName}`);
  }
  if (roleLabel) {
    parts.push(`Rolle: ${roleLabel}`);
  }

  return parts.join(' · ');
}

function handleLoginSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const nameInput = form.querySelector('#login-name');
  const passwordInput = form.querySelector('#login-password');
  const roleSelect = form.querySelector('#login-role');

  const displayName = nameInput?.value.trim() ?? '';
  const roleId = roleSelect?.value || readStoredRole() || ROLE_DEFINITIONS[0].id;
  const normalizedRole = getRoleDefinition(roleId).id;

  const session = {
    displayName,
    roleId: normalizedRole,
    createdAt: new Date().toISOString(),
  };

  writeMockSession(session);
  writeStoredRole(normalizedRole);

  const feedback = document.getElementById('login-feedback');
  const feedbackMessage = document.getElementById('login-feedback-message');

  if (feedback && feedbackMessage) {
    const roleLabel = getRoleDefinition(normalizedRole).label;
    feedbackMessage.textContent = `Anmeldung erfolgreich. ${displayName || 'Demo-Nutzer:in'} ist jetzt als ${roleLabel} aktiv.`;
    feedback.hidden = false;
  }

  const sessionInfo = document.getElementById('login-session-info');
  if (sessionInfo) {
    sessionInfo.textContent = formatSessionSummary(session);
    sessionInfo.hidden = false;
  }

  if (roleSelect) {
    roleSelect.value = normalizedRole;
  }

  if (passwordInput) {
    passwordInput.value = '';
    passwordInput.setAttribute('aria-describedby', 'login-feedback-message');
  }
}

function initLoginForm() {
  const form = document.getElementById('login-form');
  const roleSelect = document.getElementById('login-role');
  const nameInput = document.getElementById('login-name');

  if (!form || !roleSelect) {
    return;
  }

  populateRoleOptions(roleSelect);

  const existingSession = readMockSession();
  const storedRole = readStoredRole();
  const preferredRoleId = existingSession?.roleId || storedRole || ROLE_DEFINITIONS[0].id;
  roleSelect.value = getRoleDefinition(preferredRoleId).id;

  if (existingSession && nameInput) {
    nameInput.value = existingSession.displayName || existingSession.email || '';
  }

  const sessionInfo = document.getElementById('login-session-info');
  if (existingSession && sessionInfo) {
    sessionInfo.textContent = formatSessionSummary(existingSession);
    sessionInfo.hidden = false;
  }

  form.addEventListener('submit', handleLoginSubmit);

}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLoginForm, { once: true });
} else {
  initLoginForm();
}
