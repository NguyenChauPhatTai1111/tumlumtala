export const messengerKeys = {
	all: ["messenger"] as const,

	conversationsRoot: () => [...messengerKeys.all, "conversations"] as const,

	conversations: (limit: number, offset: number) =>
		[...messengerKeys.all, "conversations", limit, offset] as const,

	conversation: (conversationId: string) =>
		[...messengerKeys.all, "conversation", conversationId] as const,

	messages: (conversationId: string, limit: number, offset: number) =>
		[...messengerKeys.all, "messages", conversationId, limit, offset] as const,

	mediaMessages: (conversationId: number) =>
		[...messengerKeys.all, "media-messages", conversationId] as const,

	search: (query: string) => [...messengerKeys.all, "search", query] as const,
};
