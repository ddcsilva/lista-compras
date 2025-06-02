/**
 * Service Worker customizado para Vai na Lista
 * Estratégias de cache otimizadas para funcionalidade offline
 */

// Importa o service worker padrão do Angular
importScripts('./ngsw-worker.js');

// Versão do cache personalizado
const CACHE_VERSION = 'vai-na-lista-v1';
const CACHE_NAMES = {
  STATIC: `${CACHE_VERSION}-static`,
  DYNAMIC: `${CACHE_VERSION}-dynamic`,
  IMAGES: `${CACHE_VERSION}-images`,
};

// Recursos para cache estático (sempre em cache)
const STATIC_CACHE_URLS = ['/', '/index.html', '/manifest.webmanifest', '/favicon.ico'];

// URLs que devem ter estratégia Network First
const NETWORK_FIRST_URLS = [
  /firestore\.googleapis\.com/,
  /identitytoolkit\.googleapis\.com/,
  /securetoken\.googleapis\.com/,
];

// URLs que devem ter estratégia Cache First
const CACHE_FIRST_URLS = [/fonts\.googleapis\.com/, /fonts\.gstatic\.com/, /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/];

/**
 * Estratégia Network First
 * Tenta rede primeiro, fallback para cache
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAMES.DYNAMIC);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fallback para página offline se disponível
    if (request.destination === 'document') {
      return caches.match('/offline.html');
    }

    throw error;
  }
}

/**
 * Estratégia Cache First
 * Verifica cache primeiro, fallback para rede
 */
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(request.destination === 'image' ? CACHE_NAMES.IMAGES : CACHE_NAMES.DYNAMIC);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Fallback para imagem placeholder se for imagem
    if (request.destination === 'image') {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f3f4f6"/><text x="100" y="100" text-anchor="middle" dy="0.3em" font-family="Arial" font-size="14" fill="#6b7280">Imagem não disponível</text></svg>',
        {
          headers: { 'Content-Type': 'image/svg+xml' },
        }
      );
    }

    throw error;
  }
}

/**
 * Event listener para fetch
 */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requests não HTTP
  if (!request.url.startsWith('http')) {
    return;
  }

  // Ignora requests do Angular DevTools em desenvolvimento
  if (url.pathname.includes('__ng_cli_ws')) {
    return;
  }

  // Determina estratégia baseada na URL
  if (NETWORK_FIRST_URLS.some(pattern => pattern.test(request.url))) {
    event.respondWith(networkFirst(request));
  } else if (CACHE_FIRST_URLS.some(pattern => pattern.test(request.url))) {
    event.respondWith(cacheFirst(request));
  } else {
    // Estratégia padrão: tenta cache primeiro para assets locais
    if (url.origin === self.location.origin) {
      event.respondWith(cacheFirst(request));
    } else {
      event.respondWith(networkFirst(request));
    }
  }
});

/**
 * Event listener para install
 */
self.addEventListener('install', event => {
  console.log('[SW] Installing custom service worker...');

  event.waitUntil(
    caches
      .open(CACHE_NAMES.STATIC)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

/**
 * Event listener para activate
 */
self.addEventListener('activate', event => {
  console.log('[SW] Activating custom service worker...');

  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // Remove caches antigos
            if (!Object.values(CACHE_NAMES).includes(cacheName) && cacheName.startsWith('vai-na-lista-')) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Old caches cleaned up');
        return self.clients.claim();
      })
      .catch(error => {
        console.error('[SW] Failed to activate:', error);
      })
  );
});

/**
 * Background sync para quando a conexão for restaurada
 */
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'sync-listas') {
    event.waitUntil(syncListasData());
  }
});

/**
 * Sincroniza dados das listas quando volta online
 */
async function syncListasData() {
  console.log('[SW] Syncing listas data...');

  try {
    // Aqui você pode implementar lógica para sincronizar
    // dados offline com o Firestore quando voltar online

    // Por exemplo: buscar dados pendentes no IndexedDB
    // e enviar para o Firestore

    console.log('[SW] Listas data sync completed');
  } catch (error) {
    console.error('[SW] Failed to sync listas data:', error);
    throw error;
  }
}

/**
 * Notificações push (futuro)
 */
self.addEventListener('push', event => {
  if (!event.data) {
    return;
  }

  const data = event.data.json();
  console.log('[SW] Push notification received:', data);

  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: data.data,
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

/**
 * Clique em notificação
 */
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked:', event.notification);

  event.notification.close();

  // Abre ou foca na aplicação
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});

console.log('[SW] Custom service worker loaded successfully');
