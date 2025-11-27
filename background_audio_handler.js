/* ============================================
   Background Audio Handler - FIXED
   ============================================ */

class BackgroundAudioHandler {
    constructor() {
        this.player = null;
        this.serviceWorkerReady = false;
        this.stateUpdateInterval = null;
        this.mediaSessionInitialized = false;
        
        this.init();
    }
    
    async init() {
        console.log('🎵 Initializing Background Audio Handler...');
        
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
        
        // Register Service Worker for PWA (not extension)
        await this.registerServiceWorker();
        
        // Setup player event listeners
        this.setupPlayerListeners();
        
        // Periodic state broadcast
        this.startStateBroadcast();
        
        console.log('✅ Background Audio Handler initialized');
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
            // Use relative path for better compatibility
            const registration = await navigator.serviceWorker.register('./service-worker.js', {
                scope: './'
            });
            
            console.log('✅ Service Worker registered:', registration.scope);
            
            // Wait for service worker to be ready
            await navigator.serviceWorker.ready;
            this.serviceWorkerReady = true;
            console.log('✅ Service Worker ready for background audio');
            
            // Request persistent storage for Android
            if (navigator.storage && navigator.storage.persist) {
                const isPersistent = await navigator.storage.persist();
                console.log(`💾 Persistent storage: ${isPersistent ? 'granted' : 'denied'}`);
            }
        } catch (err) {
            console.error('❌ Service Worker registration failed:', err);
        }
    }
    
    setupPlayerListeners() {
        if (!this.player) return;
        
        // Initialize Media Session on first play
        this.player.addEventListener('play', () => {
            if (!this.mediaSessionInitialized) {
                this.setupMediaSession();
                this.mediaSessionInitialized = true;
            }
            
            this.updateMediaSessionMetadata();
            this.broadcastState();
            
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'playing';
            }
        }, { once: false });
        
        this.player.addEventListener('pause', () => {
            this.broadcastState();
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'paused';
            }
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
                    // Ignore errors (happens if duration is not available yet)
                }
            }
        });
        
        // Update metadata when track changes
        this.player.addEventListener('loadedmetadata', () => {
            this.updateMediaSessionMetadata();
        });
    }
    
    setupMediaSession() {
        if (!('mediaSession' in navigator)) {
            console.warn('⚠️ Media Session API not supported');
            return;
        }
        
        console.log('🎮 Setting up Media Session API for background playback...');
        
        // CRITICAL: These handlers enable background audio
        navigator.mediaSession.setActionHandler('play', () => {
            console.log('📱 Media Session: Play');
            if (this.player) this.player.play();
        });
        
        navigator.mediaSession.setActionHandler('pause', () => {
            console.log('📱 Media Session: Pause');
            if (this.player) this.player.pause();
        });
        
        navigator.mediaSession.setActionHandler('previoustrack', () => {
            console.log('📱 Media Session: Previous');
            this.triggerCommand('PREVIOUS');
        });
        
        navigator.mediaSession.setActionHandler('nexttrack', () => {
            console.log('📱 Media Session: Next');
            this.triggerCommand('NEXT');
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
            if (this.player && details.seekTime) {
                this.player.currentTime = details.seekTime;
            }
        });
        
        console.log('✅ Media Session handlers configured');
    }
    
    updateMediaSessionMetadata() {
        if (!('mediaSession' in navigator)) return;
        
        // Get current track info from global playlist
        if (typeof currentTrackIndex === 'undefined' || typeof playlist === 'undefined') {
            return;
        }
        
        if (currentTrackIndex === -1 || !playlist[currentTrackIndex]) {
            navigator.mediaSession.metadata = null;
            return;
        }
        
        const track = playlist[currentTrackIndex];
        const metadata = track.metadata || {};
        
        navigator.mediaSession.metadata = new MediaMetadata({
            title: metadata.title || track.fileName || 'Unknown Track',
            artist: metadata.artist || 'Unknown Artist',
            album: metadata.album || 'Unknown Album',
            artwork: metadata.image ? [
                { src: metadata.image, sizes: '512x512', type: 'image/jpeg' }
            ] : []
        });
        
        console.log('🎵 Media Session metadata updated:', metadata.title);
    }
    
    triggerCommand(command) {
        // Trigger button clicks in main app
        const buttons = {
            'NEXT': document.getElementById('next-button'),
            'PREVIOUS': document.getElementById('prev-button')
        };
        
        const btn = buttons[command];
        if (btn && !btn.disabled) {
            btn.click();
        }
    }
    
    broadcastState() {
        if (!this.serviceWorkerReady || !navigator.serviceWorker.controller) {
            return;
        }
        
        const state = this.getCurrentState();
        
        navigator.serviceWorker.controller.postMessage({
            type: 'UPDATE_STATE',
            state: state
        });
    }
    
    getCurrentState() {
        const state = {
            isPlaying: this.player && !this.player.paused,
            currentTime: this.player ? this.player.currentTime : 0,
            duration: this.player ? this.player.duration : 0,
            progress: this.player && this.player.duration ? 
                (this.player.currentTime / this.player.duration) * 100 : 0,
            currentTrack: {
                title: 'No track loaded',
                artist: '--',
                album: '--',
                albumArt: null
            }
        };
        
        if (typeof currentTrackIndex !== 'undefined' && 
            typeof playlist !== 'undefined' && 
            currentTrackIndex !== -1 && 
            playlist[currentTrackIndex]) {
            
            const track = playlist[currentTrackIndex];
            const metadata = track.metadata || {};
            
            state.currentTrack = {
                title: metadata.title || track.fileName || 'Unknown Track',
                artist: metadata.artist || 'Unknown Artist',
                album: metadata.album || 'Unknown Album',
                albumArt: metadata.image || null
            };
        }
        
        return state;
    }
    
    startStateBroadcast() {
        // Broadcast state every 5 seconds to keep widgets updated
        this.stateUpdateInterval = setInterval(() => {
            this.broadcastState();
        }, 5000);
        
        // Keep service worker alive
        if (this.serviceWorkerReady) {
            setInterval(() => {
                if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                        type: 'KEEP_ALIVE'
                    });
                }
            }, 10000);
        }
    }
    
    destroy() {
        if (this.stateUpdateInterval) {
            clearInterval(this.stateUpdateInterval);
        }
    }
}

// Initialize immediately
const backgroundAudioHandler = new BackgroundAudioHandler();

// Make globally available
window.backgroundAudioHandler = backgroundAudioHandler;

console.log('✅ background-audio-handler.js loaded');