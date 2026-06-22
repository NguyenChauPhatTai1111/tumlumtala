import {
	deleteMessage,
	removeMessageReaction,
	setMessageReaction,
	updateMessage,
} from "@services/messengerService";
import { useMutation } from "@tanstack/react-query";

export const useMessengerMessageActions = (_conversationId?: number) => {
	const deleteMessageMutation = useMutation({
		mutationFn: (messageId: number) => deleteMessage(messageId),
		// Cache update handled by WS message.deleted event in MessengerPage.
	});

	const setReactionMutation = useMutation({
		mutationFn: (payload: { messageId: number; reaction: string }) =>
			setMessageReaction({
				message_id: payload.messageId,
				reaction: payload.reaction,
			}),
		// Cache update handled optimistically in handleToggleReaction + WS reaction_updated.
	});

	const removeReactionMutation = useMutation({
		mutationFn: (payload: { messageId: number; reaction?: string }) =>
			removeMessageReaction({
				message_id: payload.messageId,
				reaction: payload.reaction,
			}),
		// Cache update handled optimistically in handleToggleReaction + WS reaction_removed.
	});

	const updateMessageMutation = useMutation({
		mutationFn: (payload: { messageId: number; content: string }) =>
			updateMessage(payload.messageId, payload.content),
		// Cache update handled by WS message.updated event in MessengerPage.
	});

	return {
		deleteMessage: deleteMessageMutation,
		setReaction: setReactionMutation,
		removeReaction: removeReactionMutation,
		updateMessage: updateMessageMutation,
	};
};
