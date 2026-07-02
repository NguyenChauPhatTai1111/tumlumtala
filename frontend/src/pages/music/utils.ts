import type { MediaItem } from "./types";

export const formatDuration = (seconds?: number) => {
	if (!seconds) return "--:--";
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60)
		.toString()
		.padStart(2, "0");
	return `${mins}:${secs}`;
};

export const formatCompactNumber = (value?: number) => {
	if (!value) return "0";
	return new Intl.NumberFormat("vi-VN", {
		notation: "compact",
		maximumFractionDigits: 1,
	}).format(value);
};

export const formatDisplayName = (value?: string) =>
	(value ?? "").replace(
		/(^|\s)(\p{L})/gu,
		(_, prefix: string, char: string) =>
			`${prefix}${char.toLocaleUpperCase("vi-VN")}`,
	);

const normalizeMediaIdentityPart = (value?: string) =>
	(value ?? "")
		.normalize("NFKD")
		.replace(/\p{M}/gu, "")
		.toLocaleLowerCase("vi-VN")
		.replace(/\s+/g, " ")
		.trim();

const getMediaItemIdentityKeys = (item: MediaItem) => {
	const keys = new Set<string>();
	const id = item.id?.trim();
	const sourceId = item.sourceId?.trim();
	const videoId = item.videoId?.trim();
	const title = normalizeMediaIdentityPart(item.title);
	const artist = normalizeMediaIdentityPart(item.artist);

	if (id) keys.add(`id:${id}`);
	if (sourceId) keys.add(`source:${item.provider ?? "unknown"}:${sourceId}`);
	if (videoId) keys.add(`video:${videoId}`);
	if (title && artist) keys.add(`track:${title}:${artist}`);

	return keys;
};

export const isSameMediaItem = (left: MediaItem, right: MediaItem) => {
	const leftKeys = getMediaItemIdentityKeys(left);
	return [...getMediaItemIdentityKeys(right)].some((key) => leftKeys.has(key));
};

export const dedupeMediaItems = (items: MediaItem[]) => {
	const seen = new Set<string>();
	const unique: MediaItem[] = [];

	for (const item of items) {
		const keys = getMediaItemIdentityKeys(item);
		if ([...keys].some((key) => seen.has(key))) {
			keys.forEach((key) => seen.add(key));
			continue;
		}
		unique.push(item);
		keys.forEach((key) => seen.add(key));
	}

	return unique;
};
