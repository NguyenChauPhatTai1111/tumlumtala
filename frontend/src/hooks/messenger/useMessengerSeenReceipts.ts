import { useEffect, useRef, useState } from "react";
import type { MessengerWebSocketService } from "@/services/messengerWebSocketService";

interface SeenReceipt {
	user_id: number;
	seen_at: string;
}

export const useMessengerSeenReceipts = (
	ws: MessengerWebSocketService | null,
	conversationId: number,
) => {
	const [seenReceipts, setSeenReceipts] = useState<Map<number, SeenReceipt[]>>(
		new Map(),
	);
	const [maxSeenSeq, setMaxSeenSeq] = useState<number>(0);
	const [seenSeqByUser, setSeenSeqByUser] = useState<Map<number, number>>(
		new Map(),
	);
	const maxSeenSeqRef = useRef<number>(0);

	useEffect(() => {
		if (!ws || !conversationId) return;

		const handleMessageSeen = (data: {
			message_id: number;
			user_id: number;
			conversation_id: number;
			seen_at: string;
		}) => {
			// Filter by conversation_id
			if (data.conversation_id !== conversationId) {
				return;
			}

			setSeenReceipts((prev) => {
				const newMap = new Map(prev);
				const messageReceipts = newMap.get(data.message_id) || [];

				// Check if this user already has a seen receipt for this message
				const exists = messageReceipts.some((r) => r.user_id === data.user_id);
				if (!exists) {
					messageReceipts.push({
						user_id: data.user_id,
						seen_at: data.seen_at,
					});
					newMap.set(data.message_id, messageReceipts);
				}

				return newMap;
			});
		};

		const handleMessageSeenSeq = (data: {
			user_id: number;
			conversation_id: number;
			last_read_seq: number;
			seen_at?: string;
		}) => {
			if (data.conversation_id !== conversationId) {
				return;
			}

			const seq = Number(data.last_read_seq);
			if (!Number.isFinite(seq) || seq <= 0) {
				return;
			}

			if (seq > maxSeenSeqRef.current) {
				maxSeenSeqRef.current = seq;
				setMaxSeenSeq(seq);
			}

			setSeenSeqByUser((prev) => {
				const next = new Map(prev);
				const currentSeq = next.get(data.user_id) ?? 0;
				if (seq > currentSeq) {
					next.set(data.user_id, seq);
				}
				return next;
			});
		};

		const handlers = {
			onMessageSeen: handleMessageSeen,
			onMessageSeenSeq: handleMessageSeenSeq,
		};

		ws.addHandlers(handlers);

		return () => {
			ws.removeHandlers(handlers);
			maxSeenSeqRef.current = 0;
			setMaxSeenSeq(0);
			setSeenSeqByUser(new Map());
			setSeenReceipts(new Map());
		};
	}, [ws, conversationId]);

	return { seenReceipts, maxSeenSeq, seenSeqByUser };
};
