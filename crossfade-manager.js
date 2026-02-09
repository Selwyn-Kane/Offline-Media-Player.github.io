/* ============================================
   Crossfade Manager - COMPLETELY REWRITTEN
   Smart transitions that actually work
   ============================================ */

class CrossfadeManager {
    constructor(audioContext, debugLog) {
        this.audioContext = audioContext;
        this.debugLog = debugLog;
        
        // Core settings
        this.enabled = false;
        this.baseDuration = 4; // Default crossfade duration in seconds
        
        // State tracking
        this.isFading = false;
        this.fadeStartTime = null;
        this.scheduledNextTrack = null;
        this.fadeCheckInterval = null;
        this.lastCheckTime = 0;
        
        // Audio nodes (created lazily)
        this.fadeGainNode = null;
        this.isInitialized = false;
        
        // Next track preload
        this.nextTrackPreloaded = null;
        this.preloadBlob = null;
        
        // Smart fade parameters
        this.minFadeDuration = 1.5;
        this.maxFadeDuration = 8;
        this.fadeStartOffset = 5; // Start fade X seconds before track ends
        
        // Load saved settings
        this.loadSettings();
        
        this.debugLog('✅ Crossfade Manager initialized', 'success');
    }
    
    /**
     * Initialize audio nodes when audio context is ready
     */
    initAudioNodes() {
        if (this.isInitialized || !this.audioContext) {
            return false;
        }
        
        try {
            // Create gain node for fade control
            this.fadeGainNode = this.audioContext.createGain();
            this.fadeGainNode.gain.value = 1.0;
            
            // Store globally for audio chain integration
            window.crossfadeFadeGain = this.fadeGainNode;
            
            this.isInitialized = true;
            this.debugLog('🎚️ Crossfade audio nodes created', 'success');
            return true;
        } catch (err) {
            this.debugLog(`❌ Failed to init crossfade nodes: ${err.message}`, 'error');
            return false;
        }
    }
    
    /**
     * Connect to audio chain - call this after EQ chain is set up
     * Insert between trebleFilter and existing gain/compressor
     */
    connectToAudioChain(inputNode, outputNode) {
        if (!this.isInitialized) {
            this.initAudioNodes();
        }
        
        if (!this.fadeGainNode) {
            this.debugLog('⚠️ Cannot connect - nodes not initialized', 'warning');
            return false;
        }
        
        try {
            // Disconnect existing connection
            inputNode.disconnect();
            
            // Insert our fade gain node
            inputNode.connect(this.fadeGainNode);
            this.fadeGainNode.connect(outputNode);
            
            this.debugLog('✅ Crossfade inserted into audio chain', 'success');
            return true;
        } catch (err) {
            this.debugLog(`❌ Chain connection failed: ${err.message}`, 'error');
            return false;
        }
    }
    
    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const enabled = localStorage.getItem('crossfadeEnabled');
            if (enabled !== null) {
                this.enabled = enabled === 'true';
            }
            
            const duration = localStorage.getItem('crossfadeDuration');
            if (duration !== null) {
                this.baseDuration = parseFloat(duration);
            }
            
            const offset = localStorage.getItem('crossfadeStartOffset');
            if (offset !== null) {
                this.fadeStartOffset = parseFloat(offset);
            }
        } catch (err) {
            this.debugLog('⚠️ Could not load crossfade settings', 'warning');
        }
    }
    
    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('crossfadeEnabled', this.enabled.toString());
            localStorage.setItem('crossfadeDuration', this.baseDuration.toString());
            localStorage.setItem('crossfadeStartOffset', this.fadeStartOffset.toString());
        } catch (err) {
            this.debugLog('⚠️ Could not save crossfade settings', 'warning');
        }
    }
    
    /**
     * Calculate optimal crossfade duration based on track analysis
     */
    calculateFadeDuration(currentTrack, nextTrack) {
        let duration = this.baseDuration;
        
        if (!currentTrack?.analysis || !nextTrack?.analysis) {
            return duration;
        }
        
        const currBPM = currentTrack.analysis.bpm || 120;
        const nextBPM = nextTrack.analysis.bpm || 120;
        const bpmDiff = Math.abs(currBPM - nextBPM);
        
        const currEnergy = currentTrack.analysis.energy || 0.5;
        const nextEnergy = nextTrack.analysis.energy || 0.5;
        const energyDiff = Math.abs(currEnergy - nextEnergy);
        
        // Similar tracks = longer fade (smooth blend)
        if (bpmDiff < 8 && energyDiff < 0.15) {
            duration = Math.min(this.maxFadeDuration, this.baseDuration + 2);
            this.debugLog(`🎵 Similar tracks → ${duration}s fade`, 'info');
        }
        // Very different = shorter fade (quick transition)
        else if (bpmDiff > 30 || energyDiff > 0.5) {
            duration = Math.max(this.minFadeDuration, this.baseDuration - 1.5);
            this.debugLog(`⚡ Different tracks → ${duration}s fade`, 'info');
        }
        
        return duration;
    }
    
    /**
     * Determine when to start fading based on track analysis
     */
    calculateFadeStartPoint(track, duration) {
        if (!track?.analysis || !duration) {
            return duration - this.fadeStartOffset;
        }
        
        const trackDuration = duration;
        const analysis = track.analysis;
        
        // If track has outro, start fade during it
        if (analysis.outro && analysis.outro.start) {
            const outroStart = analysis.outro.start;
            const fadeStart = Math.max(
                trackDuration - this.fadeStartOffset - 3,
                outroStart - (this.baseDuration / 2)
            );
            this.debugLog(`🎼 Fade during outro at ${fadeStart.toFixed(1)}s`, 'info');
            return fadeStart;
        }
        
        // High energy tracks = later fade
        if (analysis.energy > 0.7) {
            const fadeStart = trackDuration - this.fadeStartOffset - 2;
            this.debugLog(`⚡ High energy → fade at ${fadeStart.toFixed(1)}s`, 'info');
            return fadeStart;
        }
        
        // Low energy = earlier fade
        if (analysis.energy < 0.3) {
            const fadeStart = trackDuration - this.fadeStartOffset - 4;
            this.debugLog(`😌 Low energy → fade at ${fadeStart.toFixed(1)}s`, 'info');
            return fadeStart;
        }
        
        // Default
        return trackDuration - this.fadeStartOffset - 3;
    }
    
    /**
     * Preload next track audio data
     */
    async preloadNextTrack(track) {
        if (!track || (!track.audioURL && !track.file)) {
            return false;
        }
        
        try {
            // Clean up previous preload
            if (this.preloadBlob) {
                URL.revokeObjectURL(this.preloadBlob);
                this.preloadBlob = null;
            }
            
            let blob;
            if (track.file) {
                // If we have the file object, use it directly
                blob = track.file;
            } else {
                // Fetch and store
                const response = await fetch(track.audioURL);
                blob = await response.blob();
            }

            this.preloadBlob = URL.createObjectURL(blob);
            this.nextTrackPreloaded = track;
            
            const title = track.metadata?.title || track.fileName;
            this.debugLog(`📥 Preloaded: ${title}`, 'success');
            return true;
        } catch (err) {
            this.debugLog(`⚠️ Preload failed: ${err.message}`, 'warning');
            return false;
        }
    }
    
    /**
     * Start monitoring for crossfade opportunity
     */
    startMonitoring(player, currentTrack, nextTrack, onFadeCallback) {
        if (!this.enabled || !nextTrack) {
            return;
        }
        
        // Initialize nodes if needed
        if (!this.isInitialized) {
            this.initAudioNodes();
        }
        
        // Store callback
        this.onFadeStart = onFadeCallback;
        this.scheduledNextTrack = nextTrack;
        
        // Preload next track
        this.preloadNextTrack(nextTrack);
        
        // Calculate when to start fade
        const fadeDuration = this.calculateFadeDuration(currentTrack, nextTrack);
        const fadeStartTime = this.calculateFadeStartPoint(currentTrack, player.duration);
        
        this.fadeStartTime = fadeStartTime;
        this.fadeDuration = fadeDuration;
        
        // Start checking every 200ms
        this.stopMonitoring(); // Clear any existing
        this.fadeCheckInterval = setInterval(() => {
            this.checkFadePoint(player, currentTrack, nextTrack);
        }, 200);
        
        this.debugLog(`👁️ Monitoring for fade at ${fadeStartTime.toFixed(1)}s (${fadeDuration}s duration)`, 'info');
    }
    
    /**
     * Check if it's time to start fading
     */
    checkFadePoint(player, currentTrack, nextTrack) {
        if (!this.enabled || this.isFading || !player || !this.scheduledNextTrack) {
            return;
        }
        
        const currentTime = player.currentTime;
        const duration = player.duration;
        
        if (!duration || isNaN(duration)) {
            return;
        }

        // Recalculate fade start time if not set or invalid
        if (!this.fadeStartTime || isNaN(this.fadeStartTime)) {
            this.fadeStartTime = this.calculateFadeStartPoint(currentTrack, duration);
        }
        
        if (!this.fadeStartTime || isNaN(this.fadeStartTime)) {
            return;
        }
        
        // Check if we've reached fade point
        if (currentTime >= this.fadeStartTime && currentTime < duration - 0.5) {
            this.debugLog('🎚️ STARTING CROSSFADE', 'success');
            this.executeFade(player, currentTrack, nextTrack);
        }
    }
    
    /**
     * Execute the actual crossfade
     */
async executeFade(player, currentTrack, nextTrack) {
    if (this.isFading) {
        return;
    }
    
    this.isFading = true;
    this.stopMonitoring();
    
    try {
        // Ensure audio context is running
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        
        const fadeDuration = this.fadeDuration || this.baseDuration;
        const now = this.audioContext.currentTime;
        
        // ✅ FIX: Calculate when track ACTUALLY ends
        const currentTime = player.currentTime;
        const timeRemaining = player.duration - currentTime;
        
        // Start fade out
        if (this.fadeGainNode) {
            this.fadeGainNode.gain.cancelScheduledValues(now);
            this.fadeGainNode.gain.setValueAtTime(1.0, now);
            this.fadeGainNode.gain.exponentialRampToValueAtTime(0.001, now + fadeDuration);
            
            this.debugLog(`📉 Fading out over ${fadeDuration}s`, 'info');
        }
        
        // ✅ NEW: Switch when track has 0.5s left (not at midpoint)
        const switchDelay = Math.max(100, (timeRemaining - 0.5) * 1000);
        
        this.debugLog(`🔄 Will switch in ${(switchDelay/1000).toFixed(1)}s`, 'info');
        
        setTimeout(() => {
            this.switchToNextTrack(player, nextTrack);
        }, switchDelay);
        
        // Reset after fade completes
        setTimeout(() => {
            this.completeFade();
        }, fadeDuration * 1000 + 500);
        
    } catch (err) {
        this.debugLog(`❌ Fade execution failed: ${err.message}`, 'error');
        this.isFading = false;
    }
}
    
    /**
     * Switch to next track during fade
     */
switchToNextTrack(player, nextTrack) {
    if (!this.onFadeStart) {
        return;
    }
    
    this.debugLog('🔄 Switching tracks...', 'info');
    
    // ✅ Calculate intro skip time
    let startTime = 0;
    if (nextTrack.analysis?.intro && nextTrack.analysis.intro.end) {
        // Skip intro if it's longer than 2 seconds
        if (nextTrack.analysis.intro.end > 2) {
            startTime = Math.min(8, nextTrack.analysis.intro.end);
            this.debugLog(`⏭️ Intro detected: ${startTime.toFixed(1)}s`, 'info');
        }
    }
    
    // Call the callback with intro skip info
    this.onFadeStart({
        track: nextTrack,
        startTime: startTime,
        preloadedURL: this.preloadBlob
    });
}
    
    /**
     * Complete fade and reset
     */
    completeFade() {
        if (!this.isFading) {
            return;
        }
        
        this.isFading = false;
        
        // Restore gain to full
        if (this.fadeGainNode && this.audioContext) {
            const now = this.audioContext.currentTime;
            this.fadeGainNode.gain.cancelScheduledValues(now);
            this.fadeGainNode.gain.setValueAtTime(1.0, now);
        }
        
        // Clean up
        if (this.preloadBlob) {
            URL.revokeObjectURL(this.preloadBlob);
            this.preloadBlob = null;
        }
        
        this.scheduledNextTrack = null;
        this.fadeStartTime = null;
        this.fadeDuration = null;
        
        this.debugLog('✅ Crossfade complete', 'success');
    }
    
    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (this.fadeCheckInterval) {
            clearInterval(this.fadeCheckInterval);
            this.fadeCheckInterval = null;
        }
    }
    
    /**
     * Cancel active fade
     */
    cancelFade() {
        this.stopMonitoring();
        
        if (this.isFading && this.fadeGainNode && this.audioContext) {
            const now = this.audioContext.currentTime;
            this.fadeGainNode.gain.cancelScheduledValues(now);
            this.fadeGainNode.gain.setValueAtTime(1.0, now);
        }
        
        this.isFading = false;
        this.scheduledNextTrack = null;
        this.fadeStartTime = null;
        
        if (this.preloadBlob) {
            URL.revokeObjectURL(this.preloadBlob);
            this.preloadBlob = null;
        }
        
        this.debugLog('🚫 Crossfade cancelled', 'info');
    }
    
    /**
     * Enable/disable crossfade
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        
        if (!enabled) {
            this.cancelFade();
        }
        
        this.saveSettings();
        this.debugLog(`Crossfade: ${enabled ? 'ON ✨' : 'OFF'}`, enabled ? 'success' : 'info');
    }
    
    /**
     * Set base fade duration
     */
    setDuration(seconds) {
        this.baseDuration = Math.max(this.minFadeDuration, Math.min(this.maxFadeDuration, seconds));
        this.saveSettings();
        this.debugLog(`Crossfade duration: ${this.baseDuration}s`, 'info');
    }
    
    /**
     * Set fade start offset
     */
    setStartOffset(seconds) {
        this.fadeStartOffset = Math.max(3, Math.min(10, seconds));
        this.saveSettings();
        this.debugLog(`Fade start offset: ${this.fadeStartOffset}s`, 'info');
    }
    
    /**
     * Get current settings
     */
    getSettings() {
        return {
            enabled: this.enabled,
            baseDuration: this.baseDuration,
            fadeStartOffset: this.fadeStartOffset,
            isFading: this.isFading,
            isInitialized: this.isInitialized
        };
    }
    
    /**
     * Clean up resources
     */
    dispose() {
        this.cancelFade();
        this.stopMonitoring();
        
        if (this.preloadBlob) {
            URL.revokeObjectURL(this.preloadBlob);
        }
        
        if (this.fadeGainNode) {
            try {
                this.fadeGainNode.disconnect();
            } catch (err) {
                // Ignore
            }
        }
        
        this.debugLog('🧹 Crossfade manager disposed', 'info');
    }
}

// Export
window.CrossfadeManager = CrossfadeManager;