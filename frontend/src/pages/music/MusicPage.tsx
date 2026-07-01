import AlbumIcon from "@mui/icons-material/Album";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import FavoriteIcon from "@mui/icons-material/Favorite";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import HomeIcon from "@mui/icons-material/Home";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LibraryMusicIcon from "@mui/icons-material/LibraryMusic";
import LyricsOutlinedIcon from "@mui/icons-material/LyricsOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import PersonIcon from "@mui/icons-material/Person";
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import QueueMusicIcon from "@mui/icons-material/QueueMusic";
import SearchIcon from "@mui/icons-material/Search";
import {
    alpha,
    Box,
    Drawer,
    IconButton,
    InputAdornment,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    getSpotifyAlbum,
    getSpotifyArtist,
    getSpotifyPlaylist,
    saveMusicSearchKeyword,
} from "@services/musicBackendService";
import type {
    SpotifyAlbumDetail,
    SpotifyArtistResponse,
    SpotifyCollectionSummary,
} from "@services/musicBackendService";
import {
    getPlaylist,
    getUser,
    toAudioMediaItem,
} from "@services/musicService";
import { usePlayerStore } from "@store/playerStore";
import { useThemeMode } from "@store/themeStore";
import { ArtistsPanel } from "./components/ArtistsPanel";
import { AIStudioView } from "./components/AIStudioView";
import { LeaderboardView } from "./components/LeaderboardView";
import { LibraryView } from "./components/LibraryView";
import { ListeningStatsView } from "./components/ListeningStatsView";
import { PlaylistGrid } from "./components/PlaylistGrid";
import { UserProfileView } from "./components/UserProfileView";
import { PlaylistTracksDialog } from "./components/PlaylistTracksDialog";
import { LyricsPanelContent, TrackInfoPanelContent } from "./components/TrackInfoDialog";
import { MediaRow } from "./components/MediaRow";
import { QueuePanelContent } from "./components/QueuePanel";
import { MusicSidebar } from "./components/MusicSidebar";
import { HomeView } from "./views/HomeView";
import { SearchView } from "./views/SearchView";
import { MyPlaylistsView } from "./views/MyPlaylistsView";
import { LikedSongsView } from "./views/LikedSongsView";
import { SpotifyArtistView } from "./views/SpotifyArtistView";
import { SpotifyAlbumView } from "./views/SpotifyAlbumView";
import { SpotifyPlaylistDialog } from "./views/SpotifyPlaylistDialog";
import {
    MUSIC_CHROME_SURFACE_SX,
    MUSIC_MENU_BACKGROUND_SX,
    QUEUE_W,
    LYRICS_W,
    TRACK_INFO_W,
    SIDEBAR_W,
    SIDEBAR_COLLAPSED_W,
    SP_GREEN,
} from "./constants";
import { MusicContext } from "./MusicContext";
import type { MusicView } from "./MusicContext";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import { useSmartQueueAutofill } from "./hooks/useSmartQueueAutofill";
import {
    useArtistAlbumsQuery,
    useArtistPlaylistsQuery,
    useArtistRadioQuery,
    useArtistsQuery,
    useArtistTracksQuery,
    useBackendLikedQuery,
    useBackendPlaylistsQuery,
    useBackendRecentQuery,
    useLyricsQuery,
    usePlaylistsQuery,
    usePlaylistTracksQuery,
    useRecommendationsQuery,
    useTrendingArtistsQuery,
    useTrendingPlaylistsQuery,
    useTrendingQuery,
    useSpotifyPlaylistTracksQuery,
} from "./hooks/useMusicQueries";
import type { AudiusPlaylist, AudiusUser, MediaItem } from "./types";

export default function MusicPage() {
    useSmartQueueAutofill();
    const { mode, toggleMode } = useThemeMode();
    const [view, setView] = useState<MusicView>("home");
    const [keyword, setKeyword] = useState("");
    const [showQueue, setShowQueue] = useState(false);
    const [showLyrics, setShowLyrics] = useState(false);
    const [showTrackInfo, setShowTrackInfo] = useState(false);
    const [selectedArtist, setSelectedArtist] = useState<AudiusUser | null>(null);
    const [selectedSpotifyArtist, setSelectedSpotifyArtist] = useState<SpotifyArtistResponse | null>(null);
    const [selectedSpotifyAlbum, setSelectedSpotifyAlbum] = useState<SpotifyAlbumDetail | null>(null);
    const [selectedSpotifyPlaylist, setSelectedSpotifyPlaylist] = useState<SpotifyCollectionSummary | null>(null);
    const [selectedPlaylist, setSelectedPlaylist] = useState<AudiusPlaylist | null>(null);
    const [openLibraryPlaylistId, setOpenLibraryPlaylistId] = useState<number | undefined>();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const mainScrollRef = useRef<HTMLDivElement | null>(null);
    const lastRecordedItemRef = useRef<string | null>(null);
    const lastSavedKeywordRef = useRef<string | null>(null);
    const queryClient = useQueryClient();

    const debouncedKeyword = useDebouncedValue(keyword, 650);
    const searchKeyword = debouncedKeyword.trim();
    const hasSearchKeyword = searchKeyword.length >= 2;

    const {
        queue,
        currentItem,
        recentItems,
        likedItems,
        _restoredFromStorage,
        clearQueue,
        hydrateLibrary,
        appendToQueue,
    } = usePlayerStore();

    const backendRecentQuery = useBackendRecentQuery();
    const backendLikedQuery = useBackendLikedQuery();
    const backendPlaylistsQuery = useBackendPlaylistsQuery();
    const trendingQuery = useTrendingQuery({ genre: "All", time: "week" });
    const trendingArtistsQuery = useTrendingArtistsQuery();
    const trendingPlaylistsQuery = useTrendingPlaylistsQuery();
    const artistsQuery = useArtistsQuery(searchKeyword, view === "artists" && hasSearchKeyword);
    const playlistsQuery = usePlaylistsQuery(searchKeyword, view === "playlists" && hasSearchKeyword);
    const playlistTracksQuery = usePlaylistTracksQuery(selectedPlaylist?.id);
    const spotifyPlaylistTracksQuery = useSpotifyPlaylistTracksQuery(selectedSpotifyPlaylist?.id);
    const artistTracksQuery = useArtistTracksQuery(selectedArtist?.id);
    const artistAlbumsQuery = useArtistAlbumsQuery(selectedArtist?.id);
    const artistPlaylistsQuery = useArtistPlaylistsQuery(selectedArtist?.id);
    const artistRadioQuery = useArtistRadioQuery(selectedArtist);
    const seedItem = useMemo(() => {
        if (currentItem?.type === "audio") return currentItem;
        const fromBackend = (backendRecentQuery.data ?? []).find((i: MediaItem) => i.type === "audio");
        if (fromBackend) return fromBackend;
        return recentItems.find((i) => i.type === "audio") ?? null;
    }, [currentItem, backendRecentQuery.data, recentItems]);

    const recommendationsQuery = useRecommendationsQuery(seedItem?.sourceId);
    const recommendations = useMemo(() => recommendationsQuery.data ?? [], [recommendationsQuery.data]);

    const artistRadioTracks = useMemo(
        () => artistRadioQuery.data?.map(toAudioMediaItem) ?? [],
        [artistRadioQuery.data],
    );

    const playlistTracks = useMemo(
        () => playlistTracksQuery.data?.pages.flat() ?? [],
        [playlistTracksQuery.data],
    );

    useLyricsQuery(currentItem);

    useEffect(() => {
        const handleToggleTrackInfo = () => setShowTrackInfo((p) => !p);
        window.addEventListener("music:toggle-track-info", handleToggleTrackInfo);
        return () => window.removeEventListener("music:toggle-track-info", handleToggleTrackInfo);
    }, []);

    useEffect(() => {
        const handleEntityNavigation = (event: Event) => {
            const { type, id, provider } = (
                event as CustomEvent<{ type?: "artist" | "album" | "playlist"; id?: string; provider?: string }>
            ).detail;
            if (!id) return;

            if (type === "artist") {
                if (provider === "spotify") {
                    void getSpotifyArtist(id).then((data) => {
                        if (!data) return;
                        setSelectedSpotifyArtist(data);
                        setView("spotify-artist");
                    });
                    return;
                }
                void getUser(id).then((artist) => {
                    if (!artist) return;
                    setSelectedArtist(artist);
                    setView("artists");
                });
                return;
            }

            if (type === "album") {
                if (provider === "spotify") {
                    void getSpotifyAlbum(id).then((album) => {
                        if (!album) return;
                        setSelectedSpotifyAlbum(album);
                        setView("spotify-album");
                    });
                    return;
                }
                void getPlaylist(id).then((playlist) => {
                    if (playlist) setSelectedPlaylist(playlist);
                });
                return;
            }

            if (type === "playlist") {
                if (provider === "spotify") {
                    void getSpotifyPlaylist(id).then((playlist) => {
                        if (playlist) setSelectedSpotifyPlaylist(playlist);
                    });
                    return;
                }
                void getPlaylist(id).then((playlist) => {
                    if (playlist) setSelectedPlaylist(playlist);
                });
            }
        };

        window.addEventListener("music:navigate-entity", handleEntityNavigation);
        return () => window.removeEventListener("music:navigate-entity", handleEntityNavigation);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        hydrateLibrary(backendLikedQuery.data ?? [], backendRecentQuery.data ?? []);
    }, [backendLikedQuery.data, backendRecentQuery.data, hydrateLibrary]);

    useEffect(() => {
        if (!currentItem || lastRecordedItemRef.current === currentItem.id) return;
        lastRecordedItemRef.current = currentItem.id;
        if (_restoredFromStorage) return;
        void import("@services/musicBackendService")
            .then(({ recordMusicPlayback }) => recordMusicPlayback(currentItem))
            .then(() => void queryClient.invalidateQueries({ queryKey: ["music", "backend", "recent"] }))
            .catch(() => { lastRecordedItemRef.current = null; });
    }, [_restoredFromStorage, currentItem, queryClient]);

    useEffect(() => {
        if (!hasSearchKeyword || lastSavedKeywordRef.current === searchKeyword) return;
        const timer = window.setTimeout(() => {
            lastSavedKeywordRef.current = searchKeyword;
            void saveMusicSearchKeyword(searchKeyword)
                .then(() => void queryClient.invalidateQueries({ queryKey: ["music", "backend", "search-history"] }))
                .catch(() => { lastSavedKeywordRef.current = null; });
        }, 900);
        return () => window.clearTimeout(timer);
    }, [hasSearchKeyword, searchKeyword, queryClient]);

    useEffect(() => {
        if (queue.length > 2 || !recommendations.length) return;
        appendToQueue(recommendations.map(toAudioMediaItem));
    }, [queue.length, recommendations, appendToQueue]);

    const selectArtist = (artist: AudiusUser) => {
        if (artist.provider === "spotify") {
            void getSpotifyArtist(artist.id).then((data) => {
                if (!data) return;
                setSelectedArtist(null);
                setSelectedSpotifyArtist(data);
                setView("spotify-artist");
            });
            return;
        }
        setSelectedArtist(artist);
        setView("artists");
    };

    const selectPlaylist = (playlist: AudiusPlaylist) => {
        if (playlist.provider !== "spotify") {
            setSelectedPlaylist(playlist);
            return;
        }
        if (playlist.is_album) {
            void getSpotifyAlbum(playlist.id).then((album) => {
                if (!album) return;
                setSelectedSpotifyAlbum(album);
                setView("spotify-album");
            });
            return;
        }
        void getSpotifyPlaylist(playlist.id).then((sp) => {
            if (sp) setSelectedSpotifyPlaylist(sp);
        });
    };

    const navItems = [
        { id: "home" as MusicView, label: "Home", icon: <HomeIcon /> },
        { id: "ai" as MusicView, label: "AI Music", icon: <AutoAwesomeIcon /> },
        { id: "search" as MusicView, label: "Search", icon: <SearchIcon /> },
        { id: "artists" as MusicView, label: "Artists", icon: <AlbumIcon /> },
        { id: "playlists" as MusicView, label: "Playlists", icon: <PlaylistPlayIcon /> },
        { id: "library" as MusicView, label: "Thư viện", icon: <LibraryMusicIcon /> },
        { id: "leaderboard" as MusicView, label: "Xếp hạng", icon: <EmojiEventsIcon /> },
        { id: "stats" as MusicView, label: "Thống kê", icon: <GraphicEqIcon /> },
        { id: "profile" as MusicView, label: "Hồ sơ", icon: <PersonIcon /> },
    ];

    const libraryItems = [
        {
            id: "liked" as MusicView,
            label: "Liked Songs",
            icon: <FavoriteIcon sx={{ color: SP_GREEN }} />,
            count: likedItems.length,
        },
        {
            id: "recent" as MusicView,
            label: "Recently Played",
            icon: <MusicNoteIcon />,
            count: recentItems.length,
        },
        {
            id: "my-playlists" as MusicView,
            label: "My Playlists",
            icon: <LibraryMusicIcon />,
            count: backendPlaylistsQuery.data?.length,
        },
    ];

    const contextValue = {
        view,
        setView,
        keyword,
        setKeyword,
        selectedArtist,
        setSelectedArtist,
        selectedSpotifyArtist,
        setSelectedSpotifyArtist,
        selectedSpotifyAlbum,
        setSelectedSpotifyAlbum,
        selectedSpotifyPlaylist,
        setSelectedSpotifyPlaylist,
        selectedPlaylist,
        setSelectedPlaylist,
        openLibraryPlaylistId,
        setOpenLibraryPlaylistId,
        selectArtist,
        selectPlaylist,
    };

    const trendingTracks = trendingQuery.data ?? [];
    const trendingArtists = trendingArtistsQuery.data ?? [];
    const trendingPlaylists = trendingPlaylistsQuery.data ?? [];

    return (
        <MusicContext.Provider value={contextValue}>
            <Box
                sx={{
                    display: "flex",
                    width: "100vw",
                    height: "calc(100dvh - var(--persistent-music-player-height, 90px))",
                    overflow: "hidden",
                    ...MUSIC_MENU_BACKGROUND_SX,
                }}
            >
                {/* Mobile Sidebar Drawer */}
                <Drawer
                    open={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { lg: "none" },
                        "& .MuiDrawer-paper": {
                            width: SIDEBAR_W,
                            bgcolor: (theme) => alpha(theme.palette.background.default, 0.84),
                            backdropFilter: "blur(18px)",
                            border: "none",
                            ...MUSIC_CHROME_SURFACE_SX,
                        },
                    }}
                >
                    <MusicSidebar
                        view={view}
                        navItems={navItems}
                        libraryItems={libraryItems}
                        playlists={backendPlaylistsQuery.data ?? []}
                        onNavigate={(v) => {
                            setOpenLibraryPlaylistId(undefined);
                            setView(v);
                            setSidebarOpen(false);
                        }}
                        onClose={() => setSidebarOpen(false)}
                    />
                </Drawer>

                {/* Desktop Sidebar */}
                <Box
                    sx={{
                        width: sidebarCollapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_W,
                        flexShrink: 0,
                        display: { xs: "none", lg: "flex" },
                        flexDirection: "column",
                        bgcolor: (theme) => alpha(theme.palette.background.default, 0.82),
                        backdropFilter: "blur(18px)",
                        transition: "width 220ms ease, background-color 220ms ease",
                        ...MUSIC_CHROME_SURFACE_SX,
                    }}
                >
                    <MusicSidebar
                        view={view}
                        navItems={navItems}
                        libraryItems={libraryItems}
                        playlists={backendPlaylistsQuery.data ?? []}
                        collapsed={sidebarCollapsed}
                        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
                        onNavigate={(v) => {
                            setOpenLibraryPlaylistId(undefined);
                            setView(v);
                        }}
                    />
                </Box>

                {/* Main Content */}
                <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    {/* Topbar */}
                    <Box
                        sx={{
                            px: { xs: 2, md: 3 },
                            py: 1.5,
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            bgcolor: (theme) => alpha(theme.palette.background.default, 0.74),
                            backdropFilter: "blur(16px)",
                            borderBottom: "1px solid",
                            borderColor: "divider",
                            flexShrink: 0,
                            ...MUSIC_CHROME_SURFACE_SX,
                        }}
                    >
                        <IconButton
                            onClick={() => setSidebarOpen(true)}
                            sx={{ display: { lg: "none" }, color: "text.secondary", "&:hover": { color: "text.primary" } }}
                        >
                            <MenuIcon />
                        </IconButton>

                        <TextField
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            onFocus={() => setView("search")}
                            placeholder="Tìm bài hát, nghệ sĩ, playlist..."
                            size="small"
                            sx={{
                                flex: 1,
                                maxWidth: 380,
                                "& .MuiOutlinedInput-root": {
                                    bgcolor: "action.hover",
                                    borderRadius: 3,
                                    color: "text.primary",
                                    fontSize: 14,
                                    "& fieldset": { borderColor: "transparent" },
                                    "&:hover fieldset": { borderColor: "divider" },
                                    "&.Mui-focused fieldset": { borderColor: SP_GREEN },
                                    "& input::placeholder": { color: "text.disabled" },
                                },
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.5 }}>
                            <Tooltip title={mode === "light" ? "Chuyển sang tối" : "Chuyển sang sáng"}>
                                <IconButton
                                    onClick={toggleMode}
                                    sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
                                >
                                    {mode === "light" ? <Brightness4Icon /> : <Brightness7Icon />}
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Thông tin bài hát">
                                <IconButton
                                    onClick={() => setShowTrackInfo((p) => !p)}
                                    sx={{ color: showTrackInfo ? SP_GREEN : "text.secondary", "&:hover": { color: "text.primary" } }}
                                >
                                    <InfoOutlinedIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Lời bài hát">
                                <IconButton
                                    onClick={() => { setShowLyrics((p) => !p); if (!showLyrics) setShowQueue(false); }}
                                    sx={{ color: showLyrics ? SP_GREEN : "text.secondary", "&:hover": { color: "text.primary" } }}
                                >
                                    <LyricsOutlinedIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Danh sách chờ">
                                <IconButton
                                    onClick={() => { setShowQueue((p) => !p); if (!showQueue) setShowLyrics(false); }}
                                    sx={{ color: showQueue ? SP_GREEN : "text.secondary", "&:hover": { color: "text.primary" } }}
                                >
                                    <QueueMusicIcon />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>

                    {/* Views */}
                    {view === "home" && <HomeView scrollRef={mainScrollRef} />}

                    <Box
                        sx={{
                            display: view === "ai" ? "block" : "none",
                            flex: 1,
                            minHeight: 0,
                            overflow: "auto",
                            p: { xs: 2, md: 3 },
                        }}
                    >
                        <AIStudioView />
                    </Box>

                    {view === "search" && <SearchView />}

                    {view === "artists" && (
                        <Box ref={mainScrollRef} sx={{ flex: 1, minHeight: 0, overflow: "auto", p: { xs: 2, md: 3 } }}>
                            {!selectedArtist && (
                                <Typography sx={{ fontWeight: 800, fontSize: 20, color: "text.primary", mb: 2 }}>
                                    {hasSearchKeyword ? "Kết quả tìm kiếm" : "Nghệ sĩ phổ biến"}
                                </Typography>
                            )}
                            <ArtistsPanel
                                artists={hasSearchKeyword ? (artistsQuery.data ?? []) : trendingArtists}
                                selectedArtist={selectedArtist}
                                onSelectArtist={selectArtist}
                                artistTracks={artistTracksQuery.data ?? []}
                                artistAlbums={artistAlbumsQuery.data ?? []}
                                artistPlaylists={artistPlaylistsQuery.data ?? []}
                                artistRadioTracks={artistRadioTracks}
                                artistRadioLoading={artistRadioQuery.isLoading}
                                onSelectPlaylist={selectPlaylist}
                            />
                        </Box>
                    )}

                    {view === "playlists" && (
                        <Box ref={mainScrollRef} sx={{ flex: 1, minHeight: 0, overflow: "auto", p: { xs: 2, md: 3 } }}>
                            <Typography sx={{ fontWeight: 800, fontSize: 20, color: "text.primary", mb: 2 }}>
                                {hasSearchKeyword ? "Kết quả tìm kiếm" : "Playlist và album nổi bật"}
                            </Typography>
                            <PlaylistGrid
                                playlists={hasSearchKeyword ? (playlistsQuery.data ?? []) : [...trendingPlaylists, ...[]]}
                                onSelectPlaylist={selectPlaylist}
                            />
                        </Box>
                    )}

                    {view === "library" && (
                        <Box ref={mainScrollRef} sx={{ flex: 1, minHeight: 0, overflow: "auto", p: { xs: 2, md: 3 } }}>
                            <LibraryView initialPlaylistId={openLibraryPlaylistId} />
                        </Box>
                    )}

                    {view === "liked" && <LikedSongsView />}

                    {view === "recent" && (
                        <Box ref={mainScrollRef} sx={{ flex: 1, minHeight: 0, overflow: "auto", p: { xs: 2, md: 3 } }}>
                            <Typography sx={{ fontWeight: 800, fontSize: 20, color: "text.primary", mb: 2 }}>
                                Nghe gần đây
                            </Typography>
                            {recentItems.length ? (
                                recentItems.map((item, i) => (
                                    <MediaRow key={item.id} item={item} queue={recentItems} index={i + 1} />
                                ))
                            ) : (
                                <Typography sx={{ color: "text.disabled", fontSize: 14, py: 4, textAlign: "center" }}>
                                    Bạn chưa phát nội dung nào.
                                </Typography>
                            )}
                        </Box>
                    )}

                    {view === "my-playlists" && <MyPlaylistsView scrollRef={mainScrollRef} />}

                    {view === "leaderboard" && (
                        <Box ref={mainScrollRef} sx={{ flex: 1, minHeight: 0, overflow: "auto", p: { xs: 2, md: 3 } }}>
                            <LeaderboardView />
                        </Box>
                    )}

                    {view === "stats" && (
                        <Box ref={mainScrollRef} sx={{ flex: 1, minHeight: 0, overflow: "auto", p: { xs: 2, md: 3 } }}>
                            <ListeningStatsView />
                        </Box>
                    )}

                    {view === "profile" && (
                        <Box ref={mainScrollRef} sx={{ flex: 1, minHeight: 0, overflow: "auto", p: { xs: 2, md: 3 } }}>
                            <UserProfileView />
                        </Box>
                    )}

                    {view === "spotify-artist" && selectedSpotifyArtist && (
                        <SpotifyArtistView
                            data={selectedSpotifyArtist}
                            onBack={() => setView("home")}
                            scrollRef={mainScrollRef}
                        />
                    )}

                    {view === "spotify-album" && selectedSpotifyAlbum && (
                        <SpotifyAlbumView
                            data={selectedSpotifyAlbum}
                            onBack={() => setView("home")}
                            scrollRef={mainScrollRef}
                        />
                    )}
                </Box>

                {/* Queue Panel — mobile drawer */}
                <Drawer
                    anchor="right"
                    open={showQueue}
                    onClose={() => setShowQueue(false)}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: "block", xl: "none" },
                        "& .MuiDrawer-paper": { width: QUEUE_W, bgcolor: "background.default", border: "none" },
                    }}
                >
                    <QueuePanelContent queue={queue} onClose={() => setShowQueue(false)} onClear={clearQueue} />
                </Drawer>

                {/* Queue Panel — desktop inline */}
                {showQueue && (
                    <Box
                        sx={{
                            width: QUEUE_W,
                            flexShrink: 0,
                            display: { xs: "none", xl: "flex" },
                            flexDirection: "column",
                            bgcolor: "background.default",
                            borderLeft: "1px solid",
                            borderColor: "divider",
                            overflow: "hidden",
                        }}
                    >
                        <QueuePanelContent queue={queue} onClose={() => setShowQueue(false)} onClear={clearQueue} />
                    </Box>
                )}

                {/* Lyrics Panel — mobile drawer */}
                <Drawer
                    anchor="right"
                    open={showLyrics}
                    onClose={() => setShowLyrics(false)}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: "block", xl: "none" },
                        "& .MuiDrawer-paper": { width: LYRICS_W, bgcolor: "background.default", border: "none" },
                    }}
                >
                    <LyricsPanelContent item={currentItem} onClose={() => setShowLyrics(false)} />
                </Drawer>

                {/* Lyrics Panel — desktop inline */}
                {showLyrics && (
                    <Box
                        sx={{
                            width: LYRICS_W,
                            flexShrink: 0,
                            display: { xs: "none", xl: "flex" },
                            flexDirection: "column",
                            bgcolor: "background.default",
                            borderLeft: "1px solid",
                            borderColor: "divider",
                            overflow: "hidden",
                        }}
                    >
                        <LyricsPanelContent item={currentItem} onClose={() => setShowLyrics(false)} />
                    </Box>
                )}

                {/* Track Info Panel — mobile drawer */}
                <Drawer
                    anchor="right"
                    open={showTrackInfo}
                    onClose={() => setShowTrackInfo(false)}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: "block", xl: "none" },
                        "& .MuiDrawer-paper": { width: TRACK_INFO_W, bgcolor: "background.default", border: "none" },
                    }}
                >
                    <TrackInfoPanelContent item={currentItem} onClose={() => setShowTrackInfo(false)} />
                </Drawer>

                {/* Track Info Panel — desktop inline */}
                {showTrackInfo && (
                    <Box
                        sx={{
                            width: TRACK_INFO_W,
                            flexShrink: 0,
                            display: { xs: "none", xl: "flex" },
                            flexDirection: "column",
                            bgcolor: "background.default",
                            borderLeft: "1px solid",
                            borderColor: "divider",
                            overflow: "hidden",
                        }}
                    >
                        <TrackInfoPanelContent item={currentItem} onClose={() => setShowTrackInfo(false)} />
                    </Box>
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

                <SpotifyPlaylistDialog
                    playlist={selectedSpotifyPlaylist}
                    tracks={spotifyPlaylistTracksQuery.data?.tracks ?? []}
                    loading={spotifyPlaylistTracksQuery.isFetching}
                    onClose={() => setSelectedSpotifyPlaylist(null)}
                />
            </Box>
        </MusicContext.Provider>
    );
}
