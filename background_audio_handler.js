/* ============================================
   Background Audio Handler
   Ensures music continues playing when app is closed
   ADD THIS SCRIPT TO index.html BEFORE script.js
   ============================================ */

class BackgroundAudioHandler {
    constructor() {
        this.player = null;
        this.serviceWorkerReady = false;
        this.stateUpdateInterval = null;
        
        this.init();
    }
    
    async init() {
        console.log('🎵 Initializing Background Audio Handler...');
        
        // Wait for DOM to be ready
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
        
        // Register Service Worker
        await this.registerServiceWorker();
        
        // Setup Media Session API (critical for background audio)
        this.setupMediaSession();
        
        // Setup player event listeners
        this.setupPlayerListeners();
        
        // Listen for widget commands
        this.setupWidgetListeners();
        
        // Periodic state broadcast
        this.startStateBroadcast();
        
        console.log('✅ Background Audio Handler initialized');
    }
    
    async registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.warn('⚠️ Service Worker not supported');
            return;
        }
        
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js');
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
    
    setupMediaSession() {
        if (!('mediaSession' in navigator)) {
            console.warn('⚠️ Media Session API not supported');
            return;
        }
        
        console.log('🎮 Setting up Media Session API for background playback...');
        
        // These action handlers are CRITICAL for Android background audio
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
    
    setupPlayerListeners() {
        if (!this.player) return;
        
        // Update Media Session metadata when track changes
        this.player.addEventListener('loadedmetadata', () => {
            this.updateMediaSessionMetadata();
        });
        
        // Broadcast state on play/pause
        this.player.addEventListener('play', () => {
            this.broadcastState();
            navigator.mediaSession.playbackState = 'playing';
        });
        
        this.player.addEventListener('pause', () => {
            this.broadcastState();
            navigator.mediaSession.playbackState = 'paused';
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
    
    setupWidgetListeners() {
        if (!('serviceWorker' in navigator)) return;
        
        // Listen for commands from widgets via Service Worker
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data.type === 'WIDGET_COMMAND') {
                console.log('📱 Widget command received:', event.data.action);
                this.handleWidgetCommand(event.data.action);
            } else if (event.data.type === 'UPDATE_MEDIA_SESSION') {
                // Service Worker requests media session update
                this.updateMediaSessionMetadata();
            }
        });
    }
    
    handleWidgetCommand(action) {
        switch (action) {
            case 'PLAY':
                if (this.player) this.player.play();
                break;
            case 'PAUSE':
                if (this.player) this.player.pause();
                break;
            case 'PLAY_PAUSE':
                if (this.player) {
                    this.player.paused ? this.player.play() : this.player.pause();
                }
                break;
            case 'NEXT':
                this.triggerCommand('NEXT');
                break;
            case 'PREVIOUS':
                this.triggerCommand('PREVIOUS');
                break;
        }
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
        
        // Get current state from global variables
        const state = this.getCurrentState();
        
        // Send to Service Worker
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
        
        // Get track info from global playlist
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
        // Broadcast state every 2 seconds to keep widgets updated
        this.stateUpdateInterval = setInterval(() => {
            this.broadcastState();
        }, 5000);
        
        // Keep service worker alive on Android
        if (this.serviceWorkerReady) {
            setInterval(() => {
                if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                        type: 'KEEP_ALIVE'
                    });
                }
            }, 10000); // Every 10 seconds
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
