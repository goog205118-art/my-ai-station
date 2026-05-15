// ==========================================
// 🚀 Veo Flow 核心节点引擎 V2 (加入动态拉线状态机)
// ==========================================

const viewport = document.getElementById('flow-viewport');
const canvas = document.getElementById('flow-canvas');
const svgLayer = document.getElementById('svg-layer');
const nodeBoard = document.getElementById('node-board');

// 🌟 修复 SVG 容器折叠导致的连线消失问题
canvas.style.width = '1px'; canvas.style.height = '1px'; canvas.style.overflow = 'visible';
svgLayer.style.width = '1px'; svgLayer.style.height = '1px'; svgLayer.style.overflow = 'visible';

// 1. 全局状态机
let flowState = {
    transform: { x: 0, y: 0, scale: 1 },
    isPanning: false, startX: 0, startY: 0,
    activeNode: null,
    
    // 🌟 新增：动态拉线状态
    drawingLink: { 
        active: false, sourceNode: null, sourcePort: null, type: null, 
        startX: 0, startY: 0, currentX: 0, currentY: 0 
    },
    
    nodes: [
        { id: 'node_1', type: 'image_gen', title: '🎨 生图节点 (源)', x: 100, y: 150, ports: { out: [{ id: 'out_img', type: 'image', label: '输出图像' }] } },
        { id: 'node_2', type: 'video_gen', title: '🎞️ 视频节点 (目标)', x: 600, y: 200, ports: { in: [{ id: 'in_img', type: 'image', label: '首帧参考图' }] } },
        { id: 'node_3', type: 'video_gen', title: '🎞️ 视频节点 (分发)', x: 600, y: 400, ports: { in: [{ id: 'in_img2', type: 'image', label: '备用参考图' }] } }
    ],
    links: [
        { id: 'link_1', source: 'node_1', sourcePort: 'out_img', target: 'node_2', targetPort: 'in_img', type: 'image' }
    ]
};

// ==========================================
// 🎨 渲染引擎
// ==========================================

function renderNodes() {
    if(!nodeBoard) return;
    nodeBoard.innerHTML = flowState.nodes.map(node => `
        <div class="veo-node" id="${node.id}" style="transform: translate(${node.x}px, ${node.y}px);" onmousedown="startDragNode(event, '${node.id}')">
            <div class="node-header" style="background: ${node.type === 'image_gen' ? 'rgba(192,132,252,0.1)' : 'rgba(56,189,248,0.1)'};">
                ${node.title}
            </div>
            <div class="node-body">
                ${(node.ports.in || []).map(p => `
                    <div class="port-row">
                        <div class="port port-in port-${p.type}" id="${node.id}-${p.id}" 
                             onmousedown="startDrawLink(event, '${node.id}', '${p.id}', '${p.type}', 'in')" 
                             onmouseup="finishDrawLink(event, '${node.id}', '${p.id}', '${p.type}', 'in')"></div>
                        <span style="margin-left: 12px;">${p.label}</span>
                    </div>
                `).join('')}
                ${(node.ports.out || []).map(p => `
                    <div class="port-row" style="justify-content: flex-end;">
                        <span style="margin-right: 12px;">${p.label}</span>
                        <div class="port port-out port-${p.type}" id="${node.id}-${p.id}" 
                             onmousedown="startDrawLink(event, '${node.id}', '${p.id}', '${p.type}', 'out')"
                             onmouseup="finishDrawLink(event, '${node.id}', '${p.id}', '${p.type}', 'out')"></div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function renderLinks() {
    if(!svgLayer) return;
    let svgPaths = '';
    const canvasRect = canvas.getBoundingClientRect();
    
    // 1. 渲染已固化的连线
    flowState.links.forEach(link => {
        const sourcePortEl = document.getElementById(`${link.source}-${link.sourcePort}`);
        const targetPortEl = document.getElementById(`${link.target}-${link.targetPort}`);
        if (sourcePortEl && targetPortEl) {
            const sRect = sourcePortEl.getBoundingClientRect();
            const tRect = targetPortEl.getBoundingClientRect();
            const x1 = (sRect.left + sRect.width/2 - canvasRect.left) / flowState.transform.scale;
            const y1 = (sRect.top + sRect.height/2 - canvasRect.top) / flowState.transform.scale;
            const x2 = (tRect.left + tRect.width/2 - canvasRect.left) / flowState.transform.scale;
            const y2 = (tRect.top + tRect.height/2 - canvasRect.top) / flowState.transform.scale;
            
            const offset = Math.max(Math.abs(x2 - x1) / 2, 60);
            const color = link.type === 'image' ? '#c084fc' : '#38bdf8';
            svgPaths += `<path d="M ${x1} ${y1} C ${x1 + offset} ${y1}, ${x2 - offset} ${y2}, ${x2} ${y2}" stroke="${color}" stroke-width="3" fill="none" opacity="0.8" stroke-linecap="round"/>`;
        }
    });

    // 2. 🌟 渲染用户正在拖拽的动态连线
    if (flowState.drawingLink.active) {
        const x1 = flowState.drawingLink.startX;
        const y1 = flowState.drawingLink.startY;
        const x2 = flowState.drawingLink.currentX;
        const y2 = flowState.drawingLink.currentY;
        const offset = Math.max(Math.abs(x2 - x1) / 2, 60);
        const color = flowState.drawingLink.type === 'image' ? '#c084fc' : '#38bdf8';
        svgPaths += `<path d="M ${x1} ${y1} C ${x1 + offset} ${y1}, ${x2 - offset} ${y2}, ${x2} ${y2}" stroke="${color}" stroke-width="3" fill="none" stroke-dasharray="6,6" opacity="0.9" stroke-linecap="round"/>`;
    }

    svgLayer.innerHTML = svgPaths;
}

// ==========================================
// 🖱️ 交互引擎 (拖拉拽核心)
// ==========================================

function startDragNode(e, nodeId) {
    if (e.button !== 0 || e.target.classList.contains('port')) return; 
    e.stopPropagation();
    flowState.activeNode = flowState.nodes.find(n => n.id === nodeId);
    flowState.startX = e.clientX; flowState.startY = e.clientY;
    document.getElementById(nodeId).style.zIndex = 100;
}

// 🌟 开始拉线
window.startDrawLink = function(e, nodeId, portId, portType, ioType) {
    if (ioType !== 'out') return; // 目前只允许从 output 往 input 拉线
    e.stopPropagation();
    
    const portEl = e.target;
    const pRect = portEl.getBoundingClientRect();
    const cRect = canvas.getBoundingClientRect();
    
    flowState.drawingLink = {
        active: true, sourceNode: nodeId, sourcePort: portId, type: portType,
        startX: (pRect.left + pRect.width/2 - cRect.left) / flowState.transform.scale,
        startY: (pRect.top + pRect.height/2 - cRect.top) / flowState.transform.scale,
        currentX: (e.clientX - cRect.left) / flowState.transform.scale,
        currentY: (e.clientY - cRect.top) / flowState.transform.scale
    };
};

// 🌟 结束拉线 (吸附判断)
window.finishDrawLink = function(e, targetNodeId, targetPortId, targetPortType, ioType) {
    e.stopPropagation();
    if (!flowState.drawingLink.active) return;
    
    const { sourceNode, sourcePort, type } = flowState.drawingLink;
    
    // 逻辑校验：不能连自己，必须 Out连In，且类型(颜色)必须匹配
    if (sourceNode !== targetNodeId && ioType === 'in' && type === targetPortType) {
        // 防止重复连线
        const exists = flowState.links.find(l => l.source === sourceNode && l.sourcePort === sourcePort && l.target === targetNodeId && l.targetPort === targetPortId);
        if (!exists) {
            flowState.links.push({
                id: 'link_' + Date.now(),
                source: sourceNode, sourcePort: sourcePort,
                target: targetNodeId, targetPort: targetPortId,
                type: type
            });
            console.log(`🔗 连线成功: ${sourceNode} -> ${targetNodeId}`);
        }
    }
    
    flowState.drawingLink.active = false;
    renderLinks();
};


window.addEventListener('mousemove', (e) => {
    // 处理拉线动画
    if (flowState.drawingLink.active) {
        const cRect = canvas.getBoundingClientRect();
        flowState.drawingLink.currentX = (e.clientX - cRect.left) / flowState.transform.scale;
        flowState.drawingLink.currentY = (e.clientY - cRect.top) / flowState.transform.scale;
        renderLinks();
        return; 
    }

    // 处理节点拖拽
    if (flowState.activeNode) {
        const dx = (e.clientX - flowState.startX) / flowState.transform.scale;
        const dy = (e.clientY - flowState.startY) / flowState.transform.scale;
        flowState.activeNode.x += dx; flowState.activeNode.y += dy;
        flowState.startX = e.clientX; flowState.startY = e.clientY;
        document.getElementById(flowState.activeNode.id).style.transform = `translate(${flowState.activeNode.x}px, ${flowState.activeNode.y}px)`;
        renderLinks(); 
    }
    
    // 处理画布平移
    if (flowState.isPanning) {
        flowState.transform.x += (e.clientX - flowState.startX);
        flowState.transform.y += (e.clientY - flowState.startY);
        flowState.startX = e.clientX; flowState.startY = e.clientY;
        updateCanvasTransform();
    }
});

window.addEventListener('mouseup', () => {
    if (flowState.activeNode) document.getElementById(flowState.activeNode.id).style.zIndex = '';
    flowState.activeNode = null;
    flowState.isPanning = false;
    viewport.style.cursor = 'grab';
    
    // 如果拉线松开在空白处，取消拉线
    if (flowState.drawingLink.active) {
        flowState.drawingLink.active = false;
        renderLinks();
    }
});

// 画布平移与缩放逻辑 (保持不变)
viewport.addEventListener('mousedown', (e) => {
    if (e.button === 1 || (e.button === 0 && e.target === viewport)) {
        flowState.isPanning = true; flowState.startX = e.clientX; flowState.startY = e.clientY;
        viewport.style.cursor = 'grabbing';
    }
});

viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomIntensity = 0.05; const wheel = e.deltaY < 0 ? 1 : -1;
    let newScale = flowState.transform.scale * Math.exp(wheel * zoomIntensity);
    newScale = Math.min(Math.max(0.2, newScale), 3); 
    const rect = viewport.getBoundingClientRect();
    const mouseX = e.clientX - rect.left; const mouseY = e.clientY - rect.top;
    flowState.transform.x = mouseX - (mouseX - flowState.transform.x) * (newScale / flowState.transform.scale);
    flowState.transform.y = mouseY - (mouseY - flowState.transform.y) * (newScale / flowState.transform.scale);
    flowState.transform.scale = newScale;
    updateCanvasTransform();
}, { passive: false });

function updateCanvasTransform() {
    canvas.style.transform = `translate(${flowState.transform.x}px, ${flowState.transform.y}px) scale(${flowState.transform.scale})`;
    viewport.style.backgroundPosition = `${flowState.transform.x}px ${flowState.transform.y}px`;
    viewport.style.backgroundSize = `${20 * flowState.transform.scale}px ${20 * flowState.transform.scale}px`;
}

function initFlowEngine() {
    renderNodes();
    setTimeout(renderLinks, 50); 
    updateCanvasTransform();
}
