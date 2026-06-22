import { sendMessage } from "@services/messengerService";
import { useMutation } from "@tanstack/react-query";
import type { SendMessageRequest } from "@/types/messenger";

export const useSendMessengerMessage = () => {
	return useMutation({
		mutationFn: (payload: SendMessageRequest) => sendMessage(payload),
		// No REST invalidation: the server broadcasts `message.created` via WS,
		// which triggers ws.listConversations() in handleMessageCreated and keeps
		// the conversations sidebar fresh without an extra REST round-trip.
	});
};
