/* ============================================
   Auto-EQ Manager - Intelligent Preset Selection
   Context-Aware, Era-Adaptive Decision System
   ============================================ */

class AutoEQManager {
    constructor(audioPresetsManager, debugLog) {
        this.presetsManager = audioPresetsManager;
        this.debugLog = debugLog;
        
        this.enabled = false;
        this.lastAppliedPreset = null;
        
        // Minimum confidence score (out of 100) - conservative threshold
        this.confidenceThreshold = 35;
    }
    
    /**
     * Analyze track and select best EQ preset using context-aware scoring
     * PRIORITY: Genre > Audio Analysis > Default to Flat (No Harm Rule)
     */
    selectPresetForTrack(track) {
        if (!track.analysis) {
            this.debugLog('⚠️ No analysis data - using flat EQ', 'warn');
            return 'flat';
        }
        
        const genre = track.metadata?.genre?.toLowerCase() || '';
        const analysis = track.analysis;
        
        // Log analysis for debugging
        this.debugLog(`📊 Analysis: Energy=${analysis.energy?.toFixed(2)}, BPM=${analysis.bpm}, DR=${analysis.dynamicRange?.crestFactor?.toFixed(1)}dB, Vintage=${analysis.isVintage}`, 'info');
        
        // PRIORITY 1: Genre-based selection (most reliable)
        if (genre) {
            const genrePreset = this.selectByGenre(genre, analysis);
            if (genrePreset) {
                this.debugLog(`🎸 Auto-EQ: ${genrePreset} (genre: ${genre})`, 'success');
                return genrePreset;
            }
        }
        
        // PRIORITY 2: Context-aware analysis scoring
        const decision = this.makeContextAwareDecision(analysis);
        
        if (decision.confidence >= this.confidenceThreshold) {
            this.debugLog(`✅ Auto-EQ: ${decision.preset} (confidence: ${decision.confidence.toFixed(1)}/100, reason: ${decision.reason})`, 'success');
            return decision.preset;
        } else {
            this.debugLog(`🎚️ Auto-EQ: flat (best: ${decision.preset}@${decision.confidence.toFixed(1)}, below ${this.confidenceThreshold} threshold)`, 'info');
            return 'flat';
        }
    }
    
    /**
     * Context-aware decision system following best practices
     */
    makeContextAwareDecision(analysis) {
        const {
            energy = 0.5,
            bpm = 120,
            danceability = 0.5,
            spectralCentroid = 1500,
            dynamicRange,
            frequencyBands,
            vocalProminence = 1.0,
            isVintage = false
        } = analysis;
        
        // ERA OVERRIDE: Vintage recordings need special handling
        if (isVintage) {
            return this.handleVintageRecording(analysis);
        }
        
        // PODCAST/SPEECH DETECTION: Special case
        const podcastScore = this.detectPodcast(frequencyBands, energy, danceability);
        if (podcastScore > 70) {
            return {
                preset: 'podcast',
                confidence: podcastScore,
                reason: 'Speech-focused content detected'
            };
        }
        
        // Calculate preset scores using decision matrix
        const scores = this.calculateContextAwareScores(analysis);
        
        // Find best match
        const sorted = Object.entries(scores)
            .sort((a, b) => b[1].score - a[1].score);
        
        const best = sorted[0];
        
        return {
            preset: best[0],
            confidence: best[1].score,
            reason: best[1].reason
        };
    }
    
    /**
     * Handle vintage recordings with care
     */
    handleVintageRecording(analysis) {
        const { energy, dynamicRange, spectralCentroid } = analysis;
        
        // High dynamic range suggests Classical or Jazz
        if (dynamicRange.crestFactor > 12) {
            if (energy < 0.45) {
                return {
                    preset: 'classical',
                    confidence: 75,
                    reason: 'Vintage orchestral/classical recording'
                };
            } else {
                return {
                    preset: 'jazz',
                    confidence: 70,
                    reason: 'Vintage jazz recording'
                };
            }
        }
        
        // Medium dynamic range, low brightness = Acoustic
        if (spectralCentroid < 1500) {
            return {
                preset: 'acoustic',
                confidence: 65,
                reason: 'Vintage acoustic recording'
            };
        }
        
        // Default for vintage: flat (no harm)
        return {
            preset: 'flat',
            confidence: 50,
            reason: 'Vintage recording, using flat to preserve character'
        };
    }
    
    /**
     * Detect podcast/speech content
     */
    detectPodcast(frequencyBands, energy, danceability) {
        if (!frequencyBands) return 0;
        
        let score = 0;
        
        // Very low energy
        if (energy < 0.3) {
            score += (0.3 - energy) * 150;
        }
        
        // Very low danceability
        if (danceability < 0.3) {
            score += (0.3 - danceability) * 150;
        }
        
        // Speech range dominance (300-3000 Hz)
        const speechEnergy = frequencyBands.lowMid + frequencyBands.midrange + frequencyBands.presence;
        const otherEnergy = frequencyBands.subBass + frequencyBands.bass + frequencyBands.brilliance;
        
        if (speechEnergy > otherEnergy * 2) {
            score += 40;
        }
        
        return Math.min(score, 100);
    }
    
    /**
     * Calculate context-aware scores following decision matrix
     */
    calculateContextAwareScores(analysis) {
        const {
            energy,
            bpm,
            danceability,
            spectralCentroid,
            dynamicRange,
            frequencyBands,
            vocalProminence,
            mood
        } = analysis;
        
        const scores = {};
        
        // ELECTRONIC: High sub-bass + high energy + high danceability + bright
        scores.electronic = this.scoreElectronic(
            frequencyBands,
            energy,
            danceability,
            bpm,
            spectralCentroid
        );
        
        // ROCK: Aggressive midrange + punchy bass + high energy
        scores.rock = this.scoreRock(
            frequencyBands,
            energy,
            bpm,
            dynamicRange,
            spectralCentroid
        );
        
        // JAZZ: Warmth + clarity + medium dynamic range
        scores.jazz = this.scoreJazz(
            energy,
            danceability,
            bpm,
            dynamicRange,
            spectralCentroid
        );
        
        // CLASSICAL: Low energy + high dynamic range + natural timbre
        scores.classical = this.scoreClassical(
            energy,
            bpm,
            dynamicRange,
            spectralCentroid,
            mood
        );
        
        // ACOUSTIC: Intimacy + string/body resonance + low danceability
        scores.acoustic = this.scoreAcoustic(
            energy,
            danceability,
            spectralCentroid,
            frequencyBands,
            mood
        );
        
        // VOCAL: Vocal intelligibility + presence boost
        scores.vocal = this.scoreVocal(
            vocalProminence,
            energy,
            spectralCentroid,
            bpm,
            frequencyBands
        );
        
        // BASS BOOST: Sub-bass deficiency in bass-focused genres
        scores.bassBoost = this.scoreBassBoost(
            frequencyBands,
            danceability,
            energy,
            mood
        );
        
        // TREBLE BOOST: Dull recordings that need brightness
        scores.trebleBoost = this.scoreTrebleBoost(
            spectralCentroid,
            frequencyBands,
            mood
        );
        
        return scores;
    }
    
    /**
     * Individual preset scoring functions
     */
    scoreElectronic(bands, energy, dance, bpm, spectral) {
        let score = 0;
        let reasons = [];
        
        // Must have high sub-bass energy
        if (bands && bands.subBass > 0.15) {
            score += 35;
            reasons.push('strong sub-bass');
        } else {
            return { score: 0, reason: 'insufficient sub-bass for electronic' };
        }
        
        // High energy
        if (energy > 0.65) {
            score += (energy - 0.65) * 70;
            reasons.push('high energy');
        }
        
        // High danceability
        if (dance > 0.6) {
            score += (dance - 0.6) * 60;
            reasons.push('highly danceable');
        }
        
        // Fast tempo
        if (bpm > 120) {
            score += Math.min((bpm - 120) / 80, 1) * 20;
        }
        
        // Bright spectrum
        if (spectral > 2000) {
            score += 15;
        }
        
        return {
            score: Math.min(score, 100),
            reason: reasons.join(', ')
        };
    }
    
    scoreRock(bands, energy, bpm, dynRange, spectral) {
        let score = 0;
        let reasons = [];
        
        // Medium-high energy range
        if (energy > 0.5 && energy < 0.85) {
            score += 35;
            reasons.push('rock energy level');
        } else {
            return { score: 0, reason: 'energy outside rock range' };
        }
        
        // Moderate BPM
        if (bpm >= 100 && bpm <= 160) {
            score += 25;
        }
        
        // Strong midrange and presence (aggressive sound)
        if (bands && (bands.midrange + bands.presence) > 0.4) {
            score += 30;
            reasons.push('aggressive midrange');
        }
        
        // Moderate dynamic range
        if (dynRange && dynRange.crestFactor >= 6 && dynRange.crestFactor <= 12) {
            score += 10;
        }
        
        return {
            score: Math.min(score, 100),
            reason: reasons.join(', ')
        };
    }
    
    scoreJazz(energy, dance, bpm, dynRange, spectral) {
        let score = 0;
        let reasons = [];
        
        // Medium energy
        if (energy > 0.35 && energy < 0.65) {
            score += 30;
            reasons.push('medium energy');
        } else {
            return { score: 0, reason: 'energy outside jazz range' };
        }
        
        // Low danceability (not dance music)
        if (dance < 0.5) {
            score += (0.5 - dance) * 50;
            reasons.push('low danceability');
        }
        
        // Moderate tempo
        if (bpm >= 80 && bpm <= 140) {
            score += 20;
        }
        
        // High dynamic range
        if (dynRange && dynRange.crestFactor > 10) {
            score += 20;
            reasons.push('high dynamic range');
        }
        
        return {
            score: Math.min(score, 100),
            reason: reasons.join(', ')
        };
    }
    
    scoreClassical(energy, bpm, dynRange, spectral, mood) {
        let score = 0;
        let reasons = [];
        
        // Very high dynamic range is key indicator
        if (!dynRange || dynRange.crestFactor < 12) {
            return { score: 0, reason: 'insufficient dynamic range for classical' };
        }
        
        score += 40;
        reasons.push('very high dynamic range');
        
        // Low energy
        if (energy < 0.4) {
            score += (0.4 - energy) * 75;
            reasons.push('low energy');
        }
        
        // Natural spectrum (not too bright)
        if (spectral < 2000) {
            score += 20;
        }
        
        // Slow tempo
        if (bpm < 100) {
            score += 15;
        }
        
        // Calm mood
        if (mood === 'calm' || mood === 'dark') {
            score += 10;
        }
        
        return {
            score: Math.min(score, 100),
            reason: reasons.join(', ')
        };
    }
    
    scoreAcoustic(energy, dance, spectral, bands, mood) {
        let score = 0;
        let reasons = [];
        
        // Low-medium energy
        if (energy > 0.3 && energy < 0.6) {
            score += 30;
            reasons.push('acoustic energy level');
        } else {
            return { score: 0, reason: 'energy outside acoustic range' };
        }
        
        // Low danceability
        if (dance < 0.5) {
            score += (0.5 - dance) * 40;
            reasons.push('low danceability');
        }
        
        // Warm spectrum (not too bright)
        if (spectral < 1800) {
            score += (1800 - spectral) / 1500 * 30;
            reasons.push('warm spectrum');
        }
        
        // Body resonance in bass/low-mid
        if (bands && (bands.bass + bands.lowMid) > 0.35) {
            score += 10;
        }
        
        return {
            score: Math.min(score, 100),
            reason: reasons.join(', ')
        };
    }
    
    scoreVocal(prominence, energy, spectral, bpm, bands) {
        let score = 0;
        let reasons = [];
        
        // High vocal prominence is key
        if (prominence < 1.5) {
            return { score: 0, reason: 'insufficient vocal prominence' };
        }
        
        score += 40;
        reasons.push('strong vocal presence');
        
        // Moderate energy
        if (energy > 0.4 && energy < 0.7) {
            score += 30;
        }
        
        // Mid-range spectrum
        if (spectral > 1500 && spectral < 3000) {
            score += 20;
            reasons.push('vocal-range spectrum');
        }
        
        // Moderate tempo
        if (bpm >= 90 && bpm <= 130) {
            score += 10;
        }
        
        return {
            score: Math.min(score, 100),
            reason: reasons.join(', ')
        };
    }
    
    scoreBassBoost(bands, dance, energy, mood) {
        let score = 0;
        let reasons = [];
        
        // Sub-bass deficiency (target use case)
        if (!bands || bands.subBass >= 0.15) {
            return { score: 0, reason: 'sufficient sub-bass already present' };
        }
        
        score += 40;
        reasons.push('sub-bass deficiency');
        
        // High danceability (should be bass-heavy)
        if (dance > 0.7) {
            score += (dance - 0.7) * 100;
            reasons.push('highly danceable');
        }
        
        // High energy
        if (energy > 0.6) {
            score += (energy - 0.6) * 40;
        }
        
        return {
            score: Math.min(score, 100),
            reason: reasons.join(', ')
        };
    }
    
    scoreTrebleBoost(spectral, bands, mood) {
        let score = 0;
        let reasons = [];
        
        // Low brightness (dull recording)
        if (spectral >= 1800) {
            return { score: 0, reason: 'already bright enough' };
        }
        
        score += (1800 - spectral) / 1500 * 60;
        reasons.push('dull spectrum');
        
        // Low brilliance band
        if (bands && bands.brilliance < 0.1) {
            score += 30;
            reasons.push('low high-end energy');
        }
        
        // Bright mood indicator
        if (mood === 'bright') {
            score += 10;
        }
        
        return {
            score: Math.min(score, 100),
            reason: reasons.join(', ')
        };
    }
    
    /**
     * Genre-based preset selection with audio analysis override
     */
    selectByGenre(genre, analysis) {
        const genreMap = {
            // Electronic
            'electronic': 'electronic',
            'edm': 'electronic',
            'dubstep': 'electronic',
            'techno': 'electronic',
            'house': 'electronic',
            'trance': 'electronic',
            'drum and bass': 'electronic',
            'dnb': 'electronic',
            'electro': 'electronic',
            'synthwave': 'electronic',
            'idm': 'electronic',
            
            // Rock
            'rock': 'rock',
            'metal': 'rock',
            'hard rock': 'rock',
            'punk': 'rock',
            'alternative': 'rock',
            'indie rock': 'rock',
            'grunge': 'rock',
            'heavy metal': 'rock',
            
            // Jazz
            'jazz': 'jazz',
            'bebop': 'jazz',
            'swing': 'jazz',
            'blues': 'jazz',
            'fusion': 'jazz',
            'smooth jazz': 'jazz',
            
            // Classical
            'classical': 'classical',
            'orchestral': 'classical',
            'symphony': 'classical',
            'opera': 'classical',
            'baroque': 'classical',
            'romantic': 'classical',
            'chamber': 'classical',
            
            // Acoustic
            'acoustic': 'acoustic',
            'folk': 'acoustic',
            'singer-songwriter': 'acoustic',
            'country': 'acoustic',
            'bluegrass': 'acoustic',
            'americana': 'acoustic',
            
            // Vocal / Pop
            'pop': 'vocal',
            'r&b': 'vocal',
            'soul': 'vocal',
            'gospel': 'vocal',
            'rnb': 'vocal',
            'contemporary': 'vocal',
            
            // Podcast
            'podcast': 'podcast',
            'audiobook': 'podcast',
            'speech': 'podcast',
            'comedy': 'podcast',
            'talk': 'podcast',
            
            // Hip Hop / Bass-heavy
            'hip hop': 'bassBoost',
            'hip-hop': 'bassBoost',
            'rap': 'bassBoost',
            'trap': 'bassBoost',
            'bass': 'bassBoost'
        };
        
        // Find preset
        let preset = genreMap[genre];
        
        if (!preset) {
            // Check partial match
            for (const [key, value] of Object.entries(genreMap)) {
                if (genre.includes(key)) {
                    preset = value;
                    break;
                }
            }
        }
        
        if (!preset) return null;
        
        // OVERRIDE: Check if audio analysis contradicts genre
        if (analysis.isVintage) {
            // Don't use bass boost or treble boost on vintage
            if (preset === 'bassBoost' || preset === 'trebleBoost') {
                this.debugLog('⚠️ Vintage recording detected, overriding genre preset', 'warn');
                return null; // Let analysis decide
            }
        }
        
        return preset;
    }
    
    /**
     * Apply auto-EQ for track
     */
    applyAutoEQ(track) {
        if (!this.enabled) {
            this.debugLog('Auto-EQ is disabled', 'info');
            return;
        }
        
        const preset = this.selectPresetForTrack(track);
        
        // Don't reapply if already using this preset
        if (preset === this.lastAppliedPreset) {
            this.debugLog('⏭ Skipping EQ change (already applied)', 'info');
            return;
        }
        
        // Apply preset
        this.presetsManager.applyPreset(preset);
        this.lastAppliedPreset = preset;
        
        // Update UI
        const presetSelect = document.getElementById('eq-preset-select');
        if (presetSelect) {
            presetSelect.value = preset;
        }
        
        this.debugLog(`✅ Applied Auto-EQ: ${preset}`, 'success');
    }
    
    /**
     * Enable/disable auto-EQ
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        this.debugLog(`Auto-EQ: ${enabled ? 'ON ✨' : 'OFF'}`, enabled ? 'success' : 'info');
        
        const btn = document.getElementById('auto-eq-btn');
        if (btn) {
            if (enabled) {
                btn.classList.add('active');
                btn.textContent = '✨ Auto-EQ: ON';
            } else {
                btn.classList.remove('active');
                btn.textContent = '🎚️ Auto-EQ: OFF';
            }
        }
        
        if (!enabled) {
            this.presetsManager.applyPreset('flat');
            this.lastAppliedPreset = null;
            
            const presetSelect = document.getElementById('eq-preset-select');
            if (presetSelect) {
                presetSelect.value = 'flat';
            }
        }
    }
    
    /**
     * Toggle auto-EQ
     */
    toggle() {
        this.setEnabled(!this.enabled);
        return this.enabled;
    }
    
    /**
     * Check if enabled
     */
    isEnabled() {
        return this.enabled;
    }
    
    /**
     * Get state
     */
    getState() {
        return {
            enabled: this.enabled,
            lastPreset: this.lastAppliedPreset,
            threshold: this.confidenceThreshold
        };
    }
    
    /**
     * Set confidence threshold
     */
    setConfidenceThreshold(threshold) {
        this.confidenceThreshold = Math.max(0, Math.min(100, threshold));
        this.debugLog(`Confidence threshold set to ${this.confidenceThreshold}`, 'info');
    }
    
    /**
     * Get detailed scoring breakdown
     */
    getScoreBreakdown(track) {
        if (!track.analysis) {
            return { error: 'No analysis data available' };
        }
        
        const decision = this.makeContextAwareDecision(track.analysis);
        const allScores = this.calculateContextAwareScores(track.analysis);
        
        const sortedScores = Object.entries(allScores)
            .sort((a, b) => b[1].score - a[1].score)
            .map(([preset, data]) => ({
                preset,
                score: data.score.toFixed(1),
                reason: data.reason,
                percentage: data.score.toFixed(1) + '%'
            }));
        
        return {
            bestMatch: decision.preset,
            confidence: decision.confidence.toFixed(1),
            reason: decision.reason,
            willApply: decision.confidence >= this.confidenceThreshold,
            threshold: this.confidenceThreshold,
            allScores: sortedScores,
            analysis: track.analysis
        };
    }
}

window.AutoEQManager = AutoEQManager;