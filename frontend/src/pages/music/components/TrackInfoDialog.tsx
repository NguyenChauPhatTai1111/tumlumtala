import AlbumOutlinedIcon from "@mui/icons-material/AlbumOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import PlaylistPlayOutlinedIcon from "@mui/icons-material/PlaylistPlayOutlined";
import {
    Avatar,
    Box,
    Chip,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import type { AudiusPlaylist, MediaItem } from "@pages/music/types";
import { formatDisplayName } from "@pages/music/utils";
import {
    getAudiusProfileImage,
    getPlaylist,
    getPlaylistArtwork,
    getTrack,
} from "@services/musicService";
import { type ReactNode, useMemo, useState } from "react";

const ACCENT = "#f97316";

export function TrackInfoButton({
    item,
    alwaysVisible = false,
}: {
    item: MediaItem;
    alwaysVisible?: boolean;
}) {
    const [open, setOpen] = useState(false);

    if (item.type !== "audio") return null;

    return (
        <>
            <Tooltip title="Thông tin bài hát">
                <IconButton
                    size="small"
                    onClick={(event) => {
                        event.stopPropagation();
                        setOpen(true);
                    }}
                    sx={{
                        color: alwaysVisible ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0)",
                        "&:hover": { color: ACCENT },
                        ".MuiBox-root:hover &": {
                            color: "rgba(255,255,255,0.55)",
                        },
                    }}
                >
                    <InfoOutlinedIcon sx={{ fontSize: 17 }} />
                </IconButton>
            </Tooltip>
            <TrackInfoDialog item={item} open={open} onClose={() => setOpen(false)} />
        </>
    );
}

export function TrackInfoDialog({
    item,
    open,
    onClose,
}: {
    item: MediaItem;
    open: boolean;
    onClose: () => void;
}) {
    const trackQuery = useQuery({
        queryKey: ["music", "track-info", item.sourceId],
        queryFn: () => getTrack(item.sourceId),
        enabled: open,
        staleTime: 15 * 60 * 1000,
    });
    const track = trackQuery.data;
    const collectionIds = useMemo(
        () =>
            [track?.album_backlink?.playlist_id, ...(track?.playlists_containing_track ?? [])]
                .filter((id): id is string | number => id !== undefined && id !== null)
                .map(String)
                .filter((id, index, all) => all.indexOf(id) === index),
        [track],
    );
    const collectionsQuery = useQuery({
        queryKey: ["music", "track-collections", item.sourceId, collectionIds],
        queryFn: async () =>
            (await Promise.all(collectionIds.map((id) => getPlaylist(id)))).filter(
                (collection): collection is AudiusPlaylist => Boolean(collection),
            ),
        enabled: open && collectionIds.length > 0,
        staleTime: 15 * 60 * 1000,
    });
    const albumId = track?.album_backlink ? String(track.album_backlink.playlist_id) : undefined;
    const album = collectionsQuery.data?.find((collection) => String(collection.id) === albumId);
    const playlists = (collectionsQuery.data ?? []).filter(
        (collection) => String(collection.id) !== albumId,
    );
    const tags = track?.tags
        ?.split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 8);
    const navigateToEntity = (type: "artist" | "album" | "playlist", id?: string) => {
        if (!id) return;
        onClose();
        window.dispatchEvent(
            new CustomEvent("music:navigate-entity", {
                detail: { type, id },
            }),
        );
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            slotProps={{
                paper: {
                    sx: {
                        color: "#fff",
                        bgcolor: "#151515",
                        backgroundImage:
                            "radial-gradient(circle at 12% 0%, rgba(249,115,22,0.12), transparent 38%)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 3,
                    },
                },
            }}
        >
            <DialogTitle sx={{ pb: 1, fontWeight: 800 }}>Thông tin bài hát</DialogTitle>
            <DialogContent>
                {trackQuery.isLoading ? (
                    <Box sx={{ minHeight: 240, display: "grid", placeItems: "center" }}>
                        <CircularProgress size={28} sx={{ color: ACCENT }} />
                    </Box>
                ) : (
                    <Stack spacing={2.5}>
                        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                            <Avatar
                                variant="rounded"
                                src={item.thumbnail}
                                sx={{ width: 88, height: 88, borderRadius: 2 }}
                            />
                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="h6" fontWeight={800} noWrap>
                                    {formatDisplayName(track?.title ?? item.title)}
                                </Typography>
                                <Typography sx={{ color: "rgba(255,255,255,0.55)" }}>
                                    {track?.genre || item.genre || "Chưa có thể loại"}
                                </Typography>
                                <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ mt: 1 }}>
                                    {tags?.map((tag) => (
                                        <Chip
                                            key={tag}
                                            label={`#${tag}`}
                                            size="small"
                                            sx={{
                                                color: "#fed7aa",
                                                bgcolor: "rgba(249,115,22,0.12)",
                                            }}
                                        />
                                    ))}
                                </Stack>
                            </Box>
                        </Box>

                        <InfoSection icon={<PersonOutlineIcon />} title="Nghệ sĩ">
                            <Box
                                component="button"
                                type="button"
                                onClick={() =>
                                    navigateToEntity("artist", track?.user?.id ?? item.artistId)
                                }
                                disabled={!track?.user?.id && !item.artistId}
                                sx={{
                                    width: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1.25,
                                    p: 0,
                                    color: "inherit",
                                    font: "inherit",
                                    textAlign: "left",
                                    border: 0,
                                    bgcolor: "transparent",
                                    cursor:
                                        track?.user?.id || item.artistId ? "pointer" : "default",
                                    borderRadius: 1,
                                    transition: "background-color 160ms ease",
                                    "&:hover:not(:disabled)": {
                                        bgcolor: "rgba(255,255,255,0.055)",
                                    },
                                    "&:focus-visible": {
                                        outline: "2px solid rgba(249,115,22,0.75)",
                                        outlineOffset: 4,
                                    },
                                }}
                            >
                                <Avatar
                                    src={
                                        track?.user ? getAudiusProfileImage(track.user) : undefined
                                    }
                                    sx={{ width: 46, height: 46 }}
                                />
                                <Box>
                                    <Typography fontWeight={700}>
                                        {formatDisplayName(track?.user?.name ?? item.artist)}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        sx={{ color: "rgba(255,255,255,0.5)" }}
                                    >
                                        @{track?.user?.handle ?? item.artistHandle ?? "unknown"}
                                        {track?.user?.follower_count !== undefined
                                            ? ` · ${track.user.follower_count.toLocaleString("vi-VN")} người theo dõi`
                                            : ""}
                                    </Typography>
                                </Box>
                            </Box>
                            {track?.user?.bio && (
                                <Typography
                                    variant="body2"
                                    sx={{
                                        mt: 1.25,
                                        color: "rgba(255,255,255,0.62)",
                                        lineHeight: 1.6,
                                    }}
                                >
                                    {track.user.bio}
                                </Typography>
                            )}
                        </InfoSection>

                        <InfoSection icon={<AlbumOutlinedIcon />} title="Album">
                            {album || track?.album_backlink ? (
                                <CollectionRow
                                    image={album ? getPlaylistArtwork(album) : item.thumbnail}
                                    name={
                                        album?.playlist_name ??
                                        track?.album_backlink?.playlist_name ??
                                        "Album"
                                    }
                                    label="Album"
                                    onClick={() =>
                                        navigateToEntity(
                                            "album",
                                            String(
                                                album?.id ??
                                                    track?.album_backlink?.playlist_id ??
                                                    "",
                                            ),
                                        )
                                    }
                                />
                            ) : (
                                <EmptyMetadata label="Bài hát này không thuộc album nào." />
                            )}
                        </InfoSection>

                        <InfoSection icon={<PlaylistPlayOutlinedIcon />} title="Playlist">
                            {collectionsQuery.isLoading ? (
                                <CircularProgress size={20} sx={{ color: ACCENT }} />
                            ) : playlists.length ? (
                                <Stack spacing={1}>
                                    {playlists.map((playlist) => (
                                        <CollectionRow
                                            key={playlist.id}
                                            image={getPlaylistArtwork(playlist)}
                                            name={playlist.playlist_name}
                                            label={`${playlist.track_count ?? 0} bài`}
                                            onClick={() =>
                                                navigateToEntity("playlist", String(playlist.id))
                                            }
                                        />
                                    ))}
                                </Stack>
                            ) : (
                                <EmptyMetadata label="Chưa có playlist công khai chứa bài hát này." />
                            )}
                        </InfoSection>
                    </Stack>
                )}
            </DialogContent>
        </Dialog>
    );
}

function InfoSection({
    icon,
    title,
    children,
}: {
    icon: ReactNode;
    title: string;
    children: ReactNode;
}) {
    return (
        <Box>
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
                <Box sx={{ color: ACCENT, display: "flex" }}>{icon}</Box>
                <Typography fontWeight={750}>{title}</Typography>
            </Stack>
            <Box
                sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: "rgba(255,255,255,0.045)",
                    border: "1px solid rgba(255,255,255,0.07)",
                }}
            >
                {children}
            </Box>
        </Box>
    );
}

function CollectionRow({
    image,
    name,
    label,
    onClick,
}: {
    image: string;
    name: string;
    label: string;
    onClick?: () => void;
}) {
    return (
        <Box
            component={onClick ? "button" : "div"}
            type={onClick ? "button" : undefined}
            onClick={onClick}
            sx={{
                width: "100%",
                display: "flex",
                gap: 1.25,
                alignItems: "center",
                p: 0,
                color: "inherit",
                font: "inherit",
                textAlign: "left",
                border: 0,
                bgcolor: "transparent",
                cursor: onClick ? "pointer" : "default",
                borderRadius: 1,
                transition: "background-color 160ms ease, transform 160ms ease",
                "&:hover": onClick
                    ? {
                          bgcolor: "rgba(255,255,255,0.065)",
                          transform: "translateX(3px)",
                      }
                    : undefined,
                "&:focus-visible": {
                    outline: "2px solid rgba(249,115,22,0.75)",
                    outlineOffset: 3,
                },
            }}
        >
            <Avatar variant="rounded" src={image} sx={{ width: 44, height: 44, borderRadius: 1 }} />
            <Box sx={{ minWidth: 0 }}>
                <Typography noWrap fontWeight={650}>
                    {formatDisplayName(name)}
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.48)" }}>
                    {label}
                </Typography>
            </Box>
        </Box>
    );
}

function EmptyMetadata({ label }: { label: string }) {
    return (
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.44)" }}>
            {label}
        </Typography>
    );
}
