import { chatKeys } from "@hooks/keys/chatKeys";
import { getConversationMessages } from "@services/chatService";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { Message, PaginatedResult } from "@/types/chat";

const PAGE_SIZE = 20;

type InfiniteMessagesCache = {
	pageParams: unknown[];
	pages: Array<PaginatedResult<Message>>;
};

const isTransientMessage = (message: Message) => {
	return Boolean(
		message.pending ||
			message.streaming ||
			message.failed ||
			message.id.startsWith("optimistic-") ||
			message.id.startsWith("streaming-") ||
			message.id.startsWith("user-") ||
			message.id.startsWith("assistant-"),
	);
};

const mergeMessages = (serverItems: Message[], cachedItems: Message[]) => {
	const merged = new Map<string, Message>();

	for (const item of serverItems) {
		merged.set(item.id, item);
	}

	for (const item of cachedItems) {
		if (isTransientMessage(item) || !merged.has(item.id)) {
			merged.set(item.id, item);
		}
	}

	return Array.from(merged.values()).sort(
		(a, b) =>
			new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
	);
};

export const useConversationMessages = (conversationId?: string) => {
	const queryClient = useQueryClient();

	const query = useInfiniteQuery({
		queryKey: chatKeys.messages(conversationId ?? ""),
		queryFn: async ({ pageParam }) => {
			const result = await getConversationMessages(conversationId ?? "", {
				limit: PAGE_SIZE,
				offset: pageParam as number,
			});

			if (pageParam !== 0 || !conversationId) {
				return result;
			}

			const cached = queryClient.getQueryData<InfiniteMessagesCache>(
				chatKeys.messages(conversationId),
			);
			const cachedItems = cached?.pages.flatMap((page) => page.items) ?? [];
			if (cachedItems.length === 0) {
				return result;
			}

			const mergedItems = mergeMessages(result.items, cachedItems);

			return {
				...result,
				items: mergedItems,
				total: Math.max(result.total, mergedItems.length),
			};
		},
		initialPageParam: 0,
		getNextPageParam: (lastPage) => {
			if (!lastPage.hasMore) return undefined;
			return lastPage.offset + lastPage.items.length;
		},
		enabled: Boolean(conversationId),
	});

	const messages =
		query.data?.pages
			.flatMap((page) => page.items)
			.sort(
				(a, b) =>
					new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
			) ?? [];

	return {
		...query,
		messages,
	};
};
