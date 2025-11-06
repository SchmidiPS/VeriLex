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
  const parts = [];
  if (session.email) {
    parts.push(`Aktuell angemeldet als ${session.email}`);
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

  const emailInput = form.querySelector('#login-email');
  const passwordInput = form.querySelector('#login-password');
  const roleSelect = form.querySelector('#login-role');

  const email = emailInput?.value.trim() ?? '';
  const roleId = roleSelect?.value || readStoredRole() || ROLE_DEFINITIONS[0].id;
  const normalizedRole = getRoleDefinition(roleId).id;

  const session = {
    email,
    roleId: normalizedRole,
    createdAt: new Date().toISOString(),
  };

  writeMockSession(session);
  writeStoredRole(normalizedRole);

  const feedback = document.getElementById('login-feedback');
  const feedbackMessage = document.getElementById('login-feedback-message');

  if (feedback && feedbackMessage) {
    feedbackMessage.textContent = `Anmeldung erfolgreich. Aktive Rolle: ${getRoleDefinition(normalizedRole).label}.`;
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
  }

  passwordInput?.setAttribute('aria-describedby', 'login-feedback-message');
}

function initLoginForm() {
  const form = document.getElementById('login-form');
  const roleSelect = document.getElementById('login-role');

  if (!form || !roleSelect) {
    return;
  }

  populateRoleOptions(roleSelect);

  const existingSession = readMockSession();
  const storedRole = readStoredRole();
  const preferredRoleId = existingSession?.roleId || storedRole || ROLE_DEFINITIONS[0].id;
  roleSelect.value = getRoleDefinition(preferredRoleId).id;

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
