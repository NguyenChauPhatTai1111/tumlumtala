import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import QueueMusicIcon from "@mui/icons-material/QueueMusic";
import SmartDisplayIcon from "@mui/icons-material/SmartDisplay";
import { Avatar, Box, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { usePlayerStore } from "@store/playerStore";
import { SP_GREEN } from "../constants";
import { formatDisplayName, formatDuration } from "../utils";
import type { MediaItem } from "../types";

function QueueItem({ item, queue }: { item: MediaItem; queue: MediaItem[] }) {
    const { currentItem, isPlaying, play, pause, resume } = usePlayerStore();
    const active = currentItem?.id === item.id;
    const handleClick = () => {
        if (active && isPlaying) { pause(); return; }
        if (active) { resume(); return; }
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

export function QueuePanelContent({
    queue,
    onClose,
    onClear,
}: {
    queue: MediaItem[];
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
                    <QueueMusicIcon sx={{ color: SP_GREEN, fontSize: 20 }} />
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
