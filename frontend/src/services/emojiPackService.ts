import { apiClient } from "@api/client";
import type { IEmojiPack } from "@/types/emoji";
import { apiService } from "./apiService";

const apiRequest = async (endpoint: string, options: { method?: string; data?: unknown } = {}) => {
	const response = await apiClient.request({ url: endpoint, method: options.method ?? "GET", data: options.data });
	return response.data;
};

export const getAllEmojiPacks = async (): Promise<IEmojiPack[]> => {
	return apiService.get<IEmojiPack[]>("/emoji-pack?limit=1000");
};

export const updateEmojiPackStatus = async (
	id: number,
	isActive: boolean,
): Promise<void> => {
	await apiRequest(`/emoji-pack/status/${id}`, {
		method: "PATCH",
		data: { is_active: isActive },
	});
};
