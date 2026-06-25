import { apiClient } from "@api/client";
import type { IEmojiPack } from "@/types/emoji";
import { apiService } from "./apiService";

const apiRequest = async (endpoint: string, options: { method?: string; data?: unknown } = {}) => {
	const response = await apiClient.request({ url: endpoint, method: options.method ?? "GET", data: options.data });
	return response.data;
};

const toRecord = (value: unknown): Record<string, unknown> =>
	value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const collectList = (payload: unknown): unknown[] => {
	if (Array.isArray(payload)) return payload;
	const source = toRecord(payload);
	if (Array.isArray(source.data)) return source.data;
	const data = toRecord(source.data);
	if (Array.isArray(data.items)) return data.items;
	if (Array.isArray(data.list)) return data.list;
	if (Array.isArray(source.items)) return source.items;
	if (Array.isArray(source.list)) return source.list;
	return [];
};

const toStringValue = (value: unknown, fallback = "") => {
	if (typeof value === "string") return value;
	if (typeof value === "number") return String(value);
	return fallback;
};

const toOptionalString = (value: unknown): string | undefined => {
	const resolved = toStringValue(value, "").trim();
	return resolved === "" ? undefined : resolved;
};

const toNumberValue = (value: unknown): number => {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : 0;
	}
	return 0;
};

const normalizeEmojiPack = (raw: unknown): IEmojiPack => {
	const obj = toRecord(raw);
	return {
		id: toNumberValue(obj.id ?? obj.pack_id ?? obj.packID),
		name: toStringValue(obj.name ?? obj.pack_name ?? obj.packName),
		code: toOptionalString(obj.code ?? obj.pack_code ?? obj.packCode),
		type: toStringValue(obj.type, ""),
		is_active: Boolean(obj.is_active ?? obj.isActive),
		created_at: toOptionalString(obj.created_at ?? obj.createdAt),
		updated_at: toOptionalString(obj.updated_at ?? obj.updatedAt),
	};
};

export const getAllEmojiPacks = async (): Promise<IEmojiPack[]> => {
	const response = await apiService.get<unknown>("/emoji-pack?limit=1000");
	return collectList(response).map(normalizeEmojiPack);
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
