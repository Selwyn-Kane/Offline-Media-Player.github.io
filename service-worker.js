/* Service Worker - Enhanced for Android Widgets */

const CACHE_NAME = 'music-player-v2';

// Detect base path for GitHub Pages
const isGitHubPages = self.location.hostname.includes('github.io');
const BASE_PATH = isGitHubPages 
  ? '/' + self.location.pathname.split('/')[1]  // Gets /repo-name
  : '';

console.log('[SW] Base path:', BASE_PATH);

const urlsToCache = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/style.css`,
  `${BASE_PATH}/script.js`,
  `${BASE_PATH}/mobile.js`,
  `${BASE_PATH}/widget-minimal.html`,
  `${BASE_PATH}/widget-full.html`,
  `${BASE_PATH}/widget-minimal-data.json`,
  `${BASE_PATH}/widget-full-data.json`
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
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(self.clients.claim());
});

// Fetch - CRITICAL: Intercept widget data requests
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('widget-minimal-data.json')) {
    event.respondWith(
      new Response(JSON.stringify({
        template: 'widget-minimal',
        data: {
          isPlaying: currentState.isPlaying,
          trackTitle: currentState.currentTrack.title,
          artist: currentState.currentTrack.artist
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    );
    return;
  }
  
  if (event.request.url.includes('widget-full-data.json')) {
    event.respondWith(
      new Response(JSON.stringify({
        template: 'widget-full',
        data: {
          isPlaying: currentState.isPlaying,
          trackTitle: currentState.currentTrack.title,
          artist: currentState.currentTrack.artist,
          album: currentState.currentTrack.album,
          albumArt: currentState.currentTrack.albumArt || '',
          progress: currentState.progress,
          currentTime: formatTime(currentState.currentTime),
          duration: formatTime(currentState.duration)
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    );
    return;
  }
  
  // Normal fetch handling
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
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
  const mainApp = clients.find(c => c.url.includes('index.html'));
  
  if (mainApp) {
    mainApp.postMessage({ 
      type: 'WIDGET_COMMAND', 
      action: action 
    });
  } else {
    await self.clients.openWindow('/index.html');
  }
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
}

// Periodic Background Sync for widgets (Android only)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-widgets') {
    event.waitUntil(updateAllWidgets());
  }
});

console.log('[SW] Loaded with Android widget support');