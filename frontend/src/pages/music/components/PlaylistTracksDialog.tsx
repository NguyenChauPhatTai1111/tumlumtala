import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CloseIcon from "@mui/icons-material/Close";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import {
    Avatar,
    Box,
    IconButton,
    LinearProgress,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import { Fragment, useMemo } from "react";
import { LOAD_MORE_TRIGGER_INDEX } from "@pages/music/constants";
import type { AudiusPlaylist, AudiusTrack } from "@pages/music/types";
import { formatDisplayName } from "@pages/music/utils";
import { getPlaylistArtwork, toAudioMediaItem } from "@services/musicService";
import { usePlayerStore } from "@store/playerStore";
import { EmptyState } from "./EmptyState";
import { IntersectionSentinel } from "./IntersectionSentinel";
import { MediaRow } from "./MediaRow";
import { LibraryToggleButton } from "./LibraryToggleButton";

const ACCENT = "#f97316";

export const PlaylistTracksPanelContent = ({
    playlist,
    tracks,
    loading,
    hasNextPage,
    isFetchingNextPage,
    pageCount,
    onLoadMore,
    onClose,
}: {
    playlist: AudiusPlaylist | null;
    tracks: AudiusTrack[];
    loading: boolean;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    pageCount: number;
    onLoadMore: () => void;
    onClose: () => void;
}) => {
    const queue = useMemo(() => tracks.map(toAudioMediaItem), [tracks]);
    const totalDuration = useMemo(
        () => tracks.reduce((total, track) => total + (track.duration ?? 0), 0),
        [tracks],
    );
    const { replaceQueue } = usePlayerStore();
    const artwork = playlist ? getPlaylistArtwork(playlist) : "";

    return (
        <Box sx={{ height: "100%", overflowY: "auto", color: "text.primary" }}>
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
                        backgroundImage: artwork ? `url("${artwork}")` : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        filter: "blur(34px) saturate(1.15)",
                        opacity: 0.58,
                        transform: "scale(1.12)",
                    }}
                />
                <Box
                    aria-hidden
                    sx={{
                        position: "absolute",
                        inset: 0,
                        background:
                            "linear-gradient(180deg, rgba(18,18,18,0.12) 0%, rgba(18,18,18,0.45) 45%, #171312 100%)",
                    }}
                />
                <IconButton
                    aria-label="Đóng"
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
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: 2,
                    }}
                >
                    <Avatar
                        variant="rounded"
                        src={artwork}
                        alt={formatDisplayName(playlist?.playlist_name)}
                        sx={{
                            width: 140,
                            height: 140,
                            borderRadius: 2,
                            boxShadow: "0 22px 54px rgba(0,0,0,0.46)",
                            flexShrink: 0,
                        }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                        <Typography
                            sx={{
                                fontSize: 12,
                                fontWeight: 750,
                                color: "text.secondary",
                                mb: 0.75,
                            }}
                        >
                            {playlist?.is_album ? "Album" : "Danh sách phát công khai"}
                        </Typography>
                        <Typography
                            component="h2"
                            sx={{
                                fontSize: "clamp(1.6rem, 5vw, 2.2rem)",
                                fontWeight: 950,
                                letterSpacing: "-0.045em",
                                lineHeight: 1.05,
                                textWrap: "balance",
                            }}
                        >
                            {formatDisplayName(playlist?.playlist_name ?? "Playlist")}
                        </Typography>
                        {playlist?.description && (
                            <Typography
                                sx={{
                                    mt: 1.25,
                                    fontSize: 13,
                                    color: "text.secondary",
                                    display: "-webkit-box",
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                }}
                            >
                                {playlist.description}
                            </Typography>
                        )}
                        <Typography sx={{ mt: 1.25, fontSize: 13, color: "text.secondary" }}>
                            <Box
                                component="span"
                                sx={{ color: "text.primary", fontWeight: 750 }}
                            >
                                {formatDisplayName(playlist?.user.name)}
                            </Box>
                            {" · "}
                            {playlist?.track_count ?? tracks.length} bài
                            {totalDuration > 0 ? ` · ${formatLongDuration(totalDuration)}` : ""}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            <Box
                sx={{
                    minHeight: "50%",
                    px: 1.5,
                    pb: 5,
                    background: (theme: import("@mui/material").Theme) =>
                        `linear-gradient(180deg, rgba(54,31,20,0.56) 0%, ${theme.palette.background.default} 170px)`,
                }}
            >
                <Stack direction="row" alignItems="center" spacing={1.25} sx={{ py: 2.5 }}>
                    <IconButton
                        aria-label="Phát playlist"
                        onClick={() => replaceQueue(queue, 0)}
                        disabled={!queue.length}
                        sx={{
                            width: 48,
                            height: 48,
                            color: "background.default",
                            bgcolor: ACCENT,
                            "&:hover": { bgcolor: "#fb923c", transform: "scale(1.04)" },
                            "&:disabled": { bgcolor: "action.selected" },
                            transition: "transform 180ms ease",
                        }}
                    >
                        <PlayArrowIcon sx={{ fontSize: 26 }} />
                    </IconButton>
                    <Tooltip title="Tuỳ chọn khác">
                        <IconButton sx={{ color: "text.secondary" }}>
                            <MoreHorizIcon />
                        </IconButton>
                    </Tooltip>
                    {playlist && (
                        <LibraryToggleButton
                            item={{
                                item_type: playlist.is_album ? "album" : "playlist",
                                source_id: playlist.id,
                                title: playlist.playlist_name,
                                subtitle: `${playlist.is_album ? "Album" : "Playlist"} · ${playlist.user.name}`,
                                thumbnail: artwork,
                                metadata: { playlist },
                            }}
                        />
                    )}
                </Stack>

                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        px: 2,
                        pb: 1,
                        mb: 0.5,
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        color: "text.disabled",
                    }}
                >
                    <Typography variant="caption" sx={{ flex: 1 }}>
                        Tiêu đề
                    </Typography>
                    <AccessTimeIcon sx={{ fontSize: 16 }} />
                </Box>

                {loading && !queue.length ? (
                    <LinearProgress
                        sx={{
                            bgcolor: "action.selected",
                            "& .MuiLinearProgress-bar": { bgcolor: ACCENT },
                        }}
                    />
                ) : queue.length ? (
                    <Box>
                        {queue.map((item, index) => (
                            <Fragment key={`${item.id}-${index}`}>
                                <MediaRow item={item} queue={queue} index={index + 1} />
                                {index === LOAD_MORE_TRIGGER_INDEX &&
                                    hasNextPage &&
                                    !isFetchingNextPage && (
                                        <IntersectionSentinel onVisible={onLoadMore} />
                                    )}
                            </Fragment>
                        ))}
                        {isFetchingNextPage && <LinearProgress sx={{ mt: 1 }} />}
                        {!hasNextPage && pageCount > 1 && (
                            <Typography
                                variant="body2"
                                textAlign="center"
                                sx={{ py: 2, color: "text.disabled" }}
                            >
                                Bạn đã xem hết toàn bộ kết quả
                            </Typography>
                        )}
                    </Box>
                ) : (
                    <EmptyState label="Playlist này chưa có bài hát hoặc Audius chưa trả tracks." />
                )}
            </Box>
        </Box>
    );
};

function formatLongDuration(seconds: number) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (!hours) return `${minutes} phút`;
    return `${hours} giờ ${minutes} phút`;
}
