import { verilexStore } from './store.js';

(function () {
  const paletteItems = document.querySelectorAll('[data-workflow-step]');
  const canvas = document.getElementById('workflow-canvas');
  const connectionsSvg = document.getElementById('workflow-connections');
  const clearButton = document.getElementById('workflow-clear');
  const connectionList = document.getElementById('workflow-connection-list');
  const connectionSummary = document.getElementById('workflow-connection-summary');
  const connectionEmpty = document.getElementById('workflow-connection-empty');

  if (!canvas || !connectionsSvg) {
    console.warn('Workflow-Designer konnte nicht initialisiert werden.');
    return;
  }

  const nodes = new Map();
  let connections = [];
  let activeWorkflowId = null;
  let selection = null;
  let nodeCounter = 0;

  function serializeNodes() {
    const canvasRect = canvas.getBoundingClientRect();
    return Array.from(nodes.values()).map(({ id, label, element }) => ({
      id,
      label,
      position: {
        x: element.offsetLeft,
        y: element.offsetTop,
        width: element.offsetWidth,
        height: element.offsetHeight,
        canvasLeft: canvasRect.left,
        canvasTop: canvasRect.top,
      },
    }));
  }

  function persistWorkflow() {
    const payload = {
      name: 'Workflow Designer Entwurf',
      nodes: serializeNodes(),
      connections: connections.map((connection) => ({ ...connection })),
      updatedAt: new Date().toISOString(),
    };

    if (activeWorkflowId) {
      verilexStore.updateWorkflow(activeWorkflowId, payload);
    } else {
      const created = verilexStore.addWorkflow(payload);
      activeWorkflowId = created.id;
    }
  }

  function restoreWorkflow(workflow) {
    nodes.clear();
    connections = [];
    nodeCounter = 0;

    (workflow.nodes ?? []).forEach((node) => {
      const left = node.position?.x ?? 40;
      const top = node.position?.y ?? 40;
      createNode(node.label, { x: left, y: top }, node.id, true);
      const numericId = Number.parseInt(String(node.id).split('-').pop(), 10);
      if (!Number.isNaN(numericId)) {
        nodeCounter = Math.max(nodeCounter, numericId);
      }
    });

    connections = (workflow.connections ?? []).map((connection) => ({ ...connection }));
    updateConnections();
    renderConnectionList();
    updateConnectionSummary();
  }

  function ensureWorkflowLoaded() {
    const workflows = verilexStore.getAll('Workflow');
    const baseWorkflow = workflows[0];
    if (baseWorkflow) {
      activeWorkflowId = baseWorkflow.id;
      restoreWorkflow(baseWorkflow);
    } else {
      persistWorkflow();
    }
  }

  function updateConnectionSummary() {
    const count = connections.length;
    if (!connectionSummary) return;

    if (count === 0) {
      connectionSummary.textContent = 'Keine Verbindungen vorhanden.';
    } else if (count === 1) {
      connectionSummary.textContent = '1 Verbindung aktiv.';
    } else {
      connectionSummary.textContent = `${count} Verbindungen aktiv.`;
    }
  }

  function renderConnectionList() {
    if (!connectionList || !connectionEmpty) return;

    connectionList.innerHTML = '';
    if (connections.length === 0) {
      connectionEmpty.hidden = false;
      return;
    }

    connectionEmpty.hidden = true;
    const fragment = document.createDocumentFragment();

    connections.forEach((connection) => {
      const { id, fromId, toId } = connection;
      const fromNode = nodes.get(fromId);
      const toNode = nodes.get(toId);
      if (!fromNode || !toNode) {
        return;
      }

      const listItem = document.createElement('li');
      listItem.className = 'workflow-connection-item';
      listItem.dataset.connectionId = id;

      const label = document.createElement('span');
      label.className = 'workflow-connection__badge';
      label.innerHTML = `
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M8.59 16.59L13.17 12L8.59 7.41L10 6l6 6l-6 6z"
          ></path>
        </svg>
        <span>${fromNode.label} → ${toNode.label}</span>
      `;

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.textContent = 'Löschen';
      removeButton.addEventListener('click', () => {
        removeConnection(id);
      });

      listItem.append(label, removeButton);
      fragment.append(listItem);
    });

    connectionList.append(fragment);
  }

  function createNode(label, position, providedId = null, useOffsets = false) {
    const id = providedId || `node-${++nodeCounter}`;
    const nodeElement = document.createElement('div');
    nodeElement.className = 'workflow-node';
    nodeElement.dataset.nodeId = id;
    nodeElement.tabIndex = 0;

    const nodeLabel = document.createElement('span');
    nodeLabel.className = 'workflow-node__label';
    nodeLabel.textContent = label;

    const actions = document.createElement('div');
    actions.className = 'workflow-node__actions';

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'workflow-node__button';
    deleteButton.textContent = '×';
    deleteButton.title = `${label} entfernen`;
    deleteButton.setAttribute('aria-label', `${label} entfernen`);
    deleteButton.addEventListener('click', (event) => {
      event.stopPropagation();
      removeNode(id);
    });

    actions.append(deleteButton);
    nodeElement.append(nodeLabel, actions);

    canvas.append(nodeElement);

    if (useOffsets) {
      nodeElement.style.left = `${position.x}px`;
      nodeElement.style.top = `${position.y}px`;
    } else {
      const { x, y } = position;
      positionNode(nodeElement, x, y);
    }

    enableDragging(nodeElement);
    nodeElement.addEventListener('click', () => {
      if (nodeElement.dataset.moved === 'true') {
        delete nodeElement.dataset.moved;
        return;
      }
      handleNodeSelection(id);
    });

    nodeElement.addEventListener('keydown', (event) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        removeNode(id);
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleNodeSelection(id);
      }
    });

    nodes.set(id, { id, element: nodeElement, label });
    announceSelection(null);
    updateConnections();
    persistWorkflow();
    return nodeElement;
  }

  function positionNode(element, x, y) {
    const canvasRect = canvas.getBoundingClientRect();
    const nodeRect = element.getBoundingClientRect();
    const offsetX = x - canvasRect.left - nodeRect.width / 2;
    const offsetY = y - canvasRect.top - nodeRect.height / 2;

    const maxLeft = canvas.clientWidth - nodeRect.width;
    const maxTop = canvas.clientHeight - nodeRect.height;

    const clampedLeft = Math.max(0, Math.min(offsetX, maxLeft));
    const clampedTop = Math.max(0, Math.min(offsetY, maxTop));

    element.style.left = `${clampedLeft}px`;
    element.style.top = `${clampedTop}px`;
  }

  function enableDragging(element) {
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;
    let moved = false;

    const handlePointerDown = (event) => {
      if (!event.isPrimary) return;
      pointerId = event.pointerId;
      element.setPointerCapture(pointerId);
      element.classList.add('is-dragging');
      element.dataset.dragging = 'true';
      delete element.dataset.moved;
      startX = event.clientX;
      startY = event.clientY;
      initialLeft = parseFloat(element.style.left || '0');
      initialTop = parseFloat(element.style.top || '0');
      moved = false;
    };

    const handlePointerMove = (event) => {
      if (pointerId === null || event.pointerId !== pointerId) return;
      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;
      if (!moved && (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2)) {
        moved = true;
        element.dataset.moved = 'true';
      }
      const newLeft = initialLeft + deltaX;
      const newTop = initialTop + deltaY;

      const nodeRect = element.getBoundingClientRect();
      const maxLeft = canvas.clientWidth - nodeRect.width;
      const maxTop = canvas.clientHeight - nodeRect.height;

      const clampedLeft = Math.max(0, Math.min(newLeft, maxLeft));
      const clampedTop = Math.max(0, Math.min(newTop, maxTop));

      element.style.left = `${clampedLeft}px`;
      element.style.top = `${clampedTop}px`;
      updateConnections();
    };

    const handlePointerUp = (event) => {
      if (pointerId === null || event.pointerId !== pointerId) return;
      element.releasePointerCapture(pointerId);
      pointerId = null;
      element.classList.remove('is-dragging');
      delete element.dataset.dragging;
      if (!moved) {
        delete element.dataset.moved;
      }
      updateConnections();
      if (moved) {
        persistWorkflow();
      }
    };

    element.addEventListener('pointerdown', handlePointerDown);
    element.addEventListener('pointermove', handlePointerMove);
    element.addEventListener('pointerup', handlePointerUp);
    element.addEventListener('pointercancel', handlePointerUp);
  }

  function announceSelection(nodeId) {
    if (!canvas) return;
    if (nodeId) {
      canvas.dataset.currentSelection = nodeId;
    } else {
      canvas.dataset.currentSelection = '';
    }
  }

  function handleNodeSelection(nodeId) {
    const node = nodes.get(nodeId);
    if (!node) return;

    if (selection && selection !== nodeId) {
      addConnection(selection, nodeId);
      setSelection(null);
      return;
    }

    if (selection === nodeId) {
      setSelection(null);
    } else {
      setSelection(nodeId);
    }
  }

  function setSelection(nodeId) {
    selection = nodeId;
    nodes.forEach(({ element }) => {
      if (selection === element.dataset.nodeId) {
        element.classList.add('is-selected');
      } else {
        element.classList.remove('is-selected');
      }
    });
    announceSelection(nodeId);
  }

  function removeNode(nodeId) {
    const node = nodes.get(nodeId);
    if (!node) return;

    node.element.remove();
    nodes.delete(nodeId);
    setSelection(null);
    connections = connections.filter((connection) => {
      return connection.fromId !== nodeId && connection.toId !== nodeId;
    });
    updateConnections();
    renderConnectionList();
    updateConnectionSummary();
    persistWorkflow();
  }

  function addConnection(fromId, toId) {
    if (fromId === toId) {
      return;
    }
    const exists = connections.some(
      (connection) => connection.fromId === fromId && connection.toId === toId
    );
    if (exists) {
      return;
    }

    const id = `connection-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    connections.push({ id, fromId, toId });
    updateConnections();
    renderConnectionList();
    updateConnectionSummary();
    persistWorkflow();
  }

  function removeConnection(connectionId) {
    connections = connections.filter((connection) => connection.id !== connectionId);
    updateConnections();
    renderConnectionList();
    updateConnectionSummary();
    persistWorkflow();
  }

  function updateConnections() {
    if (!connectionsSvg) return;
    const canvasRect = canvas.getBoundingClientRect();
    connectionsSvg.setAttribute('viewBox', `0 0 ${canvasRect.width} ${canvasRect.height}`);
    connectionsSvg.innerHTML = '';

    const lineFragment = document.createDocumentFragment();

    connections.forEach((connection) => {
      const fromNode = nodes.get(connection.fromId);
      const toNode = nodes.get(connection.toId);
      if (!fromNode || !toNode) {
        return;
      }

      const fromRect = fromNode.element.getBoundingClientRect();
      const toRect = toNode.element.getBoundingClientRect();

      const x1 = fromRect.left - canvasRect.left + fromRect.width / 2;
      const y1 = fromRect.top - canvasRect.top + fromRect.height / 2;
      const x2 = toRect.left - canvasRect.left + toRect.width / 2;
      const y2 = toRect.top - canvasRect.top + toRect.height / 2;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(x1));
      line.setAttribute('y1', String(y1));
      line.setAttribute('x2', String(x2));
      line.setAttribute('y2', String(y2));
      line.setAttribute('stroke', 'rgba(47, 116, 192, 0.7)');
      line.setAttribute('stroke-width', '3');
      line.setAttribute('marker-end', 'url(#workflow-arrowhead)');
      line.setAttribute('stroke-linecap', 'round');

      lineFragment.append(line);
    });

    injectArrowhead();
    connectionsSvg.append(lineFragment);
  }

  function injectArrowhead() {
    if (connectionsSvg.querySelector('defs')) {
      return;
    }
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'workflow-arrowhead');
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '10');
    marker.setAttribute('refX', '6');
    marker.setAttribute('refY', '3');
    marker.setAttribute('orient', 'auto');
    marker.setAttribute('markerUnits', 'strokeWidth');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M0,0 L6,3 L0,6 Z');
    path.setAttribute('fill', 'rgba(47, 116, 192, 0.8)');

    marker.append(path);
    defs.append(marker);
    connectionsSvg.prepend(defs);
  }

  function handlePaletteDragStart(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const label = target.dataset.workflowStep;
    if (!label) return;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
    }
    event.dataTransfer?.setData('text/plain', label);
  }

  function handleCanvasDragOver(event) {
    event.preventDefault();
  }

  function handleCanvasDrop(event) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    const label = event.dataTransfer?.getData('text/plain');
    if (!label) return;
    createNode(label, { x: event.clientX, y: event.clientY });
    renderConnectionList();
    updateConnectionSummary();
  }

  function clearWorkflow() {
    nodes.forEach(({ element }) => element.remove());
    nodes.clear();
    connections = [];
    setSelection(null);
    updateConnections();
    renderConnectionList();
    updateConnectionSummary();
    persistWorkflow();
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      setSelection(null);
      return;
    }
    if (event.key !== 'Delete' && event.key !== 'Backspace') return;
    if (!selection) return;
    event.preventDefault();
    removeNode(selection);
  }

  paletteItems.forEach((item) => {
    item.addEventListener('dragstart', handlePaletteDragStart);
    item.addEventListener('click', () => {
      const rect = canvas.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      createNode(item.dataset.workflowStep ?? 'Baustein', { x: centerX, y: centerY });
      renderConnectionList();
      updateConnectionSummary();
    });
  });

  canvas.addEventListener('dragover', handleCanvasDragOver);
  canvas.addEventListener('drop', handleCanvasDrop);
  canvas.addEventListener('keydown', handleKeyDown);
  window.addEventListener('resize', updateConnections);

  ensureWorkflowLoaded();

  if (clearButton) {
    clearButton.addEventListener('click', () => {
      clearWorkflow();
      canvas.focus();
    });
  }

  updateConnectionSummary();
})();
