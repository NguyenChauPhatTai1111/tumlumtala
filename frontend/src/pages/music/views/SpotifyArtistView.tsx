import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import {
    Avatar,
    Box,
    Button,
    Chip,
    CircularProgress,
    Stack,
    Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getSpotifyAlbumTracks, getSpotifyArtistAllAlbums } from "@services/musicBackendService";
import type { SpotifyArtistResponse } from "@services/musicBackendService";
import { usePlayerStore } from "@store/playerStore";
import { TrackOptionsButton } from "../components/TrackOptionsButton";
import { AlbumCard, RelatedArtistCard, SpotifyCollectionCard } from "../components/SpotifyCards";
import { SP_GREEN } from "../constants";
import { formatDisplayName, formatDuration } from "../utils";
import type { MediaItem } from "../types";

export function SpotifyArtistView({
    data,
    onBack,
    scrollRef,
}: {
    data: SpotifyArtistResponse;
    onBack: () => void;
    scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
    const {
        artist,
        top_tracks,
        albums,
        albums_total,
        appears_on,
        appears_total,
        playlists = [],
        related_artists = [],
    } = data;
    const { currentItem, isPlaying, play, pause, resume } = usePlayerStore();
    const [discographyTab, setDiscographyTab] = useState<"popular" | "albums" | "singles">("popular");
    const [showFullBio, setShowFullBio] = useState(false);

    const wikiBioQuery = useQuery({
        queryKey: ["wikipedia-artist-bio", artist.name],
        queryFn: async () => {
            const searchRes = await fetch(
                `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(artist.name + " musician")}&srlimit=1&format=json&origin=*`,
            );
            const searchData = await searchRes.json() as { query?: { search?: { pageid: number; title: string }[] } };
            const page = searchData.query?.search?.[0];
            if (!page) return null;

            const summaryRes = await fetch(
                `https://en.wikipedia.org/w/api.php?action=query&pageids=${page.pageid}&prop=extracts&exintro=true&explaintext=true&format=json&origin=*`,
            );
            const summaryData = await summaryRes.json() as { query?: { pages?: Record<string, { extract?: string }> } };
            const extract = summaryData.query?.pages?.[page.pageid]?.extract ?? null;
            if (!extract) return null;
            return { extract, title: page.title, pageid: page.pageid };
        },
        staleTime: 60 * 60 * 1000,
        retry: false,
    });

    const uniqueTrackCountQuery = useQuery({
        queryKey: ["spotify-artist-unique-tracks", artist.id],
        queryFn: async () => {
            const allAlbums = await getSpotifyArtistAllAlbums(artist.id);
            const trackIds = new Set<string>();
            await Promise.all(
                allAlbums.map(async (album) => {
                    try {
                        const res = await getSpotifyAlbumTracks(album.id, 50, 0);
                        for (const t of res.tracks) {
                            if (t.id) trackIds.add(t.id);
                        }
                    } catch {
                        // skip failed album
                    }
                }),
            );
            return trackIds.size;
        },
        staleTime: 60 * 60 * 1000,
        retry: false,
    });

    const coverImage = artist.images?.[0] ?? "";

    const trackItems: MediaItem[] = (top_tracks ?? []).map((t) => ({
        id: `audio:spotify:${t.id}`,
        sourceId: `spotify:${t.id}`,
        type: "audio" as const,
        title: t.title,
        artist: t.user.name,
        artistId: t.user.id,
        thumbnail: t.artwork["480x480"] ?? t.artwork["1000x1000"] ?? t.artwork["150x150"] ?? "",
        duration: t.duration,
        provider: "spotify" as const,
        externalUrl: t.external_url,
        album: t.album?.id ? { id: t.album.id, name: t.album.name } : undefined,
    }));

    const visibleTracks = trackItems.slice(0, 10);
    const genres = artist.genres ?? [];
    const discography = albums ?? [];
    const featuring = appears_on ?? [];
    const visibleDiscography =
        discographyTab === "albums"
            ? discography.filter((album) => album.album_type === "album")
            : discographyTab === "singles"
                ? discography.filter((album) => album.album_type !== "album")
                : discography;
    const latestAlbum = [...discography].sort((a, b) =>
        (b.release_date ?? "").localeCompare(a.release_date ?? ""),
    )[0];
    const artistPick = latestAlbum
        ? {
            id: latestAlbum.id,
            name: latestAlbum.name,
            image: latestAlbum.images?.[0] ?? "",
            label: latestAlbum.album_type === "album" ? "Album" : "Single",
            isAlbum: true,
        }
        : playlists[0]
            ? {
                id: playlists[0].id,
                name: playlists[0].name,
                image: playlists[0].images?.[0] ?? "",
                label: "Playlist",
                isAlbum: false,
            }
            : null;

    const sectionLabel = (text: string, extra?: string) => (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: "text.primary" }}>{text}</Typography>
            {extra && <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{extra}</Typography>}
        </Box>
    );

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
                    borderRadius: 3,
                    overflow: "hidden",
                    mb: 4,
                    minHeight: 220,
                    background: coverImage
                        ? `linear-gradient(160deg, rgba(30,30,30,0.0) 0%, rgba(0,0,0,0.85) 100%), url(${coverImage}) center/cover no-repeat`
                        : "linear-gradient(160deg, #1a1a2e 0%, #16213e 100%)",
                }}
            >
                <Box sx={{ display: "flex", gap: 3, alignItems: "flex-end", p: 3, pt: 8 }}>
                    <Avatar
                        src={coverImage}
                        sx={{
                            width: { xs: 100, md: 150 },
                            height: { xs: 100, md: 150 },
                            flexShrink: 0,
                            boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
                            border: "3px solid rgba(255,255,255,0.12)",
                        }}
                    />
                    <Box sx={{ minWidth: 0, pb: 0.5 }}>
                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1.5, mb: 0.5 }}>
                            Nghệ sĩ
                        </Typography>
                        <Typography sx={{ fontWeight: 900, fontSize: { xs: 26, md: 44 }, lineHeight: 1.05, color: "#fff" }}>
                            {artist.name}
                        </Typography>
                        {genres.length > 0 && (
                            <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ mt: 1.5 }}>
                                {genres.slice(0, 5).map((g) => (
                                    <Chip key={g} label={g} size="small"
                                        sx={{ bgcolor: "rgba(249,115,22,0.2)", color: "#fed7aa", fontSize: 11, border: "1px solid rgba(249,115,22,0.3)" }}
                                    />
                                ))}
                            </Stack>
                        )}
                    </Box>
                </Box>
            </Box>

            {/* Popular tracks + artist pick */}
            {trackItems.length > 0 && (
                <Box
                    sx={{
                        mb: 5,
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", lg: artistPick ? "minmax(0,1.65fr) minmax(280px,.75fr)" : "1fr" },
                        gap: 4,
                    }}
                >
                    <Box>
                        {sectionLabel("Popular")}
                        <Stack spacing={0.5}>
                            {visibleTracks.map((item, i) => {
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
                                            transition: "background-color 0.15s",
                                        }}
                                    >
                                        <Box sx={{ width: 24, textAlign: "right", flexShrink: 0 }}>
                                            {active && isPlaying
                                                ? <GraphicEqIcon sx={{ fontSize: 16, color: SP_GREEN }} />
                                                : <Typography sx={{ fontSize: 13, color: "text.disabled" }}>{i + 1}</Typography>
                                            }
                                        </Box>
                                        <Avatar variant="rounded" src={item.thumbnail}
                                            sx={{ width: 40, height: 40, borderRadius: 1, flexShrink: 0 }}
                                        />
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Typography noWrap sx={{ fontSize: 14, fontWeight: 600, color: active ? SP_GREEN : "text.primary" }}>
                                                {formatDisplayName(item.title)}
                                            </Typography>
                                            {item.album?.id ? (
                                                <Typography
                                                    noWrap
                                                    component="span"
                                                    sx={{ fontSize: 12, color: "text.secondary", cursor: "pointer", display: "block", "&:hover": { color: "text.primary", textDecoration: "underline" } }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.dispatchEvent(new CustomEvent("music:navigate-entity", { detail: { type: "album", id: item.album!.id, provider: "spotify" } }));
                                                    }}
                                                >
                                                    {item.album.name}
                                                </Typography>
                                            ) : (
                                                <Typography noWrap sx={{ fontSize: 12, color: "text.secondary" }}>
                                                    {formatDisplayName(item.artist)}
                                                </Typography>
                                            )}
                                        </Box>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
                                            {active && isPlaying
                                                ? <Button size="small" onClick={(e) => { e.stopPropagation(); pause(); }} sx={{ color: SP_GREEN, minWidth: 0, p: 0.5 }}>
                                                    <PauseIcon sx={{ fontSize: 18 }} />
                                                </Button>
                                                : <Button size="small" onClick={(e) => { e.stopPropagation(); play(item, trackItems); }}
                                                    sx={{ color: "text.disabled", minWidth: 0, p: 0.5, "&:hover": { color: SP_GREEN }, opacity: 0, ".MuiBox-root:hover > * > &": { opacity: 1 } }}
                                                >
                                                    <PlayArrowIcon sx={{ fontSize: 18 }} />
                                                </Button>
                                            }
                                            <Typography sx={{ fontSize: 12, color: "text.disabled", minWidth: 36, textAlign: "right" }}>
                                                {item.duration ? formatDuration(item.duration) : ""}
                                            </Typography>
                                            <Box sx={{ opacity: { xs: 1, md: 0 }, ".MuiBox-root:hover &": { opacity: 1 }, transition: "opacity 0.15s" }} onClick={(e) => e.stopPropagation()}>
                                                <TrackOptionsButton item={item} alwaysVisible />
                                            </Box>
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Stack>
                    </Box>
                    {artistPick && (
                        <Box>
                            {sectionLabel("Phát hành mới nhất")}
                            <Box
                                onClick={() =>
                                    window.dispatchEvent(
                                        new CustomEvent("music:navigate-entity", {
                                            detail: {
                                                type: artistPick.isAlbum ? "album" : "playlist",
                                                id: artistPick.id,
                                                provider: "spotify",
                                            },
                                        }),
                                    )
                                }
                                sx={{
                                    display: "flex",
                                    gap: 1.5,
                                    p: 1.5,
                                    borderRadius: 2,
                                    bgcolor: "action.hover",
                                    cursor: "pointer",
                                    "&:hover": { bgcolor: "action.selected" },
                                }}
                            >
                                <Avatar
                                    variant="rounded"
                                    src={artistPick.image}
                                    sx={{ width: 88, height: 88, borderRadius: 1.5 }}
                                />
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                                        Phát hành gần đây của {artist.name}
                                    </Typography>
                                    <Typography sx={{ mt: 0.75, fontWeight: 800 }} noWrap>
                                        {artistPick.name}
                                    </Typography>
                                    <Typography sx={{ mt: 0.25, fontSize: 12, color: "text.secondary" }}>
                                        {artistPick.label}
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                    )}
                </Box>
            )}

            {/* Discography */}
            {discography.length > 0 && (
                <Box sx={{ mb: 5 }}>
                    {sectionLabel("Discography", albums_total > discography.length ? `${albums_total} releases` : undefined)}
                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                        {([
                            ["popular", "Popular releases"],
                            ["albums", "Albums"],
                            ["singles", "Singles and EPs"],
                        ] as const).map(([value, label]) => (
                            <Chip
                                key={value}
                                label={label}
                                onClick={() => setDiscographyTab(value)}
                                sx={{
                                    bgcolor: discographyTab === value ? "text.primary" : "action.selected",
                                    color: discographyTab === value ? "background.default" : "text.primary",
                                    fontWeight: 700,
                                }}
                            />
                        ))}
                    </Stack>
                    <Box sx={{ display: "flex", gap: 2, overflowX: "auto", pb: 1, "&::-webkit-scrollbar": { height: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: 2 } }}>
                        {visibleDiscography.map((album) => (
                            <AlbumCard key={album.id} album={album} />
                        ))}
                    </Box>
                </Box>
            )}

            {/* Featuring */}
            {featuring.length > 0 && (
                <Box sx={{ mb: 4 }}>
                    {sectionLabel("Featuring " + artist.name, appears_total > featuring.length ? `${appears_total} releases` : undefined)}
                    <Box sx={{ display: "flex", gap: 2, overflowX: "auto", pb: 1, "&::-webkit-scrollbar": { height: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: 2 } }}>
                        {featuring.map((album) => (
                            <AlbumCard key={album.id} album={album} />
                        ))}
                    </Box>
                </Box>
            )}

            {/* About */}
            <Box sx={{ mb: 5 }}>
                {sectionLabel("About")}
                <Box
                    sx={{
                        position: "relative",
                        minHeight: 360,
                        p: 3,
                        borderRadius: 2.5,
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-end",
                        background: coverImage
                            ? `linear-gradient(0deg, rgba(0,0,0,.92), rgba(0,0,0,.08)), url(${coverImage}) center 25%/cover no-repeat`
                            : "linear-gradient(135deg, #292524, #111827)",
                    }}
                >
                    <Box sx={{ position: "relative", color: "#fff" }}>
                        <Typography sx={{ fontSize: 24, fontWeight: 900 }}>{artist.name}</Typography>
                        <Typography sx={{ mt: 0.75, fontSize: 13, color: "rgba(255,255,255,.78)" }}>
                            {uniqueTrackCountQuery.data != null
                                ? `${uniqueTrackCountQuery.data} bài hát`
                                : `${albums_total} bản phát hành`}
                            {artist.followers ? ` · ${artist.followers.toLocaleString("vi-VN")} người theo dõi` : ""}
                        </Typography>
                        {genres.length > 0 && (
                            <Typography sx={{ mt: 0.75, fontSize: 12, color: "rgba(255,255,255,.65)" }}>
                                {genres.slice(0, 5).join(" · ")}
                            </Typography>
                        )}
                        {wikiBioQuery.isLoading && (
                            <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1 }}>
                                <CircularProgress size={14} sx={{ color: "rgba(255,255,255,.5)" }} />
                                <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>
                                    Đang tải thông tin từ Wikipedia…
                                </Typography>
                            </Box>
                        )}
                        {wikiBioQuery.data && (
                            <Box sx={{ mt: 2 }}>
                                <Typography
                                    sx={{
                                        fontSize: 13,
                                        lineHeight: 1.65,
                                        color: "rgba(255,255,255,.82)",
                                        display: "-webkit-box",
                                        WebkitLineClamp: showFullBio ? "unset" : 5,
                                        WebkitBoxOrient: "vertical",
                                        overflow: showFullBio ? "visible" : "hidden",
                                    }}
                                >
                                    {wikiBioQuery.data.extract}
                                </Typography>
                                <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1.5 }}>
                                    <Button
                                        size="small"
                                        onClick={() => setShowFullBio((v) => !v)}
                                        sx={{ color: "rgba(255,255,255,.6)", textTransform: "none", fontSize: 12, p: 0, minWidth: 0, "&:hover": { color: "#fff", bgcolor: "transparent" } }}
                                    >
                                        {showFullBio ? "Thu gọn" : "Xem thêm"}
                                    </Button>
                                    <Typography
                                        component="a"
                                        href={`https://en.wikipedia.org/?curid=${wikiBioQuery.data.pageid}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        sx={{ fontSize: 11, color: "rgba(255,255,255,.4)", textDecoration: "none", "&:hover": { color: "rgba(255,255,255,.7)", textDecoration: "underline" } }}
                                    >
                                        Wikipedia
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                    </Box>
                </Box>
            </Box>

            {playlists.length > 0 && (
                <Box sx={{ mb: 5 }}>
                    {sectionLabel("Artist Playlists")}
                    <Box sx={{ display: "flex", gap: 2, overflowX: "auto", pb: 1 }}>
                        {playlists.map((playlist) => (
                            <SpotifyCollectionCard key={playlist.id} item={playlist} />
                        ))}
                    </Box>
                </Box>
            )}

            {related_artists.length > 0 && (
                <Box sx={{ mb: 5 }}>
                    {sectionLabel("Fans also like")}
                    <Box sx={{ display: "flex", gap: 2, overflowX: "auto", pb: 1 }}>
                        {related_artists.map((relatedArtist) => (
                            <RelatedArtistCard key={relatedArtist.id} artist={relatedArtist} />
                        ))}
                    </Box>
                </Box>
            )}
        </Box>
    );
}
