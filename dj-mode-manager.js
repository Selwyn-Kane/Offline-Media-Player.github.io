/* ============================================
   DJ Mode Manager - Advanced Intelligent Playlist Ordering
   Uses Deep Analysis Data for Professional DJ-Quality Mixing
   ============================================ */

class DJModeManager {
    constructor(debugLog) {
        this.debugLog = debugLog;
        this.enabled = false;
        this.originalPlaylist = [];
        this.mixStrategy = 'balanced'; // 'balanced', 'energy-build', 'energy-fade', 'mood-flow'
    }
    
    /**
     * Enable DJ mode and reorder playlist
     */
    enableDJMode(playlist, currentTrackIndex, strategy = 'balanced') {
        if (this.enabled) return playlist;
        
        this.enabled = true;
        this.originalPlaylist = [...playlist]; // Backup original order
        this.mixStrategy = strategy;
        
        this.debugLog('🎧 DJ Mode: Analyzing playlist...', 'info');
        
        // Separate analyzed and non-analyzed tracks
        const analyzed = playlist.filter(t => t.analysis);
        const unanalyzed = playlist.filter(t => !t.analysis);
        
        if (analyzed.length === 0) {
            this.debugLog('⚠️ No analyzed tracks - DJ Mode requires analysis', 'warning');
            return playlist;
        }
        
        // Analyze playlist characteristics
        const playlistStats = this.analyzePlaylistCharacteristics(analyzed);
        this.debugLog(`📊 Playlist: ${playlistStats.avgBPM.toFixed(0)} BPM avg, ${playlistStats.avgEnergy.toFixed(2)} energy`, 'info');
        
        // Build intelligent DJ mix
        const djMix = this.buildDJMix(analyzed, currentTrackIndex, playlistStats);
        
        // Append unanalyzed tracks at end
        const finalPlaylist = [...djMix, ...unanalyzed];
        
        this.debugLog(`✅ DJ Mode: Created ${djMix.length} track mix (${strategy} strategy)`, 'success');
        
        return finalPlaylist;
    }
    
    /**
     * Disable DJ mode and restore original order
     */
    disableDJMode(currentTrack) {
        if (!this.enabled) return this.originalPlaylist;
        
        this.enabled = false;
        
        // Find current track in original playlist
        const originalIndex = this.originalPlaylist.findIndex(t => t === currentTrack);
        
        this.debugLog('🎧 DJ Mode: Restored original order', 'info');
        
        return {
            playlist: this.originalPlaylist,
            newIndex: originalIndex
        };
    }
    
    /**
     * Analyze overall playlist characteristics
     */
    analyzePlaylistCharacteristics(tracks) {
        const stats = {
            avgBPM: 0,
            avgEnergy: 0,
            avgDanceability: 0,
            avgLoudness: 0,
            avgSpectralCentroid: 0,
            bpmRange: { min: Infinity, max: -Infinity },
            energyRange: { min: Infinity, max: -Infinity },
            moods: {},
            keys: {},
            tempos: {}
        };
        
        tracks.forEach(track => {
            const a = track.analysis;
            stats.avgBPM += a.bpm;
            stats.avgEnergy += a.energy;
            stats.avgDanceability += a.danceability || 0;
            stats.avgLoudness += a.loudness || 0;
            stats.avgSpectralCentroid += a.spectralCentroid || 0;
            
            stats.bpmRange.min = Math.min(stats.bpmRange.min, a.bpm);
            stats.bpmRange.max = Math.max(stats.bpmRange.max, a.bpm);
            stats.energyRange.min = Math.min(stats.energyRange.min, a.energy);
            stats.energyRange.max = Math.max(stats.energyRange.max, a.energy);
            
            stats.moods[a.mood] = (stats.moods[a.mood] || 0) + 1;
            stats.keys[a.key] = (stats.keys[a.key] || 0) + 1;
            stats.tempos[a.tempo] = (stats.tempos[a.tempo] || 0) + 1;
        });
        
        const count = tracks.length;
        stats.avgBPM /= count;
        stats.avgEnergy /= count;
        stats.avgDanceability /= count;
        stats.avgLoudness /= count;
        stats.avgSpectralCentroid /= count;
        
        return stats;
    }
    
    /**
     * Build intelligent DJ mix with strategy
     */
    buildDJMix(tracks, startIndex, playlistStats) {
        if (tracks.length === 0) return tracks;
        
        // Start with current track
        const mix = [tracks[startIndex]];
        const remaining = tracks.filter((_, i) => i !== startIndex);
        
        // Build mix using appropriate strategy
        switch (this.mixStrategy) {
            case 'energy-build':
                return this.buildEnergyProgression(mix, remaining, 'ascending');
            case 'energy-fade':
                return this.buildEnergyProgression(mix, remaining, 'descending');
            case 'mood-flow':
                return this.buildMoodFlow(mix, remaining);
            case 'balanced':
            default:
                return this.buildBalancedMix(mix, remaining, playlistStats);
        }
    }
    
    /**
     * Build balanced mix with smooth transitions
     */
    buildBalancedMix(mix, remaining, playlistStats) {
        while (remaining.length > 0) {
            const lastTrack = mix[mix.length - 1];
            const position = mix.length / (mix.length + remaining.length);
            
            // Find best transition considering position in mix
            const nextTrack = this.findBestTransition(
                lastTrack, 
                remaining, 
                position,
                playlistStats
            );
            
            mix.push(nextTrack);
            remaining.splice(remaining.indexOf(nextTrack), 1);
        }
        
        return mix;
    }
    
    /**
     * Build energy progression (build up or fade out)
     */
    buildEnergyProgression(mix, remaining, direction) {
        // Sort remaining by energy
        const sorted = [...remaining].sort((a, b) => {
            const diff = a.analysis.energy - b.analysis.energy;
            return direction === 'ascending' ? diff : -diff;
        });
        
        // Add tracks in energy order, but with smooth transitions
        while (sorted.length > 0) {
            const lastTrack = mix[mix.length - 1];
            
            // Find closest energy match from top candidates
            const candidates = sorted.slice(0, Math.min(5, sorted.length));
            const nextTrack = this.findBestEnergyTransition(lastTrack, candidates);
            
            mix.push(nextTrack);
            sorted.splice(sorted.indexOf(nextTrack), 1);
        }
        
        return mix;
    }
    
    /**
     * Build mood-focused flow
     */
    buildMoodFlow(mix, remaining) {
        while (remaining.length > 0) {
            const lastTrack = mix[mix.length - 1];
            
            // Prioritize mood compatibility
            const nextTrack = this.findBestMoodTransition(lastTrack, remaining);
            
            mix.push(nextTrack);
            remaining.splice(remaining.indexOf(nextTrack), 1);
        }
        
        return mix;
    }
    
    /**
     * Find best next track for smooth transition
     */
    findBestTransition(currentTrack, candidates, position = 0.5, playlistStats = null) {
        const current = currentTrack.analysis;
        
        let bestTrack = candidates[0];
        let bestScore = -Infinity;
        
        for (const candidate of candidates) {
            const score = this.calculateAdvancedTransitionScore(
                current, 
                candidate.analysis, 
                position,
                playlistStats
            );
            
            if (score > bestScore) {
                bestScore = score;
                bestTrack = candidate;
            }
        }
        
        return bestTrack;
    }
    
    /**
     * Find best energy transition
     */
    findBestEnergyTransition(currentTrack, candidates) {
        const current = currentTrack.analysis;
        
        let bestTrack = candidates[0];
        let bestScore = -Infinity;
        
        for (const candidate of candidates) {
            const next = candidate.analysis;
            
            // Score based on BPM compatibility and spectral similarity
            let score = 0;
            
            const bpmDiff = Math.abs(current.bpm - next.bpm);
            if (bpmDiff < 8) score += 30;
            else if (bpmDiff < 15) score += 15;
            else score -= 10;
            
            // Spectral continuity
            if (current.spectralCentroid && next.spectralCentroid) {
                const spectralDiff = Math.abs(current.spectralCentroid - next.spectralCentroid);
                if (spectralDiff < 500) score += 20;
                else if (spectralDiff < 1000) score += 10;
            }
            
            // Key compatibility
            if (current.key === next.key) score += 15;
            else if (this.areKeysCompatible(current.key, next.key)) score += 8;
            
            if (score > bestScore) {
                bestScore = score;
                bestTrack = candidate;
            }
        }
        
        return bestTrack;
    }
    
    /**
     * Find best mood transition
     */
    findBestMoodTransition(currentTrack, candidates) {
        const current = currentTrack.analysis;
        
        let bestTrack = candidates[0];
        let bestScore = -Infinity;
        
        for (const candidate of candidates) {
            const next = candidate.analysis;
            
            let score = 0;
            
            // Mood match
            if (current.mood === next.mood) score += 50;
            else if (this.areMoodsCompatible(current.mood, next.mood)) score += 25;
            else score -= 15;
            
            // Energy similarity within mood
            const energyDiff = Math.abs(current.energy - next.energy);
            if (energyDiff < 0.15) score += 20;
            
            // BPM reasonable
            const bpmDiff = Math.abs(current.bpm - next.bpm);
            if (bpmDiff < 15) score += 15;
            
            if (score > bestScore) {
                bestScore = score;
                bestTrack = candidate;
            }
        }
        
        return bestTrack;
    }
    
    /**
     * Calculate advanced transition quality score using deep analysis
     */
    calculateAdvancedTransitionScore(current, next, position, playlistStats) {
        let score = 0;
        
        // === 1. BPM COMPATIBILITY (Critical for DJ mixing) ===
        const bpmDiff = Math.abs(current.bpm - next.bpm);
        const bpmRatio = next.bpm / current.bpm;
        
        if (bpmDiff < 3) {
            score += 60; // Nearly identical - perfect beatmatch
        } else if (bpmDiff < 6) {
            score += 45; // Very close - excellent mix
        } else if (bpmDiff < 10) {
            score += 30; // Close - good mix
        } else if (bpmDiff < 15) {
            score += 15; // Acceptable with adjustment
        } else if (Math.abs(bpmRatio - 2) < 0.1 || Math.abs(bpmRatio - 0.5) < 0.1) {
            score += 25; // Double/half time relationship
        } else if (bpmDiff < 25) {
            score -= 10; // Difficult transition
        } else {
            score -= 30; // Very jarring
        }
        
        // === 2. KEY COMPATIBILITY (Harmonic mixing) ===
        if (current.key === next.key) {
            score += 35; // Same key = perfect harmony
        } else if (this.areKeysCompatible(current.key, next.key)) {
            score += 20; // Compatible keys = smooth
        } else {
            score -= 5; // Key clash (minor penalty)
        }
        
        // === 3. ENERGY FLOW (Smooth progression) ===
        const energyDiff = Math.abs(current.energy - next.energy);
        const energyChange = next.energy - current.energy;
        
        if (energyDiff < 0.08) {
            score += 30; // Seamless energy transition
        } else if (energyDiff < 0.15) {
            score += 20; // Smooth transition
        } else if (energyDiff < 0.25) {
            score += 10; // Noticeable but acceptable
        } else if (energyDiff < 0.4) {
            score -= 5; // Moderate jump
        } else {
            score -= 20; // Drastic energy shift
        }
        
        // Prefer gradual energy builds in first half, maintains in second half
        if (position < 0.5 && energyChange > 0.05) {
            score += 10; // Building energy early
        } else if (position > 0.7 && energyChange < -0.05) {
            score += 5; // Cooling down late
        }
        
        // === 4. SPECTRAL SIMILARITY (Frequency content) ===
        if (current.spectralCentroid && next.spectralCentroid) {
            const spectralDiff = Math.abs(current.spectralCentroid - next.spectralCentroid);
            if (spectralDiff < 400) {
                score += 25; // Very similar tonal quality
            } else if (spectralDiff < 800) {
                score += 15; // Similar brightness
            } else if (spectralDiff < 1500) {
                score += 5; // Acceptable difference
            } else if (spectralDiff > 3000) {
                score -= 10; // Very different tonal quality
            }
        }
        
        // === 5. FREQUENCY BAND CONTINUITY ===
        if (current.frequencyBands && next.frequencyBands) {
            const bassChange = Math.abs(current.frequencyBands.bass - next.frequencyBands.bass);
            const midChange = Math.abs(current.frequencyBands.midrange - next.frequencyBands.midrange);
            const highChange = Math.abs(current.frequencyBands.brilliance - next.frequencyBands.brilliance);
            
            // Bass continuity (important for dance music)
            if (bassChange < 0.1) score += 15;
            else if (bassChange < 0.2) score += 8;
            else if (bassChange > 0.4) score -= 5;
            
            // Midrange continuity (vocal/instrument presence)
            if (midChange < 0.15) score += 10;
            else if (midChange > 0.35) score -= 3;
            
            // High frequency continuity
            if (highChange < 0.12) score += 8;
        }
        
        // === 6. LOUDNESS MATCHING ===
        if (current.loudness !== undefined && next.loudness !== undefined) {
            const loudnessDiff = Math.abs(current.loudness - next.loudness);
            if (loudnessDiff < 0.1) {
                score += 20; // Matched loudness = smooth mix
            } else if (loudnessDiff < 0.2) {
                score += 12;
            } else if (loudnessDiff < 0.3) {
                score += 5;
            } else if (loudnessDiff > 0.5) {
                score -= 10; // Noticeable volume jump
            }
        }
        
        // === 7. DANCEABILITY CONTINUITY ===
        if (current.danceability !== undefined && next.danceability !== undefined) {
            const danceDiff = Math.abs(current.danceability - next.danceability);
            if (danceDiff < 0.15) {
                score += 15; // Consistent groove
            } else if (danceDiff < 0.3) {
                score += 8;
            } else if (danceDiff > 0.5) {
                score -= 8; // Groove disruption
            }
        }
        
        // === 8. MOOD COMPATIBILITY ===
        if (current.mood === next.mood) {
            score += 20; // Consistent vibe
        } else if (this.areMoodsCompatible(current.mood, next.mood)) {
            score += 10; // Compatible moods
        } else {
            score -= 15; // Mood clash
        }
        
        // === 9. TEMPO CLASSIFICATION MATCH ===
        if (current.tempo === next.tempo) {
            score += 12; // Same tempo feel
        } else {
            // Penalize drastic tempo changes
            const tempoOrder = ['slow', 'moderate', 'fast', 'very-fast'];
            const currentIdx = tempoOrder.indexOf(current.tempo);
            const nextIdx = tempoOrder.indexOf(next.tempo);
            if (currentIdx >= 0 && nextIdx >= 0) {
                const tempoDiff = Math.abs(currentIdx - nextIdx);
                
                if (tempoDiff === 1) score += 5; // Adjacent tempo
                else if (tempoDiff > 1) score -= 10; // Big tempo jump
            }
        }
        
        // === 10. DYNAMIC RANGE COMPATIBILITY ===
        if (current.dynamicRange && next.dynamicRange) {
            const drDiff = Math.abs(
                current.dynamicRange.crestFactor - next.dynamicRange.crestFactor
            );
            
            // Similar dynamic range = consistent listening experience
            if (drDiff < 2) score += 12;
            else if (drDiff < 4) score += 6;
            else if (drDiff > 8) score -= 5; // Jarring compression difference
            
            // Don't jump from highly compressed to very dynamic
            if (current.dynamicRange.classification !== next.dynamicRange.classification) {
                score -= 3;
            }
        }
        
        // === 11. VOCAL PROMINENCE CONTINUITY ===
        if (current.vocalProminence !== undefined && next.vocalProminence !== undefined) {
            const vocalDiff = Math.abs(current.vocalProminence - next.vocalProminence);
            if (vocalDiff < 0.5) score += 10;
            else if (vocalDiff < 1.0) score += 5;
        }
        
        // === 12. VINTAGE RECORDING AWARENESS ===
        if (current.isVintage !== undefined && next.isVintage !== undefined) {
            if (current.isVintage && next.isVintage) {
                score += 15; // Keep vintage tracks together
            } else if (current.isVintage !== next.isVintage) {
                score -= 8; // Mixing vintage with modern can be jarring
            }
        }
        
        // === 13. CONTEXT-AWARE SCORING ===
        if (playlistStats) {
            // If track is unusually high/low energy for playlist, handle carefully
            const energyDeviation = Math.abs(next.energy - playlistStats.avgEnergy);
            if (energyDeviation > 0.3) {
                // Outlier track - be more conservative with transitions
                score -= 5;
            }
        }
        
        return score;
    }
    
    /**
     * Check if keys are harmonically compatible
     */
    areKeysCompatible(key1, key2) {
        // Camelot wheel / Circle of Fifths compatibility
        const compatibleKeys = {
            'C': ['C', 'F', 'G', 'Am', 'Dm', 'Em'],
            'C#': ['C#', 'F#', 'G#', 'A#m', 'D#m', 'Fm'],
            'D': ['D', 'G', 'A', 'Bm', 'Em', 'F#m'],
            'D#': ['D#', 'G#', 'A#', 'Cm', 'Fm', 'Gm'],
            'E': ['E', 'A', 'B', 'C#m', 'F#m', 'G#m'],
            'F': ['F', 'A#', 'C', 'Dm', 'Gm', 'Am'],
            'F#': ['F#', 'B', 'C#', 'D#m', 'G#m', 'A#m'],
            'G': ['G', 'C', 'D', 'Em', 'Am', 'Bm'],
            'G#': ['G#', 'C#', 'D#', 'Fm', 'A#m', 'Cm'],
            'A': ['A', 'D', 'E', 'F#m', 'Bm', 'C#m'],
            'A#': ['A#', 'D#', 'F', 'Gm', 'Cm', 'Dm'],
            'B': ['B', 'E', 'F#', 'G#m', 'C#m', 'D#m']
        };
        
        return compatibleKeys[key1]?.includes(key2) || false;
    }
    
    /**
     * Check if moods are compatible
     */
    areMoodsCompatible(mood1, mood2) {
        const compatibleMoods = {
            'energetic': ['energetic', 'bright'],
            'calm': ['calm', 'dark', 'neutral'],
            'bright': ['bright', 'energetic', 'neutral'],
            'dark': ['dark', 'calm', 'neutral'],
            'neutral': ['neutral', 'calm', 'bright']
        };
        
        return compatibleMoods[mood1]?.includes(mood2) || false;
    }
}

window.DJModeManager = DJModeManager;