import type {
	KKPhimDetailResponse,
	KKPhimLatestResponse,
	OphimMovieDetail,
	OphimMovieItem,
	OphimV1CatalogItem,
	OphimV1ListData,
	OphimV1Response,
} from "@/pages/movie/types";

const BASE = "https://phimapi.com";
const CDN = "https://phimimg.com";

const decodeHtml = (str: string): string =>
	str
		.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#039;/g, "'")
		.replace(/&apos;/g, "'");

const fetchJson = async <T>(url: string): Promise<T> => {
	const res = await fetch(url, { headers: { Accept: "application/json" } });
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res.json() as Promise<T>;
};

const withPaging = (path: string, page = 1, limit = 48) => {
	const separator = path.includes("?") ? "&" : "?";
	return `${path}${separator}page=${page}&limit=${limit}`;
};

const decodeItem = <T extends { name: string; origin_name: string }>(
	item: T,
): T => ({
	...item,
	name: decodeHtml(item.name),
	origin_name: decodeHtml(item.origin_name),
});

const isRegionCode = (value?: string | null) =>
	Boolean(value && /^[a-z]{2}$/i.test(value.trim()));

const getRegionDisplayName = (code: string) => {
	try {
		const displayNames = new Intl.DisplayNames(["vi"], { type: "region" });
		return displayNames.of(code.toUpperCase()) ?? code.toUpperCase();
	} catch {
		return code.toUpperCase();
	}
};

const normalizeCountryItem = (
	item: OphimV1CatalogItem,
): OphimV1CatalogItem => {
	const rawName = decodeHtml(item.name ?? "");
	const regionCode = [item.slug, rawName, item._id].find(isRegionCode);

	if (!regionCode) {
		return {
			...item,
			name: rawName,
		};
	}

	return {
		...item,
		name: getRegionDisplayName(regionCode),
	};
};

const v1List = (path: string) =>
	fetchJson<OphimV1Response<OphimV1ListData>>(`${BASE}/v1/api${path}`).then(
		(r) => {
			const p = r.data.params?.pagination;
			const totalItems = p?.totalItems ?? 0;
			const perPage = p?.totalItemsPerPage ?? 48;
			const totalPages =
				p?.totalPages ?? (perPage > 0 ? Math.ceil(totalItems / perPage) : 1);
			return {
				items: (r.data.items ?? []).map(decodeItem),
				pagination: {
					totalItems,
					totalItemsPerPage: perPage,
					currentPage: p?.currentPage ?? 1,
					totalPages: Math.max(1, totalPages),
				},
			};
		},
	);

// ── Home / latest ────────────────────────────────────────────────────────────

export const getHomeMovies = (page = 1, limit = 48) =>
	getLatestMovies(page, limit);

export const getLatestMovies = (page = 1, limit = 48) =>
	fetchJson<KKPhimLatestResponse>(
		`${BASE}/danh-sach/phim-moi-cap-nhat-v3?page=${page}&limit=${limit}`,
	).then((r) => ({
		items: (r.items ?? []).map(decodeItem),
		pagination: {
			totalItems: r.pagination?.totalItems ?? 0,
			totalItemsPerPage: r.pagination?.totalItemsPerPage ?? 24,
			currentPage: r.pagination?.currentPage ?? page,
			totalPages: Math.max(1, r.pagination?.totalPages ?? 1),
		},
	}));

// ── Sort / filter types ───────────────────────────────────────────────────────

export type MovieSortField = "modified.time" | "_id" | "year";
export type MovieSortType = "desc" | "asc";

export interface MovieSearchFilter {
	sortField?: MovieSortField;
	sortType?: MovieSortType;
	genreSlug?: string | null;
	countrySlug?: string | null;
	yearSlug?: string | null;
}

// ── Search ───────────────────────────────────────────────────────────────────

export const searchMovies = (
	keyword: string,
	page = 1,
	limit = 48,
	filter?: MovieSearchFilter,
) => {
	const qs = new URLSearchParams();
	qs.set("keyword", keyword);
	qs.set("page", String(page));
	qs.set("limit", String(limit));
	if (filter?.sortField) qs.set("sort_field", filter.sortField);
	if (filter?.sortType) qs.set("sort_type", filter.sortType);
	if (filter?.genreSlug) qs.set("category", filter.genreSlug);
	if (filter?.countrySlug) qs.set("country", filter.countrySlug);
	if (filter?.yearSlug) qs.set("year", filter.yearSlug);
	return v1List(`/tim-kiem?${qs.toString()}`);
};

export const getMoviesByListSlug = (
	slug: string,
	page = 1,
	limit = 48,
	sortField: MovieSortField = "modified.time",
	sortType: MovieSortType = "desc",
) => {
	if (slug === "phim-moi") return getLatestMovies(page, limit);
	const base = withPaging(`/danh-sach/${slug}`, page, limit);
	return v1List(
		`${base}&sort_field=${encodeURIComponent(sortField)}&sort_type=${sortType}`,
	);
};

// ── Genres ───────────────────────────────────────────────────────────────────

export const getGenres = () =>
	fetchJson<OphimV1CatalogItem[]>(`${BASE}/the-loai`);

// ── Countries ────────────────────────────────────────────────────────────────

export const getCountries = () =>
	fetchJson<OphimV1CatalogItem[]>(`${BASE}/quoc-gia`).then((items) =>
		items.map(normalizeCountryItem),
	);

// ── Years ────────────────────────────────────────────────────────────────────

export const getYears = (): Promise<OphimV1CatalogItem[]> => {
	const currentYear = new Date().getFullYear();
	return Promise.resolve(
		Array.from({ length: currentYear - 1970 + 1 }, (_, i) => {
			const year = currentYear - i;
			return { _id: String(year), name: String(year), slug: String(year) };
		}),
	);
};

// ── Filter query (genre as base, others as query params) ─────────────────────

export interface MovieFilterParams {
	genreSlug: string;
	countrySlug?: string | null;
	yearSlug?: string | null;
	sortField?: MovieSortField;
	sortType?: MovieSortType;
}

export const getMoviesByFilter = (
	params: MovieFilterParams,
	page = 1,
	limit = 48,
) => {
	const qs = new URLSearchParams();
	qs.set("page", String(page));
	qs.set("limit", String(limit));
	if (params.countrySlug) qs.set("country", params.countrySlug);
	if (params.sortField) qs.set("sort_field", params.sortField);
	if (params.sortType) qs.set("sort_type", params.sortType);
	if (params.yearSlug) qs.set("year", params.yearSlug);
	return v1List(`/the-loai/${params.genreSlug}?${qs.toString()}`);
};

// ── Detail ───────────────────────────────────────────────────────────────────

export const getMovieDetail = (slug: string) =>
	fetchJson<KKPhimDetailResponse>(`${BASE}/phim/${slug}`).then((r) => ({
		movie: r.movie
			? {
					...r.movie,
					name: decodeHtml(r.movie.name),
					origin_name: decodeHtml(r.movie.origin_name),
				}
			: r.movie,
		episodes: Array.isArray(r.episodes) ? r.episodes : [],
		cdnImage: CDN,
	}));

// ── Utilities ────────────────────────────────────────────────────────────────

const _PK = "Sy7u#Ye9!N2@Mx4$K8z&Rq3*Wj6^Lc1";

export function encodeProxyToken(rawUrl: string): string {
	const src = new TextEncoder().encode(rawUrl);
	const key = new TextEncoder().encode(_PK);
	const out = new Uint8Array(src.length);
	for (let i = 0; i < src.length; i++) out[i] = src[i] ^ key[i % key.length];
	return btoa(String.fromCharCode(...out))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "");
}

const PROXY_DISABLED = import.meta.env.VITE_DISABLE_PROXY === "true";

export const proxyImageUrl = (url: string): string => {
	if (!url) return "";
	if (PROXY_DISABLED) return url;
	return `/api/v1/f/${encodeProxyToken(url)}`;
};

export const proxyEmbedUrl = (url: string): string => {
	if (!url) return "";
	if (PROXY_DISABLED) return url;
	return `/api/v1/e/${encodeProxyToken(url)}`;
};

export const proxyM3u8Url = (url: string): string => {
	if (!url) return "";
	if (PROXY_DISABLED) return url;
	return `/api/v1/m/${encodeProxyToken(url)}`;
};

export const resolveThumb = (url: string, cdnBase = CDN) => {
	if (!url) return "";
	const absolute = url.startsWith("http") ? url : `${cdnBase}/${url}`;
	return proxyImageUrl(absolute);
};

// Returns the original absolute URL without proxying — use when storing to DB
export const resolveRawUrl = (url: string, cdnBase = CDN) => {
	if (!url) return "";
	return url.startsWith("http") ? url : `${cdnBase}/${url}`;
};

export const movieItemFromDetail = (
	item: OphimMovieDetail,
): OphimMovieItem => ({
	_id: item._id,
	name: decodeHtml(item.name),
	slug: item.slug,
	origin_name: decodeHtml(item.origin_name),
	type: item.type,
	thumb_url: item.thumb_url,
	poster_url: item.poster_url,
	year: item.year,
	category: item.category,
	country: item.country,
	episode_current: item.episode_current,
	episode_total: item.episode_total,
	quality: item.quality,
	lang: item.lang,
});
