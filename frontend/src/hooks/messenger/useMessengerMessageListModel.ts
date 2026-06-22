import {
	averageGradientColors,
	getReadableTextColor,
} from "@components/messenger/utils/color";
import {
	useMessengerDeliveryReceipts,
	useMessengerSeenReceipts,
	useMessengerTypingIndicator,
} from "@hooks/messenger";
import { useCurrentUser } from "@hooks/common/useCurrentUser";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { getMessageHistory } from "@/services";
import type { MessengerWebSocketService } from "@/services/messengerWebSocketService";
import type { IUser } from "@/types";
import type { Conversation, Message, MessageHistory } from "@/types/messenger";
import { resolveCdnUrl } from "@/utils";

const LOAD_MORE_TOP_THRESHOLD = 24;
const MESSAGE_BLOCK_GAP_MINUTES = 5;

type TypingParticipant = {
	id: number;
	name: string;
	avatar: string | undefined;
};

type UseMessengerMessageListModelOptions = {
	messages: Message[];
	conversation?: Conversation;
	chatBackground?: string;
	loading: boolean;
	loadingMore: boolean;
	onLoadMore: () => boolean;
	unreadBoundaryMessageId?: string;
	showUnreadDivider?: boolean;
	initialUnreadScrollMessageId?: number;
	onInitialUnreadScrollHandled?: () => void;
	onRetryMessage?: (message: Message) => Promise<void>;
	scrollToMessageId?: number | null;
	onScrollToMessageHandled?: () => void;
	ws?: MessengerWebSocketService | null;
};

export const useMessengerMessageListModel = ({
	messages,
	conversation,
	chatBackground,
	loading,
	loadingMore,
	onLoadMore,
	unreadBoundaryMessageId,
	showUnreadDivider,
	initialUnreadScrollMessageId,
	onInitialUnreadScrollHandled,
	onRetryMessage,
	scrollToMessageId,
	onScrollToMessageHandled,
	ws,
}: UseMessengerMessageListModelOptions) => {
	const messageListRef = useRef<HTMLDivElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const scrollToBottomTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const scrollToBottomInProgressRef = useRef(false);
	const loadMoreAnchorRef = useRef<{
		messageId: string;
		offsetFromTop: number;
	} | null>(null);
	const isProgrammaticScrollingRef = useRef(false);
	const didInitialBottomSnapRef = useRef(false);
	const didInitialUnreadScrollRef = useRef<number | null>(null);
	const [autoScroll, setAutoScroll] = useState(true);
	const [hideScrollToBottomButton, setHideScrollToBottomButton] =
		useState(false);
	const [hoveredMessageId, setHoveredMessageId] = useState<number | null>(null);
	const [highlightedMessageId, setHighlightedMessageId] = useState<
		number | null
	>(null);
	const [retryingMessageIds, setRetryingMessageIds] = useState<Set<number>>(
		new Set(),
	);
	const [selectedHistories, setSelectedHistories] = useState<MessageHistory[]>(
		[],
	);
	const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
	const stickyUnreadBoundaryMessageRef = useRef<string | null>(
		unreadBoundaryMessageId ?? null,
	);
	const previousConversationIdRef = useRef<number | undefined>(
		conversation?.id,
	);
	const deliveredAckedRef = useRef<Set<number>>(new Set());

	// WebSocket hooks
	const { seenReceipts, seenSeqByUser } = useMessengerSeenReceipts(
		ws || null,
		conversation?.id ?? 0,
	);
	const typingUsers = useMessengerTypingIndicator(
		ws || null,
		conversation?.id ?? 0,
	);
	const deliveredSeq = useMessengerDeliveryReceipts(
		ws || null,
		conversation?.id ?? 0,
	);

	const { data: currentUser } = useCurrentUser();
	const currentUserId = currentUser?.id ? String(currentUser.id) : "";
	const currentUserNumericId = Number(currentUser?.id ?? 0);
	const hasImageBackground = Boolean(chatBackground?.trim().startsWith("url("));
	const hasCustomBackground = Boolean(chatBackground?.trim());
	const sampledBackgroundColor = averageGradientColors(chatBackground);
	const computedTextColor = hasImageBackground
		? "#f8fafc"
		: getReadableTextColor(sampledBackgroundColor || "#eef2f7");
	const overlayTextColor = hasCustomBackground ? computedTextColor : undefined;
	const overlayMutedTextColor = !hasCustomBackground
		? undefined
		: computedTextColor === "#f8fafc"
			? "rgba(248,250,252,0.84)"
			: "rgba(15,23,42,0.72)";
	const overlayBorderColor = !hasCustomBackground
		? undefined
		: computedTextColor === "#f8fafc"
			? "rgba(248,250,252,0.34)"
			: "rgba(30,41,59,0.26)";

	const headerStyles = useMemo(() => {
		const bgColor =
			conversation?.outgoing_bubble_color ||
			(hasCustomBackground ? sampledBackgroundColor : undefined);
		const textColor = conversation?.outgoing_text_color || overlayTextColor;

		return {
			backgroundColor: bgColor,
			color: textColor,
			borderBottom: bgColor ? `1px solid ${overlayBorderColor}` : undefined,
			transition: "all 0.2s ease-in-out",
		};
	}, [
		conversation?.outgoing_bubble_color,
		conversation?.outgoing_text_color,
		hasCustomBackground,
		sampledBackgroundColor,
		overlayTextColor,
		overlayBorderColor,
	]);

	const composerStyles = useMemo(() => {
		const bgColor =
			conversation?.outgoing_bubble_color ||
			(hasCustomBackground ? sampledBackgroundColor : undefined);
		const textColor = conversation?.outgoing_text_color || overlayTextColor;

		return {
			backgroundColor: bgColor,
			color: textColor,
			borderTop: bgColor ? `1px solid ${overlayBorderColor}` : undefined,
			transition: "all 0.2s ease-in-out",
			// Đảm bảo các thành phần bên trong như icon cũng thừa hưởng màu sắc
			"& .MuiIconButton-root, & .MuiSvgIcon-root": { color: "inherit" },
		};
	}, [
		conversation?.outgoing_bubble_color,
		conversation?.outgoing_text_color,
		hasCustomBackground,
		sampledBackgroundColor,
		overlayTextColor,
		overlayBorderColor,
	]);

	const getConversationAvatar = () => {
		if (!conversation) {
			return undefined;
		}

		if (conversation.is_group) {
			return conversation.avatar;
		}

		const other = conversation.participants?.find(
			(participant) => String(participant.id) !== currentUserId,
		);
		return resolveCdnUrl(other?.avatar);
	};

	const conversationAvatar = getConversationAvatar();

	const getSenderProfile = (senderId: string) => {
		if (!conversation?.is_group) {
			if (senderId === currentUserId) {
				return {
					name: currentUser?.fullname || currentUser?.name,
					avatar: currentUser?.avatar,
				};
			}

			const other = conversation?.participants?.find(
				(participant) => String(participant.id) !== currentUserId,
			);

			return {
				name: other?.nickname || other?.fullname,
				avatar: other?.avatar,
			};
		}

		if (senderId === currentUserId) {
			const currentParticipant = conversation.participants?.find(
				(participant) => String(participant.id) === currentUserId,
			);

			return {
				name:
					currentParticipant?.nickname ||
					currentParticipant?.fullname ||
					currentUser?.fullname ||
					currentUser?.name,
				avatar: currentParticipant?.avatar || currentUser?.avatar,
			};
		}

		const participant = conversation.participants?.find(
			(item) => String(item.id) === senderId,
		);

		return {
			name: participant?.nickname || participant?.fullname,
			avatar: participant?.avatar,
		};
	};

	const sortedMessages = useMemo(() => {
		return [...messages].sort((a, b) => {
			// Pending (optimistic) messages always render after confirmed messages,
			// regardless of timestamps (client clock may differ from server clock).
			if (a.pending && !b.pending) return 1;
			if (!a.pending && b.pending) return -1;

			const seqA = Number(a.message_seq ?? a.seq ?? 0);
			const seqB = Number(b.message_seq ?? b.seq ?? 0);

			if (seqA && seqB) {
				return seqA - seqB;
			}

			return (
				new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
			);
		});
	}, [messages]);

	const maxSeenSeqFromReceiptsByUser = useMemo(() => {
		const result = new Map<number, number>();
		const messageSeqById = new Map<number, number>();

		for (const item of sortedMessages) {
			const seq = Number(item.message_seq ?? item.seq ?? item.id);
			const messageId = Number(item.id);
			if (Number.isFinite(seq) && Number.isFinite(messageId)) {
				messageSeqById.set(messageId, seq);
			}
		}

		seenReceipts.forEach((receipts, messageId) => {
			const seq = messageSeqById.get(messageId);
			if (!Number.isFinite(seq ?? 0)) {
				return;
			}

			const validSeq = seq as number;
			receipts.forEach((receipt) => {
				const currentSeq = result.get(receipt.user_id) ?? 0;
				if (validSeq > currentSeq) {
					result.set(receipt.user_id, validSeq);
				}
			});
		});

		return result;
	}, [seenReceipts, sortedMessages]);

	const latestOutgoingMessageSeq = useMemo(() => {
		let latestSeq = 0;
		for (const message of sortedMessages) {
			if (message.sender_id !== currentUserId) {
				continue;
			}
			const seq = Number(message.message_seq ?? message.seq ?? message.id);
			if (Number.isFinite(seq) && seq > latestSeq) {
				latestSeq = seq;
			}
		}
		return latestSeq;
	}, [sortedMessages, currentUserId]);

	const getSeenParticipantsForMessage = useCallback(
		(message: Message) => {
			if (!conversation) {
				return [] as {
					id: number;
					name?: string;
					avatar?: string;
					last_read_at?: string | null;
				}[];
			}

			const messageSeq = Number(
				message.message_seq ?? message.seq ?? message.id,
			);
			if (!Number.isFinite(messageSeq) || messageSeq <= 0) {
				return [];
			}

			const messageReceipts = seenReceipts.get(Number(message.id)) ?? [];

			return conversation.participants
				.filter((participant) => {
					if (participant.id === currentUserNumericId) {
						return false;
					}

					const hasSpecificReceipt = messageReceipts.some(
						(receipt) => receipt.user_id === participant.id,
					);
					const liveReadSeq = seenSeqByUser.get(participant.id) ?? 0;
					const persistedReadSeq = Number(participant.last_read_seq ?? 0);
					const receiptReadSeq =
						maxSeenSeqFromReceiptsByUser.get(participant.id) ?? 0;
					const readSeq = Math.max(
						liveReadSeq,
						persistedReadSeq,
						receiptReadSeq,
						hasSpecificReceipt ? messageSeq : 0,
					);

					const latestSentSeq = sortedMessages.reduce((latestSeq, item) => {
						if (
							item.pending ||
							String(item.sender_id) !== String(participant.id)
						) {
							return latestSeq;
						}

						const seq = Number(item.message_seq ?? item.seq ?? item.id);
						return Number.isFinite(seq) && seq > latestSeq ? seq : latestSeq;
					}, 0);
					const cursorSeq = Math.max(readSeq, latestSentSeq);

					if (cursorSeq <= 0) {
						return false;
					}

					const targetMessageSeq = sortedMessages.reduce((targetSeq, item) => {
						const seq = Number(item.message_seq ?? item.seq ?? item.id);
						if (!Number.isFinite(seq) || seq > cursorSeq || seq <= targetSeq) {
							return targetSeq;
						}

						return seq;
					}, 0);

					return targetMessageSeq === messageSeq;
				})
				.map((participant) => ({
					id: participant.id,
					name: participant.nickname || participant.fullname,
					avatar: participant.avatar,
					last_read_at: participant.last_read_at,
				}));
		},
		[
			conversation,
			currentUserNumericId,
			seenSeqByUser,
			seenReceipts,
			sortedMessages,
			maxSeenSeqFromReceiptsByUser,
		],
	);

	const typingParticipants = useMemo(() => {
		if (!conversation) {
			return [] as TypingParticipant[];
		}

		return typingUsers
			.map((userId) => {
				if (String(userId) === currentUserId) {
					return null;
				}

				const participant = conversation.participants?.find(
					(p) => p.id === userId,
				);
				const name = participant?.nickname || participant?.fullname || "";
				if (!name) {
					return null;
				}

				return {
					id: userId,
					name,
					avatar: participant?.avatar,
				};
			})
			.filter((item): item is TypingParticipant => Boolean(item));
	}, [conversation, typingUsers, currentUserId]);

	const hasConversationChanged =
		previousConversationIdRef.current !== conversation?.id;
	if (hasConversationChanged) {
		previousConversationIdRef.current = conversation?.id;
		// Reset synchronously so useLayoutEffect sees the fresh value before it fires.
		didInitialBottomSnapRef.current = false;
		didInitialUnreadScrollRef.current = null;
		loadMoreAnchorRef.current = null;
	}

	useEffect(() => {
		if (!hasConversationChanged) {
			return;
		}

		/* eslint-disable react-hooks/set-state-in-effect */
		setAutoScroll(true);
		setHideScrollToBottomButton(true);
		/* eslint-enable react-hooks/set-state-in-effect */
	}, [hasConversationChanged]);

	const shouldTrackUnreadDivider =
		showUnreadDivider ?? Number(conversation?.unread_count ?? 0) > 0;
	if (!shouldTrackUnreadDivider || hasConversationChanged) {
		stickyUnreadBoundaryMessageRef.current = null;
	}

	if (shouldTrackUnreadDivider && unreadBoundaryMessageId) {
		stickyUnreadBoundaryMessageRef.current = unreadBoundaryMessageId;
	}

	const effectiveUnreadBoundaryMessageId = shouldTrackUnreadDivider
		? (unreadBoundaryMessageId ?? stickyUnreadBoundaryMessageRef.current)
		: null;
	const unreadBoundarySeq = Number(effectiveUnreadBoundaryMessageId);
	const hasUnreadBoundaryById =
		effectiveUnreadBoundaryMessageId !== null &&
		Number.isFinite(unreadBoundarySeq);
	const hasUnreadMessagesByBoundary = useMemo(() => {
		if (!hasUnreadBoundaryById) {
			return false;
		}

		return sortedMessages.some((item) => {
			const seq = Number(item.message_seq ?? item.seq ?? item.id);
			return (
				String(item.sender_id) !== currentUserId &&
				Number.isFinite(seq) &&
				seq > unreadBoundarySeq
			);
		});
	}, [sortedMessages, hasUnreadBoundaryById, unreadBoundarySeq, currentUserId]);
	const unreadDividerTargetMessageId = useMemo(() => {
		if (!hasUnreadBoundaryById) {
			return null;
		}

		const firstUnreadMessage = sortedMessages.find((item) => {
			const seq = Number(item.message_seq ?? item.seq ?? item.id);
			return (
				String(item.sender_id) !== currentUserId &&
				Number.isFinite(seq) &&
				seq > unreadBoundarySeq
			);
		});

		return firstUnreadMessage?.id ?? null;
	}, [sortedMessages, hasUnreadBoundaryById, unreadBoundarySeq, currentUserId]);

	const hoveredGroupStartMessageId = useMemo(() => {
		if (!hoveredMessageId) {
			return null;
		}

		const hoveredIndex = sortedMessages.findIndex(
			(item) => item.id === hoveredMessageId,
		);
		if (hoveredIndex < 0) {
			return null;
		}

		let groupStartIndex = hoveredIndex;
		while (groupStartIndex > 0) {
			const current = sortedMessages[groupStartIndex];
			const previous = sortedMessages[groupStartIndex - 1];

			if (!current || !previous) {
				break;
			}

			if (previous.sender_id !== current.sender_id) {
				break;
			}

			if (hasUnreadBoundaryById) {
				const currentSeq = Number(
					current.message_seq ?? current.seq ?? current.id,
				);
				const previousSeq = Number(
					previous.message_seq ?? previous.seq ?? previous.id,
				);
				if (Number.isFinite(currentSeq) && Number.isFinite(previousSeq)) {
					const isCurrentUnread =
						String(current.sender_id) !== currentUserId &&
						currentSeq > unreadBoundarySeq;
					const isPreviousUnread =
						String(previous.sender_id) !== currentUserId &&
						previousSeq > unreadBoundarySeq;
					if (isCurrentUnread !== isPreviousUnread) {
						break;
					}
				}
			}

			const currentCreatedAt = new Date(current.created_at).getTime();
			const previousCreatedAt = new Date(previous.created_at).getTime();
			if (
				!Number.isFinite(currentCreatedAt) ||
				!Number.isFinite(previousCreatedAt)
			) {
				break;
			}

			const timeGapMinutes =
				(currentCreatedAt - previousCreatedAt) / (1000 * 60);
			if (timeGapMinutes > MESSAGE_BLOCK_GAP_MINUTES) {
				break;
			}

			groupStartIndex -= 1;
		}

		return sortedMessages[groupStartIndex]?.id ?? null;
	}, [
		hoveredMessageId,
		sortedMessages,
		hasUnreadBoundaryById,
		unreadBoundarySeq,
		currentUserId,
	]);

	const messagesById = useMemo(() => {
		const map = new Map<number, Message>();
		sortedMessages.forEach((msg) => {
			const numericId = Number(msg.id);
			if (Number.isFinite(numericId)) {
				map.set(numericId, msg);
			}
		});
		return map;
	}, [sortedMessages]);

	const scrollToMessageAndHighlight = useCallback((messageId: number) => {
		const container = messageListRef.current;
		if (!container) {
			return;
		}

		const selectorSafeMessageId = String(messageId);
		const target = container.querySelector(
			`[data-message-id="${selectorSafeMessageId}"]`,
		) as HTMLDivElement | null;
		if (!target) {
			return;
		}

		// Khóa logic auto-scroll để trình duyệt có thể thực hiện cuộn mượt mà
		isProgrammaticScrollingRef.current = true;
		setAutoScroll(false);

		const SCROLL_OFFSET = 80;
		container.scrollTo({
			top: target.offsetTop - SCROLL_OFFSET,
			behavior: "smooth",
		});
		setHighlightedMessageId(messageId);

		if (highlightTimeoutRef.current) {
			clearTimeout(highlightTimeoutRef.current);
		}
		highlightTimeoutRef.current = setTimeout(() => {
			setHighlightedMessageId((current) =>
				current === messageId ? null : current,
			);
			isProgrammaticScrollingRef.current = false;
		}, 1500);
	}, []);

	const handleViewHistories = async (message: Message) => {
		try {
			const histories = await getMessageHistory(message.id);

			setSelectedHistories(histories);

			setHistoryDialogOpen(true);
		} catch (err) {
			console.error(err);
		}
	};

	const handleScrollToBottom = () => {
		setHideScrollToBottomButton(true);
		scrollToBottomInProgressRef.current = true;
		if (scrollToBottomTimeoutRef.current) {
			clearTimeout(scrollToBottomTimeoutRef.current);
		}
		scrollToBottomTimeoutRef.current = setTimeout(() => {
			scrollToBottomInProgressRef.current = false;
			const container = messageListRef.current;
			if (!container) {
				return;
			}

			const isScrolledToBottom =
				container.scrollHeight - container.scrollTop - container.clientHeight <
				50;
			if (!isScrolledToBottom) {
				setHideScrollToBottomButton(false);
			}
		}, 900);
		messagesEndRef.current?.scrollIntoView({
			behavior: "smooth",
			block: "end",
		});
		setAutoScroll(true);
	};

	const showScrollToBottomButton =
		!autoScroll && !hideScrollToBottomButton && sortedMessages.length > 0;

	const handleRetryMessage = async (message: Message) => {
		if (!onRetryMessage || retryingMessageIds.has(message.id)) {
			return;
		}

		setRetryingMessageIds((prev) => new Set<number>(prev).add(message.id));
		try {
			await onRetryMessage(message);
		} finally {
			setRetryingMessageIds((prev) => {
				const next = new Set<number>(prev);
				next.delete(message.id);
				return next;
			});
		}
	};

	useEffect(() => {
		didInitialBottomSnapRef.current = false;
		deliveredAckedRef.current.clear();
	}, []);

	useLayoutEffect(() => {
		const container = messageListRef.current;
		if (
			!container ||
			loading ||
			sortedMessages.length === 0 ||
			didInitialBottomSnapRef.current
		) {
			return;
		}

		container.scrollTop = container.scrollHeight;
		didInitialBottomSnapRef.current = true;
		setAutoScroll(true);
		setHideScrollToBottomButton(true);
	}, [loading, sortedMessages.length]);

	const requestLoadMoreWithAnchor = useCallback(() => {
		const container = messageListRef.current;
		if (!container || loadingMore) {
			return false;
		}

		const rows = Array.from(
			container.querySelectorAll("[data-message-id]"),
		) as HTMLDivElement[];

		let anchorRow: HTMLDivElement | null = null;
		for (const row of rows) {
			if (row.offsetTop + row.offsetHeight > container.scrollTop) {
				anchorRow = row;
				break;
			}
		}

		if (anchorRow?.dataset.messageId) {
			loadMoreAnchorRef.current = {
				messageId: anchorRow.dataset.messageId,
				offsetFromTop: anchorRow.offsetTop - container.scrollTop,
			};
		}

		// While prepending older messages, keep viewport anchored instead of snapping to bottom.
		setAutoScroll(false);

		const started = onLoadMore();
		if (!started) {
			loadMoreAnchorRef.current = null;
		}

		return started;
	}, [loadingMore, onLoadMore]);

	useLayoutEffect(() => {
		const anchor = loadMoreAnchorRef.current;
		const container = messageListRef.current;
		if (!anchor || !container) {
			return;
		}

		const selectorSafeMessageId = anchor.messageId.replace(/["\\]/g, "\\$&");
		const anchorRow = container.querySelector(
			`[data-message-id="${selectorSafeMessageId}"]`,
		) as HTMLDivElement | null;
		if (!anchorRow) {
			if (!loadingMore) {
				loadMoreAnchorRef.current = null;
			}
			return;
		}

		container.scrollTop = anchorRow.offsetTop - anchor.offsetFromTop;

		if (!loadingMore) {
			loadMoreAnchorRef.current = null;
		}
	}, [loadingMore]);

	// Track the unique key of the latest outgoing message (temp_id is unique per send).
	// This changes every time the current user sends a new message, even consecutive ones.
	const lastOutgoingMessageKey = useMemo(() => {
		for (let i = sortedMessages.length - 1; i >= 0; i--) {
			const msg = sortedMessages[i];
			if (msg?.sender_id != null && String(msg.sender_id) === currentUserId) {
				return msg.temp_id || String(msg.id);
			}
		}
		return null;
	}, [sortedMessages, currentUserId]);

	// Force-snap to bottom whenever the current user sends a new message,
	// regardless of whether autoScroll is on (user may be scrolled up).
	useLayoutEffect(() => {
		if (!lastOutgoingMessageKey || isProgrammaticScrollingRef.current) return;
		const container = messageListRef.current;
		if (!container || loadMoreAnchorRef.current) return;
		container.scrollTop = container.scrollHeight;
		setAutoScroll(true);
		setHideScrollToBottomButton(true);
	}, [lastOutgoingMessageKey]);

	// Keep pinned to bottom when new incoming messages arrive and user is at the bottom.
	useLayoutEffect(() => {
		if (
			loadMoreAnchorRef.current ||
			!autoScroll ||
			isProgrammaticScrollingRef.current
		) {
			return;
		}

		const container = messageListRef.current;
		if (!container) {
			return;
		}

		container.scrollTop = container.scrollHeight;
	}, [autoScroll]);

	useEffect(() => {
		return () => {
			if (highlightTimeoutRef.current) {
				clearTimeout(highlightTimeoutRef.current);
			}

			if (scrollToBottomTimeoutRef.current) {
				clearTimeout(scrollToBottomTimeoutRef.current);
			}
		};
	}, []);

	useEffect(() => {
		if (!scrollToMessageId) {
			return;
		}

		const container = messageListRef.current;
		if (!container) {
			return;
		}

		const selectorSafeMessageId = String(scrollToMessageId);
		const target = container.querySelector(
			`[data-message-id="${selectorSafeMessageId}"]`,
		) as HTMLDivElement | null;

		if (!target) {
			// If the message is not in the rendered viewport yet, request older messages.
			// This covers search results pointing to messages that are still paginated out.
			requestLoadMoreWithAnchor();
			return;
		}

		scrollToMessageAndHighlight(scrollToMessageId);
		onScrollToMessageHandled?.();
	}, [
		scrollToMessageId,
		onScrollToMessageHandled,
		requestLoadMoreWithAnchor,
		scrollToMessageAndHighlight,
	]);

	useEffect(() => {
		if (!initialUnreadScrollMessageId) {
			return;
		}

		if (didInitialUnreadScrollRef.current === initialUnreadScrollMessageId) {
			return;
		}

		const container = messageListRef.current;
		if (!container) {
			return;
		}

		const safeId = String(initialUnreadScrollMessageId);
		const target = container.querySelector(
			`[data-message-id="${safeId}"]`,
		) as HTMLElement | null;
		if (!target) {
			return;
		}

		didInitialUnreadScrollRef.current = initialUnreadScrollMessageId;
		target.scrollIntoView({ behavior: "auto", block: "center" });
		setAutoScroll(false);
		onInitialUnreadScrollHandled?.();
	}, [initialUnreadScrollMessageId, onInitialUnreadScrollHandled]);

	useEffect(() => {
		const container = messageListRef.current;
		if (!container) {
			return;
		}

		const isNearTop = container.scrollTop <= LOAD_MORE_TOP_THRESHOLD;
		if (isNearTop && !loadingMore) {
			requestLoadMoreWithAnchor();
		}
	}, [loadingMore, requestLoadMoreWithAnchor]);

	// Auto-mark messages as seen
	useEffect(() => {
		if (!ws || !conversation || !messageListRef.current) {
			return;
		}

		const currentUserParticipant = conversation.participants?.find(
			(p) => p.id === currentUserNumericId,
		);
		const lastReadSeq = currentUserParticipant?.last_read_seq ?? 0;

		const observer = new IntersectionObserver(
			(entries) => {
				let maxSeenId = 0;
				for (const entry of entries) {
					if (entry.isIntersecting) {
						const messageId = (entry.target as HTMLElement).getAttribute(
							"data-message-id",
						);
						if (messageId) {
							const numericId = Number(messageId);
							if (Number.isFinite(numericId)) {
								// Skip if already read by the current user
								if (numericId <= lastReadSeq) {
									continue;
								}

								// Skip if the message was sent by the current user
								const msg = messagesById.get(numericId);
								if (msg && String(msg.sender_id) === currentUserId) {
									continue;
								}

								if (numericId > maxSeenId) {
									maxSeenId = numericId;
								}
							}
						}
					}
				}
				if (maxSeenId > 0) {
					ws.markMessageAsSeen(conversation.id, maxSeenId);
				}
			},
			{ threshold: 0.5 },
		);

		const container = messageListRef.current;
		const messageElements = container.querySelectorAll("[data-message-id]");
		messageElements.forEach((el) => {
			observer.observe(el);
		});

		return () => {
			messageElements.forEach((el) => {
				observer.unobserve(el);
			});

			observer.disconnect();
		};
	}, [ws, conversation, messagesById, currentUserId, currentUserNumericId]);

	return {
		messageListRef,
		messagesEndRef,
		scrollToBottomTimeoutRef,
		scrollToBottomInProgressRef,
		sortedMessages,
		currentUserId,
		currentUserNumericId,
		hasImageBackground,
		overlayTextColor,
		overlayMutedTextColor,
		overlayBorderColor,
		headerStyles,
		composerStyles,
		conversationAvatar,
		messagesById,
		seenReceipts,
		seenSeqByUser,
		maxSeenSeqFromReceiptsByUser,
		latestOutgoingMessageSeq,
		deliveredSeq,
		hasUnreadMessagesByBoundary,
		hasUnreadBoundaryById,
		unreadBoundarySeq,
		unreadDividerTargetMessageId,
		hoveredGroupStartMessageId,
		hoveredMessageId,
		highlightedMessageId,
		retryingMessageIds,
		selectedHistories,
		historyDialogOpen,
		typingParticipants,
		showScrollToBottomButton,
		getSenderProfile,
		getSeenParticipantsForMessage,
		scrollToMessageAndHighlight,
		handleViewHistories,
		handleRetryMessage,
		handleScrollToBottom,
		requestLoadMoreWithAnchor,
		setAutoScroll: (value: boolean) => {
			// Ngăn cản handleScroll trong Viewport ghi đè trạng thái khi đang thực hiện Jump
			if (isProgrammaticScrollingRef.current) return;
			setAutoScroll(value);
		},
		setHideScrollToBottomButton,
		setHoveredMessageId,
		setHistoryDialogOpen,
		loadMoreTopThreshold: LOAD_MORE_TOP_THRESHOLD,
		messageBlockGapMinutes: MESSAGE_BLOCK_GAP_MINUTES,
	} as const;
};
