// Service Worker mínimo — necessário para Chrome habilitar instalação PWA
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', () => clients.claim())
// Passa todas as requisições direto para a rede (sem cache)
self.addEventListener('fetch', e => e.respondWith(fetch(e.request)))
