/* ============================================
   DJ Mode Manager - Intelligent Playlist Ordering
   ============================================ */

class DJModeManager {
    constructor(debugLog) {
        this.debugLog = debugLog;
        this.enabled = false;
        this.originalPlaylist = [];
    }
    
    /**
     * Enable DJ mode and reorder playlist
     */
    enableDJMode(playlist, currentTrackIndex) {
        if (this.enabled) return playlist;
        
        this.enabled = true;
        this.originalPlaylist = [...playlist]; // Backup original order
        
        this.debugLog('🎧 DJ Mode: Analyzing playlist...', 'info');
        
        // Separate analyzed and non-analyzed tracks
        const analyzed = playlist.filter(t => t.analysis);
        const unanalyzed = playlist.filter(t => !t.analysis);
        
        if (analyzed.length === 0) {
            this.debugLog('⚠️ No analyzed tracks - DJ Mode requires analysis', 'warning');
            return playlist;
        }
        
        // Build intelligent DJ mix
        const djMix = this.buildDJMix(analyzed, currentTrackIndex);
        
        // Append unanalyzed tracks at end
        const finalPlaylist = [...djMix, ...unanalyzed];
        
        this.debugLog(`✅ DJ Mode: Created ${djMix.length} track mix`, 'success');
        
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
     * Build intelligent DJ mix
     */
    buildDJMix(tracks, startIndex) {
        if (tracks.length === 0) return tracks;
        
        // Start with current track
        const mix = [tracks[startIndex]];
        const remaining = tracks.filter((_, i) => i !== startIndex);
        
        // Build mix using similarity scoring
        while (remaining.length > 0) {
            const lastTrack = mix[mix.length - 1];
            const nextTrack = this.findBestTransition(lastTrack, remaining);
            
            mix.push(nextTrack);
            remaining.splice(remaining.indexOf(nextTrack), 1);
        }
        
        return mix;
    }
    
    /**
     * Find best next track for smooth transition
     */
    findBestTransition(currentTrack, candidates) {
        const current = currentTrack.analysis;
        
        let bestTrack = candidates[0];
        let bestScore = -Infinity;
        
        for (const candidate of candidates) {
            const score = this.calculateTransitionScore(current, candidate.analysis);
            
            if (score > bestScore) {
                bestScore = score;
                bestTrack = candidate;
            }
        }
        
        return bestTrack;
    }
    
    /**
     * Calculate transition quality score
     */
    calculateTransitionScore(current, next) {
        let score = 0;
        
        // BPM compatibility (most important for DJ mixing)
        const bpmDiff = Math.abs(current.bpm - next.bpm);
        if (bpmDiff < 5) {
            score += 50; // Perfect BPM match
        } else if (bpmDiff < 10) {
            score += 30; // Close BPM
        } else if (bpmDiff < 20) {
            score += 10; // Acceptable
        } else {
            score -= 20; // Jarring transition
        }
        
        // Key compatibility (harmonic mixing)
        if (current.key === next.key) {
            score += 30; // Same key = smooth
        } else if (this.areKeysCompatible(current.key, next.key)) {
            score += 15; // Compatible keys
        }
        
        // Energy flow (gradual changes preferred)
        const energyDiff = Math.abs(current.energy - next.energy);
        if (energyDiff < 0.1) {
            score += 20; // Smooth energy transition
        } else if (energyDiff < 0.3) {
            score += 10; // Moderate change
        } else if (energyDiff > 0.5) {
            score -= 15; // Jarring energy jump
        }
        
        // Mood compatibility
        if (current.mood === next.mood) {
            score += 15; // Consistent vibe
        } else if (this.areMoodsCompatible(current.mood, next.mood)) {
            score += 5; // Compatible moods
        } else {
            score -= 10; // Mood clash
        }
        
        // Danceability flow
        const danceDiff = Math.abs(current.danceability - next.danceability);
        if (danceDiff < 0.2) {
            score += 10; // Consistent groove
        }
        
        // Tempo consistency (prefer similar tempos)
        if (current.tempo === next.tempo) {
            score += 10;
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