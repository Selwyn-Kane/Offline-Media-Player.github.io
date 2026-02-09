/* ============================================
   Complete Multi-Format Metadata Parser
   Supports: MP3, M4A, FLAC, OGG, WAV, AAC, WMA
   ============================================ */

class MetadataParser {
    constructor(debugLog) {
        this.debugLog = debugLog;
    }

    async extractMetadata(file) {
        this.debugLog(`Extracting metadata from: ${file.name}`);
        
        const extension = file.name.split('.').pop().toLowerCase();
        
        try {
            let metadata;
            
            switch(extension) {
                case 'mp3':
                    metadata = await this.parseMP3(file);
                    break;
                case 'm4a':
                case 'mp4':
                case 'aac':
                    metadata = await this.parseM4A(file);
                    break;
                case 'flac':
                    metadata = await this.parseFLAC(file);
                    break;
                case 'ogg':
                    metadata = await this.parseOGG(file);
                    break;
                case 'wav':
                    metadata = await this.parseWAV(file);
                    break;
                case 'wma':
                    metadata = await this.parseWMA(file);
                    break;
                default:
                    this.debugLog(`Unsupported format: ${extension}`, 'warning');
                    metadata = this.getDefaultMetadata(file);
            }
            
            // Validate metadata before returning
            if (!metadata.title) {
                metadata.title = file.name.replace(/\.[^/.]+$/, '');
                this.debugLog(`Warning: Title was empty, using filename: ${metadata.title}`, 'warning');
            }
            
            this.debugLog(`Metadata extracted - Title: "${metadata.title}", Artist: "${metadata.artist || 'Unknown'}"`, 'success');
            return metadata;
            
        } catch (err) {
            this.debugLog(`Metadata extraction failed: ${err.message}`, 'error');
            return this.getDefaultMetadata(file);
        }
    }

    // ========== MP3 / ID3v2 Parser ==========
    async parseMP3(file) {
        const buffer = await this.readFileChunk(file, 0, 500000);
        const view = new DataView(buffer);
        
        if (String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2)) !== 'ID3') {
            throw new Error('No ID3v2 tag found');
        }
        
        const version = view.getUint8(3);
        const tagSize = this.synchsafe32(view, 6);
        
        let metadata = { title: null, artist: null, album: null, year: null, image: null };
        let pos = 10;

        while (pos < tagSize + 10) {
            if (pos + 10 > buffer.byteLength) break;
            
            const frameId = String.fromCharCode(
                view.getUint8(pos), view.getUint8(pos+1), 
                view.getUint8(pos+2), view.getUint8(pos+3)
            );
            
            const frameSize = version === 4 
                ? this.synchsafe32(view, pos + 4)
                : view.getUint32(pos + 4);
            
            if (frameSize === 0 || frameSize > tagSize) break;
            
            const dataStart = pos + 10;
            const encoding = view.getUint8(dataStart);

            // Text frames
            if (frameId === 'TIT2') metadata.title = this.decodeText(view, dataStart + 1, frameSize - 1, encoding);
            if (frameId === 'TPE1') metadata.artist = this.decodeText(view, dataStart + 1, frameSize - 1, encoding);
            if (frameId === 'TALB') metadata.album = this.decodeText(view, dataStart + 1, frameSize - 1, encoding);
            if (frameId === 'TYER' || frameId === 'TDRC') {
                const yearText = this.decodeText(view, dataStart + 1, frameSize - 1, encoding);
                metadata.year = parseInt(yearText);
            }
            
            // Album art
            if (frameId === 'APIC') {
                metadata.image = this.extractID3Image(view, dataStart, frameSize);
            }
            
            pos += 10 + frameSize;
        }
        
        return this.normalizeMetadata(metadata, file);
    }

    // ========== M4A / MP4 Parser ==========
    async parseM4A(file) {
        const buffer = await this.readFileChunk(file, 0, 200000);
        const view = new DataView(buffer);
        
        let metadata = { title: null, artist: null, album: null, year: null, image: null };
        let pos = 0;

        // Find 'moov' atom
        while (pos < buffer.byteLength - 8) {
            const atomSize = view.getUint32(pos);
            const atomType = String.fromCharCode(
                view.getUint8(pos+4), view.getUint8(pos+5), 
                view.getUint8(pos+6), view.getUint8(pos+7)
            );
            
            if (atomType === 'moov') {
                // Find 'udta' -> 'meta' -> 'ilst'
                const ilst = this.findAtom(view, pos + 8, atomSize - 8, ['udta', 'meta', 'ilst']);
                if (ilst) {
                    metadata = this.parseILST(view, ilst.pos, ilst.size);
                }
                break;
            }
            
            pos += atomSize;
        }
        
        return this.normalizeMetadata(metadata, file);
    }

    parseILST(view, start, size) {
        const metadata = { title: null, artist: null, album: null, year: null, image: null };
        let pos = start;
        const end = start + size;

        while (pos < end - 8) {
            const atomSize = view.getUint32(pos);
            if (atomSize === 0 || atomSize > (end - pos)) break;
            
            const atomType = String.fromCharCode(
                view.getUint8(pos+4), view.getUint8(pos+5), 
                view.getUint8(pos+6), view.getUint8(pos+7)
            );
            
            // Find 'data' atom inside
            const dataPos = pos + 8;
            const dataSize = view.getUint32(dataPos);
            const dataType = String.fromCharCode(
                view.getUint8(dataPos+4), view.getUint8(dataPos+5), 
                view.getUint8(dataPos+6), view.getUint8(dataPos+7)
            );
            
            if (dataType === 'data') {
                const dataFlags = view.getUint32(dataPos + 8);
                const textStart = dataPos + 16;
                const textLen = dataSize - 16;
                
                // Type 1 = text
                if (dataFlags === 1) {
                    const text = this.decodeText(view, textStart, textLen, 1); // UTF-8
                    
                    if (atomType === '©nam') metadata.title = text;
                    if (atomType === '©ART') metadata.artist = text;
                    if (atomType === '©alb') metadata.album = text;
                    if (atomType === '©day') metadata.year = parseInt(text);
                }
                
                // Type 13 = JPEG, Type 14 = PNG
                if ((dataFlags === 13 || dataFlags === 14) && atomType === 'covr') {
                    const imageData = new Uint8Array(view.buffer, textStart, textLen);
                    const mimeType = dataFlags === 13 ? 'image/jpeg' : 'image/png';
                    const blob = new Blob([imageData], { type: mimeType });
                    metadata.image = URL.createObjectURL(blob);
                }
            }
            
            pos += atomSize;
        }
        
        return metadata;
    }

    // ========== FLAC Parser ==========
    async parseFLAC(file) {
        const buffer = await this.readFileChunk(file, 0, 200000);
        const view = new DataView(buffer);
        
        // Check for 'fLaC' marker
        if (String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)) !== 'fLaC') {
            throw new Error('Not a valid FLAC file');
        }
        
        let metadata = { title: null, artist: null, album: null, year: null, image: null };
        let pos = 4;

        while (pos < buffer.byteLength - 4) {
            const header = view.getUint8(pos);
            const isLast = (header & 0x80) !== 0;
            const blockType = header & 0x7F;
            const blockSize = (view.getUint8(pos+1) << 16) | (view.getUint8(pos+2) << 8) | view.getUint8(pos+3);
            
            pos += 4;
            
            // Block type 4 = Vorbis Comment
            if (blockType === 4) {
                metadata = this.parseVorbisComment(view, pos, blockSize);
            }
            
            // Block type 6 = Picture
            if (blockType === 6) {
                metadata.image = this.parseFLACPicture(view, pos, blockSize);
            }
            
            pos += blockSize;
            
            if (isLast) break;
        }
        
        return this.normalizeMetadata(metadata, file);
    }

    parseVorbisComment(view, start, size) {
        const metadata = { title: null, artist: null, album: null, year: null };
        let pos = start;
        
        // Vendor string length
        const vendorLen = view.getUint32(pos, true);
        pos += 4 + vendorLen;
        
        // Comment count
        const commentCount = view.getUint32(pos, true);
        pos += 4;
        
        for (let i = 0; i < commentCount; i++) {
            const commentLen = view.getUint32(pos, true);
            pos += 4;
            
            const comment = this.decodeText(view, pos, commentLen, 1); // UTF-8
            pos += commentLen;
            
            const [key, value] = comment.split('=', 2);
            const keyUpper = key.toUpperCase();
            
            if (keyUpper === 'TITLE') metadata.title = value;
            if (keyUpper === 'ARTIST') metadata.artist = value;
            if (keyUpper === 'ALBUM') metadata.album = value;
            if (keyUpper === 'DATE' || keyUpper === 'YEAR') metadata.year = parseInt(value);
        }
        
        return metadata;
    }

    parseFLACPicture(view, start, size) {
        let pos = start;
        
        // Picture type (4 bytes)
        pos += 4;
        
        // MIME type
        const mimeLen = view.getUint32(pos);
        pos += 4;
        const mimeType = this.decodeText(view, pos, mimeLen, 1);
        pos += mimeLen;
        
        // Description
        const descLen = view.getUint32(pos);
        pos += 4 + descLen;
        
        // Skip width, height, depth, colors
        pos += 16;
        
        // Image data
        const imageLen = view.getUint32(pos);
        pos += 4;
        
        const imageData = new Uint8Array(view.buffer, pos, imageLen);
        const blob = new Blob([imageData], { type: mimeType });
        return URL.createObjectURL(blob);
    }

    // ========== OGG Vorbis Parser ==========
    async parseOGG(file) {
        const buffer = await this.readFileChunk(file, 0, 100000);
        const view = new DataView(buffer);
        
        // Check for 'OggS' marker
        if (String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)) !== 'OggS') {
            throw new Error('Not a valid OGG file');
        }
        
        let metadata = { title: null, artist: null, album: null, year: null, image: null };
        let pos = 0;

        // Find Vorbis comment packet
        while (pos < buffer.byteLength - 27) {
            if (String.fromCharCode(view.getUint8(pos), view.getUint8(pos+1), view.getUint8(pos+2), view.getUint8(pos+3)) !== 'OggS') {
                pos++;
                continue;
            }
            
            // Skip to page segments
            const segmentCount = view.getUint8(pos + 26);
            pos += 27;
            
            let pageSize = 0;
            for (let i = 0; i < segmentCount; i++) {
                pageSize += view.getUint8(pos + i);
            }
            pos += segmentCount;
            
            // Check for vorbis comment header
            const packetType = view.getUint8(pos);
            if (packetType === 3) { // Comment header
                const vorbisStr = String.fromCharCode(
                    view.getUint8(pos+1), view.getUint8(pos+2), 
                    view.getUint8(pos+3), view.getUint8(pos+4), 
                    view.getUint8(pos+5), view.getUint8(pos+6)
                );
                
                if (vorbisStr === 'vorbis') {
                    metadata = this.parseVorbisComment(view, pos + 7, pageSize - 7);
                    break;
                }
            }
            
            pos += pageSize;
        }
        
        return this.normalizeMetadata(metadata, file);
    }

    // ========== WAV Parser ==========
    async parseWAV(file) {
        const buffer = await this.readFileChunk(file, 0, 100000);
        const view = new DataView(buffer);
        
        // Check for 'RIFF' and 'WAVE'
        if (String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)) !== 'RIFF') {
            throw new Error('Not a valid WAV file');
        }
        
        let metadata = { title: null, artist: null, album: null, year: null, image: null };
        let pos = 12; // Skip RIFF header

        while (pos < buffer.byteLength - 8) {
            const chunkId = String.fromCharCode(
                view.getUint8(pos), view.getUint8(pos+1), 
                view.getUint8(pos+2), view.getUint8(pos+3)
            );
            const chunkSize = view.getUint32(pos + 4, true);
            
            // LIST-INFO chunk
            if (chunkId === 'LIST') {
                const listType = String.fromCharChar(
                    view.getUint8(pos+8), view.getUint8(pos+9), 
                    view.getUint8(pos+10), view.getUint8(pos+11)
                );
                
                if (listType === 'INFO') {
                    metadata = this.parseWAVInfo(view, pos + 12, chunkSize - 4);
                }
            }
            
            // ID3v2 chunk (some WAVs have this)
            if (chunkId === 'id3 ' || chunkId === 'ID3 ') {
                try {
                    const id3Data = await this.parseMP3(new Blob([new Uint8Array(view.buffer, pos + 8, chunkSize)]));
                    Object.assign(metadata, id3Data);
                } catch (e) {
                    // Ignore ID3 errors
                }
            }
            
            pos += 8 + chunkSize;
            if (chunkSize % 2 !== 0) pos++; // Padding
        }
        
        return this.normalizeMetadata(metadata, file);
    }

    parseWAVInfo(view, start, size) {
        const metadata = { title: null, artist: null, album: null, year: null };
        let pos = start;
        const end = start + size;

        while (pos < end - 8) {
            const fieldId = String.fromCharCode(
                view.getUint8(pos), view.getUint8(pos+1), 
                view.getUint8(pos+2), view.getUint8(pos+3)
            );
            const fieldSize = view.getUint32(pos + 4, true);
            
            const text = this.decodeText(view, pos + 8, fieldSize, 0); // ASCII
            
            if (fieldId === 'INAM') metadata.title = text;
            if (fieldId === 'IART') metadata.artist = text;
            if (fieldId === 'IPRD') metadata.album = text;
            if (fieldId === 'ICRD') metadata.year = parseInt(text);
            
            pos += 8 + fieldSize;
            if (fieldSize % 2 !== 0) pos++; // Padding
        }
        
        return metadata;
    }

    // ========== WMA Parser ==========
    async parseWMA(file) {
        const buffer = await this.readFileChunk(file, 0, 100000);
        const view = new DataView(buffer);
        
        // Check for ASF header
        const guid = this.readGUID(view, 0);
        if (guid !== '75b22630-668e-11cf-a6d9-00aa0062ce6c') {
            throw new Error('Not a valid WMA file');
        }
        
        let metadata = { title: null, artist: null, album: null, year: null, image: null };
        let pos = 30; // Skip header

        while (pos < buffer.byteLength - 24) {
            const objGuid = this.readGUID(view, pos);
            const objSize = Number(view.getBigUint64(pos + 16, true));
            
            // Content Description Object
            if (objGuid === '75b22633-668e-11cf-a6d9-00aa0062ce6c') {
                metadata = this.parseWMAContentDescription(view, pos + 24, objSize - 24);
            }
            
            // Extended Content Description
            if (objGuid === 'd2d0a440-e307-11d2-97f0-00a0c95ea850') {
                Object.assign(metadata, this.parseWMAExtendedContent(view, pos + 24, objSize - 24));
            }
            
            pos += Number(objSize);
        }
        
        return this.normalizeMetadata(metadata, file);
    }

    parseWMAContentDescription(view, start, size) {
        let pos = start;
        
        const titleLen = view.getUint16(pos, true); pos += 2;
        const artistLen = view.getUint16(pos, true); pos += 2;
        pos += 6; // Skip copyright, description, rating lengths
        
        const title = titleLen > 0 ? this.decodeUTF16LE(view, pos, titleLen) : null;
        pos += titleLen;
        
        const artist = artistLen > 0 ? this.decodeUTF16LE(view, pos, artistLen) : null;
        
        return { title, artist };
    }

    parseWMAExtendedContent(view, start, size) {
        const metadata = { album: null, year: null };
        let pos = start;
        
        const descriptorCount = view.getUint16(pos, true);
        pos += 2;
        
        for (let i = 0; i < descriptorCount; i++) {
            const nameLen = view.getUint16(pos, true);
            pos += 2;
            
            const name = this.decodeUTF16LE(view, pos, nameLen);
            pos += nameLen;
            
            const valueType = view.getUint16(pos, true);
            pos += 2;
            
            const valueLen = view.getUint16(pos, true);
            pos += 2;
            
            if (valueType === 0) { // String
                const value = this.decodeUTF16LE(view, pos, valueLen);
                
                if (name === 'WM/AlbumTitle') metadata.album = value;
                if (name === 'WM/Year') metadata.year = parseInt(value);
            }
            
            pos += valueLen;
        }
        
        return metadata;
    }

    // ========== Helper Functions ==========

    async readFileChunk(file, start, length) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('File read failed'));
            reader.readAsArrayBuffer(file.slice(start, start + length));
        });
    }

    synchsafe32(view, offset) {
        return (view.getUint8(offset) << 21) | 
               (view.getUint8(offset+1) << 14) | 
               (view.getUint8(offset+2) << 7) | 
               view.getUint8(offset+3);
    }

    decodeText(view, start, length, encoding) {
        const bytes = new Uint8Array(view.buffer, start, length);
        
        try {
            if (encoding === 0) { // ISO-8859-1
                return String.fromCharCode(...bytes);
            } else if (encoding === 1 || encoding === undefined) { // UTF-8
                return new TextDecoder('utf-8').decode(bytes);
            } else if (encoding === 2) { // UTF-16LE
                return new TextDecoder('utf-16le').decode(bytes);
            } else if (encoding === 3) { // UTF-16BE
                return new TextDecoder('utf-16be').decode(bytes);
            }
        } catch (e) {
            return String.fromCharCode(...bytes.filter(b => b >= 32 && b <= 126));
        }
        
        return '';
    }

    decodeUTF16LE(view, start, length) {
        const bytes = new Uint8Array(view.buffer, start, length);
        return new TextDecoder('utf-16le').decode(bytes).replace(/\0/g, '');
    }

    extractID3Image(view, start, size) {
        try {
            let pos = start + 1; // Skip encoding
            
            // Skip MIME type
            while (pos < start + size && view.getUint8(pos) !== 0) pos++;
            pos++; // Skip null terminator
            
            pos++; // Skip picture type
            
            // Skip description
            while (pos < start + size && view.getUint8(pos) !== 0) pos++;
            pos++; // Skip null terminator
            
            const imageData = new Uint8Array(view.buffer, pos, start + size - pos);
            const header = String.fromCharCode(imageData[0], imageData[1]);
            const mimeType = (header === '\xff\xd8' || header === 'ÿØ') ? 'image/jpeg' : 'image/png';
            
            const blob = new Blob([imageData], { type: mimeType });
            return URL.createObjectURL(blob);
        } catch (e) {
            return null;
        }
    }

    findAtom(view, start, size, path) {
        let pos = start;
        const end = start + size;
        const targetAtom = path[0];
        
        while (pos < end - 8) {
            const atomSize = view.getUint32(pos);
            if (atomSize === 0 || atomSize > (end - pos)) break;
            
            const atomType = String.fromCharCode(
                view.getUint8(pos+4), view.getUint8(pos+5), 
                view.getUint8(pos+6), view.getUint8(pos+7)
            );
            
            if (atomType === targetAtom) {
                if (path.length === 1) {
                    return { pos: pos + 8, size: atomSize - 8 };
                } else {
                    return this.findAtom(view, pos + 8, atomSize - 8, path.slice(1));
                }
            }
            
            pos += atomSize;
        }
        
        return null;
    }

    readGUID(view, offset) {
        const bytes = [];
        for (let i = 0; i < 16; i++) {
            bytes.push(view.getUint8(offset + i).toString(16).padStart(2, '0'));
        }
        return [
            bytes.slice(0, 4).reverse().join(''),
            bytes.slice(4, 6).reverse().join(''),
            bytes.slice(6, 8).reverse().join(''),
            bytes.slice(8, 10).join(''),
            bytes.slice(10, 16).join('')
        ].join('-');
    }

    normalizeMetadata(metadata, file) {
        return {
            title: metadata.title || file.name.split('.').slice(0, -1).join('.'),
            artist: metadata.artist || 'Unknown Artist',
            album: metadata.album || 'Unknown Album',
            year: metadata.year || null,
            image: metadata.image || null,
            hasMetadata: !!(metadata.title || metadata.artist || metadata.album)
        };
    }

    getDefaultMetadata(file) {
        return {
            title: file.name.split('.').slice(0, -1).join('.'),
            artist: 'Unknown Artist',
            album: 'Unknown Album',
            year: null,
            image: null,
            hasMetadata: false
        };
    }
}

// Export for use
window.MetadataParser = MetadataParser;