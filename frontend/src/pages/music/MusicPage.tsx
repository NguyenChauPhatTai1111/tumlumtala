import AddIcon from "@mui/icons-material/Add";
import AlbumIcon from "@mui/icons-material/Album";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import PauseIcon from "@mui/icons-material/Pause";
import LyricsOutlinedIcon from "@mui/icons-material/LyricsOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import PersonIcon from "@mui/icons-material/Person";
import ExploreIcon from "@mui/icons-material/Explore";
import FavoriteIcon from "@mui/icons-material/Favorite";
import HomeIcon from "@mui/icons-material/Home";
import LibraryMusicIcon from "@mui/icons-material/LibraryMusic";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import QueueMusicIcon from "@mui/icons-material/QueueMusic";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import SmartDisplayIcon from "@mui/icons-material/SmartDisplay";
import {
    alpha,
    Avatar,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogContent,
    Divider,
    Drawer,
    IconButton,
    InputAdornment,
    LinearProgress,
    Skeleton,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
    getSpotifyAlbum,
    getSpotifyAlbumTracks,
    getSpotifyArtist,
    getSpotifyArtistAllAlbums,
    getSpotifyArtistDiscography,
    getSpotifyCategories,
    getSpotifyCategoryPlaylists,
    getSpotifyFeaturedPlaylists,
    getSpotifyNewReleases,
    getSpotifyPlaylist,
    getSpotifyPlaylistTracks,
    saveMusicSearchKeyword,
} from "@services/musicBackendService";
import type {
    SpotifyAlbumDetail,
    SpotifyAlbumSummary,
    SpotifyArtistResponse,
    SpotifyArtistSummary,
    SpotifyCategory,
    SpotifyCollectionSummary,
    SpotifyTrackDetail,
} from "@services/musicBackendService";
import {
    getAudiusProfileImage,
    getPlaylist,
    getPlaylistArtwork,
    getUser,
    toAudioMediaItem,
} from "@services/musicService";
import { usePlayerStore } from "@store/playerStore";
import { useThemeMode } from "@store/themeStore";
import { ArtistsPanel } from "./components/ArtistsPanel";
import { AIStudioView } from "./components/AIStudioView";
import { IntersectionSentinel } from "./components/IntersectionSentinel";
import { LeaderboardView } from "./components/LeaderboardView";
import { LibraryView } from "./components/LibraryView";
import { ListeningStatsView } from "./components/ListeningStatsView";
import { MediaRow } from "./components/MediaRow";
import { PlaylistGrid } from "./components/PlaylistGrid";
import { UserProfileView } from "./components/UserProfileView";
import { PlaylistTracksDialog } from "./components/PlaylistTracksDialog";
import { LibraryToggleButton } from "./components/LibraryToggleButton";
import { TrackOptionsButton } from "./components/TrackOptionsButton";
import { LyricsPanelContent, TrackInfoPanelContent } from "./components/TrackInfoDialog";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import { useSmartQueueAutofill } from "./hooks/useSmartQueueAutofill";
import {
    useAddToPlaylistMutation,
    useArtistAlbumsQuery,
    useArtistPlaylistsQuery,
    useArtistRadioQuery,
    useArtistsQuery,
    useArtistTracksQuery,
    useBackendLikedQuery,
    useBackendPlaylistsQuery,
    useBackendRecentQuery,
    useBackendSearchHistoryQuery,
    useClearSearchHistoryMutation,
    useCreatePlaylistMutation,
    useDeleteSearchHistoryMutation,
    useLyricsQuery,
    usePlaylistsQuery,
    usePlaylistTracksQuery,
    useTracksQuery,
    useRecommendationsQuery,
    useTrendingAlbumsQuery,
    useTrendingArtistsQuery,
    useTrendingPlaylistsQuery,
    useTrendingQuery,
    useUndergroundTrendingQuery,
} from "./hooks/useMusicQueries";
import type {
    AudiusPlaylist,
    AudiusTrack,
    AudiusUser,
    MediaItem,
    TrendingGenre,
    TrendingTimeFilter,
} from "./types";
import { formatDisplayName, formatDuration } from "./utils";

type MusicView =
    | "home"
    | "ai"
    | "search"
    | "artists"
    | "playlists"
    | "library"
    | "liked"
    | "recent"
    | "my-playlists"
    | "leaderboard"
    | "profile"
    | "stats"
    | "spotify-artist"
    | "spotify-album";

const SP_GREEN = "#f97316";
const MUSIC_CARD_SURFACE_SX = {
    bgcolor: (theme: import("@mui/material").Theme) =>
        theme.palette.mode === "light"
            ? alpha(theme.palette.primary.main, 0.04)
            : theme.palette.background.paper,
    border: "1px solid",
    borderColor: (theme: import("@mui/material").Theme) =>
        theme.palette.mode === "light" ? alpha(theme.palette.primary.main, 0.12) : "transparent",
    boxShadow: (theme: import("@mui/material").Theme) =>
        theme.palette.mode === "light"
            ? `0 10px 24px ${alpha(theme.palette.primary.main, 0.05)}`
            : "none",
};

const MUSIC_CARD_HOVER_SX = {
    bgcolor: (theme: import("@mui/material").Theme) =>
        theme.palette.mode === "light"
            ? alpha(theme.palette.primary.main, 0.075)
            : theme.palette.action.selected,
};
const MUSIC_CONTROL_OVERLAY_SX = {
    borderRadius: "50%",
    bgcolor: (theme: import("@mui/material").Theme) =>
        theme.palette.mode === "light"
            ? alpha(theme.palette.background.default, 0.92)
            : "rgba(12,12,12,0.72)",
    border: "1px solid",
    borderColor: (theme: import("@mui/material").Theme) =>
        theme.palette.mode === "light" ? alpha(theme.palette.primary.main, 0.14) : "transparent",
    boxShadow: (theme: import("@mui/material").Theme) =>
        theme.palette.mode === "light"
            ? `0 10px 24px ${alpha(theme.palette.primary.main, 0.12)}`
            : "none",
    backdropFilter: "blur(10px)",
};
const MUSIC_3D_CARD_SX = {
    perspective: "1400px",
    transformStyle: "preserve-3d",
    transition: "transform 360ms cubic-bezier(0.22, 1, 0.36, 1)",
    "& .card-bg": {
        transformStyle: "preserve-3d",
        transition:
            "transform 360ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 360ms ease, background-color 0.2s, border-color 0.2s",
    },
    "& .card-cover": {
        transform: "translateZ(0px)",
        transition: "transform 360ms cubic-bezier(0.22, 1, 0.36, 1)",
        willChange: "transform",
    },
    "& .card-title": {
        transform: "translateZ(0px)",
        transition: "transform 360ms cubic-bezier(0.22, 1, 0.36, 1), color 0.2s ease",
    },
    "& .card-subtitle, & .card-badge": {
        transform: "translateZ(0px)",
        transition: "transform 360ms cubic-bezier(0.22, 1, 0.36, 1)",
    },
    "&:hover": {
        transform: "translateY(-6px)",
    },
    "&:hover .card-bg": {
        transform: "rotateX(6deg) rotateY(-5deg) translateY(-2px)",
        boxShadow: "0 22px 36px rgba(0,0,0,0.24)",
    },
    "&:hover .card-cover": {
        transform: "translateZ(26px) scale(1.025)",
    },
    "&:hover .card-title": {
        transform: "translateZ(18px)",
    },
    "&:hover .card-subtitle": {
        transform: "translateZ(12px)",
    },
    "&:hover .card-badge": {
        transform: "translateZ(14px)",
    },
};
const MUSIC_MENU_BACKGROUND_SX = {
    position: "relative",
    isolation: "isolate",
    background: (theme: import("@mui/material").Theme) =>
        theme.palette.mode === "light"
            ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.045)} 0%, ${theme.palette.background.default} 52%, ${alpha(theme.palette.secondary.main, 0.08)} 100%)`
            : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.065)} 0%, ${theme.palette.background.default} 48%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
    backgroundSize: "220% 220%",
    animation: "musicMenuGradientShift 32s ease-in-out infinite",
    "@keyframes musicMenuGradientShift": {
        "0%": { backgroundPosition: "0% 50%" },
        "50%": { backgroundPosition: "100% 50%" },
        "100%": { backgroundPosition: "0% 50%" },
    },
    "&::before": {
        content: '""',
        position: "absolute",
        inset: "-18%",
        background: (theme: import("@mui/material").Theme) =>
            `linear-gradient(105deg, transparent 30%, ${alpha(
                theme.palette.common.white,
                theme.palette.mode === "light" ? 0.14 : 0.045,
            )} 48%, transparent 66%)`,
        filter: "blur(24px)",
        opacity: 0.42,
        transform: "translateX(-165%) skewX(-18deg)",
        transformOrigin: "center",
        animation: "musicMenuSheen 9s ease-in-out infinite",
        pointerEvents: "none",
        zIndex: 0,
    },
    "&::after": {
        content: '""',
        position: "absolute",
        inset: "-10%",
        background: (theme: import("@mui/material").Theme) =>
            `radial-gradient(circle at 18% 16%, ${alpha(
                theme.palette.primary.main,
                theme.palette.mode === "light" ? 0.06 : 0.045,
            )} 0%, transparent 24%), radial-gradient(circle at 82% 78%, ${alpha(
                theme.palette.secondary.main,
                theme.palette.mode === "light" ? 0.05 : 0.035,
            )} 0%, transparent 22%)`,
        pointerEvents: "none",
        zIndex: 0,
        transform: "perspective(1400px) rotateX(72deg) rotateZ(-10deg) translate3d(-4%, 8%, 0)",
        transformOrigin: "center center",
        animation: "musicAmbientDepth 28s ease-in-out infinite",
        opacity: 0.92,
    },
    "@keyframes musicMenuSheen": {
        "0%": {
            opacity: 0,
            transform: "translateX(-165%) skewX(-18deg)",
        },
        "16%": {
            opacity: 0.45,
        },
        "42%": {
            opacity: 0,
            transform: "translateX(165%) skewX(-18deg)",
        },
        "100%": {
            opacity: 0,
            transform: "translateX(165%) skewX(-18deg)",
        },
    },
    "@keyframes musicAmbientDepth": {
        "0%, 100%": {
            opacity: 0.82,
            transform: "perspective(1400px) rotateX(72deg) rotateZ(-10deg) translate3d(-4%, 8%, 0)",
        },
        "50%": {
            opacity: 1,
            transform: "perspective(1400px) rotateX(66deg) rotateZ(6deg) translate3d(4%, -6%, 0)",
        },
    },
    "& > *": {
        position: "relative",
        zIndex: 1,
    },
};
const MUSIC_CHROME_SURFACE_SX = {
    position: "relative",
    isolation: "isolate",
    overflow: "hidden",
    "&::before": {
        content: '""',
        position: "absolute",
        inset: "-28%",
        background: (theme: import("@mui/material").Theme) =>
            `linear-gradient(110deg, transparent 32%, ${alpha(
                theme.palette.common.white,
                theme.palette.mode === "light" ? 0.07 : 0.035,
            )} 49%, transparent 67%)`,
        filter: "blur(22px)",
        opacity: 0.34,
        transform: "translateX(-170%) skewX(-18deg)",
        animation: "musicChromeSheen 14s ease-in-out infinite",
        pointerEvents: "none",
        zIndex: 0,
    },
    "&::after": {
        content: '""',
        position: "absolute",
        inset: 0,
        background: (theme: import("@mui/material").Theme) =>
            `radial-gradient(circle at 14% 12%, ${alpha(
                theme.palette.primary.main,
                theme.palette.mode === "light" ? 0.05 : 0.035,
            )} 0%, transparent 28%)`,
        pointerEvents: "none",
        zIndex: 0,
    },
    "@keyframes musicChromeSheen": {
        "0%": {
            opacity: 0,
            transform: "translateX(-170%) skewX(-18deg)",
        },
        "18%": {
            opacity: 0.34,
        },
        "48%": {
            opacity: 0,
            transform: "translateX(170%) skewX(-18deg)",
        },
        "100%": {
            opacity: 0,
            transform: "translateX(170%) skewX(-18deg)",
        },
    },
    "& > *": {
        position: "relative",
        zIndex: 1,
    },
};
const SIDEBAR_W = 280;
const SIDEBAR_COLLAPSED_W = 96;
const QUEUE_W = 320;
const LYRICS_W = 450;
const TRACK_INFO_W = 360;

// ─── Horizontal scroll row ───────────────────────────────────────────────────
function HScrollSection({
    title,
    loading,
    children,
}: {
    title: string;
    loading?: boolean;
    children: React.ReactNode;
}) {
    const rowRef = useRef<HTMLDivElement>(null);
    const scroll = (dir: "left" | "right") => {
        rowRef.current?.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
    };

    return (
        <Box sx={{ mb: 4 }}>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1.5,
                }}
            >
                <Typography sx={{ fontWeight: 800, fontSize: 20, color: "text.primary" }}>
                    {title}
                </Typography>
                <Stack direction="row" spacing={0.25}>
                    <IconButton
                        size="small"
                        onClick={() => scroll("left")}
                        sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
                    >
                        <ChevronLeftIcon />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => scroll("right")}
                        sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
                    >
                        <ChevronRightIcon />
                    </IconButton>
                </Stack>
            </Box>
            {loading ? (
                <Stack direction="row" spacing={1.5}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Box key={i} sx={{ flexShrink: 0, width: 160 }}>
                            <Skeleton
                                variant="rectangular"
                                sx={{
                                    borderRadius: 1,
                                    aspectRatio: "1",
                                    mb: 1,
                                    bgcolor: "action.selected",
                                }}
                            />
                            <Skeleton sx={{ bgcolor: "action.selected" }} width="80%" />
                            <Skeleton sx={{ bgcolor: "action.hover" }} width="60%" />
                        </Box>
                    ))}
                </Stack>
            ) : (
                <Box
                    ref={rowRef}
                    sx={{
                        display: "flex",
                        gap: 1.5,
                        overflowX: "auto",
                        pb: 1,
                        scrollbarWidth: "none",
                        "&::-webkit-scrollbar": { display: "none" },
                    }}
                >
                    {children}
                </Box>
            )}
        </Box>
    );
}

// ─── Track card for home horizontal row ──────────────────────────────────────
function TrackCard({
    track,
    queue,
    recommendationReason,
}: {
    track: AudiusTrack;
    queue: AudiusTrack[];
    recommendationReason?: string;
}) {
    const { currentItem, isPlaying, play, pause, resume } = usePlayerStore();
    const item = useMemo(() => toAudioMediaItem(track), [track]);
    const queueItems = useMemo(() => queue.map(toAudioMediaItem), [queue]);
    const active = currentItem?.id === item.id;
    const [hovered, setHovered] = useState(false);

    const handlePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (active && isPlaying) {
            pause();
            return;
        }
        if (active) {
            resume();
            return;
        }
        play(item, queueItems);
    };

    const openInfo = () => {
        window.dispatchEvent(new CustomEvent("music:toggle-track-info", { detail: { item } }));
    };

    return (
        <Box
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            sx={{
                flexShrink: 0,
                width: 160,
                ...MUSIC_3D_CARD_SX,
                "&:hover .card-bg": MUSIC_CARD_HOVER_SX,
            }}
        >
            <Box
                className="card-bg"
                sx={{ ...MUSIC_CARD_SURFACE_SX, borderRadius: 1.5, p: 1.5 }}
            >
                <Box sx={{ position: "relative", mb: 1.5, isolation: "isolate" }}>
                    <Box
                        component="button"
                        type="button"
                        onClick={openInfo}
                        sx={{
                            display: "block",
                            width: "100%",
                            p: 0,
                            border: 0,
                            bgcolor: "transparent",
                            cursor: "pointer",
                            borderRadius: 1,
                        }}
                    >
                        <Avatar
                            className="card-cover"
                            variant="rounded"
                            src={item.thumbnail}
                            sx={{
                                width: "100%",
                                height: "auto",
                                aspectRatio: "1",
                                borderRadius: 1,
                                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                            }}
                        />
                    </Box>
                    <IconButton
                        onClick={handlePlay}
                        sx={{
                            position: "absolute",
                            bottom: 8,
                            right: 8,
                            zIndex: 2,
                            bgcolor: SP_GREEN,
                            color: "black",
                            width: 38,
                            height: 38,
                            opacity: hovered || active ? 1 : 0,
                            transform: hovered || active ? "translateY(0)" : "translateY(8px)",
                            transition: "opacity 0.2s, transform 0.2s",
                            "&:hover": {
                                bgcolor: "#fb923c",
                                transform: "scale(1.06) translateY(0)",
                            },
                            boxShadow: "0 8px 16px rgba(0,0,0,0.5)",
                        }}
                    >
                        {active && isPlaying ? (
                            <Box
                                sx={{
                                    width: 14,
                                    height: 14,
                                    display: "flex",
                                    gap: "2px",
                                    alignItems: "flex-end",
                                }}
                            >
                                {[1, 2, 3].map((i) => (
                                    <Box
                                        key={i}
                                        sx={{
                                            width: 3,
                                            bgcolor: "black",
                                            borderRadius: 0.5,
                                            animation: `eq ${0.6 + i * 0.15}s ease-in-out infinite`,
                                            "@keyframes eq": {
                                                "0%,100%": { height: "40%" },
                                                "50%": { height: "100%" },
                                            },
                                            animationDelay: `${i * 0.1}s`,
                                        }}
                                    />
                                ))}
                            </Box>
                        ) : (
                            <PlayArrowIcon sx={{ fontSize: 20 }} />
                        )}
                    </IconButton>
                    <Box
                        sx={{
                            position: "absolute",
                            top: 7,
                            right: 7,
                            zIndex: 2,
                            ...MUSIC_CONTROL_OVERLAY_SX,
                        }}
                    >
                        <TrackOptionsButton item={item} alwaysVisible />
                    </Box>
                </Box>
                <Typography
                    className="card-title"
                    component="button"
                    type="button"
                    onClick={openInfo}
                    noWrap
                    sx={{
                        display: "block",
                        width: "100%",
                        p: 0,
                        border: 0,
                        bgcolor: "transparent",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "text.primary",
                        mb: 0.25,
                        "&:hover": { color: "primary.main" },
                    }}
                >
                    {formatDisplayName(track.title)}
                </Typography>
                <Typography
                    className="card-subtitle"
                    noWrap
                    sx={{ fontSize: 12, color: "text.secondary" }}
                >
                    {formatDisplayName(track.user.name)}
                </Typography>
                {recommendationReason && (
                    <Typography
                        className="card-badge"
                        noWrap
                        sx={{ mt: 0.5, fontSize: 10.5, fontWeight: 650, color: "#fdba74" }}
                    >
                        {recommendationReason}
                    </Typography>
                )}
            </Box>
        </Box>
    );
}

// ─── Artist card ──────────────────────────────────────────────────────────────
function ArtistCard({ artist, onClick }: { artist: AudiusUser; onClick: () => void }) {
    return (
        <Box
            onClick={onClick}
            sx={{
                flexShrink: 0,
                width: 148,
                cursor: "pointer",
                textAlign: "center",
                ...MUSIC_3D_CARD_SX,
                "&:hover .card-bg": MUSIC_CARD_HOVER_SX,
            }}
        >
            <Box
                className="card-bg"
                sx={{ ...MUSIC_CARD_SURFACE_SX, position: "relative", borderRadius: 1.5, p: 1.5 }}
            >
                <Box sx={{ position: "absolute", zIndex: 1, top: 8, right: 8 }}>
                    <LibraryToggleButton
                        compact
                        item={{
                            item_type: "artist",
                            source_id: artist.id,
                            title: artist.name,
                            subtitle: `Nghệ sĩ · @${artist.handle}`,
                            thumbnail: getAudiusProfileImage(artist),
                            metadata: { artist },
                        }}
                    />
                </Box>
                <Avatar
                    className="card-cover"
                    src={getAudiusProfileImage(artist)}
                    sx={{
                        width: 116,
                        height: 116,
                        mx: "auto",
                        mb: 1.5,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                    }}
                />
                <Typography
                    className="card-title"
                    noWrap
                    sx={{ fontSize: 13, fontWeight: 600, color: "text.primary", mb: 0.25 }}
                >
                    {formatDisplayName(artist.name)}
                </Typography>
                <Typography
                    className="card-subtitle"
                    noWrap
                    sx={{ fontSize: 12, color: "text.secondary" }}
                >
                    Nghệ sĩ
                </Typography>
            </Box>
        </Box>
    );
}

// ─── Playlist card ────────────────────────────────────────────────────────────
function PlaylistCard({ playlist, onClick }: { playlist: AudiusPlaylist; onClick: () => void }) {
    const [hovered, setHovered] = useState(false);
    return (
        <Box
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={onClick}
            sx={{
                flexShrink: 0,
                width: 160,
                cursor: "pointer",
                ...MUSIC_3D_CARD_SX,
                "&:hover .card-bg": MUSIC_CARD_HOVER_SX,
            }}
        >
            <Box className="card-bg" sx={{ ...MUSIC_CARD_SURFACE_SX, borderRadius: 1.5, p: 1.5 }}>
                <Box sx={{ position: "relative", mb: 1.5 }}>
                    <Avatar
                        className="card-cover"
                        variant="rounded"
                        src={getPlaylistArtwork(playlist)}
                        sx={{
                            width: "100%",
                            height: "auto",
                            aspectRatio: "1",
                            borderRadius: 1,
                            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                        }}
                    />
                    <Box
                        sx={{
                            position: "absolute",
                            bottom: 8,
                            right: 8,
                            bgcolor: SP_GREEN,
                            borderRadius: "50%",
                            width: 38,
                            height: 38,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: hovered ? 1 : 0,
                            transform: hovered ? "translateY(0)" : "translateY(8px)",
                            transition: "opacity 0.2s, transform 0.2s",
                            boxShadow: "0 8px 16px rgba(0,0,0,0.5)",
                        }}
                    >
                        <PlayArrowIcon sx={{ fontSize: 20, color: "black" }} />
                    </Box>
                    <Box
                        sx={{
                            position: "absolute",
                            top: 7,
                            left: 7,
                            ...MUSIC_CONTROL_OVERLAY_SX,
                        }}
                    >
                        <LibraryToggleButton
                            compact
                            item={{
                                item_type: playlist.is_album ? "album" : "playlist",
                                source_id: playlist.id,
                                title: playlist.playlist_name,
                                subtitle: `${playlist.is_album ? "Album" : "Playlist"} · ${playlist.user.name}`,
                                thumbnail: getPlaylistArtwork(playlist),
                                metadata: { playlist },
                            }}
                        />
                    </Box>
                </Box>
                <Typography
                    className="card-title"
                    noWrap
                    sx={{ fontSize: 13, fontWeight: 600, color: "text.primary", mb: 0.25 }}
                >
                    {formatDisplayName(playlist.playlist_name)}
                </Typography>
                <Typography
                    className="card-subtitle"
                    noWrap
                    sx={{ fontSize: 12, color: "text.secondary" }}
                >
                    {formatDisplayName(playlist.user.name)}
                </Typography>
            </Box>
        </Box>
    );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ label, onRetry }: { label: string; onRetry?: () => void }) {
    return (
        <Box sx={{ py: 8, textAlign: "center" }}>
            <ExploreIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1.5 }} />
            <Typography sx={{ color: "text.disabled", fontSize: 14, mb: onRetry ? 2 : 0 }}>
                {label}
            </Typography>
            {onRetry && (
                <Button
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={onRetry}
                    sx={{ color: "text.disabled", "&:hover": { color: "text.primary" } }}
                >
                    Thử lại
                </Button>
            )}
        </Box>
    );
}

// ─── Queue item ───────────────────────────────────────────────────────────────
function QueueItem({ item, queue }: { item: MediaItem; queue: MediaItem[] }) {
    const { currentItem, isPlaying, play, pause, resume } = usePlayerStore();
    const active = currentItem?.id === item.id;
    const handleClick = () => {
        if (active && isPlaying) {
            pause();
            return;
        }
        if (active) {
            resume();
            return;
        }
        play(item, queue);
    };
    return (
        <Box
            onClick={handleClick}
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 2,
                py: 0.75,
                cursor: "pointer",
                bgcolor: active ? "action.selected" : "transparent",
                "&:hover": { bgcolor: active ? "action.selected" : "action.hover" },
                transition: "background-color 0.15s",
            }}
        >
            <Avatar
                variant="rounded"
                src={item.thumbnail}
                sx={{ width: 36, height: 36, borderRadius: 0.5, flexShrink: 0 }}
            />
            <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                    noWrap
                    sx={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: active ? SP_GREEN : "text.primary",
                    }}
                >
                    {formatDisplayName(item.title)}
                </Typography>
                <Typography noWrap sx={{ fontSize: 11, color: "text.secondary" }}>
                    {item.type === "video" && (
                        <SmartDisplayIcon sx={{ fontSize: 10, mr: 0.3, verticalAlign: "middle" }} />
                    )}
                    {formatDisplayName(item.artist)}
                </Typography>
            </Box>
            <Typography sx={{ fontSize: 11, color: "text.disabled", flexShrink: 0 }}>
                {item.duration ? formatDuration(item.duration) : ""}
            </Typography>
        </Box>
    );
}

// ─── Queue panel content (shared by inline panel + mobile drawer) ────────────
function QueuePanelContent({
    queue,
    spGreen,
    onClose,
    onClear,
}: {
    queue: import("@pages/music/types").MediaItem[];
    spGreen: string;
    onClose: () => void;
    onClear: () => void;
}) {
    return (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <Box
                sx={{
                    px: 2.5,
                    py: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    flexShrink: 0,
                }}
            >
                <Stack direction="row" spacing={1} alignItems="center">
                    <QueueMusicIcon sx={{ color: spGreen, fontSize: 20 }} />
                    <Typography sx={{ fontWeight: 700, color: "text.primary", fontSize: 15 }}>
                        Danh sách chờ · {queue.length}
                    </Typography>
                </Stack>
                <Stack direction="row" spacing={0.5}>
                    {queue.length > 0 && (
                        <Tooltip title="Xóa toàn bộ queue">
                            <IconButton
                                size="small"
                                onClick={onClear}
                                sx={{
                                    color: "text.secondary",
                                    "&:hover": { color: "#ef4444" },
                                }}
                            >
                                <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                    <Tooltip title="Đóng">
                        <IconButton
                            size="small"
                            onClick={onClose}
                            sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Box>
            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflow: "auto",
                    py: 1,
                    pb: "var(--persistent-music-player-height, 90px)",
                }}
            >
                {queue.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: "center" }}>
                        <QueueMusicIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
                        <Typography sx={{ color: "text.disabled", fontSize: 13 }}>
                            Queue trống. Phát một bài để bắt đầu.
                        </Typography>
                    </Box>
                ) : (
                    queue.map((item, i) => <QueueItem key={`${item.id}:${i}`} item={item} queue={queue} />)
                )}
            </Box>
        </Box>
    );
}

// ─── Sidebar content (shared by desktop + mobile drawer) ─────────────────────
function SidebarInner({
    view,
    navItems,
    libraryItems,
    playlists,
    spGreen,
    collapsed = false,
    onToggleCollapse,
    onNavigate,
    onClose,
}: {
    view: MusicView;
    navItems: { id: MusicView; label: string; icon: React.ReactNode }[];
    libraryItems: { id: MusicView; label: string; icon: React.ReactNode; count?: number }[];
    playlists: import("@services/musicBackendService").MusicPlaylistRow[];
    spGreen: string;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
    onNavigate: (v: MusicView) => void;
    onClose?: () => void;
}) {
    return (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            {/* Logo */}
            <Box
                sx={{
                    px: 3,
                    pt: 3,
                    pb: 2,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    onClick={() => {
                        window.location.href = "/";
                    }}
                    sx={{
                        cursor: "pointer",
                        minWidth: 0,
                        "&:hover .music-brand-text": {
                            color: "primary.main",
                        },
                    }}
                >
                    <MusicNoteIcon sx={{ color: spGreen, fontSize: 28 }} />
                    {!collapsed && (
                        <Typography
                            className="music-brand-text"
                            sx={{
                                fontWeight: 900,
                                fontSize: 18,
                                color: "text.primary",
                                letterSpacing: -0.5,
                            }}
                        >
                            TÙM LUM NHẠC
                        </Typography>
                    )}
                </Stack>
                <Stack direction="row" spacing={0.5}>
                    {onToggleCollapse && !onClose && (
                        <Tooltip title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}>
                            <IconButton
                                size="small"
                                onClick={onToggleCollapse}
                                sx={{
                                    color: "text.secondary",
                                    "&:hover": { color: "text.primary" },
                                }}
                            >
                                {collapsed ? (
                                    <ChevronRightIcon fontSize="small" />
                                ) : (
                                    <ChevronLeftIcon fontSize="small" />
                                )}
                            </IconButton>
                        </Tooltip>
                    )}
                    {onClose && (
                        <IconButton
                            size="small"
                            onClick={onClose}
                            sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    )}
                </Stack>
            </Box>

            {/* Main nav */}
            <Box sx={{ px: 1.5, mb: 2, flexShrink: 0 }}>
                {navItems.map((item) => (
                    <Tooltip key={item.id} title={collapsed ? item.label : ""} placement="right">
                        <Box
                            onClick={() => onNavigate(item.id)}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: collapsed ? "center" : "flex-start",
                                gap: collapsed ? 0 : 2,
                                px: 1.5,
                                py: 1.25,
                                borderRadius: 1,
                                cursor: "pointer",
                                color: view === item.id ? "text.primary" : "text.secondary",
                                fontWeight: view === item.id ? 700 : 500,
                                fontSize: 14,
                                "&:hover": { color: "text.primary" },
                            }}
                        >
                            <Box
                                sx={{
                                    color: view === item.id ? spGreen : "inherit",
                                    display: "flex",
                                    "& svg": { fontSize: 22 },
                                }}
                            >
                                {item.icon}
                            </Box>
                            {!collapsed && item.label}
                        </Box>
                    </Tooltip>
                ))}
            </Box>

            <Divider sx={{ borderColor: "divider", mx: 1.5, flexShrink: 0 }} />

            {/* Library — scrollable */}
            <Box
                sx={{
                    px: 1.5,
                    pt: 2,
                    flex: 1,
                    minHeight: 0,
                    overflow: "auto",
                    pb: "var(--persistent-music-player-height, 90px)",
                }}
            >
                {!collapsed && (
                    <Typography
                        sx={{
                            px: 1.5,
                            mb: 1,
                            fontSize: 11,
                            fontWeight: 700,
                            color: "text.secondary",
                            letterSpacing: 1,
                            textTransform: "uppercase",
                        }}
                    >
                        Your Library
                    </Typography>
                )}
                {libraryItems.map((item) => (
                    <Tooltip key={item.id} title={collapsed ? item.label : ""} placement="right">
                        <Box
                            onClick={() => onNavigate(item.id)}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: collapsed ? "center" : "flex-start",
                                gap: collapsed ? 0 : 2,
                                px: 1.5,
                                py: 1,
                                borderRadius: 1,
                                cursor: "pointer",
                                color: view === item.id ? "text.primary" : "text.secondary",
                                bgcolor: view === item.id ? "action.selected" : "transparent",
                                "&:hover": { color: "text.primary", bgcolor: "action.hover" },
                            }}
                        >
                            <Box sx={{ display: "flex", "& svg": { fontSize: 20 } }}>
                                {item.icon}
                            </Box>
                            {!collapsed && (
                                <>
                                    <Typography
                                        noWrap
                                        sx={{
                                            fontSize: 13,
                                            fontWeight: 500,
                                            color: "inherit",
                                            flex: 1,
                                        }}
                                    >
                                        {item.label}
                                    </Typography>
                                    {item.count !== undefined && (
                                        <Typography sx={{ fontSize: 11, color: "text.disabled" }}>
                                            {item.count}
                                        </Typography>
                                    )}
                                </>
                            )}
                        </Box>
                    </Tooltip>
                ))}

                {!collapsed && playlists.length > 0 && (
                    <>
                        <Divider sx={{ borderColor: "divider", my: 1.5 }} />
                        {playlists.map((playlist) => (
                            <Box
                                key={playlist.id}
                                onClick={() => onNavigate("my-playlists")}
                                sx={{
                                    px: 1.5,
                                    py: 0.75,
                                    borderRadius: 1,
                                    cursor: "pointer",
                                    "&:hover": { bgcolor: "action.hover" },
                                }}
                            >
                                <Typography noWrap sx={{ fontSize: 13, color: "text.secondary" }}>
                                    {formatDisplayName(playlist.name)}
                                </Typography>
                                <Typography noWrap sx={{ fontSize: 11, color: "text.disabled" }}>
                                    {playlist.tracks?.length ?? 0} bài
                                </Typography>
                            </Box>
                        ))}
                    </>
                )}
            </Box>
        </Box>
    );
}

// ─── Spotify Artist View ──────────────────────────────────────────────────────
function AlbumCard({ album }: { album: SpotifyAlbumSummary }) {
    const thumb = album.images?.[0] ?? "";
    const year = album.release_date?.slice(0, 4) ?? "";
    const handleClick = () => {
        window.dispatchEvent(
            new CustomEvent("music:navigate-entity", {
                detail: { type: "album", id: album.id, provider: "spotify" },
            }),
        );
    };
    return (
        <Box
            onClick={handleClick}
            sx={{
                display: "block",
                width: 140,
                flexShrink: 0,
                textDecoration: "none",
                cursor: "pointer",
                "&:hover .album-name": { color: SP_GREEN },
            }}
        >
            <Avatar
                variant="rounded"
                src={thumb}
                sx={{ width: 140, height: 140, borderRadius: 1.5, mb: 1, bgcolor: "action.hover" }}
            />
            <Typography className="album-name" noWrap sx={{ fontSize: 13, fontWeight: 600, color: "text.primary", transition: "color 0.15s" }}>
                {album.name}
            </Typography>
            <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                {year}{year && album.album_type ? " · " : ""}{album.album_type === "single" ? "Single" : album.album_type === "album" ? "Album" : album.album_type}
            </Typography>
        </Box>
    );
}

function SpotifyCollectionCard({ item }: { item: SpotifyCollectionSummary }) {
    const handleClick = () => {
        window.dispatchEvent(
            new CustomEvent("music:navigate-entity", {
                detail: { type: item.type === "album" ? "album" : "playlist", id: item.id, provider: "spotify" },
            }),
        );
    };
    return (
        <Box
            onClick={handleClick}
            sx={{
                width: 160,
                flexShrink: 0,
                cursor: "pointer",
                "&:hover .collection-title": { color: SP_GREEN },
            }}
        >
            <Avatar
                variant="rounded"
                src={item.images?.[0] ?? ""}
                sx={{ width: 160, height: 160, borderRadius: 1.5, mb: 1 }}
            />
            <Typography className="collection-title" noWrap sx={{ fontSize: 13, fontWeight: 700 }}>
                {item.name}
            </Typography>
            <Typography noWrap sx={{ mt: 0.25, fontSize: 11, color: "text.secondary" }}>
                {item.owner?.name || "Nhạc"}
            </Typography>
        </Box>
    );
}

function RelatedArtistCard({ artist }: { artist: SpotifyArtistSummary }) {
    return (
        <Box
            onClick={() =>
                window.dispatchEvent(
                    new CustomEvent("music:navigate-entity", {
                        detail: { type: "artist", id: artist.id, provider: "spotify" },
                    }),
                )
            }
            sx={{ width: 150, flexShrink: 0, cursor: "pointer", "&:hover .artist-name": { color: SP_GREEN } }}
        >
            <Avatar src={artist.images?.[0] ?? ""} sx={{ width: 150, height: 150, mb: 1 }} />
            <Typography className="artist-name" noWrap sx={{ fontSize: 13, fontWeight: 700 }}>
                {artist.name}
            </Typography>
            <Typography sx={{ fontSize: 11, color: "text.secondary" }}>Nghệ sĩ</Typography>
        </Box>
    );
}

function SpotifyArtistView({
    data,
    onBack,
    scrollRef,
}: {
    data: SpotifyArtistResponse;
    onBack: () => void;
    scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
    const {
        artist,
        top_tracks,
        albums,
        albums_total,
        appears_on,
        appears_total,
        playlists = [],
        related_artists = [],
    } = data;
    const { currentItem, isPlaying, play, pause, resume } = usePlayerStore();
    const [discographyTab, setDiscographyTab] = useState<"popular" | "albums" | "singles">("popular");
    const [showFullBio, setShowFullBio] = useState(false);

    const wikiBioQuery = useQuery({
        queryKey: ["wikipedia-artist-bio", artist.name],
        queryFn: async () => {
            const searchRes = await fetch(
                `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(artist.name + " musician")}&srlimit=1&format=json&origin=*`,
            );
            const searchData = await searchRes.json() as { query?: { search?: { pageid: number; title: string }[] } };
            const page = searchData.query?.search?.[0];
            if (!page) return null;

            const summaryRes = await fetch(
                `https://en.wikipedia.org/w/api.php?action=query&pageids=${page.pageid}&prop=extracts&exintro=true&explaintext=true&format=json&origin=*`,
            );
            const summaryData = await summaryRes.json() as { query?: { pages?: Record<string, { extract?: string }> } };
            const extract = summaryData.query?.pages?.[page.pageid]?.extract ?? null;
            if (!extract) return null;
            return { extract, title: page.title, pageid: page.pageid };
        },
        staleTime: 60 * 60 * 1000,
        retry: false,
    });

    const uniqueTrackCountQuery = useQuery({
        queryKey: ["spotify-artist-unique-tracks", artist.id],
        queryFn: async () => {
            const allAlbums = await getSpotifyArtistAllAlbums(artist.id);
            const trackIds = new Set<string>();
            await Promise.all(
                allAlbums.map(async (album) => {
                    try {
                        const res = await getSpotifyAlbumTracks(album.id, 50, 0);
                        for (const t of res.tracks) {
                            if (t.id) trackIds.add(t.id);
                        }
                    } catch {
                        // bỏ qua album lỗi
                    }
                }),
            );
            return trackIds.size;
        },
        staleTime: 60 * 60 * 1000,
        retry: false,
    });

    const coverImage = artist.images?.[0] ?? "";

    const trackItems: MediaItem[] = (top_tracks ?? []).map((t) => ({
        id: `audio:spotify:${t.id}`,
        sourceId: `spotify:${t.id}`,
        type: "audio" as const,
        title: t.title,
        artist: t.user.name,
        artistId: t.user.id,
        thumbnail: t.artwork["480x480"] ?? t.artwork["1000x1000"] ?? t.artwork["150x150"] ?? "",
        duration: t.duration,
        provider: "spotify" as const,
        externalUrl: t.external_url,
        album: t.album?.id ? { id: t.album.id, name: t.album.name } : undefined,
    }));

    const visibleTracks = trackItems.slice(0, 10);
    const genres = artist.genres ?? [];
    const discography = albums ?? [];
    const featuring = appears_on ?? [];
    const visibleDiscography =
        discographyTab === "albums"
            ? discography.filter((album) => album.album_type === "album")
            : discographyTab === "singles"
                ? discography.filter((album) => album.album_type !== "album")
                : discography;
    const latestAlbum = [...discography].sort((a, b) =>
        (b.release_date ?? "").localeCompare(a.release_date ?? ""),
    )[0];
    const artistPick = latestAlbum
        ? {
            id: latestAlbum.id,
            name: latestAlbum.name,
            image: latestAlbum.images?.[0] ?? "",
            label: latestAlbum.album_type === "album" ? "Album" : "Single",
            isAlbum: true,
        }
        : playlists[0]
            ? {
                id: playlists[0].id,
                name: playlists[0].name,
                image: playlists[0].images?.[0] ?? "",
                label: "Playlist",
                isAlbum: false,
            }
            : null;

    const sectionLabel = (text: string, extra?: string) => (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: "text.primary" }}>{text}</Typography>
            {extra && <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{extra}</Typography>}
        </Box>
    );

    return (
        <Box
            ref={scrollRef}
            sx={{ flex: 1, minHeight: 0, overflow: "auto", p: { xs: 2, md: 3 } }}
        >
            {/* Back */}
            <Button
                startIcon={<ChevronLeftIcon />}
                onClick={onBack}
                sx={{ mb: 2, color: "text.secondary", "&:hover": { color: "text.primary" } }}
            >
                Quay lại
            </Button>

            {/* ── Hero ─────────────────────────────────────────────── */}
            <Box
                sx={{
                    position: "relative",
                    borderRadius: 3,
                    overflow: "hidden",
                    mb: 4,
                    minHeight: 220,
                    background: coverImage
                        ? `linear-gradient(160deg, rgba(30,30,30,0.0) 0%, rgba(0,0,0,0.85) 100%), url(${coverImage}) center/cover no-repeat`
                        : "linear-gradient(160deg, #1a1a2e 0%, #16213e 100%)",
                }}
            >
                <Box sx={{ display: "flex", gap: 3, alignItems: "flex-end", p: 3, pt: 8 }}>
                    <Avatar
                        src={coverImage}
                        sx={{
                            width: { xs: 100, md: 150 },
                            height: { xs: 100, md: 150 },
                            flexShrink: 0,
                            boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
                            border: "3px solid rgba(255,255,255,0.12)",
                        }}
                    />
                    <Box sx={{ minWidth: 0, pb: 0.5 }}>
                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1.5, mb: 0.5 }}>
                            Nghệ sĩ
                        </Typography>
                        <Typography sx={{ fontWeight: 900, fontSize: { xs: 26, md: 44 }, lineHeight: 1.05, color: "#fff" }}>
                            {artist.name}
                        </Typography>
                        {genres.length > 0 && (
                            <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ mt: 1.5 }}>
                                {genres.slice(0, 5).map((g) => (
                                    <Chip key={g} label={g} size="small"
                                        sx={{ bgcolor: "rgba(249,115,22,0.2)", color: "#fed7aa", fontSize: 11, border: "1px solid rgba(249,115,22,0.3)" }}
                                    />
                                ))}
                            </Stack>
                        )}
                    </Box>
                </Box>
            </Box>

            {/* ── Popular tracks ────────────────────────────────────── */}
            {trackItems.length > 0 && (
                <Box
                    sx={{
                        mb: 5,
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", lg: artistPick ? "minmax(0,1.65fr) minmax(280px,.75fr)" : "1fr" },
                        gap: 4,
                    }}
                >
                    <Box>
                        {sectionLabel("Popular")}
                        <Stack spacing={0.5}>
                            {visibleTracks.map((item, i) => {
                                const active = currentItem?.id === item.id;
                                return (
                                    <Box
                                        key={item.id}
                                        onClick={() => {
                                            if (active && isPlaying) { pause(); return; }
                                            if (active) { resume(); return; }
                                            play(item, trackItems);
                                        }}
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1.5,
                                            px: 1.5,
                                            py: 1,
                                            borderRadius: 1.5,
                                            cursor: "pointer",
                                            bgcolor: active ? "action.selected" : "transparent",
                                            "&:hover": { bgcolor: active ? "action.selected" : "action.hover" },
                                            transition: "background-color 0.15s",
                                        }}
                                    >
                                        <Box sx={{ width: 24, textAlign: "right", flexShrink: 0 }}>
                                            {active && isPlaying
                                                ? <GraphicEqIcon sx={{ fontSize: 16, color: SP_GREEN }} />
                                                : <Typography sx={{ fontSize: 13, color: "text.disabled" }}>{i + 1}</Typography>
                                            }
                                        </Box>
                                        <Avatar variant="rounded" src={item.thumbnail}
                                            sx={{ width: 40, height: 40, borderRadius: 1, flexShrink: 0 }}
                                        />
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Typography noWrap sx={{ fontSize: 14, fontWeight: 600, color: active ? SP_GREEN : "text.primary" }}>
                                                {formatDisplayName(item.title)}
                                            </Typography>
                                            {item.album?.id ? (
                                                <Typography
                                                    noWrap
                                                    component="span"
                                                    sx={{ fontSize: 12, color: "text.secondary", cursor: "pointer", display: "block", "&:hover": { color: "text.primary", textDecoration: "underline" } }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.dispatchEvent(new CustomEvent("music:navigate-entity", { detail: { type: "album", id: item.album!.id, provider: "spotify" } }));
                                                    }}
                                                >
                                                    {item.album.name}
                                                </Typography>
                                            ) : (
                                                <Typography noWrap sx={{ fontSize: 12, color: "text.secondary" }}>
                                                    {formatDisplayName(item.artist)}
                                                </Typography>
                                            )}
                                        </Box>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
                                            {active && isPlaying
                                                ? <IconButton size="small" onClick={(e) => { e.stopPropagation(); pause(); }} sx={{ color: SP_GREEN }}>
                                                    <PauseIcon sx={{ fontSize: 18 }} />
                                                </IconButton>
                                                : <IconButton size="small" onClick={(e) => { e.stopPropagation(); play(item, trackItems); }}
                                                    sx={{ color: "text.disabled", "&:hover": { color: SP_GREEN }, opacity: 0, ".MuiBox-root:hover > * > &": { opacity: 1 } }}
                                                >
                                                    <PlayArrowIcon sx={{ fontSize: 18 }} />
                                                </IconButton>
                                            }
                                            <Typography sx={{ fontSize: 12, color: "text.disabled", minWidth: 36, textAlign: "right" }}>
                                                {item.duration ? formatDuration(item.duration) : ""}
                                            </Typography>
                                            <Box sx={{ opacity: { xs: 1, md: 0 }, ".MuiBox-root:hover &": { opacity: 1 }, transition: "opacity 0.15s" }} onClick={(e) => e.stopPropagation()}>
                                                <TrackOptionsButton item={item} alwaysVisible />
                                            </Box>
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Stack>
                    </Box>
                    {artistPick && (
                        <Box>
                            {sectionLabel("Phát hành mới nhất")}
                            <Box
                                onClick={() =>
                                    window.dispatchEvent(
                                        new CustomEvent("music:navigate-entity", {
                                            detail: {
                                                type: artistPick.isAlbum ? "album" : "playlist",
                                                id: artistPick.id,
                                                provider: "spotify",
                                            },
                                        }),
                                    )
                                }
                                sx={{
                                    display: "flex",
                                    gap: 1.5,
                                    p: 1.5,
                                    borderRadius: 2,
                                    bgcolor: "action.hover",
                                    cursor: "pointer",
                                    "&:hover": { bgcolor: "action.selected" },
                                }}
                            >
                                <Avatar
                                    variant="rounded"
                                    src={artistPick.image}
                                    sx={{ width: 88, height: 88, borderRadius: 1.5 }}
                                />
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                                        Phát hành gần đây của {artist.name}
                                    </Typography>
                                    <Typography sx={{ mt: 0.75, fontWeight: 800 }} noWrap>
                                        {artistPick.name}
                                    </Typography>
                                    <Typography sx={{ mt: 0.25, fontSize: 12, color: "text.secondary" }}>
                                        {artistPick.label}
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                    )}
                </Box>
            )}

            {/* ── Discography ───────────────────────────────────────── */}
            {discography.length > 0 && (
                <Box sx={{ mb: 5 }}>
                    {sectionLabel("Discography", albums_total > discography.length ? `${albums_total} releases` : undefined)}
                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                        {([
                            ["popular", "Popular releases"],
                            ["albums", "Albums"],
                            ["singles", "Singles and EPs"],
                        ] as const).map(([value, label]) => (
                            <Chip
                                key={value}
                                label={label}
                                onClick={() => setDiscographyTab(value)}
                                sx={{
                                    bgcolor: discographyTab === value ? "text.primary" : "action.selected",
                                    color: discographyTab === value ? "background.default" : "text.primary",
                                    fontWeight: 700,
                                }}
                            />
                        ))}
                    </Stack>
                    <Box sx={{ display: "flex", gap: 2, overflowX: "auto", pb: 1, "&::-webkit-scrollbar": { height: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: 2 } }}>
                        {visibleDiscography.map((album) => (
                            <AlbumCard key={album.id} album={album} />
                        ))}
                    </Box>
                </Box>
            )}

            {/* ── Featuring ─────────────────────────────────────────── */}
            {featuring.length > 0 && (
                <Box sx={{ mb: 4 }}>
                    {sectionLabel("Featuring " + artist.name, appears_total > featuring.length ? `${appears_total} releases` : undefined)}
                    <Box sx={{ display: "flex", gap: 2, overflowX: "auto", pb: 1, "&::-webkit-scrollbar": { height: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: 2 } }}>
                        {featuring.map((album) => (
                            <AlbumCard key={album.id} album={album} />
                        ))}
                    </Box>
                </Box>
            )}

            {/* ── About ────────────────────────────────────────────── */}
            <Box sx={{ mb: 5 }}>
                <Box>
                    {sectionLabel("About")}
                    <Box
                        sx={{
                            position: "relative",
                            minHeight: 360,
                            p: 3,
                            borderRadius: 2.5,
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "flex-end",
                            background: coverImage
                                ? `linear-gradient(0deg, rgba(0,0,0,.92), rgba(0,0,0,.08)), url(${coverImage}) center 25%/cover no-repeat`
                                : "linear-gradient(135deg, #292524, #111827)",
                        }}
                    >
                        <Box sx={{ position: "relative", color: "#fff" }}>
                            <Typography sx={{ fontSize: 24, fontWeight: 900 }}>{artist.name}</Typography>
                            <Typography sx={{ mt: 0.75, fontSize: 13, color: "rgba(255,255,255,.78)" }}>
                                {uniqueTrackCountQuery.data != null
                                    ? `${uniqueTrackCountQuery.data} bài hát`
                                    : `${albums_total} bản phát hành`}
                                {artist.followers ? ` · ${artist.followers.toLocaleString("vi-VN")} người theo dõi` : ""}
                            </Typography>
                            {genres.length > 0 && (
                                <Typography sx={{ mt: 0.75, fontSize: 12, color: "rgba(255,255,255,.65)" }}>
                                    {genres.slice(0, 5).join(" · ")}
                                </Typography>
                            )}
                            {wikiBioQuery.isLoading && (
                                <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1 }}>
                                    <CircularProgress size={14} sx={{ color: "rgba(255,255,255,.5)" }} />
                                    <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>
                                        Đang tải thông tin từ Wikipedia…
                                    </Typography>
                                </Box>
                            )}
                            {wikiBioQuery.data && (
                                <Box sx={{ mt: 2 }}>
                                    <Typography
                                        sx={{
                                            fontSize: 13,
                                            lineHeight: 1.65,
                                            color: "rgba(255,255,255,.82)",
                                            display: "-webkit-box",
                                            WebkitLineClamp: showFullBio ? "unset" : 5,
                                            WebkitBoxOrient: "vertical",
                                            overflow: showFullBio ? "visible" : "hidden",
                                        }}
                                    >
                                        {wikiBioQuery.data.extract}
                                    </Typography>
                                    <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1.5 }}>
                                        <Button
                                            size="small"
                                            onClick={() => setShowFullBio((v) => !v)}
                                            sx={{ color: "rgba(255,255,255,.6)", textTransform: "none", fontSize: 12, p: 0, minWidth: 0, "&:hover": { color: "#fff", bgcolor: "transparent" } }}
                                        >
                                            {showFullBio ? "Thu gọn" : "Xem thêm"}
                                        </Button>
                                        <Typography
                                            component="a"
                                            href={`https://en.wikipedia.org/?curid=${wikiBioQuery.data.pageid}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            sx={{ fontSize: 11, color: "rgba(255,255,255,.4)", textDecoration: "none", "&:hover": { color: "rgba(255,255,255,.7)", textDecoration: "underline" } }}
                                        >
                                            Wikipedia
                                        </Typography>
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    </Box>
                </Box>
            </Box>

            {playlists.length > 0 && (
                <Box sx={{ mb: 5 }}>
                    {sectionLabel("Artist Playlists")}
                    <Box sx={{ display: "flex", gap: 2, overflowX: "auto", pb: 1 }}>
                        {playlists.map((playlist) => (
                            <SpotifyCollectionCard key={playlist.id} item={playlist} />
                        ))}
                    </Box>
                </Box>
            )}

            {related_artists.length > 0 && (
                <Box sx={{ mb: 5 }}>
                    {sectionLabel("Fans also like")}
                    <Box sx={{ display: "flex", gap: 2, overflowX: "auto", pb: 1 }}>
                        {related_artists.map((relatedArtist) => (
                            <RelatedArtistCard key={relatedArtist.id} artist={relatedArtist} />
                        ))}
                    </Box>
                </Box>
            )}
        </Box>
    );
}

// ─── Spotify Album View ───────────────────────────────────────────────────────
function SpotifyAlbumView({
    data,
    onBack,
    scrollRef,
}: {
    data: SpotifyAlbumDetail;
    onBack: () => void;
    scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
    const { currentItem, isPlaying, play, pause, resume } = usePlayerStore();
    const coverImage = data.images?.[0] ?? "";
    const year = data.release_date?.slice(0, 4) ?? "";
    const [extraTracks, setExtraTracks] = useState<MediaItem[]>([]);
    const [loadingMore, setLoadingMore] = useState(false);
    const artistQuery = useQuery({
        queryKey: ["music", "spotify-artist", data.artist_id],
        queryFn: () => getSpotifyArtistDiscography(data.artist_id),
        enabled: Boolean(data.artist_id),
        staleTime: 15 * 60 * 1000,
    });
    const artistData = artistQuery.data;
    const artistImage = artistData?.artist.images?.[0] ?? "";
    const moreByArtist = (artistData?.albums ?? []).filter((album) => album.id !== data.id);

    const openArtist = () => {
        if (!data.artist_id) return;
        window.dispatchEvent(
            new CustomEvent("music:navigate-entity", {
                detail: { type: "artist", id: data.artist_id, provider: "spotify" },
            }),
        );
    };

    const toMediaItem = (t: { id: string; title: string; user: { id: string; name: string }; artwork: { "150x150"?: string; "480x480"?: string; "1000x1000"?: string }; duration: number; external_url: string }): MediaItem => ({
        id: `audio:spotify:${t.id}`,
        sourceId: `spotify:${t.id}`,
        type: "audio" as const,
        title: t.title,
        artist: t.user.name,
        artistId: t.user.id,
        thumbnail: t.artwork["480x480"] ?? t.artwork["1000x1000"] ?? t.artwork["150x150"] ?? coverImage,
        duration: t.duration,
        provider: "spotify" as const,
        externalUrl: t.external_url,
        album: { id: data.id, name: data.name },
    });

    const baseTrackItems: MediaItem[] = (data.tracks ?? []).map(toMediaItem);
    const trackItems: MediaItem[] = [...baseTrackItems, ...extraTracks];

    const canLoadMore = data.total_tracks > trackItems.length;

    const loadMore = async () => {
        setLoadingMore(true);
        try {
            const result = await getSpotifyAlbumTracks(data.id, 50, trackItems.length);
            setExtraTracks((prev) => [...prev, ...result.tracks.map(toMediaItem)]);
        } finally {
            setLoadingMore(false);
        }
    };

    const typeLabel = data.album_type === "single" ? "Single" : data.album_type === "ep" ? "EP" : "Album";

    return (
        <Box ref={scrollRef} sx={{ flex: 1, minHeight: 0, overflow: "auto", p: { xs: 2, md: 3 } }}>
            <Button
                startIcon={<ChevronLeftIcon />}
                onClick={onBack}
                sx={{ mb: 2, color: "text.secondary", "&:hover": { color: "text.primary" } }}
            >
                Quay lại
            </Button>

            {/* Hero */}
            <Box
                sx={{
                    position: "relative",
                    display: "flex",
                    gap: 3,
                    alignItems: "flex-end",
                    mb: 4,
                    p: { xs: 2, md: 3 },
                    minHeight: { xs: 260, md: 330 },
                    borderRadius: 3,
                    overflow: "hidden",
                    flexWrap: "wrap",
                    background: artistImage
                        ? `linear-gradient(90deg, rgba(14,12,11,.94) 0%, rgba(14,12,11,.72) 48%, rgba(14,12,11,.32) 100%), url(${artistImage}) center 24%/cover no-repeat`
                        : "linear-gradient(135deg, #29201b, #111827)",
                }}
            >
                <Avatar
                    variant="rounded"
                    src={coverImage}
                    sx={{
                        width: { xs: 140, md: 200 },
                        height: { xs: 140, md: 200 },
                        borderRadius: 2,
                        flexShrink: 0,
                        boxShadow: "0 16px 48px rgba(0,0,0,0.58)",
                    }}
                />
                <Box sx={{ minWidth: 0, pb: 0.5, position: "relative" }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: "text.disabled", textTransform: "uppercase", letterSpacing: 1.5, mb: 0.5 }}>
                        {typeLabel}
                    </Typography>
                    <Typography sx={{ fontWeight: 900, fontSize: { xs: 28, md: 44 }, lineHeight: 1.05, color: "#fff" }}>
                        {data.name}
                    </Typography>
                    <Typography sx={{ fontSize: 14, color: "rgba(255,255,255,.72)", mt: 0.75 }}>
                        <Box
                            component="button"
                            type="button"
                            onClick={openArtist}
                            sx={{
                                p: 0,
                                border: 0,
                                bgcolor: "transparent",
                                color: "#fff",
                                font: "inherit",
                                fontWeight: 700,
                                cursor: data.artist_id ? "pointer" : "default",
                                "&:hover": { textDecoration: data.artist_id ? "underline" : "none" },
                            }}
                        >
                            {data.artist_name}
                        </Box>
                        {year ? ` · ${year}` : ""}
                        {data.total_tracks ? ` · ${data.total_tracks} bài` : ""}
                    </Typography>
                    {data.label && (
                        <Typography sx={{ fontSize: 12, color: "text.disabled", mt: 0.5 }}>
                            {data.label}
                        </Typography>
                    )}
                    <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }} alignItems="center">
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<PlayArrowIcon />}
                            onClick={() => trackItems.length && play(trackItems[0], trackItems)}
                            sx={{
                                bgcolor: SP_GREEN,
                                color: "#fff",
                                fontWeight: 700,
                                textTransform: "none",
                                borderRadius: 5,
                                px: 2,
                                "&:hover": { bgcolor: "#fb923c" },
                            }}
                        >
                            Phát
                        </Button>
                    </Stack>
                </Box>
            </Box>

            {/* Track list */}
            <Stack spacing={0.5}>
                {trackItems.map((item, i) => {
                    const active = currentItem?.id === item.id;
                    return (
                        <Box
                            key={item.id}
                            onClick={() => {
                                if (active && isPlaying) { pause(); return; }
                                if (active) { resume(); return; }
                                play(item, trackItems);
                            }}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                                px: 1.5,
                                py: 1,
                                borderRadius: 1.5,
                                cursor: "pointer",
                                bgcolor: active ? "action.selected" : "transparent",
                                "&:hover": { bgcolor: active ? "action.selected" : "action.hover" },
                                "&:hover .track-options": { opacity: 1 },
                                transition: "background-color 0.15s",
                            }}
                        >
                            <Box sx={{ width: 24, textAlign: "right", flexShrink: 0 }}>
                                {active && isPlaying
                                    ? <GraphicEqIcon sx={{ fontSize: 16, color: SP_GREEN }} />
                                    : <Typography sx={{ fontSize: 13, color: "text.disabled" }}>{i + 1}</Typography>
                                }
                            </Box>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography noWrap sx={{ fontSize: 14, fontWeight: 600, color: active ? SP_GREEN : "text.primary" }}>
                                    {formatDisplayName(item.title)}
                                </Typography>
                                <Typography noWrap sx={{ fontSize: 12, color: "text.secondary" }}>
                                    {formatDisplayName(item.artist)}
                                </Typography>
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
                                <Typography sx={{ fontSize: 12, color: "text.disabled", minWidth: 36, textAlign: "right" }}>
                                    {item.duration ? formatDuration(item.duration) : ""}
                                </Typography>
                                <Box className="track-options" sx={{ opacity: { xs: 1, md: 0 }, transition: "opacity 0.15s" }} onClick={(e) => e.stopPropagation()}>
                                    <TrackOptionsButton item={item} alwaysVisible />
                                </Box>
                            </Box>
                        </Box>
                    );
                })}
            </Stack>

            {canLoadMore && (
                <Button
                    size="small"
                    onClick={() => void loadMore()}
                    disabled={loadingMore}
                    sx={{ mt: 2, color: "text.secondary", fontWeight: 700, textTransform: "none", "&:hover": { color: "text.primary" } }}
                >
                    {loadingMore ? "Đang tải..." : `Tải thêm ${data.total_tracks - trackItems.length} bài`}
                </Button>
            )}

            <Box sx={{ mt: 5 }}>
                <Typography sx={{ mb: 2, fontWeight: 900, fontSize: 22 }}>
                    More by {data.artist_name}
                </Typography>
                {artistQuery.isLoading ? (
                    <Stack direction="row" spacing={2}>
                        {Array.from({ length: 5 }).map((_, index) => (
                            <Skeleton key={index} variant="rounded" width={140} height={180} />
                        ))}
                    </Stack>
                ) : moreByArtist.length > 0 ? (
                    <Box
                        sx={{
                            display: "flex",
                            gap: 2,
                            overflowX: "auto",
                            pb: 1,
                            "&::-webkit-scrollbar": { height: 4 },
                            "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: 2 },
                        }}
                    >
                        {moreByArtist.map((album) => (
                            <AlbumCard key={album.id} album={album} />
                        ))}
                    </Box>
                ) : (
                    <Typography sx={{ color: "text.disabled", fontSize: 13 }}>
                        Chưa có thêm bản phát hành nào.
                    </Typography>
                )}
            </Box>

        </Box>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MusicPage() {
    useSmartQueueAutofill();
    const { mode, toggleMode } = useThemeMode();
    const [view, setView] = useState<MusicView>("home");
    const [keyword, setKeyword] = useState("");
    const [showQueue, setShowQueue] = useState(false);
    const [showLyrics, setShowLyrics] = useState(false);
    const [showTrackInfo, setShowTrackInfo] = useState(false);
    const [playlistName, setPlaylistName] = useState("");
    const [selectedArtist, setSelectedArtist] = useState<AudiusUser | null>(null);
    const [selectedSpotifyArtist, setSelectedSpotifyArtist] = useState<SpotifyArtistResponse | null>(null);
    const [selectedSpotifyAlbum, setSelectedSpotifyAlbum] = useState<SpotifyAlbumDetail | null>(null);
    const [selectedSpotifyPlaylist, setSelectedSpotifyPlaylist] = useState<SpotifyCollectionSummary | null>(null);
    const [selectedPlaylist, setSelectedPlaylist] = useState<AudiusPlaylist | null>(null);
    const [openLibraryPlaylistId, setOpenLibraryPlaylistId] = useState<number | undefined>();
    const [trendingGenre, setTrendingGenre] = useState<TrendingGenre>("All");
    const [trendingTime, setTrendingTime] = useState<TrendingTimeFilter>("week");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const mainScrollRef = useRef<HTMLDivElement | null>(null);
    const [tracksScrollEl, setTracksScrollEl] = useState<HTMLDivElement | null>(null);

    const debouncedKeyword = useDebouncedValue(keyword, 650);
    const searchKeyword = debouncedKeyword.trim();
    const hasSearchKeyword = searchKeyword.length >= 2;

    const lastRecordedItemRef = useRef<string | null>(null);
    const lastSavedKeywordRef = useRef<string | null>(null);
    const queryClient = useQueryClient();

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
    // Queries
    const trendingQuery = useTrendingQuery({ genre: trendingGenre, time: trendingTime });
    const trendingArtistsQuery = useTrendingArtistsQuery();
    const trendingPlaylistsQuery = useTrendingPlaylistsQuery();
    const trendingAlbumsQuery = useTrendingAlbumsQuery();
    const undergroundQuery = useUndergroundTrendingQuery();

    const backendRecentQuery = useBackendRecentQuery();
    // Seed ưu tiên: bài đang phát → lịch sử backend → lịch sử store
    const seedItem = useMemo(() => {
        if (currentItem?.type === "audio") return currentItem;
        const fromBackend = (backendRecentQuery.data ?? []).find((i: MediaItem) => i.type === "audio");
        if (fromBackend) return fromBackend;
        return recentItems.find((i) => i.type === "audio") ?? null;
    }, [currentItem, backendRecentQuery.data, recentItems]);
    const recommendationsQuery = useRecommendationsQuery(seedItem?.sourceId);
    const artistRadioQuery = useArtistRadioQuery(selectedArtist);
    const tracksQuery = useTracksQuery(searchKeyword, view === "search" && hasSearchKeyword);
    const artistsQuery = useArtistsQuery(searchKeyword, view === "artists" && hasSearchKeyword);
    const playlistsQuery = usePlaylistsQuery(
        searchKeyword,
        view === "playlists" && hasSearchKeyword,
    );
    const playlistTracksQuery = usePlaylistTracksQuery(selectedPlaylist?.id);
    const spotifyPlaylistTracksQuery = useQuery({
        queryKey: ["spotify-playlist-tracks", selectedSpotifyPlaylist?.id],
        queryFn: async () => {
            if (!selectedSpotifyPlaylist) return { tracks: [], total: 0 };
            return getSpotifyPlaylistTracks(selectedSpotifyPlaylist.id, 50, 0);
        },
        enabled: Boolean(selectedSpotifyPlaylist),
        staleTime: 5 * 60 * 1000,
    });
    const newReleasesQuery = useQuery({
        queryKey: ["spotify", "new-releases"],
        queryFn: () => getSpotifyNewReleases(20),
        staleTime: 30 * 60 * 1000,
    });
    const featuredPlaylistsQuery = useQuery({
        queryKey: ["spotify", "featured-playlists"],
        queryFn: () => getSpotifyFeaturedPlaylists(20),
        staleTime: 30 * 60 * 1000,
    });
    const categoriesQuery = useQuery({
        queryKey: ["spotify", "categories"],
        queryFn: () => getSpotifyCategories(20),
        staleTime: 60 * 60 * 1000,
    });
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
    const categoryPlaylistsQuery = useQuery({
        queryKey: ["spotify", "category-playlists", activeCategoryId],
        queryFn: () => getSpotifyCategoryPlaylists(activeCategoryId!, 20),
        enabled: Boolean(activeCategoryId),
        staleTime: 15 * 60 * 1000,
    });
    const artistTracksQuery = useArtistTracksQuery(selectedArtist?.id);
    const artistAlbumsQuery = useArtistAlbumsQuery(selectedArtist?.id);
    const artistPlaylistsQuery = useArtistPlaylistsQuery(selectedArtist?.id);
    const backendLikedQuery = useBackendLikedQuery();
    const backendSearchHistoryQuery = useBackendSearchHistoryQuery();
    const backendPlaylistsQuery = useBackendPlaylistsQuery();

    // Prefetch lyrics khi phát bài mới — kết quả được cache, panel hiển thị ngay
    useLyricsQuery(currentItem);

    const createPlaylistMutation = useCreatePlaylistMutation(() => setPlaylistName(""));
    const deleteSearchHistoryMutation = useDeleteSearchHistoryMutation();
    const clearSearchHistoryMutation = useClearSearchHistoryMutation();
    const addToPlaylistMutation = useAddToPlaylistMutation();

    useEffect(() => {
        const handleToggleTrackInfo = () => {
            setShowTrackInfo((p) => !p);
        };
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
            .then(
                () =>
                    void queryClient.invalidateQueries({
                        queryKey: ["music", "backend", "recent"],
                    }),
            )
            .catch(() => {
                lastRecordedItemRef.current = null;
            });
    }, [_restoredFromStorage, currentItem, queryClient]);

    useEffect(() => {
        if (!hasSearchKeyword || lastSavedKeywordRef.current === searchKeyword) return;
        const timer = window.setTimeout(() => {
            lastSavedKeywordRef.current = searchKeyword;
            void saveMusicSearchKeyword(searchKeyword)
                .then(
                    () =>
                        void queryClient.invalidateQueries({
                            queryKey: ["music", "backend", "search-history"],
                        }),
                )
                .catch(() => {
                    lastSavedKeywordRef.current = null;
                });
        }, 900);
        return () => window.clearTimeout(timer);
    }, [hasSearchKeyword, searchKeyword, queryClient]);

    const searchTrackItems = useMemo(
        () => (tracksQuery.data?.pages.flat() ?? []).map(toAudioMediaItem),
        [tracksQuery.data],
    );
    const playlistTracks = useMemo(
        () => playlistTracksQuery.data?.pages.flat() ?? [],
        [playlistTracksQuery.data],
    );

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

    const trendingTracks = trendingQuery.data ?? [];
    const trendingArtists = trendingArtistsQuery.data ?? [];
    const trendingPlaylists = trendingPlaylistsQuery.data ?? [];
    const trendingAlbums = trendingAlbumsQuery.data ?? [];
    const undergroundTracks = undergroundQuery.data ?? [];
    const recommendations = useMemo(
        () => recommendationsQuery.data ?? [],
        [recommendationsQuery.data],
    );
    const recommendationReason = (reasons: string[]) => {
        if (reasons.includes("same_album")) return "Cùng album";
        if (reasons.includes("same_playlist")) return "Cùng playlist";
        if (reasons.includes("same_artist")) return "Cùng nghệ sĩ";
        if (reasons.includes("common_tags")) return "Cùng tag";
        if (reasons.includes("same_genre")) return "Cùng thể loại";
        return "Hợp gu nghe của bạn";
    };
    const artistRadioTracks = useMemo(
        () => artistRadioQuery.data?.map(toAudioMediaItem) ?? [],
        [artistRadioQuery.data],
    );

    // Auto-queue: khi queue còn <= 2 bài và đã có recommendations, bổ sung vào cuối
    useEffect(() => {
        if (queue.length > 2 || !recommendations.length) return;
        appendToQueue(recommendations.map(toAudioMediaItem));
    }, [queue.length, recommendations, appendToQueue]);

    return (
        <Box
            sx={{
                display: "flex",
                width: "100vw",
                height: "calc(100dvh - var(--persistent-music-player-height, 90px))",
                overflow: "hidden",
                ...MUSIC_MENU_BACKGROUND_SX,
            }}
        >
            {/* ── Mobile Sidebar Drawer ─────────────────────────────────── */}
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
                <SidebarInner
                    view={view}
                    navItems={navItems}
                    libraryItems={libraryItems}
                    playlists={backendPlaylistsQuery.data ?? []}
                    spGreen={SP_GREEN}
                    onNavigate={(v) => {
                        setOpenLibraryPlaylistId(undefined);
                        setView(v);
                        setSidebarOpen(false);
                    }}
                    onClose={() => setSidebarOpen(false)}
                />
            </Drawer>

            {/* ── Left Sidebar (desktop) ────────────────────────────────── */}
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
                <SidebarInner
                    view={view}
                    navItems={navItems}
                    libraryItems={libraryItems}
                    playlists={backendPlaylistsQuery.data ?? []}
                    spGreen={SP_GREEN}
                    collapsed={sidebarCollapsed}
                    onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
                    onNavigate={(v) => {
                        setOpenLibraryPlaylistId(undefined);
                        setView(v);
                    }}
                />
            </Box>

            {/* ── Main Content ──────────────────────────────────────────── */}
            <Box
                sx={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }}
            >
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
                    {/* Mobile: hamburger to open sidebar */}
                    <IconButton
                        onClick={() => setSidebarOpen(true)}
                        sx={{
                            display: { lg: "none" },
                            color: "text.secondary",
                            "&:hover": { color: "text.primary" },
                        }}
                    >
                        <MenuIcon />
                    </IconButton>

                    {/* Search */}
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
                                sx={{
                                    color: "text.secondary",
                                    "&:hover": { color: "text.primary" },
                                }}
                            >
                                {mode === "light" ? <Brightness4Icon /> : <Brightness7Icon />}
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Thông tin bài hát">
                            <IconButton
                                onClick={() => setShowTrackInfo((p) => !p)}
                                sx={{
                                    color: showTrackInfo ? SP_GREEN : "text.secondary",
                                    "&:hover": { color: "text.primary" },
                                }}
                            >
                                <InfoOutlinedIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Lời bài hát">
                            <IconButton
                                onClick={() => {
                                    setShowLyrics((p) => !p);
                                    if (!showLyrics) setShowQueue(false);
                                }}
                                sx={{
                                    color: showLyrics ? SP_GREEN : "text.secondary",
                                    "&:hover": { color: "text.primary" },
                                }}
                            >
                                <LyricsOutlinedIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Danh sách chờ">
                            <IconButton
                                onClick={() => {
                                    setShowQueue((p) => !p);
                                    if (!showQueue) setShowLyrics(false);
                                }}
                                sx={{
                                    color: showQueue ? SP_GREEN : "text.secondary",
                                    "&:hover": { color: "text.primary" },
                                }}
                            >
                                <QueueMusicIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                {/* ── HOME ────────────────────────────────────────────────── */}
                {view === "home" && (
                    <Box
                        ref={mainScrollRef}
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            overflow: "auto",
                            p: { xs: 2, md: 3 },
                        }}
                    >
                        <Box sx={{ mb: 3 }}>
                            <Typography
                                sx={{
                                    fontWeight: 900,
                                    fontSize: { xs: 24, md: 30 },
                                    color: "text.primary",
                                    mb: 2,
                                }}
                            >
                                Chào mừng trở lại
                            </Typography>
                            {/* Genre + Time filters */}
                            <Stack
                                direction="row"
                                spacing={1}
                                flexWrap="wrap"
                                useFlexGap
                                sx={{ mb: 1 }}
                            >
                                {(
                                    [
                                        "All",
                                        "Electronic",
                                        "Hip-Hop/Rap",
                                        "Pop",
                                        "Rock",
                                        "R&B/Soul",
                                        "Jazz",
                                        "House",
                                        "Techno",
                                        "Ambient",
                                        "Latin",
                                    ] as TrendingGenre[]
                                ).map((g) => (
                                    <Chip
                                        key={g}
                                        label={g}
                                        size="small"
                                        onClick={() => setTrendingGenre(g)}
                                        sx={{
                                            bgcolor:
                                                trendingGenre === g ? SP_GREEN : "action.hover",
                                            color: trendingGenre === g ? "black" : "text.secondary",
                                            fontWeight: trendingGenre === g ? 700 : 400,
                                            "&:hover": {
                                                bgcolor:
                                                    trendingGenre === g
                                                        ? "#fb923c"
                                                        : "action.selected",
                                            },
                                        }}
                                    />
                                ))}
                            </Stack>
                            <Stack direction="row" spacing={0.75}>
                                {(
                                    [
                                        ["week", "Tuần này"],
                                        ["month", "Tháng này"],
                                        ["allTime", "Mọi thời đại"],
                                    ] as [TrendingTimeFilter, string][]
                                ).map(([t, label]) => (
                                    <Chip
                                        key={t}
                                        label={label}
                                        size="small"
                                        onClick={() => setTrendingTime(t)}
                                        sx={{
                                            bgcolor:
                                                trendingTime === t
                                                    ? "action.selected"
                                                    : "transparent",
                                            color:
                                                trendingTime === t
                                                    ? "text.primary"
                                                    : "text.disabled",
                                            border: "1px solid",
                                            borderColor: "divider",
                                            fontWeight: trendingTime === t ? 700 : 400,
                                            "&:hover": { bgcolor: "action.hover" },
                                        }}
                                    />
                                ))}
                            </Stack>
                        </Box>

                        {/* Recommendations — chỉ hiện khi user đã nghe ít nhất 1 bài */}
                        {seedItem && (
                            <HScrollSection
                                title={`Vì bạn đã nghe "${formatDisplayName(seedItem.title)}"`}
                                loading={recommendationsQuery.isLoading}
                            >
                                {recommendations.map((track) => (
                                    <TrackCard
                                        key={track.id}
                                        track={track}
                                        queue={recommendations}
                                        recommendationReason={recommendationReason(track.reasons)}
                                    />
                                ))}
                            </HScrollSection>
                        )}

                        <HScrollSection title="Xu hướng" loading={trendingQuery.isLoading}>
                            {trendingTracks.map((track) => (
                                <TrackCard key={track.id} track={track} queue={trendingTracks} />
                            ))}
                        </HScrollSection>

                        <HScrollSection
                            title="Nghệ sĩ phổ biến"
                            loading={trendingArtistsQuery.isLoading}
                        >
                            {trendingArtists.map((artist) => (
                                <ArtistCard
                                    key={artist.id}
                                    artist={artist}
                                    onClick={() => selectArtist(artist)}
                                />
                            ))}
                        </HScrollSection>

                        <HScrollSection
                            title="Album mới nổi bật"
                            loading={trendingAlbumsQuery.isLoading}
                        >
                            {trendingAlbums.map((album) => (
                                <PlaylistCard
                                    key={album.id}
                                    playlist={album}
                                    onClick={() => selectPlaylist(album)}
                                />
                            ))}
                        </HScrollSection>

                        <HScrollSection
                            title="Playlist nổi bật"
                            loading={trendingPlaylistsQuery.isLoading}
                        >
                            {trendingPlaylists.map((playlist) => (
                                <PlaylistCard
                                    key={playlist.id}
                                    playlist={playlist}
                                    onClick={() => selectPlaylist(playlist)}
                                />
                            ))}
                        </HScrollSection>

                        <HScrollSection title="Underground" loading={undergroundQuery.isLoading}>
                            {undergroundTracks.map((track) => (
                                <TrackCard key={track.id} track={track} queue={undergroundTracks} />
                            ))}
                        </HScrollSection>

                        <HScrollSection title="Phát hành mới" loading={newReleasesQuery.isLoading}>
                            {(newReleasesQuery.data ?? []).map((item) => (
                                <SpotifyCollectionCard
                                    key={item.id}
                                    item={item}
                                />
                            ))}
                        </HScrollSection>

                        <HScrollSection title="Playlist nổi bật từ ban biên tập" loading={featuredPlaylistsQuery.isLoading}>
                            {(featuredPlaylistsQuery.data ?? []).map((item) => (
                                <SpotifyCollectionCard
                                    key={item.id}
                                    item={item}
                                />
                            ))}
                        </HScrollSection>

                        {/* Categories + category playlists */}
                        {(categoriesQuery.data ?? []).length > 0 && (
                            <Box sx={{ mb: 4 }}>
                                <Typography sx={{ fontWeight: 800, fontSize: 18, mb: 1.5 }}>
                                    Khám phá theo thể loại
                                </Typography>
                                <Stack direction="row" spacing={1} sx={{ mb: 2, overflowX: "auto", pb: 0.5 }}>
                                    {(categoriesQuery.data ?? []).map((cat) => (
                                        <Chip
                                            key={cat.id}
                                            label={cat.name}
                                            onClick={() => setActiveCategoryId((prev) => prev === cat.id ? null : cat.id)}
                                            sx={{
                                                flexShrink: 0,
                                                fontWeight: 700,
                                                bgcolor: activeCategoryId === cat.id ? "text.primary" : "action.selected",
                                                color: activeCategoryId === cat.id ? "background.default" : "text.primary",
                                            }}
                                        />
                                    ))}
                                </Stack>
                                {activeCategoryId && (
                                    categoryPlaylistsQuery.isLoading ? (
                                        <Stack direction="row" spacing={2}>
                                            {Array.from({ length: 6 }).map((_, i) => (
                                                <Skeleton key={i} variant="rounded" width={160} height={200} />
                                            ))}
                                        </Stack>
                                    ) : (
                                        <Box sx={{ display: "flex", gap: 2, overflowX: "auto", pb: 1, "&::-webkit-scrollbar": { height: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: 2 } }}>
                                            {(categoryPlaylistsQuery.data ?? []).map((item) => (
                                                <SpotifyCollectionCard key={item.id} item={item} />
                                            ))}
                                        </Box>
                                    )
                                )}
                            </Box>
                        )}
                    </Box>
                )}

                {/* Keep AI Music mounted so its generated journey survives menu changes. */}
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

                {/* ── SEARCH ──────────────────────────────────────────────── */}
                {view === "search" && (
                    <Box
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        {!hasSearchKeyword ? (
                            /* No keyword — show search history + recently played */
                            <Box
                                sx={{
                                    p: { xs: 2, md: 3 },
                                    overflow: "auto",
                                    flex: 1,
                                }}
                            >
                                {/* Search history chips */}
                                {(backendSearchHistoryQuery.data?.length ?? 0) > 0 && (
                                    <Box sx={{ mb: 4 }}>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                mb: 2,
                                            }}
                                        >
                                            <Typography
                                                sx={{
                                                    fontWeight: 800,
                                                    fontSize: 20,
                                                    color: "text.primary",
                                                }}
                                            >
                                                Tìm kiếm gần đây
                                            </Typography>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<DeleteOutlineIcon fontSize="small" />}
                                                onClick={() => clearSearchHistoryMutation.mutate()}
                                                disabled={clearSearchHistoryMutation.isPending}
                                                sx={{
                                                    color: "error.main",
                                                    borderColor: "error.main",
                                                    textTransform: "none",
                                                    fontSize: 13,
                                                    "&:hover": {
                                                        bgcolor: "error.main",
                                                        borderColor: "error.main",
                                                        color: "#fff",
                                                    },
                                                }}
                                            >
                                                Xóa tất cả
                                            </Button>
                                        </Box>
                                        <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap>
                                            {(backendSearchHistoryQuery.data ?? [])
                                                .slice(0, 12)
                                                .map((row) => (
                                                    <Chip
                                                        key={row.id}
                                                        label={row.keyword}
                                                        icon={<SearchIcon />}
                                                        onClick={() => setKeyword(row.keyword)}
                                                        onDelete={() =>
                                                            deleteSearchHistoryMutation.mutate(
                                                                row.id,
                                                            )
                                                        }
                                                        sx={{
                                                            bgcolor: "action.hover",
                                                            color: "text.primary",
                                                            "& .MuiChip-icon": {
                                                                color: "text.secondary",
                                                            },
                                                            "& .MuiChip-deleteIcon": {
                                                                color: "text.disabled",
                                                                "&:hover": { color: "error.main" },
                                                            },
                                                            "&:hover": {
                                                                bgcolor: "action.selected",
                                                            },
                                                        }}
                                                    />
                                                ))}
                                        </Stack>
                                    </Box>
                                )}

                                {/* Recently played */}
                                {recentItems.length > 0 && (
                                    <Box>
                                        <Typography
                                            sx={{
                                                fontWeight: 800,
                                                fontSize: 20,
                                                color: "text.primary",
                                                mb: 2,
                                            }}
                                        >
                                            Nghe gần đây
                                        </Typography>
                                        {recentItems.slice(0, 20).map((item, i) => (
                                            <MediaRow
                                                key={item.id}
                                                item={item}
                                                queue={recentItems}
                                                index={i + 1}
                                            />
                                        ))}
                                    </Box>
                                )}

                                {!backendSearchHistoryQuery.data?.length && !recentItems.length && (
                                    <Typography
                                        sx={{ color: "text.secondary", fontSize: 14, mt: 2 }}
                                    >
                                        Nhập từ khóa để tìm bài hát, nghệ sĩ hoặc playlist.
                                    </Typography>
                                )}
                            </Box>
                        ) : (
                            /* Single songs column */
                            <Box
                                sx={{
                                    flex: 1,
                                    minHeight: 0,
                                    display: "flex",
                                    flexDirection: "column",
                                    overflow: "hidden",
                                }}
                            >
                                <Box
                                    sx={{
                                        flex: 1,
                                        minHeight: 0,
                                        display: "flex",
                                        flexDirection: "column",
                                        overflow: "hidden",
                                    }}
                                >
                                    {/* Songs column */}
                                    <Box
                                        sx={{
                                            display: "flex",
                                            flexDirection: "column",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <Box
                                            ref={setTracksScrollEl}
                                            sx={{
                                                overflow: "auto",
                                                flex: 1,
                                                minHeight: 0,
                                                px: { xs: 2, md: 3 },
                                                pb: { xs: 2, md: 3 },
                                            }}
                                        >
                                            {tracksQuery.isFetching && !searchTrackItems.length ? (
                                                <Box
                                                    sx={{
                                                        py: 4,
                                                        display: "flex",
                                                        justifyContent: "center",
                                                    }}
                                                >
                                                    <CircularProgress
                                                        sx={{ color: SP_GREEN }}
                                                        size={28}
                                                    />
                                                </Box>
                                            ) : !searchTrackItems.length ? (
                                                <EmptyState
                                                    label={
                                                        hasSearchKeyword
                                                            ? "Không tìm thấy bài hát phù hợp."
                                                            : "Nhập từ khóa để tìm bài hát."
                                                    }
                                                    onRetry={
                                                        hasSearchKeyword
                                                            ? () => void tracksQuery.refetch()
                                                            : undefined
                                                    }
                                                />
                                            ) : (
                                                <>
                                                    {searchTrackItems.map((item, index) => (
                                                        <Fragment key={item.id}>
                                                            <MediaRow
                                                                item={item}
                                                                queue={searchTrackItems}
                                                                index={index + 1}
                                                            />
                                                            {index ===
                                                                searchTrackItems.length - 8 &&
                                                                tracksQuery.hasNextPage &&
                                                                !tracksQuery.isFetchingNextPage && (
                                                                    <IntersectionSentinel
                                                                        onVisible={() =>
                                                                            void tracksQuery.fetchNextPage()
                                                                        }
                                                                        root={tracksScrollEl}
                                                                    />
                                                                )}
                                                        </Fragment>
                                                    ))}
                                                    {tracksQuery.isFetchingNextPage && (
                                                        <Box
                                                            sx={{
                                                                py: 2,
                                                                display: "flex",
                                                                justifyContent: "center",
                                                            }}
                                                        >
                                                            <CircularProgress
                                                                sx={{ color: SP_GREEN }}
                                                                size={24}
                                                            />
                                                        </Box>
                                                    )}
                                                    {!tracksQuery.hasNextPage &&
                                                        searchTrackItems.length > 10 && (
                                                            <Typography
                                                                sx={{
                                                                    textAlign: "center",
                                                                    py: 2,
                                                                    fontSize: 12,
                                                                    color: "text.disabled",
                                                                }}
                                                            >
                                                                Đã hiển thị tất cả{" "}
                                                                {searchTrackItems.length} bài
                                                            </Typography>
                                                        )}
                                                </>
                                            )}
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>
                        )}
                    </Box>
                )}

                {/* ── ARTISTS ─────────────────────────────────────────────── */}
                {view === "artists" && (
                    <Box
                        ref={mainScrollRef}
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            overflow: "auto",
                            p: { xs: 2, md: 3 },
                        }}
                    >
                        {!selectedArtist && (
                            <Typography
                                sx={{ fontWeight: 800, fontSize: 20, color: "text.primary", mb: 2 }}
                            >
                                {hasSearchKeyword
                                    ? "Kết quả tìm kiếm"
                                    : "Nghệ sĩ phổ biến"}
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

                {/* ── PLAYLISTS ────────────────────────────────────────────── */}
                {view === "playlists" && (
                    <Box
                        ref={mainScrollRef}
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            overflow: "auto",
                            p: { xs: 2, md: 3 },
                        }}
                    >
                        <Typography
                            sx={{ fontWeight: 800, fontSize: 20, color: "text.primary", mb: 2 }}
                        >
                            {hasSearchKeyword
                                ? "Kết quả tìm kiếm"
                                : "Playlist và album nổi bật"}
                        </Typography>
                        <PlaylistGrid
                            playlists={
                                hasSearchKeyword
                                    ? (playlistsQuery.data ?? [])
                                    : [...trendingPlaylists, ...trendingAlbums]
                            }
                            onSelectPlaylist={selectPlaylist}
                        />
                    </Box>
                )}

                {view === "library" && (
                    <Box
                        ref={mainScrollRef}
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            overflow: "auto",
                            p: { xs: 2, md: 3 },
                        }}
                    >
                        <LibraryView initialPlaylistId={openLibraryPlaylistId} />
                    </Box>
                )}

                {/* ── LIKED SONGS ──────────────────────────────────────────── */}
                {view === "liked" && (
                    <Box
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            overflow: "auto",
                        }}
                    >
                        <Box
                            sx={{
                                p: { xs: 2, md: 3 },
                                background: (theme) =>
                                    `linear-gradient(135deg, #4B0082 0%, ${theme.palette.background.default} 100%)`,
                                display: "flex",
                                alignItems: "flex-end",
                                gap: 3,
                                minHeight: 200,
                            }}
                        >
                            <Box
                                sx={{
                                    width: 140,
                                    height: 140,
                                    borderRadius: 1,
                                    bgcolor: "#4B0082",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                                }}
                            >
                                <FavoriteIcon sx={{ fontSize: 64, color: "text.primary" }} />
                            </Box>
                            <Box>
                                <Typography
                                    sx={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: "text.primary",
                                        textTransform: "uppercase",
                                        letterSpacing: 1,
                                    }}
                                >
                                    Playlist
                                </Typography>
                                <Typography
                                    sx={{
                                        fontWeight: 900,
                                        fontSize: { xs: 28, md: 48 },
                                        color: "text.primary",
                                        lineHeight: 1.1,
                                    }}
                                >
                                    Liked Songs
                                </Typography>
                                <Typography sx={{ color: "text.secondary", fontSize: 14, mt: 1 }}>
                                    {likedItems.length} bài hát
                                </Typography>
                            </Box>
                        </Box>
                        <Box sx={{ p: { xs: 2, md: 3 } }}>
                            {likedItems.length ? (
                                likedItems.map((item, i) => (
                                    <MediaRow
                                        key={item.id}
                                        item={item}
                                        queue={likedItems}
                                        index={i + 1}
                                    />
                                ))
                            ) : (
                                <EmptyState label="Chưa có bài hát nào được thích." />
                            )}
                        </Box>
                    </Box>
                )}

                {/* ── RECENTLY PLAYED ──────────────────────────────────────── */}
                {view === "recent" && (
                    <Box
                        ref={mainScrollRef}
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            overflow: "auto",
                            p: { xs: 2, md: 3 },
                        }}
                    >
                        <Typography
                            sx={{ fontWeight: 800, fontSize: 20, color: "text.primary", mb: 2 }}
                        >
                            Nghe gần đây
                        </Typography>
                        {recentItems.length ? (
                            recentItems.map((item, i) => (
                                <MediaRow
                                    key={item.id}
                                    item={item}
                                    queue={recentItems}
                                    index={i + 1}
                                />
                            ))
                        ) : (
                            <EmptyState label="Bạn chưa phát nội dung nào." />
                        )}
                    </Box>
                )}

                {/* ── MY PLAYLISTS ─────────────────────────────────────────── */}
                {view === "my-playlists" && (
                    <Box
                        ref={mainScrollRef}
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            overflow: "auto",
                            p: { xs: 2, md: 3 },
                        }}
                    >
                        <Typography
                            sx={{ fontWeight: 800, fontSize: 20, color: "text.primary", mb: 2 }}
                        >
                            Playlists cá nhân
                        </Typography>
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1}
                            sx={{ mb: 3, maxWidth: 480 }}
                        >
                            <TextField
                                value={playlistName}
                                onChange={(e) => setPlaylistName(e.target.value)}
                                placeholder="Tên playlist mới..."
                                size="small"
                                fullWidth
                                sx={{
                                    "& .MuiOutlinedInput-root": {
                                        bgcolor: "action.hover",
                                        color: "text.primary",
                                        "& fieldset": { borderColor: "divider" },
                                        "&:hover fieldset": {
                                            borderColor: "text.secondary",
                                        },
                                        "&.Mui-focused fieldset": { borderColor: SP_GREEN },
                                        "& input::placeholder": { color: "text.disabled" },
                                    },
                                }}
                            />
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => createPlaylistMutation.mutate(playlistName.trim())}
                                disabled={!playlistName.trim() || createPlaylistMutation.isPending}
                                sx={{
                                    minHeight: 40,
                                    px: 3,
                                    bgcolor: SP_GREEN,
                                    color: "black",
                                    fontWeight: 700,
                                    whiteSpace: "nowrap",
                                    "& .MuiButton-startIcon": {
                                        mr: 1,
                                    },
                                    "&:hover": { bgcolor: "#fb923c" },
                                    "&:disabled": {
                                        bgcolor: "action.hover",
                                        color: "text.disabled",
                                    },
                                }}
                            >
                                Tạo playlist
                            </Button>
                        </Stack>

                        {!backendPlaylistsQuery.data?.length ? (
                            <EmptyState label="Chưa có playlist cá nhân." />
                        ) : (
                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                                    gap: 2,
                                }}
                            >
                                {(backendPlaylistsQuery.data ?? []).map((playlist) => (
                                    <Box
                                        key={playlist.id}
                                        onClick={() => {
                                            setOpenLibraryPlaylistId(playlist.id);
                                            setView("library");
                                        }}
                                        sx={{
                                            bgcolor: "background.paper",
                                            borderRadius: 1.5,
                                            p: 2,
                                            cursor: "pointer",
                                            "&:hover": { bgcolor: "action.selected" },
                                            transition: "background-color 0.2s",
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                width: "100%",
                                                aspectRatio: "1",
                                                bgcolor: "action.selected",
                                                borderRadius: 1,
                                                mb: 1.5,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            <LibraryMusicIcon
                                                sx={{
                                                    fontSize: 40,
                                                    color: "text.disabled",
                                                }}
                                            />
                                        </Box>
                                        <Typography
                                            noWrap
                                            sx={{
                                                fontWeight: 700,
                                                color: "text.primary",
                                                fontSize: 14,
                                            }}
                                        >
                                            {formatDisplayName(playlist.name)}
                                        </Typography>
                                        <Typography
                                            noWrap
                                            sx={{
                                                fontSize: 12,
                                                color: "text.secondary",
                                                mt: 0.25,
                                            }}
                                        >
                                            {playlist.tracks?.length ?? 0} bài · Playlist
                                        </Typography>
                                        <Button
                                            size="small"
                                            startIcon={<PlaylistPlayIcon />}
                                            disabled={
                                                !currentItem || addToPlaylistMutation.isPending
                                            }
                                            onClick={() => {
                                                if (currentItem)
                                                    addToPlaylistMutation.mutate({
                                                        playlistId: playlist.id,
                                                        item: currentItem,
                                                    });
                                            }}
                                            sx={{
                                                mt: 1,
                                                color: "text.secondary",
                                                fontSize: 11,
                                                p: 0,
                                                minWidth: 0,
                                                "&:hover": {
                                                    color: SP_GREEN,
                                                    bgcolor: "transparent",
                                                },
                                                "&:disabled": { color: "text.disabled" },
                                            }}
                                        >
                                            Thêm đang phát
                                        </Button>
                                    </Box>
                                ))}
                            </Box>
                        )}
                    </Box>
                )}

                {/* ── LEADERBOARD ──────────────────────────────────────────── */}
                {view === "leaderboard" && (
                    <Box
                        ref={mainScrollRef}
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            overflow: "auto",
                            p: { xs: 2, md: 3 },
                        }}
                    >
                        <LeaderboardView />
                    </Box>
                )}

                {/* ── STATS ────────────────────────────────────────────────── */}
                {view === "stats" && (
                    <Box
                        ref={mainScrollRef}
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            overflow: "auto",
                            p: { xs: 2, md: 3 },
                        }}
                    >
                        <ListeningStatsView />
                    </Box>
                )}

                {/* ── PROFILE ──────────────────────────────────────────────── */}
                {view === "profile" && (
                    <Box
                        ref={mainScrollRef}
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            overflow: "auto",
                            p: { xs: 2, md: 3 },
                        }}
                    >
                        <UserProfileView />
                    </Box>
                )}

                {/* ── SPOTIFY ARTIST ───────────────────────────────────────── */}
                {view === "spotify-artist" && selectedSpotifyArtist && (
                    <SpotifyArtistView
                        data={selectedSpotifyArtist}
                        onBack={() => setView("home")}
                        scrollRef={mainScrollRef}
                    />
                )}

                {/* ── SPOTIFY ALBUM ────────────────────────────────────────── */}
                {view === "spotify-album" && selectedSpotifyAlbum && (
                    <SpotifyAlbumView
                        data={selectedSpotifyAlbum}
                        onBack={() => setView("home")}
                        scrollRef={mainScrollRef}
                    />
                )}
            </Box>

            {/* ── Right Queue Panel ────────────────────────────────────── */}
            {/* Mobile/tablet: Drawer */}
            <Drawer
                anchor="right"
                open={showQueue}
                onClose={() => setShowQueue(false)}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: "block", xl: "none" },
                    "& .MuiDrawer-paper": {
                        width: QUEUE_W,
                        bgcolor: "background.default",
                        border: "none",
                    },
                }}
            >
                <QueuePanelContent
                    queue={queue}
                    spGreen={SP_GREEN}
                    onClose={() => setShowQueue(false)}
                    onClear={clearQueue}
                />
            </Drawer>

            {/* Desktop: inline queue panel */}
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
                    <QueuePanelContent
                        queue={queue}
                        spGreen={SP_GREEN}
                        onClose={() => setShowQueue(false)}
                        onClear={clearQueue}
                    />
                </Box>
            )}

            {/* ── Right Lyrics Panel ───────────────────────────────────── */}
            {/* Mobile/tablet: Drawer */}
            <Drawer
                anchor="right"
                open={showLyrics}
                onClose={() => setShowLyrics(false)}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: "block", xl: "none" },
                    "& .MuiDrawer-paper": {
                        width: LYRICS_W,
                        bgcolor: "background.default",
                        border: "none",
                    },
                }}
            >
                <LyricsPanelContent item={currentItem} onClose={() => setShowLyrics(false)} />
            </Drawer>

            {/* Desktop: inline lyrics panel */}
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

            {/* ── Right Track Info Panel ───────────────────────────────── */}
            {/* Mobile/tablet: Drawer */}
            <Drawer
                anchor="right"
                open={showTrackInfo}
                onClose={() => setShowTrackInfo(false)}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: "block", xl: "none" },
                    "& .MuiDrawer-paper": {
                        width: TRACK_INFO_W,
                        bgcolor: "background.default",
                        border: "none",
                    },
                }}
            >
                <TrackInfoPanelContent item={currentItem} onClose={() => setShowTrackInfo(false)} />
            </Drawer>

            {/* Desktop: inline track info panel */}
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
    );
}

// ─── Spotify Playlist Dialog ──────────────────────────────────────────────────
function SpotifyPlaylistDialog({
    playlist,
    tracks,
    loading,
    onClose,
}: {
    playlist: SpotifyCollectionSummary | null;
    tracks: SpotifyTrackDetail[];
    loading: boolean;
    onClose: () => void;
}) {
    const { currentItem, isPlaying, play, pause, resume } = usePlayerStore();
    const coverImage = playlist?.images?.[0] ?? "";

    const trackItems = useMemo<MediaItem[]>(
        () =>
            tracks.map((t) => ({
                id: `audio:spotify:${t.id}`,
                sourceId: `spotify:${t.id}`,
                type: "audio" as const,
                title: t.title,
                artist: t.user.name,
                artistId: t.user.id,
                thumbnail: t.artwork["480x480"] ?? t.artwork["1000x1000"] ?? t.artwork["150x150"] ?? "",
                duration: t.duration,
                provider: "spotify" as const,
                externalUrl: t.external_url,
                album: t.album?.id ? { id: t.album.id, name: t.album.name } : undefined,
            })),
        [tracks],
    );

    const { replaceQueue } = usePlayerStore();

    return (
        <Dialog
            open={Boolean(playlist)}
            onClose={onClose}
            fullWidth
            maxWidth="lg"
            slotProps={{
                paper: {
                    sx: {
                        height: { xs: "100dvh", sm: "90dvh" },
                        maxHeight: { xs: "100dvh", sm: "90dvh" },
                        m: { xs: 0, sm: 2 },
                        borderRadius: { xs: 0, sm: 3 },
                        overflow: "hidden",
                        bgcolor: "background.default",
                        backgroundImage: "linear-gradient(180deg, rgba(249,115,22,0.09), transparent 46%)",
                    },
                },
            }}
        >
            <DialogContent sx={{ p: 0, overflowY: "auto" }}>
                {/* Hero */}
                <Box
                    sx={{
                        position: "relative",
                        minHeight: { xs: 260, md: 320 },
                        display: "flex",
                        alignItems: "flex-end",
                        overflow: "hidden",
                        p: { xs: 2.5, md: 4 },
                    }}
                >
                    <Box
                        aria-hidden
                        sx={{
                            position: "absolute",
                            inset: -40,
                            backgroundImage: coverImage ? `url("${coverImage}")` : undefined,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            filter: "blur(34px) saturate(1.15)",
                            opacity: 0.55,
                            transform: "scale(1.12)",
                        }}
                    />
                    <Box
                        aria-hidden
                        sx={{
                            position: "absolute",
                            inset: 0,
                            background: "linear-gradient(180deg, rgba(18,18,18,0.12) 0%, rgba(18,18,18,0.45) 45%, #171312 100%)",
                        }}
                    />
                    <IconButton
                        onClick={onClose}
                        sx={{
                            position: "absolute",
                            zIndex: 2,
                            top: 16,
                            right: 16,
                            color: "text.primary",
                            bgcolor: "rgba(0,0,0,0.42)",
                            backdropFilter: "blur(10px)",
                            "&:hover": { bgcolor: "rgba(0,0,0,0.65)" },
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                    <Box
                        sx={{
                            position: "relative",
                            zIndex: 1,
                            display: "flex",
                            flexDirection: { xs: "column", sm: "row" },
                            alignItems: { xs: "flex-start", sm: "flex-end" },
                            gap: { xs: 2, md: 3 },
                            width: "100%",
                        }}
                    >
                        <Avatar
                            variant="rounded"
                            src={coverImage}
                            sx={{ width: { xs: 120, md: 190 }, height: { xs: 120, md: 190 }, borderRadius: 2, boxShadow: "0 22px 54px rgba(0,0,0,0.46)", flexShrink: 0 }}
                        />
                        <Box sx={{ minWidth: 0, pb: { sm: 0.5 } }}>
                            <Typography sx={{ fontSize: 12, fontWeight: 750, color: "text.secondary", mb: 0.75 }}>
                                Danh sách phát
                            </Typography>
                            <Typography component="h2" sx={{ fontSize: { xs: "clamp(1.8rem,9vw,3rem)", md: "clamp(2.5rem,5vw,4.5rem)" }, fontWeight: 950, letterSpacing: "-0.05em", lineHeight: 0.98, textWrap: "balance" }}>
                                {formatDisplayName(playlist?.name ?? "Playlist")}
                            </Typography>
                            {playlist?.description && (
                                <Typography sx={{ mt: 1.25, maxWidth: 640, fontSize: 13, color: "text.secondary", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                    {playlist.description}
                                </Typography>
                            )}
                            <Typography sx={{ mt: 1.25, fontSize: 13, color: "text.secondary" }}>
                                <Box component="span" sx={{ color: "text.primary", fontWeight: 750 }}>
                                    {playlist?.owner?.name}
                                </Box>
                                {playlist?.total_items ? ` · ${playlist.total_items} bài` : ""}
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                {/* Actions + tracks */}
                <Box sx={{ px: { xs: 1, sm: 2.5, md: 4 }, pb: 5, background: (theme: import("@mui/material").Theme) => `linear-gradient(180deg, rgba(54,31,20,0.56) 0%, ${theme.palette.background.default} 170px)` }}>
                    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ py: 2.5 }}>
                        <IconButton
                            onClick={() => replaceQueue(trackItems, 0)}
                            disabled={!trackItems.length}
                            sx={{ width: 54, height: 54, color: "background.default", bgcolor: SP_GREEN, "&:hover": { bgcolor: "#fb923c", transform: "scale(1.04)" }, "&:disabled": { bgcolor: "action.selected" }, transition: "transform 180ms ease" }}
                        >
                            <PlayArrowIcon sx={{ fontSize: 30 }} />
                        </IconButton>
                    </Stack>

                    {loading && !trackItems.length ? (
                        <LinearProgress sx={{ bgcolor: "action.selected", "& .MuiLinearProgress-bar": { bgcolor: SP_GREEN } }} />
                    ) : trackItems.length ? (
                        <Stack spacing={0.5}>
                            {trackItems.map((item, i) => {
                                const active = currentItem?.id === item.id;
                                return (
                                    <Box
                                        key={item.id}
                                        onClick={() => {
                                            if (active && isPlaying) { pause(); return; }
                                            if (active) { resume(); return; }
                                            play(item, trackItems);
                                        }}
                                        sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 1.5, py: 1, borderRadius: 1.5, cursor: "pointer", bgcolor: active ? "action.selected" : "transparent", "&:hover": { bgcolor: active ? "action.selected" : "action.hover" }, transition: "background-color 0.15s" }}
                                    >
                                        <Box sx={{ width: 24, textAlign: "right", flexShrink: 0 }}>
                                            {active && isPlaying
                                                ? <GraphicEqIcon sx={{ fontSize: 16, color: SP_GREEN }} />
                                                : <Typography sx={{ fontSize: 13, color: "text.disabled" }}>{i + 1}</Typography>
                                            }
                                        </Box>
                                        <Avatar variant="rounded" src={item.thumbnail} sx={{ width: 40, height: 40, borderRadius: 1, flexShrink: 0 }} />
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Typography noWrap sx={{ fontSize: 14, fontWeight: 600, color: active ? SP_GREEN : "text.primary" }}>
                                                {formatDisplayName(item.title)}
                                            </Typography>
                                            <Typography noWrap sx={{ fontSize: 12, color: "text.secondary" }}>
                                                {formatDisplayName(item.artist)}
                                            </Typography>
                                        </Box>
                                        <Typography sx={{ fontSize: 12, color: "text.disabled", minWidth: 36, textAlign: "right", flexShrink: 0 }}>
                                            {item.duration ? formatDuration(item.duration) : ""}
                                        </Typography>
                                    </Box>
                                );
                            })}
                        </Stack>
                    ) : (
                        <Typography sx={{ color: "text.disabled", fontSize: 13, py: 4, textAlign: "center" }}>
                            Playlist này chưa có bài hát.
                        </Typography>
                    )}
                </Box>
            </DialogContent>
        </Dialog>
    );
}
