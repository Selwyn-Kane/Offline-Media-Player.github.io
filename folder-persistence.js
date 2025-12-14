/* ============================================
   Folder Persistence System
   Uses IndexedDB to store folder handles across sessions
   ============================================ */

class FolderPersistence {
    constructor() {
        this.DB_NAME = 'MusicPlayerDB';
        this.DB_VERSION = 1;
        this.STORE_NAME = 'folderHandles';
    }

    /**
     * Open IndexedDB connection
     * @returns {Promise<IDBDatabase>} Database instance
     */
    async openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    db.createObjectStore(this.STORE_NAME);
                }
            };
        });
    }

    /**
     * Save folder handle to IndexedDB
     * @param {FileSystemDirectoryHandle} handle - Folder handle to save
     * @returns {Promise<boolean>} Success status
     */
    async saveFolderHandle(handle) {
        try {
            const db = await this.openDB();
            const transaction = db.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);
            
            await store.put(handle, 'musicFolder');
            
            localStorage.setItem('hasSavedFolder', 'true');
            console.log('✅ Folder handle saved to IndexedDB');
            return true;
        } catch (err) {
            console.error(`Storage error: ${err.message}`);
            return false;
        }
    }

    /**
     * Load folder handle from IndexedDB
     * @returns {Promise<FileSystemDirectoryHandle|null>} Folder handle or null
     */
    async loadFolderHandle() {
        try {
            const db = await this.openDB();
            const transaction = db.transaction([this.STORE_NAME], 'readonly');
            const store = transaction.objectStore(this.STORE_NAME);
            
            return new Promise((resolve, reject) => {
                const request = store.get('musicFolder');
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (err) {
            console.error(`Failed to load folder handle: ${err.message}`);
            return null;
        }
    }

    /**
     * Delete saved folder handle
     * @returns {Promise<boolean>} Success status
     */
    async deleteFolderHandle() {
        try {
            const db = await this.openDB();
            const transaction = db.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);
            
            await store.delete('musicFolder');
            localStorage.removeItem('hasSavedFolder');
            
            console.log('🗑️ Folder handle deleted from IndexedDB');
            return true;
        } catch (err) {
            console.error(`Error clearing folder: ${err.message}`);
            return false;
        }
    }

    /**
     * Verify folder permission (read access)
     * @param {FileSystemDirectoryHandle} handle - Folder handle to verify
     * @returns {Promise<boolean>} True if permission granted
     */
    async verifyFolderPermission(handle) {
        const options = { mode: 'read' };
        
        // Check if we already have permission
        if ((await handle.queryPermission(options)) === 'granted') {
            return true;
        }
        
        // Request permission
        if ((await handle.requestPermission(options)) === 'granted') {
            return true;
        }
        
        return false;
    }

    /**
     * Check if a saved folder exists
     * @returns {boolean} True if folder is saved
     */
    hasSavedFolder() {
        return localStorage.getItem('hasSavedFolder') === 'true';
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FolderPersistence;
}