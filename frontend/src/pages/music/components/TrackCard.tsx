import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { Avatar, Box, IconButton, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import { toAudioMediaItem } from "@services/musicService";
import { usePlayerStore } from "@store/playerStore";
import { TrackOptionsButton } from "./TrackOptionsButton";
import {
    MUSIC_3D_CARD_SX,
    MUSIC_CARD_HOVER_SX,
    MUSIC_CARD_SURFACE_SX,
    MUSIC_CONTROL_OVERLAY_SX,
    SP_GREEN,
} from "../constants";
import { formatDisplayName } from "../utils";
import type { AudiusTrack } from "../types";

export function TrackCard({
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
        if (active && isPlaying) { pause(); return; }
        if (active) { resume(); return; }
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
