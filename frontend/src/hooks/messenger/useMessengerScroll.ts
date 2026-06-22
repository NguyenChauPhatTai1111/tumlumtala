import { useCallback, useEffect, useRef, useState } from "react";
import type { VirtuosoHandle } from "react-virtuoso";

type Options = {
	messageListRef: React.RefObject<HTMLDivElement>;
	messagesEndRef: React.RefObject<HTMLDivElement>;
	loading: boolean;
	loadingMore: boolean;
	onLoadMore: () => boolean;
	sortedMessagesLength: number;
	initialUnreadScrollMessageId?: string | null;
	onInitialUnreadScrollHandled?: () => void;
	virtuosoRef?: React.RefObject<VirtuosoHandle | null>;
};

export const useMessengerScroll = ({
	messageListRef,
	messagesEndRef,
	loading,
	loadingMore,
	onLoadMore,
	sortedMessagesLength,
	initialUnreadScrollMessageId,
	onInitialUnreadScrollHandled,
	virtuosoRef,
}: Options) => {
	const [autoScroll, setAutoScroll] = useState(true);
	const [hideScrollToBottomButton, setHideScrollToBottomButton] =
		useState(true);
	const scrollToBottomTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const scrollToBottomInProgressRef = useRef(false);
	const loadMoreAnchorRef = useRef<{
		messageId: string;
		offsetFromTop: number;
	} | null>(null);
	const didInitialBottomSnapRef = useRef(false);
	const didInitialUnreadScrollRef = useRef<string | null>(null);

	const handleScrollToBottom = useCallback(() => {
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

		if (virtuosoRef?.current?.scrollToIndex) {
			try {
				const idx = Math.max(0, sortedMessagesLength - 1);
				virtuosoRef.current.scrollToIndex({ index: idx, align: "end" });
			} catch (_e) {
				messagesEndRef.current?.scrollIntoView({
					behavior: "smooth",
					block: "end",
				});
			}
		} else {
			messagesEndRef.current?.scrollIntoView({
				behavior: "smooth",
				block: "end",
			});
		}
		setAutoScroll(true);
	}, [messageListRef, messagesEndRef, virtuosoRef, sortedMessagesLength]);

	const requestLoadMoreWithAnchor = useCallback(() => {
		// If Virtuoso is used, defer to its `startReached` handling. Otherwise use DOM anchor method.
		if (virtuosoRef?.current) {
			setAutoScroll(false);
			return onLoadMore();
		}

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
	}, [messageListRef, loadingMore, onLoadMore, virtuosoRef]);

	useEffect(() => {
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
	}, [loadingMore, messageListRef]);

	useEffect(() => {
		if (virtuosoRef?.current) {
			if (autoScroll && virtuosoRef.current.scrollToIndex) {
				try {
					virtuosoRef.current.scrollToIndex({
						index: Math.max(0, sortedMessagesLength - 1),
						align: "end",
					});
				} catch (_e) {
					// ignore
				}
			}
			return;
		}

		const container = messageListRef.current;
		if (!container) return;

		if (autoScroll) {
			container.scrollTop = container.scrollHeight;
		}
	}, [sortedMessagesLength, autoScroll, messageListRef, virtuosoRef]);

	useEffect(() => {
		// Initial bottom snap when conversation/messages load
		if (didInitialBottomSnapRef.current) return;
		if (loading || sortedMessagesLength === 0) return;

		if (virtuosoRef?.current?.scrollToIndex) {
			try {
				virtuosoRef.current.scrollToIndex({
					index: Math.max(0, sortedMessagesLength - 1),
					align: "end",
				});
			} catch (_e) {
				// ignore
			}
			didInitialBottomSnapRef.current = true;
			setAutoScroll(true);
			setHideScrollToBottomButton(true);
			return;
		}

		const container = messageListRef.current;
		if (!container) return;

		container.scrollTop = container.scrollHeight;
		didInitialBottomSnapRef.current = true;
		setAutoScroll(true);
		setHideScrollToBottomButton(true);
	}, [loading, sortedMessagesLength, messageListRef, virtuosoRef]);

	useEffect(() => {
		if (!initialUnreadScrollMessageId) return;
		if (didInitialUnreadScrollRef.current === initialUnreadScrollMessageId)
			return;

		if (virtuosoRef?.current?.scrollToIndex) {
			const _idx = -1; // caller (component) should find index and call virtuoso directly; fallback to searching here
			// we don't have access to messages array here; let the component handle initial unread when virtuoso is used.
			return;
		}

		const container = messageListRef.current;
		if (!container) return;

		const safeId = initialUnreadScrollMessageId.replace(/["\\]/g, "\\$&");
		const target = container.querySelector(
			`[data-message-id="${safeId}"]`,
		) as HTMLElement | null;
		if (!target) return;

		didInitialUnreadScrollRef.current = initialUnreadScrollMessageId;
		target.scrollIntoView({ behavior: "auto", block: "center" });
		setAutoScroll(false);
		onInitialUnreadScrollHandled?.();
	}, [
		initialUnreadScrollMessageId,
		messageListRef,
		onInitialUnreadScrollHandled,
		virtuosoRef,
	]);

	const showScrollToBottomButton =
		!autoScroll && !hideScrollToBottomButton && sortedMessagesLength > 0;

	return {
		autoScroll,
		setAutoScroll,
		handleScrollToBottom,
		requestLoadMoreWithAnchor,
		showScrollToBottomButton,
	} as const;
};

export default useMessengerScroll;
