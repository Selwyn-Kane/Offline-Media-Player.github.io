/* ============================================
   Volume Control System
   Handles volume slider, mute/unmute, mouse wheel, and persistence
   ============================================ */

class VolumeControl {
    constructor(player, debugLog) {
        this.player = player;
        this.debugLog = debugLog;
        this.lastVolume = 1;
        this.volumeSaveTimeout = null;
        
        // Get DOM elements
        this.volumeSlider = document.getElementById('volume-slider');
        this.volumeIcon = document.getElementById('volume-icon');
        this.volumePercentage = document.getElementById('volume-percentage');
        
        if (!this.volumeSlider || !this.volumeIcon || !this.volumePercentage) {
            console.error('Volume control elements not found in DOM');
            return;
        }
        
        this.init();
    }
    
    /**
     * Initialize volume control
     */
    init() {
        // Load saved volume
        const savedVolume = localStorage.getItem('playerVolume');
        if (savedVolume) {
            this.player.volume = parseFloat(savedVolume);
            this.volumeSlider.value = this.player.volume;
        } else {
            this.player.volume = 1;
            this.volumeSlider.value = 1;
        }
        
        // Initial UI update
        this.updateUI();
        
        // Set up event listeners
        this.setupEventListeners();
        
        this.debugLog('✅ Volume control initialized', 'success');
    }
    
    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Slider input handler
        this.volumeSlider.oninput = (e) => {
            const newVolume = parseFloat(e.target.value);
            this.player.volume = newVolume;
            if (this.player.muted && newVolume > 0) {
                this.player.muted = false;
            }
            this.updateUI();
        };
        
        // Mouse wheel on slider
        this.volumeSlider.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.05 : 0.05; // Scroll down = quieter, up = louder
            const newVolume = Math.max(0, Math.min(1, this.player.volume + delta));
            this.player.volume = newVolume;
            this.volumeSlider.value = newVolume;
            if (this.player.muted && newVolume > 0) {
                this.player.muted = false;
            }
            this.updateUI();
        });
        
        // Icon click to mute/unmute
        this.volumeIcon.onclick = () => {
            this.toggleMute();
        };
        
        // Save volume changes (debounced)
        this.player.addEventListener('volumechange', () => {
            // Update UI immediately for responsiveness
            const volume = this.player.volume;
            const percent = Math.round(volume * 100);
            this.volumePercentage.textContent = `${percent}%`;
            this.volumeSlider.style.setProperty('--volume-percent', `${percent}%`);
            
            // Update icon based on volume level
            if (this.player.muted || volume === 0) {
                this.volumeIcon.textContent = '🔇';
            } else if (volume < 0.3) {
                this.volumeIcon.textContent = '🔈';
            } else if (volume < 0.7) {
                this.volumeIcon.textContent = '🔉';
            } else {
                this.volumeIcon.textContent = '🔊';
            }
            
            // Debounce localStorage writes and debug logs
            clearTimeout(this.volumeSaveTimeout);
            this.volumeSaveTimeout = setTimeout(() => {
                localStorage.setItem('playerVolume', this.player.volume);
                this.debugLog(`Volume: ${percent}%${this.player.muted ? ' (Muted)' : ''}`);
            }, 500);
        });
    }
    
    /**
     * Update volume UI (icon and percentage)
     */
    updateUI() {
        const volume = this.player.volume;
        const percent = Math.round(volume * 100);
        
        // Update percentage display
        this.volumePercentage.textContent = `${percent}%`;
        
        // Update slider track color (for webkit browsers)
        this.volumeSlider.style.setProperty('--volume-percent', `${percent}%`);
        
        // Update icon based on volume level
        if (this.player.muted || volume === 0) {
            this.volumeIcon.textContent = '🔇';
        } else if (volume < 0.3) {
            this.volumeIcon.textContent = '🔈';
        } else if (volume < 0.7) {
            this.volumeIcon.textContent = '🔉';
        } else {
            this.volumeIcon.textContent = '🔊';
        }
        
        this.debugLog(`Volume: ${percent}%${this.player.muted ? ' (Muted)' : ''}`);
    }
    
    /**
     * Toggle mute/unmute
     */
    toggleMute() {
        if (this.player.muted) {
            this.player.muted = false;
            this.player.volume = this.lastVolume;
            this.volumeSlider.value = this.lastVolume;
        } else {
            this.lastVolume = this.player.volume;
            this.player.muted = true;
        }
        this.updateUI();
    }
    
    /**
     * Set volume programmatically
     * @param {number} volume - Volume level (0-1)
     */
    setVolume(volume) {
        volume = Math.max(0, Math.min(1, volume));
        this.player.volume = volume;
        this.volumeSlider.value = volume;
        if (this.player.muted && volume > 0) {
            this.player.muted = false;
        }
        this.updateUI();
    }
    
    /**
     * Increase volume by delta
     * @param {number} delta - Amount to increase (default 0.1)
     */
    increaseVolume(delta = 0.1) {
        const newVolume = Math.min(1, this.player.volume + delta);
        this.setVolume(newVolume);
    }
    
    /**
     * Decrease volume by delta
     * @param {number} delta - Amount to decrease (default 0.1)
     */
    decreaseVolume(delta = 0.1) {
        const newVolume = Math.max(0, this.player.volume - delta);
        this.setVolume(newVolume);
    }
    
    /**
     * Get current volume
     * @returns {number} Current volume (0-1)
     */
    getVolume() {
        return this.player.volume;
    }
    
    /**
     * Check if muted
     * @returns {boolean} True if muted
     */
    isMuted() {
        return this.player.muted;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VolumeControl;
}