import { useEffect, useRef, useState } from "react";
import type { MessengerWebSocketService } from "@/services/messengerWebSocketService";

type TypingPayload = {
	user_id?: number | string;
	userId?: number | string;
	conversation_id?: number | string;
	conversationId?: number | string;
};

type TypingUser = {
	userId: number;
	conversationId: number;
};

const TYPING_STALE_MS = 5000;

const normalizeTypingPayload = (data?: TypingPayload | null) => {
	if (!data) return null;

	const userId = Number(data.user_id ?? data.userId ?? 0);
	const conversationId = Number(
		data.conversation_id ?? data.conversationId ?? 0,
	);

	if (!Number.isFinite(userId) || !Number.isFinite(conversationId)) {
		return null;
	}

	return { userId, conversationId };
};

const toTypingByConversation = (typingUsers: Map<string, TypingUser>) => {
	const grouped = new Map<number, number[]>();

	for (const { conversationId, userId } of typingUsers.values()) {
		const current = grouped.get(conversationId) ?? [];
		grouped.set(conversationId, [...current, userId]);
	}

	return grouped;
};

export const useMessengerConversationTyping = (
	ws: MessengerWebSocketService | null,
) => {
	const [typingByConversation, setTypingByConversation] = useState<
		Map<number, number[]>
	>(new Map());
	const typingUsersRef = useRef<Map<string, TypingUser>>(new Map());
	const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
		new Map(),
	);

	useEffect(() => {
		if (!ws) return;

		const typingUsers = typingUsersRef.current;
		const typingTimeouts = typingTimeoutsRef.current;
		const syncTypingState = () => {
			setTypingByConversation(toTypingByConversation(typingUsers));
		};

		const handleTypingStart = (data: TypingPayload) => {
			const payload = normalizeTypingPayload(data);
			if (!payload) return;

			const key = `${payload.conversationId}:${payload.userId}`;
			const existingTimeout = typingTimeouts.get(key);
			if (existingTimeout) {
				clearTimeout(existingTimeout);
			}

			typingUsers.set(key, payload);
			syncTypingState();

			const timeout = setTimeout(() => {
				typingUsers.delete(key);
				typingTimeouts.delete(key);
				syncTypingState();
			}, TYPING_STALE_MS);

			typingTimeouts.set(key, timeout);
		};

		const handleTypingStop = (data: TypingPayload) => {
			const payload = normalizeTypingPayload(data);
			if (!payload) return;

			const key = `${payload.conversationId}:${payload.userId}`;
			const existingTimeout = typingTimeouts.get(key);
			if (existingTimeout) {
				clearTimeout(existingTimeout);
				typingTimeouts.delete(key);
			}
			typingUsers.delete(key);
			syncTypingState();
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
			setTypingByConversation(new Map());
		};
	}, [ws]);

	return typingByConversation;
};
