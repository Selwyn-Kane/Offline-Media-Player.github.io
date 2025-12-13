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
        
        // Media element sources for Web Audio API
        this.currentSource = null;
        this.nextSource = null;
        
        // Gain nodes for crossfade
        this.currentGain = null;
        this.nextGain = null;
        
        // Audio chain connections
        this.masterGain = null;
        this.destination = null;
        
        // Track queue
        this.nextTrack = null;
        this.isTransitioning = false;
        
        // Transition timer
        this.transitionTimer = null;
    }
    
    /**
     * Initialize crossfade system
     */
    init(playerElement, destination) {
        this.currentPlayer = playerElement;
        this.destination = destination;
        
        // Create second audio element for crossfade
        this.nextPlayer = document.createElement('audio');
        this.nextPlayer.id = 'audio-player-next';
        this.nextPlayer.preload = 'auto';
        this.nextPlayer.crossOrigin = 'anonymous';
        this.nextPlayer.style.display = 'none';
        document.body.appendChild(this.nextPlayer);
        
        // Create gain nodes
        this.currentGain = this.audioContext.createGain();
        this.nextGain = this.audioContext.createGain();
        this.masterGain = this.audioContext.createGain();
        
        // Set initial gain values
        this.currentGain.gain.value = 1.0;
        this.nextGain.gain.value = 0.0;
        this.masterGain.gain.value = 1.0;
        
        // Connect gain nodes to master and destination
        this.currentGain.connect(this.masterGain);
        this.nextGain.connect(this.masterGain);
        this.masterGain.connect(this.destination);
        
        // Create media source for current player and connect
        this.connectCurrentPlayer();
        
        // Load saved preferences
        this.loadPreferences();
        
        this.debugLog('✅ Crossfade system initialized', 'success');
    }
    
    /**
     * Connect current player to audio graph
     */
    connectCurrentPlayer() {
        try {
            // Disconnect old source if exists
            if (this.currentSource) {
                this.currentSource.disconnect();
            }
            
            // Create new media element source
            this.currentSource = this.audioContext.createMediaElementSource(this.currentPlayer);
            this.currentSource.connect(this.currentGain);
            
        } catch (error) {
            // Source might already exist, ignore
            this.debugLog('Current player already connected to audio context', 'info');
        }
    }
    
    /**
     * Load saved preferences from localStorage
     */
    loadPreferences() {
        try {
            const savedEnabled = localStorage.getItem('crossfadeEnabled');
            const savedDuration = localStorage.getItem('crossfadeDuration');
            
            if (savedEnabled !== null) {
                this.enabled = savedEnabled === 'true';
            }
            
            if (savedDuration !== null) {
                this.duration = parseFloat(savedDuration);
            }
        } catch (error) {
            this.debugLog('Could not load crossfade preferences', 'warning');
        }
    }
    
    /**
     * Determine optimal crossfade point based on analysis
     */
    determineStartPoint(track) {
        if (!track || !track.analysis) {
            return 0; // No analysis, start at beginning
        }
        
        const { bpm, energy, intro } = track.analysis;
        
        // Skip quiet intros for high-energy tracks
        if (energy > 0.7 && intro && intro.duration > 3) {
            this.debugLog(`⏭️ Skipping ${intro.duration.toFixed(1)}s intro (high energy)`, 'info');
            return intro.end || 5;
        }
        
        // For calm tracks, include intro
        if (energy < 0.4) {
            return 0;
        }
        
        // For moderate energy, skip first few seconds if very quiet
        if (energy > 0.5 && energy <= 0.7 && intro && intro.duration > 1) {
            return Math.min(2, intro.end || 2);
        }
        
        return 0;
    }
    
    /**
     * Determine optimal crossfade exit point for current track
     */
    determineExitPoint(track, trackDuration) {
        if (!track || !track.analysis || !trackDuration) {
            return trackDuration - this.duration - 5; // Default: start fade 5s before end
        }
        
        const { outro, energy } = track.analysis;
        
        // For high energy tracks with outros, start fade during outro
        if (energy > 0.6 && outro && outro.start) {
            const fadeStart = outro.start - (this.duration / 2);
            this.debugLog(`🎵 Starting fade during outro at ${fadeStart.toFixed(1)}s`, 'info');
            return fadeStart;
        }
        
        // For lower energy tracks, fade out earlier
        if (energy < 0.4) {
            return trackDuration - this.duration - 8;
        }
        
        // Default: start fade duration + 3s before track ends
        return trackDuration - this.duration - 3;
    }
    
    /**
     * Calculate optimal crossfade duration
     */
    calculateCrossfadeDuration(currentTrack, nextTrack) {
        if (!currentTrack || !nextTrack) {
            return this.duration; // Default
        }
        
        const currentAnalysis = currentTrack.analysis;
        const nextAnalysis = nextTrack.analysis;
        
        if (!currentAnalysis || !nextAnalysis) {
            return this.duration;
        }
        
        const currentBPM = currentAnalysis.bpm || 120;
        const nextBPM = nextAnalysis.bpm || 120;
        const bpmDiff = Math.abs(currentBPM - nextBPM);
        
        const currentEnergy = currentAnalysis.energy || 0.5;
        const nextEnergy = nextAnalysis.energy || 0.5;
        const energyDiff = Math.abs(currentEnergy - nextEnergy);
        
        // Similar BPM and energy = longer crossfade (smoother mix)
        if (bpmDiff < 5 && energyDiff < 0.2) {
            return Math.min(6, this.duration + 2);
        }
        
        // Very different BPM = shorter crossfade (quick cut)
        if (bpmDiff > 25) {
            return Math.max(1.5, this.duration - 1);
        }
        
        // Large energy difference = medium-short crossfade
        if (energyDiff > 0.4) {
            return Math.max(2, this.duration - 0.5);
        }
        
        return this.duration;
    }
    
    /**
     * Preload next track
     */
    async preloadNext(nextTrack) {
        if (!this.enabled || !nextTrack) {
            return;
        }
        
        this.nextTrack = nextTrack;
        
        try {
            // Set source
            this.nextPlayer.src = nextTrack.audioURL;
            
            // Create media source if not exists
            if (!this.nextSource) {
                try {
                    this.nextSource = this.audioContext.createMediaElementSource(this.nextPlayer);
                    this.nextSource.connect(this.nextGain);
                } catch (error) {
                    this.debugLog('Next player source already connected', 'info');
                }
            }
            
            // Preload without starting playback
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Preload timeout')), 5000);
                
                this.nextPlayer.addEventListener('loadeddata', () => {
                    clearTimeout(timeout);
                    resolve();
                }, { once: true });
                
                this.nextPlayer.addEventListener('error', (e) => {
                    clearTimeout(timeout);
                    reject(e);
                }, { once: true });
                
                this.nextPlayer.load();
            });
            
            this.debugLog(`🔥 Preloaded: ${nextTrack.metadata?.title || 'Unknown'}`, 'success');
            
        } catch (error) {
            this.debugLog(`⚠️ Preload failed: ${error.message}`, 'warning');
        }
    }
    
    /**
     * Start crossfade transition
     */
    async startCrossfade(currentTrack, nextTrack, currentTime, duration) {
        if (!this.enabled || this.isTransitioning) {
            return null;
        }
        
        if (!this.nextTrack || this.nextTrack !== nextTrack) {
            await this.preloadNext(nextTrack);
        }
        
        this.isTransitioning = true;
        
        // Calculate optimal parameters
        const startPoint = this.determineStartPoint(nextTrack);
        const fadeDuration = this.calculateCrossfadeDuration(currentTrack, nextTrack);
        
        this.debugLog(`🎚️ Starting ${fadeDuration.toFixed(1)}s crossfade`, 'info');
        
        try {
            // Set next player start position and start playing
            this.nextPlayer.currentTime = startPoint;
            await this.nextPlayer.play();
            
            // Perform the crossfade using Web Audio API
            const now = this.audioContext.currentTime;
            
            // Fade out current track
            this.currentGain.gain.cancelScheduledValues(now);
            this.currentGain.gain.setValueAtTime(1.0, now);
            this.currentGain.gain.exponentialRampToValueAtTime(0.01, now + fadeDuration);
            
            // Fade in next track
            this.nextGain.gain.cancelScheduledValues(now);
            this.nextGain.gain.setValueAtTime(0.01, now);
            this.nextGain.gain.exponentialRampToValueAtTime(1.0, now + fadeDuration);
            
            // After fade completes, swap players
            this.transitionTimer = setTimeout(() => {
                this.completeTransition();
            }, fadeDuration * 1000);
            
            return { 
                startPoint, 
                fadeDuration,
                success: true 
            };
            
        } catch (error) {
            this.debugLog(`❌ Crossfade failed: ${error.message}`, 'error');
            this.isTransitioning = false;
            return null;
        }
    }
    
    /**
     * Complete transition and swap players
     */
    completeTransition() {
        // Stop current player
        this.currentPlayer.pause();
        
        // Swap references
        [this.currentPlayer, this.nextPlayer] = [this.nextPlayer, this.currentPlayer];
        [this.currentSource, this.nextSource] = [this.nextSource, this.currentSource];
        [this.currentGain, this.nextGain] = [this.nextGain, this.currentGain];
        
        // Reset gains for next transition
        const now = this.audioContext.currentTime;
        this.currentGain.gain.cancelScheduledValues(now);
        this.currentGain.gain.setValueAtTime(1.0, now);
        this.nextGain.gain.cancelScheduledValues(now);
        this.nextGain.gain.setValueAtTime(0.0, now);
        
        // Clear next track reference
        this.nextTrack = null;
        this.isTransitioning = false;
        
        this.debugLog('✅ Transition complete', 'success');
    }
    
    /**
     * Cancel ongoing transition
     */
    cancelTransition() {
        if (this.transitionTimer) {
            clearTimeout(this.transitionTimer);
            this.transitionTimer = null;
        }
        
        if (this.isTransitioning) {
            // Stop next player
            this.nextPlayer.pause();
            this.nextPlayer.currentTime = 0;
            
            // Reset gains immediately
            const now = this.audioContext.currentTime;
            this.currentGain.gain.cancelScheduledValues(now);
            this.currentGain.gain.setValueAtTime(1.0, now);
            this.nextGain.gain.cancelScheduledValues(now);
            this.nextGain.gain.setValueAtTime(0.0, now);
            
            this.isTransitioning = false;
            this.nextTrack = null;
            
            this.debugLog('🚫 Transition cancelled', 'info');
        }
    }
    
    /**
     * Check if should start crossfade based on current playback position
     */
    shouldStartCrossfade(currentTrack, currentTime, duration) {
        if (!this.enabled || this.isTransitioning || !this.nextTrack) {
            return false;
        }
        
        const exitPoint = this.determineExitPoint(currentTrack, duration);
        return currentTime >= exitPoint;
    }
    
    /**
     * Enable/disable crossfade
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        
        // Cancel any ongoing transition when disabling
        if (!enabled) {
            this.cancelTransition();
        }
        
        this.debugLog(`Crossfade: ${enabled ? 'ON ✨' : 'OFF'}`, enabled ? 'success' : 'info');
        
        try {
            localStorage.setItem('crossfadeEnabled', enabled.toString());
        } catch (error) {
            // Ignore localStorage errors
        }
    }
    
    /**
     * Set crossfade duration
     */
    setDuration(seconds) {
        this.duration = Math.max(1, Math.min(10, seconds)); // 1-10 seconds
        
        try {
            localStorage.setItem('crossfadeDuration', this.duration.toString());
        } catch (error) {
            // Ignore localStorage errors
        }
        
        this.debugLog(`Crossfade duration: ${this.duration}s`, 'info');
    }
    
    /**
     * Get current settings
     */
    getSettings() {
        return {
            enabled: this.enabled,
            duration: this.duration,
            isTransitioning: this.isTransitioning
        };
    }
    
    /**
     * Clean up resources
     */
    dispose() {
        this.cancelTransition();
        
        if (this.currentSource) {
            this.currentSource.disconnect();
        }
        
        if (this.nextSource) {
            this.nextSource.disconnect();
        }
        
        if (this.nextPlayer && this.nextPlayer.parentNode) {
            this.nextPlayer.pause();
            this.nextPlayer.src = '';
            this.nextPlayer.parentNode.removeChild(this.nextPlayer);
        }
        
        this.debugLog('🧹 Crossfade manager disposed', 'info');
    }
}

window.CrossfadeManager = CrossfadeManager;