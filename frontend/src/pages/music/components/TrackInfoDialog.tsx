import AlbumOutlinedIcon from "@mui/icons-material/AlbumOutlined";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LyricsOutlinedIcon from "@mui/icons-material/LyricsOutlined";
import LocalMallOutlinedIcon from "@mui/icons-material/LocalMallOutlined";
import MicNoneOutlinedIcon from "@mui/icons-material/MicNoneOutlined";
import PauseIcon from "@mui/icons-material/Pause";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PlaylistPlayOutlinedIcon from "@mui/icons-material/PlaylistPlayOutlined";
import QueueMusicOutlinedIcon from "@mui/icons-material/QueueMusicOutlined";
import {
    Avatar,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import type { AudiusPlaylist, MediaItem } from "@pages/music/types";
import { formatDisplayName, formatDuration } from "@pages/music/utils";
import { usePlayerStore } from "@store/playerStore";
import {
    getAudiusProfileImage,
    getPlaylist,
    getPlaylistArtwork,
    getTrack,
} from "@services/musicService";
import {
    getSpotifyArtistDiscography,
    getSpotifyTrack,
} from "@services/musicBackendService";
import { useLyricsQuery } from "@pages/music/hooks/useMusicQueries";
import { type ReactNode, useMemo } from "react";

const ACCENT = "#f97316";

export function TrackInfoButton({
    item,
    alwaysVisible = false,
}: {
    item: MediaItem;
    alwaysVisible?: boolean;
    playQueue?: MediaItem[];
}) {
    if (item.type !== "audio") return null;

    return (
        <Tooltip title="Thông tin bài hát">
            <IconButton
                size="small"
                onClick={(event) => {
                    event.stopPropagation();
                    window.dispatchEvent(
                        new CustomEvent("music:toggle-track-info", { detail: { item } }),
                    );
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
    );
}

export function TrackInfoPanelContent({
    item,
    onClose,
}: {
    item: MediaItem | null;
    onClose: () => void;
}) {
    const isSpotify =
        item?.provider === "spotify" || Boolean(item?.sourceId.startsWith("spotify:"));
    const spotifyRawId =
        isSpotify && item ? item.sourceId.replace(/^spotify:/, "") : null;

    const { currentItem, queue, isPlaying, pause, play, resume } = usePlayerStore();

    const spotifyTrackQuery = useQuery({
        queryKey: ["music", "spotify-track-info", spotifyRawId],
        queryFn: () => getSpotifyTrack(spotifyRawId!),
        enabled: Boolean(item) && isSpotify && Boolean(spotifyRawId) && !spotifyRawId?.includes(":"),
        staleTime: 15 * 60 * 1000,
    });
    const spotifyTrack = spotifyTrackQuery.data ?? null;
    const spotifyArtistQuery = useQuery({
        queryKey: ["music", "spotify-track-artist", spotifyTrack?.user.id],
        queryFn: () => getSpotifyArtistDiscography(spotifyTrack!.user.id),
        enabled: isSpotify && Boolean(spotifyTrack?.user.id),
        staleTime: 15 * 60 * 1000,
    });
    const spotifyArtist = spotifyArtistQuery.data;

    const trackQuery = useQuery({
        queryKey: ["music", "track-info", item?.sourceId],
        queryFn: () => getTrack(item!.sourceId),
        enabled: Boolean(item) && !isSpotify,
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
        queryKey: ["music", "track-collections", item?.sourceId, collectionIds],
        queryFn: async () =>
            (await Promise.all(collectionIds.map((id) => getPlaylist(id)))).filter(
                (collection): collection is AudiusPlaylist => Boolean(collection),
            ),
        enabled: Boolean(item) && !isSpotify && collectionIds.length > 0,
        staleTime: 15 * 60 * 1000,
    });

    const displayTitle = item ? (isSpotify ? item.title : (track?.title ?? item.title)) : "";
    const displayGenre = item ? (isSpotify ? (item.genre ?? "") : (track?.genre ?? item.genre ?? "")) : "";
    const displayTags = useMemo(() => {
        if (!item) return [];
        const raw = isSpotify ? item.tags : (track?.tags ?? item.tags);
        return (
            raw
                ?.split(",")
                .map((tag) => tag.trim())
                .filter(Boolean)
                .slice(0, 6) ?? []
        );
    }, [isSpotify, item, track?.tags]);

    const albumId = track?.album_backlink ? String(track.album_backlink.playlist_id) : undefined;
    const audiusAlbum = collectionsQuery.data?.find(
        (collection) => String(collection.id) === albumId,
    );
    const playlists = (collectionsQuery.data ?? []).filter(
        (collection) => String(collection.id) !== albumId,
    );

    const spotifyArtistName = spotifyTrack?.user.name ?? item?.artist ?? "";
    const spotifyArtistId = spotifyTrack?.user.id ?? item?.artistId;
    const spotifyAlbum = spotifyTrack?.album ?? item?.album;

    const active = item ? currentItem?.id === item.id : false;
    const handlePlay = () => {
        if (!item) return;
        if (active && isPlaying) {
            pause();
            return;
        }
        if (active) {
            resume();
            return;
        }
        play(item, queue.length ? queue : [item]);
    };

    const navigateToEntity = (type: "artist" | "album" | "playlist", id?: string) => {
        if (!id) return;
        onClose();
        window.dispatchEvent(
            new CustomEvent("music:navigate-entity", {
                detail: { type, id, provider: isSpotify ? "spotify" : "audius" },
            }),
        );
    };

    const isLoading = item ? (isSpotify ? spotifyTrackQuery.isLoading : trackQuery.isLoading) : false;

    // Next in queue: tracks after current
    const currentIndex = queue.findIndex((q) => q.id === currentItem?.id);
    const nextTracks = currentIndex >= 0 ? queue.slice(currentIndex + 1, currentIndex + 4) : [];

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
                    <InfoOutlinedIcon sx={{ color: ACCENT, fontSize: 20 }} />
                    <Typography sx={{ fontWeight: 700, color: "text.primary", fontSize: 15 }}>
                        Đang phát
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

            {/* Scrollable body */}
            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
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
                            pt: 8,
                        }}
                    >
                        <InfoOutlinedIcon sx={{ fontSize: 40, color: "text.disabled" }} />
                        <Typography sx={{ color: "text.disabled", fontSize: 13 }}>
                            Phát một bài hát để xem thông tin.
                        </Typography>
                    </Box>
                ) : isLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", pt: 6 }}>
                        <CircularProgress size={28} sx={{ color: ACCENT }} />
                    </Box>
                ) : (
                    <Stack spacing={0}>
                        {/* Large artwork */}
                        <Box sx={{ px: 2.5, pt: 2.5, pb: 1 }}>
                            <Avatar
                                variant="rounded"
                                src={item.thumbnail}
                                sx={{
                                    width: "100%",
                                    height: "auto",
                                    aspectRatio: "1",
                                    borderRadius: 2,
                                    boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
                                }}
                            />
                        </Box>

                        {/* Track title + artist */}
                        <Box sx={{ px: 2.5, pt: 1.5, pb: 0.5 }}>
                            <Typography
                                component="button"
                                type="button"
                                onClick={() =>
                                    navigateToEntity(
                                        "album",
                                        isSpotify
                                            ? spotifyAlbum?.id
                                            : albumId,
                                    )
                                }
                                noWrap
                                sx={{
                                    display: "block",
                                    width: "100%",
                                    p: 0,
                                    border: 0,
                                    bgcolor: "transparent",
                                    textAlign: "left",
                                    fontWeight: 800,
                                    fontSize: 18,
                                    color: "text.primary",
                                    cursor: (isSpotify ? spotifyAlbum?.id : albumId) ? "pointer" : "default",
                                    "&:hover": {
                                        color: (isSpotify ? spotifyAlbum?.id : albumId) ? ACCENT : "text.primary",
                                        textDecoration: (isSpotify ? spotifyAlbum?.id : albumId) ? "underline" : "none",
                                    },
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {formatDisplayName(displayTitle)}
                            </Typography>
                            <Typography
                                component="button"
                                type="button"
                                onClick={() =>
                                    navigateToEntity(
                                        "artist",
                                        isSpotify
                                            ? spotifyArtistId
                                            : (track?.user?.id ?? item.artistId),
                                    )
                                }
                                noWrap
                                sx={{
                                    display: "block",
                                    width: "100%",
                                    p: 0,
                                    border: 0,
                                    bgcolor: "transparent",
                                    textAlign: "left",
                                    fontSize: 14,
                                    fontWeight: 500,
                                    color: "text.secondary",
                                    cursor: (isSpotify ? spotifyArtistId : (track?.user?.id ?? item.artistId)) ? "pointer" : "default",
                                    mt: 0.25,
                                    "&:hover": {
                                        color: "text.primary",
                                        textDecoration: "underline",
                                    },
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {formatDisplayName(
                                    isSpotify ? spotifyArtistName : (track?.user?.name ?? item.artist),
                                )}
                            </Typography>
                        </Box>

                        {/* Play button */}
                        <Box sx={{ px: 2.5, py: 1 }}>
                            <Button
                                fullWidth
                                variant={active ? "outlined" : "contained"}
                                startIcon={active && isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                                onClick={handlePlay}
                                sx={{
                                    borderRadius: 999,
                                    fontWeight: 700,
                                    color: active ? ACCENT : "black",
                                    borderColor: active ? ACCENT : undefined,
                                    bgcolor: active ? "transparent" : ACCENT,
                                    "&:hover": {
                                        borderColor: ACCENT,
                                        bgcolor: active ? "action.hover" : "#fb923c",
                                    },
                                }}
                            >
                                {active && isPlaying ? "Tạm dừng" : active ? "Phát tiếp" : "Phát bài này"}
                            </Button>
                        </Box>

                        <Divider sx={{ mx: 2.5 }} />

                        {/* Tags / genre */}
                        {(displayGenre || displayTags.length > 0) && (
                            <Box sx={{ px: 2.5, py: 1.5 }}>
                                {displayGenre && (
                                    <Typography sx={{ fontSize: 12, color: "text.disabled", mb: 0.75 }}>
                                        {displayGenre}
                                    </Typography>
                                )}
                                {displayTags.length > 0 && (
                                    <Stack direction="row" gap={0.5} flexWrap="wrap">
                                        {displayTags.map((tag) => (
                                            <Chip
                                                key={tag}
                                                label={`#${tag}`}
                                                size="small"
                                                sx={{ color: "#fed7aa", bgcolor: "rgba(249,115,22,0.12)", fontSize: 11 }}
                                            />
                                        ))}
                                    </Stack>
                                )}
                            </Box>
                        )}

                        <Divider sx={{ mx: 2.5 }} />

                        {isSpotify && spotifyArtist && (
                            <>
                                <Box sx={{ px: 2.5, py: 2 }}>
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                                        <PersonOutlineIcon sx={{ color: ACCENT, fontSize: 18 }} />
                                        <Typography sx={{ fontWeight: 700, fontSize: 13, color: "text.primary" }}>
                                            About the artist
                                        </Typography>
                                    </Stack>
                                    <Box
                                        component="button"
                                        type="button"
                                        onClick={() => navigateToEntity("artist", spotifyArtist.artist.id)}
                                        sx={{
                                            position: "relative",
                                            width: "100%",
                                            minHeight: 190,
                                            p: 1.75,
                                            border: 0,
                                            borderRadius: 2,
                                            overflow: "hidden",
                                            textAlign: "left",
                                            cursor: "pointer",
                                            background: spotifyArtist.artist.images?.[0]
                                                ? `linear-gradient(0deg, rgba(0,0,0,.9), rgba(0,0,0,.08)), url(${spotifyArtist.artist.images[0]}) center/cover`
                                                : "linear-gradient(135deg, #292524, #111827)",
                                            "&:hover": { transform: "translateY(-2px)" },
                                            transition: "transform 160ms ease",
                                        }}
                                    >
                                        <Box sx={{ position: "absolute", left: 14, right: 14, bottom: 14 }}>
                                            <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>
                                                {spotifyArtist.artist.name}
                                            </Typography>
                                            <Typography sx={{ mt: 0.25, color: "rgba(255,255,255,.72)", fontSize: 11 }}>
                                                {spotifyArtist.total} bản phát hành
                                                {spotifyArtist.artist.followers
                                                    ? ` · ${spotifyArtist.artist.followers.toLocaleString("vi-VN")} người theo dõi`
                                                    : ""}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>
                                <Divider sx={{ mx: 2.5 }} />
                            </>
                        )}

                        {/* Credits (album + playlists) */}
                        <Box sx={{ px: 2.5, py: 2 }}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                                <MicNoneOutlinedIcon sx={{ color: ACCENT, fontSize: 18 }} />
                                <Typography sx={{ fontWeight: 700, fontSize: 13, color: "text.primary" }}>
                                    Credits
                                </Typography>
                            </Stack>

                            {isSpotify ? (
                                spotifyTrack?.artists?.length ? (
                                    <Stack spacing={1}>
                                        {spotifyTrack.artists.map((artist, index) => (
                                            <CollectionRow
                                                key={artist.id}
                                                image={
                                                    artist.id === spotifyArtist?.artist.id
                                                        ? (spotifyArtist.artist.images?.[0] ?? item.thumbnail)
                                                        : item.thumbnail
                                                }
                                                name={artist.name}
                                                label={index === 0 ? "Main artist" : "Featured artist"}
                                                onClick={() => navigateToEntity("artist", artist.id)}
                                            />
                                        ))}
                                        {spotifyAlbum && (
                                            <CollectionRow
                                                image={spotifyTrack.artwork["480x480"] ?? item.thumbnail}
                                                name={spotifyAlbum.name}
                                                label="Release"
                                                onClick={spotifyAlbum.id ? () => navigateToEntity("album", spotifyAlbum.id) : undefined}
                                            />
                                        )}
                                    </Stack>
                                ) : null
                            ) : audiusAlbum || track?.album_backlink ? (
                                <CollectionRow
                                    image={audiusAlbum ? getPlaylistArtwork(audiusAlbum) : item.thumbnail}
                                    name={audiusAlbum?.playlist_name ?? track?.album_backlink?.playlist_name ?? "Album"}
                                    label="Album"
                                    onClick={() =>
                                        navigateToEntity(
                                            "album",
                                            String(audiusAlbum?.id ?? track?.album_backlink?.playlist_id ?? ""),
                                        )
                                    }
                                />
                            ) : null}

                            {/* Playlists (Audius only) */}
                            {!isSpotify && collectionsQuery.isLoading && (
                                <CircularProgress size={16} sx={{ color: ACCENT, mt: 1 }} />
                            )}
                            {!isSpotify && playlists.length > 0 && (
                                <Stack spacing={1} sx={{ mt: audiusAlbum || track?.album_backlink ? 1 : 0 }}>
                                    {playlists.map((playlist) => (
                                        <CollectionRow
                                            key={playlist.id}
                                            image={getPlaylistArtwork(playlist)}
                                            name={playlist.playlist_name}
                                            label={`Playlist · ${playlist.track_count ?? 0} bài`}
                                            onClick={() => navigateToEntity("playlist", String(playlist.id))}
                                        />
                                    ))}
                                </Stack>
                            )}

                            {isSpotify && !spotifyTrack?.artists?.length && (
                                <Typography variant="body2" sx={{ color: "text.disabled", fontSize: 12 }}>
                                    Không có thông tin credits.
                                </Typography>
                            )}
                            {!isSpotify && !audiusAlbum && !track?.album_backlink && playlists.length === 0 && !collectionsQuery.isLoading && (
                                <Typography variant="body2" sx={{ color: "text.disabled", fontSize: 12 }}>
                                    Không có thông tin credits.
                                </Typography>
                            )}
                        </Box>

                        {isSpotify && (
                            <>
                                <Divider sx={{ mx: 2.5 }} />
                                <Box sx={{ px: 2.5, py: 2 }}>
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                                        <LocalMallOutlinedIcon sx={{ color: ACCENT, fontSize: 18 }} />
                                        <Typography sx={{ fontWeight: 700, fontSize: 13, color: "text.primary" }}>
                                            Merch
                                        </Typography>
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
                                        <Typography sx={{ fontSize: 12, color: "text.secondary", lineHeight: 1.5 }}>
                                            Danh mục merch chưa được Spotify Web API cung cấp.
                                        </Typography>
                                    </Box>
                                </Box>
                            </>
                        )}

                        {/* Next in queue */}
                        {nextTracks.length > 0 && (
                            <>
                                <Divider sx={{ mx: 2.5 }} />
                                <Box sx={{ px: 2.5, py: 2 }}>
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                                        <QueueMusicOutlinedIcon sx={{ color: ACCENT, fontSize: 18 }} />
                                        <Typography sx={{ fontWeight: 700, fontSize: 13, color: "text.primary" }}>
                                            Tiếp theo trong danh sách
                                        </Typography>
                                    </Stack>
                                    <Stack spacing={0.5}>
                                        {nextTracks.map((q) => (
                                            <Box
                                                key={q.id}
                                                sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 1.25,
                                                    py: 0.5,
                                                    borderRadius: 1,
                                                    cursor: "pointer",
                                                    "&:hover": { bgcolor: "action.hover" },
                                                    transition: "background-color 150ms ease",
                                                    px: 0.75,
                                                }}
                                                onClick={() => play(q, queue)}
                                            >
                                                <Avatar
                                                    variant="rounded"
                                                    src={q.thumbnail}
                                                    sx={{ width: 36, height: 36, borderRadius: 1, flexShrink: 0 }}
                                                />
                                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                                    <Typography noWrap sx={{ fontSize: 13, fontWeight: 600, color: "text.primary" }}>
                                                        {formatDisplayName(q.title)}
                                                    </Typography>
                                                    <Typography noWrap sx={{ fontSize: 11, color: "text.secondary" }}>
                                                        {formatDisplayName(q.artist)}
                                                    </Typography>
                                                </Box>
                                                {q.duration && (
                                                    <Typography sx={{ fontSize: 11, color: "text.disabled", flexShrink: 0 }}>
                                                        {formatDuration(q.duration)}
                                                    </Typography>
                                                )}
                                            </Box>
                                        ))}
                                    </Stack>
                                </Box>
                            </>
                        )}
                    </Stack>
                )}
            </Box>
        </Box>
    );
}

/** @deprecated use TrackInfoPanelContent instead — kept for backward compat */
export function TrackInfoDialog({
    item,
    open,
    onClose,
}: {
    item: MediaItem;
    open: boolean;
    onClose: () => void;
    playQueue?: MediaItem[];
}) {
    if (!open) return null;
    return <TrackInfoPanelContent item={item} onClose={onClose} />;
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
