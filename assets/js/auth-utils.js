export const ROLE_DEFINITIONS = [
  {
    id: 'partner',
    label: 'Partner:in',
    description:
      'Hat Vollzugriff auf alle Module, inklusive Rechnungs- und Workflow-Themen.',
  },
  {
    id: 'associate',
    label: 'Associate',
    description: 'Fokus auf Mandatsbearbeitung, Dokumente und Fristen.',
  },
  {
    id: 'assistant',
    label: 'Assistenz',
    description: 'Unterstützt bei Terminen, Dokumenten und Kommunikation.',
  },
  {
    id: 'accounting',
    label: 'Buchhaltung',
    description: 'Konzentriert sich auf Rechnungen, offene Posten und Auswertungen.',
  },
];

export const ROLE_STORAGE_KEY = 'verilex.activeRole';
export const SESSION_STORAGE_KEY = 'verilex.mockSession';

export function getRoleDefinition(roleId) {
  const normalized = (roleId ?? '').toString().trim().toLowerCase();
  return (
    ROLE_DEFINITIONS.find((role) => role.id === normalized) ?? ROLE_DEFINITIONS[0]
  );
}

export function readStoredRole() {
  try {
    return localStorage.getItem(ROLE_STORAGE_KEY);
  } catch (error) {
    console.warn('Rollenpräferenz konnte nicht gelesen werden.', error);
    return null;
  }
}

export function writeStoredRole(roleId) {
  try {
    localStorage.setItem(ROLE_STORAGE_KEY, roleId);
  } catch (error) {
    console.warn('Rollenpräferenz konnte nicht gespeichert werden.', error);
  }
}

export function readMockSession() {
  try {
    const rawValue = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.warn('Mock-Session konnte nicht gelesen werden.', error);
    return null;
  }
}

export function writeMockSession(session) {
  try {
    const payload = JSON.stringify(session);
    localStorage.setItem(SESSION_STORAGE_KEY, payload);
  } catch (error) {
    console.warn('Mock-Session konnte nicht gespeichert werden.', error);
  }
}

export function clearMockSession() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    console.warn('Mock-Session konnte nicht entfernt werden.', error);
  }
}
