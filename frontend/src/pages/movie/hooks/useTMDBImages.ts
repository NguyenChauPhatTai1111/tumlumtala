import { useQuery } from "@tanstack/react-query";
import {
	getTMDBCertification,
	getTMDBDetailsWithAll,
	getTMDBImages,
	getTMDBPerson,
	getTMDBPersonCredits,
	getTMDBVideos,
	resolveTMDBBackdrop,
	resolveTMDBPoster,
	resolveTMDBTrailerEmbedUrl,
	searchTMDBId,
} from "@/services/tmdbService";

const DAY = 1000 * 60 * 60 * 24;

// Used by HeroSlider (separate images-only call)
export const useTMDBImages = (
	tmdbId: string | null | undefined,
	tmdbType: string | null | undefined,
) => {
	const type: "movie" | "tv" = tmdbType === "tv" ? "tv" : "movie";
	return useQuery({
		queryKey: ["tmdb", "images", type, tmdbId],
		queryFn: async () => {
			const data = await getTMDBImages(tmdbId as string, type);
			return {
				backdrop: resolveTMDBBackdrop(data),
				poster: resolveTMDBPoster(data),
			};
		},
		enabled: Boolean(tmdbId),
		staleTime: DAY,
		gcTime: DAY,
		retry: false,
	});
};

// Used by HeroSlider (separate videos call)
export const useTMDBTrailer = (
	tmdbId: string | null | undefined,
	tmdbType: string | null | undefined,
) => {
	const type: "movie" | "tv" = tmdbType === "tv" ? "tv" : "movie";
	return useQuery({
		queryKey: ["tmdb", "videos", type, tmdbId],
		queryFn: async () => {
			const data = await getTMDBVideos(tmdbId as string, type);
			return resolveTMDBTrailerEmbedUrl(data);
		},
		enabled: Boolean(tmdbId),
		staleTime: DAY,
		gcTime: DAY,
		retry: false,
	});
};

// Resolves TMDB id: uses provided id directly, or searches by title+year as fallback
export const useTMDBId = (
	tmdbId: string | null | undefined,
	tmdbType: string | null | undefined,
	title: string | null | undefined,
	year?: number | string | null,
	originName?: string | null,
) => {
	const type: "movie" | "tv" = tmdbType === "tv" ? "tv" : "movie";
	const needsSearch = !tmdbId && Boolean(title);
	return useQuery({
		queryKey: ["tmdb", "search-id", type, title, year, originName],
		queryFn: () => searchTMDBId(title as string, type, year, originName),
		enabled: needsSearch,
		staleTime: DAY,
		gcTime: DAY,
		retry: false,
	});
};

// Used by MovieDetailDialog — one request for images + videos + credits
export const useTMDBDetails = (
	tmdbId: string | null | undefined,
	tmdbType: string | null | undefined,
	title?: string | null,
	year?: number | string | null,
	originName?: string | null,
) => {
	const type: "movie" | "tv" = tmdbType === "tv" ? "tv" : "movie";
	const searchQuery = useTMDBId(tmdbId, tmdbType, title, year, originName);
	const resolvedId = tmdbId || searchQuery.data || null;

	return useQuery({
		queryKey: ["tmdb", "details-all", type, resolvedId],
		queryFn: async () => {
			const [data, rating] = await Promise.all([
				getTMDBDetailsWithAll(resolvedId as string, type),
				getTMDBCertification(resolvedId as string, type).catch(() => ""),
			]);
			return {
				tmdbId: resolvedId as string,
				tmdbType: type,
				backdrop: resolveTMDBBackdrop(data.images),
				poster: resolveTMDBPoster(data.images),
				trailerEmbedUrl: resolveTMDBTrailerEmbedUrl(data.videos),
				cast: data.credits.cast.slice(0, 15),
				directors: data.credits.crew.filter((c) => c.job === "Director"),
				tagline: data.tagline ?? null,
				overview: data.overview ?? null,
				runtime: data.runtime ?? null,
				voteAverage: data.vote_average ?? null,
				voteCount: data.vote_count ?? null,
				rating: rating || null,
			};
		},
		enabled: Boolean(resolvedId),
		staleTime: DAY,
		gcTime: DAY,
		retry: false,
	});
};

export const useTMDBPerson = (personId: number | null | undefined) =>
	useQuery({
		queryKey: ["tmdb", "person", personId],
		queryFn: () => getTMDBPerson(personId as number),
		enabled: Boolean(personId),
		staleTime: DAY,
		gcTime: DAY,
		retry: false,
	});

export const useTMDBPersonCredits = (personId: number | null | undefined) =>
	useQuery({
		queryKey: ["tmdb", "person-credits", personId],
		queryFn: () => getTMDBPersonCredits(personId as number),
		enabled: Boolean(personId),
		staleTime: DAY,
		gcTime: DAY,
		retry: false,
	});
