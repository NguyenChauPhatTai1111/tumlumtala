import { chatKeys } from "@hooks/keys/chatKeys";
import { sendMessage } from "@services/chatService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Message, SendMessageRequest } from "@/types/chat";

const makeOptimisticMessage = (
	conversationId: string,
	content: string,
): Message => ({
	id: `optimistic-${Date.now()}`,
	conversation_id: conversationId,
	role: "user",
	content,
	created_at: new Date().toISOString(),
	pending: true,
});

type InfiniteMessagesCache = {
	pageParams: unknown[];
	pages: Array<{
		items: Message[];
		total: number;
		limit: number;
		offset: number;
		hasMore: boolean;
	}>;
};

export const useSendMessage = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: SendMessageRequest) => sendMessage(payload),
		onMutate: async (payload) => {
			const conversationKey = String(payload.conversation_id);
			await queryClient.cancelQueries({
				queryKey: chatKeys.messages(conversationKey),
			});

			const previous = queryClient.getQueryData<InfiniteMessagesCache>(
				chatKeys.messages(conversationKey),
			);

			const optimistic = makeOptimisticMessage(
				conversationKey,
				payload.message,
			);

			if (!previous) {
				queryClient.setQueryData<InfiniteMessagesCache>(
					chatKeys.messages(conversationKey),
					{
						pageParams: [0],
						pages: [
							{
								items: [optimistic],
								total: 1,
								limit: 20,
								offset: 0,
								hasMore: false,
							},
						],
					},
				);
			} else {
				queryClient.setQueryData<InfiniteMessagesCache>(
					chatKeys.messages(conversationKey),
					{
						...previous,
						pages: previous.pages.map((page, index) => {
							if (index !== previous.pages.length - 1) return page;
							return {
								...page,
								items: [...page.items, optimistic],
								total: page.total + 1,
							};
						}),
					},
				);
			}

			return {
				previous,
				optimisticId: optimistic.id,
				conversationId: conversationKey,
			};
		},
		onError: (_error, _payload, context) => {
			if (!context) return;
			queryClient.setQueryData(
				chatKeys.messages(context.conversationId),
				context.previous,
			);
		},
		onSuccess: (result, _payload, context) => {
			if (!context) return;

			queryClient.setQueryData<InfiniteMessagesCache>(
				chatKeys.messages(context.conversationId),
				(current) => {
					if (!current) return current;

					return {
						...current,
						pages: current.pages.map((page, index) => {
							if (index !== current.pages.length - 1) return page;

							const withoutOptimistic = page.items.filter(
								(item) => item.id !== context.optimisticId,
							);

							const merged = [
								...withoutOptimistic,
								...(result.user_message ? [result.user_message] : []),
								result.assistant_message,
							];

							return {
								...page,
								items: merged,
								total: merged.length,
							};
						}),
					};
				},
			);

			void queryClient.invalidateQueries({ queryKey: chatKeys.all });
		},
	});
};
