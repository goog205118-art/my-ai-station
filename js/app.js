// ==========================================
// 🟢 核心应用逻辑
// ==========================================
let loginAnimationId = null;

// ==============================
// 🚫 安全警告：呼出错误警告弹窗
// ==============================
function showErrorModal() {
    const modal = document.getElementById('error-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    modal.offsetHeight; // 强制浏览器重绘
    modal.classList.add('show');
    
    // 给内容框加上震动动画
    const content = document.getElementById('error-modal-content');
    if (content) {
        content.classList.remove('error-shake');
        void content.offsetWidth; // 触发重绘
        content.classList.add('error-shake');
    }
}

// 🚫 安全警告：关闭警告弹窗
function closeErrorModal() {
    const modal = document.getElementById('error-modal');
    if (!modal) return;
    modal.classList.remove('show');
    setTimeout(() => modal.style.display = 'none', 300);
    // 关闭后自动把焦点还给密码输入框
    const input = document.getElementById('studio-pwd-input');
    if (input) input.focus();
}

// ==============================
// 🔐 核心新增：SHA-256 军工级哈希加密算法
// ==============================
async function hashPassword(password) {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ==============================
// 🎬 登录舱与系统初始化逻辑 (Login Gate)
// ==============================
document.addEventListener('DOMContentLoaded', () => {
    const gate = document.getElementById('login-gate');
    const savedPwd = sessionStorage.getItem('veo_admin_pwd');
    
    if (savedPwd) {
        gate.style.display = 'none';
        return;
    }

    // 🌟 启动光影尘埃粒子引擎
    const canvas = document.getElementById('login-canvas');
    if (canvas && gate.style.display !== 'none') {
        const ctx = canvas.getContext('2d');
        let width, height;
        let particles = [];
        let mouse = { x: null, y: null };

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resize);
        resize();

        gate.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
        gate.addEventListener('mouseleave', () => { mouse.x = null; mouse.y = null; });

        class Particle {
            constructor() {
                this.x = Math.random() * width; this.y = Math.random() * height;
                this.size = Math.random() * 1.5 + 0.5; 
                this.speedX = Math.random() * 0.5 - 0.25; this.speedY = Math.random() * 0.5 - 0.25;
                this.baseOpacity = Math.random() * 0.3 + 0.1; this.opacity = this.baseOpacity;
            }
            update() {
                this.x += this.speedX; this.y += this.speedY;
                if (this.x < 0 || this.x > width) this.speedX *= -1;
                if (this.y < 0 || this.y > height) this.speedY *= -1;

                if (mouse.x && mouse.y) {
                    let dx = mouse.x - this.x; let dy = mouse.y - this.y;
                    let distance = Math.sqrt(dx*dx + dy*dy);
                    if (distance < 80) {
                        this.x -= dx * 0.015; this.y -= dy * 0.015; this.opacity = 0.9;
                    } else {
                        this.opacity = Math.max(this.baseOpacity, this.opacity - 0.02);
                    }
                }
            }
            draw() {
                ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
                ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
            }
        }

        for (let i = 0; i < 120; i++) particles.push(new Particle());

        function animate() {
            ctx.clearRect(0, 0, width, height);
            if (mouse.x && mouse.y) {
                let gradient = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 120);
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
                gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.02)');
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
            }
            particles.forEach(p => { p.update(); p.draw(); });
            loginAnimationId = requestAnimationFrame(animate);
        }
        animate();
    }
});

function startLoginTransition() {
    document.getElementById('gate-step-1').classList.remove('step-active');
    document.getElementById('gate-step-1').classList.add('step-passed'); 
    
    setTimeout(() => {
        document.getElementById('gate-step-2').classList.add('step-active'); 
        document.getElementById('studio-pwd-input').focus();
    }, 200); 
}

// 🌟 必须是 async 异步函数才能使用 await
async function handleLoginSubmit(e) {
    e.preventDefault(); 
    
    const pwdInput = document.getElementById('studio-pwd-input').value.trim();
    const btn = document.getElementById('login-submit-btn');
    
    if (!pwdInput) return showToast("请输入密钥", "error");

    btn.innerHTML = `<svg class="spinner" viewBox="0 0 50 50" style="width:20px;height:20px;stroke:currentColor;margin:0 auto;"><circle cx="25" cy="25" r="20"></circle></svg>`;
    btn.style.pointerEvents = 'none';

    // 🌟 1. 计算用户输入密码的哈希值
    const inputHash = await hashPassword(pwdInput);
    
    // 🌟 2. 你的专属哈希锁 (已从截图自动提取填入)
    const TARGET_HASH = "acc8ca2c94bcfaf05736fe29176ad5ec6f766a47ae3597a4186507ece27e5f0f";

    setTimeout(() => {
        // 🌟 3. 哈希门卫拦截逻辑
        if (inputHash !== TARGET_HASH) {
            showErrorModal(); 
            btn.innerHTML = `验证身份 / LOGIN`;
            btn.style.pointerEvents = 'auto';
            document.getElementById('studio-pwd-input').value = '';
            return; 
        }

        // 🌟 4. 验证通过：保存明文用于 n8n 验证，并播放解锁运镜！
        sessionStorage.setItem('veo_admin_pwd', pwdInput);
        
        btn.innerHTML = `<span class="material-symbols-outlined">check_circle</span> 验证通过`;
        btn.style.background = 'var(--success)';
        
        setTimeout(() => {
            document.getElementById('gate-step-2').classList.remove('step-active');
            document.getElementById('gate-step-2').classList.add('step-passed');
            
            const gate = document.getElementById('login-gate');
            gate.classList.add('unlocked');
            
            setTimeout(() => {
                if (typeof loginAnimationId !== 'undefined' && loginAnimationId) cancelAnimationFrame(loginAnimationId);
                gate.remove();
                showToast("欢迎回来", "success");
            }, 800);
        }, 400);

    }, 600);
}


// ==========================================
// 工作台 API 与核心常量
// ==========================================
const API_SUBMIT = 'https://api.wallyai.top/webhook/proxy-submit'; 
const API_POLL = 'https://api.wallyai.top/webhook/proxy-poll';     
const API_IMAGE_GEN = 'https://api.wallyai.top/webhook/proxy-image-gen'; 

let activeTasks = [];
let activeRetries = new Set(); 

function removeActiveTask(id) { const index = activeTasks.indexOf(id); if (index > -1) activeTasks.splice(index, 1); }
function toggleDrawer() { document.getElementById('tool-drawer').classList.toggle('open'); }

// ==============================
// 🔐 核心新增：自动踢回登录舱的安全自愈引擎
// ==============================
function handleAuthError() {
    sessionStorage.removeItem('veo_admin_pwd'); // 销毁错误的假钥匙
    showToast("密钥验证失败或已过期，即将退回登录舱", "error");
    setTimeout(() => location.reload(), 1500); // 强制刷新重载 3D 大门
}

// ==============================
// 💰 全局账单与费用统计 UI 控制
// ==============================
async function updateBillingUI() {
    const stats = await getBillingStats();
    const txtEl = document.getElementById('top-bill-text');
    if(txtEl) txtEl.innerText = `￥${stats.totalCost}`;
}

async function openBillingModal() {
    const stats = await getBillingStats();
    document.getElementById('bill-total').innerText = '￥' + stats.totalCost;
    document.getElementById('bill-video-count').innerText = stats.videoCount;
    document.getElementById('bill-image-count').innerText = stats.imageCount;
    
    const modal = document.getElementById('billing-modal');
    modal.style.display = 'flex';
    modal.offsetHeight; 
    modal.classList.add('show');
}

function closeBillingModal() {
    const modal = document.getElementById('billing-modal');
    modal.classList.remove('show');
    setTimeout(() => modal.style.display = 'none', 300);
}

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
// 🚀 核心优化：多选引擎 + 动态离合拖拽
// ==============================
const viewport = document.getElementById('canvas-viewport');
const board = document.getElementById('canvas-board');
const marquee = document.getElementById('selection-marquee'); 

let transform = { x: window.innerWidth / 2, y: 100, scale: 1 }; 
let isPanning = false, startPanX = 0, startPanY = 0, ticking = false; 
let draggingCardInfo = null, highestZIndex = 10; 
let scrollTimeout; 

let selectedTasks = new Set();
function clearSelection() {
    selectedTasks.clear();
    document.querySelectorAll('.video-card.selected').forEach(c => c.classList.remove('selected'));
}

let isSelecting = false, startSelX = 0, startSelY = 0;

window.addEventListener('mousemove', (e) => {
    if (!ticking) {
        requestAnimationFrame(() => {
            if (isPanning) {
                transform.x = e.clientX - startPanX; transform.y = e.clientY - startPanY; 
                board.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;
                document.body.style.backgroundPosition = `${transform.x}px ${transform.y}px`;
                document.body.style.backgroundSize = `${30 * transform.scale}px ${30 * transform.scale}px`;
            } 
            else if (isSelecting) {
                const currentX = e.clientX, currentY = e.clientY;
                const left = Math.min(startSelX, currentX), top = Math.min(startSelY, currentY);
                const width = Math.abs(currentX - startSelX), height = Math.abs(currentY - startSelY);

                if(marquee) {
                    marquee.style.left = left + 'px'; marquee.style.top = top + 'px';
                    marquee.style.width = width + 'px'; marquee.style.height = height + 'px';
                }

                const selRect = { left, top, right: left + width, bottom: top + height };
                document.querySelectorAll('.video-card').forEach(card => {
                    const rect = card.getBoundingClientRect();
                    if (rect.left < selRect.right && rect.right > selRect.left && rect.top < selRect.bottom && rect.bottom > selRect.top) {
                        card.classList.add('selected');
                        selectedTasks.add(card.id.replace('card-', ''));
                    } else {
                        card.classList.remove('selected');
                        selectedTasks.delete(card.id.replace('card-', ''));
                    }
                });
            } 
            else if (draggingCardInfo) {
                const dx = (e.clientX - draggingCardInfo.startMouseX) / transform.scale;
                const dy = (e.clientY - draggingCardInfo.startMouseY) / transform.scale;
                draggingCardInfo.task.x = draggingCardInfo.initialX + dx;
                draggingCardInfo.task.y = draggingCardInfo.initialY + dy;
                draggingCardInfo.el.style.transform = `translate(${draggingCardInfo.task.x}px, ${draggingCardInfo.task.y}px)`;
            }
            ticking = false;
        });
        ticking = true;
    }
});

viewport.addEventListener('mousedown', (e) => { 
    if (e.target === viewport || e.target === board) { 
        if (e.shiftKey) { 
            isSelecting = true;
            startSelX = e.clientX; startSelY = e.clientY;
            if(marquee) {
                marquee.style.left = startSelX + 'px'; marquee.style.top = startSelY + 'px';
                marquee.style.width = '0'; marquee.style.height = '0';
                marquee.style.display = 'block';
            }
        } else {
            clearSelection();
            isPanning = true; 
            board.classList.add('is-moving'); 
            startPanX = e.clientX - transform.x; 
            startPanY = e.clientY - transform.y; 
        }
    } 
});

window.addEventListener('mouseup', () => { 
    isPanning = false; 
    board.classList.remove('is-moving'); 
    
    if (isSelecting) {
        isSelecting = false;
        if(marquee) marquee.style.display = 'none';
    }

    if (draggingCardInfo) { 
        draggingCardInfo.el.style.willChange = 'auto'; 
        saveTaskDB(draggingCardInfo.task); 
        draggingCardInfo = null; 
    } 
});

viewport.addEventListener('wheel', (e) => {
    if (e.target.tagName === 'TEXTAREA' || e.target.closest('textarea')) return;
    e.preventDefault(); if (ticking) return; 
    board.classList.add('is-moving'); 
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => board.classList.remove('is-moving'), 150); 
    
    const delta = e.deltaY * 0.001; let newScale = Math.min(Math.max(0.2, transform.scale - delta), 3); 
    const mouseX = e.clientX - viewport.getBoundingClientRect().left, mouseY = e.clientY - viewport.getBoundingClientRect().top;
    transform.x = mouseX - (mouseX - transform.x) * (newScale / transform.scale); transform.y = mouseY - (mouseY - transform.y) * (newScale / transform.scale); transform.scale = newScale;
    
    if (!ticking) {
        requestAnimationFrame(() => {
            board.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;
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
            cardEl.style.willChange = 'transform'; 

            if (e.shiftKey || e.ctrlKey || e.metaKey) {
                if (selectedTasks.has(task.id)) {
                    selectedTasks.delete(task.id);
                    cardEl.classList.remove('selected');
                } else {
                    selectedTasks.add(task.id);
                    cardEl.classList.add('selected');
                }
            } else {
                if (!selectedTasks.has(task.id)) {
                    clearSelection();
                    selectedTasks.add(task.id);
                    cardEl.classList.add('selected');
                }
            }
            
            draggingCardInfo = { el: cardEl, task: task, startMouseX: e.clientX, startMouseY: e.clientY, initialX: task.x || 0, initialY: task.y || 0 };
            e.stopPropagation(); 
        };
    }
}

// ==============================
// ⌨️ 全局键盘监听 (一键删除 / Ctrl+A 全选)
// ==============================
window.addEventListener('keydown', async (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault(); 
        document.querySelectorAll('.video-card').forEach(card => {
            selectedTasks.add(card.id.replace('card-', ''));
            card.classList.add('selected');
        });
        showToast(`已全选 ${selectedTasks.size} 个节点`, "info");
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
        if (selectedTasks.size > 0) {
            if (confirm(`🗑️ 确定要彻底删除选中的 ${selectedTasks.size} 个组件吗？`)) {
                const deletePromises = Array.from(selectedTasks).map(async (id) => {
                    await deleteTaskDB(id);
                    const card = document.getElementById('card-' + id);
                    if (card) card.remove();
                });
                await Promise.all(deletePromises);
                
                showToast(`批量清理完成`, "success");
                selectedTasks.clear();
            }
        }
    }
});

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
            if (clone.state) {
                if(clone.state.images) clone.state.images = await Promise.all(clone.state.images.map(b => blobToBase64(b)));
                if(clone.state.resultBlob) clone.state.resultBlob = await blobToBase64(clone.state.resultBlob);
                if(clone.state.sourceBlob) clone.state.sourceBlob = await blobToBase64(clone.state.sourceBlob);
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
                    if (t.state) {
                        if(t.state.images) t.state.images = await Promise.all(t.state.images.map(async b => typeof b === 'string' ? await fetch(b).then(r => r.blob()) : b));
                        if(t.state.resultBlob && typeof t.state.resultBlob === 'string') t.state.resultBlob = await fetch(t.state.resultBlob).then(r => r.blob());
                        if(t.state.sourceBlob && typeof t.state.sourceBlob === 'string') t.state.sourceBlob = await fetch(t.state.sourceBlob).then(r => r.blob());
                    }
                    if (t.rawImages) {
                        if (typeof t.rawImages.firstFrame === 'string') t.rawImages.firstFrame = await fetch(t.rawImages.firstFrame).then(r => r.blob());
                        if (typeof t.rawImages.lastFrame === 'string') t.rawImages.lastFrame = await fetch(t.rawImages.lastFrame).then(r => r.blob());
                        if (t.rawImages.references) t.rawImages.references = await Promise.all(t.rawImages.references.map(async b => typeof b === 'string' ? await fetch(b).then(r => r.blob()) : b));
                    }
                    await saveTaskDB(t);
                }
                renderBoard();
                await updateBillingUI();
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
        if (pluginType === 'generator') {
            newTool = { id: 'tool_' + Date.now(), type: 'tool_generator', x: spawnX, y: spawnY, timestamp: Date.now(), state: { format: '', opening: '', attribute: '', general: '' } };
        } else if (pluginType === 'image_gen') {
            newTool = { id: 'tool_img_' + Date.now(), type: 'tool_image_gen', x: spawnX, y: spawnY, timestamp: Date.now(), status: 'idle', state: { size: '1024x1024', prompt: '', images: [], resultUrl: null, resultBlob: null, channel: 'channel_1', autoRetry: false }, retryCount: 0 };
        } else if (pluginType === 'cropper') {
            newTool = { id: 'tool_crop_' + Date.now(), type: 'tool_cropper', x: spawnX, y: spawnY, timestamp: Date.now(), state: { sourceBlob: null, resultBlob: null, cropParams: { left: 10, top: 10, width: 80, height: 80 } } };
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
                else if (meta.type === 'crop_result') srcToUse = t.state.resultBlob;
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
                if (globalStore.getState().references.length < 3) globalStore.getState().references.push(srcToUse);
                renderReferences(); document.getElementById('ref-popover').style.display = 'flex'; 
            } else {
                globalStore.getState()[stateKey] = srcToUse;
                const t = stateKey === 'firstFrame' ? 'first' : 'last';
                document.getElementById(`${t}-img`).src = getBlobUrl('temp_'+t, srcToUse); document.getElementById(`slot-${t}-box`).classList.add('has-img');
            }
        }
    });
}

function toggleRefPopover(e) { e.stopPropagation(); if (globalStore.getState().references.length === 0) document.getElementById('ref-file').click(); else { const p = document.getElementById('ref-popover'); p.style.display = p.style.display === 'flex' ? 'none' : 'flex'; } }

// ==============================
// 🎮 视图层 (View)：通过 EventBus 派发状态，不写硬逻辑
// ==============================
function switchMode(mode) { globalStore.dispatch('SET_MODE', mode); }
function updateModel(select) { globalStore.dispatch('SET_MODEL', { value: select.value, text: select.options[select.selectedIndex].text }); }
function updateRatio(select) { globalStore.dispatch('SET_RATIO', { value: select.value, text: select.options[select.selectedIndex].text }); }
function updateEnhance(select) { globalStore.dispatch('SET_ENHANCE', { value: select.value, text: select.options[select.selectedIndex].text }); }
function updateUpsample(select) { globalStore.getState().enableUpsample = select.value === 'true'; document.getElementById('upsample-text').innerText = select.options[select.selectedIndex].text; }
function updateAutoRetry(select) { globalStore.getState().autoRetry = select.value === 'true'; document.getElementById('retry-text').innerText = select.options[select.selectedIndex].text; }

// ==============================
// 🎧 订阅层 (Subscribers)：听到广播后自动更新 UI
// ==============================
sysBus.on('UI:SWITCH_MODE', (mode) => {
    document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active')); 
    document.querySelectorAll('.slot-group').forEach(s => s.classList.remove('active')); 
    document.getElementById(`tab-${mode}`).classList.add('active'); 
    document.getElementById(`slots-${mode}`).classList.add('active');
});
sysBus.on('UI:UPDATE_MODEL_TEXT', (text) => document.getElementById('model-text').innerText = text);
sysBus.on('UI:UPDATE_RATIO', (data) => {
    document.getElementById('ratio-text').innerText = data.text; 
    document.getElementById('ratio-icon').innerText = data.value === '16:9' ? 'crop_16_9' : 'crop_portrait';
});
sysBus.on('UI:UPDATE_ENHANCE_TEXT', (text) => document.getElementById('enhance-text').innerText = text);
sysBus.on('SYSTEM:MODEL_CHANGED', (modelValue) => {
    const frameTab = document.getElementById('tab-frame');
    if (modelValue.toLowerCase().includes('4k')) {
        showToast("Veo 3.1 4K 模型不支持首尾帧，请使用参考图模式。", "info");
        if (globalStore.getState().currentMode === 'frame') switchMode('ref'); 
        frameTab.style.opacity = '0.3'; frameTab.style.pointerEvents = 'none'; frameTab.setAttribute('data-tip', '4K 模型不支持首尾帧模式，请使用参考图 (1-3张)');
    } else {
        frameTab.style.opacity = '1'; frameTab.style.pointerEvents = 'auto'; frameTab.setAttribute('data-tip', '输入首帧或尾帧图片，精准控制视频起始与结束画面');
    }
});


async function handleMultiRefs(input) {
    if (!input.files || input.files.length === 0) return;
    if (globalStore.getState().references.length + input.files.length > 3) { input.value = ''; return alert(`最多仅支持 3 张图。`); }
    for (let file of Array.from(input.files)) globalStore.getState().references.push(await compressImageToBlob(file));
    input.value = ''; renderReferences();
    if(globalStore.getState().references.length > 0) document.getElementById('ref-popover').style.display = 'flex';
}
function removeReference(event, index) { event.stopPropagation(); globalStore.getState().references.splice(index, 1); renderReferences(); if(globalStore.getState().references.length === 0) document.getElementById('ref-popover').style.display = 'none'; }
function clearReferences(e) { e.stopPropagation(); globalStore.getState().references = []; renderReferences(); document.getElementById('ref-popover').style.display = 'none'; }
function renderReferences() {
    const box = document.getElementById('slot-ref-box'), imgEl = document.getElementById('ref-img'), countBadge = document.getElementById('ref-count-badge');
    const state = globalStore.getState();
    if (state.references.length === 0) { box.classList.remove('has-img'); imgEl.src = ''; countBadge.style.display = 'none'; } 
    else { box.classList.add('has-img'); imgEl.src = getBlobUrl('temp_ref_main', state.references[0]); countBadge.style.display = state.references.length > 1 ? 'flex' : 'none'; countBadge.innerText = state.references.length; }
    const listContainer = document.getElementById('ref-list-container');
    listContainer.innerHTML = state.references.map((b, index) => `<div class="popover-img-item"><img src="${getBlobUrl('temp_ref_'+index, b)}"><div class="popover-rm-btn" onclick="removeReference(event, ${index})">×</div></div>`).join('');
    document.getElementById('ref-popover-add').style.display = state.references.length >= 3 ? 'none' : 'flex';
}

async function handleSingleFrame(input, type) {
    if (!input.files[0]) return;
    globalStore.getState()[type] = await compressImageToBlob(input.files[0]);
    const t = type === 'firstFrame' ? 'first' : 'last';
    document.getElementById(`${t}-img`).src = getBlobUrl(`temp_${t}`, globalStore.getState()[type]); document.getElementById(`slot-${t}-box`).classList.add('has-img'); input.value = '';
}
function clearFrame(event, type) {
    if(event) { event.preventDefault(); event.stopPropagation(); }
    globalStore.getState()[type] = null;
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
    
    let submitRef = [...globalStore.getState().references], submitFirst = globalStore.getState().firstFrame, submitLast = globalStore.getState().lastFrame;
    if (globalStore.getState().currentMode === 'ref') { submitFirst = null; submitLast = null; } else submitRef = [];

    const taskParams = { model: globalStore.getState().model, aspectRatio: globalStore.getState().aspectRatio, enhancePrompt: globalStore.getState().enhancePrompt, enableUpsample: globalStore.getState().enableUpsample, autoRetry: globalStore.getState().autoRetry, firstFrame: submitFirst, lastFrame: submitLast, references: submitRef };
    let promises = []; for(let i=0; i<batchCount; i++) promises.push(executeSubmission(taskParams, prompt, i));
    
    await Promise.allSettled(promises);
    btn.disabled = false; btn.innerHTML = `<span class="material-symbols-outlined">arrow_upward</span>`; document.getElementById('prompt-input').value = ''; 
}

async function executeSubmission(params, promptText, offsetIndex = 0) {
    try {
        const apiPayload = { model: params.model, prompt: promptText, aspectRatio: params.aspectRatio, enhancePrompt: params.enhancePrompt, enableUpsample: params.enableUpsample, firstFrame: await blobToBase64(params.firstFrame), lastFrame: await blobToBase64(params.lastFrame), references: await Promise.all(params.references.map(b => blobToBase64(b))) };
        // 🌟 核心更新：使用 wally123 作为 Header
        const response = await fetch(API_SUBMIT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'wally123': sessionStorage.getItem('veo_admin_pwd') }, body: JSON.stringify(apiPayload) });
        
        // 🌟 拦截密码错误并启动自愈程序
        if (response.status === 401 || response.status === 403) { handleAuthError(); throw new Error("密码错误"); }
        
        const data = await response.json();

        if (data.taskId) {
            const spawnX = (-transform.x + window.innerWidth/2 - 170) / transform.scale + (offsetIndex * 360), spawnY = (-transform.y + window.innerHeight/2 - 150) / transform.scale + (offsetIndex * 40);
            
            let displayModelName = params.references && params.references.length > 0 ? 'Veo 3 Cmp' : 'Veo 3 Fast';
            if (params.model === 'veo_3_1-fast-components-4k') displayModelName = 'Veo 3 4K';

            const newTask = { 
                id: data.taskId, prompt: promptText, modelStr: displayModelName, modelVal: params.model, ratio: params.aspectRatio, autoRetry: params.autoRetry, retryCount: 0, 
                rawImages: { firstFrame: params.firstFrame, lastFrame: params.lastFrame, references: params.references || [] }, mode: params.references && params.references.length > 0 ? 'ref' : 'frame', 
                status: 'processing', progress: null, timestamp: Date.now(), time: new Date().toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'}), videoUrl: null, x: spawnX, y: spawnY,
                isBilled: false 
            };
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
        // 🌟 核心更新：使用 wally123 作为 Header
        const response = await fetch(API_SUBMIT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'wally123': sessionStorage.getItem('veo_admin_pwd') }, body: JSON.stringify(apiPayload) });
        
        // 🌟 拦截密码错误并启动自愈程序
        if (response.status === 401 || response.status === 403) { handleAuthError(); throw new Error("密码错误"); }
        
        const data = await response.json();

        if (data.taskId) { 
            await deleteTaskDB(taskId); removeActiveTask(taskId); 
            task.id = data.taskId; task.status = 'processing'; task.progress = null; 
            task.retryCount = (task.retryCount || 0) + 1; task.timestamp = Date.now(); 
            task.time = new Date().toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'}); 
            task.isBilled = false; 
            await saveTaskDB(task); activeRetries.delete(taskId); await renderBoard(); 
        } else throw new Error("无返回 ID");
    } catch (error) { task.status = 'failed'; task.autoRetry = false; await saveTaskDB(task); activeRetries.delete(taskId); renderBoard(); }
}

function startTaskPolling(taskId) {
    let attempts = 0;
    const poll = async () => {
        attempts++;
        try {
            const task = await getTaskDB(taskId);
            if (!task) { removeActiveTask(taskId); return; }

            // 🌟 核心更新：使用 wally123 作为 Header
            const response = await fetch(API_POLL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'wally123': sessionStorage.getItem('veo_admin_pwd') }, body: JSON.stringify({ taskId: taskId, model: task.modelVal }) });
            
            // 🌟 拦截密码错误并启动自愈程序
            if (response.status === 401 || response.status === 403) { removeActiveTask(taskId); handleAuthError(); return; }
            
            const data = await response.json();

            if (data.status === 'success' && data.videoUrl) { 
                removeActiveTask(taskId); task.status = 'success'; task.videoUrl = data.videoUrl; 
                
                if (!task.isBilled) {
                    let cost = 0.13; 
                    let detailDesc = "Veo 3.1 Fast (参考图)";
                    if (task.modelVal.toLowerCase().includes('4k')) {
                        cost = 0.43;
                        detailDesc = "Veo 3.1 Fast 4K";
                    } else if (task.mode === 'frame') {
                        cost = 0.35;
                        detailDesc = "Veo 3.1 Fast (首尾帧)";
                    }
                    await addBillingRecord({ id: 'bill_' + task.id, taskId: task.id, type: 'video', cost: cost, detail: detailDesc });
                    task.isBilled = true;
                    updateBillingUI();
                }

                await saveTaskDB(task); renderBoard(); return; 
            }
            if (data.status === 'failed') { removeActiveTask(taskId); if (task.autoRetry) { retryTask(task.id, null); } else { task.status = 'failed'; await saveTaskDB(task); renderBoard(); } return; }
            
            if (data.status === 'processing' || data.status === 'pending') {
                if (data.progress && task.progress !== data.progress) {
                    task.progress = data.progress; 
                    await saveTaskDB(task);
                    renderBoard(); 
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
        globalStore.getState().firstFrame = task.rawImages.firstFrame || null; 
        globalStore.getState().lastFrame = task.rawImages.lastFrame || null; 
        globalStore.getState().references = [...(task.rawImages.references || [])]; 
        switchMode(task.mode || 'ref');
        
        if (globalStore.getState().firstFrame) { document.getElementById('first-img').src = getBlobUrl('temp_first', globalStore.getState().firstFrame); document.getElementById('slot-first-box').classList.add('has-img'); } else clearFrame(null, 'firstFrame');
        if (globalStore.getState().lastFrame) { document.getElementById('last-img').src = getBlobUrl('temp_last', globalStore.getState().lastFrame); document.getElementById('slot-last-box').classList.add('has-img'); } else clearFrame(null, 'lastFrame');
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

// ==============================
// 🌟 AI 生图工具底层增强
// ==============================
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

async function submitImgGen(id) {
    const task = await getTaskDB(id);
    if(!task) return;
    if(!task.state.prompt) return alert("请填写生图提示词！");

    task.status = 'processing';
    task.retryCount = 0; 
    task.isBilled = false; 
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
            // 🌟 核心更新：使用 wally123 作为 Header
            const response = await fetch(API_IMAGE_GEN, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json', 'wally123': sessionStorage.getItem('veo_admin_pwd') }, 
                body: JSON.stringify(apiPayload) 
            });

            if (response.status === 401 || response.status === 403) { handleAuthError(); throw new Error("密码错误"); }
            if (!response.ok) throw new Error("生图接口报错: " + response.status);
            
            const data = await response.json();

            if (data.data && data.data[0] && data.data[0].url) {
                task.state.resultUrl = data.data[0].url;
                task.state.resultBlob = await fetch(data.data[0].url).then(r => r.blob());
                task.status = 'success';
                success = true;

                if (!task.isBilled) {
                    const isChannel2 = task.state.channel === 'channel_2';
                    const cost = isChannel2 ? 0.060 : 0.084;
                    const cName = isChannel2 ? '备用节点' : '主节点';
                    await addBillingRecord({ id: 'bill_img_' + task.id + '_' + Date.now(), taskId: task.id, type: 'image', cost: cost, detail: `AI生图 (${cName})` });
                    task.isBilled = true;
                    updateBillingUI();
                }

                if (typeof blobUrlCache !== 'undefined' && blobUrlCache.has(task.id + '_res')) {
                    URL.revokeObjectURL(blobUrlCache.get(task.id + '_res'));
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
                
                const checkExists = await getTaskDB(task.id);
                if (!checkExists) return;
            }
        }
    }
    await saveTaskDB(task); renderBoard();
}

// ==============================
// ✂️ 全新核心插件：局部图片裁切器
// ==============================
async function handleCropperUpload(input, id) {
    if (!input.files[0]) return;
    const task = await getTaskDB(id);
    task.state.sourceBlob = await compressImageToBlob(input.files[0], 2048); 
    task.state.resultBlob = null;
    await saveTaskDB(task); renderBoard();
}

async function handleCropperDrop(e, id) {
    e.preventDefault(); e.stopPropagation();
    const srcToUse = await parseDroppedImage(e);
    if (srcToUse) {
        const task = await getTaskDB(id);
        task.state.sourceBlob = srcToUse;
        task.state.resultBlob = null;
        await saveTaskDB(task); renderBoard();
    }
}

async function resetCropper(id) {
    const task = await getTaskDB(id);
    task.state.sourceBlob = null; task.state.resultBlob = null;
    await saveTaskDB(task); renderBoard();
}

async function reEditCropper(id) {
    const task = await getTaskDB(id);
    task.state.resultBlob = null;
    await saveTaskDB(task); renderBoard();
}

async function generateCrop(id) {
    const task = await getTaskDB(id);
    const imgEl = document.getElementById(`crop-img-${id}`);
    if (!imgEl || !task) return;

    const p = task.state.cropParams; 
    const img = new Image();
    img.src = imgEl.src;
    img.onload = async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const sx = (p.left / 100) * img.naturalWidth;
        const sy = (p.top / 100) * img.naturalHeight;
        const sWidth = (p.width / 100) * img.naturalWidth;
        const sHeight = (p.height / 100) * img.naturalHeight;

        canvas.width = sWidth;
        canvas.height = sHeight;
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);

        canvas.toBlob(async (blob) => {
            task.state.resultBlob = blob;
            await saveTaskDB(task); renderBoard();
        }, 'image/png'); 
    };
}

let activeCrop = null;
window.addEventListener('pointerdown', (e) => {
    const handle = e.target.closest('.crop-handle');
    const box = e.target.closest('.crop-box');

    if (handle || box) {
        e.stopPropagation(); 
        isPanning = false;   
        board.classList.remove('is-moving');

        const targetBox = box || handle.closest('.crop-box');
        const taskId = targetBox.dataset.taskId;
        const workspace = document.getElementById(`crop-workspace-${taskId}`);
        const rect = workspace.getBoundingClientRect(); 

        activeCrop = {
            taskId,
            type: handle ? 'resize' : 'move',
            dir: handle ? handle.dataset.dir : null,
            startX: e.clientX,
            startY: e.clientY,
            rectW: rect.width,  
            rectH: rect.height, 
            startLeft: parseFloat(targetBox.style.left),
            startTop: parseFloat(targetBox.style.top),
            startWidth: parseFloat(targetBox.style.width),
            startHeight: parseFloat(targetBox.style.height),
            boxEl: targetBox
        };
    }
});

window.addEventListener('pointermove', (e) => {
    if (activeCrop) {
        e.stopPropagation();
        
        const dx = e.clientX - activeCrop.startX;
        const dy = e.clientY - activeCrop.startY;

        const dpX = (dx / activeCrop.rectW) * 100;
        const dpY = (dy / activeCrop.rectH) * 100;

        let { startLeft, startTop, startWidth, startHeight, type, dir } = activeCrop;
        let newLeft = startLeft, newTop = startTop, newWidth = startWidth, newHeight = startHeight;

        if (type === 'move') {
            newLeft = Math.max(0, Math.min(startLeft + dpX, 100 - startWidth));
            newTop = Math.max(0, Math.min(startTop + dpY, 100 - startHeight));
        } else if (type === 'resize') {
            if (dir.includes('e')) newWidth = Math.max(5, Math.min(startWidth + dpX, 100 - startLeft));
            if (dir.includes('s')) newHeight = Math.max(5, Math.min(startHeight + dpY, 100 - startTop));
            if (dir.includes('w')) {
                const maxW = startLeft + startWidth;
                newLeft = Math.max(0, Math.min(startLeft + dpX, maxW - 5));
                newWidth = maxW - newLeft;
            }
            if (dir.includes('n')) {
                const maxH = startTop + startHeight;
                newTop = Math.max(0, Math.min(startTop + dpY, maxH - 5));
                newHeight = maxH - newTop;
            }
        }

        activeCrop.boxEl.style.left = newLeft + '%';
        activeCrop.boxEl.style.top = newTop + '%';
        activeCrop.boxEl.style.width = newWidth + '%';
        activeCrop.boxEl.style.height = newHeight + '%';
        
        activeCrop.currentLeft = newLeft;
        activeCrop.currentTop = newTop;
        activeCrop.currentWidth = newWidth;
        activeCrop.currentHeight = newHeight;
    }
});

window.addEventListener('pointerup', async () => {
    if (activeCrop) {
        if (activeCrop.currentLeft !== undefined) {
            const task = await getTaskDB(activeCrop.taskId);
            if (task) {
                task.state.cropParams = {
                    left: activeCrop.currentLeft,
                    top: activeCrop.currentTop,
                    width: activeCrop.currentWidth,
                    height: activeCrop.currentHeight
                };
                await saveTaskDB(task);
            }
        }
        activeCrop = null;
    }
});


// ==============================
// 🚀 智能 DOM 对比引擎 
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

    if (task.type === 'tool_cropper') {
        const hasSource = !!task.state.sourceBlob;
        const hasResult = !!task.state.resultBlob;

        let contentHtml = '';
        if (!hasSource) {
            contentHtml = `<div class="img-slot" id="crop-zone-${task.id}" style="width:100%; height:200px; border-radius:8px;" data-tip="点击上传或从画布拖入素材图片" onclick="document.getElementById('crop-file-${task.id}').click()"><span class="material-symbols-outlined" style="font-size:32px; color:var(--text-sub);">add_photo_alternate</span><span style="margin-top:8px;">导入素材图片</span><input type="file" id="crop-file-${task.id}" style="display:none;" accept="image/*" onchange="handleCropperUpload(this, '${task.id}')"></div>`;
        } else if (!hasResult) {
            const p = task.state.cropParams;
            contentHtml = `
            <div class="cropper-workspace" id="crop-workspace-${task.id}">
                <img id="crop-img-${task.id}" src="${getBlobUrl(task.id+'_src', task.state.sourceBlob)}">
                <div class="crop-box" id="crop-box-${task.id}" data-task-id="${task.id}" style="left:${p.left}%; top:${p.top}%; width:${p.width}%; height:${p.height}%;">
                    <div class="crop-grid"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
                    <div class="crop-handle ch-nw" data-dir="nw"></div>
                    <div class="crop-handle ch-ne" data-dir="ne"></div>
                    <div class="crop-handle ch-sw" data-dir="sw"></div>
                    <div class="crop-handle ch-se" data-dir="se"></div>
                </div>
            </div>
            <div style="display:flex; gap:8px;">
                <button class="img-gen-btn" style="flex:1; background:var(--surface-hover); color:var(--text-main); margin:0;" onclick="resetCropper('${task.id}')">重置图片</button>
                <button class="img-gen-btn" style="flex:2; background:var(--success); margin:0;" onclick="generateCrop('${task.id}')"><span class="material-symbols-outlined" style="font-size:16px;">crop</span> 确认裁切提取</button>
            </div>
            `;
        } else {
            contentHtml = `
            <div class="img-gen-result" style="border:none; border-radius:8px; background:transparent; min-height: unset;">
                <img src="${getBlobUrl(task.id+'_res', task.state.resultBlob)}" draggable="true" ondragstart="event.dataTransfer.setData('application/json', JSON.stringify({taskId: '${task.id}', type: 'crop_result'}))" data-tip="按住拖拽，送至其他卡片组件复用" style="border-radius: 8px; border: 1px solid rgba(255,255,255,0.2);">
            </div>
            <button class="img-gen-btn" style="width:100%; margin: 0; background:var(--surface-hover); color:var(--text-main);" onclick="reEditCropper('${task.id}')"><span class="material-symbols-outlined" style="font-size:16px;">history</span> 返回重新调整框选区</button>
            `;
        }

        return `
        <div class="card-header"><span style="color:var(--success); display:flex; align-items:center; gap:4px;"><span class="material-symbols-outlined" style="font-size:14px;">crop</span> 局部裁切器</span><button onclick="removeTask('${task.id}')" style="background:transparent; border:none; color:var(--text-sub); cursor:pointer;"><span class="material-symbols-outlined" style="font-size:16px;">close</span></button></div>
        <div style="padding: 0 12px 12px 12px; display:flex; flex-direction:column; gap:12px;" ondragover="event.preventDefault();" ondrop="handleCropperDrop(event, '${task.id}')">
            ${contentHtml}
        </div>
        `;
    }

    let statusBadge = '', mediaHtml = ''; const thumbImg = task.rawImages && (task.rawImages.firstFrame || (task.rawImages.references && task.rawImages.references[0])); const thumbUrl = getBlobUrl(task.id + '_thumb', thumbImg);
    
    if (task.status === 'processing') { 
        const retryTxt = task.retryCount ? ` (重试 ${task.retryCount})` : ''; 
        statusBadge = `<span class="status-badge processing">生成中...${retryTxt}</span>`; 
        
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

        const cropSrc = task.state && task.state.sourceBlob ? 'hasSrc' : 'noSrc';
        const cropRes = task.state && task.state.resultBlob ? 'hasRes' : 'noRes';

        if (!cardEl) {
            cardEl = document.createElement('div'); cardEl.id = 'card-' + task.id;
            if (task.type === 'note') { cardEl.className = 'video-card sticky-note'; cardEl.style.width = `${task.width || 260}px`; cardEl.style.height = `${task.height || 180}px`; }
            else if (task.type === 'local_image') cardEl.className = 'video-card local-image-card';
            else if (task.type === 'tool_generator') cardEl.className = 'video-card tool-generator';
            else if (task.type === 'tool_image_gen') cardEl.className = 'video-card tool-image-gen'; 
            else if (task.type === 'tool_cropper') cardEl.className = 'video-card tool-cropper'; 
            else cardEl.className = 'video-card';
            
            cardEl.style.transform = `translate(${task.x}px, ${task.y}px)`;
            cardEl.innerHTML = generateCardHTML(task); 
            board.appendChild(cardEl); 
            bindCardDrag(cardEl, task);
            
            if (task.type === 'note') cardEl.addEventListener('mouseup', () => saveNoteSize(task.id, cardEl.offsetWidth, cardEl.offsetHeight));
            if (task.status === 'processing' && !activeTasks.includes(task.id)) { activeTasks.push(task.id); startTaskPolling(task.id); }
        } else {
            cardEl.style.transform = `translate(${task.x}px, ${task.y}px)`;
            if (task.type === 'note' && task.width && task.height) { cardEl.style.width = `${task.width}px`; cardEl.style.height = `${task.height}px`; }
            
            const oldStatus = cardEl.getAttribute('data-sync-status');
            const oldRetry = cardEl.getAttribute('data-sync-retry');
            const oldImgLen = cardEl.getAttribute('data-sync-img-len');
            const oldProgress = cardEl.getAttribute('data-sync-progress');
            const oldCropSrc = cardEl.getAttribute('data-sync-crop-src');
            const oldCropRes = cardEl.getAttribute('data-sync-crop-res');

            if (oldStatus !== task.status || oldRetry != task.retryCount || oldImgLen != currentImgLen || oldProgress !== currentProgress || oldCropSrc !== cropSrc || oldCropRes !== cropRes) { 
                cardEl.innerHTML = generateCardHTML(task); 
                bindCardDrag(cardEl, task); 
            }
        }
        
        cardEl.setAttribute('data-sync-status', task.status || 'static'); 
        cardEl.setAttribute('data-sync-retry', task.retryCount || 0);
        cardEl.setAttribute('data-sync-img-len', currentImgLen); 
        cardEl.setAttribute('data-sync-progress', currentProgress); 
        cardEl.setAttribute('data-sync-crop-src', cropSrc);
        cardEl.setAttribute('data-sync-crop-res', cropRes);
    });
}

async function removeTask(id) { if(confirm('确定删除这张卡片吗？')) { await deleteTaskDB(id); const card = document.getElementById('card-' + id); if (card) card.remove(); } }
function downloadVideo(url) { const a = document.createElement('a'); a.href = url; a.target = "_blank"; a.download = `Studio_${Date.now()}.mp4`; a.click(); }

document.addEventListener('DOMContentLoaded', async () => {
    await initDB(); 
    board.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`; 
    document.body.style.backgroundPosition = `${transform.x}px ${transform.y}px`; 
    await renderBoard(); 
    bindMainConsoleDrop('slot-ref-box', 'references'); 
    bindMainConsoleDrop('slot-first-box', 'firstFrame'); 
    bindMainConsoleDrop('slot-last-box', 'lastFrame');
    await updateBillingUI(); 
});
