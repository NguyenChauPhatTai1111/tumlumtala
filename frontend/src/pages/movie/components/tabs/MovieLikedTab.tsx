import { Box, CircularProgress } from "@mui/material";
import { MovieGrid } from "@pages/movie/components/catalog/MovieGrid";
import { SectionHeader } from "@pages/movie/components/layout/SectionHeader";
import type {
	OphimEpisodeData,
	OphimEpisodeServer,
	OphimMovieDetail,
	OphimMovieItem,
} from "@pages/movie/types";
import { MovieLikedLanding } from "./MovieSearchLanding";

interface MovieLikedTabProps {
	liked: {
		loading: boolean;
		movies: OphimMovieItem[];
		page: number;
		totalPages: number;
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
	onLike: (movie: OphimMovieItem, rating?: string) => void;
	onPlay: (
		movie: OphimMovieItem,
		detail: OphimMovieDetail,
		server: OphimEpisodeServer,
		ep: OphimEpisodeData,
	) => void;
	onLoadMore: () => void;
	onPageChange: (p: number) => void;
}

export function MovieLikedTab({
	liked,
	likedSlugs,
	imageMode,
	watchProgressMap,
	scrollContainer,
	onSelect,
	onLike,
	onPlay,
	onLoadMore,
	onPageChange,
}: MovieLikedTabProps) {
	return (
		<Box
			sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
		>
			<SectionHeader
				title="Phim yêu thích"
				subtitle="Được lưu vào tài khoản của bạn"
			/>
			<MovieGrid
				movies={liked.movies}
				loading={liked.loading && !liked.movies.length}
				likedSlugs={likedSlugs}
				imageMode={imageMode}
				watchProgressMap={watchProgressMap}
				onSelect={onSelect}
				onLike={onLike}
				onPlay={onPlay}
				onLoadMore={onLoadMore}
				canLoadMore={liked.page < liked.totalPages}
				loadingMore={liked.loading}
				scrollRoot={scrollContainer}
				page={liked.page}
				totalPages={liked.totalPages}
				onPageChange={onPageChange}
			/>
			{liked.loading && liked.movies.length > 0 && (
				<Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
					<CircularProgress size={28} />
				</Box>
			)}
			{!liked.movies.length && !liked.loading && <MovieLikedLanding />}
		</Box>
	);
}
