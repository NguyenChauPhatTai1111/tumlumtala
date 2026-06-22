import { messengerKeys } from "@hooks/keys/messengerKeys";
import { createConversation } from "@services/messengerService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateConversationRequest } from "@/types/messenger";

export const useCreateMessengerConversation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: CreateConversationRequest) =>
			createConversation(payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: messengerKeys.all });
		},
	});
};
