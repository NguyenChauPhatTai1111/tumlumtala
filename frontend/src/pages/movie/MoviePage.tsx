import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import {
	Box,
	Fab,
	Stack,
	Tooltip,
} from "@mui/material";
import { getMovieDetail } from "@/services/movieService";
import { MovieDetailDialog } from "./components/detail/MovieDetailDialog";
import { MovieBottomNav } from "./components/layout/MovieBottomNav";
import { MovieFooter } from "./components/layout/MovieFooter";
import { MovieTopBar } from "./components/layout/MovieTopBar";
import { VideoPlayerDialog } from "./components/player/VideoPlayerDialog";
import { MovieHistoryTab } from "./components/tabs/MovieHistoryTab";
import { MovieHomeTab } from "./components/tabs/MovieHomeTab";
import { MovieLikedTab } from "./components/tabs/MovieLikedTab";
import { MovieSearchTab } from "./components/tabs/MovieSearchTab";
import { DEFAULT_FILTER_STATE } from "./constants";
import {
	useBulkDeleteSearchHistoryMutation,
	useBulkDeleteWatchHistoryMutation,
	useDeleteSearchHistoryItemMutation,
} from "./hooks/useMovieData";
import { useMoviePageHandlers } from "./hooks/useMoviePageHandlers";
import { useMoviePageState } from "./hooks/useMoviePageState";
import { usePlaybackState } from "./hooks/usePlaybackState";
import type { OphimMovieItem } from "./types";
import { mapContentRating } from "./utils";

export default function MoviePage({
	mode,
	setMode,
}: {
	mode: "light" | "dark";
	setMode: (v: "light" | "dark") => void;
}) {
	const state = useMoviePageState();
	const {
		tab,
		setTab,
		keyword,
		setKeyword,
		searchKeyword,
		hasSearch,
		selectedMovie,
		setSelectedMovie,
		autoPlayOnOpen,
		setAutoPlayOnOpen,
		listFilter,
		setListFilter,
		committedFilter,
		setCommittedFilter,
		listFilterRef,
		filterOpen,
		setFilterOpen,
		imageMode,
		setImageMode,
		scrollContainer,
		setScrollContainer,
		showBackToTop,
		ratingCacheRef,
		searchHistoryQuery,
		likedQuery,
		watchHistoryQuery,
		genresQuery,
		countriesQuery,
		likedSlugs,
		watchProgressMap,
		selectedMovieEpisodeProgressMap,
		latest,
		list,
		search,
		liked,
		history,
		likeMutation,
		recordWatchMutation,
		deleteHistoryMutation,
		activeFilterCount,
		isLandingVisible,
		sliderMovies,
		gridMovies,
		listLabel,
		activeFilterChips,
		handleBrowseGenre,
		handleBrowseCountry,
		handleBrowseYear,
	} = state;

	const deleteSearchHistoryItemMutation = useDeleteSearchHistoryItemMutation();
	const bulkDeleteSearchHistoryMutation = useBulkDeleteSearchHistoryMutation();
	const bulkDeleteWatchHistoryMutation = useBulkDeleteWatchHistoryMutation(
		history.clearMovies,
	);

	const playback = usePlaybackState(
		ratingCacheRef,
		watchHistoryQuery.data as
			| Array<{
					slug: string;
					episode_slug: string | null;
					last_watched_position: number;
					duration: number;
			  }>
			| undefined,
		recordWatchMutation.mutate,
	);
	const {
		playingTitle,
		playingEmbed,
		playingM3u8,
		playingRawM3u8,
		playingMovie,
		playingDetail,
		playingEpSlug,
		playingLastPosition,
		episodeProgressMap,
		handlePlayEpisode,
		handlePlayTMDBEpisode,
		closePlayer,
	} = playback;

	const handlers = useMoviePageHandlers({
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
		likeMutate: likeMutation.mutate,
		removeLikedSlug: liked.removeSlug,
		setSelectedMovie,
		setAutoPlayOnOpen,
		scrollContainer,
		latest,
		list,
		search,
		liked,
		history,
		committedFilter,
	});
	const {
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
	} = handlers;

	const handleHeroPlay = async (movie: OphimMovieItem) => {
		try {
			const { movie: detail, episodes } = await getMovieDetail(movie.slug);
			const server = episodes?.find((s) =>
				s.server_data.some((ep) => ep.link_m3u8 || ep.link_embed),
			);
			const ep = server?.server_data.find((e) => e.link_m3u8 || e.link_embed);
			if (server && ep && detail) {
				handlePlayEpisode(
					movie,
					{ ...detail, episodes: episodes ?? [] },
					server,
					ep,
				);
			} else {
				handleSelectMovie(movie);
			}
		} catch {
			handleSelectMovie(movie);
		}
	};

	return (
		<Box
			sx={{
				position: "relative",
				height: "100%",
				minHeight: 0,
				display: "flex",
				flexDirection: "column",
			}}
		>
			{/* ── Top bar ── */}
			<MovieTopBar
				tab={tab}
				setTab={setTab}
				keyword={keyword}
				setKeyword={setKeyword}
				onApplyFilter={handleApplyFilter}
				imageMode={imageMode}
				setImageMode={setImageMode}
				likedCount={likedQuery.data?.length}
				mode={mode}
				setMode={setMode}
				scrolled={showBackToTop}
			/>

			{/* ── Scrollable content ── */}
			<Box
				ref={setScrollContainer}
				sx={{
					flex: 1,
					minHeight: 0,
					overflow: isLandingVisible ? "hidden" : "auto",
					display: "flex",
					flexDirection: "column",
				}}
			>
				<Box
					sx={{
						width: "100%",
						px: { xs: 1, sm: 1.5, md: 2 },
						pb: isLandingVisible ? 0 : { xs: "96px", md: 0 },
						flex: 1,
						minHeight: 0,
						display: "flex",
						flexDirection: "column",
						...(isLandingVisible && {
							minHeight: 0,
						}),
					}}
				>
					<Stack
						spacing={isLandingVisible ? 0 : 2}
						sx={isLandingVisible ? { flex: 1, minHeight: 0 } : { flex: 1 }}
					>
						{tab === "home" && (
							<MovieHomeTab
								sliderMovies={sliderMovies}
								gridMovies={gridMovies}
								latest={latest}
								likedSlugs={likedSlugs}
								imageMode={imageMode}
								watchProgressMap={watchProgressMap}
								scrollContainer={scrollContainer}
								onSelect={handleSelectMovie}
								onPlayMovie={(m) => void handleHeroPlay(m)}
								onLike={handleLikeMovie}
								onPlay={handlePlayEpisode}
								onFilter={handleFilterFromPopup}
								onLoadMore={handleLoadMoreLatest}
								onPageChange={handlePageChangeLatest}
							/>
						)}

						{tab === "search" && (
							<MovieSearchTab
								keyword={keyword}
								setKeyword={setKeyword}
								searchKeyword={searchKeyword}
								hasSearch={hasSearch}
								listFilter={listFilter}
								filterOpen={filterOpen}
								setFilterOpen={setFilterOpen}
								activeFilterCount={activeFilterCount}
								activeFilterChips={activeFilterChips}
								listLabel={listLabel}
								genres={genresQuery.data ?? []}
								countries={countriesQuery.data ?? []}
								searchHistory={searchHistoryQuery.data ?? []}
								onDeleteSearchHistoryItem={(id) =>
									deleteSearchHistoryItemMutation.mutate(id)
								}
								onDeleteSearchHistoryAll={() =>
									bulkDeleteSearchHistoryMutation.mutate()
								}
								search={search}
								list={list}
								likedSlugs={likedSlugs}
								imageMode={imageMode}
								watchProgressMap={watchProgressMap}
								scrollContainer={scrollContainer}
								onSelect={handleSelectMovie}
								onLike={handleLikeMovie}
								onPlay={handlePlayEpisode}
								onFilter={handleFilterFromPopup}
								onFilterChange={handleFilterChange}
								onApplyFilter={handleApplyFilter}
								onResetFilter={() => {
									setListFilter(DEFAULT_FILTER_STATE);
									setCommittedFilter(null);
								}}
								onLoadMoreSearch={handleLoadMoreSearch}
								onLoadMoreList={handleLoadMoreList}
								onPageChangeSearch={handlePageChangeSearch}
								onPageChangeList={handlePageChangeList}
								onRetryList={handleRetryList}
							/>
						)}

						{tab === "liked" && (
							<MovieLikedTab
								liked={liked}
								likedSlugs={likedSlugs}
								imageMode={imageMode}
								watchProgressMap={watchProgressMap}
								scrollContainer={scrollContainer}
								onSelect={handleSelectMovie}
								onLike={handleLikeMovie}
								onPlay={handlePlayEpisode}
								onLoadMore={handleLoadMoreLiked}
								onPageChange={handlePageChangeLiked}
							/>
						)}

						{tab === "history" && (
							<MovieHistoryTab
								history={history}
								likedSlugs={likedSlugs}
								imageMode={imageMode}
								scrollContainer={scrollContainer}
								onSelect={handleSelectMovie}
								onLike={handleLikeMovie}
								onPlay={handlePlayEpisode}
								onDeleteHistory={(slug) => deleteHistoryMutation.mutate(slug)}
								onDeleteHistoryAll={() =>
									bulkDeleteWatchHistoryMutation.mutate()
								}
								onLoadMore={handleLoadMoreHistory}
								onPageChange={handlePageChangeHistory}
							/>
						)}
					</Stack>

					{/* ── Footer — desktop only, hidden during landing ── */}
					{!isLandingVisible && (
						<Box
							sx={{
								display: { xs: "none", sm: "block" },
								mx: { xs: -1, sm: -1.5, md: -2 },
								mt: { sm: 4, md: 6 },
							}}
						>
							<MovieFooter />
						</Box>
					)}
				</Box>
			</Box>

			{/* ── Mobile bottom nav ── */}
			<MovieBottomNav tab={tab} setTab={setTab} />

			{/* ── Back to top ── */}
			{showBackToTop && (
				<Tooltip title="Về đầu trang">
					<Fab
						size="small"
						color="primary"
						onClick={() =>
							scrollContainer?.scrollTo({ top: 0, behavior: "smooth" })
						}
						sx={{
							position: "absolute",
							bottom: { xs: 90, md: 16 },
							right: 16,
							zIndex: 10,
						}}
					>
						<KeyboardArrowUpIcon />
					</Fab>
				</Tooltip>
			)}

			{/* ── Movie detail dialog ── */}
			<MovieDetailDialog
				movie={
					selectedMovie
						? {
								...selectedMovie,
								watchProgress:
									selectedMovie.watchProgress ??
									watchProgressMap.get(selectedMovie.slug),
							}
						: null
				}
				liked={selectedMovie ? likedSlugs.has(selectedMovie.slug) : false}
				autoPlay={autoPlayOnOpen}
				onClose={handleCloseDetail}
				onPlayEpisode={handlePlayEpisode}
				onLike={(rating) =>
					selectedMovie && handleLikeMovie(selectedMovie, rating)
				}
				onRatingResolved={(slug, rating) =>
					ratingCacheRef.current.set(slug, rating)
				}
				onBrowseGenre={handleBrowseGenre}
				onBrowseCountry={handleBrowseCountry}
				onBrowseYear={handleBrowseYear}
				onShowInfo={handleShowInfo}
				onPlayAndOpen={handlePlayAndOpen}
				episodeProgressMap={selectedMovieEpisodeProgressMap}
				watchHistoryData={
					watchHistoryQuery.data as
						| Array<{
								slug: string;
								episode_slug: string | null;
								last_watched_position: number;
								duration: number;
						  }>
						| undefined
				}
			/>

			{/* ── Video player ── */}
			<VideoPlayerDialog
				open={Boolean(playingEmbed || playingM3u8)}
				title={playingTitle}
				embedUrl={playingEmbed}
				m3u8Url={playingM3u8}
				rawM3u8Url={playingRawM3u8}
				onClose={closePlayer}
				episodes={playingDetail?.episodes}
				currentEpSlug={playingEpSlug}
				onPlayEpisode={(server, ep) => {
					if (!playingMovie || !playingDetail) return;
					handlePlayEpisode(playingMovie, playingDetail, server, ep);
				}}
				onPlayTMDBEpisode={(server, ep, seasonSlug, tmdbEpName) => {
					void handlePlayTMDBEpisode(server, ep, seasonSlug, tmdbEpName);
				}}
				movieSlug={playingMovie?.slug}
				lastWatchedPosition={playingLastPosition}
				ageRating={
					playingMovie?.rated ??
					(playingMovie?.slug
						? ratingCacheRef.current.get(playingMovie.slug)
						: undefined) ??
					mapContentRating(playingDetail?.rated) ??
					undefined
				}
				categories={
					(playingDetail?.category?.length ? playingDetail.category : null) ??
					(playingMovie?.category?.length ? playingMovie.category : null) ??
					[]
				}
				tmdb={playingDetail?.tmdb ?? playingMovie?.tmdb}
				episodeProgressMap={episodeProgressMap}
			/>
		</Box>
	);
}
