import { useEffect, useRef, useState } from "react";
import type { MessengerWebSocketService } from "@/services/messengerWebSocketService";
import type { Message } from "@/types/messenger";

export const useWebSocketMessages = (
	ws: MessengerWebSocketService | null,
	conversationId?: number,
) => {
	const [_messages, setMessages] = useState<Message[]>([]);
	const [hasMore, setHasMore] = useState(true);
	const [loading, setLoading] = useState(false);
	const messagesRef = useRef<Map<string, Message>>(new Map());
	const conversationIdRef = useRef<number | undefined>(conversationId);

	useEffect(() => {
		conversationIdRef.current = conversationId;
	}, [conversationId]);

	useEffect(() => {
		if (!ws || !conversationId) {
			setMessages([]);
			messagesRef.current.clear();
			return;
		}

		setLoading(true);

		const handleJoinedRoom = (data: unknown) => {
			try {
				const payload = data as Record<string, unknown>;
				const messageList = payload.messages as unknown[];

				if (Array.isArray(messageList)) {
					messagesRef.current.clear();
					const newMessages = messageList as Message[];
					newMessages.forEach((msg) => {
						messagesRef.current.set(String(msg.id), msg);
					});
					setMessages(newMessages);
				}

				const canLoadMore = Boolean(payload.has_more);
				setHasMore(canLoadMore);
			} catch (error) {
				console.error("Error handling joined room:", error);
			} finally {
				setLoading(false);
			}
		};

		const handleMessageCreated = (data: unknown) => {
			try {
				const msg = data as Message;
				if (msg?.conversation_id === conversationIdRef.current) {
					messagesRef.current.set(String(msg.id), msg);
					setMessages(Array.from(messagesRef.current.values()));
				}
			} catch (error) {
				console.error("Error handling message created:", error);
			}
		};

		const handlers = {
			onJoinedRoom: handleJoinedRoom,
			onMessageCreated: handleMessageCreated,
		};

		// Subscribe to websocket events
		ws.addHandlers(handlers);

		// Join the room
		ws.joinRoom(conversationId, 50, 0);

		return () => {
			ws.removeHandlers(handlers);
		};
	}, [ws, conversationId]);

	return {
		messages: Array.from(messagesRef.current.values()).sort((a, b) => {
			const seqA = Number(a.message_seq ?? a.seq ?? a.id);
			const seqB = Number(b.message_seq ?? b.seq ?? b.id);
			return seqA - seqB;
		}),
		loading,
		hasMore,
		total: messagesRef.current.size,
	};
};
