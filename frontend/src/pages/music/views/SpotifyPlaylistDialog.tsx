import CloseIcon from "@mui/icons-material/Close";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import {
    Avatar,
    Box,
    Dialog,
    DialogContent,
    IconButton,
    LinearProgress,
    Stack,
    Typography,
} from "@mui/material";
import { useMemo } from "react";
import { usePlayerStore } from "@store/playerStore";
import { SP_GREEN } from "../constants";
import { formatDisplayName, formatDuration } from "../utils";
import type { SpotifyCollectionSummary, SpotifyTrackDetail } from "@services/musicBackendService";
import type { MediaItem } from "../types";

export function SpotifyPlaylistDialog({
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
    const { currentItem, isPlaying, play, pause, resume, replaceQueue } = usePlayerStore();
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
