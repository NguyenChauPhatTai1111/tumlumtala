import { useEffect, useState } from "react";
import { MessengerWebSocketService } from "@/services/messengerWebSocketService";
import { useCurrentUser } from "@hooks/common/useCurrentUser";

export const useMessengerWebSocketConnection = () => {
	const [ws, setWs] = useState<MessengerWebSocketService | null>(null);
	const { data: currentUser } = useCurrentUser();

	useEffect(() => {
		if (!currentUser?.id) return;

		const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost/ws/messenger";
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
