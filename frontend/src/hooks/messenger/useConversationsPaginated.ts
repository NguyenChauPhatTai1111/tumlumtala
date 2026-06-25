import { getConversations } from "@services/messengerService";
import { useCallback, useRef, useState } from "react";
import type { Conversation } from "@/types/messenger";

function mergeConversations(
	current: Conversation[],
	incoming: Conversation[],
	mode: "append" | "prepend",
) {
	if (incoming.length === 0) return current;

	const byId = new Map<number, Conversation>(
		current.map((conversation) => [conversation.id, conversation]),
	);
	const ordered =
		mode === "append" ? [...current, ...incoming] : [...incoming, ...current];

	for (const conversation of incoming) {
		byId.set(conversation.id, {
			...byId.get(conversation.id),
			...conversation,
		});
	}

	return ordered
		.filter(
			(conversation, index, list) =>
				list.findIndex((item) => item.id === conversation.id) === index,
		)
		.map((conversation) => byId.get(conversation.id) ?? conversation);
}

export function useConversationsPaginated(pageSize = 10) {
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [loading, setLoading] = useState(false);
	const [hasMore, setHasMore] = useState(true);

	const conversationsRef = useRef<Conversation[]>([]);
	const offsetRef = useRef(0);
	const hasMoreRef = useRef(true);
	const loadingRef = useRef(false);

	const loadMore = useCallback(async () => {
		if (loadingRef.current) return;
		if (!hasMoreRef.current) return;

		loadingRef.current = true;
		setLoading(true);

		const currentOffset = offsetRef.current;

		try {
			const result = await getConversations({
				limit: pageSize,
				offset: currentOffset,
			});

			// Discard if a concurrent call already advanced the offset
			if (offsetRef.current !== currentOffset) return;

			const newHasMore = result.items.length > 0 ? result.hasMore : false;
			offsetRef.current = currentOffset + result.items.length;
			hasMoreRef.current = newHasMore;
			setHasMore(newHasMore);

			if (result.items.length > 0) {
				const existingIds = new Set(conversationsRef.current.map((c) => c.id));
				const newItemCount = result.items.filter(
					(item) => !existingIds.has(item.id),
				).length;
				if (newItemCount === 0) {
					hasMoreRef.current = false;
					setHasMore(false);
					return;
				}
				setConversations((prev) => {
					const next = mergeConversations(prev, result.items, "append");
					conversationsRef.current = next;
					return next;
				});
			}
		} finally {
			loadingRef.current = false;
			setLoading(false);
		}
	}, [pageSize]);

	const reset = useCallback(async () => {
		if (loadingRef.current) return;
		loadingRef.current = true;
		setLoading(true);
		offsetRef.current = 0;
		hasMoreRef.current = true;
		setConversations([]);
		conversationsRef.current = [];
		setHasMore(true);
		try {
			const result = await getConversations({ limit: pageSize, offset: 0 });
			offsetRef.current = result.items.length;
			hasMoreRef.current = result.hasMore;
			setConversations(result.items);
			conversationsRef.current = result.items;
			setHasMore(result.hasMore);
		} finally {
			loadingRef.current = false;
			setLoading(false);
		}
	}, [pageSize]);

	const patchConversation = useCallback(
		(id: number, patch: Partial<Conversation>) => {
			setConversations((prev) => {
				const next = prev.map((c) => (c.id === id ? { ...c, ...patch } : c));
				conversationsRef.current = next;
				return next;
			});
		},
		[],
	);

	const removeConversation = useCallback((id: number) => {
		setConversations((prev) => {
			const next = prev.filter((c) => c.id !== id);
			conversationsRef.current = next;
			return next;
		});
		offsetRef.current = Math.max(0, offsetRef.current - 1);
	}, []);

	const prependConversation = useCallback((conversation: Conversation) => {
		setConversations((prev) => {
			const exists = prev.some((c) => c.id === conversation.id);
			if (!exists) {
				offsetRef.current += 1;
			}
			const next = mergeConversations(prev, [conversation], "prepend");
			conversationsRef.current = next;
			return next;
		});
	}, []);

	return {
		conversations,
		hasMore,
		loading,
		loadingRef,
		hasMoreRef,
		loadMore,
		reset,
		patchConversation,
		removeConversation,
		prependConversation,
	};
}
