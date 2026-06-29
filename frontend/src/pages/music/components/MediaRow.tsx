import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SmartDisplayIcon from "@mui/icons-material/SmartDisplay";
import { Avatar, Box, IconButton, Tooltip, Typography } from "@mui/material";
import { useLikeMusicMutation } from "@pages/music/hooks/useMusicQueries";
import type { MediaItem } from "@pages/music/types";
import { formatCompactNumber, formatDisplayName, formatDuration } from "@pages/music/utils";
import { usePlayerStore } from "@store/playerStore";
import { formatRelativeTimeAgo } from "@utils/dateTime";
import { useState } from "react";
import { TrackOptionsButton } from "./TrackOptionsButton";

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
    const { currentItem, isPlaying, play, pause, resume, likedItems } = usePlayerStore();
    const active = currentItem?.id === item.id;
    const liked = likedItems.some((entry) => entry.id === item.id);
    const likeMutation = useLikeMusicMutation(item, liked);
    const [hovered, setHovered] = useState(false);
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

    return (
        <Box
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={handlePlay}
            sx={{
                display: "grid",
                gridTemplateColumns: showCollectionColumn
                    ? {
                          xs: "16px 48px minmax(0, 1fr) 32px 42px 34px",
                          md: "16px 48px minmax(0, 1fr) minmax(140px, .6fr) 32px 42px 34px",
                      }
                    : "16px 48px minmax(0, 1fr) 32px 42px 34px",
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

            <Tooltip title={liked ? "Xóa khỏi Bài hát đã thích" : "Thêm vào Bài hát đã thích"}>
                <IconButton
                    size="small"
                    aria-label={liked ? "Xóa khỏi Bài hát đã thích" : "Thêm vào Bài hát đã thích"}
                    onClick={(event) => {
                        event.stopPropagation();
                        likeMutation.mutate();
                    }}
                    disabled={likeMutation.isPending}
                    sx={{
                        width: 32,
                        height: 32,
                        color: liked
                            ? SPOTIFY_GREEN
                            : hovered
                              ? "rgba(255,255,255,0.68)"
                              : "rgba(255,255,255,0.38)",
                        transition: "color 160ms ease, transform 160ms ease",
                        "&:hover": {
                            color: liked ? "#fb923c" : "#fff",
                            transform: "scale(1.06)",
                        },
                        "&:active": { transform: "scale(0.96)" },
                        "&.Mui-focusVisible": {
                            outline: "2px solid rgba(249,115,22,0.75)",
                            outlineOffset: 1,
                        },
                    }}
                >
                    {liked ? (
                        <CheckCircleIcon sx={{ fontSize: 18 }} />
                    ) : (
                        <AddCircleOutlineIcon sx={{ fontSize: 18 }} />
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

            <Box sx={{ width: 34 }}>
                <TrackOptionsButton item={item} alwaysVisible={hovered} />
            </Box>
        </Box>
    );
};
