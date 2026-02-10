/* ============================================
   Enhanced Visualizer Manager v3.0
   High-performance, immersive audio visualizations
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
        this.mainAnimationId = null;
        this.fullscreenAnimationId = null;
        this.enabled = true;
        this.isFullscreen = false;
        this.vizMode = this.loadVizMode();
        
        // Performance optimization
        this.performance = {
            fps: 60,
            targetFPS: 60,
            lastFrame: performance.now(),
            frameCount: 0,
            adaptiveQuality: true,
            qualityLevel: 1.0,
            offscreenSupported: typeof OffscreenCanvas !== 'undefined'
        };
        
        // Enhanced analysis integration
        this.analysis = {
            current: null,
            previous: null,
            cache: new Map()
        };
        
        // Advanced beat detection
        this.beatDetection = {
            history: new Float32Array(50),
            historyIndex: 0,
            threshold: 0,
            lastBeat: 0,
            confidence: 0,
            sensitivity: 1.25,
            cooldown: 180,
            energy: 0
        };
        
        // Smooth interpolation system
        this.smooth = {
            energy: 0,
            bass: 0,
            mid: 0,
            treble: 0,
            volume: 0,
            rotation: 0,
            hue: 0
        };
        
        // Frequency bands
        this.frequencies = {
            subBass: 0,
            bass: 0,
            mid: 0,
            treble: 0
        };
        
        // Particle system
        this.particlePool = {
            active: [],
            inactive: [],
            maxSize: 800
        };
        this.initParticlePool();
        
        // Color system
        this.colors = {
            palette: { h: 340, s: 80, l: 50, range: 60 },
            albumArt: null,
            lastUpdate: 0
        };
        
        // Visual effects
        this.effects = {
            pulseScale: 1.0,
            rotation: 0,
            waveOffset: 0
        };

        console.log('🎨 Immersive VisualizerManager v3.0 initialized');
    }

    initParticlePool() {
        for (let i = 0; i < this.particlePool.maxSize; i++) {
            this.particlePool.inactive.push(this.createParticle());
        }
    }

    createParticle() {
        return {
            x: 0, y: 0, vx: 0, vy: 0,
            size: 0, life: 0, maxLife: 1, decay: 0,
            color: { h: 0, s: 0, l: 0 },
            rotation: 0, rotationSpeed: 0,
            type: 'circle'
        };
    }

    spawnParticle(config) {
        let p = this.particlePool.inactive.pop() || this.createParticle();
        Object.assign(p, config);
        this.particlePool.active.push(p);
        return p;
    }

    recycleParticle(p, index) {
        this.particlePool.active.splice(index, 1);
        if (this.particlePool.inactive.length < this.particlePool.maxSize) {
            this.particlePool.inactive.push(p);
        }
    }

    loadVizMode() {
        return localStorage.getItem('visualizerMode') || 'nebula';
    }

    saveVizMode() {
        localStorage.setItem('visualizerMode', this.vizMode);
    }

    setVizMode(mode) {
        const validModes = ['bars', 'circular', 'waveform', 'particles', 'nebula', '3dwave'];
        if (validModes.includes(mode)) {
            this.vizMode = mode;
            this.saveVizMode();
            this.particlePool.active = [];
        }
    }

    initMainVisualizer(canvas, analyser, dataArray, bufferLength) {
        this.canvas = canvas;
        this.canvasCtx = canvas.getContext('2d', { alpha: false, desynchronized: true });
        this.analyser = analyser;
        this.dataArray = dataArray;
        this.bufferLength = bufferLength;
        this.resizeCanvas();
    }

    initFullscreenVisualizer(canvas, analyser, dataArray, bufferLength) {
        this.fullscreenCanvas = canvas;
        this.fullscreenCtx = canvas.getContext('2d', { alpha: false, desynchronized: true });
        this.analyser = analyser;
        this.dataArray = dataArray;
        this.bufferLength = bufferLength;
        this.isFullscreen = true;
        this.resizeFullscreenCanvas();
    }

    resizeCanvas() {
        if (!this.canvas) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    resizeFullscreenCanvas() {
        if (!this.fullscreenCanvas) return;
        this.fullscreenCanvas.width = window.innerWidth;
        this.fullscreenCanvas.height = window.innerHeight;
    }

    updateSmoothing(data, dt) {
        const lerp = (a, b, t) => a + (b - a) * t;
        const factor = Math.min(1, dt / 100);
        
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = (sum / data.length) / 255;
        
        this.smooth.volume = lerp(this.smooth.volume, avg, factor * 2);
        
        // Frequency bands
        const len = data.length;
        const bass = this.getBandAvg(data, 0, len * 0.1);
        const mid = this.getBandAvg(data, len * 0.1, len * 0.5);
        const treble = this.getBandAvg(data, len * 0.5, len);
        
        this.smooth.bass = lerp(this.smooth.bass, bass, factor * 3);
        this.smooth.mid = lerp(this.smooth.mid, mid, factor * 2);
        this.smooth.treble = lerp(this.smooth.treble, treble, factor * 4);
        this.smooth.energy = (this.smooth.bass * 1.2 + this.smooth.mid * 0.8 + this.smooth.treble * 1.0) / 3;
        
        this.effects.pulseScale = 1.0 + this.smooth.bass * 0.15;
        this.effects.rotation += (0.002 + this.smooth.energy * 0.01) * dt;
        this.effects.waveOffset += 0.005 * dt;
    }

    getBandAvg(data, start, end) {
        let sum = 0;
        const s = Math.floor(start), e = Math.floor(end);
        for (let i = s; i < e; i++) sum += data[i];
        return (sum / (e - s)) / 255;
    }

    detectBeat(data) {
        const bass = (this.getBandAvg(data, 0, 10) + this.getBandAvg(data, 10, 40)) / 2;
        const now = performance.now();
        if (bass > 0.6 && now - this.beatDetection.lastBeat > this.beatDetection.cooldown) {
            this.beatDetection.lastBeat = now;
            return true;
        }
        return false;
    }

    setTrackAnalysis(analysis) {
        if (!analysis) return;
        this.analysis.current = analysis;
        if (analysis.bpm) {
            this.beatDetection.cooldown = (60000 / analysis.bpm) * 0.4;
        }
    }

    clearTrackAnalysis() {
        this.analysis.current = null;
        this.beatDetection.cooldown = 180;
    }

    updateColors() {
        if (window.currentDominantColor) {
            const { r, g, b } = window.currentDominantColor;
            const [h, s, l] = this.rgbToHsl(r, g, b);
            this.colors.palette = { h, s, l, range: 60 };
        }
    }

    rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max === min) h = s = 0;
        else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h /= 6;
        }
        return [h * 360, s * 100, l * 100];
    }

    start() {
        if (this.mainAnimationId) return;
        const animate = (time) => {
            if (!this.enabled || !this.canvas) return;
            this.mainAnimationId = requestAnimationFrame(animate);
            this.render(this.canvasCtx, this.canvas, time);
        };
        this.mainAnimationId = requestAnimationFrame(animate);
    }

    stop() {
        if (this.mainAnimationId) {
            cancelAnimationFrame(this.mainAnimationId);
            this.mainAnimationId = null;
        }
    }

    startFullscreen() {
        if (this.fullscreenAnimationId) return;
        const animate = (time) => {
            if (!this.isFullscreen || !this.fullscreenCanvas) return;
            this.fullscreenAnimationId = requestAnimationFrame(animate);
            this.render(this.fullscreenCtx, this.fullscreenCanvas, time);
        };
        this.fullscreenAnimationId = requestAnimationFrame(animate);
    }

    stopFullscreen() {
        if (this.fullscreenAnimationId) {
            cancelAnimationFrame(this.fullscreenAnimationId);
            this.fullscreenAnimationId = null;
        }
        this.isFullscreen = false;
    }

    render(ctx, canvas, time) {
        if (!this.analyser || !this.dataArray) return;
        
        const dt = time - this.performance.lastFrame;
        this.performance.lastFrame = time;
        
        this.analyser.getByteFrequencyData(this.dataArray);
        this.updateSmoothing(this.dataArray, dt);
        this.updateColors();
        const isBeat = this.detectBeat(this.dataArray);
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        switch (this.vizMode) {
            case 'nebula': this.drawNebula(ctx, canvas, isBeat); break;
            case '3dwave': this.draw3DWave(ctx, canvas); break;
            case 'circular': this.drawCircular(ctx, canvas, isBeat); break;
            case 'particles': this.drawParticles(ctx, canvas, isBeat); break;
            case 'waveform': this.drawWaveform(ctx, canvas); break;
            default: this.drawBars(ctx, canvas, isBeat);
        }
    }

    drawBars(ctx, canvas, isBeat) {
        const w = canvas.width, h = canvas.height;
        const barWidth = (w / this.bufferLength) * 2.5;
        let x = 0;
        const pal = this.colors.palette;
        
        for (let i = 0; i < this.bufferLength; i++) {
            const val = this.dataArray[i] / 255;
            const barH = val * h * 0.8 * this.effects.pulseScale;
            const hue = pal.h + (i / this.bufferLength) * pal.range;
            
            ctx.fillStyle = `hsl(${hue}, ${pal.s}%, ${pal.l + val * 20}%)`;
            ctx.fillRect(x, h - barH, barWidth - 1, barH);
            x += barWidth;
        }
    }

    drawCircular(ctx, canvas, isBeat) {
        const cx = canvas.width / 2, cy = canvas.height / 2;
        const radius = Math.min(cx, cy) * 0.5 * this.effects.pulseScale;
        const pal = this.colors.palette;
        
        ctx.lineWidth = 3;
        for (let i = 0; i < 180; i++) {
            const val = this.dataArray[i % this.bufferLength] / 255;
            const angle = (i / 180) * Math.PI * 2 + this.effects.rotation;
            const len = val * radius * 0.8;
            
            ctx.strokeStyle = `hsl(${pal.h + (i/180)*pal.range}, ${pal.s}%, ${pal.l + val*20}%)`;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
            ctx.lineTo(cx + Math.cos(angle) * (radius + len), cy + Math.sin(angle) * (radius + len));
            ctx.stroke();
        }
    }

    drawNebula(ctx, canvas, isBeat) {
        const cx = canvas.width / 2, cy = canvas.height / 2;
        const pal = this.colors.palette;
        
        if (isBeat || Math.random() < 0.1) {
            this.spawnParticle({
                x: cx + (Math.random() - 0.5) * 100,
                y: cy + (Math.random() - 0.5) * 100,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                size: 20 + Math.random() * 50,
                life: 1, decay: 0.005 + Math.random() * 0.01,
                color: { h: pal.h + Math.random() * pal.range, s: pal.s, l: pal.l },
                type: 'nebula'
            });
        }
        
        ctx.globalCompositeOperation = 'screen';
        for (let i = this.particlePool.active.length - 1; i >= 0; i--) {
            const p = this.particlePool.active[i];
            p.x += p.vx; p.y += p.vy; p.life -= p.decay;
            if (p.life <= 0) { this.recycleParticle(p, i); continue; }
            
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            grad.addColorStop(0, `hsla(${p.color.h}, ${p.color.s}%, ${p.color.l}%, ${p.life * 0.3})`);
            grad.addColorStop(1, `hsla(${p.color.h}, ${p.color.s}%, ${p.color.l}%, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    draw3DWave(ctx, canvas) {
        const w = canvas.width, h = canvas.height;
        const pal = this.colors.palette;
        ctx.strokeStyle = `hsl(${pal.h}, ${pal.s}%, ${pal.l}%)`;
        ctx.lineWidth = 2;
        
        for (let j = 0; j < 5; j++) {
            ctx.beginPath();
            const zOffset = j * 40;
            const alpha = 1 - (j / 5);
            ctx.strokeStyle = `hsla(${pal.h + j*10}, ${pal.s}%, ${pal.l}%, ${alpha})`;
            
            for (let i = 0; i < this.bufferLength; i++) {
                const val = this.dataArray[i] / 255;
                const x = (i / this.bufferLength) * w;
                const y = h/2 + (val - 0.5) * h * 0.5 * alpha + Math.sin(i*0.1 + this.effects.waveOffset + j) * 20;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    }

    drawParticles(ctx, canvas, isBeat) {
        const cx = canvas.width / 2, cy = canvas.height / 2;
        const pal = this.colors.palette;
        
        if (isBeat) {
            for (let i = 0; i < 20; i++) {
                const ang = Math.random() * Math.PI * 2;
                const spd = 2 + Math.random() * 5;
                this.spawnParticle({
                    x: cx, y: cy,
                    vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
                    size: 2 + Math.random() * 5,
                    life: 1, decay: 0.01 + Math.random() * 0.02,
                    color: { h: pal.h + Math.random() * pal.range, s: 100, l: 70 }
                });
            }
        }
        
        for (let i = this.particlePool.active.length - 1; i >= 0; i--) {
            const p = this.particlePool.active[i];
            p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life -= p.decay;
            if (p.life <= 0) { this.recycleParticle(p, i); continue; }
            ctx.fillStyle = `hsla(${p.color.h}, ${p.color.s}%, ${p.color.l}%, ${p.life})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawWaveform(ctx, canvas) {
        const w = canvas.width, h = canvas.height;
        const pal = this.colors.palette;
        ctx.strokeStyle = `hsl(${pal.h}, ${pal.s}%, ${pal.l}%)`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < this.bufferLength; i++) {
            const val = this.dataArray[i] / 255;
            const x = (i / this.bufferLength) * w;
            const y = h/2 + (val - 0.5) * h * 0.8;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
}

// Global instance for script.js to find
window.VisualizerManager = VisualizerManager;
console.log('✅ Immersive VisualizerManager v3.0 loaded');
