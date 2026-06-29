import AlbumIcon from "@mui/icons-material/Album";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LibraryMusicIcon from "@mui/icons-material/LibraryMusic";
import PersonIcon from "@mui/icons-material/Person";
import RadioIcon from "@mui/icons-material/Radio";
import { Avatar, Box, Chip, CircularProgress, IconButton, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import {
    useBackendPlaylistsQuery,
    useDeleteMusicPlaylistMutation,
    useMusicLibraryQuery,
    useRemoveLibraryItemMutation,
} from "@pages/music/hooks/useMusicQueries";
import type { AudiusTrack } from "@pages/music/types";
import { formatDisplayName } from "@pages/music/utils";
import { getArtistTracks, getPlaylistTracks, getTrackRadio } from "@services/musicService";
import type {
    MusicLibraryItem,
    MusicLibraryItemType,
    MusicPlaylistRow,
} from "@services/musicBackendService";
import { type ReactNode, useMemo, useState } from "react";
import { MediaRow } from "./MediaRow";

type SelectedItem =
    | { kind: "saved"; item: MusicLibraryItem }
    | { kind: "created"; item: MusicPlaylistRow }
    | null;

export function LibraryView() {
    const [filter, setFilter] = useState<"all" | MusicLibraryItemType>("all");
    const [selected, setSelected] = useState<SelectedItem>(null);
    const libraryQuery = useMusicLibraryQuery();
    const playlistsQuery = useBackendPlaylistsQuery();
    const removeMutation = useRemoveLibraryItemMutation();
    const deletePlaylistMutation = useDeleteMusicPlaylistMutation();

    const remoteTracksQuery = useQuery({
        queryKey: [
            "music",
            "library-detail",
            selected?.kind,
            selected?.kind === "saved" ? selected.item.item_type : "created",
            selected?.item.id,
        ],
        queryFn: async (): Promise<AudiusTrack[]> => {
            if (!selected || selected.kind !== "saved") return [];
            if (selected.item.item_type === "artist") {
                return getArtistTracks(selected.item.source_id, { limit: 100 });
            }
            if (selected.item.item_type === "radio") {
                return getTrackRadio(selected.item.source_id, 50);
            }
            return getPlaylistTracks(selected.item.source_id, { limit: 100 });
        },
        enabled: selected?.kind === "saved",
        retry: false,
    });

    const createdTracks = useMemo(
        () =>
            selected?.kind === "created"
                ? (selected.item.tracks ?? []).map((track) => ({
                      id: `${track.media_item.type}:${track.media_item.source_id}`,
                      sourceId: track.media_item.source_id,
                      type: track.media_item.type,
                      title: track.media_item.title,
                      artist: track.media_item.artist,
                      thumbnail: track.media_item.thumbnail,
                      streamUrl: track.media_item.stream_url,
                      videoId: track.media_item.video_id,
                      duration: track.media_item.duration,
                      viewCount: track.media_item.view_count,
                  }))
                : [],
        [selected],
    );

    if (selected) {
        const queue =
            selected.kind === "created"
                ? createdTracks
                : (remoteTracksQuery.data ?? []).map((track) => ({
                      id: `audio:${track.id}`,
                      sourceId: track.id,
                      type: "audio" as const,
                      title: track.title,
                      artist: track.user.name,
                      thumbnail:
                          track.artwork?.["480x480"] ??
                          track.artwork?.["150x150"] ??
                          "/assets/logo/logo.png",
                      streamUrl: `https://discoveryprovider.audius.co/v1/tracks/${track.id}/stream`,
                      duration: track.duration,
                      viewCount: track.play_count,
                      genre: track.genre,
                  }));
        return (
            <Box>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <IconButton onClick={() => setSelected(null)} sx={{ color: "#fff" }}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Avatar
                        variant="rounded"
                        src={
                            selected.kind === "saved"
                                ? selected.item.thumbnail
                                : selected.item.cover
                        }
                        sx={{ width: 52, height: 52, borderRadius: 1 }}
                    >
                        <LibraryMusicIcon />
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h5" noWrap fontWeight={850}>
                            {formatDisplayName(
                                selected.kind === "created"
                                    ? selected.item.name
                                    : selected.item.title,
                            )}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                            {queue.length} bài
                        </Typography>
                    </Box>
                </Stack>
                {remoteTracksQuery.isLoading ? (
                    <Box sx={{ py: 8, display: "grid", placeItems: "center" }}>
                        <CircularProgress size={28} sx={{ color: "#f97316" }} />
                    </Box>
                ) : queue.length ? (
                    queue.map((item, index) => (
                        <MediaRow key={item.id} item={item} queue={queue} index={index + 1} />
                    ))
                ) : (
                    <Typography sx={{ py: 8, textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
                        Item này chưa có bài hát.
                    </Typography>
                )}
            </Box>
        );
    }

    const savedItems = (libraryQuery.data ?? []).filter(
        (item) => filter === "all" || item.item_type === filter,
    );
    const showCreated = filter === "all" || filter === "playlist";

    return (
        <Box>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
                gap={1.5}
                sx={{ mb: 2.5 }}
            >
                <Box>
                    <Typography variant="h5" fontWeight={900}>
                        Thư viện
                    </Typography>
                    <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.45)" }}>
                        Mọi nội dung bạn đã tự thêm
                    </Typography>
                </Box>
                <Stack direction="row" gap={0.75} flexWrap="wrap">
                    {(
                        [
                            ["all", "Tất cả"],
                            ["playlist", "Playlist"],
                            ["artist", "Nghệ sĩ"],
                            ["album", "Album"],
                            ["radio", "Radio"],
                        ] as const
                    ).map(([value, label]) => (
                        <Chip
                            key={value}
                            label={label}
                            onClick={() => setFilter(value)}
                            sx={{
                                color: filter === value ? "#111" : "#fff",
                                bgcolor: filter === value ? "#f97316" : "rgba(255,255,255,0.08)",
                                fontWeight: 700,
                            }}
                        />
                    ))}
                </Stack>
            </Stack>

            <Stack spacing={0.5}>
                {showCreated &&
                    (playlistsQuery.data ?? []).map((playlist) => (
                        <LibraryRow
                            key={`created:${playlist.id}`}
                            title={playlist.name}
                            subtitle={`Playlist của bạn · ${playlist.tracks?.length ?? 0} bài`}
                            icon={<LibraryMusicIcon />}
                            onClick={() => setSelected({ kind: "created", item: playlist })}
                            onDelete={() => deletePlaylistMutation.mutate(playlist.id)}
                        />
                    ))}
                {savedItems.map((item) => (
                    <LibraryRow
                        key={`saved:${item.id}`}
                        title={item.title}
                        subtitle={item.subtitle || libraryTypeLabel(item.item_type)}
                        thumbnail={item.thumbnail}
                        icon={libraryTypeIcon(item.item_type)}
                        onClick={() => setSelected({ kind: "saved", item })}
                        onDelete={() => removeMutation.mutate(item.id)}
                    />
                ))}
            </Stack>
        </Box>
    );
}

function LibraryRow({
    title,
    subtitle,
    thumbnail,
    icon,
    onClick,
    onDelete,
}: {
    title: string;
    subtitle: string;
    thumbnail?: string;
    icon: ReactNode;
    onClick: () => void;
    onDelete: () => void;
}) {
    return (
        <Box
            onClick={onClick}
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 1,
                borderRadius: 1.5,
                cursor: "pointer",
                "&:hover": { bgcolor: "rgba(255,255,255,0.07)" },
                "&:hover .delete-library": { opacity: 1 },
            }}
        >
            <Avatar
                variant="rounded"
                src={thumbnail}
                sx={{ width: 52, height: 52, borderRadius: 1 }}
            >
                {icon}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography noWrap fontWeight={700}>
                    {formatDisplayName(title)}
                </Typography>
                <Typography noWrap variant="caption" sx={{ color: "rgba(255,255,255,0.46)" }}>
                    {subtitle}
                </Typography>
            </Box>
            <IconButton
                className="delete-library"
                aria-label="Xóa khỏi thư viện"
                onClick={(event) => {
                    event.stopPropagation();
                    onDelete();
                }}
                sx={{
                    opacity: { xs: 1, md: 0 },
                    color: "rgba(255,255,255,0.5)",
                    "&:hover": { color: "#ef4444" },
                }}
            >
                <DeleteOutlineIcon />
            </IconButton>
        </Box>
    );
}

function libraryTypeLabel(type: MusicLibraryItemType) {
    return { playlist: "Playlist", artist: "Nghệ sĩ", album: "Album", radio: "Radio" }[type];
}

function libraryTypeIcon(type: MusicLibraryItemType) {
    return {
        playlist: <LibraryMusicIcon />,
        artist: <PersonIcon />,
        album: <AlbumIcon />,
        radio: <RadioIcon />,
    }[type];
}
