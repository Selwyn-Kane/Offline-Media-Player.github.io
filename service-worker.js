/* ============================================
   Service Worker - Enhanced for Background Audio
   & Widget Communication
   ============================================ */

const CACHE_NAME = 'music-player-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/mobile.js',
  '/visualizer-manager.js',
  '/performance-manager.js',
  '/metadata-parser.js',
  '/vtt-parser.js',
  '/widget-minimal.html',
  '/widget-full.html'
];

// Global state (persists while service worker is active)
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

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// Activate event - clean old caches
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
    }).then(() => self.clients.claim()) // Take control immediately
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip chrome-extension:// and blob: URLs
  if (event.request.url.startsWith('chrome-extension://') || 
      event.request.url.startsWith('blob:')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Clone the request
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          // Cache the new response
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        });
      })
  );
});

// Message handler - communication with main app and widgets
self.addEventListener('message', async (event) => {
  const { type, state, action } = event.data;
  
  switch (type) {
    case 'UPDATE_STATE':
      // Main app sends state updates
      currentState = { ...currentState, ...state };
      console.log('[SW] State updated:', currentState);
      
      // Broadcast to all widget clients
      await broadcastToWidgets('WIDGET_STATE_UPDATE', currentState);
      
      // Update Media Session
      updateMediaSession(currentState);
      break;
      
    case 'WIDGET_REQUEST_STATE':
      // Widget requests current state
      if (event.source) {
        event.source.postMessage({
          type: 'WIDGET_STATE_UPDATE',
          state: currentState
        });
      }
      break;
      
    case 'WIDGET_COMMAND':
      // Widget sends control command
      await forwardCommandToMainApp(action);
      break;
      
    case 'KEEP_ALIVE':
      // Main app keeps service worker alive
      event.waitUntil(Promise.resolve());
      break;
  }
});

// Broadcast state to all widget windows
async function broadcastToWidgets(type, data) {
  try {
    const clients = await self.clients.matchAll({ 
      type: 'window',
      includeUncontrolled: true 
    });
    
    clients.forEach(client => {
      if (client.url.includes('widget-')) {
        client.postMessage({ type, state: data });
      }
    });
  } catch (err) {
    console.error('[SW] Broadcast error:', err);
  }
}

// Forward widget commands to main app
async function forwardCommandToMainApp(action) {
  try {
    const clients = await self.clients.matchAll({ type: 'window' });
    const mainApp = clients.find(c => c.url.includes('index.html') || c.url === self.registration.scope);
    
    if (mainApp) {
      mainApp.postMessage({ 
        type: 'WIDGET_COMMAND', 
        action: action 
      });
      console.log('[SW] Forwarded command to main app:', action);
    } else {
      console.warn('[SW] Main app not found, opening new window');
      // Open main app if not found
      await self.clients.openWindow('/index.html');
    }
  } catch (err) {
    console.error('[SW] Command forward error:', err);
  }
}

// Media Session API - enables background audio continuation
function updateMediaSession(state) {
  if (!state || !state.currentTrack) return;
  
  // This runs in service worker context, but we notify clients to update their Media Session
  self.clients.matchAll({ type: 'window' }).then(clients => {
    clients.forEach(client => {
      if (client.url.includes('index.html')) {
        client.postMessage({
          type: 'UPDATE_MEDIA_SESSION',
          state: state
        });
      }
    });
  });
}

// Background Sync - for future offline functionality
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-playback-state') {
    event.waitUntil(
      // Sync playback state when connection is restored
      fetch('/api/sync-state', {
        method: 'POST',
        body: JSON.stringify(currentState)
      }).catch(err => {
        console.warn('[SW] Sync failed:', err);
      })
    );
  }
});

// Periodic Background Sync - keep widget updated (requires registration)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-widget') {
    event.waitUntil(
      broadcastToWidgets('WIDGET_STATE_UPDATE', currentState)
    );
  }
});

// Push notification support (optional - for future remote control)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  
  if (data.action === 'play' || data.action === 'pause') {
    forwardCommandToMainApp(data.action.toUpperCase());
  }
});

// Notification click - open app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow('/')
  );
});

console.log('[SW] Service Worker loaded with background audio & widget support');