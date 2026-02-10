/* ============================================
   Enhanced Visualizer Manager v3.0
   Immersive audio visualizations with deep analysis integration
   ============================================ */

class VisualizerManager {
    constructor() {
        // Canvas references
        this.canvas = null;
        this.canvasCtx = null;
        this.fullscreenCanvas = null;
        this.fullscreenCtx = null;
        
        // OffscreenCanvas for performance
        this.offscreenCanvas = null;
        this.offscreenCtx = null;
        this.useOffscreen = this.detectOffscreenSupport();
        
        // Audio analysis
        this.analyser = null;
        this.dataArray = null;
        this.bufferLength = null;
        
        // Animation control
        this.mainAnimationId = null;
        this.fullscreenAnimationId = null;
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
            qualityLevel: 1.0,
            skipFrames: 0
        };
        
        // Enhanced analysis integration with deep music data
        this.analysis = {
            current: null,
            previous: null,
            cache: new Map(),
            deepData: null // Store full deep analysis data
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
            variance: 0,
            bassHistory: new Float32Array(20),
            bassHistoryIndex: 0
        };
        
        // Smooth interpolation system with enhanced frequency bands
        this.smooth = {
            energy: 0,
            bass: 0,
            mid: 0,
            treble: 0,
            volume: 0,
            brightness: 0,
            hue: 0,
            saturation: 0,
            subBass: 0,
            lowMid: 0,
            highMid: 0,
            presence: 0,
            brilliance: 0
        };
        
        // Enhanced frequency analysis cache with finer granularity
        this.frequencies = {
            subBass: 0,     // 20-60 Hz - Deep rumble
            bass: 0,        // 60-250 Hz - Kick, bass guitar
            lowMid: 0,      // 250-500 Hz - Body, warmth
            mid: 0,         // 500-2000 Hz - Vocals, instruments
            highMid: 0,     // 2000-4000 Hz - Clarity, definition
            presence: 0,    // 4000-6000 Hz - Presence, air
            brilliance: 0   // 6000-20000 Hz - Sparkle, shimmer
        };
        
        // Enhanced particle system with multiple types
        this.particlePool = {
            active: [],
            inactive: [],
            maxSize: 800,
            spawnRate: 0,
            types: ['circle', 'star', 'triangle', 'glow']
        };
        
        // Nebula particle system for ambient effects
        this.nebulaParticles = {
            active: [],
            inactive: [],
            maxSize: 150,
            spawnRate: 0
        };
        
        // Color system with album art integration
        this.colors = {
            palette: null,
            albumArt: null,
            mood: null,
            lastUpdate: 0,
            cache: new Map(),
            interpolation: { r: 0, g: 0, b: 0 },
            dominantColors: [],
            complementary: null
        };
        
        // Visual effects state with enhanced parameters
        this.effects = {
            bloom: { intensity: 0, radius: 0 },
            chromatic: { offset: 0 },
            distortion: { amount: 0 },
            pulseScale: 1.0,
            rotation: 0,
            waveOffset: 0,
            bassImpact: 0,
            trebleShimmer: 0,
            energyBoost: 0,
            perspective: 0 // For 3D effects
        };
        
        // 3D transformation matrices for advanced modes
        this.transform3D = {
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
            perspective: 1000,
            depth: 0
        };
        
        // Initialize particle pools
        this.initParticlePool();
        this.initNebulaPool();
        
        // Load preferences
        this.loadPreferences();
        
        console.log('🎨 Enhanced VisualizerManager v3.0 initialized');
        console.log('🖼️  OffscreenCanvas support:', this.useOffscreen);
    }
    
    // ============================================
    // INITIALIZATION & SETUP
    // ============================================
    
    detectOffscreenSupport() {
        try {
            return typeof OffscreenCanvas !== 'undefined';
        } catch (e) {
            return false;
        }
    }
    
    initParticlePool() {
        for (let i = 0; i < this.particlePool.maxSize; i++) {
            this.particlePool.inactive.push(this.createParticle());
        }
    }
    
    initNebulaPool() {
        for (let i = 0; i < this.nebulaParticles.maxSize; i++) {
            this.nebulaParticles.inactive.push(this.createNebulaParticle());
        }
    }

    /**
     * Initialize main embedded visualizer
     */
    initMainVisualizer(canvas, analyser, dataArray, bufferLength) {
        this.canvas = canvas;
        this.canvasCtx = canvas.getContext('2d', { alpha: false, desynchronized: true });
        this.analyser = analyser;
        this.dataArray = dataArray;
        this.bufferLength = bufferLength;
        
        // Setup offscreen canvas if supported
        if (this.useOffscreen) {
            try {
                this.offscreenCanvas = new OffscreenCanvas(canvas.width, canvas.height);
                this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: false });
                console.log('✅ OffscreenCanvas initialized for main visualizer');
            } catch (e) {
                console.warn('⚠️ OffscreenCanvas creation failed:', e);
                this.useOffscreen = false;
            }
        }
        
        // Resize to fit container
        this.resizeCanvas();
        
        console.log('✅ Main visualizer initialized');
    }
    
    createParticle() {
        return {
            x: 0, y: 0, z: 0,
            vx: 0, vy: 0, vz: 0,
            size: 0,
            life: 0,
            maxLife: 1,
            decay: 0,
            color: { h: 0, s: 0, l: 0 },
            alpha: 1,
            rotation: 0,
            rotationSpeed: 0,
            type: 'circle',
            frequency: 0 // Which frequency band spawned this
        };
    }
    
    createNebulaParticle() {
        return {
            x: 0, y: 0,
            vx: 0, vy: 0,
            size: 0,
            life: 1,
            maxLife: 1,
            color: { h: 0, s: 0, l: 0 },
            alpha: 0.3,
            drift: { x: 0, y: 0 }
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
    
    spawnNebulaParticle(config) {
        let particle;
        if (this.nebulaParticles.inactive.length > 0) {
            particle = this.nebulaParticles.inactive.pop();
        } else if (this.nebulaParticles.active.length < this.nebulaParticles.maxSize) {
            particle = this.createNebulaParticle();
        } else {
            return null;
        }
        
        Object.assign(particle, config);
        this.nebulaParticles.active.push(particle);
        return particle;
    }
    
    recycleParticle(particle) {
        const index = this.particlePool.active.indexOf(particle);
        if (index > -1) {
            this.particlePool.active.splice(index, 1);
            this.particlePool.inactive.push(particle);
        }
    }
    
    recycleNebulaParticle(particle) {
        const index = this.nebulaParticles.active.indexOf(particle);
        if (index > -1) {
            this.nebulaParticles.active.splice(index, 1);
            this.nebulaParticles.inactive.push(particle);
        }
    }
    
    // ============================================
    // ANALYSIS & COLOR MANAGEMENT
    // ============================================
    
    setTrackAnalysis(analysis) {
        if (!analysis) return;
        
        this.analysis.previous = this.analysis.current;
        this.analysis.deepData = analysis; // Store full deep analysis
        
        this.analysis.current = {
            bpm: analysis.bpm || 120,
            energy: Math.max(0, Math.min(1, analysis.energy || 0.5)),
            mood: (analysis.mood || 'neutral').toLowerCase(),
            key: analysis.key || 'C',
            danceability: Math.max(0, Math.min(1, analysis.danceability || 0.5)),
            loudness: Math.max(0, Math.min(1, analysis.loudness || 0.5)),
            spectralCentroid: analysis.spectralCentroid || 1500,
            tempo: analysis.tempo || 'moderate',
            valence: analysis.valence || 0.5,
            // Deep analysis data
            frequencyBands: analysis.frequencyBands || {},
            dynamicRange: analysis.dynamicRange || {},
            rhythmicComplexity: analysis.rhythmicComplexity || 'moderate',
            onsetRate: analysis.onsetRate || 0,
            spectralFlux: analysis.spectralFlux || 0
        };
        
        // Adjust beat detection based on BPM and rhythmic complexity
        this.beatDetection.cooldown = Math.max(120, (60000 / this.analysis.current.bpm) * 0.3);
        
        // Adjust sensitivity based on energy and danceability
        this.beatDetection.sensitivity = 1.0 + (this.analysis.current.energy * 0.5) + 
                                         (this.analysis.current.danceability * 0.3);
        
        this.updateColorPalette();
        
        console.log('🎵 Analysis updated:', this.analysis.current.mood, 
                    `${this.analysis.current.bpm} BPM`,
                    `Energy: ${(this.analysis.current.energy * 100).toFixed(0)}%`);
    }
    
    clearTrackAnalysis() {
        this.analysis.previous = this.analysis.current;
        this.analysis.current = null;
        this.analysis.deepData = null;
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
        
        // Calculate complementary color for enhanced visuals
        if (this.colors.palette) {
            this.colors.complementary = {
                h: (this.colors.palette.h + 180) % 360,
                s: this.colors.palette.s,
                l: this.colors.palette.l
            };
        }
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
        
        // Boost saturation for more vibrant visuals
        const boostedS = Math.min(100, s * 1.2);
        
        return { h, s: boostedS, l, range: 70 };
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
    // ENHANCED AUDIO ANALYSIS
    // ============================================
    
    analyzeFrequencies(dataArray) {
        if (!dataArray || dataArray.length === 0) return;
        
        const len = dataArray.length;
        
        // More precise frequency band analysis
        this.frequencies.subBass = this.getBandAverage(dataArray, 0, len * 0.03);
        this.frequencies.bass = this.getBandAverage(dataArray, len * 0.03, len * 0.12);
        this.frequencies.lowMid = this.getBandAverage(dataArray, len * 0.12, len * 0.25);
        this.frequencies.mid = this.getBandAverage(dataArray, len * 0.25, len * 0.45);
        this.frequencies.highMid = this.getBandAverage(dataArray, len * 0.45, len * 0.65);
        this.frequencies.presence = this.getBandAverage(dataArray, len * 0.65, len * 0.82);
        this.frequencies.brilliance = this.getBandAverage(dataArray, len * 0.82, len);
        
        // Apply deep analysis frequency band data if available
        if (this.analysis.deepData && this.analysis.deepData.frequencyBands) {
            const bands = this.analysis.deepData.frequencyBands;
            // Blend real-time with deep analysis for smoother response
            if (bands.subBass) this.frequencies.subBass *= (1 + bands.subBass * 0.5);
            if (bands.bass) this.frequencies.bass *= (1 + bands.bass * 0.5);
            if (bands.lowMid) this.frequencies.lowMid *= (1 + bands.lowMid * 0.5);
            if (bands.midrange) this.frequencies.mid *= (1 + bands.midrange * 0.5);
            if (bands.presence) this.frequencies.presence *= (1 + bands.presence * 0.5);
            if (bands.brilliance) this.frequencies.brilliance *= (1 + bands.brilliance * 0.5);
        }
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
        const bassEnergy = this.frequencies.bass + this.frequencies.subBass * 1.5;
        
        // Update circular buffer for bass
        this.beatDetection.bassHistory[this.beatDetection.bassHistoryIndex] = bassEnergy;
        this.beatDetection.bassHistoryIndex = (this.beatDetection.bassHistoryIndex + 1) % 
                                               this.beatDetection.bassHistory.length;
        
        // Update main energy history
        this.beatDetection.history[this.beatDetection.historyIndex] = bassEnergy;
        this.beatDetection.historyIndex = (this.beatDetection.historyIndex + 1) % 
                                          this.beatDetection.history.length;
        
        // Calculate statistics with variance
        let sum = 0, sumSq = 0;
        for (let i = 0; i < this.beatDetection.history.length; i++) {
            sum += this.beatDetection.history[i];
            sumSq += this.beatDetection.history[i] * this.beatDetection.history[i];
        }
        const mean = sum / this.beatDetection.history.length;
        const variance = (sumSq / this.beatDetection.history.length) - (mean * mean);
        const stdDev = Math.sqrt(Math.max(0, variance));
        
        // Adaptive threshold with variance consideration
        this.beatDetection.threshold = mean + (stdDev * this.beatDetection.sensitivity);
        this.beatDetection.variance = variance;
        
        // Check for beat with cooldown
        const timeSinceLastBeat = now - this.beatDetection.lastBeat;
        const isBeat = bassEnergy > this.beatDetection.threshold && 
                       timeSinceLastBeat > this.beatDetection.cooldown;
        
        if (isBeat) {
            this.beatDetection.lastBeat = now;
            this.beatDetection.confidence = Math.min(1, (bassEnergy - this.beatDetection.threshold) / 
                                                        this.beatDetection.threshold);
            this.effects.bassImpact = 1.0;
        }
        
        return isBeat;
    }
    
    updateSmoothing(dataArray, deltaTime) {
        if (!dataArray || dataArray.length === 0) return;
        
        this.analyzeFrequencies(dataArray);
        
        // Smooth interpolation factor based on deltaTime
        const smoothFactor = Math.min(1, deltaTime / 16.67); // Normalize to 60fps
        const lerpSpeed = 0.15 * smoothFactor;
        const fastLerpSpeed = 0.25 * smoothFactor;
        
        // Calculate overall energy
        const totalEnergy = this.frequencies.bass + this.frequencies.mid + this.frequencies.treble;
        const targetEnergy = Math.min(1, totalEnergy / 1.5);
        
        // Smooth all frequency bands
        this.smooth.energy = this.lerp(this.smooth.energy, targetEnergy, lerpSpeed);
        this.smooth.bass = this.lerp(this.smooth.bass, this.frequencies.bass, fastLerpSpeed);
        this.smooth.mid = this.lerp(this.smooth.mid, this.frequencies.mid, lerpSpeed);
        this.smooth.treble = this.lerp(this.smooth.treble, this.frequencies.brilliance, lerpSpeed);
        this.smooth.subBass = this.lerp(this.smooth.subBass, this.frequencies.subBass, fastLerpSpeed);
        this.smooth.lowMid = this.lerp(this.smooth.lowMid, this.frequencies.lowMid, lerpSpeed);
        this.smooth.highMid = this.lerp(this.smooth.highMid, this.frequencies.highMid, lerpSpeed);
        this.smooth.presence = this.lerp(this.smooth.presence, this.frequencies.presence, lerpSpeed);
        this.smooth.brilliance = this.lerp(this.smooth.brilliance, this.frequencies.brilliance, lerpSpeed);
        
        // Calculate volume from RMS
        const rms = Math.sqrt(dataArray.reduce((sum, val) => sum + val * val, 0) / dataArray.length) / 255;
        this.smooth.volume = this.lerp(this.smooth.volume, rms, lerpSpeed);
        
        // Update effects
        this.effects.pulseScale = 1.0 + (this.smooth.bass * 0.15) + (this.smooth.energy * 0.1);
        this.effects.rotation += (this.smooth.energy * 0.005) + 0.001;
        this.effects.waveOffset += (this.smooth.mid * 0.02) + 0.01;
        this.effects.bassImpact = Math.max(0, this.effects.bassImpact - 0.05);
        this.effects.trebleShimmer = this.smooth.brilliance * this.smooth.presence;
        this.effects.energyBoost = this.smooth.energy;
        
        // 3D rotation for advanced modes
        this.transform3D.rotationY += this.smooth.energy * 0.002;
        this.transform3D.rotationX = Math.sin(Date.now() * 0.0005) * 0.1 * this.smooth.mid;
        this.transform3D.depth = this.smooth.bass * 100;
    }
    
    lerp(start, end, factor) {
        return start + (end - start) * factor;
    }
    
    resetEffects() {
        this.effects.pulseScale = 1.0;
        this.effects.rotation = 0;
        this.effects.waveOffset = 0;
        this.effects.bassImpact = 0;
        this.effects.trebleShimmer = 0;
        this.effects.energyBoost = 0;
        this.transform3D.rotationX = 0;
        this.transform3D.rotationY = 0;
        this.transform3D.depth = 0;
    }
    
    // ============================================
    // MAIN VISUALIZER RENDERING
    // ============================================
    
    drawMain = () => {
        if (!this.canvas || !this.canvasCtx || !this.enabled) return;
        
        this.mainAnimationId = requestAnimationFrame(this.drawMain);
        
        if (!this.analyser || !this.dataArray) {
            this.clearCanvas();
            return;
        }
        
        const now = performance.now();
        const deltaTime = now - this.performance.lastFrame;
        
        // Frame skip for performance
        if (deltaTime < this.performance.frameTime * 0.9) {
            return;
        }
        
        this.performance.lastFrame = now;
        
        try {
            this.analyser.getByteFrequencyData(this.dataArray);
            this.updateSmoothing(this.dataArray, deltaTime);
            
            // Use offscreen canvas if available
            const ctx = this.useOffscreen ? this.offscreenCtx : this.canvasCtx;
            const canvas = this.useOffscreen ? this.offscreenCanvas : this.canvas;
            
            // Clear with gradient
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#1a1a1a');
            gradient.addColorStop(1, '#0a0a0a');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw bars
            this.drawMainBars();
            
            // Transfer from offscreen if used
            if (this.useOffscreen) {
                this.canvasCtx.drawImage(this.offscreenCanvas, 0, 0);
            }
        } catch (error) {
            console.error('❌ Main visualizer error:', error);
        }
    }
    
    resizeCanvas() {
        if (!this.canvas) return;
        
        const container = this.canvas.parentElement;
        if (container) {
            this.canvas.width = container.clientWidth || 800;
            this.canvas.height = container.clientHeight || 200;
            
            if (this.useOffscreen && this.offscreenCanvas) {
                this.offscreenCanvas.width = this.canvas.width;
                this.offscreenCanvas.height = this.canvas.height;
            }
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
        const ctx = this.useOffscreen ? this.offscreenCtx : this.canvasCtx;
        const canvas = this.useOffscreen ? this.offscreenCanvas : this.canvas;
        const width = canvas.width;
        const height = canvas.height;
        const barWidth = (width / this.bufferLength) * 2.5;
        let x = 0;
        
        const palette = this.colors.palette || { h: 340, s: 80, l: 50, range: 60 };
        
        for (let i = 0; i < this.bufferLength; i++) {
            let barHeight = (this.dataArray[i] / 255) * height * 0.8;
            
            // Apply effects
            barHeight *= this.effects.pulseScale;
            barHeight *= (0.7 + this.smooth.energy * 0.6);
            
            // Enhanced frequency-based boost
            const freqRatio = i / this.bufferLength;
            if (freqRatio < 0.15) {
                // Bass boost with impact
                barHeight *= (1 + this.smooth.bass * 0.7 + this.effects.bassImpact * 0.5);
            } else if (freqRatio > 0.7) {
                // Treble shimmer
                barHeight *= (1 + this.effects.trebleShimmer * 0.6);
            } else if (freqRatio > 0.3 && freqRatio < 0.6) {
                // Mid presence
                barHeight *= (1 + this.smooth.mid * 0.4);
            }
            
            // Color with enhanced palette
            const hue = palette.h + (i / this.bufferLength) * palette.range;
            const saturation = palette.s + (this.dataArray[i] / 255) * 15 + this.effects.energyBoost * 10;
            const lightness = palette.l + (this.dataArray[i] / 255) * 18 + this.effects.bassImpact * 15;
            
            const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
            gradient.addColorStop(0, `hsl(${hue}, ${saturation}%, ${lightness}%)`);
            gradient.addColorStop(0.5, `hsl(${hue}, ${saturation - 5}%, ${lightness - 15}%)`);
            gradient.addColorStop(1, `hsl(${hue}, ${saturation - 10}%, ${lightness - 30}%)`);
            
            ctx.fillStyle = gradient;
            
            // Draw rounded bar
            const barX = x;
            const barY = height - barHeight;
            const radius = Math.min(barWidth / 2, 5);
            
            ctx.beginPath();
            ctx.moveTo(barX, height);
            ctx.lineTo(barX, barY + radius);
            ctx.quadraticCurveTo(barX, barY, barX + radius, barY);
            ctx.lineTo(barX + barWidth - radius, barY);
            ctx.quadraticCurveTo(barX + barWidth, barY, barX + barWidth, barY + radius);
            ctx.lineTo(barX + barWidth, height);
            ctx.closePath();
            ctx.fill();
            
            // Enhanced glow on peaks
            if (this.dataArray[i] > 200 || (this.effects.bassImpact > 0.5 && freqRatio < 0.2)) {
                ctx.shadowBlur = 15 + this.effects.bassImpact * 10;
                ctx.shadowColor = `hsl(${hue}, 100%, 65%)`;
                ctx.fillRect(barX, barY, barWidth, barHeight);
                ctx.shadowBlur = 0;
            }
            
            x += barWidth + 1;
        }
    }
    
    stop() {
        if (this.mainAnimationId) {
            cancelAnimationFrame(this.mainAnimationId);
            this.mainAnimationId = null;
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
    
    initFullscreenVisualizer(canvas, analyser, dataArray, bufferLength) {
        this.fullscreenCanvas = canvas;
        this.fullscreenCtx = canvas.getContext('2d', { alpha: false, desynchronized: true });
        this.analyser = analyser;
        this.dataArray = dataArray;
        this.bufferLength = bufferLength;
        
        this.resizeFullscreenCanvas();
        
        console.log('✅ Fullscreen visualizer initialized');
    }
    
    start(enabled = true) {
        this.enabled = enabled;
        if (enabled) {
            if (this.mainAnimationId) cancelAnimationFrame(this.mainAnimationId);
            this.performance.lastFrame = performance.now();
            this.drawMain();
        } else {
            this.stop();
        }
    }

    startFullscreen() {
        if (!this.fullscreenCanvas || !this.fullscreenCtx) {
            console.error('❌ Fullscreen visualizer not initialized');
            return;
        }
        
        this.isFullscreen = true;
        this.performance.lastFrame = performance.now();
        this.drawFullscreen();
        
        console.log('✅ Fullscreen visualizer started');
    }
    
    resizeFullscreenCanvas() {
        if (!this.fullscreenCanvas) return;
        this.fullscreenCanvas.width = window.innerWidth;
        this.fullscreenCanvas.height = window.innerHeight;
    }
    
    drawFullscreen = () => {
        if (!this.fullscreenCanvas || !this.fullscreenCtx) {
            console.error('❌ Missing canvas/context, stopping fullscreen visualizer');
            this.stopFullscreen();
            return;
        }
        
        if (!this.analyser || !this.dataArray) {
            console.error('❌ Missing audio data, stopping fullscreen visualizer');
            this.stopFullscreen();
            return;
        }
        
        this.fullscreenAnimationId = requestAnimationFrame(this.drawFullscreen);
        
        const now = performance.now();
        const deltaTime = now - this.performance.lastFrame;
        this.performance.lastFrame = now;
        
        try {
            this.analyser.getByteFrequencyData(this.dataArray);
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
                case 'nebula':
                    this.drawFullscreenNebula(isBeat);
                    break;
                case '3d-waveform':
                    this.drawFullscreen3DWaveform(isBeat);
                    break;
            }
        } catch (error) {
            console.error('❌ Fullscreen draw error:', error);
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
            
            // Enhanced frequency response
            const freqRatio = i / barCount;
            if (freqRatio < 0.2) {
                barHeight *= (1 + this.smooth.bass * 0.8 + this.effects.bassImpact * 0.6);
            } else if (freqRatio > 0.75) {
                barHeight *= (1 + this.effects.trebleShimmer * 0.5);
            } else if (freqRatio > 0.35 && freqRatio < 0.65) {
                barHeight *= (1 + this.smooth.mid * 0.5);
            }
            
            const x = i * barWidth;
            const y = height - barHeight;
            
            const hue = palette.h + (i / barCount) * palette.range + (this.effects.waveOffset * 30);
            const saturation = palette.s + value * 20 + this.effects.energyBoost * 15;
            const lightness = palette.l + value * 22 + this.effects.bassImpact * 20;
            
            const gradient = this.fullscreenCtx.createLinearGradient(x, y, x, height);
            gradient.addColorStop(0, `hsl(${hue}, ${saturation}%, ${lightness}%)`);
            gradient.addColorStop(0.5, `hsl(${hue}, ${saturation - 10}%, ${lightness - 15}%)`);
            gradient.addColorStop(1, `hsl(${hue}, ${saturation - 20}%, ${lightness - 35}%)`);
            
            this.fullscreenCtx.fillStyle = gradient;
            this.fullscreenCtx.fillRect(x, y, barWidth - 2, barHeight);
            
            // Enhanced glow
            if (value > 0.75 || (isBeat && i % 5 === 0) || this.effects.bassImpact > 0.5) {
                this.fullscreenCtx.shadowBlur = 25 * value + this.effects.bassImpact * 20;
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
        const barCount = 280; // Increased for smoother circle
        const palette = this.colors.palette || { h: 340, s: 80, l: 50, range: 60 };
        
        // Draw multiple layers for depth
        const layers = [
            { radiusScale: 1.0, alphaScale: 1.0, widthScale: 1.0 },
            { radiusScale: 0.7, alphaScale: 0.6, widthScale: 0.7 },
            { radiusScale: 0.4, alphaScale: 0.4, widthScale: 0.5 }
        ];
        
        for (const layer of layers) {
            for (let i = 0; i < barCount; i++) {
                const dataIndex = Math.floor((i / barCount) * this.bufferLength);
                const value = this.dataArray[dataIndex] / 255;
                
                let barLength = value * maxRadius * 0.78 * layer.radiusScale;
                barLength *= this.effects.pulseScale;
                barLength *= (0.7 + this.smooth.energy * 0.6);
                
                // Frequency-based modulation
                const freqRatio = i / barCount;
                if (freqRatio < 0.25) {
                    barLength *= (1 + this.smooth.bass * 0.6 + this.effects.bassImpact * 0.5);
                } else if (freqRatio > 0.75) {
                    barLength *= (1 + this.effects.trebleShimmer * 0.4);
                }
                
                const angle = (i / barCount) * Math.PI * 2 + this.effects.rotation;
                
                const layerMinRadius = minRadius * layer.radiusScale;
                const x1 = centerX + Math.cos(angle) * layerMinRadius;
                const y1 = centerY + Math.sin(angle) * layerMinRadius;
                const x2 = centerX + Math.cos(angle) * (layerMinRadius + barLength);
                const y2 = centerY + Math.sin(angle) * (layerMinRadius + barLength);
                
                const hue = palette.h + (i / barCount) * palette.range * 1.5 + this.effects.waveOffset * 20;
                const saturation = palette.s + value * 25 + this.effects.energyBoost * 15;
                const lightness = palette.l + value * 20 + this.effects.bassImpact * 15;
                
                this.fullscreenCtx.globalAlpha = layer.alphaScale;
                this.fullscreenCtx.strokeStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
                this.fullscreenCtx.lineWidth = (3 + value * 3) * layer.widthScale;
                
                if (value > 0.65 || this.effects.bassImpact > 0.5) {
                    this.fullscreenCtx.shadowBlur = 20 * value * layer.alphaScale + this.effects.bassImpact * 15;
                    this.fullscreenCtx.shadowColor = `hsl(${hue}, 100%, 65%)`;
                }
                
                this.fullscreenCtx.beginPath();
                this.fullscreenCtx.moveTo(x1, y1);
                this.fullscreenCtx.lineTo(x2, y2);
                this.fullscreenCtx.stroke();
                this.fullscreenCtx.shadowBlur = 0;
            }
        }
        
        this.fullscreenCtx.globalAlpha = 1.0;
        
        // Enhanced central orb with pulsing
        const orbRadius = 25 + (this.smooth.volume * 85) * this.effects.pulseScale + 
                         this.effects.bassImpact * 30;
        const orbGradient = this.fullscreenCtx.createRadialGradient(
            centerX, centerY, 0, centerX, centerY, orbRadius
        );
        orbGradient.addColorStop(0, `hsla(${palette.h}, 100%, ${75 + this.effects.bassImpact * 20}%, 0.95)`);
        orbGradient.addColorStop(0.6, `hsla(${palette.h}, 100%, 55%, 0.5)`);
        orbGradient.addColorStop(1, `hsla(${palette.h}, 100%, 35%, 0)`);
        
        this.fullscreenCtx.fillStyle = orbGradient;
        this.fullscreenCtx.beginPath();
        this.fullscreenCtx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
        this.fullscreenCtx.fill();
        
        // Outer ring on beat
        if (this.effects.bassImpact > 0.3) {
            const ringRadius = orbRadius + 20 + this.effects.bassImpact * 40;
            this.fullscreenCtx.strokeStyle = `hsla(${palette.h}, 100%, 70%, ${this.effects.bassImpact})`;
            this.fullscreenCtx.lineWidth = 3;
            this.fullscreenCtx.beginPath();
            this.fullscreenCtx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
            this.fullscreenCtx.stroke();
        }
    }
    
    drawFullscreenWaveform(isBeat) {
        const width = this.fullscreenCanvas.width;
        const height = this.fullscreenCanvas.height;
        const centerY = height / 2;
        const sliceWidth = width / this.bufferLength;
        const amplitude = height * 0.42;
        const palette = this.colors.palette || { h: 340, s: 80, l: 50, range: 60 };
        
        // Draw multiple waveforms with different frequencies
        const waveforms = [
            { yOffset: 0, amplitudeScale: 1.0, freqStart: 0, freqEnd: 1, alpha: 1.0, lineWidth: 3 },
            { yOffset: -height * 0.15, amplitudeScale: 0.6, freqStart: 0, freqEnd: 0.3, alpha: 0.7, lineWidth: 2 },
            { yOffset: height * 0.15, amplitudeScale: 0.6, freqStart: 0.7, freqEnd: 1, alpha: 0.7, lineWidth: 2 }
        ];
        
        for (const wave of waveforms) {
            this.fullscreenCtx.globalAlpha = wave.alpha;
            this.fullscreenCtx.beginPath();
            this.fullscreenCtx.lineWidth = wave.lineWidth;
            
            let x = 0;
            for (let i = 0; i < this.bufferLength; i++) {
                const freqRatio = i / this.bufferLength;
                if (freqRatio < wave.freqStart || freqRatio > wave.freqEnd) {
                    x += sliceWidth;
                    continue;
                }
                
                const value = this.dataArray[i] / 255;
                let y = (value - 0.5) * amplitude * 2 * wave.amplitudeScale;
                
                // Apply effects
                y *= this.effects.pulseScale;
                y *= (0.8 + this.smooth.energy * 0.5);
                
                // Frequency-based modulation
                if (freqRatio < 0.2) {
                    y *= (1 + this.smooth.bass * 0.7 + this.effects.bassImpact * 0.5);
                } else if (freqRatio > 0.75) {
                    y *= (1 + this.effects.trebleShimmer * 0.5);
                }
                
                y += centerY + wave.yOffset;
                
                if (i === 0) {
                    this.fullscreenCtx.moveTo(x, y);
                } else {
                    this.fullscreenCtx.lineTo(x, y);
                }
                
                x += sliceWidth;
            }
            
            // Gradient stroke
            const hue = palette.h + this.effects.waveOffset * 50;
            const saturation = palette.s + this.smooth.energy * 20;
            const lightness = palette.l + this.smooth.energy * 15 + this.effects.bassImpact * 20;
            
            const gradient = this.fullscreenCtx.createLinearGradient(0, 0, width, 0);
            gradient.addColorStop(0, `hsl(${hue}, ${saturation}%, ${lightness}%)`);
            gradient.addColorStop(0.5, `hsl(${hue + palette.range * 0.5}, ${saturation}%, ${lightness + 10}%)`);
            gradient.addColorStop(1, `hsl(${hue + palette.range}, ${saturation}%, ${lightness}%)`);
            
            this.fullscreenCtx.strokeStyle = gradient;
            
            if (this.smooth.energy > 0.6 || this.effects.bassImpact > 0.4) {
                this.fullscreenCtx.shadowBlur = 15 + this.effects.bassImpact * 20;
                this.fullscreenCtx.shadowColor = `hsl(${hue}, 100%, 60%)`;
            }
            
            this.fullscreenCtx.stroke();
            this.fullscreenCtx.shadowBlur = 0;
        }
        
        this.fullscreenCtx.globalAlpha = 1.0;
    }
    
    drawFullscreenParticles(isBeat) {
        const width = this.fullscreenCanvas.width;
        const height = this.fullscreenCanvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const palette = this.colors.palette || { h: 340, s: 80, l: 50, range: 60 };
        
        // Spawn particles based on frequency bands
        const spawnRate = this.smooth.energy * 5 + (isBeat ? 10 : 0);
        
        for (let i = 0; i < spawnRate; i++) {
            // Determine which frequency band to spawn from
            const rand = Math.random();
            let frequency = 0;
            let color = palette.h;
            let speed = 2;
            let size = 3;
            
            if (rand < 0.3 && this.smooth.bass > 0.3) {
                // Bass particles - large, slow, red/orange
                frequency = 0;
                color = palette.h;
                speed = 1 + this.smooth.bass * 3;
                size = 5 + this.smooth.bass * 8 + this.effects.bassImpact * 10;
            } else if (rand < 0.6 && this.smooth.mid > 0.3) {
                // Mid particles - medium, moderate speed
                frequency = 0.5;
                color = palette.h + palette.range * 0.5;
                speed = 2 + this.smooth.mid * 4;
                size = 3 + this.smooth.mid * 5;
            } else if (this.smooth.treble > 0.3) {
                // Treble particles - small, fast, bright
                frequency = 1;
                color = palette.h + palette.range;
                speed = 3 + this.effects.trebleShimmer * 6;
                size = 2 + this.effects.trebleShimmer * 4;
            } else {
                continue;
            }
            
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 50;
            
            this.spawnParticle({
                x: centerX + Math.cos(angle) * distance,
                y: centerY + Math.sin(angle) * distance,
                z: 0,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                vz: 0,
                size: size,
                life: 1,
                maxLife: 1,
                decay: 0.005 + Math.random() * 0.01,
                color: { h: color, s: palette.s, l: palette.l },
                alpha: 0.9,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.1,
                type: this.particlePool.types[Math.floor(Math.random() * this.particlePool.types.length)],
                frequency: frequency
            });
        }
        
        // Update and draw particles
        for (let i = this.particlePool.active.length - 1; i >= 0; i--) {
            const p = this.particlePool.active[i];
            
            // Update
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
            p.rotation += p.rotationSpeed;
            p.alpha = p.life;
            
            // Apply gravity and friction
            p.vy += 0.05;
            p.vx *= 0.99;
            p.vy *= 0.99;
            
            // Remove dead particles
            if (p.life <= 0 || p.y > height + 50 || p.x < -50 || p.x > width + 50) {
                this.recycleParticle(p);
                continue;
            }
            
            // Draw
            this.fullscreenCtx.save();
            this.fullscreenCtx.translate(p.x, p.y);
            this.fullscreenCtx.rotate(p.rotation);
            this.fullscreenCtx.globalAlpha = p.alpha;
            
            const gradient = this.fullscreenCtx.createRadialGradient(0, 0, 0, 0, 0, p.size);
            gradient.addColorStop(0, `hsl(${p.color.h}, ${p.color.s}%, ${p.color.l + 20}%)`);
            gradient.addColorStop(0.5, `hsl(${p.color.h}, ${p.color.s}%, ${p.color.l}%)`);
            gradient.addColorStop(1, `hsla(${p.color.h}, ${p.color.s}%, ${p.color.l - 20}%, 0)`);
            
            this.fullscreenCtx.fillStyle = gradient;
            
            switch (p.type) {
                case 'circle':
                    this.fullscreenCtx.beginPath();
                    this.fullscreenCtx.arc(0, 0, p.size, 0, Math.PI * 2);
                    this.fullscreenCtx.fill();
                    break;
                case 'star':
                    this.drawStar(this.fullscreenCtx, 0, 0, 5, p.size, p.size * 0.5);
                    break;
                case 'triangle':
                    this.drawTriangle(this.fullscreenCtx, 0, 0, p.size);
                    break;
                case 'glow':
                    this.fullscreenCtx.shadowBlur = p.size * 2;
                    this.fullscreenCtx.shadowColor = `hsl(${p.color.h}, 100%, 60%)`;
                    this.fullscreenCtx.beginPath();
                    this.fullscreenCtx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
                    this.fullscreenCtx.fill();
                    this.fullscreenCtx.shadowBlur = 0;
                    break;
            }
            
            this.fullscreenCtx.restore();
        }
    }
    
    drawFullscreenNebula(isBeat) {
        const width = this.fullscreenCanvas.width;
        const height = this.fullscreenCanvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const palette = this.colors.palette || { h: 340, s: 80, l: 50, range: 60 };
        const complementary = this.colors.complementary || { h: (palette.h + 180) % 360, s: palette.s, l: palette.l };
        
        // Spawn nebula particles
        const spawnRate = 2 + this.smooth.energy * 3;
        
        for (let i = 0; i < spawnRate; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * Math.min(width, height) * 0.4;
            const useComplementary = Math.random() > 0.5;
            const colorPalette = useComplementary ? complementary : palette;
            
            this.spawnNebulaParticle({
                x: centerX + Math.cos(angle) * distance,
                y: centerY + Math.sin(angle) * distance,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: 30 + Math.random() * 80 + this.smooth.bass * 50,
                life: 1,
                maxLife: 1,
                color: { 
                    h: colorPalette.h + (Math.random() - 0.5) * 40, 
                    s: colorPalette.s - 20, 
                    l: colorPalette.l - 10 
                },
                alpha: 0.15 + this.smooth.energy * 0.15,
                drift: { 
                    x: Math.cos(angle) * 0.1, 
                    y: Math.sin(angle) * 0.1 
                }
            });
        }
        
        // Update and draw nebula particles
        for (let i = this.nebulaParticles.active.length - 1; i >= 0; i--) {
            const p = this.nebulaParticles.active[i];
            
            // Update with drift
            p.x += p.vx + p.drift.x;
            p.y += p.vy + p.drift.y;
            p.life -= 0.002;
            p.alpha = p.life * 0.2;
            
            // Pulse size with bass
            const pulsedSize = p.size * (1 + this.effects.bassImpact * 0.3);
            
            // Remove dead particles
            if (p.life <= 0) {
                this.recycleNebulaParticle(p);
                continue;
            }
            
            // Draw with soft gradient
            this.fullscreenCtx.globalAlpha = p.alpha;
            
            const gradient = this.fullscreenCtx.createRadialGradient(
                p.x, p.y, 0, 
                p.x, p.y, pulsedSize
            );
            gradient.addColorStop(0, `hsla(${p.color.h}, ${p.color.s}%, ${p.color.l + 15}%, ${p.alpha})`);
            gradient.addColorStop(0.4, `hsla(${p.color.h}, ${p.color.s}%, ${p.color.l}%, ${p.alpha * 0.6})`);
            gradient.addColorStop(1, `hsla(${p.color.h}, ${p.color.s}%, ${p.color.l - 10}%, 0)`);
            
            this.fullscreenCtx.fillStyle = gradient;
            this.fullscreenCtx.beginPath();
            this.fullscreenCtx.arc(p.x, p.y, pulsedSize, 0, Math.PI * 2);
            this.fullscreenCtx.fill();
        }
        
        this.fullscreenCtx.globalAlpha = 1.0;
        
        // Add frequency spectrum overlay
        this.drawFrequencySpectrum(width, height, palette);
    }
    
    drawFullscreen3DWaveform(isBeat) {
        const width = this.fullscreenCanvas.width;
        const height = this.fullscreenCanvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const palette = this.colors.palette || { h: 340, s: 80, l: 50, range: 60 };
        
        // 3D projection parameters
        const perspective = this.transform3D.perspective;
        const rotX = this.transform3D.rotationX;
        const rotY = this.transform3D.rotationY;
        const depth = this.transform3D.depth;
        
        // Draw multiple layers of waveform in 3D space
        const layers = 8;
        const layerSpacing = 80;
        
        for (let layer = 0; layer < layers; layer++) {
            const z = (layer - layers / 2) * layerSpacing + depth;
            const scale = perspective / (perspective + z);
            
            if (scale <= 0) continue;
            
            this.fullscreenCtx.beginPath();
            this.fullscreenCtx.lineWidth = 2 * scale;
            
            const points = [];
            const segments = 100;
            
            for (let i = 0; i < segments; i++) {
                const dataIndex = Math.floor((i / segments) * this.bufferLength);
                const value = this.dataArray[dataIndex] / 255;
                
                // 3D coordinates
                let x3d = (i / segments - 0.5) * width * 1.2;
                let y3d = (value - 0.5) * height * 0.6 * (1 + this.smooth.energy * 0.5);
                let z3d = z;
                
                // Apply frequency-based modulation
                const freqRatio = i / segments;
                if (freqRatio < 0.2) {
                    y3d *= (1 + this.smooth.bass * 0.6 + this.effects.bassImpact * 0.5);
                } else if (freqRatio > 0.75) {
                    y3d *= (1 + this.effects.trebleShimmer * 0.4);
                }
                
                // Rotate around Y axis
                const rotatedX = x3d * Math.cos(rotY) - z3d * Math.sin(rotY);
                const rotatedZ = x3d * Math.sin(rotY) + z3d * Math.cos(rotY);
                x3d = rotatedX;
                z3d = rotatedZ;
                
                // Rotate around X axis
                const rotatedY = y3d * Math.cos(rotX) - z3d * Math.sin(rotX);
                z3d = y3d * Math.sin(rotX) + z3d * Math.cos(rotX);
                y3d = rotatedY;
                
                // Project to 2D
                const projScale = perspective / (perspective + z3d);
                const x2d = centerX + x3d * projScale;
                const y2d = centerY + y3d * projScale;
                
                points.push({ x: x2d, y: y2d, value: value, scale: projScale });
            }
            
            // Draw the waveform
            for (let i = 0; i < points.length; i++) {
                const p = points[i];
                
                if (i === 0) {
                    this.fullscreenCtx.moveTo(p.x, p.y);
                } else {
                    this.fullscreenCtx.lineTo(p.x, p.y);
                }
            }
            
            // Color based on layer depth
            const layerHue = palette.h + (layer / layers) * palette.range;
            const layerAlpha = 0.3 + (1 - layer / layers) * 0.7;
            const saturation = palette.s + this.smooth.energy * 20;
            const lightness = palette.l + this.smooth.energy * 15 + this.effects.bassImpact * 15;
            
            this.fullscreenCtx.strokeStyle = `hsla(${layerHue}, ${saturation}%, ${lightness}%, ${layerAlpha})`;
            
            if (this.smooth.energy > 0.6 || this.effects.bassImpact > 0.4) {
                this.fullscreenCtx.shadowBlur = 10 * scale + this.effects.bassImpact * 15;
                this.fullscreenCtx.shadowColor = `hsl(${layerHue}, 100%, 60%)`;
            }
            
            this.fullscreenCtx.stroke();
            this.fullscreenCtx.shadowBlur = 0;
        }
    }
    
    drawFrequencySpectrum(width, height, palette) {
        const barCount = 64;
        const barWidth = width / barCount;
        const maxHeight = height * 0.2;
        
        this.fullscreenCtx.globalAlpha = 0.4;
        
        for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor((i / barCount) * this.bufferLength);
            const value = this.dataArray[dataIndex] / 255;
            
            const barHeight = value * maxHeight;
            const x = i * barWidth;
            const y = height - barHeight;
            
            const hue = palette.h + (i / barCount) * palette.range;
            this.fullscreenCtx.fillStyle = `hsl(${hue}, ${palette.s}%, ${palette.l}%)`;
            this.fullscreenCtx.fillRect(x, y, barWidth - 2, barHeight);
        }
        
        this.fullscreenCtx.globalAlpha = 1.0;
    }
    
    drawStar(ctx, x, y, points, outer, inner) {
        ctx.beginPath();
        ctx.moveTo(x, y - outer);
        
        for (let i = 0; i < points * 2; i++) {
            const radius = i % 2 === 0 ? outer : inner;
            const angle = (Math.PI / points) * i - Math.PI / 2;
            ctx.lineTo(
                x + Math.cos(angle) * radius,
                y + Math.sin(angle) * radius
            );
        }
        
        ctx.closePath();
        ctx.fill();
    }
    
    drawTriangle(ctx, x, y, size) {
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size, y + size);
        ctx.lineTo(x - size, y + size);
        ctx.closePath();
        ctx.fill();
    }
    
    stopFullscreen() {
        if (this.fullscreenAnimationId) {
            cancelAnimationFrame(this.fullscreenAnimationId);
            this.fullscreenAnimationId = null;
        }
        this.isFullscreen = false;
    }
    
    // ============================================
    // MODE & PREFERENCES
    // ============================================
    
    setMode(mode) {
        const validModes = ['bars', 'circular', 'waveform', 'particles', 'nebula', '3d-waveform'];
        if (validModes.includes(mode)) {
            this.vizMode = mode;
            this.saveVizMode();
            console.log('🎨 Visualizer mode:', mode);
        }
    }
    
    getMode() {
        return this.vizMode;
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
    
    loadPreferences() {
        try {
            const prefs = JSON.parse(localStorage.getItem('visualizerPreferences') || '{}');
            if (prefs.adaptiveQuality !== undefined) {
                this.performance.adaptiveQuality = prefs.adaptiveQuality;
            }
            if (prefs.targetFPS) {
                this.performance.targetFPS = prefs.targetFPS;
                this.performance.frameTime = 1000 / prefs.targetFPS;
            }
        } catch (e) {
            console.warn('Failed to load visualizer preferences');
        }
    }
    
    savePreferences() {
        try {
            const prefs = {
                adaptiveQuality: this.performance.adaptiveQuality,
                targetFPS: this.performance.targetFPS
            };
            localStorage.setItem('visualizerPreferences', JSON.stringify(prefs));
        } catch (e) {
            console.warn('Failed to save visualizer preferences');
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VisualizerManager;
}
