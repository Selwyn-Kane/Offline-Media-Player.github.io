/* ============================================
   Ultimate Local Music Player - JavaScript
   ============================================ */

// ========== MODULE SCOPE VARIABLES (Accessible to all modules) ==========
// Parsers and managers
let metadataParser = null;
let vttParser = null;
let errorRecovery = null;
let audioPresetsManager = null;
let metadataEditor = null;

// Playlist data
let playlist = [];
let currentTrackIndex = -1;
let isShuffled = false;
let loopMode = 'off';

// Lyrics
let cues = [];
let cachedLyricLines = [];

// Folder
let folderHandle = null;

// Audio system
let audioContext = null;
let analyser = null;
let audioSource = null;
let dataArray = null;
let bufferLength = null;
let visualizerAnimationId = null;
let visualizerEnabled = true;

// Equalizer
let bassFilter = null;
let midFilter = null;
let trebleFilter = null;

// UI state
let debugMode = false;
let isSeekingProg = false;
let lastVolume = 1;
let compactMode = 'full';

// Canvas (initialized after DOM loads)
let canvas = null;
let canvasCtx = null;

// Color extraction cache (CRITICAL - was missing!)
const colorCache = new Map();

document.addEventListener('DOMContentLoaded', () => {

    // NOW initialize parsers (after they're declared)
    metadataParser = new MetadataParser(debugLog);
    errorRecovery = new ErrorRecovery(debugLog);
    vttParser = new VTTParser(debugLog);
    metadataEditor = new MetadataEditor(debugLog);

    // ========== CUSTOM METADATA STORAGE SYSTEM ==========

class CustomMetadataStore {
    constructor() {
        this.storageKey = 'customMetadata';
        this.store = this.load();
    }
    
    /**
     * Generate a unique key for a file
     */
    generateKey(fileName, fileSize) {
        return `${fileName}_${fileSize}`;
    }
    
    /**
     * Save custom metadata for a file
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
     */
    get(fileName, fileSize) {
        const key = this.generateKey(fileName, fileSize);
        return this.store[key] || null;
    }
    
    /**
     * Check if file has custom metadata
     */
    has(fileName, fileSize) {
        const key = this.generateKey(fileName, fileSize);
        return key in this.store;
    }
    
    /**
     * Delete custom metadata for a file
     */
    delete(fileName, fileSize) {
        const key = this.generateKey(fileName, fileSize);
        delete this.store[key];
        this.persist();
    }
    
    /**
     * Load from localStorage
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

// Initialize custom metadata store
const customMetadataStore = new CustomMetadataStore();

// ========== END CUSTOM METADATA STORAGE ==========

    // ========== FOLDER PERSISTENCE SYSTEM ==========

// IndexedDB helper for storing folder handle
const DB_NAME = 'MusicPlayerDB';
const DB_VERSION = 1;
const STORE_NAME = 'folderHandles';

async function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
}

async function saveFolderHandle(handle) {
    try {
        const db = await openDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        await store.put(handle, 'musicFolder');
        
        debugLog('Folder handle saved to IndexedDB', 'success');
        localStorage.setItem('hasSavedFolder', 'true');
} catch (err) {
        const recovery = errorRecovery.handleStorageError(err, 'saveFolderHandle');
        debugLog(`Storage error: ${recovery.message}`, 'error');
    }
}

async function loadFolderHandle() {
    try {
        const db = await openDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        
        return new Promise((resolve, reject) => {
            const request = store.get('musicFolder');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        debugLog(`Failed to load folder handle: ${err.message}`, 'error');
        return null;
    }
}

async function verifyFolderPermission(handle) {
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

// ========== END FOLDER PERSISTENCE SYSTEM ==========
    
        // --- Core Variables ---
        const player = document.getElementById('audio-player');
        const playlistStatus = document.getElementById('playlist-status');
        const loadButton = document.getElementById('load-button');
        const prevButton = document.getElementById('prev-button');
        const nextButton = document.getElementById('next-button');
        const shuffleButton = document.getElementById('shuffle-button');
        const loopButton = document.getElementById('loop-button');
        const clearButton = document.getElementById('clear-playlist');
        const debugToggle = document.getElementById('debug-toggle');
        const debugPanel = document.getElementById('debug-panel');
        const playlistItems = document.getElementById('playlist-items');
        const coverArtContainer = document.getElementById('cover-art-container');
        const coverArt = document.getElementById('cover-art');
        const coverPlaceholder = document.getElementById('cover-placeholder');
        const trackTitle = document.getElementById('track-title');
        const trackArtist = document.getElementById('track-artist');
        const trackAlbum = document.getElementById('track-album');
        const metadataContainer = document.getElementById('metadata-container');
        const progressContainer = document.getElementById('custom-progress-container');
        const progressBar = document.getElementById('progress-bar');
        const currentTimeDisplay = document.getElementById('current-time');
        const durationDisplay = document.getElementById('duration');
        const lyricsDisplay = document.getElementById('lyrics-display');
        const dropZone = document.getElementById('drop-zone');
        const exportLyricsButton = document.getElementById('export-lyrics-button');
        const pipToggle = document.getElementById('pip-toggle');
        const MAX_CACHE_SIZE = APP_CONFIG.MAX_CACHE_SIZE;
        //Constants for progress bar (eliminating magic numbers)
        const PROGRESS_UPDATE_INTERVAL_MS = 200;
        const SEEK_DEBOUNCE_DELAY_MS = 100;
        const PROGRESS_EDGE_TOLERANCE = 0.02; // 2% tolerance at edges

        canvas = document.getElementById('visualizer');
        canvasCtx = canvas.getContext('2d');
    
        const eqBassSlider = document.getElementById('eq-bass');
        const eqMidSlider = document.getElementById('eq-mid');
        const eqTrebleSlider = document.getElementById('eq-treble');
        const bassValue = document.getElementById('bass-value');
        const midValue = document.getElementById('mid-value');
        const trebleValue = document.getElementById('treble-value');
        const eqResetBtn = document.getElementById('eq-reset');

    // Initialize custom background manager
if (typeof CustomBackgroundManager !== 'undefined') {
    const backgroundManager = new CustomBackgroundManager(debugLog);
    debugLog('✅ Custom background manager initialized', 'success');
}
        
        // --- Color Extraction Functions ---
        function rgbToHex(r, g, b) {
            return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        }
function extractDominantColor(imageUrl) {
    // Check cache first
    if (colorCache.has(imageUrl)) {
        debugLog('Using cached color', 'success');
        return Promise.resolve(colorCache.get(imageUrl));
    }
    
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            try {
                
                // Offscreen canvas for better performance
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                
                // Use even smaller sample size for speed
                const sampleSize = 50;
                canvas.width = sampleSize;
                canvas.height = sampleSize;
                
                // Draw scaled down version
                ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
                
                // Sample center 25% of image
                const centerSize = Math.floor(sampleSize / 2);
                const offset = Math.floor(sampleSize / 4);
                
                const imageData = ctx.getImageData(offset, offset, centerSize, centerSize);
                
                let r = 0, g = 0, b = 0, count = 0;
                
                // Sample every 16th pixel (4x4 grid skip) - SUPER fast
                for (let i = 0; i < imageData.data.length; i += 64) { // was 16, now 64
                    const red = imageData.data[i];
                    const green = imageData.data[i + 1];
                    const blue = imageData.data[i + 2];
                    const brightness = (red + green + blue) / 3;
                    
                    if (brightness > 20 && brightness < 235) {
                        r += red;
                        g += green;
                        b += blue;
                        count++;
                    }
                }
                
                if (count > 0) {
                    r = Math.floor(r / count);
                    g = Math.floor(g / count);
                    b = Math.floor(b / count);
                }
                
                const color = { r, g, b };
                
                // FIXED: Cache eviction BEFORE adding new entry
                if (colorCache.size >= MAX_CACHE_SIZE) {
                    const firstKey = colorCache.keys().next().value;
                    colorCache.delete(firstKey);
                    debugLog('Cache evicted oldest color', 'info');
                }
                
                colorCache.set(imageUrl, color);
                
                debugLog(`Extracted and cached color: RGB(${r}, ${g}, ${b})`, 'success');
                resolve(color);
            } catch (err) {
                debugLog(`Color extraction failed: ${err.message}`, 'error');
                const defaultColor = { r: 45, g: 45, b: 45 };
                colorCache.set(imageUrl, defaultColor);
                resolve(defaultColor);
            }
        };
        
        img.onerror = () => {
            debugLog('Failed to load image for color extraction', 'error');
            const defaultColor = { r: 45, g: 45, b: 45 };
            colorCache.set(imageUrl, defaultColor);
            resolve(defaultColor);
        };
        
        img.src = imageUrl;
    });
}
        
        function applyDynamicBackground(color) {
            if (!color) {
                metadataContainer.style.background = 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)';
                metadataContainer.style.boxShadow = '0 8px 32px rgba(220, 53, 69, 0.2)';
                return;
            }
            
            const { r, g, b } = color;
            const darkerR = Math.max(0, Math.floor(r * 0.3));
            const darkerG = Math.max(0, Math.floor(g * 0.3));
            const darkerB = Math.max(0, Math.floor(b * 0.3));
            const lighterR = Math.min(255, Math.floor(r * 0.6));
            const lighterG = Math.min(255, Math.floor(g * 0.6));
            const lighterB = Math.min(255, Math.floor(b * 0.6));
            
            metadataContainer.style.background = `linear-gradient(135deg, rgb(${darkerR}, ${darkerG}, ${darkerB}) 0%, rgb(${lighterR}, ${lighterG}, ${lighterB}) 100%)`;
            metadataContainer.style.boxShadow = `0 8px 32px rgba(${r}, ${g}, ${b}, 0.3)`;
        }
        
        // --- Debug Functions (User's Code) ---
        function debugLog(message, type = 'info') {
            const timestamp = new Date().toLocaleTimeString();
            const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
            console.log(`${prefix} ${message}`);
            
            if (debugMode) {
                const entry = document.createElement('div');
                entry.style.color = type === 'error' ? '#ff5555' : type === 'success' ? '#50fa7b' : type === 'warning' ? '#ffb86c' : '#8be9fd';
                entry.textContent = `[${timestamp}] ${prefix} ${message}`;
                debugPanel.appendChild(entry);
                debugPanel.scrollTop = debugPanel.scrollHeight;
            }
        }
        
        debugToggle.onclick = () => {
            debugMode = !debugMode;
            debugPanel.classList.toggle('visible');
            debugToggle.textContent = debugMode ? '🐛 Hide Debug' : '🐛 Debug';
            if (debugMode) {
                debugLog('Debug mode enabled', 'success');
            }
        };
        
        // --- Utility Functions ---
        function shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
        }
        
        function formatTime(seconds) {
            const min = Math.floor(seconds / 60);
            const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
            return `${min}:${sec}`;
        }
        
        // --- Audio Visualizer Functions ---
       function setupAudioContext() {
    if (audioContext) return; // Already set up
    
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = APP_CONFIG.FFT_SIZE;
        bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        
        // Create equalizer filters
        bassFilter = audioContext.createBiquadFilter();
        bassFilter.type = 'lowshelf';
        bassFilter.frequency.value = APP_CONFIG.BASS_FREQ_HZ;
        bassFilter.gain.value = 0;
        
        midFilter = audioContext.createBiquadFilter();
        midFilter.type = 'peaking';
        midFilter.frequency.value = APP_CONFIG.MID_FREQ_HZ;
        midFilter.Q.value = 1;
        midFilter.gain.value = 0;
        
        trebleFilter = audioContext.createBiquadFilter();
        trebleFilter.type = 'highshelf';
        trebleFilter.frequency.value = APP_CONFIG.TREBLE_FREQ_HZ;
        trebleFilter.gain.value = 0;
        
        // Connect audio chain
        if (!audioSource) {
            audioSource = audioContext.createMediaElementSource(player);
            audioSource.connect(bassFilter);
            bassFilter.connect(midFilter);
            midFilter.connect(trebleFilter);
            trebleFilter.connect(analyser);
            analyser.connect(audioContext.destination);
        }
        
        // Initialize visualizer only if analyser is valid
        if (analyser && canvas) {
            visualizerManager.initMainVisualizer(canvas, analyser);
            debugLog('Audio visualizer and equalizer initialized', 'success');
        } else {
            debugLog('Visualizer initialization skipped: analyser or canvas not ready', 'warning');
        }
        
        setupEqualizerControls();

// Initialize presets AFTER filters are created
audioPresetsManager = new AudioPresetsManager(bassFilter, midFilter, trebleFilter, debugLog);
audioPresetsManager.loadSavedPreset();

// Now populate the dropdown since audioPresetsManager exists
populatePresetDropdown();
        
    } catch (error) {
        debugLog(`Audio setup failed: ${error.message}`, 'error');
    }
}
        
function startVisualizer() {
    if (perfManager.shouldRunVisualizer() && analyser) {
        // Ensure visualizer is initialized before starting
        if (!visualizerManager.canvas) {
            visualizerManager.initMainVisualizer(canvas, analyser);
        }
        visualizerManager.start(true);
    }
}
    
    function draw() {
        // OPTIMIZED: Use performance manager
        if (!perfManager.shouldRunVisualizer()) {
            visualizerAnimationId = null;
            // Draw static gradient and stop
            const gradient = canvasCtx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#1a1a1a');
            gradient.addColorStop(1, '#0a0a0a');
            canvasCtx.fillStyle = gradient;
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
            return;
        }
        
        visualizerAnimationId = requestAnimationFrame(draw);
        
        analyser.getByteFrequencyData(dataArray);
        
        // Clear canvas with gradient
        const gradient = canvasCtx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#1a1a1a');
        gradient.addColorStop(1, '#0a0a0a');
        canvasCtx.fillStyle = gradient;
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
            barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
            
            // Create gradient for bars
            const barGradient = canvasCtx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
            
            // Color based on frequency (low = red, high = pink)
            const hue = (i / bufferLength) * 20 + 340;
            const saturation = 80 + (dataArray[i] / 255) * 20;
            const lightness = 45 + (dataArray[i] / 255) * 15;
            
            barGradient.addColorStop(0, `hsl(${hue}, ${saturation}%, ${lightness}%)`);
            barGradient.addColorStop(1, `hsl(${hue}, ${saturation}%, ${lightness - 20}%)`);
            
            canvasCtx.fillStyle = barGradient;
            
            // Draw bar with rounded top
            const barX = x;
            const barY = canvas.height - barHeight;
            const radius = barWidth / 2;
            
            canvasCtx.beginPath();
            canvasCtx.moveTo(barX, canvas.height);
            canvasCtx.lineTo(barX, barY + radius);
            canvasCtx.quadraticCurveTo(barX, barY, barX + radius, barY);
            canvasCtx.lineTo(barX + barWidth - radius, barY);
            canvasCtx.quadraticCurveTo(barX + barWidth, barY, barX + barWidth, barY + radius);
            canvasCtx.lineTo(barX + barWidth, canvas.height);
            canvasCtx.closePath();
            canvasCtx.fill();
            
            x += barWidth + 1;
        }
        
        // Add glow effect
        canvasCtx.shadowBlur = 10;
        canvasCtx.shadowColor = 'rgba(220, 53, 69, 0.3)';
    }
    
    draw();
        
        function stopVisualizer() {
    visualizerManager.stop();
}

    // Widget communication system
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'WIDGET_COMMAND') {
            handleWidgetCommand(event.data.action);
        }
    });
}

function handleWidgetCommand(action) {
    switch (action) {
        case 'PLAY':
            player.play();
            break;
        case 'PAUSE':
            player.pause();
            break;
        case 'NEXT':
            if (!nextButton.disabled) playNext();
            break;
        case 'PREVIOUS':
            if (!prevButton.disabled) playPrevious();
            break;
        case 'GET_STATE':
            broadcastStateToWidget();
            break;
    }
}

function broadcastStateToWidget() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const state = {
            isPlaying: !player.paused,
            currentTrack: {
                title: playlist[currentTrackIndex]?.metadata?.title || 'No track loaded',
                artist: playlist[currentTrackIndex]?.metadata?.artist || '--',
                albumArt: playlist[currentTrackIndex]?.metadata?.image || null
            },
            progress: player.duration ? (player.currentTime / player.duration) * 100 : 0
        };
        
        navigator.serviceWorker.controller.postMessage({
            type: 'UPDATE_STATE',
            state: state
        });
    }
}

// Call this whenever playback state changes
player.addEventListener('play', broadcastStateToWidget);
player.addEventListener('pause', broadcastStateToWidget);
player.addEventListener('timeupdate', broadcastStateToWidget);
        
        // --- Equalizer Functions ---
        function setupEqualizerControls() {
            // Load saved EQ settings
            const savedBass = localStorage.getItem('eqBass');
            const savedMid = localStorage.getItem('eqMid');
            const savedTreble = localStorage.getItem('eqTreble');
            
            if (savedBass !== null) {
                eqBassSlider.value = savedBass;
                bassFilter.gain.value = parseFloat(savedBass);
                bassValue.textContent = `${savedBass} dB`;
            }
            if (savedMid !== null) {
                eqMidSlider.value = savedMid;
                midFilter.gain.value = parseFloat(savedMid);
                midValue.textContent = `${savedMid} dB`;
            }
            if (savedTreble !== null) {
                eqTrebleSlider.value = savedTreble;
                trebleFilter.gain.value = parseFloat(savedTreble);
                trebleValue.textContent = `${savedTreble} dB`;
            }
            
            // Bass control
            eqBassSlider.oninput = (e) => {
                const value = parseFloat(e.target.value);
                bassFilter.gain.value = value;
                bassValue.textContent = `${value} dB`;
                localStorage.setItem('eqBass', value);
                debugLog(`Bass: ${value} dB`);
            };
            
            // Mid control
            eqMidSlider.oninput = (e) => {
                const value = parseFloat(e.target.value);
                midFilter.gain.value = value;
                midValue.textContent = `${value} dB`;
                localStorage.setItem('eqMid', value);
                debugLog(`Mid: ${value} dB`);
            };
            
            // Treble control
            eqTrebleSlider.oninput = (e) => {
                const value = parseFloat(e.target.value);
                trebleFilter.gain.value = value;
                trebleValue.textContent = `${value} dB`;
                localStorage.setItem('eqTreble', value);
                debugLog(`Treble: ${value} dB`);
            };
            
            // Reset button
            eqResetBtn.onclick = () => {
                eqBassSlider.value = 0;
                eqMidSlider.value = 0;
                eqTrebleSlider.value = 0;
                
                bassFilter.gain.value = 0;
                midFilter.gain.value = 0;
                trebleFilter.gain.value = 0;
                
                bassValue.textContent = '0 dB';
                midValue.textContent = '0 dB';
                trebleValue.textContent = '0 dB';
                
                localStorage.removeItem('eqBass');
                localStorage.removeItem('eqMid');
                localStorage.removeItem('eqTreble');
                
                debugLog('Equalizer reset', 'success');
            };
        }
        
        // --- Metadata Functions (User's Code) ---

// What This Does

//**Equalizer Features:**
//- **Bass Filter** (200 Hz low shelf): Boosts/cuts low frequencies
//- **Mid Filter** (1000 Hz peaking): Boosts/cuts mid frequencies
//- **Treble Filter** (3000 Hz high shelf): Boosts/cuts high frequencies
//- **Range**: -12 dB to +12 dB for each band
//- **Visual sliders**: Vertical sliders with real-time value display
//- **Persistence**: Settings saved to localStorage
//- **Reset button**: Instantly returns all bands to 0 dB

//**Audio Chain:**
//```
//Player → Bass Filter → Mid Filter → Treble Filter → Analyser → Output
        
        // --- Metadata Functions (User's Code) ---
       function clearMetadata() {
    // Revoke blob URL if it exists
    if (coverArt.src && coverArt.src.startsWith('blob:')) {
        URL.revokeObjectURL(coverArt.src);
    }
    
    coverArt.classList.remove('loaded');
    coverArt.src = '';
    coverPlaceholder.style.display = 'flex';
    trackTitle.textContent = 'No track loaded';
    trackArtist.textContent = '--';
    trackAlbum.textContent = '--';
    applyDynamicBackground(null);
    lyricsDisplay.innerHTML = '<div class="lyric-line">Lyrics will appear here when a track is loaded.</div>';
    currentTimeDisplay.textContent = '0:00';
    durationDisplay.textContent = '0:00';
    progressBar.style.width = '0%';
    exportLyricsButton.disabled = true;
}

async function displayMetadata(metadata) {
            debugLog(`Displaying metadata: ${metadata.title} by ${metadata.artist}`);
            trackTitle.textContent = metadata.title || 'Unknown Title';
            trackArtist.textContent = metadata.artist || 'Unknown Artist';
            trackAlbum.textContent = metadata.album || 'Unknown Album';
            if (metadata.image) {
                coverArt.src = metadata.image;
                coverArt.classList.add('loaded');
                coverPlaceholder.style.display = 'none';
                debugLog('Album art loaded successfully', 'success');
                
                // Extract and apply color
                const color = await extractDominantColor(metadata.image);
                applyDynamicBackground(color);
            } else {
                coverArt.classList.remove('loaded');
                coverArt.src = '';
                coverPlaceholder.style.display = 'flex';
                applyDynamicBackground(null);
                debugLog('No album art found', 'warning');
            }
        }
        


// --- Lyric Display Functions ---
// --- Lyric Display Functions ---
function renderLyrics(cues) {
    lyricsDisplay.innerHTML = '<button id="export-lyrics-button" disabled>📥 Export</button>';
    
    if (cues.length === 0) {
        lyricsDisplay.innerHTML += '<div class="lyric-line">No lyrics available or VTT file malformed.</div>';
        return;
    }
    
    cues.forEach((cue, index) => {
        const line = document.createElement('div');
        line.className = 'lyric-line';
        line.textContent = cue.text.replace(/\r?\n|\r/g, ' ');
        line.dataset.index = index;
        line.dataset.startTime = cue.startTime;
        
        line.onclick = () => {
            player.currentTime = cue.startTime;
            debugLog(`Jumping to lyric time: ${formatTime(cue.startTime)}`, 'info');
        };
        
        lyricsDisplay.appendChild(line);
    });
    
    // Re-get the button reference and enable if lyrics are loaded
    const newExportButton = document.getElementById('export-lyrics-button');
    newExportButton.disabled = cues.length === 0;
    
    // Re-attach event handlers to the new button
    newExportButton.onclick = (e) => {
        if (e.ctrlKey) {
            e.preventDefault();
            copyLyricsToClipboard();
        } else {
            exportLyricsToText();
        }
    };
    
    newExportButton.oncontextmenu = (e) => {
        e.preventDefault();
        copyLyricsToClipboard();
    };

    // Cache the lyric line elements for performance
    cachedLyricLines = Array.from(lyricsDisplay.querySelectorAll('.lyric-line'));
}

function updateLyricHighlight() {
    // OPTIMIZATION: Skip if lyrics aren't visible
    if (compactMode === 'mini' || compactMode === 'compact') {
        return;
    }
    
    const currentTime = player.currentTime;
    
    if (cues.length === 0 || cachedLyricLines.length === 0) return;

    let activeLine = null;

    // Find the currently active cue/line using cached references
    for (let i = 0; i < cues.length; i++) {
        const cue = cues[i];
        if (currentTime >= cue.startTime && currentTime < cue.endTime) {
            activeLine = cachedLyricLines[i];
            break;
        }
    }

    // Update highlighting using cached references
    cachedLyricLines.forEach(line => line.classList.remove('active'));

    if (activeLine) {
        activeLine.classList.add('active');
        
        // Only scroll if the line is outside the visible area
        const lineRect = activeLine.getBoundingClientRect();
        const containerRect = lyricsDisplay.getBoundingClientRect();
        
        if (lineRect.top < containerRect.top || lineRect.bottom > containerRect.bottom) {
            const lineTop = activeLine.offsetTop;
            const lineHeight = activeLine.offsetHeight;
            const containerHeight = lyricsDisplay.clientHeight;
            const targetScroll = lineTop - (containerHeight / 2) + (lineHeight / 2);
            
            lyricsDisplay.scrollTo({ 
                top: targetScroll,
                behavior: 'smooth'
            });
        }
    }
}

// --- Lyrics Export Functions ---
function exportLyricsToText() {
    if (cues.length === 0 || currentTrackIndex === -1) {
        debugLog('No lyrics to export', 'warning');
        return;
    }
    
    const track = playlist[currentTrackIndex];
    const trackName = track.metadata?.title || track.file.name.split('.').slice(0, -1).join('.');
    const artist = track.metadata?.artist || 'Unknown Artist';
    
    // Build the lyrics text
    let lyricsText = `${trackName}\n`;
    lyricsText += `Artist: ${artist}\n`;
    lyricsText += `${'='.repeat(50)}\n\n`;
    
    cues.forEach((cue) => {
        const timestamp = formatTime(cue.startTime);
        lyricsText += `[${timestamp}] ${cue.text}\n`;
    });
    
    lyricsText += `\n${'='.repeat(50)}\n`;
    lyricsText += `Exported from Ultimate Local Music Player\n`;
    lyricsText += `${new Date().toLocaleString()}\n`;
    
    // Create and download file
    const blob = new Blob([lyricsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${trackName} - Lyrics.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    debugLog(`Lyrics exported: ${trackName}`, 'success');
}

function copyLyricsToClipboard() {
    if (cues.length === 0 || currentTrackIndex === -1) {
        debugLog('No lyrics to copy', 'warning');
        return;
    }
    
    // Build plain lyrics text (without timestamps)
    const lyricsText = cues.map(cue => cue.text).join('\n');
    
    // Copy to clipboard
    navigator.clipboard.writeText(lyricsText).then(() => {
        debugLog('Lyrics copied to clipboard', 'success');
        // Visual feedback
        exportLyricsButton.textContent = '✓ Copied!';
        setTimeout(() => {
            exportLyricsButton.textContent = '📥 Export';
        }, 2000);
    }).catch(err => {
        debugLog(`Failed to copy lyrics: ${err.message}`, 'error');
    });
}

// Export button event handlers
exportLyricsButton.onclick = (e) => {
    // Right-click or Ctrl+Click = Copy to clipboard
    if (e.ctrlKey) {
        e.preventDefault();
        copyLyricsToClipboard();
    } else {
        // Left-click = Download as file
        exportLyricsToText();
    }
};

// Prevent context menu on right-click
exportLyricsButton.oncontextmenu = (e) => {
    e.preventDefault();
    copyLyricsToClipboard();
};
        
        // --- Playlist Display Functions (User's Code) ---
 function renderPlaylist() {
    playlistItems.innerHTML = '';
    if (playlist.length === 0) {
        playlistItems.innerHTML = '<div class="empty-playlist">No tracks loaded yet. Click "Load Music & Lyrics" to get started!</div>';
        clearButton.disabled = true;
        return;
    }
    
    clearButton.disabled = false;
    playlist.forEach((track, index) => {
        const item = document.createElement('div');
        item.className = 'playlist-item';
        if (index === currentTrackIndex) {
            item.classList.add('playing');
        }
    
        const thumbnail = document.createElement('div');
        thumbnail.className = 'playlist-item-thumbnail';
        
        if (track.metadata?.image) {
            const img = document.createElement('img');
            img.src = track.metadata.image;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '5px';
            thumbnail.appendChild(img);
            thumbnail.classList.add('loaded');
        } else {
            thumbnail.innerHTML = '🎵';
        }
        
        const badges = [];
        if (track.vtt) badges.push('<span class="badge badge-lyrics">🎤 Lyrics</span>');
        if (track.metadata?.hasMetadata) badges.push('<span class="badge badge-metadata">🏷️ ID3</span>');
        
        const infoDiv = document.createElement('div');
        infoDiv.className = 'playlist-item-info';
        infoDiv.innerHTML = `
            <div class="playlist-item-title">${track.metadata?.title || track.fileName}</div>
            <div class="playlist-item-artist">${track.metadata?.artist || 'Unknown Artist'}</div>
            ${badges.length > 0 ? `<div class="playlist-item-badges">${badges.join('')}</div>` : ''}
        `;
        const numberDiv = document.createElement('div');
        numberDiv.className = 'playlist-item-number';
        numberDiv.textContent = index + 1;
        
        // Add edit button
        const editBtn = document.createElement('button');
        editBtn.className = 'playlist-item-edit-btn';
        editBtn.innerHTML = '✏️';
        editBtn.title = 'Edit Metadata';
        editBtn.onclick = (e) => {
            e.stopPropagation(); // Don't trigger track load
            openMetadataEditorForTrack(index);
        };
        
        item.appendChild(numberDiv);
        item.appendChild(thumbnail);
        item.appendChild(infoDiv);
        item.appendChild(editBtn);
        
        item.onclick = () => loadTrack(index);
        playlistItems.appendChild(item);
    });

    updatePlaylistSearch();
}

    const playlistSearch = document.getElementById('playlist-search');

playlistSearch.oninput = (e) => {
    const query = e.target.value.toLowerCase();
    const items = playlistItems.querySelectorAll('.playlist-item');
    
    items.forEach(item => {
        const title = item.querySelector('.playlist-item-title').textContent.toLowerCase();
        const artist = item.querySelector('.playlist-item-artist').textContent.toLowerCase();
        
        if (title.includes(query) || artist.includes(query)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
};

// Show search box when playlist has 10+ tracks
function updatePlaylistSearch() {
    if (playlist.length >= 10) {
        playlistSearch.style.display = 'block';
    } else {
        playlistSearch.style.display = 'none';
    }
}

// Call this in renderPlaylist()

        function updatePlaylistHighlight() {
            // ... (Your existing updatePlaylistHighlight logic here) ...
            const items = playlistItems.querySelectorAll('.playlist-item');
            items.forEach((item, index) => {
                if (index === currentTrackIndex) {
                    item.classList.add('playing');
                    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } else {
                    item.classList.remove('playing');
                }
            });
        }

    // Jump to Current Track button
const jumpToCurrentBtn = document.getElementById('jump-to-current');

if (jumpToCurrentBtn) {
    jumpToCurrentBtn.onclick = () => {
        const currentItem = playlistItems.querySelector('.playlist-item.playing');
        if (currentItem) {
            currentItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };
}

// Enable/disable based on whether track is playing
function updateJumpButton() {
    if (jumpToCurrentBtn) {
        jumpToCurrentBtn.disabled = currentTrackIndex === -1;
    }
}

        // --- Playlist Management (User's Code) ---
        function updatePlaylistStatus() {
            let loopText = 'Loop: Off';
            if (loopMode === 'all') loopText = 'Loop: All Tracks';
            if (loopMode === 'one') loopText = 'Loop: Current Track';
            const shuffleText = isShuffled ? 'Shuffle: ON' : 'Shuffle: Off';
            playlistStatus.textContent = `Tracks: ${playlist.length} | ${loopText} | ${shuffleText}`;
        }

      async function loadTrack(index) {
    if (index < 0 || index >= playlist.length) return;
    currentTrackIndex = index;
    const track = playlist[currentTrackIndex];
    
    debugLog(`=== Loading Track ${index + 1}/${playlist.length}: ${track.fileName} ===`);
    
    // Clear previous
    while (player.firstChild) {
        player.removeChild(player.firstChild);
    }
    // Note: We don't revoke the URL here anymore since it's stored in the playlist

    // Clear old cues
    cues = [];

    // Display metadata
    displayMetadata(track.metadata);

    // Load audio using stored URL
    player.src = track.audioURL;
    debugLog('Audio source set');

            // Load VTT with MANUAL parsing (fixes the cue loading issue)
if (track.vtt) {
    debugLog(`Loading VTT: ${track.vtt.name}`);
    
   
    
 // Read and parse the VTT file using VTTParser
    try {
        cues = await vttParser.loadVTTFile(track.vtt);
        if (cues.length > 0) {
            renderLyrics(cues);
        } else {
            lyricsDisplay.innerHTML = '<div class="lyric-line">No lyrics cues found in VTT file.</div>';
        }
    } catch (err) {
        debugLog(`Failed to load VTT: ${err.message}`, 'error');
        lyricsDisplay.innerHTML = '<div class="lyric-line">Error loading lyrics file.</div>';
    }
    
} else {
     lyricsDisplay.innerHTML = '<div class="lyric-line">No lyrics file found for this track.</div>';
     debugLog(`VTT file NOT found for ${track.fileName}.`, 'warning');
}

updatePlaylistHighlight();
prevButton.disabled = false;
nextButton.disabled = false;

// Start playback immediately (don't wait for lyrics)
player.load();
player.play().then(() => {
    // Setup visualizer on first play
    if (!audioContext) {
        setupAudioContext();
    } else if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}).catch(e => debugLog(`Playback prevented: ${e.message}`, 'warning'));

    updateMediaSession();
    updateJumpButton();  // ADD THIS
          // Update fullscreen lyrics if active
if (fullscreenLyricsActive) {
    renderFullscreenLyrics();
}
}

        // --- Media Session API (Hardware Controls Support) ---
        function updateMediaSession() {
            if (!('mediaSession' in navigator)) {
                debugLog('Media Session API not supported', 'warning');
                return;
            }
            
            if (currentTrackIndex === -1 || playlist.length === 0) {
                navigator.mediaSession.metadata = null;
                return;
            }
            
            const track = playlist[currentTrackIndex];
            const metadata = track.metadata;
            
            // Set metadata for lock screen / notification
            navigator.mediaSession.metadata = new MediaMetadata({
                title: metadata?.title || track.fileName,
                artist: metadata?.artist || 'Unknown Artist',
                album: metadata?.album || 'Unknown Album',
                artwork: metadata?.image ? [
                    { src: metadata.image, sizes: '512x512', type: 'image/jpeg' }
                ] : []
            });
            
            // Set action handlers for hardware controls
            navigator.mediaSession.setActionHandler('play', () => {
                player.play();
                debugLog('Media key: Play', 'success');
            });
            
            navigator.mediaSession.setActionHandler('pause', () => {
                player.pause();
                debugLog('Media key: Pause', 'success');
            });
            
            navigator.mediaSession.setActionHandler('previoustrack', () => {
                if (!prevButton.disabled) {
                    playPrevious();
                    debugLog('Media key: Previous', 'success');
                }
            });
            
            navigator.mediaSession.setActionHandler('nexttrack', () => {
                if (!nextButton.disabled) {
                    playNext();
                    debugLog('Media key: Next', 'success');
                }
            });
            
            navigator.mediaSession.setActionHandler('seekbackward', (details) => {
                const skipTime = details.seekOffset || 10;
                player.currentTime = Math.max(player.currentTime - skipTime, 0);
                debugLog(`Media key: Seek backward ${skipTime}s`, 'success');
            });
            
            navigator.mediaSession.setActionHandler('seekforward', (details) => {
                const skipTime = details.seekOffset || 10;
                player.currentTime = Math.min(player.currentTime + skipTime, player.duration);
                debugLog(`Media key: Seek forward ${skipTime}s`, 'success');
            });
            
            navigator.mediaSession.setActionHandler('seekto', (details) => {
                if (details.seekTime && player.duration) {
                    player.currentTime = details.seekTime;
                    debugLog(`Media key: Seek to ${details.seekTime}s`, 'success');
                }
            });
            
            // Update playback state
            navigator.mediaSession.playbackState = player.paused ? 'paused' : 'playing';
            
            debugLog('Media Session updated for hardware controls', 'success');
        }

        function playNext() {
            // ... (Your existing playNext logic here) ...
            if (currentTrackIndex === -1 || playlist.length === 0) return;

            if (currentTrackIndex < playlist.length - 1) {
                loadTrack(currentTrackIndex + 1);
            } else if (loopMode === 'all') {
                loadTrack(0);
            } else {
                player.pause();
                trackTitle.textContent = "Playlist finished";
                debugLog('Playlist finished');
                updateLyricHighlight(); // Clear final active line
            }
        }

        function playPrevious() {
            // ... (Your existing playPrevious logic here) ...
            if (currentTrackIndex === -1 || playlist.length === 0) return;
            if (currentTrackIndex > 0) {
                loadTrack(currentTrackIndex - 1);
            } else if (loopMode === 'all') {
                loadTrack(playlist.length - 1);
            }
        }

        // --- Custom Controls Handlers (NEW) ---
        
        const updateProgressBar = (e) => {
            const rect = progressContainer.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            let percent = clickX / rect.width;
            percent = Math.max(0, Math.min(1, percent));
            
            const newTime = percent * player.duration;
            progressBar.style.width = `${percent * 100}%`;
            currentTimeDisplay.textContent = formatTime(newTime);
            return newTime;
        };

// Enhanced seek handling with error recovery
let seekDebounce = null;
progressContainer.onmousedown = (e) => {
    clearTimeout(seekDebounce);
    
    isSeekingProg = true;
    const wasPlaying = !player.paused;
    
    // Pause playback during seek
    player.pause();
    
    // Debounced resume
    seekDebounce = setTimeout(() => {
        if (wasPlaying) {
            player.play().catch(err => {
                debugLog(`Error resuming after seek: ${err.message}`, 'error');
                // Retry once after short delay
                setTimeout(() => {
                    player.play().catch(e => debugLog(`Retry failed: ${e.message}`, 'error'));
                }, 200);
            });
        }
    }, SEEK_DEBOUNCE_DELAY_MS);
};

document.onmousemove = (e) => {
    if (!isSeekingProg) return;
    const newTime = updateProgressBar(e);
    if (newTime === null) {
        debugLog('Ignoring invalid seek attempt', 'warning');
    }
};

document.onmouseup = (e) => {
    if (!isSeekingProg) return;
    isSeekingProg = false;
    
    const newTime = updateProgressBar(e);
    
    if (newTime !== null && !isNaN(newTime)) {
        try {
            player.currentTime = newTime;
            debugLog(`Seeked to ${formatTime(newTime)}`, 'info');
        } catch (err) {
            debugLog(`Seek failed: ${err.message}`, 'error');
            // Reset to current position
            progressBar.style.width = `${(player.currentTime / player.duration) * 100}%`;
        }
    }
    
    player.play().catch(err => {
        debugLog(`Error resuming playback: ${err.message}`, 'warning');
    });
};


        // --- Event Handlers ---
        loadButton.onclick = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*,.vtt';
    input.multiple = true;
    
    // Android fix: add to DOM temporarily
    input.style.display = 'none';
    document.body.appendChild(input);
    
    input.onchange = (e) => {
        handleFileLoad(e);
        document.body.removeChild(input);
    };
    
    // Android fix: small delay before click
    setTimeout(() => input.click(), 100);
};
        
        // Drag and Drop implementation (NEW)
        document.body.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.style.display = 'flex';
        });

        document.body.addEventListener('dragleave', (e) => {
            if (e.clientX === 0 && e.clientY === 0) { // Check to ensure it's not a browser event leaving window
                dropZone.style.display = 'none';
            }
        });

        document.body.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.style.display = 'none';
            
            const files = Array.from(e.dataTransfer.files);
            handleFileLoad({ target: { files: files } });
        });
        
// ✅ FIXED: Consolidated file loading logic
window.handleFileLoad = async function handleFileLoad(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    debugLog(`=== Loading ${files.length} files ===`);
    playlistStatus.textContent = 'Loading files and extracting metadata...';
    
    const audioFiles = files.filter(f => 
        f.type.startsWith('audio/') || 
        f.name.toLowerCase().match(/\.(mp3|wav|ogg|m4a|flac|aac|wma)$/)
    );
    const vttFiles = files.filter(f => f.name.toLowerCase().endsWith('.vtt'));
    
    debugLog(`Found ${audioFiles.length} audio files and ${vttFiles.length} VTT files`);

    // Validate VTT files
    for (const vtt of vttFiles) {
        const validation = await vttParser.validateVTT(vtt);
        if (!validation.valid) {
            debugLog(`VTT file "${vtt.name}" is invalid: ${validation.reason}`, 'error');
        }
    }
    
    // Build playlist
    playlist = [];
    
    // ✅ FIXED: Loop through audioFiles and find matching VTT for each one
    for (const audioFile of audioFiles) {
        const baseName = audioFile.name.split('.').slice(0, -1).join('.');
        
        // ✅ FIXED: Define matchingVtt INSIDE the loop for each audio file
        const matchingVtt = vttFiles.find(vtt => {
            const vttBaseName = vtt.name.split('.').slice(0, -1).join('.');
            return vttBaseName === baseName;
        });
        
        if (matchingVtt) {
            debugLog(`✓ Matched: ${audioFile.name} ⟷ ${matchingVtt.name}`, 'success');
        }
        
        // Extract metadata from file
        let metadata = await metadataParser.extractMetadata(audioFile);
        
        // Check if we have custom metadata for this file
        const customMeta = customMetadataStore.get(audioFile.name, audioFile.size);
        if (customMeta) {
            // Merge custom metadata (custom takes priority)
            metadata = {
                ...metadata,
                ...customMeta,
                image: metadata.image || customMeta.image, // Keep original image
                hasMetadata: true,
                isCustom: true
            };
            debugLog(`✏️ Using custom metadata for: ${audioFile.name}`, 'info');
        }

        // Create audio element to get duration
        const tempAudio = new Audio();
        tempAudio.src = URL.createObjectURL(audioFile);
        const duration = await new Promise(resolve => {
            const timeout = setTimeout(() => {
                resolve(0);
                URL.revokeObjectURL(tempAudio.src);
            }, 5000);
            
            tempAudio.addEventListener('loadedmetadata', () => {
                clearTimeout(timeout);
                resolve(tempAudio.duration);
                URL.revokeObjectURL(tempAudio.src);
            });
            tempAudio.addEventListener('error', () => {
                clearTimeout(timeout);
                resolve(0);
            });
        });

        const audioURL = URL.createObjectURL(audioFile);

        // ✅ FIXED: Now matchingVtt is defined in this scope
        playlist.push({ 
            audioURL: audioURL,
            fileName: audioFile.name,
            vtt: matchingVtt || null,  // ✅ This works now!
            metadata: metadata || {
                title: audioFile.name.split('.')[0],
                artist: 'Unknown Artist',
                album: 'Unknown Album',
                image: null,
                hasMetadata: false
            },
            duration: duration
        });
    }

    if (playlist.length > 0) {
        debugLog(`Playlist created with ${playlist.length} tracks`, 'success');
        currentTrackIndex = 0;
        updatePlaylistStatus();
        renderPlaylist();
        
        // Wait for DOM to render, THEN load track
        setTimeout(() => {
            loadTrack(0);
        }, 150);
        
        prevButton.disabled = false;
        nextButton.disabled = false;
        shuffleButton.disabled = false;
        loopButton.disabled = false;
        
        // Save playlist to localStorage
        savePlaylistToStorage();
    }
};

        // --- Playlist Persistence Functions ---
        function savePlaylistToStorage() {
            try {
                const playlistData = playlist.map(track => ({
                    fileName: track.fileName,
                    metadata: {
                        title: track.metadata?.title,
                        artist: track.metadata?.artist,
                        album: track.metadata?.album,
                        hasMetadata: track.metadata?.hasMetadata,
                        // Note: We can't save blob URLs (they expire), so album art won't persist
                    },
                    hasVTT: !!track.vtt,
                    vttFileName: track.vtt?.name || null
                }));
                
                localStorage.setItem('savedPlaylist', JSON.stringify(playlistData));
                localStorage.setItem('playlistTimestamp', Date.now().toString());
                debugLog(`Playlist saved: ${playlistData.length} tracks`, 'success');
            } catch (error) {
                debugLog(`Failed to save playlist: ${error.message}`, 'error');
            }
        }

        function loadPlaylistFromStorage() {
            try {
                const savedData = localStorage.getItem('savedPlaylist');
                const timestamp = localStorage.getItem('playlistTimestamp');
                
                if (!savedData) {
                    debugLog('No saved playlist found', 'info');
                    return null;
                }
                
                const playlistData = JSON.parse(savedData);
                const savedDate = new Date(parseInt(timestamp));
                
                debugLog(`Found saved playlist from ${savedDate.toLocaleString()}: ${playlistData.length} tracks`, 'info');
                return playlistData;
            } catch (error) {
                debugLog(`Failed to load playlist: ${error.message}`, 'error');
                return null;
            }
        }

        function displaySavedPlaylist(playlistData) {
            // Clear current playlist display
            playlistItems.innerHTML = '';
            
            const header = document.createElement('div');
            header.style.textAlign = 'center';
            header.style.padding = '20px';
            header.style.color = '#ffc107';
            header.innerHTML = `
                <div style="font-size: 1.2em; margin-bottom: 10px;">📋 Saved Playlist Found</div>
                <div style="color: #888; font-size: 0.9em; margin-bottom: 15px;">
                    ${playlistData.length} tracks from previous session
                </div>
                <div style="color: #aaa; font-size: 0.85em; margin-bottom: 20px;">
                    Load the same audio files to continue where you left off
                </div>
            `;
            playlistItems.appendChild(header);
            
            // Display saved tracks
            playlistData.forEach((track, index) => {
                const item = document.createElement('div');
                item.className = 'playlist-item';
                item.style.opacity = '0.6';
                item.style.cursor = 'default';
                
                const numberDiv = document.createElement('div');
                numberDiv.className = 'playlist-item-number';
                numberDiv.textContent = index + 1;
                
                const thumbnail = document.createElement('div');
                thumbnail.className = 'playlist-item-thumbnail';
                thumbnail.innerHTML = '🎵';
                
                const badges = [];
                if (track.hasVTT) badges.push('<span class="badge badge-lyrics">🎤 Lyrics</span>');
                if (track.metadata?.hasMetadata) badges.push('<span class="badge badge-metadata">📝 ID3</span>');
                
                const infoDiv = document.createElement('div');
                infoDiv.className = 'playlist-item-info';
                infoDiv.innerHTML = `
                    <div class="playlist-item-title">${track.metadata?.title || track.fileName}</div>
                    <div class="playlist-item-artist">${track.metadata?.artist || 'Unknown Artist'}</div>
                    ${badges.length > 0 ? `<div class="playlist-item-badges">${badges.join('')}</div>` : ''}
                    <div style="color: #666; font-size: 0.75em; margin-top: 5px;">⚠️ File not loaded</div>
                `;

                // NEW: Add duration if available
    if (track.duration) {
        const durationSpan = document.createElement('span');
        durationSpan.className = 'playlist-item-duration';
        durationSpan.textContent = formatTime(track.duration);
        durationSpan.style.color = '#666';
        durationSpan.style.fontSize = '0.8em';
        durationSpan.style.marginTop = '3px';
        infoDiv.appendChild(durationSpan);
    }
                
                item.appendChild(numberDiv);
                item.appendChild(thumbnail);
                item.appendChild(infoDiv);
                
                playlistItems.appendChild(item);
            });
            
            playlistStatus.textContent = `Saved playlist: ${playlistData.length} tracks (load files to play)`;
        }

        function clearSavedPlaylist() {
            localStorage.removeItem('savedPlaylist');
            localStorage.removeItem('playlistTimestamp');
            debugLog('Saved playlist cleared from storage', 'info');
        }

        clearButton.onclick = () => {
    if (confirm('Clear entire playlist? This will stop playback and remove all loaded tracks.')) {
        // Revoke all blob URLs to free memory
        playlist.forEach(track => {
            if (track.audioURL) {
                URL.revokeObjectURL(track.audioURL);
            }
            if (track.metadata?.image?.startsWith('blob:')) {
                URL.revokeObjectURL(track.metadata.image);
            }
        });
        
        playlist = [];
        currentTrackIndex = -1;
        player.pause();
        player.src = '';
        clearMetadata();
        renderPlaylist();
        updatePlaylistStatus();
        prevButton.disabled = true;
        updateJumpButton();
        nextButton.disabled = true;
        shuffleButton.disabled = true;
        loopButton.disabled = true;
        cachedLyricLines = [];
        updateJumpButton();
        
        // Clear saved playlist from storage
        clearSavedPlaylist();
        
        debugLog('Playlist cleared (memory freed)', 'warning');
    }
};

    player.addEventListener('error', () => {
       if (currentTrackIndex === -1 || !playlist[currentTrackIndex]) return;
       const trackInfo = playlist[currentTrackIndex];
       const errorInfo = errorRecovery.handleAudioError(player, trackInfo);
       
       if (errorInfo && !errorInfo.hasRecovery) {
           alert(`Cannot play this track: ${errorInfo.errorMessage}`);
       }
   });
        
        player.addEventListener('ended', () => {
            if (loopMode === 'one') {
                debugLog('Looping current track');
                player.currentTime = 0;
                player.play();
            } else {
               playNext();
            }
        });
        
        // Visualizer control events
        player.addEventListener('play', () => {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    // OPTIMIZATION: Notify performance manager
    perfManager.setPlayState(true);
    
    // Restart visualizer when playing
    if (!visualizerAnimationId) {
        startVisualizer();
    }
    updateMediaSession();
});
        
       player.addEventListener('pause', () => {
    if (audioContext && audioContext.state === 'running') {
        audioContext.suspend();
    }
    
    // OPTIMIZATION: Notify performance manager
    perfManager.setPlayState(false);
    
    // Visualizer will auto-stop in next frame due to paused check
    updateMediaSession();
});

        // Time and Progress Updates (NEW)
        player.addEventListener('loadedmetadata', () => {
            durationDisplay.textContent = formatTime(player.duration);
        });

player.addEventListener('timeupdate', () => {
    if (isSeekingProg) return;
    
    // OPTIMIZED: Use performance manager for adaptive frame rates
    if (perfManager.shouldUpdate('progress')) {
        const percent = (player.currentTime / player.duration) * 100;
        progressBar.style.width = `${percent}%`;
        currentTimeDisplay.textContent = formatTime(player.currentTime);
    }
    
    if (perfManager.shouldUpdate('lyrics')) {
        updateLyricHighlight();
    }
});


        prevButton.onclick = playPrevious;
        nextButton.onclick = playNext;

        shuffleButton.onclick = () => {
    if (playlist.length <= 1) return;
    isShuffled = !isShuffled;
    
    if (isShuffled) {
        debugLog('Shuffle enabled', 'success');
        
        // Get the currently playing track
        const currentTrack = playlist[currentTrackIndex];
        
        // Shuffle the playlist
        shuffleArray(playlist);
        
        // Find where the current track ended up after shuffle
        currentTrackIndex = playlist.findIndex(track => track === currentTrack);
        
        shuffleButton.classList.add('active');
        renderPlaylist();
    } else {
        debugLog('Shuffle disabled');
        shuffleButton.classList.remove('active');
    }
    updatePlaylistStatus();
};

        loopButton.onclick = () => {
            // ... (Your existing loopButton logic here) ...
            if (loopMode === 'off') {
                loopMode = 'all';
                loopButton.textContent = '🔁 Loop All';
                loopButton.classList.add('active');
                debugLog('Loop mode: All tracks', 'success');
            } else if (loopMode === 'all') {
                loopMode = 'one';
                loopButton.textContent = '🔂 Loop One';
                loopButton.classList.remove('active');
                loopButton.classList.add('loop-one');
                debugLog('Loop mode: Current track', 'success');
            } else {
                loopMode = 'off';
                loopButton.textContent = '🔁 Loop Off';
                loopButton.classList.remove('loop-one');
                debugLog('Loop mode: Off');
            }
            updatePlaylistStatus();
        };
        
        // Keyboard shortcuts (User's Code)
        document.addEventListener('keydown', (e) => {
            // Ignore if typing in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch(e.key) {
                case ' ':
                    e.preventDefault();
                    if (player.paused) player.play();
                    else player.pause();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    if (player.duration) player.currentTime += 5; // Skip 5 seconds
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    if (player.duration) player.currentTime -= 5; // Rewind 5 seconds
                    break;
                case 'n':
                case 'N':
                    e.preventDefault();
                    if (!nextButton.disabled) playNext();
                    break;
                case 'p':
                case 'P':
                    e.preventDefault();
                    if (!prevButton.disabled) playPrevious();
                    break;
                case 'm':
case 'M':
    if (player.muted) {
        player.muted = false;
        player.volume = lastVolume;
        volumeSlider.value = lastVolume;
    } else {
        lastVolume = player.volume;
        player.muted = true;
    }
    updateVolumeUI();
    break;
                case 'c':
                case 'C':
                    e.preventDefault();
                    compactToggle.click();
                    break;

         case 's':
                case 'S':
                    e.preventDefault();
                    stickyToggle.click();
                    break;
                case 'f':
                case 'F':
                    e.preventDefault();
                    if (pipToggle && !pipToggle.disabled) pipToggle.click();
                    break;
            
                case 'o':
case 'O':
    e.preventDefault();
    if (folderButton && !folderButton.disabled) folderButton.click();
    break;
                }
        });


// Folder Selection Button Handler (ENHANCED WITH PERSISTENCE)
const folderButton = document.getElementById('folder-button');

folderButton.onclick = async () => {
    // Check if File System Access API is supported
    if (!('showDirectoryPicker' in window)) {
        alert('⚠️ Your browser doesn\'t support folder access.\n\nPlease use:\n• Chrome 86+\n• Edge 86+\n• Opera 72+\n\nOr use the regular "Load Music & Lyrics" button.');
        return;
    }
    
    try {
        // If we already have a folder, reload it
        if (folderHandle) {
            debugLog('Reloading from existing folder...', 'info');
            await loadFromFolder();
            return;
        }
        
        debugLog('Requesting folder access...', 'info');
        
        // Ask user to select a folder
        folderHandle = await window.showDirectoryPicker({
            mode: 'read',
            startIn: 'music'
        });
        
        debugLog(`Folder selected: ${folderHandle.name}`, 'success');
        
        // Save the folder handle for next time
        await saveFolderHandle(folderHandle);
        
        // Update button to show folder is selected
        folderButton.textContent = `📁 ${folderHandle.name} (Click to reload)`;
        folderButton.classList.add('active');
                
        // Update button visibility
        updateFolderButtons();
        
        // Immediately load files from the folder
        await loadFromFolder();
        
    } catch (err) {
        if (err.name === 'AbortError') {
            debugLog('Folder selection cancelled', 'info');
        } else {
            debugLog(`Folder selection failed: ${err.message}`, 'error');
            alert(`Failed to access folder: ${err.message}`);
        }
    }
};

    // Clear Folder Button Handler
const clearFolderButton = document.getElementById('clear-folder-button');

clearFolderButton.onclick = async () => {
    if (confirm('Forget the saved music folder? You\'ll need to select it again next time.')) {
        try {
            const db = await openDB();
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            await store.delete('musicFolder');
            
            localStorage.removeItem('hasSavedFolder');
            folderHandle = null;
            
            folderButton.textContent = '📁 Select Music Folder';
            folderButton.classList.remove('active');
            clearFolderButton.style.display = 'none';
            
            debugLog('Folder forgotten', 'success');
        } catch (err) {
            debugLog(`Error clearing folder: ${err.message}`, 'error');
        }
    }
};

// Show/hide clear button based on folder state
function updateFolderButtons() {
    if (folderHandle) {
        clearFolderButton.style.display = 'inline-block';
    } else {
        clearFolderButton.style.display = 'none';
    }
}

// Call this whenever folder state changes

// NEW: Function to Load Files from Selected Folder
async function loadFromFolder() {
    if (!folderHandle) {
        alert('No folder selected. Please click "Select Music Folder" first.');
        return;
    }
    
    try {
        debugLog('Scanning folder for music files...', 'info');
        playlistStatus.textContent = 'Scanning folder...';
        
        const audioFiles = [];
        const vttFiles = [];
        
        // Scan through all files in the folder
        for await (const entry of folderHandle.values()) {
            if (entry.kind === 'file') {
                const file = await entry.getFile();
                
                // Check if it's an audio file
                if (file.type.startsWith('audio/') || 
                    file.name.toLowerCase().match(/\.(mp3|wav|ogg|m4a|flac|aac|wma)$/)) {
                    audioFiles.push(file);
                    debugLog(`Found audio: ${file.name}`, 'success');
                }
                
                // Check if it's a VTT file
                if (file.name.toLowerCase().endsWith('.vtt')) {
                    vttFiles.push(file);
                    debugLog(`Found lyrics: ${file.name}`, 'success');
                }
            }
        }
        
        if (audioFiles.length === 0) {
            alert('No audio files found in this folder!\n\nSupported formats: MP3, WAV, OGG, M4A, FLAC, AAC, WMA');
            playlistStatus.textContent = 'No audio files found';
            return;
        }
        
        debugLog(`Found ${audioFiles.length} audio files and ${vttFiles.length} VTT files`, 'success');
        
        // IMPORTANT: Stop current playback before reloading
        player.pause();
        player.src = '';
        currentTrackIndex = -1;
        
        // Use the existing handleFileLoad logic
        const fakeEvent = {
            target: {
                files: [...audioFiles, ...vttFiles]
            }
        };
        
        await handleFileLoad(fakeEvent);
        
        debugLog('Folder loaded successfully!', 'success');
        
    } catch (err) {
        debugLog(`Error loading folder: ${err.message}`, 'error');
        alert(`Failed to load folder: ${err.message}\n\nTry selecting the folder again.`);
        playlistStatus.textContent = 'Failed to load folder';
    }
}
        
       // --- Volume Control System ---
const volumeSlider = document.getElementById('volume-slider');
const volumeIcon = document.getElementById('volume-icon');
const volumePercentage = document.getElementById('volume-percentage');

// Load saved volume
const savedVolume = localStorage.getItem('playerVolume');
if (savedVolume) {
    player.volume = parseFloat(savedVolume);
    volumeSlider.value = player.volume;
} else {
    player.volume = 1;
    volumeSlider.value = 1;
}

// Update UI function
function updateVolumeUI() {
    const volume = player.volume;
    const percent = Math.round(volume * 100);
    
    // Update percentage display
    volumePercentage.textContent = `${percent}%`;
    
    // Update slider track color (for webkit browsers)
    volumeSlider.style.setProperty('--volume-percent', `${percent}%`);
    
    // Update icon based on volume level
    if (player.muted || volume === 0) {
        volumeIcon.textContent = '🔇';
    } else if (volume < 0.3) {
        volumeIcon.textContent = '🔈';
    } else if (volume < 0.7) {
        volumeIcon.textContent = '🔉';
    } else {
        volumeIcon.textContent = '🔊';
    }
    
    debugLog(`Volume: ${percent}%${player.muted ? ' (Muted)' : ''}`);
}

// Slider input handler
volumeSlider.oninput = (e) => {
    const newVolume = parseFloat(e.target.value);
    player.volume = newVolume;
    if (player.muted && newVolume > 0) {
        player.muted = false;
    }
    updateVolumeUI();
};

    volumeSlider.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05; // Scroll down = quieter, up = louder
    const newVolume = Math.max(0, Math.min(1, player.volume + delta));
    player.volume = newVolume;
    volumeSlider.value = newVolume;
    if (player.muted && newVolume > 0) {
        player.muted = false;
    }
    updateVolumeUI();
});

// Icon click to mute/unmute
volumeIcon.onclick = () => {
    if (player.muted) {
        player.muted = false;
        player.volume = lastVolume;
        volumeSlider.value = lastVolume;
    } else {
        lastVolume = player.volume;
        player.muted = true;
    }
    updateVolumeUI();
};

// Save volume changes (debounced)
let volumeSaveTimeout;
player.addEventListener('volumechange', () => {
    // Update UI immediately for responsiveness
    const volume = player.volume;
    const percent = Math.round(volume * 100);
    volumePercentage.textContent = `${percent}%`;
    volumeSlider.style.setProperty('--volume-percent', `${percent}%`);
    
    // Update icon based on volume level
    if (player.muted || volume === 0) {
        volumeIcon.textContent = '🔇';
    } else if (volume < 0.3) {
        volumeIcon.textContent = '🔈';
    } else if (volume < 0.7) {
        volumeIcon.textContent = '🔉';
    } else {
        volumeIcon.textContent = '🔊';
    }
    
    // Debounce localStorage writes and debug logs
    clearTimeout(volumeSaveTimeout);
    volumeSaveTimeout = setTimeout(() => {
        localStorage.setItem('playerVolume', player.volume);
        debugLog(`Volume: ${percent}%${player.muted ? ' (Muted)' : ''}`);
    }, 500);
});
        
        // Initial setup
        window.addEventListener('load', async () => {
            // Auto-reload checkbox setup
const autoReloadCheck = document.getElementById('auto-reload-check');
const autoReloadLabel = document.getElementById('auto-reload-label');

// Load preference
const autoReload = localStorage.getItem('autoReloadFolder') !== 'false';
autoReloadCheck.checked = autoReload;

// Show checkbox if folder is saved
if (localStorage.getItem('hasSavedFolder') === 'true') {  // ✅ CORRECT!
    autoReloadLabel.style.display = 'inline-block';
}

// Save preference on change
autoReloadCheck.onchange = () => {
    localStorage.setItem('autoReloadFolder', autoReloadCheck.checked);
};
    // NEW: Check if we have a saved folder and auto-load it
// NEW: Check if we have a saved folder and auto-load it
if (autoReload && localStorage.getItem('hasSavedFolder') === 'true') {
    debugLog('Checking for saved folder...', 'info');
    
    try {
        const savedHandle = await loadFolderHandle();
        
        if (savedHandle) {
            debugLog(`Found saved folder: ${savedHandle.name}`, 'info');
            
            // Verify we still have permission
            const hasPermission = await verifyFolderPermission(savedHandle);
            
            if (hasPermission) {
                folderHandle = savedHandle;
                folderButton.textContent = `📁 ${folderHandle.name} (Click to reload)`;
                folderButton.classList.add('active');
                
                // Update button visibility
                updateFolderButtons();
                
                // Auto-load the files with delay
                debugLog('Auto-loading music from saved folder...', 'success');
                
                // CRITICAL: Add delay to prevent race conditions
                setTimeout(async () => {
                    await loadFromFolder();
                }, 500);
                
            } else {
                debugLog('Permission denied for saved folder', 'warning');
                localStorage.removeItem('hasSavedFolder');
                
                // Show a notification
                playlistStatus.textContent = `Previous folder "${savedHandle.name}" needs permission - click "📁 Select Music Folder" to reload`;
            }
        }
    } catch (err) {
        debugLog(`Error loading saved folder: ${err.message}`, 'error');
        localStorage.removeItem('hasSavedFolder');
    }
}
            
    if (typeof jsmediatags !== 'undefined') {
        debugLog('✅ jsmediatags library loaded successfully', 'success');
    } else {
        debugLog('⚠️ jsmediatags library not available - using manual parser', 'warning');
    }
    
    // ADD THESE CHECKS:
    console.log('PiP supported?', document.pictureInPictureEnabled);
    console.log('PiP button disabled?', pipToggle.disabled);
    console.log('PiP button onclick:', pipToggle.onclick ? 'attached' : 'NOT ATTACHED');
    
            // Check for saved playlist
            const savedPlaylist = loadPlaylistFromStorage();
            if (savedPlaylist && savedPlaylist.length > 0) {
                displaySavedPlaylist(savedPlaylist);
            }
            
            // Check if player can be played (e.g. if muted)
            player.play().catch(e => debugLog(`Autoplay blocked: ${e.message}`, 'warning'));
        });

      // --- Page Visibility Optimization ---
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden - pause expensive operations
        debugLog('Page hidden - reducing CPU usage', 'info');
        stopVisualizer();
        
        // Suspend audio context if not playing
        if (audioContext && audioContext.state === 'running' && player.paused) {
            audioContext.suspend();
        }
    } else {
        // Page is visible again
        debugLog('Page visible - resuming', 'info');
        
        // Resume visualizer only if playing and in full mode
        if (!player.paused && perfManager.shouldRunVisualizer() && !visualizerAnimationId) {
            startVisualizer();
        }
        
        // Resume audio context if needed
        if (audioContext && audioContext.state === 'suspended' && !player.paused) {
            audioContext.resume();
        }
    }
});
        
// --- Advanced Compact Mode System ---
        const compactToggle = document.getElementById('compact-toggle');
        
        // Elements to control
        const compactElements = {
            visualizer: document.getElementById('player-wrapper'),
            eq: document.getElementById('equalizer-control'),
            lyrics: document.getElementById('lyrics-display'),
            playlist: document.getElementById('playlist-container'),
            volume: document.getElementById('volume-control'),
            progress: document.getElementById('custom-progress-container'),
            time: document.getElementById('time-display')
        };
        
function setCompactMode(mode) {
    debugLog(`Switching to ${mode} mode`, 'info');
    compactMode = mode;
    
    // OPTIMIZATION: Notify performance manager
    perfManager.setMode(mode);
    
    // Show temporary indicator
    const indicator = document.getElementById('mode-indicator');
            if (indicator) {
                const modeNames = {
                    'full': '📐 Full View',
                    'compact': '📐 Compact Mode',
                    'mini': '📐 Mini Mode'
                };
                
                indicator.textContent = modeNames[mode];
                indicator.style.display = 'block';
                indicator.style.opacity = '1';
                
                // Fade out after 2 seconds
                setTimeout(() => {
                    indicator.style.opacity = '0';
                    setTimeout(() => indicator.style.display = 'none', 300);
                }, 2000);
            }
            
            // Remove all mode classes
            document.body.classList.remove('compact-mode', 'mini-mode');
            compactToggle.classList.remove('compact', 'mini');
            
            switch(mode) {
                case 'full':
    // Show everything
    Object.values(compactElements).forEach(el => {
        if (el) {
            el.classList.remove('compact-hidden');
            el.style.display = '';
        }
    });
    
    compactToggle.textContent = '🔍 Full View';
    visualizerEnabled = true; // Enable visualizer
                    
                    compactToggle.textContent = '📐 Full View';
                    
                    // Restart visualizer if enabled and playing
                    if (visualizerEnabled && !player.paused) {
                        startVisualizer();
                    }
                    
                    debugLog('Full view: All features visible', 'success');
                    break;
                    
                case 'compact':
    document.body.classList.add('compact-mode');
    compactToggle.classList.add('compact');
                    
                    if (compactElements.visualizer) compactElements.visualizer.classList.add('compact-hidden');
                    if (compactElements.eq) compactElements.eq.classList.add('compact-hidden');
                    if (compactElements.lyrics) compactElements.lyrics.classList.add('compact-hidden');
                    visualizerEnabled = false; // Disable visualizer
    stopVisualizer();
                    
                    // Show everything else
                    if (compactElements.playlist) compactElements.playlist.classList.remove('compact-hidden');
                    if (compactElements.volume) compactElements.volume.classList.remove('compact-hidden');
                    if (compactElements.progress) compactElements.progress.classList.remove('compact-hidden');
                    if (compactElements.time) compactElements.time.classList.remove('compact-hidden');
                    
                   compactToggle.textContent = '📐 Compact';
    debugLog('Compact mode: Player essentials only', 'success');
    break;
                    
               case 'mini':
    document.body.classList.add('mini-mode');
    compactToggle.classList.add('mini');
    
    visualizerEnabled = false; // Disable visualizer
                    
                    Object.entries(compactElements).forEach(([key, el]) => {
                        if (el && key !== 'progress') { // Keep progress bar
                            el.classList.add('compact-hidden');
                        }
                    });
                    
                    // Keep progress bar visible in mini mode
                    if (compactElements.progress) compactElements.progress.classList.remove('compact-hidden');
                    
                    compactToggle.textContent = '📐 Mini';
                    
                    stopVisualizer();
                    debugLog('Mini mode: Now playing only (saves maximum CPU)', 'success');
                    break;
            }
            
            // Save preference
            localStorage.setItem('compactMode', mode);
        }
        
        // Cycle through modes
        compactToggle.onclick = () => {
            const modes = ['full', 'compact', 'mini'];
            const currentIndex = modes.indexOf(compactMode);
            const nextMode = modes[(currentIndex + 1) % modes.length];
            setCompactMode(nextMode);
        };
        
        // Load saved preference
        const savedCompactMode = localStorage.getItem('compactMode');
        if (savedCompactMode && ['full', 'compact', 'mini'].includes(savedCompactMode)) {
            setCompactMode(savedCompactMode);
        }

// --- Picture-in-Picture Mode (Chrome OS COMPLETE FIX) ---
let pipWindow = null;
let pipCanvas = null;
let pipAnimationId = null;
let currentPipVideo = null;

// PiP Support Check
if (!document.pictureInPictureEnabled) {
    pipToggle.disabled = true;
    pipToggle.title = 'Picture-in-Picture not supported in this browser';
    debugLog('Picture-in-Picture not supported', 'warning');
} else {
    pipToggle.onclick = async () => {
        console.log('PiP button clicked - Chrome OS Complete Fix');

        try {
            if (currentTrackIndex === -1 || playlist.length === 0) {
                alert('Please load a track first!');
                return;
            }

            // EXIT MODE
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
                cleanupPip();
                return;
            }

            // ENTER MODE - Try multiple approaches
            if (!player.src) {
                alert('Please load and play a track first!');
                return;
            }

            debugLog('Starting PiP activation sequence...', 'info');

            // Strategy 1: Try main video element first (most reliable)
            try {
                await attemptMainVideoPip();
                return; // Success!
            } catch (mainError) {
                debugLog(`Main video PiP failed: ${mainError.message}`, 'warning');
            }

            // Strategy 2: Try fallback with custom video
            try {
                await attemptFallbackPip();
                return; // Success!
            } catch (fallbackError) {
                debugLog(`Fallback PiP failed: ${fallbackError.message}`, 'warning');
            }

            // Strategy 3: Final attempt with audio-only minimal approach
            try {
                await attemptAudioOnlyPip();
                return; // Success!
            } catch (audioError) {
                debugLog(`Audio-only PiP failed: ${audioError.message}`, 'error');
                throw new Error('All PiP methods failed. Please try playing the track for a few seconds first.');
            }

        } catch (err) {
            debugLog(`All PiP methods failed: ${err.message}`, 'error');
            alert(`Picture-in-Picture failed: ${err.message}`);
        }
    };

    // STRATEGY 1: Use main video element
    async function attemptMainVideoPip() {
        debugLog('Attempting PiP with main video element...', 'info');
        
        const mainVideo = document.getElementById('audio-player');
        
        if (!mainVideo.src) {
            throw new Error('No audio source loaded');
        }

        // Ensure video is ready
        if (mainVideo.readyState < 1) {
            // Force load if needed
            mainVideo.load();
            await new Promise(resolve => {
                const onCanPlay = () => {
                    mainVideo.removeEventListener('canplay', onCanPlay);
                    resolve();
                };
                mainVideo.addEventListener('canplay', onCanPlay);
                setTimeout(resolve, 2000); // Timeout after 2 seconds
            });
        }

        await mainVideo.requestPictureInPicture();
        currentPipVideo = mainVideo;
        
        pipToggle.textContent = '📺 Unfloat';
        document.body.classList.add('pip-active');
        debugLog('Main video PiP activated successfully', 'success');
        
        setupPipVisualizer();
    }

    // STRATEGY 2: Fallback with custom video
    async function attemptFallbackPip() {
        debugLog('Attempting fallback PiP...', 'info');
        
        const fallbackVideo = document.createElement('video');
        fallbackVideo.style.display = 'none';
        fallbackVideo.muted = true; // Critical for Chrome OS
        fallbackVideo.playsInline = true;
        document.body.appendChild(fallbackVideo);
        
        // Create a simple video stream
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        
        // Draw initial frame with track info
        drawPipFrame(ctx, canvas.width, canvas.height, true);
        
        const stream = canvas.captureStream(5); // Low FPS for stability
        fallbackVideo.srcObject = stream;
        
        // Wait for metadata with robust error handling
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                cleanupVideo(fallbackVideo);
                reject(new Error('Timeout waiting for video metadata'));
            }, 5000);
            
            fallbackVideo.addEventListener('loadedmetadata', () => {
                clearTimeout(timeout);
                resolve();
            }, { once: true });
            
            fallbackVideo.addEventListener('error', (err) => {
                clearTimeout(timeout);
                cleanupVideo(fallbackVideo);
                reject(new Error(`Video error: ${err.message}`));
            }, { once: true });
            
            fallbackVideo.load();
        });
        
        // Try to play
        try {
            await fallbackVideo.play();
        } catch (playErr) {
            debugLog('Fallback video play warning (continuing anyway)', 'warning');
        }
        
        // Extra delay for Chrome OS
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Request PiP
        await fallbackVideo.requestPictureInPicture();
        currentPipVideo = fallbackVideo;
        
        pipToggle.textContent = '📺 Unfloat';
        document.body.classList.add('pip-active');
        debugLog('Fallback PiP activated', 'success');
        
        // Set up visual updates for the canvas
        startPipCanvasUpdates(canvas);
        
        // Clean up when PiP ends
        fallbackVideo.addEventListener('leavepictureinpicture', () => {
            cleanupVideo(fallbackVideo);
            cleanupPip();
        }, { once: true });
    }

    // STRATEGY 3: Audio-only minimal approach (NEW - INTEGRATED)
    async function attemptAudioOnlyPip() {
        debugLog('Attempting audio-only PiP...', 'info');
        
        const track = playlist[currentTrackIndex];
        const status = `${track.metadata?.title || 'Playing'} - ${track.metadata?.artist || 'Unknown Artist'}`;
        
        // Create the simplest possible video element
        const video = document.createElement('video');
        video.style.display = 'none';
        video.muted = true; // Critical for Chrome OS
        video.playsInline = true;
        
        // Create a tiny, single-color video stream
        const canvas = document.createElement('canvas');
        canvas.width = 2;
        canvas.height = 2;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 2, 2);
        
        // Ultra low FPS - just enough to keep the stream alive
        const stream = canvas.captureStream(0.1);
        
        video.srcObject = stream;
        document.body.appendChild(video);
        
        // Wait with multiple fallback strategies
        await new Promise((resolve, reject) => {
            if (video.readyState >= 1) {
                resolve();
                return;
            }
            
            const timeout = setTimeout(() => {
                video.removeEventListener('loadedmetadata', resolve);
                cleanupVideo(video);
                reject(new Error('Audio-only PiP timeout'));
            }, 3000);
            
            video.addEventListener('loadedmetadata', () => {
                clearTimeout(timeout);
                resolve();
            }, { once: true });
            
            video.addEventListener('error', (err) => {
                clearTimeout(timeout);
                cleanupVideo(video);
                reject(new Error(`Audio-only video error: ${err.message}`));
            }, { once: true });
            
            video.load();
        });
        
        // Try to play (not critical for audio-only)
        try {
            await video.play();
        } catch (e) {
            debugLog('Audio-only PiP video play failed (continuing)', 'warning');
        }
        
        // Extra delay for Chrome OS
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Request PiP
        await video.requestPictureInPicture();
        currentPipVideo = video;
        
        pipToggle.textContent = '📺 Unfloat';
        document.body.classList.add('pip-active');
        debugLog('Audio-only PiP activated successfully', 'success');
        
        // Set up title updates since we can't draw to the tiny canvas
        setupPipTitleUpdates();
        
        // Clean up when PiP ends
        video.addEventListener('leavepictureinpicture', () => {
            cleanupVideo(video);
            cleanupPip();
        }, { once: true });
        
        return video;
    }

    // Helper function to draw PIP frame
    function drawPipFrame(ctx, width, height, isInitial = false) {
        const track = playlist[currentTrackIndex];
        
        // Background
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#1a1a1a');
        gradient.addColorStop(1, '#0a0a0a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        if (track) {
            // Track info
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px Segoe UI, Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(track.metadata?.title || 'Now Playing', width/2, 80);
            
            ctx.fillStyle = '#888888';
            ctx.font = '18px Segoe UI, Arial, sans-serif';
            ctx.fillText(track.metadata?.artist || 'Unknown Artist', width/2, 110);
            
            // Progress
            ctx.fillStyle = '#dc3545';
            ctx.font = '16px Segoe UI, Arial, sans-serif';
            const current = formatTime(player.currentTime);
            const total = formatTime(player.duration);
            ctx.fillText(`${current} / ${total}`, width/2, 140);
            
            // Visualizer if available and playing
            if (!player.paused && analyser && dataArray && !isInitial) {
                analyser.getByteFrequencyData(dataArray);
                const barCount = 20;
                const barWidth = (width - 100) / barCount;
                const startX = 50;
                
                for (let i = 0; i < barCount; i++) {
                    const dataIndex = Math.floor((i / barCount) * bufferLength);
                    const v = dataArray[dataIndex] / 255;
                    const h = v * 80;
                    const x = startX + (i * barWidth);
                    const y = height - 60 - h;
                    
                    const hue = (i / barCount) * 20 + 340;
                    ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;
                    ctx.fillRect(x, y, barWidth - 2, h);
                }
            } else {
                // Show play state
                ctx.fillStyle = '#666666';
                ctx.font = '20px Segoe UI, Arial, sans-serif';
                ctx.fillText(player.paused ? '⏸ Paused' : '▶ Playing', width/2, height/2 + 40);
            }
        }
    }

    // Start canvas updates for fallback PIP
    function startPipCanvasUpdates(canvas) {
        if (pipAnimationId) {
            cancelAnimationFrame(pipAnimationId);
        }
        
        const ctx = canvas.getContext('2d');
        
        function updateCanvas() {
            if (!document.pictureInPictureElement) {
                cleanupPip();
                return;
            }
            
            drawPipFrame(ctx, canvas.width, canvas.height);
            pipAnimationId = requestAnimationFrame(updateCanvas);
        }
        
        pipAnimationId = requestAnimationFrame(updateCanvas);
    }

    // Setup title updates for audio-only PIP
    function setupPipTitleUpdates() {
        if (pipAnimationId) {
            clearInterval(pipAnimationId);
        }
        
        pipAnimationId = setInterval(updatePipTitle, 2000);
    }

    function updatePipTitle() {
        if (!document.pictureInPictureElement) {
            cleanupPip();
            return;
        }
        
        const track = playlist[currentTrackIndex];
        if (track) {
            const title = track.metadata?.title || track.fileName;
            const artist = track.metadata?.artist || 'Unknown Artist';
            const currentTime = formatTime(player.currentTime);
            const duration = formatTime(player.duration);
            const state = player.paused ? '⏸' : '▶';
            
            document.title = `${state} ${title} - ${artist} [${currentTime}/${duration}]`;
        }
    }

    function setupPipVisualizer() {
        // For main video PIP, we can only update the title
        setupPipTitleUpdates();
    }

       function cleanupVideo(video) {
       if (!video) return;
       
       try {
           // Stop all media streams
           if (video.srcObject) {
               video.srcObject.getTracks().forEach(track => {
                   track.stop();
                   debugLog(`Stopped track: ${track.kind}`, 'info');
               });
               video.srcObject = null;
           }
           
           // Clear source
           if (video.src) {
               video.src = '';
               video.load(); // Important: release resources
           }
           
           // Remove from DOM
           if (video.parentNode) {
               video.parentNode.removeChild(video);
           }
       } catch (err) {
           debugLog(`Video cleanup error: ${err.message}`, 'error');
       }
   }

    function cleanupPip() {
        if (currentPipVideo && currentPipVideo !== player) {
            cleanupVideo(currentPipVideo);
        }
        currentPipVideo = null;
        
        if (pipAnimationId) {
            if (typeof pipAnimationId === 'number') {
                cancelAnimationFrame(pipAnimationId);
            } else {
                clearInterval(pipAnimationId);
            }
            pipAnimationId = null;
        }
        
        pipToggle.textContent = '📺 Float';
        document.body.classList.remove('pip-active');
        document.title = 'Ultimate Local Music Player';
        
        debugLog('PiP fully cleaned up', 'info');
    }

    // PiP exit handler
    document.addEventListener('leavepictureinpicture', () => {
        cleanupPip();
    });
}



        // --- Sticky Mini Player ---
        const stickyToggle = document.getElementById('sticky-toggle');
        const stickyClose = document.querySelector('.sticky-close');
        let isStickyEnabled = false;
        
        function toggleSticky(enable) {
            isStickyEnabled = enable;
            
            if (enable) {
                document.body.classList.add('sticky-mini');
                stickyToggle.classList.add('active');
                stickyToggle.textContent = '📍 Sticky On';
                if (stickyClose) stickyClose.style.display = 'flex';
                
                // Auto-switch to mini mode for best experience
                if (compactMode !== 'mini') {
                    setCompactMode('mini');
                }
                
                debugLog('Sticky mini player enabled', 'success');
            } else {
                document.body.classList.remove('sticky-mini');
                stickyToggle.classList.remove('active');
                stickyToggle.textContent = '📍 Sticky Off';
                if (stickyClose) stickyClose.style.display = 'none';
                
                debugLog('Sticky mini player disabled', 'info');
            }
            
            // Save preference
            localStorage.setItem('stickyMode', enable ? 'true' : 'false');
        }
        
        stickyToggle.onclick = () => {
            toggleSticky(!isStickyEnabled);
        };
        
        // Close button
        if (stickyClose) {
            stickyClose.onclick = (e) => {
                e.stopPropagation(); // Prevent clicking through to metadata
                toggleSticky(false);
            };
        }
        
        // Load saved preference
        const savedSticky = localStorage.getItem('stickyMode');
        if (savedSticky === 'true') {
            toggleSticky(true);
        }
        
        // Keyboard shortcut: 'S' for sticky
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            if (e.key === 's' || e.key === 'S') {
                e.preventDefault();
                stickyToggle.click();
            }
        });

// ========== FULLSCREEN VISUALIZER SYSTEM (FIXED) ==========
const fullscreenVizToggle = document.getElementById('fullscreen-viz-toggle');
const fullscreenViz = document.getElementById('fullscreen-visualizer');
const fullscreenVizCanvas = document.getElementById('fullscreen-viz-canvas');
const vizModeBtn = document.getElementById('viz-mode-btn');
const vizPrevBtn = document.getElementById('viz-prev-btn');
const vizPlayPauseBtn = document.getElementById('viz-play-pause-btn');
const vizNextBtn = document.getElementById('viz-next-btn');
const vizCloseBtn = document.getElementById('viz-close-btn');
const vizTitle = document.querySelector('.fullscreen-viz-title');
const vizArtist = document.querySelector('.fullscreen-viz-artist');
const vizCurrentTime = document.getElementById('viz-current-time');
const vizDuration = document.getElementById('viz-duration');
const vizForceHideBtn = document.createElement('button');
vizForceHideBtn.id = 'viz-force-hide-btn';
vizForceHideBtn.innerHTML = '👁️';
vizForceHideBtn.title = 'Toggle controls visibility';
fullscreenViz.appendChild(vizForceHideBtn);

let controlsHidden = false;

vizForceHideBtn.onclick = (e) => {
    e.stopPropagation();
    controlsHidden = !controlsHidden;
    
    if (controlsHidden) {
        fullscreenViz.classList.add('controls-hidden');
        vizForceHideBtn.style.opacity = '0';
        vizForceHideBtn.style.pointerEvents = 'none';
    } else {
        fullscreenViz.classList.remove('controls-hidden');
        vizForceHideBtn.style.opacity = '1';
        vizForceHideBtn.style.pointerEvents = 'all';
    }
};

let fullscreenVizActive = false;

// Toggle fullscreen visualizer
function toggleFullscreenViz(show) {
    fullscreenVizActive = show;
    
    if (show) {
        // Show fullscreen overlay
        fullscreenViz.classList.remove('fullscreen-viz-hidden');
        
        // Resize canvas to full window
        fullscreenVizCanvas.width = window.innerWidth;
        fullscreenVizCanvas.height = window.innerHeight;
        
        // Initialize visualizer manager
        if (analyser && dataArray) {
            visualizerManager.initFullscreenVisualizer(fullscreenVizCanvas);
            visualizerManager.startFullscreen(analyser, dataArray);
        }
        
        // Update track info
        updateFullscreenVizInfo();
        
        // Setup auto-hide
        setupAutoHide();
        
        // Update button state
        fullscreenVizToggle.classList.add('active');
        fullscreenVizToggle.textContent = '🌌 Exit Visualizer';
        
        debugLog('Fullscreen visualizer activated', 'success');
    } else {
        // Hide fullscreen overlay
        fullscreenViz.classList.add('fullscreen-viz-hidden');
        
        // Stop visualizer
        visualizerManager.stopFullscreen();
        
        // Update button state
        fullscreenVizToggle.classList.remove('active');
        fullscreenVizToggle.textContent = '🌌 Fullscreen Visualizer';
        
        debugLog('Fullscreen visualizer deactivated', 'info');
    }
}

// Setup auto-hide for controls
let hideTimer = null;

function setupAutoHide() {
    const resetHideTimer = () => {
        fullscreenViz.classList.remove('auto-hide');
        
        // If controls are manually hidden, show everything on tap
        if (controlsHidden) {
            controlsHidden = false;
            fullscreenViz.classList.remove('controls-hidden');
            vizForceHideBtn.style.opacity = '1';
            vizForceHideBtn.style.pointerEvents = 'all';
        }
        
        if (hideTimer) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }
        
        hideTimer = setTimeout(() => {
            fullscreenViz.classList.add('auto-hide');
            hideTimer = null;
        }, 3000);
    };
    
    // Remove old listeners to prevent duplicates
    const oldMouseMove = fullscreenViz._autoHideMouseMove;
    const oldClick = fullscreenViz._autoHideClick;
    
    if (oldMouseMove) fullscreenViz.removeEventListener('mousemove', oldMouseMove);
    if (oldClick) fullscreenViz.removeEventListener('click', oldClick);
    
    // Store references for cleanup
    fullscreenViz._autoHideMouseMove = resetHideTimer;
    fullscreenViz._autoHideClick = resetHideTimer;
    
    // Add fresh listeners
    fullscreenViz.addEventListener('mousemove', resetHideTimer);
    fullscreenViz.addEventListener('click', resetHideTimer);
    fullscreenViz.addEventListener('touchstart', resetHideTimer); // ADD THIS LINE
    
    // Initial call to start the timer
    resetHideTimer();
}

// Update track info display
function updateFullscreenVizInfo() {
    if (currentTrackIndex !== -1 && playlist.length > 0) {
        const track = playlist[currentTrackIndex];
        vizTitle.textContent = track.metadata?.title || track.fileName;
        vizArtist.textContent = track.metadata?.artist || 'Unknown Artist';
        vizDuration.textContent = formatTime(player.duration || 0);
        vizCurrentTime.textContent = formatTime(player.currentTime || 0);
    } else {
        vizTitle.textContent = 'No track loaded';
        vizArtist.textContent = '--';
        vizDuration.textContent = '0:00';
        vizCurrentTime.textContent = '0:00';
    }
}

// Event Handlers
fullscreenVizToggle.onclick = () => {
    debugLog('Fullscreen viz button clicked', 'info');
    toggleFullscreenViz(!fullscreenVizActive);
};

vizModeBtn.onclick = () => {
    const modes = ['bars', 'circular', 'waveform', 'particles'];
    const currentMode = visualizerManager.vizMode;
    const currentIndex = modes.indexOf(currentMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    
    visualizerManager.setVizMode(nextMode);
    
    const modeNames = {
        'bars': 'Bars',
        'circular': 'Circular',
        'waveform': 'Waveform',
        'particles': 'Particles'
    };
    
    vizModeBtn.textContent = `🎨 Mode: ${modeNames[nextMode]}`;
    debugLog(`Visualizer mode: ${modeNames[nextMode]}`, 'info');
};

vizPrevBtn.onclick = () => {
    if (!prevButton.disabled) {
        playPrevious();
        updateFullscreenVizInfo();
    }
};

vizPlayPauseBtn.onclick = () => {
    if (player.paused) {
        player.play();
        vizPlayPauseBtn.textContent = '⏸ Pause';
    } else {
        player.pause();
        vizPlayPauseBtn.textContent = '▶ Play';
    }
};

vizNextBtn.onclick = () => {
    if (!nextButton.disabled) {
        playNext();
        updateFullscreenVizInfo();
    }
};

vizCloseBtn.onclick = () => {
    toggleFullscreenViz(false);
};

// Keyboard shortcut: ESC to close
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && fullscreenVizActive) {
        e.preventDefault();
        toggleFullscreenViz(false);
    }
    
    // V key to toggle visualizer
    if ((e.key === 'v' || e.key === 'V') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        fullscreenVizToggle.click();
    }
});

// Update play/pause button when player state changes
player.addEventListener('play', () => {
    if (fullscreenVizActive) {
        vizPlayPauseBtn.textContent = '⏸ Pause';
    }
});

player.addEventListener('pause', () => {
    if (fullscreenVizActive) {
        vizPlayPauseBtn.textContent = '▶ Play';
    }
});

// Update time display
player.addEventListener('timeupdate', () => {
    if (fullscreenVizActive) {
        vizCurrentTime.textContent = formatTime(player.currentTime || 0);
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    if (fullscreenVizActive) {
        fullscreenVizCanvas.width = window.innerWidth;
        fullscreenVizCanvas.height = window.innerHeight;
    }
});

debugLog('Fullscreen visualizer system initialized', 'success');
// ========== END FULLSCREEN VISUALIZER SYSTEM ==========

// Populate preset dropdown - will be called after audioPresetsManager is created
function populatePresetDropdown() {
    const presetSelect = document.getElementById('eq-preset-select');
    if (presetSelect && audioPresetsManager) {
        // Clear existing options first
        presetSelect.innerHTML = '<option value="">Select Preset...</option>';
        
        const presets = audioPresetsManager.getPresetList();
        presets.forEach(preset => {
            const option = document.createElement('option');
            option.value = preset.id;
            option.textContent = preset.name;
            option.title = preset.description;
            presetSelect.appendChild(option);
        });
        
        presetSelect.onchange = (e) => {
            if (e.target.value) {
                audioPresetsManager.applyPreset(e.target.value);
            }
        };
        
        debugLog('EQ preset dropdown populated', 'success');
    }
} 

    // ========== METADATA EDITOR INTEGRATION ==========

function openMetadataEditorForTrack(index) {
    if (index < 0 || index >= playlist.length) return;
    
    const track = playlist[index];
    const currentMetadata = track.metadata || {
        title: track.fileName,
        artist: 'Unknown Artist',
        album: 'Unknown Album'
    };
    
    metadataEditor.openEditor(index, currentMetadata, (trackIndex, newMetadata) => {
        // Save to custom metadata store
        const file = playlist[trackIndex].fileName;
        const size = playlist[trackIndex].duration || 0; // Use duration as size proxy
        
        customMetadataStore.save(file, size, newMetadata);
        
        // Update playlist entry
        playlist[trackIndex].metadata = {
            ...playlist[trackIndex].metadata,
            ...newMetadata,
            hasMetadata: true
        };
        
        // Re-render playlist to show changes
        renderPlaylist();
        
        // If this is the currently playing track, update display
        if (trackIndex === currentTrackIndex) {
            displayMetadata(playlist[trackIndex].metadata);
        }
        
        // Save playlist with new metadata
        savePlaylistToStorage();
        
        debugLog(`✅ Metadata updated and saved for track ${trackIndex + 1}`, 'success');
    });
}

// ========== END METADATA EDITOR INTEGRATION ==========

    // Auto-fetch lyrics button
const autoLyricsBtn = document.getElementById('auto-lyrics-btn');

if (autoLyricsBtn) {
    autoLyricsBtn.onclick = () => {
        window.open('lyrics-fetcher.html', '_blank');
    };
}

    // ========== FULLSCREEN LYRICS WITH EDGE VISUALIZER ==========
const fullscreenLyricsToggle = document.getElementById('fullscreen-lyrics-toggle');
const fullscreenLyrics = document.getElementById('fullscreen-lyrics');
const fullscreenLyricsVizCanvas = document.getElementById('fullscreen-lyrics-viz-canvas');
const fullscreenLyricsContent = document.getElementById('fullscreen-lyrics-content');
const lyricsCloseBtn = document.getElementById('lyrics-close-btn');
const lyricsPrevBtn = document.getElementById('lyrics-prev-btn');
const lyricsNextBtn = document.getElementById('lyrics-next-btn');

let fullscreenLyricsActive = false;
let lyricsVizAnimationId = null;

function toggleFullscreenLyrics(show) {
    fullscreenLyricsActive = show;
    
    if (show) {
        // Check if we have lyrics
        if (cues.length === 0) {
            alert('No lyrics available for this track!');
            return;
        }
        
        fullscreenLyrics.classList.remove('fullscreen-lyrics-hidden');
        fullscreenLyrics.classList.add('show');
        
        // Resize canvas
        fullscreenLyricsVizCanvas.width = window.innerWidth;
        fullscreenLyricsVizCanvas.height = window.innerHeight;
        
        // Render lyrics
        renderFullscreenLyrics();
        
        // Start edge visualizer
        startLyricsEdgeVisualizer();
        
        fullscreenLyricsToggle.classList.add('active');
        fullscreenLyricsToggle.textContent = '🎤 Exit Lyrics';
        
        debugLog('Fullscreen lyrics activated', 'success');
    } else {
        fullscreenLyrics.classList.add('fullscreen-lyrics-hidden');
        fullscreenLyrics.classList.remove('show');
        
        // Stop visualizer
        stopLyricsEdgeVisualizer();
        
        fullscreenLyricsToggle.classList.remove('active');
        fullscreenLyricsToggle.textContent = '🎤 Fullscreen Lyrics';
        
        debugLog('Fullscreen lyrics deactivated', 'info');
    }
}

function renderFullscreenLyrics() {
    fullscreenLyricsContent.innerHTML = '';
    
    if (cues.length === 0) {
        fullscreenLyricsContent.innerHTML = '<div class="fullscreen-lyrics-empty">No lyrics available</div>';
        return;
    }
    
    cues.forEach((cue, index) => {
        const line = document.createElement('div');
        line.className = 'fullscreen-lyric-line';
        line.textContent = cue.text.replace(/\r?\n|\r/g, ' ');
        line.dataset.index = index;
        line.dataset.startTime = cue.startTime;
        
        line.onclick = () => {
            player.currentTime = cue.startTime;
            debugLog(`Jumped to: ${formatTime(cue.startTime)}`, 'info');
        };
        
        fullscreenLyricsContent.appendChild(line);
    });
}

function updateFullscreenLyricsHighlight() {
    if (!fullscreenLyricsActive) return;
    
    const currentTime = player.currentTime;
    const lines = fullscreenLyricsContent.querySelectorAll('.fullscreen-lyric-line');
    
    let activeLine = null;
    
    for (let i = 0; i < cues.length; i++) {
        const cue = cues[i];
        if (currentTime >= cue.startTime && currentTime < cue.endTime) {
            activeLine = lines[i];
            break;
        }
    }
    
    lines.forEach(line => line.classList.remove('active'));
    
    if (activeLine) {
        activeLine.classList.add('active');
        
        // Auto-scroll
        const lineRect = activeLine.getBoundingClientRect();
        const containerRect = fullscreenLyricsContent.getBoundingClientRect();
        
        if (lineRect.top < containerRect.top || lineRect.bottom > containerRect.bottom) {
            const lineTop = activeLine.offsetTop;
            const lineHeight = activeLine.offsetHeight;
            const containerHeight = fullscreenLyricsContent.clientHeight;
            const targetScroll = lineTop - (containerHeight / 2) + (lineHeight / 2);
            
            fullscreenLyricsContent.scrollTo({ 
                top: targetScroll,
                behavior: 'smooth'
            });
        }
    }
}

function startLyricsEdgeVisualizer() {
    if (!analyser || !dataArray) return;
    
    const ctx = fullscreenLyricsVizCanvas.getContext('2d');
    
    function drawEdgeVisualizer() {
        if (!fullscreenLyricsActive) {
            lyricsVizAnimationId = null;
            return;
        }
        
        lyricsVizAnimationId = requestAnimationFrame(drawEdgeVisualizer);
        
        analyser.getByteFrequencyData(dataArray);
        
        // Clear with fade
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, fullscreenLyricsVizCanvas.width, fullscreenLyricsVizCanvas.height);
        
        const width = fullscreenLyricsVizCanvas.width;
        const height = fullscreenLyricsVizCanvas.height;
        const barCount = 240;
        const barThickness = 6;
        const maxBarLength = 100;
        
        // Draw bars around edges
        for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor((i / barCount) * bufferLength);
            const value = dataArray[dataIndex] / 255;
            const barLength = value * maxBarLength;
            
            const hue = (i / barCount) * 360;
            const color = `hsl(${hue}, 100%, 60%)`;
            
            ctx.fillStyle = color;
            ctx.shadowBlur = 15;
            ctx.shadowColor = color;
            
            // Calculate position around perimeter
            const perimeter = 2 * (width + height);
            const position = (i / barCount) * perimeter;
            
            if (position < width) {
                // Top edge
                const x = position;
                ctx.fillRect(x, 0, barThickness, barLength);
            } else if (position < width + height) {
                // Right edge
                const y = position - width;
                ctx.fillRect(width - barLength, y, barLength, barThickness);
            } else if (position < 2 * width + height) {
                // Bottom edge
                const x = width - (position - width - height);
                ctx.fillRect(x, height - barLength, barThickness, barLength);
            } else {
                // Left edge
                const y = height - (position - 2 * width - height);
                ctx.fillRect(0, y, barLength, barThickness);
            }
        }
        
        ctx.shadowBlur = 0;
    }
    
    drawEdgeVisualizer();
}

function stopLyricsEdgeVisualizer() {
    if (lyricsVizAnimationId) {
        cancelAnimationFrame(lyricsVizAnimationId);
        lyricsVizAnimationId = null;
    }
}

// Event handlers
fullscreenLyricsToggle.onclick = () => {
    toggleFullscreenLyrics(!fullscreenLyricsActive);
};

lyricsCloseBtn.onclick = () => {
    toggleFullscreenLyrics(false);
};

lyricsPrevBtn.onclick = () => {
    if (!prevButton.disabled) {
        playPrevious();
    }
};

lyricsNextBtn.onclick = () => {
    if (!nextButton.disabled) {
        playNext();
    }
};

// ESC key to close
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && fullscreenLyricsActive) {
        e.preventDefault();
        toggleFullscreenLyrics(false);
    }
});

// Update lyrics highlight during playback
player.addEventListener('timeupdate', () => {
    if (fullscreenLyricsActive) {
        updateFullscreenLyricsHighlight();
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    if (fullscreenLyricsActive) {
        fullscreenLyricsVizCanvas.width = window.innerWidth;
        fullscreenLyricsVizCanvas.height = window.innerHeight;
    }
});

debugLog('Fullscreen lyrics system initialized', 'success');
// ========== END FULLSCREEN LYRICS WITH EDGE VISUALIZER ==========

    
debugLog('Music player initialized');

    

}); // ← Only ONE closing for DOMContentLoaded