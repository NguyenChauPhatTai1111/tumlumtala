import { useState } from "react";
import { getRecentItems } from "@/services/recentItemService";
import type { IRecentItem } from "@/types/recent_items";

export const useRecentItems = () => {
	const [data, setData] = useState<IRecentItem[]>([]);

	const loadData = () => {
		setData(getRecentItems());
	};

	return {
		data,
		loading: false,
		loadData,
	};
};
