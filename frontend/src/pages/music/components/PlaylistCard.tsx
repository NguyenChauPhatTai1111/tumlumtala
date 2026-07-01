import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { Avatar, Box, Typography } from "@mui/material";
import { useState } from "react";
import { getPlaylistArtwork } from "@services/musicService";
import { LibraryToggleButton } from "./LibraryToggleButton";
import {
    MUSIC_3D_CARD_SX,
    MUSIC_CARD_HOVER_SX,
    MUSIC_CARD_SURFACE_SX,
    MUSIC_CONTROL_OVERLAY_SX,
    SP_GREEN,
} from "../constants";
import { formatDisplayName } from "../utils";
import type { AudiusPlaylist } from "../types";

export function PlaylistCard({ playlist, onClick }: { playlist: AudiusPlaylist; onClick: () => void }) {
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
