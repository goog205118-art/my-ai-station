// ==========================================
// 🚀 Veo Flow 核心节点引擎 V2 (加入动态拉线状态机)
// ==========================================

// 🌟 自动注入：工作流专属的赛博朋克电流特效 CSS
const flowStyleInj = document.createElement('style');
flowStyleInj.innerHTML = `
    @keyframes dataFlowAnim { to { stroke-dashoffset: -24; } }
    .link-flowing {
        stroke-dasharray: 8 8 !important;
        animation: dataFlowAnim 0.4s linear infinite;
        stroke-width: 4px !important;
        filter: drop-shadow(0 0 8px currentColor);
    }
`;
document.head.appendChild(flowStyleInj);

const viewport = document.getElementById('flow-viewport');
const canvas = document.getElementById('flow-canvas');
const svgLayer = document.getElementById('svg-layer');
const nodeBoard = document.getElementById('node-board');

// 🌟 修复 SVG 容器折叠导致的连线消失问题
canvas.style.width = '1px'; canvas.style.height = '1px'; canvas.style.overflow = 'visible';
svgLayer.style.width = '1px'; svgLayer.style.height = '1px'; svgLayer.style.overflow = 'visible';

// 1. 全局状态机 (🔴 清空了所有硬编码假数据)
let flowState = {
    transform: { x: 0, y: 0, scale: 1 },
    isPanning: false, startX: 0, startY: 0,
    activeNode: null,
    drawingLink: { active: false, sourceNode: null, sourcePort: null, type: null, startX: 0, startY: 0, currentX: 0, currentY: 0 },
    nodes: [], 
    links: []
};

// ==========================================
// 💾 工作流本地持久化引擎 (IndexedDB)
// ==========================================
async function saveFlowToDB() {
    if (typeof db === 'undefined') return;
    return new Promise((resolve) => {
        const tx = db.transaction('flow_workspaces', 'readwrite');
        tx.objectStore('flow_workspaces').put({
            id: 'default_workspace',
            nodes: flowState.nodes,
            links: flowState.links,
            transform: flowState.transform,
            timestamp: Date.now()
        });
        tx.oncomplete = () => resolve();
    });
}

async function loadFlowFromDB() {
    if (typeof db === 'undefined') return false;
    return new Promise((resolve) => {
        const tx = db.transaction('flow_workspaces', 'readonly');
        const req = tx.objectStore('flow_workspaces').get('default_workspace');
        req.onsuccess = () => {
            if (req.result) {
                flowState.nodes = req.result.nodes || [];
                flowState.links = req.result.links || [];
                if (req.result.transform) flowState.transform = req.result.transform;
                resolve(true);
            } else resolve(false);
        };
        req.onerror = () => resolve(false);
    });
}

// ==========================================
// 🎨 支持内联预览的渲染引擎
// ==========================================
function renderPreview(node) {
    // 🌟 拦截：必须是有实体 data 的标准载荷才渲染
    if (!node.result || !node.result.data) return '';
    
    // 🌟 不再依赖节点类型判断，而是直接读取载荷自身的 type 属性
    if (node.result.type === 'image') {
        return `<img src="${node.result.data}" style="width:100%; height:auto; display:block; border-radius: 4px;" />`;
    } else if (node.result.type === 'video') {
        return `<video src="${node.result.data}" style="width:100%; height:auto; display:block; border-radius: 4px;" autoplay loop muted controls></video>`;
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
                
                // 🌟 新增核心：处理条件渲染 (条件不满足则跳过绘制该表单项)
                if (inp.condition) {
                    const depVal = node.data && node.data[inp.condition.field] !== undefined ? node.data[inp.condition.field] : node.inputs.find(i => i.id === inp.condition.field).default;
                    if (depVal !== inp.condition.value) return; 
                }

                inputsHtml += `<div class="node-input-group"><div class="node-input-label">${inp.label}</div>`;
                if (inp.type === 'textarea') {
                    inputsHtml += `<textarea class="node-input" rows="3" onmousedown="event.stopPropagation()" oninput="updateNodeData('${node.id}', '${inp.id}', this.value)">${val}</textarea>`;
                } else if (inp.type === 'select') {
                    // 🌟 针对 select 修改：选择变更后，调用 renderNodes() 刷新 UI（这样可以立即滑出隐藏的输入框）
                    inputsHtml += `<select class="node-input" onmousedown="event.stopPropagation()" onchange="updateNodeData('${node.id}', '${inp.id}', this.value); renderNodes();">
                        ${inp.options.map(opt => `<option value="${opt}" ${val === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                    </select>`;
                } else if (inp.type === 'number') {
                    // 🌟 新增支持：数字输入框
                    inputsHtml += `<input type="number" class="node-input" onmousedown="event.stopPropagation()" value="${val}" onchange="updateNodeData('${node.id}', '${inp.id}', this.value)" style="font-family: monospace; color: var(--accent);" />`;
                } else if (inp.type === 'image_upload') {
                    const hasImage = val && val.length > 100; 
                    // 🌟 核心升级：加入拖拽事件拦截，鼠标拖入时边框高亮反馈
                    inputsHtml += `
                    <div style="display:flex; gap:8px; align-items:center; margin-top: 4px; padding: 2px; border: 1px dashed transparent; border-radius: 6px; transition: 0.2s;"
                         ondragover="event.preventDefault(); this.style.borderColor='var(--accent)';" 
                         ondragleave="this.style.borderColor='transparent';" 
                         ondrop="handleNodeImageDrop(event, '${node.id}', '${inp.id}'); this.style.borderColor='transparent';">
                        <label class="node-input" style="flex:1; text-align:center; cursor:pointer; background: rgba(56,189,248,0.1); border-color: rgba(56,189,248,0.3); color: #38bdf8; padding: 6px; transition: 0.2s; margin:0;" onmouseover="this.style.background='rgba(56,189,248,0.2)'" onmouseout="this.style.background='rgba(56,189,248,0.1)'">
                            <input type="file" accept="image/*" style="display:none;" onchange="handleNodeImageUpload(event, '${node.id}', '${inp.id}')">
                            <span class="material-symbols-outlined" style="font-size:14px; vertical-align:middle;">upload</span> ${hasImage ? '更换图片' : '点击 / 拖入图片'}
                        </label>
                        ${hasImage ? `<img src="${val}" style="width:28px; height:28px; border-radius:4px; object-fit:cover; border:1px solid rgba(255,255,255,0.2);" onmousedown="event.stopPropagation()" data-tip="已挂载本地内存">` : ''}
                    </div>`;
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
// ==========================================
// 🎨 SVG 局部靶向渲染引擎 (拒绝 innerHTML 全局重绘)
// ==========================================
function renderLinks() {
    if (!svgLayer) return;
    const canvasRect = canvas.getBoundingClientRect();
    
    // 1. 渲染已固化的连线
    flowState.links.forEach(link => {
        const sourcePortEl = document.getElementById(`${link.source}-${link.sourcePort}`);
        const targetPortEl = document.getElementById(`${link.target}-${link.targetPort}`);
        
        if (sourcePortEl && targetPortEl) {
            const sRect = sourcePortEl.getBoundingClientRect();
            const tRect = targetPortEl.getBoundingClientRect();
            
            // 计算基于当前画布缩放的坐标
            const x1 = (sRect.left + sRect.width/2 - canvasRect.left) / flowState.transform.scale;
            const y1 = (sRect.top + sRect.height/2 - canvasRect.top) / flowState.transform.scale;
            const x2 = (tRect.left + tRect.width/2 - canvasRect.left) / flowState.transform.scale;
            const y2 = (tRect.top + tRect.height/2 - canvasRect.top) / flowState.transform.scale;
            
            // 贝塞尔曲线控制点偏移量
            const offset = Math.max(Math.abs(x2 - x1) / 2, 60);
            const pathData = `M ${x1} ${y1} C ${x1 + offset} ${y1}, ${x2 - offset} ${y2}, ${x2} ${y2}`;
            
            // 🌟 核心：精准复用已存在的 DOM，只改路径
            let pathEl = document.getElementById('svgpath_' + link.id);
            if (!pathEl) {
                // 如果是新线，创建并挂载 (必须用 createElementNS 创建 SVG 元素)
                pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
                pathEl.id = 'svgpath_' + link.id;
                pathEl.setAttribute('stroke', link.type === 'image' ? '#c084fc' : '#38bdf8');
                pathEl.setAttribute('stroke-width', '3');
                pathEl.setAttribute('fill', 'none');
                pathEl.setAttribute('opacity', '0.8');
                pathEl.setAttribute('stroke-linecap', 'round');
                svgLayer.appendChild(pathEl);
            }
            
            // 只有坐标发生变化时，才触发属性写入，极致压榨性能
            if (pathEl.getAttribute('d') !== pathData) {
                pathEl.setAttribute('d', pathData);
            }
        }
    });

    // 🌟 核心：垃圾回收 (Garbage Collection)
    // 找出画布上所有的固化线 DOM，如果它在内存 (flowState.links) 里不存在了，就删掉它
    const existingPaths = Array.from(svgLayer.querySelectorAll('path[id^="svgpath_link_"]'));
    const validLinkIds = new Set(flowState.links.map(l => 'svgpath_' + l.id));
    existingPaths.forEach(p => {
        if (!validLinkIds.has(p.id)) p.remove();
    });

    // 2. 渲染动态拉线 (鼠标正在拖出的那条虚线)
    let drawingPath = document.getElementById('svgpath_drawing_temp');
    
    if (flowState.drawingLink.active) {
        const x1 = flowState.drawingLink.startX;
        const y1 = flowState.drawingLink.startY;
        const x2 = flowState.drawingLink.currentX;
        const y2 = flowState.drawingLink.currentY;
        const offset = Math.max(Math.abs(x2 - x1) / 2, 60);
        const pathData = `M ${x1} ${y1} C ${x1 + offset} ${y1}, ${x2 - offset} ${y2}, ${x2} ${y2}`;

        if (!drawingPath) {
            drawingPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            drawingPath.id = 'svgpath_drawing_temp';
            drawingPath.setAttribute('stroke-width', '3');
            drawingPath.setAttribute('fill', 'none');
            drawingPath.setAttribute('stroke-dasharray', '6,6');
            drawingPath.setAttribute('opacity', '0.9');
            drawingPath.setAttribute('stroke-linecap', 'round');
            svgLayer.appendChild(drawingPath);
        }
        
        // 动态适配引脚的颜色 (图像紫 / 视频蓝)
        drawingPath.setAttribute('stroke', flowState.drawingLink.type === 'image' ? '#c084fc' : '#38bdf8');
        drawingPath.setAttribute('d', pathData);
        drawingPath.style.display = 'block';
    } else if (drawingPath) {
        // 松开鼠标后，不销毁 DOM，只是隐藏它，下次拉线直接复用
        drawingPath.style.display = 'none';
    }
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


// 🌟 核心提效：注入 rAF 渲染锁
let isTicking = false;

window.addEventListener('mousemove', (e) => {
    if (!isTicking) {
        requestAnimationFrame(() => {
            // 处理拉线动画
            if (flowState.drawingLink.active) {
                const cRect = canvas.getBoundingClientRect();
                flowState.drawingLink.currentX = (e.clientX - cRect.left) / flowState.transform.scale;
                flowState.drawingLink.currentY = (e.clientY - cRect.top) / flowState.transform.scale;
                renderLinks();
            }
            // 处理节点拖拽
            else if (flowState.activeNode) {
                const dx = (e.clientX - flowState.startX) / flowState.transform.scale;
                const dy = (e.clientY - flowState.startY) / flowState.transform.scale;
                flowState.activeNode.x += dx; flowState.activeNode.y += dy;
                flowState.startX = e.clientX; flowState.startY = e.clientY;
                document.getElementById(flowState.activeNode.id).style.transform = `translate(${flowState.activeNode.x}px, ${flowState.activeNode.y}px)`;
                renderLinks(); 
            }
            // 处理画布平移
            else if (flowState.isPanning) {
                flowState.transform.x += (e.clientX - flowState.startX);
                flowState.transform.y += (e.clientY - flowState.startY);
                flowState.startX = e.clientX; flowState.startY = e.clientY;
                updateCanvasTransform();
            }
            isTicking = false;
        });
        isTicking = true;
    }
});

window.addEventListener('mouseup', () => {
    let shouldSave = false; // 🌟 顺手为后面的持久化埋下钩子

    if (flowState.activeNode) {
        document.getElementById(flowState.activeNode.id).style.zIndex = '';
        shouldSave = true; // 节点被移动了，需要存档
    }
    if (flowState.isPanning) shouldSave = true; // 画布被平移了，需要存档

    flowState.activeNode = null;
    flowState.isPanning = false;
    viewport.style.cursor = 'grab';
    
    // 如果拉线松开在空白处，取消拉线
    if (flowState.drawingLink.active) {
        flowState.drawingLink.active = false;
        renderLinks();
    }

    // 如果发生了位移，静默保存状态
    if (shouldSave && typeof saveFlowToDB === 'function') saveFlowToDB();
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

// 🌟 异步启动引擎，先读档再渲染
window.initFlowEngine = async function() {
    await loadFlowFromDB(); // 尝试读取上一次的进度
    renderNodes();
    setTimeout(renderLinks, 50); 
    updateCanvasTransform();
};
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
// 🌟 升级版节点蓝图：完全对齐主引擎的所有高级参数
// ==========================================
const NodeBlueprints = {
    'tool_image_gen': { 
        type: 'tool_image_gen', title: '🎨 GPT 多模态生图', 
        ports: { 
            in: [{ id: 'in_ref', type: 'image', label: '风格垫图 (选填)' }],
            out: [{ id: 'out_img', type: 'image', label: '输出图像' }] 
        },
        inputs: [
            // 🌟 增加本地直传垫图
            { id: 'local_ref', type: 'image_upload', label: '本地直传垫图 (选填)' },
            { id: 'prompt', type: 'textarea', label: '正向提示词 (Prompt)', default: '一瓶放在岩石上的高级香水，雪山背景，8k' },
            { id: 'size', type: 'select', label: '画幅尺寸', options: ['1024x1024', '1024x576', '576x1024', '自定义 (AI嗅探)'], default: '1024x1024' },
            { id: 'customW', type: 'number', label: '自定义宽度比例 (W)', default: 9, condition: { field: 'size', value: '自定义 (AI嗅探)' } },
            { id: 'customH', type: 'number', label: '自定义高度比例 (H)', default: 21, condition: { field: 'size', value: '自定义 (AI嗅探)' } },
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
            // 🌟 增加本地直传首尾帧与垫图
            { id: 'local_first_frame', type: 'image_upload', label: '直传首帧 (优先于连线)' },
            { id: 'local_last_frame', type: 'image_upload', label: '直传尾帧 (选填)' },
            { id: 'local_ref', type: 'image_upload', label: '直传通用垫图 (Cmp模型)' },
            { id: 'prompt', type: 'textarea', label: '运镜与动作描述 (选填)', default: '' },
            { id: 'model', type: 'select', label: '生成模型', options: ['veo3.1', 'veo3.1-4k', 'veo3.1-components', 'veo3.1-components-4k'], default: 'veo3.1' },
            { id: 'aspectRatio', type: 'select', label: '画幅比例', options: ['16:9', '9:16', '1:1'], default: '16:9' },
            { id: 'enhancePrompt', type: 'select', label: 'AI 扩写提示词', options: ['开启 (推荐)', '关闭 (原词)'], default: '开启 (推荐)' },
            { id: 'enableUpsample', type: 'select', label: '画质超分增强', options: ['关闭 (标准)', '开启 (更慢)'], default: '关闭 (标准)' },
            { id: 'autoRetry', type: 'select', label: '失败挂机重试', options: ['关闭', '开启 (无限重试)'], default: '关闭' }
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

// 🌟 新增：拦截节点内部的图片上传，利用 FileReader 极速转为 Base64 内存流
window.handleNodeImageUpload = function(e, nodeId, inputId) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
        // 数据写入全局状态机
        updateNodeData(nodeId, inputId, reader.result);
        // 靶向刷新 UI，立刻展示图片缩略图
        renderNodes(); 
    };
    // 读取为 Data URL (Base64)
    reader.readAsDataURL(file);
    
    // 清空 input value，确保同一张图片重复上传能触发 onchange
    e.target.value = '';
};

// 👇👇👇 直接在这里追加万能拖拽解析器 👇👇👇
window.handleNodeImageDrop = async function(e, nodeId, inputId) {
    e.preventDefault();
    e.stopPropagation();

    let srcToUse = null;

    // 1. 尝试解析从侧边栏【全局素材库】拖过来的 JSON 内存指针
    try {
        const jsonStr = e.dataTransfer.getData('application/json');
        if (jsonStr) {
            const meta = JSON.parse(jsonStr);
            // 调用 db.js 里的全局函数，直接从 IndexedDB 提取跨页面素材
            const t = await getTaskDB(meta.taskId); 
            if (t && t.src) {
                console.log("🌟 [跨维传输] 成功捕获全局素材库图片！");
                srcToUse = await blobToBase64(t.src); // 将 Blob 转为内存流供节点消费
            }
        }
    } catch(err) {}

    // 2. 兜底方案：如果不是跨页面素材，则尝试解析电脑桌面拖进来的物理文件
    if (!srcToUse && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'));
        if (file) {
            console.log("🌟 [物理传输] 成功捕获桌面拖拽图片！");
            srcToUse = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
        }
    }

    // 3. 注入数据并刷新节点 UI
    if (srcToUse) {
        updateNodeData(nodeId, inputId, srcToUse);
        renderNodes();
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

// ==========================================
// 🛡️ 工业级图片载荷处理器 (彻底告别三方代理)
// ==========================================
async function prepareImagePayload(src) {
    if (!src) return undefined;

    // 1. 已经是 Base64 编码，直接放行
    if (src.startsWith('data:image')) return src;

    // 2. 如果是纯网络 URL (http/https)，直接丢给后端！
    // 💡 架构核心：CORS 只是浏览器的限制，服务端的 n8n 和 API 厂商没有跨域限制！
    // 让 Veo 模型的服务器自己去拉取这个 URL，速度最快，数据最安全。
    if (src.startsWith('http://') || src.startsWith('https://')) {
        console.log("   🌐 探测到公网 URL，直接透传交由大模型服务端拉取:", src);
        return src;
    }

    // 3. 只有本地 Blob 内存文件 (blob:http://...)，服务端无法访问，才必须在前端转成 Base64
    if (src.startsWith('blob:')) {
        console.log("   📦 探测到本地 Blob 文件，正在安全序列化为 Base64...");
        try {
            // 本地读取 Blob 不存在跨域问题
            const res = await fetch(src);
            const blob = await res.blob();
            return await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.error("Blob 转换 Base64 失败:", e);
            return undefined;
        }
    }

    return src; // 兜底原样返回
}

// 🌟 新增：统一载荷拆包器 (Unified Payload Resolver)
function resolvePayloadData(input) {
    if (!input) return undefined;
    // 如果是上游节点传过来的标准结构体
    if (typeof input === 'object' && input.data) return input.data;
    // 如果是本地控件直传的 Base64 纯字符串
    if (typeof input === 'string') return input;
    return undefined;
}

// ==========================================
// 🧩 节点执行器工厂 (Plugin Executors Registry)
// 以后新增任何多模态节点 (Sora, TTS)，只需在这里注册逻辑，引擎无需改动！
// ==========================================
const NodeExecutors = {
    // 🎨 [插件] GPT 生图执行器
    'tool_image_gen': async (node, nodeData, upstreamInputs) => {
        if (!nodeData.prompt || nodeData.prompt.trim() === '') throw new Error("缺少正向提示词！");

        let finalPrompt = nodeData.prompt.trim();
        let finalSize = nodeData.size || '1024x1024';

        if (finalSize === '自定义 (AI嗅探)') {
            finalSize = ""; 
            finalPrompt += ` 画面比例${nodeData.customW || 9}:${nodeData.customH || 21}`;
        }

        const refImgSource = resolvePayloadData(nodeData.local_ref || upstreamInputs.in_ref);
        const payload = {
            prompt: finalPrompt,
            size: finalSize,
            channel: (nodeData.channel && nodeData.channel.includes('2')) ? 'channel_2' : 'channel_1',
            images: refImgSource ? [refImgSource] : []
        };

        console.log("   📦 发送生图请求:", payload);
        const res = await fetch(`${BASE_N8N_URL}/proxy-image-gen`, { method: 'POST', headers: API_HEADERS, body: JSON.stringify(payload) });
        const rawText = await res.text();
        
        if (!res.ok) throw new Error(`HTTP ${res.status} 异常: ${rawText}`);
        if (!rawText) throw new Error("API 返回空数据。");
        
        let data;
        try { data = JSON.parse(rawText); } catch (e) { throw new Error(`非合法 JSON`); }
        
        const imgObj = data.data && data.data[0] ? data.data[0] : (data[0] || data);
        let resultDataStr = imgObj.url || (imgObj.b64_json ? "data:image/png;base64," + imgObj.b64_json : null);
        if (!resultDataStr) throw new Error("未找到 url 或 b64_json 字段");

        // 封箱为标准协议载荷返回
        return { type: 'image', data: resultDataStr, metadata: { source: 'gpt-image-2', size: finalSize } };
    },

    // 🎞️ [插件] Veo 视频生成执行器
    'tool_video_gen': async (node, nodeData, upstreamInputs) => {
        const firstFrame = await prepareImagePayload(resolvePayloadData(nodeData.local_first_frame || upstreamInputs.in_first_frame));
        const lastFrame = await prepareImagePayload(resolvePayloadData(nodeData.local_last_frame || upstreamInputs.in_last_frame));
        const refRaw = resolvePayloadData(nodeData.local_ref || upstreamInputs.in_ref);
        const refImages = refRaw ? [await prepareImagePayload(refRaw)] : [];
        
        if (!firstFrame && refImages.length === 0) throw new Error("缺少首帧或通用垫图，Veo 拒绝执行！");

        let targetModel = nodeData.model || "veo3.1";
        if (!firstFrame && refImages.length > 0 && !targetModel.includes('components')) {
            targetModel = targetModel === 'veo3.1' ? 'veo3.1-components' : 'veo3.1-components-4k';
        }

        const payload = {
            model: targetModel,
            prompt: nodeData.prompt || '',
            aspectRatio: nodeData.aspectRatio || "16:9",
            enhancePrompt: nodeData.enhancePrompt !== '关闭 (原词)',      
            enableUpsample: nodeData.enableUpsample === '开启 (更慢)',    
            firstFrame: firstFrame || undefined,
            lastFrame: lastFrame || undefined,
            references: refImages.length > 0 ? refImages : undefined
        };

        console.log("   📦 发送视频提交请求:", payload);
        const submitRes = await fetch(`${BASE_N8N_URL}/proxy-submit`, { method: 'POST', headers: API_HEADERS, body: JSON.stringify(payload) });
        const submitRawText = await submitRes.text();
        
        if (!submitRes.ok) throw new Error(`HTTP ${submitRes.status} 异常: ${submitRawText}`);
        
        let submitData;
        try { submitData = JSON.parse(submitRawText); } catch (e) { throw new Error("提交接口返回非 JSON 数据"); }
        if (!submitData.taskId) throw new Error("提交失败，未获得 TaskID: " + submitRawText);
        
        console.log(`   ⏳ 视频已提交云端 (ID: ${submitData.taskId})，启动异步轮询...`);

        let isComplete = false, finalVideoUrl = "";
        while (!isComplete) {
            await new Promise(r => setTimeout(r, 15000)); // 🌟 15秒安全轮询
            
            const pollRes = await fetch(`${BASE_N8N_URL}/proxy-poll`, { method: 'POST', headers: API_HEADERS, body: JSON.stringify({ taskId: submitData.taskId }) });
            const pollRawText = await pollRes.text();
            if (!pollRes.ok) throw new Error(`轮询异常: ${pollRawText}`);
            
            let pollData;
            try { pollData = JSON.parse(pollRawText); } catch (e) { throw new Error("轮询返回非 JSON"); }

            console.log(`   🔄 进度: ${pollData.progress} | 状态: ${pollData.status}`);
            if (pollData.status === 'success') {
                finalVideoUrl = pollData.videoUrl;
                isComplete = true;
            } else if (pollData.status === 'failed') {
                throw new Error(`生成失败: ${pollData.raw_status}`);
            }
        }

        // 封箱为标准协议载荷返回
        return { type: 'video', data: finalVideoUrl, metadata: { source: targetModel, aspectRatio: nodeData.aspectRatio || "16:9" } };
    }
};

// ==========================================
// 🚀 新版极简执行引擎核心 (仅负责路由与状态调度)
// ==========================================
async function executeNode(nodeId) {
    const node = flowState.nodes.find(n => n.id === nodeId);
    if (!node) return;

    setNodeStatus(nodeId, 'running');
    const nodeStartTime = Date.now();
    console.log(`\n▶️ [启动节点] ${node.title}`);

    try {
        // 1. 索要上游弹药
        let upstreamInputs = {};
        const incomingLinks = flowState.links.filter(l => l.target === nodeId);
        for (let link of incomingLinks) {
            const sourceNode = flowState.nodes.find(n => n.id === link.source);
            if (sourceNode && sourceNode.result) upstreamInputs[link.targetPort] = sourceNode.result; 
        }

        // 2. 🌟 靶向路由调用执行器
        const executor = NodeExecutors[node.type];
        if (!executor) throw new Error(`引擎未找到节点类型 [${node.type}] 的执行器`);

        // 🌟 核心激活：读取节点的重试配置 (最大3次)
        const maxRetries = (node.data && (node.data.autoRetry === '开启 (最多3次)' || node.data.autoRetry === true)) ? 3 : 0;
        let attempt = 0;
        let finalResult = null;

        // 🛡️ 重试装甲循环
        while (attempt <= maxRetries) {
            try {
                if (attempt > 0) {
                    console.log(`   🔄 [重试机制] 正在发起第 ${attempt} 次重试...`);
                    setNodeStatus(nodeId, 'running', { retryCount: attempt });
                }
                finalResult = await executor(node, node.data || {}, upstreamInputs);
                break; // 成功则跳出重试循环
            } catch (err) {
                attempt++;
                if (attempt > maxRetries) {
                    throw err; // 次数用尽，彻底抛出异常走向死亡
                }
                console.warn(`   ⚠️ 节点运行失败，等待 3 秒后尝试复活... (${err.message})`);
                await new Promise(r => setTimeout(r, 3000));
            }
        }

        // 3. 收尾流转与记账
        node.result = finalResult; 
        saveFlowToDB(); // 🌟 节点出结果了，立刻存档！
        
        const costTime = ((Date.now() - nodeStartTime) / 1000).toFixed(1);
        setNodeStatus(nodeId, 'success', { costTime: costTime });
        document.getElementById(`preview-${nodeId}`).innerHTML = renderPreview(node);
        console.log(`   ✅ [节点产出] ${node.title} 成功 ->`, finalResult);

        await recordNodeBilling(node);

    } catch (error) {
        console.error(`   ❌ [崩溃拦截] ${node.title} 异常:`, error.message);
        setNodeStatus(nodeId, 'error');
    }
}
// ==========================================
// 💡 节点 UI 状态控制器 (极客读秒与视觉增强版)
// ==========================================
function setNodeStatus(nodeId, status, meta = {}) {
    const el = document.getElementById(nodeId);
    if (!el) return;
    el.style.transition = 'all 0.3s ease';

    // 1. 动态注入/获取节点的专属状态栏
    let statusBar = el.querySelector('.node-status-bar');
    if (!statusBar) {
        statusBar = document.createElement('div');
        statusBar.className = 'node-status-bar';
        statusBar.style.cssText = 'position: absolute; bottom: -24px; left: 0; width: 100%; font-size: 11px; font-family: monospace; text-align: center; padding: 4px 0; border-radius: 6px; transition: 0.3s; z-index: 10; opacity: 0; pointer-events: none; backdrop-filter: blur(4px); box-shadow: 0 2px 10px rgba(0,0,0,0.5);';
        el.appendChild(statusBar);
    }

    // 2. 垃圾回收：清理上一轮的计时器
    if (el.dataset.timerId) {
        clearInterval(parseInt(el.dataset.timerId));
        delete el.dataset.timerId;
    }

    // 🌟 动态数据流向穿梭特效
    const incomingLinks = flowState.links.filter(l => l.target === nodeId);
    incomingLinks.forEach(link => {
        const pathEl = document.getElementById('svgpath_' + link.id);
        if (pathEl) {
            if (status === 'running') {
                pathEl.classList.add('link-flowing');
            } else {
                pathEl.classList.remove('link-flowing');
            }
        }
    });

    // 3. 状态分支渲染
    if (status === 'running') {
        el.style.boxShadow = '0 0 30px 5px rgba(56, 189, 248, 0.4)';
        el.style.borderColor = '#38bdf8';
        
        statusBar.style.background = 'rgba(56, 189, 248, 0.15)';
        statusBar.style.color = '#38bdf8';
        statusBar.style.border = '1px solid rgba(56, 189, 248, 0.3)';
        statusBar.style.opacity = '1';
        statusBar.style.bottom = '-30px'; 
        
        const startTime = Date.now();
        // 🌟 核心修复点：这里补齐了之前丢失的 }, 1000); 闭合括号！
        const timerId = setInterval(() => {
            const sec = Math.floor((Date.now() - startTime) / 1000);
            const mm = String(Math.floor(sec / 60)).padStart(2, '0');
            const ss = String(sec % 60).padStart(2, '0');
            const retryStr = meta.retryCount ? ` <span style="color:#f59e0b">(重试 ${meta.retryCount})</span>` : '';
            statusBar.innerHTML = `⚙️ 引擎轰鸣中...${retryStr} <span style="font-weight:bold; font-size:12px; margin-left:4px;">${mm}:${ss}</span>`;
        }, 1000); 
        
        el.dataset.timerId = timerId;

    } else if (status === 'success') {
        el.style.boxShadow = '0 0 30px 5px rgba(34, 197, 94, 0.3)';
        el.style.borderColor = '#22c55e';
        
        statusBar.style.background = 'rgba(34, 197, 94, 0.15)';
        statusBar.style.color = '#22c55e';
        statusBar.style.border = '1px solid rgba(34, 197, 94, 0.3)';
        statusBar.style.opacity = '1';
        
        const costTime = meta.costTime || 0;
        statusBar.innerHTML = `✅ 跑通完毕 ⏱️ <span style="font-weight:bold;">${costTime}s</span>`;
        
        setTimeout(() => { statusBar.style.opacity = '0'; statusBar.style.bottom = '-24px'; }, 4000);

    } else if (status === 'error') {
        el.style.boxShadow = '0 0 30px 5px rgba(239, 68, 68, 0.3)';
        el.style.borderColor = '#ef4444';
        
        statusBar.style.background = 'rgba(239, 68, 68, 0.15)';
        statusBar.style.color = '#ef4444';
        statusBar.style.border = '1px solid rgba(239, 68, 68, 0.3)';
        statusBar.style.opacity = '1';
        statusBar.innerHTML = `❌ 链路崩溃`;
        
    } else {
        // Idle (空闲状态)
        el.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
        el.style.borderColor = 'rgba(255,255,255,0.1)';
        statusBar.style.opacity = '0';
    }
}
// ==========================================
// 💰 独立记账结算器 (双引擎账单互通核心)
// ==========================================
async function recordNodeBilling(node) {
    if (!node || !node.data) return;
    
    let cost = 0;
    let detailStr = '';

    // 1. 严格按照 index.html 的官方费率计算
    if (node.type === 'tool_image_gen') {
        const isChannel2 = node.data.channel && node.data.channel.includes('2');
        cost = isChannel2 ? 0.06 : 0.084;
        detailStr = `Pro工作流：多模态生图 (${isChannel2 ? '备用通道' : '主干通道'})`;
    } 
    else if (node.type === 'tool_video_gen') {
        const is4K = node.data.model && node.data.model.includes('4k');
        cost = is4K ? 0.50 : 0.35;
        detailStr = `Pro工作流：Veo 视频生成 (${is4K ? '4K高画质' : '标准画质'})`;
    }

    // 2. 写入 IndexedDB (跨页面共享的数据金库)
    if (cost > 0) {
        const record = {
            id: 'bill_flow_' + Date.now() + '_' + Math.random().toString(36).substr(2,5),
            timestamp: Date.now(),
            amount: cost,
            detail: detailStr,
            nodeId: node.id
        };

        return new Promise((resolve) => {
            try {
                // 这里的 db 来自你的 db.js 全局变量
                const tx = db.transaction('billing', 'readwrite');
                tx.objectStore('billing').put(record);
                
                tx.oncomplete = () => {
                    console.log(`💸 [记账中心] 节点 ${node.id} 结算完成: -￥${cost} (${detailStr})`);
                    
                    // 🌟 触发 UI 刷新机制：如果主引擎有全局刷新函数，直接调用
                    // (兼容处理：如果 flow.html 和 index.html 是独立页面，可以使用事件派发)
                    if (typeof window.updateTotalBalance === 'function') {
                        window.updateTotalBalance(); 
                    } else if (typeof sysBus !== 'undefined') {
                        sysBus.emit('SYSTEM:BILLING_UPDATED', record);
                    }
                    resolve();
                };
                
                tx.onerror = () => {
                    console.warn("⚠️ [记账中心] 写入被拒绝或失败");
                    resolve(); // 失败不阻塞业务流
                };
            } catch (error) {
                console.warn("⚠️ [记账中心] 数据库事务异常 (可能 DB 未完全就绪):", error);
                resolve();
            }
        });
    }
}
// ==========================================
// 🗂️ 虫洞引擎：全局素材库桥接 (跨越 IndexedDB)
// ==========================================

window.toggleMaterialDrawer = function() {
    const drawer = document.getElementById('material-drawer');
    if (drawer) {
        drawer.classList.toggle('open');
        // 展开时自动刷新 DB 数据
        if (drawer.classList.contains('open')) {
            renderMaterialLibrary();
        }
    }
};

window.renderMaterialLibrary = async function() {
    const grid = document.getElementById('material-grid');
    if (!grid) return;
    
    try {
        // 1. 调用底层的 db.js 全量查询
        const tasks = await getAllTasksDB(); 
        
        // 2. 筛选出主页面里所有的 "本地图" 类型素材
        const materials = tasks.filter(t => t.type === 'local_image');
        
        if (materials.length === 0) { 
            grid.innerHTML = `<div style="grid-column: span 2; text-align: center; padding: 40px 0; color: #555; font-size: 12px;">主画布仓库空空如也，请先去主页传图</div>`; 
            return; 
        }

        let html = '';
        materials.forEach(m => {
            // 3. 借用 db.js 的专属协议极速挂载 Blob 内存流
            const url = getBlobUrl(m.id, m.src);
            
            // 🌟 核心破局：我们在这里给拖拽的数据包塞入一段 JSON 凭证
            // 这恰好能被我们在上一步写的 handleNodeImageDrop "万能解析器" 完美拦截接管！
            html += `
                <div class="material-item" draggable="true" 
                     ondragstart="event.dataTransfer.setData('application/json', JSON.stringify({taskId: '${m.id}', type: 'local'}))">
                    <img src="${url}" loading="lazy">
                </div>
            `;
        });
        
        grid.innerHTML = html;
        console.log(`🌌 [虫洞引擎] 成功从 IndexedDB 映射 ${materials.length} 张素材`);
        
    } catch (err) {
        console.error("❌ 读取全局素材库失败 (请确保 db.js 已就绪):", err);
        grid.innerHTML = `<div style="color: #ef4444; font-size: 12px; grid-column: span 2;">数据库穿透异常</div>`;
    }
};
// 🌟 修复素材库无法关闭：全局侦听器
document.addEventListener('mousedown', (e) => {
    const drawer = document.getElementById('material-drawer');
    // 如果抽屉是开着的，且鼠标点击的位置不在抽屉内部，也不在触发按钮上
    if (drawer && drawer.classList.contains('open')) {
        const isClickInside = drawer.contains(e.target);
        const isClickToggleButton = e.target.closest('button[onclick="toggleMaterialDrawer()"]');
        if (!isClickInside && !isClickToggleButton) {
            drawer.classList.remove('open');
        }
    }
});
