const SW_VERSION = "4";

function notificationUrl(data) {
	const fallback = "/";
	const rawUrl = typeof data?.url === "string" && data.url ? data.url : fallback;
	try {
		return new URL(rawUrl, self.location.origin).href;
	} catch {
		return new URL(fallback, self.location.origin).href;
	}
}

self.addEventListener("install", (event) => {
	event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
	if (event.data?.type === "PING") {
		event.source?.postMessage({ type: "PONG", version: SW_VERSION });
		return;
	}
	if (event.data?.type !== "SHOW_NOTIFICATION") return;
	const { title, body, icon, badge, tag, data, requireInteraction } = event.data;
	event.waitUntil(
		self.registration.showNotification(title, {
			body,
			icon: icon || "/icons/pwa-192x192.png",
			badge: badge || "/icons/pwa-192x192.png",
			tag: tag || `msg-${Date.now()}`,
			data,
			requireInteraction: Boolean(requireInteraction),
		}),
	);
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const targetUrl = notificationUrl(event.notification.data);
	event.waitUntil(
		self.clients
			.matchAll({ type: "window", includeUncontrolled: true })
			.then((clientList) => {
				for (const client of clientList) {
					const clientUrl = new URL(client.url);
					const target = new URL(targetUrl);
					if (clientUrl.origin !== target.origin) continue;
					if ("navigate" in client && clientUrl.href !== target.href) {
						return client.navigate(targetUrl).then((navigatedClient) => {
							if (navigatedClient && "focus" in navigatedClient) {
								return navigatedClient.focus();
							}
							if ("focus" in client) return client.focus();
						});
					}
					if ("focus" in client) return client.focus();
				}
				if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
			}),
	);
});
