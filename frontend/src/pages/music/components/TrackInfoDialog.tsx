import AlbumOutlinedIcon from "@mui/icons-material/AlbumOutlined";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LyricsOutlinedIcon from "@mui/icons-material/LyricsOutlined";
import PauseIcon from "@mui/icons-material/Pause";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PlaylistPlayOutlinedIcon from "@mui/icons-material/PlaylistPlayOutlined";
import {
    Avatar,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import type { AudiusPlaylist, MediaItem } from "@pages/music/types";
import { formatDisplayName } from "@pages/music/utils";
import { usePlayerStore } from "@store/playerStore";
import {
    getAudiusProfileImage,
    getPlaylist,
    getPlaylistArtwork,
    getTrack,
} from "@services/musicService";
import { useLyricsQuery } from "@pages/music/hooks/useMusicQueries";
import { type ReactNode, useMemo, useState } from "react";

const ACCENT = "#f97316";

export function TrackInfoButton({
    item,
    alwaysVisible = false,
    playQueue,
}: {
    item: MediaItem;
    alwaysVisible?: boolean;
    playQueue?: MediaItem[];
}) {
    const [infoOpen, setInfoOpen] = useState(false);

    if (item.type !== "audio") return null;

    return (
        <>
            <Tooltip title="Thông tin bài hát">
                <IconButton
                    size="small"
                    onClick={(event) => {
                        event.stopPropagation();
                        setInfoOpen(true);
                    }}
                    sx={{
                        color: alwaysVisible ? "text.secondary" : "transparent",
                        "&:hover": { color: ACCENT },
                        ".MuiBox-root:hover &": {
                            color: "text.secondary",
                        },
                    }}
                >
                    <InfoOutlinedIcon sx={{ fontSize: 17 }} />
                </IconButton>
            </Tooltip>
            <TrackInfoDialog
                item={item}
                open={infoOpen}
                onClose={() => setInfoOpen(false)}
                playQueue={playQueue}
            />
        </>
    );
}

export function TrackInfoDialog({
    item,
    open,
    onClose,
    playQueue,
}: {
    item: MediaItem;
    open: boolean;
    onClose: () => void;
    playQueue?: MediaItem[];
}) {
    const { currentItem, isPlaying, pause, play, resume } = usePlayerStore();
    const trackQuery = useQuery({
        queryKey: ["music", "track-info", item.sourceId],
        queryFn: () => getTrack(item.sourceId),
        enabled: open,
        staleTime: 15 * 60 * 1000,
    });
    const track = trackQuery.data;
    const collectionIds = useMemo(
        () =>
            [track?.album_backlink?.playlist_id, ...(track?.playlists_containing_track ?? [])]
                .filter((id): id is string | number => id !== undefined && id !== null)
                .map(String)
                .filter((id, index, all) => all.indexOf(id) === index),
        [track],
    );
    const collectionsQuery = useQuery({
        queryKey: ["music", "track-collections", item.sourceId, collectionIds],
        queryFn: async () =>
            (await Promise.all(collectionIds.map((id) => getPlaylist(id)))).filter(
                (collection): collection is AudiusPlaylist => Boolean(collection),
            ),
        enabled: open && collectionIds.length > 0,
        staleTime: 15 * 60 * 1000,
    });
    const albumId = track?.album_backlink ? String(track.album_backlink.playlist_id) : undefined;
    const album = collectionsQuery.data?.find((collection) => String(collection.id) === albumId);
    const playlists = (collectionsQuery.data ?? []).filter(
        (collection) => String(collection.id) !== albumId,
    );
    const tags = track?.tags
        ?.split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 8);
    const active = currentItem?.id === item.id;
    const handlePlay = () => {
        if (active && isPlaying) {
            pause();
            return;
        }
        if (active) {
            resume();
            return;
        }
        play(item, playQueue?.length ? playQueue : [item]);
    };
    const navigateToEntity = (type: "artist" | "album" | "playlist", id?: string) => {
        if (!id) return;
        onClose();
        window.dispatchEvent(
            new CustomEvent("music:navigate-entity", {
                detail: { type, id },
            }),
        );
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            slotProps={{
                paper: {
                    sx: {
                        color: "text.primary",
                        bgcolor: "background.paper",
                        backgroundImage:
                            "radial-gradient(circle at 12% 0%, rgba(249,115,22,0.12), transparent 38%)",
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 3,
                    },
                },
            }}
        >
            <DialogTitle sx={{ pb: 1, fontWeight: 800 }}>Thông tin bài hát</DialogTitle>
            <DialogContent>
                {trackQuery.isLoading ? (
                    <Box sx={{ minHeight: 240, display: "grid", placeItems: "center" }}>
                        <CircularProgress size={28} sx={{ color: ACCENT }} />
                    </Box>
                ) : (
                    <Stack spacing={2.5}>
                        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                            <Avatar
                                variant="rounded"
                                src={item.thumbnail}
                                sx={{ width: 88, height: 88, borderRadius: 2 }}
                            />
                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="h6" fontWeight={800} noWrap>
                                    {formatDisplayName(track?.title ?? item.title)}
                                </Typography>
                                <Typography sx={{ color: "text.secondary" }}>
                                    {track?.genre || item.genre || "Chưa có thể loại"}
                                </Typography>
                                <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ mt: 1 }}>
                                    {tags?.map((tag) => (
                                        <Chip
                                            key={tag}
                                            label={`#${tag}`}
                                            size="small"
                                            sx={{
                                                color: "#fed7aa",
                                                bgcolor: "rgba(249,115,22,0.12)",
                                            }}
                                        />
                                    ))}
                                </Stack>
                                <Button
                                    variant={active ? "outlined" : "contained"}
                                    startIcon={active && isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                                    onClick={handlePlay}
                                    sx={{
                                        mt: 1.5,
                                        minHeight: 40,
                                        px: 2,
                                        borderRadius: 999,
                                        fontWeight: 700,
                                        color: active ? "primary.main" : "primary.contrastText",
                                        borderColor: active ? "primary.main" : undefined,
                                        bgcolor: active ? "transparent" : ACCENT,
                                        "&:hover": {
                                            borderColor: "primary.main",
                                            bgcolor: active ? "action.hover" : "#fb923c",
                                        },
                                    }}
                                >
                                    {active && isPlaying
                                        ? "Tạm dừng"
                                        : active
                                          ? "Phát tiếp"
                                          : "Phát bài này"}
                                </Button>
                            </Box>
                        </Box>

                        <InfoSection icon={<PersonOutlineIcon />} title="Nghệ sĩ">
                            <Box
                                component="button"
                                type="button"
                                onClick={() =>
                                    navigateToEntity("artist", track?.user?.id ?? item.artistId)
                                }
                                disabled={!track?.user?.id && !item.artistId}
                                sx={{
                                    width: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1.25,
                                    p: 0,
                                    color: "inherit",
                                    font: "inherit",
                                    textAlign: "left",
                                    border: 0,
                                    bgcolor: "transparent",
                                    cursor:
                                        track?.user?.id || item.artistId ? "pointer" : "default",
                                    borderRadius: 1,
                                    transition: "background-color 160ms ease",
                                    "&:hover:not(:disabled)": {
                                        bgcolor: "action.hover",
                                    },
                                    "&:focus-visible": {
                                        outline: "2px solid rgba(249,115,22,0.75)",
                                        outlineOffset: 4,
                                    },
                                }}
                            >
                                <Avatar
                                    src={
                                        track?.user ? getAudiusProfileImage(track.user) : undefined
                                    }
                                    sx={{ width: 46, height: 46 }}
                                />
                                <Box>
                                    <Typography fontWeight={700}>
                                        {formatDisplayName(track?.user?.name ?? item.artist)}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        sx={{ color: "text.secondary" }}
                                    >
                                        @{track?.user?.handle ?? item.artistHandle ?? "unknown"}
                                        {track?.user?.follower_count !== undefined
                                            ? ` · ${track.user.follower_count.toLocaleString("vi-VN")} người theo dõi`
                                            : ""}
                                    </Typography>
                                </Box>
                            </Box>
                            {track?.user?.bio && (
                                <Typography
                                    variant="body2"
                                    sx={{
                                        mt: 1.25,
                                        color: "text.secondary",
                                        lineHeight: 1.6,
                                    }}
                                >
                                    {track.user.bio}
                                </Typography>
                            )}
                        </InfoSection>

                        <InfoSection icon={<AlbumOutlinedIcon />} title="Album">
                            {album || track?.album_backlink ? (
                                <CollectionRow
                                    image={album ? getPlaylistArtwork(album) : item.thumbnail}
                                    name={
                                        album?.playlist_name ??
                                        track?.album_backlink?.playlist_name ??
                                        "Album"
                                    }
                                    label="Album"
                                    onClick={() =>
                                        navigateToEntity(
                                            "album",
                                            String(
                                                album?.id ??
                                                    track?.album_backlink?.playlist_id ??
                                                    "",
                                            ),
                                        )
                                    }
                                />
                            ) : (
                                <EmptyMetadata label="Bài hát này không thuộc album nào." />
                            )}
                        </InfoSection>

                        <InfoSection icon={<PlaylistPlayOutlinedIcon />} title="Playlist">
                            {collectionsQuery.isLoading ? (
                                <CircularProgress size={20} sx={{ color: ACCENT }} />
                            ) : playlists.length ? (
                                <Stack spacing={1}>
                                    {playlists.map((playlist) => (
                                        <CollectionRow
                                            key={playlist.id}
                                            image={getPlaylistArtwork(playlist)}
                                            name={playlist.playlist_name}
                                            label={`${playlist.track_count ?? 0} bài`}
                                            onClick={() =>
                                                navigateToEntity("playlist", String(playlist.id))
                                            }
                                        />
                                    ))}
                                </Stack>
                            ) : (
                                <EmptyMetadata label="Chưa có playlist công khai chứa bài hát này." />
                            )}
                        </InfoSection>
                    </Stack>
                )}
            </DialogContent>
        </Dialog>
    );
}

// ─── Lyrics panel content (dùng trong right panel + mobile drawer) ────────────

export function LyricsPanelContent({
    item,
    onClose,
}: {
    item: MediaItem | null;
    onClose: () => void;
}) {
    const lyricsQuery = useLyricsQuery(item);
    const lyrics = lyricsQuery.data;

    return (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {/* Header */}
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
                    <LyricsOutlinedIcon sx={{ color: ACCENT, fontSize: 20 }} />
                    <Typography sx={{ fontWeight: 700, color: "text.primary", fontSize: 15 }}>
                        Lời bài hát
                    </Typography>
                </Stack>
                <Tooltip title="Đóng">
                    <IconButton
                        size="small"
                        onClick={onClose}
                        sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Track info strip */}
            {item && (
                <Box
                    sx={{
                        px: 2.5,
                        py: 1.5,
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        flexShrink: 0,
                    }}
                >
                    <Avatar
                        variant="rounded"
                        src={item.thumbnail}
                        sx={{ width: 40, height: 40, borderRadius: 1, flexShrink: 0 }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                        <Typography
                            noWrap
                            sx={{ fontSize: 13, fontWeight: 700, color: "text.primary" }}
                        >
                            {formatDisplayName(item.title)}
                        </Typography>
                        <Typography
                            noWrap
                            sx={{ fontSize: 11, color: "text.secondary" }}
                        >
                            {formatDisplayName(item.artist)}
                        </Typography>
                    </Box>
                </Box>
            )}

            {/* Lyrics body */}
            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    px: 2.5,
                    py: 2,
                    pb: "var(--persistent-music-player-height, 90px)",
                    "&::-webkit-scrollbar": { width: 4 },
                    "&::-webkit-scrollbar-thumb": {
                        bgcolor: "rgba(249,115,22,0.35)",
                        borderRadius: 2,
                    },
                }}
            >
                {!item ? (
                    <Box
                        sx={{
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 1,
                        }}
                    >
                        <LyricsOutlinedIcon sx={{ fontSize: 40, color: "text.disabled" }} />
                        <Typography sx={{ color: "text.disabled", fontSize: 13 }}>
                            Phát một bài hát để xem lời.
                        </Typography>
                    </Box>
                ) : lyricsQuery.isLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", pt: 6 }}>
                        <CircularProgress size={28} sx={{ color: ACCENT }} />
                    </Box>
                ) : !lyrics || lyrics.lines.length === 0 ? (
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 1,
                            pt: 6,
                        }}
                    >
                        <LyricsOutlinedIcon sx={{ fontSize: 36, color: "text.disabled" }} />
                        <Typography
                            sx={{
                                color: "text.disabled",
                                fontSize: 13,
                                textAlign: "center",
                            }}
                        >
                            Bài hát này chưa có lời.
                        </Typography>
                    </Box>
                ) : (
                    <Stack spacing={0.25}>
                        {lyrics.lines.map((line, index) => (
                            <Typography
                                key={index}
                                sx={{
                                    color: line.text ? "text.primary" : "transparent",
                                    lineHeight: 1.85,
                                    fontSize: 14,
                                }}
                            >
                                {line.text || " "}
                            </Typography>
                        ))}
                    </Stack>
                )}
            </Box>
        </Box>
    );
}

function InfoSection({
    icon,
    title,
    children,
}: {
    icon: ReactNode;
    title: string;
    children: ReactNode;
}) {
    return (
        <Box>
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
                <Box sx={{ color: ACCENT, display: "flex" }}>{icon}</Box>
                <Typography fontWeight={750}>{title}</Typography>
            </Stack>
            <Box
                sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: "action.hover",
                    border: "1px solid",
                    borderColor: "divider",
                }}
            >
                {children}
            </Box>
        </Box>
    );
}

function CollectionRow({
    image,
    name,
    label,
    onClick,
}: {
    image: string;
    name: string;
    label: string;
    onClick?: () => void;
}) {
    return (
        <Box
            component={onClick ? "button" : "div"}
            type={onClick ? "button" : undefined}
            onClick={onClick}
            sx={{
                width: "100%",
                display: "flex",
                gap: 1.25,
                alignItems: "center",
                p: 0,
                color: "inherit",
                font: "inherit",
                textAlign: "left",
                border: 0,
                bgcolor: "transparent",
                cursor: onClick ? "pointer" : "default",
                borderRadius: 1,
                transition: "background-color 160ms ease, transform 160ms ease",
                "&:hover": onClick
                    ? {
                          bgcolor: "action.hover",
                          transform: "translateX(3px)",
                      }
                    : undefined,
                "&:focus-visible": {
                    outline: "2px solid rgba(249,115,22,0.75)",
                    outlineOffset: 3,
                },
            }}
        >
            <Avatar variant="rounded" src={image} sx={{ width: 44, height: 44, borderRadius: 1 }} />
            <Box sx={{ minWidth: 0 }}>
                <Typography noWrap fontWeight={650}>
                    {formatDisplayName(name)}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {label}
                </Typography>
            </Box>
        </Box>
    );
}

function EmptyMetadata({ label }: { label: string }) {
    return (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {label}
        </Typography>
    );
}
