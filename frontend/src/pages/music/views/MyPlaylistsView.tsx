import AddIcon from "@mui/icons-material/Add";
import LibraryMusicIcon from "@mui/icons-material/LibraryMusic";
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import { usePlayerStore } from "@store/playerStore";
import { SP_GREEN } from "../constants";
import { useMusicContext } from "../MusicContext";
import {
    useAddToPlaylistMutation,
    useBackendPlaylistsQuery,
    useCreatePlaylistMutation,
} from "../hooks/useMusicQueries";
import { formatDisplayName } from "../utils";
import { useState } from "react";

export function MyPlaylistsView({ scrollRef }: { scrollRef: React.RefObject<HTMLDivElement | null> }) {
    const { setView, setOpenLibraryPlaylistId } = useMusicContext();
    const { currentItem } = usePlayerStore();
    const [playlistName, setPlaylistName] = useState("");

    const backendPlaylistsQuery = useBackendPlaylistsQuery();
    const createPlaylistMutation = useCreatePlaylistMutation(() => setPlaylistName(""));
    const addToPlaylistMutation = useAddToPlaylistMutation();

    return (
        <Box
            ref={scrollRef}
            sx={{ flex: 1, minHeight: 0, overflow: "auto", p: { xs: 2, md: 3 } }}
        >
            <Typography sx={{ fontWeight: 800, fontSize: 20, color: "text.primary", mb: 2 }}>
                Playlists cá nhân
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 3, maxWidth: 480 }}>
                <TextField
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                    placeholder="Tên playlist mới..."
                    size="small"
                    fullWidth
                    sx={{
                        "& .MuiOutlinedInput-root": {
                            bgcolor: "action.hover",
                            color: "text.primary",
                            "& fieldset": { borderColor: "divider" },
                            "&:hover fieldset": { borderColor: "text.secondary" },
                            "&.Mui-focused fieldset": { borderColor: SP_GREEN },
                            "& input::placeholder": { color: "text.disabled" },
                        },
                    }}
                />
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => createPlaylistMutation.mutate(playlistName.trim())}
                    disabled={!playlistName.trim() || createPlaylistMutation.isPending}
                    sx={{
                        minHeight: 40,
                        px: 3,
                        bgcolor: SP_GREEN,
                        color: "black",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        "&:hover": { bgcolor: "#fb923c" },
                        "&:disabled": { bgcolor: "action.hover", color: "text.disabled" },
                    }}
                >
                    Tạo playlist
                </Button>
            </Stack>

            {!backendPlaylistsQuery.data?.length ? (
                <Typography sx={{ color: "text.disabled", fontSize: 14, py: 4, textAlign: "center" }}>
                    Chưa có playlist cá nhân.
                </Typography>
            ) : (
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                        gap: 2,
                    }}
                >
                    {(backendPlaylistsQuery.data ?? []).map((playlist) => (
                        <Box
                            key={playlist.id}
                            onClick={() => {
                                setOpenLibraryPlaylistId(playlist.id);
                                setView("library");
                            }}
                            sx={{
                                bgcolor: "background.paper",
                                borderRadius: 1.5,
                                p: 2,
                                cursor: "pointer",
                                "&:hover": { bgcolor: "action.selected" },
                                transition: "background-color 0.2s",
                            }}
                        >
                            <Box
                                sx={{
                                    width: "100%",
                                    aspectRatio: "1",
                                    bgcolor: "action.selected",
                                    borderRadius: 1,
                                    mb: 1.5,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <LibraryMusicIcon sx={{ fontSize: 40, color: "text.disabled" }} />
                            </Box>
                            <Typography noWrap sx={{ fontWeight: 700, color: "text.primary", fontSize: 14 }}>
                                {formatDisplayName(playlist.name)}
                            </Typography>
                            <Typography noWrap sx={{ fontSize: 12, color: "text.secondary", mt: 0.25 }}>
                                {playlist.tracks?.length ?? 0} bài · Playlist
                            </Typography>
                            <Button
                                size="small"
                                startIcon={<PlaylistPlayIcon />}
                                disabled={!currentItem || addToPlaylistMutation.isPending}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (currentItem)
                                        addToPlaylistMutation.mutate({ playlistId: playlist.id, item: currentItem });
                                }}
                                sx={{
                                    mt: 1,
                                    color: "text.secondary",
                                    fontSize: 11,
                                    p: 0,
                                    minWidth: 0,
                                    "&:hover": { color: SP_GREEN, bgcolor: "transparent" },
                                    "&:disabled": { color: "text.disabled" },
                                }}
                            >
                                Thêm đang phát
                            </Button>
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
}
