// DJ Mode UI Integration Script
(function() {
    const djModal = document.getElementById('dj-modal');
    const djModalClose = document.getElementById('dj-modal-close');
    const djStylesGrid = document.getElementById('dj-styles-grid');
    const djApplyButton = document.getElementById('dj-apply-button');
    const djReorderButton = document.getElementById('dj-reorder-button');
    const djDisableButton = document.getElementById('dj-disable-button');
    const djVisualization = document.getElementById('dj-visualization');
    const djSessionStats = document.getElementById('dj-session-stats');

    let selectedStyle = null;
    let currentMixData = null;

    // Open DJ Mode Modal
    window.openDJMode = function() {
        if (!window.djModeManager) {
            alert('DJ Mode system not initialized!');
            return;
        }

        if (window.playlist.length < 3) {
            alert('Load at least 3 analyzed tracks to use DJ Mode!');
            return;
        }

        const analyzedCount = window.playlist.filter(t => t.analysis).length;
        if (analyzedCount < 3) {
            alert(`Only ${analyzedCount} tracks have analysis data.\nAnalyze your music first for best results!`);
            return;
        }

        djModal.classList.add('show');
        populateStyles();
        
        if (window.djModeManager.enabled) {
            showActiveState();
        }
    };

    // Close modal
    djModalClose.onclick = () => {
        djModal.classList.remove('show');
    };

    // Close on overlay click
    djModal.onclick = (e) => {
        if (e.target === djModal) {
            djModal.classList.remove('show');
        }
    };

    // Populate mix styles
    function populateStyles() {
        djStylesGrid.innerHTML = '';
        
        const styles = window.djModeManager.getMixStylesList();
        
        styles.forEach(style => {
            const card = document.createElement('div');
            card.className = 'dj-style-card';
            card.innerHTML = `
                <div class="dj-style-icon">${style.icon}</div>
                <div class="dj-style-name">${style.name}</div>
                <div class="dj-style-description">${style.description}</div>
            `;
            
            card.onclick = () => selectStyle(style.id, card);
            djStylesGrid.appendChild(card);
        });
    }

    // Select a style
    function selectStyle(styleId, cardElement) {
        document.querySelectorAll('.dj-style-card').forEach(c => c.classList.remove('active'));
        cardElement.classList.add('active');
        
        selectedStyle = styleId;
        djApplyButton.disabled = false;
        
        window.debugLog(`DJ Mode: Selected ${styleId}`, 'info');
    }

    // Apply DJ Mode
djApplyButton.onclick = async () => {
    if (!selectedStyle) return;

    djApplyButton.disabled = true;
    djApplyButton.innerHTML = '<div class="dj-loading-spinner" style="width: 20px; height: 20px; border-width: 2px; margin: 0;"></div> Analyzing...';

    await new Promise(resolve => setTimeout(resolve, 300));

    const result = window.djModeManager.enableDJMode(
        window.playlist,
        window.currentTrackIndex,
        selectedStyle
    );

    if (result.playlist) {
        // ✅ FIX: Update the actual playlist reference
        window.playlist.length = 0;
        window.playlist.push(...result.playlist);
        window.currentTrackIndex = result.index;
        
        currentMixData = result.mixData;

        // ✅ FIX: Force re-render
        if (typeof window.renderPlaylist === 'function') {
            window.renderPlaylist();
        }
        if (typeof window.updatePlaylistStatus === 'function') {
            window.updatePlaylistStatus();
        }

        displayVisualization(currentMixData);
        showActiveState();

        window.debugLog('✅ DJ Mode mix applied!', 'success');
    }

    djApplyButton.innerHTML = '✨ Apply Mix';
    djApplyButton.disabled = false;
};

    // Show active DJ mode state
    function showActiveState() {
        djApplyButton.style.display = 'none';
        djReorderButton.style.display = 'inline-flex';
        djDisableButton.style.display = 'inline-flex';
        djSessionStats.classList.add('show');

        updateSessionStats();

        if (window.djStatsInterval) clearInterval(window.djStatsInterval);
        window.djStatsInterval = setInterval(updateSessionStats, 10000);
    }

    // Reorder from current position
    djReorderButton.onclick = () => {
        const reordered = window.djModeManager.reorderFromCurrent(
            window.playlist,
            window.currentTrackIndex
        );

        if (reordered) {
            window.playlist = reordered;
            window.renderPlaylist();
            window.debugLog('🔄 Playlist reordered from current track', 'info');
        }
    };

    // Disable DJ Mode
    djDisableButton.onclick = () => {
        const result = window.djModeManager.disableDJMode(
            window.playlist[window.currentTrackIndex]
        );

        window.playlist = result.playlist;
        window.currentTrackIndex = result.index;

        window.renderPlaylist();
        window.updatePlaylistStatus();

        if (window.djStatsInterval) {
            clearInterval(window.djStatsInterval);
            window.djStatsInterval = null;
        }

        djModal.classList.remove('show');
        window.debugLog('DJ Mode disabled', 'info');
    };

    // Display mix visualization
    function displayVisualization(mixData) {
        if (!mixData) return;

        djVisualization.classList.add('show');

        const quality = window.djModeManager.getMixQuality(window.playlist);
        
        document.getElementById('dj-mix-quality-value').textContent = quality.avgScore;
        
        const badge = document.getElementById('dj-mix-quality-badge');
        badge.textContent = quality.quality;
        badge.className = 'dj-stat-quality quality-' + quality.quality.toLowerCase();

        document.getElementById('dj-transitions-count').textContent = quality.transitions;

        const avgBPM = mixData.bpmCurve.reduce((sum, d) => sum + d.bpm, 0) / mixData.bpmCurve.length;
        const avgEnergy = mixData.energyCurve.reduce((sum, d) => sum + d.energy, 0) / mixData.energyCurve.length;

        document.getElementById('dj-avg-bpm').textContent = Math.round(avgBPM);
        document.getElementById('dj-avg-energy').textContent = Math.round(avgEnergy) + '%';

        drawEnergyCurve(mixData.energyCurve);
        drawBPMCurve(mixData.bpmCurve);
        displayMoodFlow(mixData.moodFlow);
    }

    // Draw energy curve
    function drawEnergyCurve(data) {
        const canvas = document.getElementById('dj-energy-curve');
        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.offsetWidth * 2;
        const height = canvas.height = canvas.offsetHeight * 2;

        ctx.clearRect(0, 0, width, height);

        if (data.length < 2) return;

        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(220, 53, 69, 0.2)');
        gradient.addColorStop(1, 'rgba(220, 53, 69, 0.0)');

        ctx.beginPath();
        ctx.moveTo(0, height);

        data.forEach((point, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - (point.energy / 100) * height;
            ctx.lineTo(x, y);
        });

        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        data.forEach((point, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - (point.energy / 100) * height;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.strokeStyle = '#dc3545';
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    // Draw BPM curve
    function drawBPMCurve(data) {
        const canvas = document.getElementById('dj-bpm-curve');
        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.offsetWidth * 2;
        const height = canvas.height = canvas.offsetHeight * 2;

        ctx.clearRect(0, 0, width, height);

        if (data.length < 2) return;

        const minBPM = Math.min(...data.map(d => d.bpm));
        const maxBPM = Math.max(...data.map(d => d.bpm));
        const range = maxBPM - minBPM || 1;

        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(23, 162, 184, 0.2)');
        gradient.addColorStop(1, 'rgba(23, 162, 184, 0.0)');

        ctx.beginPath();
        ctx.moveTo(0, height);

        data.forEach((point, i) => {
            const x = (i / (data.length - 1)) * width;
            const normalized = (point.bpm - minBPM) / range;
            const y = height - normalized * height;
            ctx.lineTo(x, y);
        });

        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        data.forEach((point, i) => {
            const x = (i / (data.length - 1)) * width;
            const normalized = (point.bpm - minBPM) / range;
            const y = height - normalized * height;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.strokeStyle = '#17a2b8';
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    // Display mood flow
    function displayMoodFlow(moodData) {
        const container = document.getElementById('dj-mood-list');
        container.innerHTML = '';

        const displayCount = Math.min(10, moodData.length);

        for (let i = 0; i < displayCount; i++) {
            const mood = moodData[i];
            const track = window.playlist[i];

            const trackEl = document.createElement('div');
            trackEl.className = 'dj-mood-track';
            trackEl.style.borderLeftColor = mood.color;

            trackEl.innerHTML = `
                <div class="dj-mood-index">${i + 1}</div>
                <span class="dj-mood-badge" style="background: ${mood.color}; color: white;">
                    ${mood.mood}
                </span>
                <div class="dj-mood-title-text">
                    ${track.metadata?.title || track.fileName}
                </div>
            `;

            container.appendChild(trackEl);
        }

        if (moodData.length > displayCount) {
            const more = document.createElement('div');
            more.style.textAlign = 'center';
            more.style.color = '#888';
            more.style.marginTop = '10px';
            more.textContent = `+ ${moodData.length - displayCount} more tracks`;
            container.appendChild(more);
        }
    }

    // Update session stats
    function updateSessionStats() {
        if (!window.djModeManager.enabled) return;

        const stats = window.djModeManager.getSessionStats();
        const infoEl = document.getElementById('dj-session-info');

        const successRate = stats.tracksPlayed > 0 
            ? Math.round((stats.successful / stats.tracksPlayed) * 100)
            : 0;

        infoEl.innerHTML = `
            <div>Tracks Played: <strong>${stats.tracksPlayed}</strong></div>
            <div>Success Rate: <strong>${successRate}%</strong></div>
            <div>Skips: <strong>${stats.skips}</strong></div>
        `;
    }

    console.log('✅ DJ Mode UI initialized');
})();