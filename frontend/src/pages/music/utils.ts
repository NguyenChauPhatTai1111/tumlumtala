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
