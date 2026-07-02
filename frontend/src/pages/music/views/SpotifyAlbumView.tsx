import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import {
    Avatar,
    Box,
    Button,
    Stack,
    Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getSpotifyAlbumTracks, getSpotifyArtistDiscography } from "@services/musicBackendService";
import type { SpotifyAlbumDetail } from "@services/musicBackendService";
import { usePlayerStore } from "@store/playerStore";
import { HScrollSection } from "../components/HScrollSection";
import { TrackOptionsButton } from "../components/TrackOptionsButton";
import { AlbumCard } from "../components/SpotifyCards";
import { SP_GREEN } from "../constants";
import { formatDisplayName, formatDuration } from "../utils";
import type { MediaItem } from "../types";

export function SpotifyAlbumView({
    data,
    onBack,
    scrollRef,
}: {
    data: SpotifyAlbumDetail;
    onBack: () => void;
    scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
    const { currentItem, isPlaying, play, pause, resume } = usePlayerStore();
    const coverImage = data.images?.[0] ?? "";
    const year = data.release_date?.slice(0, 4) ?? "";
    const [extraTracks, setExtraTracks] = useState<MediaItem[]>([]);
    const [loadingMore, setLoadingMore] = useState(false);

    const artistQuery = useQuery({
        queryKey: ["music", "spotify-artist", data.artist_id],
        queryFn: () => getSpotifyArtistDiscography(data.artist_id),
        enabled: Boolean(data.artist_id),
        staleTime: 15 * 60 * 1000,
    });
    const artistData = artistQuery.data;
    const artistImage = artistData?.artist.images?.[0] ?? "";
    const moreByArtist = (artistData?.albums ?? []).filter((album) => album.id !== data.id);

    const openArtist = () => {
        if (!data.artist_id) return;
        window.dispatchEvent(
            new CustomEvent("music:navigate-entity", {
                detail: { type: "artist", id: data.artist_id, provider: "spotify" },
            }),
        );
    };

    const toMediaItem = (t: { id: string; title: string; user: { id: string; name: string }; artwork: { "150x150"?: string; "480x480"?: string; "1000x1000"?: string }; duration: number; external_url: string }): MediaItem => ({
        id: `audio:spotify:${t.id}`,
        sourceId: `spotify:${t.id}`,
        type: "audio" as const,
        title: t.title,
        artist: t.user.name,
        artistId: t.user.id,
        thumbnail: t.artwork["480x480"] ?? t.artwork["1000x1000"] ?? t.artwork["150x150"] ?? coverImage,
        duration: t.duration,
        provider: "spotify" as const,
        externalUrl: t.external_url,
        album: { id: data.id, name: data.name },
    });

    const baseTrackItems: MediaItem[] = (data.tracks ?? []).map(toMediaItem);
    const trackItems: MediaItem[] = [...baseTrackItems, ...extraTracks];
    const canLoadMore = data.total_tracks > trackItems.length;

    const loadMore = async () => {
        setLoadingMore(true);
        try {
            const result = await getSpotifyAlbumTracks(data.id, 50, trackItems.length);
            setExtraTracks((prev) => [...prev, ...result.tracks.map(toMediaItem)]);
        } finally {
            setLoadingMore(false);
        }
    };

    const typeLabel = data.album_type === "single" ? "Single" : data.album_type === "ep" ? "EP" : "Album";

    return (
        <Box ref={scrollRef} sx={{ flex: 1, minHeight: 0, overflow: "auto", p: { xs: 2, md: 3 } }}>
            <Button
                startIcon={<ChevronLeftIcon />}
                onClick={onBack}
                sx={{ mb: 2, color: "text.secondary", "&:hover": { color: "text.primary" } }}
            >
                Quay lại
            </Button>

            {/* Hero */}
            <Box
                sx={{
                    position: "relative",
                    display: "flex",
                    gap: 3,
                    alignItems: "flex-end",
                    mb: 4,
                    p: { xs: 2, md: 3 },
                    minHeight: { xs: 260, md: 330 },
                    borderRadius: 3,
                    overflow: "hidden",
                    flexWrap: "wrap",
                    background: artistImage
                        ? `linear-gradient(90deg, rgba(14,12,11,.94) 0%, rgba(14,12,11,.72) 48%, rgba(14,12,11,.32) 100%), url(${artistImage}) center 24%/cover no-repeat`
                        : "linear-gradient(135deg, #29201b, #111827)",
                }}
            >
                <Avatar
                    variant="rounded"
                    src={coverImage}
                    sx={{
                        width: { xs: 140, md: 200 },
                        height: { xs: 140, md: 200 },
                        borderRadius: 2,
                        flexShrink: 0,
                        boxShadow: "0 16px 48px rgba(0,0,0,0.58)",
                    }}
                />
                <Box sx={{ minWidth: 0, pb: 0.5, position: "relative" }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: "text.disabled", textTransform: "uppercase", letterSpacing: 1.5, mb: 0.5 }}>
                        {typeLabel}
                    </Typography>
                    <Typography sx={{ fontWeight: 900, fontSize: { xs: 28, md: 44 }, lineHeight: 1.05, color: "#fff" }}>
                        {data.name}
                    </Typography>
                    <Typography sx={{ fontSize: 14, color: "rgba(255,255,255,.72)", mt: 0.75 }}>
                        <Box
                            component="button"
                            type="button"
                            onClick={openArtist}
                            sx={{
                                p: 0,
                                border: 0,
                                bgcolor: "transparent",
                                color: "#fff",
                                font: "inherit",
                                fontWeight: 700,
                                cursor: data.artist_id ? "pointer" : "default",
                                "&:hover": { textDecoration: data.artist_id ? "underline" : "none" },
                            }}
                        >
                            {data.artist_name}
                        </Box>
                        {year ? ` · ${year}` : ""}
                        {data.total_tracks ? ` · ${data.total_tracks} bài` : ""}
                    </Typography>
                    {data.label && (
                        <Typography sx={{ fontSize: 12, color: "text.disabled", mt: 0.5 }}>
                            {data.label}
                        </Typography>
                    )}
                    <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }} alignItems="center">
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<PlayArrowIcon />}
                            onClick={() => trackItems.length && play(trackItems[0], trackItems)}
                            sx={{
                                bgcolor: SP_GREEN,
                                color: "#fff",
                                fontWeight: 700,
                                textTransform: "none",
                                borderRadius: 5,
                                px: 2,
                                "&:hover": { bgcolor: "#fb923c" },
                            }}
                        >
                            Phát
                        </Button>
                    </Stack>
                </Box>
            </Box>

            {/* Track list */}
            <Stack spacing={0.5}>
                {trackItems.map((item, i) => {
                    const active = currentItem?.id === item.id;
                    return (
                        <Box
                            key={item.id}
                            onClick={() => {
                                if (active && isPlaying) { pause(); return; }
                                if (active) { resume(); return; }
                                play(item, trackItems);
                            }}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                                px: 1.5,
                                py: 1,
                                borderRadius: 1.5,
                                cursor: "pointer",
                                bgcolor: active ? "action.selected" : "transparent",
                                "&:hover": { bgcolor: active ? "action.selected" : "action.hover" },
                                "&:hover .track-options": { opacity: 1 },
                                transition: "background-color 0.15s",
                            }}
                        >
                            <Box sx={{ width: 24, textAlign: "right", flexShrink: 0 }}>
                                {active && isPlaying
                                    ? <GraphicEqIcon sx={{ fontSize: 16, color: SP_GREEN }} />
                                    : <Typography sx={{ fontSize: 13, color: "text.disabled" }}>{i + 1}</Typography>
                                }
                            </Box>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography noWrap sx={{ fontSize: 14, fontWeight: 600, color: active ? SP_GREEN : "text.primary" }}>
                                    {formatDisplayName(item.title)}
                                </Typography>
                                <Typography noWrap sx={{ fontSize: 12, color: "text.secondary" }}>
                                    {formatDisplayName(item.artist)}
                                </Typography>
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
                                <Typography sx={{ fontSize: 12, color: "text.disabled", minWidth: 36, textAlign: "right" }}>
                                    {item.duration ? formatDuration(item.duration) : ""}
                                </Typography>
                                <Box className="track-options" sx={{ opacity: { xs: 1, md: 0 }, transition: "opacity 0.15s" }} onClick={(e) => e.stopPropagation()}>
                                    <TrackOptionsButton item={item} alwaysVisible />
                                </Box>
                            </Box>
                        </Box>
                    );
                })}
            </Stack>

            {canLoadMore && (
                <Button
                    size="small"
                    onClick={() => void loadMore()}
                    disabled={loadingMore}
                    sx={{ mt: 2, color: "text.secondary", fontWeight: 700, textTransform: "none", "&:hover": { color: "text.primary" } }}
                >
                    {loadingMore ? "Đang tải..." : `Tải thêm ${data.total_tracks - trackItems.length} bài`}
                </Button>
            )}

            <Box sx={{ mt: 5 }}>
                <HScrollSection
                    title={`More by ${data.artist_name}`}
                    loading={artistQuery.isLoading}
                    mb={0}
                >
                    {moreByArtist.map((album) => (
                        <AlbumCard key={album.id} album={album} />
                    ))}
                </HScrollSection>
                {!artistQuery.isLoading && moreByArtist.length === 0 && (
                    <Typography sx={{ color: "text.disabled", fontSize: 13 }}>
                        Chưa có thêm bản phát hành nào.
                    </Typography>
                )}
            </Box>
        </Box>
    );
}
