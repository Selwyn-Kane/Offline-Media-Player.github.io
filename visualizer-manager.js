/* ============================================
   Visualizer Manager - Separated for lazy loading
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
    }
    
    // Initialize main visualizer (called on first play)
    initMainVisualizer(canvasElement, analyser) {
    if (this.canvas) return; // Already initialized
    
    // Add null checks
    if (!canvasElement || !analyser) {
        console.warn('Visualizer initialization failed: canvas or analyser is null');
        return;
    }
    
    this.canvas = canvasElement;
    this.canvasCtx = this.canvas.getContext('2d');
    this.analyser = analyser;
    this.bufferLength = analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);
    
    // Set canvas size
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
}
    
    // Start main visualizer animation
    start(shouldRun) {
        if (!this.canvas || !shouldRun) return;
        if (this.animationId) return; // Already running
        
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
        
        // Draw bars
        this.drawBars();
    }
    
    drawBars() {
        const barWidth = (this.canvas.width / this.bufferLength) * 2.5;
        let x = 0;
        
        for (let i = 0; i < this.bufferLength; i++) {
            const barHeight = (this.dataArray[i] / 255) * this.canvas.height * 0.8;
            
            const barGradient = this.canvasCtx.createLinearGradient(
                0, this.canvas.height - barHeight, 0, this.canvas.height
            );
            
            const hue = (i / this.bufferLength) * 20 + 340;
            const saturation = 80 + (this.dataArray[i] / 255) * 20;
            const lightness = 45 + (this.dataArray[i] / 255) * 15;
            
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
    
    // Lazy load fullscreen visualizer methods
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
    
    // Get fresh audio data
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
    const barCount = 160; // CHANGED from 128 to 160 for more coverage
    const barWidth = width / barCount;
    
    for (let i = 0; i < barCount; i++) {
        // CHANGED: Map data array indices to cover full spectrum
        const dataIndex = Math.floor((i / barCount) * this.bufferLength);
        const value = this.dataArray[dataIndex] / 255;
        const barHeight = value * height * 0.9;
        const x = i * barWidth;
        const y = height - barHeight;
        
        const hue = (i / barCount) * 360;
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
    const barCount = 180; // CHANGED from 128 to 180
    
    for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * this.bufferLength); // ADD THIS LINE
        const value = this.dataArray[dataIndex] / 255; // CHANGED from this.dataArray[i]
        const barHeight = value * maxRadius * 0.7; // ← THIS LINE WAS MISSING!
        const angle = (i / barCount) * Math.PI * 2;
            
            const x1 = centerX + Math.cos(angle) * minRadius;
            const y1 = centerY + Math.sin(angle) * minRadius;
            const x2 = centerX + Math.cos(angle) * (minRadius + barHeight);
            const y2 = centerY + Math.sin(angle) * (minRadius + barHeight);
            
            const hue = (i / barCount) * 360;
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
        
        this.fullscreenCtx.lineWidth = 3;
        this.fullscreenCtx.strokeStyle = '#dc3545';
        this.fullscreenCtx.shadowBlur = 20;
        this.fullscreenCtx.shadowColor = '#dc3545';
        
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
        
        this.fullscreenCtx.strokeStyle = '#ff7788';
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
        
        // Create particles
        for (let i = 0; i < 5; i++) {
            const value = this.dataArray[Math.floor(Math.random() * this.bufferLength)] / 255;
            
            if (value > 0.3) {
                const angle = Math.random() * Math.PI * 2;
                const speed = value * 5;
                const size = value * 10;
                const hue = Math.random() * 360;
                
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
        const pulseRadius = 50 + (avgValue * 100);
        
        const gradient = this.fullscreenCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulseRadius);
        gradient.addColorStop(0, 'rgba(220, 53, 69, 0.8)');
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

// Singleton instance
const visualizerManager = new VisualizerManager();

// Verify it loaded
console.log('✅ VisualizerManager loaded:', typeof visualizerManager);