/* ============================================
   VTT Parser - WebVTT Lyrics Parsing
   ============================================ */

class VTTParser {
    constructor(debugLog) {
        this.debugLog = debugLog;
    }

    async validateVTT(file) {
        this.debugLog(`Validating VTT file: ${file.name}`);
        
        return new Promise((resolve) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const content = e.target.result;
                const lines = content.split('\n');
                
                if (!lines[0].trim().startsWith('WEBVTT')) {
                    this.debugLog('VTT file missing WEBVTT header!', 'error');
                    resolve({ valid: false, reason: 'Missing WEBVTT header' });
                    return;
                }
                
                const cueCount = lines.filter(line => line.includes('-->')).length;
                this.debugLog(`VTT file validated: ${cueCount} cues found`, 'success');
                resolve({ valid: true, cueCount });
            };
            
            reader.onerror = () => {
                this.debugLog('Failed to read VTT file', 'error');
                resolve({ valid: false, reason: 'File read error' });
            };
            
            reader.readAsText(file);
        });
    }

    parseVTTContent(content) {
        const cues = [];
        const lines = content.split('\n');
        let currentCue = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip empty lines and WEBVTT header
            if (line === '' || line === 'WEBVTT' || line.startsWith('WEBVTT ')) {
                continue;
            }
            
            // Check if line is a timestamp line (contains -->)
            if (line.includes('-->')) {
                // If we were already building a cue, push it before starting a new one
                if (currentCue && currentCue.text) {
                    cues.push(currentCue);
                }
                
                const parts = line.split('-->');
                if (parts.length === 2) {
                    const startTime = this.parseVTTime(parts[0].trim());
                    const endTime = this.parseVTTime(parts[1].trim().split(' ')[0]);
                    
                    currentCue = {
                        startTime: startTime,
                        endTime: endTime,
                        text: ''
                    };
                }
            } else if (currentCue && line !== '') {
                // This is text for the current cue
                if (currentCue.text !== '') {
                    currentCue.text += '\n';
                }
                currentCue.text += line;
            }
        }
        
        // Don't forget the last cue
        if (currentCue && currentCue.text) {
            cues.push(currentCue);
        }
        
        this.debugLog(`Manually parsed ${cues.length} cues from VTT file`, 'success');
        return cues;
    }

    parseVTTime(timeString) {
        const parts = timeString.split(':');
        let hours = 0, minutes = 0, seconds = 0;
        
        if (parts.length === 3) {
            hours = parseFloat(parts[0]);
            minutes = parseFloat(parts[1]);
            seconds = parseFloat(parts[2]);
        } else if (parts.length === 2) {
            minutes = parseFloat(parts[0]);
            seconds = parseFloat(parts[1]);
        } else {
            seconds = parseFloat(parts[0]);
        }
        
        return hours * 3600 + minutes * 60 + seconds;
    }

    async loadVTTFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const content = e.target.result;
                const cues = this.parseVTTContent(content);
                
                if (cues.length > 0) {
                    this.debugLog(`Successfully parsed ${cues.length} cues for custom display`, 'success');
                    resolve(cues);
                } else {
                    this.debugLog('No cues found in VTT file', 'warning');
                    resolve([]);
                }
            };
            
            reader.onerror = () => {
                this.debugLog('Failed to read VTT file', 'error');
                reject(new Error('Failed to read VTT file'));
            };
            
            reader.readAsText(file);
        });
    }
}

// Export for use
window.VTTParser = VTTParser;