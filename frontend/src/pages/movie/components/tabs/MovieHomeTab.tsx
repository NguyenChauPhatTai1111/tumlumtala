import RefreshIcon from "@mui/icons-material/Refresh";
import { Box, Button, Stack, Typography } from "@mui/material";
import { MovieGrid } from "@pages/movie/components/catalog/MovieGrid";
import { HeroSlider } from "@pages/movie/components/layout/HeroSlider";
import { SectionHeader } from "@pages/movie/components/layout/SectionHeader";
import { HOME_INFINITE_SCROLL_MAX_PAGES } from "@pages/movie/constants";
import type {
	OphimEpisodeData,
	OphimEpisodeServer,
	OphimMovieDetail,
	OphimMovieItem,
} from "@pages/movie/types";

interface MovieHomeTabProps {
	sliderMovies: OphimMovieItem[];
	gridMovies: OphimMovieItem[];
	latest: {
		loading: boolean;
		error: boolean;
		page: number;
		pageOffset: number;
		totalPages: number;
		heroIndices: ReadonlySet<number>;
		load: (page: number, append: boolean) => Promise<void>;
	};
	likedSlugs: Set<string>;
	imageMode: "poster" | "thumb";
	watchProgressMap: Map<
		string,
		{
			position: number;
			duration?: number;
			completed?: boolean;
			episodeSlug?: string;
		}
	>;
	scrollContainer: HTMLDivElement | null;
	onSelect: (movie: OphimMovieItem) => void;
	onPlayMovie?: (movie: OphimMovieItem) => void;
	onLike: (movie: OphimMovieItem, rating?: string) => void;
	onPlay: (
		movie: OphimMovieItem,
		detail: OphimMovieDetail,
		server: OphimEpisodeServer,
		ep: OphimEpisodeData,
	) => void;
	onFilter: (patch: {
		genreSlug?: string | null;
		yearSlug?: string | null;
	}) => void;
	onLoadMore: () => void;
	onPageChange: (p: number) => void;
}

export function MovieHomeTab({
	sliderMovies,
	gridMovies,
	latest,
	likedSlugs,
	imageMode,
	watchProgressMap,
	scrollContainer,
	onSelect,
	onPlayMovie,
	onLike,
	onPlay,
	onFilter,
	onLoadMore,
	onPageChange,
}: MovieHomeTabProps) {
	return (
		<Box>
			{/* Full-width hero slider — break out of parent padding */}
			<Box sx={{ mx: { xs: -1, sm: -1.5, md: -2 }, mb: 2 }}>
				<HeroSlider
					movies={sliderMovies}
					loading={latest.loading && !sliderMovies.length}
					likedSlugs={likedSlugs}
					onSelect={onSelect}
					onPlay={onPlayMovie}
					onLike={onLike}
				/>
			</Box>

			<SectionHeader title="Phim mới cập nhật" />

			{latest.error && !gridMovies.length && !latest.loading ? (
				<Stack alignItems="center" spacing={1} sx={{ py: 4 }}>
					<Typography color="error" variant="body2">
						Không tải được danh sách phim.
					</Typography>
					<Button
						variant="outlined"
						startIcon={<RefreshIcon />}
						onClick={() => void latest.load(1, false)}
					>
						Thử lại
					</Button>
				</Stack>
			) : (
				<MovieGrid
					movies={gridMovies}
					loading={latest.loading && !gridMovies.length}
					likedSlugs={likedSlugs}
					imageMode={imageMode}
					watchProgressMap={watchProgressMap}
					onSelect={onSelect}
					onLike={onLike}
					onPlay={onPlay}
					onFilter={onFilter}
					onLoadMore={onLoadMore}
					canLoadMore={latest.pageOffset + latest.page < latest.totalPages}
					loadingMore={latest.loading}
					loadMoreError={latest.error}
					scrollRoot={scrollContainer}
					page={latest.page}
					totalPages={latest.totalPages - latest.pageOffset}
					maxScrollPages={HOME_INFINITE_SCROLL_MAX_PAGES}
					onPageChange={onPageChange}
				/>
			)}
		</Box>
	);
}
