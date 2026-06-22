export const chatKeys = {
	all: ["chat"] as const,
	conversations: (limit: number, offset: number) =>
		[...chatKeys.all, "conversations", limit, offset] as const,
	messages: (conversationId: string) =>
		[...chatKeys.all, "messages", conversationId] as const,
};
