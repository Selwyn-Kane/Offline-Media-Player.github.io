/* ============================================
   Advanced DJ Mode Manager v2.0
   Professional mixing with learning AI and visualization
   ============================================ */

class DJModeManager {
    constructor(debugLog) {
        this.debugLog = debugLog;
        this.enabled = false;
        this.originalPlaylist = [];
        this.currentMixStyle = null;
        this.mixHistory = [];
        this.transitionStats = this.loadTransitionStats();
        this.sessionData = {
            startTime: null,
            tracksPlayed: 0,
            skips: 0,
            successful: 0
        };
        
        // Mix styles with distinct characteristics
        this.mixStyles = {
            classic: {
                name: 'Classic DJ Mix',
                icon: '🎧',
                description: 'Harmonic mixing with beatmatching - like a professional club DJ',
                weights: { bpm: 45, key: 30, energy: 15, mood: 10 },
                allowBpmJumps: false,
                energyCurve: 'maintain',
                zones: false
            },
            flow: {
                name: 'Flow State',
                icon: '🌊',
                description: 'Smooth energy waves for focused work or relaxation',
                weights: { energy: 40, mood: 30, spectral: 20, bpm: 10 },
                allowBpmJumps: true,
                energyCurve: 'wave',
                zones: false
            },
            peaktime: {
                name: 'Peak Time',
                icon: '🔥',
                description: 'Progressive energy build to epic climax - party mode',
                weights: { energy: 50, bpm: 30, mood: 15, key: 5 },
                allowBpmJumps: true,
                energyCurve: 'build',
                zones: true
            },
            workout: {
                name: 'Workout Mix',
                icon: '💪',
                description: 'High energy intervals for exercise - alternating intensity',
                weights: { bpm: 40, energy: 40, danceability: 15, key: 5 },
                allowBpmJumps: true,
                energyCurve: 'intervals',
                zones: true
            },
            chill: {
                name: 'Chill Session',
                icon: '🌙',
                description: 'Downtempo relaxation - smooth and mellow throughout',
                weights: { mood: 40, spectral: 30, energy: 20, bpm: 10 },
                allowBpmJumps: true,
                energyCurve: 'descend',
                zones: false
            },
            discovery: {
                name: 'Discovery Mode',
                icon: '🎲',
                description: 'Diverse exploration - introduces you to your library variety',
                weights: { mood: 25, energy: 25, bpm: 25, spectral: 25 },
                allowBpmJumps: true,
                energyCurve: 'varied',
                zones: false
            }
        };
    }
    
    // ============================================
    // CORE ACTIVATION
    // ============================================
    
    enableDJMode(playlist, currentTrackIndex, styleName = 'classic') {
        if (this.enabled) return { playlist, index: currentTrackIndex };
        
        this.enabled = true;
        this.originalPlaylist = [...playlist];
        this.currentMixStyle = this.mixStyles[styleName] || this.mixStyles.classic;
        this.sessionData.startTime = Date.now();
        
        this.debugLog(`🎧 DJ Mode: ${this.currentMixStyle.name}`, 'info');
        
        // Filter analyzed tracks
        const analyzed = playlist.filter(t => t.analysis);
        const unanalyzed = playlist.filter(t => !t.analysis);
        
        if (analyzed.length < 3) {
            this.debugLog('⚠️ Need at least 3 analyzed tracks for DJ Mode', 'warning');
            this.enabled = false;
            return { playlist, index: currentTrackIndex };
        }
        
        // Get current track
        const currentTrack = playlist[currentTrackIndex];
        const currentInAnalyzed = analyzed.findIndex(t => t === currentTrack);
        const startIdx = currentInAnalyzed >= 0 ? currentInAnalyzed : 0;
        
        // Build the mix
        const djMix = this.buildIntelligentMix(analyzed, startIdx, styleName);
        const finalPlaylist = [...djMix, ...unanalyzed];
        
        // Find new position of current track
        const newIndex = finalPlaylist.findIndex(t => t === currentTrack);
        
        this.debugLog(`✅ Created ${djMix.length}-track ${this.currentMixStyle.name}`, 'success');
        this.saveMixSession(styleName, djMix);
        
        return { 
            playlist: finalPlaylist, 
            index: Math.max(0, newIndex),
            mixData: this.generateMixVisualization(djMix)
        };
    }
    
    disableDJMode(currentTrack) {
        if (!this.enabled) return { playlist: this.originalPlaylist, index: 0 };
        
        this.enabled = false;
        this.endSession();
        
        const originalIndex = this.originalPlaylist.findIndex(t => t === currentTrack);
        
        this.debugLog('🎧 DJ Mode: Restored original order', 'info');
        
        return {
            playlist: this.originalPlaylist,
            index: Math.max(0, originalIndex)
        };
    }
    
    // ============================================
    // INTELLIGENT MIX BUILDING
    // ============================================
    
    buildIntelligentMix(tracks, startIdx, styleName) {
        const style = this.mixStyles[styleName];
        
        // Apply mix zones if needed
        if (style.zones) {
            return this.buildZonedMix(tracks, startIdx, style);
        }
        
        // Standard sequential building
        const mix = [tracks[startIdx]];
        const remaining = tracks.filter((_, i) => i !== startIdx);
        
        while (remaining.length > 0) {
            const lastTrack = mix[mix.length - 1];
            const position = mix.length / tracks.length;
            
            const nextTrack = this.findOptimalNext(lastTrack, remaining, style, position);
            
            mix.push(nextTrack);
            remaining.splice(remaining.indexOf(nextTrack), 1);
        }
        
        return mix;
    }
    
    buildZonedMix(tracks, startIdx, style) {
        // Divide into zones: Opener (15%) → Warm-up (25%) → Peak (40%) → Cool-down (20%)
        const zones = this.categorizeIntoZones(tracks, style);
        
        // Start from current track's zone
        const currentTrack = tracks[startIdx];
        let currentZone = this.determineTrackZone(currentTrack, style);
        
        const mix = [currentTrack];
        
        // Build from current zone forward
        const zoneOrder = ['opener', 'warmup', 'peak', 'cooldown'];
        const startZoneIdx = zoneOrder.indexOf(currentZone);
        
        for (let i = startZoneIdx; i < zoneOrder.length; i++) {
            const zoneName = zoneOrder[i];
            const zoneTracks = zones[zoneName].filter(t => !mix.includes(t));
            
            while (zoneTracks.length > 0) {
                const lastTrack = mix[mix.length - 1];
                const nextTrack = this.findOptimalNext(lastTrack, zoneTracks, style, i / 4);
                
                mix.push(nextTrack);
                zoneTracks.splice(zoneTracks.indexOf(nextTrack), 1);
            }
        }
        
        // Add remaining tracks from earlier zones at the end
        const remaining = tracks.filter(t => !mix.includes(t));
        remaining.forEach(track => mix.push(track));
        
        return mix;
    }
    
    categorizeIntoZones(tracks, style) {
        // Sort by energy
        const sorted = [...tracks].sort((a, b) => a.analysis.energy - b.analysis.energy);
        
        const zones = {
            opener: [],
            warmup: [],
            peak: [],
            cooldown: []
        };
        
        const openerCount = Math.ceil(tracks.length * 0.15);
        const warmupCount = Math.ceil(tracks.length * 0.25);
        const peakCount = Math.ceil(tracks.length * 0.40);
        
        zones.opener = sorted.slice(0, openerCount);
        zones.warmup = sorted.slice(openerCount, openerCount + warmupCount);
        zones.peak = sorted.slice(openerCount + warmupCount, openerCount + warmupCount + peakCount);
        zones.cooldown = sorted.slice(openerCount + warmupCount + peakCount);
        
        return zones;
    }
    
    determineTrackZone(track, style) {
        const energy = track.analysis.energy;
        
        if (energy < 0.3) return 'opener';
        if (energy < 0.5) return 'warmup';
        if (energy < 0.75) return 'peak';
        return 'cooldown';
    }
    
    // ============================================
    // OPTIMAL NEXT TRACK SELECTION
    // ============================================
    
    findOptimalNext(current, candidates, style, position) {
        let bestTrack = candidates[0];
        let bestScore = -Infinity;
        
        for (const candidate of candidates) {
            const score = this.calculateTransitionScore(
                current, 
                candidate, 
                style, 
                position
            );
            
            // Apply learning bonus
            const learningBonus = this.getLearningBonus(current, candidate);
            const finalScore = score + learningBonus;
            
            if (finalScore > bestScore) {
                bestScore = finalScore;
                bestTrack = candidate;
            }
        }
        
        return bestTrack;
    }
    
    calculateTransitionScore(current, next, style, position) {
        const curr = current.analysis;
        const nxt = next.analysis;
        const weights = style.weights;
        
        let score = 0;
        
        // === BPM COMPATIBILITY ===
        if (weights.bpm) {
            const bpmScore = this.scoreBPMTransition(curr.bpm, nxt.bpm, style.allowBpmJumps);
            score += bpmScore * (weights.bpm / 100);
        }
        
        // === KEY COMPATIBILITY ===
        if (weights.key) {
            const keyScore = this.scoreKeyTransition(curr.key, nxt.key);
            score += keyScore * (weights.key / 100);
        }
        
        // === ENERGY FLOW ===
        if (weights.energy) {
            const energyScore = this.scoreEnergyTransition(
                curr.energy, 
                nxt.energy, 
                style.energyCurve, 
                position
            );
            score += energyScore * (weights.energy / 100);
        }
        
        // === MOOD COMPATIBILITY ===
        if (weights.mood) {
            const moodScore = this.scoreMoodTransition(curr.mood, nxt.mood);
            score += moodScore * (weights.mood / 100);
        }
        
        // === SPECTRAL SIMILARITY ===
        if (weights.spectral && curr.spectralCentroid && nxt.spectralCentroid) {
            const spectralScore = this.scoreSpectralTransition(
                curr.spectralCentroid, 
                nxt.spectralCentroid
            );
            score += spectralScore * (weights.spectral / 100);
        }
        
        // === DANCEABILITY ===
        if (weights.danceability && curr.danceability !== undefined && nxt.danceability !== undefined) {
            const danceScore = this.scoreDanceabilityTransition(
                curr.danceability, 
                nxt.danceability
            );
            score += danceScore * (weights.danceability / 100);
        }
        
        // === FREQUENCY BANDS ===
        if (curr.frequencyBands && nxt.frequencyBands) {
            const bandScore = this.scoreFrequencyTransition(
                curr.frequencyBands, 
                nxt.frequencyBands
            );
            score += bandScore * 0.15;
        }
        
        // === LOUDNESS MATCHING ===
        if (curr.loudness !== undefined && nxt.loudness !== undefined) {
            const loudnessScore = this.scoreLoudnessTransition(curr.loudness, nxt.loudness);
            score += loudnessScore * 0.10;
        }
        
        return Math.max(0, Math.min(100, score));
    }
    
    // ============================================
    // INDIVIDUAL SCORING FUNCTIONS
    // ============================================
    
    scoreBPMTransition(bpm1, bpm2, allowJumps) {
        const diff = Math.abs(bpm1 - bpm2);
        const ratio = bpm2 / bpm1;
        
        if (diff < 2) return 100;
        if (diff < 4) return 90;
        if (diff < 6) return 80;
        if (diff < 8) return 70;
        if (diff < 12) return 60;
        
        // Check for harmonic relationships (2x, 0.5x, 1.5x)
        if (Math.abs(ratio - 2) < 0.05) return 75; // Double time
        if (Math.abs(ratio - 0.5) < 0.05) return 75; // Half time
        if (Math.abs(ratio - 1.5) < 0.05) return 65; // 3/2 time
        
        if (allowJumps) {
            if (diff < 20) return 40;
            if (diff < 30) return 20;
            return 0;
        } else {
            if (diff < 15) return 30;
            return 0;
        }
    }
    
    scoreKeyTransition(key1, key2) {
        if (!key1 || !key2) return 50;
        if (key1 === key2) return 100;
        
        // Camelot wheel compatibility
        const compatible = this.getCompatibleKeys(key1);
        if (compatible.perfect.includes(key2)) return 90;
        if (compatible.good.includes(key2)) return 75;
        if (compatible.ok.includes(key2)) return 50;
        
        return 20;
    }
    
    scoreEnergyTransition(energy1, energy2, curve, position) {
        const diff = Math.abs(energy1 - energy2);
        const change = energy2 - energy1;
        
        let baseScore = 0;
        if (diff < 0.05) baseScore = 100;
        else if (diff < 0.10) baseScore = 90;
        else if (diff < 0.15) baseScore = 75;
        else if (diff < 0.20) baseScore = 60;
        else if (diff < 0.30) baseScore = 40;
        else baseScore = 20;
        
        // Apply curve modifier
        switch (curve) {
            case 'build':
                if (change > 0) baseScore += 20;
                if (change < -0.15) baseScore -= 30;
                break;
            case 'descend':
                if (change < 0) baseScore += 20;
                if (change > 0.15) baseScore -= 30;
                break;
            case 'wave':
                // Prefer gentle oscillation
                if (Math.abs(change) < 0.10) baseScore += 15;
                break;
            case 'intervals':
                // Prefer alternating high/low
                if (position % 0.2 < 0.1) {
                    if (change > 0.1) baseScore += 20;
                } else {
                    if (change < -0.1) baseScore += 20;
                }
                break;
            case 'maintain':
                // Prefer minimal change
                if (diff < 0.08) baseScore += 25;
                break;
        }
        
        return Math.max(0, Math.min(100, baseScore));
    }
    
    scoreMoodTransition(mood1, mood2) {
        if (mood1 === mood2) return 100;
        
        const compatibility = {
            energetic: { energetic: 100, bright: 80, neutral: 50, calm: 20, dark: 30 },
            bright: { bright: 100, energetic: 80, neutral: 60, calm: 40, dark: 20 },
            neutral: { neutral: 100, bright: 60, calm: 60, energetic: 50, dark: 50 },
            calm: { calm: 100, neutral: 60, dark: 70, bright: 40, energetic: 20 },
            dark: { dark: 100, calm: 70, neutral: 50, bright: 20, energetic: 30 }
        };
        
        return compatibility[mood1]?.[mood2] || 40;
    }
    
    scoreSpectralTransition(centroid1, centroid2) {
        const diff = Math.abs(centroid1 - centroid2);
        
        if (diff < 300) return 100;
        if (diff < 600) return 85;
        if (diff < 1000) return 70;
        if (diff < 1500) return 55;
        if (diff < 2500) return 35;
        return 15;
    }
    
    scoreDanceabilityTransition(dance1, dance2) {
        const diff = Math.abs(dance1 - dance2);
        
        if (diff < 0.10) return 100;
        if (diff < 0.20) return 80;
        if (diff < 0.30) return 60;
        if (diff < 0.40) return 40;
        return 20;
    }
    
    scoreFrequencyTransition(bands1, bands2) {
        const bassDiff = Math.abs(bands1.bass - bands2.bass);
        const midDiff = Math.abs(bands1.midrange - bands2.midrange);
        const highDiff = Math.abs(bands1.brilliance - bands2.brilliance);
        
        let score = 0;
        
        // Bass is most important for mixing
        if (bassDiff < 0.08) score += 40;
        else if (bassDiff < 0.15) score += 25;
        else if (bassDiff < 0.25) score += 10;
        
        // Midrange
        if (midDiff < 0.12) score += 30;
        else if (midDiff < 0.20) score += 15;
        
        // High frequencies
        if (highDiff < 0.10) score += 30;
        else if (highDiff < 0.18) score += 15;
        
        return score;
    }
    
    scoreLoudnessTransition(loud1, loud2) {
        const diff = Math.abs(loud1 - loud2);
        
        if (diff < 0.08) return 100;
        if (diff < 0.15) return 80;
        if (diff < 0.25) return 60;
        if (diff < 0.35) return 40;
        return 20;
    }
    
    // ============================================
    // LEARNING SYSTEM
    // ============================================
    
    getLearningBonus(trackA, trackB) {
        const key = this.makeTransitionKey(trackA, trackB);
        const stats = this.transitionStats[key];
        
        if (!stats) return 0;
        
        // Success rate bonus (0-20 points)
        const successRate = stats.played / (stats.played + stats.skipped);
        return successRate * 20;
    }
    
    recordTransition(trackA, trackB, wasSkipped) {
        const key = this.makeTransitionKey(trackA, trackB);
        
        if (!this.transitionStats[key]) {
            this.transitionStats[key] = { played: 0, skipped: 0 };
        }
        
        if (wasSkipped) {
            this.transitionStats[key].skipped++;
            this.sessionData.skips++;
        } else {
            this.transitionStats[key].played++;
            this.sessionData.successful++;
        }
        
        this.sessionData.tracksPlayed++;
        this.saveTransitionStats();
    }
    
    makeTransitionKey(trackA, trackB) {
        const a = trackA.analysis;
        const b = trackB.analysis;
        
        // Create a generalized key based on characteristics
        return `${this.quantize(a.bpm, 10)}-${this.quantize(b.bpm, 10)}_` +
               `${this.quantize(a.energy, 0.2)}-${this.quantize(b.energy, 0.2)}_` +
               `${a.mood}-${b.mood}`;
    }
    
    quantize(value, step) {
        return Math.round(value / step) * step;
    }
    
    // ============================================
    // SMART FEATURES
    // ============================================
    
    suggestInsertionPoint(newTrack, currentPlaylist) {
        if (!this.enabled || !newTrack.analysis) return currentPlaylist.length;
        
        let bestIndex = 0;
        let bestScore = -Infinity;
        
        for (let i = 0; i < currentPlaylist.length - 1; i++) {
            const before = currentPlaylist[i];
            const after = currentPlaylist[i + 1];
            
            if (!before.analysis || !after.analysis) continue;
            
            const score1 = this.calculateTransitionScore(before, newTrack, this.currentMixStyle, i / currentPlaylist.length);
            const score2 = this.calculateTransitionScore(newTrack, after, this.currentMixStyle, (i + 1) / currentPlaylist.length);
            
            const totalScore = (score1 + score2) / 2;
            
            if (totalScore > bestScore) {
                bestScore = totalScore;
                bestIndex = i + 1;
            }
        }
        
        return bestIndex;
    }
    
    reorderFromCurrent(playlist, currentIndex) {
        if (!this.enabled) return playlist;
        
        const remaining = playlist.slice(currentIndex + 1).filter(t => t.analysis);
        const before = playlist.slice(0, currentIndex + 1);
        const unanalyzed = playlist.slice(currentIndex + 1).filter(t => !t.analysis);
        
        if (remaining.length < 2) return playlist;
        
        const reordered = this.buildIntelligentMix(remaining, 0, Object.keys(this.mixStyles).find(key => this.mixStyles[key] === this.currentMixStyle));
        
        return [...before, ...reordered, ...unanalyzed];
    }
    
    // ============================================
    // VISUALIZATION DATA
    // ============================================
    
    generateMixVisualization(mix) {
        const data = {
            bpmCurve: [],
            energyCurve: [],
            moodFlow: [],
            transitions: []
        };
        
        mix.forEach((track, i) => {
            const a = track.analysis;
            
            data.bpmCurve.push({
                index: i,
                bpm: a.bpm,
                title: track.metadata?.title || track.fileName
            });
            
            data.energyCurve.push({
                index: i,
                energy: a.energy * 100,
                title: track.metadata?.title || track.fileName
            });
            
            data.moodFlow.push({
                index: i,
                mood: a.mood,
                color: this.getMoodColor(a.mood)
            });
            
            if (i < mix.length - 1) {
                const score = this.calculateTransitionScore(
                    track,
                    mix[i + 1],
                    this.currentMixStyle,
                    i / mix.length
                );
                
                data.transitions.push({
                    from: i,
                    to: i + 1,
                    score: score,
                    quality: score > 75 ? 'excellent' : score > 60 ? 'good' : score > 40 ? 'fair' : 'poor'
                });
            }
        });
        
        return data;
    }
    
    getMoodColor(mood) {
        const colors = {
            energetic: '#ff5733',
            bright: '#ffd700',
            neutral: '#888888',
            calm: '#4a90e2',
            dark: '#8b4ac9'
        };
        return colors[mood] || '#888888';
    }
    
    // ============================================
    // PERSISTENCE
    // ============================================
    
    saveTransitionStats() {
        try {
            localStorage.setItem('djTransitionStats', JSON.stringify(this.transitionStats));
        } catch (err) {
            this.debugLog('Failed to save transition stats', 'error');
        }
    }
    
    loadTransitionStats() {
        try {
            const saved = localStorage.getItem('djTransitionStats');
            return saved ? JSON.parse(saved) : {};
        } catch (err) {
            return {};
        }
    }
    
    saveMixSession(styleName, mix) {
        const session = {
            timestamp: Date.now(),
            style: styleName,
            trackCount: mix.length,
            avgEnergy: mix.reduce((sum, t) => sum + t.analysis.energy, 0) / mix.length,
            avgBPM: mix.reduce((sum, t) => sum + t.analysis.bpm, 0) / mix.length
        };
        
        this.mixHistory.push(session);
        
        // Keep last 50 sessions
        if (this.mixHistory.length > 50) {
            this.mixHistory.shift();
        }
        
        try {
            localStorage.setItem('djMixHistory', JSON.stringify(this.mixHistory));
        } catch (err) {
            this.debugLog('Failed to save mix history', 'error');
        }
    }
    
    loadMixHistory() {
        try {
            const saved = localStorage.getItem('djMixHistory');
            return saved ? JSON.parse(saved) : [];
        } catch (err) {
            return [];
        }
    }
    
    endSession() {
        if (!this.sessionData.startTime) return;
        
        const duration = Date.now() - this.sessionData.startTime;
        const successRate = this.sessionData.successful / Math.max(1, this.sessionData.tracksPlayed);
        
        this.debugLog(`🎧 Session: ${this.sessionData.tracksPlayed} tracks, ${(successRate * 100).toFixed(0)}% success`, 'info');
        
        this.sessionData = {
            startTime: null,
            tracksPlayed: 0,
            skips: 0,
            successful: 0
        };
    }
    
    // ============================================
    // HELPER UTILITIES
    // ============================================
    
    getCompatibleKeys(key) {
        const keyMap = {
            'C': { perfect: ['C', 'Am'], good: ['F', 'G', 'Dm', 'Em'], ok: ['Dm', 'Gm'] },
            'C#': { perfect: ['C#', 'A#m'], good: ['F#', 'G#', 'D#m', 'Fm'], ok: ['D#m', 'G#m'] },
            'D': { perfect: ['D', 'Bm'], good: ['G', 'A', 'Em', 'F#m'], ok: ['Em', 'Am'] },
            'D#': { perfect: ['D#', 'Cm'], good: ['G#', 'A#', 'Fm', 'Gm'], ok: ['Fm', 'A#m'] },
            'E': { perfect: ['E', 'C#m'], good: ['A', 'B', 'F#m', 'G#m'], ok: ['F#m', 'Bm'] },
            'F': { perfect: ['F', 'Dm'], good: ['A#', 'C', 'Gm', 'Am'], ok: ['Gm', 'Cm'] },
            'F#': { perfect: ['F#', 'D#m'], good: ['B', 'C#', 'G#m', 'A#m'], ok: ['G#m', 'C#m'] },
            'G': { perfect: ['G', 'Em'], good: ['C', 'D', 'Am', 'Bm'], ok: ['Am', 'Dm'] },
            'G#': { perfect: ['G#', 'Fm'], good: ['C#', 'D#', 'A#m', 'Cm'], ok: ['A#m', 'D#m'] },
            'A': { perfect: ['A', 'F#m'], good: ['D', 'E', 'Bm', 'C#m'], ok: ['Bm', 'Em'] },
            'A#': { perfect: ['A#', 'Gm'], good: ['D#', 'F', 'Cm', 'Dm'], ok: ['Cm', 'Fm'] },
            'B': { perfect: ['B', 'G#m'], good: ['E', 'F#', 'C#m', 'D#m'], ok: ['C#m', 'F#m'] }
        };
        
        return keyMap[key] || { perfect: [], good: [], ok: [] };
    }
    
    getMixStylesList() {
        return Object.keys(this.mixStyles).map(key => ({
            id: key,
            ...this.mixStyles[key]
        }));
    }
    
    getSessionStats() {
        return { ...this.sessionData };
    }
    
    getMixQuality(playlist) {
        if (!this.enabled || playlist.length < 2) return null;
        
        let totalScore = 0;
        let transitions = 0;
        
        for (let i = 0; i < playlist.length - 1; i++) {
            if (playlist[i].analysis && playlist[i + 1].analysis) {
                const score = this.calculateTransitionScore(
                    playlist[i],
                    playlist[i + 1],
                    this.currentMixStyle,
                    i / playlist.length
                );
                totalScore += score;
                transitions++;
            }
        }
        
        const avgScore = transitions > 0 ? totalScore / transitions : 0;
        
        return {
            avgScore: avgScore.toFixed(1),
            quality: avgScore > 75 ? 'Excellent' : avgScore > 60 ? 'Good' : avgScore > 40 ? 'Fair' : 'Poor',
            transitions: transitions
        };
    }
}

window.DJModeManager = DJModeManager;