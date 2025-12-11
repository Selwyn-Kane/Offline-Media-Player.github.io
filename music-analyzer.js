/* ============================================
   Music Analyzer - Smart Playlist Generation
   Analyzes audio characteristics for intelligent playlists
   ============================================ */

class MusicAnalyzer {
    constructor(debugLog) {
        this.debugLog = debugLog;
        this.analysisCache = new Map();
        this.maxCacheSize = 100;
    }
    
    /**
     * Main analysis function - analyzes a track and returns characteristics
     */
    async analyzeTrack(audioFile, trackId) {
        // Check cache first
        if (this.analysisCache.has(trackId)) {
            this.debugLog(`Using cached analysis for ${trackId}`, 'info');
            return this.analysisCache.get(trackId);
        }
        
        try {
            this.debugLog(`Analyzing track: ${trackId}`, 'info');
            
            // Decode audio file to buffer
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const arrayBuffer = await audioFile.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            // Perform all analyses
            const analysis = {
                bpm: await this.detectBPM(audioBuffer),
                energy: this.calculateEnergy(audioBuffer),
                mood: this.detectMoodEnhanced(audioBuffer),
                key: this.detectKey(audioBuffer),
                danceability: this.calculateDanceability(audioBuffer),
                loudness: this.calculateLoudness(audioBuffer),
                tempo: null, // Will be set from BPM
                duration: audioBuffer.duration
            };
            
            analysis.tempo = this.classifyTempo(analysis.bpm);
            
            // Cache the result
            this.cacheAnalysis(trackId, analysis);
            
            this.debugLog(`Analysis complete: BPM=${analysis.bpm}, Energy=${analysis.energy.toFixed(2)}, Mood=${analysis.mood}`, 'success');
            
            await audioContext.close();
            return analysis;
            
        } catch (err) {
            this.debugLog(`Analysis failed: ${err.message}`, 'error');
            return this.getDefaultAnalysis();
        }
    }
    
    /**
     * BPM Detection using autocorrelation
     */
    async detectBPM(audioBuffer) {
        try {
            const channel = audioBuffer.getChannelData(0);
            const sampleRate = audioBuffer.sampleRate;
            
            // Downsample for performance (analyze every 10th sample)
            const downsampled = [];
            for (let i = 0; i < channel.length; i += 10) {
                downsampled.push(Math.abs(channel[i]));
            }
            
            // Apply low-pass filter to focus on beat frequencies
            const filtered = this.lowPassFilter(downsampled, 0.1);
            
            // Find peaks (beats)
            const peaks = this.findPeaks(filtered, sampleRate / 10);
            
            if (peaks.length < 2) {
                return 120; // Default BPM
            }
            
            // Calculate intervals between peaks
            const intervals = [];
            for (let i = 1; i < Math.min(peaks.length, 50); i++) {
                intervals.push(peaks[i] - peaks[i - 1]);
            }
            
            // Find most common interval (median)
            intervals.sort((a, b) => a - b);
            const medianInterval = intervals[Math.floor(intervals.length / 2)];
            
            // Convert to BPM
            const bpm = Math.round((60 * sampleRate / 10) / medianInterval);
            
            // Validate BPM range (60-180 is typical)
            if (bpm < 60) return bpm * 2;
            if (bpm > 180) return bpm / 2;
            
            return bpm;
            
        } catch (err) {
            this.debugLog(`BPM detection failed: ${err.message}`, 'warning');
            return 120;
        }
    }
    
    /**
     * Energy calculation (average amplitude over time)
     */
    calculateEnergy(audioBuffer) {
        const channel = audioBuffer.getChannelData(0);
        let sum = 0;
        
        // Sample every 1000th point for performance
        for (let i = 0; i < channel.length; i += 1000) {
            sum += Math.abs(channel[i]);
        }
        
        const energy = sum / (channel.length / 1000);
        
        // Normalize to 0-1 scale
        return Math.min(energy * 10, 1);
    }
    
/**
 * Mood detection (improved with better thresholds)
 */
detectMood(audioBuffer) {
    const energy = this.calculateEnergy(audioBuffer);
    const spectralCentroid = this.calculateSpectralCentroid(audioBuffer);
    
    // Better classification with overlapping ranges
    if (energy > 0.7) {
        if (spectralCentroid > 2200) return 'bright';
        return 'energetic';
    }
    
    if (energy < 0.4) {
        if (spectralCentroid < 1200) return 'dark';
        return 'calm';
    }
    
    // Middle ground - more nuanced classification
    if (spectralCentroid > 2000) {
        return 'bright';
    }
    
    if (spectralCentroid < 1400) {
        return 'dark';
    }
    
    // Moderate energy + moderate brightness
    if (energy > 0.55 && spectralCentroid > 1800) {
        return 'energetic';
    }
    
    if (energy < 0.45 && spectralCentroid < 1600) {
        return 'calm';
    }
    
    // Default to neutral only when truly in the middle
    return 'neutral';
}

/**
 * Enhanced mood detection with tempo consideration
 */
detectMoodEnhanced(audioBuffer) {
    try {
        // Get BPM for tempo-aware mood classification
        const bpm = this.detectBPM(audioBuffer);
        const energy = this.calculateEnergy(audioBuffer);
        const spectralCentroid = this.calculateSpectralCentroid(audioBuffer);
        
        this.debugLog(`Mood analysis: Energy=${energy.toFixed(2)}, BPM=${bpm}, SpectralCentroid=${spectralCentroid.toFixed(0)}`, 'info');
        
        // Factor in tempo for mood classification
        if (energy > 0.7 && bpm > 130) {
            return 'energetic';
        }
        
        if (energy < 0.4 && bpm < 90) {
            return 'calm';
        }
        
        if (spectralCentroid > 2300 && energy > 0.6) {
            return 'bright';
        }
        
        if (spectralCentroid < 1200 && energy < 0.5) {
            return 'dark';
        }
        
        // Middle classifications with tempo consideration
        if (energy > 0.6 && energy <= 0.7) {
            if (bpm > 120) return 'energetic';
            if (spectralCentroid > 2000) return 'bright';
        }
        
        if (energy >= 0.4 && energy <= 0.5) {
            if (bpm < 100) return 'calm';
            if (spectralCentroid < 1500) return 'dark';
        }
        
        // If still undecided, use the regular detectMood as fallback
        return this.detectMood(audioBuffer);
        
    } catch (err) {
        this.debugLog(`Enhanced mood detection failed, using fallback: ${err.message}`, 'warning');
        return this.detectMood(audioBuffer);
    }
}
    
    /**
     * Key detection (simplified - uses FFT to find dominant frequency)
     */
    detectKey(audioBuffer) {
        try {
            // Get frequency data
            const channel = audioBuffer.getChannelData(0);
            const fftSize = 8192;
            const fft = this.performFFT(channel.slice(0, fftSize));
            
            // Find peak frequency
            let maxMagnitude = 0;
            let peakIndex = 0;
            
            for (let i = 0; i < fft.length / 2; i++) {
                const magnitude = Math.sqrt(fft[i].real ** 2 + fft[i].imag ** 2);
                if (magnitude > maxMagnitude) {
                    maxMagnitude = magnitude;
                    peakIndex = i;
                }
            }
            
            // Convert to frequency
            const peakFreq = (peakIndex * audioBuffer.sampleRate) / fftSize;
            
            // Map to musical key (simplified)
            const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
            const a4 = 440;
            const halfSteps = Math.round(12 * Math.log2(peakFreq / a4));
            const noteIndex = (halfSteps + 9 + 12 * 10) % 12;
            
            return notes[noteIndex];
            
        } catch (err) {
            this.debugLog(`Key detection failed: ${err.message}`, 'warning');
            return 'C';
        }
    }
    
    /**
     * Danceability calculation (rhythm consistency)
     */
    calculateDanceability(audioBuffer) {
        try {
            const channel = audioBuffer.getChannelData(0);
            const sampleRate = audioBuffer.sampleRate;
            
            // Analyze rhythm consistency
            const windowSize = Math.floor(sampleRate * 0.1); // 100ms windows
            const energies = [];
            
            for (let i = 0; i < channel.length - windowSize; i += windowSize) {
                let sum = 0;
                for (let j = 0; j < windowSize; j++) {
                    sum += Math.abs(channel[i + j]);
                }
                energies.push(sum / windowSize);
            }
            
            // Calculate variance (low variance = consistent rhythm = high danceability)
            const mean = energies.reduce((a, b) => a + b, 0) / energies.length;
            const variance = energies.reduce((sum, e) => sum + (e - mean) ** 2, 0) / energies.length;
            
            // Normalize (lower variance = higher danceability)
            const danceability = Math.max(0, Math.min(1, 1 - variance * 5));
            
            return danceability;
            
        } catch (err) {
            this.debugLog(`Danceability calculation failed: ${err.message}`, 'warning');
            return 0.5;
        }
    }
    
    /**
     * Loudness calculation (RMS)
     */
    calculateLoudness(audioBuffer) {
        const channel = audioBuffer.getChannelData(0);
        let sum = 0;
        
        for (let i = 0; i < channel.length; i++) {
            sum += channel[i] ** 2;
        }
        
        const rms = Math.sqrt(sum / channel.length);
        
        // Convert to dB (approximate)
        const db = 20 * Math.log10(rms);
        
        // Normalize to 0-1 scale
        return Math.max(0, Math.min(1, (db + 60) / 60));
    }
    
    /**
     * Spectral centroid (brightness measure)
     */
    calculateSpectralCentroid(audioBuffer) {
        try {
            const channel = audioBuffer.getChannelData(0);
            const fftSize = 2048;
            const fft = this.performFFT(channel.slice(0, fftSize));
            
            let weightedSum = 0;
            let sum = 0;
            
            for (let i = 0; i < fft.length / 2; i++) {
                const magnitude = Math.sqrt(fft[i].real ** 2 + fft[i].imag ** 2);
                const freq = (i * audioBuffer.sampleRate) / fftSize;
                weightedSum += freq * magnitude;
                sum += magnitude;
            }
            
            return sum > 0 ? weightedSum / sum : 1500;
            
        } catch (err) {
            return 1500;
        }
    }
    
    /**
     * Tempo classification
     */
    classifyTempo(bpm) {
        if (bpm < 80) return 'slow';
        if (bpm < 110) return 'moderate';
        if (bpm < 140) return 'fast';
        return 'very-fast';
    }
    
    // ========== HELPER FUNCTIONS ==========
    
    /**
     * Simple low-pass filter
     */
    lowPassFilter(data, alpha) {
        const filtered = [data[0]];
        for (let i = 1; i < data.length; i++) {
            filtered[i] = alpha * data[i] + (1 - alpha) * filtered[i - 1];
        }
        return filtered;
    }
    
    /**
     * Peak detection
     */
    findPeaks(data, minDistance) {
        const peaks = [];
        const threshold = Math.max(...data) * 0.5; // 50% of max value
        
        for (let i = 1; i < data.length - 1; i++) {
            if (data[i] > threshold && 
                data[i] > data[i - 1] && 
                data[i] > data[i + 1]) {
                
                // Check minimum distance from last peak
                if (peaks.length === 0 || i - peaks[peaks.length - 1] > minDistance) {
                    peaks.push(i);
                }
            }
        }
        
        return peaks;
    }
    
    /**
     * Simplified FFT (using browser's AnalyserNode would be more efficient)
     */
    performFFT(data) {
        // This is a placeholder - in production, use Web Audio API's analyser
        // or a proper FFT library like fft.js
        const result = [];
        for (let i = 0; i < data.length; i++) {
            result.push({ real: data[i], imag: 0 });
        }
        return result;
    }
    
    /**
     * Cache management
     */
    cacheAnalysis(trackId, analysis) {
        if (this.analysisCache.size >= this.maxCacheSize) {
            const firstKey = this.analysisCache.keys().next().value;
            this.analysisCache.delete(firstKey);
        }
        this.analysisCache.set(trackId, analysis);
    }
    
    /**
     * Default analysis for failed cases
     */
    getDefaultAnalysis() {
        return {
            bpm: 120,
            energy: 0.5,
            mood: 'neutral',
            key: 'C',
            danceability: 0.5,
            loudness: 0.5,
            tempo: 'moderate',
            duration: 0
        };
    }
    
    /**
     * Batch analyze multiple tracks with progress callback
     */
    async analyzeBatch(tracks, progressCallback) {
        const results = [];
        
        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            const analysis = await this.analyzeTrack(track.file, track.id);
            results.push({ ...track, analysis });
            
            if (progressCallback) {
                progressCallback(i + 1, tracks.length, track);
            }
        }
        
        return results;
    }
    
    /**
     * Save all analyses to localStorage
     */
    saveAnalysesToStorage() {
        try {
            const data = Array.from(this.analysisCache.entries());
            localStorage.setItem('musicAnalysisCache', JSON.stringify(data));
            this.debugLog(`Saved ${data.length} analyses to storage`, 'success');
        } catch (err) {
            this.debugLog(`Failed to save analyses: ${err.message}`, 'error');
        }
    }
    
    /**
     * Load analyses from localStorage
     */
    loadAnalysesFromStorage() {
        try {
            const data = localStorage.getItem('musicAnalysisCache');
            if (data) {
                const entries = JSON.parse(data);
                this.analysisCache = new Map(entries);
                this.debugLog(`Loaded ${entries.length} analyses from storage`, 'success');
            }
        } catch (err) {
            this.debugLog(`Failed to load analyses: ${err.message}`, 'error');
        }
    }
}

// Export
window.MusicAnalyzer = MusicAnalyzer;