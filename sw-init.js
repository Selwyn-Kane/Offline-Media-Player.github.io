// Enhanced PWA registration with GitHub Pages support
if ('serviceWorker' in navigator) {
  const isExtension = window.location.protocol === 'chrome-extension:';
  
  if (isExtension) {
    console.log('⏭️ Skipping service worker registration (extension mode)');
    
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then(granted => {
        console.log(`💾 Persistent storage: ${granted ? 'granted' : 'denied'}`);
      });
    }
  } else {
    // Wait for BASE_PATH to be defined
    const basePath = window.BASE_PATH || '';
    const swPath = basePath ? `${basePath}/service-worker.js` : './service-worker.js';
    const scope = basePath || './';
    
    console.log(`📍 Registering SW at: ${swPath}`);
    console.log(`📍 Scope: ${scope}`);
    
    navigator.serviceWorker.register(swPath, { scope })
      .then(registration => {
        console.log('✅ Service Worker registered (PWA mode)');
        console.log('Scope:', registration.scope);
        
        if (navigator.storage && navigator.storage.persist) {
          navigator.storage.persist().then(granted => {
            console.log(`💾 Persistent storage: ${granted ? 'granted' : 'denied'}`);
          });
        }
      })
      .catch(err => {
        console.error('❌ Service Worker registration failed:', err);
        console.error('Attempted path:', swPath);
      });
  }
}