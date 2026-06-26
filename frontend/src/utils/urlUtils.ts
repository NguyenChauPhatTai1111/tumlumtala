const ASSET_BASE_URL = (
	import.meta.env.VITE_ASSET_BASE_URL ??
	""
).trim();

const ABSOLUTE_URL_REGEX = /^(https?:)?\/\//i;
const ROOT_RELATIVE_URL_REGEX = /^\//;

export const resolveCdnUrl = (rawUrl?: string | null): string => {
	const value = rawUrl?.trim();
	if (!value) {
		return "";
	}

	if (
		value.startsWith("data:") ||
		value.startsWith("blob:") ||
		ROOT_RELATIVE_URL_REGEX.test(value) ||
		ABSOLUTE_URL_REGEX.test(value)
	) {
		return value;
	}

	if (!ASSET_BASE_URL) {
		return value;
	}

	const normalizedDomain = ASSET_BASE_URL.replace(/\/+$/, "");
	const normalizedPath = value.replace(/^\/+/, "");
	return `${normalizedDomain}/${normalizedPath}`;
};

export const stripCdnUrl = (rawUrl?: string | null): string | undefined => {
	const value = rawUrl?.trim();
	if (!value) return undefined;

	if (!ASSET_BASE_URL) return value;

	const normalizedDomain = ASSET_BASE_URL.replace(/\/+$/, "");
	if (value.startsWith(normalizedDomain)) {
		return value.slice(normalizedDomain.length).replace(/^\/+/, "");
	}

	return value;
};
