import { HERO_MOVIE_COUNT } from "@pages/movie/components/layout/HeroSlider";
import {
	DEFAULT_FILTER_STATE,
	DEFAULT_LIST_SLUG,
	HOME_INFINITE_SCROLL_MAX_PAGES,
	MOVIE_LISTS,
	type MovieListFilterState,
} from "@pages/movie/constants";
import type {
	MovieTab,
	OphimMovieItem,
	OphimV1CatalogItem,
} from "@pages/movie/types";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { saveMovieSearchKeyword } from "@/services/movieBackendService";
import { useDebouncedValue } from "./useDebouncedValue";
import {
	useDeleteHistoryMutation,
	useHistoryMovies,
	useLatestMovies,
	useLikedMovies,
	useListMovies,
	useMovieBackendQueries,
	useMovieCatalogQueries,
	useMovieLikeMutation,
	useRecordWatchMutation,
	useSearchMovies,
} from "./useMovieData";

export type { MovieTab } from "@pages/movie/types";

export function useMoviePageState() {
	const queryClient = useQueryClient();

	// ── Tab & navigation ──
	const [tab, setTab] = useState<MovieTab>("home");

	// ── Search ──
	const [keyword, setKeyword] = useState("");
	const debouncedKeyword = useDebouncedValue(keyword, 650);
	const searchKeyword = debouncedKeyword.trim();
	const hasSearch = searchKeyword.length >= 2;

	// ── Selected movie (detail dialog) ──
	const [selectedMovie, setSelectedMovie] = useState<OphimMovieItem | null>(
		null,
	);
	const [autoPlayOnOpen, setAutoPlayOnOpen] = useState(false);

	// ── Filter state ──
	const [listFilter, setListFilter] =
		useState<MovieListFilterState>(DEFAULT_FILTER_STATE);
	// committedFilter drives the actual API call; listFilter is the pending UI state
	const [committedFilter, setCommittedFilter] =
		useState<MovieListFilterState | null>(null);
	const listFilterRef = useRef(listFilter);
	useEffect(() => {
		listFilterRef.current = listFilter;
	});
	const [filterOpen, setFilterOpen] = useState(false);

	// ── Image mode ──
	const [imageMode, setImageMode] = useState<"poster" | "thumb">(
		() => (localStorage.getItem("imageMode") as "poster" | "thumb") ?? "poster",
	);

	// ── Scroll & back-to-top ──
	const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(
		null,
	);
	const [showBackToTop, setShowBackToTop] = useState(false);

	// ── Caches ──
	const ratingCacheRef = useRef<Map<string, string>>(new Map());
	const lastSavedKeywordRef = useRef<string | null>(null);

	// ── Backend data ──
	const { searchHistoryQuery, likedQuery, watchHistoryQuery } =
		useMovieBackendQueries();
	const { genresQuery, countriesQuery } = useMovieCatalogQueries();

	const likedSlugs = useMemo(
		() => new Set((likedQuery.data ?? []).map((r) => r.slug)),
		[likedQuery.data],
	);

	const watchProgressMap = useMemo(() => {
		const map = new Map<
			string,
			{
				position: number;
				duration?: number;
				completed?: boolean;
				episodeSlug?: string;
			}
		>();
		for (const row of watchHistoryQuery.data ?? []) {
			if (row.last_watched_position > 5) {
				map.set(row.slug, {
					position: row.last_watched_position,
					duration: row.duration || undefined,
					completed: row.completed,
					episodeSlug: row.episode_slug || undefined,
				});
			}
		}
		return map;
	}, [watchHistoryQuery.data]);

	const selectedMovieEpisodeProgressMap = useMemo(() => {
		const map = new Map<string, { position: number; duration: number }>();
		if (!selectedMovie?.slug) return map;
		const baseSlug = selectedMovie.slug.replace(/-phan-\d+$/, "");
		for (const row of watchHistoryQuery.data ?? []) {
			if (
				row.slug.replace(/-phan-\d+$/, "") === baseSlug &&
				row.episode_slug &&
				row.last_watched_position > 0 &&
				row.duration > 0
			) {
				map.set(row.episode_slug, {
					position: row.last_watched_position,
					duration: row.duration,
				});
			}
		}
		return map;
	}, [watchHistoryQuery.data, selectedMovie?.slug]);

	// ── Paginated data hooks ──
	const latest = useLatestMovies(HERO_MOVIE_COUNT);
	const list = useListMovies();
	const search = useSearchMovies();
	const liked = useLikedMovies();
	const history = useHistoryMovies();

	// ── Mutations ──
	const likeMutation = useMovieLikeMutation(likedSlugs);
	const recordWatchMutation = useRecordWatchMutation();
	const deleteHistoryMutation = useDeleteHistoryMutation(history.removeSlug);

	// ── Derived ──
	const activeFilterCount = [
		listFilter.listSlug !== DEFAULT_LIST_SLUG,
		listFilter.sortField !== "modified.time" || listFilter.sortType !== "desc",
		Boolean(listFilter.genreSlug),
		Boolean(listFilter.countrySlug),
		Boolean(listFilter.yearSlug),
	].filter(Boolean).length;

	const isLandingVisible =
		(!filterOpen &&
			tab === "search" &&
			!hasSearch &&
			activeFilterCount === 0) ||
		(!filterOpen &&
			tab === "search" &&
			hasSearch &&
			!search.loading &&
			!search.movies.length) ||
		(!filterOpen &&
			tab === "search" &&
			!hasSearch &&
			activeFilterCount > 0 &&
			!list.loading &&
			!list.movies.length) ||
		(tab === "liked" && !liked.loading && !liked.movies.length) ||
		(tab === "history" && !history.loading && !history.movies.length);

	const sliderMovies =
		latest.heroIndices.size > 0
			? Array.from(latest.heroIndices).map((i) => latest.movies[i])
			: latest.movies.slice(0, HERO_MOVIE_COUNT);

	const gridMovies =
		latest.heroIndices.size > 0
			? latest.movies.filter((_, i) => !latest.heroIndices.has(i))
			: latest.movies.slice(HERO_MOVIE_COUNT);

	const listLabel =
		MOVIE_LISTS.find((l) => l.slug === (committedFilter ?? listFilter).listSlug)
			?.label ?? "Danh sách";

	const activeFilterChips = [
		listFilter.listSlug !== DEFAULT_LIST_SLUG
			? {
					key: "list",
					label:
						MOVIE_LISTS.find((l) => l.slug === listFilter.listSlug)?.label ??
						listFilter.listSlug,
					onDelete: () => commitPatch({ listSlug: DEFAULT_LIST_SLUG }),
				}
			: null,
		listFilter.genreSlug
			? {
					key: "genre",
					label:
						genresQuery.data?.find((g) => g.slug === listFilter.genreSlug)
							?.name ?? listFilter.genreSlug,
					onDelete: () => commitPatch({ genreSlug: null }),
				}
			: null,
		listFilter.countrySlug
			? {
					key: "country",
					label:
						countriesQuery.data?.find((c) => c.slug === listFilter.countrySlug)
							?.name ?? listFilter.countrySlug,
					onDelete: () => commitPatch({ countrySlug: null }),
				}
			: null,
		listFilter.yearSlug
			? {
					key: "year",
					label: listFilter.yearSlug,
					onDelete: () => commitPatch({ yearSlug: null }),
				}
			: null,
		listFilter.sortField !== "modified.time" || listFilter.sortType !== "desc"
			? {
					key: "sort",
					label: `${listFilter.sortField === "year" ? "Năm" : listFilter.sortField === "_id" ? "Mới đăng" : "Cập nhật"} · ${listFilter.sortType === "asc" ? "Cũ nhất" : "Mới nhất"}`,
					onDelete: () =>
						commitPatch({
							sortField: DEFAULT_FILTER_STATE.sortField,
							sortType: DEFAULT_FILTER_STATE.sortType,
						}),
				}
			: null,
	].filter(Boolean) as { key: string; label: string; onDelete: () => void }[];

	// ── Internal helper ──
	function commitPatch(patch: Partial<MovieListFilterState>) {
		const newFilter = { ...listFilter, ...patch };
		setListFilter(newFilter);
		setCommittedFilter(newFilter);
	}

	// ── Effects ──
	useEffect(() => {
		void latest.load(1, false);
	}, [latest.load]);

	useEffect(() => {
		if (tab !== "search" || hasSearch || committedFilter === null) {
			if (committedFilter === null) list.reset();
			return;
		}
		list.reset();
		void list.load(
			committedFilter.listSlug,
			1,
			false,
			committedFilter.sortField,
			committedFilter.sortType,
			committedFilter.genreSlug,
			committedFilter.countrySlug,
			committedFilter.yearSlug,
		);
	}, [tab, committedFilter, hasSearch, list.reset, list.load]);

	useEffect(() => {
		if (!hasSearch) {
			search.reset();
			return;
		}
		void search.load(searchKeyword, 1, false, listFilterRef.current);
	}, [searchKeyword, hasSearch, search.reset, search.load]);

	useEffect(() => {
		if (tab === "liked") {
			liked.removeSlug("__reset__");
			void liked.load(1, false);
		}
	}, [tab, liked.removeSlug, liked.load]);

	useEffect(() => {
		if (tab === "history") void history.load(1, false);
	}, [tab, history.load]);

	// Auto-save search keyword
	useEffect(() => {
		if (!hasSearch || lastSavedKeywordRef.current === searchKeyword) return;
		const timer = window.setTimeout(() => {
			lastSavedKeywordRef.current = searchKeyword;
			void saveMovieSearchKeyword(searchKeyword)
				.then(() => {
					void queryClient.invalidateQueries({
						queryKey: ["movie", "backend", "search-history"],
					});
				})
				.catch(() => {
					lastSavedKeywordRef.current = null;
				});
		}, 900);
		return () => window.clearTimeout(timer);
	}, [hasSearch, searchKeyword, queryClient]);

	// Back to top
	useEffect(() => {
		const el = scrollContainer;
		if (!el) return;
		const handleScroll = () => setShowBackToTop(el.scrollTop > 300);
		el.addEventListener("scroll", handleScroll, { passive: true });
		return () => el.removeEventListener("scroll", handleScroll);
	}, [scrollContainer]);

	// ── Browse shortcuts ──
	function handleBrowseGenre(item: OphimV1CatalogItem) {
		const newFilter = {
			...listFilter,
			genreSlug: item.slug,
			countrySlug: null,
			yearSlug: null,
		};
		setListFilter(newFilter);
		setCommittedFilter(newFilter);
		setTab("search");
		setKeyword("");
	}
	function handleBrowseCountry(item: OphimV1CatalogItem) {
		const newFilter = {
			...listFilter,
			countrySlug: item.slug,
			genreSlug: null,
			yearSlug: null,
		};
		setListFilter(newFilter);
		setCommittedFilter(newFilter);
		setTab("search");
		setKeyword("");
	}
	function handleBrowseYear(item: OphimV1CatalogItem) {
		const newFilter = {
			...listFilter,
			yearSlug: item.slug,
			genreSlug: null,
			countrySlug: null,
		};
		setListFilter(newFilter);
		setCommittedFilter(newFilter);
		setTab("search");
		setKeyword("");
	}

	return {
		// Tab
		tab,
		setTab,
		// Search
		keyword,
		setKeyword,
		searchKeyword,
		hasSearch,
		// Dialog
		selectedMovie,
		setSelectedMovie,
		autoPlayOnOpen,
		setAutoPlayOnOpen,
		// Filter
		listFilter,
		setListFilter,
		committedFilter,
		setCommittedFilter,
		listFilterRef,
		filterOpen,
		setFilterOpen,
		// Image
		imageMode,
		setImageMode,
		// Scroll
		scrollContainer,
		setScrollContainer,
		showBackToTop,
		// Caches
		ratingCacheRef,
		lastSavedKeywordRef,
		// Backend
		searchHistoryQuery,
		likedQuery,
		watchHistoryQuery,
		genresQuery,
		countriesQuery,
		likedSlugs,
		watchProgressMap,
		selectedMovieEpisodeProgressMap,
		// Paginated
		latest,
		list,
		search,
		liked,
		history,
		// Mutations
		likeMutation,
		recordWatchMutation,
		deleteHistoryMutation,
		// Derived
		activeFilterCount,
		isLandingVisible,
		sliderMovies,
		gridMovies,
		listLabel,
		activeFilterChips,
		commitPatch,
		// Browse
		handleBrowseGenre,
		handleBrowseCountry,
		handleBrowseYear,
		// Constants
		HOME_INFINITE_SCROLL_MAX_PAGES,
	};
}
