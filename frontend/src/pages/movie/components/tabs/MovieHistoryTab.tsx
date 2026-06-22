import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import { Box, Button, CircularProgress, Stack } from "@mui/material";
import { MovieGrid } from "@pages/movie/components/catalog/MovieGrid";
import { SectionHeader } from "@pages/movie/components/layout/SectionHeader";
import type {
	OphimEpisodeData,
	OphimEpisodeServer,
	OphimMovieDetail,
	OphimMovieItem,
} from "@pages/movie/types";
import { MovieHistoryLanding } from "./MovieSearchLanding";

interface MovieHistoryTabProps {
	history: {
		loading: boolean;
		movies: OphimMovieItem[];
		page: number;
		totalPages: number;
		load: (page: number, append: boolean) => Promise<void>;
	};
	likedSlugs: Set<string>;
	imageMode: "poster" | "thumb";
	scrollContainer: HTMLDivElement | null;
	onSelect: (movie: OphimMovieItem) => void;
	onLike: (movie: OphimMovieItem, rating?: string) => void;
	onPlay: (
		movie: OphimMovieItem,
		detail: OphimMovieDetail,
		server: OphimEpisodeServer,
		ep: OphimEpisodeData,
	) => void;
	onDeleteHistory: (slug: string) => void;
	onDeleteHistoryAll: () => void;
	onLoadMore: () => void;
	onPageChange: (p: number) => void;
}

export function MovieHistoryTab({
	history,
	likedSlugs,
	imageMode,
	scrollContainer,
	onSelect,
	onLike,
	onPlay,
	onDeleteHistory,
	onDeleteHistoryAll,
	onLoadMore,
	onPageChange,
}: MovieHistoryTabProps) {
	return (
		<Box
			sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
		>
			<Stack
				direction="row"
				alignItems="flex-start"
				justifyContent="space-between"
			>
				<SectionHeader
					title="Lịch sử xem phim"
					subtitle="Được lưu vào tài khoản của bạn"
				/>
				{history.movies.length > 0 && (
					<Button
						size="small"
						color="error"
						startIcon={<DeleteSweepIcon />}
						onClick={onDeleteHistoryAll}
						sx={{ mt: 0.5, flexShrink: 0 }}
					>
						Xóa tất cả
					</Button>
				)}
			</Stack>
			<MovieGrid
				movies={history.movies}
				loading={history.loading && !history.movies.length}
				likedSlugs={likedSlugs}
				imageMode={imageMode}
				onSelect={onSelect}
				onLike={onLike}
				onPlay={onPlay}
				onDeleteHistory={onDeleteHistory}
				onLoadMore={onLoadMore}
				canLoadMore={history.page < history.totalPages}
				loadingMore={history.loading}
				scrollRoot={scrollContainer}
				page={history.page}
				totalPages={history.totalPages}
				onPageChange={onPageChange}
			/>
			{history.loading && history.movies.length > 0 && (
				<Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
					<CircularProgress size={28} />
				</Box>
			)}
			{!history.movies.length && !history.loading && <MovieHistoryLanding />}
		</Box>
	);
}
