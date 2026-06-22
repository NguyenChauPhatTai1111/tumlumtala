import { chatKeys } from "@hooks/keys/chatKeys";
import { createConversation } from "@services/chatService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateConversationRequest } from "@/types/chat";

export const useCreateConversation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: CreateConversationRequest) =>
			createConversation(payload),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: chatKeys.all });
		},
	});
};
