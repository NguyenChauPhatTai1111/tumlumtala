import { MOVIE_PAGE_SIZE } from "@pages/movie/constants";
import type { OphimMovieItem, OphimV1CatalogItem } from "@pages/movie/types";
import { historyRowToItem, likedRowToItem } from "@pages/movie/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import {
	deleteMovieHistory,
	deleteMovieSearchHistoryAll,
	deleteMovieSearchHistoryItem,
	deleteMovieWatchHistoryAll,
	getLikedMovies,
	getLikedMoviesPaged,
	getMovieSearchHistory,
	getMovieWatchHistory,
	getMovieWatchHistoryPaged,
	likeMovie,
	recordMovieWatch,
	saveMovieSearchKeyword,
	unlikeMovie,
} from "@/services/movieBackendService";
import type {
	MovieSearchFilter,
	MovieSortField,
	MovieSortType,
} from "@/services/movieService";
import {
	getCountries,
	getGenres,
	getHomeMovies,
	getMoviesByFilter,
	getMoviesByListSlug,
	getYears,
	resolveRawUrl,
	searchMovies,
} from "@/services/movieService";

export const useMovieCatalogQueries = () => {
	const genresQuery = useQuery({
		queryKey: ["movie", "catalog", "genres"],
		queryFn: getGenres,
		staleTime: 1000 * 60 * 60,
		retry: false,
	});
	const countriesQuery = useQuery({
		queryKey: ["movie", "catalog", "countries"],
		queryFn: getCountries,
		staleTime: 1000 * 60 * 60,
		retry: false,
	});
	const yearsQuery = useQuery({
		queryKey: ["movie", "catalog", "years"],
		queryFn: getYears,
		staleTime: 1000 * 60 * 60,
		retry: false,
	});

	return { genresQuery, countriesQuery, yearsQuery };
};

export const useMovieBackendQueries = () => {
	const searchHistoryQuery = useQuery({
		queryKey: ["movie", "backend", "search-history"],
		queryFn: getMovieSearchHistory,
		retry: false,
	});
	const likedQuery = useQuery({
		queryKey: ["movie", "backend", "liked"],
		queryFn: getLikedMovies,
		retry: false,
	});
	const watchHistoryQuery = useQuery({
		queryKey: ["movie", "backend", "watch-history-raw"],
		queryFn: () => getMovieWatchHistory(),
		retry: false,
		staleTime: 1000 * 30,
	});

	return { searchHistoryQuery, likedQuery, watchHistoryQuery };
};

export const useMovieLikeMutation = (likedSlugs: Set<string>) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			movie,
			rating,
		}: {
			movie: OphimMovieItem;
			rating?: string;
		}) => {
			if (likedSlugs.has(movie.slug)) {
				await unlikeMovie(movie.slug);
			} else {
				await likeMovie({
					slug: movie.slug,
					name: movie.name,
					origin_name: movie.origin_name,
					thumbnail: resolveRawUrl(movie.thumb_url),
					poster_url: resolveRawUrl(movie.poster_url),
					type: movie.type,
					year: movie.year,
					quality: movie.quality,
					lang: movie.lang,
					rating: rating,
				});
			}
		},
		onMutate: async ({ movie }) => {
			await queryClient.cancelQueries({
				queryKey: ["movie", "backend", "liked"],
			});
			const prev = queryClient.getQueryData<
				ReturnType<typeof getLikedMovies> extends Promise<infer T> ? T : never
			>(["movie", "backend", "liked"]);
			const isUnliking = likedSlugs.has(movie.slug);
			queryClient.setQueryData(
				["movie", "backend", "liked"],
				(
					cur: {
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
					}[] = [],
				) =>
					isUnliking
						? cur.filter((r) => r.slug !== movie.slug)
						: [
								{
									id: Date.now(),
									slug: movie.slug,
									name: movie.name,
									origin_name: movie.origin_name ?? "",
									thumbnail: resolveRawUrl(movie.thumb_url),
									poster_url: resolveRawUrl(movie.poster_url),
									type: movie.type ?? "",
									year: movie.year ?? 0,
									quality: movie.quality ?? "",
									lang: movie.lang ?? "",
									rating: "",
									liked_at: new Date().toISOString(),
								},
								...cur,
							],
			);
			return { prev, isUnliking };
		},
		onError: (_e, _v, ctx) => {
			if (ctx?.prev) {
				queryClient.setQueryData(["movie", "backend", "liked"], ctx.prev);
			}
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["movie", "backend", "liked"],
			});
		},
	});
};

export const useRecordWatchMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: recordMovieWatch,
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["movie", "backend", "history"],
			});
			void queryClient.invalidateQueries({
				queryKey: ["movie", "backend", "watch-history-raw"],
			});
			void queryClient.invalidateQueries({
				queryKey: ["movie", "episode-positions"],
			});
		},
	});
};

export const useLatestMovies = (heroCount: number) => {
	const [page, setPage] = useState(1);
	const [pageOffset, setPageOffset] = useState(0);
	const [movies, setMovies] = useState<OphimMovieItem[]>([]);
	const [heroIndices, setHeroIndices] = useState<ReadonlySet<number>>(
		new Set(),
	);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(false);

	const load = useCallback(
		async (p: number, append: boolean) => {
			setLoading(true);
			setError(false);
			try {
				const data = await getHomeMovies(p, MOVIE_PAGE_SIZE);
				setMovies((prev) => (append ? [...prev, ...data.items] : data.items));
				if (!append) {
					const pool = data.items.length;
					const count = Math.min(heroCount, pool);
					const indices = new Set<number>();
					while (indices.size < count) {
						indices.add(Math.floor(Math.random() * pool));
					}
					setHeroIndices(indices);
					setPageOffset(p - 1);
					setPage(1);
				} else {
					setPage((prev) => prev + 1);
				}
				setTotalPages(data.pagination.totalPages);
			} catch {
				setError(true);
			} finally {
				setLoading(false);
			}
		},
		[heroCount],
	);

	return { page, pageOffset, movies, heroIndices, totalPages, loading, error, load };
};

export const useSearchMovies = () => {
	const [page, setPage] = useState(1);
	const [pageOffset, setPageOffset] = useState(0);
	const [movies, setMovies] = useState<OphimMovieItem[]>([]);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(false);

	const load = useCallback(
		async (
			kw: string,
			p: number,
			append: boolean,
			filter?: MovieSearchFilter,
		) => {
			setLoading(true);
			setError(false);
			try {
				const data = await searchMovies(kw, p, MOVIE_PAGE_SIZE, filter);
				setMovies((prev) => (append ? [...prev, ...data.items] : data.items));
				setTotalPages(data.pagination.totalPages);
				if (!append) {
					setPageOffset(p - 1);
					setPage(1);
				} else {
					setPage((prev) => prev + 1);
				}
			} catch {
				setError(true);
			} finally {
				setLoading(false);
			}
		},
		[],
	);

	const reset = useCallback(() => {
		setMovies([]);
		setPage(1);
		setPageOffset(0);
	}, []);

	return { page, pageOffset, movies, totalPages, loading, error, load, reset };
};

export const useLikedMovies = () => {
	const [page, setPage] = useState(1);
	const [movies, setMovies] = useState<OphimMovieItem[]>([]);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(false);

	const load = useCallback(async (p: number, append: boolean) => {
		setLoading(true);
		try {
			const data = await getLikedMoviesPaged(p, MOVIE_PAGE_SIZE);
			setMovies((prev) =>
				append
					? [...prev, ...data.items.map(likedRowToItem)]
					: data.items.map(likedRowToItem),
			);
			setTotalPages(data.totalPages);
			setPage(p);
		} catch {
			// ignore
		} finally {
			setLoading(false);
		}
	}, []);

	const removeSlug = useCallback((slug: string) => {
		setMovies((prev) => prev.filter((m) => m.slug !== slug));
	}, []);

	return { page, movies, totalPages, loading, load, removeSlug };
};

// Keep only the most-recently-watched row per slug (API returns one row per episode)
const dedupeHistoryBySlug = (
	items: import("@/services/movieBackendService").MovieWatchHistoryRow[],
): import("@/services/movieBackendService").MovieWatchHistoryRow[] => {
	const seen = new Map<
		string,
		import("@/services/movieBackendService").MovieWatchHistoryRow
	>();
	for (const row of items) {
		const existing = seen.get(row.slug);
		if (!existing || row.watched_at > existing.watched_at) {
			seen.set(row.slug, row);
		}
	}
	return Array.from(seen.values());
};

const HISTORY_FETCH_LIMIT = 500;

export const useHistoryMovies = () => {
	const [page, setPage] = useState(1);
	const [movies, setMovies] = useState<OphimMovieItem[]>([]);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(false);

	const load = useCallback(async (_p: number, _append: boolean) => {
		setLoading(true);
		try {
			const data = await getMovieWatchHistoryPaged(1, HISTORY_FETCH_LIMIT);
			const deduped = dedupeHistoryBySlug(data.items).map(historyRowToItem);
			setMovies(deduped);
			setTotalPages(1);
			setPage(1);
		} catch {
			// ignore
		} finally {
			setLoading(false);
		}
	}, []);

	const removeSlug = useCallback((slug: string) => {
		setMovies((prev) => prev.filter((m) => m.slug !== slug));
	}, []);

	const clearMovies = useCallback(() => setMovies([]), []);

	return { page, movies, totalPages, loading, load, removeSlug, clearMovies };
};

export const useDeleteHistoryMutation = (
	removeSlug: (slug: string) => void,
) => {
	return useMutation({
		mutationFn: (slug: string) => deleteMovieHistory(slug),
		onMutate: (slug) => removeSlug(slug),
	});
};

export const useBulkDeleteWatchHistoryMutation = (clearMovies: () => void) => {
	return useMutation({
		mutationFn: () => deleteMovieWatchHistoryAll(),
		onMutate: () => clearMovies(),
	});
};

export const useDeleteSearchHistoryItemMutation = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: number) => deleteMovieSearchHistoryItem(id),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["movie", "backend", "search-history"],
			});
		},
	});
};

export const useBulkDeleteSearchHistoryMutation = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => deleteMovieSearchHistoryAll(),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["movie", "backend", "search-history"],
			});
		},
	});
};

export const useSaveSearchKeyword = (
	hasSearch: boolean,
	searchKeyword: string,
) => {
	const queryClient = useQueryClient();

	return useCallback(() => {
		if (!hasSearch) return undefined;
		const timer = window.setTimeout(() => {
			void saveMovieSearchKeyword(searchKeyword)
				.then(() => {
					void queryClient.invalidateQueries({
						queryKey: ["movie", "backend", "search-history"],
					});
				})
				.catch(() => {});
		}, 900);
		return () => window.clearTimeout(timer);
	}, [hasSearch, searchKeyword, queryClient]);
};

export const useListMovies = () => {
	const [page, setPage] = useState(1);
	const [pageOffset, setPageOffset] = useState(0);
	const [movies, setMovies] = useState<OphimMovieItem[]>([]);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(false);

	const load = useCallback(
		async (
			listSlug: string,
			p: number,
			append: boolean,
			sortField: MovieSortField = "modified.time",
			sortType: MovieSortType = "desc",
			genreSlug?: string | null,
			countrySlug?: string | null,
			yearSlug?: string | null,
		) => {
			setLoading(true);
			setError(false);
			try {
				let data: Awaited<ReturnType<typeof getHomeMovies>>;

				if (genreSlug) {
					data = await getMoviesByFilter(
						{ genreSlug, countrySlug, yearSlug, sortField, sortType },
						p,
						MOVIE_PAGE_SIZE,
					);
				} else {
					data = await getMoviesByListSlug(
						listSlug,
						p,
						MOVIE_PAGE_SIZE,
						sortField,
						sortType,
					);
				}

				setMovies((prev) => (append ? [...prev, ...data.items] : data.items));
				setTotalPages(data.pagination.totalPages);
				if (!append) {
					setPageOffset(p - 1);
					setPage(1);
				} else {
					setPage((prev) => prev + 1);
				}
			} catch {
				setError(true);
			} finally {
				setLoading(false);
			}
		},
		[],
	);

	const reset = useCallback(() => {
		setMovies([]);
		setPage(1);
		setPageOffset(0);
		setTotalPages(1);
		setError(false);
	}, []);

	return { page, pageOffset, movies, totalPages, loading, error, load, reset };
};

export type { OphimMovieItem, OphimV1CatalogItem };
