import { messengerKeys } from "@hooks/keys/messengerKeys";
import { getConversations } from "@services/messengerService";
import { useQuery } from "@tanstack/react-query";

export const useMessengerConversations = (limit = 20, offset = 0) => {
	return useQuery({
		queryKey: messengerKeys.conversations(limit, offset),
		queryFn: () => getConversations({ limit, offset }),
		// WS manages freshness — never auto-refetch.
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: 5 * 60 * 1000,
		refetchInterval: false,
		refetchOnWindowFocus: false,
	});
};
