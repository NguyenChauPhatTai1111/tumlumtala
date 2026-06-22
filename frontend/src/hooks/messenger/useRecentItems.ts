import { useState } from "react";
import { getRecentItems } from "@/services/recentItemService";
import type { IRecentItem } from "@/types/recent_items";

export const useRecentItems = (conversationId?: number) => {
	const [data, setData] = useState<IRecentItem[]>([]);
	const [loading, setLoading] = useState(false);

	const loadData = async () => {
		if (!conversationId) {
			return;
		}

		setLoading(true);

		try {
			const result = await getRecentItems(conversationId);

			setData(result);
		} finally {
			setLoading(false);
		}
	};

	return {
		data,
		loading,
		loadData,
	};
};
