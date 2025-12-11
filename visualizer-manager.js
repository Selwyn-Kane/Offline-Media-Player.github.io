/* ============================================
   Visualizer Manager - ENHANCED WITH ANALYSIS DATA
   ============================================ */

class VisualizerManager {
    constructor() {
        this.canvas = null;
        this.canvasCtx = null;
        this.analyser = null;
        this.dataArray = null;
        this.bufferLength = null;
        this.animationId = null;
        this.enabled = true;
        this.isFullscreen = false;
        
        // Fullscreen specific
        this.fullscreenCanvas = null;
        this.fullscreenCtx = null;
        this.vizMode = 'bars';
        this.particles = [];
        
        // ✅ NEW: Analysis-enhanced features
        this.currentAnalysis = null;
        this.bpmPulseOffset = 0;
        this.lastBeatTime = 0;
    }
    
    // ✅ NEW: Set current track analysis data
    setTrackAnalysis(analysis) {
        this.currentAnalysis = analysis;
        this.bpmPulseOffset = 0;
        this.lastBeatTime = performance.now();
        console.log('🎵 Visualizer using analysis:', analysis);
    }
    
    // ✅ NEW: Clear analysis data
    clearTrackAnalysis() {
        this.currentAnalysis = null;
    }
    
    // ✅ NEW: Get color scheme based on mood
    getMoodColors() {
        if (!this.currentAnalysis) {
            return {
                primary: [340, 80, 50],   // Default red
                secondary: [340, 80, 30]
            };
        }
        
        const moodColors = {
            'energetic': { primary: [0, 100, 60], secondary: [30, 100, 50] },      // Red-Orange
            'calm': { primary: [200, 70, 50], secondary: [220, 70, 40] },          // Blue
            'bright': { primary: [50, 100, 60], secondary: [60, 100, 50] },        // Yellow
            'dark': { primary: [270, 60, 40], secondary: [280, 60, 30] },          // Purple
            'neutral': { primary: [340, 80, 50], secondary: [340, 80, 30] }        // Red (default)
        };
        
        return moodColors[this.currentAnalysis.mood] || moodColors.neutral;
    }
    
    // ✅ NEW: Calculate BPM-synced pulse
    getBPMPulse() {
        if (!this.currentAnalysis || !this.currentAnalysis.bpm) {
            return 1.0;
        }
        
        const now = performance.now();
        const beatInterval = (60 / this.currentAnalysis.bpm) * 1000; // ms per beat
        const timeSinceLastBeat = (now - this.lastBeatTime) % beatInterval;
        const pulseProgress = timeSinceLastBeat / beatInterval;
        
        // Sine wave pulse (0.8 to 1.2)
        return 1.0 + Math.sin(pulseProgress * Math.PI * 2) * 0.2;
    }
    
    // ✅ NEW: Get energy-based speed multiplier
    getEnergyMultiplier() {
        if (!this.currentAnalysis) return 1.0;
        return 0.5 + (this.currentAnalysis.energy * 1.5); // 0.5x to 2x speed
    }
    
    initMainVisualizer(canvasElement, analyser) {
        if (this.canvas) return;
        
        if (!canvasElement || !analyser) {
            console.warn('Visualizer initialization failed: canvas or analyser is null');
            return;
        }
        
        this.canvas = canvasElement;
        this.canvasCtx = this.canvas.getContext('2d');
        this.analyser = analyser;
        this.bufferLength = analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);
        
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }
    
    start(shouldRun) {
        if (!this.canvas || !shouldRun) return;
        if (this.animationId) return;
        
        this.draw();
    }
    
    draw = () => {
        if (!this.enabled) {
            this.animationId = null;
            this.clearCanvas();
            return;
        }
        
        this.animationId = requestAnimationFrame(this.draw);
        
        if (!this.analyser || !this.dataArray) return;
        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Clear with gradient
        const gradient = this.canvasCtx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#1a1a1a');
        gradient.addColorStop(1, '#0a0a0a');
        this.canvasCtx.fillStyle = gradient;
        this.canvasCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw bars (enhanced with analysis)
        this.drawBars();
    }
    
    drawBars() {
        const barWidth = (this.canvas.width / this.bufferLength) * 2.5;
        let x = 0;
        
        // ✅ ENHANCED: Get mood colors and BPM pulse
        const colors = this.getMoodColors();
        const pulse = this.getBPMPulse();
        const energyMult = this.getEnergyMultiplier();
        
        for (let i = 0; i < this.bufferLength; i++) {
            let barHeight = (this.dataArray[i] / 255) * this.canvas.height * 0.8;
            
            // ✅ ENHANCED: Apply BPM pulse to bar height
            barHeight *= pulse;
            
            const barGradient = this.canvasCtx.createLinearGradient(
                0, this.canvas.height - barHeight, 0, this.canvas.height
            );
            
            // ✅ ENHANCED: Use mood-based colors
            const hue = colors.primary[0] + (i / this.bufferLength) * 40;
            const saturation = colors.primary[1] + (this.dataArray[i] / 255) * 20;
            const lightness = colors.primary[2] + (this.dataArray[i] / 255) * 15;
            
            barGradient.addColorStop(0, `hsl(${hue}, ${saturation}%, ${lightness}%)`);
            barGradient.addColorStop(1, `hsl(${hue}, ${saturation}%, ${lightness - 20}%)`);
            
            this.canvasCtx.fillStyle = barGradient;
            
            const barX = x;
            const barY = this.canvas.height - barHeight;
            const radius = barWidth / 2;
            
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
        if (!this.canvas) return;
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
    
    initFullscreenVisualizer(canvasElement) {
        if (this.fullscreenCanvas) return;
        
        this.fullscreenCanvas = canvasElement;
        this.fullscreenCtx = this.fullscreenCanvas.getContext('2d');
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
        
        this.drawFullscreen();
    }
  
    drawFullscreen = () => {
        if (!this.fullscreenCanvas || !this.analyser) {
            this.animationId = null;
            return;
        }
        
        this.animationId = requestAnimationFrame(this.drawFullscreen);
        
        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Clear with fade effect
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
        }
        
    }
    
    
    drawFullscreenBars() {
        const width = this.fullscreenCanvas.width;
        const height = this.fullscreenCanvas.height;
        const barCount = 160;
        const barWidth = width / barCount;
        
        // ✅ ENHANCED: Get mood colors and BPM pulse
        const colors = this.getMoodColors();
        const pulse = this.getBPMPulse();
        
        for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor((i / barCount) * this.bufferLength);
            const value = this.dataArray[dataIndex] / 255;
            let barHeight = value * height * 0.9;
            
            // ✅ ENHANCED: Apply BPM pulse
            barHeight *= pulse;
            
            const x = i * barWidth;
            const y = height - barHeight;
            
            // ✅ ENHANCED: Use mood-based colors
            const hue = colors.primary[0] + (i / barCount) * 60;
            const gradient = this.fullscreenCtx.createLinearGradient(x, y, x, height);
            gradient.addColorStop(0, `hsl(${hue}, 100%, 60%)`);
            gradient.addColorStop(1, `hsl(${hue}, 100%, 30%)`);
            
            this.fullscreenCtx.fillStyle = gradient;
            this.fullscreenCtx.fillRect(x, y, barWidth - 2, barHeight);
            
            this.fullscreenCtx.shadowBlur = 20;
            this.fullscreenCtx.shadowColor = `hsl(${hue}, 100%, 50%)`;
            this.fullscreenCtx.fillRect(x, y, barWidth - 2, barHeight);
            this.fullscreenCtx.shadowBlur = 0;
        }
    }
    
    drawFullscreenCircular() {
        const width = this.fullscreenCanvas.width;
        const height = this.fullscreenCanvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.min(width, height) * 0.45;
        const minRadius = maxRadius * 0.3;
        const barCount = 180;
        
        // ✅ ENHANCED
        const colors = this.getMoodColors();
        const pulse = this.getBPMPulse();
        
        for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor((i / barCount) * this.bufferLength);
            const value = this.dataArray[dataIndex] / 255;
            let barHeight = value * maxRadius * 0.7;
            
            // ✅ ENHANCED: Apply BPM pulse
            barHeight *= pulse;
            
            const angle = (i / barCount) * Math.PI * 2;
            
            const x1 = centerX + Math.cos(angle) * minRadius;
            const y1 = centerY + Math.sin(angle) * minRadius;
            const x2 = centerX + Math.cos(angle) * (minRadius + barHeight);
            const y2 = centerY + Math.sin(angle) * (minRadius + barHeight);
            
            const hue = colors.primary[0] + (i / barCount) * 120;
            this.fullscreenCtx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
            this.fullscreenCtx.lineWidth = 5;
            this.fullscreenCtx.shadowBlur = 15;
            this.fullscreenCtx.shadowColor = `hsl(${hue}, 100%, 50%)`;
            
            this.fullscreenCtx.beginPath();
            this.fullscreenCtx.moveTo(x1, y1);
            this.fullscreenCtx.lineTo(x2, y2);
            this.fullscreenCtx.stroke();
        }
        
        this.fullscreenCtx.shadowBlur = 0;
    }
    
    drawFullscreenWaveform() {
        const width = this.fullscreenCanvas.width;
        const height = this.fullscreenCanvas.height;
        const centerY = height / 2;
        const sliceWidth = width / this.bufferLength;
        const amplitude = height * 0.45;
        
        // ✅ ENHANCED: Use mood colors
        const colors = this.getMoodColors();
        const primaryColor = `hsl(${colors.primary[0]}, ${colors.primary[1]}%, ${colors.primary[2]}%)`;
        const secondaryColor = `hsl(${colors.secondary[0]}, ${colors.secondary[1]}%, ${colors.secondary[2]}%)`;
        
        this.fullscreenCtx.lineWidth = 3;
        this.fullscreenCtx.strokeStyle = primaryColor;
        this.fullscreenCtx.shadowBlur = 20;
        this.fullscreenCtx.shadowColor = primaryColor;
        
        this.fullscreenCtx.beginPath();
        
        let x = 0;
        for (let i = 0; i < this.bufferLength; i++) {
            const v = this.dataArray[i] / 128.0;
            const y = centerY - (v - 1) * amplitude;
            
            if (i === 0) {
                this.fullscreenCtx.moveTo(x, y);
            } else {
                this.fullscreenCtx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        this.fullscreenCtx.lineTo(width, centerY);
        this.fullscreenCtx.stroke();
        
        this.fullscreenCtx.strokeStyle = secondaryColor;
        this.fullscreenCtx.beginPath();
        
        x = 0;
        for (let i = 0; i < this.bufferLength; i++) {
            const v = this.dataArray[i] / 128.0;
            const y = centerY + (v - 1) * amplitude;
            
            if (i === 0) {
                this.fullscreenCtx.moveTo(x, y);
            } else {
                this.fullscreenCtx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        this.fullscreenCtx.lineTo(width, centerY);
        this.fullscreenCtx.stroke();
        this.fullscreenCtx.shadowBlur = 0;
    }
    
    drawFullscreenParticles() {
        const width = this.fullscreenCanvas.width;
        const height = this.fullscreenCanvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        
        // ✅ ENHANCED: Use energy multiplier
        const energyMult = this.getEnergyMultiplier();
        const colors = this.getMoodColors();
        
        // Create particles
        for (let i = 0; i < Math.floor(5 * energyMult); i++) {
            const value = this.dataArray[Math.floor(Math.random() * this.bufferLength)] / 255;
            
            if (value > 0.3) {
                const angle = Math.random() * Math.PI * 2;
                const speed = value * 5 * energyMult;
                const size = value * 10;
                const hue = colors.primary[0] + Math.random() * 60;
                
                this.particles.push({
                    x: centerX,
                    y: centerY,
                    size: size,
                    color: `hsl(${hue}, 100%, 60%)`,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 1
                });
            }
        }
        
        // Update and draw
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.01;
            p.size *= 0.99;
            
            if (p.life > 0) {
                this.fullscreenCtx.save();
                this.fullscreenCtx.globalAlpha = p.life;
                this.fullscreenCtx.fillStyle = p.color;
                this.fullscreenCtx.beginPath();
                this.fullscreenCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.fullscreenCtx.fill();
                this.fullscreenCtx.restore();
                return true;
            }
            return false;
        });
        
        // Central pulse
        const avgValue = this.dataArray.reduce((a, b) => a + b, 0) / this.bufferLength / 255;
        const pulseRadius = 50 + (avgValue * 100) * energyMult;
        
        const gradient = this.fullscreenCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulseRadius);
        const pulseColor = `rgba(${colors.primary[0]}, 53, 69, 0.8)`;
        gradient.addColorStop(0, pulseColor);
        gradient.addColorStop(1, 'rgba(220, 53, 69, 0)');
        
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
        this.particles = [];
    }
    
    setVizMode(mode) {
        this.vizMode = mode;
        this.particles = [];
    }
    
    dispose() {
        this.stop();
        this.stopFullscreen();
        this.canvas = null;
        this.fullscreenCanvas = null;
    }
}

const visualizerManager = new VisualizerManager();

console.log('✅ VisualizerManager loaded (ENHANCED):', typeof visualizerManager);