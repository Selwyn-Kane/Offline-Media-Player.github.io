/* ============================================
   Enhanced Folder Persistence System
   Uses IndexedDB + Storage API for robust folder memory
   ============================================ */

class FolderPersistence {
    constructor() {
        this.DB_NAME = 'MusicPlayerDB';
        this.DB_VERSION = 2;
        this.STORE_NAME = 'folderHandles';
        this.META_STORE_NAME = 'folderMetadata';
        this.HISTORY_STORE_NAME = 'folderHistory';
        this.MAX_HISTORY = 10;
        this.db = null;
        this.initPromise = null;
        
        // Start initialization
        this.initPromise = this.init();
    }

    /**
     * Initialize the system - request persistent storage
     */
    async init() {
        try {
            // Request persistent storage to prevent eviction
            if (navigator.storage && navigator.storage.persist) {
                const isPersisted = await navigator.storage.persist();
                if (isPersisted) {
                    console.log('✅ Storage will persist across sessions');
                } else {
                    console.warn('⚠️ Storage may be cleared by browser');
                }
            }
            
            // Check storage quota
            await this.checkStorageQuota();
            
            // Open database immediately
            await this.openDB();
            
            return true;
        } catch (err) {
            console.error('❌ Init error:', err);
            return false;
        }
    }

    /**
     * Ensure initialization is complete
     */
    async ensureReady() {
        if (this.initPromise) {
            await this.initPromise;
        }
        if (!this.db) {
            await this.openDB();
        }
    }

    /**
     * Check and log storage quota information
     */
    async checkStorageQuota() {
        if (navigator.storage && navigator.storage.estimate) {
            try {
                const estimate = await navigator.storage.estimate();
                const percentUsed = (estimate.usage / estimate.quota * 100).toFixed(2);
                console.log(`💾 Storage: ${this.formatBytes(estimate.usage)} / ${this.formatBytes(estimate.quota)} (${percentUsed}%)`);
                return estimate;
            } catch (err) {
                console.warn('⚠️ Could not check storage quota:', err);
                return null;
            }
        }
        return null;
    }

    /**
     * Format bytes for human-readable display
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Open IndexedDB with enhanced schema
     */
    async openDB() {
        if (this.db) return this.db;
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            
            request.onerror = () => {
                console.error('❌ IndexedDB error:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                
                // Handle unexpected close
                this.db.onversionchange = () => {
                    this.db.close();
                    this.db = null;
                    console.warn('⚠️ Database version changed, connection closed');
                };
                
                console.log('✅ IndexedDB opened successfully');
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Main folder handle store
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    db.createObjectStore(this.STORE_NAME);
                }
                
                // Folder metadata store
                if (!db.objectStoreNames.contains(this.META_STORE_NAME)) {
                    const metaStore = db.createObjectStore(this.META_STORE_NAME, { keyPath: 'id' });
                    metaStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
                    metaStore.createIndex('folderName', 'folderName', { unique: false });
                }
                
                // Folder history store
                if (!db.objectStoreNames.contains(this.HISTORY_STORE_NAME)) {
                    const historyStore = db.createObjectStore(this.HISTORY_STORE_NAME, { 
                        keyPath: 'timestamp', 
                        autoIncrement: false 
                    });
                    historyStore.createIndex('folderName', 'folderName', { unique: false });
                }
                
                console.log('✅ Database schema upgraded');
            };
            
            request.onblocked = () => {
                console.warn('⚠️ Database upgrade blocked. Close other tabs.');
            };
        });
    }

    /**
     * Helper to promisify IndexedDB requests
     */
    promisifyRequest(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Helper to complete a transaction
     */
    promisifyTransaction(transaction) {
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(new Error('Transaction aborted'));
        });
    }

    /**
     * Save folder handle with rich metadata
     */
    async saveFolderHandle(handle, options = {}) {
        try {
            await this.ensureReady();
            const db = this.db;
            
            // Create single transaction for both stores
            const tx = db.transaction([this.STORE_NAME, this.META_STORE_NAME], 'readwrite');
            const handleStore = tx.objectStore(this.STORE_NAME);
            const metaStore = tx.objectStore(this.META_STORE_NAME);
            
            // Save the handle
            await this.promisifyRequest(handleStore.put(handle, 'musicFolder'));
            
            // Save metadata
            const metadata = {
                id: 'musicFolder',
                folderName: handle.name,
                lastAccessed: Date.now(),
                trackCount: options.trackCount || 0,
                hasLyrics: options.hasLyrics || false,
                hasAnalysis: options.hasAnalysis || false,
                totalSize: options.totalSize || 0,
                savedAt: options.savedAt || Date.now()
            };
            
            await this.promisifyRequest(metaStore.put(metadata));
            
            // Wait for transaction to complete
            await this.promisifyTransaction(tx);
            
            // Add to history (separate transaction)
            await this.addToHistory(handle, metadata);
            
            // Set localStorage flags for quick checks
            localStorage.setItem('hasSavedFolder', 'true');
            localStorage.setItem('savedFolderName', handle.name);
            localStorage.setItem('savedFolderTime', Date.now().toString());
            
            console.log(`✅ Folder "${handle.name}" saved successfully`);
            return { success: true, metadata };
            
        } catch (err) {
            console.error(`❌ Save error:`, err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Add folder to history
     */
    async addToHistory(handle, metadata) {
        try {
            await this.ensureReady();
            const db = this.db;
            
            const tx = db.transaction([this.HISTORY_STORE_NAME], 'readwrite');
            const store = tx.objectStore(this.HISTORY_STORE_NAME);
            
            const historyEntry = {
                timestamp: Date.now(),
                folderName: handle.name,
                trackCount: metadata.trackCount || 0,
                hasLyrics: metadata.hasLyrics || false,
                hasAnalysis: metadata.hasAnalysis || false
            };
            
            await this.promisifyRequest(store.put(historyEntry));
            await this.promisifyTransaction(tx);
            
            // Clean up old history entries
            await this.pruneHistory();
            
            return true;
        } catch (err) {
            console.error(`⚠️ History error:`, err);
            return false;
        }
    }

    /**
     * Keep only the most recent folders in history
     */
    async pruneHistory() {
        try {
            await this.ensureReady();
            const db = this.db;
            
            const tx = db.transaction([this.HISTORY_STORE_NAME], 'readwrite');
            const store = tx.objectStore(this.HISTORY_STORE_NAME);
            
            const allKeys = await this.promisifyRequest(store.getAllKeys());
            
            if (allKeys.length > this.MAX_HISTORY) {
                // Sort by timestamp (oldest first)
                allKeys.sort((a, b) => a - b);
                
                // Delete oldest entries
                const toDelete = allKeys.slice(0, allKeys.length - this.MAX_HISTORY);
                for (const key of toDelete) {
                    await this.promisifyRequest(store.delete(key));
                }
                
                await this.promisifyTransaction(tx);
                console.log(`🗑️ Pruned ${toDelete.length} old history entries`);
            }
            
            return true;
        } catch (err) {
            console.error(`⚠️ Prune error:`, err);
            return false;
        }
    }

    /**
     * Load folder handle with validation
     */
    async loadFolderHandle() {
        try {
            await this.ensureReady();
            const db = this.db;
            
            // Single transaction to load both handle and metadata
            const tx = db.transaction([this.STORE_NAME, this.META_STORE_NAME], 'readonly');
            const handleStore = tx.objectStore(this.STORE_NAME);
            const metaStore = tx.objectStore(this.META_STORE_NAME);
            
            const handle = await this.promisifyRequest(handleStore.get('musicFolder'));
            
            if (!handle) {
                console.log('ℹ️ No saved folder found');
                return null;
            }
            
            const metadata = await this.promisifyRequest(metaStore.get('musicFolder'));
            await this.promisifyTransaction(tx);
            
            // Update last accessed time in separate transaction
            if (metadata) {
                await this.updateLastAccessed();
            }
            
            console.log(`✅ Loaded folder: "${handle.name}"`);
            return { handle, metadata };
            
        } catch (err) {
            console.error(`❌ Load error:`, err);
            
            // Clean up corrupted data
            if (err.name === 'InvalidStateError' || err.name === 'NotFoundError') {
                console.log('🔧 Cleaning up corrupted folder data...');
                await this.deleteFolderHandle();
            }
            
            return null;
        }
    }

    /**
     * Update last accessed time
     */
    async updateLastAccessed() {
        try {
            await this.ensureReady();
            const db = this.db;
            
            const tx = db.transaction([this.META_STORE_NAME], 'readwrite');
            const store = tx.objectStore(this.META_STORE_NAME);
            
            const metadata = await this.promisifyRequest(store.get('musicFolder'));
            
            if (metadata) {
                metadata.lastAccessed = Date.now();
                await this.promisifyRequest(store.put(metadata));
                await this.promisifyTransaction(tx);
            }
            
            return true;
        } catch (err) {
            console.error('⚠️ Update last accessed error:', err);
            return false;
        }
    }

    /**
     * Get folder metadata without loading the handle
     */
    async getFolderMetadata() {
        try {
            await this.ensureReady();
            const db = this.db;
            
            const tx = db.transaction([this.META_STORE_NAME], 'readonly');
            const store = tx.objectStore(this.META_STORE_NAME);
            
            const metadata = await this.promisifyRequest(store.get('musicFolder'));
            await this.promisifyTransaction(tx);
            
            return metadata || null;
        } catch (err) {
            console.error(`⚠️ Metadata error:`, err);
            return null;
        }
    }

    /**
     * Update folder metadata (e.g., after analyzing tracks)
     */
    async updateMetadata(updates) {
        try {
            await this.ensureReady();
            const db = this.db;
            
            const tx = db.transaction([this.META_STORE_NAME], 'readwrite');
            const store = tx.objectStore(this.META_STORE_NAME);
            
            const metadata = await this.promisifyRequest(store.get('musicFolder'));
            
            if (!metadata) {
                console.warn('⚠️ No metadata to update');
                return false;
            }
            
            const updatedMetadata = {
                ...metadata,
                ...updates,
                lastAccessed: Date.now()
            };
            
            await this.promisifyRequest(store.put(updatedMetadata));
            await this.promisifyTransaction(tx);
            
            console.log('✅ Metadata updated');
            return true;
            
        } catch (err) {
            console.error(`❌ Update error:`, err);
            return false;
        }
    }

    /**
     * Get folder history
     */
    async getHistory() {
        try {
            await this.ensureReady();
            const db = this.db;
            
            const tx = db.transaction([this.HISTORY_STORE_NAME], 'readonly');
            const store = tx.objectStore(this.HISTORY_STORE_NAME);
            
            const history = await this.promisifyRequest(store.getAll());
            await this.promisifyTransaction(tx);
            
            // Sort by timestamp (newest first)
            return history.sort((a, b) => b.timestamp - a.timestamp);
            
        } catch (err) {
            console.error(`⚠️ History error:`, err);
            return [];
        }
    }

    /**
     * Delete saved folder handle and metadata
     */
    async deleteFolderHandle() {
        try {
            await this.ensureReady();
            const db = this.db;
            
            // Single transaction for both deletions
            const tx = db.transaction([this.STORE_NAME, this.META_STORE_NAME], 'readwrite');
            const handleStore = tx.objectStore(this.STORE_NAME);
            const metaStore = tx.objectStore(this.META_STORE_NAME);
            
            await this.promisifyRequest(handleStore.delete('musicFolder'));
            await this.promisifyRequest(metaStore.delete('musicFolder'));
            await this.promisifyTransaction(tx);
            
            // Clear localStorage flags
            localStorage.removeItem('hasSavedFolder');
            localStorage.removeItem('savedFolderName');
            localStorage.removeItem('savedFolderTime');
            
            console.log('🗑️ Folder handle deleted');
            return true;
            
        } catch (err) {
            console.error(`❌ Delete error:`, err);
            return false;
        }
    }

    /**
     * Clear all history
     */
    async clearHistory() {
        try {
            await this.ensureReady();
            const db = this.db;
            
            const tx = db.transaction([this.HISTORY_STORE_NAME], 'readwrite');
            const store = tx.objectStore(this.HISTORY_STORE_NAME);
            
            await this.promisifyRequest(store.clear());
            await this.promisifyTransaction(tx);
            
            console.log('🗑️ History cleared');
            return true;
        } catch (err) {
            console.error(`❌ Clear error:`, err);
            return false;
        }
    }

    /**
     * Verify folder permission with auto-request
     */
    async verifyFolderPermission(handle, autoRequest = true) {
        const options = { mode: 'read' };
        
        try {
            // Check current permission
            const currentPermission = await handle.queryPermission(options);
            
            if (currentPermission === 'granted') {
                return { granted: true, requested: false };
            }
            
            // Auto-request if enabled
            if (autoRequest) {
                const requestedPermission = await handle.requestPermission(options);
                
                if (requestedPermission === 'granted') {
                    return { granted: true, requested: true };
                }
            }
            
            return { granted: false, requested: autoRequest };
            
        } catch (err) {
            console.error(`❌ Permission error:`, err);
            return { granted: false, error: err.message };
        }
    }

    /**
     * Validate folder still exists and is accessible
     */
    async validateFolder(handle) {
        try {
            // Try to iterate folder to verify access
            const iterator = handle.values();
            await iterator.next();
            return true;
        } catch (err) {
            console.error(`⚠️ Validation failed:`, err);
            return false;
        }
    }

    /**
     * Quick check if folder is saved (no async)
     */
    hasSavedFolder() {
        return localStorage.getItem('hasSavedFolder') === 'true';
    }

    /**
     * Get quick folder info from localStorage (no async)
     */
    getQuickInfo() {
        if (!this.hasSavedFolder()) return null;
        
        const savedTime = parseInt(localStorage.getItem('savedFolderTime')) || 0;
        
        return {
            name: localStorage.getItem('savedFolderName'),
            savedAt: savedTime,
            daysAgo: Math.floor((Date.now() - savedTime) / (1000 * 60 * 60 * 24))
        };
    }

    /**
     * Export all data for backup
     */
    async exportData() {
        try {
            const metadata = await this.getFolderMetadata();
            const history = await this.getHistory();
            
            const exportData = {
                version: this.DB_VERSION,
                exportedAt: Date.now(),
                metadata,
                history
            };
            
            return JSON.stringify(exportData, null, 2);
        } catch (err) {
            console.error(`❌ Export error:`, err);
            return null;
        }
    }

    /**
     * Get storage statistics
     */
    async getStats() {
        try {
            const estimate = await navigator.storage.estimate();
            const metadata = await this.getFolderMetadata();
            const history = await this.getHistory();
            
            return {
                storageUsed: estimate.usage,
                storageQuota: estimate.quota,
                storageUsedFormatted: this.formatBytes(estimate.usage),
                storageQuotaFormatted: this.formatBytes(estimate.quota),
                percentUsed: (estimate.usage / estimate.quota * 100).toFixed(2),
                hasSavedFolder: this.hasSavedFolder(),
                folderName: metadata?.folderName || null,
                trackCount: metadata?.trackCount || 0,
                historyCount: history.length,
                lastAccessed: metadata?.lastAccessed || null,
                lastAccessedFormatted: metadata?.lastAccessed 
                    ? new Date(metadata.lastAccessed).toLocaleString() 
                    : null
            };
        } catch (err) {
            console.error(`⚠️ Stats error:`, err);
            return null;
        }
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            console.log('🔒 Database connection closed');
        }
    }

    /**
     * Reset everything - delete database and clear storage
     */
    async reset() {
        try {
            // Close connection first
            this.close();
            
            // Delete database
            await new Promise((resolve, reject) => {
                const request = indexedDB.deleteDatabase(this.DB_NAME);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
                request.onblocked = () => {
                    console.warn('⚠️ Database deletion blocked');
                    reject(new Error('Deletion blocked'));
                };
            });
            
            // Clear localStorage
            localStorage.removeItem('hasSavedFolder');
            localStorage.removeItem('savedFolderName');
            localStorage.removeItem('savedFolderTime');
            
            console.log('🔄 System reset complete');
            return true;
        } catch (err) {
            console.error('❌ Reset error:', err);
            return false;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FolderPersistence;
}