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
// 🎨 支持内联预览的渲染引擎
// ==========================================
function renderPreview(node) {
    if (!node.result) return '';
    if (node.type === 'tool_image_gen') {
        return `<img src="${node.result}" style="width:100%; height:auto; display:block;" />`;
    } else if (node.type === 'tool_video_gen') {
        return `<video src="${node.result}" style="width:100%; height:auto; display:block;" autoplay loop muted controls></video>`;
    }
    return '';
}

function renderNodes() {
    if(!nodeBoard) return;
    nodeBoard.innerHTML = flowState.nodes.map(node => {
        let inputsHtml = '';
        if (node.inputs && node.inputs.length > 0) {
            inputsHtml = '<div class="node-inputs-container">';
            node.inputs.forEach(inp => {
                const val = node.data && node.data[inp.id] !== undefined ? node.data[inp.id] : inp.default;
                inputsHtml += `<div class="node-input-group"><div class="node-input-label">${inp.label}</div>`;
                if (inp.type === 'textarea') {
                    inputsHtml += `<textarea class="node-input" rows="3" onmousedown="event.stopPropagation()" oninput="updateNodeData('${node.id}', '${inp.id}', this.value)">${val}</textarea>`;
                } else if (inp.type === 'select') {
                    inputsHtml += `<select class="node-input" onmousedown="event.stopPropagation()" onchange="updateNodeData('${node.id}', '${inp.id}', this.value)">
                        ${inp.options.map(opt => `<option value="${opt}" ${val === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                    </select>`;
                }
                inputsHtml += `</div>`;
            });
            inputsHtml += '</div>';
        }

        return `
        <div class="veo-node" id="${node.id}" style="transform: translate(${node.x}px, ${node.y}px);" 
             onmousedown="startDragNode(event, '${node.id}')" oncontextmenu="showNodeMenu(event, '${node.id}')">
            <div class="node-header" style="background: ${node.type === 'tool_image_gen' ? 'rgba(192,132,252,0.1)' : 'rgba(56,189,248,0.1)'};">
                ${node.title}
            </div>
            <div class="node-body">
                ${inputsHtml}
                
                ${(node.ports.in || []).map(p => `
                    <div class="port-row">
                        <div class="port port-in port-${p.type}" id="${node.id}-${p.id}" 
                             onmousedown="startDrawLink(event, '${node.id}', '${p.id}', '${p.type}', 'in')" 
                             onmouseup="finishDrawLink(event, '${node.id}', '${p.id}', '${p.type}', 'in')"
                             ondblclick="disconnectPort(event, '${node.id}', '${p.id}')"></div>
                        <span style="margin-left: 12px;">${p.label}</span>
                    </div>
                `).join('')}
                ${(node.ports.out || []).map(p => `
                    <div class="port-row" style="justify-content: flex-end;">
                        <span style="margin-right: 12px;">${p.label}</span>
                        <div class="port port-out port-${p.type}" id="${node.id}-${p.id}" 
                             onmousedown="startDrawLink(event, '${node.id}', '${p.id}', '${p.type}', 'out')"
                             onmouseup="finishDrawLink(event, '${node.id}', '${p.id}', '${p.type}', 'out')"
                             ondblclick="disconnectPort(event, '${node.id}', '${p.id}')"></div>
                    </div>
                `).join('')}
                
                <div id="preview-${node.id}" style="margin-top:10px; border-radius:6px; overflow:hidden; background:rgba(0,0,0,0.3);">
                    ${node.result ? renderPreview(node) : ''}
                </div>
            </div>
        </div>`;
    }).join('');
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
    const tag = e.target.tagName;
    // 🌟 核心拦截：如果是右键、或者是引脚、或者是表单元素，绝对不要触发节点拖拽！
    if (e.button !== 0 || e.target.classList.contains('port') || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'OPTION') return; 
    
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
// ==========================================
// 🔪 生命与毁灭引擎 (断线、删除、右键菜单)
// ==========================================

// 1. 双击引脚断线逻辑
window.disconnectPort = function(e, nodeId, portId) {
    e.stopPropagation();
    const initialLen = flowState.links.length;
    // 过滤掉所有起点或终点是当前引脚的连线
    flowState.links = flowState.links.filter(l => !(
        (l.source === nodeId && l.sourcePort === portId) ||
        (l.target === nodeId && l.targetPort === portId)
    ));
    if (flowState.links.length !== initialLen) renderLinks();
};

// ==========================================
// 🌟 升级版节点蓝图：完全对齐 GPT / Veo 真实模型
// ==========================================
const NodeBlueprints = {
    'tool_image_gen': { 
        type: 'tool_image_gen', title: '🎨 GPT 多模态生图', 
        ports: { 
            in: [{ id: 'in_ref', type: 'image', label: '风格垫图 (选填)' }],
            out: [{ id: 'out_img', type: 'image', label: '输出图像' }] 
        },
        inputs: [
            { id: 'prompt', type: 'textarea', label: '正向提示词 (Prompt)', default: '一瓶放在岩石上的高级香水，雪山背景，8k' },
            { id: 'size', type: 'select', label: '画幅尺寸', options: ['1024x1024', '1024x576', '576x1024'], default: '1024x1024' },
            { id: 'channel', type: 'select', label: '生成通道', options: ['通道 1 (主干)', '通道 2 (备用)'], default: '通道 1 (主干)' }
        ],
        data: {} 
    },
    'tool_video_gen': { 
        type: 'tool_video_gen', title: '🎞️ Veo 视频生成', 
        ports: { 
            in: [
                { id: 'in_first_frame', type: 'image', label: '首帧参考图 (优先)' },
                { id: 'in_last_frame', type: 'image', label: '尾帧参考图 (选填)' },
                { id: 'in_ref', type: 'image', label: '通用垫图 (兜底)' }
            ],
            out: [{ id: 'out_video', type: 'video', label: '输出视频' }] 
        },
        inputs: [
            { id: 'prompt', type: 'textarea', label: '运镜与动作描述 (选填)', default: '' },
            // 🌟 修复：严格对齐云雾 API 的 4 个合法模型名称 (去掉横杠，补齐 components)
            { id: 'model', type: 'select', label: '生成模型', options: ['veo3.1', 'veo3.1-4k', 'veo3.1-components', 'veo3.1-components-4k'], default: 'veo3.1' },
            { id: 'aspectRatio', type: 'select', label: '画幅比例', options: ['16:9', '9:16', '1:1'], default: '16:9' }
        ],
        data: {}
    }
};

// 确保双向绑定引擎存在
window.updateNodeData = function(nodeId, key, value) {
    const node = flowState.nodes.find(n => n.id === nodeId);
    if (node) {
        if (!node.data) node.data = {};
        node.data[key] = value;
    }
};

// 3. 动态创建右键菜单 DOM
const ctxMenu = document.createElement('div');
ctxMenu.id = 'veo-context-menu';
ctxMenu.style.cssText = `
    position: absolute; display: none; z-index: 1000; background: rgba(25, 25, 30, 0.95);
    backdrop-filter: blur(15px); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.8); padding: 6px; min-width: 160px; color: #fff; font-size: 13px;
`;
document.body.appendChild(ctxMenu);

// 全局隐藏菜单
window.addEventListener('click', () => ctxMenu.style.display = 'none');
viewport.addEventListener('mousedown', () => ctxMenu.style.display = 'none'); // 画布拖拽时也隐藏

let menuTargetNodeId = null; 
let menuClickWorldPos = { x: 0, y: 0 };

// 4. 右键节点 -> 唤出【删除菜单】
window.showNodeMenu = function(e, nodeId) {
    e.preventDefault(); e.stopPropagation();
    menuTargetNodeId = nodeId;
    ctxMenu.innerHTML = `
        <div style="padding: 8px 12px; cursor: pointer; border-radius: 4px; color: #ef4444;" 
             onmouseover="this.style.background='rgba(239,68,68,0.1)'" onmouseout="this.style.background='transparent'"
             onclick="deleteNode('${nodeId}')">
            <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">delete</span> 删除节点
        </div>
    `;
    ctxMenu.style.left = e.clientX + 'px'; ctxMenu.style.top = e.clientY + 'px'; ctxMenu.style.display = 'block';
};

window.deleteNode = function(nodeId) {
    flowState.nodes = flowState.nodes.filter(n => n.id !== nodeId);
    flowState.links = flowState.links.filter(l => l.source !== nodeId && l.target !== nodeId); // 级联删除相关的线
    renderNodes(); renderLinks();
};

// 5. 右键画布空白处 -> 唤出【添加节点菜单】
viewport.addEventListener('contextmenu', (e) => {
    if (e.target !== viewport && e.target !== svgLayer) return; // 确保点的是空白处
    e.preventDefault(); e.stopPropagation();
    
    // 记录鼠标在真实画布世界里的坐标
    const rect = canvas.getBoundingClientRect();
    menuClickWorldPos.x = (e.clientX - rect.left) / flowState.transform.scale;
    menuClickWorldPos.y = (e.clientY - rect.top) / flowState.transform.scale;

    let html = `<div style="padding: 4px 8px; font-size: 11px; color: #666; border-bottom: 1px solid #333; margin-bottom: 4px;">添加节点</div>`;
    for (let key in NodeBlueprints) {
        html += `
            <div style="padding: 8px 12px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 8px;" 
                 onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'"
                 onclick="spawnNode('${key}')">
                ${NodeBlueprints[key].title}
            </div>
        `;
    }
    ctxMenu.innerHTML = html;
    ctxMenu.style.left = e.clientX + 'px'; ctxMenu.style.top = e.clientY + 'px'; ctxMenu.style.display = 'block';
});

window.spawnNode = function(blueprintKey) {
    const blueprint = NodeBlueprints[blueprintKey];
    const newNode = JSON.parse(JSON.stringify(blueprint)); // 深拷贝蓝图
    newNode.id = 'node_' + Date.now();
    newNode.x = menuClickWorldPos.x;
    newNode.y = menuClickWorldPos.y;
    
    flowState.nodes.push(newNode);
    renderNodes(); // 重新渲染画布
};
// ==========================================
// ⚙️ Phase 6: DAG 拓扑执行引擎 (工业级重构版)
// ==========================================

window.runFlow = async function() {
    console.log("🚀 [执行引擎] 启动工业级 DAG 拓扑扫描...");

    // 1. 构建依赖关系图谱
    const nodeDeps = {};      // 记录每个节点依赖的【上游节点列表】
    const nodePromises = {};  // 记录每个节点的【执行 Promise】，用于下游等待
    
    // 初始化所有节点的依赖表
    flowState.nodes.forEach(n => {
        nodeDeps[n.id] = new Set();
    });

    // 根据连线填充依赖关系
    flowState.links.forEach(link => {
        if (nodeDeps[link.target]) {
            nodeDeps[link.target].add(link.source);
        }
    });

    // 2. 检查循环引用 (简单的拓扑排序死锁检测)
    let executionPlan = [];
    let readyQueue = flowState.nodes.filter(n => nodeDeps[n.id].size === 0).map(n => n.id);
    
    if (readyQueue.length === 0) {
        return alert("⚠️ 错误：未找到起点节点，或者工作流中存在死循环连线！");
    }

    // 3. 核心升级：基于 Promise 链的智能并发执行
    // 这次我们不手动 `setTimeout` 递归了，而是让系统自行判断依赖是否满足
    console.log(`[执行引擎] 探测到 ${readyQueue.length} 个起源节点，构建执行管线...`);

    // 重置所有节点的状态和结果
    flowState.nodes.forEach(n => {
        n.result = null; // 清空上次跑的缓存
        setNodeStatus(n.id, 'idle');
    });

    // 封装一个包装函数：等待上游，再执行自己
    const scheduleNode = async (nodeId) => {
        // 如果这个节点的 Promise 已经创建了，说明已经在管线里了，直接返回
        if (nodePromises[nodeId]) return nodePromises[nodeId];

        const deps = Array.from(nodeDeps[nodeId]);
        
        // 【核心等待机制】：必须等待所有上游节点的 Promise 执行完毕！
        const upstreamPromises = deps.map(depId => scheduleNode(depId));
        
        // 创建自己的执行 Promise
        nodePromises[nodeId] = (async () => {
            // 等待所有上游兄弟干完活
            if (upstreamPromises.length > 0) {
                console.log(`   ⏳ [管线调度] 节点 ${nodeId} 正在等待上游就绪...`);
                await Promise.all(upstreamPromises);
            }
            // 上游全跑完了，开始跑自己
            await executeNode(nodeId);
        })();

        return nodePromises[nodeId];
    };

    // 4. 触发全图执行
    try {
        // 找出所有节点，把它们全塞进调度管线里去
        const allExecutions = flowState.nodes.map(n => scheduleNode(n.id));
        
        // 等待整个图执行完毕
        await Promise.all(allExecutions);
        console.log("✅ [执行引擎] 工作流全链路并发执行完毕！");
        
    } catch (err) {
        console.error("❌ [执行引擎] 链路崩溃:", err);
        alert("执行流异常中断，请查看控制台日志。");
    }
};

// ==========================================
// 🔌 真实 API 对接与异步轮询引擎 (终极防弹版)
// ==========================================

const BASE_N8N_URL = 'https://api.wallyai.top/webhook'; 
const API_HEADERS = { 
    'Content-Type': 'application/json',
    'wally123': sessionStorage.getItem('veo_admin_pwd') || '2026veo' 
};

// 🌟 核心新增：万能图片 Base64 转换器 (自带跨域穿透补丁)
async function forceBase64(src) {
    if (!src) return undefined;
    if (src.startsWith('data:image')) return src; // 已经是 Base64，直接放行
    try {
        console.log("   🔄 触发跨域保护，正在通过代理通道转换图片...");
        // 🚀 核心修复：使用 corsproxy 代理穿透 OSS 的跨域限制
        const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(src);
        
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(`代理下载失败: ${res.status}`);
        
        const blob = await res.blob();
        return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn("图片转 Base64 失败，降级使用 URL:", e);
        return src; 
    }
}

async function executeNode(nodeId) {
    const node = flowState.nodes.find(n => n.id === nodeId);
    if (!node) return;

    setNodeStatus(nodeId, 'running');
    console.log(`\n▶️ [启动节点] ${node.title}`);

    try {
        // 1. 索要上游弹药
        let upstreamInputs = {};
        const incomingLinks = flowState.links.filter(l => l.target === nodeId);
        for (let link of incomingLinks) {
            const sourceNode = flowState.nodes.find(n => n.id === link.source);
            if (sourceNode && sourceNode.result) {
                upstreamInputs[link.targetPort] = sourceNode.result; 
            }
        }

        let finalResult = null;
        const nodeData = node.data || {};

        // ----------------------------------------------------
        // 🎨 分支 A：处理 GPT 生图节点
        // ----------------------------------------------------
        if (node.type === 'tool_image_gen') {
            // 🌟 强力拦截：如果没写提示词，直接拒绝发车！
            if (!nodeData.prompt || nodeData.prompt.trim() === '') {
                throw new Error("节点缺少弹药！请先在卡片里填写『正向提示词』再运行。");
            }

            const isChannel2 = nodeData.channel && nodeData.channel.includes('2');
            const payload = {
                prompt: nodeData.prompt.trim(),
                size: nodeData.size || '1024x1024',
                channel: isChannel2 ? 'channel_2' : 'channel_1',
                images: upstreamInputs.in_ref ? [upstreamInputs.in_ref] : []
            };

            console.log("   📦 发送生图请求:", payload);
            const res = await fetch(`${BASE_N8N_URL}/proxy-image-gen`, {
                method: 'POST', headers: API_HEADERS, body: JSON.stringify(payload)
            });
            
            // 🌟 终极防弹：先读纯文本，不急着转 JSON，彻底搞清楚 n8n 返回了什么
            const rawText = await res.text();
            console.log("   📩 n8n 生图接口原始返回:", rawText);

            if (!res.ok) throw new Error(`HTTP ${res.status} 异常: ${rawText}`);
            if (!rawText) throw new Error("n8n 返回了空数据。可能是云雾 API 报错导致 n8n 没有输出节点数据。");
            
            let data;
            try { data = JSON.parse(rawText); } 
            catch (e) { throw new Error(`n8n 返回的不是合法 JSON: ${rawText.substring(0, 40)}...`); }
            
            // 🌟 核心升级：兼容 URL 与 Base64 两种混合返回模式
            const imgObj = data.data && data.data[0] ? data.data[0] : (data[0] || data);
            
            if (imgObj.url) {
                // 情况 1：API 返回了标准的图片链接
                finalResult = imgObj.url;
            } else if (imgObj.b64_json) {
                // 情况 2：API 返回了 Base64 编码
                // 我们必须加上 Data URI 前缀，这样浏览器和下游的 Veo 才能认识它是一张图
                finalResult = "data:image/png;base64," + imgObj.b64_json;
            } else {
                throw new Error("API 成功返回，但未找到 url 或 b64_json 字段: " + rawText.substring(0, 50));
            }
        }
        
        // ----------------------------------------------------
        // 🎞️ 分支 B：处理 Veo 视频节点
        // ----------------------------------------------------
        else if (node.type === 'tool_video_gen') {
            // 将上游图片转为 Base64
            const firstFrame = await forceBase64(upstreamInputs.in_first_frame);
            const lastFrame = await forceBase64(upstreamInputs.in_last_frame);
            const refImages = [];
            if (upstreamInputs.in_ref) {
                refImages.push(await forceBase64(upstreamInputs.in_ref));
            }
            
            if (!firstFrame && refImages.length === 0) {
                throw new Error("缺少首帧或通用垫图连线，Veo 拒绝执行！");
            }

            // 🌟 智能模型校验：提取下拉框模型，默认防呆为 veo3.1
            let targetModel = nodeData.model || "veo3.1";
            
            // 🌟 核心智能纠错机制：
            // 如果用户选了首尾帧模型，但实际连线却只连了"垫图(ref)"，帮他自动更正为 components 模型，防止 API 拒绝！
            if (!firstFrame && refImages.length > 0 && !targetModel.includes('components')) {
                if (targetModel === 'veo3.1') targetModel = 'veo3.1-components';
                if (targetModel === 'veo3.1-4k') targetModel = 'veo3.1-components-4k';
                console.log(`   💡 [智能纠错] 侦测到垫图连线，已将模型自动更正为: ${targetModel}`);
            }

            const payload = {
                model: targetModel,
                prompt: nodeData.prompt || '',
                aspectRatio: nodeData.aspectRatio || "16:9",
                enhancePrompt: true,
                enableUpsample: false,
                firstFrame: firstFrame || undefined,
                lastFrame: lastFrame || undefined,
                references: refImages.length > 0 ? refImages : undefined
            };

            console.log("   📦 发送视频提交请求:", payload);
            const submitRes = await fetch(`${BASE_N8N_URL}/proxy-submit`, {
                method: 'POST', headers: API_HEADERS, body: JSON.stringify(payload)
            });
            
            const submitRawText = await submitRes.text();
            console.log("   📩 n8n 视频提交原始返回:", submitRawText);

            if (!submitRes.ok) throw new Error(`HTTP ${submitRes.status} 异常: ${submitRawText}`);
            if (!submitRawText) throw new Error("n8n 视频提交返回了空数据。");
            
            let submitData;
            try { submitData = JSON.parse(submitRawText); } 
            catch (e) { throw new Error("提交接口返回非 JSON 数据"); }

            if (!submitData.taskId) throw new Error("提交失败，未获得 TaskID: " + submitRawText);
            
            console.log(`   ⏳ 视频已提交云端 (ID: ${submitData.taskId})，启动异步轮询...`);

            let isComplete = false;
            while (!isComplete) {
                await new Promise(r => setTimeout(r, 6000)); 
                
                const pollRes = await fetch(`${BASE_N8N_URL}/proxy-poll`, {
                    method: 'POST', headers: API_HEADERS, body: JSON.stringify({ taskId: submitData.taskId })
                });
                
                const pollRawText = await pollRes.text();
                if (!pollRes.ok) throw new Error(`轮询 HTTP ${pollRes.status} 异常: ${pollRawText}`);
                
                let pollData;
                try { pollData = JSON.parse(pollRawText); } 
                catch (e) { throw new Error("轮询接口返回非 JSON 数据"); }

                console.log(`   🔄 进度: ${pollData.progress} | 状态: ${pollData.status}`);
                
                if (pollData.status === 'success') {
                    finalResult = pollData.videoUrl;
                    isComplete = true;
                } else if (pollData.status === 'failed') {
                    throw new Error(`生成失败: ${pollData.raw_status}`);
                }
            }
        }
        else { finalResult = "OK"; }

        // ==========================================
        // 🌟 收尾流转
        // ==========================================
        node.result = finalResult; 
        setNodeStatus(nodeId, 'success');
        document.getElementById(`preview-${nodeId}`).innerHTML = renderPreview(node);
        console.log(`   ✅ [节点产出] ${node.title} 成功 ->`, finalResult);

    } catch (error) {
        console.error(`   ❌ [崩溃拦截] ${node.title} 异常:`, error.message);
        setNodeStatus(nodeId, 'error');
    }
}
// ==========================================
// 💡 节点 UI 状态控制器 (加入错误红灯状态)
// ==========================================
function setNodeStatus(nodeId, status) {
    const el = document.getElementById(nodeId);
    if (!el) return;
    el.style.transition = 'all 0.3s ease';
    
    if (status === 'running') {
        el.style.boxShadow = '0 0 30px 5px rgba(56, 189, 248, 0.4)';
        el.style.borderColor = '#38bdf8';
    } else if (status === 'success') {
        el.style.boxShadow = '0 0 30px 5px rgba(34, 197, 94, 0.3)';
        el.style.borderColor = '#22c55e';
        setTimeout(() => { el.style.boxShadow = '0 10px 40px rgba(0,0,0,0.6)'; el.style.borderColor = 'rgba(255,255,255,0.08)'; }, 3000);
    } else if (status === 'error') {
        // 🌟 报错时变红，并且不自动消失，提醒用户处理
        el.style.boxShadow = '0 0 30px 5px rgba(239, 68, 68, 0.5)';
        el.style.borderColor = '#ef4444';
    }
}
