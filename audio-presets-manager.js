/* ============================================
   Audio Presets Manager
   ============================================ */

class AudioPresetsManager {
    constructor(bassFilter, midFilter, trebleFilter, debugLog) {
        this.bassFilter = bassFilter;
        this.midFilter = midFilter;
        this.trebleFilter = trebleFilter;
        this.debugLog = debugLog;
        
        // Define presets with meaningful names instead of magic numbers
        this.presets = {
            flat: {
                name: 'Flat (Default)',
                bass: 0,
                mid: 0,
                treble: 0,
                description: 'No equalization'
            },
            bassBoost: {
                name: 'Bass Boost',
                bass: 8,
                mid: 0,
                treble: -2,
                description: 'Enhanced low frequencies'
            },
            trebleBoost: {
                name: 'Treble Boost',
                bass: -2,
                mid: 0,
                treble: 8,
                description: 'Enhanced high frequencies'
            },
            vocal: {
                name: 'Vocal Enhance',
                bass: -3,
                mid: 6,
                treble: 2,
                description: 'Emphasizes voice clarity'
            },
            classical: {
                name: 'Classical',
                bass: 3,
                mid: -2,
                treble: 4,
                description: 'Balanced for orchestral music'
            },
            rock: {
                name: 'Rock',
                bass: 6,
                mid: 2,
                treble: 5,
                description: 'Punchy and energetic'
            },
            jazz: {
                name: 'Jazz',
                bass: 4,
                mid: 3,
                treble: 3,
                description: 'Warm and smooth'
            },
            electronic: {
                name: 'Electronic',
                bass: 7,
                mid: -1,
                treble: 6,
                description: 'Deep bass and crisp highs'
            },
            acoustic: {
                name: 'Acoustic',
                bass: 2,
                mid: 4,
                treble: 3,
                description: 'Natural instrument sound'
            },
            podcast: {
                name: 'Podcast/Speech',
                bass: -4,
                mid: 8,
                treble: 1,
                description: 'Optimized for spoken word'
            }
        };
        
        this.currentPreset = 'flat';
    }
    
    applyPreset(presetName) {
        if (!this.presets[presetName]) {
            this.debugLog(`Unknown preset: ${presetName}`, 'error');
            return false;
        }
        
        const preset = this.presets[presetName];
        
        try {
            // Apply the preset values
            this.bassFilter.gain.value = preset.bass;
            this.midFilter.gain.value = preset.mid;
            this.trebleFilter.gain.value = preset.treble;
            
            // Update UI sliders
            const eqBass = document.getElementById('eq-bass');
            const eqMid = document.getElementById('eq-mid');
            const eqTreble = document.getElementById('eq-treble');
            const bassValue = document.getElementById('bass-value');
            const midValue = document.getElementById('mid-value');
            const trebleValue = document.getElementById('treble-value');
            
            if (eqBass) {
                eqBass.value = preset.bass;
                bassValue.textContent = `${preset.bass} dB`;
            }
            if (eqMid) {
                eqMid.value = preset.mid;
                midValue.textContent = `${preset.mid} dB`;
            }
            if (eqTreble) {
                eqTreble.value = preset.treble;
                trebleValue.textContent = `${preset.treble} dB`;
            }
            
            this.currentPreset = presetName;
            localStorage.setItem('audioPreset', presetName);
            
            this.debugLog(`Applied preset: ${preset.name}`, 'success');
            return true;
        } catch (err) {
            this.debugLog(`Failed to apply preset: ${err.message}`, 'error');
            return false;
        }
    }
    
    getCurrentPreset() {
        return this.currentPreset;
    }
    
    getPresetList() {
        return Object.entries(this.presets).map(([key, preset]) => ({
            id: key,
            name: preset.name,
            description: preset.description
        }));
    }
    
    loadSavedPreset() {
        const saved = localStorage.getItem('audioPreset');
        if (saved && this.presets[saved]) {
            this.applyPreset(saved);
        }
    }
}

window.AudioPresetsManager = AudioPresetsManager;