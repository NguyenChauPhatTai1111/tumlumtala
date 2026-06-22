import { apiClient } from "@api/client";
import type { IStickerPack } from "@/types/sticker";
import { apiService } from "./apiService";

const apiRequest = async (endpoint: string, options: { method?: string; data?: unknown } = {}) => {
	const response = await apiClient.request({ url: endpoint, method: options.method ?? "GET", data: options.data });
	return response.data;
};

export const getAllStickerPacks = async (): Promise<IStickerPack[]> => {
	return apiService.get<IStickerPack[]>("/sticker-pack?limit=1000");
};

export const updateStickerPackStatus = async (
	id: number,
	isActive: boolean,
): Promise<void> => {
	await apiRequest(`/sticker-pack/status/${id}`, {
		method: "PATCH",
		data: { is_active: isActive },
	});
};
