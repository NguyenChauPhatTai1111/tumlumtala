import { chatKeys } from "@hooks/keys/chatKeys";
import {
	archiveConversation,
	clearConversationHistory,
	deleteConversation,
	restoreConversation,
} from "@services/chatService";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useConversationActions = () => {
	const queryClient = useQueryClient();

	const invalidateAll = async () => {
		await queryClient.invalidateQueries({ queryKey: chatKeys.all });
	};

	const archive = useMutation({
		mutationFn: (conversationId: string) => archiveConversation(conversationId),
		onSuccess: () => void invalidateAll(),
	});

	const restore = useMutation({
		mutationFn: (conversationId: string) => restoreConversation(conversationId),
		onSuccess: () => void invalidateAll(),
	});

	const clearHistory = useMutation({
		mutationFn: (conversationId: string) =>
			clearConversationHistory(conversationId),
		onSuccess: async (_, conversationId) => {
			await invalidateAll();
			await queryClient.invalidateQueries({
				queryKey: chatKeys.messages(conversationId),
			});
		},
	});

	const remove = useMutation({
		mutationFn: (conversationId: string) => deleteConversation(conversationId),
		onSuccess: () => void invalidateAll(),
	});

	return {
		archive,
		restore,
		clearHistory,
		remove,
	};
};
