/* ============================================
   Enhanced Visualizer Manager v2.0
   High-performance, ultra-smooth audio visualizations
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
        this.vizMode = this.loadVizMode();
        
        // Performance optimization
        this.performance = {
            fps: 60,
            targetFPS: 60,
            frameTime: 16.67,
            lastFrame: 0,
            frameCount: 0,
            adaptiveQuality: true,
            qualityLevel: 1.0
        };
        
        // Enhanced analysis integration
        this.analysis = {
            current: null,
            previous: null,
            cache: new Map()
        };
        
        // Advanced beat detection with ML-inspired smoothing
        this.beatDetection = {
            history: new Float32Array(50),
            historyIndex: 0,
            threshold: 0,
            lastBeat: 0,
            confidence: 0,
            sensitivity: 1.25,
            cooldown: 180,
            energy: 0,
            variance: 0
        };
        
        // Smooth interpolation system
        this.smooth = {
            energy: 0,
            bass: 0,
            mid: 0,
            treble: 0,
            volume: 0,
            brightness: 0,
            hue: 0,
            saturation: 0
        };
        
        // Frequency analysis cache
        this.frequencies = {
            subBass: 0,     // 20-60 Hz
            bass: 0,        // 60-250 Hz
            lowMid: 0,      // 250-500 Hz
            mid: 0,         // 500-2000 Hz
            highMid: 0,     // 2000-4000 Hz
            presence: 0,    // 4000-6000 Hz
            brilliance: 0   // 6000-20000 Hz
        };
        
        // Particle system with object pooling
        this.particlePool = {
            active: [],
            inactive: [],
            maxSize: 600,
            spawnRate: 0
        };
        
        // Color system
        this.colors = {
            palette: null,
            albumArt: null,
            mood: null,
            lastUpdate: 0,
            cache: new Map(),
            interpolation: { r: 0, g: 0, b: 0 }
        };
        
        // Visual effects state
        this.effects = {
            bloom: { intensity: 0, radius: 0 },
            chromatic: { offset: 0 },
            distortion: { amount: 0 },
            pulseScale: 1.0,
            rotation: 0,
            waveOffset: 0
        };
        
        // Initialize particle pool
        this.initParticlePool();
        
        // Load preferences
        this.loadPreferences();
        
        console.log('🎨 Enhanced VisualizerManager v2.0 initialized');
    }
    
    // ============================================
    // INITIALIZATION & SETUP
    // ============================================
    
    initParticlePool() {
        for (let i = 0; i < this.particlePool.maxSize; i++) {
            this.particlePool.inactive.push(this.createParticle());
        }
    }

    /**
 * Initialize main embedded visualizer
 */
initMainVisualizer(canvas, analyser, dataArray, bufferLength) {
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext('2d');
    this.analyser = analyser;
    this.dataArray = dataArray;
    this.bufferLength = bufferLength;
    
    // Resize to fit container
    this.resizeCanvas();
    
    console.log('✅ Main visualizer initialized');
}
    
    createParticle() {
        return {
            x: 0, y: 0,
            vx: 0, vy: 0,
            size: 0,
            life: 0,
            maxLife: 1,
            decay: 0,
            color: { h: 0, s: 0, l: 0 },
            alpha: 1,
            rotation: 0,
            rotationSpeed: 0,
            type: 'circle'
        };
    }
    
    spawnParticle(config) {
        let particle;
        if (this.particlePool.inactive.length > 0) {
            particle = this.particlePool.inactive.pop();
        } else if (this.particlePool.active.length < this.particlePool.maxSize) {
            particle = this.createParticle();
        } else {
            return null;
        }
        
        Object.assign(particle, config);
        this.particlePool.active.push(particle);
        return particle;
    }
    
    recycleParticle(particle) {
        const index = this.particlePool.active.indexOf(particle);
        if (index > -1) {
            this.particlePool.active.splice(index, 1);
            this.particlePool.inactive.push(particle);
        }
    }
    
    // ============================================
    // ANALYSIS & COLOR MANAGEMENT
    // ============================================
    
    setTrackAnalysis(analysis) {
        if (!analysis) return;
        
        this.analysis.previous = this.analysis.current;
        this.analysis.current = {
            bpm: analysis.bpm || 120,
            energy: Math.max(0, Math.min(1, analysis.energy || 0.5)),
            mood: (analysis.mood || 'neutral').toLowerCase(),
            key: analysis.key || 'C',
            danceability: Math.max(0, Math.min(1, analysis.danceability || 0.5)),
            loudness: Math.max(0, Math.min(1, analysis.loudness || 0.5)),
            spectralCentroid: analysis.spectralCentroid || 1500,
            tempo: analysis.tempo || 'moderate',
            valence: analysis.valence || 0.5
        };
        
        this.beatDetection.cooldown = Math.max(120, (60000 / this.analysis.current.bpm) * 0.3);
        this.updateColorPalette();
        
        console.log('🎵 Analysis updated:', this.analysis.current.mood, 
                    `${this.analysis.current.bpm} BPM`);
    }
    
    clearTrackAnalysis() {
        this.analysis.previous = this.analysis.current;
        this.analysis.current = null;
        this.colors.mood = null;
        this.resetEffects();
    }
    
    updateColorPalette() {
        const now = performance.now();
        if (now - this.colors.lastUpdate < 100) return;
        
        this.colors.lastUpdate = now;
        this.colors.mood = this.getMoodPalette();
        this.colors.albumArt = this.getAlbumArtPalette();
        this.colors.palette = this.colors.albumArt || this.colors.mood;
    }
    
    getMoodPalette() {
        if (!this.analysis.current) {
            return { h: 340, s: 80, l: 50, range: 60 };
        }
        
        const palettes = {
            energetic: { h: 0, s: 100, l: 55, range: 80 },
            calm: { h: 200, s: 70, l: 50, range: 40 },
            bright: { h: 50, s: 95, l: 58, range: 60 },
            dark: { h: 270, s: 65, l: 42, range: 50 },
            happy: { h: 45, s: 100, l: 60, range: 70 },
            sad: { h: 220, s: 50, l: 45, range: 30 },
            neutral: { h: 340, s: 80, l: 50, range: 60 }
        };
        
        return palettes[this.analysis.current.mood] || palettes.neutral;
    }
    
    getAlbumArtPalette() {
        if (!window.currentDominantColor) return null;
        
        const { r, g, b } = window.currentDominantColor;
        const [h, s, l] = this.rgbToHsl(r, g, b);
        
        return { h, s, l, range: 70 };
    }
    
    rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
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
    
    // ============================================
    // AUDIO ANALYSIS
    // ============================================
    
    analyzeFrequencies(dataArray) {
        if (!dataArray || dataArray.length === 0) return;
        
        const len = dataArray.length;
        this.frequencies.subBass = this.getBandAverage(dataArray, 0, len * 0.03);
        this.frequencies.bass = this.getBandAverage(dataArray, len * 0.03, len * 0.12);
        this.frequencies.lowMid = this.getBandAverage(dataArray, len * 0.12, len * 0.25);
        this.frequencies.mid = this.getBandAverage(dataArray, len * 0.25, len * 0.45);
        this.frequencies.highMid = this.getBandAverage(dataArray, len * 0.45, len * 0.65);
        this.frequencies.presence = this.getBandAverage(dataArray, len * 0.65, len * 0.82);
        this.frequencies.brilliance = this.getBandAverage(dataArray, len * 0.82, len);
    }
    
    getBandAverage(dataArray, start, end) {
        start = Math.floor(start);
        end = Math.floor(end);
        let sum = 0;
        for (let i = start; i < end; i++) {
            sum += dataArray[i];
        }
        return (sum / (end - start)) / 255;
    }
    
    detectBeat(dataArray) {
        if (!dataArray || dataArray.length === 0) return false;
        
        const now = performance.now();
        const bassEnergy = this.frequencies.bass + this.frequencies.subBass;
        
        // Update circular buffer
        this.beatDetection.history[this.beatDetection.historyIndex] = bassEnergy;
        this.beatDetection.historyIndex = (this.beatDetection.historyIndex + 1) % this.beatDetection.history.length;
        
        // Calculate statistics
        let sum = 0, sumSq = 0;
        for (let i = 0; i < this.beatDetection.history.length; i++) {
            sum += this.beatDetection.history[i];
            sumSq += this.beatDetection.history[i] ** 2;
        }
        const mean = sum / this.beatDetection.history.length;
        const variance = (sumSq / this.beatDetection.history.length) - (mean ** 2);
        
        this.beatDetection.variance = variance;
        this.beatDetection.threshold = mean + (Math.sqrt(variance) * this.beatDetection.sensitivity);
        this.beatDetection.energy = bassEnergy;
        
        // Detect beat with cooldown
        const timeSinceBeat = now - this.beatDetection.lastBeat;
        if (bassEnergy > this.beatDetection.threshold && timeSinceBeat > this.beatDetection.cooldown) {
            this.beatDetection.lastBeat = now;
            this.beatDetection.confidence = Math.min(1, (bassEnergy - this.beatDetection.threshold) / this.beatDetection.threshold);
            return true;
        }
        
        return false;
    }
    
    updateSmoothing(dataArray, deltaTime) {
        if (!dataArray) return;
        
        this.analyzeFrequencies(dataArray);
        
        const avgVolume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255;
        const targetEnergy = this.analysis.current ? this.analysis.current.energy : avgVolume;
        
        // Adaptive smoothing based on tempo
        const smoothFactor = 0.08 + (this.analysis.current ? this.analysis.current.danceability * 0.12 : 0.08);
        const timeFactor = Math.min(1, deltaTime / 16.67);
        
        this.smooth.energy = this.lerp(this.smooth.energy, targetEnergy, smoothFactor * timeFactor);
        this.smooth.bass = this.lerp(this.smooth.bass, this.frequencies.bass + this.frequencies.subBass, smoothFactor * timeFactor);
        this.smooth.mid = this.lerp(this.smooth.mid, this.frequencies.mid, smoothFactor * timeFactor);
        this.smooth.treble = this.lerp(this.smooth.treble, (this.frequencies.presence + this.frequencies.brilliance) / 2, smoothFactor * timeFactor);
        this.smooth.volume = this.lerp(this.smooth.volume, avgVolume, smoothFactor * timeFactor);
        
        // Update visual effects
        this.updateEffects(deltaTime);
    }
    
    lerp(a, b, t) {
        return a + (b - a) * t;
    }
    
    // ============================================
    // VISUAL EFFECTS
    // ============================================
    
    updateEffects(deltaTime) {
        const bpm = this.analysis.current ? this.analysis.current.bpm : 120;
        const beatProgress = ((performance.now() - this.beatDetection.lastBeat) % (60000 / bpm)) / (60000 / bpm);
        
        // Pulse effect
        const pulseCurve = Math.sin(beatProgress * Math.PI);
        this.effects.pulseScale = 1.0 + (pulseCurve * 0.15 * this.smooth.energy);
        
        // Rotation
        const rotationSpeed = 0.0003 * (this.smooth.energy + 0.5);
        this.effects.rotation += rotationSpeed * deltaTime;
        
        // Wave offset
        this.effects.waveOffset += 0.002 * deltaTime * (1 + this.smooth.energy);
        
        // Bloom effect
        this.effects.bloom.intensity = this.smooth.volume * 0.6;
        this.effects.bloom.radius = 15 + (this.smooth.energy * 25);
        
        // Color interpolation
        if (this.colors.palette) {
            const targetH = this.colors.palette.h;
            const targetS = this.colors.palette.s;
            this.smooth.hue = this.lerpAngle(this.smooth.hue, targetH, 0.05);
            this.smooth.saturation = this.lerp(this.smooth.saturation, targetS, 0.05);
        }
    }
    
    lerpAngle(a, b, t) {
        const diff = ((b - a + 540) % 360) - 180;
        return (a + diff * t + 360) % 360;
    }
    
    resetEffects() {
        this.effects.pulseScale = 1.0;
        this.effects.rotation = 0;
        this.effects.waveOffset = 0;
        this.effects.bloom.intensity = 0;
    }
    
    // ============================================
    // MAIN VISUALIZER (EMBEDDED)
    // ============================================
    
// Method 2: Initialize fullscreen with audio data
initFullscreenVisualizer(canvas, analyser, dataArray, bufferLength) {
    this.fullscreenCanvas = canvas;
    this.fullscreenCtx = canvas.getContext('2d');
    
    // Store audio data
    if (analyser) {
        this.analyser = analyser;
    }
    
    // ✅ CRITICAL FIX: Always create a NEW Uint8Array for fullscreen
    if (analyser) {
        this.bufferLength = analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);
        console.log('✅ Fullscreen visualizer initialized with NEW dataArray');
    } else if (dataArray && bufferLength) {
        // Fallback: use provided data
        this.dataArray = dataArray;
        this.bufferLength = bufferLength;
        console.log('✅ Fullscreen visualizer initialized with provided dataArray');
    }
    
    console.log('✅ Fullscreen visualizer initialized with audio data');
}

    startFullscreen() {
    if (!this.fullscreenCanvas || this.animationId) return;
    
    this.isFullscreen = true;
    this.performance.lastFrame = performance.now();
    
    // Ensure we have audio data
    if (!this.analyser || !this.dataArray) {
        console.error('❌ Cannot start fullscreen: missing audio data');
        return;
    }
    
    console.log('✅ Starting fullscreen visualizer');
    this.drawFullscreen();
}
    
    resizeCanvas() {
        if (!this.canvas) return;
        this.canvas.width = this.canvas.offsetWidth || 800;
        this.canvas.height = this.canvas.offsetHeight || 200;
    }
    
    start(shouldRun) {
        if (!this.canvas || !shouldRun || this.animationId) return;
        this.performance.lastFrame = performance.now();
        this.draw();
    }
    
    draw = () => {
        if (!this.enabled) {
            this.animationId = null;
            this.clearCanvas();
            return;
        }
        
        this.animationId = requestAnimationFrame(this.draw);
        
        const now = performance.now();
        const deltaTime = now - this.performance.lastFrame;
        this.performance.lastFrame = now;
        this.performance.frameCount++;
        
        if (!this.analyser || !this.dataArray) return;
        
        try {
            this.analyser.getByteFrequencyData(this.dataArray);
            this.updateSmoothing(this.dataArray, deltaTime);
            this.detectBeat(this.dataArray);
            
            this.clearCanvas();
            this.drawMainBars();
        } catch (error) {
            console.error('❌ Visualizer error:', error);
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
    
    drawMainBars() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const barWidth = (width / this.bufferLength) * 2.5;
        let x = 0;
        
        const palette = this.colors.palette || { h: 340, s: 80, l: 50, range: 60 };
        
        for (let i = 0; i < this.bufferLength; i++) {
            let barHeight = (this.dataArray[i] / 255) * height * 0.8;
            
            // Apply effects
            barHeight *= this.effects.pulseScale;
            barHeight *= (0.7 + this.smooth.energy * 0.6);
            
            // Frequency-based boost
            const freqRatio = i / this.bufferLength;
            if (freqRatio < 0.15) barHeight *= (1 + this.smooth.bass * 0.5);
            else if (freqRatio > 0.7) barHeight *= (1 + this.smooth.treble * 0.4);
            
            // Color
            const hue = palette.h + (i / this.bufferLength) * palette.range;
            const saturation = palette.s + (this.dataArray[i] / 255) * 15;
            const lightness = palette.l + (this.dataArray[i] / 255) * 18;
            
            const gradient = this.canvasCtx.createLinearGradient(0, height - barHeight, 0, height);
            gradient.addColorStop(0, `hsl(${hue}, ${saturation}%, ${lightness}%)`);
            gradient.addColorStop(1, `hsl(${hue}, ${saturation}%, ${lightness - 30}%)`);
            
            this.canvasCtx.fillStyle = gradient;
            
            // Draw rounded bar
            const barX = x;
            const barY = height - barHeight;
            const radius = Math.min(barWidth / 2, 5);
            
            this.canvasCtx.beginPath();
            this.canvasCtx.moveTo(barX, height);
            this.canvasCtx.lineTo(barX, barY + radius);
            this.canvasCtx.quadraticCurveTo(barX, barY, barX + radius, barY);
            this.canvasCtx.lineTo(barX + barWidth - radius, barY);
            this.canvasCtx.quadraticCurveTo(barX + barWidth, barY, barX + barWidth, barY + radius);
            this.canvasCtx.lineTo(barX + barWidth, height);
            this.canvasCtx.closePath();
            this.canvasCtx.fill();
            
            // Glow on peaks
            if (this.dataArray[i] > 200) {
                this.canvasCtx.shadowBlur = 12;
                this.canvasCtx.shadowColor = `hsl(${hue}, 100%, 65%)`;
                this.canvasCtx.fillRect(barX, barY, barWidth, barHeight);
                this.canvasCtx.shadowBlur = 0;
            }
            
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
    
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) this.stop();
    }
    
    // ============================================
    // FULLSCREEN VISUALIZER
    // ============================================
    
    
    resizeFullscreenCanvas() {
        if (!this.fullscreenCanvas) return;
        this.fullscreenCanvas.width = window.innerWidth;
        this.fullscreenCanvas.height = window.innerHeight;
    }
    
drawFullscreen = () => {
    // ✅ ADD THIS VALIDATION AT THE START
    if (!this.analyser || !this.dataArray) {
        console.error('❌ Missing audio data, stopping fullscreen visualizer');
        this.stopFullscreen();
        return;
    }
    
    if (!this.fullscreenCanvas || !this.analyser) {
        this.animationId = null;
        return;
    }
    
    this.animationId = requestAnimationFrame(this.drawFullscreen);
    
    const now = performance.now();
    const deltaTime = now - this.performance.lastFrame;
    this.performance.lastFrame = now;
    
    try {
        this.analyser.getByteFrequencyData(this.dataArray);  // Should work now!
        this.updateSmoothing(this.dataArray, deltaTime);
        const isBeat = this.detectBeat(this.dataArray);
        
        // Clear with trailing effect
        this.fullscreenCtx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        this.fullscreenCtx.fillRect(0, 0, this.fullscreenCanvas.width, this.fullscreenCanvas.height);
        
        // Draw based on mode
        switch(this.vizMode) {
            case 'bars':
                this.drawFullscreenBars(isBeat);
                break;
            case 'circular':
                this.drawFullscreenCircular(isBeat);
                break;
            case 'waveform':
                this.drawFullscreenWaveform(isBeat);
                break;
            case 'particles':
                this.drawFullscreenParticles(isBeat);
                break;
        }
    } catch (error) {
        console.error('❌ Fullscreen draw error:', error);
        // ✅ ADD: Stop on repeated errors
        this.stopFullscreen();
    }
}
    
    drawFullscreenBars(isBeat) {
        const width = this.fullscreenCanvas.width;
        const height = this.fullscreenCanvas.height;
        const barCount = 200;
        const barWidth = width / barCount;
        const palette = this.colors.palette || { h: 340, s: 80, l: 50, range: 60 };
        
        for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor((i / barCount) * this.bufferLength);
            const value = this.dataArray[dataIndex] / 255;
            
            let barHeight = value * height * 0.88;
            barHeight *= this.effects.pulseScale;
            barHeight *= (0.6 + this.smooth.energy * 0.8);
            
            const freqRatio = i / barCount;
            if (freqRatio < 0.2) barHeight *= (1 + this.smooth.bass * 0.6);
            else if (freqRatio > 0.75) barHeight *= (1 + this.smooth.treble * 0.4);
            
            const x = i * barWidth;
            const y = height - barHeight;
            
            const hue = palette.h + (i / barCount) * palette.range + (this.effects.waveOffset * 30);
            const saturation = palette.s + value * 20;
            const lightness = palette.l + value * 22;
            
            const gradient = this.fullscreenCtx.createLinearGradient(x, y, x, height);
            gradient.addColorStop(0, `hsl(${hue}, ${saturation}%, ${lightness}%)`);
            gradient.addColorStop(0.5, `hsl(${hue}, ${saturation - 10}%, ${lightness - 15}%)`);
            gradient.addColorStop(1, `hsl(${hue}, ${saturation - 20}%, ${lightness - 35}%)`);
            
            this.fullscreenCtx.fillStyle = gradient;
            this.fullscreenCtx.fillRect(x, y, barWidth - 2, barHeight);
            
            if (value > 0.75 || (isBeat && i % 5 === 0)) {
                this.fullscreenCtx.shadowBlur = 25 * value;
                this.fullscreenCtx.shadowColor = `hsl(${hue}, 100%, 65%)`;
                this.fullscreenCtx.fillRect(x, y, barWidth - 2, barHeight);
                this.fullscreenCtx.shadowBlur = 0;
            }
        }
    }
    
    drawFullscreenCircular(isBeat) {
        const width = this.fullscreenCanvas.width;
        const height = this.fullscreenCanvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.min(width, height) * 0.45;
        const minRadius = maxRadius * 0.22;
        const barCount = 240;
        const palette = this.colors.palette || { h: 340, s: 80, l: 50, range: 60 };
        
        for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor((i / barCount) * this.bufferLength);
            const value = this.dataArray[dataIndex] / 255;
            
            let barLength = value * maxRadius * 0.78;
            barLength *= this.effects.pulseScale;
            barLength *= (0.7 + this.smooth.energy * 0.6);
            
            const angle = (i / barCount) * Math.PI * 2 + this.effects.rotation;
            
            const x1 = centerX + Math.cos(angle) * minRadius;
            const y1 = centerY + Math.sin(angle) * minRadius;
            const x2 = centerX + Math.cos(angle) * (minRadius + barLength);
            const y2 = centerY + Math.sin(angle) * (minRadius + barLength);
            
            const hue = palette.h + (i / barCount) * palette.range * 1.5;
            const saturation = palette.s + value * 25;
            const lightness = palette.l + value * 20;
            
            this.fullscreenCtx.strokeStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            this.fullscreenCtx.lineWidth = 3 + value * 3;
            
            if (value > 0.65) {
                this.fullscreenCtx.shadowBlur = 20 * value;
                this.fullscreenCtx.shadowColor = `hsl(${hue}, 100%, 65%)`;
            }
            
            this.fullscreenCtx.beginPath();
            this.fullscreenCtx.moveTo(x1, y1);
            this.fullscreenCtx.lineTo(x2, y2);
            this.fullscreenCtx.stroke();
            this.fullscreenCtx.shadowBlur = 0;
        }
        
        // Central orb
        const orbRadius = 25 + (this.smooth.volume * 85) * this.effects.pulseScale;
        const orbGradient = this.fullscreenCtx.createRadialGradient(
            centerX, centerY, 0, centerX, centerY, orbRadius
        );
        orbGradient.addColorStop(0, `hsla(${palette.h}, 100%, 75%, 0.95)`);
        orbGradient.addColorStop(0.6, `hsla(${palette.h}, 100%, 55%, 0.5)`);
        orbGradient.addColorStop(1, `hsla(${palette.h}, 100%, 35%, 0)`);
        
        this.fullscreenCtx.fillStyle = orbGradient;
        this.fullscreenCtx.beginPath();
        this.fullscreenCtx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
        this.fullscreenCtx.fill();
    }
    
    drawFullscreenWaveform(isBeat) {
        const width = this.fullscreenCanvas.width;
        const height = this.fullscreenCanvas.height;
        const centerY = height / 2;
        const sliceWidth = width / this.bufferLength;
        const amplitude = height * 0.42;
        const palette = this.colors.palette || { h: 340, s: 80, l: 50, range: 60 };
        
        this.fullscreenCtx.lineWidth = 4 + this.smooth.energy * 3;
        
        // Top wave
        this.fullscreenCtx.strokeStyle = `hsl(${palette.h}, ${palette.s}%, ${palette.l}%)`;
        this.fullscreenCtx.shadowBlur = 25;
        this.fullscreenCtx.shadowColor = `hsl(${palette.h}, 100%, 60%)`;
        
        this.fullscreenCtx.beginPath();
        let x = 0;
        for (let i = 0; i < this.bufferLength; i++) {
            const v = this.dataArray[i] / 128.0;
            const offset = Math.sin((i / this.bufferLength) * Math.PI * 4 + this.effects.waveOffset) * 15;
            const y = centerY - ((v - 1) * amplitude * this.effects.pulseScale) + offset;
            
            if (i === 0) this.fullscreenCtx.moveTo(x, y);
            else this.fullscreenCtx.lineTo(x, y);
            
            x += sliceWidth;
        }
        this.fullscreenCtx.stroke();
        
        // Bottom wave (mirror)
        this.fullscreenCtx.strokeStyle = `hsl(${palette.h + 30}, ${palette.s}%, ${palette.l - 10}%)`;
        this.fullscreenCtx.shadowColor = `hsl(${palette.h + 30}, 100%, 55%)`;
        
        this.fullscreenCtx.beginPath();
        x = 0;
        for (let i = 0; i < this.bufferLength; i++) {
            const v = this.dataArray[i] / 128.0;
            const offset = Math.sin((i / this.bufferLength) * Math.PI * 4 - this.effects.waveOffset) * 15;
            const y = centerY + ((v - 1) * amplitude * this.effects.pulseScale) + offset;
            
            if (i === 0) this.fullscreenCtx.moveTo(x, y);
            else this.fullscreenCtx.lineTo(x, y);
            
            x += sliceWidth;
        }
        this.fullscreenCtx.stroke();
        this.fullscreenCtx.shadowBlur = 0;
    }
    
    drawFullscreenParticles(isBeat) {
        const width = this.fullscreenCanvas.width;
        const height = this.fullscreenCanvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const palette = this.colors.palette || { h: 340, s: 80, l: 50, range: 60 };
        
        // Spawn particles
        const spawnCount = isBeat ? Math.floor(15 * this.smooth.energy) : Math.floor(4 * this.smooth.volume);
        
        for (let i = 0; i < spawnCount; i++) {
            const value = this.dataArray[Math.floor(Math.random() * this.bufferLength)] / 255;
            
            if (value > 0.25) {
                const angle = Math.random() * Math.PI * 2;
                const speed = (4 + value * 10) * this.effects.pulseScale;
                const size = 4 + value * 10;
                
                this.spawnParticle({
                    x: centerX,
                    y: centerY,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: size,
                    life: 1,
                    maxLife: 1,
                    decay: 0.01 + Math.random() * 0.015,
                    color: {
                        h: palette.h + Math.random() * palette.range,
                        s: 100,
                        l: 60 + Math.random() * 15
                    },
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 0.1,
                    type: Math.random() > 0.7 ? 'star' : 'circle'
                });
            }
        }
        
        // Update and draw particles
        for (let i = this.particlePool.active.length - 1; i >= 0; i--) {
            const p = this.particlePool.active[i];
            
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2; // Gravity
            p.vx *= 0.99; // Air resistance
            p.life -= p.decay;
            p.size *= 0.98;
            p.rotation += p.rotationSpeed;
            
            if (p.life <= 0 || p.size < 1) {
                this.recycleParticle(p);
                continue;
            }
            
            this.fullscreenCtx.save();
            this.fullscreenCtx.globalAlpha = p.life;
            this.fullscreenCtx.fillStyle = `hsl(${p.color.h}, ${p.color.s}%, ${p.color.l}%)`;
            this.fullscreenCtx.shadowBlur = 18 * p.life;
            this.fullscreenCtx.shadowColor = `hsl(${p.color.h}, 100%, 65%)`;
            
            this.fullscreenCtx.translate(p.x, p.y);
            this.fullscreenCtx.rotate(p.rotation);
            
            if (p.type === 'star') {
                this.drawStar(0, 0, 5, p.size, p.size * 0.5);
            } else {
                this.fullscreenCtx.beginPath();
                this.fullscreenCtx.arc(0, 0, p.size, 0, Math.PI * 2);
                this.fullscreenCtx.fill();
            }
            
            this.fullscreenCtx.restore();
        }
        
        // Central reactive element
        const pulseRadius = 70 + (this.smooth.volume * 150) * this.effects.pulseScale;
        const gradient = this.fullscreenCtx.createRadialGradient(
            centerX, centerY, 0, centerX, centerY, pulseRadius
        );
        gradient.addColorStop(0, `hsla(${palette.h}, 100%, 75%, 0.9)`);
        gradient.addColorStop(0.5, `hsla(${palette.h}, 100%, 55%, 0.4)`);
        gradient.addColorStop(1, `hsla(${palette.h}, 100%, 35%, 0)`);
        
        this.fullscreenCtx.fillStyle = gradient;
        this.fullscreenCtx.beginPath();
        this.fullscreenCtx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
        this.fullscreenCtx.fill();
    }
    
    drawStar(cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;
        
        this.fullscreenCtx.beginPath();
        this.fullscreenCtx.moveTo(cx, cy - outerRadius);
        
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            this.fullscreenCtx.lineTo(x, y);
            rot += step;
            
            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            this.fullscreenCtx.lineTo(x, y);
            rot += step;
        }
        
        this.fullscreenCtx.lineTo(cx, cy - outerRadius);
        this.fullscreenCtx.closePath();
        this.fullscreenCtx.fill();
    }
    
    stopFullscreen() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.isFullscreen = false;
        this.particlePool.active.forEach(p => this.recycleParticle(p));
    }
    
    setVizMode(mode) {
        if (['bars', 'circular', 'waveform', 'particles'].includes(mode)) {
            this.vizMode = mode;
            this.saveVizMode();
            this.particlePool.active.forEach(p => this.recycleParticle(p));
            console.log(`🎨 Mode: ${mode}`);
        }
    }
    
    // ============================================
    // PREFERENCES & STORAGE
    // ============================================
    
    loadPreferences() {
        try {
            const saved = localStorage.getItem('visualizerPreferences');
            if (saved) {
                const prefs = JSON.parse(saved);
                this.beatDetection.sensitivity = prefs.sensitivity || 1.25;
                this.performance.targetFPS = prefs.targetFPS || 60;
            }
        } catch (e) {
            console.warn('Failed to load visualizer preferences');
        }
    }
    
    savePreferences() {
        try {
            const prefs = {
                sensitivity: this.beatDetection.sensitivity,
                targetFPS: this.performance.targetFPS,
                vizMode: this.vizMode
            };
            localStorage.setItem('visualizerPreferences', JSON.stringify(prefs));
        } catch (e) {
            console.warn('Failed to save visualizer preferences');
        }
    }
    
    loadVizMode() {
        try {
            return localStorage.getItem('visualizerMode') || 'bars';
        } catch (e) {
            return 'bars';
        }
    }
    
    saveVizMode() {
        try {
            localStorage.setItem('visualizerMode', this.vizMode);
        } catch (e) {
            console.warn('Failed to save visualizer mode');
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
        this.particlePool.active = [];
        this.particlePool.inactive = [];
        
        console.log('🎨 VisualizerManager disposed');
    }
}

// Create singleton instance
const visualizerManager = new VisualizerManager();

// Handle window resize
window.addEventListener('resize', () => {
    if (visualizerManager.fullscreenCanvas) {
        visualizerManager.resizeFullscreenCanvas();
    }
    if (visualizerManager.canvas) {
        visualizerManager.resizeCanvas();
    }
});

console.log('✅ Enhanced VisualizerManager v2.0 loaded');