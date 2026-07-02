import CloseIcon from "@mui/icons-material/Close";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import {
    Avatar,
    Box,
    IconButton,
    LinearProgress,
    Stack,
    Typography,
} from "@mui/material";
import { useMemo } from "react";
import { usePlayerStore } from "@store/playerStore";
import { SP_GREEN } from "../constants";
import { decodeHtmlEntities } from "@services/musicService";
import { formatDisplayName } from "../utils";
import type { SpotifyCollectionSummary, SpotifyTrackDetail } from "@services/musicBackendService";
import type { MediaItem } from "../types";
import { LibraryToggleButton } from "../components/LibraryToggleButton";
import { MediaRow } from "../components/MediaRow";

export function SpotifyPlaylistPanelContent({
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
    const { replaceQueue } = usePlayerStore();
    const coverImage = playlist?.images?.[0] ?? "";

    const trackItems = useMemo<MediaItem[]>(
        () =>
            tracks.map((t) => ({
                id: `audio:spotify:${t.id}`,
                sourceId: `spotify:${t.id}`,
                type: "audio" as const,
                title: decodeHtmlEntities(t.title),
                artist: decodeHtmlEntities(t.user.name),
                artistId: t.user.id,
                thumbnail: t.artwork["480x480"] ?? t.artwork["1000x1000"] ?? t.artwork["150x150"] ?? "",
                duration: t.duration,
                provider: "spotify" as const,
                externalUrl: t.external_url,
                album: t.album?.id ? { id: t.album.id, name: t.album.name } : undefined,
            })),
        [tracks],
    );

    return (
        <Box sx={{ height: "100%", overflowY: "auto" }}>
            {/* Hero */}
            <Box
                sx={{
                    position: "relative",
                    minHeight: 240,
                    display: "flex",
                    alignItems: "flex-end",
                    overflow: "hidden",
                    p: 2.5,
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
                        top: 12,
                        right: 12,
                        color: "text.primary",
                        bgcolor: "rgba(0,0,0,0.42)",
                        backdropFilter: "blur(10px)",
                        "&:hover": { bgcolor: "rgba(0,0,0,0.65)" },
                    }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
                <Box
                    sx={{
                        position: "relative",
                        zIndex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: 2,
                        width: "100%",
                    }}
                >
                    <Avatar
                        variant="rounded"
                        src={coverImage}
                        sx={{ width: 140, height: 140, borderRadius: 2, boxShadow: "0 22px 54px rgba(0,0,0,0.46)", flexShrink: 0 }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 750, color: "text.secondary", mb: 0.75 }}>
                            {playlist?.type === "album" ? "Album" : "Danh sách phát"}
                        </Typography>
                        <Typography component="h2" sx={{ fontSize: "clamp(1.6rem, 5vw, 2.2rem)", fontWeight: 950, letterSpacing: "-0.045em", lineHeight: 1.05, textWrap: "balance" }}>
                            {formatDisplayName(decodeHtmlEntities(playlist?.name ?? "Playlist"))}
                        </Typography>
                        {playlist?.description && (
                            <Typography sx={{ mt: 1.25, fontSize: 13, color: "text.secondary", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                {decodeHtmlEntities(playlist.description)}
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
            <Box sx={{ px: 1.5, pb: 5, background: (theme: import("@mui/material").Theme) => `linear-gradient(180deg, rgba(54,31,20,0.56) 0%, ${theme.palette.background.default} 170px)` }}>
                <Stack direction="row" alignItems="center" spacing={1.25} sx={{ py: 2.5 }}>
                    <IconButton
                        onClick={() => replaceQueue(trackItems, 0)}
                        disabled={!trackItems.length}
                        sx={{ width: 48, height: 48, color: "background.default", bgcolor: SP_GREEN, "&:hover": { bgcolor: "#fb923c", transform: "scale(1.04)" }, "&:disabled": { bgcolor: "action.selected" }, transition: "transform 180ms ease" }}
                    >
                        <PlayArrowIcon sx={{ fontSize: 26 }} />
                    </IconButton>
                    {playlist && (
                        <LibraryToggleButton
                            item={{
                                item_type: playlist.type,
                                source_id: playlist.id,
                                title: playlist.name,
                                subtitle: `${playlist.type === "album" ? "Album" : "Playlist"} · ${playlist.owner?.name ?? ""}`,
                                thumbnail: coverImage,
                                metadata: { playlist },
                            }}
                        />
                    )}
                </Stack>

                {loading && !trackItems.length ? (
                    <LinearProgress sx={{ bgcolor: "action.selected", "& .MuiLinearProgress-bar": { bgcolor: SP_GREEN } }} />
                ) : trackItems.length ? (
                    <Stack spacing={0.5}>
                        {trackItems.map((item, i) => (
                            <MediaRow key={item.id} item={item} queue={trackItems} index={i + 1} />
                        ))}
                    </Stack>
                ) : (
                    <Typography sx={{ color: "text.disabled", fontSize: 13, py: 4, textAlign: "center" }}>
                        Playlist này chưa có bài hát.
                    </Typography>
                )}
            </Box>
        </Box>
    );
}
