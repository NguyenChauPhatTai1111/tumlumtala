import { useCallback, useEffect, useRef } from "react";

const TITLE_FLASH_INTERVAL_MS = 1000;
const NOTIFICATION_LABEL = "💬 Tin nhắn mới";
const DEFAULT_NOTIFICATION_ICON = "/icons/pwa-192x192.png";

export interface NewMessageNotificationOptions {
	senderName?: string;
	conversationName?: string;
	content?: string;
	senderAvatar?: string;
}

function playNotificationSound() {
	try {
		const ctx = new AudioContext();
		const playTone = (
			freq: number,
			start: number,
			dur: number,
			vol: number,
		) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.type = "sine";
			osc.frequency.setValueAtTime(freq, start);
			gain.gain.setValueAtTime(0, start);
			gain.gain.linearRampToValueAtTime(vol, start + 0.01);
			gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
			osc.start(start);
			osc.stop(start + dur);
		};
		playTone(1046, ctx.currentTime, 0.12, 0.25);
		playTone(784, ctx.currentTime + 0.13, 0.18, 0.2);
		setTimeout(() => ctx.close(), 600);
	} catch {
		// AudioContext blocked
	}
}

function canUseDesktopNotifications() {
	return typeof window !== "undefined" && "Notification" in window;
}

function getNotificationBody(options: NewMessageNotificationOptions) {
	if (options.content?.trim()) {
		return options.conversationName && options.senderName
			? `${options.senderName}: ${options.content}`
			: options.content;
	}
	return options.senderName
		? `${options.senderName} đã gửi tin nhắn`
		: "Bạn có tin nhắn mới";
}

function getNotificationTitle(options: NewMessageNotificationOptions) {
	return (
		options.conversationName ?? options.senderName ?? "Tum Lum Ta La Messenger"
	);
}

async function registerSw(): Promise<ServiceWorkerRegistration | null> {
	if (!("serviceWorker" in navigator)) return null;
	try {
		return await navigator.serviceWorker.register("/sw.js");
	} catch {
		return null;
	}
}

async function showDesktopNotificationImpl(
	options: NewMessageNotificationOptions,
	requestPermission: () => Promise<NotificationPermission>,
) {
	if (!canUseDesktopNotifications()) return;

	const permission = await requestPermission();
	if (permission !== "granted") return;

	const title = getNotificationTitle(options);
	const body = getNotificationBody(options);
	const icon = options.senderAvatar || DEFAULT_NOTIFICATION_ICON;
	const tag = `tumlumtala-msg-${Date.now()}`;
	const payload = {
		type: "SHOW_NOTIFICATION",
		title,
		body,
		icon,
		badge: DEFAULT_NOTIFICATION_ICON,
		tag,
	};

	if (!("serviceWorker" in navigator)) {
		new Notification(title, { body, icon, tag });
		return;
	}

	try {
		// Wait for an active SW (resolves immediately if already active)
		const reg = await Promise.race([
			navigator.serviceWorker.ready,
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error("sw timeout")), 3000),
			),
		]);

		// Method 1: reg.showNotification — works even when tab is hidden
		await reg.showNotification(title, {
			body,
			icon,
			badge: DEFAULT_NOTIFICATION_ICON,
			tag,
		});
		return;
	} catch {
		// SW not ready in time — try postMessage to controller
	}

	const controller = navigator.serviceWorker.controller;
	if (controller) {
		controller.postMessage(payload);
		return;
	}

	// Last resort fallback
	new Notification(title, { body, icon, tag });
}

export function useNewMessageNotification() {
	const originalTitleRef = useRef<string>(document.title);
	const flashIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const isFlashingRef = useRef(false);
	const permissionRequestRef = useRef<Promise<NotificationPermission> | null>(
		null,
	);

	// Pre-register SW on mount so it's ready when needed
	useEffect(() => {
		void registerSw();
	}, []);

	const stopFlashing = useCallback(() => {
		if (flashIntervalRef.current) {
			clearInterval(flashIntervalRef.current);
			flashIntervalRef.current = null;
		}
		document.title = originalTitleRef.current;
		isFlashingRef.current = false;
	}, []);

	const startFlashing = useCallback(() => {
		if (isFlashingRef.current) return;
		isFlashingRef.current = true;
		let show = true;
		flashIntervalRef.current = setInterval(() => {
			document.title = show ? NOTIFICATION_LABEL : originalTitleRef.current;
			show = !show;
		}, TITLE_FLASH_INTERVAL_MS);
	}, []);

	const requestDesktopNotificationPermission = useCallback(async () => {
		if (!canUseDesktopNotifications())
			return "denied" as NotificationPermission;
		if (Notification.permission !== "default") return Notification.permission;
		if (permissionRequestRef.current) return permissionRequestRef.current;

		permissionRequestRef.current = Notification.requestPermission().finally(
			() => {
				permissionRequestRef.current = null;
			},
		);

		return permissionRequestRef.current;
	}, []);

	const notify = useCallback(
		(options: NewMessageNotificationOptions = {}) => {
			playNotificationSound();
			startFlashing();
			void showDesktopNotificationImpl(
				options,
				requestDesktopNotificationPermission,
			);
		},
		[startFlashing, requestDesktopNotificationPermission],
	);

	useEffect(() => {
		const handleFocus = () => {
			if (isFlashingRef.current) stopFlashing();
		};
		window.addEventListener("focus", handleFocus);
		return () => {
			window.removeEventListener("focus", handleFocus);
			stopFlashing();
		};
	}, [stopFlashing]);

	useEffect(() => {
		if (
			!canUseDesktopNotifications() ||
			Notification.permission !== "default"
		) {
			return;
		}

		const handleFirstInteraction = () => {
			void requestDesktopNotificationPermission();
		};

		window.addEventListener("pointerdown", handleFirstInteraction, {
			once: true,
		});
		window.addEventListener("keydown", handleFirstInteraction, { once: true });

		return () => {
			window.removeEventListener("pointerdown", handleFirstInteraction);
			window.removeEventListener("keydown", handleFirstInteraction);
		};
	}, [requestDesktopNotificationPermission]);

	return { notify, stopFlashing };
}
