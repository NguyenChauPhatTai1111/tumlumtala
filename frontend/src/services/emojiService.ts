import { apiClient } from "@api/client";
import type { IEmoji } from "@/types/emoji";
import { API_PREFIX, apiService } from "./apiService";

type ApiRequestOptions = {
	method?: string;
	data?: unknown;
	params?: Record<string, unknown>;
	headers?: Record<string, string>;
};

const apiRequest = async (endpoint: string, options: ApiRequestOptions = {}) => {
	const { method = "GET", data, params, headers } = options;
	const response = await apiClient.request({ url: endpoint, method, data, params, headers });
	return response.data;
};
import { getUserProfile } from "./authService";

interface EmojiUploadResponseData {
	asset_url?: string;
	public_url?: string;
}

interface EmojiUploadResponse {
	data?: EmojiUploadResponseData;
}

interface EmojiOwnerResponse {
	data?: unknown;
}

interface BuyEmojiOptions {
	version?: number | string;
	idempotencyKey?: string;
}

const toNonEmptyString = (value: unknown): string | undefined => {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed !== "" ? trimmed : undefined;
};

const createClientIdempotencyKey = () => {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}

	return `emoji-buy-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const collectList = (payload: unknown): unknown[] => {
	if (Array.isArray(payload)) {
		return payload;
	}

	if (!payload || typeof payload !== "object") {
		return [];
	}

	const source = payload as Record<string, unknown>;

	if (Array.isArray(source.data)) {
		return source.data;
	}

	if (source.data && typeof source.data === "object") {
		const nestedData = source.data as Record<string, unknown>;

		if (Array.isArray(nestedData.items)) {
			return nestedData.items;
		}

		if (Array.isArray(nestedData.list)) {
			return nestedData.list;
		}

		if (Array.isArray(nestedData.owners)) {
			return nestedData.owners;
		}

		if (Array.isArray(nestedData.emojis)) {
			return nestedData.emojis;
		}
	}

	if (Array.isArray(source.items)) {
		return source.items;
	}

	if (Array.isArray(source.list)) {
		return source.list;
	}

	if (Array.isArray(source.owners)) {
		return source.owners;
	}

	if (Array.isArray(source.emojis)) {
		return source.emojis;
	}

	return [];
};

const resolveOwnedEmojiCode = (item: unknown): string => {
	if (typeof item === "string") {
		return item.trim();
	}

	if (!item || typeof item !== "object") {
		return "";
	}

	const source = item as Record<string, unknown>;
	const candidate =
		source.code ?? source.code ?? source.emojiCode ?? source.emoji;

	return typeof candidate === "string" ? candidate.trim() : "";
};

const toRecord = (value: unknown): Record<string, unknown> =>
	value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const toStringValue = (value: unknown, fallback = "") => {
	if (typeof value === "string") return value;
	if (typeof value === "number") return String(value);
	return fallback;
};

const toOptionalString = (value: unknown): string | undefined => {
	const resolved = toStringValue(value, "").trim();
	return resolved === "" ? undefined : resolved;
};

const toNumberValue = (value: unknown): number | undefined => {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}
	return undefined;
};

const normalizeEmoji = (raw: unknown): IEmoji => {
	const obj = toRecord(raw);
	const packId = toNumberValue(
		obj.pack_id ?? obj.packID ?? obj.packId ?? obj.emoji_pack_id,
	);

	return {
		id: toStringValue(obj.id ?? obj.emojiId ?? obj.emoji_id),
		code: toStringValue(obj.code ?? obj.emojiCode ?? obj.emoji_code),
		name: toStringValue(obj.name ?? obj.emojiName ?? obj.emoji_name),
		type: toStringValue(obj.type, "other"),
		pack_id: packId,
		source_type: toOptionalString(
			obj.source_type ?? obj.sourceType ?? obj.emoji_source_type,
		),
		source_value: toOptionalString(
			obj.source_value ?? obj.sourceValue ?? obj.emoji_source_value,
		),
		icon_text: toOptionalString(
			obj.icon_text ?? obj.iconText ?? obj.emoji_icon_text,
		),
		display_value: toOptionalString(obj.display_value ?? obj.displayValue),
		icon_code: toOptionalString(obj.icon_code ?? obj.iconCode),
		external_url: toOptionalString(obj.external_url ?? obj.externalUrl),
		asset_url: toOptionalString(
			obj.asset_url ?? obj.assetUrl ?? obj.emojiAssetUrl ?? obj.emoji_asset_url,
		),
		animation_type: toOptionalString(
			obj.animation_type ?? obj.animationType ?? obj.emojiAnimationType,
		),
		price: toNumberValue(obj.price ?? obj.emojiPrice) ?? 0,
		status: toNumberValue(obj.status ?? obj.emojiStatus) ?? 0,
		created_at: toOptionalString(obj.created_at ?? obj.createdAt),
		updated_at: toOptionalString(obj.updated_at ?? obj.updatedAt),
	};
};

export const getAllEmojis = async (): Promise<IEmoji[]> => {
	const response = await apiRequest("/emoji", { method: "GET" });
	return collectList(response).map(normalizeEmoji);
};

export const getActiveEmojis = async (): Promise<IEmoji[]> => {
	const response = await apiRequest("/emoji", {
		method: "GET",
		params: { status: 1, limit: 1000 },
	});
	return collectList(response)
		.map(normalizeEmoji)
		.filter((item) => item.status === 1);
};

export const getEmojiByID = async (id: string): Promise<IEmoji> => {
	return apiService.get<IEmoji>(`/emoji/${id}`);
};

export const createEmoji = async (
	data: Partial<IEmoji> | FormData,
): Promise<IEmoji> => {
	return apiService.post<IEmoji>("/emoji", data);
};

export const updateEmoji = async (
	id: string,
	data: Partial<IEmoji> | FormData,
): Promise<IEmoji> => {
	return apiService.put<IEmoji>(`/emoji/${id}`, data);
};

export const deleteEmoji = async (id: string) => {
	return apiService.delete(`/emoji/${id}`);
};

export const updateEmojiStatus = async (
	id: string,
	status: number,
): Promise<void> => {
	await apiRequest(`/emoji/status/${id}`, {
		method: "PATCH",
		data: { status },
	});
};

export const uploadEmojiAsset = async (
	file: File,
): Promise<{ assetUrl: string; publicUrl: string }> => {
	const token = localStorage.getItem("access_token");
	const formData = new FormData();
	formData.append("file", file);

	try {
		const response = await fetch(
			`${import.meta.env.VITE_BACKEND_URL}${API_PREFIX}/emoji/upload`,
			{
				method: "POST",
				headers: {
					...(token ? { Authorization: `Bearer ${token}` } : {}),
					"X-API-KEY": import.meta.env.VITE_API_KEY || "",
				},
				body: formData,
				credentials: "include",
			},
		);

		if (!response.ok) {
			const errorPayload = await response.json().catch(() => ({}));
			const errorMessage = String(
				(typeof errorPayload === "object" && errorPayload !== null
					? (errorPayload as Record<string, unknown>).message
					: undefined) ?? "Upload emoji thất bại",
			);
			throw new Error(errorMessage);
		}

		const payload = (await response.json()) as EmojiUploadResponse;

		const assetUrl = payload.data?.asset_url ?? "";
		const publicUrl = payload.data?.public_url ?? "";

		if (!assetUrl || !publicUrl) {
			throw new Error("Upload emoji thành công nhưng thiếu dữ liệu URL");
		}

		return { assetUrl, publicUrl };
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Upload emoji thất bại";
		throw new Error(message);
	}
};

export const getOwnedEmojiCodes = async (
	userId: string | number,
): Promise<string[]> => {
	if (userId === undefined || userId === null || userId === "") {
		return [];
	}

	const response = await apiRequest(`/emoji/owner/${userId}`, {
		method: "GET",
	});
	const payload = response as IEmoji[] | EmojiOwnerResponse;
	const list = collectList(payload);

	return list
		.map((item) => resolveOwnedEmojiCode(item))
		.filter((code) => code !== "");
};

export const buyEmojiById = async (
	emojiId: string,
	options?: BuyEmojiOptions,
): Promise<unknown> => {
	if (!emojiId?.trim()) {
		throw new Error("Thiếu id để mua emoji");
	}

	let resolvedVersion = options?.version;
	let resolvedIdempotencyKey = toNonEmptyString(options?.idempotencyKey);

	if (resolvedVersion == null || !resolvedIdempotencyKey) {
		const profile = await getUserProfile();

		resolvedVersion = resolvedVersion ?? profile.version;
		resolvedIdempotencyKey =
			resolvedIdempotencyKey ??
			toNonEmptyString(profile.idempotency_key) ??
			toNonEmptyString(profile.idempotencyKey) ??
			toNonEmptyString(profile.IdempotencyKey);
	}

	if (resolvedVersion == null) {
		throw new Error("Thiếu version để mua emoji");
	}

	if (!resolvedIdempotencyKey) {
		resolvedIdempotencyKey = createClientIdempotencyKey();
	}

	return apiRequest(`/emoji/buy/${emojiId}`, {
		method: "POST",
		data: {
			version: resolvedVersion,
			idempotency_key: resolvedIdempotencyKey,
		},
	});
};
