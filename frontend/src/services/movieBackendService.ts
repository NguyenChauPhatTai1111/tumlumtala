import { apiRequest } from "@api/authApi";
import { API_PREFIX, apiService } from "./apiService";

interface PagedResponse<T> {
	items: T[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export interface MovieWatchHistoryRow {
	id: number;
	slug: string;
	name: string;
	origin_name: string;
	thumbnail: string;
	poster_url: string;
	episode_name: string;
	episode_slug: string;
	type: string;
	year: number;
	quality: string;
	lang: string;
	rating: string;
	watched_at: string;
	last_watched_position: number;
	duration: number;
	completed: boolean;
	deleted_at: string | null;
}

export interface MovieSearchHistoryRow {
	id: number;
	keyword: string;
	created_at: string;
	updated_at: string;
}

export interface AddWatchHistoryPayload {
	slug: string;
	name: string;
	origin_name?: string;
	thumbnail?: string;
	poster_url?: string;
	episode_name?: string;
	episode_slug?: string;
	type?: string;
	year?: number;
	quality?: string;
	lang?: string;
	rating?: string;
	last_watched_position?: number;
}

export interface MovieLikedRow {
	id: number;
	slug: string;
	name: string;
	origin_name: string;
	thumbnail: string;
	poster_url: string;
	type: string;
	year: number;
	quality: string;
	lang: string;
	rating: string;
	liked_at: string;
}

export interface LikeMoviePayload {
	slug: string;
	name: string;
	origin_name?: string;
	thumbnail?: string;
	poster_url?: string;
	type?: string;
	year?: number;
	quality?: string;
	lang?: string;
	rating?: string;
}

// Watch history
export const getMovieWatchHistory = () =>
	apiService.get<MovieWatchHistoryRow[]>(`${API_PREFIX}/movie/history`);

export const getMovieWatchHistoryPaged = async (
	page = 1,
	limit = 48,
): Promise<PagedResponse<MovieWatchHistoryRow>> => {
	const res = await apiRequest(`${API_PREFIX}/movie/history`, {
		params: { page, limit },
	});
	const p = res.pagination ?? {};
	return {
		items: (res.data as MovieWatchHistoryRow[]) ?? [],
		total: p.total ?? 0,
		page: p.page ?? page,
		limit: p.limit ?? limit,
		totalPages: p.total_pages ?? 1,
	};
};

export const recordMovieWatch = (payload: AddWatchHistoryPayload) =>
	apiService.post<MovieWatchHistoryRow>(`${API_PREFIX}/movie/history`, payload);

export const deleteMovieHistory = (slug: string) =>
	apiService.delete(`${API_PREFIX}/movie/history/${encodeURIComponent(slug)}`);

export const updateWatchPosition = (
	slug: string,
	episodeSlug: string,
	position: number,
	duration?: number,
) =>
	apiService.patch(
		`${API_PREFIX}/movie/history/${encodeURIComponent(slug)}/position?episode_slug=${encodeURIComponent(episodeSlug)}`,
		{ position, duration: duration ?? 0 },
	);

export const getWatchPosition = (slug: string, episodeSlug: string) =>
	apiService.get<MovieWatchHistoryRow | null>(
		`${API_PREFIX}/movie/history/${encodeURIComponent(slug)}/position?episode_slug=${encodeURIComponent(episodeSlug)}`,
	);

export interface EpisodePositionRow {
	slug: string;
	episode_slug: string;
	last_watched_position: number;
	duration: number;
}

export const getEpisodePositions = (baseSlug: string) =>
	apiService.get<EpisodePositionRow[]>(
		`${API_PREFIX}/movie/history/${encodeURIComponent(baseSlug)}/positions`,
	);

// Search history
export const getMovieSearchHistory = () =>
	apiService.get<MovieSearchHistoryRow[]>(`${API_PREFIX}/movie/search-history`);

export const saveMovieSearchKeyword = (keyword: string) =>
	apiService.post(`${API_PREFIX}/movie/search-history`, { keyword });

export const deleteMovieSearchHistoryItem = (id: number) =>
	apiService.delete(`${API_PREFIX}/movie/search-history/${id}`);

export const deleteMovieSearchHistoryAll = () =>
	apiService.delete(`${API_PREFIX}/movie/search-history`);

export const deleteMovieWatchHistoryAll = () =>
	apiService.delete(`${API_PREFIX}/movie/history`);

// Liked
export const getLikedMovies = async (): Promise<MovieLikedRow[]> => {
	const res = await apiRequest(`${API_PREFIX}/movie/liked`, {
		params: { page: 1, limit: 500 },
	});
	return (res.data as MovieLikedRow[]) ?? [];
};

export const getLikedMoviesPaged = async (
	page = 1,
	limit = 48,
): Promise<PagedResponse<MovieLikedRow>> => {
	const res = await apiRequest(`${API_PREFIX}/movie/liked`, {
		params: { page, limit },
	});
	const p = res.pagination ?? {};
	return {
		items: (res.data as MovieLikedRow[]) ?? [],
		total: p.total ?? 0,
		page: p.page ?? page,
		limit: p.limit ?? limit,
		totalPages: p.total_pages ?? 1,
	};
};

export const likeMovie = (payload: LikeMoviePayload) =>
	apiService.post<MovieLikedRow>(`${API_PREFIX}/movie/liked`, payload);

export const unlikeMovie = (slug: string) =>
	apiService.delete(`${API_PREFIX}/movie/liked/${encodeURIComponent(slug)}`);

// Certifications
export interface CertificationInput {
	slug: string;
	tmdb_id: string;
	tmdb_type: string;
}

export const batchGetCertifications = async (
	movies: CertificationInput[],
): Promise<Record<string, string>> => {
	if (!movies.length) return {};
	const moviesServiceUrl =
		(import.meta.env.VITE_MOVIES_SERVICE_URL ?? "http://localhost:25055") +
		`${API_PREFIX}/movie/certifications/batch`;
	const res = await fetch(moviesServiceUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${localStorage.getItem("access_token") ?? ""}`,
		},
		credentials: "include",
		body: JSON.stringify(movies),
	});
	if (!res.ok) return {};
	return res.json() as Promise<Record<string, string>>;
};

// Seasons / Episodes cache
export interface CachedSeason {
	id: number;
	base_slug: string;
	season_number: number;
	season_slug: string;
	name: string;
}

export interface CachedEpisode {
	id: number;
	base_slug: string;
	season_number: number;
	server_name: string;
	episode_name: string;
	episode_slug: string;
	overview: string;
	still_path: string;
	filename: string;
	link_embed: string;
	link_m3u8: string;
}

export interface UpsertSeasonInput {
	season_number: number;
	season_slug: string;
	name: string;
}

export interface UpsertEpisodeInput {
	server_name: string;
	episode_name: string;
	episode_slug: string;
	overview?: string;
	still_path?: string;
	filename?: string;
	link_embed?: string;
	link_m3u8?: string;
}

export const getCachedSeasons = (baseSlug: string) =>
	apiService.get<CachedSeason[]>(
		`${API_PREFIX}/movie/seasons/${encodeURIComponent(baseSlug)}`,
	);

export const upsertCachedSeasons = (
	baseSlug: string,
	seasons: UpsertSeasonInput[],
) =>
	apiService.post<CachedSeason[]>(
		`${API_PREFIX}/movie/seasons/${encodeURIComponent(baseSlug)}`,
		{ seasons },
	);

export const getCachedEpisodes = (baseSlug: string, seasonNumber: number) =>
	apiService.get<CachedEpisode[]>(
		`${API_PREFIX}/movie/seasons/${encodeURIComponent(baseSlug)}/episodes?season=${seasonNumber}`,
	);

export const upsertCachedEpisodes = (
	baseSlug: string,
	seasonNumber: number,
	episodes: UpsertEpisodeInput[],
) =>
	apiService.post<CachedEpisode[]>(
		`${API_PREFIX}/movie/seasons/${encodeURIComponent(baseSlug)}/episodes`,
		{
			season_number: seasonNumber,
			episodes,
		},
	);
