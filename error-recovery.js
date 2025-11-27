/* ============================================
   Error Recovery System
   ============================================ */

class ErrorRecovery {
    constructor(debugLog) {
        this.debugLog = debugLog;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.retryDelay = 1000; // Start with 1 second
        this.maxRetryDelay = 10000; // Max 10 seconds
    }
    
    async retryOperation(operation, operationName, context = {}) {
        this.retryCount = 0;
        
        while (this.retryCount < this.maxRetries) {
            try {
                const result = await operation();
                this.retryCount = 0; // Reset on success
                return { success: true, result };
            } catch (error) {
                this.retryCount++;
                this.debugLog(
                    `${operationName} failed (attempt ${this.retryCount}/${this.maxRetries}): ${error.message}`,
                    'warning'
                );
                
                if (this.retryCount >= this.maxRetries) {
                    this.debugLog(`${operationName} failed after ${this.maxRetries} attempts`, 'error');
                    return { success: false, error, context };
                }
                
                // Exponential backoff
                const delay = Math.min(
                    this.retryDelay * Math.pow(2, this.retryCount - 1),
                    this.maxRetryDelay
                );
                
                this.debugLog(`Retrying ${operationName} in ${delay}ms...`, 'info');
                await this.sleep(delay);
            }
        }
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    handleAudioError(audioElement, trackInfo) {
        const error = audioElement.error;
        if (!error) return;
        
        let errorMessage = 'Unknown audio error';
        let recoveryAction = null;
        
        switch (error.code) {
            case error.MEDIA_ERR_ABORTED:
                errorMessage = 'Playback aborted by user';
                break;
            case error.MEDIA_ERR_NETWORK:
                errorMessage = 'Network error while loading audio';
                recoveryAction = () => this.retryLoad(audioElement);
                break;
            case error.MEDIA_ERR_DECODE:
                errorMessage = 'Audio file is corrupted or unsupported format';
                recoveryAction = () => this.skipToNext(trackInfo);
                break;
            case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                errorMessage = 'Audio format not supported by browser';
                recoveryAction = () => this.skipToNext(trackInfo);
                break;
        }
        
        this.debugLog(`Audio error: ${errorMessage}`, 'error');
        
        if (recoveryAction) {
            this.debugLog('Attempting automatic recovery...', 'info');
            recoveryAction();
        }
        
        return { errorMessage, hasRecovery: !!recoveryAction };
    }
    
    async retryLoad(audioElement) {
        const src = audioElement.src;
        audioElement.src = '';
        audioElement.load();
        
        await this.sleep(500);
        
        audioElement.src = src;
        audioElement.load();
        
        try {
            await audioElement.play();
            this.debugLog('Audio reload successful', 'success');
            return true;
        } catch (err) {
            this.debugLog(`Reload failed: ${err.message}`, 'error');
            return false;
        }
    }
    
    skipToNext(trackInfo) {
        this.debugLog(`Skipping problematic track: ${trackInfo.name}`, 'warning');
        const nextButton = document.getElementById('next-button');
        if (nextButton && !nextButton.disabled) {
            nextButton.click();
        }
    }
    
    handleStorageError(error, operation) {
        this.debugLog(`Storage error during ${operation}: ${error.message}`, 'error');
        
        if (error.name === 'QuotaExceededError') {
            this.debugLog('Storage quota exceeded. Consider clearing old data.', 'warning');
            return { recovery: 'clearOldData', message: 'Storage is full' };
        }
        
        if (error.name === 'NotFoundError') {
            this.debugLog('Storage key not found. This is usually not critical.', 'info');
            return { recovery: 'ignore', message: 'Data not found' };
        }
        
        return { recovery: 'none', message: error.message };
    }
    
    async handleNetworkError(error, resource) {
        this.debugLog(`Network error loading ${resource}: ${error.message}`, 'error');
        
        if (!navigator.onLine) {
            this.debugLog('Device is offline. Waiting for connection...', 'warning');
            
            return new Promise((resolve) => {
                const onlineHandler = () => {
                    window.removeEventListener('online', onlineHandler);
                    this.debugLog('Connection restored', 'success');
                    resolve(true);
                };
                window.addEventListener('online', onlineHandler);
                
                // Timeout after 30 seconds
                setTimeout(() => {
                    window.removeEventListener('online', onlineHandler);
                    resolve(false);
                }, 30000);
            });
        }
        
        return false;
    }
}

window.ErrorRecovery = ErrorRecovery;