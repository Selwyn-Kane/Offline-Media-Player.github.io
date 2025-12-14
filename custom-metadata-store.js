/* ============================================
   Custom Metadata Storage System
   Stores user-edited track metadata in localStorage
   ============================================ */

class CustomMetadataStore {
    constructor() {
        this.storageKey = 'customMetadata';
        this.store = this.load();
    }
    
    /**
     * Generate a unique key for a file
     * @param {string} fileName - Name of the audio file
     * @param {number} fileSize - Size of the file (or duration as proxy)
     * @returns {string} Unique key for storage
     */
    generateKey(fileName, fileSize) {
        return `${fileName}_${fileSize}`;
    }
    
    /**
     * Save custom metadata for a file
     * @param {string} fileName - Name of the audio file
     * @param {number} fileSize - Size of the file
     * @param {Object} metadata - Metadata object to save
     */
    save(fileName, fileSize, metadata) {
        const key = this.generateKey(fileName, fileSize);
        this.store[key] = {
            ...metadata,
            savedAt: Date.now()
        };
        this.persist();
        console.log(`✅ Custom metadata saved for: ${fileName}`);
    }
    
    /**
     * Get custom metadata for a file
     * @param {string} fileName - Name of the audio file
     * @param {number} fileSize - Size of the file
     * @returns {Object|null} Metadata object or null if not found
     */
    get(fileName, fileSize) {
        const key = this.generateKey(fileName, fileSize);
        return this.store[key] || null;
    }
    
    /**
     * Check if file has custom metadata
     * @param {string} fileName - Name of the audio file
     * @param {number} fileSize - Size of the file
     * @returns {boolean} True if metadata exists
     */
    has(fileName, fileSize) {
        const key = this.generateKey(fileName, fileSize);
        return key in this.store;
    }
    
    /**
     * Delete custom metadata for a file
     * @param {string} fileName - Name of the audio file
     * @param {number} fileSize - Size of the file
     */
    delete(fileName, fileSize) {
        const key = this.generateKey(fileName, fileSize);
        delete this.store[key];
        this.persist();
    }
    
    /**
     * Load from localStorage
     * @returns {Object} Stored metadata object
     */
    load() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            return saved ? JSON.parse(saved) : {};
        } catch (err) {
            console.error('Failed to load custom metadata:', err);
            return {};
        }
    }
    
    /**
     * Persist to localStorage
     */
    persist() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.store));
        } catch (err) {
            console.error('Failed to save custom metadata:', err);
        }
    }
    
    /**
     * Get all stored metadata (for debugging)
     * @returns {Object} Copy of all stored metadata
     */
    getAll() {
        return { ...this.store };
    }
    
    /**
     * Clear all custom metadata
     */
    clearAll() {
        this.store = {};
        this.persist();
        console.log('🗑️ All custom metadata cleared');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CustomMetadataStore;
}