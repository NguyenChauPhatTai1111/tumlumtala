import AddIcon from "@mui/icons-material/Add";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import {
    Box,
    Button,
    Divider,
    IconButton,
    Menu,
    MenuItem,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import {
    useAddToPlaylistMutation,
    useBackendPlaylistsQuery,
    useCreatePlaylistMutation,
} from "@pages/music/hooks/useMusicQueries";
import type { MediaItem } from "@pages/music/types";
import { formatDisplayName } from "@pages/music/utils";
import { useState } from "react";

export function AddToPlaylistButton({
    item,
    alwaysVisible = false,
}: {
    item: MediaItem;
    alwaysVisible?: boolean;
}) {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [name, setName] = useState("");
    const playlistsQuery = useBackendPlaylistsQuery();
    const addMutation = useAddToPlaylistMutation();
    const createMutation = useCreatePlaylistMutation(() => {});

    const addToPlaylist = (playlistId: number) => {
        addMutation.mutate({ playlistId, item }, { onSuccess: () => setAnchorEl(null) });
    };

    const createAndAdd = () => {
        const playlistName = name.trim();
        if (!playlistName) return;
        createMutation.mutate(playlistName, {
            onSuccess: (playlist) => {
                setName("");
                addToPlaylist(playlist.id);
            },
        });
    };

    return (
        <>
            <Tooltip title="Thêm vào playlist">
                <IconButton
                    size="small"
                    onClick={(event) => {
                        event.stopPropagation();
                        setAnchorEl(event.currentTarget);
                    }}
                    sx={{
                        color: alwaysVisible ? "rgba(255,255,255,0.52)" : "rgba(255,255,255,0)",
                        "&:hover": { color: "#f97316" },
                    }}
                >
                    <PlaylistAddIcon sx={{ fontSize: 18 }} />
                </IconButton>
            </Tooltip>
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                onClick={(event) => event.stopPropagation()}
                slotProps={{
                    paper: {
                        sx: {
                            width: 280,
                            maxHeight: 380,
                            color: "#fff",
                            bgcolor: "#202020",
                            border: "1px solid rgba(255,255,255,0.1)",
                        },
                    },
                }}
            >
                <Typography sx={{ px: 2, pt: 1, pb: 0.75, fontSize: 13, fontWeight: 750 }}>
                    Thêm vào playlist
                </Typography>
                {(playlistsQuery.data ?? []).map((playlist) => (
                    <MenuItem
                        key={playlist.id}
                        onClick={() => addToPlaylist(playlist.id)}
                        disabled={addMutation.isPending}
                    >
                        <Box sx={{ minWidth: 0 }}>
                            <Typography noWrap sx={{ fontSize: 13 }}>
                                {formatDisplayName(playlist.name)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.45)" }}>
                                {playlist.tracks?.length ?? 0} bài
                            </Typography>
                        </Box>
                    </MenuItem>
                ))}
                <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", my: 1 }} />
                <Box sx={{ px: 1.5, pb: 1.25 }}>
                    <TextField
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        onKeyDown={(event) => {
                            event.stopPropagation();
                            if (event.key === "Enter") createAndAdd();
                        }}
                        placeholder="Tên playlist mới"
                        size="small"
                        fullWidth
                        autoFocus={!playlistsQuery.data?.length}
                        sx={{
                            "& .MuiOutlinedInput-root": {
                                color: "#fff",
                                bgcolor: "rgba(255,255,255,0.06)",
                            },
                        }}
                    />
                    <Button
                        fullWidth
                        startIcon={<AddIcon />}
                        onClick={createAndAdd}
                        disabled={!name.trim() || createMutation.isPending}
                        sx={{
                            mt: 1,
                            color: "#111",
                            bgcolor: "#f97316",
                            fontWeight: 750,
                            textTransform: "none",
                            "&:hover": { bgcolor: "#fb923c" },
                        }}
                    >
                        Tạo và thêm bài hát
                    </Button>
                </Box>
            </Menu>
        </>
    );
}
