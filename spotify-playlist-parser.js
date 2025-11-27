/* ============================================
   Spotify Playlist Parser - Backend Version
   Routes through backend to avoid CORS
   ============================================ */

class SpotifyPlaylistParser {
    constructor(debugLog, backendUrl) {
        this.debugLog = debugLog;
        this.backendUrl = backendUrl || 'https://music-player-backend-1-vml9.onrender.com';
    }
    
    /**
     * Fetch Spotify data via backend
     */
    async fetchSpotifyData(url) {
        try {
            this.debugLog(`Fetching Spotify data via backend...`, 'info');
            
            const response = await fetch(`${this.backendUrl}/spotify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `Backend error: ${response.status}`);
            }
            
            const data = await response.json();
            
            this.debugLog(`✅ Got ${data.tracks.length} tracks from backend`, 'success');
            
            return data;
            
        } catch (error) {
            this.debugLog(`❌ Spotify fetch failed: ${error.message}`, 'error');
            throw error;
        }
    }
    /**
     * Manual extraction fallback when automatic methods fail
     */
    async manualExtraction() {
        return new Promise((resolve) => {
            const userInput = prompt(
                '❌ Automatic import failed.\n\n' +
                'Please manually enter track names:\n\n' +
                'Format: "Artist - Song Title" (one per line)\n\n' +
                'Or paste from Spotify (copy track list from the page)'
            );
            
            if (!userInput) {
                resolve(null);
                return;
            }
            
            // Parse pasted text
            const lines = userInput.split('\n').filter(line => line.trim());
            
            const tracks = lines.map(line => {
                const parts = line.split('-').map(s => s.trim());
                
                if (parts.length >= 2) {
                    return {
                        artist: parts[0],
                        title: parts.slice(1).join(' - '),
                        album: 'Manual Import',
                        searchQuery: `${parts[0]} ${parts.slice(1).join(' - ')}`
                    };
                }
                
                // Fallback: treat entire line as title
                return {
                    title: line.trim(),
                    artist: 'Unknown',
                    album: 'Manual Import',
                    searchQuery: line.trim()
                };
            });
            
            if (tracks.length === 0) {
                resolve(null);
                return;
            }
            
            this.debugLog(`✅ Manually imported ${tracks.length} tracks`, 'success');
            
            resolve({
                success: true,
                type: 'manual',
                title: 'Manually Imported Playlist',
                tracks: tracks
            });
        });
    }
}

window.SpotifyPlaylistParser = SpotifyPlaylistParser;