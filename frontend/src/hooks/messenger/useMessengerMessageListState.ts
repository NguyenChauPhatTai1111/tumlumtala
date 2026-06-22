import { formatMessengerTimestamp } from "@components/messenger/utils/date";
import {
	buildComputedMessages,
	buildMessagesById,
	getDeliveredSeq,
	getLatestOutgoingMessageSeq,
	getMessageListConversationAvatar,
	getMessageSeq,
	getSeenParticipantsForMessage,
	sortMessages,
} from "@components/messenger/utils/messageList";
import { mergeMessengerMessages } from "@components/messenger/utils/render_utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { VirtuosoHandle } from "react-virtuoso";
import type { MessengerWebSocketService } from "@/services/messengerWebSocketService";
import type { IUser } from "@/types";
import type { Conversation, Message, Participant } from "@/types/messenger";
import { useMessengerTypingIndicator } from "./useMessengerTypingIndicator";

type Options = {
	currentUser?: IUser;
	messages: Message[];
	pendingMessages: Message[];
	conversation?: Conversation;
	hasMore: boolean;
	loadingMore: boolean;
	onLoadMore?: () => boolean;
	initialUnreadScrollMessageId?: number;
	onInitialUnreadScrollHandled?: () => void;
	onRetryMessage?: (message: Message) => Promise<void>;
	scrollToMessageId?: number;
	onScrollToMessageHandled?: () => void;
	ws?: MessengerWebSocketService | null;
};

export const useMessengerMessageListState = ({
	currentUser,
	messages,
	pendingMessages,
	conversation,
	hasMore,
	loadingMore,
	onLoadMore,
	initialUnreadScrollMessageId,
	onInitialUnreadScrollHandled,
	onRetryMessage,
	scrollToMessageId,
	onScrollToMessageHandled,
	ws,
}: Options) => {
	const virtuosoRef = useRef<VirtuosoHandle | null>(null);
	const [hoveredMessageId, setHoveredMessageId] = useState<number | null>(null);
	const [highlightedMessageId, setHighlightedMessageId] = useState<
		number | null
	>(null);
	const [retryingMessageIds, setRetryingMessageIds] = useState<Set<number>>(
		new Set(),
	);
	const [showScrollToBottomButton, setShowScrollToBottomButton] =
		useState(false);

	const currentUserId = String(currentUser?.id ?? "");
	const sortedMessages = useMemo(() => {
		const merged = mergeMessengerMessages(messages, pendingMessages);
		return sortMessages(merged);
	}, [messages, pendingMessages]);

	const computedMessages = useMemo(
		() => buildComputedMessages(sortedMessages, currentUserId),
		[currentUserId, sortedMessages],
	);
	const messagesById = useMemo(
		() => buildMessagesById(sortedMessages),
		[sortedMessages],
	);
	const conversationAvatar = useMemo(
		() => getMessageListConversationAvatar(conversation, currentUserId),
		[conversation, currentUserId],
	);
	const latestOutgoingMessageSeq = useMemo(
		() => getLatestOutgoingMessageSeq(sortedMessages, currentUserId),
		[currentUserId, sortedMessages],
	);
	const deliveredSeq = useMemo(
		() => getDeliveredSeq(sortedMessages, currentUserId),
		[currentUserId, sortedMessages],
	);
	const seenReceipts = useMemo(() => new Map<number, Participant[]>(), []);
	const typingUserIds = useMessengerTypingIndicator(
		ws ?? null,
		conversation?.id ?? 0,
	);

	const typingNames = useMemo(() => {
		if (!conversation) return [];

		return typingUserIds
			.filter((userId) => String(userId) !== currentUserId)
			.map((userId) => {
				const participant = conversation.participants.find(
					(item) => item.id === userId,
				);
				return participant?.nickname || participant?.fullname || "Ai đó";
			});
	}, [conversation, currentUserId, typingUserIds]);

	const requestLoadMoreWithAnchor = useCallback(() => {
		if (!hasMore || loadingMore) return;
		onLoadMore?.();
	}, [hasMore, loadingMore, onLoadMore]);

	const scrollToMessageAndHighlight = useCallback(
		(messageId: number) => {
			const index = sortedMessages.findIndex(
				(message) => message.id === messageId,
			);
			if (index < 0) return;

			virtuosoRef.current?.scrollToIndex({
				index,
				align: "center",
				behavior: "smooth",
			});
			setHighlightedMessageId(messageId);
			window.setTimeout(
				() =>
					setHighlightedMessageId((current) =>
						current === messageId ? null : current,
					),
				1800,
			);
		},
		[sortedMessages],
	);

	const handleScrollToBottom = useCallback(() => {
		if (sortedMessages.length > 0) {
			virtuosoRef.current?.scrollToIndex({
				index: sortedMessages.length - 1,
				align: "end",
				behavior: "smooth",
			});
		}
		setShowScrollToBottomButton(false);
	}, [sortedMessages.length]);

	const handleRetryMessage = useCallback(
		async (message: Message) => {
			if (!onRetryMessage) return;

			setRetryingMessageIds((current) =>
				new Set<number>(current).add(message.id),
			);
			try {
				await onRetryMessage(message);
			} finally {
				setRetryingMessageIds((current) => {
					const next = new Set<number>(current);
					next.delete(message.id);
					return next;
				});
			}
		},
		[onRetryMessage],
	);

	const handleViewHistories = useCallback((message: Message) => {
		const histories = message.histories ?? [];
		if (histories.length === 0) return;
		window.alert(
			histories
				.map(
					(history) =>
						`${formatMessengerTimestamp(history.edited_at)}\n${history.content}`,
				)
				.join("\n\n"),
		);
	}, []);

	const getSeenParticipants = useCallback(
		(message: Message) =>
			getSeenParticipantsForMessage(message, conversation, currentUserId),
		[conversation, currentUserId],
	);

	useEffect(() => {
		if (!initialUnreadScrollMessageId) return;
		const timeoutId = window.setTimeout(() => {
			scrollToMessageAndHighlight(initialUnreadScrollMessageId);
			onInitialUnreadScrollHandled?.();
		}, 0);

		return () => window.clearTimeout(timeoutId);
	}, [
		initialUnreadScrollMessageId,
		onInitialUnreadScrollHandled,
		scrollToMessageAndHighlight,
	]);

	useEffect(() => {
		if (!scrollToMessageId) return;
		const timeoutId = window.setTimeout(() => {
			scrollToMessageAndHighlight(scrollToMessageId);
			onScrollToMessageHandled?.();
		}, 0);

		return () => window.clearTimeout(timeoutId);
	}, [
		onScrollToMessageHandled,
		scrollToMessageAndHighlight,
		scrollToMessageId,
	]);

	useEffect(() => {
		if (!conversation || sortedMessages.length === 0) return;
		const latestSeq = getMessageSeq(sortedMessages[sortedMessages.length - 1]);
		if (Number.isFinite(latestSeq)) {
			ws?.sendConversationRead(conversation.id, latestSeq);
		}
	}, [conversation, sortedMessages, ws]);

	return {
		virtuosoRef,
		hoveredMessageId,
		setHoveredMessageId,
		highlightedMessageId,
		retryingMessageIds,
		showScrollToBottomButton,
		setShowScrollToBottomButton,
		currentUserId,
		sortedMessages,
		computedMessages,
		messagesById,
		conversationAvatar,
		latestOutgoingMessageSeq,
		deliveredSeq,
		seenReceipts,
		typingNames,
		requestLoadMoreWithAnchor,
		scrollToMessageAndHighlight,
		handleScrollToBottom,
		handleRetryMessage,
		handleViewHistories,
		getSeenParticipants,
	} as const;
};
