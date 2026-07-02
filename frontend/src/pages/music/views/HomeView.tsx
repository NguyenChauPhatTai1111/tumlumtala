import { alpha, Box, Chip, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
    getSpotifyCategories,
    getSpotifyCategoryPlaylists,
    getSpotifyFeaturedPlaylists,
    getSpotifyNewReleases,
} from "@services/musicBackendService";
import type { MusicMood } from "@services/musicBackendService";
import { usePlayerStore } from "@store/playerStore";
import { HScrollSection } from "../components/HScrollSection";
import { ArtistCard } from "../components/ArtistCard";
import { MediaItemCard } from "../components/MediaItemCard";
import { PlaylistCard } from "../components/PlaylistCard";
import { TrackCard } from "../components/TrackCard";
import { SpotifyCollectionCard } from "../components/SpotifyCards";
import { MoodFilterBar } from "../components/MoodFilterBar";
import { ChartsPanel } from "../components/ChartsPanel";
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

export function HomeView({ scrollRef }: { scrollRef: React.RefObject<HTMLDivElement | null> }) {
    const { selectArtist, selectPlaylist } = useMusicContext();
    const { currentItem, recentItems } = usePlayerStore();
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
    const [activeMood, setActiveMood] = useState<MusicMood | null>(null);

    const trendingQuery = useTrendingQuery({ genre: "All", time: "week" });
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

    const recentTracks = useMemo(() => {
        const items = backendRecentQuery.data?.length ? backendRecentQuery.data : recentItems;
        return items.filter((i) => i.type === "audio").slice(0, 20);
    }, [backendRecentQuery.data, recentItems]);

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
        queryKey: ["spotify", "categories", 50],
        queryFn: () => getSpotifyCategories(50),
        staleTime: 60 * 60 * 1000,
    });
    const categories = categoriesQuery.data ?? [];
    const resolvedCategoryId =
        activeCategoryId && categories.some((category) => category.id === activeCategoryId)
            ? activeCategoryId
            : (categories[0]?.id ?? null);
    const categoryPlaylistsQuery = useQuery({
        queryKey: ["spotify", "category-playlists", resolvedCategoryId],
        queryFn: () => getSpotifyCategoryPlaylists(resolvedCategoryId!, 20),
        enabled: Boolean(resolvedCategoryId),
        staleTime: 15 * 60 * 1000,
    });

    const trendingTracks = trendingQuery.data ?? [];
    const trendingArtists = trendingArtistsQuery.data ?? [];
    const trendingPlaylists = trendingPlaylistsQuery.data ?? [];
    const trendingAlbums = trendingAlbumsQuery.data ?? [];
    const undergroundTracks = undergroundQuery.data ?? [];
    const recommendations = recommendationsQuery.data ?? [];
    const activeCategory =
        categories.find((category) => category.id === resolvedCategoryId) ?? categories[0];

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
            sx={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                minHeight: 0,
                overflow: "auto",
                p: { xs: 2, md: 3 },
                "& > *": { flexShrink: 0 },
            }}
        >
            <MoodFilterBar activeMood={activeMood} onMoodChange={setActiveMood} />

            <ChartsPanel />

            {seedItem && (
                <Box sx={{ order: -2, flexShrink: 0 }}>
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
                </Box>
            )}

            {recentTracks.length > 0 && (
                <HScrollSection title="Đã nghe gần đây" loading={backendRecentQuery.isLoading}>
                    {recentTracks.map((item) => (
                        <MediaItemCard key={item.id} item={item} queue={recentTracks} />
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
                    <ArtistCard
                        key={artist.id}
                        artist={artist}
                        onClick={() => selectArtist(artist)}
                    />
                ))}
            </HScrollSection>

            <HScrollSection title="Album mới nổi bật" loading={trendingAlbumsQuery.isLoading}>
                {trendingAlbums.map((album) => (
                    <PlaylistCard
                        key={album.id}
                        playlist={album}
                        onClick={() => selectPlaylist(album)}
                    />
                ))}
            </HScrollSection>

            <HScrollSection title="Playlist nổi bật" loading={trendingPlaylistsQuery.isLoading}>
                {trendingPlaylists.map((playlist) => (
                    <PlaylistCard
                        key={playlist.id}
                        playlist={playlist}
                        onClick={() => selectPlaylist(playlist)}
                    />
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

            <HScrollSection title="Playlist nổi bật" loading={featuredPlaylistsQuery.isLoading}>
                {(featuredPlaylistsQuery.data ?? []).map((item) => (
                    <SpotifyCollectionCard key={item.id} item={item} />
                ))}
            </HScrollSection>

            {categories.length > 0 && (
                <Box
                    component="section"
                    sx={{
                        position: "relative",
                        flexShrink: 0,
                        overflow: "hidden",
                        order: -1,
                        mb: 4,
                        p: { xs: 2, md: 2.5 },
                        borderRadius: 3,
                        border: "1px solid",
                        borderColor: (theme) => alpha(theme.palette.primary.main, 0.16),
                        bgcolor: (theme) =>
                            theme.palette.mode === "light"
                                ? alpha(theme.palette.primary.main, 0.035)
                                : alpha(theme.palette.common.white, 0.025),
                        backgroundImage: (theme) =>
                            `radial-gradient(circle at 92% 0%, ${alpha(
                                theme.palette.primary.main,
                                theme.palette.mode === "light" ? 0.1 : 0.08,
                            )}, transparent 34%)`,
                    }}
                >
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "flex-end",
                            justifyContent: "space-between",
                            gap: 2,
                            mb: 2,
                        }}
                    >
                        <Box>
                            <Typography
                                sx={{
                                    fontSize: { xs: 22, md: 26 },
                                    fontWeight: 900,
                                    letterSpacing: "-0.035em",
                                }}
                            >
                                Khám phá theo thể loại
                            </Typography>
                            <Typography sx={{ mt: 0.35, color: "text.secondary", fontSize: 13 }}>
                                Chọn một không gian âm nhạc, rồi bắt đầu từ playlist phù hợp.
                            </Typography>
                        </Box>
                        <Typography
                            sx={{
                                display: { xs: "none", sm: "block" },
                                color: "text.disabled",
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                            }}
                        >
                            {categories.length} thể loại
                        </Typography>
                    </Box>

                    <Stack direction="row" useFlexGap flexWrap="wrap" gap={1} sx={{ mb: 2.5 }}>
                        {categories.map((category) => {
                            const selected = category.id === activeCategory?.id;
                            return (
                                <Chip
                                    key={category.id}
                                    label={category.name}
                                    clickable
                                    onClick={() => setActiveCategoryId(category.id)}
                                    aria-pressed={selected}
                                    sx={{
                                        height: 36,
                                        borderRadius: "18px",
                                        border: "1px solid",
                                        borderColor: selected ? SP_GREEN : alpha(SP_GREEN, 0.2),
                                        bgcolor: selected ? SP_GREEN : "action.selected",
                                        color: selected ? "#17120f" : "text.primary",
                                        fontWeight: 750,
                                        transition:
                                            "transform 200ms ease, border-color 200ms ease, background-color 200ms ease",
                                        "& .MuiChip-label": { px: 1.75 },
                                        "&:hover": {
                                            transform: "translateY(-1px)",
                                            borderColor: SP_GREEN,
                                            bgcolor: selected ? "#fb923c" : alpha(SP_GREEN, 0.12),
                                        },
                                        "&:active": { transform: "translateY(0) scale(.97)" },
                                        "&:focus-visible": {
                                            outline: `2px solid ${SP_GREEN}`,
                                            outlineOffset: 2,
                                        },
                                    }}
                                />
                            );
                        })}
                    </Stack>

                    {activeCategory && (
                        <Box sx={{ pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
                            <HScrollSection
                                title={`Playlist ${activeCategory.name}`}
                                meta="Tuyển chọn từ Spotify"
                                loading={categoryPlaylistsQuery.isLoading}
                                mb={0}
                            >
                                {(categoryPlaylistsQuery.data ?? []).map((item) => (
                                    <SpotifyCollectionCard key={item.id} item={item} />
                                ))}
                            </HScrollSection>
                            {!categoryPlaylistsQuery.isLoading &&
                                (categoryPlaylistsQuery.data ?? []).length === 0 && (
                                    <Typography
                                        sx={{ py: 2, color: "text.disabled", fontSize: 13 }}
                                    >
                                        Chưa có playlist phù hợp cho thể loại này.
                                    </Typography>
                                )}
                        </Box>
                    )}
                </Box>
            )}

        </Box>
    );
}
