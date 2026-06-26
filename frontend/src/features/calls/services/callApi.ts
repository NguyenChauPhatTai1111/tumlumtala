import { apiClient } from "@/api/client";
import type { CallSession } from "../types/call.types";

export async function getConversationCalls(conversationId: number) {
	const response = await apiClient.get(
		`/messenger/conversations/${conversationId}/calls`,
	);
	return (response.data?.data?.items ?? []) as CallSession[];
}
