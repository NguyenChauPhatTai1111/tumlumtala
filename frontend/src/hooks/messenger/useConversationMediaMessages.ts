import { messengerKeys } from "@hooks/keys/messengerKeys";
import { getMessages } from "@services/messengerService";
import { useQuery } from "@tanstack/react-query";

export const useConversationMediaMessages = (
	conversationId?: number,
	enabled = true,
) => {
	const imageQuery = useQuery({
		queryKey: [...messengerKeys.all, "media-messages", conversationId, "image"],
		queryFn: () =>
			getMessages(conversationId as number, {
				limit: 500,
				offset: 0,
				message_type: "image",
			}),
		enabled: !!conversationId && enabled,
		staleTime: 30_000,
	});

	const videoQuery = useQuery({
		queryKey: [...messengerKeys.all, "media-messages", conversationId, "video"],
		queryFn: () =>
			getMessages(conversationId as number, {
				limit: 500,
				offset: 0,
				message_type: "video",
			}),
		enabled: !!conversationId && enabled,
		staleTime: 30_000,
	});

	const fileQuery = useQuery({
		queryKey: [...messengerKeys.all, "media-messages", conversationId, "file"],
		queryFn: () =>
			getMessages(conversationId as number, {
				limit: 500,
				offset: 0,
				message_type: "file",
			}),
		enabled: !!conversationId && enabled,
		staleTime: 30_000,
	});

	return {
		imageData: imageQuery.data,
		videoData: videoQuery.data,
		fileData: fileQuery.data,
		isLoading:
			imageQuery.isLoading || videoQuery.isLoading || fileQuery.isLoading,
	};
};
