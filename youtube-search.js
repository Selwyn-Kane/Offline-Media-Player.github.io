/* ============================================
   YouTube Search - Backend Version
   Routes through backend to avoid CORS
   ============================================ */

class YouTubeSearch {
    constructor(debugLog, backendUrl) {
        this.debugLog = debugLog;
        this.backendUrl = backendUrl || 'https://music-player-backend-1-vml9.onrender.com';
    }
    
    /**
     * Search YouTube via backend
     */
    async searchTrack(query, maxResults = 1) {
        try {
            this.debugLog(`Searching YouTube via backend: "${query}"`, 'info');
            
            const response = await fetch(`${this.backendUrl}/youtube-search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    query: query,
                    maxResults: maxResults
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `Backend error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success || data.results.length === 0) {
                throw new Error('No results found');
            }
            
            this.debugLog(`✅ Found ${data.results.length} results`, 'success');
            
            return data.results;
            
        } catch (error) {
            this.debugLog(`❌ YouTube search failed: ${error.message}`, 'error');
            throw error;
        }
    }
    
    /**
     * Batch search for multiple tracks
     */
    async searchBatch(queries, onProgress = null) {
        const results = [];
        
        for (let i = 0; i < queries.length; i++) {
            try {
                const result = await this.searchTrack(queries[i]);
                results.push({
                    query: queries[i],
                    success: true,
                    result: result[0]
                });
                
                if (onProgress) {
                    onProgress(i + 1, queries.length);
                }
                
                // Rate limiting: 1 second between searches
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                results.push({
                    query: queries[i],
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }
}

window.YouTubeSearch = YouTubeSearch;