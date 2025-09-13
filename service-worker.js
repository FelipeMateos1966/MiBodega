const CACHE_NAME = 'vinumai-cache-v1';
const URLS_TO_CACHE = [
    '.',
    'index.html',
    'style.css',
    'app.js',
    'icon-192x192.svg',
    'icon-512x512.svg',
    'https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap',
    'https://fonts.gstatic.com/s/lato/v24/S6uyw4BMUTPHjx4wXg.woff2'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache abierto');
                return cache.addAll(URLS_TO_CACHE);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                // Si no está en caché, ir a la red
                return fetch(event.request).then(
                    (response) => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clonar la respuesta para poder guardarla en caché y devolverla
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    }
                );
            })
    );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});