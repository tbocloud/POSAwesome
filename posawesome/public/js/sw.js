const CACHE_NAME = "posawesome-cache-v1";

self.addEventListener("install", (event) => {
	self.skipWaiting();
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE_NAME);

			const resources = [
				"/assets/posawesome/js/posawesome.bundle.js",
				"/assets/posawesome/js/offline/index.js",
				"/manifest.json",
				"/offline.html",
			];

			await Promise.all(
				resources.map(async (url) => {
					try {
						const resp = await fetch(url);
						if (resp && resp.ok) {
							await cache.put(url, resp.clone());
						}
					} catch (err) {
						console.warn("SW install failed to fetch", url, err);
					}
				})
			);
		})()
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();
			await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
			await self.clients.claim();
		})()
	);
});

self.addEventListener("fetch", (event) => {
	if (event.request.method !== "GET") return;

	const url = new URL(event.request.url);
	if (url.protocol !== "http:" && url.protocol !== "https:") return;

	if (event.request.url.includes("socket.io")) return;

	event.respondWith(
		caches
			.match(event.request)
			.then((response) => {
				if (response) {
					return response;
				}
				return fetch(event.request).then((resp) => {
					if (resp && resp.ok && resp.status === 200) {
						const respClone = resp.clone();
						caches.open(CACHE_NAME).then((cache) => cache.put(event.request, respClone));
					}
					return resp;
				});
			})
			.catch(() =>
				caches
					.match(event.request)
					.then((r) => r || caches.match("/offline.html") || Response.error())
			)
	);
});
