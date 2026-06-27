import AlbumIcon from "@mui/icons-material/Album";
import HomeIcon from "@mui/icons-material/Home";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import LibraryMusicIcon from "@mui/icons-material/LibraryMusic";
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import QueueMusicIcon from "@mui/icons-material/QueueMusic";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import SmartDisplayIcon from "@mui/icons-material/SmartDisplay";
import {
	Box,
	Button,
	Chip,
	Divider,
	Fab,
	InputAdornment,
	LinearProgress,
	Paper,
	Stack,
	Tab,
	Tabs,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { saveMusicSearchKeyword } from "@services/musicBackendService";
import { toAudioMediaItem, toVideoMediaItem } from "@services/musicService";
import { usePlayerStore } from "@store/playerStore";
import { ArtistsPanel } from "./components/ArtistsPanel";
import { EmptyState } from "./components/EmptyState";
import { IntersectionSentinel } from "./components/IntersectionSentinel";
import { MediaRow } from "./components/MediaRow";
import { PlaylistGrid } from "./components/PlaylistGrid";
import { PlaylistTracksDialog } from "./components/PlaylistTracksDialog";
import { SectionHeader } from "./components/SectionHeader";
import { TrackList } from "./components/TrackList";
import { LOAD_MORE_TRIGGER_INDEX } from "./constants";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import {
	useAddToPlaylistMutation,
	useArtistsQuery,
	useArtistTracksQuery,
	useBackendLikedQuery,
	useBackendPlaylistsQuery,
	useBackendRecentQuery,
	useBackendSearchHistoryQuery,
	useCreatePlaylistMutation,
	usePlaylistsQuery,
	usePlaylistTracksQuery,
	useTracksQuery,
	useTrendingQuery,
	useVideosQuery,
} from "./hooks/useMusicQueries";
import type { AudiusPlaylist, AudiusUser } from "./types";
import { formatDisplayName, formatDuration } from "./utils";

type MusicTab = "home" | "search" | "artists" | "playlists" | "library";

export default function MusicPage() {
	const [tab, setTab] = useState<MusicTab>("home");
	const [keyword, setKeyword] = useState("");
	const debouncedKeyword = useDebouncedValue(keyword, 650);
	const searchKeyword = debouncedKeyword.trim();
	const hasSearchKeyword = searchKeyword.length >= 2;

	const [playlistName, setPlaylistName] = useState("");
	const [selectedArtist, setSelectedArtist] = useState<AudiusUser | null>(null);
	const [selectedPlaylist, setSelectedPlaylist] =
		useState<AudiusPlaylist | null>(null);
	const [queueExpanded, setQueueExpanded] = useState(false);
	const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(
		null,
	);
	const [showBackToTop, setShowBackToTop] = useState(false);

	const lastRecordedItemRef = useRef<string | null>(null);
	const lastSavedKeywordRef = useRef<string | null>(null);
	const queryClient = useQueryClient();

	const {
		queue,
		currentItem,
		recentItems,
		likedItems,
		play,
		clearQueue,
		hydrateLibrary,
	} = usePlayerStore();
	const hasYouTubeKey = Boolean(import.meta.env.VITE_YOUTUBE_API_KEY);

	// Queries
	const trendingQuery = useTrendingQuery();
	const tracksQuery = useTracksQuery(
		searchKeyword,
		tab === "search" && hasSearchKeyword,
	);
	const videosQuery = useVideosQuery(
		searchKeyword,
		tab === "search" && hasSearchKeyword && hasYouTubeKey,
	);
	const artistsQuery = useArtistsQuery(
		searchKeyword,
		tab === "artists" && hasSearchKeyword,
	);
	const playlistsQuery = usePlaylistsQuery(
		searchKeyword,
		tab === "playlists" && hasSearchKeyword,
	);
	const playlistTracksQuery = usePlaylistTracksQuery(selectedPlaylist?.id);
	const artistTracksQuery = useArtistTracksQuery(selectedArtist?.id);
	const backendLikedQuery = useBackendLikedQuery();
	const backendRecentQuery = useBackendRecentQuery();
	const backendSearchHistoryQuery = useBackendSearchHistoryQuery();
	const backendPlaylistsQuery = useBackendPlaylistsQuery();

	// Mutations
	const createPlaylistMutation = useCreatePlaylistMutation(() =>
		setPlaylistName(""),
	);
	const addToPlaylistMutation = useAddToPlaylistMutation();

	// Hydrate library from backend
	useEffect(() => {
		hydrateLibrary(backendLikedQuery.data ?? [], backendRecentQuery.data ?? []);
	}, [backendLikedQuery.data, backendRecentQuery.data, hydrateLibrary]);

	// Record playback
	useEffect(() => {
		if (!currentItem || lastRecordedItemRef.current === currentItem.id) return;
		lastRecordedItemRef.current = currentItem.id;
		void import("@services/musicBackendService")
			.then(({ recordMusicPlayback }) => recordMusicPlayback(currentItem))
			.then(() => {
				void queryClient.invalidateQueries({
					queryKey: ["music", "backend", "recent"],
				});
			})
			.catch(() => {
				lastRecordedItemRef.current = null;
			});
	}, [currentItem, queryClient]);

	// Auto-save search keyword
	useEffect(() => {
		if (!hasSearchKeyword || lastSavedKeywordRef.current === searchKeyword)
			return;
		const timer = window.setTimeout(() => {
			lastSavedKeywordRef.current = searchKeyword;
			void saveMusicSearchKeyword(searchKeyword)
				.then(() => {
					void queryClient.invalidateQueries({
						queryKey: ["music", "backend", "search-history"],
					});
				})
				.catch(() => {
					lastSavedKeywordRef.current = null;
				});
		}, 900);
		return () => window.clearTimeout(timer);
	}, [hasSearchKeyword, searchKeyword, queryClient]);

	// Back to top
	useEffect(() => {
		const el = scrollContainer;
		if (!el) return;
		const handleScroll = () => setShowBackToTop(el.scrollTop > 300);
		el.addEventListener("scroll", handleScroll, { passive: true });
		return () => el.removeEventListener("scroll", handleScroll);
	}, [scrollContainer]);

	const searchTrackItems = useMemo(
		() => (tracksQuery.data?.pages.flat() ?? []).map(toAudioMediaItem),
		[tracksQuery.data],
	);
	const searchVideoItems = useMemo(
		() =>
			(videosQuery.data?.pages.flatMap((p) => p.videos) ?? []).map(
				toVideoMediaItem,
			),
		[videosQuery.data],
	);
	const searchQueue = useMemo(
		() => [...searchTrackItems, ...searchVideoItems],
		[searchTrackItems, searchVideoItems],
	);
	const visibleQueue = queueExpanded ? queue : queue.slice(0, 6);
	const hasHiddenQueueItems = queue.length > visibleQueue.length;
	const playlistTracks = useMemo(
		() => playlistTracksQuery.data?.pages.flat() ?? [],
		[playlistTracksQuery.data],
	);

	return (
		<Box
			sx={{
				position: "relative",
				height: "100%",
				minHeight: 0,
				display: "flex",
				flexDirection: "column",
				mx: "auto",
				maxWidth: 1440,
			}}
		>
			<Box
				ref={setScrollContainer}
				sx={{ flex: 1, minHeight: 0, overflow: "auto", pb: 2 }}
			>
				<Stack
					spacing={2}
					sx={{ px: { xs: 1.5, sm: 2 }, pt: { xs: 1, sm: 1.5 } }}
				>
					<Box
						sx={{
							display: "grid",
							gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 360px" },
							gap: 2,
							alignItems: "start",
						}}
					>
						<Box>
							<Typography variant="h4" sx={{ fontWeight: 900, mb: 0.5 }}>
								Tùm lum nhạc
							</Typography>
							<Typography color="text.secondary">
								Nghe full audio từ MP3 và phát video qua YouTube.
							</Typography>
						</Box>
						<TextField
							value={keyword}
							onChange={(event) => setKeyword(event.target.value)}
							onFocus={() => setTab("search")}
							placeholder="Tìm bài hát, nghệ sĩ, playlist, video"
							fullWidth
							InputProps={{
								startAdornment: (
									<InputAdornment position="start">
										<SearchIcon />
									</InputAdornment>
								),
							}}
						/>
					</Box>

					{(backendSearchHistoryQuery.data?.length ?? 0) > 0 && (
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
							{(backendSearchHistoryQuery.data ?? [])
								.slice(0, 12)
								.map((row) => (
									<Chip
										key={row.id}
										label={row.keyword}
										size="small"
										icon={<SearchIcon />}
										onClick={() => {
											setKeyword(row.keyword);
											setTab("search");
										}}
									/>
								))}
						</Stack>
					)}

					<Paper variant="outlined" sx={{ p: 1.5 }}>
						<Stack
							direction="row"
							alignItems="center"
							justifyContent="space-between"
							spacing={1}
						>
							<Stack direction="row" spacing={1} alignItems="center">
								<QueueMusicIcon color="primary" />
								<Typography sx={{ fontWeight: 800 }}>
									Playlist: {queue.length}
								</Typography>
							</Stack>
							<Button
								size="medium"
								onClick={() => {
									setQueueExpanded(false);
									clearQueue();
								}}
								disabled={!queue.length}
							>
								Xóa
							</Button>
						</Stack>
						<Divider sx={{ my: 1 }} />
						<Stack spacing={0.75}>
							{visibleQueue.map((item) => (
								<Button
									key={item.id}
									size="medium"
									onClick={() => play(item, queue)}
									startIcon={
										item.type === "audio" ? <AlbumIcon /> : <SmartDisplayIcon />
									}
									sx={{
										justifyContent: "flex-start",
										textAlign: "left",
										color:
											currentItem?.id === item.id
												? "primary.main"
												: "text.primary",
										minWidth: 0,
										width: "100%",
									}}
								>
									<Stack
										direction="row"
										alignItems="center"
										justifyContent="space-between"
										sx={{ width: "100%", minWidth: 0 }}
									>
										<Typography
											noWrap
											variant="body2"
											sx={{ minWidth: 0, flex: 1 }}
										>
											{formatDisplayName(item.title)}
										</Typography>
										<Typography
											variant="caption"
											color="text.secondary"
											sx={{ ml: 1, flexShrink: 0 }}
										>
											{formatDuration(item.duration)}
										</Typography>
									</Stack>
								</Button>
							))}
							{hasHiddenQueueItems && (
								<Button
									size="small"
									variant="outlined"
									onClick={() => setQueueExpanded(true)}
									sx={{ alignSelf: "flex-start" }}
								>
									Xem thêm {queue.length - visibleQueue.length} bài
								</Button>
							)}
							{queueExpanded && queue.length > 6 && (
								<Button
									size="small"
									onClick={() => setQueueExpanded(false)}
									sx={{ alignSelf: "flex-start" }}
								>
									Thu gọn
								</Button>
							)}
							{!queue.length && (
								<Typography color="text.secondary" variant="body2">
									Playlist sẽ được tạo khi bạn phát một kết quả.
								</Typography>
							)}
						</Stack>
					</Paper>

					<Tabs
						value={tab}
						onChange={(_, value: MusicTab) => setTab(value)}
						variant="scrollable"
						scrollButtons="auto"
					>
						<Tab
							value="home"
							icon={<HomeIcon />}
							iconPosition="start"
							label="Home"
						/>
						<Tab
							value="search"
							icon={<SearchIcon />}
							iconPosition="start"
							label="Search"
						/>
						<Tab
							value="artists"
							icon={<AlbumIcon />}
							iconPosition="start"
							label="Artists"
						/>
						<Tab
							value="playlists"
							icon={<PlaylistPlayIcon />}
							iconPosition="start"
							label="Playlists"
						/>
						<Tab
							value="library"
							icon={<LibraryMusicIcon />}
							iconPosition="start"
							label="Library"
						/>
					</Tabs>

					{tab === "home" && (
						<Box>
							<SectionHeader
								title="Trending"
								subtitle="Những bài nhạc đang hot"
							/>
							{trendingQuery.isLoading ? (
								<LinearProgress />
							) : (
								<TrackList tracks={trendingQuery.data ?? []} />
							)}
						</Box>
					)}

					{tab === "search" && (
						<Box
							sx={{
								display: "grid",
								gridTemplateColumns: { xs: "1fr", xl: "1fr 1fr" },
								gap: 2,
							}}
						>
							<Box>
								<SectionHeader
									title="Songs"
									subtitle="Search + stream URL trực tiếp cho audio."
								/>
								{tracksQuery.isFetching && !searchTrackItems.length ? (
									<LinearProgress />
								) : !searchTrackItems.length ? (
									<Paper
										variant="outlined"
										sx={{ p: 3, textAlign: "center", borderStyle: "dashed" }}
									>
										<Typography color="text.secondary" sx={{ mb: 1 }}>
											{hasSearchKeyword
												? "Chưa có bài hát phù hợp."
												: "Nhập từ khóa để tìm bài hát."}
										</Typography>
										{hasSearchKeyword && (
											<Button
												size="small"
												startIcon={<RefreshIcon />}
												onClick={() => void tracksQuery.refetch()}
											>
												Thử lại
											</Button>
										)}
									</Paper>
								) : (
									<Stack spacing={1}>
										{searchTrackItems.map((item, index) => (
											<Fragment key={item.id}>
												<MediaRow item={item} queue={searchQueue} />
												{index === LOAD_MORE_TRIGGER_INDEX &&
													tracksQuery.hasNextPage &&
													!tracksQuery.isFetchingNextPage && (
														<IntersectionSentinel
															onVisible={() => void tracksQuery.fetchNextPage()}
															root={scrollContainer}
														/>
													)}
											</Fragment>
										))}
										{tracksQuery.isFetchingNextPage && <LinearProgress />}
										{tracksQuery.hasNextPage &&
											!tracksQuery.isFetchingNextPage && (
												<Button
													size="medium"
													variant="outlined"
													fullWidth
													onClick={() => void tracksQuery.fetchNextPage()}
												>
													Tải thêm bài hát
												</Button>
											)}
										{!tracksQuery.hasNextPage &&
											(tracksQuery.data?.pages.length ?? 0) > 1 && (
												<Typography
													variant="body2"
													color="text.secondary"
													textAlign="center"
													sx={{ py: 1 }}
												>
													Bạn đã xem hết toàn bộ kết quả
												</Typography>
											)}
									</Stack>
								)}
							</Box>
							<Box>
								<SectionHeader title="Videos" subtitle="YouTube video" />
								{videosQuery.isFetching && !searchVideoItems.length ? (
									<LinearProgress />
								) : !searchVideoItems.length ? (
									<Paper
										variant="outlined"
										sx={{ p: 3, textAlign: "center", borderStyle: "dashed" }}
									>
										<Typography color="text.secondary" sx={{ mb: 1 }}>
											{hasSearchKeyword
												? "Chưa có video YouTube."
												: "Nhập từ khóa để tìm video YouTube."}
										</Typography>
										{hasSearchKeyword && hasYouTubeKey && (
											<Button
												size="small"
												startIcon={<RefreshIcon />}
												onClick={() => void videosQuery.refetch()}
											>
												Thử lại
											</Button>
										)}
									</Paper>
								) : (
									<Stack spacing={1}>
										{searchVideoItems.map((item, index) => (
											<Fragment key={item.id}>
												<MediaRow item={item} queue={searchQueue} />
												{index === LOAD_MORE_TRIGGER_INDEX &&
													videosQuery.hasNextPage &&
													!videosQuery.isFetchingNextPage && (
														<IntersectionSentinel
															onVisible={() => void videosQuery.fetchNextPage()}
															root={scrollContainer}
														/>
													)}
											</Fragment>
										))}
										{videosQuery.isFetchingNextPage && <LinearProgress />}
										{videosQuery.hasNextPage &&
											!videosQuery.isFetchingNextPage && (
												<Button
													size="medium"
													variant="outlined"
													fullWidth
													onClick={() => void videosQuery.fetchNextPage()}
												>
													Tải thêm video
												</Button>
											)}
										{!videosQuery.hasNextPage &&
											(videosQuery.data?.pages.length ?? 0) > 1 && (
												<Typography
													variant="body2"
													color="text.secondary"
													textAlign="center"
													sx={{ py: 1 }}
												>
													Bạn đã xem hết toàn bộ kết quả
												</Typography>
											)}
									</Stack>
								)}
							</Box>
						</Box>
					)}

					{tab === "artists" && (
						<ArtistsPanel
							artists={artistsQuery.data ?? []}
							selectedArtist={selectedArtist}
							onSelectArtist={setSelectedArtist}
							artistTracks={artistTracksQuery.data ?? []}
						/>
					)}

					{tab === "playlists" && (
						<Box>
							<SectionHeader
								title="Playlists"
								subtitle="Tìm playlist từ MP3, sẵn sàng nối detail flow."
							/>
							<PlaylistGrid
								playlists={playlistsQuery.data ?? []}
								onSelectPlaylist={setSelectedPlaylist}
							/>
						</Box>
					)}

					{tab === "library" && (
						<Box
							sx={{
								display: "grid",
								gridTemplateColumns: { xs: "1fr", xl: "1fr 1fr" },
								gap: 2,
							}}
						>
							<Box>
								<SectionHeader
									title="Liked Songs"
									subtitle="Persist qua backend."
								/>
								{likedItems.length ? (
									<Stack spacing={1}>
										{likedItems.map((item) => (
											<MediaRow key={item.id} item={item} queue={likedItems} />
										))}
									</Stack>
								) : (
									<EmptyState label="Chưa có bài hát hoặc video đã thích." />
								)}
							</Box>
							<Box>
								<SectionHeader
									title="Recently Played"
									subtitle="Persist qua backend."
								/>
								{recentItems.length ? (
									<Stack spacing={1}>
										{recentItems.map((item) => (
											<MediaRow key={item.id} item={item} queue={recentItems} />
										))}
									</Stack>
								) : (
									<EmptyState label="Bạn chưa phát nội dung nào." />
								)}
							</Box>
							<Box sx={{ gridColumn: { xl: "1 / -1" } }}>
								<SectionHeader
									title="Playlists cá nhân"
									subtitle="Backend lưu playlist và tracks theo user."
								/>
								<Stack
									direction={{ xs: "column", sm: "row" }}
									spacing={1}
									sx={{ mb: 1.5 }}
								>
									<TextField
										value={playlistName}
										onChange={(event) => setPlaylistName(event.target.value)}
										placeholder="Tên playlist mới"
										size="small"
										fullWidth
									/>
									<Button
										variant="contained"
										onClick={() =>
											createPlaylistMutation.mutate(playlistName.trim())
										}
										disabled={
											!playlistName.trim() || createPlaylistMutation.isPending
										}
										sx={{ minWidth: 130 }}
									>
										Tạo playlist
									</Button>
								</Stack>
								<Box
									sx={{
										display: "grid",
										gridTemplateColumns:
											"repeat(auto-fill, minmax(220px, 1fr))",
										gap: 1.5,
									}}
								>
									{(backendPlaylistsQuery.data ?? []).map((playlist) => (
										<Paper
											key={playlist.id}
											variant="outlined"
											sx={{ p: 1.25 }}
										>
											<Typography noWrap sx={{ fontWeight: 800 }}>
												{formatDisplayName(playlist.name)}
											</Typography>
											<Typography
												variant="body2"
												color="text.secondary"
												sx={{ mb: 1 }}
											>
												{playlist.tracks?.length ?? 0} bài/video
											</Typography>
											<Button
												size="small"
												startIcon={<PlaylistPlayIcon />}
												disabled={
													!currentItem || addToPlaylistMutation.isPending
												}
												onClick={() => {
													if (!currentItem) return;
													addToPlaylistMutation.mutate({
														playlistId: playlist.id,
														item: currentItem,
													});
												}}
											>
												Thêm đang phát
											</Button>
											<Stack spacing={0.5} sx={{ mt: 1 }}>
												{playlist.tracks?.slice(0, 4).map((track) => (
													<Typography key={track.id} noWrap variant="body2">
														{formatDisplayName(track.media_item.title)}
													</Typography>
												))}
											</Stack>
										</Paper>
									))}
								</Box>
								{!backendPlaylistsQuery.data?.length && (
									<EmptyState label="Chưa có playlist cá nhân." />
								)}
							</Box>
						</Box>
					)}
				</Stack>
			</Box>

			{showBackToTop && (
				<Tooltip title="Về đầu trang">
					<Fab
						size="small"
						color="primary"
						onClick={() =>
							scrollContainer?.scrollTo({ top: 0, behavior: "smooth" })
						}
						sx={{ position: "absolute", bottom: 80, right: 16, zIndex: 10 }}
					>
						<KeyboardArrowUpIcon />
					</Fab>
				</Tooltip>
			)}

			<PlaylistTracksDialog
				playlist={selectedPlaylist}
				tracks={playlistTracks}
				loading={playlistTracksQuery.isFetching}
				hasNextPage={Boolean(playlistTracksQuery.hasNextPage)}
				isFetchingNextPage={playlistTracksQuery.isFetchingNextPage}
				pageCount={playlistTracksQuery.data?.pages.length ?? 0}
				onLoadMore={() => void playlistTracksQuery.fetchNextPage()}
				onClose={() => setSelectedPlaylist(null)}
			/>
		</Box>
	);
}
