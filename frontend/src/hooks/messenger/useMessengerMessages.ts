import { messengerKeys } from "@hooks/keys/messengerKeys";
import { getMessages } from "@services/messengerService";
import { useQuery } from "@tanstack/react-query";

export const useMessengerMessages = (
	conversationId?: number,
	limit = 50,
	offset = 0,
) => {
	return useQuery({
		queryKey: messengerKeys.messages(
			String(conversationId ?? ""),
			limit,
			offset,
		),
		queryFn: () =>
			conversationId
				? getMessages(conversationId, { limit, offset })
				: Promise.resolve({
						items: [],
						total: 0,
						limit,
						offset,
						hasMore: false,
					}),
		enabled: !!conversationId,
		// HTTP is the initial seed; WS messages.list.result (on reconnect) and
		// message.created/updated/deleted events keep the cache fresh afterwards.
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: 5 * 60 * 1000,
		refetchInterval: false,
		refetchOnWindowFocus: false,
	});
};
