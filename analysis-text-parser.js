/* ============================================
   Analysis Text Parser
   Reads .txt files from Deep Analysis Tool
   ============================================ */

class AnalysisTextParser {
    constructor(debugLog) {
        this.debugLog = debugLog;
    }
    
    /**
     * Parse analysis text file and return analysis object
     */
    parseAnalysisText(textContent) {
        const analysis = {};
        
        try {
            // Split into lines
            const lines = textContent.split('\n');
            
            // Parse each line looking for key-value pairs
            for (const line of lines) {
                const trimmed = line.trim();
                
                // Basic metrics
                if (trimmed.startsWith('Duration:')) {
                    analysis.duration = this.parseTime(trimmed.split(':').slice(1).join(':').trim());
                }
                if (trimmed.startsWith('BPM:')) {
                    analysis.bpm = parseInt(trimmed.split(':')[1].trim());
                }
                if (trimmed.startsWith('Key:')) {
                    analysis.key = trimmed.split(':')[1].trim();
                }
                if (trimmed.startsWith('Tempo:')) {
                    analysis.tempo = trimmed.split(':')[1].trim();
                }
                if (trimmed.startsWith('Mood:')) {
                    analysis.mood = trimmed.split(':')[1].trim();
                }
                
                // Audio characteristics
                if (trimmed.startsWith('Energy (LUFS):')) {
                    const match = trimmed.match(/(\d+\.?\d*)%/);
                    if (match) {
                        analysis.energy = parseFloat(match[1]) / 100;
                    }
                }
                if (trimmed.startsWith('Danceability:')) {
                    const match = trimmed.match(/(\d+\.?\d*)%/);
                    if (match) {
                        analysis.danceability = parseFloat(match[1]) / 100;
                    }
                }
                if (trimmed.startsWith('Loudness:')) {
                    const match = trimmed.match(/(\d+\.?\d*)%/);
                    if (match) {
                        analysis.loudness = parseFloat(match[1]) / 100;
                    }
                }
                if (trimmed.startsWith('Spectral Centroid:')) {
                    analysis.spectralCentroid = parseFloat(trimmed.split(':')[1].trim().split(' ')[0]);
                }
                if (trimmed.startsWith('Vocal Prominence:')) {
                    analysis.vocalProminence = parseFloat(trimmed.split(':')[1].trim());
                }
                
                // Dynamic Range
                if (trimmed.startsWith('Crest Factor:')) {
                    if (!analysis.dynamicRange) analysis.dynamicRange = {};
                    analysis.dynamicRange.crestFactor = parseFloat(trimmed.split(':')[1].trim().split(' ')[0]);
                }
                if (trimmed.startsWith('Classification:') && analysis.dynamicRange) {
                    analysis.dynamicRange.classification = trimmed.split(':')[1].trim();
                }
                if (trimmed.startsWith('Peak Amplitude:')) {
                    if (!analysis.dynamicRange) analysis.dynamicRange = {};
                    analysis.dynamicRange.peak = parseFloat(trimmed.split(':')[1].trim());
                }
                if (trimmed.startsWith('RMS:') && !trimmed.startsWith('RMS:')) {
                    if (!analysis.dynamicRange) analysis.dynamicRange = {};
                    analysis.dynamicRange.rms = parseFloat(trimmed.split(':')[1].trim());
                }
                
                // Frequency Bands
                if (trimmed.startsWith('Sub-Bass')) {
                    if (!analysis.frequencyBands) analysis.frequencyBands = {};
                    const match = trimmed.match(/(\d+\.?\d*)%/);
                    if (match) analysis.frequencyBands.subBass = parseFloat(match[1]) / 100;
                }
                if (trimmed.startsWith('Bass (60-200')) {
                    if (!analysis.frequencyBands) analysis.frequencyBands = {};
                    const match = trimmed.match(/(\d+\.?\d*)%/);
                    if (match) analysis.frequencyBands.bass = parseFloat(match[1]) / 100;
                }
                if (trimmed.startsWith('Low-Mid')) {
                    if (!analysis.frequencyBands) analysis.frequencyBands = {};
                    const match = trimmed.match(/(\d+\.?\d*)%/);
                    if (match) analysis.frequencyBands.lowMid = parseFloat(match[1]) / 100;
                }
                if (trimmed.startsWith('Midrange')) {
                    if (!analysis.frequencyBands) analysis.frequencyBands = {};
                    const match = trimmed.match(/(\d+\.?\d*)%/);
                    if (match) analysis.frequencyBands.midrange = parseFloat(match[1]) / 100;
                }
                if (trimmed.startsWith('Presence')) {
                    if (!analysis.frequencyBands) analysis.frequencyBands = {};
                    const match = trimmed.match(/(\d+\.?\d*)%/);
                    if (match) analysis.frequencyBands.presence = parseFloat(match[1]) / 100;
                }
                if (trimmed.startsWith('Brilliance')) {
                    if (!analysis.frequencyBands) analysis.frequencyBands = {};
                    const match = trimmed.match(/(\d+\.?\d*)%/);
                    if (match) analysis.frequencyBands.brilliance = parseFloat(match[1]) / 100;
                }
                
                // Vintage
                if (trimmed.startsWith('Vintage Recording:')) {
                    analysis.isVintage = trimmed.split(':')[1].trim().toLowerCase() === 'yes';
                }
            }
            
            this.debugLog('✅ Parsed analysis from text file', 'success');
            return analysis;
            
        } catch (err) {
            this.debugLog(`❌ Failed to parse analysis: ${err.message}`, 'error');
            return null;
        }
    }
    
    /**
     * Parse time string (e.g., "3:45") to seconds
     */
    parseTime(timeStr) {
        const parts = timeStr.split(':');
        if (parts.length === 2) {
            return parseInt(parts[0]) * 60 + parseInt(parts[1]);
        }
        return 0;
    }
    
    /**
     * Check if analysis text is valid
     */
    isValidAnalysis(analysis) {
        return analysis && 
               typeof analysis.bpm === 'number' && 
               typeof analysis.energy === 'number' && 
               analysis.mood;
    }
}

window.AnalysisTextParser = AnalysisTextParser;