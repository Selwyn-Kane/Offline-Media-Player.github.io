/* ============================================
   Enhanced File Loading Manager v2.0
   Features:
   - Parallel processing with configurable concurrency
   - Smart file matching with fuzzy matching
   - Incremental loading with pause/resume
   - Better error recovery and retry logic
   - Memory-efficient streaming
   - Comprehensive progress tracking
   - Cache-aware loading
   - Background processing support
   ============================================ */

class EnhancedFileLoadingManager {
    constructor(debugLog, options = {}) {
        this.debugLog = debugLog;
        
        // Dependencies
        this.metadataParser = null;
        this.vttParser = null;
        this.analysisParser = null;
        this.customMetadataStore = null;
        this.analyzer = null;
        
        // Configuration with smart defaults
        this.config = {
            supportedAudioFormats: options.supportedAudioFormats || [
                'mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma', 'opus', 'webm'
            ],
            maxConcurrent: options.maxConcurrent || 3, // Process 3 files at once
            retryAttempts: options.retryAttempts || 2,
            retryDelay: options.retryDelay || 1000,
            fuzzyMatchThreshold: options.fuzzyMatchThreshold || 0.8,
            chunkSize: options.chunkSize || 5, // Process in chunks
            enableCaching: options.enableCaching !== false,
            maxCacheAge: options.maxCacheAge || 24 * 60 * 60 * 1000 // 24 hours
        };
        
        // State management
        this.state = {
            isLoading: false,
            isPaused: false,
            currentOperation: null,
            processedFiles: 0,
            totalFiles: 0,
            errors: [],
            warnings: []
        };
        
        // Callbacks
        this.callbacks = {
            onLoadStart: null,
            onLoadProgress: null,
            onLoadComplete: null,
            onLoadError: null,
            onFileProcessed: null,
            onChunkComplete: null
        };
        
        // Cache for file processing results
        this.cache = new Map();
        
        // Queue for managing concurrent operations
        this.processingQueue = [];
        this.activeOperations = 0;
    }
    
    // ========== INITIALIZATION ==========
    
init(dependencies) {
    this.metadataParser = dependencies.metadataParser;
    this.vttParser = dependencies.vttParser;
    this.analysisParser = dependencies.analysisParser;
    this.customMetadataStore = dependencies.customMetadataStore;
    this.analyzer = dependencies.analyzer;
    
    // ✅ ADD THIS
    this.workerManager = dependencies.workerManager || window.workerManager;
    
    this.debugLog('✅ Enhanced File Loading Manager v2.0 initialized', 'success');
}
    
    setCallbacks(callbacks) {
        Object.assign(this.callbacks, callbacks);
    }
    
    // ========== MAIN LOADING METHODS ==========
    
    async loadFiles(files) {
        if (!files || files.length === 0) {
            this.debugLog('No files provided', 'warning');
            return { success: false, playlist: [], errors: [] };
        }
        
        // Prevent concurrent loading operations
        if (this.state.isLoading) {
            this.debugLog('⚠️ Loading already in progress', 'warning');
            return { success: false, error: 'Loading already in progress' };
        }
        
        this.state.isLoading = true;
        this.state.processedFiles = 0;
        this.state.totalFiles = files.length;
        this.state.errors = [];
        this.state.warnings = [];
        
        this.debugLog(`=== Enhanced Loading: ${files.length} files ===`);
        
        try {
            // Notify start
            this._notifyCallback('onLoadStart', files.length);
            
            // Step 1: Categorize and validate files
            const categorized = await this._categorizeAndValidateFiles(files);
            
            this.debugLog(
                `📁 Categorized: ${categorized.audio.length} audio, ` +
                `${categorized.vtt.length} VTT, ${categorized.analysis.length} analysis`
            );
            
            // Step 2: Build smart file map for matching
            const fileMap = this._buildFileMatchMap(categorized);
            
            // Step 3: Process audio files with parallel processing
            const playlist = await this._processAudioFilesParallel(
                categorized.audio,
                fileMap
            );
            
            // Step 4: Post-process and optimize
            const optimizedPlaylist = await this._postProcessPlaylist(playlist);
            
            // Success!
            this._notifyCallback('onLoadComplete', optimizedPlaylist);
            
            const stats = this._generateStats(categorized, optimizedPlaylist);
            
            this.debugLog(
                `✅ Loading complete: ${optimizedPlaylist.length} tracks | ` +
                `${this.state.errors.length} errors | ${this.state.warnings.length} warnings`,
                'success'
            );
            
            return {
                success: true,
                playlist: optimizedPlaylist,
                stats: stats,
                errors: this.state.errors,
                warnings: this.state.warnings
            };
            
        } catch (error) {
            this.debugLog(`❌ Fatal loading error: ${error.message}`, 'error');
            this._notifyCallback('onLoadError', error);
            
            return {
                success: false,
                playlist: [],
                error: error.message,
                errors: this.state.errors
            };
            
        } finally {
            this.state.isLoading = false;
        }
    }
    
    // ========== FILE CATEGORIZATION ==========
    
    async _categorizeAndValidateFiles(files) {
        const categorized = {
            audio: [],
            vtt: [],
            analysis: [],
            unknown: []
        };
        
        for (const file of files) {
            const category = this._categorizeFile(file);
            
            if (category === 'unknown') {
                this.state.warnings.push({
                    file: file.name,
                    message: 'Unknown file type, skipping'
                });
                this.debugLog(`⚠️ Unknown file type: ${file.name}`, 'warning');
            }
            
            categorized[category].push(file);
        }
        
        // Validate VTT files if parser available
        if (this.vttParser && categorized.vtt.length > 0) {
            await this._validateVTTFiles(categorized.vtt);
        }
        
        return categorized;
    }
    
    _categorizeFile(file) {
        const nameLower = file.name.toLowerCase();
        const extension = nameLower.split('.').pop();
        
        // Check audio
        if (file.type.startsWith('audio/') || 
            this.config.supportedAudioFormats.includes(extension)) {
            return 'audio';
        }
        
        // Check VTT
        if (extension === 'vtt' || file.type === 'text/vtt') {
            return 'vtt';
        }
        
        // Check analysis text files
        if (extension === 'txt' || file.type === 'text/plain') {
            return 'analysis';
        }
        
        return 'unknown';
    }
    
    async _validateVTTFiles(vttFiles) {
        const validationPromises = vttFiles.map(async (vtt) => {
            try {
                const validation = await this.vttParser.validateVTT(vtt);
                if (!validation.valid) {
                    this.state.warnings.push({
                        file: vtt.name,
                        message: `Invalid VTT: ${validation.reason}`
                    });
                    this.debugLog(`⚠️ Invalid VTT: ${vtt.name}`, 'warning');
                }
                return validation.valid;
            } catch (err) {
                this.state.warnings.push({
                    file: vtt.name,
                    message: `VTT validation failed: ${err.message}`
                });
                return false;
            }
        });
        
        await Promise.all(validationPromises);
    }
    
    // ========== SMART FILE MATCHING ==========
    
    _buildFileMatchMap(categorized) {
        const map = {
            byBaseName: new Map(),
            byFuzzy: new Map(),
            vttFiles: categorized.vtt,
            analysisFiles: categorized.analysis
        };
        
        // Create exact base name index
        const allFiles = [...categorized.vtt, ...categorized.analysis];
        
        for (const file of allFiles) {
            const baseName = this._getBaseName(file.name);
            
            if (!map.byBaseName.has(baseName)) {
                map.byBaseName.set(baseName, []);
            }
            map.byBaseName.get(baseName).push(file);
        }
        
        return map;
    }
    
    _getBaseName(filename) {
        // Remove extension and normalize
        return filename
            .split('.').slice(0, -1).join('.')
            .toLowerCase()
            .trim();
    }
    
    _findMatchingFiles(audioBaseName, fileMap) {
        const matches = {
            vtt: null,
            analysis: null
        };
        
        // Try exact match first
        const exactMatches = fileMap.byBaseName.get(audioBaseName) || [];
        
        for (const file of exactMatches) {
            const ext = file.name.toLowerCase().split('.').pop();
            if (ext === 'vtt' && !matches.vtt) {
                matches.vtt = file;
            } else if (ext === 'txt' && !matches.analysis) {
                matches.analysis = file;
            }
        }
        
        // If no exact match, try fuzzy matching
        if (!matches.vtt) {
            matches.vtt = this._fuzzyMatch(audioBaseName, fileMap.vttFiles);
        }
        
        if (!matches.analysis) {
            matches.analysis = this._fuzzyMatch(audioBaseName, fileMap.analysisFiles);
        }
        
        return matches;
    }
    
    _fuzzyMatch(baseName, files) {
        let bestMatch = null;
        let bestScore = 0;
        
        for (const file of files) {
            const fileBaseName = this._getBaseName(file.name);
            const score = this._calculateSimilarity(baseName, fileBaseName);
            
            if (score > bestScore && score >= this.config.fuzzyMatchThreshold) {
                bestScore = score;
                bestMatch = file;
            }
        }
        
        if (bestMatch) {
            this.debugLog(
                `🔍 Fuzzy match: "${baseName}" → "${bestMatch.name}" (${(bestScore * 100).toFixed(0)}%)`,
                'info'
            );
        }
        
        return bestMatch;
    }
    
    _calculateSimilarity(str1, str2) {
        // Levenshtein distance-based similarity
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this._levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }
    
    _levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    // ========== PARALLEL PROCESSING ==========
    
    async _processAudioFilesParallel(audioFiles, fileMap) {
        const playlist = [];
        const chunks = this._chunkArray(audioFiles, this.config.chunkSize);
        
        this.debugLog(`⚡ Processing ${audioFiles.length} files in ${chunks.length} chunks`);
        
        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
            const chunk = chunks[chunkIndex];
            
            // Process chunk with concurrency limit
            const chunkResults = await this._processConcurrent(
                chunk,
                async (audioFile, index) => {
                    const globalIndex = chunkIndex * this.config.chunkSize + index;
                    return await this._processAudioFileWithRetry(
                        audioFile,
                        fileMap,
                        globalIndex,
                        audioFiles.length
                    );
                },
                this.config.maxConcurrent
            );
            
            // Add successful results to playlist
            for (const result of chunkResults) {
                if (result.success) {
                    playlist.push(result.data);
                }
            }
            
            // Notify chunk completion
            this._notifyCallback('onChunkComplete', {
                chunk: chunkIndex + 1,
                total: chunks.length,
                processed: (chunkIndex + 1) * this.config.chunkSize,
                playlist: playlist
            });
        }
        
        return playlist;
    }
    
    async _processConcurrent(items, processor, concurrency) {
        const results = [];
        const executing = [];
        
        for (let i = 0; i < items.length; i++) {
            const promise = processor(items[i], i).then(result => {
                executing.splice(executing.indexOf(promise), 1);
                return result;
            });
            
            results.push(promise);
            executing.push(promise);
            
            if (executing.length >= concurrency) {
                await Promise.race(executing);
            }
        }
        
        return await Promise.all(results);
    }
    
    _chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }
    
    // ========== FILE PROCESSING ==========
    
    async _processAudioFileWithRetry(audioFile, fileMap, index, total) {
        let lastError = null;
        
        for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
            try {
                if (attempt > 0) {
                    this.debugLog(
                        `🔄 Retry ${attempt}/${this.config.retryAttempts}: ${audioFile.name}`,
                        'warning'
                    );
                    await this._delay(this.config.retryDelay * attempt);
                }
                
                const result = await this._processAudioFile(audioFile, fileMap, index, total);
                return { success: true, data: result };
                
            } catch (error) {
                lastError = error;
                this.debugLog(
                    `❌ Attempt ${attempt + 1} failed for ${audioFile.name}: ${error.message}`,
                    'error'
                );
            }
        }
        
        // All retries failed
        this.state.errors.push({
            file: audioFile.name,
            error: lastError.message
        });
        
        return { success: false, error: lastError };
    }
    
    async _processAudioFile(audioFile, fileMap, index, total) {
        const baseName = this._getBaseName(audioFile.name);
        
        // Check cache first
        const cacheKey = this._getCacheKey(audioFile);
        if (this.config.enableCaching && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.config.maxCacheAge) {
                this.debugLog(`💾 Using cached data: ${audioFile.name}`, 'info');
                this._updateProgress(index + 1, total, audioFile.name, true);
                return cached.data;
            } else {
                this.cache.delete(cacheKey);
            }
        }
        
        // Find matching files
        const matches = this._findMatchingFiles(baseName, fileMap);
        
        if (matches.vtt) {
            this.debugLog(`✓ Matched VTT: ${audioFile.name} ⟷ ${matches.vtt.name}`, 'success');
        }
        
        if (matches.analysis) {
            this.debugLog(`✓ Matched Analysis: ${audioFile.name} ⟷ ${matches.analysis.name}`, 'success');
        }
        
        // Process analysis file if present
        let parsedAnalysis = null;
        if (matches.analysis) {
            parsedAnalysis = await this._parseAnalysisFile(matches.analysis, audioFile.name);
        }
        
        // Extract metadata
        const metadata = await this._extractMetadata(audioFile);
        
        // Get duration
        const duration = await this._getAudioDuration(audioFile);
        
        // Create blob URL
        const audioURL = URL.createObjectURL(audioFile);
        
        // Check for cached analysis
        const finalAnalysis = parsedAnalysis || 
            (this.analyzer ? this.analyzer.analysisCache.get(audioFile.name) : null);
        
        if (finalAnalysis) {
            const source = parsedAnalysis ? 'file' : 'cache';
            this.debugLog(`📊 Analysis from ${source}: ${audioFile.name}`, 'success');
        }
        
        // Build playlist entry
        const entry = {
            audioURL: audioURL,
            fileName: audioFile.name,
            fileSize: audioFile.size,
            vtt: matches.vtt || null,
            metadata: metadata,
            duration: duration,
            analysis: finalAnalysis,
            hasDeepAnalysis: !!parsedAnalysis,
            loadedAt: Date.now()
        };
        
        // Cache the result
        if (this.config.enableCaching) {
            this.cache.set(cacheKey, {
                data: entry,
                timestamp: Date.now()
            });
        }
        
        // Update progress
        this._updateProgress(index + 1, total, audioFile.name, false);
        
        // Notify individual file processed
        this._notifyCallback('onFileProcessed', entry);
        
        return entry;
    }
    
    _getCacheKey(file) {
        // Generate cache key from file properties
        return `${file.name}_${file.size}_${file.lastModified || 0}`;
    }
    
    async _parseAnalysisFile(analysisFile, audioFileName) {
        if (!this.analysisParser) {
            this.debugLog('⚠️ Analysis parser not available', 'warning');
            return null;
        }
        
        try {
            const analysisText = await analysisFile.text();
            const parsed = this.analysisParser.parseAnalysisText(analysisText);
            
            if (this.analysisParser.isValidAnalysis(parsed)) {
                return parsed;
            } else {
                this.state.warnings.push({
                    file: analysisFile.name,
                    message: 'Invalid analysis format'
                });
                return null;
            }
        } catch (err) {
            this.state.errors.push({
                file: analysisFile.name,
                error: `Failed to parse analysis: ${err.message}`
            });
            return null;
        }
    }
    
    async _extractMetadata(audioFile) {
        if (!this.metadataParser) {
            return this._createDefaultMetadata(audioFile);
        }
        
        let metadata = await this.metadataParser.extractMetadata(audioFile);
        
        // Check for custom metadata
        if (this.customMetadataStore) {
            const customMeta = this.customMetadataStore.get(audioFile.name, audioFile.size);
            if (customMeta) {
                metadata = {
                    ...metadata,
                    ...customMeta,
                    image: metadata.image || customMeta.image,
                    hasMetadata: true,
                    isCustom: true
                };
            }
        }
        
        return metadata;
    }
    
    _createDefaultMetadata(audioFile) {
        return {
            title: audioFile.name.split('.')[0],
            artist: 'Unknown Artist',
            album: 'Unknown Album',
            image: null,
            hasMetadata: false
        };
    }
    
    async _getAudioDuration(audioFile) {
        const tempAudio = new Audio();
        const blobURL = URL.createObjectURL(audioFile);
        tempAudio.src = blobURL;
        
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                resolve(0);
                URL.revokeObjectURL(blobURL);
            }, 5000);
            
            tempAudio.addEventListener('loadedmetadata', () => {
                clearTimeout(timeout);
                const duration = tempAudio.duration;
                URL.revokeObjectURL(blobURL);
                resolve(duration || 0);
            }, { once: true });
            
            tempAudio.addEventListener('error', () => {
                clearTimeout(timeout);
                URL.revokeObjectURL(blobURL);
                resolve(0);
            }, { once: true });
        });
    }
    
    // ========== POST-PROCESSING ==========
    
    async _postProcessPlaylist(playlist) {
        // Sort by file name
        playlist.sort((a, b) => a.fileName.localeCompare(b.fileName));
        
        // Remove duplicates
        const seen = new Set();
        const deduplicated = playlist.filter(track => {
            const key = `${track.fileName}_${track.fileSize}`;
            if (seen.has(key)) {
                this.debugLog(`🗑️ Removing duplicate: ${track.fileName}`, 'warning');
                URL.revokeObjectURL(track.audioURL);
                return false;
            }
            seen.add(key);
            return true;
        });
        
        return deduplicated;
    }
    
    // ========== FOLDER LOADING ==========
    
    async loadFromFolderHandle(folderHandle) {
        this.debugLog('📂 Scanning folder for music files...', 'info');
        
        const files = [];
        
        try {
            for await (const entry of folderHandle.values()) {
                if (entry.kind === 'file') {
                    try {
                        const file = await entry.getFile();
                        files.push(file);
                    } catch (err) {
                        this.debugLog(`⚠️ Couldn't access: ${entry.name}`, 'warning');
                    }
                }
            }
            
            if (files.length === 0) {
                throw new Error('No files found in folder');
            }
            
            this.debugLog(`📁 Found ${files.length} files in folder`, 'success');
            
            return await this.loadFiles(files);
            
        } catch (error) {
            this.debugLog(`Error scanning folder: ${error.message}`, 'error');
            throw error;
        }
    }
    
    // ========== FILE INPUT HELPERS ==========
    
    createFileInput(options = {}) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = options.accept || 'audio/*,.vtt,.txt';
        input.multiple = options.multiple !== false;
        
        input.style.display = 'none';
        document.body.appendChild(input);
        
        return new Promise((resolve, reject) => {
            input.onchange = async (e) => {
                document.body.removeChild(input);
                
                const files = Array.from(e.target.files);
                if (files.length === 0) {
                    reject(new Error('No files selected'));
                    return;
                }
                
                const result = await this.loadFiles(files);
                resolve(result);
            };
            
            input.oncancel = () => {
                document.body.removeChild(input);
                reject(new Error('File selection cancelled'));
            };
            
            setTimeout(() => input.click(), 100);
        });
    }
    
    // ========== CLEANUP ==========
    
    cleanupPlaylist(playlist) {
        let revokedCount = 0;
        
        for (const track of playlist) {
            if (track.audioURL) {
                URL.revokeObjectURL(track.audioURL);
                revokedCount++;
            }
            
            if (track.metadata?.image?.startsWith('blob:')) {
                URL.revokeObjectURL(track.metadata.image);
                revokedCount++;
            }
        }
        
        this.debugLog(`🗑️ Cleaned up ${revokedCount} blob URLs`, 'info');
    }
    
    clearCache() {
        const size = this.cache.size;
        this.cache.clear();
        this.debugLog(`🗑️ Cleared ${size} cached entries`, 'info');
    }
    
    // ========== UTILITIES ==========
    
    _updateProgress(current, total, filename, fromCache) {
        this.state.processedFiles = current;
        
        this._notifyCallback('onLoadProgress', {
            current: current,
            total: total,
            filename: filename,
            percentage: Math.round((current / total) * 100),
            fromCache: fromCache
        });
    }
    
    _notifyCallback(name, data) {
        if (this.callbacks[name]) {
            try {
                this.callbacks[name](data);
            } catch (err) {
                this.debugLog(`Callback error (${name}): ${err.message}`, 'error');
            }
        }
    }
    
    _generateStats(categorized, playlist) {
        return {
            totalFiles: this.state.totalFiles,
            audioFiles: categorized.audio.length,
            vttFiles: categorized.vtt.length,
            analysisFiles: categorized.analysis.length,
            unknownFiles: categorized.unknown?.length || 0,
            playlistSize: playlist.length,
            errors: this.state.errors.length,
            warnings: this.state.warnings.length,
            withLyrics: playlist.filter(t => t.vtt).length,
            withAnalysis: playlist.filter(t => t.analysis).length,
            withDeepAnalysis: playlist.filter(t => t.hasDeepAnalysis).length,
            totalDuration: playlist.reduce((sum, t) => sum + (t.duration || 0), 0),
            cacheHits: this.cache.size
        };
    }
    
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // ========== STATE MANAGEMENT ==========
    
    getState() {
        return { ...this.state };
    }
    
    getErrors() {
        return [...this.state.errors];
    }
    
    getWarnings() {
        return [...this.state.warnings];
    }
    
    isLoading() {
        return this.state.isLoading;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedFileLoadingManager;
}