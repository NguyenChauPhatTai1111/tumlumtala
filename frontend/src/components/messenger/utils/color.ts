export const parseColorToRgb = (
	value?: string,
): { r: number; g: number; b: number } | null => {
	const raw = value?.trim();
	if (!raw) return null;

	if (raw.startsWith("#")) {
		const hex = raw.slice(1);
		if (hex.length === 3) {
			const r = Number.parseInt(hex[0] + hex[0], 16);
			const g = Number.parseInt(hex[1] + hex[1], 16);
			const b = Number.parseInt(hex[2] + hex[2], 16);
			if ([r, g, b].every(Number.isFinite)) {
				return { r, g, b };
			}
		}

		if (hex.length === 6) {
			const r = Number.parseInt(hex.slice(0, 2), 16);
			const g = Number.parseInt(hex.slice(2, 4), 16);
			const b = Number.parseInt(hex.slice(4, 6), 16);
			if ([r, g, b].every(Number.isFinite)) {
				return { r, g, b };
			}
		}
	}

	const rgbMatch = raw.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
	if (rgbMatch) {
		const r = Number.parseInt(rgbMatch[1], 10);
		const g = Number.parseInt(rgbMatch[2], 10);
		const b = Number.parseInt(rgbMatch[3], 10);
		if ([r, g, b].every(Number.isFinite)) {
			return { r, g, b };
		}
	}

	return null;
};

export const getReadableTextColor = (background?: string) => {
	const rgb = parseColorToRgb(background);
	if (!rgb) return "#111827";

	const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
	return luminance > 0.56 ? "#111827" : "#f8fafc";
};

export const averageGradientColors = (
	background?: string,
): string | undefined => {
	const raw = background?.trim();
	if (!raw) {
		return undefined;
	}

	const hexMatches = [
		...raw.matchAll(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g),
	].map((m) => m[0]);
	const rgbMatches = [...raw.matchAll(/rgba?\([^)]*\)/gi)].map((m) => m[0]);
	const allColors = [...hexMatches, ...rgbMatches];

	if (allColors.length === 0) {
		return undefined;
	}

	let totalR = 0;
	let totalG = 0;
	let totalB = 0;
	let count = 0;

	for (const color of allColors) {
		const rgb = parseColorToRgb(color);
		if (rgb) {
			totalR += rgb.r;
			totalG += rgb.g;
			totalB += rgb.b;
			count++;
		}
	}

	if (count === 0) {
		return undefined;
	}

	return `rgb(${Math.round(totalR / count)},${Math.round(totalG / count)},${Math.round(totalB / count)})`;
};
