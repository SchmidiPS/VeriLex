const ENTITY_COLLECTIONS = {
  Case: 'cases',
  Client: 'clients',
  User: 'users',
  Document: 'documents',
  TimeEntry: 'timeEntries',
  Invoice: 'invoices',
  ComplianceItem: 'complianceItems',
  Appointment: 'appointments',
  Communication: 'communications',
  Template: 'templates',
  Workflow: 'workflows'
};

const ENTITY_PREFIX = {
  Case: 'ca',
  Client: 'cl',
  User: 'u',
  Document: 'doc',
  TimeEntry: 'te',
  Invoice: 'inv',
  ComplianceItem: 'co',
  Appointment: 'ap',
  Communication: 'cm',
  Template: 'tpl',
  Workflow: 'wf'
};

class VeriLexEventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(eventName, handler) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName).add(handler);
    return () => this.off(eventName, handler);
  }

  off(eventName, handler) {
    const handlers = this.listeners.get(eventName);
    if (!handlers) return;
    handlers.delete(handler);
    if (handlers.size === 0) {
      this.listeners.delete(eventName);
    }
  }

  emit(eventName, detail) {
    const handlers = this.listeners.get(eventName);
    if (!handlers) return;
    handlers.forEach((handler) => {
      try {
        handler(detail);
      } catch (error) {
        console.error(`VeriLexEventBus handler for ${eventName} failed`, error);
      }
    });
  }
}

class VeriLexStore {
  constructor({ dataModel, storageKey = 'verilex:central-store', enablePersistence = true } = {}) {
    this.dataModel = dataModel || (typeof window !== 'undefined' ? window.verilexDataModel : null);
    this.storageKey = storageKey;
    this.enablePersistence = enablePersistence;
    this.eventBus = new VeriLexEventBus();
    this.data = this.createEmptyState();
    this.activeContext = this.loadActiveContext();
  }

  createEmptyState() {
    return Object.values(ENTITY_COLLECTIONS).reduce((acc, key) => {
      acc[key] = [];
      return acc;
    }, {});
  }

  cloneData(payload) {
    return JSON.parse(JSON.stringify(payload));
  }

  getPrimaryKey(entityName) {
    const fallbackKey = 'id';
    if (!this.dataModel || !this.dataModel.entities || !this.dataModel.entities[entityName]) {
      return fallbackKey;
    }
    return this.dataModel.entities[entityName].primaryKey || fallbackKey;
  }

  getCollectionKey(entityName) {
    const key = ENTITY_COLLECTIONS[entityName];
    if (!key) {
      throw new Error(`Unbekannte Entität: ${entityName}`);
    }
    return key;
  }

  generateId(entityName) {
    const prefix = ENTITY_PREFIX[entityName] || 'id';
    const random = Math.random().toString(36).slice(2, 7);
    const timestamp = Date.now().toString(36);
    return `${prefix}-${timestamp}-${random}`;
  }

  loadFromStorage() {
    if (!this.enablePersistence || typeof localStorage === 'undefined') {
      return null;
    }
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return this.validateStateShape(parsed) ? parsed : null;
    } catch (error) {
      console.warn('Konnte gespeicherte Store-Daten nicht laden.', error);
      return null;
    }
  }

  persist() {
    if (!this.enablePersistence || typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (error) {
      console.warn('Konnte Store-Daten nicht speichern.', error);
    }
  }

  loadActiveContext() {
    if (typeof localStorage === 'undefined') {
      return { caseId: null, clientId: null };
    }

    try {
      const raw = localStorage.getItem('verilex:active-context');
      if (!raw) return { caseId: null, clientId: null };

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return { caseId: null, clientId: null };
      }

      return { caseId: parsed.caseId ?? null, clientId: parsed.clientId ?? null };
    } catch (error) {
      console.warn('Konnte aktive Auswahl nicht laden.', error);
      return { caseId: null, clientId: null };
    }
  }

  persistActiveContext() {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem('verilex:active-context', JSON.stringify(this.activeContext));
    } catch (error) {
      console.warn('Aktiven Kontext konnte nicht gespeichert werden.', error);
    }
  }

  validateStateShape(candidate) {
    if (!candidate || typeof candidate !== 'object') return false;
    return Object.values(ENTITY_COLLECTIONS).every((collectionKey) => Array.isArray(candidate[collectionKey]));
  }

  loadSampleData() {
    if (typeof window !== 'undefined' && typeof window.cloneVerilexSampleData === 'function') {
      return window.cloneVerilexSampleData();
    }
    return this.createEmptyState();
  }

  initialize() {
    const storedState = this.loadFromStorage();
    if (storedState) {
      this.data = storedState;
      this.eventBus.emit('storeReady', { source: 'storage' });
      this.emitActiveContext();
      return;
    }

    this.data = this.cloneData(this.loadSampleData());
    this.persist();
    this.eventBus.emit('storeReady', { source: 'sample' });
    this.emitActiveContext();
  }

  exportData() {
    return this.cloneData(this.data);
  }

  resetWithSampleData() {
    this.data = this.cloneData(this.loadSampleData());
    this.persist();
    this.eventBus.emit('storeReset', { source: 'sample' });
    this.emitActiveContext();
  }

  resetWithPayload(payload) {
    if (!this.validateStateShape(payload)) {
      throw new Error('Ungültige Store-Struktur beim Reset.');
    }
    this.data = this.cloneData(payload);
    this.persist();
    this.eventBus.emit('storeReset', { source: 'custom' });
    this.emitActiveContext();
  }

  findEntity(entityName, id) {
    const collectionKey = this.getCollectionKey(entityName);
    const primaryKey = this.getPrimaryKey(entityName);
    const collection = this.data[collectionKey];
    return collection.find((item) => item[primaryKey] === id) || null;
  }

  getAll(entityName) {
    const collectionKey = this.getCollectionKey(entityName);
    return this.cloneData(this.data[collectionKey]);
  }

  addEntity(entityName, payload) {
    const collectionKey = this.getCollectionKey(entityName);
    const primaryKey = this.getPrimaryKey(entityName);
    const record = { ...payload };
    if (!record[primaryKey]) {
      record[primaryKey] = this.generateId(entityName);
    }
    this.data[collectionKey].push(record);
    this.persist();
    this.emitEntityEvent(entityName, 'added', record);
    return this.cloneData(record);
  }

  updateEntity(entityName, id, updates) {
    const collectionKey = this.getCollectionKey(entityName);
    const primaryKey = this.getPrimaryKey(entityName);
    const collection = this.data[collectionKey];
    const index = collection.findIndex((item) => item[primaryKey] === id);
    if (index === -1) return null;

    const updated = { ...collection[index], ...updates };
    collection[index] = updated;
    this.persist();
    this.emitEntityEvent(entityName, 'updated', updated);
    return this.cloneData(updated);
  }

  removeEntity(entityName, id) {
    const collectionKey = this.getCollectionKey(entityName);
    const primaryKey = this.getPrimaryKey(entityName);
    const collection = this.data[collectionKey];
    const index = collection.findIndex((item) => item[primaryKey] === id);
    if (index === -1) return false;

    const [removed] = collection.splice(index, 1);
    this.persist();
    this.emitEntityEvent(entityName, 'removed', removed);
    return true;
  }

  emitActiveContext() {
    this.eventBus.emit('activeContextChanged', this.getActiveContext());
  }

  setActiveContext({ caseId = null, clientId = null }) {
    this.activeContext = { caseId, clientId };
    this.persistActiveContext();
    this.emitActiveContext();
  }

  setActiveCase(caseId) {
    const resolvedCaseId = caseId ?? null;
    const foundCase = resolvedCaseId ? this.findEntity('Case', resolvedCaseId) : null;
    const derivedClientId = foundCase?.clientId ?? this.activeContext.clientId ?? null;
    this.setActiveContext({ caseId: resolvedCaseId, clientId: derivedClientId });
  }

  setActiveClient(clientId) {
    this.setActiveContext({ ...this.activeContext, clientId });
  }

  getActiveContext() {
    return this.cloneData(this.activeContext);
  }

  getActiveCase() {
    if (!this.activeContext.caseId) return null;
    return this.findEntity('Case', this.activeContext.caseId);
  }

  emitEntityEvent(entityName, action, record) {
    const entityEventName = `${this.toCamel(entityName)}${this.capitalize(action)}`;
    this.eventBus.emit(entityEventName, { entity: entityName, record: this.cloneData(record) });
    this.eventBus.emit('storeChanged', { entity: entityName, action, record: this.cloneData(record) });
  }

  on(eventName, handler) {
    return this.eventBus.on(eventName, handler);
  }

  off(eventName, handler) {
    this.eventBus.off(eventName, handler);
  }

  toCamel(value) {
    return value.charAt(0).toLowerCase() + value.slice(1);
  }

  capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  // Convenience wrappers
  addCase(data) {
    return this.addEntity('Case', data);
  }

  updateCase(id, updates) {
    return this.updateEntity('Case', id, updates);
  }

  removeCase(id) {
    return this.removeEntity('Case', id);
  }

  addTimeEntry(data) {
    return this.addEntity('TimeEntry', data);
  }

  updateTimeEntry(id, updates) {
    return this.updateEntity('TimeEntry', id, updates);
  }

  addInvoice(data) {
    return this.addEntity('Invoice', data);
  }

  updateInvoice(id, updates) {
    return this.updateEntity('Invoice', id, updates);
  }

  addCommunication(data) {
    return this.addEntity('Communication', data);
  }

  updateCommunication(id, updates) {
    return this.updateEntity('Communication', id, updates);
  }

  addTemplate(data) {
    return this.addEntity('Template', data);
  }

  updateTemplate(id, updates) {
    return this.updateEntity('Template', id, updates);
  }

  addWorkflow(data) {
    return this.addEntity('Workflow', data);
  }

  updateWorkflow(id, updates) {
    return this.updateEntity('Workflow', id, updates);
  }
}

const verilexStore = new VeriLexStore({ dataModel: typeof window !== 'undefined' ? window.verilexDataModel : null });
verilexStore.initialize();

if (typeof window !== 'undefined') {
  window.verilexStore = verilexStore;
}

export { VeriLexStore, verilexStore };
