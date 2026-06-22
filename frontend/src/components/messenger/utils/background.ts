import { resolveCdnUrl } from "@/utils/urlUtils";

export const buildGradientFromStops = (
	stops: Array<{ id: number; color: string; position: number }>,
	angle: number,
) => {
	const normalizedStops = [...stops]
		.map((stop) => ({
			...stop,
			position: clampStopPosition(stop.position),
		}))
		.sort((a, b) => a.position - b.position);

	const gradientBody = normalizedStops
		.map((stop) => `${stop.color} ${stop.position}%`)
		.join(", ");

	return `linear-gradient(${Math.round(angle)}deg, ${gradientBody})`;
};

export const isCssBackgroundValue = (value: string) => {
	const normalized = value.trim().toLowerCase();
	return (
		normalized.includes("gradient(") ||
		normalized.startsWith("#") ||
		normalized.startsWith("rgb(") ||
		normalized.startsWith("rgba(") ||
		normalized.startsWith("hsl(") ||
		normalized.startsWith("hsla(")
	);
};

export const isImageBackgroundValue = (value?: string) => {
	const raw = value?.trim();
	if (!raw) return false;

	const normalized = raw.toLowerCase();
	if (normalized.startsWith("url(") || normalized.startsWith("data:image/")) {
		return true;
	}

	return !isCssBackgroundValue(normalized);
};

export const clampStopPosition = (value: number) => {
	if (!Number.isFinite(value)) return 0;
	return Math.min(100, Math.max(0, Math.round(value)));
};

export const toRenderableChatBackground = (
	rawBackground?: string,
	rawBackgroundColor?: string,
): string | undefined => {
	const raw = rawBackground?.trim();
	if (!raw) {
		return rawBackgroundColor?.trim() || undefined;
	}

	if (isCssBackgroundValue(raw)) {
		return raw;
	}

	const resolved = resolveCdnUrl(raw);
	if (!resolved) return undefined;

	return `url(${resolved})`;
};
