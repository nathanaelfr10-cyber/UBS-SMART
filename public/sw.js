const CACHE_NAME = "ubs-smart-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon.svg"
];

// Install Event - Pre-cache essential app shell assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching app shell metadata");
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up older caches if necessary
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Clearing old cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Handle intelligent routing
self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  // 1. API calls and auth requests must ALWAYS go directly to the network for real-time synchronization.
  if (requestUrl.pathname.startsWith("/api/") || event.request.method !== "GET") {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Fallback or offline graceful structure for API failures
        return new Response(
          JSON.stringify({ error: "Você está offline. Conecte-se para atualizar dados em tempo real." }),
          { headers: { "Content-Type": "application/json" } }
        );
      })
    );
    return;
  }

  // 2. Static Assets and App Shell - Cache First, fallback to network and update cache
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch background refresh if needed, but return cache instantly for sub-3s speed
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
          return networkResponse;
        }

        // Cache newly fetched static assets dynamically
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          // Avoid caching large development/hot reload websocket tokens
          if (!requestUrl.pathname.includes("hot-update") && !requestUrl.pathname.includes("vite")) {
            cache.put(event.request, responseToCache);
          }
        });

        return networkResponse;
      }).catch(() => {
        // If static file fails and is index.html, return roots
        if (event.request.mode === "navigate") {
          return caches.match("/");
        }
      });
    })
  );
});
