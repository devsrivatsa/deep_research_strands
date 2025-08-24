// Service Worker for Deep Research UI
// Provides offline capability and caching for better performance

const CACHE_NAME = 'deep-research-v1';
const STATIC_CACHE_NAME = 'deep-research-static-v1';
const DYNAMIC_CACHE_NAME = 'deep-research-dynamic-v1';

// Files to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/main.js',
  '/main.css',
  // Add other static assets as needed
];

// API endpoints that can be cached
const CACHEABLE_API_PATTERNS = [
  /\/api\/health$/,
  /\/api\/sessions\/[^\/]+$/,
  /\/api\/projects$/,
  /\/api\/projects\/[^\/]+$/,
];

// API endpoints that should never be cached
const NON_CACHEABLE_API_PATTERNS = [
  /\/api\/sessions$/,  // POST requests to create sessions
  /\/api\/.*\/feedback$/,
  /\/api\/.*\/approve$/,
  /\/ws/,  // WebSocket connections
];

// Maximum cache size (in items)
const MAX_CACHE_SIZE = 100;

// Cache duration in milliseconds
const CACHE_DURATION = {
  static: 7 * 24 * 60 * 60 * 1000,    // 7 days
  api: 5 * 60 * 1000,                  // 5 minutes
  dynamic: 24 * 60 * 60 * 1000,        // 24 hours
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME && 
                cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests with caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests for caching (except for specific API endpoints)
  if (request.method !== 'GET' && !shouldCacheApiRequest(request)) {
    return;
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  } else if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStaticAsset(request));
  } else {
    event.respondWith(handleDynamicRequest(request));
  }
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // Don't cache certain API endpoints
  if (NON_CACHEABLE_API_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    try {
      return await fetch(request);
    } catch (error) {
      console.error('[SW] API request failed:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'OFFLINE_ERROR',
            message: 'This request requires an internet connection'
          }
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  // Use network-first strategy for cacheable API endpoints
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok && shouldCacheApiRequest(request)) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      const responseClone = networkResponse.clone();
      
      // Add timestamp to cached response
      const responseWithTimestamp = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: {
          ...Object.fromEntries(responseClone.headers.entries()),
          'sw-cached-at': Date.now().toString()
        }
      });
      
      cache.put(request, responseWithTimestamp);
      await limitCacheSize(DYNAMIC_CACHE_NAME, MAX_CACHE_SIZE);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      const cachedAt = cachedResponse.headers.get('sw-cached-at');
      const age = cachedAt ? Date.now() - parseInt(cachedAt) : Infinity;
      
      if (age < CACHE_DURATION.api) {
        console.log('[SW] Serving from cache:', request.url);
        return cachedResponse;
      } else {
        console.log('[SW] Cached response expired for:', request.url);
      }
    }
    
    // Return offline response
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'OFFLINE_ERROR',
          message: 'Unable to fetch data while offline'
        }
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    const cachedAt = cachedResponse.headers.get('sw-cached-at');
    const age = cachedAt ? Date.now() - parseInt(cachedAt) : 0;
    
    if (age < CACHE_DURATION.static) {
      return cachedResponse;
    }
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      const responseClone = networkResponse.clone();
      
      const responseWithTimestamp = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: {
          ...Object.fromEntries(responseClone.headers.entries()),
          'sw-cached-at': Date.now().toString()
        }
      });
      
      cache.put(request, responseWithTimestamp);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for static asset, serving from cache:', request.url);
    return cachedResponse || new Response('Asset not available offline', { status: 503 });
  }
}

// Handle dynamic requests (HTML pages) with network-first strategy
async function handleDynamicRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
      await limitCacheSize(DYNAMIC_CACHE_NAME, MAX_CACHE_SIZE);
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/index.html') || new Response(
        '<html><body><h1>Offline</h1><p>Please check your internet connection.</p></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
    
    return new Response('Resource not available offline', { status: 503 });
  }
}

// Helper functions
function isStaticAsset(pathname) {
  return pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);
}

function shouldCacheApiRequest(request) {
  const url = new URL(request.url);
  return CACHEABLE_API_PATTERNS.some(pattern => pattern.test(url.pathname));
}

async function limitCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxSize) {
    const keysToDelete = keys.slice(0, keys.length - maxSize);
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
    console.log(`[SW] Cleaned up ${keysToDelete.length} items from ${cacheName}`);
  }
}

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-messages') {
    event.waitUntil(syncOfflineMessages());
  }
});

async function syncOfflineMessages() {
  try {
    // Get offline messages from IndexedDB or localStorage
    const offlineMessages = await getOfflineMessages();
    
    for (const message of offlineMessages) {
      try {
        await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message)
        });
        
        // Remove successfully synced message
        await removeOfflineMessage(message.id);
      } catch (error) {
        console.error('[SW] Failed to sync message:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Placeholder functions for offline message handling
async function getOfflineMessages() {
  // Implementation would depend on how offline messages are stored
  return [];
}

async function removeOfflineMessage(messageId) {
  // Implementation would depend on how offline messages are stored
  console.log('[SW] Removing synced message:', messageId);
}

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: 'You have new research updates',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: 'research-update',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View Updates'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Deep Research', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('[SW] Service worker script loaded');