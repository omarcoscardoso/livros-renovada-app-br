/**
 * Lumi Renovada - Progressive Web App Service Worker
 * Version: 1.0.0
 * 
 * Features:
 * - App Shell Pre-caching (instant boot & offline launch)
 * - Stale-While-Revalidate for static bundles, fonts, and assets
 * - Network-First with Cache Fallback for read APIs (books, chapters, trainings)
 * - Navigation Fallback to index.html (SPA routing resilience)
 * - Safe lifecycle management with skipWaiting and clients.claim
 */

const CACHE_VERSION = 'lumi-pwa-v1';
const PRECACHE_SHELL = `shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/assets/icon.svg',
  '/assets/icon.png',
  '/assets/pwa-192x192.png',
  '/assets/pwa-512x512.png',
  '/assets/maskable-icon-512x512.png',
  '/assets/apple-touch-icon.png',
  '/favicon.ico',
];

// URLs that should never be cached by the service worker
const EXCLUDE_URLS = [
  '/api/auth/login',
  '/api/auth/google',
  '/api/auth/logout',
  '/api/books/upload',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE_SHELL)
      .then((cache) => {
        return cache.addAll(PRECACHE_URLS).catch((err) => {
          console.warn('[PWA SW] Precache warning:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const currentCaches = [PRECACHE_SHELL, RUNTIME_CACHE, API_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!currentCaches.includes(cacheName)) {
              console.log('[PWA SW] Removendo cache legado:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests (mutations must reach server)
  if (request.method !== 'GET') {
    return;
  }

  // Ignore excluded endpoints
  if (EXCLUDE_URLS.some((path) => url.pathname.startsWith(path))) {
    return;
  }

  // Ignore chrome-extension or external analytics if any
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 1. Navigation requests (HTML pages for SPA routing)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Fallback to cached route or root index.html
          const cachedPage = await caches.match(request);
          if (cachedPage) return cachedPage;

          const shell = await caches.match('/index.html');
          if (shell) return shell;

          return caches.match('/');
        })
    );
    return;
  }

  // 2. Read APIs (/api/books, /api/trainings, /api/categories, /api/auth/me)
  if (url.pathname.startsWith('/api/')) {
    // We only cache GET requests that are safe for reading offline
    const isCacheableApi =
      url.pathname.startsWith('/api/books') ||
      url.pathname.startsWith('/api/trainings') ||
      url.pathname === '/api/auth/me' ||
      url.pathname === '/api/health';

    if (isCacheableApi) {
      event.respondWith(
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const resClone = networkResponse.clone();
              caches.open(API_CACHE).then((cache) => {
                cache.put(request, resClone);
              });
            }
            return networkResponse;
          })
          .catch(async () => {
            const cachedApiResponse = await caches.match(request);
            if (cachedApiResponse) {
              return cachedApiResponse;
            }
            return new Response(
              JSON.stringify({
                offline: true,
                message: 'Você está no modo offline. Conecte-se à internet para atualizar dados.',
              }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          })
      );
      return;
    }
  }

  // 3. Static Assets: Fonts, CSS, JS, Images (Stale-While-Revalidate)
  const isStaticAsset =
    url.origin === self.location.origin ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const resClone = networkResponse.clone();
              caches.open(RUNTIME_CACHE).then((cache) => {
                cache.put(request, resClone);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // Network failure is fine if we have cachedResponse
            return null;
          });

        return cachedResponse || fetchPromise;
      })
    );
  }
});
