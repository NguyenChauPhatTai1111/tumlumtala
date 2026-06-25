import type { IEmoji } from "@/types/emoji";
import { resolveCdnUrl } from "@/utils";

export const normalizeEmojiType = (value: unknown) => {
	const normalized = String(value ?? "")
		.trim()
		.toLowerCase();
	return normalized === "" ? "other" : normalized;
};

export const isFlagEmoji = (item: IEmoji): boolean => {
	return (
		normalizeEmojiType(item.type) === "flag" ||
		normalizeEmojiType(item.source_type) === "flag"
	);
};

export const getFlagCountryCode = (item: IEmoji): string => {
	const raw = String(
		item.icon_text ?? item.icon_code ?? item.source_value ?? item.code ?? "",
	).trim();
	// Extract last 2 alphabetic chars to handle formats like "flag-vn", ":flag_VN:", "VN"
	const match = raw.match(/[a-zA-Z]{2}$/);
	return match ? match[0].toLowerCase() : raw.toLowerCase();
};

export const getEmojiText = (item: IEmoji) => {
	if (isFlagEmoji(item)) {
		return getFlagCountryCode(item);
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
		const type =
			item.pack_id != null
				? `pack:${item.pack_id}`
				: normalizeEmojiType(item.type);
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
	const types = Array.from(groups.keys()).filter((type) =>
		(groups.get(type) ?? []).some(
			(item) => normalizeEmojiType(item.type) !== "sticker",
		),
	);

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
