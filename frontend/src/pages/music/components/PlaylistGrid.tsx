import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import { Avatar, Box, IconButton, Tooltip, Typography } from "@mui/material";
import type { AudiusPlaylist } from "@pages/music/types";
import { formatDisplayName } from "@pages/music/utils";
import { getPlaylistArtwork } from "@services/musicService";
import { useState } from "react";
import { LibraryToggleButton } from "./LibraryToggleButton";

export const PlaylistGrid = ({
    playlists,
    onSelectPlaylist,
}: {
    playlists: AudiusPlaylist[];
    onSelectPlaylist: (playlist: AudiusPlaylist) => void;
}) => {
    if (!playlists.length) {
        return (
            <Box sx={{ py: 6, textAlign: "center" }}>
                <PlaylistPlayIcon sx={{ fontSize: 48, color: "rgba(255,255,255,0.15)", mb: 1.5 }} />
                <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
                    Nhập từ khóa để tìm playlist.
                </Typography>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 2,
            }}
        >
            {playlists.map((playlist) => (
                <PlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    onClick={() => onSelectPlaylist(playlist)}
                />
            ))}
        </Box>
    );
};

function PlaylistCard({ playlist, onClick }: { playlist: AudiusPlaylist; onClick: () => void }) {
    const [hovered, setHovered] = useState(false);

    return (
        <Box
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            sx={{
                bgcolor: "#181818",
                borderRadius: 1.5,
                p: 1.5,
                cursor: "pointer",
                transition: "background-color 0.2s ease",
                "&:hover": { bgcolor: "#282828" },
                position: "relative",
            }}
        >
            <Box sx={{ position: "relative", mb: 1.5 }}>
                <Box
                    sx={{
                        position: "absolute",
                        zIndex: 2,
                        top: 8,
                        left: 8,
                        borderRadius: "50%",
                        bgcolor: "rgba(12,12,12,0.72)",
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
                <Avatar
                    variant="rounded"
                    src={getPlaylistArtwork(playlist)}
                    sx={{
                        width: "100%",
                        height: "auto",
                        aspectRatio: "1",
                        borderRadius: 1,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                    }}
                />
                <Tooltip title="Phát">
                    <IconButton
                        onClick={(e) => {
                            e.stopPropagation();
                            onClick();
                        }}
                        sx={{
                            position: "absolute",
                            bottom: 8,
                            right: 8,
                            bgcolor: "#f97316",
                            color: "black",
                            width: 40,
                            height: 40,
                            opacity: hovered ? 1 : 0,
                            transform: hovered ? "translateY(0)" : "translateY(8px)",
                            transition: "opacity 0.2s ease, transform 0.2s ease",
                            "&:hover": {
                                bgcolor: "#fb923c",
                                transform: "scale(1.05) translateY(0)",
                            },
                            boxShadow: "0 8px 16px rgba(0,0,0,0.4)",
                        }}
                    >
                        <PlayArrowIcon sx={{ fontSize: 22 }} />
                    </IconButton>
                </Tooltip>
            </Box>
            <Typography noWrap sx={{ fontWeight: 700, fontSize: 14, color: "white", mb: 0.25 }}>
                {formatDisplayName(playlist.playlist_name)}
            </Typography>
            <Typography noWrap sx={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                {formatDisplayName(playlist.user.name)} · {playlist.track_count ?? 0} bài
            </Typography>
        </Box>
    );
}
