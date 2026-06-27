import { useEffect, useRef, useState } from "react";
import type { MessengerWebSocketService } from "@/services/messengerWebSocketService";

const HEARTBEAT_INTERVAL_MS = 30_000;

export function usePresence(wsService: MessengerWebSocketService | null) {
	const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());
	const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		if (!wsService) return;

		const handlers = {
			onMessengerSubscribed: (data: { user_id: number; online_user_ids?: number[] }) => {
				if (data.online_user_ids) {
					setOnlineUserIds(new Set(data.online_user_ids));
				}
			},
			onPresenceUpdated: (data: { user_id: number; status: "online" | "offline" }) => {
				setOnlineUserIds((prev) => {
					const next = new Set(prev);
					if (data.status === "online") {
						next.add(data.user_id);
					} else {
						next.delete(data.user_id);
					}
					return next;
				});
			},
		};

		wsService.addHandlers(handlers);

		heartbeatRef.current = setInterval(() => {
			wsService.sendPresenceHeartbeat();
		}, HEARTBEAT_INTERVAL_MS);

		return () => {
			wsService.removeHandlers(handlers);
			if (heartbeatRef.current) {
				clearInterval(heartbeatRef.current);
				heartbeatRef.current = null;
			}
		};
	}, [wsService]);

	return onlineUserIds;
}
