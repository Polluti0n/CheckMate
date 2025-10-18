const CACHE_NAME = 'checkmate-cache-v10';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];
const crossOriginUrl = 'https://docs.opencv.org/4.x/opencv.js';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        
        // 1. Cache same-origin assets, ensuring we get fresh copies.
        const sameOriginRequests = urlsToCache.map(url => new Request(url, { cache: 'reload' }));
        const sameOriginPromise = cache.addAll(sameOriginRequests);
        
        // 2. Cache the cross-origin OpenCV asset using a 'no-cors' request to get an opaque response.
        const crossOriginRequest = new Request(crossOriginUrl, { mode: 'no-cors', cache: 'reload' });
        const crossOriginPromise = fetch(crossOriginRequest).then(response => {
            return cache.put(crossOriginUrl, response);
        });
        
        // Wait for all caching operations to complete.
        return Promise.all([sameOriginPromise, crossOriginPromise]);
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // The Cache API only supports GET requests. We must ignore all other request methods.
  if (event.request.method !== 'GET') {
    return;
  }

  // Let the browser handle requests for Firebase services as a safeguard.
  if (event.request.url.includes('firebase')) {
    return;
  }
    
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response.
        if (response) {
          return response;
        }

        // Clone the request because it's a stream and can only be consumed once.
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          (response) => {
            // We can only cache valid responses.
            // Opaque responses (for cross-origin assets) don't have a checkable status but are valid to cache if they are from a GET request.
            if (!response || (response.status !== 200 && response.type !== 'opaque')) {
              return response;
            }

            // Clone the response because it's also a stream.
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                if (cache.match(event.request)) {
                  return;
                }
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});