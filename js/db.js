// ==========================================
// 🗄️ IndexedDB 数据库封装 & Blob 内存优化核心
// ==========================================
const DB_NAME = 'VeoInfinityDB';
let db;
const blobUrlCache = new Map(); // 🌟 URL 缓存锁，彻底杜绝内存泄漏

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 2); 
        request.onupgradeneeded = (e) => {
            let database = e.target.result;
            if (!database.objectStoreNames.contains('tasks')) {
                database.createObjectStore('tasks', { keyPath: 'id' });
            }
        };
        request.onsuccess = (e) => { db = e.target.result; resolve(db); };
        request.onerror = (e) => reject(e);
    });
}

function getBlobUrl(id, blobData) {
    if (!blobData) return '';
    if (typeof blobData === 'string') return blobData; 
    
    if (blobUrlCache.has(id)) return blobUrlCache.get(id);
    
    const url = URL.createObjectURL(blobData);
    blobUrlCache.set(id, url);
    return url;
}

async function compressImageToBlob(file, maxWidth = 1024) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ratio = Math.min(maxWidth / img.width, 1);
                canvas.width = img.width * ratio;
                canvas.height = img.height * ratio;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
            };
        };
    });
}

function blobToBase64(blob) {
    if (!blob) return null;
    if (typeof blob === 'string') return Promise.resolve(blob);
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}

async function getAllTasksDB() {
    return new Promise((resolve) => {
        const tx = db.transaction('tasks', 'readonly');
        const request = tx.objectStore('tasks').getAll();
        request.onsuccess = () => resolve(request.result.sort((a,b) => b.timestamp - a.timestamp));
    });
}

async function saveTaskDB(task) {
    return new Promise((resolve) => {
        const tx = db.transaction('tasks', 'readwrite');
        tx.objectStore('tasks').put(task);
        tx.oncomplete = () => resolve();
    });
}

async function getTaskDB(id) {
    return new Promise((resolve) => {
        const tx = db.transaction('tasks', 'readonly');
        const request = tx.objectStore('tasks').get(id);
        request.onsuccess = () => resolve(request.result);
    });
}

async function deleteTaskDB(id) {
    return new Promise((resolve) => {
        const tx = db.transaction('tasks', 'readwrite');
        tx.objectStore('tasks').delete(id);
        tx.oncomplete = () => {
            // 🌟 核心修复：连根拔起！清理该任务名下关联的所有 Blob URL (包括缩略图和原图)
            for (let [key, url] of blobUrlCache.entries()) {
                if (key.toString().startsWith(id)) {
                    URL.revokeObjectURL(url);
                    blobUrlCache.delete(key);
                }
            }
            resolve();
        };
    });
}
