/* ============================================
   Smart Playlist Generator
   Creates intelligent playlists based on music analysis
   ============================================ */

class SmartPlaylistGenerator {
    constructor(musicAnalyzer, debugLog) {
        this.analyzer = musicAnalyzer;
        this.debugLog = debugLog;
        
        // Predefined playlist templates
        this.templates = {
            workout: {
                name: '💪 High Energy Workout',
                description: 'Energetic tracks to power through your workout',
                criteria: {
                    minEnergy: 0.6,
                    minBPM: 120,
                    minDanceability: 0.5
                },
                sortBy: 'energy',
                maxTracks: 30
            },
            
            study: {
                name: '📚 Focus & Study',
                description: 'Calm, consistent tracks for concentration',
                criteria: {
                    maxEnergy: 0.4,
                    moods: ['calm', 'neutral'],
                    minDanceability: 0.3,
                    maxDanceability: 0.6
                },
                sortBy: 'consistency',
                maxTracks: 50
            },
            
            djMix: {
                name: '🎧 Seamless DJ Mix',
                description: 'BPM and key-matched tracks for smooth transitions',
                criteria: {
                    bpmRange: 10, // Within 10 BPM of each other
                    keyMatching: true
                },
                sortBy: 'bpm',
                maxTracks: 20
            },
            
            wakeUp: {
                name: '☀️ Gentle Wake Up',
                description: 'Gradually increasing energy to start your day',
                criteria: {
                    energyProgression: 'ascending',
                    minTracks: 10
                },
                sortBy: 'energy',
                maxTracks: 15
            },
            
            party: {
                name: '🎉 Party Mix',
                description: 'High energy, danceable tracks',
                criteria: {
                    minEnergy: 0.7,
                    minDanceability: 0.6,
                    moods: ['energetic', 'bright']
                },
                sortBy: 'danceability',
                maxTracks: 40
            },
            
            chill: {
                name: '😌 Chill Vibes',
                description: 'Relaxed, mellow tracks',
                criteria: {
                    maxEnergy: 0.5,
                    moods: ['calm', 'dark', 'neutral'],
                    maxBPM: 110
                },
                sortBy: 'energy',
                reverse: true,
                maxTracks: 30
            },
            
            runJog: {
                name: '🏃 Running Pace',
                description: 'Consistent tempo for running',
                criteria: {
                    bpmRange: [150, 180],
                    minDanceability: 0.5
                },
                sortBy: 'bpm',
                maxTracks: 25
            },
            
            sleep: {
                name: '😴 Sleep & Relaxation',
                description: 'Descending energy for winding down',
                criteria: {
                    maxEnergy: 0.3,
                    energyProgression: 'descending',
                    moods: ['calm', 'dark']
                },
                sortBy: 'energy',
                reverse: true,
                maxTracks: 20
            }
        };
    }
    
    /**
     * Generate a playlist based on template
     */
    async generatePlaylist(templateName, analyzedTracks, customCriteria = {}) {
        const template = this.templates[templateName];
        if (!template) {
            this.debugLog(`Unknown template: ${templateName}`, 'error');
            return null;
        }
        
        this.debugLog(`Generating playlist: ${template.name}`, 'info');
        
        // Merge template criteria with custom criteria
        const criteria = { ...template.criteria, ...customCriteria };
        
        // Filter tracks based on criteria
        let filtered = this.filterTracks(analyzedTracks, criteria);
        
        this.debugLog(`Filtered to ${filtered.length} tracks`, 'info');
        
        if (filtered.length === 0) {
            this.debugLog('No tracks match criteria', 'warning');
            return null;
        }
        
        // Sort tracks
        filtered = this.sortTracks(filtered, template.sortBy, template.reverse);
        
        // Apply energy progression if needed
        if (criteria.energyProgression) {
            filtered = this.applyEnergyProgression(filtered, criteria.energyProgression);
        }
        
        // Limit number of tracks
        if (template.maxTracks) {
            filtered = filtered.slice(0, template.maxTracks);
        }
        
        this.debugLog(`Created playlist with ${filtered.length} tracks`, 'success');
        
        return {
            name: template.name,
            description: template.description,
            tracks: filtered,
            stats: this.calculatePlaylistStats(filtered)
        };
    }
    
    /**
     * Filter tracks based on criteria
     */
    filterTracks(tracks, criteria) {
        return tracks.filter(track => {
            const analysis = track.analysis;
            if (!analysis) return false;
            
            // Energy filter
            if (criteria.minEnergy !== undefined && analysis.energy < criteria.minEnergy) {
                return false;
            }
            if (criteria.maxEnergy !== undefined && analysis.energy > criteria.maxEnergy) {
                return false;
            }
            
            // BPM filter
            if (criteria.minBPM !== undefined && analysis.bpm < criteria.minBPM) {
                return false;
            }
            if (criteria.maxBPM !== undefined && analysis.bpm > criteria.maxBPM) {
                return false;
            }
            if (criteria.bpmRange && Array.isArray(criteria.bpmRange)) {
                const [min, max] = criteria.bpmRange;
                if (analysis.bpm < min || analysis.bpm > max) {
                    return false;
                }
            }
            
            // Danceability filter
            if (criteria.minDanceability !== undefined && analysis.danceability < criteria.minDanceability) {
                return false;
            }
            if (criteria.maxDanceability !== undefined && analysis.danceability > criteria.maxDanceability) {
                return false;
            }
            
            // Mood filter
            if (criteria.moods && !criteria.moods.includes(analysis.mood)) {
                return false;
            }
            
            return true;
        });
    }
    
    /**
     * Sort tracks by various criteria
     */
    sortTracks(tracks, sortBy, reverse = false) {
        const sorted = [...tracks].sort((a, b) => {
            let aVal, bVal;
            
            switch (sortBy) {
                case 'energy':
                    aVal = a.analysis.energy;
                    bVal = b.analysis.energy;
                    break;
                case 'bpm':
                    aVal = a.analysis.bpm;
                    bVal = b.analysis.bpm;
                    break;
                case 'danceability':
                    aVal = a.analysis.danceability;
                    bVal = b.analysis.danceability;
                    break;
                case 'consistency':
                    // Lower variance in energy = more consistent
                    aVal = Math.abs(0.5 - a.analysis.energy);
                    bVal = Math.abs(0.5 - b.analysis.energy);
                    break;
                default:
                    return 0;
            }
            
            return reverse ? bVal - aVal : aVal - bVal;
        });
        
        return sorted;
    }
    
    /**
     * Apply energy progression (ascending/descending)
     */
    applyEnergyProgression(tracks, direction) {
        if (direction === 'ascending') {
            return tracks.sort((a, b) => a.analysis.energy - b.analysis.energy);
        } else if (direction === 'descending') {
            return tracks.sort((a, b) => b.analysis.energy - a.analysis.energy);
        }
        return tracks;
    }
    
    /**
     * Create seamless DJ mix (BPM and key matching)
     */
    createSeamlessMix(tracks, startBPM = null, startKey = null) {
        if (tracks.length === 0) return [];
        
        const mix = [];
        let currentTrack = null;
        
        // Find starting track
        if (startBPM || startKey) {
            currentTrack = tracks.find(t => 
                (!startBPM || Math.abs(t.analysis.bpm - startBPM) < 5) &&
                (!startKey || t.analysis.key === startKey)
            );
        }
        
        if (!currentTrack) {
            currentTrack = tracks[0];
        }
        
        mix.push(currentTrack);
        const remaining = tracks.filter(t => t !== currentTrack);
        
        // Build mix by finding best matches
        while (remaining.length > 0 && mix.length < 20) {
            const last = mix[mix.length - 1];
            
            // Find track with closest BPM and matching/compatible key
            const next = remaining.reduce((best, track) => {
                const bpmDiff = Math.abs(track.analysis.bpm - last.analysis.bpm);
                const keyMatch = track.analysis.key === last.analysis.key ? 0 : 1;
                const score = bpmDiff + (keyMatch * 10);
                
                if (!best || score < best.score) {
                    return { track, score };
                }
                return best;
            }, null);
            
            if (next) {
                mix.push(next.track);
                remaining.splice(remaining.indexOf(next.track), 1);
            } else {
                break;
            }
        }
        
        this.debugLog(`Created seamless mix with ${mix.length} tracks`, 'success');
        return mix;
    }
    
    /**
     * Calculate playlist statistics
     */
    calculatePlaylistStats(tracks) {
        if (tracks.length === 0) return null;
        
        const stats = {
            trackCount: tracks.length,
            totalDuration: tracks.reduce((sum, t) => sum + (t.analysis.duration || 0), 0),
            avgBPM: tracks.reduce((sum, t) => sum + t.analysis.bpm, 0) / tracks.length,
            avgEnergy: tracks.reduce((sum, t) => sum + t.analysis.energy, 0) / tracks.length,
            avgDanceability: tracks.reduce((sum, t) => sum + t.analysis.danceability, 0) / tracks.length,
            moods: this.getMoodDistribution(tracks),
            tempos: this.getTempoDistribution(tracks)
        };
        
        // Format duration
        const hours = Math.floor(stats.totalDuration / 3600);
        const minutes = Math.floor((stats.totalDuration % 3600) / 60);
        stats.durationFormatted = hours > 0 
            ? `${hours}h ${minutes}m` 
            : `${minutes}m`;
        
        return stats;
    }
    
    /**
     * Get mood distribution
     */
    getMoodDistribution(tracks) {
        const moods = {};
        tracks.forEach(t => {
            const mood = t.analysis.mood;
            moods[mood] = (moods[mood] || 0) + 1;
        });
        return moods;
    }
    
    /**
     * Get tempo distribution
     */
    getTempoDistribution(tracks) {
        const tempos = {};
        tracks.forEach(t => {
            const tempo = t.analysis.tempo;
            tempos[tempo] = (tempos[tempo] || 0) + 1;
        });
        return tempos;
    }
    
    /**
     * Find similar tracks
     */
    findSimilar(referenceTrack, allTracks, limit = 10) {
        const ref = referenceTrack.analysis;
        
        const scored = allTracks
            .filter(t => t !== referenceTrack)
            .map(track => {
                const analysis = track.analysis;
                
                // Calculate similarity score (lower is more similar)
                const bpmDiff = Math.abs(analysis.bpm - ref.bpm);
                const energyDiff = Math.abs(analysis.energy - ref.energy);
                const danceabilityDiff = Math.abs(analysis.danceability - ref.danceability);
                const moodMatch = analysis.mood === ref.mood ? 0 : 0.5;
                const keyMatch = analysis.key === ref.key ? 0 : 0.3;
                
                const score = bpmDiff * 0.5 + energyDiff * 2 + danceabilityDiff + moodMatch + keyMatch;
                
                return { track, score };
            })
            .sort((a, b) => a.score - b.score)
            .slice(0, limit);
        
        return scored.map(s => s.track);
    }
    
    /**
     * Get all template names
     */
    getTemplateNames() {
        return Object.keys(this.templates);
    }
    
    /**
     * Get template info
     */
    getTemplateInfo(templateName) {
        const template = this.templates[templateName];
        if (!template) return null;
        
        return {
            name: template.name,
            description: template.description,
            maxTracks: template.maxTracks
        };
    }
}

// Export
window.SmartPlaylistGenerator = SmartPlaylistGenerator;