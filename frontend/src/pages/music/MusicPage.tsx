import AddIcon from "@mui/icons-material/Add";
import AlbumIcon from "@mui/icons-material/Album";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import LyricsOutlinedIcon from "@mui/icons-material/LyricsOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
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
    Divider,
    Drawer,
    IconButton,
    InputAdornment,
    Skeleton,
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
import {
    getAudiusProfileImage,
    getPlaylist,
    getPlaylistArtwork,
    getUser,
    toAudioMediaItem,
    toVideoMediaItem,
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
import { LyricsPanelContent, TrackInfoDialog } from "./components/TrackInfoDialog";
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
    useVideosQuery,
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
    | "stats";

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
    const [infoOpen, setInfoOpen] = useState(false);

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
        setInfoOpen(true);
    };

    return (
        <>
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
                    <Box sx={{ position: "relative", mb: 1.5 }}>
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
            <TrackInfoDialog
                item={item}
                open={infoOpen}
                onClose={() => setInfoOpen(false)}
                playQueue={queueItems}
            />
        </>
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
                    queue.map((item) => <QueueItem key={item.id} item={item} queue={queue} />)
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

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MusicPage() {
    useSmartQueueAutofill();
    const { mode, toggleMode } = useThemeMode();
    const [view, setView] = useState<MusicView>("home");
    const [keyword, setKeyword] = useState("");
    const [showQueue, setShowQueue] = useState(false);
    const [showLyrics, setShowLyrics] = useState(false);
    const [playlistName, setPlaylistName] = useState("");
    const [selectedArtist, setSelectedArtist] = useState<AudiusUser | null>(null);
    const [selectedPlaylist, setSelectedPlaylist] = useState<AudiusPlaylist | null>(null);
    const [openLibraryPlaylistId, setOpenLibraryPlaylistId] = useState<number | undefined>();
    const [trendingGenre, setTrendingGenre] = useState<TrendingGenre>("All");
    const [trendingTime, setTrendingTime] = useState<TrendingTimeFilter>("week");
    const [searchTab, setSearchTab] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Separate scroll containers for search columns (state so IntersectionSentinel re-renders with correct root)
    const mainScrollRef = useRef<HTMLDivElement | null>(null);
    const [tracksScrollEl, setTracksScrollEl] = useState<HTMLDivElement | null>(null);
    const [videosScrollEl, setVideosScrollEl] = useState<HTMLDivElement | null>(null);

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
    const hasYouTubeKey = Boolean(import.meta.env.VITE_YOUTUBE_API_KEY);

    // Queries
    const trendingQuery = useTrendingQuery({ genre: trendingGenre, time: trendingTime });
    const trendingArtistsQuery = useTrendingArtistsQuery();
    const trendingPlaylistsQuery = useTrendingPlaylistsQuery();
    const trendingAlbumsQuery = useTrendingAlbumsQuery();
    const undergroundQuery = useUndergroundTrendingQuery();

    // Seed = bài nghe gần nhất (audio từ bất kỳ provider, không phải YouTube video)
    const seedItem = recentItems.find((i) => i.type === "audio");
    const recommendationsQuery = useRecommendationsQuery(seedItem?.sourceId);
    const artistRadioQuery = useArtistRadioQuery(selectedArtist);
    const tracksQuery = useTracksQuery(searchKeyword, view === "search" && hasSearchKeyword);
    const videosQuery = useVideosQuery(
        searchKeyword,
        view === "search" && hasSearchKeyword && hasYouTubeKey,
    );
    const artistsQuery = useArtistsQuery(searchKeyword, view === "artists" && hasSearchKeyword);
    const playlistsQuery = usePlaylistsQuery(
        searchKeyword,
        view === "playlists" && hasSearchKeyword,
    );
    const playlistTracksQuery = usePlaylistTracksQuery(selectedPlaylist?.id);
    const artistTracksQuery = useArtistTracksQuery(selectedArtist?.id);
    const artistAlbumsQuery = useArtistAlbumsQuery(selectedArtist?.id);
    const artistPlaylistsQuery = useArtistPlaylistsQuery(selectedArtist?.id);
    const backendLikedQuery = useBackendLikedQuery();
    const backendRecentQuery = useBackendRecentQuery();
    const backendSearchHistoryQuery = useBackendSearchHistoryQuery();
    const backendPlaylistsQuery = useBackendPlaylistsQuery();

    // Prefetch lyrics khi phát bài mới — kết quả được cache, panel hiển thị ngay
    useLyricsQuery(currentItem);

    const createPlaylistMutation = useCreatePlaylistMutation(() => setPlaylistName(""));
    const deleteSearchHistoryMutation = useDeleteSearchHistoryMutation();
    const clearSearchHistoryMutation = useClearSearchHistoryMutation();
    const addToPlaylistMutation = useAddToPlaylistMutation();

    useEffect(() => {
        const handleEntityNavigation = (event: Event) => {
            const { type, id } = (
                event as CustomEvent<{ type?: "artist" | "album" | "playlist"; id?: string }>
            ).detail;
            if (!id) return;

            if (type === "artist") {
                void getUser(id).then((artist) => {
                    if (!artist) return;
                    setSelectedArtist(artist);
                    setView("artists");
                });
                return;
            }

            if (type === "album" || type === "playlist") {
                void getPlaylist(id).then((playlist) => {
                    if (playlist) setSelectedPlaylist(playlist);
                });
            }
        };

        window.addEventListener("music:navigate-entity", handleEntityNavigation);
        return () => window.removeEventListener("music:navigate-entity", handleEntityNavigation);
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
    const searchVideoItems = useMemo(
        () => (videosQuery.data?.pages.flatMap((p) => p.videos) ?? []).map(toVideoMediaItem),
        [videosQuery.data],
    );
    const playlistTracks = useMemo(
        () => playlistTracksQuery.data?.pages.flat() ?? [],
        [playlistTracksQuery.data],
    );

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

                        <HScrollSection title="Trending" loading={trendingQuery.isLoading}>
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
                                    onClick={() => {
                                        setSelectedArtist(artist);
                                        setView("artists");
                                    }}
                                />
                            ))}
                        </HScrollSection>

                        <HScrollSection
                            title="Albums nổi bật"
                            loading={trendingAlbumsQuery.isLoading}
                        >
                            {trendingAlbums.map((album) => (
                                <PlaylistCard
                                    key={album.id}
                                    playlist={album}
                                    onClick={() => setSelectedPlaylist(album)}
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
                                    onClick={() => setSelectedPlaylist(playlist)}
                                />
                            ))}
                        </HScrollSection>

                        <HScrollSection title="Underground" loading={undergroundQuery.isLoading}>
                            {undergroundTracks.map((track) => (
                                <TrackCard key={track.id} track={track} queue={undergroundTracks} />
                            ))}
                        </HScrollSection>
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
                            /* Two independent scrollable columns */
                            <Box
                                sx={{
                                    flex: 1,
                                    minHeight: 0,
                                    display: "flex",
                                    flexDirection: "column",
                                    overflow: "hidden",
                                }}
                            >
                                {/* Mobile tab switcher — hidden on lg+ */}
                                <Tabs
                                    value={searchTab}
                                    onChange={(_, v: number) => setSearchTab(v)}
                                    sx={{
                                        display: { xs: "flex", lg: "none" },
                                        flexShrink: 0,
                                        px: 2,
                                        borderBottom: "1px solid",
                                        borderColor: "divider",
                                        "& .MuiTab-root": {
                                            color: "text.secondary",
                                            fontSize: 13,
                                            fontWeight: 600,
                                            textTransform: "none",
                                            minHeight: 40,
                                        },
                                        "& .Mui-selected": { color: "text.primary" },
                                        "& .MuiTabs-indicator": { bgcolor: SP_GREEN, height: 2 },
                                    }}
                                >
                                    <Tab
                                        label={`Bài hát${searchTrackItems.length ? ` (${searchTrackItems.length})` : ""}`}
                                    />
                                    <Tab
                                        label={`Videos YouTube${searchVideoItems.length ? ` (${searchVideoItems.length})` : ""}`}
                                    />
                                </Tabs>

                                <Box
                                    sx={{
                                        flex: 1,
                                        minHeight: 0,
                                        display: "grid",
                                        gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
                                        overflow: "hidden",
                                    }}
                                >
                                    {/* Songs column */}
                                    <Box
                                        sx={{
                                            display: {
                                                xs: searchTab === 0 ? "flex" : "none",
                                                lg: "flex",
                                            },
                                            flexDirection: "column",
                                            overflow: "hidden",
                                            borderRight: { lg: "1px solid" },
                                            borderColor: { lg: "divider" },
                                        }}
                                    >
                                        <Typography
                                            sx={{
                                                fontWeight: 800,
                                                fontSize: 20,
                                                color: "text.primary",
                                                px: { xs: 2, md: 3 },
                                                pt: { xs: 2, md: 3 },
                                                pb: 2,
                                                flexShrink: 0,
                                                bgcolor: "background.default",
                                                display: { xs: "none", lg: "block" },
                                            }}
                                        >
                                            Bài hát
                                        </Typography>
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

                                    {/* Videos column */}
                                    <Box
                                        sx={{
                                            display: {
                                                xs: searchTab === 1 ? "flex" : "none",
                                                lg: "flex",
                                            },
                                            flexDirection: "column",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <Typography
                                            sx={{
                                                fontWeight: 800,
                                                fontSize: 20,
                                                color: "text.primary",
                                                px: { xs: 2, md: 3 },
                                                pt: { xs: 2, md: 3 },
                                                pb: 2,
                                                flexShrink: 0,
                                                bgcolor: "background.default",
                                                display: { xs: "none", lg: "block" },
                                            }}
                                        >
                                            Videos YouTube
                                        </Typography>
                                        <Box
                                            ref={setVideosScrollEl}
                                            sx={{
                                                overflow: "auto",
                                                flex: 1,
                                                minHeight: 0,
                                                px: { xs: 2, md: 3 },
                                                pb: { xs: 2, md: 3 },
                                            }}
                                        >
                                            {videosQuery.isFetching && !searchVideoItems.length ? (
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
                                            ) : !searchVideoItems.length ? (
                                                <EmptyState
                                                    label={
                                                        hasSearchKeyword
                                                            ? "Không tìm thấy video YouTube."
                                                            : "Nhập từ khóa để tìm video."
                                                    }
                                                    onRetry={
                                                        hasSearchKeyword && hasYouTubeKey
                                                            ? () => void videosQuery.refetch()
                                                            : undefined
                                                    }
                                                />
                                            ) : (
                                                <>
                                                    {searchVideoItems.map((item, index) => (
                                                        <Fragment key={item.id}>
                                                            <MediaRow
                                                                item={item}
                                                                queue={searchVideoItems}
                                                                index={index + 1}
                                                            />
                                                            {index ===
                                                                searchVideoItems.length - 5 &&
                                                                videosQuery.hasNextPage &&
                                                                !videosQuery.isFetchingNextPage && (
                                                                    <IntersectionSentinel
                                                                        onVisible={() =>
                                                                            void videosQuery.fetchNextPage()
                                                                        }
                                                                        root={videosScrollEl}
                                                                    />
                                                                )}
                                                        </Fragment>
                                                    ))}
                                                    {videosQuery.isFetchingNextPage && (
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
                                                    {!videosQuery.hasNextPage &&
                                                        searchVideoItems.length > 5 && (
                                                            <Typography
                                                                sx={{
                                                                    textAlign: "center",
                                                                    py: 2,
                                                                    fontSize: 12,
                                                                    color: "text.disabled",
                                                                }}
                                                            >
                                                                Đã hiển thị tất cả{" "}
                                                                {searchVideoItems.length} video
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
                                {hasSearchKeyword ? "Kết quả tìm kiếm" : "Nghệ sĩ phổ biến hôm nay"}
                            </Typography>
                        )}
                        <ArtistsPanel
                            artists={hasSearchKeyword ? (artistsQuery.data ?? []) : trendingArtists}
                            selectedArtist={selectedArtist}
                            onSelectArtist={setSelectedArtist}
                            artistTracks={artistTracksQuery.data ?? []}
                            artistAlbums={artistAlbumsQuery.data ?? []}
                            artistPlaylists={artistPlaylistsQuery.data ?? []}
                            artistRadioTracks={artistRadioTracks}
                            artistRadioLoading={artistRadioQuery.isLoading}
                            onSelectPlaylist={setSelectedPlaylist}
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
                            {hasSearchKeyword ? "Kết quả tìm kiếm" : "Playlists nổi bật hôm nay"}
                        </Typography>
                        <PlaylistGrid
                            playlists={
                                hasSearchKeyword
                                    ? (playlistsQuery.data ?? [])
                                    : [...trendingPlaylists, ...trendingAlbums]
                            }
                            onSelectPlaylist={setSelectedPlaylist}
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
