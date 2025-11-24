
class DiagramManager {
    constructor() {
        this.diagrams = {}; // Map<diagramId, diagramData>
        this.currentDiagramId = 'root';
        this.hierarchy = { 'root': [] }; // Map<parentId, childDiagramIds[]>
        this.diagramNames = { 'root': 'Main Process' };

        // Initialize root diagram
        this.diagrams['root'] = {
            elements: [],
            connections: [],
            pools: [],
            nextId: 1
        };
    }

    // Save current canvas state to memory
    saveCurrentDiagram() {
        const currentId = this.currentDiagramId;

        // Capture Elements
        const elements = [];
        document.querySelectorAll('.bpmn-element').forEach(el => {
            if (el.classList.contains('pool')) return; // Pools handled separately

            const type = Array.from(el.classList).find(c => c !== 'bpmn-element' && c !== 'selected' && c !== 'has-label');
            const label = el.querySelector('.element-label')?.innerText || '';

            elements.push({
                id: el.id,
                type: type,
                x: parseFloat(el.style.left) + (el.offsetWidth / 2),
                y: parseFloat(el.style.top) + (el.offsetHeight / 2),
                width: el.offsetWidth,
                height: el.offsetHeight,
                label: label,
                memo: el.dataset.memo || '',
                poolId: el.dataset.poolId,
                laneId: el.dataset.laneId,
                offsetX: el.dataset.offsetX,
                offsetY: el.dataset.offsetY
            });
        });

        // Capture Connections (using global connections array)
        // We need to deep copy to avoid reference issues when clearing
        const connectionsData = window.connections.map(c => ({
            id: c.id,
            sourceId: c.sourceId,
            sourcePort: c.sourcePort,
            targetId: c.targetId,
            targetPort: c.targetPort,
            type: c.type,
            name: c.name,
            memo: c.memo,
            midPoint: c.midPoint ? { ...c.midPoint } : null
        }));

        // Capture Pools (using global pools array)
        const poolsData = window.pools.map(p => ({
            id: p.id,
            x: parseFloat(p.element.style.left) + (p.element.offsetWidth / 2),
            y: parseFloat(p.element.style.top) + (p.element.offsetHeight / 2),
            width: parseFloat(p.element.style.width),
            height: parseFloat(p.element.style.height), // This might be dynamic
            name: p.name,
            memo: p.memo,
            lanes: p.lanes.map(l => ({
                id: l.id,
                name: l.name,
                height: l.height
            }))
        }));

        this.diagrams[currentId] = {
            elements,
            connections: connectionsData,
            pools: poolsData,
            nextId: window.nextId
        };

        console.log(`Saved diagram ${currentId}`, this.diagrams[currentId]);
    }

    // Load a diagram from memory
    loadDiagram(diagramId) {
        if (!this.diagrams[diagramId]) {
            console.error(`Diagram ${diagramId} not found`);
            return;
        }

        // Save current first
        this.saveCurrentDiagram();

        // Clear Canvas
        this.clearCanvas();

        this.currentDiagramId = diagramId;
        const data = this.diagrams[diagramId];

        // Restore Global State
        window.nextId = data.nextId || 1;

        // Restore Pools
        data.pools.forEach(pData => {
            // We need to recreate createPool logic but with specific ID and data
            // Since createPool generates ID, we might need to modify app.js or manually reconstruct
            // For now, let's assume we can manually reconstruct or modify createPool to accept ID
            // Actually, app.js createPool generates ID. We should probably expose a lower-level create
            // OR just set window.nextId carefully? No, IDs must match for connections.

            // Workaround: Manually create DOM elements similar to createPool
            // Ideally, we refactor app.js to separate data creation from ID generation.
            // For this plan, I will assume we can call a modified createPool or similar.

            // Let's use a helper function injected into window by app.js or just replicate logic here?
            // Replicating logic is risky if app.js changes.
            // Better: Expose `restorePool(data)` in app.js.
            if (window.restorePool) {
                window.restorePool(pData);
            }
        });

        // Restore Elements
        data.elements.forEach(elData => {
            if (window.restoreElement) {
                window.restoreElement(elData);
            }
        });

        // Restore Connections
        data.connections.forEach(connData => {
            if (window.restoreConnection) {
                window.restoreConnection(connData);
            }
        });

        // Update UI
        document.getElementById('diagram-name').value = this.diagramNames[diagramId] || 'Untitled Diagram';
        this.updateExplorer();
    }

    clearCanvas() {
        const canvasLayer = document.getElementById('canvas-layer');
        const poolLayer = document.getElementById('pool-layer');
        const connectionsLayer = document.getElementById('connections-layer');

        // Remove all children except defs in SVG
        while (connectionsLayer.lastChild && connectionsLayer.lastChild.tagName !== 'defs') {
            connectionsLayer.removeChild(connectionsLayer.lastChild);
        }

        canvasLayer.innerHTML = '';
        poolLayer.innerHTML = '';

        // Reset global arrays
        window.connections = [];
        window.pools = [];
        window.selectedElementId = null;
        window.selectedConnectionId = null;
        window.selectedPoolId = null;

        // Update properties panel
        if (window.updatePropertiesPanel) window.updatePropertiesPanel(null);
    }

    openSubDiagram(parentId) {
        // Check if sub-diagram already exists
        let childId = this.hierarchy[this.currentDiagramId]?.find(id => this.diagrams[id].parentId === parentId);

        if (!childId) {
            // Create new diagram
            childId = `diagram_${Date.now()}`;
            this.diagrams[childId] = {
                elements: [],
                connections: [],
                pools: [],
                nextId: 1,
                parentId: parentId
            };
            this.diagramNames[childId] = `Sub-Process of ${parentId}`;

            if (!this.hierarchy[this.currentDiagramId]) {
                this.hierarchy[this.currentDiagramId] = [];
            }
            this.hierarchy[this.currentDiagramId].push(childId);

            // Also track parent for upward navigation
            this.diagrams[childId].parentDiagramId = this.currentDiagramId;
        }

        this.loadDiagram(childId);
    }

    updateExplorer() {
        const tree = document.getElementById('explorer-tree');
        if (!tree) return;

        // Simple recursive render
        const renderNode = (diagramId, depth = 0) => {
            const name = this.diagramNames[diagramId];
            const isCurrent = diagramId === this.currentDiagramId;
            const children = this.hierarchy[diagramId] || [];

            let html = `
                <div class="tree-item ${isCurrent ? 'active' : ''}" style="padding-left: ${depth * 15 + 10}px" onclick="window.DiagramManager.loadDiagram('${diagramId}')">
                    <span class="tree-toggle">${children.length ? '▼' : '•'}</span>
                    <span class="tree-icon">${depth === 0 ? window.BPMNIcons.folder : window.BPMNIcons.diagram}</span>
                    <span class="tree-label">${name}</span>
                </div>
            `;

            if (children.length > 0) {
                html += `<div class="tree-children">`;
                children.forEach(childId => {
                    html += renderNode(childId, depth + 1);
                });
                html += `</div>`;
            }
            return html;
        };

        tree.innerHTML = renderNode('root');

        // Re-inject icons if needed
        // window.injectIcons(); // If exposed
    }
}

// Initialize
window.DiagramManager = new DiagramManager();
