// ==========================================
// 🟢 核心应用逻辑
// ==========================================
const API_SUBMIT = 'https://api.wallyai.top/webhook/proxy-submit'; 
const API_POLL = 'https://api.wallyai.top/webhook/proxy-poll';     

let payloadState = { model: 'veo_3_1_fast', aspectRatio: '9:16', enhancePrompt: true, enableUpsample: false, autoRetry: false, firstFrame: null, lastFrame: null, references: [], currentMode: 'ref' };
let activeTasks = [];
let activeRetries = new Set(); 

function removeActiveTask(id) {
    const index = activeTasks.indexOf(id);
    if (index > -1) activeTasks.splice(index, 1);
}

function toggleDrawer() { document.getElementById('tool-drawer').classList.toggle('open'); }

// ==============================
// ♾️ 无限画布防抖渲染核心
// ==============================
const viewport = document.getElementById('canvas-viewport');
const board = document.getElementById('canvas-board');
let transform = { x: window.innerWidth / 2, y: 100, scale: 1 }; 
let isPanning = false, startPanX = 0, startPanY = 0;
let ticking = false; 

function updateCanvas() {
    if (!ticking) {
        requestAnimationFrame(() => {
            board.style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`;
            document.body.style.backgroundPosition = `${transform.x}px ${transform.y}px`;
            document.body.style.backgroundSize = `${30 * transform.scale}px ${30 * transform.scale}px`;
            ticking = false;
        });
        ticking = true;
    }
}

viewport.addEventListener('mousedown', (e) => {
    if (e.target === viewport || e.target === board) {
        isPanning = true; startPanX = e.clientX - transform.x; startPanY = e.clientY - transform.y;
    }
});
window.addEventListener('mousemove', (e) => {
    if (isPanning) { transform.x = e.clientX - startPanX; transform.y = e.clientY - startPanY; updateCanvas(); }
});
window.addEventListener('mouseup', () => { isPanning = false; });

viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (ticking) return; 
    const zoomSensitivity = 0.001;
    const delta = e.deltaY * zoomSensitivity;
    let newScale = Math.min(Math.max(0.2, transform.scale - delta), 3); 
    const rect = viewport.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    transform.x = mouseX - (mouseX - transform.x) * (newScale / transform.scale);
    transform.y = mouseY - (mouseY - transform.y) * (newScale / transform.scale);
    transform.scale = newScale;
    updateCanvas();
}, { passive: false });

function makeCardDraggable(cardEl, task) {
    const header = cardEl.querySelector('.card-header');
    if(!header) return;
    let isDraggingCard = false, cStartX, cStartY;

    header.addEventListener('mousedown', (e) => {
        isDraggingCard = true;
        cStartX = e.clientX - (task.x || 0) * transform.scale;
        cStartY = e.clientY - (task.y || 0) * transform.scale;
        document.querySelectorAll('.video-card').forEach(c => c.style.zIndex = '1');
        cardEl.style.zIndex = '10';
        e.stopPropagation(); 
    });
    window.addEventListener('mousemove', (e) => {
        if(isDraggingCard) {
            task.x = (e.clientX - cStartX) / transform.scale;
            task.y = (e.clientY - cStartY) / transform.scale;
            cardEl.style.left = `${task.x}px`; cardEl.style.top = `${task.y}px`;
        }
    });
    window.addEventListener('mouseup', () => {
        if(isDraggingCard) { isDraggingCard = false; saveTaskDB(task); }
    });
}

// ==============================
// 📝 便签与防误触
// ==============================
const consoleEl = document.getElementById('floating-console');
document.addEventListener('click', (e) => {
    const popover = document.getElementById('ref-popover');
    const slotBox = document.getElementById('slot-ref-box');
    if (popover && popover.style.display === 'flex' && !popover.contains(e.target) && !slotBox.contains(e.target)) popover.style.display = 'none';
    if (e.target === viewport || e.target === board) {
        consoleEl.classList.add('minimized');
        document.getElementById('tool-drawer').classList.remove('open'); 
    } else if (consoleEl.contains(e.target)) consoleEl.classList.remove('minimized');
});

async function createStickyNote(spawnX, spawnY) {
    if (spawnX === undefined) spawnX = (-transform.x + window.innerWidth/2 - 120) / transform.scale;
    if (spawnY === undefined) spawnY = (-transform.y + window.innerHeight/2 - 80) / transform.scale;
    const newNote = {
        id: 'note_' + Date.now() + Math.random().toString(36).substr(2, 5),
        type: 'note', text: '', x: spawnX, y: spawnY, width: 260, height: 200, timestamp: Date.now()
    };
    await saveTaskDB(newNote); renderBoard();
}

viewport.addEventListener('dblclick', (e) => {
    if (e.target === viewport || e.target === board) createStickyNote((e.clientX - transform.x) / transform.scale, (e.clientY - transform.y) / transform.scale);
});

let noteTimeout;
async function updateNoteText(id, text) {
    clearTimeout(noteTimeout);
    noteTimeout = setTimeout(async () => {
        const note = await getTaskDB(id);
        if (note) { note.text = text; await saveTaskDB(note); }
    }, 500);
}

function saveNoteSize(id, w, h) {
    setTimeout(async () => {
        const note = await getTaskDB(id);
        if (note && (note.width !== w || note.height !== h)) { note.width = w; note.height = h; await saveTaskDB(note); }
    }, 100);
}

// ==============================
// 🖼️ 本地拖拽交互 (原生文件流支持)
// ==============================
window.addEventListener("dragover", function(e){ e.preventDefault(); }, false);
window.addEventListener("drop", function(e){ e.preventDefault(); }, false);

viewport.addEventListener('drop', async (e) => {
    e.preventDefault();
    const pluginType = e.dataTransfer.getData('plugin');
    if (pluginType === 'generator') {
        const newTool = {
            id: 'tool_' + Date.now(), type: 'tool_generator',
            x: (e.clientX - transform.x) / transform.scale, y: (e.clientY - transform.y) / transform.scale, 
            timestamp: Date.now(), state: { format: '', opening: '', attribute: '', general: '' }
        };
        await saveTaskDB(newTool); renderBoard();
        document.getElementById('tool-drawer').classList.remove('open');
        return;
    }

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
        let offset = 0;
        for (let file of files) {
            if (file.type.startsWith('image/')) {
                const blob = await compressImageToBlob(file, 1024);
                const newLocalNode = {
                    id: 'local_img_' + Date.now() + Math.random().toString(36).substr(2, 5),
                    type: 'local_image', src: blob,
                    x: (e.clientX - transform.x) / transform.scale + offset, 
                    y: (e.clientY - transform.y) / transform.scale + offset, 
                    timestamp: Date.now()
                };
                await saveTaskDB(newLocalNode); offset += 40; 
            }
        }
        renderBoard();
    }
});

// UI 控制函数
function toggleRefPopover(e) { e.stopPropagation(); if (payloadState.references.length === 0) document.getElementById('ref-file').click(); else { const p = document.getElementById('ref-popover'); p.style.display = p.style.display === 'flex' ? 'none' : 'flex'; } }
function switchMode(mode) { payloadState.currentMode = mode; document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active')); document.querySelectorAll('.slot-group').forEach(s => s.classList.remove('active')); document.getElementById(`tab-${mode}`).classList.add('active'); document.getElementById(`slots-${mode}`).classList.add('active'); }
function updateModel(select) { payloadState.model = select.value; document.getElementById('model-text').innerText = select.options[select.selectedIndex].text; }
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
// 🚀 批处理与提交调度
// ==============================
async function submitBatchTask() {
    const prompt = document.getElementById('prompt-input').value.trim();
    if (!prompt) return alert('请填写提示词');
    
    const batchCount = parseInt(document.getElementById('batch-select').value);
    const btn = document.getElementById('generate-btn');
    btn.disabled = true; btn.innerHTML = `<svg class="spinner" viewBox="0 0 50 50"><circle cx="25" cy="25" r="20"></circle></svg>`;
    
    // 深拷贝此时的状态
    let submitRef = [...payloadState.references], submitFirst = payloadState.firstFrame, submitLast = payloadState.lastFrame;
    if (payloadState.currentMode === 'ref') { submitFirst = null; submitLast = null; } 
    else submitRef = [];

    const taskParams = {
        model: payloadState.model, aspectRatio: payloadState.aspectRatio,
        enhancePrompt: payloadState.enhancePrompt, enableUpsample: payloadState.enableUpsample,
        autoRetry: payloadState.autoRetry, 
        firstFrame: submitFirst, lastFrame: submitLast, references: submitRef
    };

    let promises = [];
    for(let i=0; i<batchCount; i++) promises.push(executeSubmission(taskParams, prompt, i));
    
    await Promise.allSettled(promises);
    btn.disabled = false; btn.innerHTML = `<span class="material-symbols-outlined">arrow_upward</span>`;
    document.getElementById('prompt-input').value = ''; 
}

async function executeSubmission(params, promptText, offsetIndex = 0) {
    try {
        // 🌟 将内部的 Blob 实时转换为 Base64 供网络传输使用
        const apiPayload = {
            model: params.model, prompt: promptText, aspectRatio: params.aspectRatio,
            enhancePrompt: params.enhancePrompt, enableUpsample: params.enableUpsample,
            firstFrame: await blobToBase64(params.firstFrame),
            lastFrame: await blobToBase64(params.lastFrame),
            references: await Promise.all(params.references.map(b => blobToBase64(b)))
        };

        const response = await fetch(API_SUBMIT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-studio-pwd': sessionStorage.getItem('veo_admin_pwd') }, body: JSON.stringify(apiPayload) });
        if (response.status === 401 || response.status === 403) throw new Error("密码错误");
        const data = await response.json();

        if (data.taskId) {
            const spawnX = (-transform.x + window.innerWidth/2 - 170) / transform.scale + (offsetIndex * 360);
            const spawnY = (-transform.y + window.innerHeight/2 - 150) / transform.scale + (offsetIndex * 40);
            
            const newTask = {
                id: data.taskId, prompt: promptText,
                modelStr: params.references && params.references.length > 0 ? 'Veo 3 Cmp' : 'Veo 3 Fast',
                modelVal: params.model, ratio: params.aspectRatio,
                autoRetry: params.autoRetry, retryCount: 0,
                // 🌟 保存至本地数据库的，是纯净且体积极小的 Blob 对象
                rawImages: { firstFrame: params.firstFrame, lastFrame: params.lastFrame, references: params.references || [] },
                mode: params.references && params.references.length > 0 ? 'ref' : 'frame',
                status: 'processing', timestamp: Date.now(), time: new Date().toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'}),
                videoUrl: null, x: spawnX, y: spawnY
            };
            
            await saveTaskDB(newTask);
            await renderBoard(); 
        }
    } catch (error) { console.error('提交失败:', error); }
}

// 重试调度
async function retryTask(taskId, btnElement) {
    if (activeRetries.has(taskId)) return; 
    activeRetries.add(taskId);
    if (btnElement) { btnElement.disabled = true; btnElement.innerHTML = `<svg class="spinner" viewBox="0 0 50 50" style="width:18px;height:18px;stroke:var(--text-sub);"><circle cx="25" cy="25" r="20"></circle></svg>`; }
    
    const task = await getTaskDB(taskId);
    if(!task) { activeRetries.delete(taskId); return; }

    try {
        const apiPayload = {
            model: task.modelVal, prompt: task.prompt, aspectRatio: task.ratio, enhancePrompt: true, enableUpsample: false,
            firstFrame: await blobToBase64(task.rawImages.firstFrame), lastFrame: await blobToBase64(task.rawImages.lastFrame),
            references: await Promise.all((task.rawImages.references || []).map(b => blobToBase64(b)))
        };

        const response = await fetch(API_SUBMIT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-studio-pwd': sessionStorage.getItem('veo_admin_pwd') }, body: JSON.stringify(apiPayload) });
        if (response.status === 401 || response.status === 403) throw new Error("密码错误");
        const data = await response.json();

        if (data.taskId) {
            await deleteTaskDB(taskId); removeActiveTask(taskId); 
            task.id = data.taskId; task.status = 'processing'; task.retryCount = (task.retryCount || 0) + 1; task.timestamp = Date.now(); task.time = new Date().toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'});
            await saveTaskDB(task); activeRetries.delete(taskId); await renderBoard();        
        } else throw new Error("无返回 ID");
    } catch (error) {
        task.status = 'failed'; task.autoRetry = false; await saveTaskDB(task); activeRetries.delete(taskId); renderBoard();
    }
}

// 轮询引擎
function startTaskPolling(taskId) {
    let attempts = 0;
    const poll = async () => {
        attempts++;
        try {
            const response = await fetch(API_POLL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-studio-pwd': sessionStorage.getItem('veo_admin_pwd') }, body: JSON.stringify({ taskId: taskId }) });
            if (response.status === 401 || response.status === 403) { removeActiveTask(taskId); return; }
            const data = await response.json();
            const task = await getTaskDB(taskId);
            if (!task) { removeActiveTask(taskId); return; }

            if (data.status === 'success' && data.videoUrl) { removeActiveTask(taskId); task.status = 'success'; task.videoUrl = data.videoUrl; await saveTaskDB(task); renderBoard(); return; }
            if (data.status === 'failed') { removeActiveTask(taskId); if (task.autoRetry) { retryTask(task.id, null); } else { task.status = 'failed'; await saveTaskDB(task); renderBoard(); } return; }
            
            if (attempts < 240) setTimeout(poll, 15000); 
            else { removeActiveTask(taskId); if (task.autoRetry) retryTask(task.id, null); else { task.status = 'failed'; await saveTaskDB(task); renderBoard(); } }
        } catch (error) { setTimeout(poll, 15000); }
    };
    poll();
}

async function reuseTask(taskId) {
    const task = await getTaskDB(taskId);
    if(!task) return;
    document.getElementById('prompt-input').value = task.prompt || '';
    if (task.modelVal) { const modelSelect = document.getElementById('model-select'); if(modelSelect.querySelector(`option[value="${task.modelVal}"]`)) { modelSelect.value = task.modelVal; updateModel(modelSelect); } }
    if (task.ratio) { document.getElementById('ratio-select').value = task.ratio; updateRatio(document.getElementById('ratio-select')); }

    if (task.rawImages) {
        payloadState.firstFrame = task.rawImages.firstFrame || null; payloadState.lastFrame = task.rawImages.lastFrame || null; payloadState.references = [...(task.rawImages.references || [])];
        switchMode(task.mode || 'ref');
        
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
    const originalText = btnElement.innerHTML; btnElement.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px;">check_circle</span> 已应用`; btnElement.style.color = 'var(--success)';
    setTimeout(() => { btnElement.innerHTML = originalText; btnElement.style.color = ''; }, 1500);
}
function buildGeneratorOptions(arr, selected) {
    let html = `<option value="" disabled ${!selected ? 'selected' : ''}>请选择...</option>`;
    arr.forEach(item => { html += `<option value="${item}" ${selected === item ? 'selected' : ''}>${item}</option>`; });
    return html;
}

// ==============================
// 🚀 智能 DOM 对比引擎
// ==============================
function generateCardHTML(task) {
    if (task.type === 'note') return `<div class="card-header"><span style="color:#ffca28; display:flex; align-items:center; gap:4px;"><span class="material-symbols-outlined" style="font-size:14px;">sticky_note_2</span> 即时便签</span><button onclick="removeTask('${task.id}')" style="background:transparent; border:none; color:#ffca28; cursor:pointer; opacity:0.6;"><span class="material-symbols-outlined" style="font-size:16px;">close</span></button></div><textarea oninput="updateNoteText('${task.id}', this.value)" placeholder="在此输入灵感、提示词或分组备注...">${task.text || ''}</textarea>`;
    if (task.type === 'local_image') return `<div class="card-header" style="cursor:grab; padding-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.05);"><span style="font-size:12px; color:var(--text-sub); display:flex; align-items:center; gap:4px;"><span class="material-symbols-outlined" style="font-size:14px;">folder_open</span> 待用素材</span><button onclick="removeTask('${task.id}')" style="background:transparent; border:none; color:var(--text-sub); cursor:pointer;"><span class="material-symbols-outlined" style="font-size:16px;">close</span></button></div><img src="${getBlobUrl(task.id, task.src)}" draggable="true" ondragstart="event.dataTransfer.setData('text/plain', '${task.src}')" style="width:100%; border-radius:4px; margin-top:8px; cursor:grab; border:1px solid rgba(255,255,255,0.1);" title="按住图片拖拽复用">`;
    if (task.type === 'tool_generator') return `<div class="card-header"><span style="color:#818cf8; display:flex; align-items:center; gap:4px;"><span class="material-symbols-outlined" style="font-size:14px;">auto_awesome</span> 社媒灵感生成器</span><button onclick="removeTask('${task.id}')" style="background:transparent; border:none; color:var(--text-sub); cursor:pointer;"><span class="material-symbols-outlined" style="font-size:16px;">close</span></button></div><div class="gen-grid"><div class="gen-item"><label><span class="material-symbols-outlined" style="font-size:12px;">video_camera_front</span> 带货形式</label><select onchange="updateGeneratorState('${task.id}', 'format', this.value)">${buildGeneratorOptions(genData.formats, task.state.format)}</select></div><div class="gen-item"><label><span class="material-symbols-outlined" style="font-size:12px;">play_circle</span> 开头节奏</label><select onchange="updateGeneratorState('${task.id}', 'opening', this.value)">${buildGeneratorOptions(genData.openings, task.state.opening)}</select></div><div class="gen-item"><label><span class="material-symbols-outlined" style="font-size:12px;">sell</span> 内容属性</label><select onchange="updateGeneratorState('${task.id}', 'attribute', this.value)">${buildGeneratorOptions(genData.attributes, task.state.attribute)}</select></div><div class="gen-item"><label><span class="material-symbols-outlined" style="font-size:12px;">magic_button</span> 通用调性</label><select onchange="updateGeneratorState('${task.id}', 'general', this.value)">${buildGeneratorOptions(genData.generals, task.state.general)}</select></div></div><div class="gen-actions"><button class="gen-btn shuffle" onclick="shuffleGenerator('${task.id}')"><span class="material-symbols-outlined" style="font-size:16px;">shuffle</span> 随机抽取</button><button class="gen-btn copy" onclick="applyGeneratorToPrompt('${task.id}', this)"><span class="material-symbols-outlined" style="font-size:16px;">move_down</span> 应用至控制台</button></div>`;

    let statusBadge = '', mediaHtml = '';
    const thumbImg = task.rawImages && (task.rawImages.firstFrame || (task.rawImages.references && task.rawImages.references[0]));
    const thumbUrl = getBlobUrl(task.id + '_thumb', thumbImg);

    if (task.status === 'processing') {
        const retryTxt = task.retryCount ? ` (重试 ${task.retryCount} 次)` : '';
        statusBadge = `<span class="status-badge processing">生成中...${retryTxt}</span>`;
        mediaHtml = `<div class="card-media" style="aspect-ratio: ${task.ratio.replace(':','/')};"><div style="display:flex; flex-direction:column; align-items:center; color: var(--accent);"><svg class="spinner" viewBox="0 0 50 50" style="width:36px;height:36px;"><circle cx="25" cy="25" r="20"></circle></svg><div class="generating-text">视频生成中...</div></div></div>`;
    } else if (task.status === 'failed') {
        statusBadge = `<span class="status-badge failed">失败</span>`;
        mediaHtml = `<div class="card-media" style="background:#2c2c2e; color:var(--danger); aspect-ratio: ${task.ratio.replace(':','/')}; font-size:12px;">生成超时或失败</div>`;
    } else {
        statusBadge = `<span class="status-badge success">已完成</span>`;
        mediaHtml = `<div class="card-media"><video src="${task.videoUrl}" preload="none" poster="${thumbUrl || ''}" controls playsinline></video></div>`;
    }

    const thumbHtml = thumbImg ? `<img src="${thumbUrl}" draggable="true" ondragstart="event.dataTransfer.setData('text/plain', '${thumbImg}')" title="按住拖拽复用">` : `<div style="width:44px;height:44px;border-radius:4px;background:#2c2c2e;display:flex;align-items:center;justify-content:center;"><span class="material-symbols-outlined" style="color:#666;">image</span></div>`;

    return `<div class="card-header"><div class="time-model"><span class="material-symbols-outlined" style="font-size: 14px;">schedule</span> ${task.time} · ${task.modelStr}</div>${statusBadge}</div><div class="card-prompt">${thumbHtml}<p title="${task.prompt}">${task.prompt}</p></div><div class="card-tags"><span class="card-tag">${task.ratio}</span>${task.autoRetry ? `<span class="card-tag" style="color:var(--success); border: 1px solid var(--success);">已开挂机重试</span>` : ''}</div>${mediaHtml}<div class="card-actions">${task.status === 'success' ? `<button onclick="downloadVideo('${task.videoUrl}')" title="下载视频"><span class="material-symbols-outlined">download</span></button>` : ''}${task.status === 'failed' ? `<button class="retry-btn" onclick="retryTask('${task.id}', this)" title="原地重试"><span class="material-symbols-outlined">refresh</span></button>` : ''}<button class="reuse-btn" onclick="reuseTask('${task.id}')" title="完整提取图文参数"><span class="material-symbols-outlined">edit_note</span></button><button onclick="removeTask('${task.id}')" title="删除记录"><span class="material-symbols-outlined">delete</span></button></div>`;
}

async function renderBoard() {
    const tasks = await getAllTasksDB();
    const taskIds = new Set(tasks.map(t => 'card-' + t.id));
    const existingCards = Array.from(board.children);

    existingCards.forEach(card => { if (!taskIds.has(card.id)) card.remove(); });

    tasks.forEach(task => {
        let cardEl = document.getElementById('card-' + task.id);
        if (!cardEl) {
            cardEl = document.createElement('div'); cardEl.id = 'card-' + task.id;
            if (task.type === 'note') { cardEl.className = 'video-card sticky-note'; cardEl.style.width = `${task.width || 260}px`; cardEl.style.height = `${task.height || 180}px`; }
            else if (task.type === 'local_image') cardEl.className = 'video-card local-image-card';
            else if (task.type === 'tool_generator') cardEl.className = 'video-card tool-generator';
            else cardEl.className = 'video-card';
            
            cardEl.style.left = `${task.x}px`; cardEl.style.top = `${task.y}px`;
            cardEl.innerHTML = generateCardHTML(task);
            board.appendChild(cardEl);
            makeCardDraggable(cardEl, task);
            if (task.type === 'note') cardEl.addEventListener('mouseup', () => saveNoteSize(task.id, cardEl.offsetWidth, cardEl.offsetHeight));
            if (task.status === 'processing' && !activeTasks.includes(task.id)) { activeTasks.push(task.id); startTaskPolling(task.id); }
        } else {
            cardEl.style.left = `${task.x}px`; cardEl.style.top = `${task.y}px`;
            if (task.type === 'note' && task.width && task.height) { cardEl.style.width = `${task.width}px`; cardEl.style.height = `${task.height}px`; }
            const oldStatus = cardEl.getAttribute('data-sync-status'), oldRetry = cardEl.getAttribute('data-sync-retry');
            if (oldStatus !== task.status || oldRetry != task.retryCount) { cardEl.innerHTML = generateCardHTML(task); makeCardDraggable(cardEl, task); }
        }
        cardEl.setAttribute('data-sync-status', task.status || 'static'); cardEl.setAttribute('data-sync-retry', task.retryCount || 0);
    });
}

async function removeTask(id) { if(confirm('确定删除这张卡片吗？')) { await deleteTaskDB(id); const card = document.getElementById('card-' + id); if (card) card.remove(); } }
function downloadVideo(url) { const a = document.createElement('a'); a.href = url; a.target = "_blank"; a.download = `Studio_${Date.now()}.mp4`; a.click(); }

document.addEventListener('DOMContentLoaded', async () => {
    await initDB(); updateCanvas(); await renderBoard();
    
    // 初始化拖拽目标监听
    const setupDrop = (slotId, stateKey) => {
        const slot = document.getElementById(slotId);
        slot.addEventListener('dragover', (e) => { e.preventDefault(); slot.classList.add('drag-over'); });
        slot.addEventListener('dragleave', (e) => { e.preventDefault(); slot.classList.remove('drag-over'); });
        slot.addEventListener('drop', async (e) => {
            e.preventDefault(); slot.classList.remove('drag-over');
            let srcToUse = e.dataTransfer.getData('text/plain') || null;
            if (!srcToUse && e.dataTransfer.files.length > 0 && e.dataTransfer.files[0].type.startsWith('image/')) srcToUse = await compressImageToBlob(e.dataTransfer.files[0], 1024);
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
    };
    setupDrop('slot-ref-box', 'references'); setupDrop('slot-first-box', 'firstFrame'); setupDrop('slot-last-box', 'lastFrame');
});
