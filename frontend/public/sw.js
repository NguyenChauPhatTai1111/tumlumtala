const SW_VERSION = "2";

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
	const { title, body, icon, badge, tag } = event.data;
	event.waitUntil(
		self.registration.showNotification(title, {
			body,
			icon: icon || "/assets/logo/logo.png",
			badge: badge || "/assets/logo/logo.png",
			tag: tag || `msg-${Date.now()}`,
		}),
	);
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	event.waitUntil(
		self.clients
			.matchAll({ type: "window", includeUncontrolled: true })
			.then((clientList) => {
				for (const client of clientList) {
					if ("focus" in client) return client.focus();
				}
				if (self.clients.openWindow) return self.clients.openWindow("/");
			}),
	);
});
