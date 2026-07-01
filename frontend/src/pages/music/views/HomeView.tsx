import { Box, Chip, Skeleton, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
    getSpotifyCategories,
    getSpotifyCategoryPlaylists,
    getSpotifyFeaturedPlaylists,
    getSpotifyNewReleases,
} from "@services/musicBackendService";
import { usePlayerStore } from "@store/playerStore";
import { HScrollSection } from "../components/HScrollSection";
import { ArtistCard } from "../components/ArtistCard";
import { PlaylistCard } from "../components/PlaylistCard";
import { TrackCard } from "../components/TrackCard";
import { SpotifyCollectionCard } from "../components/SpotifyCards";
import { SP_GREEN } from "../constants";
import { formatDisplayName } from "../utils";
import { useMusicContext } from "../MusicContext";
import {
    useBackendRecentQuery,
    useRecommendationsQuery,
    useTrendingAlbumsQuery,
    useTrendingArtistsQuery,
    useTrendingPlaylistsQuery,
    useTrendingQuery,
    useUndergroundTrendingQuery,
} from "../hooks/useMusicQueries";
import type { TrendingGenre, TrendingTimeFilter } from "../types";
import { useMemo } from "react";

export function HomeView({ scrollRef }: { scrollRef: React.RefObject<HTMLDivElement | null> }) {
    const { selectArtist, selectPlaylist } = useMusicContext();
    const { currentItem, recentItems } = usePlayerStore();
    const [trendingGenre, setTrendingGenre] = useState<TrendingGenre>("All");
    const [trendingTime, setTrendingTime] = useState<TrendingTimeFilter>("week");
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

    const trendingQuery = useTrendingQuery({ genre: trendingGenre, time: trendingTime });
    const trendingArtistsQuery = useTrendingArtistsQuery();
    const trendingPlaylistsQuery = useTrendingPlaylistsQuery();
    const trendingAlbumsQuery = useTrendingAlbumsQuery();
    const undergroundQuery = useUndergroundTrendingQuery();
    const backendRecentQuery = useBackendRecentQuery();

    const seedItem = useMemo(() => {
        if (currentItem?.type === "audio") return currentItem;
        const fromBackend = (backendRecentQuery.data ?? []).find((i) => i.type === "audio");
        if (fromBackend) return fromBackend;
        return recentItems.find((i) => i.type === "audio") ?? null;
    }, [currentItem, backendRecentQuery.data, recentItems]);

    const recommendationsQuery = useRecommendationsQuery(seedItem?.sourceId);

    const newReleasesQuery = useQuery({
        queryKey: ["spotify", "new-releases"],
        queryFn: () => getSpotifyNewReleases(20),
        staleTime: 30 * 60 * 1000,
    });
    const featuredPlaylistsQuery = useQuery({
        queryKey: ["spotify", "featured-playlists"],
        queryFn: () => getSpotifyFeaturedPlaylists(20),
        staleTime: 30 * 60 * 1000,
    });
    const categoriesQuery = useQuery({
        queryKey: ["spotify", "categories"],
        queryFn: () => getSpotifyCategories(20),
        staleTime: 60 * 60 * 1000,
    });
    const categoryPlaylistsQuery = useQuery({
        queryKey: ["spotify", "category-playlists", activeCategoryId],
        queryFn: () => getSpotifyCategoryPlaylists(activeCategoryId!, 20),
        enabled: Boolean(activeCategoryId),
        staleTime: 15 * 60 * 1000,
    });

    const trendingTracks = trendingQuery.data ?? [];
    const trendingArtists = trendingArtistsQuery.data ?? [];
    const trendingPlaylists = trendingPlaylistsQuery.data ?? [];
    const trendingAlbums = trendingAlbumsQuery.data ?? [];
    const undergroundTracks = undergroundQuery.data ?? [];
    const recommendations = recommendationsQuery.data ?? [];

    const recommendationReason = (reasons: string[]) => {
        if (reasons.includes("same_album")) return "Cùng album";
        if (reasons.includes("same_playlist")) return "Cùng playlist";
        if (reasons.includes("same_artist")) return "Cùng nghệ sĩ";
        if (reasons.includes("common_tags")) return "Cùng tag";
        if (reasons.includes("same_genre")) return "Cùng thể loại";
        return "Hợp gu nghe của bạn";
    };

    return (
        <Box
            ref={scrollRef}
            sx={{ flex: 1, minHeight: 0, overflow: "auto", p: { xs: 2, md: 3 } }}
        >
            <Box sx={{ mb: 3 }}>
                <Typography
                    sx={{ fontWeight: 900, fontSize: { xs: 24, md: 30 }, color: "text.primary", mb: 2 }}
                >
                    Chào mừng trở lại
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                    {(["All", "Electronic", "Hip-Hop/Rap", "Pop", "Rock", "R&B/Soul", "Jazz", "House", "Techno", "Ambient", "Latin"] as TrendingGenre[]).map((g) => (
                        <Chip
                            key={g}
                            label={g}
                            size="small"
                            onClick={() => setTrendingGenre(g)}
                            sx={{
                                bgcolor: trendingGenre === g ? SP_GREEN : "action.hover",
                                color: trendingGenre === g ? "black" : "text.secondary",
                                fontWeight: trendingGenre === g ? 700 : 400,
                                "&:hover": { bgcolor: trendingGenre === g ? "#fb923c" : "action.selected" },
                            }}
                        />
                    ))}
                </Stack>
                <Stack direction="row" spacing={0.75}>
                    {([["week", "Tuần này"], ["month", "Tháng này"], ["allTime", "Mọi thời đại"]] as [TrendingTimeFilter, string][]).map(([t, label]) => (
                        <Chip
                            key={t}
                            label={label}
                            size="small"
                            onClick={() => setTrendingTime(t)}
                            sx={{
                                bgcolor: trendingTime === t ? "action.selected" : "transparent",
                                color: trendingTime === t ? "text.primary" : "text.disabled",
                                border: "1px solid",
                                borderColor: "divider",
                                fontWeight: trendingTime === t ? 700 : 400,
                                "&:hover": { bgcolor: "action.hover" },
                            }}
                        />
                    ))}
                </Stack>
            </Box>

            {seedItem && (
                <HScrollSection
                    title={`Vì bạn đã nghe "${formatDisplayName(seedItem.title)}"`}
                    loading={recommendationsQuery.isLoading}
                >
                    {recommendations.map((track) => (
                        <TrackCard
                            key={track.id}
                            track={track}
                            queue={recommendations}
                            recommendationReason={recommendationReason(track.reasons)}
                        />
                    ))}
                </HScrollSection>
            )}

            <HScrollSection title="Xu hướng" loading={trendingQuery.isLoading}>
                {trendingTracks.map((track) => (
                    <TrackCard key={track.id} track={track} queue={trendingTracks} />
                ))}
            </HScrollSection>

            <HScrollSection title="Nghệ sĩ phổ biến" loading={trendingArtistsQuery.isLoading}>
                {trendingArtists.map((artist) => (
                    <ArtistCard key={artist.id} artist={artist} onClick={() => selectArtist(artist)} />
                ))}
            </HScrollSection>

            <HScrollSection title="Album mới nổi bật" loading={trendingAlbumsQuery.isLoading}>
                {trendingAlbums.map((album) => (
                    <PlaylistCard key={album.id} playlist={album} onClick={() => selectPlaylist(album)} />
                ))}
            </HScrollSection>

            <HScrollSection title="Playlist nổi bật" loading={trendingPlaylistsQuery.isLoading}>
                {trendingPlaylists.map((playlist) => (
                    <PlaylistCard key={playlist.id} playlist={playlist} onClick={() => selectPlaylist(playlist)} />
                ))}
            </HScrollSection>

            <HScrollSection title="Underground" loading={undergroundQuery.isLoading}>
                {undergroundTracks.map((track) => (
                    <TrackCard key={track.id} track={track} queue={undergroundTracks} />
                ))}
            </HScrollSection>

            <HScrollSection title="Phát hành mới" loading={newReleasesQuery.isLoading}>
                {(newReleasesQuery.data ?? []).map((item) => (
                    <SpotifyCollectionCard key={item.id} item={item} />
                ))}
            </HScrollSection>

            <HScrollSection title="Playlist nổi bật từ ban biên tập" loading={featuredPlaylistsQuery.isLoading}>
                {(featuredPlaylistsQuery.data ?? []).map((item) => (
                    <SpotifyCollectionCard key={item.id} item={item} />
                ))}
            </HScrollSection>

            {(categoriesQuery.data ?? []).length > 0 && (
                <Box sx={{ mb: 4 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 18, mb: 1.5 }}>
                        Khám phá theo thể loại
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mb: 2, overflowX: "auto", pb: 0.5 }}>
                        {(categoriesQuery.data ?? []).map((cat) => (
                            <Chip
                                key={cat.id}
                                label={cat.name}
                                onClick={() => setActiveCategoryId((prev) => prev === cat.id ? null : cat.id)}
                                sx={{
                                    flexShrink: 0,
                                    fontWeight: 700,
                                    bgcolor: activeCategoryId === cat.id ? "text.primary" : "action.selected",
                                    color: activeCategoryId === cat.id ? "background.default" : "text.primary",
                                }}
                            />
                        ))}
                    </Stack>
                    {activeCategoryId && (
                        categoryPlaylistsQuery.isLoading ? (
                            <Stack direction="row" spacing={2}>
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <Skeleton key={i} variant="rounded" width={160} height={200} />
                                ))}
                            </Stack>
                        ) : (
                            <Box sx={{ display: "flex", gap: 2, overflowX: "auto", pb: 1, "&::-webkit-scrollbar": { height: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: 2 } }}>
                                {(categoryPlaylistsQuery.data ?? []).map((item) => (
                                    <SpotifyCollectionCard key={item.id} item={item} />
                                ))}
                            </Box>
                        )
                    )}
                </Box>
            )}
        </Box>
    );
}
