import AddIcon from "@mui/icons-material/Add";
import AlbumOutlinedIcon from "@mui/icons-material/AlbumOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LibraryAddCheckIcon from "@mui/icons-material/LibraryAddCheck";
import LibraryAddIcon from "@mui/icons-material/LibraryAdd";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import RadioIcon from "@mui/icons-material/Radio";
import {
    alpha,
    Box,
    Button,
    Divider,
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    TextField,
    Tooltip,
    useTheme,
} from "@mui/material";
import {
    useAddLibraryItemMutation,
    useAddToPlaylistMutation,
    useBackendPlaylistsQuery,
    useCreatePlaylistMutation,
    useLikeMusicMutation,
    useMusicLibraryQuery,
    useRemoveLibraryItemMutation,
} from "@pages/music/hooks/useMusicQueries";
import type { MediaItem } from "@pages/music/types";
import { formatDisplayName } from "@pages/music/utils";
import { getTrack, getTrackRadio, toAudioMediaItem } from "@services/musicService";
import { usePlayerStore } from "@store/playerStore";
import { useState } from "react";
import { TrackInfoDialog } from "./TrackInfoDialog";

export function TrackOptionsButton({
    item,
    alwaysVisible = false,
}: {
    item: MediaItem;
    alwaysVisible?: boolean;
}) {
    const theme = useTheme();
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [playlistMode, setPlaylistMode] = useState(false);
    const [playlistName, setPlaylistName] = useState("");
    const [radioLoading, setRadioLoading] = useState(false);
    const [infoOpen, setInfoOpen] = useState(false);
    const { likedItems, replaceQueue } = usePlayerStore();
    const liked = likedItems.some((entry) => entry.id === item.id);
    const likeMutation = useLikeMusicMutation(item, liked);
    const playlistsQuery = useBackendPlaylistsQuery();
    const addToPlaylistMutation = useAddToPlaylistMutation();
    const createPlaylistMutation = useCreatePlaylistMutation(() => {});
    const libraryQuery = useMusicLibraryQuery();
    const addLibraryMutation = useAddLibraryItemMutation();
    const removeLibraryMutation = useRemoveLibraryItemMutation();
    const savedRadio = libraryQuery.data?.find(
        (entry) => entry.item_type === "radio" && entry.source_id === item.sourceId,
    );
    const isAudio = item.type === "audio";

    const closeMenu = () => {
        setAnchorEl(null);
        setPlaylistMode(false);
    };

    const addToPlaylist = (playlistId: number) => {
        addToPlaylistMutation.mutate({ playlistId, item }, { onSuccess: closeMenu });
    };

    const createAndAdd = () => {
        const name = playlistName.trim();
        if (!name) return;
        createPlaylistMutation.mutate(name, {
            onSuccess: (playlist) => {
                setPlaylistName("");
                addToPlaylist(playlist.id);
            },
        });
    };

    const resolveTrack = async () => {
        if (!isAudio) return null;
        return getTrack(item.sourceId);
    };

    const navigateToArtist = async () => {
        const artistId = item.artistId ?? (await resolveTrack())?.user.id;
        if (!artistId) return;
        closeMenu();
        window.dispatchEvent(
            new CustomEvent("music:navigate-entity", {
                detail: { type: "artist", id: artistId },
            }),
        );
    };

    const navigateToAlbum = async () => {
        const albumId =
            item.album?.id ?? String((await resolveTrack())?.album_backlink?.playlist_id ?? "");
        if (!albumId) return;
        closeMenu();
        window.dispatchEvent(
            new CustomEvent("music:navigate-entity", {
                detail: { type: "album", id: albumId },
            }),
        );
    };

    const startRadio = async () => {
        if (!isAudio) return;
        setRadioLoading(true);
        try {
            const tracks = await getTrackRadio(item.sourceId, 30);
            if (tracks.length) {
                replaceQueue(tracks.map(toAudioMediaItem), 0);
                closeMenu();
            }
        } finally {
            setRadioLoading(false);
        }
    };

    const toggleSavedRadio = () => {
        if (savedRadio) {
            removeLibraryMutation.mutate(savedRadio.id, { onSuccess: closeMenu });
            return;
        }
        addLibraryMutation.mutate(
            {
                item_type: "radio",
                source_id: item.sourceId,
                title: `${item.title} Radio`,
                subtitle: `Radio từ ${item.artist}`,
                thumbnail: item.thumbnail,
                metadata: { seed_track: item },
            },
            { onSuccess: closeMenu },
        );
    };

    return (
        <>
            <Tooltip
                title="Tuỳ chọn khác"
                slotProps={{
                    tooltip: {
                        sx: {
                            bgcolor:
                                theme.palette.mode === "light"
                                    ? alpha(theme.palette.primary.main, 0.92)
                                    : "grey.900",
                            color:
                                theme.palette.mode === "light"
                                    ? theme.palette.primary.contrastText
                                    : "common.white",
                            boxShadow:
                                theme.palette.mode === "light"
                                    ? `0 10px 24px ${alpha(theme.palette.primary.main, 0.18)}`
                                    : undefined,
                        },
                    },
                }}
            >
                <IconButton
                    size="small"
                    aria-label={`Tuỳ chọn cho ${item.title}`}
                    onClick={(event) => {
                        event.stopPropagation();
                        setAnchorEl(event.currentTarget);
                    }}
                    sx={{
                        color:
                            alwaysVisible && theme.palette.mode === "light"
                                ? alpha(theme.palette.text.primary, 0.8)
                                : alwaysVisible
                                  ? "text.secondary"
                                  : "text.disabled",
                        "&:hover": {
                            color:
                                theme.palette.mode === "light"
                                    ? "primary.main"
                                    : "text.primary",
                        },
                    }}
                >
                    <MoreHorizIcon sx={{ fontSize: 20 }} />
                </IconButton>
            </Tooltip>
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={closeMenu}
                onClick={(event) => event.stopPropagation()}
                slotProps={{
                    paper: {
                        sx: {
                            width: 328,
                            maxWidth: "calc(100vw - 16px)",
                            maxHeight: 430,
                            color: "text.primary",
                            bgcolor:
                                theme.palette.mode === "light"
                                    ? alpha(theme.palette.background.default, 0.98)
                                    : "background.paper",
                            border: "1px solid",
                            borderColor:
                                theme.palette.mode === "light"
                                    ? alpha(theme.palette.primary.main, 0.16)
                                    : "divider",
                            boxShadow:
                                theme.palette.mode === "light"
                                    ? `0 22px 44px ${alpha(theme.palette.primary.main, 0.14)}`
                                    : "0 18px 45px rgba(0,0,0,0.55)",
                            "& .MuiMenuItem-root": {
                                minHeight: 48,
                                px: 2,
                                borderRadius: 0.75,
                                mx: 0.75,
                                "&:hover": {
                                    bgcolor:
                                        theme.palette.mode === "light"
                                            ? alpha(theme.palette.primary.main, 0.08)
                                            : undefined,
                                },
                            },
                            "& .MuiListItemIcon-root": {
                                minWidth: 44,
                                color: "text.secondary",
                            },
                            "& .MuiListItemIcon-root svg": {
                                fontSize: 19,
                            },
                            "& .MuiListItemText-primary": {
                                fontSize: 14,
                                fontWeight: 600,
                                lineHeight: 1.35,
                            },
                        },
                    },
                }}
            >
                {playlistMode ? (
                    <Box>
                        <MenuItem onClick={() => setPlaylistMode(false)}>
                            <ListItemIcon>
                                <ArrowBackIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Chọn danh sách phát" />
                        </MenuItem>
                        <Divider sx={{ my: 0.5 }} />
                        {(playlistsQuery.data ?? []).map((playlist) => (
                            <MenuItem
                                key={playlist.id}
                                onClick={() => addToPlaylist(playlist.id)}
                                disabled={addToPlaylistMutation.isPending}
                            >
                                <ListItemIcon>
                                    <PlaylistAddIcon fontSize="small" />
                                </ListItemIcon>
                                <ListItemText
                                    primary={formatDisplayName(playlist.name)}
                                    secondary={`${playlist.tracks?.length ?? 0} bài`}
                                    slotProps={{
                                        secondary: { sx: { color: "text.secondary" } },
                                    }}
                                />
                            </MenuItem>
                        ))}
                        <Box sx={{ px: 1.5, pt: 1, pb: 0.75 }}>
                            <TextField
                                value={playlistName}
                                onChange={(event) => setPlaylistName(event.target.value)}
                                onKeyDown={(event) => {
                                    event.stopPropagation();
                                    if (event.key === "Enter") createAndAdd();
                                }}
                                placeholder="Tên playlist mới"
                                size="small"
                                fullWidth
                                sx={{
                                    "& .MuiOutlinedInput-root": {
                                        color: "text.primary",
                                        bgcolor: "action.hover",
                                    },
                                }}
                            />
                            <Button
                                fullWidth
                                startIcon={<AddIcon />}
                                onClick={createAndAdd}
                                disabled={!playlistName.trim() || createPlaylistMutation.isPending}
                                sx={{
                                    mt: 1,
                                    minHeight: 42,
                                    px: 2.25,
                                    color: "background.default",
                                    bgcolor: "#f97316",
                                    fontWeight: 750,
                                    textTransform: "none",
                                    "& .MuiButton-startIcon": {
                                        mr: 1.25,
                                    },
                                    "&:hover": { bgcolor: "#fb923c" },
                                }}
                            >
                                Tạo và thêm
                            </Button>
                        </Box>
                    </Box>
                ) : (
                    <Box>
                        <MenuItem onClick={() => setPlaylistMode(true)}>
                            <ListItemIcon>
                                <PlaylistAddIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Thêm vào danh sách phát" />
                            <ChevronRightIcon
                                sx={{
                                    ml: 1.5,
                                    fontSize: 18,
                                    color: "text.secondary",
                                }}
                            />
                        </MenuItem>
                        <MenuItem
                            onClick={() => {
                                likeMutation.mutate();
                                closeMenu();
                            }}
                            disabled={likeMutation.isPending}
                        >
                            <ListItemIcon>
                                {liked ? (
                                    <FavoriteIcon fontSize="small" />
                                ) : (
                                    <FavoriteBorderIcon fontSize="small" />
                                )}
                            </ListItemIcon>
                            <ListItemText
                                primary={
                                    liked
                                        ? "Xóa khỏi Bài hát đã thích"
                                        : "Thêm vào Bài hát đã thích"
                                }
                            />
                        </MenuItem>
                        {isAudio && (
                            <MenuItem onClick={toggleSavedRadio}>
                                <ListItemIcon>
                                    {savedRadio ? (
                                        <LibraryAddCheckIcon fontSize="small" />
                                    ) : (
                                        <LibraryAddIcon fontSize="small" />
                                    )}
                                </ListItemIcon>
                                <ListItemText
                                    primary={
                                        savedRadio
                                            ? "Xóa radio khỏi thư viện"
                                            : "Lưu radio vào thư viện"
                                    }
                                />
                            </MenuItem>
                        )}
                        <Divider sx={{ my: 0.5 }} />
                        {isAudio && (
                            <MenuItem onClick={() => void startRadio()} disabled={radioLoading}>
                                <ListItemIcon>
                                    <RadioIcon fontSize="small" />
                                </ListItemIcon>
                                <ListItemText
                                    primary={
                                        radioLoading
                                            ? "Đang tạo radio..."
                                            : "Chuyển đến radio theo bài hát"
                                    }
                                />
                            </MenuItem>
                        )}
                        {isAudio && (
                            <MenuItem onClick={() => void navigateToArtist()}>
                                <ListItemIcon>
                                    <PersonOutlineIcon fontSize="small" />
                                </ListItemIcon>
                                <ListItemText primary="Chuyển tới nghệ sĩ" />
                            </MenuItem>
                        )}
                        {isAudio && (
                            <MenuItem onClick={() => void navigateToAlbum()}>
                                <ListItemIcon>
                                    <AlbumOutlinedIcon fontSize="small" />
                                </ListItemIcon>
                                <ListItemText primary="Chuyển đến album" />
                            </MenuItem>
                        )}
                        {isAudio && (
                            <MenuItem
                                onClick={() => {
                                    closeMenu();
                                    setInfoOpen(true);
                                }}
                            >
                                <ListItemIcon>
                                    <InfoOutlinedIcon fontSize="small" />
                                </ListItemIcon>
                                <ListItemText primary="Xem thông tin bài hát" />
                            </MenuItem>
                        )}
                    </Box>
                )}
            </Menu>
            {isAudio && (
                <TrackInfoDialog item={item} open={infoOpen} onClose={() => setInfoOpen(false)} />
            )}
        </>
    );
}
