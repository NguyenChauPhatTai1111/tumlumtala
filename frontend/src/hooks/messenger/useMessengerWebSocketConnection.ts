import { useEffect, useState } from "react";
import { MessengerWebSocketService } from "@/services/messengerWebSocketService";
import { useCurrentUser } from "@hooks/user/useCurrentUser";

export const useMessengerWebSocketConnection = () => {
	const [ws, setWs] = useState<MessengerWebSocketService | null>(null);
	const { user: currentUser } = useCurrentUser();

	useEffect(() => {
		if (!currentUser?.id) return;

		const wsBase = import.meta.env.VITE_WS_URL ||
			`${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws/messenger`;
		const wsUrl = wsBase;
		const token = localStorage.getItem("access_token") || "";

		if (!token) {
			console.warn("Không tìm thấy token xác thực");
			return;
		}

		const wsService = new MessengerWebSocketService(
			wsUrl,
			token,
			String(currentUser.id),
		);

		// Set instance immediately so callers can register handlers before connect resolves.
		setWs(wsService);
		wsService.connect().catch(console.error);

		return () => {
			wsService.disconnect();
			setWs(null);
		};
	}, [currentUser?.id]);

	return ws;
};
