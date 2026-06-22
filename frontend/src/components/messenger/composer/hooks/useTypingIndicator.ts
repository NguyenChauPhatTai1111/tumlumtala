import { useCallback, useEffect, useRef } from "react";
import type { MessengerWebSocketService } from "@/services/messengerWebSocketService";

const TYPING_STOP_DELAY_MS = 1000;
const TYPING_HEARTBEAT_MS = 1000;

export const useTypingIndicator = (
	ws: MessengerWebSocketService | null,
	conversationId?: number,
) => {
	const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const typingActiveRef = useRef(false);
	const lastTypingStartSentAtRef = useRef(0);

	const clearTypingState = useCallback(() => {
		if (typingTimeoutRef.current) {
			clearTimeout(typingTimeoutRef.current);
			typingTimeoutRef.current = null;
		}

		if (typingActiveRef.current && ws?.isConnected() && conversationId) {
			ws.sendTypingStop(conversationId);
		}
		typingActiveRef.current = false;
		lastTypingStartSentAtRef.current = 0;
	}, [ws, conversationId]);

	useEffect(() => {
		return () => {
			clearTypingState();
		};
	}, [clearTypingState]);

	const handleTextChange = useCallback(
		(
			newText: string,
			setText: React.Dispatch<React.SetStateAction<string>>,
		) => {
			setText(newText);

			if (!ws?.isConnected() || !conversationId) {
				return;
			}

			if (newText.trim().length === 0) {
				clearTypingState();
				return;
			}

			const now = Date.now();
			if (
				!typingActiveRef.current ||
				now - lastTypingStartSentAtRef.current >= TYPING_HEARTBEAT_MS
			) {
				ws.sendTypingStart(conversationId);
				typingActiveRef.current = true;
				lastTypingStartSentAtRef.current = now;
			}

			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current);
			}

			typingTimeoutRef.current = setTimeout(() => {
				if (typingActiveRef.current && ws?.isConnected() && conversationId) {
					ws.sendTypingStop(conversationId);
				}
				typingActiveRef.current = false;
				lastTypingStartSentAtRef.current = 0;

				typingTimeoutRef.current = null;
			}, TYPING_STOP_DELAY_MS);
		},
		[clearTypingState, conversationId, ws],
	);

	return {
		handleTextChange,
		clearTypingState,
	};
};
