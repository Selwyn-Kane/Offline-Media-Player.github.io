/* ============================================
   Mobile Integration - ENHANCED VERSION
   Touch, Responsive, Haptic, Pull-to-Refresh
   ============================================ */

// Detect if user is on mobile
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isAndroid = /Android/i.test(navigator.userAgent);

console.log(`📱 Mobile detected: ${isMobile}, iOS: ${isIOS}, Android: ${isAndroid}`);

// Only run mobile code if on mobile device
if (isMobile) {
    document.addEventListener('DOMContentLoaded', () => {
        initMobile();
    });
}

function initMobile() {
    console.log('🚀 Initializing mobile optimizations...');
    
    // 1. Prevent zoom on double-tap
    preventZoom();
    
    // 2. Add touch feedback
    addTouchFeedback();
    
    // 3. Make buttons bigger for touch
    enlargeButtons();
    
    // 4. Add swipe gestures
    addSwipeGestures();
    
    // 5. Fix iOS audio unlock
    if (isIOS) {
        fixIOSAudio();
    }
    
    // 6. Optimize for small screens
    optimizeLayout();
    
    // 7. Handle screen rotation
    handleRotation();
    
    // 8. Add mobile-specific controls
    addMobileControls();
    
    // 9. Prevent accidental scrolling
    preventBodyScroll();
    
    // 10. File loading for mobile
    fixMobileFileLoading();
    
    // ========== NEW ENHANCEMENTS ==========
    
    // 11. Add haptic feedback
    setupHapticFeedback();
    
    // 12. Add pull-to-refresh
    setupPullToRefresh();
    
    // 13. Add gesture indicators
    addGestureIndicators();
    
    // 14. Add mobile context menu
    addMobileContextMenu();
    
    console.log('✅ Mobile initialization complete (Enhanced)');
}

// ========== 15. FIX BUTTON SCROLL BLOCKING (NEW) ==========
function fixButtonScrolling() {
    // Allow scroll to continue even when touch starts on a button
    document.addEventListener('touchstart', (e) => {
        if (e.target.tagName === 'BUTTON' || 
            e.target.tagName === 'INPUT' ||
            e.target.classList.contains('eq-slider')) {
            // Don't stop propagation - allow scrolling
            e.target.style.pointerEvents = 'auto';
        }
    }, { passive: true });
    
    console.log('✅ Button scroll blocking fixed');
}

// ========== 1. PREVENT ZOOM ==========
function preventZoom() {
    document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gestureend', (e) => e.preventDefault(), { passive: false });
    
    let lastTouchEnd = 0;
    let lastTouchTarget = null;
    
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        const target = e.target;
        
        if (target === lastTouchTarget && now - lastTouchEnd <= 300) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        lastTouchEnd = now;
        lastTouchTarget = target;
    }, { passive: false });
}

// ========== 2. TOUCH FEEDBACK ==========
function addTouchFeedback() {
    const buttons = document.querySelectorAll('button');
    
    buttons.forEach(btn => {
        btn.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.95)';
            this.style.opacity = '0.8';
        }, { passive: true });
        
        btn.addEventListener('touchend', function() {
            this.style.transform = '';
            this.style.opacity = '';
        }, { passive: true });
    });
}

// ========== 3. ENLARGE BUTTONS ==========
function enlargeButtons() {
    const style = document.createElement('style');
    style.textContent = `
        @media (max-width: 768px) {
            button {
                padding: 16px 20px !important;
                font-size: 16px !important;
                min-height: 48px;
                min-width: 48px;
            }
            
            #controls {
                gap: 10px !important;
                justify-content: space-around !important;
            }
            
            .playlist-item {
                padding: 16px !important;
                min-height: 70px;
            }
            
            #volume-slider,
            .eq-slider {
                min-height: 44px;
            }
            
            .lyric-line {
                font-size: 1.5em !important;
                padding: 15px 10px;
            }
            
            .lyric-line.active {
                font-size: 1.8em !important;
            }
        }
        
        @media (max-width: 480px) {
            button {
                font-size: 14px !important;
                padding: 14px 16px !important;
            }
            
            #metadata-container {
                flex-direction: column !important;
                text-align: center !important;
            }
            
            #cover-art-container {
                width: 250px !important;
                height: 250px !important;
            }
        }
    `;
    document.head.appendChild(style);
}

// ========== 4. SWIPE GESTURES (ENHANCED) ==========
function addSwipeGestures() {
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let touchEndY = 0;
    let preventScroll = false;
    
    const metadataContainer = document.getElementById('metadata-container');
    
    metadataContainer.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
        preventScroll = false;
    }, { passive: true });
    
    // NEW: Prevent scrolling during horizontal swipes
    metadataContainer.addEventListener('touchmove', (e) => {
        const currentX = e.changedTouches[0].screenX;
        const currentY = e.changedTouches[0].screenY;
        const diffX = Math.abs(currentX - touchStartX);
        const diffY = Math.abs(currentY - touchStartY);
        
        if (diffX > diffY && diffX > 10) {
            preventScroll = true;
            e.preventDefault();
        }
    }, { passive: false });
    
    metadataContainer.addEventListener('touchend', (e) => {
        e.stopPropagation();
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
        preventScroll = false;
    }, { passive: true });
    
    function handleSwipe() {
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;
        
        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (Math.abs(diffX) > 50) {
                if (diffX > 0) {
                    const prevBtn = document.getElementById('prev-button');
                    if (prevBtn && !prevBtn.disabled) {
                        prevBtn.click();
                        showSwipeFeedback('⏮️ Previous');
                        triggerHaptic('medium'); // NEW
                    }
                } else {
                    const nextBtn = document.getElementById('next-button');
                    if (nextBtn && !nextBtn.disabled) {
                        nextBtn.click();
                        showSwipeFeedback('⏭️ Next');
                        triggerHaptic('medium'); // NEW
                    }
                }
            }
        }
    }
    
    function showSwipeFeedback(text) {
        const feedback = document.createElement('div');
        feedback.textContent = text;
        feedback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px 40px;
            border-radius: 10px;
            font-size: 1.5em;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            feedback.style.opacity = '0';
            feedback.style.transition = 'opacity 0.3s ease';
        }, 500);
        
        setTimeout(() => {
            document.body.removeChild(feedback);
        }, 800);
    }
}

// ========== 5. FIX iOS AUDIO ==========
function fixIOSAudio() {
    let unlocked = false;
    
    const unlockAudio = async () => {
        if (unlocked) return;
        
        const player = document.getElementById('audio-player');
        if (!player) return;
        
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const buffer = audioCtx.createBuffer(1, 1, 22050);
            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(audioCtx.destination);
            source.start(0);
            
            await audioCtx.resume();
            
            await player.play();
            player.pause();
            player.currentTime = 0;
            
            unlocked = true;
            console.log('✅ iOS audio unlocked');
        } catch (err) {
            console.log('⚠️ iOS audio unlock failed, will retry:', err.message);
        }
    };
    
    document.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
    document.addEventListener('touchend', unlockAudio, { once: true, passive: true });
    document.addEventListener('click', unlockAudio, { once: true });
}

// ========== 6. OPTIMIZE LAYOUT ==========
function optimizeLayout() {
    const compactToggle = document.getElementById('compact-toggle');
    if (compactToggle && window.innerWidth <= 768) {
        setTimeout(() => {
            if (typeof setCompactMode === 'function') {
                setCompactMode('compact');
                console.log('📱 Auto-enabled compact mode for mobile');
            }
        }, 1000);
    }
}

// ========== 7. HANDLE ROTATION ==========
function handleRotation() {
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            const canvas = document.getElementById('visualizer');
            if (canvas) {
                canvas.width = canvas.offsetWidth;
                canvas.height = canvas.offsetHeight;
            }
            
            console.log('📱 Screen rotated, layout updated');
        }, 100);
    });
}

// ========== 8. MOBILE CONTROLS ==========
function addMobileControls() {
    const floatingBtn = document.createElement('button');
    floatingBtn.id = 'mobile-play-btn';
    floatingBtn.innerHTML = '▶️';
    floatingBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
        color: white;
        font-size: 24px;
        border: none;
        box-shadow: 0 4px 20px rgba(220, 53, 69, 0.5);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    `;
    
    floatingBtn.addEventListener('click', () => {
        const player = document.getElementById('audio-player');
        if (player) {
            if (player.paused) {
                player.play();
                floatingBtn.innerHTML = '⏸️';
                triggerHaptic('light'); // NEW
            } else {
                player.pause();
                floatingBtn.innerHTML = '▶️';
                triggerHaptic('light'); // NEW
            }
        }
    });
    
    document.body.appendChild(floatingBtn);
    
    const player = document.getElementById('audio-player');
    if (player) {
        player.addEventListener('play', () => {
            floatingBtn.innerHTML = '⏸️';
        });
        
        player.addEventListener('pause', () => {
            floatingBtn.innerHTML = '▶️';
        });
    }
}

// ========== 9. PREVENT BODY SCROLL (FIXED) ==========
function preventBodyScroll() {
    // Only prevent scroll on body itself, not on scrollable containers
    let isScrolling = false;
    
    document.body.addEventListener('touchmove', (e) => {
        // Check if touch is in a scrollable container
        let element = e.target;
        let inScrollContainer = false;
        
        const scrollContainers = ['playlist-items', 'lyrics-display', 'debug-panel', 'download-modal-body'];
        
        while (element && element !== document.body) {
            if (scrollContainers.includes(element.id) || 
                element.classList.contains('metadata-editor-body')) {
                inScrollContainer = true;
                break;
            }
            element = element.parentElement;
        }
        
        // NEW FIX: Allow scrolling anywhere when not explicitly blocked
        if (!inScrollContainer) {
            // Don't prevent default - allow natural scrolling
            return;
        }
    }, { passive: true }); // Changed to passive
}

// ========== 10. FIX MOBILE FILE LOADING ==========
function fixMobileFileLoading() {
    const loadButton = document.getElementById('load-button');
    const folderButton = document.getElementById('folder-button');
    
    if (folderButton && !('showDirectoryPicker' in window)) {
        folderButton.style.display = 'none';
        console.log('📱 Folder picker hidden (not supported on mobile)');
    }
    
    if (loadButton) {
        loadButton.style.cssText += `
            font-size: 18px !important;
            padding: 20px 30px !important;
            font-weight: bold;
        `;
    }
    
    const helperText = document.createElement('div');
    helperText.textContent = 'Tap "Load Music & Lyrics" to select files from your device';
    helperText.style.cssText = `
        text-align: center;
        color: #888;
        font-size: 14px;
        margin-top: 10px;
        margin-bottom: 10px;
    `;
    
    if (loadButton && loadButton.parentNode) {
        loadButton.parentNode.insertBefore(helperText, loadButton.nextSibling);
    }
}

// ========== 11. HAPTIC FEEDBACK (NEW) ==========
function setupHapticFeedback() {
    // Make haptic function globally available
    window.triggerHaptic = function(type = 'light') {
        if ('vibrate' in navigator) {
            const patterns = {
                light: [10],
                medium: [20],
                heavy: [30],
                success: [10, 50, 10],
                error: [50, 100, 50],
                warning: [20, 40, 20]
            };
            
            navigator.vibrate(patterns[type] || patterns.light);
        }
    };
    
    console.log('✅ Haptic feedback system initialized');
}

// ========== 12. PULL-TO-REFRESH (NEW) ==========
function setupPullToRefresh() {
    class PullToRefresh {
        constructor(element, onRefresh) {
            this.element = element;
            this.onRefresh = onRefresh;
            this.startY = 0;
            this.currentY = 0;
            this.isDragging = false;
            this.threshold = 80;
            this.maxDistance = 150;
            
            this.setupListeners();
        }
        
        setupListeners() {
            this.element.addEventListener('touchstart', (e) => {
                if (this.element.scrollTop === 0) {
                    this.startY = e.touches[0].pageY;
                    this.isDragging = true;
                }
            }, { passive: true });
            
            this.element.addEventListener('touchmove', (e) => {
                if (!this.isDragging) return;
                
                this.currentY = e.touches[0].pageY;
                const diff = this.currentY - this.startY;
                
                if (diff > 0 && diff < this.maxDistance) {
                    e.preventDefault();
                    this.showPullIndicator(diff);
                }
            }, { passive: false });
            
            this.element.addEventListener('touchend', () => {
                if (!this.isDragging) return;
                
                const diff = this.currentY - this.startY;
                
                if (diff > this.threshold) {
                    this.triggerRefresh();
                } else {
                    this.hidePullIndicator();
                }
                
                this.isDragging = false;
            }, { passive: true });
        }
        
        showPullIndicator(distance) {
            const progress = Math.min(distance / this.threshold, 1);
            const indicator = this.getOrCreateIndicator();
            
            indicator.style.transform = `translateY(${Math.min(distance, this.maxDistance)}px)`;
            indicator.style.opacity = progress;
            
            if (progress >= 1) {
                indicator.innerHTML = '🔄 Release to refresh';
                triggerHaptic('light');
            } else {
                indicator.innerHTML = '⬇️ Pull to refresh';
            }
        }
        
        hidePullIndicator() {
            const indicator = document.getElementById('pull-refresh-indicator');
            if (indicator) {
                indicator.style.transform = 'translateY(-100%)';
                indicator.style.opacity = '0';
            }
        }
        
        getOrCreateIndicator() {
            let indicator = document.getElementById('pull-refresh-indicator');
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'pull-refresh-indicator';
                indicator.style.cssText = `
                    position: absolute;
                    top: -50px;
                    left: 0;
                    width: 100%;
                    height: 50px;
                    background: #1a1a1a;
                    color: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    transition: all 0.3s ease;
                    z-index: 1000;
                    border-bottom: 2px solid #dc3545;
                `;
                this.element.style.position = 'relative';
                this.element.prepend(indicator);
            }
            return indicator;
        }
        
        async triggerRefresh() {
            const indicator = this.getOrCreateIndicator();
            indicator.innerHTML = '⏳ Refreshing...';
            indicator.style.transform = 'translateY(0)';
            indicator.style.opacity = '1';
            
            try {
                await this.onRefresh();
                indicator.innerHTML = '✅ Refreshed!';
                triggerHaptic('success');
            } catch (err) {
                indicator.innerHTML = '❌ Refresh failed';
                triggerHaptic('error');
                console.error('Refresh error:', err);
            }
            
            setTimeout(() => this.hidePullIndicator(), 1500);
        }
    }
    
    // Wait for DOM to be fully loaded
    setTimeout(() => {
        const playlistContainer = document.getElementById('playlist-items');
        if (playlistContainer) {
            window.pullToRefreshInstance = new PullToRefresh(playlistContainer, async () => {
                // Reload folder if available
                if (typeof folderHandle !== 'undefined' && folderHandle) {
                    if (typeof loadFromFolder === 'function') {
                        await loadFromFolder();
                    }
                } else {
                    console.log('No folder to refresh');
                }
            });
            console.log('✅ Pull-to-refresh initialized');
        }
    }, 2000);
}

// ========== 13. GESTURE INDICATORS (NEW) ==========
function addGestureIndicators() {
    const style = document.createElement('style');
    style.textContent = `
        .gesture-hint {
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 9998;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s ease;
            border: 1px solid #dc3545;
        }
        
        .gesture-hint.show {
            opacity: 1;
        }
    `;
    document.head.appendChild(style);
    
    const hint = document.createElement('div');
    hint.className = 'gesture-hint';
    hint.textContent = '⬅️ Swipe for previous/next ➡️';
    document.body.appendChild(hint);
    
    // Show hint on first load
    setTimeout(() => {
        if (!localStorage.getItem('gesture-hint-shown')) {
            hint.classList.add('show');
            setTimeout(() => {
                hint.classList.remove('show');
            }, 3000);
            localStorage.setItem('gesture-hint-shown', 'true');
        }
    }, 2000);
}

// ========== 14. MOBILE CONTEXT MENU (NEW) ==========
function addMobileContextMenu() {
    // Long-press on track for options
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            const playlistItems = document.getElementById('playlist-items');
            if (!playlistItems) return;
            
            let pressTimer;
            
            playlistItems.addEventListener('touchstart', (e) => {
                const item = e.target.closest('.playlist-item');
                if (!item) return;
                
                pressTimer = setTimeout(() => {
                    showContextMenu(item, e.touches[0].pageX, e.touches[0].pageY);
                    triggerHaptic('heavy');
                }, 500);
            }, { passive: true });
            
            playlistItems.addEventListener('touchend', () => {
                clearTimeout(pressTimer);
            });
            
            playlistItems.addEventListener('touchmove', () => {
                clearTimeout(pressTimer);
            });
        }, 2000);
    });
    
    function showContextMenu(item, x, y) {
        // Remove existing menu
        const existing = document.getElementById('mobile-context-menu');
        if (existing) existing.remove();
        
        const menu = document.createElement('div');
        menu.id = 'mobile-context-menu';
        menu.style.cssText = `
            position: fixed;
            left: ${Math.min(x, window.innerWidth - 200)}px;
            top: ${Math.min(y, window.innerHeight - 150)}px;
            background: #1a1a1a;
            border: 2px solid #dc3545;
            border-radius: 10px;
            padding: 10px;
            z-index: 10001;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.8);
        `;
        
        const options = [
            { icon: '▶️', text: 'Play Now', action: () => item.click() },
            { icon: '➕', text: 'Add to Queue', action: () => console.log('Queue feature') },
            { icon: 'ℹ️', text: 'Show Info', action: () => showTrackInfo(item) },
            { icon: '❌', text: 'Cancel', action: () => menu.remove() }
        ];
        
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.innerHTML = `${opt.icon} ${opt.text}`;
            btn.style.cssText = `
                width: 100%;
                padding: 12px 16px;
                margin: 4px 0;
                background: #222;
                color: white;
                border: none;
                border-radius: 6px;
                text-align: left;
                font-size: 14px;
                cursor: pointer;
            `;
            btn.onclick = () => {
                opt.action();
                menu.remove();
            };
            menu.appendChild(btn);
        });
        
        document.body.appendChild(menu);
        
        // Auto-close after 5 seconds
        setTimeout(() => {
            if (menu.parentNode) menu.remove();
        }, 5000);
    }
    
    function showTrackInfo(item) {
        const title = item.querySelector('.playlist-item-title')?.textContent || 'Unknown';
        const artist = item.querySelector('.playlist-item-artist')?.textContent || 'Unknown';
        
        alert(`🎵 Track Info\n\nTitle: ${title}\nArtist: ${artist}`);
    }
}

// ========== INSTALL PROMPT ==========
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    const installBtn = document.createElement('button');
    installBtn.textContent = '📲 Install App';
    installBtn.id = 'install-btn';
    installBtn.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%);
        animation: pulse 2s infinite;
    `;
    
    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`📲 Install ${outcome}`);
            deferredPrompt = null;
            installBtn.remove();
        }
    });
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(installBtn);
});

window.addEventListener('appinstalled', () => {
    const installBtn = document.getElementById('install-btn');
    if (installBtn) installBtn.remove();
    console.log('✅ App installed successfully');
});

console.log('✅ mobile.js loaded (ENHANCED VERSION)');