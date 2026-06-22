import type { IRecentItem } from "@/types/recent_items";
import { API_PREFIX, apiService } from "./apiService";

export const getRecentItems = async (
	conversationId: number,
): Promise<IRecentItem[]> => {
	return apiService.get<IRecentItem[]>(
		`${API_PREFIX}/recent-items/${conversationId}`,
	);
};
