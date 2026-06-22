import { useEffect, useRef, useState } from "react";
import type { MessengerWebSocketService } from "@/services/messengerWebSocketService";

type TypingPayload = {
	user_id?: number | string;
	userId?: number | string;
	conversation_id?: number | string;
	conversationId?: number | string;
};

const normalizeTypingPayload = (data?: TypingPayload | null) => {
	if (!data) {
		return null;
	}

	const userId = Number(data.user_id ?? data.userId ?? 0);
	const conversationId = Number(
		data.conversation_id ?? data.conversationId ?? 0,
	);

	if (!Number.isFinite(userId) || !Number.isFinite(conversationId)) {
		return null;
	}

	return { userId, conversationId };
};

export const useMessengerTypingIndicator = (
	ws: MessengerWebSocketService | null,
	conversationId: number,
) => {
	const [typingUsers, setTypingUsers] = useState<number[]>([]);
	const typingUsersRef = useRef<Set<number>>(new Set());
	const typingTimeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

	useEffect(() => {
		if (!ws || !conversationId) return;

		const typingUsers = typingUsersRef.current;
		const typingTimeouts = typingTimeoutsRef.current;

		const handleTypingStart = (data: TypingPayload) => {
			const payload = normalizeTypingPayload(data);
			if (!payload || payload.conversationId !== conversationId) {
				return;
			}

			const userId = payload.userId;

			if (typingTimeouts.has(userId)) {
				const timeout = typingTimeouts.get(userId);
				if (timeout) {
					clearTimeout(timeout);
				}
			}

			typingUsers.add(userId);
			setTypingUsers(Array.from(typingUsers));

			const timeout = setTimeout(() => {
				typingUsers.delete(userId);
				typingTimeouts.delete(userId);
				setTypingUsers(Array.from(typingUsers));
			}, 5000);

			typingTimeouts.set(userId, timeout);
		};

		const handleTypingStop = (data: TypingPayload) => {
			const payload = normalizeTypingPayload(data);
			if (!payload || payload.conversationId !== conversationId) {
				return;
			}

			const userId = payload.userId;
			typingUsers.delete(userId);
			if (typingTimeouts.has(userId)) {
				const timeout = typingTimeouts.get(userId);
				if (timeout) {
					clearTimeout(timeout);
				}
				typingTimeouts.delete(userId);
			}
			setTypingUsers(Array.from(typingUsers));
		};

		const handlers = {
			onTypingStart: handleTypingStart,
			onUserTyping: handleTypingStart,
			onTypingStop: handleTypingStop,
		};

		ws.addHandlers(handlers);

		return () => {
			ws.removeHandlers(handlers);
			for (const timeout of typingTimeouts.values()) {
				clearTimeout(timeout);
			}
			typingTimeouts.clear();
			typingUsers.clear();
			setTypingUsers([]);
		};
	}, [ws, conversationId]);

	return typingUsers;
};
