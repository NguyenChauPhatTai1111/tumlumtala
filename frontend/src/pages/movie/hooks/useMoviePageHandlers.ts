import type { MovieListFilterState } from "@pages/movie/constants";
import type { OphimMovieItem } from "@pages/movie/types";
import { useCallback } from "react";
import type { MovieSortField, MovieSortType } from "@/services/movieService";
import type { MovieTab } from "./useMoviePageState";

interface LatestHook {
	loading: boolean;
	error: boolean;
	page: number;
	totalPages: number;
	heroIndices: ReadonlySet<number>;
	load: (page: number, append: boolean) => Promise<void>;
}

interface SearchHook {
	loading: boolean;
	error: boolean;
	movies: OphimMovieItem[];
	page: number;
	totalPages: number;
	load: (
		kw: string,
		page: number,
		append: boolean,
		filter?: MovieListFilterState,
	) => Promise<void>;
	reset: () => void;
}

interface ListHook {
	loading: boolean;
	error: boolean;
	movies: OphimMovieItem[];
	page: number;
	totalPages: number;
	load: (
		listSlug: string,
		page: number,
		append: boolean,
		sortField?: MovieSortField,
		sortType?: MovieSortType,
		genreSlug?: string | null,
		countrySlug?: string | null,
		yearSlug?: string | null,
	) => Promise<void>;
	reset: () => void;
}

interface PagedHook {
	loading: boolean;
	page: number;
	totalPages: number;
	load: (page: number, append: boolean) => Promise<void>;
}

interface Deps {
	setTab: (tab: MovieTab) => void;
	setKeyword: (k: string) => void;
	searchKeyword: string;
	hasSearch: boolean;
	listFilter: MovieListFilterState;
	setListFilter: (f: MovieListFilterState) => void;
	setCommittedFilter: (f: MovieListFilterState | null) => void;
	setFilterOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
	listFilterRef: React.MutableRefObject<MovieListFilterState>;
	likedSlugs: Set<string>;
	ratingCacheRef: React.MutableRefObject<Map<string, string>>;
	likeMutate: (args: { movie: OphimMovieItem; rating?: string }) => void;
	removeLikedSlug: (slug: string) => void;
	setSelectedMovie: (m: OphimMovieItem | null) => void;
	setAutoPlayOnOpen: (v: boolean) => void;
	scrollContainer: HTMLDivElement | null;
	latest: LatestHook;
	list: ListHook;
	search: SearchHook;
	liked: PagedHook;
	history: PagedHook;
	committedFilter: MovieListFilterState | null;
}

export function useMoviePageHandlers({
	setTab,
	setKeyword,
	searchKeyword,
	hasSearch,
	listFilter,
	setListFilter,
	setCommittedFilter,
	setFilterOpen,
	listFilterRef,
	likedSlugs,
	ratingCacheRef,
	likeMutate,
	removeLikedSlug,
	setSelectedMovie,
	setAutoPlayOnOpen,
	scrollContainer,
	latest,
	list,
	search,
	liked,
	history,
	committedFilter,
}: Deps) {
	const handleSelectMovie = useCallback(
		(movie: OphimMovieItem) => setSelectedMovie(movie),
		[setSelectedMovie],
	);

	const handleLikeMovie = useCallback(
		(movie: OphimMovieItem, rating?: string) => {
			if (rating) ratingCacheRef.current.set(movie.slug, rating);
			if (likedSlugs.has(movie.slug)) removeLikedSlug(movie.slug);
			likeMutate({
				movie,
				rating: rating ?? ratingCacheRef.current.get(movie.slug),
			});
		},
		[likedSlugs, ratingCacheRef, likeMutate, removeLikedSlug],
	);

	const handleFilterChange = useCallback(
		(f: MovieListFilterState) => setListFilter(f),
		[setListFilter],
	);

	const handleApplyFilter = useCallback(() => {
		if (hasSearch) {
			void search.load(searchKeyword, 1, false, listFilter);
		} else {
			setCommittedFilter(listFilter);
		}
	}, [hasSearch, search, searchKeyword, listFilter, setCommittedFilter]);

	const handleFilterFromPopup = useCallback(
		(patch: { genreSlug?: string | null; yearSlug?: string | null }) => {
			setTab("search");
			setKeyword("");
			const newFilter = { ...listFilter, ...patch };
			setListFilter(newFilter);
			setCommittedFilter(newFilter);
			setFilterOpen(true);
		},
		[
			listFilter,
			setTab,
			setKeyword,
			setListFilter,
			setCommittedFilter,
			setFilterOpen,
		],
	);

	// ── Load more callbacks ──
	const handleLoadMoreLatest = useCallback(() => {
		if (latest.loading || latest.page >= latest.totalPages) return;
		void latest.load(latest.page + 1, true);
	}, [latest]);

	const handleLoadMoreList = useCallback(() => {
		if (!committedFilter || list.loading || list.page >= list.totalPages)
			return;
		void list.load(
			committedFilter.listSlug,
			list.page + 1,
			true,
			committedFilter.sortField,
			committedFilter.sortType,
			committedFilter.genreSlug,
			committedFilter.countrySlug,
			committedFilter.yearSlug,
		);
	}, [committedFilter, list]);

	const handleLoadMoreSearch = useCallback(() => {
		if (!hasSearch || search.loading || search.page >= search.totalPages)
			return;
		void search.load(
			searchKeyword,
			search.page + 1,
			true,
			listFilterRef.current,
		);
	}, [hasSearch, search, searchKeyword, listFilterRef]);

	const handleLoadMoreLiked = useCallback(() => {
		if (liked.loading || liked.page >= liked.totalPages) return;
		void liked.load(liked.page + 1, true);
	}, [liked]);

	const handleLoadMoreHistory = useCallback(() => {
		if (history.loading || history.page >= history.totalPages) return;
		void history.load(history.page + 1, true);
	}, [history]);

	// ── Page change with scroll-to-top ──
	const handlePageChangeLatest = useCallback(
		(p: number) => {
			void latest.load(p, false);
			scrollContainer?.scrollTo({ top: 0, behavior: "smooth" });
		},
		[latest, scrollContainer],
	);

	const handlePageChangeSearch = useCallback(
		(p: number) => {
			void search.load(searchKeyword, p, false, listFilterRef.current);
			scrollContainer?.scrollTo({ top: 0, behavior: "smooth" });
		},
		[search, searchKeyword, listFilterRef, scrollContainer],
	);

	const handlePageChangeList = useCallback(
		(p: number) => {
			if (!committedFilter) return;
			void list.load(
				committedFilter.listSlug,
				p,
				false,
				committedFilter.sortField,
				committedFilter.sortType,
				committedFilter.genreSlug,
				committedFilter.countrySlug,
				committedFilter.yearSlug,
			);
			scrollContainer?.scrollTo({ top: 0, behavior: "smooth" });
		},
		[committedFilter, list, scrollContainer],
	);

	const handlePageChangeLiked = useCallback(
		(p: number) => {
			void liked.load(p, false);
			scrollContainer?.scrollTo({ top: 0, behavior: "smooth" });
		},
		[liked, scrollContainer],
	);

	const handlePageChangeHistory = useCallback(
		(p: number) => {
			void history.load(p, false);
			scrollContainer?.scrollTo({ top: 0, behavior: "smooth" });
		},
		[history, scrollContainer],
	);

	const handleRetryList = useCallback(() => {
		void list.load(
			listFilter.listSlug,
			1,
			false,
			listFilter.sortField,
			listFilter.sortType,
			listFilter.genreSlug,
			listFilter.countrySlug,
			listFilter.yearSlug,
		);
	}, [list, listFilter]);

	// ── Detail dialog actions ──
	const handleShowInfo = useCallback(
		(m: OphimMovieItem) => {
			setSelectedMovie(m);
			setAutoPlayOnOpen(false);
		},
		[setSelectedMovie, setAutoPlayOnOpen],
	);

	const handlePlayAndOpen = useCallback(
		(m: OphimMovieItem) => {
			setSelectedMovie(m);
			setAutoPlayOnOpen(true);
		},
		[setSelectedMovie, setAutoPlayOnOpen],
	);

	const handleCloseDetail = useCallback(() => {
		setSelectedMovie(null);
		setAutoPlayOnOpen(false);
	}, [setSelectedMovie, setAutoPlayOnOpen]);

	return {
		handleSelectMovie,
		handleLikeMovie,
		handleFilterChange,
		handleApplyFilter,
		handleFilterFromPopup,
		handleLoadMoreLatest,
		handleLoadMoreList,
		handleLoadMoreSearch,
		handleLoadMoreLiked,
		handleLoadMoreHistory,
		handlePageChangeLatest,
		handlePageChangeSearch,
		handlePageChangeList,
		handlePageChangeLiked,
		handlePageChangeHistory,
		handleRetryList,
		handleShowInfo,
		handlePlayAndOpen,
		handleCloseDetail,
	};
}
