import RefreshIcon from "@mui/icons-material/Refresh";
import {
	Box,
	Button,
	CircularProgress,
	Pagination,
	Stack,
	Typography,
} from "@mui/material";
import {
	INFINITE_SCROLL_MAX_PAGES,
	MOVIE_GRID_TEMPLATE_COLUMNS_POSTER,
	MOVIE_GRID_TEMPLATE_COLUMNS_THUMB,
} from "@pages/movie/constants";
import { useBatchCertifications } from "@pages/movie/hooks/useBatchCertifications";
import type {
	OphimEpisodeData,
	OphimEpisodeServer,
	OphimMovieDetail,
	OphimMovieItem,
} from "@pages/movie/types";
import { useEffect, useRef, useState } from "react";
import { MovieCard } from "./MovieCard";
import { MovieCardSkeleton } from "./MovieCardSkeleton";
import { MovieGridItem } from "./MovieGridItem";

const SKELETON_IDS = Array.from({ length: 48 }, (_, i) => `skeleton-item-${i}`);

export const MovieGrid = ({
	movies,
	loading,
	likedSlugs,
	imageMode = "poster",
	onSelect,
	onLike,
	onPlay,
	onFilter,
	onDeleteHistory,
	onLoadMore,
	canLoadMore,
	loadingMore,
	loadMoreError,
	scrollRoot,
	page = 1,
	totalPages = 1,
	onPageChange,
	maxScrollPages,
	watchProgressMap,
}: {
	movies: OphimMovieItem[];
	loading?: boolean;
	likedSlugs: Set<string>;
	imageMode?: "poster" | "thumb";
	onSelect: (movie: OphimMovieItem) => void;
	onLike: (movie: OphimMovieItem, rating?: string) => void;
	onPlay?: (
		movie: OphimMovieItem,
		detail: OphimMovieDetail,
		server: OphimEpisodeServer,
		ep: OphimEpisodeData,
	) => void;
	onFilter?: (patch: {
		genreSlug?: string | null;
		yearSlug?: string | null;
	}) => void;
	onDeleteHistory?: (slug: string) => void;
	onLoadMore?: () => void;
	canLoadMore?: boolean;
	loadingMore?: boolean;
	loadMoreError?: boolean;
	scrollRoot?: HTMLElement | null;
	page?: number;
	totalPages?: number;
	onPageChange?: (page: number) => void;
	maxScrollPages?: number;
	watchProgressMap?: Map<string, OphimMovieItem["watchProgress"]>;
}) => {
	const certRatings = useBatchCertifications(movies);

	const infiniteScrollActive =
		page <= (maxScrollPages ?? INFINITE_SCROLL_MAX_PAGES);
	const showPagination =
		!infiniteScrollActive && totalPages > 1 && Boolean(onPageChange);

	const [paginationPage, setPaginationPage] = useState(1);

	const sentinelRef = useRef<HTMLDivElement | null>(null);
	const onLoadMoreRef = useRef(onLoadMore);
	onLoadMoreRef.current = onLoadMore;

	useEffect(() => {
		// Don't observe while already loading or when there's nothing more to load
		if (!infiniteScrollActive || !canLoadMore || loadingMore) return;
		const el = sentinelRef.current;
		if (!el) return;

		// Guard against double-fire within the same observer lifecycle
		let fired = false;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting && !fired) {
					fired = true;
					onLoadMoreRef.current?.();
				}
			},
			// rootMargin pre-loads before sentinel is fully visible, matching the
			// old "trigger 8 items before the end" behaviour
			{ root: scrollRoot ?? null, rootMargin: "400px 0px", threshold: 0 },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [infiniteScrollActive, canLoadMore, scrollRoot, loadingMore]);

	const gridSx = {
		display: "grid",
		gridTemplateColumns:
			imageMode === "poster"
				? MOVIE_GRID_TEMPLATE_COLUMNS_POSTER
				: MOVIE_GRID_TEMPLATE_COLUMNS_THUMB,
		gap: 1.5,
	};

	if (loading && !movies.length) {
		return (
			<Box sx={gridSx}>
				{SKELETON_IDS.map((id) => (
					<MovieCardSkeleton key={id} imageMode={imageMode} />
				))}
			</Box>
		);
	}

	if (!movies.length) return null;

	return (
		<>
			<Box sx={gridSx}>
				{movies.map((movie) => {
					const enriched: OphimMovieItem = {
						...movie,
						...(watchProgressMap?.has(movie.slug) && {
							watchProgress:
								movie.watchProgress ?? watchProgressMap.get(movie.slug),
						}),
						...(certRatings[movie.slug] && { rated: certRatings[movie.slug] }),
					};
					return (
						<MovieGridItem key={movie.slug}>
							<MovieCard
								movie={enriched}
								liked={likedSlugs.has(movie.slug)}
								imageMode={imageMode}
								onClick={() => onSelect(movie)}
								onLike={(e, rating) => {
									e.stopPropagation();
									onLike(movie, rating ?? enriched.rated);
								}}
								onPlay={onPlay}
								onFilter={onFilter}
								onDelete={
									onDeleteHistory
										? () => onDeleteHistory(movie.slug)
										: undefined
								}
							/>
						</MovieGridItem>
					);
				})}
			</Box>

			{/* Sentinel for infinite scroll — sits just below the grid */}
			{infiniteScrollActive && !showPagination && (
				<div ref={sentinelRef} style={{ height: 1 }} />
			)}

			{showPagination ? (
				<Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
					{loadingMore ? (
						<CircularProgress size={28} />
					) : (
						<Pagination
							page={paginationPage}
							count={totalPages}
							onChange={(_, p) => {
								setPaginationPage(p);
								onPageChange?.(p);
							}}
							color="primary"
							shape="rounded"
							showFirstButton
							showLastButton
						/>
					)}
				</Box>
			) : (
				<>
					{loadingMore && movies.length > 0 && (
						<Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
							<CircularProgress size={28} />
						</Box>
					)}
					{loadMoreError && movies.length > 0 && !loadingMore && (
						<Stack alignItems="center" spacing={1} sx={{ mt: 2 }}>
							<Typography variant="body2" color="error">
								Không tải được phim tiếp theo.
							</Typography>
							<Button
								variant="outlined"
								startIcon={<RefreshIcon />}
								onClick={onLoadMore}
							>
								Xem thêm
							</Button>
						</Stack>
					)}
				</>
			)}
		</>
	);
};
