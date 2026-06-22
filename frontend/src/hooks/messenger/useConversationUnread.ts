import { useEffect, useRef, useState } from "react";
import type { Conversation, Message } from "@/types/messenger";

type Options = {
	selectedConversation?: Conversation;
	displayedMessages: Message[];
	messagesLoading: boolean;
	isLoadingMoreMessages: boolean;
	hasMoreOlderMessages: boolean;
	handleLoadMoreMessages: () => boolean;
	openingUnreadSnapshot?: {
		conversationId: number;
		lastReadSeq: number;
		unreadCount: number;
	} | null;
	currentUserId?: number | string | undefined;
};

export const useConversationUnread = ({
	selectedConversation,
	displayedMessages,
	messagesLoading,
	isLoadingMoreMessages,
	hasMoreOlderMessages,
	handleLoadMoreMessages,
	openingUnreadSnapshot,
	currentUserId,
}: Options) => {
	const [unreadBoundaryMessageId, setUnreadBoundaryMessageId] = useState<
		string | null
	>(null);
	const [initialUnreadScrollMessageId, setInitialUnreadScrollMessageId] =
		useState<number | null>(null);
	const unreadDoneRef = useRef(false);
	const conversationIdRef = useRef<number | null>(null);

	useEffect(() => {
		const selectedConversationId = selectedConversation?.id ?? null;
		if (conversationIdRef.current !== selectedConversationId) {
			conversationIdRef.current = selectedConversationId;
			unreadDoneRef.current = false;
			setUnreadBoundaryMessageId(null);
			setInitialUnreadScrollMessageId(null);
		}

		if (unreadDoneRef.current) {
			return;
		}

		if (!selectedConversation) {
			return;
		}

		const unreadSnapshot =
			openingUnreadSnapshot?.conversationId === selectedConversation.id
				? openingUnreadSnapshot
				: null;
		const shouldResolveUnreadBoundary =
			Number(selectedConversation.unread_count || 0) > 0 ||
			Number(unreadSnapshot?.unreadCount || 0) > 0;

		if (!shouldResolveUnreadBoundary) {
			// mark done and clear targets
			setTimeout(() => {
				setUnreadBoundaryMessageId(null);
				setInitialUnreadScrollMessageId(null);
			}, 0);
			unreadDoneRef.current = true;
			return;
		}

		if (
			displayedMessages.length === 0 ||
			messagesLoading ||
			isLoadingMoreMessages
		) {
			return;
		}

		const sorted = [...displayedMessages].sort(
			(a, b) => (a.message_seq ?? a.seq ?? 0) - (b.message_seq ?? b.seq ?? 0),
		);

		const timeoutId = setTimeout(() => {
			const cuId = Number(currentUserId ?? 0);
			const currentUserParticipant = selectedConversation.participants.find(
				(p) => p.id === Number(currentUserId),
			);
			const lastReadSeq =
				unreadSnapshot?.lastReadSeq ??
				currentUserParticipant?.last_read_seq ??
				0;
			const unreadCount = Number(
				unreadSnapshot?.unreadCount ?? selectedConversation.unread_count ?? 0,
			);
			const incomingMessages = sorted.filter(
				(item) => item.sender_id !== String(cuId),
			);

			if (unreadCount > incomingMessages.length && hasMoreOlderMessages) {
				handleLoadMoreMessages();
				return;
			}

			const firstUnreadByCount =
				unreadCount > 0
					? incomingMessages[Math.max(0, incomingMessages.length - unreadCount)]
					: undefined;

			const firstUnreadBySeq = incomingMessages.find((item) => {
				const seq = item.message_seq ?? item.seq ?? 0;
				return seq > lastReadSeq;
			});
			const firstUnreadMessage = firstUnreadByCount ?? firstUnreadBySeq;

			if (!firstUnreadMessage) {
				// All messages are read
				const latest = sorted[sorted.length - 1];
				if (latest) {
					setUnreadBoundaryMessageId(null);
					setInitialUnreadScrollMessageId(null);
				}
				unreadDoneRef.current = true;
				return;
			}

			const firstUnreadSeq = Number(
				firstUnreadMessage.message_seq ?? firstUnreadMessage.seq ?? 0,
			);
			const previousMessage = sorted
				.filter((item) => {
					const seq = Number(item.message_seq ?? item.seq ?? 0);
					return Number.isFinite(seq) && seq < firstUnreadSeq;
				})
				.at(-1);
			const previousSeq = Number(
				previousMessage?.message_seq ?? previousMessage?.seq ?? lastReadSeq,
			);
			const boundarySeq = Number.isFinite(previousSeq)
				? Math.max(previousSeq, lastReadSeq)
				: lastReadSeq;
			setUnreadBoundaryMessageId(String(boundarySeq));
			setInitialUnreadScrollMessageId(firstUnreadMessage.id);
			unreadDoneRef.current = true;
		}, 0);

		return () => clearTimeout(timeoutId);
	}, [
		selectedConversation,
		displayedMessages,
		messagesLoading,
		isLoadingMoreMessages,
		hasMoreOlderMessages,
		handleLoadMoreMessages,
		openingUnreadSnapshot,
		currentUserId,
	]);

	return {
		unreadBoundaryMessageId,
		initialUnreadScrollMessageId,
	} as const;
};

export default useConversationUnread;
