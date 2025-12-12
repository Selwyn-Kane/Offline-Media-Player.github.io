/* ============================================
   Audio Presets Manager - Refined & Balanced
   Following Professional Audio Engineering Principles
   ============================================ */

class AudioPresetsManager {
    constructor(bassFilter, midFilter, trebleFilter, debugLog) {
        this.bassFilter = bassFilter;
        this.midFilter = midFilter;
        this.trebleFilter = trebleFilter;
        this.debugLog = debugLog;
        
        // Define presets following best practices:
        // - Conservative gains to avoid distortion
        // - Musically meaningful curves
        // - Era-appropriate EQ shapes
        this.presets = {
            flat: {
                name: 'Flat (Reference)',
                bass: 0,
                mid: 0,
                treble: 0,
                description: 'No coloration - pure source',
                philosophy: 'Neutral reference for well-mastered tracks'
            },
            
            // BASS BOOST: For sub-bass deficiency in modern genres
            // Target: Add missing low-end punch without muddying
            bassBoost: {
                name: 'Bass Boost',
                bass: 4,        // Strong but controlled sub-bass lift
                mid: -1,        // Slight mid scoop to prevent mud
                treble: 0,      // Keep highs clean
                description: 'Enhanced deep bass for modern tracks',
                philosophy: 'Adds sub-bass presence to deficient recordings'
            },
            
            // TREBLE BOOST: For dull/vintage recordings
            // Target: Gentle high-shelf lift without exaggerating hiss
            trebleBoost: {
                name: 'Treble Boost',
                bass: 0,        // Leave bass alone
                mid: 0,         // Keep mids natural
                treble: 5,      // Broad, gentle high-shelf boost
                description: 'Brightens dull recordings',
                philosophy: 'Gentle air and clarity for dark tracks'
            },
            
            // VOCAL: For lead-vocal-centric tracks
            // Target: Presence boost with lower-mid scoop ("smile curve")
            vocal: {
                name: 'Vocal Clarity',
                bass: -2,       // Gentle bass reduction
                mid: 5,         // Strong presence boost (1-3kHz)
                treble: 3,      // Add air and clarity
                description: 'Emphasizes vocal intelligibility',
                philosophy: 'Smile curve: reduces mud, boosts presence & air'
            },
            
            // CLASSICAL: For orchestral/high dynamic range music
            // Target: Very subtle enhancement, natural timbre
            classical: {
                name: 'Classical',
                bass: 1,        // Very gentle low-end warmth
                mid: -1,        // Slight scoop for clarity
                treble: 3,      // Gentle high-shelf for air (vintage recordings)
                description: 'Subtle, natural orchestral balance',
                philosophy: 'Minimal processing preserves dynamics & timbre'
            },
            
            // ROCK: For aggressive guitar/drum-heavy tracks
            // Target: Punchy bass, scooped mids, present highs
            rock: {
                name: 'Rock',
                bass: 5,        // Upper bass punch for kick/bass guitar
                mid: 0,         // Slight scoop would be -1, but 0 for safety
                treble: 4,      // Presence for guitars and cymbals
                description: 'Punchy and aggressive',
                philosophy: 'Emphasizes attack and energy'
            },
            
            // JAZZ: For acoustic jazz with dynamics
            // Target: Warmth in bass, clarity in highs, preserve dynamics
            jazz: {
                name: 'Jazz',
                bass: 3,        // Gentle warmth (100-200Hz body)
                mid: 2,         // Slight mid presence for instruments
                treble: 4,      // Air and clarity (10kHz+ shimmer)
                description: 'Warm low-end with airy highs',
                philosophy: 'Gentle warmth and air, respects dynamics'
            },
            
            // ELECTRONIC: For EDM/synthetic bass-heavy tracks
            // Target: Strong sub-bass, clean highs, scooped mids
            electronic: {
                name: 'Electronic',
                bass: 6,        // Strong sub-bass shelf
                mid: -2,        // Clear mid scoop for clean mix
                treble: 5,      // Crisp, clean high-end
                description: 'Deep bass with crisp highs',
                philosophy: 'V-curve: emphasizes synthetic bass & bright synths'
            },
            
            // ACOUSTIC: For unplugged, intimate recordings
            // Target: Midrange warmth, natural body resonance
            acoustic: {
                name: 'Acoustic',
                bass: 2,        // Gentle body resonance (80-120Hz)
                mid: 4,         // String clarity and warmth (midrange focus)
                treble: 2,      // Subtle air, not too bright
                description: 'Natural, intimate instrument sound',
                philosophy: 'Midrange-focused for body and string clarity'
            },
            
            // PODCAST: For speech/dialogue content
            // Target: Speech clarity, reduced rumble, boosted presence
            podcast: {
                name: 'Podcast/Speech',
                bass: -5,       // Strong high-pass (remove rumble/room noise)
                mid: 6,         // Strong presence boost (vowel clarity)
                treble: 1,      // Slight air for sibilance
                description: 'Optimized for spoken word clarity',
                philosophy: 'High-pass filter + presence boost for intelligibility'
            }
        };
        
        this.currentPreset = 'flat';
        this.customValues = { bass: 0, mid: 0, treble: 0 };
    }
    
    /**
     * Apply a preset by name
     */
    applyPreset(presetName) {
        if (!this.presets[presetName]) {
            this.debugLog(`⚠️ Unknown preset: ${presetName}, using flat`, 'warn');
            presetName = 'flat';
        }
        
        const preset = this.presets[presetName];
        
        try {
            // Apply the preset values with bounds checking
            const bassGain = this.clampGain(preset.bass);
            const midGain = this.clampGain(preset.mid);
            const trebleGain = this.clampGain(preset.treble);
            
            this.bassFilter.gain.value = bassGain;
            this.midFilter.gain.value = midGain;
            this.trebleFilter.gain.value = trebleGain;
            
            // Update UI sliders
            this.updateUISliders(bassGain, midGain, trebleGain);
            
            this.currentPreset = presetName;
            this.savePresetToMemory(presetName);
            
            this.debugLog(`🎛️ Applied: ${preset.name} (${bassGain}/${midGain}/${trebleGain} dB)`, 'success');
            return true;
            
        } catch (err) {
            this.debugLog(`❌ Failed to apply preset: ${err.message}`, 'error');
            return false;
        }
    }
    
    /**
     * Apply custom EQ values (for manual slider control)
     */
    applyCustom(bass, mid, treble) {
        try {
            const bassGain = this.clampGain(bass);
            const midGain = this.clampGain(mid);
            const trebleGain = this.clampGain(treble);
            
            this.bassFilter.gain.value = bassGain;
            this.midFilter.gain.value = midGain;
            this.trebleFilter.gain.value = trebleGain;
            
            this.currentPreset = 'custom';
            this.customValues = { bass: bassGain, mid: midGain, treble: trebleGain };
            
            return true;
            
        } catch (err) {
            this.debugLog(`❌ Failed to apply custom EQ: ${err.message}`, 'error');
            return false;
        }
    }
    
    /**
     * Clamp gain values to safe range
     */
    clampGain(value) {
        return Math.max(-12, Math.min(12, value));
    }
    
    /**
     * Update UI sliders to match preset
     */
    updateUISliders(bass, mid, treble) {
        const eqBass = document.getElementById('eq-bass');
        const eqMid = document.getElementById('eq-mid');
        const eqTreble = document.getElementById('eq-treble');
        const bassValue = document.getElementById('bass-value');
        const midValue = document.getElementById('mid-value');
        const trebleValue = document.getElementById('treble-value');
        
        if (eqBass && bassValue) {
            eqBass.value = bass;
            bassValue.textContent = `${bass > 0 ? '+' : ''}${bass} dB`;
        }
        if (eqMid && midValue) {
            eqMid.value = mid;
            midValue.textContent = `${mid > 0 ? '+' : ''}${mid} dB`;
        }
        if (eqTreble && trebleValue) {
            eqTreble.value = treble;
            trebleValue.textContent = `${treble > 0 ? '+' : ''}${treble} dB`;
        }
    }
    
    /**
     * Get current preset name
     */
    getCurrentPreset() {
        return this.currentPreset;
    }
    
    /**
     * Get current EQ values
     */
    getCurrentValues() {
        return {
            bass: this.bassFilter.gain.value,
            mid: this.midFilter.gain.value,
            treble: this.trebleFilter.gain.value,
            preset: this.currentPreset
        };
    }
    
    /**
     * Get list of all presets for UI
     */
    getPresetList() {
        return Object.entries(this.presets).map(([key, preset]) => ({
            id: key,
            name: preset.name,
            description: preset.description,
            values: `${preset.bass > 0 ? '+' : ''}${preset.bass} / ${preset.mid > 0 ? '+' : ''}${preset.mid} / ${preset.treble > 0 ? '+' : ''}${preset.treble} dB`,
            philosophy: preset.philosophy
        }));
    }
    
    /**
     * Get detailed preset info
     */
    getPresetInfo(presetName) {
        const preset = this.presets[presetName];
        if (!preset) return null;
        
        return {
            name: preset.name,
            description: preset.description,
            philosophy: preset.philosophy,
            bass: preset.bass,
            mid: preset.mid,
            treble: preset.treble,
            curve: this.describeCurve(preset)
        };
    }
    
    /**
     * Describe the EQ curve shape
     */
    describeCurve(preset) {
        const { bass, mid, treble } = preset;
        
        if (bass === 0 && mid === 0 && treble === 0) return 'Flat';
        
        // V-curve (scooped mids)
        if (bass > 2 && treble > 2 && mid < 0) return 'V-curve (scooped mids)';
        
        // Smile curve (boosted lows and highs)
        if (bass > 0 && treble > 0 && mid >= 0) return 'Smile curve';
        
        // Mid-focused
        if (mid > Math.abs(bass) && mid > Math.abs(treble)) return 'Mid-focused';
        
        // Bass-heavy
        if (bass > Math.abs(mid) && bass > Math.abs(treble)) return 'Bass-heavy';
        
        // Treble-heavy
        if (treble > Math.abs(mid) && treble > Math.abs(bass)) return 'Treble-heavy';
        
        return 'Custom curve';
    }
    
    /**
     * Save preset to memory (not localStorage)
     */
    savePresetToMemory(presetName) {
        // In-memory storage only (localStorage not supported in artifacts)
        this.lastSavedPreset = presetName;
    }
    
    /**
     * Load last saved preset
     */
    loadSavedPreset() {
        // Try to load from memory
        if (this.lastSavedPreset && this.presets[this.lastSavedPreset]) {
            this.applyPreset(this.lastSavedPreset);
            this.debugLog(`📂 Loaded saved preset: ${this.lastSavedPreset}`, 'info');
        } else {
            // Default to flat
            this.applyPreset('flat');
        }
    }
    
    /**
     * Reset to flat
     */
    reset() {
        this.applyPreset('flat');
        this.debugLog('🔄 Reset to flat EQ', 'info');
    }
    
    /**
     * Get preset recommendations based on analysis (helper for Auto-EQ)
     */
    getRecommendations(analysis) {
        const recommendations = [];
        
        if (!analysis) return recommendations;
        
        // High dynamic range -> Classical or Jazz
        if (analysis.dynamicRange?.crestFactor > 12) {
            recommendations.push({
                preset: 'classical',
                reason: 'High dynamic range detected',
                confidence: 80
            });
        }
        
        // Speech detection -> Podcast
        if (analysis.energy < 0.3 && analysis.danceability < 0.3) {
            recommendations.push({
                preset: 'podcast',
                reason: 'Speech characteristics detected',
                confidence: 75
            });
        }
        
        // Vocal prominence -> Vocal
        if (analysis.vocalProminence > 1.5) {
            recommendations.push({
                preset: 'vocal',
                reason: 'Strong vocal presence',
                confidence: 70
            });
        }
        
        return recommendations.sort((a, b) => b.confidence - a.confidence);
    }
    
    /**
     * Validate preset values are within safe limits
     */
    validatePreset(preset) {
        if (!preset) return false;
        
        const { bass, mid, treble } = preset;
        
        // Check all values are numbers
        if (typeof bass !== 'number' || typeof mid !== 'number' || typeof treble !== 'number') {
            return false;
        }
        
        // Check all values are within safe range
        if (Math.abs(bass) > 12 || Math.abs(mid) > 12 || Math.abs(treble) > 12) {
            return false;
        }
        
        return true;
    }
}

window.AudioPresetsManager = AudioPresetsManager;