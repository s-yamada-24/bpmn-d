document.addEventListener('DOMContentLoaded', () => {
    console.log('BPMN Editor Initialized');

    // --- State ---
    window.connections = [];
    window.pools = []; // Pool data structure
    window.nextId = 1;
    window.selectedElementId = null;
    window.selectedConnectionId = null;
    window.selectedPoolId = null;

    // Interaction State
    let currentAction = null;
    let activeElement = null;
    let activeConnection = null;
    let activePool = null;
    let activeLane = null;
    let dragStartPos = { x: 0, y: 0 };
    let elementStartPos = { left: 0, top: 0 };

    // Zoom & Pan State
    let scale = 1;
    let pan = { x: 0, y: 0 };
    let isPanning = false;
    let panStart = { x: 0, y: 0 };

    // Connection State
    let connectionSource = { id: null, port: null, element: null };
    let dragLine = null;

    // --- DOM Elements ---
    const canvasLayer = document.getElementById('canvas-layer');
    const canvasContainer = document.getElementById('canvas-container');
    const canvasContent = document.getElementById('canvas-content');
    const connectionsLayer = document.getElementById('connections-layer');
    const poolLayer = document.getElementById('pool-layer');

    // --- Sidebar Resizing Logic ---
    setupResizer('left-sidebar', 'left-resizer', true);
    setupResizer('right-sidebar', 'right-resizer', false);

    function setupResizer(sidebarId, resizerId, isLeft) {
        const sidebar = document.getElementById(sidebarId);
        const resizer = document.getElementById(resizerId);
        if (!sidebar || !resizer) return;

        let isResizing = false;

        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.body.style.cursor = 'col-resize';
            resizer.classList.add('active');
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            e.preventDefault();
            let newWidth = isLeft ? e.clientX : window.innerWidth - e.clientX;
            if (newWidth > 150 && newWidth < 500) {
                sidebar.style.width = `${newWidth}px`;
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = 'default';
                resizer.classList.remove('active');
            }
        });
    }

    // --- Palette Drag and Drop ---
    let paletteDraggedType = null;

    document.querySelectorAll('.palette-item').forEach(item => {
        item.addEventListener('dragstart', (e) => {
            paletteDraggedType = item.dataset.type;
            e.dataTransfer.effectAllowed = 'copy';
        });
    });

    canvasContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });

    canvasContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        if (paletteDraggedType) {
            const rect = canvasLayer.getBoundingClientRect();
            const x = (e.clientX - rect.left) / scale;
            const y = (e.clientY - rect.top) / scale;

            if (paletteDraggedType === 'pool') {
                createPool(x, y);
            } else {
                createBPMNElement(paletteDraggedType, x, y);
            }
            paletteDraggedType = null;
        }
    });

    // --- Zoom & Pan Logic ---
    const gridLayer = document.getElementById('grid-layer');

    function updateCanvasTransform() {
        canvasContent.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${scale})`;
        document.getElementById('zoom-level').innerText = `${Math.round(scale * 100)}%`;

        // Update grid size dynamically to keep it visible at all zoom levels
        const gridSize = 20 * scale;
        if (gridLayer) {
            gridLayer.style.backgroundSize = `${gridSize}px ${gridSize}px`;
        }
    }

    canvasContainer.addEventListener('wheel', (e) => {
        e.preventDefault();

        // Zoom with mouse wheel (no Ctrl needed)
        const rect = canvasContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Mouse position in canvas coordinates before zoom
        const canvasX = (mouseX - pan.x) / scale;
        const canvasY = (mouseY - pan.y) / scale;

        const zoomSpeed = 0.1;
        const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
        const newScale = Math.min(Math.max(0.1, scale + delta), 5);

        // Adjust pan to keep mouse position fixed
        pan.x = mouseX - canvasX * newScale;
        pan.y = mouseY - canvasY * newScale;

        scale = newScale;
        updateCanvasTransform();
    });

    canvasContainer.addEventListener('mousedown', (e) => {
        // Pan with left click or middle click
        if (e.button === 0 || e.button === 1) {
            // Check if clicking on an element
            const target = e.target;
            if (target.closest('.bpmn-element') || target.closest('.connection-port')) {
                return; // Let element interaction happen
            }

            e.preventDefault();
            isPanning = true;
            panStart = { x: e.clientX, y: e.clientY };
            canvasContainer.style.cursor = 'grabbing';
        }
    });

    // --- Global Mouse Move ---
    document.addEventListener('mousemove', (e) => {
        if (isPanning) {
            const dx = e.clientX - panStart.x;
            const dy = e.clientY - panStart.y;
            pan.x += dx;
            pan.y += dy;
            panStart = { x: e.clientX, y: e.clientY };
            updateCanvasTransform();
            return;
        }

        if (currentAction === 'moving' && activeElement) {
            e.preventDefault();
            const dx = (e.clientX - dragStartPos.x) / scale;
            const dy = (e.clientY - dragStartPos.y) / scale;

            const newLeft = elementStartPos.left + dx;
            const newTop = elementStartPos.top + dy;

            activeElement.style.left = `${newLeft}px`;
            activeElement.style.top = `${newTop}px`;

            updateConnections(activeElement.id);
        } else if (currentAction === 'moving-pool' && activePool) {
            e.preventDefault();
            const dx = (e.clientX - dragStartPos.x) / scale;
            const dy = (e.clientY - dragStartPos.y) / scale;

            const newLeft = elementStartPos.left + dx;
            const newTop = elementStartPos.top + dy;

            activePool.element.style.left = `${newLeft}px`;
            activePool.element.style.top = `${newTop}px`;

            // Move child elements
            activePool.lanes.forEach(lane => {
                lane.childElements.forEach(childId => {
                    const childEl = document.getElementById(childId);
                    if (childEl) {
                        const childLeft = parseFloat(childEl.dataset.offsetX || 0);
                        const childTop = parseFloat(childEl.dataset.offsetY || 0);
                        childEl.style.left = `${newLeft + childLeft}px`;
                        childEl.style.top = `${newTop + childTop}px`;
                        updateConnections(childId);
                    }
                });
            });
        } else if (currentAction === 'resizing-pool' && activePool) {
            e.preventDefault();
            const rect = canvasLayer.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left) / scale;
            const poolLeft = parseFloat(activePool.element.style.left);
            const newWidth = Math.max(200, mouseX - poolLeft);
            activePool.element.style.width = `${newWidth}px`;
        } else if (currentAction === 'resizing-lane' && activeLane) {
            e.preventDefault();
            const rect = canvasLayer.getBoundingClientRect();
            const mouseY = (e.clientY - rect.top) / scale;
            const laneTop = activeLane.element.getBoundingClientRect().top;
            const laneTopCanvas = (laneTop - rect.top) / scale;
            const oldHeight = activeLane.height;
            const newHeight = Math.max(100, mouseY - laneTopCanvas);
            const heightDelta = newHeight - oldHeight;

            activeLane.element.style.height = `${newHeight}px`;
            activeLane.height = newHeight;

            // Adjust elements in subsequent lanes
            if (heightDelta !== 0) {
                adjustSubsequentLaneElements(activePool, activeLane, heightDelta);
            }

            updatePoolHeight(activePool);
        } else if (currentAction === 'connecting' && dragLine) {
            e.preventDefault();
            const rect = canvasLayer.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left) / scale;
            const mouseY = (e.clientY - rect.top) / scale;

            const startX = parseFloat(dragLine.dataset.startX);
            const startY = parseFloat(dragLine.dataset.startY);

            const d = `M ${startX} ${startY} L ${mouseX} ${mouseY}`;
            dragLine.setAttribute('d', d);
        } else if (currentAction === 'adjusting-flow' && activeConnection) {
            e.preventDefault();
            const rect = canvasLayer.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left) / scale;
            const mouseY = (e.clientY - rect.top) / scale;

            // Check if both elements are in the same pool
            const sourceEl = document.getElementById(activeConnection.sourceId);
            const targetEl = document.getElementById(activeConnection.targetId);
            const sourcePoolId = sourceEl?.dataset.poolId;
            const targetPoolId = targetEl?.dataset.poolId;

            if (sourcePoolId && sourcePoolId === targetPoolId) {
                // Store as pool-relative coordinates
                const pool = pools.find(p => p.id === sourcePoolId);
                if (pool) {
                    const poolLeft = parseFloat(pool.element.style.left);
                    const poolTop = parseFloat(pool.element.style.top);

                    if (activeConnection.midPoint.vertical) {
                        activeConnection.midPoint.x = mouseX - poolLeft;
                        activeConnection.midPoint.poolRelative = true;
                    } else {
                        activeConnection.midPoint.y = mouseY - poolTop;
                        activeConnection.midPoint.poolRelative = true;
                    }
                }
            } else {
                // Store as absolute canvas coordinates
                if (activeConnection.midPoint.vertical) {
                    activeConnection.midPoint.x = mouseX;
                } else {
                    activeConnection.midPoint.y = mouseY;
                }
                activeConnection.midPoint.poolRelative = false;
            }

            updateConnectionPath(activeConnection);
        }
    });

    // --- Global Mouse Up ---
    document.addEventListener('mouseup', (e) => {
        if (isPanning) {
            isPanning = false;
            canvasContainer.style.cursor = 'default';
            return;
        }

        if (currentAction === 'moving') {
            // Check if element is dropped into a lane
            checkLaneAssignment(activeElement);
            currentAction = null;
            activeElement = null;
            document.body.style.cursor = 'default';
        } else if (currentAction === 'moving-pool') {
            currentAction = null;
            activePool = null;
            document.body.style.cursor = 'default';
        } else if (currentAction === 'resizing-pool') {
            currentAction = null;
            if (activePool && activePool.resizeHandle) {
                activePool.resizeHandle.classList.remove('active');
            }
            activePool = null;
            document.body.style.cursor = 'default';
        } else if (currentAction === 'resizing-lane') {
            currentAction = null;
            if (activeLane && activeLane.resizeHandle) {
                activeLane.resizeHandle.classList.remove('active');
            }
            activeLane = null;
            activePool = null;
            document.body.style.cursor = 'default';
        } else if (currentAction === 'connecting') {
            finishConnection(e);
        } else if (currentAction === 'adjusting-flow') {
            currentAction = null;
            if (activeConnection && activeConnection.handleElement) {
                activeConnection.handleElement.classList.remove('active');
            }
            activeConnection = null;
            document.body.style.cursor = 'default';
        }
    });

    // --- Pool Creation ---
    function createPool(x, y, id = null, data = null) {
        const finalId = id || `pool_${window.nextId++}`;
        const poolEl = document.createElement('div');
        poolEl.classList.add('bpmn-element', 'pool');
        poolEl.id = finalId;
        poolEl.style.left = `${x}px`;
        poolEl.style.top = `${y}px`;

        const header = document.createElement('div');
        header.classList.add('pool-header');
        const headerText = document.createElement('div');
        headerText.classList.add('pool-header-text');
        headerText.innerText = (data && data.name) ? data.name : 'Pool';
        header.appendChild(headerText);

        const content = document.createElement('div');
        content.classList.add('pool-content');

        const resizeHandle = document.createElement('div');
        resizeHandle.classList.add('pool-resize-handle');

        poolEl.appendChild(header);
        poolEl.appendChild(content);
        poolEl.appendChild(resizeHandle);

        const poolLayer = document.getElementById('pool-layer');
        if (poolLayer) {
            poolLayer.appendChild(poolEl);
        } else {
            canvasLayer.appendChild(poolEl);
        }

        if (data) {
            poolEl.style.width = `${data.width}px`;
            poolEl.style.height = `${data.height}px`;
        }

        const pool = {
            id: finalId,
            element: poolEl,
            header: headerText,
            content: content,
            resizeHandle: resizeHandle,
            lanes: [],
            name: (data && data.name) ? data.name : 'Pool',
            memo: (data && data.memo) ? data.memo : ''
        };

        window.pools.push(pool);

        poolEl.addEventListener('mousedown', (e) => {
            if (e.target.closest('.pool-resize-handle') || e.target.closest('.lane-resize-handle')) {
                return;
            }
            e.stopPropagation();
            startPoolMove(pool, e);
        });

        resizeHandle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            startPoolResize(pool, e);
        });

        poolEl.addEventListener('click', (e) => {
            e.stopPropagation();
            selectPool(finalId);
        });

        const width = poolEl.offsetWidth;
        const height = poolEl.offsetHeight;
        if (!data) {
            poolEl.style.left = `${x - width / 2}px`;
            poolEl.style.top = `${y - height / 2}px`;
        }

        if (data && data.lanes) {
            data.lanes.forEach(laneData => {
                addLaneToPool(pool, laneData);
            });
        } else {
            addLaneToPool(pool);
        }
    }

    function addLaneToPool(pool, data = null) {
        const laneId = (data && data.id) ? data.id : `lane_${window.nextId++}`;
        const laneEl = document.createElement('div');
        laneEl.classList.add('lane');
        laneEl.id = laneId;
        laneEl.style.height = (data && data.height) ? `${data.height}px` : '200px';

        const laneHeader = document.createElement('div');
        laneHeader.classList.add('lane-header');
        const laneHeaderText = document.createElement('div');
        laneHeaderText.classList.add('lane-header-text');
        laneHeaderText.innerText = (data && data.name) ? data.name : `Lane ${pool.lanes.length + 1}`;
        laneHeader.appendChild(laneHeaderText);

        const laneContent = document.createElement('div');
        laneContent.classList.add('lane-content');

        const laneResizeHandle = document.createElement('div');
        laneResizeHandle.classList.add('lane-resize-handle');

        laneEl.appendChild(laneHeader);
        laneEl.appendChild(laneContent);
        laneEl.appendChild(laneResizeHandle);

        pool.content.appendChild(laneEl);

        const lane = {
            id: laneId,
            element: laneEl,
            header: laneHeaderText,
            content: laneContent,
            resizeHandle: laneResizeHandle,
            height: (data && data.height) ? data.height : 200,
            name: (data && data.name) ? data.name : `Lane ${pool.lanes.length + 1}`,
            childElements: []
        };

        pool.lanes.push(lane);

        laneResizeHandle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            startLaneResize(pool, lane, e);
        });

        updatePoolHeight(pool);
    }

    function deleteLaneFromPool(pool, laneId) {
        const laneIndex = pool.lanes.findIndex(l => l.id === laneId);
        if (laneIndex === -1 || pool.lanes.length <= 1) return;

        const lane = pool.lanes[laneIndex];

        if (lane.childElements.length > 0) {
            const targetLane = pool.lanes[laneIndex - 1] || pool.lanes[laneIndex + 1];
            if (targetLane) {
                lane.childElements.forEach(childId => {
                    const childEl = document.getElementById(childId);
                    if (childEl) {
                        targetLane.childElements.push(childId);
                        childEl.dataset.laneId = targetLane.id;
                    }
                });
            }
        }

        lane.element.remove();
        pool.lanes.splice(laneIndex, 1);
        updatePoolHeight(pool);
    }

    function updatePoolHeight(pool) {
        const totalHeight = pool.lanes.reduce((sum, lane) => sum + lane.height, 0);
        pool.element.style.height = `${totalHeight}px`;
    }

    function startPoolMove(pool, e) {
        if (currentAction) return;
        currentAction = 'moving-pool';
        activePool = pool;
        dragStartPos = { x: e.clientX, y: e.clientY };
        elementStartPos = {
            left: parseFloat(pool.element.style.left),
            top: parseFloat(pool.element.style.top)
        };
        selectPool(pool.id);
        document.body.style.cursor = 'move';
    }

    function startPoolResize(pool, e) {
        if (currentAction) return;
        currentAction = 'resizing-pool';
        activePool = pool;
        pool.resizeHandle.classList.add('active');
        document.body.style.cursor = 'ew-resize';
    }

    function moveLaneUp(pool, laneId) {
        const laneIndex = pool.lanes.findIndex(l => l.id === laneId);
        if (laneIndex <= 0) return;

        [pool.lanes[laneIndex - 1], pool.lanes[laneIndex]] = [pool.lanes[laneIndex], pool.lanes[laneIndex - 1]];
        rebuildPoolLanes(pool);
    }

    function moveLaneDown(pool, laneId) {
        const laneIndex = pool.lanes.findIndex(l => l.id === laneId);
        if (laneIndex === -1 || laneIndex >= pool.lanes.length - 1) return;

        [pool.lanes[laneIndex], pool.lanes[laneIndex + 1]] = [pool.lanes[laneIndex + 1], pool.lanes[laneIndex]];
        rebuildPoolLanes(pool);
    }

    function rebuildPoolLanes(pool) {
        pool.content.innerHTML = '';
        const poolTop = parseFloat(pool.element.style.top);
        pool.lanes.forEach((lane, idx) => {
            pool.content.appendChild(lane.element);
            lane.header.innerText = lane.name;

            const laneOffsetFromPoolTop = pool.lanes.slice(0, idx).reduce((sum, l) => sum + l.height, 0);

            lane.childElements.forEach(childId => {
                const childEl = document.getElementById(childId);
                if (childEl) {
                    const currentAbsoluteTop = parseFloat(childEl.style.top);
                    const newTop = poolTop + laneOffsetFromPoolTop + (currentAbsoluteTop - poolTop - laneOffsetFromPoolTop);
                    updateConnections(childId);
                }
            });
        });
    }

    function adjustSubsequentLaneElements(pool, resizedLane, heightDelta) {
        const laneIndex = pool.lanes.findIndex(l => l.id === resizedLane.id);
        if (laneIndex === -1) return;

        for (let i = laneIndex + 1; i < pool.lanes.length; i++) {
            const lane = pool.lanes[i];
            lane.childElements.forEach(childId => {
                const childEl = document.getElementById(childId);
                if (childEl) {
                    const currentTop = parseFloat(childEl.style.top);
                    const newTop = currentTop + heightDelta;
                    childEl.style.top = `${newTop}px`;
                    const poolTop = parseFloat(pool.element.style.top);
                    childEl.dataset.offsetY = newTop - poolTop;
                    updateConnections(childId);
                }
            });
        }
    }

    function startLaneResize(pool, lane, e) {
        if (currentAction) return;
        currentAction = 'resizing-lane';
        activePool = pool;
        activeLane = lane;
        lane.resizeHandle.classList.add('active');
        document.body.style.cursor = 'ns-resize';
    }

    function checkLaneAssignment(element) {
        if (!element || element.classList.contains('pool')) return;

        const elRect = element.getBoundingClientRect();
        const elCenterX = elRect.left + elRect.width / 2;
        const elCenterY = elRect.top + elRect.height / 2;

        window.pools.forEach(pool => {
            pool.lanes.forEach(lane => {
                const index = lane.childElements.indexOf(element.id);
                if (index > -1) {
                    lane.childElements.splice(index, 1);
                    delete element.dataset.laneId;
                    delete element.dataset.poolId;
                }
            });
        });

        for (const pool of window.pools) {
            const poolRect = pool.element.getBoundingClientRect();
            if (elCenterX >= poolRect.left && elCenterX <= poolRect.right &&
                elCenterY >= poolRect.top && elCenterY <= poolRect.bottom) {

                for (const lane of pool.lanes) {
                    const laneRect = lane.element.getBoundingClientRect();
                    if (elCenterY >= laneRect.top && elCenterY <= laneRect.bottom) {
                        lane.childElements.push(element.id);
                        element.dataset.laneId = lane.id;
                        element.dataset.poolId = pool.id;

                        const poolLeft = parseFloat(pool.element.style.left);
                        const poolTop = parseFloat(pool.element.style.top);
                        const elLeft = parseFloat(element.style.left);
                        const elTop = parseFloat(element.style.top);
                        element.dataset.offsetX = elLeft - poolLeft;
                        element.dataset.offsetY = elTop - poolTop;
                        break;
                    }
                }
                break;
            }
        }
    }

    // --- Element Creation ---
    function createBPMNElement(type, x, y, id = null, data = null) {
        const finalId = id || `element_${window.nextId++}`;
        const el = document.createElement('div');
        el.classList.add('bpmn-element', type);
        el.id = finalId;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;

        el.innerHTML = window.getIconSvg(type);

        const label = document.createElement('span');
        label.classList.add('element-label');
        label.innerText = (data && data.label) ? data.label : type.replace(/-/g, ' ');
        el.appendChild(label);
        if (data && data.label) el.classList.add('has-label');
        else el.classList.add('has-label');

        if (data) {
            if (data.memo) el.dataset.memo = data.memo;
            if (data.poolId) el.dataset.poolId = data.poolId;
            if (data.laneId) el.dataset.laneId = data.laneId;
            if (data.offsetX) el.dataset.offsetX = data.offsetX;
            if (data.offsetY) el.dataset.offsetY = data.offsetY;

            // Restore type-specific properties
            // Event properties
            if (type.includes('event')) {
                if (data.timing) el.dataset.timing = data.timing;
                if (data.method) el.dataset.method = data.method;
            }

            // Activity (Task) properties
            if (type.includes('task')) {
                if (data.code) el.dataset.code = data.code;
                if (data.effort) el.dataset.effort = data.effort;
                if (data.method) el.dataset.method = data.method;
            }

            // Gateway properties
            if (type.includes('gateway')) {
                if (data.decision) el.dataset.decision = data.decision;
            }
        }

        ['top', 'right', 'bottom', 'left'].forEach(pos => {
            const port = document.createElement('div');
            port.classList.add('connection-port', pos);
            port.dataset.position = pos;

            port.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                startConnection(finalId, pos, port, e);
            });

            el.appendChild(port);
        });

        el.addEventListener('mousedown', (e) => {
            if (e.target.closest('.connection-port')) return;
            e.stopPropagation();
            startElementMove(el, e);
        });

        el.addEventListener('click', (e) => {
            e.stopPropagation();
            selectElement(finalId);
        });

        canvasLayer.appendChild(el);

        const width = el.offsetWidth;
        const height = el.offsetHeight;
        if (!data) {
            el.style.left = `${x - width / 2}px`;
            el.style.top = `${y - height / 2}px`;
        }

        checkLaneAssignment(el);
    }

    function startElementMove(el, e) {
        if (currentAction) return;

        currentAction = 'moving';
        activeElement = el;
        dragStartPos = { x: e.clientX, y: e.clientY };
        elementStartPos = {
            left: parseFloat(el.style.left),
            top: parseFloat(el.style.top)
        };

        selectElement(el.id);
        document.body.style.cursor = 'move';
    }

    // --- Connection Logic ---
    function startConnection(sourceId, sourcePort, portEl, e) {
        if (currentAction) return;

        currentAction = 'connecting';
        connectionSource = { id: sourceId, port: sourcePort };

        const rect = canvasLayer.getBoundingClientRect();
        const portRect = portEl.getBoundingClientRect();

        const startX = (portRect.left + portRect.width / 2 - rect.left) / scale;
        const startY = (portRect.top + portRect.height / 2 - rect.top) / scale;

        dragLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        dragLine.classList.add('drag-line');
        dragLine.dataset.startX = startX;
        dragLine.dataset.startY = startY;
        dragLine.setAttribute('d', `M ${startX} ${startY} L ${startX} ${startY}`);
        connectionsLayer.appendChild(dragLine);

        document.body.style.cursor = 'crosshair';
    }

    function finishConnection(e) {
        const targetPortEl = e.target.closest('.connection-port');

        if (targetPortEl) {
            const targetEl = targetPortEl.closest('.bpmn-element');
            const targetPort = targetPortEl.dataset.position;

            if (targetEl && targetEl.id !== connectionSource.id) {
                createConnection(connectionSource.id, connectionSource.port, targetEl.id, targetPort);
            }
        }

        if (dragLine) {
            dragLine.remove();
            dragLine = null;
        }
        currentAction = null;
        connectionSource = { id: null, port: null };
        document.body.style.cursor = 'default';
    }

    function createConnection(sourceId, sourcePort, targetId, targetPort, id = null, data = null) {
        const exists = window.connections.some(c =>
            c.sourceId === sourceId && c.targetId === targetId &&
            c.sourcePort === sourcePort && c.targetPort === targetPort
        );
        if (exists) return;

        const finalId = id || `flow_${window.nextId++}`;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.classList.add('connection-line');
        path.setAttribute('marker-end', 'url(#arrowhead)');
        path.id = finalId;

        path.addEventListener('click', (e) => {
            e.stopPropagation();
            selectConnection(finalId);
        });

        connectionsLayer.appendChild(path);

        const handle = document.createElement('div');
        handle.classList.add('connection-segment-handle');
        canvasLayer.appendChild(handle);

        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            startFlowAdjustment(conn, e);
        });

        const label = document.createElement('div');
        label.classList.add('connection-label');
        canvasLayer.appendChild(label);

        const conn = {
            id: finalId,
            sourceId,
            sourcePort,
            targetId,
            targetPort,
            element: path,
            handleElement: handle,
            labelElement: label,
            midPoint: (data && data.midPoint) ? data.midPoint : null,
            name: (data && data.name) ? data.name : '',
            type: (data && data.type) ? data.type : 'solid',
            memo: (data && data.memo) ? data.memo : '',
            textAlignH: (data && data.textAlignH) ? data.textAlignH : 'center',
            textAlignV: (data && data.textAlignV) ? data.textAlignV : 'center'
        };
        window.connections.push(conn);
        updateConnectionPath(conn);
    }

    function startFlowAdjustment(conn, e) {
        if (currentAction) return;
        currentAction = 'adjusting-flow';
        activeConnection = conn;
        if (conn.handleElement) {
            conn.handleElement.classList.add('active');
        }
        document.body.style.cursor = 'grab';
    }

    function updateConnectionPath(conn) {
        const sourceEl = document.getElementById(conn.sourceId);
        const targetEl = document.getElementById(conn.targetId);
        if (!sourceEl || !targetEl) return;

        // Use style-based coordinates instead of getBoundingClientRect to avoid rendering artifacts
        const sourceX = parseFloat(sourceEl.style.left) || 0;
        const sourceY = parseFloat(sourceEl.style.top) || 0;
        const sourceW = sourceEl.offsetWidth;
        const sourceH = sourceEl.offsetHeight;

        const targetX = parseFloat(targetEl.style.left) || 0;
        const targetY = parseFloat(targetEl.style.top) || 0;
        const targetW = targetEl.offsetWidth;
        const targetH = targetEl.offsetHeight;

        let p1 = { x: 0, y: 0 };
        let p2 = { x: 0, y: 0 };

        // Calculate source port position
        switch (conn.sourcePort) {
            case 'top': p1 = { x: sourceX + sourceW / 2, y: sourceY }; break;
            case 'right': p1 = { x: sourceX + sourceW, y: sourceY + sourceH / 2 }; break;
            case 'bottom': p1 = { x: sourceX + sourceW / 2, y: sourceY + sourceH }; break;
            case 'left': p1 = { x: sourceX, y: sourceY + sourceH / 2 }; break;
        }

        // Calculate target port position
        switch (conn.targetPort) {
            case 'top': p2 = { x: targetX + targetW / 2, y: targetY }; break;
            case 'right': p2 = { x: targetX + targetW, y: targetY + targetH / 2 }; break;
            case 'bottom': p2 = { x: targetX + targetW / 2, y: targetY + targetH }; break;
            case 'left': p2 = { x: targetX, y: targetY + targetH / 2 }; break;
        }

        const dir1 = conn.sourcePort;
        const dir2 = conn.targetPort;
        const isHorz1 = (dir1 === 'left' || dir1 === 'right');
        const isHorz2 = (dir2 === 'left' || dir2 === 'right');

        let points = [p1];



        // Check if both elements are in the same pool
        const sourcePoolId = sourceEl.dataset.poolId;
        const targetPoolId = targetEl.dataset.poolId;
        const inSamePool = sourcePoolId && sourcePoolId === targetPoolId;
        const pool = inSamePool ? pools.find(p => p.id === sourcePoolId) : null;

        if (isHorz1 && !isHorz2) {
            points.push({ x: p2.x, y: p1.y });
            conn.midPoint = null;
        } else if (!isHorz1 && isHorz2) {
            points.push({ x: p1.x, y: p2.y });
            conn.midPoint = null;
        } else if (isHorz1 && isHorz2) {
            if (!conn.midPoint) {
                const midX = (p1.x + p2.x) / 2;
                conn.midPoint = {
                    x: inSamePool ? midX - parseFloat(pool.element.style.left) : midX,
                    y: 0,
                    vertical: true,
                    poolRelative: inSamePool
                };
            }
            const actualMidX = conn.midPoint.poolRelative && pool ?
                conn.midPoint.x + parseFloat(pool.element.style.left) : conn.midPoint.x;
            points.push({ x: actualMidX, y: p1.y });
            points.push({ x: actualMidX, y: p2.y });
        } else {
            if (!conn.midPoint) {
                const midY = (p1.y + p2.y) / 2;
                conn.midPoint = {
                    x: 0,
                    y: inSamePool ? midY - parseFloat(pool.element.style.top) : midY,
                    vertical: false,
                    poolRelative: inSamePool
                };
            }
            const actualMidY = conn.midPoint.poolRelative && pool ?
                conn.midPoint.y + parseFloat(pool.element.style.top) : conn.midPoint.y;
            points.push({ x: p1.x, y: actualMidY });
            points.push({ x: p2.x, y: actualMidY });
        }

        points.push(p2);

        const d = drawPathWithRadius(points);
        conn.element.setAttribute('d', d);

        if (conn.handleElement) {
            if (conn.midPoint) {
                conn.handleElement.style.display = 'block';
                if (conn.midPoint.vertical) {
                    const actualMidX = conn.midPoint.poolRelative && pool ?
                        conn.midPoint.x + parseFloat(pool.element.style.left) : conn.midPoint.x;
                    conn.handleElement.style.left = `${actualMidX}px`;
                    conn.handleElement.style.top = `${(p1.y + p2.y) / 2}px`;
                } else {
                    const actualMidY = conn.midPoint.poolRelative && pool ?
                        conn.midPoint.y + parseFloat(pool.element.style.top) : conn.midPoint.y;
                    conn.handleElement.style.left = `${(p1.x + p2.x) / 2}px`;
                    conn.handleElement.style.top = `${actualMidY}px`;
                }
            } else {
                conn.handleElement.style.display = 'none';
            }
        }

        if (conn.labelElement) {
            if (conn.name) {
                conn.labelElement.innerText = conn.name;
                conn.labelElement.classList.add('visible');

                let lx, ly;
                if (conn.midPoint) {
                    if (conn.midPoint.vertical) {
                        lx = conn.midPoint.poolRelative && pool ?
                            conn.midPoint.x + parseFloat(pool.element.style.left) : conn.midPoint.x;
                        ly = (p1.y + p2.y) / 2;
                    } else {
                        lx = (p1.x + p2.x) / 2;
                        ly = conn.midPoint.poolRelative && pool ?
                            conn.midPoint.y + parseFloat(pool.element.style.top) : conn.midPoint.y;
                    }
                } else {
                    lx = (p1.x + p2.x) / 2;
                    ly = (p1.y + p2.y) / 2;
                }

                // Calculate dimensions for dynamic offset (based on X/Y lengths separately)
                const width = Math.abs(p2.x - p1.x);
                const height = Math.abs(p2.y - p1.y);

                // Apply text alignment offsets (dynamic based on respective lengths)
                const textAlignH = conn.textAlignH || 'center';
                const textAlignV = conn.textAlignV || 'center';

                const offsetH = width * 0.5;  // 50% of X-length
                const offsetV = height * 0.5; // 50% of Y-length

                // Horizontal alignment
                if (textAlignH === 'left') {
                    lx -= offsetH;
                } else if (textAlignH === 'right') {
                    lx += offsetH;
                }

                // Vertical alignment
                if (textAlignV === 'top') {
                    ly -= offsetV;
                } else if (textAlignV === 'bottom') {
                    ly += offsetV;
                }

                conn.labelElement.style.left = `${lx}px`;
                conn.labelElement.style.top = `${ly}px`;
            } else {
                conn.labelElement.classList.remove('visible');
            }
        }

        if (conn.type === 'dashed') {
            conn.element.classList.add('dashed');
        } else {
            conn.element.classList.remove('dashed');
        }
    }

    function drawPathWithRadius(points) {
        const r = 5;
        let d = `M ${points[0].x} ${points[0].y}`;

        for (let i = 1; i < points.length - 1; i++) {
            const p_prev = points[i - 1];
            const p_curr = points[i];
            const p_next = points[i + 1];

            const dx1 = p_curr.x - p_prev.x;
            const dy1 = p_curr.y - p_prev.y;
            const dx2 = p_next.x - p_curr.x;
            const dy2 = p_next.y - p_curr.y;

            const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
            const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
            const effR = Math.min(r, len1 / 2, len2 / 2);

            if (effR < 1) {
                d += ` L ${p_curr.x} ${p_curr.y}`;
                continue;
            }

            const p_start = {
                x: p_curr.x - (dx1 / len1) * effR,
                y: p_curr.y - (dy1 / len1) * effR
            };

            const p_end = {
                x: p_curr.x + (dx2 / len2) * effR,
                y: p_curr.y + (dy2 / len2) * effR
            };

            d += ` L ${p_start.x} ${p_start.y}`;
            d += ` Q ${p_curr.x} ${p_curr.y} ${p_end.x} ${p_end.y}`;
        }
        d += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
        return d;
    }

    // --- Selection & Deletion ---
    canvasContainer.addEventListener('click', () => {
        deselectAll();
    });

    function deselectAll() {
        document.querySelectorAll('.bpmn-element.selected').forEach(e => e.classList.remove('selected'));
        document.querySelectorAll('.connection-line.selected').forEach(e => e.classList.remove('selected'));
        document.querySelectorAll('.connection-segment-handle').forEach(e => e.style.display = 'none');
        selectedElementId = null;
        selectedConnectionId = null;
        selectedPoolId = null;
        updatePropertiesPanel(null);
    }

    function selectElement(id) {
        deselectAll();
        selectedElementId = id;
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('selected');
            updatePropertiesPanel(el);
        }
    }

    function selectPool(id) {
        deselectAll();
        selectedPoolId = id;
        const pool = pools.find(p => p.id === id);
        if (pool) {
            pool.element.classList.add('selected');
            updatePropertiesPanel(null);
        }
    }

    function selectConnection(id) {
        deselectAll();
        selectedConnectionId = id;
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('selected');

            const conn = connections.find(c => c.id === id);
            if (conn && conn.midPoint) {
                conn.handleElement.style.display = 'block';
            }

            updatePropertiesPanel(null);
        }
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

            if (selectedElementId) {
                deleteElement(selectedElementId);
            } else if (selectedConnectionId) {
                deleteConnection(selectedConnectionId);
            } else if (selectedPoolId) {
                deletePool(selectedPoolId);
            }
        }
    });

    function deleteElement(id) {
        const el = document.getElementById(id);
        if (el) el.remove();

        connections = connections.filter(conn => {
            if (conn.sourceId === id || conn.targetId === id) {
                conn.element.remove();
                if (conn.handleElement) conn.handleElement.remove();
                if (conn.labelElement) conn.labelElement.remove();
                return false;
            }
            return true;
        });

        pools.forEach(pool => {
            pool.lanes.forEach(lane => {
                const index = lane.childElements.indexOf(id);
                if (index > -1) lane.childElements.splice(index, 1);
            });
        });

        selectedElementId = null;
        updatePropertiesPanel(null);
    }

    function deleteConnection(id) {
        const connIndex = connections.findIndex(c => c.id === id);
        if (connIndex !== -1) {
            connections[connIndex].element.remove();
            if (connections[connIndex].handleElement) connections[connIndex].handleElement.remove();
            if (connections[connIndex].labelElement) connections[connIndex].labelElement.remove();
            connections.splice(connIndex, 1);
        }
        selectedConnectionId = null;
        updatePropertiesPanel(null);
    }

    function deletePool(id) {
        const poolIndex = pools.findIndex(p => p.id === id);
        if (poolIndex !== -1) {
            const pool = pools[poolIndex];
            pool.lanes.forEach(lane => {
                lane.childElements.forEach(childId => {
                    const el = document.getElementById(childId);
                    if (el) {
                        delete el.dataset.laneId;
                        delete el.dataset.poolId;
                        delete el.dataset.offsetX;
                        delete el.dataset.offsetY;
                    }
                });
            });
            pool.element.remove();
            pools.splice(poolIndex, 1);
        }
        selectedPoolId = null;
        updatePropertiesPanel(null);
    }

    // --- Properties Panel ---
    function updatePropertiesPanel(el) {
        const panel = document.getElementById('properties-content');

        if (selectedPoolId) {
            const pool = pools.find(p => p.id === selectedPoolId);
            if (pool) {
                let lanesHTML = pool.lanes.map((lane, idx) => `
                    <div class="lane-prop" style="margin-bottom:10px; padding:8px; background:rgba(255,255,255,0.02); border-radius:4px; position:relative;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                            <label style="color:var(--text-secondary); font-size:11px;">Lane ${idx + 1}</label>
                            <div style="display:flex; gap:4px;">
                                ${idx > 0 ? `<button class="move-lane-up-btn" data-lane-id="${lane.id}" style="padding:2px 6px; background:rgba(0,212,255,0.1); border:1px solid rgba(0,212,255,0.5); color:var(--accent-color); border-radius:3px; cursor:pointer; font-size:10px;">↑</button>` : ''}
                                ${idx < pool.lanes.length - 1 ? `<button class="move-lane-down-btn" data-lane-id="${lane.id}" style="padding:2px 6px; background:rgba(0,212,255,0.1); border:1px solid rgba(0,212,255,0.5); color:var(--accent-color); border-radius:3px; cursor:pointer; font-size:10px;">↓</button>` : ''}
                                ${pool.lanes.length > 1 ? `<button class="delete-lane-btn" data-lane-id="${lane.id}" style="padding:2px 8px; background:rgba(244,67,54,0.1); border:1px solid rgba(244,67,54,0.5); color:#f44336; border-radius:3px; cursor:pointer; font-size:10px;">Delete</button>` : ''}
                            </div>
                        </div>
                        <input type="text" class="lane-name-input" data-lane-id="${lane.id}" value="${lane.name}" style="width:100%; padding:6px; background:rgba(0,0,0,0.2); border:1px solid var(--glass-border); color:var(--text-primary); border-radius:4px; font-size:12px;">
                    </div>
                `).join('');

                panel.innerHTML = `
                    <div class="property-group" style="margin-bottom: 15px;">
                        <label style="display:block; color:var(--text-secondary); margin-bottom:5px; font-size:12px;">Pool Name</label>
                        <input type="text" id="prop-pool-name" value="${pool.name}" style="width:100%; padding:6px; background:rgba(0,0,0,0.2); border:1px solid var(--glass-border); color:var(--text-primary); border-radius:4px;">
                    </div>
                    <div class="property-group" style="margin-bottom: 15px;">
                        <label style="display:block; color:var(--text-secondary); margin-bottom:5px; font-size:12px;">Memo</label>
                        <textarea id="prop-pool-memo" rows="3" style="width:100%; padding:6px; background:rgba(0,0,0,0.2); border:1px solid var(--glass-border); color:var(--text-primary); border-radius:4px; resize:vertical; font-family:inherit;">${pool.memo || ''}</textarea>
                    </div>
                    <div class="property-group" style="margin-bottom: 15px;">
                        <label style="display:block; color:var(--text-secondary); margin-bottom:8px; font-size:12px;">Lanes</label>
                        ${lanesHTML}
                        <button id="add-lane-btn" style="width:100%; padding:8px; background:rgba(0,212,255,0.1); border:1px solid var(--accent-color); color:var(--accent-color); border-radius:4px; cursor:pointer; font-size:11px; margin-top:8px;">+ Add Lane</button>
                    </div>
                `;

                document.getElementById('prop-pool-name').addEventListener('input', (e) => {
                    pool.name = e.target.value;
                    pool.header.innerText = e.target.value;
                });

                document.getElementById('prop-pool-memo').addEventListener('input', (e) => {
                    pool.memo = e.target.value;
                });

                document.querySelectorAll('.lane-name-input').forEach(input => {
                    input.addEventListener('input', (e) => {
                        const laneId = e.target.dataset.laneId;
                        const lane = pool.lanes.find(l => l.id === laneId);
                        if (lane) {
                            lane.name = e.target.value;
                            lane.header.innerText = e.target.value;
                        }
                    });
                });

                document.getElementById('add-lane-btn').addEventListener('click', () => {
                    addLaneToPool(pool);
                    updatePropertiesPanel(null);
                });

                document.querySelectorAll('.delete-lane-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const laneId = e.target.dataset.laneId;
                        deleteLaneFromPool(pool, laneId);
                        updatePropertiesPanel(null);
                    });
                });

                document.querySelectorAll('.move-lane-up-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const laneId = e.target.dataset.laneId;
                        moveLaneUp(pool, laneId);
                        updatePropertiesPanel(null);
                    });
                });

                document.querySelectorAll('.move-lane-down-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const laneId = e.target.dataset.laneId;
                        moveLaneDown(pool, laneId);
                        updatePropertiesPanel(null);
                    });
                });
                return;
            }
        }

        if (selectedConnectionId) {
            const conn = connections.find(c => c.id === selectedConnectionId);
            if (conn) {
                panel.innerHTML = `
                    <div class="property-group" style="margin-bottom: 15px;">
                        <label style="display:block; color:var(--text-secondary); margin-bottom:5px; font-size:12px;">Type</label>
                        <select id="prop-conn-type" style="width:100%; padding:6px; background:rgba(0,0,0,0.2); border:1px solid var(--glass-border); color:var(--text-primary); border-radius:4px;">
                            <option value="solid" ${conn.type === 'solid' ? 'selected' : ''}>Solid</option>
                            <option value="dashed" ${conn.type === 'dashed' ? 'selected' : ''}>Dashed</option>
                        </select>
                    </div>
                    <div class="property-group" style="margin-bottom: 15px;">
                        <label style="display:block; color:var(--text-secondary); margin-bottom:5px; font-size:12px;">Name</label>
                        <textarea id="prop-conn-name" placeholder="Connection Name" rows="3" style="width:100%; padding:6px; background:rgba(0,0,0,0.2); border:1px solid var(--glass-border); color:var(--text-primary); border-radius:4px; resize:vertical; font-family:inherit;">${conn.name || ''}</textarea>
                    </div>
                    <div class="property-group" style="margin-bottom: 15px;">
                        <label style="display:block; color:var(--text-secondary); margin-bottom:5px; font-size:12px;">Text Horizontal Align</label>
                        <select id="prop-conn-text-h" style="width:100%; padding:6px; background:rgba(0,0,0,0.2); border:1px solid var(--glass-border); color:var(--text-primary); border-radius:4px;">
                            <option value="left" ${(conn.textAlignH || 'center') === 'left' ? 'selected' : ''}>Left</option>
                            <option value="center" ${(conn.textAlignH || 'center') === 'center' ? 'selected' : ''}>Center</option>
                            <option value="right" ${(conn.textAlignH || 'center') === 'right' ? 'selected' : ''}>Right</option>
                        </select>
                    </div>
                    <div class="property-group" style="margin-bottom: 15px;">
                        <label style="display:block; color:var(--text-secondary); margin-bottom:5px; font-size:12px;">Text Vertical Align</label>
                        <select id="prop-conn-text-v" style="width:100%; padding:6px; background:rgba(0,0,0,0.2); border:1px solid var(--glass-border); color:var(--text-primary); border-radius:4px;">
                            <option value="top" ${(conn.textAlignV || 'center') === 'top' ? 'selected' : ''}>Top</option>
                            <option value="center" ${(conn.textAlignV || 'center') === 'center' ? 'selected' : ''}>Center</option>
                            <option value="bottom" ${(conn.textAlignV || 'center') === 'bottom' ? 'selected' : ''}>Bottom</option>
                        </select>
                    </div>
                    <div class="property-group">
                        <label style="display:block; color:var(--text-secondary); margin-bottom:5px; font-size:12px;">Memo</label>
                        <textarea id="prop-conn-memo" rows="3" style="width:100%; padding:6px; background:rgba(0,0,0,0.2); border:1px solid var(--glass-border); color:var(--text-primary); border-radius:4px; resize:vertical; font-family:inherit;">${conn.memo || ''}</textarea>
                    </div>
                `;

                document.getElementById('prop-conn-type').addEventListener('change', (e) => {
                    conn.type = e.target.value;
                    updateConnectionPath(conn);
                });

                document.getElementById('prop-conn-name').addEventListener('input', (e) => {
                    conn.name = e.target.value;
                    updateConnectionPath(conn);
                });

                document.getElementById('prop-conn-text-h').addEventListener('change', (e) => {
                    conn.textAlignH = e.target.value;
                    updateConnectionPath(conn);
                });

                document.getElementById('prop-conn-text-v').addEventListener('change', (e) => {
                    conn.textAlignV = e.target.value;
                    updateConnectionPath(conn);
                });

                document.getElementById('prop-conn-memo').addEventListener('input', (e) => {
                    conn.memo = e.target.value;
                });
                return;
            }
        }

        if (!el) {
            panel.innerHTML = '<p class="placeholder-text">Select an element</p>';
            return;
        }

        const type = el.classList[1];
        const labelEl = el.querySelector('.element-label');
        const currentName = labelEl ? labelEl.innerText : '';

        // Build additional properties based on element type
        let additionalProps = '';

        // Event properties
        if (type.includes('event')) {
            additionalProps = `
                <div class="property-group" style="margin-bottom: 15px;">
                    <label style="display:block; color:var(--text-secondary); margin-bottom:5px; font-size:12px;">Timing</label>
                    <textarea id="prop-timing" placeholder="Event timing" rows="3" style="width:100%; padding:6px; background:rgba(0,0,0,0.2); border:1px solid var(--glass-border); color:var(--text-primary); border-radius:4px; resize:vertical; font-family:inherit;">${el.dataset.timing || ''}</textarea>
                </div>
                <div class="property-group" style="margin-bottom: 15px;">
                    <label style="display:block; color:var(--text-secondary); margin-bottom:5px; font-size:12px;">Method</label>
                    <textarea id="prop-method" placeholder="Event method" rows="3" style="width:100%; padding:6px; background:rgba(0,0,0,0.2); border:1px solid var(--glass-border); color:var(--text-primary); border-radius:4px; resize:vertical; font-family:inherit;">${el.dataset.method || ''}</textarea>
                </div>
            `;
        }

        // Activity (Task) properties
        if (type.includes('task')) {
            additionalProps = `
                <div class="property-group" style="margin-bottom: 15px;">
                    <label style="display:block; color:var(--text-secondary); margin-bottom:5px; font-size:12px;">Code</label>
                    <input type="text" id="prop-code" placeholder="Activity code" style="width:100%; padding:6px; background:rgba(0,0,0,0.2); border:1px solid var(--glass-border); color:var(--text-primary); border-radius:4px;" value="${el.dataset.code || ''}">
                </div>
                <div class="property-group" style="margin-bottom: 15px;">
                    <label style="display:block; color:var(--text-secondary); margin-bottom:5px; font-size:12px;">Effort</label>
                    <input type="text" id="prop-effort" placeholder="Effort (e.g., 8h, 2d)" style="width:100%; padding:6px; background:rgba(0,0,0,0.2); border:1px solid var(--glass-border); color:var(--text-primary); border-radius:4px;" value="${el.dataset.effort || ''}">
                </div>
                <div class="property-group" style="margin-bottom: 15px;">
                    <label style="display:block; color:var(--text-secondary); margin-bottom:5px; font-size:12px;">Method</label>
                    <textarea id="prop-method" placeholder="Activity method" rows="3" style="width:100%; padding:6px; background:rgba(0,0,0,0.2); border:1px solid var(--glass-border); color:var(--text-primary); border-radius:4px; resize:vertical; font-family:inherit;">${el.dataset.method || ''}</textarea>
                </div>
            `;
        }

        // Gateway properties
        if (type.includes('gateway')) {
            additionalProps = `
                <div class="property-group" style="margin-bottom: 15px;">
                    <label style="display:block; color:var(--text-secondary); margin-bottom:5px; font-size:12px;">Decision</label>
                    <textarea id="prop-decision" placeholder="Decision criteria" rows="3" style="width:100%; padding:6px; background:rgba(0,0,0,0.2); border:1px solid var(--glass-border); color:var(--text-primary); border-radius:4px; resize:vertical; font-family:inherit;">${el.dataset.decision || ''}</textarea>
                </div>
            `;
        }

        panel.innerHTML = `
            <div class="property-group" style="margin-bottom: 15px;">
                <label style="display:block; color:var(--text-secondary); margin-bottom:5px; font-size:12px;">Type</label>
                <input type="text" value="${type}" disabled style="width:100%; padding:6px; background:rgba(0,0,0,0.2); border:1px solid var(--glass-border); color:var(--text-primary); border-radius:4px;">
            </div>
            <div class="property-group" style="margin-bottom: 15px;">
                <label style="display:block; color:var(--text-secondary); margin-bottom:5px; font-size:12px;">Name</label>
                <textarea id="prop-name" placeholder="Element Name" rows="3" style="width:100%; padding:6px; background:rgba(0,0,0,0.2); border:1px solid var(--glass-border); color:var(--text-primary); border-radius:4px; resize:vertical; font-family:inherit;">${currentName}</textarea>
            </div>
            ${additionalProps}
            <div class="property-group">
                <label style="display:block; color:var(--text-secondary); margin-bottom:5px; font-size:12px;">Memo</label>
                <textarea id="prop-memo" rows="3" style="width:100%; padding:6px; background:rgba(0,0,0,0.2); border:1px solid var(--glass-border); color:var(--text-primary); border-radius:4px; resize:vertical; font-family:inherit;">${el.dataset.memo || ''}</textarea>
            </div>
            ${type.includes('task') ? `
            <div class="property-group" style="margin-top: 15px;">
                <button id="btn-sub-process" style="width:100%; padding:8px; background:rgba(0,212,255,0.1); border:1px solid var(--accent-color); color:var(--accent-color); border-radius:4px; cursor:pointer; font-size:11px;">Open Sub-BPMN</button>
            </div>
            ` : ''}
        `;

        const nameInput = document.getElementById('prop-name');
        nameInput.addEventListener('input', (e) => {
            if (labelEl) {
                labelEl.innerText = e.target.value;
                if (e.target.value) {
                    el.classList.add('has-label');
                } else {
                    el.classList.remove('has-label');
                }
            }
        });

        document.getElementById('prop-memo').addEventListener('input', (e) => {
            el.dataset.memo = e.target.value;
        });

        // Event-specific listeners
        if (type.includes('event')) {
            document.getElementById('prop-timing').addEventListener('input', (e) => {
                el.dataset.timing = e.target.value;
            });
            document.getElementById('prop-method').addEventListener('input', (e) => {
                el.dataset.method = e.target.value;
            });
        }

        // Activity-specific listeners
        if (type.includes('task')) {
            document.getElementById('prop-code').addEventListener('input', (e) => {
                el.dataset.code = e.target.value;
            });
            document.getElementById('prop-effort').addEventListener('input', (e) => {
                el.dataset.effort = e.target.value;
            });
            document.getElementById('prop-method').addEventListener('input', (e) => {
                el.dataset.method = e.target.value;
            });

            document.getElementById('btn-sub-process').addEventListener('click', () => {
                if (window.DiagramManager) {
                    window.DiagramManager.openSubDiagram(el.id);
                } else {
                    alert('Diagram Manager not initialized.');
                }
            });
        }

        // Gateway-specific listeners
        if (type.includes('gateway')) {
            document.getElementById('prop-decision').addEventListener('input', (e) => {
                el.dataset.decision = e.target.value;
            });
        }
    }

    // --- Update Connections ---
    function updateConnections(elementId) {
        window.connections.forEach(conn => {
            if (conn.sourceId === elementId || conn.targetId === elementId) {
                updateConnectionPath(conn);
            }
        });
    }

    // --- Expose Restore Functions for DiagramManager ---
    window.restoreElement = function (data) {
        createBPMNElement(data.type, data.x, data.y, data.id, data);
    };

    window.restorePool = function (data) {
        createPool(data.x, data.y, data.id, data);
    };

    window.restoreConnection = function (data) {
        createConnection(data.sourceId, data.sourcePort, data.targetId, data.targetPort, data.id, data);
    };

    // --- Expose updatePropertiesPanel ---
    window.updatePropertiesPanel = updatePropertiesPanel;
});
