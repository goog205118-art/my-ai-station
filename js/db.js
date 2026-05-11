// ==========================================
// 🗄️ IndexedDB 数据库封装 & Blob 内存优化核心
// ==========================================
const DB_NAME = 'VeoInfinityDB';
let db;
const blobUrlCache = new Map(); // 🌟 URL 缓存锁：现在存储 { url, blob } 实现精准对比

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
    
    if (blobUrlCache.has(id)) {
        const cached = blobUrlCache.get(id);
        // 🌟 终极修复：严格比对内存对象。如果位置相同但图片换了，直接销毁旧缓存！
        if (cached.blob === blobData) return cached.url; 
        URL.revokeObjectURL(cached.url);
    }
    
    const url = URL.createObjectURL(blobData);
    blobUrlCache.set(id, { url: url, blob: blobData });
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
            // 🌟 连根拔起：适配最新的 cacheObj 数据结构
            for (let [key, cacheObj] of blobUrlCache.entries()) {
                if (key.toString().startsWith(id)) {
                    URL.revokeObjectURL(cacheObj.url || cacheObj); 
                    blobUrlCache.delete(key);
                }
            }
            resolve();
        };
    });
}
