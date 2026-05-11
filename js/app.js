// ==========================================
// 🟢 核心应用逻辑
// ==========================================
const API_SUBMIT = 'https://api.wallyai.top/webhook/proxy-submit'; 
const API_POLL = 'https://api.wallyai.top/webhook/proxy-poll';     
const API_IMAGE_GEN = 'https://api.wallyai.top/webhook/proxy-image-gen'; 

let activeTasks = [];
let activeRetries = new Set(); 

function removeActiveTask(id) { const index = activeTasks.indexOf(id); if (index > -1) activeTasks.splice(index, 1); }
function toggleDrawer() { document.getElementById('tool-drawer').classList.toggle('open'); }

// ==============================
// 🍞 全局 Toast 消息系统
// ==============================
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `veo-toast toast-${type}`;
    
    let icon = 'info';
    if (type === 'error') icon = 'error';
    if (type === 'success') icon = 'check_circle';

    toast.innerHTML = `<span class="material-symbols-outlined icon" style="font-size: 16px;">${icon}</span> ${message}`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 🚀 架构师魔法：一键劫持全局原生的 alert()，让所有旧代码自动享用新 UI！
window.alert = (msg) => showToast(msg, 'error');

// ==============================
// 💡 全局智能悬浮提示引擎 (Smart Tooltip)
// ==============================
let tooltipTimer = null;
document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('[data-tip]');
    if (!target) return;
    
    tooltipTimer = setTimeout(() => {
        const tipText = target.getAttribute('data-tip');
        if (!tipText) return;
        
        const globalTooltip = document.getElementById('global-tooltip');
        globalTooltip.innerText = tipText;
        const rect = target.getBoundingClientRect();
        
        let x = rect.left + rect.width / 2;
        let y = rect.top;
        
        if (y < 60) {
            y = rect.bottom; 
            globalTooltip.classList.add('tooltip-bottom');
        } else {
            globalTooltip.classList.remove('tooltip-bottom');
        }
        
        globalTooltip.style.left = `${x}px`;
        globalTooltip.style.top = `${y}px`;
        globalTooltip.classList.add('show');
    }, 500); 
});

document.addEventListener('mouseout', (e) => {
    const target = e.target.closest('[data-tip]');
    if (!target) return;
    clearTimeout(tooltipTimer);
    document.getElementById('global-tooltip').classList.remove('show');
});

// ==============================
// 📖 使用教程弹窗控制
// ==============================
function openHelpModal() {
    const modal = document.getElementById('help-modal');
    modal.style.display = 'flex';
    modal.offsetHeight; 
    modal.classList.add('show');
}
function closeHelpModal() {
    const modal = document.getElementById('help-modal');
    modal.classList.remove('show');
    setTimeout(() => modal.style.display = 'none', 300);
}

// ==============================
// 🚀 核心优化：单例模式硬件加速拖拽引擎
// ==============================
const viewport = document.getElementById('canvas-viewport');
const board = document.getElementById('canvas-board');
let transform = { x: window.innerWidth / 2, y: 100, scale: 1 }; 
let isPanning = false, startPanX = 0, startPanY = 0, ticking = false; 
let draggingCardInfo = null, highestZIndex = 10; 

window.addEventListener('mousemove', (e) => {
    if (!ticking) {
        requestAnimationFrame(() => {
            if (isPanning) {
                transform.x = e.clientX - startPanX; transform.y = e.clientY - startPanY; 
                board.style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`;
                document.body.style.backgroundPosition = `${transform.x}px ${transform.y}px`;
                document.body.style.backgroundSize = `${30 * transform.scale}px ${30 * transform.scale}px`;
            } else if (draggingCardInfo) {
                // 🌟 核心引擎升级：弃用之前的误差累积公式。
                // 改用：鼠标真实物理位移(dx/dy) ÷ 当前缩放率 + 卡片初始绝对坐标
                const dx = (e.clientX - draggingCardInfo.startMouseX) / transform.scale;
                const dy = (e.clientY - draggingCardInfo.startMouseY) / transform.scale;
                draggingCardInfo.task.x = draggingCardInfo.initialX + dx;
                draggingCardInfo.task.y = draggingCardInfo.initialY + dy;
                
                draggingCardInfo.el.style.transform = `translate3d(${draggingCardInfo.task.x}px, ${draggingCardInfo.task.y}px, 0)`;
            }
            ticking = false;
        });
        ticking = true;
    }
});

viewport.addEventListener('mousedown', (e) => { if (e.target === viewport || e.target === board) { isPanning = true; startPanX = e.clientX - transform.x; startPanY = e.clientY - transform.y; } });
window.addEventListener('mouseup', () => { isPanning = false; if (draggingCardInfo) { saveTaskDB(draggingCardInfo.task); draggingCardInfo = null; } });

viewport.addEventListener('wheel', (e) => {
    e.preventDefault(); if (ticking) return; 
    const delta = e.deltaY * 0.001; let newScale = Math.min(Math.max(0.2, transform.scale - delta), 3); 
    const mouseX = e.clientX - viewport.getBoundingClientRect().left, mouseY = e.clientY - viewport.getBoundingClientRect().top;
    transform.x = mouseX - (mouseX - transform.x) * (newScale / transform.scale); transform.y = mouseY - (mouseY - transform.y) * (newScale / transform.scale); transform.scale = newScale;
    
    if (!ticking) {
        requestAnimationFrame(() => {
            board.style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`;
            document.body.style.backgroundPosition = `${transform.x}px ${transform.y}px`;
            document.body.style.backgroundSize = `${30 * transform.scale}px ${30 * transform.scale}px`;
            ticking = false;
        });
        ticking = true;
    }
}, { passive: false });

function bindCardDrag(cardEl, task) {
    const header = cardEl.querySelector('.card-header');
    if(header) {
        header.onmousedown = (e) => {
            highestZIndex++; cardEl.style.zIndex = highestZIndex;
            
            // 🌟 核心引擎升级：记录鼠标点下的“物理绝对位置”和卡片的“初始绝对坐标”
            draggingCardInfo = { 
                el: cardEl, 
                task: task, 
                startMouseX: e.clientX,   // 记录鼠标屏幕坐标 X
                startMouseY: e.clientY,   // 记录鼠标屏幕坐标 Y
                initialX: task.x || 0,    // 记录卡片当前画布坐标 X
                initialY: task.y || 0     // 记录卡片当前画布坐标 Y
            };
            e.stopPropagation(); 
        };
    }
}

// ==============================
// 🔍 全局图片放大查看器 (Lightbox)
// ==============================
let lightboxEl = null;
function openLightbox(src) {
    if (!lightboxEl) {
        lightboxEl = document.createElement('div');
        lightboxEl.className = 'image-lightbox';
        lightboxEl.innerHTML = `<img>`;
        lightboxEl.onclick = () => {
            lightboxEl.classList.remove('show');
            setTimeout(() => lightboxEl.style.display = 'none', 200);
        };
        document.body.appendChild(lightboxEl);
    }
    lightboxEl.querySelector('img').src = src;
    lightboxEl.style.display = 'flex';
    lightboxEl.offsetHeight; 
    lightboxEl.classList.add('show');
}

// ==============================
// 📋 剪贴板全局粘贴引擎 (Ctrl+V)
// ==============================
window.addEventListener('paste', async (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const items = e.clipboardData?.items;
    if (!items) return;
    let offset = 0;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if(!file) continue;
            const blob = await compressImageToBlob(file, 1024);
            const spawnX = (-transform.x + window.innerWidth/2) / transform.scale + offset;
            const spawnY = (-transform.y + window.innerHeight/2) / transform.scale + offset;
            const newLocalNode = { id: 'local_img_' + Date.now() + Math.random().toString(36).substr(2, 5), type: 'local_image', src: blob, x: spawnX, y: spawnY, timestamp: Date.now() };
            await saveTaskDB(newLocalNode);
            offset += 40; 
        }
    }
    if (offset > 0) renderBoard();
});

// ==============================
// 📝 便签与防误触
// ==============================
const consoleEl = document.getElementById('floating-console');
document.addEventListener('click', (e) => {
    const popover = document.getElementById('ref-popover'), slotBox = document.getElementById('slot-ref-box');
    if (popover && popover.style.display === 'flex' && !popover.contains(e.target) && !slotBox.contains(e.target)) popover.style.display = 'none';
    if (e.target === viewport || e.target === board) { consoleEl.classList.add('minimized'); document.getElementById('tool-drawer').classList.remove('open'); } else if (consoleEl.contains(e.target)) consoleEl.classList.remove('minimized');
});

async function createStickyNote(spawnX, spawnY) {
    if (spawnX === undefined) spawnX = (-transform.x + window.innerWidth/2 - 120) / transform.scale;
    if (spawnY === undefined) spawnY = (-transform.y + window.innerHeight/2 - 80) / transform.scale;
    await saveTaskDB({ id: 'note_' + Date.now() + Math.random().toString(36).substr(2, 5), type: 'note', text: '', x: spawnX, y: spawnY, width: 260, height: 200, timestamp: Date.now() }); renderBoard();
}
viewport.addEventListener('dblclick', (e) => { if (e.target === viewport || e.target === board) createStickyNote((e.clientX - transform.x) / transform.scale, (e.clientY - transform.y) / transform.scale); });

let noteTimeout;
async function updateNoteText(id, text) { clearTimeout(noteTimeout); noteTimeout = setTimeout(async () => { const note = await getTaskDB(id); if (note) { note.text = text; await saveTaskDB(note); } }, 500); }
function saveNoteSize(id, w, h) { setTimeout(async () => { const note = await getTaskDB(id); if (note && (note.width !== w || note.height !== h)) { note.width = w; note.height = h; await saveTaskDB(note); } }, 100); }

// ==============================
// 📦 工程导入与导出
// ==============================
async function exportWorkspace() {
    const btn = document.getElementById('export-btn'); const originalHTML = btn.innerHTML; btn.innerHTML = `<svg class="spinner" viewBox="0 0 50 50" style="width:16px;height:16px;stroke:currentColor;margin-right:6px;"><circle cx="25" cy="25" r="20"></circle></svg> 打包中...`;
    try {
        const tasks = await getAllTasksDB(); const exportData = [];
        for (let t of tasks) {
            let clone = { ...t };
            if (clone.type === 'local_image' && clone.src) clone.src = await blobToBase64(clone.src);
            if (clone.type === 'tool_image_gen' && clone.state) {
                if(clone.state.images) clone.state.images = await Promise.all(clone.state.images.map(b => blobToBase64(b)));
                if(clone.state.resultBlob) clone.state.resultBlob = await blobToBase64(clone.state.resultBlob);
            }
            if (clone.rawImages) {
                if (clone.rawImages.firstFrame) clone.rawImages.firstFrame = await blobToBase64(clone.rawImages.firstFrame);
                if (clone.rawImages.lastFrame) clone.rawImages.lastFrame = await blobToBase64(clone.rawImages.lastFrame);
                if (clone.rawImages.references) clone.rawImages.references = await Promise.all(clone.rawImages.references.map(b => blobToBase64(b)));
            }
            exportData.push(clone);
        }
        const blob = new Blob([JSON.stringify(exportData)], {type: 'application/json'}); const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `VeoStudio_Flow_${Date.now()}.veo`; a.click(); URL.revokeObjectURL(url);
    } catch (e) { alert('导出失败: ' + e.message); } finally { btn.innerHTML = originalHTML; }
}

async function importWorkspace(input) {
    if (!input.files[0]) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (confirm(`📦 解析成功！包含 ${data.length} 个节点。\n这会与您当前的画布合并，是否继续？`)) {
                for (let t of data) {
                    if (t.type === 'local_image' && typeof t.src === 'string') t.src = await fetch(t.src).then(r => r.blob());
                    if (t.type === 'tool_image_gen' && t.state) {
                        if(t.state.images) t.state.images = await Promise.all(t.state.images.map(async b => typeof b === 'string' ? await fetch(b).then(r => r.blob()) : b));
                        if(t.state.resultBlob && typeof t.state.resultBlob === 'string') t.state.resultBlob = await fetch(t.state.resultBlob).then(r => r.blob());
                    }
                    if (t.rawImages) {
                        if (typeof t.rawImages.firstFrame === 'string') t.rawImages.firstFrame = await fetch(t.rawImages.firstFrame).then(r => r.blob());
                        if (typeof t.rawImages.lastFrame === 'string') t.rawImages.lastFrame = await fetch(t.rawImages.lastFrame).then(r => r.blob());
                        if (t.rawImages.references) t.rawImages.references = await Promise.all(t.rawImages.references.map(async b => typeof b === 'string' ? await fetch(b).then(r => r.blob()) : b));
                    }
                    await saveTaskDB(t);
                }
                renderBoard();
            }
        } catch(err) { alert('❌ 文件解析失败，请确保导入的是有效的 .veo 格式文件'); }
        input.value = '';
    };
    reader.readAsText(input.files[0]);
}

// ==============================
// 🖼️ 拖放传输引擎 (统一入口)
// ==============================
window.addEventListener("dragover", function(e){ e.preventDefault(); }, false);
window.addEventListener("drop", function(e){ e.preventDefault(); }, false);

viewport.addEventListener('drop', async (e) => {
    e.preventDefault();
    const pluginType = e.dataTransfer.getData('plugin');
    if (pluginType) {
        const spawnX = (e.clientX - transform.x) / transform.scale, spawnY = (e.clientY - transform.y) / transform.scale;
        let newTool = null;
        if (pluginType === 'generator') newTool = { id: 'tool_' + Date.now(), type: 'tool_generator', x: spawnX, y: spawnY, timestamp: Date.now(), state: { format: '', opening: '', attribute: '', general: '' } };
        else if (pluginType === 'image_gen') {
            newTool = { id: 'tool_img_' + Date.now(), type: 'tool_image_gen', x: spawnX, y: spawnY, timestamp: Date.now(), status: 'idle', state: { size: '1024x1024', prompt: '', images: [], resultUrl: null, resultBlob: null, channel: 'channel_1', autoRetry: false }, retryCount: 0 };
        }
        if (newTool) { await saveTaskDB(newTool); renderBoard(); document.getElementById('tool-drawer').classList.remove('open'); return; }
    }

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
        let offset = 0;
        for (let file of files) {
            if (file.type.startsWith('image/')) {
                const blob = await compressImageToBlob(file, 1024);
                await saveTaskDB({ id: 'local_img_' + Date.now() + Math.random().toString(36).substr(2, 5), type: 'local_image', src: blob, x: (e.clientX - transform.x) / transform.scale + offset, y: (e.clientY - transform.y) / transform.scale + offset, timestamp: Date.now() });
                offset += 40; 
            }
        }
        renderBoard();
    }
});

async function parseDroppedImage(e) {
    let srcToUse = null;
    try {
        const jsonStr = e.dataTransfer.getData('application/json');
        if (jsonStr) {
            const meta = JSON.parse(jsonStr), t = await getTaskDB(meta.taskId);
            if (t) {
                if (meta.type === 'local') srcToUse = t.src;
                else if (meta.type === 'thumb') srcToUse = t.rawImages.firstFrame || (t.rawImages.references && t.rawImages.references[0]);
                else if (meta.type === 'gen_result') srcToUse = t.state.resultBlob; 
            }
        }
    } catch(err) {}

    if (!srcToUse) { let textData = e.dataTransfer.getData('text/plain'); if (textData && textData.startsWith('data:image')) srcToUse = textData; }
    if (!srcToUse && e.dataTransfer.files.length > 0 && e.dataTransfer.files[0].type.startsWith('image/')) srcToUse = await compressImageToBlob(e.dataTransfer.files[0], 1024);
    return srcToUse;
}

function bindMainConsoleDrop(slotId, stateKey) {
    const slot = document.getElementById(slotId);
    slot.addEventListener('dragover', (e) => { e.preventDefault(); slot.classList.add('drag-over'); });
    slot.addEventListener('dragleave', (e) => { e.preventDefault(); slot.classList.remove('drag-over'); });
    slot.addEventListener('drop', async (e) => {
        e.preventDefault(); slot.classList.remove('drag-over');
        const srcToUse = await parseDroppedImage(e);
        if (srcToUse) {
            if (stateKey === 'references') {
                if (payloadState.references.length < 3) payloadState.references.push(srcToUse);
                renderReferences(); document.getElementById('ref-popover').style.display = 'flex'; 
            } else {
                payloadState[stateKey] = srcToUse;
                const t = stateKey === 'firstFrame' ? 'first' : 'last';
                document.getElementById(`${t}-img`).src = getBlobUrl('temp_'+t, srcToUse); document.getElementById(`slot-${t}-box`).classList.add('has-img');
            }
        }
    });
}

function toggleRefPopover(e) { e.stopPropagation(); if (payloadState.references.length === 0) document.getElementById('ref-file').click(); else { const p = document.getElementById('ref-popover'); p.style.display = p.style.display === 'flex' ? 'none' : 'flex'; } }
function switchMode(mode) { payloadState.currentMode = mode; document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active')); document.querySelectorAll('.slot-group').forEach(s => s.classList.remove('active')); document.getElementById(`tab-${mode}`).classList.add('active'); document.getElementById(`slots-${mode}`).classList.add('active'); }

// 🌟 核心更新：切换 4K 模型时动态禁用首尾帧与优雅提示
function updateModel(select) { 
    payloadState.model = select.value; 
    document.getElementById('model-text').innerText = select.options[select.selectedIndex].text; 
    
    // 针对 4K 模型的特殊限制：动态禁用首尾帧
    const frameTab = document.getElementById('tab-frame');
    if (select.value.toLowerCase().includes('4k')) {
        
        // 优化：只要切到 4K，就必然弹出蓝色温馨提示
        showToast("Veo 3.1 4K 模型不支持首尾帧，请使用参考图模式。", "info");
        
        // 如果当前正好在首尾帧模式，强制切回参考图
        if (payloadState.currentMode === 'frame') {
            switchMode('ref'); 
        }
        
        // 将首尾帧按钮置灰并禁用点击
        frameTab.style.opacity = '0.3';
        frameTab.style.pointerEvents = 'none';
        frameTab.setAttribute('data-tip', '4K 模型不支持首尾帧模式，请使用参考图 (1-3张)');
    } else {
        // 切回普通模型，恢复首尾帧按钮
        frameTab.style.opacity = '1';
        frameTab.style.pointerEvents = 'auto';
        frameTab.setAttribute('data-tip', '输入首帧或尾帧图片，精准控制视频起始与结束画面');
    }
}

function updateRatio(select) { payloadState.aspectRatio = select.value; document.getElementById('ratio-text').innerText = select.options[select.selectedIndex].text; document.getElementById('ratio-icon').innerText = select.value === '16:9' ? 'crop_16_9' : 'crop_portrait'; }
function updateEnhance(select) { payloadState.enhancePrompt = select.value === 'true'; document.getElementById('enhance-text').innerText = select.options[select.selectedIndex].text; }
function updateUpsample(select) { payloadState.enableUpsample = select.value === 'true'; document.getElementById('upsample-text').innerText = select.options[select.selectedIndex].text; }
function updateAutoRetry(select) { payloadState.autoRetry = select.value === 'true'; document.getElementById('retry-text').innerText = select.options[select.selectedIndex].text; }

async function handleMultiRefs(input) {
    if (!input.files || input.files.length === 0) return;
    if (payloadState.references.length + input.files.length > 3) { input.value = ''; return alert(`最多仅支持 3 张图。`); }
    for (let file of Array.from(input.files)) payloadState.references.push(await compressImageToBlob(file));
    input.value = ''; renderReferences();
    if(payloadState.references.length > 0) document.getElementById('ref-popover').style.display = 'flex';
}
function removeReference(event, index) { event.stopPropagation(); payloadState.references.splice(index, 1); renderReferences(); if(payloadState.references.length === 0) document.getElementById('ref-popover').style.display = 'none'; }
function clearReferences(e) { e.stopPropagation(); payloadState.references = []; renderReferences(); document.getElementById('ref-popover').style.display = 'none'; }
function renderReferences() {
    const box = document.getElementById('slot-ref-box'), imgEl = document.getElementById('ref-img'), countBadge = document.getElementById('ref-count-badge');
    if (payloadState.references.length === 0) { box.classList.remove('has-img'); imgEl.src = ''; countBadge.style.display = 'none'; } 
    else { box.classList.add('has-img'); imgEl.src = getBlobUrl('temp_ref_main', payloadState.references[0]); countBadge.style.display = payloadState.references.length > 1 ? 'flex' : 'none'; countBadge.innerText = payloadState.references.length; }
    const listContainer = document.getElementById('ref-list-container');
    listContainer.innerHTML = payloadState.references.map((b, index) => `<div class="popover-img-item"><img src="${getBlobUrl('temp_ref_'+index, b)}"><div class="popover-rm-btn" onclick="removeReference(event, ${index})">×</div></div>`).join('');
    document.getElementById('ref-popover-add').style.display = payloadState.references.length >= 3 ? 'none' : 'flex';
}

async function handleSingleFrame(input, type) {
    if (!input.files[0]) return;
    payloadState[type] = await compressImageToBlob(input.files[0]);
    const t = type === 'firstFrame' ? 'first' : 'last';
    document.getElementById(`${t}-img`).src = getBlobUrl(`temp_${t}`, payloadState[type]); document.getElementById(`slot-${t}-box`).classList.add('has-img'); input.value = '';
}
function clearFrame(event, type) {
    if(event) { event.preventDefault(); event.stopPropagation(); }
    payloadState[type] = null;
    const t = type === 'firstFrame' ? 'first' : 'last';
    document.getElementById(`slot-${t}-box`).classList.remove('has-img'); document.getElementById(`${t}-img`).src = '';
}

// ==============================
// 🚀 视频生成 - 批处理与提交调度
// ==============================
async function submitBatchTask() {
    const prompt = document.getElementById('prompt-input').value.trim();
    if (!prompt) return alert('请填写提示词');
    
    const batchCount = parseInt(document.getElementById('batch-select').value), btn = document.getElementById('generate-btn');
    btn.disabled = true; btn.innerHTML = `<svg class="spinner" viewBox="0 0 50 50"><circle cx="25" cy="25" r="20"></circle></svg>`;
    
    let submitRef = [...payloadState.references], submitFirst = payloadState.firstFrame, submitLast = payloadState.lastFrame;
    if (payloadState.currentMode === 'ref') { submitFirst = null; submitLast = null; } else submitRef = [];

    const taskParams = { model: payloadState.model, aspectRatio: payloadState.aspectRatio, enhancePrompt: payloadState.enhancePrompt, enableUpsample: payloadState.enableUpsample, autoRetry: payloadState.autoRetry, firstFrame: submitFirst, lastFrame: submitLast, references: submitRef };
    let promises = []; for(let i=0; i<batchCount; i++) promises.push(executeSubmission(taskParams, prompt, i));
    
    await Promise.allSettled(promises);
    btn.disabled = false; btn.innerHTML = `<span class="material-symbols-outlined">arrow_upward</span>`; document.getElementById('prompt-input').value = ''; 
}

async function executeSubmission(params, promptText, offsetIndex = 0) {
    try {
        const apiPayload = { model: params.model, prompt: promptText, aspectRatio: params.aspectRatio, enhancePrompt: params.enhancePrompt, enableUpsample: params.enableUpsample, firstFrame: await blobToBase64(params.firstFrame), lastFrame: await blobToBase64(params.lastFrame), references: await Promise.all(params.references.map(b => blobToBase64(b))) };
        const response = await fetch(API_SUBMIT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-studio-pwd': sessionStorage.getItem('veo_admin_pwd') }, body: JSON.stringify(apiPayload) });
        if (response.status === 401 || response.status === 403) throw new Error("密码错误");
        const data = await response.json();

        if (data.taskId) {
            const spawnX = (-transform.x + window.innerWidth/2 - 170) / transform.scale + (offsetIndex * 360), spawnY = (-transform.y + window.innerHeight/2 - 150) / transform.scale + (offsetIndex * 40);
            
            let displayModelName = params.references && params.references.length > 0 ? 'Veo 3 Cmp' : 'Veo 3 Fast';
            if (params.model === 'veo_3_1-fast-components-4k') displayModelName = 'Veo 3 4K';

            // 加入了进度属性 (progress) 的初始化
            const newTask = { id: data.taskId, prompt: promptText, modelStr: displayModelName, modelVal: params.model, ratio: params.aspectRatio, autoRetry: params.autoRetry, retryCount: 0, rawImages: { firstFrame: params.firstFrame, lastFrame: params.lastFrame, references: params.references || [] }, mode: params.references && params.references.length > 0 ? 'ref' : 'frame', status: 'processing', progress: null, timestamp: Date.now(), time: new Date().toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'}), videoUrl: null, x: spawnX, y: spawnY };
            await saveTaskDB(newTask); await renderBoard(); 
        }
    } catch (error) { console.error('提交失败:', error); }
}

async function retryTask(taskId, btnElement) {
    if (activeRetries.has(taskId)) return; activeRetries.add(taskId);
    if (btnElement) { btnElement.disabled = true; btnElement.innerHTML = `<svg class="spinner" viewBox="0 0 50 50" style="width:18px;height:18px;stroke:var(--text-sub);"><circle cx="25" cy="25" r="20"></circle></svg>`; }
    const task = await getTaskDB(taskId); if(!task) { activeRetries.delete(taskId); return; }

    try {
        const apiPayload = { model: task.modelVal, prompt: task.prompt, aspectRatio: task.ratio, enhancePrompt: true, enableUpsample: false, firstFrame: await blobToBase64(task.rawImages.firstFrame), lastFrame: await blobToBase64(task.rawImages.lastFrame), references: await Promise.all((task.rawImages.references || []).map(b => blobToBase64(b))) };
        const response = await fetch(API_SUBMIT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-studio-pwd': sessionStorage.getItem('veo_admin_pwd') }, body: JSON.stringify(apiPayload) });
        if (response.status === 401 || response.status === 403) throw new Error("密码错误");
        const data = await response.json();

        if (data.taskId) { await deleteTaskDB(taskId); removeActiveTask(taskId); task.id = data.taskId; task.status = 'processing'; task.progress = null; task.retryCount = (task.retryCount || 0) + 1; task.timestamp = Date.now(); task.time = new Date().toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'}); await saveTaskDB(task); activeRetries.delete(taskId); await renderBoard(); } else throw new Error("无返回 ID");
    } catch (error) { task.status = 'failed'; task.autoRetry = false; await saveTaskDB(task); activeRetries.delete(taskId); renderBoard(); }
}

// 🌟 核心更新：加入进度条数据捕获
function startTaskPolling(taskId) {
    let attempts = 0;
    const poll = async () => {
        attempts++;
        try {
            const task = await getTaskDB(taskId);
            if (!task) { removeActiveTask(taskId); return; }

            const response = await fetch(API_POLL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-studio-pwd': sessionStorage.getItem('veo_admin_pwd') }, body: JSON.stringify({ taskId: taskId, model: task.modelVal }) });
            if (response.status === 401 || response.status === 403) { removeActiveTask(taskId); return; }
            
            const data = await response.json();

            if (data.status === 'success' && data.videoUrl) { removeActiveTask(taskId); task.status = 'success'; task.videoUrl = data.videoUrl; await saveTaskDB(task); renderBoard(); return; }
            if (data.status === 'failed') { removeActiveTask(taskId); if (task.autoRetry) { retryTask(task.id, null); } else { task.status = 'failed'; await saveTaskDB(task); renderBoard(); } return; }
            
            // 🌟 核心新增：捕获并更新生成进度条
            if (data.status === 'processing' || data.status === 'pending') {
                if (data.progress && task.progress !== data.progress) {
                    task.progress = data.progress; // 保存百分比
                    await saveTaskDB(task);
                    renderBoard(); // 刷新 UI
                }
            }
            
            if (attempts < 240) setTimeout(poll, 15000); else { removeActiveTask(taskId); if (task.autoRetry) retryTask(task.id, null); else { task.status = 'failed'; await saveTaskDB(task); renderBoard(); } }
        } catch (error) { setTimeout(poll, 15000); }
    };
    poll();
}

async function reuseTask(taskId) {
    const task = await getTaskDB(taskId); if(!task) return;
    document.getElementById('prompt-input').value = task.prompt || '';
    if (task.modelVal) { const modelSelect = document.getElementById('model-select'); if(modelSelect.querySelector(`option[value="${task.modelVal}"]`)) { modelSelect.value = task.modelVal; updateModel(modelSelect); } }
    if (task.ratio) { document.getElementById('ratio-select').value = task.ratio; updateRatio(document.getElementById('ratio-select')); }

    if (task.rawImages) {
        payloadState.firstFrame = task.rawImages.firstFrame || null; payloadState.lastFrame = task.rawImages.lastFrame || null; payloadState.references = [...(task.rawImages.references || [])]; switchMode(task.mode || 'ref');
        if (payloadState.firstFrame) { document.getElementById('first-img').src = getBlobUrl('temp_first', payloadState.firstFrame); document.getElementById('slot-first-box').classList.add('has-img'); } else clearFrame(null, 'firstFrame');
        if (payloadState.lastFrame) { document.getElementById('last-img').src = getBlobUrl('temp_last', payloadState.lastFrame); document.getElementById('slot-last-box').classList.add('has-img'); } else clearFrame(null, 'lastFrame');
        renderReferences();
    }
    document.getElementById('floating-console').classList.remove('minimized'); document.getElementById('prompt-input').focus();
}

// ==============================
// 🟢 插件系统引擎
// ==============================
const genData = { formats: ["主播带货", "街头采访", "教程演示", "前后反差", "开箱测评", "对比实验", "剧情短剧", "冲突夸张", "用户证言", "评论区回复", "生活方式植入"], openings: ["产品痛点开场", "夸张吸睛开场", "结果先给开场", "问题提问开场", "场景代入开场", "测评对比开场", "评论群回复开场", "数字清单开场"], attributes: ["强化主播人设", "情绪张力更强", "提前带出福利", "加入真实经历", "种草干货收尾", "单一卖点更聚焦"], generals: ["节奏更快", "情绪更强", "更像真实博主", "更强结果感", "更弱广告感", "强化收尾下单", "更强调产品细节", "UGC感", "更像评论区安利"] };
function getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
async function shuffleGenerator(id) { const task = await getTaskDB(id); if(!task) return; task.state.format = getRandom(genData.formats); task.state.opening = getRandom(genData.openings); task.state.attribute = getRandom(genData.attributes); task.state.general = getRandom(genData.generals); await saveTaskDB(task); renderBoard(); }
async function updateGeneratorState(id, key, value) { const task = await getTaskDB(id); if(task) { task.state[key] = value; await saveTaskDB(task); } }
async function applyGeneratorToPrompt(id, btnElement) {
    const task = await getTaskDB(id); if(!task) return;
    const { format, opening, attribute, general } = task.state;
    if (!format || !opening || !attribute || !general) return alert("请先点击【随机抽取】生成完整的组合");
    document.getElementById('prompt-input').value = `【带货形式】${format} | 【开头】${opening} | 【属性】${attribute} | 【通用】${general} \n\n围绕以上要求，帮我生成...`;
    document.getElementById('floating-console').classList.remove('minimized');
    const originalText = btnElement.innerHTML; btnElement.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px;">check_circle</span> 已应用`; btnElement.style.color = 'var(--success)'; setTimeout(() => { btnElement.innerHTML = originalText; btnElement.style.color = ''; }, 1500);
}
function buildGeneratorOptions(arr, selected) { let html = `<option value="" disabled ${!selected ? 'selected' : ''}>请选择...</option>`; arr.forEach(item => { html += `<option value="${item}" ${selected === item ? 'selected' : ''}>${item}</option>`; }); return html; }


// 🌟 AI 生图工具底层增强
async function handleGenImageDrop(e, id) {
    e.preventDefault(); e.stopPropagation();
    const dropZone = document.getElementById(`img-gen-zone-${id}`); if(dropZone) dropZone.classList.remove('drag-over');
    const srcToUse = await parseDroppedImage(e);
    if (srcToUse) {
        const task = await getTaskDB(id);
        if (task && task.state.images.length < 5) { task.state.images.push(srcToUse); await saveTaskDB(task); renderBoard(); } 
        else if(task) alert("最多只支持 5 张合并生图！");
    }
}

async function handleGenImageUpload(input, id) {
    if (!input.files || input.files.length === 0) return;
    const task = await getTaskDB(id); if (!task) return;
    let added = 0;
    for (let file of Array.from(input.files)) {
        if (task.state.images.length >= 5) break;
        task.state.images.push(await compressImageToBlob(file, 1024));
        added++;
    }
    if (added > 0) { await saveTaskDB(task); renderBoard(); } else alert("最多只支持 5 张合并生图！");
    input.value = ''; 
}

async function removeGenImage(e, id, index) { e.stopPropagation(); const task = await getTaskDB(id); if(task) { task.state.images.splice(index, 1); await saveTaskDB(task); renderBoard(); } }
async function updateImgGenState(id, key, value) { const task = await getTaskDB(id); if(task) { task.state[key] = value; await saveTaskDB(task); } }

// 🌟 全新强化版生图调度中心 (已修复同卡片连续生图缓存 Bug)
async function submitImgGen(id) {
    const task = await getTaskDB(id);
    if(!task) return;
    if(!task.state.prompt) return alert("请填写生图提示词！");

    task.status = 'processing';
    task.retryCount = 0; 
    await saveTaskDB(task); renderBoard();

    const apiPayload = {
        size: task.state.size, 
        prompt: task.state.prompt,
        channel: task.state.channel || 'channel_1', 
        images: await Promise.all(task.state.images.map(b => blobToBase64(b))) 
    };

    let success = false;
    let attempts = 0;
    const maxAttempts = task.state.autoRetry ? 3 : 1; 

    while (attempts < maxAttempts && !success) {
        attempts++;
        try {
            const response = await fetch(API_IMAGE_GEN, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json', 'x-studio-pwd': sessionStorage.getItem('veo_admin_pwd') }, 
                body: JSON.stringify(apiPayload) 
            });

            if (response.status === 401 || response.status === 403) throw new Error("控制台安全密码错误");
            if (!response.ok) throw new Error("生图接口报错: " + response.status);
            
            const data = await response.json();

            if (data.data && data.data[0] && data.data[0].url) {
                task.state.resultUrl = data.data[0].url;
                task.state.resultBlob = await fetch(data.data[0].url).then(r => r.blob());
                task.status = 'success';
                success = true;

                // 🌟 核心修复：踢掉旧图的 URL 缓存，强制渲染引擎读取新 Blob
                if (typeof blobUrlCache !== 'undefined' && blobUrlCache.has(task.id + '_res')) {
                    const cacheObj = blobUrlCache.get(task.id + '_res');
                    URL.revokeObjectURL(cacheObj.url || cacheObj);
                    blobUrlCache.delete(task.id + '_res');
                }

            } else {
                throw new Error(data.error?.message || "API 未返回有效图片");
            }
        } catch (e) {
            if (attempts >= maxAttempts) {
                task.status = 'failed';
            } else {
                task.retryCount = attempts;
                await saveTaskDB(task); renderBoard();
                await new Promise(r => setTimeout(r, 2000));
                // 🌟 核心修复：僵尸节点拦截雷达
                // 挂机苏醒后，查一下卡片是不是已经被用户手动删了，如果删了就赶紧撤退！
                const checkExists = await getTaskDB(task.id);
                if (!checkExists) return;
            }
        }
    }
    await saveTaskDB(task); renderBoard();
}

// ==============================
// 🚀 智能 DOM 对比引擎 (已加入进度条UI)
// ==============================
function generateCardHTML(task) {
    if (task.type === 'note') return `<div class="card-header"><span style="color:#ffca28; display:flex; align-items:center; gap:4px;"><span class="material-symbols-outlined" style="font-size:14px;">sticky_note_2</span> 即时便签</span><button onclick="removeTask('${task.id}')" data-tip="删除此便签" style="background:transparent; border:none; color:#ffca28; cursor:pointer; opacity:0.6;"><span class="material-symbols-outlined" style="font-size:16px;">close</span></button></div><textarea oninput="updateNoteText('${task.id}', this.value)" placeholder="在此输入灵感、提示词或分组备注...">${task.text || ''}</textarea>`;
    
    if (task.type === 'local_image') return `<div class="card-header" style="cursor:grab; padding-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.05);"><span style="font-size:12px; color:var(--text-sub); display:flex; align-items:center; gap:4px;"><span class="material-symbols-outlined" style="font-size:14px;">folder_open</span> 待用素材</span><button onclick="removeTask('${task.id}')" data-tip="删除此素材" style="background:transparent; border:none; color:var(--text-sub); cursor:pointer;"><span class="material-symbols-outlined" style="font-size:16px;">close</span></button></div><img src="${getBlobUrl(task.id, task.src)}" draggable="true" ondragstart="event.dataTransfer.setData('application/json', JSON.stringify({taskId: '${task.id}', type: 'local'}))" ondblclick="openLightbox(this.src)" data-tip="双击全屏高清预览，按住可拖动复用" style="width:100%; border-radius:4px; margin-top:8px; cursor:grab; border:1px solid rgba(255,255,255,0.1);">`;
    
    if (task.type === 'tool_generator') return `<div class="card-header"><span style="color:#818cf8; display:flex; align-items:center; gap:4px;"><span class="material-symbols-outlined" style="font-size:14px;">auto_awesome</span> 社媒灵感生成器</span><button onclick="removeTask('${task.id}')" data-tip="删除该组件" style="background:transparent; border:none; color:var(--text-sub); cursor:pointer;"><span class="material-symbols-outlined" style="font-size:16px;">close</span></button></div><div class="gen-grid"><div class="gen-item"><label><span class="material-symbols-outlined" style="font-size:12px;">video_camera_front</span> 带货形式</label><select onchange="updateGeneratorState('${task.id}', 'format', this.value)">${buildGeneratorOptions(genData.formats, task.state.format)}</select></div><div class="gen-item"><label><span class="material-symbols-outlined" style="font-size:12px;">play_circle</span> 开头节奏</label><select onchange="updateGeneratorState('${task.id}', 'opening', this.value)">${buildGeneratorOptions(genData.openings, task.state.opening)}</select></div><div class="gen-item"><label><span class="material-symbols-outlined" style="font-size:12px;">sell</span> 内容属性</label><select onchange="updateGeneratorState('${task.id}', 'attribute', this.value)">${buildGeneratorOptions(genData.attributes, task.state.attribute)}</select></div><div class="gen-item"><label><span class="material-symbols-outlined" style="font-size:12px;">magic_button</span> 通用调性</label><select onchange="updateGeneratorState('${task.id}', 'general', this.value)">${buildGeneratorOptions(genData.generals, task.state.general)}</select></div></div><div class="gen-actions"><button class="gen-btn shuffle" onclick="shuffleGenerator('${task.id}')" data-tip="摇骰子：随机抽取一套爆款剧本组合"><span class="material-symbols-outlined" style="font-size:16px;">shuffle</span> 随机抽取</button><button class="gen-btn copy" onclick="applyGeneratorToPrompt('${task.id}', this)" data-tip="一键将结构化剧本反填至底部 Prompt 框"><span class="material-symbols-outlined" style="font-size:16px;">move_down</span> 应用至控制台</button></div>`;

    if (task.type === 'tool_image_gen') {
        const isProcessing = task.status === 'processing';
        const isFailed = task.status === 'failed';
        
        const resultHtml = task.status === 'success' && task.state.resultBlob ? 
            `<div class="img-gen-result"><img src="${getBlobUrl(task.id+'_res', task.state.resultBlob)}" draggable="true" ondragstart="event.dataTransfer.setData('application/json', JSON.stringify({taskId: '${task.id}', type: 'gen_result'}))" ondblclick="openLightbox(this.src)" data-tip="双击全屏高清预览，按住可拖动复用"></div>` : '';
        
        let slotsHtml = task.state.images.map((img, i) => `<div class="img-gen-slot" style="border:none;"><img src="${getBlobUrl(task.id+'_img_'+i, img)}"><div class="popover-rm-btn remove-badge" onclick="removeGenImage(event, '${task.id}', ${i})">×</div></div>`).join('');
        if (task.state.images.length < 5) {
            slotsHtml += `<div class="img-gen-slot" id="img-gen-zone-${task.id}" data-tip="点击上传或从画布拖入垫图 (最多5张)" onclick="document.getElementById('file-input-${task.id}').click()"><span class="material-symbols-outlined" style="color:var(--text-sub);font-size:20px;">add</span><input type="file" id="file-input-${task.id}" style="display:none;" multiple accept="image/*" onchange="handleGenImageUpload(this, '${task.id}')" onclick="event.stopPropagation()"></div>`;
        }

        const retryStatusTxt = task.retryCount > 0 ? `(第 ${task.retryCount} 次重试...)` : '绘制中...';
        let btnContent = '<span class="material-symbols-outlined" style="font-size:18px;">draw</span> 生成图像';
        if (isProcessing) btnContent = `<svg class="spinner" viewBox="0 0 50 50" style="width:18px;height:18px;stroke:currentColor;"><circle cx="25" cy="25" r="20"></circle></svg> ${retryStatusTxt}`;
        if (isFailed) btnContent = '<span class="material-symbols-outlined" style="font-size:18px;">refresh</span> 失败，点击重试';

        return `
        <div class="card-header"><span style="color:var(--accent); display:flex; align-items:center; gap:4px;"><span class="material-symbols-outlined" style="font-size:14px;">brush</span> AI 多模生图</span><button onclick="removeTask('${task.id}')" data-tip="删除该组件" style="background:transparent; border:none; color:var(--text-sub); cursor:pointer;"><span class="material-symbols-outlined" style="font-size:16px;">close</span></button></div>
        <div class="img-gen-slots" ondragover="event.preventDefault(); document.getElementById('img-gen-zone-${task.id}')?.classList.add('drag-over');" ondragleave="document.getElementById('img-gen-zone-${task.id}')?.classList.remove('drag-over');" ondrop="handleGenImageDrop(event, '${task.id}')">${slotsHtml}</div>
        <div class="img-gen-controls">
            <select class="img-gen-select" onchange="updateImgGenState('${task.id}', 'size', this.value)" data-tip="选择图像生成比例">
                <option value="1024x1024" ${task.state.size==='1024x1024'?'selected':''}>1:1</option>
                <option value="1536x1024" ${task.state.size==='1536x1024'?'selected':''}>16:9</option>
                <option value="1024x1536" ${task.state.size==='1024x1536'?'selected':''}>9:16</option>
            </select>
            <select class="img-gen-select" onchange="updateImgGenState('${task.id}', 'channel', this.value)" style="flex: 1.5;" data-tip="若生成失败，可尝试切换备用 API 节点">
                <option value="channel_1" ${task.state.channel==='channel_1' || !task.state.channel ? 'selected' : ''}>节点 1 (主)</option>
                <option value="channel_2" ${task.state.channel==='channel_2'?'selected':''}>节点 2 (备)</option>
            </select>
            <select class="img-gen-select" onchange="updateImgGenState('${task.id}', 'autoRetry', this.value === 'true')" data-tip="遇网络异常是否自动重试 (最多3次)">
                <option value="false" ${!task.state.autoRetry?'selected':''}>单次</option>
                <option value="true" ${task.state.autoRetry?'selected':''}>自动重试</option>
            </select>
        </div>
        <textarea class="img-gen-prompt" onchange="updateImgGenState('${task.id}', 'prompt', this.value)" placeholder="输入画面提示词，可垫入 1-5 张图配合描述...">${task.state.prompt||''}</textarea>
        <button class="img-gen-btn" onclick="submitImgGen('${task.id}')" ${isProcessing?'disabled':''} style="${isFailed ? 'background: var(--danger);' : ''}">${btnContent}</button>
        ${resultHtml}
        `;
    }

    let statusBadge = '', mediaHtml = ''; const thumbImg = task.rawImages && (task.rawImages.firstFrame || (task.rawImages.references && task.rawImages.references[0])); const thumbUrl = getBlobUrl(task.id + '_thumb', thumbImg);
    
    if (task.status === 'processing') { 
        const retryTxt = task.retryCount ? ` (重试 ${task.retryCount})` : ''; 
        statusBadge = `<span class="status-badge processing">生成中...${retryTxt}</span>`; 
        
        // 🌟 核心新增：进度条 UI 渲染
        let progressHtml = '';
        if (task.progress) {
            progressHtml = `
            <div style="width: 80%; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; margin-top: 16px; overflow: hidden; position: relative;">
                <div style="height: 100%; background: var(--accent); width: ${task.progress}; transition: width 0.5s ease-out; box-shadow: 0 0 10px var(--accent);"></div>
            </div>
            <div style="font-size: 11px; color: var(--accent); margin-top: 8px; font-weight: 600; font-family: monospace;">${task.progress}</div>`;
        }

        mediaHtml = `
        <div class="card-media" style="aspect-ratio: ${task.ratio.replace(':','/')}; padding: 20px;">
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%; height:100%; color: var(--accent);">
                <svg class="spinner" viewBox="0 0 50 50" style="width:36px;height:36px;"><circle cx="25" cy="25" r="20"></circle></svg>
                <div class="generating-text" style="margin-top: ${task.progress ? '12px' : '16px'};">视频生成中...</div>
                ${progressHtml}
            </div>
        </div>`; 
    } else if (task.status === 'failed') { 
        statusBadge = `<span class="status-badge failed">失败</span>`; 
        mediaHtml = `<div class="card-media" style="background:#2c2c2e; color:var(--danger); aspect-ratio: ${task.ratio.replace(':','/')}; font-size:12px;">生成超时或失败</div>`; 
    } else { 
        statusBadge = `<span class="status-badge success">已完成</span>`; 
        mediaHtml = `<div class="card-media" data-tip="双击全屏播放视频"><video src="${task.videoUrl}" preload="none" poster="${thumbUrl || ''}" controls playsinline ondblclick="this.requestFullscreen()"></video></div>`; 
    }
    
    const thumbHtml = thumbImg ? `<img src="${thumbUrl}" draggable="true" ondragstart="event.dataTransfer.setData('application/json', JSON.stringify({taskId: '${task.id}', type: 'thumb'}))" ondblclick="openLightbox(this.src)" data-tip="双击全屏高清预览，按住可拖动复用">` : `<div style="width:44px;height:44px;border-radius:4px;background:#2c2c2e;display:flex;align-items:center;justify-content:center;"><span class="material-symbols-outlined" style="color:#666;">image</span></div>`;
    
    return `<div class="card-header"><div class="time-model"><span class="material-symbols-outlined" style="font-size: 14px;">schedule</span> ${task.time} · ${task.modelStr}</div>${statusBadge}</div><div class="card-prompt">${thumbHtml}<p title="${task.prompt}">${task.prompt}</p></div><div class="card-tags"><span class="card-tag">${task.ratio}</span>${task.autoRetry ? `<span class="card-tag" style="color:var(--success); border: 1px solid var(--success);">已开挂机重试</span>` : ''}</div>${mediaHtml}<div class="card-actions">${task.status === 'success' ? `<button onclick="downloadVideo('${task.videoUrl}')" data-tip="下载此视频到本地"><span class="material-symbols-outlined">download</span></button>` : ''}${task.status === 'failed' ? `<button class="retry-btn" onclick="retryTask('${task.id}', this)" data-tip="原地重新发起此任务"><span class="material-symbols-outlined">refresh</span></button>` : ''}<button class="reuse-btn" onclick="reuseTask('${task.id}')" data-tip="提取该任务的所有图文参数，反填至底部控制台"><span class="material-symbols-outlined">edit_note</span></button><button onclick="removeTask('${task.id}')" data-tip="删除此生成记录"><span class="material-symbols-outlined">delete</span></button></div>`;
}

async function renderBoard() {
    const tasks = await getAllTasksDB();
    const taskIds = new Set(tasks.map(t => 'card-' + t.id));
    const existingCards = Array.from(board.children);

    existingCards.forEach(card => { if (!taskIds.has(card.id)) card.remove(); });

    tasks.forEach(task => {
        let cardEl = document.getElementById('card-' + task.id);
        const currentImgLen = (task.state && task.state.images) ? task.state.images.length : 0; 
        const currentProgress = task.progress || '';

        if (!cardEl) {
            cardEl = document.createElement('div'); cardEl.id = 'card-' + task.id;
            if (task.type === 'note') { cardEl.className = 'video-card sticky-note'; cardEl.style.width = `${task.width || 260}px`; cardEl.style.height = `${task.height || 180}px`; }
            else if (task.type === 'local_image') cardEl.className = 'video-card local-image-card';
            else if (task.type === 'tool_generator') cardEl.className = 'video-card tool-generator';
            else if (task.type === 'tool_image_gen') cardEl.className = 'video-card tool-image-gen'; 
            else cardEl.className = 'video-card';
            
            cardEl.style.transform = `translate3d(${task.x}px, ${task.y}px, 0)`;
            cardEl.innerHTML = generateCardHTML(task); 
            board.appendChild(cardEl); 
            bindCardDrag(cardEl, task);
            
            if (task.type === 'note') cardEl.addEventListener('mouseup', () => saveNoteSize(task.id, cardEl.offsetWidth, cardEl.offsetHeight));
            if (task.status === 'processing' && !activeTasks.includes(task.id)) { activeTasks.push(task.id); startTaskPolling(task.id); }
        } else {
            cardEl.style.transform = `translate3d(${task.x}px, ${task.y}px, 0)`;
            if (task.type === 'note' && task.width && task.height) { cardEl.style.width = `${task.width}px`; cardEl.style.height = `${task.height}px`; }
            
            const oldStatus = cardEl.getAttribute('data-sync-status');
            const oldRetry = cardEl.getAttribute('data-sync-retry');
            const oldImgLen = cardEl.getAttribute('data-sync-img-len');
            const oldProgress = cardEl.getAttribute('data-sync-progress');

            // 🌟 核心更新：加入进度比对，进度有变化时触发局部渲染
            if (oldStatus !== task.status || oldRetry != task.retryCount || oldImgLen != currentImgLen || oldProgress !== currentProgress) { 
                cardEl.innerHTML = generateCardHTML(task); 
                bindCardDrag(cardEl, task); 
            }
        }
        
        cardEl.setAttribute('data-sync-status', task.status || 'static'); 
        cardEl.setAttribute('data-sync-retry', task.retryCount || 0);
        cardEl.setAttribute('data-sync-img-len', currentImgLen); 
        cardEl.setAttribute('data-sync-progress', currentProgress); 
    });
}

async function removeTask(id) { if(confirm('确定删除这张卡片吗？')) { await deleteTaskDB(id); const card = document.getElementById('card-' + id); if (card) card.remove(); } }
function downloadVideo(url) { const a = document.createElement('a'); a.href = url; a.target = "_blank"; a.download = `Studio_${Date.now()}.mp4`; a.click(); }

document.addEventListener('DOMContentLoaded', async () => {
    await initDB(); board.style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`; document.body.style.backgroundPosition = `${transform.x}px ${transform.y}px`; await renderBoard(); 
    bindMainConsoleDrop('slot-ref-box', 'references'); bindMainConsoleDrop('slot-first-box', 'firstFrame'); bindMainConsoleDrop('slot-last-box', 'lastFrame');
});
