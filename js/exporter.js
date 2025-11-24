/**
 * BPMN Exporter & Importer Module
 * Handles export (JSON, BPMN XML, PNG) and import (JSON) functionality
 */

(function () {
    'use strict';

    // Export dialog HTML
    const exportDialogHTML = `
        <div id="export-dialog" class="modal-overlay" style="display: none;">
            <div class="modal-content export-modal">
                <div class="modal-header">
                    <h2>エクスポート</h2>
                    <button class="modal-close" id="export-close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="export-options">
                        <button class="export-option-btn" data-format="json">
                            <div class="export-icon">📄</div>
                            <div class="export-label">JSON</div>
                            <div class="export-desc">プロジェクト全体を保存</div>
                        </button>
                        <button class="export-option-btn" data-format="xml">
                            <div class="export-icon">📋</div>
                            <div class="export-label">BPMN XML</div>
                            <div class="export-desc">BPMN 2.0 標準形式</div>
                        </button>
                        <button class="export-option-btn" data-format="png">
                            <div class="export-icon">🖼️</div>
                            <div class="export-label">PNG</div>
                            <div class="export-desc">画像として保存</div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Initialize export functionality
    function initExporter() {
        // Add export dialog to DOM
        document.body.insertAdjacentHTML('beforeend', exportDialogHTML);

        const exportBtn = document.getElementById('export-btn');
        const importBtn = document.getElementById('import-btn');
        const exportDialog = document.getElementById('export-dialog');
        const exportCloseBtn = document.getElementById('export-close-btn');

        if (!exportBtn) {
            console.error('Export button not found');
            return;
        }

        // Show export dialog
        exportBtn.addEventListener('click', () => {
            exportDialog.style.display = 'flex';
        });

        // Close dialog
        exportCloseBtn.addEventListener('click', () => {
            exportDialog.style.display = 'none';
        });

        // Close on overlay click
        exportDialog.addEventListener('click', (e) => {
            if (e.target === exportDialog) {
                exportDialog.style.display = 'none';
            }
        });

        // Handle export format selection
        document.querySelectorAll('.export-option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const format = btn.dataset.format;
                handleExport(format);
                exportDialog.style.display = 'none';
            });
        });

        // Handle import button
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                importJSON();
            });
        }
    }

    // Handle export based on format
    function handleExport(format) {
        try {
            switch (format) {
                case 'json':
                    exportJSON();
                    break;
                case 'xml':
                    exportBPMNXML();
                    break;
                case 'png':
                    exportPNG();
                    break;
                default:
                    console.error('Unknown export format:', format);
            }
        } catch (error) {
            console.error('Export failed:', error);
            alert('エクスポートに失敗しました: ' + error.message);
        }
    }

    // Export as JSON
    function exportJSON() {
        const diagramName = document.getElementById('diagram-name')?.value || 'Untitled Diagram';

        // Collect all elements
        const elements = [];
        document.querySelectorAll('.bpmn-element:not(.pool)').forEach(el => {
            const elementData = {
                id: el.id,
                type: Array.from(el.classList).find(cls => cls !== 'bpmn-element' && cls !== 'selected'),
                x: parseFloat(el.style.left) || 0,
                y: parseFloat(el.style.top) || 0,
                label: el.querySelector('.element-label')?.innerText || '',
                memo: el.dataset.memo || '',
                laneId: el.dataset.laneId || null,
                poolId: el.dataset.poolId || null,
                offsetX: el.dataset.offsetX || null,
                offsetY: el.dataset.offsetY || null
            };

            // Add type-specific properties
            const type = elementData.type;

            // Event properties
            if (type && type.includes('event')) {
                if (el.dataset.timing) elementData.timing = el.dataset.timing;
                if (el.dataset.method) elementData.method = el.dataset.method;
            }

            // Activity (Task) properties
            if (type && type.includes('task')) {
                if (el.dataset.code) elementData.code = el.dataset.code;
                if (el.dataset.effort) elementData.effort = el.dataset.effort;
                if (el.dataset.method) elementData.method = el.dataset.method;
            }

            // Gateway properties
            if (type && type.includes('gateway')) {
                if (el.dataset.decision) elementData.decision = el.dataset.decision;
            }

            elements.push(elementData);
        });

        // Collect connections
        const connections = (window.connections || []).map(conn => ({
            id: conn.id,
            sourceId: conn.sourceId,
            sourcePort: conn.sourcePort,
            targetId: conn.targetId,
            targetPort: conn.targetPort,
            name: conn.name || '',
            type: conn.type || 'solid',
            memo: conn.memo || '',
            textAlignH: conn.textAlignH || 'center',
            textAlignV: conn.textAlignV || 'center',
            midPoint: conn.midPoint || null
        }));

        // Collect pools
        const pools = (window.pools || []).map(pool => ({
            id: pool.id,
            name: pool.element.querySelector('.pool-header-text')?.innerText || 'Pool',
            x: parseFloat(pool.element.style.left) || 0,
            y: parseFloat(pool.element.style.top) || 0,
            width: parseFloat(pool.element.style.width) || pool.element.offsetWidth || 800,
            height: parseFloat(pool.element.style.height) || pool.element.offsetHeight || 200,
            lanes: pool.lanes.map(lane => ({
                id: lane.id,
                name: lane.name,
                height: lane.height,
                childElements: lane.childElements || []
            }))
        }));

        const projectData = {
            version: '1.0',
            name: diagramName,
            created: new Date().toISOString(),
            elements,
            connections,
            pools
        };

        downloadFile(
            JSON.stringify(projectData, null, 2),
            `${diagramName}.json`,
            'application/json'
        );

        console.log('JSON exported successfully');
    }

    // Import from JSON
    function importJSON() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const projectData = JSON.parse(event.target.result);
                    loadProjectData(projectData);
                    alert('JSONファイルのインポートに成功しました!');
                } catch (error) {
                    console.error('Import failed:', error);
                    alert('JSONファイルのインポートに失敗しました: ' + error.message);
                }
            };
            reader.readAsText(file);
        };

        input.click();
    }

    // Load project data from JSON
    function loadProjectData(data) {
        // Clear current canvas
        clearCanvas();

        // Set diagram name
        if (data.name) {
            const diagramNameInput = document.getElementById('diagram-name');
            if (diagramNameInput) {
                diagramNameInput.value = data.name;
            }
        }

        // Restore pools first
        if (data.pools && Array.isArray(data.pools)) {
            data.pools.forEach(poolData => {
                if (window.restorePool) {
                    window.restorePool(poolData);
                }
            });
        }

        // Restore elements
        if (data.elements && Array.isArray(data.elements)) {
            data.elements.forEach(elementData => {
                if (window.restoreElement) {
                    window.restoreElement(elementData);
                }
            });
        }

        // Restore connections
        if (data.connections && Array.isArray(data.connections)) {
            data.connections.forEach(connData => {
                if (window.restoreConnection) {
                    window.restoreConnection(connData);
                }
            });
        }

        console.log('Project loaded successfully:', data.name);
    }

    // Clear canvas
    function clearCanvas() {
        // Clear elements
        const canvasLayer = document.getElementById('canvas-layer');
        if (canvasLayer) {
            canvasLayer.innerHTML = '';
        }

        // Clear connections
        const connectionsLayer = document.getElementById('connections-layer');
        if (connectionsLayer) {
            // Keep the defs element
            const defs = connectionsLayer.querySelector('defs');
            connectionsLayer.innerHTML = '';
            if (defs) {
                connectionsLayer.appendChild(defs);
            }
        }

        // Clear pools
        const poolLayer = document.getElementById('pool-layer');
        if (poolLayer) {
            poolLayer.innerHTML = '';
        }

        // Reset global state
        if (window.connections) {
            window.connections.length = 0;
        }
        if (window.pools) {
            window.pools.length = 0;
        }

        // Clear properties panel
        const propertiesContent = document.getElementById('properties-content');
        if (propertiesContent) {
            propertiesContent.innerHTML = '<p class="placeholder-text">Select an element</p>';
        }
    }

    // Export as BPMN 2.0 XML
    function exportBPMNXML() {
        const diagramName = document.getElementById('diagram-name')?.value || 'Untitled Diagram';

        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ';
        xml += 'xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" ';
        xml += 'xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" ';
        xml += 'xmlns:di="http://www.omg.org/spec/DD/20100524/DI" ';
        xml += 'id="Definitions_1" ';
        xml += 'targetNamespace="http://bpmn.io/schema/bpmn">\n';

        // Process definition
        xml += '  <bpmn:process id="Process_1" isExecutable="false">\n';

        // Add elements
        document.querySelectorAll('.bpmn-element:not(.pool)').forEach(el => {
            const type = Array.from(el.classList).find(cls => cls !== 'bpmn-element' && cls !== 'selected');
            const id = el.id;
            const name = el.querySelector('.element-label')?.innerText || '';

            xml += generateBPMNElement(id, type, name);
        });

        // Add sequence flows (connections)
        (window.connections || []).forEach(conn => {
            if (conn.type !== 'dashed') {
                xml += `    <bpmn:sequenceFlow id="${conn.id}" `;
                xml += `sourceRef="${conn.sourceId}" `;
                xml += `targetRef="${conn.targetId}"`;
                if (conn.name) {
                    xml += ` name="${escapeXML(conn.name)}"`;
                }
                xml += ' />\n';
            }
        });

        xml += '  </bpmn:process>\n';

        // Add diagram information
        xml += '  <bpmndi:BPMNDiagram id="BPMNDiagram_1">\n';
        xml += '    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">\n';

        // Add shapes
        document.querySelectorAll('.bpmn-element:not(.pool)').forEach(el => {
            const id = el.id;
            const x = parseFloat(el.style.left) || 0;
            const y = parseFloat(el.style.top) || 0;
            const width = el.offsetWidth || 100;
            const height = el.offsetHeight || 80;

            xml += `      <bpmndi:BPMNShape id="${id}_di" bpmnElement="${id}">\n`;
            xml += `        <dc:Bounds x="${x}" y="${y}" width="${width}" height="${height}" />\n`;
            xml += '      </bpmndi:BPMNShape>\n';
        });

        // Add edges
        (window.connections || []).forEach(conn => {
            if (conn.type !== 'dashed') {
                xml += `      <bpmndi:BPMNEdge id="${conn.id}_di" bpmnElement="${conn.id}">\n`;

                const sourceEl = document.getElementById(conn.sourceId);
                const targetEl = document.getElementById(conn.targetId);

                if (sourceEl && targetEl) {
                    const sx = parseFloat(sourceEl.style.left) + sourceEl.offsetWidth / 2;
                    const sy = parseFloat(sourceEl.style.top) + sourceEl.offsetHeight / 2;
                    const tx = parseFloat(targetEl.style.left) + targetEl.offsetWidth / 2;
                    const ty = parseFloat(targetEl.style.top) + targetEl.offsetHeight / 2;

                    xml += `        <di:waypoint x="${sx}" y="${sy}" />\n`;
                    xml += `        <di:waypoint x="${tx}" y="${ty}" />\n`;
                }

                xml += '      </bpmndi:BPMNEdge>\n';
            }
        });

        xml += '    </bpmndi:BPMNPlane>\n';
        xml += '  </bpmndi:BPMNDiagram>\n';
        xml += '</bpmn:definitions>';

        downloadFile(xml, `${diagramName}.bpmn`, 'application/xml');
        console.log('BPMN XML exported successfully');
    }

    // Generate BPMN element XML
    function generateBPMNElement(id, type, name) {
        let xml = '';
        const nameAttr = name ? ` name="${escapeXML(name)}"` : '';

        switch (type) {
            case 'start-event':
                xml = `    <bpmn:startEvent id="${id}"${nameAttr} />\n`;
                break;
            case 'end-event':
                xml = `    <bpmn:endEvent id="${id}"${nameAttr} />\n`;
                break;
            case 'intermediate-event':
                xml = `    <bpmn:intermediateCatchEvent id="${id}"${nameAttr} />\n`;
                break;
            case 'task':
                xml = `    <bpmn:task id="${id}"${nameAttr} />\n`;
                break;
            case 'user-task':
                xml = `    <bpmn:userTask id="${id}"${nameAttr} />\n`;
                break;
            case 'service-task':
                xml = `    <bpmn:serviceTask id="${id}"${nameAttr} />\n`;
                break;
            case 'exclusive-gateway':
                xml = `    <bpmn:exclusiveGateway id="${id}"${nameAttr} />\n`;
                break;
            case 'parallel-gateway':
                xml = `    <bpmn:parallelGateway id="${id}"${nameAttr} />\n`;
                break;
            case 'data-input':
                xml = `    <bpmn:dataInput id="${id}"${nameAttr} />\n`;
                break;
            case 'data-output':
                xml = `    <bpmn:dataOutput id="${id}"${nameAttr} />\n`;
                break;
            default:
                xml = `    <bpmn:task id="${id}"${nameAttr} />\n`;
        }

        return xml;
    }

    // Export as PNG - Transparent background, CSS styles fully reproduced
    function exportPNG() {
        const diagramName = document.getElementById('diagram-name')?.value || 'Untitled Diagram';

        // Calculate bounds of all BPMN elements
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        const elements = document.querySelectorAll('.bpmn-element');
        const pools = document.querySelectorAll('.pool');

        if (elements.length === 0 && pools.length === 0) {
            alert('エクスポートする要素がありません。');
            return;
        }

        // Check all elements including pools
        [...elements, ...pools].forEach(el => {
            const x = parseFloat(el.style.left) || 0;
            const y = parseFloat(el.style.top) || 0;
            const width = el.offsetWidth || 100;
            const height = el.offsetHeight || 80;

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + width);
            maxY = Math.max(maxY, y + height);
        });

        // Add padding
        const padding = 50;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;

        const width = maxX - minX;
        const height = maxY - minY;

        // Create canvas with higher resolution for better quality
        const scale = 2; // 2x resolution
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');

        // Scale context for higher resolution
        ctx.scale(scale, scale);

        // Transparent background (no fill)

        // Show loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 8px; z-index: 10001;';
        loadingDiv.textContent = 'PNG画像を生成中...';
        document.body.appendChild(loadingDiv);

        // Draw connections first (behind elements)
        (window.connections || []).forEach(conn => {
            drawConnection(ctx, conn, minX, minY);
        });

        // Draw pools
        (window.pools || []).forEach(pool => {
            drawPool(ctx, pool, minX, minY);
        });

        // Draw elements
        elements.forEach(el => {
            if (!el.classList.contains('pool')) {
                drawElement(ctx, el, minX, minY);
            }
        });

        // Convert canvas to blob and download
        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${diagramName}.png`;
            a.click();
            URL.revokeObjectURL(url);
            document.body.removeChild(loadingDiv);
            console.log('PNG exported successfully');
        });
    }

    // Draw connection with rounded path - Fixed midPoint calculation
    function drawConnection(ctx, conn, offsetX, offsetY) {
        const sourceEl = document.getElementById(conn.sourceId);
        const targetEl = document.getElementById(conn.targetId);

        if (!sourceEl || !targetEl) return;

        // Get element positions from style (not affected by zoom/pan)
        const sourceX = parseFloat(sourceEl.style.left) || 0;
        const sourceY = parseFloat(sourceEl.style.top) || 0;
        const sourceWidth = sourceEl.offsetWidth;
        const sourceHeight = sourceEl.offsetHeight;

        const targetX = parseFloat(targetEl.style.left) || 0;
        const targetY = parseFloat(targetEl.style.top) || 0;
        const targetWidth = targetEl.offsetWidth;
        const targetHeight = targetEl.offsetHeight;

        // Calculate port positions based on port direction
        const dir1 = conn.sourcePort;
        const dir2 = conn.targetPort;

        let p1 = { x: 0, y: 0 };
        let p2 = { x: 0, y: 0 };

        // Source port position
        switch (dir1) {
            case 'top':
                p1 = { x: sourceX + sourceWidth / 2, y: sourceY };
                break;
            case 'right':
                p1 = { x: sourceX + sourceWidth, y: sourceY + sourceHeight / 2 };
                break;
            case 'bottom':
                p1 = { x: sourceX + sourceWidth / 2, y: sourceY + sourceHeight };
                break;
            case 'left':
                p1 = { x: sourceX, y: sourceY + sourceHeight / 2 };
                break;
        }

        // Target port position
        switch (dir2) {
            case 'top':
                p2 = { x: targetX + targetWidth / 2, y: targetY };
                break;
            case 'right':
                p2 = { x: targetX + targetWidth, y: targetY + targetHeight / 2 };
                break;
            case 'bottom':
                p2 = { x: targetX + targetWidth / 2, y: targetY + targetHeight };
                break;
            case 'left':
                p2 = { x: targetX, y: targetY + targetHeight / 2 };
                break;
        }



        // Apply offset
        p1.x -= offsetX;
        p1.y -= offsetY;
        p2.x -= offsetX;
        p2.y -= offsetY;

        const isHorz1 = (dir1 === 'left' || dir1 === 'right');
        const isHorz2 = (dir2 === 'left' || dir2 === 'right');

        let points = [p1];

        // Check if both elements are in the same pool
        const sourcePoolId = sourceEl.dataset.poolId;
        const targetPoolId = targetEl.dataset.poolId;
        const inSamePool = sourcePoolId && sourcePoolId === targetPoolId;
        const pool = inSamePool ? (window.pools || []).find(p => p.id === sourcePoolId) : null;

        // Calculate intermediate points based on port directions
        if (isHorz1 && !isHorz2) {
            points.push({ x: p2.x, y: p1.y });
        } else if (!isHorz1 && isHorz2) {
            points.push({ x: p1.x, y: p2.y });
        } else if (isHorz1 && isHorz2) {
            // Horizontal to horizontal - vertical midpoint
            let actualMidX;
            if (conn.midPoint && conn.midPoint.poolRelative && pool) {
                // Pool-relative coordinate: add pool position
                const poolX = parseFloat(pool.element.style.left) || 0;
                actualMidX = conn.midPoint.x + poolX - offsetX;
            } else if (conn.midPoint) {
                // Absolute coordinate
                actualMidX = conn.midPoint.x - offsetX;
            } else {
                // Default: midpoint between source and target
                actualMidX = (p1.x + p2.x) / 2;
            }
            points.push({ x: actualMidX, y: p1.y });
            points.push({ x: actualMidX, y: p2.y });
        } else {
            // Vertical to vertical - horizontal midpoint
            let actualMidY;
            if (conn.midPoint && conn.midPoint.poolRelative && pool) {
                // Pool-relative coordinate: add pool position
                const poolY = parseFloat(pool.element.style.top) || 0;
                actualMidY = conn.midPoint.y + poolY - offsetY;
            } else if (conn.midPoint) {
                // Absolute coordinate
                actualMidY = conn.midPoint.y - offsetY;
            } else {
                // Default: midpoint between source and target
                actualMidY = (p1.y + p2.y) / 2;
            }
            points.push({ x: p1.x, y: actualMidY });
            points.push({ x: p2.x, y: actualMidY });
        }

        points.push(p2);

        ctx.save();

        // Apply glow effect
        ctx.shadowColor = 'rgba(0, 212, 255, 0.6)';
        ctx.shadowBlur = 6;

        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;

        if (conn.type === 'dashed') {
            ctx.setLineDash([5, 5]);
        } else {
            ctx.setLineDash([]);
        }

        // Draw path with rounded corners
        drawPathWithRadius(ctx, points);

        // Draw arrowhead at the end
        const lastIdx = points.length - 1;
        const p_prev = points[lastIdx - 1];
        const p_last = points[lastIdx];
        const angle = Math.atan2(p_last.y - p_prev.y, p_last.x - p_prev.x);
        const arrowLength = 12;

        ctx.fillStyle = '#00d4ff';
        ctx.beginPath();
        ctx.moveTo(p_last.x, p_last.y);
        ctx.lineTo(
            p_last.x - arrowLength * Math.cos(angle - Math.PI / 6),
            p_last.y - arrowLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            p_last.x - arrowLength * Math.cos(angle + Math.PI / 6),
            p_last.y - arrowLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // Draw connection text if exists
        if (conn.name) {
            ctx.save();

            // Calculate text position (center of the connection)
            let lx, ly;
            if (conn.midPoint) {
                if (conn.midPoint.vertical) {
                    let actualMidX;
                    if (conn.midPoint.poolRelative && pool) {
                        const poolX = parseFloat(pool.element.style.left) || 0;
                        actualMidX = conn.midPoint.x + poolX - offsetX;
                    } else {
                        actualMidX = conn.midPoint.x - offsetX;
                    }
                    lx = actualMidX;
                    ly = (p1.y + p2.y) / 2;
                } else {
                    let actualMidY;
                    if (conn.midPoint.poolRelative && pool) {
                        const poolY = parseFloat(pool.element.style.top) || 0;
                        actualMidY = conn.midPoint.y + poolY - offsetY;
                    } else {
                        actualMidY = conn.midPoint.y - offsetY;
                    }
                    lx = (p1.x + p2.x) / 2;
                    ly = actualMidY;
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

            if (textAlignH === 'left') {
                lx -= offsetH;
            } else if (textAlignH === 'right') {
                lx += offsetH;
            }

            if (textAlignV === 'top') {
                ly -= offsetV;
            } else if (textAlignV === 'bottom') {
                ly += offsetV;
            }

            // Draw text background
            ctx.font = '12px Inter, sans-serif';
            const lines = conn.name.split('\n');
            const lineHeight = 16;
            let maxWidth = 0;

            lines.forEach(line => {
                const metrics = ctx.measureText(line);
                if (metrics.width > maxWidth) {
                    maxWidth = metrics.width;
                }
            });

            const totalHeight = lines.length * lineHeight;
            const padding = 4;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(
                lx - maxWidth / 2 - padding,
                ly - totalHeight / 2 - padding,
                maxWidth + padding * 2,
                totalHeight + padding * 2
            );

            // Draw text
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0, 212, 255, 0.5)';
            ctx.shadowBlur = 3;

            // Draw each line
            const startY = ly - (totalHeight / 2) + (lineHeight / 2);
            lines.forEach((line, index) => {
                ctx.fillText(line, lx, startY + (index * lineHeight));
            });

            ctx.restore();
        }
    }

    // Draw path with rounded corners (same algorithm as app.js)
    function drawPathWithRadius(ctx, points) {
        const r = 5;

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

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
                ctx.lineTo(p_curr.x, p_curr.y);
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

            ctx.lineTo(p_start.x, p_start.y);
            ctx.quadraticCurveTo(p_curr.x, p_curr.y, p_end.x, p_end.y);
        }

        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        ctx.stroke();
    }

    // Draw pool with CSS styles
    function drawPool(ctx, pool, offsetX, offsetY) {
        const x = parseFloat(pool.element.style.left) - offsetX;
        const y = parseFloat(pool.element.style.top) - offsetY;
        const poolWidth = parseFloat(pool.element.style.width) || 800;
        const poolHeight = parseFloat(pool.element.style.height) || 200;

        ctx.save();

        // Pool background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.fillRect(x, y, poolWidth, poolHeight);

        // Pool border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, poolWidth, poolHeight);

        // Pool header background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(x, y, 40, poolHeight);

        // Pool header border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 40, y);
        ctx.lineTo(x + 40, y + poolHeight);
        ctx.stroke();

        // Pool name (rotated)
        ctx.save();
        ctx.translate(x + 20, y + poolHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 212, 255, 0.5)';
        ctx.shadowBlur = 5;
        ctx.fillText(pool.name || 'Pool', 0, 0);
        ctx.restore();

        // Draw lanes
        let currentY = y;
        pool.lanes.forEach((lane, idx) => {
            // Lane border
            if (idx > 0) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x + 40, currentY);
                ctx.lineTo(x + poolWidth, currentY);
                ctx.stroke();
            }

            // Lane header background
            ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.fillRect(x + 40, currentY, 30, lane.height);

            // Lane header border
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + 70, currentY);
            ctx.lineTo(x + 70, currentY + lane.height);
            ctx.stroke();

            // Lane name (rotated)
            ctx.save();
            ctx.translate(x + 55, currentY + lane.height / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.font = '500 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(lane.name, 0, 0);
            ctx.restore();

            currentY += lane.height;
        });

        ctx.restore();
    }

    // Draw element with CSS styles
    function drawElement(ctx, el, offsetX, offsetY) {
        const type = Array.from(el.classList).find(cls => cls !== 'bpmn-element' && cls !== 'selected');
        if (!type) return;

        const x = parseFloat(el.style.left) - offsetX;
        const y = parseFloat(el.style.top) - offsetY;
        const elWidth = el.offsetWidth;
        const elHeight = el.offsetHeight;
        const label = el.querySelector('.element-label')?.innerText || '';

        ctx.save();

        // Draw element based on type
        if (type.includes('event')) {
            drawEvent(ctx, type, x, y, elWidth, elHeight);
        } else if (type.includes('task')) {
            drawTask(ctx, type, x, y, elWidth, elHeight);
        } else if (type.includes('gateway')) {
            drawGateway(ctx, type, x, y, elWidth, elHeight);
        } else if (type === 'data-object') {
            drawDataObject(ctx, type, x, y, elWidth, elHeight);
        } else if (type === 'system-object') {
            drawSystemObject(ctx, type, x, y, elWidth, elHeight);
        }

        // Draw label if exists
        if (label && el.classList.contains('has-label')) {
            drawLabel(ctx, label, x, y, elWidth, elHeight);
        }

        ctx.restore();
    }

    // Draw event (circle)
    function drawEvent(ctx, type, x, y, width, height) {
        const cx = x + width / 2;
        const cy = y + height / 2;
        const r = Math.min(width, height) / 2;

        // Background with blur effect
        ctx.fillStyle = 'rgba(10, 12, 16, 0.6)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        // Border with glow
        ctx.shadowBlur = 10;
        if (type === 'start-event') {
            ctx.strokeStyle = '#4caf50';
            ctx.shadowColor = 'rgba(76, 175, 80, 0.8)';
            ctx.lineWidth = 2;
        } else if (type === 'end-event') {
            ctx.strokeStyle = '#f44336';
            ctx.shadowColor = 'rgba(244, 67, 54, 0.8)';
            ctx.lineWidth = 3;
        } else {
            ctx.strokeStyle = '#ffc107';
            ctx.shadowColor = 'rgba(255, 193, 7, 0.8)';
            ctx.lineWidth = 2;
        }
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Draw task (rounded rectangle)
    function drawTask(ctx, type, x, y, width, height) {
        const radius = 12;

        // Background
        ctx.fillStyle = 'rgba(15, 20, 30, 0.7)';
        ctx.shadowColor = 'rgba(0, 212, 255, 0.1)';
        ctx.shadowBlur = 10;
        roundRect(ctx, x, y, width, height, radius);
        ctx.fill();

        // Border with glow
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.shadowColor = 'rgba(0, 212, 255, 0.3)';
        ctx.shadowBlur = 5;
        roundRect(ctx, x, y, width, height, radius);
        ctx.stroke();

        // Draw task icon (40% size to match CSS)
        const cx = x + width / 2;
        const cy = y + height / 2;
        const iconSize = Math.min(width, height) * 0.4;

        ctx.save();
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = 'rgba(0, 212, 255, 0.5)';
        ctx.shadowBlur = 2;

        if (type === 'service-task') {
            // Draw gear icon
            const r1 = iconSize * 0.3;
            const r2 = iconSize * 0.5;

            // Inner circle
            ctx.beginPath();
            ctx.arc(cx, cy, r1, 0, Math.PI * 2);
            ctx.stroke();

            // Outer gear teeth (simplified as circle)
            ctx.beginPath();
            ctx.arc(cx, cy, r2, 0, Math.PI * 2);
            ctx.stroke();

            // Cross lines
            ctx.beginPath();
            ctx.moveTo(cx - iconSize * 0.6, cy);
            ctx.lineTo(cx + iconSize * 0.6, cy);
            ctx.moveTo(cx, cy - iconSize * 0.6);
            ctx.lineTo(cx, cy + iconSize * 0.6);
            ctx.stroke();
        } else if (type === 'user-task') {
            // Draw user icon
            // Head
            ctx.beginPath();
            ctx.arc(cx, cy - iconSize * 0.2, iconSize * 0.25, 0, Math.PI * 2);
            ctx.stroke();

            // Body (simplified)
            ctx.beginPath();
            ctx.arc(cx, cy + iconSize * 0.3, iconSize * 0.4, Math.PI, 0, false);
            ctx.stroke();
        }

        ctx.restore();
    }

    // Draw gateway (diamond)
    function drawGateway(ctx, type, x, y, width, height) {
        const cx = x + width / 2;
        const cy = y + height / 2;

        // Background
        ctx.fillStyle = 'rgba(15, 20, 30, 0.7)';
        ctx.shadowColor = 'rgba(0, 212, 255, 0.1)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(cx, y);
        ctx.lineTo(x + width, cy);
        ctx.lineTo(cx, y + height);
        ctx.lineTo(x, cy);
        ctx.closePath();
        ctx.fill();

        // Border with glow
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.shadowColor = 'rgba(0, 212, 255, 0.3)';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.moveTo(cx, y);
        ctx.lineTo(x + width, cy);
        ctx.lineTo(cx, y + height);
        ctx.lineTo(x, cy);
        ctx.closePath();
        ctx.stroke();

        // Draw gateway icon (60% size to match CSS)
        const iconSize = Math.min(width, height) * 0.6;

        ctx.save();
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(0, 212, 255, 0.5)';
        ctx.shadowBlur = 2;

        if (type === 'exclusive-gateway') {
            // Draw X
            const offset = iconSize * 0.35;
            ctx.beginPath();
            ctx.moveTo(cx - offset, cy - offset);
            ctx.lineTo(cx + offset, cy + offset);
            ctx.moveTo(cx + offset, cy - offset);
            ctx.lineTo(cx - offset, cy + offset);
            ctx.stroke();
        } else if (type === 'parallel-gateway') {
            // Draw +
            const offset = iconSize * 0.4;
            ctx.beginPath();
            ctx.moveTo(cx, cy - offset);
            ctx.lineTo(cx, cy + offset);
            ctx.moveTo(cx - offset, cy);
            ctx.lineTo(cx + offset, cy);
            ctx.stroke();
        }

        ctx.restore();
    }

    // Draw data object (rectangle)
    function drawDataObject(ctx, type, x, y, width, height) {
        // Background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 5;
        ctx.fillRect(x, y, width, height);

        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);

        // Folded corner
        const cornerSize = 8;
        ctx.beginPath();
        ctx.moveTo(x + width - cornerSize, y);
        ctx.lineTo(x + width, y + cornerSize);
        ctx.lineTo(x + width - cornerSize, y + cornerSize);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.stroke();

        // Draw document icon (45% size to match CSS)
        const cx = x + width / 2;
        const cy = y + height / 2;
        const iconWidth = width * 0.45;
        const iconHeight = height * 0.45;
        const iconX = cx - iconWidth / 2;
        const iconY = cy - iconHeight / 2;

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
        ctx.shadowBlur = 2;

        // Document outline
        ctx.beginPath();
        ctx.moveTo(iconX, iconY);
        ctx.lineTo(iconX + iconWidth * 0.7, iconY);
        ctx.lineTo(iconX + iconWidth, iconY + iconHeight * 0.3);
        ctx.lineTo(iconX + iconWidth, iconY + iconHeight);
        ctx.lineTo(iconX, iconY + iconHeight);
        ctx.closePath();
        ctx.stroke();

        // Folded corner line
        ctx.beginPath();
        ctx.moveTo(iconX + iconWidth * 0.7, iconY);
        ctx.lineTo(iconX + iconWidth * 0.7, iconY + iconHeight * 0.3);
        ctx.lineTo(iconX + iconWidth, iconY + iconHeight * 0.3);
        ctx.stroke();

        ctx.restore();
    }

    // Draw system object (gear icon)
    function drawSystemObject(ctx, type, x, y, width, height) {
        // Background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 5;
        ctx.fillRect(x, y, width, height);

        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);

        // Draw simplified gear icon (45% size to match CSS)
        const cx = x + width / 2;
        const cy = y + height / 2;
        const iconSize = Math.min(width, height) * 0.45;

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
        ctx.shadowBlur = 2;

        // Inner circle
        ctx.beginPath();
        ctx.arc(cx, cy, iconSize * 0.4, 0, Math.PI * 2);
        ctx.stroke();

        // Outer circle (gear teeth simplified)
        ctx.beginPath();
        ctx.arc(cx, cy, iconSize * 0.7, 0, Math.PI * 2);
        ctx.stroke();

        // Cross lines for gear teeth
        ctx.beginPath();
        ctx.moveTo(cx - iconSize, cy);
        ctx.lineTo(cx + iconSize, cy);
        ctx.moveTo(cx, cy - iconSize);
        ctx.lineTo(cx, cy + iconSize);
        ctx.stroke();

        ctx.restore();
    }

    // Draw label
    function drawLabel(ctx, text, x, y, width, height) {
        ctx.save();

        // Background gradient
        const gradient = ctx.createRadialGradient(
            x + width / 2, y + height / 2, 0,
            x + width / 2, y + height / 2, width / 2
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
        gradient.addColorStop(0.8, 'rgba(0, 0, 0, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, width, height);

        // Text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '300 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 212, 255, 0.5)';
        ctx.shadowBlur = 5;

        // Word wrap
        const maxWidth = width - 16;
        const words = text.split(' ');
        let line = '';
        const lines = [];

        words.forEach(word => {
            const testLine = line + word + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && line !== '') {
                lines.push(line);
                line = word + ' ';
            } else {
                line = testLine;
            }
        });
        lines.push(line);

        const lineHeight = 14;
        const startY = y + height / 2 - (lines.length - 1) * lineHeight / 2;

        lines.forEach((line, i) => {
            ctx.fillText(line.trim(), x + width / 2, startY + i * lineHeight);
        });

        ctx.restore();
    }

    // Helper: Draw rounded rectangle
    function roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    // Utility: Escape XML special characters
    function escapeXML(str) {
        return str.replace(/[<>&'"]/g, (c) => {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case "'": return '&apos;';
                case '"': return '&quot;';
                default: return c;
            }
        });
    }

    // Utility: Download file
    function downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initExporter);
    } else {
        initExporter();
    }

})();
