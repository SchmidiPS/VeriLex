import {
  ROLE_DEFINITIONS,
  getRoleDefinition,
  readMockSession,
  readStoredRole,
  writeMockSession,
  writeStoredRole,
} from './auth-utils.js';
import { verilexStore } from './store.js';

const THEME_STORAGE_KEY = 'verilex:theme-preference';
const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
};

let currentTheme = THEMES.LIGHT;
let hasExplicitThemeChoice = false;
let themeToggleEl = null;
let contextSelectEl = null;
let contextLabelEl = null;

const originalHiddenState = new WeakMap();
let activeRoleId = null;
const disableRoleSelector = document.documentElement.hasAttribute(
  'data-disable-role-selector'
);
let profileControlRoot = null;
let profileMenuEl = null;
let profileToggleEl = null;

const prefersDarkMediaQuery = window.matchMedia(
  '(prefers-color-scheme: dark)'
);

function readStoredThemePreference() {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === THEMES.DARK || stored === THEMES.LIGHT) {
      return stored;
    }
  } catch (error) {
    console.warn('Unable to read stored theme preference.', error);
  }
  return null;
}

function writeStoredThemePreference(theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.warn('Unable to persist theme preference.', error);
  }
}

function applyMetaThemeColor(theme) {
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (!themeColorMeta) {
    return;
  }

  const metaColor = theme === THEMES.DARK ? '#0f172a' : '#1f3c88';
  themeColorMeta.setAttribute('content', metaColor);
}

function updateThemeToggleUi() {
  if (!themeToggleEl) {
    return;
  }

  const isDark = currentTheme === THEMES.DARK;
  themeToggleEl.setAttribute('aria-pressed', isDark ? 'true' : 'false');
  themeToggleEl.setAttribute(
    'title',
    isDark ? 'Hellmodus aktivieren' : 'Dunkelmodus aktivieren'
  );

  const icon = themeToggleEl.querySelector('.theme-toggle__icon');
  if (icon) {
    icon.textContent = isDark ? '☀️' : '🌙';
  }

  const label = themeToggleEl.querySelector('.theme-toggle__label');
  if (label) {
    label.textContent = isDark ? 'Hellmodus' : 'Dunkelmodus';
  }

  const state = themeToggleEl.querySelector('.theme-toggle__state');
  if (state) {
    state.textContent = isDark ? 'aktiv' : 'inaktiv';
  }
}

function applyTheme(theme, { persist = false } = {}) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  applyMetaThemeColor(theme);
  updateThemeToggleUi();

  if (persist) {
    writeStoredThemePreference(theme);
    hasExplicitThemeChoice = true;
  }
}

function ensureProfileControlRoot() {
  if (profileControlRoot && document.body.contains(profileControlRoot)) {
    return profileControlRoot;
  }

  const header = document.querySelector('.app-header');
  if (!header) {
    return null;
  }

  if (!profileControlRoot) {
    profileControlRoot = document.createElement('div');
    profileControlRoot.className = 'profile-control';
  }

  if (!header.contains(profileControlRoot)) {
    header.append(profileControlRoot);
  }

  return profileControlRoot;
}

function deriveContextOptions() {
  if (!verilexStore) return [];
  const clients = new Map((verilexStore.getAll('Client') ?? []).map((client) => [client.id, client]));
  return (verilexStore.getAll('Case') ?? []).map((entry) => {
    const client = entry.clientId ? clients.get(entry.clientId) : null;
    const clientName = client?.name ? ` · ${client.name}` : '';
    return {
      id: entry.id,
      label: `${entry.caseNumber ?? 'AZ unbekannt'} – ${entry.title ?? 'Ohne Titel'}${clientName}`,
    };
  });
}

function renderContextSelector() {
  const root = ensureProfileControlRoot();
  if (!root || !verilexStore) {
    return;
  }

  const options = deriveContextOptions();
  if (options.length === 0) {
    if (contextSelectEl && root.contains(contextSelectEl)) {
      contextSelectEl.remove();
    }
    if (contextLabelEl && root.contains(contextLabelEl)) {
      contextLabelEl.remove();
    }
    return;
  }

  if (!contextLabelEl) {
    contextLabelEl = document.createElement('label');
    contextLabelEl.className = 'context-switcher__label';
    contextLabelEl.textContent = 'Aktives Mandat';
  }

  if (!contextSelectEl) {
    contextSelectEl = document.createElement('select');
    contextSelectEl.className = 'context-switcher';
    contextSelectEl.addEventListener('change', (event) => {
      const value = event.target.value;
      verilexStore.setActiveCase(value || null);
    });
  }

  contextSelectEl.innerHTML = '';
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Alle Mandate';
  contextSelectEl.append(defaultOption);

  options.forEach((option) => {
    const node = document.createElement('option');
    node.value = option.id;
    node.textContent = option.label;
    contextSelectEl.append(node);
  });

  const activeContext = verilexStore.getActiveContext();
  const activeCaseId = activeContext?.caseId ?? '';
  contextSelectEl.value = activeCaseId;

  if (!root.contains(contextLabelEl)) {
    root.append(contextLabelEl);
  }
  if (!root.contains(contextSelectEl)) {
    root.append(contextSelectEl);
  }
}

function initThemeToggle() {
  const root = ensureProfileControlRoot();
  if (!root) {
    return;
  }

  if (!themeToggleEl) {
    themeToggleEl = document.createElement('button');
    themeToggleEl.type = 'button';
    themeToggleEl.className = 'theme-toggle';
    themeToggleEl.innerHTML = `
      <span class="theme-toggle__icon" aria-hidden="true"></span>
      <span class="theme-toggle__text">
        <span class="theme-toggle__label"></span>
        <span class="theme-toggle__state" aria-hidden="true"></span>
      </span>
    `;

    themeToggleEl.addEventListener('click', () => {
      const nextTheme = currentTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
      applyTheme(nextTheme, { persist: true });
    });
  }

  if (!root.contains(themeToggleEl)) {
    root.prepend(themeToggleEl);
  }

  updateThemeToggleUi();
}

const storedThemePreference = readStoredThemePreference();
hasExplicitThemeChoice = storedThemePreference !== null;
const initialTheme =
  storedThemePreference ?? (prefersDarkMediaQuery.matches ? THEMES.DARK : THEMES.LIGHT);
applyTheme(initialTheme);

prefersDarkMediaQuery.addEventListener('change', (event) => {
  if (hasExplicitThemeChoice) {
    return;
  }

  applyTheme(event.matches ? THEMES.DARK : THEMES.LIGHT);
});

const NAVIGATION_LINKS = [
  { label: 'Start', href: 'index.html', roles: ['all'] },
  { label: 'Dashboard', href: 'dashboard.html', roles: ['all'] },
  { label: 'Risikomonitor', href: 'risk-monitor.html', roles: ['partner', 'associate'] },
  { label: 'Mandats-Wizard', href: 'mandate-wizard.html', roles: ['partner', 'associate'] },
  { label: 'Dokumente', href: 'document-management.html', roles: ['partner', 'associate', 'assistant'] },
  { label: 'Mandantenportal', href: 'mandantenportal.html', roles: ['all'] },
  { label: 'KI-Assistent', href: 'ai-assistant.html', roles: ['all'] },
  { label: 'Zeiterfassung', href: 'time-tracking.html', roles: ['partner', 'associate', 'assistant'] },
  {
    label: 'Team-Auslastung',
    href: 'team-capacity.html',
    roles: ['partner', 'associate', 'assistant'],
  },
  {
    label: 'Compliance',
    href: 'compliance-checklist.html',
    roles: ['partner', 'associate', 'assistant'],
  },
  { label: 'Rechnungen', href: 'invoice-wizard.html', roles: ['partner', 'accounting'] },
  { label: 'Offene Posten', href: 'open-items.html', roles: ['partner', 'accounting'] },
  { label: 'Workflow', href: 'workflow-designer.html', roles: ['partner'] }
];

function parseRoleList(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((role) => role.trim().toLowerCase())
    .filter(Boolean);
}

function setNodeVisibility(node, isVisible) {
  if (!originalHiddenState.has(node)) {
    originalHiddenState.set(node, node.hasAttribute('hidden'));
  }

  if (!isVisible) {
    node.classList.add('is-hidden-by-role');
    node.setAttribute('aria-hidden', 'true');
    node.dataset.roleHidden = 'true';
    node.setAttribute('hidden', '');
  } else {
    node.classList.remove('is-hidden-by-role');
    node.removeAttribute('aria-hidden');
    delete node.dataset.roleHidden;

    if (originalHiddenState.get(node)) {
      node.setAttribute('hidden', '');
    } else {
      node.removeAttribute('hidden');
    }
  }
}

function initializeNavigation() {
  const header = document.querySelector('.app-header');
  if (!header || header.querySelector('.app-navigation')) {
    return;
  }

  const nav = document.createElement('nav');
  nav.className = 'app-navigation';
  nav.setAttribute('aria-label', 'Hauptnavigation');

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'app-navigation__toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'app-navigation-menu');
  toggle.innerHTML =
    '<span class="app-navigation__toggle-icon" aria-hidden="true">☰</span><span class="visually-hidden">Menü</span>';

  const menu = document.createElement('ul');
  menu.className = 'app-navigation__menu';
  menu.id = 'app-navigation-menu';

  const currentPath = window.location.pathname.split('/').pop() || 'index.html';

  NAVIGATION_LINKS.forEach((link) => {
    const item = document.createElement('li');
    item.className = 'app-navigation__item';

    const anchor = document.createElement('a');
    anchor.className = 'app-navigation__link';
    anchor.href = link.href;
    anchor.textContent = link.label;
    anchor.dataset.visibleFor = (link.roles ?? ['all']).join(',');

    if (link.href === currentPath) {
      anchor.setAttribute('aria-current', 'page');
    }

    item.append(anchor);
    menu.append(item);
  });

  nav.append(toggle);
  nav.append(menu);
  header.append(nav);

  const closeMenu = () => {
    nav.classList.remove('app-navigation--open');
    toggle.setAttribute('aria-expanded', 'false');
  };

  const openMenu = () => {
    nav.classList.add('app-navigation--open');
    toggle.setAttribute('aria-expanded', 'true');
  };

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    if (expanded) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  menu.addEventListener('click', (event) => {
    if (event.target.closest('.app-navigation__link')) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('app-navigation--open')) {
      closeMenu();
      toggle.focus();
    }
  });
}

function updateRoleStatus(roleDefinition) {
  const statusEl = document.getElementById('role-status-message');
  if (statusEl) {
    statusEl.textContent = `Aktive Rolle: ${roleDefinition.label}`;
  }
  document.documentElement.setAttribute('data-active-role', roleDefinition.id);
}

function announceRoleChange(roleId) {
  window.dispatchEvent(
    new CustomEvent('verilex:role-changed', {
      detail: { roleId },
    })
  );
}

function applyRoleVisibility(requestedRoleId) {
  const roleDefinition = getRoleDefinition(requestedRoleId);
  const previousRole = activeRoleId;
  activeRoleId = roleDefinition.id;
  updateRoleStatus(roleDefinition);

  const nodes = document.querySelectorAll('[data-visible-for]');
  nodes.forEach((node) => {
    const allowedRoles = parseRoleList(node.getAttribute('data-visible-for'));
    const isVisible =
      allowedRoles.includes('all') ||
      allowedRoles.includes(activeRoleId);
    setNodeVisibility(node, isVisible);
  });

  if (previousRole !== activeRoleId) {
    announceRoleChange(activeRoleId);
  }
}

function handleProfileDocumentClick(event) {
  if (!profileControlRoot || !profileMenuEl || profileMenuEl.hidden) {
    return;
  }

  if (profileControlRoot.contains(event.target)) {
    return;
  }

  closeProfileMenu();
}

function handleProfileDocumentKeydown(event) {
  if (event.key === 'Escape' && profileMenuEl && !profileMenuEl.hidden) {
    closeProfileMenu();
    profileToggleEl?.focus();
  }
}

function openProfileMenu() {
  if (!profileMenuEl) {
    return;
  }

  profileMenuEl.hidden = false;
  profileToggleEl?.setAttribute('aria-expanded', 'true');
  document.addEventListener('click', handleProfileDocumentClick);
  document.addEventListener('keydown', handleProfileDocumentKeydown);
}

function closeProfileMenu() {
  if (profileMenuEl) {
    profileMenuEl.hidden = true;
  }

  profileToggleEl?.setAttribute('aria-expanded', 'false');
  document.removeEventListener('click', handleProfileDocumentClick);
  document.removeEventListener('keydown', handleProfileDocumentKeydown);
}

function renderProfileControls() {
  const root = ensureProfileControlRoot();
  if (!root) {
    return;
  }

  closeProfileMenu();

  const existingThemeToggle = root.querySelector('.theme-toggle');
  root.innerHTML = '';

  if (existingThemeToggle) {
    root.append(existingThemeToggle);
  }

  const status = document.createElement('p');
  status.id = 'role-status-message';
  status.className = 'visually-hidden';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.textContent = `Aktive Rolle: ${getRoleDefinition(activeRoleId).label}`;
  root.append(status);

  const session = readMockSession();

  if (!session) {
    const loginLink = document.createElement('a');
    loginLink.href = 'login.html';
    loginLink.className = 'btn btn-secondary profile-login-link';
    loginLink.textContent = 'Anmelden';
    root.append(loginLink);
    profileMenuEl = null;
    profileToggleEl = null;
    return;
  }

  const displayName = session.displayName || session.email || 'Demo-Konto';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'profile-toggle';
  toggle.setAttribute('aria-haspopup', 'true');
  toggle.setAttribute('aria-expanded', 'false');

  const nameSpan = document.createElement('span');
  nameSpan.className = 'profile-toggle__name';
  nameSpan.textContent = displayName;
  toggle.append(nameSpan);

  const roleSpan = document.createElement('span');
  roleSpan.className = 'profile-toggle__role';
  roleSpan.textContent = getRoleDefinition(activeRoleId).label;
  toggle.append(roleSpan);

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    if (expanded) {
      closeProfileMenu();
    } else {
      openProfileMenu();
    }
  });

  root.append(toggle);

  const menu = document.createElement('div');
  menu.className = 'profile-menu';
  menu.setAttribute('role', 'menu');
  menu.hidden = true;

  const menuHeader = document.createElement('div');
  menuHeader.className = 'profile-menu__header';

  const userLine = document.createElement('p');
  userLine.className = 'profile-menu__user';
  userLine.textContent = displayName;
  menuHeader.append(userLine);

  const roleLine = document.createElement('p');
  roleLine.className = 'profile-menu__meta';
  roleLine.textContent = `Aktive Rolle: ${getRoleDefinition(activeRoleId).label}`;
  menuHeader.append(roleLine);

  menu.append(menuHeader);

  const roleList = document.createElement('div');
  roleList.className = 'profile-menu__roles';

  ROLE_DEFINITIONS.forEach((role) => {
    const roleButton = document.createElement('button');
    roleButton.type = 'button';
    roleButton.className = 'profile-menu__role';
    roleButton.dataset.roleId = role.id;
    roleButton.setAttribute('role', 'menuitemradio');
    roleButton.setAttribute(
      'aria-checked',
      role.id === activeRoleId ? 'true' : 'false'
    );

    const label = document.createElement('span');
    label.className = 'profile-menu__role-label';
    label.textContent = role.label;
    roleButton.append(label);

    if (role.id === activeRoleId) {
      roleButton.classList.add('is-active');
      const badge = document.createElement('span');
      badge.className = 'profile-menu__role-badge';
      badge.textContent = 'Aktiv';
      roleButton.append(badge);
    }

    roleButton.addEventListener('click', () => {
      changeRole(role.id);
    });

    roleList.append(roleButton);
  });

  menu.append(roleList);

  const logoutLink = document.createElement('a');
  logoutLink.className = 'profile-menu__logout';
  logoutLink.href = 'logout.html';
  logoutLink.textContent = 'Abmelden';
  logoutLink.setAttribute('role', 'menuitem');
  menu.append(logoutLink);

  root.append(menu);

  profileMenuEl = menu;
  profileToggleEl = toggle;
}

function refreshRoleDependentUi(requestedRoleId) {
  applyRoleVisibility(requestedRoleId);

  if (!disableRoleSelector) {
    renderProfileControls();
  }
}

function changeRole(roleId) {
  const nextRole = getRoleDefinition(roleId).id;

  if (activeRoleId === nextRole) {
    closeProfileMenu();
    profileToggleEl?.focus();
    return;
  }

  writeStoredRole(nextRole);

  const session = readMockSession();
  if (session) {
    writeMockSession({ ...session, roleId: nextRole });
  }

  refreshRoleDependentUi(nextRole);

  closeProfileMenu();
  profileToggleEl?.focus();
}

function setRoleAccessApi() {
  window.verilexRoleAccess = {
    getActiveRole: () => activeRoleId,
    setRole: changeRole,
    definitions: ROLE_DEFINITIONS.map((role) => ({ ...role })),
  };
}

function initRoleAccessControl() {
  const storedRole = readStoredRole();
  activeRoleId = getRoleDefinition(storedRole).id;

  if (disableRoleSelector) {
    applyRoleVisibility(activeRoleId);
    setRoleAccessApi();
    return;
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        refreshRoleDependentUi(activeRoleId);
        setRoleAccessApi();
      },
      once: true,
    );
  } else {
    refreshRoleDependentUi(activeRoleId);
    setRoleAccessApi();
  }
}

initSecurityBanner();
initializeNavigation();
initThemeToggle();
renderContextSelector();
initRoleAccessControl();

class GlobalErrorOverlay {
  constructor(root) {
    this.root = root;
    this.messageEl = root.querySelector('#error-overlay-message');
    this.detailsEl = root.querySelector('#error-overlay-details');
    this.dismissButtons = root.querySelectorAll('[data-error-action="dismiss"]');
    this.reloadButton = root.querySelector('[data-error-action="reload"]');
    this.isVisible = false;

    this.dismissButtons.forEach((btn) =>
      btn.addEventListener('click', () => this.hide())
    );

    if (this.reloadButton) {
      this.reloadButton.addEventListener('click', () => {
        window.location.reload();
      });
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });
  }

  show({ title, message, details }) {
    if (title) {
      const titleEl = this.root.querySelector('#error-overlay-title');
      if (titleEl) {
        titleEl.textContent = title;
      }
    }

    this.messageEl.textContent = message ?? 'Ein unbekannter Fehler ist aufgetreten.';

    if (details) {
      this.detailsEl.textContent = details;
      this.detailsEl.parentElement.removeAttribute('hidden');
    } else {
      this.detailsEl.textContent = '';
      this.detailsEl.parentElement.setAttribute('hidden', '');
    }

    this.root.removeAttribute('hidden');
    this.root.setAttribute('aria-hidden', 'false');
    this.isVisible = true;
    this.root.querySelector('.error-overlay__content')?.focus?.();
  }

  hide() {
    this.root.setAttribute('hidden', '');
    this.root.setAttribute('aria-hidden', 'true');
    this.isVisible = false;
  }
}

function formatErrorDetails(error) {
  if (!error) return '';

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return [error.message, error.stack].filter(Boolean).join('\n');
  }

  try {
    return JSON.stringify(error, null, 2);
  } catch (jsonError) {
    return String(error);
  }
}

function initGlobalErrorHandling() {
  const overlayRoot = document.getElementById('global-error-overlay');
  if (!overlayRoot) {
    console.warn('Global error overlay root element not found.');
    return;
  }

  const overlay = new GlobalErrorOverlay(overlayRoot);

  const showFromEvent = (event) => {
    const { error, reason, message, filename, lineno, colno } = event;
    const detailSource = error ?? reason;
    const formattedDetails = formatErrorDetails(detailSource);

    const overlayTitle = 'Ein unerwarteter Fehler ist aufgetreten';
    const overlayMessage =
      (message && typeof message === 'string')
        ? message
        : 'Bitte entschuldigen Sie die Umstände. Wir kümmern uns sofort darum.';

    const meta = [];
    if (filename) {
      meta.push(`Datei: ${filename}`);
    }
    if (typeof lineno === 'number') {
      meta.push(`Zeile: ${lineno}`);
    }
    if (typeof colno === 'number') {
      meta.push(`Spalte: ${colno}`);
    }

    const details = [formattedDetails, meta.join(' | ')].filter(Boolean).join('\n\n');

    overlay.show({ title: overlayTitle, message: overlayMessage, details });
  };

  window.addEventListener('error', (event) => {
    event.preventDefault();
    showFromEvent(event);
  });

  window.addEventListener('unhandledrejection', (event) => {
    event.preventDefault();
    showFromEvent(event);
  });

  window.addEventListener('verilex:error', (event) => {
    const detail = event.detail ?? {};
    overlay.show({
      title: detail.title ?? 'Fehler',
      message:
        detail.message ??
        'Es ist ein Problem aufgetreten. Bitte versuchen Sie es erneut.',
      details: formatErrorDetails(detail.details),
    });
  });

  return overlay;
}

const overlayInstance = initGlobalErrorHandling();

if (verilexStore) {
  ['storeReady', 'storeReset', 'storeChanged', 'activeContextChanged'].forEach((eventName) =>
    verilexStore.on(eventName, renderContextSelector)
  );
}

const demoButton = document.getElementById('trigger-demo-error');
if (demoButton) {
  demoButton.addEventListener('click', () => {
    const demoError = new Error('Dies ist ein simuliertes Fehlerbeispiel für das Overlay.');
    window.dispatchEvent(
      new CustomEvent('verilex:error', {
        detail: {
          title: 'Demo-Fehler',
          message: 'So sieht das Fehler-Overlay bei einer Ausnahme aus.',
          details: demoError,
        },
      })
    );
  });
}

function normalizeCaseEntry(entry) {
  return {
    caseNumber: String(entry.caseNumber ?? '').trim(),
    title: String(entry.title ?? '').trim(),
    client: String(entry.client ?? '').trim(),
    deadlineStatus: String(entry.deadlineStatus ?? 'Status unbekannt').trim(),
    deadlineCategory: (entry.deadlineCategory ?? 'info').toString().trim().toLowerCase(),
  };
}

function determineBadgeModifier(category) {
  const allowed = new Set(['ok', 'warning', 'critical', 'info']);
  return allowed.has(category) ? category : 'info';
}

function initCaseDirectory() {
  const dataElement = document.getElementById('case-data');
  if (!dataElement) {
    return;
  }

  let parsedCases = [];
  try {
    const rawText = dataElement.textContent ?? '[]';
    parsedCases = JSON.parse(rawText);
  } catch (error) {
    console.error('Die Akten-Daten konnten nicht geparst werden.', error);
    overlayInstance?.show?.({
      title: 'Fehler beim Laden der Akten',
      message: 'Die Demo-Akten konnten nicht geladen werden.',
      details: error,
    });
    return;
  }

  const cases = Array.isArray(parsedCases)
    ? parsedCases.map((entry) => normalizeCaseEntry(entry))
    : [];

  const grid = document.getElementById('case-grid');
  const emptyState = document.getElementById('case-empty-state');
  const summary = document.getElementById('case-result-summary');
  const searchInput = document.getElementById('case-search-input');

  if (!grid || !emptyState || !summary || !searchInput) {
    return;
  }

  let currentList = cases.slice();
  let selectionMessage = '';
  let renderedCards = [];

  const updateSummary = (count) => {
    const baseMessage = count === 1 ? '1 Akte gefunden' : `${count} Akten gefunden`;
    summary.textContent = selectionMessage ? `${baseMessage} — ${selectionMessage}` : baseMessage;
  };

  const buildCaseDetailUrl = (caseEntry) => {
    const caseNumber = caseEntry.caseNumber?.trim();
    if (!caseNumber) {
      return 'case-detail.html';
    }

    const params = new URLSearchParams();
    params.set('case', caseNumber);
    return `case-detail.html?${params.toString()}`;
  };

  const navigateToDetail = (caseEntry) => {
    const url = buildCaseDetailUrl(caseEntry);
    window.location.href = url;
  };

  const renderList = (list) => {
    grid.innerHTML = '';
    const fragment = document.createDocumentFragment();

    list.forEach((caseEntry, index) => {
      const badgeModifier = determineBadgeModifier(caseEntry.deadlineCategory);
      const card = document.createElement('article');
      card.className = 'case-card';
      card.tabIndex = 0;
      card.dataset.index = String(index);
      card.dataset.caseNumber = caseEntry.caseNumber;
      card.dataset.caseTitle = caseEntry.title;
      card.setAttribute('role', 'listitem');
      card.setAttribute(
        'aria-label',
        `${caseEntry.caseNumber || 'Ohne Aktenzeichen'} – ${caseEntry.title || 'Ohne Titel'}`
      );

      card.innerHTML = `
        <div class="case-card__meta">
          <span class="case-card__number" aria-hidden="true">${caseEntry.caseNumber || 'n/a'}</span>
          <span class="case-badge case-badge--${badgeModifier}">${caseEntry.deadlineStatus}</span>
        </div>
        <h3 class="case-card__title">${caseEntry.title || 'Unbenannte Akte'}</h3>
        <p class="case-card__client">
          <span class="case-card__client-label">Mandant:</span>
          <span>${caseEntry.client || 'unbekannt'}</span>
        </p>
        <div class="case-card__footer">
          <span class="case-card__action-hint">Enter öffnet die Detailseite, Leertaste markiert</span>
          <span class="case-card__icon" aria-hidden="true">⟶</span>
        </div>
      `;

      card.addEventListener('click', () => navigateToDetail(caseEntry));

      fragment.appendChild(card);
    });

    grid.appendChild(fragment);
    renderedCards = Array.from(grid.querySelectorAll('.case-card'));
    grid.hidden = list.length === 0;
    emptyState.hidden = list.length !== 0;
    selectionMessage = '';
    updateSummary(list.length);
  };

  const filterCases = (query) => {
    if (!query) {
      return cases.slice();
    }

    const normalizedQuery = query.toLocaleLowerCase('de-DE');
    return cases.filter((caseEntry) => {
      const numberMatch = caseEntry.caseNumber.toLocaleLowerCase('de-DE').includes(normalizedQuery);
      const titleMatch = caseEntry.title.toLocaleLowerCase('de-DE').includes(normalizedQuery);
      return numberMatch || titleMatch;
    });
  };

  const handleSearchInput = (event) => {
    const input = event.target;
    const value = input instanceof HTMLInputElement ? input.value.trim() : '';
    currentList = filterCases(value);
    renderList(currentList);
  };

  const announceSelection = (caseEntry) => {
    if (!caseEntry) {
      selectionMessage = '';
      updateSummary(currentList.length);
      return;
    }

    selectionMessage = `Akte „${caseEntry.title || caseEntry.caseNumber}“ markiert. Enter öffnet die Detailseite.`;
    updateSummary(currentList.length);
  };

  const handleGridKeyDown = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.classList.contains('case-card')) {
      return;
    }

    const index = Number.parseInt(target.dataset.index ?? '', 10);
    if (Number.isNaN(index)) {
      return;
    }

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      const nextIndex = Math.min(index + 1, renderedCards.length - 1);
      if (nextIndex !== index) {
        event.preventDefault();
        renderedCards[nextIndex]?.focus();
      }
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      const nextIndex = Math.max(index - 1, 0);
      if (nextIndex !== index) {
        event.preventDefault();
        renderedCards[nextIndex]?.focus();
      }
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      renderedCards[0]?.focus();
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      renderedCards[renderedCards.length - 1]?.focus();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      navigateToDetail(currentList[index]);
      return;
    }

    if (event.key === ' ') {
      event.preventDefault();
      announceSelection(currentList[index]);
    }
  };

  searchInput.addEventListener('input', handleSearchInput);
  grid.addEventListener('keydown', handleGridKeyDown);

  currentList = cases.slice();
  renderList(currentList);
}

initCaseDirectory();

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('service-worker.js')
      .catch((error) => {
        console.error('Service Worker registration failed', error);
      });
  });
}

registerServiceWorker();

export { GlobalErrorOverlay, overlayInstance };
