/* ============================================
   COMPLETE Background Audio Fix
   Replace your background_audio_handler.js with this
   ============================================ */

class BackgroundAudioHandler {
    constructor() {
        this.player = null;
        this.wakeLock = null;
        this.audioContext = null;
        this.init();
    }
    
    async init() {
        console.log('🎵 Initializing COMPLETE Background Audio Handler...');
        
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
        
        // CRITICAL: Setup Media Session FIRST (this is what keeps audio alive)
        this.setupMediaSession();
        
        // Register Service Worker for PWA
        await this.registerServiceWorker();
        
        // Request wake lock to prevent sleep
        this.setupWakeLock();
        
        // Setup player event listeners
        this.setupPlayerListeners();
        
        // Request persistent storage
        await this.requestPersistentStorage();
        
        console.log('✅ Background Audio Handler fully initialized');
    }
    
    setupMediaSession() {
        if (!('mediaSession' in navigator)) {
            console.warn('⚠️ Media Session API not supported');
            return;
        }
        
        console.log('🎮 Setting up Media Session API...');
        
        // CRITICAL: Set metadata immediately
        navigator.mediaSession.metadata = new MediaMetadata({
            title: 'Music Player',
            artist: 'Ready to play',
            album: 'Ultimate Music Player',
            artwork: [
                { src: './icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: './icon-512.png', sizes: '512x512', type: 'image/png' }
            ]
        });
        
        // CRITICAL: These handlers keep audio alive in background
        navigator.mediaSession.setActionHandler('play', () => {
            console.log('📱 Media Session: Play');
            if (this.player) {
                this.player.play().catch(e => console.log('Play error:', e));
            }
        });
        
        navigator.mediaSession.setActionHandler('pause', () => {
            console.log('📱 Media Session: Pause');
            if (this.player) {
                this.player.pause();
            }
        });
        
        navigator.mediaSession.setActionHandler('stop', () => {
            console.log('📱 Media Session: Stop');
            if (this.player) {
                this.player.pause();
                this.player.currentTime = 0;
            }
        });
        
        navigator.mediaSession.setActionHandler('previoustrack', () => {
            console.log('📱 Media Session: Previous');
            const prevBtn = document.getElementById('prev-button');
            if (prevBtn && !prevBtn.disabled) prevBtn.click();
        });
        
        navigator.mediaSession.setActionHandler('nexttrack', () => {
            console.log('📱 Media Session: Next');
            const nextBtn = document.getElementById('next-button');
            if (nextBtn && !nextBtn.disabled) nextBtn.click();
        });
        
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
            console.log('📱 Media Session: Seek backward');
            if (this.player) {
                this.player.currentTime = Math.max(this.player.currentTime - (details.seekOffset || 10), 0);
            }
        });
        
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
            console.log('📱 Media Session: Seek forward');
            if (this.player) {
                this.player.currentTime = Math.min(this.player.currentTime + (details.seekOffset || 10), this.player.duration);
            }
        });
        
        navigator.mediaSession.setActionHandler('seekto', (details) => {
            console.log('📱 Media Session: Seek to', details.seekTime);
            if (this.player && details.seekTime !== undefined) {
                this.player.currentTime = details.seekTime;
            }
        });
        
        console.log('✅ Media Session handlers configured');
    }
    
    async registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.warn('⚠️ Service Worker not supported');
            return;
        }
        
        // Skip if running as Chrome extension
        if (window.chromeosPlatform && window.chromeosPlatform.isExtension) {
            console.log('⏭️ Skipping SW registration (extension mode)');
            return;
        }
        
        try {
            const registration = await navigator.serviceWorker.register('./service-worker.js', {
                scope: './'
            });
            
            console.log('✅ Service Worker registered:', registration.scope);
            
            await navigator.serviceWorker.ready;
            console.log('✅ Service Worker ready for background audio');
            
        } catch (err) {
            console.error('❌ Service Worker registration failed:', err);
        }
    }
    
    async setupWakeLock() {
        if (!('wakeLock' in navigator)) {
            console.warn('⚠️ Wake Lock API not supported');
            return;
        }
        
        const requestWakeLock = async () => {
            try {
                this.wakeLock = await navigator.wakeLock.request('screen');
                console.log('✅ Wake lock acquired');
                
                this.wakeLock.addEventListener('release', () => {
                    console.log('Wake lock released');
                });
            } catch (err) {
                console.warn('Wake lock request failed:', err);
            }
        };
        
        // Request wake lock when playing
        this.player.addEventListener('play', () => {
            if (document.visibilityState === 'visible') {
                requestWakeLock();
            }
        });
        
        // Release wake lock when paused
        this.player.addEventListener('pause', () => {
            if (this.wakeLock) {
                this.wakeLock.release();
                this.wakeLock = null;
            }
        });
        
        // Re-acquire wake lock when page becomes visible
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && this.player && !this.player.paused) {
                requestWakeLock();
            }
        });
    }
    
    setupPlayerListeners() {
        if (!this.player) return;
        
        this.player.addEventListener('play', () => {
            this.updateMediaSessionMetadata();
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'playing';
            }
            console.log('🎵 Playback started');
        });
        
        this.player.addEventListener('pause', () => {
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'paused';
            }
            console.log('⏸️ Playback paused');
        });
        
        this.player.addEventListener('ended', () => {
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'none';
            }
            console.log('⏹️ Playback ended');
        });
        
        // Update position state periodically
        this.player.addEventListener('timeupdate', () => {
            if ('setPositionState' in navigator.mediaSession) {
                try {
                    navigator.mediaSession.setPositionState({
                        duration: this.player.duration || 0,
                        playbackRate: this.player.playbackRate,
                        position: this.player.currentTime || 0
                    });
                } catch (err) {
                    // Ignore errors (happens if duration not available)
                }
            }
        });
        
        // Update metadata when track changes
        this.player.addEventListener('loadedmetadata', () => {
            this.updateMediaSessionMetadata();
        });
        
        // CRITICAL: Prevent audio from stopping when page unloads
        window.addEventListener('beforeunload', (e) => {
            if (this.player && !this.player.paused) {
                // Don't actually prevent unload, just log
                console.log('⚠️ Page unloading while audio playing');
            }
        });
        
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('📱 App hidden - audio should continue via Media Session');
            } else {
                console.log('📱 App visible');
            }
        });
    }
    
    updateMediaSessionMetadata() {
        if (!('mediaSession' in navigator)) return;
        
        // Get current track info from global playlist
        if (typeof currentTrackIndex === 'undefined' || typeof playlist === 'undefined') {
            return;
        }
        
        if (currentTrackIndex === -1 || !playlist[currentTrackIndex]) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: 'Music Player',
                artist: 'No track loaded',
                album: 'Ultimate Music Player',
                artwork: [
                    { src: './icon-192.png', sizes: '192x192', type: 'image/png' }
                ]
            });
            return;
        }
        
        const track = playlist[currentTrackIndex];
        const metadata = track.metadata || {};
        
        const artwork = [];
        if (metadata.image) {
            artwork.push({ src: metadata.image, sizes: '512x512', type: 'image/jpeg' });
        } else {
            artwork.push({ src: './icon-512.png', sizes: '512x512', type: 'image/png' });
        }
        
        navigator.mediaSession.metadata = new MediaMetadata({
            title: metadata.title || track.fileName || 'Unknown Track',
            artist: metadata.artist || 'Unknown Artist',
            album: metadata.album || 'Unknown Album',
            artwork: artwork
        });
        
        console.log('🎵 Media Session metadata updated:', metadata.title);
    }
    
    async requestPersistentStorage() {
        if (navigator.storage && navigator.storage.persist) {
            try {
                const isPersistent = await navigator.storage.persist();
                console.log(`💾 Persistent storage: ${isPersistent ? 'granted' : 'denied'}`);
                
                if (!isPersistent) {
                    console.warn('⚠️ Storage may be cleared. Audio files could be lost.');
                }
            } catch (err) {
                console.warn('Could not request persistent storage:', err);
            }
        }
    }
}

// Initialize immediately
const backgroundAudioHandler = new BackgroundAudioHandler();

// Make globally available
window.backgroundAudioHandler = backgroundAudioHandler;

console.log('✅ COMPLETE background-audio-handler.js loaded');