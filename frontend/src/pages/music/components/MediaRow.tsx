import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RadioIcon from "@mui/icons-material/Radio";
import SmartDisplayIcon from "@mui/icons-material/SmartDisplay";
import { Avatar, Box, IconButton, Tooltip, Typography } from "@mui/material";
import { useLikeMusicMutation } from "@pages/music/hooks/useMusicQueries";
import type { MediaItem } from "@pages/music/types";
import { TrackInfoButton } from "./TrackInfoDialog";
import { AddToPlaylistButton } from "./AddToPlaylistButton";
import { LibraryToggleButton } from "./LibraryToggleButton";
import { formatCompactNumber, formatDisplayName, formatDuration } from "@pages/music/utils";
import { getTrackRadio, toAudioMediaItem } from "@services/musicService";
import { usePlayerStore } from "@store/playerStore";
import { formatRelativeTimeAgo } from "@utils/dateTime";
import { useCallback, useState } from "react";

const SPOTIFY_GREEN = "#f97316";

export const MediaRow = ({
    item,
    queue,
    index,
    showCollectionColumn = false,
}: {
    item: MediaItem;
    queue: MediaItem[];
    index?: number;
    showCollectionColumn?: boolean;
}) => {
    const { currentItem, isPlaying, play, pause, resume, likedItems, replaceQueue } =
        usePlayerStore();
    const active = currentItem?.id === item.id;
    const liked = likedItems.some((entry) => entry.id === item.id);
    const [hovered, setHovered] = useState(false);
    const [radioLoading, setRadioLoading] = useState(false);
    const publishedDate = formatRelativeTimeAgo(item.publishedAt);

    const handlePlay = () => {
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

    const handleStartRadio = useCallback(
        async (e: React.MouseEvent) => {
            e.stopPropagation();
            if (item.type !== "audio" || !item.sourceId) return;
            setRadioLoading(true);
            try {
                const tracks = await getTrackRadio(item.sourceId, 30);
                if (tracks.length) replaceQueue(tracks.map(toAudioMediaItem), 0);
            } finally {
                setRadioLoading(false);
            }
        },
        [item, replaceQueue],
    );

    const likeMutation = useLikeMusicMutation(item, liked);

    return (
        <Box
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={handlePlay}
            sx={{
                display: "grid",
                gridTemplateColumns: showCollectionColumn
                    ? {
                          xs: "16px 48px minmax(0, 1fr) 28px 42px",
                          md: "16px 48px minmax(0, 1fr) minmax(140px, .6fr) 28px 28px 30px 40px 40px 42px",
                      }
                    : "16px 48px minmax(0, 1fr) 28px 28px 30px auto auto auto",
                gap: 1.5,
                alignItems: "center",
                px: 2,
                py: 0.75,
                borderRadius: 1,
                cursor: "pointer",
                bgcolor: active ? "rgba(255,255,255,0.08)" : "transparent",
                "&:hover": { bgcolor: active ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)" },
                transition: "background-color 0.15s ease",
            }}
        >
            {/* Index / Play indicator */}
            <Box
                sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 16 }}
            >
                {hovered ? (
                    <IconButton
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            handlePlay();
                        }}
                        sx={{ color: "white", p: 0, width: 16, height: 16 }}
                    >
                        {active && isPlaying ? (
                            <PauseIcon sx={{ fontSize: 16 }} />
                        ) : (
                            <PlayArrowIcon sx={{ fontSize: 16 }} />
                        )}
                    </IconButton>
                ) : active && isPlaying ? (
                    <Box
                        sx={{
                            display: "flex",
                            gap: "2px",
                            alignItems: "flex-end",
                            height: 12,
                        }}
                    >
                        {[1, 2, 3].map((i) => (
                            <Box
                                key={i}
                                sx={{
                                    width: 3,
                                    borderRadius: 0.5,
                                    bgcolor: SPOTIFY_GREEN,
                                    "@keyframes equalize": {
                                        "0%, 100%": { height: "40%" },
                                        "50%": { height: "100%" },
                                    },
                                    animation: `equalize ${0.6 + i * 0.15}s ease-in-out infinite`,
                                    animationDelay: `${i * 0.1}s`,
                                }}
                            />
                        ))}
                    </Box>
                ) : (
                    <Typography
                        sx={{
                            fontSize: 13,
                            color: active ? SPOTIFY_GREEN : "rgba(255,255,255,0.4)",
                            fontVariantNumeric: "tabular-nums",
                            lineHeight: 1,
                        }}
                    >
                        {index ?? ""}
                    </Typography>
                )}
            </Box>

            {/* Thumbnail */}
            <Avatar
                variant="rounded"
                src={item.thumbnail}
                alt={formatDisplayName(item.title)}
                sx={{ width: 40, height: 40, borderRadius: 0.5 }}
            />

            {/* Title + artist */}
            <Box sx={{ minWidth: 0 }}>
                <Typography
                    noWrap
                    sx={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: active ? SPOTIFY_GREEN : "white",
                    }}
                >
                    {formatDisplayName(item.title)}
                    {item.type === "video" && (
                        <SmartDisplayIcon
                            sx={{
                                fontSize: 12,
                                ml: 0.5,
                                verticalAlign: "middle",
                                color: "rgba(255,255,255,0.4)",
                            }}
                        />
                    )}
                </Typography>
                <Typography noWrap sx={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                    {formatDisplayName(item.artist)}
                    {item.viewCount ? ` · ${formatCompactNumber(item.viewCount)} lượt xem` : ""}
                    {publishedDate ? ` · ${publishedDate}` : ""}
                </Typography>
            </Box>

            {showCollectionColumn && (
                <Typography
                    noWrap
                    sx={{
                        display: { xs: "none", md: "block" },
                        fontSize: 12,
                        color: "rgba(255,255,255,0.46)",
                    }}
                >
                    {formatDisplayName(item.album?.name) || "Đĩa đơn"}
                </Typography>
            )}

            <Box sx={{ width: 28 }}>
                <TrackInfoButton item={item} alwaysVisible={hovered} />
            </Box>
            <Box
                sx={{
                    width: 28,
                    display: showCollectionColumn ? { xs: "none", md: "block" } : "block",
                }}
            >
                <AddToPlaylistButton item={item} alwaysVisible={hovered} />
            </Box>
            <Box
                sx={{
                    width: 30,
                    display: showCollectionColumn ? { xs: "none", md: "block" } : "block",
                }}
            >
                {item.type === "audio" && (
                    <LibraryToggleButton
                        compact
                        label="Lưu radio vào thư viện"
                        item={{
                            item_type: "radio",
                            source_id: item.sourceId,
                            title: `${item.title} Radio`,
                            subtitle: `Radio từ ${item.artist}`,
                            thumbnail: item.thumbnail,
                            metadata: { seed_track: item },
                        }}
                    />
                )}
            </Box>

            {/* Start Radio — audio only, show on hover */}
            {item.type === "audio" && (
                <Tooltip title="Bắt đầu Radio">
                    <IconButton
                        size="small"
                        onClick={handleStartRadio}
                        disabled={radioLoading}
                        sx={{
                            display: showCollectionColumn
                                ? { xs: "none", md: "inline-flex" }
                                : undefined,
                            color: "rgba(255,255,255,0)",
                            "&:hover": { color: SPOTIFY_GREEN },
                            transition: "color 0.15s ease",
                            ...(hovered && { color: "rgba(255,255,255,0.4)" }),
                        }}
                    >
                        <RadioIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Tooltip>
            )}
            {item.type === "video" && <Box />}

            {/* Like button */}
            <Tooltip title={liked ? "Bỏ thích" : "Thích"}>
                <IconButton
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        likeMutation.mutate();
                    }}
                    disabled={likeMutation.isPending}
                    sx={{
                        display: showCollectionColumn
                            ? { xs: "none", md: "inline-flex" }
                            : undefined,
                        color: liked ? SPOTIFY_GREEN : "rgba(255,255,255,0)",
                        "&:hover": { color: liked ? "#fb923c" : "rgba(255,255,255,0.7)" },
                        transition: "color 0.15s ease",
                        ...(hovered && !liked && { color: "rgba(255,255,255,0.4)" }),
                    }}
                >
                    {liked ? (
                        <FavoriteIcon sx={{ fontSize: 16 }} />
                    ) : (
                        <FavoriteBorderIcon sx={{ fontSize: 16 }} />
                    )}
                </IconButton>
            </Tooltip>

            {/* Duration */}
            <Typography
                sx={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.4)",
                    fontVariantNumeric: "tabular-nums",
                    minWidth: 36,
                    textAlign: "right",
                }}
            >
                {item.duration ? formatDuration(item.duration) : ""}
            </Typography>
        </Box>
    );
};
