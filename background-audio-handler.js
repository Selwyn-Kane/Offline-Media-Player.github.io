/* ============================================
   FIXED Background Audio Handler
   Non-invasive: Uses audio system from script.js
   ============================================ */

class BackgroundAudioHandler {
    constructor() {
        this.player = null;
        this.wakeLock = null;
        this.retryAttempts = 0;
        this.maxRetries = 3;
        this.metadataCache = new Map();
        this.lastPlaybackState = 'none';
        
        // Bind methods
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
        this.handleOnline = this.handleOnline.bind(this);
        this.handleOffline = this.handleOffline.bind(this);
        
        this.init();
    }
    
    async init() {
        console.log('🎵 Initializing Background Audio Handler (passive mode)...');
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }
    
    async setup() {
        this.player = document.getElementById('audio-player');
        
        if (!this.player) {
            console.error('❌ Audio player element not found');
            return;
        }
        
        try {
            // Setup in optimal order (NO audio context creation)
            this.setupMediaSession();
            await this.registerServiceWorker();
            this.setupWakeLock();
            this.setupPlayerListeners();
            this.setupInterruptionHandling();
            this.setupNetworkMonitoring();
            await this.requestPersistentStorage();
            
            console.log('✅ Background Audio Handler initialized (passive mode)');
        } catch (error) {
            console.error('❌ Setup failed:', error);
        }
    }
    
    // ============================================
    // AUDIO CONTEXT ACCESS (script.js creates it)
    // ============================================
    
    getAudioContext() {
        // Access the audio context created by script.js
        return window.audioContext || null;
    }
    
    async resumeAudioContext() {
        const ctx = this.getAudioContext();
        
        if (ctx && ctx.state === 'suspended') {
            try {
                await ctx.resume();
                console.log('✅ AudioContext resumed');
                return true;
            } catch (error) {
                console.error('❌ Failed to resume AudioContext:', error);
                return false;
            }
        }
        return true;
    }
    
    // ============================================
    // MEDIA SESSION API
    // ============================================
    
    setupMediaSession() {
        if (!('mediaSession' in navigator)) {
            console.warn('⚠️ Media Session API not supported');
            return;
        }
        
        console.log('🎮 Setting up Media Session API...');
        
        this.updateMediaSessionMetadata();
        
        const handlers = {
            play: () => this.handleMediaAction('play', () => this.player.play()),
            pause: () => this.handleMediaAction('pause', () => this.player.pause()),
            stop: () => this.handleMediaAction('stop', () => {
                this.player.pause();
                this.player.currentTime = 0;
            }),
            previoustrack: () => this.handleMediaAction('previous', () => {
                const prevBtn = document.getElementById('prev-button');
                if (prevBtn && !prevBtn.disabled) prevBtn.click();
            }),
            nexttrack: () => this.handleMediaAction('next', () => {
                const nextBtn = document.getElementById('next-button');
                if (nextBtn && !nextBtn.disabled) nextBtn.click();
            }),
            seekbackward: (details) => this.handleMediaAction('seekbackward', () => {
                if (this.player) {
                    this.player.currentTime = Math.max(
                        this.player.currentTime - (details.seekOffset || 10), 
                        0
                    );
                }
            }),
            seekforward: (details) => this.handleMediaAction('seekforward', () => {
                if (this.player) {
                    this.player.currentTime = Math.min(
                        this.player.currentTime + (details.seekOffset || 10), 
                        this.player.duration || 0
                    );
                }
            }),
            seekto: (details) => this.handleMediaAction('seekto', () => {
                if (this.player && details.seekTime !== undefined) {
                    this.player.currentTime = details.seekTime;
                }
            })
        };
        
        Object.entries(handlers).forEach(([action, handler]) => {
            try {
                navigator.mediaSession.setActionHandler(action, handler);
            } catch (error) {
                console.warn(`⚠️ Failed to set ${action} handler:`, error);
            }
        });
        
        console.log('✅ Media Session handlers configured');
    }
    
    async handleMediaAction(actionName, actionFn) {
        console.log(`📱 Media Session: ${actionName}`);
        
        try {
            await this.resumeAudioContext();
            
            const result = actionFn();
            
            if (result && typeof result.catch === 'function') {
                await result.catch(error => {
                    console.error(`❌ Media action '${actionName}' failed:`, error);
                    this.handlePlaybackError(error);
                });
            }
        } catch (error) {
            console.error(`❌ Media action '${actionName}' error:`, error);
            this.handlePlaybackError(error);
        }
    }
    
    updateMediaSessionMetadata() {
        if (!('mediaSession' in navigator)) return;
        
        if (typeof currentTrackIndex === 'undefined' || typeof playlist === 'undefined') {
            this.setDefaultMetadata();
            return;
        }
        
        if (currentTrackIndex === -1 || !playlist[currentTrackIndex]) {
            this.setDefaultMetadata();
            return;
        }
        
        const track = playlist[currentTrackIndex];
        const cacheKey = track.fileName || track.url;
        
        if (this.metadataCache.has(cacheKey)) {
            navigator.mediaSession.metadata = this.metadataCache.get(cacheKey);
            console.log('🎵 Media Session metadata (cached)');
            return;
        }
        
        const metadata = track.metadata || {};
        const artwork = [];
        
        if (metadata.image) {
            artwork.push({ 
                src: metadata.image, 
                sizes: '512x512', 
                type: 'image/jpeg' 
            });
            artwork.push({ 
                src: metadata.image, 
                sizes: '192x192', 
                type: 'image/jpeg' 
            });
        } else {
            // Use data URIs or skip if icons don't exist
            artwork.push({ 
                src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23dc3545" width="100" height="100"/><text x="50" y="50" font-size="50" text-anchor="middle" dy=".3em" fill="white">♪</text></svg>', 
                sizes: '512x512', 
                type: 'image/svg+xml' 
            });
        }
        
        const mediaMetadata = new MediaMetadata({
            title: metadata.title || track.fileName || 'Unknown Track',
            artist: metadata.artist || 'Unknown Artist',
            album: metadata.album || 'Unknown Album',
            artwork: artwork
        });
        
        this.metadataCache.set(cacheKey, mediaMetadata);
        navigator.mediaSession.metadata = mediaMetadata;
        
        console.log('🎵 Media Session metadata updated:', metadata.title || track.fileName);
    }
    
    setDefaultMetadata() {
        if (!('mediaSession' in navigator)) return;
        
        navigator.mediaSession.metadata = new MediaMetadata({
            title: 'Music Player',
            artist: 'Ready to play',
            album: 'Ultimate Music Player',
            artwork: [
                { 
                    src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23dc3545" width="100" height="100"/><text x="50" y="50" font-size="50" text-anchor="middle" dy=".3em" fill="white">♪</text></svg>', 
                    sizes: '512x512', 
                    type: 'image/svg+xml' 
                }
            ]
        });
    }
    
    handlePlaybackStateChange(state) {
        this.lastPlaybackState = state;
        
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = state;
        }
        
        console.log(`🎵 Playback state: ${state}`);
    }
    
    updatePositionState() {
        if (!('setPositionState' in navigator.mediaSession)) return;
        if (!this.player || !this.player.duration || isNaN(this.player.duration)) return;
        
        try {
            navigator.mediaSession.setPositionState({
                duration: this.player.duration,
                playbackRate: this.player.playbackRate,
                position: Math.min(this.player.currentTime, this.player.duration)
            });
        } catch (error) {
            // Silently ignore - can fail during transitions
        }
    }
    
    // ============================================
    // SERVICE WORKER
    // ============================================
    
    async registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.warn('⚠️ Service Worker not supported');
            return;
        }
        
        if (window.chromeosPlatform && window.chromeosPlatform.isExtension) {
            console.log('⭐ Skipping SW registration (extension mode)');
            return;
        }
        
        try {
            const registration = await navigator.serviceWorker.register('./service-worker.js', {
                scope: './',
                updateViaCache: 'none'
            });
            
            console.log('✅ Service Worker registered:', registration.scope);
            
            registration.addEventListener('updatefound', () => {
                console.log('🔄 Service Worker update found');
            });
            
            await navigator.serviceWorker.ready;
            console.log('✅ Service Worker ready');
            
        } catch (error) {
            console.error('❌ Service Worker registration failed:', error);
        }
    }
    
    // ============================================
    // WAKE LOCK
    // ============================================
    
    async setupWakeLock() {
        if (!('wakeLock' in navigator)) {
            console.warn('⚠️ Wake Lock API not supported');
            return;
        }
        
        const requestWakeLock = async () => {
            try {
                if (this.wakeLock) {
                    await this.wakeLock.release();
                }
                
                this.wakeLock = await navigator.wakeLock.request('screen');
                console.log('✅ Wake lock acquired');
                
                this.wakeLock.addEventListener('release', () => {
                    console.log('🔓 Wake lock released');
                    this.wakeLock = null;
                });
            } catch (error) {
                console.warn('⚠️ Wake lock request failed:', error);
            }
        };
        
        const releaseWakeLock = async () => {
            if (this.wakeLock) {
                try {
                    await this.wakeLock.release();
                    this.wakeLock = null;
                } catch (error) {
                    console.warn('⚠️ Wake lock release failed:', error);
                }
            }
        };
        
        this.player.addEventListener('play', () => {
            if (document.visibilityState === 'visible') {
                requestWakeLock();
            }
        });
        
        this.player.addEventListener('pause', releaseWakeLock);
        
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && this.player && !this.player.paused) {
                requestWakeLock();
            } else if (document.visibilityState === 'hidden') {
                releaseWakeLock();
            }
        });
    }
    
    // ============================================
    // PLAYER EVENT LISTENERS
    // ============================================
    
    setupPlayerListeners() {
        if (!this.player) return;
        
        this.player.addEventListener('play', () => {
            this.handlePlaybackStateChange('playing');
            this.updateMediaSessionMetadata();
            this.retryAttempts = 0;
        });
        
        this.player.addEventListener('pause', () => {
            this.handlePlaybackStateChange('paused');
        });
        
        this.player.addEventListener('ended', () => {
            this.handlePlaybackStateChange('none');
        });
        
        this.player.addEventListener('error', (e) => {
            console.error('❌ Player error:', e);
            this.handlePlaybackError(e);
        });
        
        this.player.addEventListener('stalled', () => {
            console.warn('⚠️ Playback stalled');
        });
        
        this.player.addEventListener('waiting', () => {
            console.log('⏳ Buffering...');
        });
        
        this.player.addEventListener('canplay', () => {
            console.log('✅ Can play');
        });
        
        this.player.addEventListener('loadedmetadata', () => {
            this.updateMediaSessionMetadata();
            this.updatePositionState();
        });
        
        this.player.addEventListener('timeupdate', () => {
            this.updatePositionState();
        });
        
        this.player.addEventListener('durationchange', () => {
            this.updatePositionState();
        });
        
        this.player.addEventListener('ratechange', () => {
            this.updatePositionState();
        });
        
        window.addEventListener('beforeunload', this.handleBeforeUnload);
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
    
    // ============================================
    // INTERRUPTION HANDLING
    // ============================================
    
    setupInterruptionHandling() {
        document.addEventListener('freeze', () => {
            console.log('🥶 Page frozen');
        });
        
        document.addEventListener('resume', async () => {
            console.log('🔄 Page resumed');
            if (this.player && !this.player.paused) {
                await this.resumeAudioContext();
            }
        });
    }
    
    // ============================================
    // NETWORK MONITORING
    // ============================================
    
    setupNetworkMonitoring() {
        window.addEventListener('online', this.handleOnline);
        window.addEventListener('offline', this.handleOffline);
        
        if (!navigator.onLine) {
            console.warn('⚠️ Starting offline');
        }
    }
    
    handleOnline() {
        console.log('🌐 Network connection restored');
        if (this.player && this.player.paused && this.lastPlaybackState === 'playing') {
            console.log('🔄 Attempting to resume playback...');
            this.player.play().catch(error => {
                console.error('❌ Failed to resume after reconnection:', error);
            });
        }
    }
    
    handleOffline() {
        console.warn('📡 Network connection lost');
    }
    
    async handlePlaybackError(error) {
        console.error('🚨 Playback error:', error);
        
        if (this.retryAttempts >= this.maxRetries) {
            console.error('❌ Max retry attempts reached');
            return;
        }
        
        this.retryAttempts++;
        console.log(`🔄 Retry attempt ${this.retryAttempts}/${this.maxRetries}`);
        
        const delay = Math.min(1000 * Math.pow(2, this.retryAttempts - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        try {
            await this.resumeAudioContext();
            
            if (this.player && this.lastPlaybackState === 'playing') {
                await this.player.play();
                console.log('✅ Playback recovered');
            }
        } catch (retryError) {
            console.error('❌ Retry failed:', retryError);
        }
    }
    
    handleVisibilityChange() {
        if (document.hidden) {
            console.log('📱 App hidden - audio continues via Media Session');
        } else {
            console.log('📱 App visible');
            this.resumeAudioContext();
        }
    }
    
    handleBeforeUnload(e) {
        if (this.player && !this.player.paused) {
            console.log('⚠️ Page unloading while audio playing');
        }
    }
    
    // ============================================
    // PERSISTENT STORAGE
    // ============================================
    
    async requestPersistentStorage() {
        if (!navigator.storage || !navigator.storage.persist) {
            console.warn('⚠️ Storage API not supported');
            return;
        }
        
        try {
            const isPersistent = await navigator.storage.persist();
            console.log(`💾 Persistent storage: ${isPersistent ? 'granted' : 'denied'}`);
            
            if (isPersistent) {
                const estimate = await navigator.storage.estimate();
                const usage = (estimate.usage / estimate.quota * 100).toFixed(2);
                console.log(`💾 Storage usage: ${usage}% (${this.formatBytes(estimate.usage)} / ${this.formatBytes(estimate.quota)})`);
            } else {
                console.warn('⚠️ Storage may be cleared. Audio files could be lost.');
            }
        } catch (error) {
            console.warn('⚠️ Could not request persistent storage:', error);
        }
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    // ============================================
    // PUBLIC METHODS
    // ============================================
    
    async forceResume() {
        console.log('🔄 Force resume requested');
        await this.resumeAudioContext();
        if (this.player) {
            return this.player.play();
        }
    }
    
    clearMetadataCache() {
        this.metadataCache.clear();
        console.log('🗑️ Metadata cache cleared');
    }
    
    getStatus() {
        const ctx = this.getAudioContext();
        return {
            audioContextState: ctx?.state || 'not created yet (script.js creates it)',
            mediaSessionSupported: 'mediaSession' in navigator,
            wakeLockActive: !!this.wakeLock,
            serviceWorkerReady: navigator.serviceWorker?.controller !== null,
            isPlaying: this.player && !this.player.paused,
            retryAttempts: this.retryAttempts,
            networkStatus: navigator.onLine ? 'online' : 'offline'
        };
    }
    
    destroy() {
        console.log('🧹 Cleaning up Background Audio Handler...');
        
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        window.removeEventListener('online', this.handleOnline);
        window.removeEventListener('offline', this.handleOffline);
        
        if (this.wakeLock) {
            this.wakeLock.release();
        }
        
        this.metadataCache.clear();
        
        console.log('✅ Cleanup complete');
    }
}

// Initialize
const backgroundAudioHandler = new BackgroundAudioHandler();

// Make globally available
window.backgroundAudioHandler = backgroundAudioHandler;

// Debug helper
window.checkAudioStatus = () => {
    console.table(backgroundAudioHandler.getStatus());
    return backgroundAudioHandler.getStatus();
};

console.log('✅ FIXED background-audio-handler.js loaded (passive mode)');
console.log('💡 This handler does NOT create audio context - script.js does that');
console.log('💡 Run window.checkAudioStatus() to see current status');