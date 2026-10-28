/**
 * Service Worker para el módulo Punto de Venta.
 *
 * Cachea los assets estáticos para que el POS se pueda cargar y usar
 * incluso sin conexión a internet. Las ventas se guardan localmente en
 * IndexedDB y se sincronizan al recuperar la conexión.
 */

const CACHE_NAME = "pos-offline-v1";
const ASSETS_TO_CACHE = [
  "/pos",
  "/pos/venta",
  "/pos/ventas",
  "/pos/caja",
  "/pos/sincronizar",
  "/pos/productos",
  "/pos/credito",
  "/pos/terminales",
  "/pos/reportes",
];

// Instalar: cachear assets esenciales
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)),
  );
});

// Activar: limpiar caches antiguas
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
    }),
  );
});

// Interceptar peticiones: intentar red, fallback a caché
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo cachear peticiones GET del mismo origen
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request).then((response) => {
        // Solo cachear respuestas exitosas de GET
        if (response.ok && request.method === "GET") {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Si falla la red y no hay caché, devolver una respuesta vacía
        return new Response(
          JSON.stringify({ error: "Sin conexión" }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        );
      });
    }),
  );
});
