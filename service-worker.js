const CACHE_NAME = 'music-player-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/mobile.js',
  '/visualizer-manager.js',
  '/performance-manager.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

let currentState = {
    isPlaying: false,
    currentTrack: {
        title: 'No track loaded',
        artist: '--',
        albumArt: null
    },
    progress: 0
};

// Handle messages from main app
self.addEventListener('message', (event) => {
    if (event.data.type === 'UPDATE_STATE') {
        currentState = event.data.state;
        // Broadcast to all widget instances
        broadcastToWidgets('STATE_UPDATE', currentState);
    } else if (event.data.type === 'WIDGET_ACTION') {
        handleWidgetAction(event.data.action);
    }
});

function broadcastToWidgets(type, data) {
    self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
            if (client.url.includes('widget-now-playing.html')) {
                client.postMessage({ type, state: data });
            }
        });
    });
}

async function handleWidgetAction(action) {
    // Find the main app client
    const clients = await self.clients.matchAll({ type: 'window' });
    const mainApp = clients.find(c => c.url.includes('index.html'));
    
    if (mainApp) {
        mainApp.postMessage({ type: 'WIDGET_COMMAND', action });
    }
}