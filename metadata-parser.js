/* ============================================
   Metadata Parser - ID3 Tag Reading
   ============================================ */

class MetadataParser {
    constructor(debugLog) {
        this.debugLog = debugLog;
    }

    async extractMetadata(file) {
        this.debugLog(`Extracting metadata from: ${file.name}`);
        
        if (typeof jsmediatags !== 'undefined') {
            return new Promise((resolve) => {
                jsmediatags.read(file, {
                    onSuccess: (tag) => {
                        this.debugLog('ID3 tags read successfully (jsmediatags)', 'success');
                        const tags = tag.tags;
                        
                        let imageData = null;
                        if (tags.picture) {
                            try {
                                const { data: pictureData, format } = tags.picture;
                                const byteArray = new Uint8Array(pictureData);
                                const blob = new Blob([byteArray], { type: format });
                                imageData = URL.createObjectURL(blob);
                                this.debugLog(`Album art extracted: ${format}, ${byteArray.length} bytes (as blob URL)`, 'success');
                            } catch (e) {
                                this.debugLog(`Error processing album art: ${e.message}`, 'error');
                            }
                        }
                        
                        const metadata = {
                            title: tags.title || file.name.split('.').slice(0, -1).join('.'),
                            artist: tags.artist || 'Unknown Artist',
                            album: tags.album || 'Unknown Album',
                            image: imageData,
                            hasMetadata: !!(tags.title || tags.artist || tags.album)
                        };
                        
                        this.debugLog(`Metadata extracted - Title: "${metadata.title}", Artist: "${metadata.artist}", Album: "${metadata.album}"`, 'success');
                        resolve(metadata);
                    },
                    onError: async (error) => {
                        this.debugLog(`jsmediatags failed: ${error.type}, falling back to manual parser`, 'warning');
                        const manualResult = await this.parseID3Manually(file);
                        resolve(manualResult);
                    }
                });
            });
        } else {
            this.debugLog('jsmediatags not available, using manual parser', 'warning');
            return await this.parseID3Manually(file);
        }
    }

    async parseID3Manually(file) {
        this.debugLog('Using manual ID3 parser');
        
        return new Promise((resolve) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const buffer = e.target.result;
                    const view = new DataView(buffer);
                    
                    if (String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2)) !== 'ID3') {
                        throw new Error('No ID3v2 tag found');
                    }
                    
                    const version = view.getUint8(3);
                    const tagSize = (view.getUint8(6) << 21) | (view.getUint8(7) << 14) | (view.getUint8(8) << 7) | view.getUint8(9);
                    
                    let metadata = { title: null, artist: null, album: null, image: null };
                    let pos = 10;

                    while (pos < tagSize + 10) {
                        if (pos + 10 > buffer.byteLength) break;
                        
                        const frameId = String.fromCharCode(view.getUint8(pos), view.getUint8(pos+1), view.getUint8(pos+2), view.getUint8(pos+3));
                        const frameSize = version === 4 
                            ? ((view.getUint8(pos+4) << 21) | (view.getUint8(pos+5) << 14) | (view.getUint8(pos+6) << 7) | view.getUint8(pos+7))
                            : ((view.getUint8(pos+4) << 24) | (view.getUint8(pos+5) << 16) | (view.getUint8(pos+6) << 8) | view.getUint8(pos+7));
                        
                        if (frameSize === 0 || frameSize > tagSize) break;
                        
                        const dataStart = pos + 10;
                        const encoding = view.getUint8(dataStart);

                        if (frameId === 'TIT2' || frameId === 'TPE1' || frameId === 'TALB') {
                            let text = '';
                            for (let i = dataStart + 1; i < dataStart + frameSize && i < buffer.byteLength; i++) {
                                const char = view.getUint8(i);
                                if (char === 0) break;
                                if (char >= 32 && char <= 126) text += String.fromCharCode(char);
                            }
                            
                            if (frameId === 'TIT2') metadata.title = text;
                            else if (frameId === 'TPE1') metadata.artist = text;
                            else if (frameId === 'TALB') metadata.album = text;
                        }
                        
                        if (frameId === 'APIC') {
                            try {
                                let imgPos = dataStart + 1;
                                while (imgPos < dataStart + frameSize && view.getUint8(imgPos) !== 0) imgPos++;
                                imgPos++; 
                                imgPos++;
                                while (imgPos < dataStart + frameSize && view.getUint8(imgPos) !== 0) imgPos++;
                                imgPos++; 
                                
                                const imgData = new Uint8Array(buffer, imgPos, dataStart + frameSize - imgPos);
                                const header = String.fromCharCode(imgData[0], imgData[1]);
                                const mimeType = (header === '\xff\xd8' || header === 'ÿØ') ? 'image/jpeg' : 'image/png';
                                
                                const blob = new Blob([imgData], { type: mimeType });
                                metadata.image = URL.createObjectURL(blob);
                                this.debugLog(`Album art extracted manually: ${imgData.length} bytes (as blob URL)`, 'success');
                            } catch (e) {
                                this.debugLog(`Error extracting album art: ${e.message}`, 'error');
                            }
                        }
                        
                        pos += 10 + frameSize;
                    }
                    
                    this.debugLog(`Manual ID3 parse - Title: "${metadata.title}", Artist: "${metadata.artist}", Album: "${metadata.album}"`, 'success');
                    resolve({
                        title: metadata.title || file.name.split('.').slice(0, -1).join('.'),
                        artist: metadata.artist || 'Unknown Artist',
                        album: metadata.album || 'Unknown Album',
                        image: metadata.image,
                        hasMetadata: !!(metadata.title || metadata.artist || metadata.album)
                    });
                } catch (err) {
                    this.debugLog(`Manual ID3 parse failed: ${err.message}`, 'error');
                    resolve({
                        title: file.name.split('.').slice(0, -1).join('.'),
                        artist: 'Unknown Artist',
                        album: 'Unknown Album',
                        image: null,
                        hasMetadata: false
                    });
                }
            };
            
            reader.onerror = () => {
                this.debugLog('FileReader error', 'error');
                resolve({
                    title: file.name.split('.').slice(0, -1).join('.'),
                    artist: 'Unknown Artist',
                    album: 'Unknown Album',
                    image: null,
                    hasMetadata: false
                });
            };
            
            reader.readAsArrayBuffer(file.slice(0, 500000));
        });
    }
}

// Export for use
window.MetadataParser = MetadataParser;