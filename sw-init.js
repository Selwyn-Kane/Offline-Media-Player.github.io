// Enhanced PWA registration with Chrome OS detection
// ONLY register service worker if NOT running as an extension
if ('serviceWorker' in navigator && typeof chromeosPlatform !== 'undefined') {
  // Skip service worker registration in extension mode
  if (chromeosPlatform.isExtension) {
    console.log('⏭️ Skipping service worker registration (already handled by extension background)');
    // Still request persistent storage
    chromeosPlatform.requestPersistentStorage();
  } else {
    // Only register for PWA/web mode
    const swPath = '/service-worker.js';
    
    navigator.serviceWorker.register(swPath)
      .then(() => {
        console.log(`✅ Service Worker registered (${chromeosPlatform.platformMode})`);
        chromeosPlatform.requestPersistentStorage();
      })
      .catch(err => {
        console.error('Service Worker registration failed:', err);
      });
  }
}