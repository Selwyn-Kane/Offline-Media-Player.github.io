/* ============================================
   Crossfade Manager - Intelligent Transitions
   ============================================ */

class CrossfadeManager {
    constructor(audioContext, debugLog) {
        this.audioContext = audioContext;
        this.debugLog = debugLog;
        
        this.enabled = false;
        this.duration = 3; // seconds
        
        // Dual audio system
        this.currentPlayer = null;
        this.nextPlayer = null;
        
        // Gain nodes for crossfade
        this.currentGain = null;
        this.nextGain = null;
        
        // Audio chain connections
        this.masterGain = null;
        
        // Track queue
        this.nextTrack = null;
        this.isTransitioning = false;
    }
    
    /**
     * Initialize crossfade system
     */
    init(playerElement, audioSource, destination) {
        this.currentPlayer = playerElement;
        
        // Create second audio element for crossfade
        this.nextPlayer = document.createElement('audio');
        this.nextPlayer.id = 'audio-player-next';
        this.nextPlayer.preload = 'auto';
        this.nextPlayer.style.display = 'none';
        document.body.appendChild(this.nextPlayer);
        
        // Create gain nodes
        this.currentGain = this.audioContext.createGain();
        this.nextGain = this.audioContext.createGain();
        this.masterGain = this.audioContext.createGain();
        
        // Initially mute next player
        this.currentGain.gain.value = 1.0;
        this.nextGain.gain.value = 0.0;
        this.masterGain.gain.value = 1.0;
        
        // Connect audio chain
        // Current: source → currentGain → masterGain → destination
        // Next: (will be created when needed)
        
        this.debugLog('✅ Crossfade system initialized', 'success');
    }
    
    /**
     * Determine optimal crossfade point based on analysis
     */
    determineStartPoint(track) {
        if (!track.analysis) {
            return 0; // No analysis, start at beginning
        }
        
        const { bpm, energy, intro } = track.analysis;
        
        // Skip quiet intros for high-energy tracks
        if (energy > 0.7 && intro && intro.duration > 3) {
            this.debugLog(`⏭️ Skipping ${intro.duration}s intro (high energy track)`, 'info');
            return intro.end || 5; // Start after intro
        }
        
        // For calm tracks, include intro
        if (energy < 0.4) {
            return 0;
        }
        
        // For moderate energy, skip first few seconds if very quiet
        if (energy > 0.5 && energy <= 0.7) {
            return 2; // Skip 2s of potential silence
        }
        
        return 0;
    }
    
    /**
     * Calculate optimal crossfade duration
     */
    calculateCrossfadeDuration(currentTrack, nextTrack) {
        if (!currentTrack.analysis || !nextTrack.analysis) {
            return this.duration; // Default 3s
        }
        
        const currentBPM = currentTrack.analysis.bpm;
        const nextBPM = nextTrack.analysis.bpm;
        const bpmDiff = Math.abs(currentBPM - nextBPM);
        
        // Similar BPM = longer crossfade (smoother mix)
        if (bpmDiff < 5) {
            return 5; // 5 second blend
        }
        
        // Very different BPM = shorter crossfade (quick cut)
        if (bpmDiff > 20) {
            return 2; // 2 second quick fade
        }
        
        // Moderate difference = standard crossfade
        return 3;
    }
    
    /**
     * Preload next track
     */
    async preloadNext(nextTrack) {
        if (!this.enabled || !nextTrack) return;
        
        this.nextTrack = nextTrack;
        
        // Determine optimal start point
        const startPoint = this.determineStartPoint(nextTrack);
        
        // Set source
        this.nextPlayer.src = nextTrack.audioURL;
        this.nextPlayer.currentTime = startPoint;
        
        // Preload
        await this.nextPlayer.load();
        
        this.debugLog(`📥 Preloaded next track: ${nextTrack.metadata?.title} (start: ${startPoint}s)`, 'success');
    }
    
    /**
     * Start crossfade transition
     */
async startCrossfade(currentTrack, nextTrack) {
    if (!this.enabled || this.isTransitioning) return;
    
    this.isTransitioning = true;
    
    // ✅ Simplified approach - use intelligent start point
    const startPoint = this.determineStartPoint(nextTrack);
    
    this.debugLog(`🎚️ Quick transition to next track (start: ${startPoint}s)`, 'info');
    
    // Just proceed with normal track change
    this.isTransitioning = false;
    
    return { startPoint }; // Return the start point for playNext() to use
}
    
    /**
     * Swap current and next players
     */
    swapPlayers() {
        // Stop and clear current player
        this.currentPlayer.pause();
        this.currentPlayer.src = '';
        
        // Swap references
        const temp = this.currentPlayer;
        this.currentPlayer = this.nextPlayer;
        this.nextPlayer = temp;
        
        // Reset gains
        this.currentGain.gain.value = 1.0;
        this.nextGain.gain.value = 0.0;
        
        // Update UI reference (important!)
        const mainPlayer = document.getElementById('audio-player');
        mainPlayer.src = this.currentPlayer.src;
        mainPlayer.currentTime = this.currentPlayer.currentTime;
    }
    
    /**
     * Enable/disable crossfade
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        this.debugLog(`Crossfade: ${enabled ? 'ON' : 'OFF'}`, enabled ? 'success' : 'info');
        
        // Save preference
        localStorage.setItem('crossfadeEnabled', enabled);
    }
    
    /**
     * Set crossfade duration
     */
    setDuration(seconds) {
        this.duration = Math.max(1, Math.min(10, seconds)); // 1-10 seconds
        localStorage.setItem('crossfadeDuration', this.duration);
    }
}

window.CrossfadeManager = CrossfadeManager;