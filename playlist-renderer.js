/* ============================================
   Playlist Renderer Module
   Handles all playlist display and interaction
   ============================================ */

class PlaylistRenderer {
    constructor(debugLog) {
        this.debugLog = debugLog;
        this.playlist = [];
        this.currentTrackIndex = -1;
        this.onTrackClick = null;
        this.onEditClick = null;
        
        // DOM elements
        this.playlistItems = null;
        this.playlistSearch = null;
        this.clearButton = null;
        this.jumpToCurrentBtn = null;
        
        // Mood colors and emojis
        this.moodColors = {
            'energetic': { r: 255, g: 87, b: 51 },    // Red-Orange
            'calm': { r: 51, g: 153, b: 255 },        // Blue
            'bright': { r: 255, g: 215, b: 0 },       // Gold/Yellow
            'dark': { r: 147, g: 51, b: 234 },        // Purple
            'neutral': { r: 220, g: 53, b: 69 }       // Default red
        };
        
        this.moodEmojis = {
            'energetic': '⚡',
            'calm': '🌊',
            'bright': '☀️',
            'dark': '🌙',
            'neutral': '🎵'
        };
    }
    
    /**
     * Initialize the renderer with DOM elements
     */
    init(elements) {
        this.playlistItems = elements.playlistItems;
        this.playlistSearch = elements.playlistSearch;
        this.clearButton = elements.clearButton;
        this.jumpToCurrentBtn = elements.jumpToCurrentBtn;
        
        // Setup search functionality
        if (this.playlistSearch) {
            this.playlistSearch.oninput = (e) => this.handleSearch(e.target.value);
        }
        
        // Setup jump to current button
        if (this.jumpToCurrentBtn) {
            this.jumpToCurrentBtn.onclick = () => this.jumpToCurrent();
        }
        
        this.debugLog('✅ Playlist renderer initialized', 'success');
    }
    
    /**
     * Set callbacks
     */
    setCallbacks(callbacks) {
        this.onTrackClick = callbacks.onTrackClick;
        this.onEditClick = callbacks.onEditClick;
    }
    
    /**
     * Update playlist data
     */
    setPlaylist(playlist, currentIndex) {
        this.playlist = playlist;
        this.currentTrackIndex = currentIndex;
    }
    
    /**
     * Main render function
     */
    render() {
        if (!this.playlistItems) {
            this.debugLog('❌ Playlist items container not found', 'error');
            return;
        }
        
        this.playlistItems.innerHTML = '';
        
        // Show empty state
        if (this.playlist.length === 0) {
            this.renderEmptyState();
            return;
        }
        
        // Render tracks
        this.playlist.forEach((track, index) => {
            const item = this.createTrackItem(track, index);
            this.playlistItems.appendChild(item);
        });
        
        // Update UI elements
        this.updateSearchVisibility();
        this.updateClearButton();
        this.updateJumpButton();
        
        this.debugLog(`Playlist rendered: ${this.playlist.length} tracks`, 'success');
    }
    
    /**
     * Create a single track item element
     */
    createTrackItem(track, index) {
        const item = document.createElement('div');
        item.className = 'playlist-item';
        
        // Highlight current track
        if (index === this.currentTrackIndex) {
            item.classList.add('playing');
        }
        
        // Apply mood-based styling if analysis exists
        if (track.analysis && track.analysis.mood) {
            this.applyMoodStyling(item, track);
        }
        
        // Create track number
        const numberDiv = document.createElement('div');
        numberDiv.className = 'playlist-item-number';
        numberDiv.textContent = index + 1;
        
        // Create thumbnail
        const thumbnail = this.createThumbnail(track);
        
        // Create info section
        const infoDiv = this.createInfoSection(track);
        
        // Create edit button
        const editBtn = this.createEditButton(index);
        
        // Assemble item
        item.appendChild(numberDiv);
        item.appendChild(thumbnail);
        item.appendChild(infoDiv);
        item.appendChild(editBtn);
        
        // Click handler
        item.onclick = () => {
            if (this.onTrackClick) {
                this.onTrackClick(index);
            }
        };
        
        return item;
    }
    
    /**
     * Create thumbnail element
     */
    createThumbnail(track) {
        const thumbnail = document.createElement('div');
        thumbnail.className = 'playlist-item-thumbnail';
        
        if (track.metadata?.image) {
            const img = document.createElement('img');
            img.src = track.metadata.image;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '5px';
            thumbnail.appendChild(img);
            thumbnail.classList.add('loaded');
        } else {
            thumbnail.innerHTML = '🎵';
        }
        
        return thumbnail;
    }
    
    /**
     * Create info section with badges
     */
    createInfoSection(track) {
        const infoDiv = document.createElement('div');
        infoDiv.className = 'playlist-item-info';
        
        // Title
        const titleDiv = document.createElement('div');
        titleDiv.className = 'playlist-item-title';
        titleDiv.textContent = track.metadata?.title || track.fileName;
        
        // Artist
        const artistDiv = document.createElement('div');
        artistDiv.className = 'playlist-item-artist';
        artistDiv.textContent = track.metadata?.artist || 'Unknown Artist';
        
        infoDiv.appendChild(titleDiv);
        infoDiv.appendChild(artistDiv);
        
        // Create badges
        const badges = this.createBadges(track);
        if (badges.length > 0) {
            const badgesDiv = document.createElement('div');
            badgesDiv.className = 'playlist-item-badges';
            badges.forEach(badge => badgesDiv.appendChild(badge));
            infoDiv.appendChild(badgesDiv);
        }
        
        return infoDiv;
    }
    
    /**
     * Create badges for track features
     */
    createBadges(track) {
        const badges = [];
        
        // Lyrics badge
        if (track.vtt) {
            badges.push(this.createBadge('🎤 Lyrics', 'badge-lyrics'));
        }
        
        // Metadata badge
        if (track.metadata?.hasMetadata) {
            badges.push(this.createBadge('🏷️ ID3', 'badge-metadata'));
        }
        
        // Deep analysis badge
        if (track.hasDeepAnalysis) {
            badges.push(this.createBadge('🔍 Deep', 'badge-analysis'));
        }
        
        // Mood badge (if analysis exists)
        if (track.analysis && track.analysis.mood) {
            badges.push(this.createMoodBadge(track.analysis.mood));
        }
        
        return badges;
    }
    
    /**
     * Create a standard badge
     */
    createBadge(text, className) {
        const badge = document.createElement('span');
        badge.className = `badge ${className}`;
        badge.textContent = text;
        return badge;
    }
    
    /**
     * Create mood badge with proper styling
     */
    createMoodBadge(mood) {
        const badge = document.createElement('span');
        badge.className = 'badge badge-mood';
        
        // ✅ FIX: Normalize mood to lowercase for lookups
        const moodKey = mood.toLowerCase();
        const color = this.moodColors[moodKey] || this.moodColors.neutral;
        const emoji = this.moodEmojis[moodKey] || this.moodEmojis.neutral;
        
        const { r, g, b } = color;
        
        badge.style.cssText = `
            background: rgba(${r}, ${g}, ${b}, 0.3);
            color: rgb(${Math.min(255, r + 50)}, ${Math.min(255, g + 50)}, ${Math.min(255, b + 50)});
            border: 1px solid rgb(${r}, ${g}, ${b});
        `;
        
        // Display original mood with proper casing, but use emoji from normalized lookup
        badge.textContent = `${emoji} ${mood}`;
        
        return badge;
    }
    
    /**
     * Apply mood-based styling to track item
     */
    applyMoodStyling(item, track) {
        // ✅ FIX: Normalize mood to lowercase for color lookup
        const moodKey = track.analysis.mood.toLowerCase();
        const color = this.moodColors[moodKey] || this.moodColors.neutral;
        const { r, g, b } = color;
        
        // Apply gradient background
        const darkerR = Math.max(0, Math.floor(r * 0.2));
        const darkerG = Math.max(0, Math.floor(g * 0.2));
        const darkerB = Math.max(0, Math.floor(b * 0.2));
        const lighterR = Math.min(255, Math.floor(r * 0.4));
        const lighterG = Math.min(255, Math.floor(g * 0.4));
        const lighterB = Math.min(255, Math.floor(b * 0.4));
        
        item.style.background = `linear-gradient(90deg, rgb(${darkerR}, ${darkerG}, ${darkerB}) 0%, rgb(${lighterR}, ${lighterG}, ${lighterB}) 100%)`;
        item.style.borderColor = `rgb(${r}, ${g}, ${b})`;
    }
    
    /**
     * Create edit button
     */
    createEditButton(index) {
        const editBtn = document.createElement('button');
        editBtn.className = 'playlist-item-edit-btn';
        editBtn.innerHTML = '✏️';
        editBtn.title = 'Edit Metadata';
        
        editBtn.onclick = (e) => {
            e.stopPropagation();
            if (this.onEditClick) {
                this.onEditClick(index);
            }
        };
        
        return editBtn;
    }
    
    /**
     * Render empty state
     */
    renderEmptyState() {
        this.playlistItems.innerHTML = '<div class="empty-playlist">No tracks loaded yet. Click "Load Music & Lyrics" to get started!</div>';
        
        if (this.clearButton) {
            this.clearButton.disabled = true;
        }
    }
    
    /**
     * Update playlist highlight (when track changes)
     */
    updateHighlight(newIndex) {
        this.currentTrackIndex = newIndex;
        
        const items = this.playlistItems.querySelectorAll('.playlist-item');
        items.forEach((item, index) => {
            if (index === newIndex) {
                item.classList.add('playing');
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                item.classList.remove('playing');
            }
        });
    }
    
    /**
     * Handle search input
     */
    handleSearch(query) {
        const searchQuery = query.toLowerCase();
        const items = this.playlistItems.querySelectorAll('.playlist-item');
        
        items.forEach(item => {
            const title = item.querySelector('.playlist-item-title').textContent.toLowerCase();
            const artist = item.querySelector('.playlist-item-artist').textContent.toLowerCase();
            
            if (title.includes(searchQuery) || artist.includes(searchQuery)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }
    
    /**
     * Update search box visibility
     */
    updateSearchVisibility() {
        if (this.playlistSearch) {
            this.playlistSearch.style.display = this.playlist.length >= 10 ? 'block' : 'none';
        }
    }
    
    /**
     * Update clear button state
     */
    updateClearButton() {
        if (this.clearButton) {
            this.clearButton.disabled = this.playlist.length === 0;
        }
    }
    
    /**
     * Update jump to current button state
     */
    updateJumpButton() {
        if (this.jumpToCurrentBtn) {
            this.jumpToCurrentBtn.disabled = this.currentTrackIndex === -1;
        }
    }
    
    /**
     * Jump to currently playing track
     */
    jumpToCurrent() {
        const currentItem = this.playlistItems.querySelector('.playlist-item.playing');
        if (currentItem) {
            currentItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    /**
     * Get mood color by mood name
     */
    getMoodColor(mood) {
        // ✅ FIX: Always normalize to lowercase
        const moodKey = mood.toLowerCase();
        return this.moodColors[moodKey] || this.moodColors.neutral;
    }
}

// Export for use in main script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlaylistRenderer;
}