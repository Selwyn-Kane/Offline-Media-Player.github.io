// Enhanced PWA registration with Chrome OS detection
// Register service worker for PWA, skip for extension
if ('serviceWorker' in navigator) {
  // Check if running as extension
  const isExtension = window.location.protocol === 'chrome-extension:';
  
  if (isExtension) {
    console.log('⏭️ Skipping service worker registration (extension mode)');
    
    // Still request persistent storage
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then(granted => {
        console.log(`💾 Persistent storage: ${granted ? 'granted' : 'denied'}`);
      });
    }
  } else {
    // PWA mode - register service worker
    const swPath = './service-worker.js';
    
    navigator.serviceWorker.register(swPath, {
      scope: './'
    })
      .then(registration => {
        console.log('✅ Service Worker registered (PWA mode)');
        console.log('Scope:', registration.scope);
        
        // Request persistent storage
        if (navigator.storage && navigator.storage.persist) {
          navigator.storage.persist().then(granted => {
            console.log(`💾 Persistent storage: ${granted ? 'granted' : 'denied'}`);
          });
        }
      })
      .catch(err => {
        console.error('❌ Service Worker registration failed:', err);
      });
  }
}