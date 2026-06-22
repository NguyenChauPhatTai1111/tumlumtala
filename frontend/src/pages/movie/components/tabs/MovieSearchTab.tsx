import CloseIcon from "@mui/icons-material/Close";
import FilterListIcon from "@mui/icons-material/FilterList";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import {
	Badge,
	Box,
	Button,
	Chip,
	IconButton,
	InputAdornment,
	LinearProgress,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import { MovieGrid } from "@pages/movie/components/catalog/MovieGrid";
import {
	FilterToggleIcon,
	MovieFilterPanel,
} from "@pages/movie/components/layout/MovieFilterPanel";
import { SectionHeader } from "@pages/movie/components/layout/SectionHeader";
import type { MovieListFilterState } from "@pages/movie/constants";
import type {
	OphimEpisodeData,
	OphimEpisodeServer,
	OphimMovieDetail,
	OphimMovieItem,
	OphimV1CatalogItem,
} from "@pages/movie/types";
import { MovieNoResultLanding, MovieSearchLanding } from "./MovieSearchLanding";

interface MovieSearchTabProps {
	keyword: string;
	setKeyword: (k: string) => void;
	searchKeyword: string;
	hasSearch: boolean;
	listFilter: MovieListFilterState;
	filterOpen: boolean;
	setFilterOpen: (v: boolean) => void;
	activeFilterCount: number;
	activeFilterChips: { key: string; label: string; onDelete: () => void }[];
	listLabel: string;
	genres: OphimV1CatalogItem[];
	countries: OphimV1CatalogItem[];
	searchHistory: { id: number; keyword: string }[];
	onDeleteSearchHistoryItem: (id: number) => void;
	onDeleteSearchHistoryAll: () => void;
	search: {
		loading: boolean;
		error: boolean;
		movies: OphimMovieItem[];
		page: number;
		totalPages: number;
		load: (
			keyword: string,
			page: number,
			append: boolean,
			filter: MovieListFilterState,
		) => Promise<void>;
	};
	list: {
		loading: boolean;
		error: boolean;
		movies: OphimMovieItem[];
		page: number;
		totalPages: number;
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
	onFilter: (patch: {
		genreSlug?: string | null;
		yearSlug?: string | null;
	}) => void;
	onFilterChange: (f: MovieListFilterState) => void;
	onApplyFilter: () => void;
	onResetFilter: () => void;
	onLoadMoreSearch: () => void;
	onLoadMoreList: () => void;
	onPageChangeSearch: (p: number) => void;
	onPageChangeList: (p: number) => void;
	onRetryList: () => void;
}

export function MovieSearchTab({
	keyword,
	setKeyword,
	searchKeyword,
	hasSearch,
	listFilter,
	filterOpen,
	setFilterOpen,
	activeFilterCount,
	activeFilterChips,
	listLabel: _listLabel,
	genres,
	countries,
	searchHistory,
	onDeleteSearchHistoryItem,
	onDeleteSearchHistoryAll,
	search,
	list,
	likedSlugs,
	imageMode,
	watchProgressMap,
	scrollContainer,
	onSelect,
	onLike,
	onPlay,
	onFilter,
	onFilterChange,
	onApplyFilter,
	onResetFilter,
	onLoadMoreSearch,
	onLoadMoreList,
	onPageChangeSearch,
	onPageChangeList,
	onRetryList,
}: MovieSearchTabProps) {
	return (
		<Box
			sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
		>
			{/* Search input + filter toggle */}
			<Stack spacing={1} sx={{ my: 1 }}>
				<Stack direction="row" alignItems="center" spacing={1}>
					<TextField
						value={keyword}
						onChange={(e) => setKeyword(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !keyword.trim()) onApplyFilter();
						}}
						placeholder="Tìm kiếm phim..."
						size="small"
						autoFocus
						sx={{
							flex: 1,
							"& .MuiOutlinedInput-root": { borderRadius: 9999, height: 40 },
						}}
						slotProps={{
							input: {
								startAdornment: (
									<InputAdornment position="start">
										<SearchIcon />
									</InputAdornment>
								),
								endAdornment: keyword ? (
									<InputAdornment position="end">
										<IconButton
											size="small"
											edge="end"
											onClick={() => setKeyword("")}
										>
											<CloseIcon fontSize="small" />
										</IconButton>
									</InputAdornment>
								) : null,
							},
						}}
					/>
					<Button
						variant={filterOpen ? "contained" : "outlined"}
						onClick={() => setFilterOpen(!filterOpen)}
						startIcon={
							<Badge badgeContent={activeFilterCount} color="error">
								<FilterListIcon />
							</Badge>
						}
						endIcon={<FilterToggleIcon open={filterOpen} />}
						sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
					>
						Bộ lọc
					</Button>
				</Stack>

				{/* Recent searches */}
				{searchHistory.length > 0 && (
					<Stack
						direction="row"
						spacing={1}
						alignItems="center"
						useFlexGap
						flexWrap="wrap"
					>
						<Typography
							variant="body2"
							color="text.secondary"
							sx={{ flexShrink: 0 }}
						>
							Tìm gần đây:
						</Typography>
						{searchHistory.slice(0, 12).map((row) => (
							<Chip
								key={row.id}
								label={row.keyword}
								size="small"
								icon={<SearchIcon />}
								onClick={() => setKeyword(row.keyword)}
								onDelete={() => onDeleteSearchHistoryItem(row.id)}
							/>
						))}
						<Chip
							label="Xóa tất cả"
							size="small"
							color="error"
							onClick={onDeleteSearchHistoryAll}
						/>
					</Stack>
				)}
			</Stack>

			{/* Collapsible filter panel */}
			<MovieFilterPanel
				open={filterOpen}
				filter={listFilter}
				genres={genres}
				countries={countries}
				onChange={onFilterChange}
				onApply={onApplyFilter}
				onClose={() => setFilterOpen(false)}
				onReset={onResetFilter}
			/>

			{/* Active filter chips */}
			{!filterOpen && activeFilterChips.length > 0 && (
				<Stack
					direction="row"
					spacing={0.75}
					flexWrap="wrap"
					useFlexGap
					alignItems="center"
					sx={{ mb: 1.5 }}
				>
					{activeFilterChips.map((chip) => (
						<Chip
							key={chip.key}
							label={chip.label}
							size="small"
							color="primary"
							variant="outlined"
							onDelete={chip.onDelete}
						/>
					))}
				</Stack>
			)}

			{/* Results */}
			{hasSearch ? (
				<>
					<SectionHeader
						title="Kết quả tìm kiếm"
						subtitle={`Từ khóa: "${searchKeyword}"`}
					/>
					{search.loading && !search.movies.length ? (
						<LinearProgress />
					) : !search.movies.length && !search.loading && !filterOpen ? (
						<MovieNoResultLanding keyword={searchKeyword} />
					) : (
						<MovieGrid
							movies={search.movies}
							likedSlugs={likedSlugs}
							imageMode={imageMode}
							watchProgressMap={watchProgressMap}
							onSelect={onSelect}
							onLike={onLike}
							onPlay={onPlay}
							onFilter={onFilter}
							onLoadMore={onLoadMoreSearch}
							canLoadMore={search.page < search.totalPages}
							loadingMore={search.loading}
							loadMoreError={search.error}
							scrollRoot={scrollContainer}
							page={search.page}
							totalPages={search.totalPages}
							onPageChange={onPageChangeSearch}
						/>
					)}
				</>
			) : activeFilterCount === 0 && !filterOpen ? (
				<MovieSearchLanding />
			) : list.error && !list.movies.length && !list.loading ? (
				<Stack alignItems="center" spacing={1} sx={{ py: 4 }}>
					<Typography color="error" variant="body2">
						Không tải được danh sách phim.
					</Typography>
					<Button
						variant="outlined"
						startIcon={<RefreshIcon />}
						onClick={onRetryList}
					>
						Thử lại
					</Button>
				</Stack>
			) : !list.loading && !list.movies.length && !filterOpen ? (
				<MovieNoResultLanding />
			) : (
				<MovieGrid
					movies={list.movies}
					loading={list.loading && !list.movies.length}
					likedSlugs={likedSlugs}
					imageMode={imageMode}
					watchProgressMap={watchProgressMap}
					onSelect={onSelect}
					onLike={onLike}
					onPlay={onPlay}
					onFilter={onFilter}
					onLoadMore={onLoadMoreList}
					canLoadMore={list.page < list.totalPages}
					loadingMore={list.loading}
					loadMoreError={list.error}
					scrollRoot={scrollContainer}
					page={list.page}
					totalPages={list.totalPages}
					onPageChange={onPageChangeList}
				/>
			)}
		</Box>
	);
}
