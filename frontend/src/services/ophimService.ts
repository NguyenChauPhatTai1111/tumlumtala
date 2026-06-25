import type {
    OphimMovieDetail,
    OphimMovieItem,
    OphimV1CatalogItem,
    OphimV1ListData,
    OphimV1Response,
} from "@/pages/movie/types";
import type {
    MovieFilterParams,
    MovieSearchFilter,
    MovieSortField,
    MovieSortType,
} from "@/services/movieService";

const BASE = "https://ophim1.com";
const CDN = "https://img.ophim.live/uploads/movies";

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

const decodeItem = <T extends { name: string; origin_name: string }>(item: T): T => ({
    ...item,
    name: decodeHtml(item.name),
    origin_name: decodeHtml(item.origin_name),
});

const isRegionCode = (value?: string | null) => Boolean(value && /^[a-z]{2}$/i.test(value.trim()));

const getRegionDisplayName = (code: string) => {
    try {
        const displayNames = new Intl.DisplayNames(["vi"], { type: "region" });
        return displayNames.of(code.toUpperCase()) ?? code.toUpperCase();
    } catch {
        return code.toUpperCase();
    }
};

const normalizeCountryItem = (item: OphimV1CatalogItem): OphimV1CatalogItem => {
    const rawName = decodeHtml(item.name ?? "");
    const regionCode = [item.slug, rawName, item._id].find(isRegionCode);
    if (!regionCode) return { ...item, name: rawName };
    return { ...item, name: getRegionDisplayName(regionCode) };
};

interface OphimListResult {
    items: OphimMovieItem[];
    pagination: {
        totalItems: number;
        totalItemsPerPage: number;
        currentPage: number;
        totalPages: number;
    };
}

const v1List = (path: string): Promise<OphimListResult> =>
    fetchJson<OphimV1Response<OphimV1ListData>>(`${BASE}/v1/api${path}`).then((r) => {
        const p = r.data.params?.pagination;
        const totalItems = p?.totalItems ?? 0;
        const perPage = p?.totalItemsPerPage ?? 48;
        const totalPages = p?.totalPages ?? (perPage > 0 ? Math.ceil(totalItems / perPage) : 1);
        // APP_DOMAIN_CDN_IMAGE = "https://img.ophim.live", images at /uploads/movies/<filename>
        const cdnBase = r.data.APP_DOMAIN_CDN_IMAGE
            ? `${r.data.APP_DOMAIN_CDN_IMAGE}/uploads/movies`
            : CDN;
        const resolveUrl = (url: string) =>
            url && !url.startsWith("http") ? `${cdnBase}/${url}` : url;
        return {
            items: (r.data.items ?? []).map((item) =>
                decodeItem({
                    ...item,
                    thumb_url: resolveUrl(item.thumb_url),
                    poster_url: resolveUrl(item.poster_url),
                }),
            ),
            pagination: {
                totalItems,
                totalItemsPerPage: perPage,
                currentPage: p?.currentPage ?? 1,
                totalPages: Math.max(1, totalPages),
            },
        };
    });

// Ophim detail response: episodes in data.item.episodes, cdn in data.APP_DOMAIN_CDN_IMAGE
interface OphimDetailData {
    item: OphimMovieDetail & { episodes?: OphimMovieDetail["episodes"] };
    APP_DOMAIN_CDN_IMAGE?: string;
}

export const ophimGetHomeMovies = (page = 1, limit = 48) =>
    v1List(`/danh-sach/phim-moi-cap-nhat?page=${page}&limit=${limit}`);

export const ophimGetLatestMovies = ophimGetHomeMovies;

export const ophimSearchMovies = (
    keyword: string,
    page = 1,
    limit = 48,
    filter?: MovieSearchFilter,
): Promise<OphimListResult> => {
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

export const ophimGetMoviesByListSlug = (
    slug: string,
    page = 1,
    limit = 48,
    sortField: MovieSortField = "modified.time",
    sortType: MovieSortType = "desc",
): Promise<OphimListResult> => {
    if (slug === "phim-moi") return ophimGetLatestMovies(page, limit);
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    qs.set("sort_field", sortField);
    qs.set("sort_type", sortType);
    return v1List(`/danh-sach/${slug}?${qs.toString()}`);
};

export const ophimGetMoviesByFilter = (
    params: MovieFilterParams,
    page = 1,
    limit = 48,
): Promise<OphimListResult> => {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (params.countrySlug) qs.set("country", params.countrySlug);
    if (params.sortField) qs.set("sort_field", params.sortField);
    if (params.sortType) qs.set("sort_type", params.sortType);
    if (params.yearSlug) qs.set("year", params.yearSlug);
    return v1List(`/the-loai/${params.genreSlug}?${qs.toString()}`);
};

export const ophimGetGenres = (): Promise<OphimV1CatalogItem[]> =>
    fetchJson<OphimV1Response<{ items: OphimV1CatalogItem[] }>>(`${BASE}/v1/api/the-loai`).then(
        (r) => r.data.items ?? [],
    );

export const ophimGetCountries = (): Promise<OphimV1CatalogItem[]> =>
    fetchJson<OphimV1Response<{ items: OphimV1CatalogItem[] }>>(`${BASE}/v1/api/quoc-gia`).then(
        (r) => (r.data.items ?? []).map(normalizeCountryItem),
    );

export const ophimGetMovieDetail = (slug: string) =>
    fetchJson<OphimV1Response<OphimDetailData>>(`${BASE}/v1/api/phim/${slug}`).then((r) => {
        const item = r.data.item;
        if (!item) throw new Error("Movie not found");
        const episodes = item.episodes ?? [];
        const cdnImage = r.data.APP_DOMAIN_CDN_IMAGE
            ? `${r.data.APP_DOMAIN_CDN_IMAGE}/uploads/movies`
            : CDN;
        const resolveUrl = (url: string) =>
            url && !url.startsWith("http") ? `${cdnImage}/${url}` : url;
        const movie: OphimMovieDetail = {
            ...item,
            name: decodeHtml(item.name),
            origin_name: decodeHtml(item.origin_name),
            thumb_url: resolveUrl(item.thumb_url),
            poster_url: resolveUrl(item.poster_url),
            episodes: undefined,
        };
        return { movie, episodes, cdnImage };
    });

export const OPHIM_CDN = CDN;
