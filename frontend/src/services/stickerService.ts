import { apiClient } from "@api/client";
import type { ISticker } from "@/types/sticker";
import { apiService } from "./apiService";

const apiRequest = async (endpoint: string, options: { method?: string; data?: unknown } = {}) => {
	const response = await apiClient.request({ url: endpoint, method: options.method ?? "GET", data: options.data });
	return response.data;
};

export const updateStickerStatus = async (
	id: string,
	isActive: boolean,
): Promise<void> => {
	await apiRequest(`/sticker/status/${id}`, {
		method: "PATCH",
		data: { is_active: isActive },
	});
};

export const getActiveStickers = async (): Promise<ISticker[]> => {
	return apiService.get<ISticker[]>("/sticker?limit=1000&is_active=true");
};
