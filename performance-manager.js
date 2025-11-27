/* ============================================
   Performance Manager - CPU Optimization
   ============================================ */

class PerformanceManager {
    constructor() {
        this.isTabVisible = !document.hidden;
        this.currentMode = 'full'; // 'full', 'compact', 'mini'
        this.isPlaying = false;
        
        // Update intervals (in milliseconds)
        this.intervals = {
            full: {
                visualizer: 16.67,      // 60 FPS
                progress: 200,          // 5 FPS
                lyrics: 500            // 2 FPS
            },
            compact: {
                visualizer: 0,          // OFF
                progress: 333,          // 3 FPS
                lyrics: 1000           // 1 FPS
            },
            mini: {
                visualizer: 0,          // OFF
                progress: 500,          // 2 FPS
                lyrics: 0              // OFF
            },
            background: {
                visualizer: 0,          // OFF
                progress: 1000,         // 1 FPS
                lyrics: 0              // OFF
            }
        };
        
        // Track last update times
        this.lastUpdate = {
            progress: 0,
            lyrics: 0
        };
        
        this.setupVisibilityTracking();
    }
    
    setupVisibilityTracking() {
        document.addEventListener('visibilitychange', () => {
            this.isTabVisible = !document.hidden;
            this.updatePerformanceMode();
        });
    }
    
    setMode(mode) {
        this.currentMode = mode;
        this.updatePerformanceMode();
    }
    
    setPlayState(playing) {
        this.isPlaying = playing;
        this.updatePerformanceMode();
    }
    
    updatePerformanceMode() {
        // If tab is hidden, use background mode regardless
        if (!this.isTabVisible) {
            this.activeMode = 'background';
            return;
        }
        
        // Otherwise use the current UI mode
        this.activeMode = this.currentMode;
    }
    
    shouldUpdate(type) {
        const now = performance.now();
        const interval = this.intervals[this.activeMode][type];
        
        // If interval is 0, never update
        if (interval === 0) return false;
        
        // Check if enough time has passed
        if (now - this.lastUpdate[type] >= interval) {
            this.lastUpdate[type] = now;
            return true;
        }
        
        return false;
    }
    
    shouldRunVisualizer() {
        // Only run in full mode, when tab is visible, and when playing
        return this.activeMode === 'full' && this.isTabVisible && this.isPlaying;
    }
    
    getVisualizerFPS() {
        if (this.activeMode === 'full' && this.isTabVisible) {
            return 60;
        }
        return 0;
    }
}

// Export singleton instance
const perfManager = new PerformanceManager();