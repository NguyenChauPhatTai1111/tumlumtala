import type { IEmoji } from "@/types/emoji";
import { resolveCdnUrl } from "@/utils";

export const normalizeEmojiType = (value: unknown) => {
	const normalized = String(value ?? "")
		.trim()
		.toLowerCase();
	return normalized === "" ? "other" : normalized;
};

export const getEmojiText = (item: IEmoji) => {
	if (normalizeEmojiType(item.type) === "flag" && item.code) {
		return String(
			item.icon_text ?? item.icon_code ?? item.source_value ?? "",
		).trim();
	}

	const sourceType = String(item.source_type ?? "")
		.trim()
		.toLowerCase();
	const iconText = String(item.icon_text ?? item.icon_code ?? "").trim();
	const assetUrl = resolveCdnUrl(
		item.asset_url ?? item.display_value ?? item.source_value ?? undefined,
	);

	if (normalizeEmojiType(item.type) === "sticker") {
		if (assetUrl) {
			return assetUrl;
		}

		if (item.display_value?.trim()) {
			return item.display_value.trim();
		}

		if (item.code?.trim()) {
			return item.code.trim();
		}

		return iconText || "";
	}

	if (sourceType === "unicode_icon" && iconText) {
		return iconText;
	}

	if (iconText) {
		return iconText;
	}

	if (item.display_value?.trim()) {
		return item.display_value.trim();
	}

	if (item.code?.trim()) {
		return item.code.trim();
	}

	return assetUrl || "";
};

export const groupEmojiItems = (items: IEmoji[]) => {
	const groups = new Map<string, IEmoji[]>();

	for (const item of items) {
		const type = normalizeEmojiType(item.type);
		const group = groups.get(type) ?? [];
		group.push(item);
		groups.set(type, group);
	}

	return groups;
};

export const buildEmojiTypeTabs = (
	groups: Map<string, IEmoji[]>,
	emojiTypeMap: Record<string, string>,
) => {
	const types = Array.from(groups.keys()).filter((type) => type !== "sticker");

	return [
		{
			key: "recently_used",
			label: "Gần đây",
		},
		...types.map((type) => ({
			key: type,
			label: emojiTypeMap[type] || type,
		})),
	];
};
