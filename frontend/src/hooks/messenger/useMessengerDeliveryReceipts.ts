import { useEffect, useState } from "react";
import type { MessengerWebSocketService } from "@/services/messengerWebSocketService";

export const useMessengerDeliveryReceipts = (
	ws: MessengerWebSocketService | null,
	conversationId: number,
) => {
	const [deliveredSeq, setDeliveredSeq] = useState<number>(0);

	useEffect(() => {
		if (!ws || !conversationId) {
			return;
		}

		const handlers = {
			onMessageDelivered: (data: {
				user_id: number;
				conversation_id: number;
				message_seq: number;
			}) => {
				if (data.conversation_id !== conversationId) {
					return;
				}

				setDeliveredSeq((prev) => {
					const seq = Number(data.message_seq);
					if (!Number.isFinite(seq) || seq <= 0) {
						return prev;
					}
					return seq > prev ? seq : prev;
				});
			},
		};

		ws.addHandlers(handlers);

		return () => {
			ws.removeHandlers(handlers);
			setDeliveredSeq(0);
		};
	}, [ws, conversationId]);

	return deliveredSeq;
};
