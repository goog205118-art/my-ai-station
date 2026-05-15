// ==========================================
// 🚀 Veo Flow 核心节点引擎 (Vanilla JS)
// ==========================================

const viewport = document.getElementById('flow-viewport');
const canvas = document.getElementById('flow-canvas');
const svgLayer = document.getElementById('svg-layer');
const nodeBoard = document.getElementById('node-board');

// 1. 全局状态机
let flowState = {
    transform: { x: 0, y: 0, scale: 1 },
    isPanning: false,
    startX: 0, startY: 0,
    
    // 模拟的初始数据 (后续从 DB 读取)
    nodes: [
        { id: 'node_1', type: 'image_gen', title: '🎨 生图节点 (源)', x: 100, y: 150, ports: { out: [{ id: 'out_img', type: 'image', label: '输出图像' }] } },
        { id: 'node_2', type: 'video_gen', title: '🎞️ 视频节点 (目标)', x: 600, y: 200, ports: { in: [{ id: 'in_img', type: 'image', label: '首帧参考图' }] } }
    ],
    // 连线关系：sourceNode -> sourcePort -> targetNode -> targetPort
    links: [
        { id: 'link_1', source: 'node_1', sourcePort: 'out_img', target: 'node_2', targetPort: 'in_img', type: 'image' }
    ]
};

// ==========================================
// 🎨 渲染引擎
// ==========================================

// 渲染所有节点
function renderNodes() {
    nodeBoard.innerHTML = flowState.nodes.map(node => `
        <div class="veo-node" id="${node.id}" style="transform: translate(${node.x}px, ${node.y}px);" onmousedown="startDragNode(event, '${node.id}')">
            <div class="node-header" style="background: ${node.type === 'image_gen' ? 'rgba(192,132,252,0.1)' : 'rgba(56,189,248,0.1)'};">
                ${node.title}
            </div>
            <div class="node-body">
                ${(node.ports.in || []).map(p => `<div class="port-row"><div class="port port-in port-${p.type}" id="${node.id}-${p.id}"></div><span style="margin-left: 12px;">${p.label}</span></div>`).join('')}
                ${(node.ports.out || []).map(p => `<div class="port-row" style="justify-content: flex-end;"><span style="margin-right: 12px;">${p.label}</span><div class="port port-out port-${p.type}" id="${node.id}-${p.id}"></div></div>`).join('')}
            </div>
        </div>
    `).join('');
}

// 动态计算并渲染贝塞尔连线
function renderLinks() {
    let svgPaths = '';
    flowState.links.forEach(link => {
        const sourcePortEl = document.getElementById(`${link.source}-${link.sourcePort}`);
        const targetPortEl = document.getElementById(`${link.target}-${link.targetPort}`);
        
        if (sourcePortEl && targetPortEl) {
            // 获取引脚在画布内的相对坐标
            const sourceRect = sourcePortEl.getBoundingClientRect();
            const targetRect = targetPortEl.getBoundingClientRect();
            const canvasRect = canvas.getBoundingClientRect();
            
            const x1 = (sourceRect.left + sourceRect.width/2 - canvasRect.left) / flowState.transform.scale;
            const y1 = (sourceRect.top + sourceRect.height/2 - canvasRect.top) / flowState.transform.scale;
            const x2 = (targetRect.left + targetRect.width/2 - canvasRect.left) / flowState.transform.scale;
            const y2 = (targetRect.top + targetRect.height/2 - canvasRect.top) / flowState.transform.scale;
            
            // 三次贝塞尔曲线公式 (水平柔和弯曲)
            const controlOffset = Math.max(Math.abs(x2 - x1) / 2, 50);
            const pathData = `M ${x1} ${y1} C ${x1 + controlOffset} ${y1}, ${x2 - controlOffset} ${y2}, ${x2} ${y2}`;
            
            const color = link.type === 'image' ? '#c084fc' : '#38bdf8';
            svgPaths += `<path d="${pathData}" stroke="${color}" stroke-width="3" fill="none" opacity="0.6" stroke-linecap="round"/>`;
        }
    });
    svgLayer.innerHTML = svgPaths;
}

// ==========================================
// 🖱️ 交互引擎 (画布与节点拖拽)
// ==========================================

// 节点拖拽
let activeNode = null;
function startDragNode(e, nodeId) {
    if (e.button !== 0 || e.target.classList.contains('port')) return; // 忽略非左键或点击引脚
    e.stopPropagation();
    activeNode = flowState.nodes.find(n => n.id === nodeId);
    flowState.startX = e.clientX;
    flowState.startY = e.clientY;
    
    // 提升层级
    const el = document.getElementById(nodeId);
    el.style.zIndex = 100;
}

window.addEventListener('mousemove', (e) => {
    // 节点拖拽中...
    if (activeNode) {
        const dx = (e.clientX - flowState.startX) / flowState.transform.scale;
        const dy = (e.clientY - flowState.startY) / flowState.transform.scale;
        activeNode.x += dx;
        activeNode.y += dy;
        flowState.startX = e.clientX;
        flowState.startY = e.clientY;
        
        // DOM 极致优化：只动当前节点和线，不引起全局重排
        document.getElementById(activeNode.id).style.transform = `translate(${activeNode.x}px, ${activeNode.y}px)`;
        renderLinks(); 
    }
    
    // 画布平移中...
    if (flowState.isPanning) {
        flowState.transform.x += (e.clientX - flowState.startX);
        flowState.transform.y += (e.clientY - flowState.startY);
        flowState.startX = e.clientX;
        flowState.startY = e.clientY;
        updateCanvasTransform();
    }
});

window.addEventListener('mouseup', () => {
    if (activeNode) document.getElementById(activeNode.id).style.zIndex = '';
    activeNode = null;
    flowState.isPanning = false;
    viewport.style.cursor = 'grab';
});

// 画布平移与缩放 (中键 / 空格)
viewport.addEventListener('mousedown', (e) => {
    if (e.button === 1 || (e.button === 0 && e.target === viewport)) {
        flowState.isPanning = true;
        flowState.startX = e.clientX;
        flowState.startY = e.clientY;
        viewport.style.cursor = 'grabbing';
    }
});

viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomIntensity = 0.05;
    const wheel = e.deltaY < 0 ? 1 : -1;
    let newScale = flowState.transform.scale * Math.exp(wheel * zoomIntensity);
    newScale = Math.min(Math.max(0.2, newScale), 3); // 限制缩放 0.2x - 3x
    
    // 以鼠标中心点缩放算法
    const rect = viewport.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
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

// ==========================================
// 🚀 初始化启动
// ==========================================
function initFlowEngine() {
    renderNodes();
    // 延迟 50ms 渲染线，确保 DOM 已挂载完成能够获取到准确的宽高
    setTimeout(renderLinks, 50); 
    updateCanvasTransform();
}
