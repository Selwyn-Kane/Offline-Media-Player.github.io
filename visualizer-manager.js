/* ============================================
   Visualizer Manager - ULTRA-REACTIVE ENHANCED VERSION
   Real-time audio-reactive visualizations with deep analysis integration
   ============================================ */

class VisualizerManager {
    constructor() {
        // Canvas references
        this.canvas = null;
        this.canvasCtx = null;
        this.fullscreenCanvas = null;
        this.fullscreenCtx = null;
        
        // Audio analysis
        this.analyser = null;
        this.dataArray = null;
        this.bufferLength = null;
        
        // Animation control
        this.animationId = null;
        this.enabled = true;
        this.isFullscreen = false;
        this.vizMode = 'bars';
        
        // Performance tracking
        this.frameCount = 0;
        this.lastFrameTime = 0;
        this.fps = 60;
        
        // Enhanced analysis integration
        this.currentAnalysis = null;
        this.previousAnalysis = null;
        
        // Advanced beat tracking
        this.beatDetector = {
            history: [],
            threshold: 0,
            lastBeatTime: 0,
            beatInterval: 500,
            sensitivity: 1.3,
            actualBeats: []
        };
        
        // Smooth interpolation for reactive effects
        this.smoothing = {
            energy: 0,
            bass: 0,
            mid: 0,
            treble: 0,
            volume: 0,
            targetEnergy: 0,
            targetBass: 0,
            targetMid: 0,
            targetTreble: 0
        };
        
        // Particle systems
        this.particles = [];
        this.maxParticles = 500;
        
        // Color palette cache
        this.colorCache = {
            mood: null,
            albumArt: null,
            current: null,
            lastUpdate: 0
        };
        
        // Frequency band analysis cache
        this.frequencyBands = {
            subBass: 0,
            bass: 0,
            lowMid: 0,
            mid: 0,
            highMid: 0,
            presence: 0,
            brilliance: 0
        };
        
        // Performance optimization
        this.performanceMode = 'high'; // 'low', 'medium', 'high'
        this.skipFrames = 0;
        
        console.log('🎨 VisualizerManager initialized (Ultra-Reactive Edition)');
    }
    
    // ============================================
    // ANALYSIS DATA MANAGEMENT
    // ============================================
    
    setTrackAnalysis(analysis) {
        if (!analysis) {
            console.warn('⚠️ Visualizer: Received null analysis data');
            return;
        }
        
        this.previousAnalysis = this.currentAnalysis;
        this.currentAnalysis = this.validateAnalysis(analysis);
        
        // Reset beat detector with new BPM
        if (this.currentAnalysis.bpm) {
            this.beatDetector.beatInterval = (60 / this.currentAnalysis.bpm) * 1000;
            this.beatDetector.lastBeatTime = performance.now();
            this.beatDetector.actualBeats = [];
        }
        
        // Update color cache
        this.updateColorCache();
        
        console.log('🎵 Visualizer analysis updated:', {
            bpm: this.currentAnalysis.bpm,
            mood: this.currentAnalysis.mood,
            energy: this.currentAnalysis.energy,
            danceability: this.currentAnalysis.danceability
        });
    }
    
    validateAnalysis(analysis) {
        return {
            bpm: analysis.bpm || 120,
            energy: Math.max(0, Math.min(1, analysis.energy || 0.5)),
            mood: analysis.mood || 'neutral',
            key: analysis.key || 'C',
            danceability: Math.max(0, Math.min(1, analysis.danceability || 0.5)),
            loudness: Math.max(0, Math.min(1, analysis.loudness || 0.5)),
            spectralCentroid: analysis.spectralCentroid || 1500,
            tempo: analysis.tempo || 'moderate',
            dynamicRange: analysis.dynamicRange || { crestFactor: 10, classification: 'moderate' },
            frequencyBands: analysis.frequencyBands || {
                subBass: 0.15, bass: 0.2, lowMid: 0.2, 
                midrange: 0.25, presence: 0.15, brilliance: 0.05
            },
            vocalProminence: analysis.vocalProminence || 1.0,
            isVintage: analysis.isVintage || false
        };
    }
    
    clearTrackAnalysis() {
        this.previousAnalysis = this.currentAnalysis;
        this.currentAnalysis = null;
        this.colorCache.mood = null;
        this.particles = [];
        console.log('🎵 Visualizer analysis cleared');
    }
    
    // ============================================
    // COLOR MANAGEMENT
    // ============================================
    
    updateColorCache() {
        const now = performance.now();
        if (now - this.colorCache.lastUpdate < 100) return; // Throttle updates
        
        this.colorCache.lastUpdate = now;
        this.colorCache.mood = this.getMoodColors();
        this.colorCache.albumArt = this.getAlbumArtColor();
        this.colorCache.current = this.colorCache.albumArt || this.colorCache.mood;
    }
    
    getMoodColors() {
        if (!this.currentAnalysis) {
            return { primary: [340, 80, 50], secondary: [340, 80, 30], accent: [340, 100, 60] };
        }
        
        const moodPalettes = {
            'energetic': { 
                primary: [0, 100, 60], 
                secondary: [30, 100, 50], 
                accent: [15, 100, 70] 
            },
            'calm': { 
                primary: [200, 70, 50], 
                secondary: [220, 70, 40], 
                accent: [210, 80, 60] 
            },
            'bright': { 
                primary: [50, 100, 60], 
                secondary: [60, 100, 50], 
                accent: [55, 100, 70] 
            },
            'dark': { 
                primary: [270, 60, 40], 
                secondary: [280, 60, 30], 
                accent: [275, 70, 50] 
            },
            'neutral': { 
                primary: [340, 80, 50], 
                secondary: [340, 80, 30], 
                accent: [340, 90, 60] 
            }
        };
        
        return moodPalettes[this.currentAnalysis.mood] || moodPalettes.neutral;
    }
    
    getAlbumArtColor() {
        if (!window.currentDominantColor) return null;
        
        const { r, g, b } = window.currentDominantColor;
        const hue = this.rgbToHsl(r, g, b)[0];
        
        return {
            primary: [hue, 80, 50],
            secondary: [hue + 30, 80, 35],
            accent: [hue - 15, 90, 60]
        };
    }
    
    rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        
        return [h * 360, s * 100, l * 100];
    }
    
    getColor(index, total) {
        const colors = this.colorCache.current;
        if (!colors) return `hsl(340, 80%, 50%)`;
        
        const progress = index / total;
        const hue = colors.primary[0] + progress * 60;
        const saturation = colors.primary[1] + Math.sin(progress * Math.PI) * 20;
        const lightness = colors.primary[2] + Math.cos(progress * Math.PI) * 15;
        
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    
    // ============================================
    // ADVANCED BEAT DETECTION & SYNC
    // ============================================
    
    detectBeat(dataArray) {
        if (!dataArray || dataArray.length === 0) return false;
        
        const now = performance.now();
        const bass = this.calculateBassEnergy(dataArray);
        
        // Dynamic threshold based on recent history
        this.beatDetector.history.push(bass);
        if (this.beatDetector.history.length > 43) { // ~43 frames = 0.7s at 60fps
            this.beatDetector.history.shift();
        }
        
        const avgEnergy = this.beatDetector.history.reduce((a, b) => a + b, 0) / this.beatDetector.history.length;
        this.beatDetector.threshold = avgEnergy * this.beatDetector.sensitivity;
        
        // Detect beat
        const timeSinceLastBeat = now - this.beatDetector.lastBeatTime;
        const isBeat = bass > this.beatDetector.threshold && timeSinceLastBeat > 200; // Min 200ms between beats
        
        if (isBeat) {
            this.beatDetector.lastBeatTime = now;
            this.beatDetector.actualBeats.push(now);
            
            // Keep only recent beats
            this.beatDetector.actualBeats = this.beatDetector.actualBeats.filter(
                t => now - t < 5000
            );
            
            return true;
        }
        
        return false;
    }
    
    calculateBassEnergy(dataArray) {
        const bassEnd = Math.floor(dataArray.length * 0.1); // First 10% is bass
        let sum = 0;
        for (let i = 0; i < bassEnd; i++) {
            sum += dataArray[i];
        }
        return sum / bassEnd;
    }
    
    getBPMPulse() {
        if (!this.currentAnalysis || !this.currentAnalysis.bpm) {
            return 1.0;
        }
        
        const now = performance.now();
        const timeSinceLastBeat = (now - this.beatDetector.lastBeatTime) % this.beatDetector.beatInterval;
        const pulseProgress = timeSinceLastBeat / this.beatDetector.beatInterval;
        
        // Smooth pulse curve (ease-out)
        const easeOut = 1 - Math.pow(1 - pulseProgress, 3);
        return 1.0 + Math.sin(easeOut * Math.PI) * 0.25 * this.currentAnalysis.danceability;
    }
    
    getEnergyMultiplier() {
        if (!this.currentAnalysis) return 1.0;
        return 0.6 + this.currentAnalysis.energy * 1.4; // 0.6x to 2.0x
    }
    
    // ============================================
    // FREQUENCY BAND ANALYSIS
    // ============================================
    
    analyzeFrequencyBands(dataArray) {
        if (!dataArray || dataArray.length === 0) return;
        
        const bands = this.frequencyBands;
        const len = dataArray.length;
        
        // Divide spectrum into bands
        bands.subBass = this.getAverageBand(dataArray, 0, len * 0.05);
        bands.bass = this.getAverageBand(dataArray, len * 0.05, len * 0.15);
        bands.lowMid = this.getAverageBand(dataArray, len * 0.15, len * 0.25);
        bands.mid = this.getAverageBand(dataArray, len * 0.25, len * 0.45);
        bands.highMid = this.getAverageBand(dataArray, len * 0.45, len * 0.65);
        bands.presence = this.getAverageBand(dataArray, len * 0.65, len * 0.85);
        bands.brilliance = this.getAverageBand(dataArray, len * 0.85, len);
    }
    
    getAverageBand(dataArray, start, end) {
        start = Math.floor(start);
        end = Math.floor(end);
        let sum = 0;
        for (let i = start; i < end; i++) {
            sum += dataArray[i];
        }
        return (sum / (end - start)) / 255;
    }
    
    // ============================================
    // SMOOTH INTERPOLATION
    // ============================================
    
    updateSmoothing(dataArray) {
        if (!dataArray) return;
        
        this.analyzeFrequencyBands(dataArray);
        
        // Calculate targets
        const avgVolume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255;
        this.smoothing.targetEnergy = this.currentAnalysis ? this.currentAnalysis.energy : avgVolume;
        this.smoothing.targetBass = this.frequencyBands.bass;
        this.smoothing.targetMid = this.frequencyBands.mid;
        this.smoothing.targetTreble = (this.frequencyBands.presence + this.frequencyBands.brilliance) / 2;
        
        // Smooth interpolation (exponential moving average)
        const smoothFactor = 0.15;
        this.smoothing.energy += (this.smoothing.targetEnergy - this.smoothing.energy) * smoothFactor;
        this.smoothing.bass += (this.smoothing.targetBass - this.smoothing.bass) * smoothFactor;
        this.smoothing.mid += (this.smoothing.targetMid - this.smoothing.mid) * smoothFactor;
        this.smoothing.treble += (this.smoothing.targetTreble - this.smoothing.treble) * smoothFactor;
        this.smoothing.volume += (avgVolume - this.smoothing.volume) * smoothFactor;
    }
    
    // ============================================
    // MAIN VISUALIZER (EMBEDDED)
    // ============================================
    
    initMainVisualizer(canvasElement, analyser) {
        if (this.canvas && this.canvas === canvasElement) return;
        
        if (!canvasElement || !analyser) {
            console.warn('⚠️ Visualizer: Invalid canvas or analyser');
            return;
        }
        
        try {
            this.canvas = canvasElement;
            this.canvasCtx = this.canvas.getContext('2d', { alpha: false });
            this.analyser = analyser;
            this.bufferLength = analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);
            
            this.resizeCanvas();
            
            console.log('✅ Main visualizer initialized');
        } catch (error) {
            console.error('❌ Failed to initialize main visualizer:', error);
        }
    }
    
    resizeCanvas() {
        if (!this.canvas) return;
        
        this.canvas.width = this.canvas.offsetWidth || 800;
        this.canvas.height = this.canvas.offsetHeight || 200;
    }
    
    start(shouldRun) {
        if (!this.canvas || !shouldRun || this.animationId) return;
        
        this.lastFrameTime = performance.now();
        this.draw();
    }
    
    draw = () => {
        if (!this.enabled) {
            this.animationId = null;
            this.clearCanvas();
            return;
        }
        
        this.animationId = requestAnimationFrame(this.draw);
        
        // Performance tracking
        const now = performance.now();
        const delta = now - this.lastFrameTime;
        this.fps = 1000 / delta;
        this.lastFrameTime = now;
        this.frameCount++;
        
        if (!this.analyser || !this.dataArray) return;
        
        try {
            this.analyser.getByteFrequencyData(this.dataArray);
            this.updateSmoothing(this.dataArray);
            this.detectBeat(this.dataArray);
            
            // Clear with gradient
            const gradient = this.canvasCtx.createLinearGradient(0, 0, 0, this.canvas.height);
            gradient.addColorStop(0, '#1a1a1a');
            gradient.addColorStop(1, '#0a0a0a');
            this.canvasCtx.fillStyle = gradient;
            this.canvasCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw visualization
            this.drawEnhancedBars();
        } catch (error) {
            console.error('❌ Visualizer draw error:', error);
        }
    }
    
    drawEnhancedBars() {
        const barWidth = (this.canvas.width / this.bufferLength) * 2.5;
        let x = 0;
        
        const pulse = this.getBPMPulse();
        const energyMult = this.getEnergyMultiplier();
        
        for (let i = 0; i < this.bufferLength; i++) {
            let barHeight = (this.dataArray[i] / 255) * this.canvas.height * 0.8;
            
            // Apply effects
            barHeight *= pulse;
            barHeight *= (0.8 + this.smoothing.energy * 0.4);
            
            // Frequency-based coloring
            const freqRatio = i / this.bufferLength;
            let intensityBoost = 1.0;
            
            if (freqRatio < 0.15) intensityBoost = 1 + this.smoothing.bass;
            else if (freqRatio < 0.45) intensityBoost = 1 + this.smoothing.mid * 0.5;
            else intensityBoost = 1 + this.smoothing.treble * 0.7;
            
            barHeight *= intensityBoost;
            
            const colors = this.colorCache.current || { primary: [340, 80, 50] };
            const hue = colors.primary[0] + (i / this.bufferLength) * 60;
            const saturation = colors.primary[1] + (this.dataArray[i] / 255) * 20;
            const lightness = colors.primary[2] + (this.dataArray[i] / 255) * 20;
            
            const barGradient = this.canvasCtx.createLinearGradient(
                0, this.canvas.height - barHeight, 0, this.canvas.height
            );
            barGradient.addColorStop(0, `hsl(${hue}, ${saturation}%, ${lightness}%)`);
            barGradient.addColorStop(1, `hsl(${hue}, ${saturation}%, ${lightness - 25}%)`);
            
            this.canvasCtx.fillStyle = barGradient;
            
            const barX = x;
            const barY = this.canvas.height - barHeight;
            const radius = barWidth / 2;
            
            // Rounded rectangle
            this.canvasCtx.beginPath();
            this.canvasCtx.moveTo(barX, this.canvas.height);
            this.canvasCtx.lineTo(barX, barY + radius);
            this.canvasCtx.quadraticCurveTo(barX, barY, barX + radius, barY);
            this.canvasCtx.lineTo(barX + barWidth - radius, barY);
            this.canvasCtx.quadraticCurveTo(barX + barWidth, barY, barX + barWidth, barY + radius);
            this.canvasCtx.lineTo(barX + barWidth, this.canvas.height);
            this.canvasCtx.closePath();
            this.canvasCtx.fill();
            
            x += barWidth + 1;
        }
    }
    
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
            this.clearCanvas();
        }
    }
    
    clearCanvas() {
        if (!this.canvas || !this.canvasCtx) return;
        
        const gradient = this.canvasCtx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#1a1a1a');
        gradient.addColorStop(1, '#0a0a0a');
        this.canvasCtx.fillStyle = gradient;
        this.canvasCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) this.stop();
    }
    
    // ============================================
    // FULLSCREEN VISUALIZER
    // ============================================
    
    initFullscreenVisualizer(canvasElement) {
        if (this.fullscreenCanvas && this.fullscreenCanvas === canvasElement) return;
        
        try {
            this.fullscreenCanvas = canvasElement;
            this.fullscreenCtx = this.fullscreenCanvas.getContext('2d', { alpha: false });
            this.resizeFullscreenCanvas();
            
            console.log('✅ Fullscreen visualizer initialized');
        } catch (error) {
            console.error('❌ Failed to initialize fullscreen visualizer:', error);
        }
    }
    
    resizeFullscreenCanvas() {
        if (!this.fullscreenCanvas) return;
        
        this.fullscreenCanvas.width = window.innerWidth;
        this.fullscreenCanvas.height = window.innerHeight;
    }
    
    startFullscreen(analyser, dataArray) {
        if (!this.analyser) {
            this.analyser = analyser;
            this.bufferLength = analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);
        } else {
            this.dataArray = dataArray;
        }
        
        this.isFullscreen = true;
        this.particles = [];
        this.drawFullscreen();
    }
    
    drawFullscreen = () => {
        if (!this.fullscreenCanvas || !this.analyser) {
            this.animationId = null;
            return;
        }
        
        this.animationId = requestAnimationFrame(this.drawFullscreen);
        
        try {
            this.analyser.getByteFrequencyData(this.dataArray);
            this.updateSmoothing(this.dataArray);
            this.detectBeat(this.dataArray);
            
            // Clear with fade
            this.fullscreenCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            this.fullscreenCtx.fillRect(0, 0, this.fullscreenCanvas.width, this.fullscreenCanvas.height);
            
            // Draw based on mode
            switch(this.vizMode) {
                case 'bars':
                    this.drawFullscreenBars();
                    break;
                case 'circular':
                    this.drawFullscreenCircular();
                    break;
                case 'waveform':
                    this.drawFullscreenWaveform();
                    break;
                case 'particles':
                    this.drawFullscreenParticles();
                    break;
                default:
                    this.drawFullscreenBars();
            }
        } catch (error) {
            console.error('❌ Fullscreen draw error:', error);
        }
    }
    
    drawFullscreenBars() {
        const width = this.fullscreenCanvas.width;
        const height = this.fullscreenCanvas.height;
        const barCount = 180;
        const barWidth = width / barCount;
        
        const colors = this.colorCache.current || { primary: [340, 80, 50] };
        const pulse = this.getBPMPulse();
        const energyMult = this.getEnergyMultiplier();
        
        for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor((i / barCount) * this.bufferLength);
            const value = this.dataArray[dataIndex] / 255;
            let barHeight = value * height * 0.85;
            
            // Apply reactive effects
            barHeight *= pulse;
            barHeight *= energyMult;
            
            // Frequency-based boost
            const freqRatio = i / barCount;
            if (freqRatio < 0.2) barHeight *= (1 + this.smoothing.bass * 0.5);
            else if (freqRatio > 0.7) barHeight *= (1 + this.smoothing.treble * 0.3);
            
            const x = i * barWidth;
            const y = height - barHeight;
            
            const hue = colors.primary[0] + (i / barCount) * 80;
            const saturation = colors.primary[1] + value * 20;
            const lightness = colors.primary[2] + value * 15;
            
            const gradient = this.fullscreenCtx.createLinearGradient(x, y, x, height);
            gradient.addColorStop(0, `hsl(${hue}, ${saturation}%, ${lightness}%)`);
            gradient.addColorStop(1, `hsl(${hue}, ${saturation - 20}%, ${lightness - 25}%)`);
            
            this.fullscreenCtx.fillStyle = gradient;
            this.fullscreenCtx.fillRect(x, y, barWidth - 2, barHeight);
            
            // Glow effect on high values
            if (value > 0.7) {
                this.fullscreenCtx.shadowBlur = 20 * value;
                this.fullscreenCtx.shadowColor = `hsl(${hue}, 100%, 60%)`;
                this.fullscreenCtx.fillRect(x, y, barWidth - 2, barHeight);
                this.fullscreenCtx.shadowBlur = 0;
            }
        }
    }
    
    drawFullscreenCircular() {
        const width = this.fullscreenCanvas.width;
        const height = this.fullscreenCanvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.min(width, height) * 0.42;
        const minRadius = maxRadius * 0.25;
        const barCount = 200;
        
        const colors = this.colorCache.current || { primary: [340, 80, 50] };
        const pulse = this.getBPMPulse();
        const energyMult = this.getEnergyMultiplier();
        
        // Rotating effect based on energy
        const rotation = (this.frameCount * 0.001 * energyMult) % (Math.PI * 2);
        
        for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor((i / barCount) * this.bufferLength);
            const value = this.dataArray[dataIndex] / 255;
            let barHeight = value * maxRadius * 0.75;
            
            barHeight *= pulse;
            barHeight *= energyMult;
            
            const angle = (i / barCount) * Math.PI * 2 + rotation;
            
            const x1 = centerX + Math.cos(angle) * minRadius;
            const y1 = centerY + Math.sin(angle) * minRadius;
            const x2 = centerX + Math.cos(angle) * (minRadius + barHeight);
            const y2 = centerY + Math.sin(angle) * (minRadius + barHeight);
            
            const hue = colors.primary[0] + (i / barCount) * 120 + this.smoothing.energy * 30;
            const saturation = colors.primary[1] + value * 25;
            const lightness = colors.primary[2] + value * 20;
            
            this.fullscreenCtx.strokeStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            this.fullscreenCtx.lineWidth = 4;
            
            if (value > 0.6) {
                this.fullscreenCtx.shadowBlur = 15;
                this.fullscreenCtx.shadowColor = `hsl(${hue}, 100%, 60%)`;
            }
            
            this.fullscreenCtx.beginPath();
            this.fullscreenCtx.moveTo(x1, y1);
            this.fullscreenCtx.lineTo(x2, y2);
            this.fullscreenCtx.stroke();
        }
        
        this.fullscreenCtx.shadowBlur = 0;
        
        // Center pulse
        const avgValue = this.smoothing.volume;
        const centerRadius = 20 + (avgValue * 60) * pulse;
        
        const centerGradient = this.fullscreenCtx.createRadialGradient(
            centerX, centerY, 0, centerX, centerY, centerRadius
        );
        centerGradient.addColorStop(0, `hsla(${colors.primary[0]}, 100%, 70%, 0.8)`);
        centerGradient.addColorStop(1, `hsla(${colors.primary[0]}, 100%, 50%, 0)`);
        
        this.fullscreenCtx.fillStyle = centerGradient;
        this.fullscreenCtx.beginPath();
        this.fullscreenCtx.arc(centerX, centerY, centerRadius, 0, Math.PI * 2);
        this.fullscreenCtx.fill();
    }
    
    drawFullscreenWaveform() {
        const width = this.fullscreenCanvas.width;
        const height = this.fullscreenCanvas.height;
        const centerY = height / 2;
        const sliceWidth = width / this.bufferLength;
        const amplitude = height * 0.4;
        
        const colors = this.colorCache.current || { primary: [340, 80, 50] };
        const pulse = this.getBPMPulse();
        const energyMult = this.getEnergyMultiplier();
        
        this.fullscreenCtx.lineWidth = 3 + this.smoothing.energy * 2;
        
        // Top waveform
        this.fullscreenCtx.strokeStyle = `hsl(${colors.primary[0]}, ${colors.primary[1]}%, ${colors.primary[2]}%)`;
        this.fullscreenCtx.shadowBlur = 20;
        this.fullscreenCtx.shadowColor = `hsl(${colors.primary[0]}, 100%, 60%)`;
        
        this.fullscreenCtx.beginPath();
        let x = 0;
        for (let i = 0; i < this.bufferLength; i++) {
            const v = this.dataArray[i] / 128.0;
            const y = centerY - (v - 1) * amplitude * pulse;
            
            if (i === 0) this.fullscreenCtx.moveTo(x, y);
            else this.fullscreenCtx.lineTo(x, y);
            
            x += sliceWidth;
        }
        this.fullscreenCtx.stroke();
        
        // Bottom waveform (mirrored)
        this.fullscreenCtx.strokeStyle = `hsl(${colors.secondary[0]}, ${colors.secondary[1]}%, ${colors.secondary[2]}%)`;
        this.fullscreenCtx.beginPath();
        x = 0;
        for (let i = 0; i < this.bufferLength; i++) {
            const v = this.dataArray[i] / 128.0;
            const y = centerY + (v - 1) * amplitude * pulse;
            
            if (i === 0) this.fullscreenCtx.moveTo(x, y);
            else this.fullscreenCtx.lineTo(x, y);
            
            x += sliceWidth;
        }
        this.fullscreenCtx.stroke();
        this.fullscreenCtx.shadowBlur = 0;
    }
    
    drawFullscreenParticles() {
        const width = this.fullscreenCanvas.width;
        const height = this.fullscreenCanvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        
        const energyMult = this.getEnergyMultiplier();
        const colors = this.colorCache.current || { primary: [340, 80, 50] };
        
        // Create particles on beat or high energy
        const shouldSpawn = this.detectBeat(this.dataArray) || this.smoothing.volume > 0.6;
        const spawnCount = shouldSpawn ? Math.floor(8 * energyMult) : Math.floor(3 * energyMult);
        
        for (let i = 0; i < spawnCount && this.particles.length < this.maxParticles; i++) {
            const value = this.dataArray[Math.floor(Math.random() * this.bufferLength)] / 255;
            
            if (value > 0.2) {
                const angle = Math.random() * Math.PI * 2;
                const speed = (3 + value * 7) * energyMult;
                const size = 3 + value * 8;
                const hue = colors.primary[0] + Math.random() * 80;
                
                this.particles.push({
                    x: centerX,
                    y: centerY,
                    size: size,
                    color: `hsl(${hue}, 100%, 60%)`,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 1,
                    decay: 0.008 + Math.random() * 0.012
                });
            }
        }
        
        // Update and draw particles
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.15; // Gravity
            p.life -= p.decay;
            p.size *= 0.985;
            
            if (p.life > 0) {
                this.fullscreenCtx.save();
                this.fullscreenCtx.globalAlpha = p.life;
                this.fullscreenCtx.fillStyle = p.color;
                this.fullscreenCtx.shadowBlur = 15 * p.life;
                this.fullscreenCtx.shadowColor = p.color;
                this.fullscreenCtx.beginPath();
                this.fullscreenCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.fullscreenCtx.fill();
                this.fullscreenCtx.restore();
                return true;
            }
            return false;
        });
        
        // Central reactive sphere
        const avgValue = this.smoothing.volume;
        const pulseRadius = 60 + (avgValue * 140) * this.getBPMPulse();
        
        const gradient = this.fullscreenCtx.createRadialGradient(
            centerX, centerY, 0, centerX, centerY, pulseRadius
        );
        gradient.addColorStop(0, `hsla(${colors.primary[0]}, 100%, 70%, 0.9)`);
        gradient.addColorStop(0.5, `hsla(${colors.primary[0]}, 100%, 50%, 0.4)`);
        gradient.addColorStop(1, `hsla(${colors.primary[0]}, 100%, 30%, 0)`);
        
        this.fullscreenCtx.fillStyle = gradient;
        this.fullscreenCtx.beginPath();
        this.fullscreenCtx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
        this.fullscreenCtx.fill();
    }
    
    stopFullscreen() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.isFullscreen = false;
        this.particles = [];
    }
    
    setVizMode(mode) {
        if (['bars', 'circular', 'waveform', 'particles'].includes(mode)) {
            this.vizMode = mode;
            this.particles = [];
            console.log(`🎨 Visualizer mode: ${mode}`);
        }
    }
    
    // ============================================
    // CLEANUP
    // ============================================
    
    dispose() {
        this.stop();
        this.stopFullscreen();
        
        this.canvas = null;
        this.canvasCtx = null;
        this.fullscreenCanvas = null;
        this.fullscreenCtx = null;
        this.analyser = null;
        this.dataArray = null;
        this.particles = [];
        
        console.log('🎨 VisualizerManager disposed');
    }
}

// Singleton instance
const visualizerManager = new VisualizerManager();

// Handle window resize for fullscreen
window.addEventListener('resize', () => {
    if (visualizerManager.fullscreenCanvas) {
        visualizerManager.resizeFullscreenCanvas();
    }
});

console.log('✅ VisualizerManager loaded (Ultra-Reactive Edition):', typeof visualizerManager);