import { chatKeys } from "@hooks/keys/chatKeys";
import { getConversations } from "@services/chatService";
import { useQuery } from "@tanstack/react-query";

export const useConversations = (limit = 20, offset = 0) => {
	return useQuery({
		queryKey: chatKeys.conversations(limit, offset),
		queryFn: () => getConversations({ limit, offset }),
	});
};
