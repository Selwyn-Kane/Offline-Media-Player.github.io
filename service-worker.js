/* Service Worker - Enhanced for PWA on GitHub Pages */

const CACHE_NAME = 'music-player-v3'; // Increment version to force cache update

// Simple URLs to cache (relative paths work on both local and GH Pages)
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './mobile.js',
  './gh-pages-config.js',
  './sw-init.js',
  './service-worker.js'
];

let currentState = {
  isPlaying: false,
  currentTrack: {
    title: 'No track loaded',
    artist: '--',
    album: '--',
    albumArt: null
  },
  progress: 0,
  currentTime: 0,
  duration: 0
};

// Install
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app files');
        return cache.addAll(urlsToCache).catch(err => {
          console.warn('[SW] Some files failed to cache:', err);
          // Don't fail the entire install if some files don't cache
          return Promise.resolve();
        });
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
  );
});

// Activate
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and non-http(s) requests
  if (!event.request.url.startsWith('http')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clone the response before caching
        const responseToCache = response.clone();
        
        // Only cache successful responses
        if (response.status === 200) {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then(response => {
          if (response) {
            console.log('[SW] Serving from cache:', event.request.url);
            return response;
          }
          
          // If it's an HTML page, return the index
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('./index.html');
          }
          
          // Otherwise return 404
          return new Response('Not found', { status: 404 });
        });
      })
  );
});

// Message handler
self.addEventListener('message', async (event) => {
  const { type, state, action } = event.data;
  
  switch (type) {
    case 'UPDATE_STATE':
      currentState = { ...currentState, ...state };
      console.log('[SW] State updated:', currentState);
      await updateAllWidgets();
      break;
      
    case 'WIDGET_COMMAND':
      await forwardCommandToMainApp(action);
      break;
      
    case 'KEEP_ALIVE':
      event.waitUntil(Promise.resolve());
      break;
  }
});

// Update all widget instances
async function updateAllWidgets() {
  const clients = await self.clients.matchAll({ 
    type: 'window',
    includeUncontrolled: true 
  });
  
  clients.forEach(client => {
    if (client.url.includes('widget-')) {
      client.postMessage({ 
        type: 'WIDGET_STATE_UPDATE', 
        state: currentState 
      });
    }
  });
}

// Forward widget commands to main app
async function forwardCommandToMainApp(action) {
  const clients = await self.clients.matchAll({ type: 'window' });
  const mainApp = clients.find(c => c.url.includes('index.html') || c.url.endsWith('/'));
  
  if (mainApp) {
    mainApp.postMessage({ 
      type: 'WIDGET_COMMAND', 
      action: action 
    });
  } else {
    // Open the app if not found
    await self.clients.openWindow('./index.html');
  }
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
}

console.log('[SW] Loaded successfully');