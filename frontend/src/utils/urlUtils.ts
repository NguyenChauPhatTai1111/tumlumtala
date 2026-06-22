const BUNNY_DOMAIN = (
	import.meta.env.VITE_BUNNY_URL ??
	import.meta.env.BUNNY_URL ??
	""
).trim();

const ABSOLUTE_URL_REGEX = /^(https?:)?\/\//i;

export const resolveCdnUrl = (rawUrl?: string | null): string => {
	const value = rawUrl?.trim();
	if (!value) {
		return "";
	}

	if (
		value.startsWith("data:") ||
		value.startsWith("blob:") ||
		ABSOLUTE_URL_REGEX.test(value)
	) {
		return value;
	}

	if (!BUNNY_DOMAIN) {
		return value;
	}

	const normalizedDomain = BUNNY_DOMAIN.replace(/\/+$/, "");
	const normalizedPath = value.replace(/^\/+/, "");
	return `${normalizedDomain}/${normalizedPath}`;
};

export const stripCdnUrl = (rawUrl?: string | null): string | undefined => {
	const value = rawUrl?.trim();
	if (!value) return undefined;

	if (!BUNNY_DOMAIN) return value;

	const normalizedDomain = BUNNY_DOMAIN.replace(/\/+$/, "");
	// If the value starts with the CDN domain, strip it
	if (value.startsWith(normalizedDomain)) {
		return value.slice(normalizedDomain.length).replace(/^\/+/, "");
	}

	return value;
};
