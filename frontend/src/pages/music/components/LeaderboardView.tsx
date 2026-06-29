import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import PersonIcon from "@mui/icons-material/Person";
import { Avatar, Box, Stack, Tab, Tabs, Typography } from "@mui/material";
import type { MediaItem } from "@pages/music/types";
import { formatDisplayName, formatDuration } from "@pages/music/utils";
import { useState } from "react";
import { usePlayerStore } from "@store/playerStore";

const SP_GREEN = "#f97316";

function rankColor(rank: number) {
    if (rank === 1) return "#f59e0b";
    if (rank === 2) return "#94a3b8";
    if (rank === 3) return "#cd7c3f";
    return "text.disabled";
}

interface TrackStat {
    item: MediaItem;
    count: number;
}
interface ArtistStat {
    name: string;
    thumbnail: string;
    count: number;
}
interface GenreStat {
    genre: string;
    count: number;
}

function computeStats(recentItems: MediaItem[]): {
    topTracks: TrackStat[];
    topArtists: ArtistStat[];
    topGenres: GenreStat[];
} {
    const trackMap = new Map<string, { item: MediaItem; count: number }>();
    const artistMap = new Map<string, { name: string; thumbnail: string; count: number }>();
    const genreMap = new Map<string, number>();

    for (const item of recentItems) {
        // Tracks
        const existing = trackMap.get(item.id);
        if (existing) existing.count++;
        else trackMap.set(item.id, { item, count: 1 });

        // Artists
        const a = artistMap.get(item.artist);
        if (a) a.count++;
        else artistMap.set(item.artist, { name: item.artist, thumbnail: item.thumbnail, count: 1 });

        // Genres
        if (item.genre) {
            genreMap.set(item.genre, (genreMap.get(item.genre) ?? 0) + 1);
        }
    }

    const topTracks = [...trackMap.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
    const topArtists = [...artistMap.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
    const topGenres = [...genreMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([genre, count]) => ({ genre, count }));

    return { topTracks, topArtists, topGenres };
}

export function LeaderboardView() {
    const { recentItems, play } = usePlayerStore();
    const [tab, setTab] = useState(0);
    const { topTracks, topArtists, topGenres } = computeStats(recentItems);

    const empty = recentItems.length === 0;

    return (
        <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
                <EmojiEventsIcon sx={{ color: SP_GREEN, fontSize: 28 }} />
                <Typography sx={{ fontWeight: 800, fontSize: 22, color: "text.primary" }}>
                    Bảng xếp hạng của bạn
                </Typography>
            </Stack>

            {empty ? (
                <Box sx={{ py: 8, textAlign: "center" }}>
                    <EmojiEventsIcon sx={{ fontSize: 56, color: "text.disabled", mb: 2 }} />
                    <Typography sx={{ color: "text.disabled", fontSize: 15 }}>
                        Nghe nhạc để xây dựng bảng xếp hạng của bạn.
                    </Typography>
                </Box>
            ) : (
                <>
                    <Tabs
                        value={tab}
                        onChange={(_, v: number) => setTab(v)}
                        sx={{
                            mb: 3,
                            minHeight: 36,
                            "& .MuiTab-root": { color: "text.secondary", fontSize: 13, fontWeight: 600, minHeight: 36, textTransform: "none", px: 2 },
                            "& .Mui-selected": { color: "text.primary" },
                            "& .MuiTabs-indicator": { bgcolor: SP_GREEN, height: 2 },
                        }}
                    >
                        <Tab label="Top Bài Hát" />
                        <Tab label="Top Nghệ Sĩ" />
                        <Tab label="Top Thể Loại" />
                    </Tabs>

                    {/* Top Tracks */}
                    {tab === 0 && (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                            {topTracks.map(({ item, count }, i) => (
                                <Box
                                    key={item.id}
                                    onClick={() => play(item, topTracks.map((t) => t.item))}
                                    sx={{
                                        display: "flex", alignItems: "center", gap: 1.5,
                                        px: 1.5, py: 1, borderRadius: 1, cursor: "pointer",
                                        "&:hover": { bgcolor: "action.hover" },
                                        transition: "background-color 0.15s",
                                    }}
                                >
                                    <Typography sx={{ width: 28, textAlign: "center", fontSize: 13, fontWeight: 700, color: rankColor(i + 1), flexShrink: 0 }}>
                                        {i + 1}
                                    </Typography>
                                    <Avatar variant="rounded" src={item.thumbnail} sx={{ width: 40, height: 40, borderRadius: 0.5, flexShrink: 0 }} />
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography noWrap sx={{ fontSize: 14, fontWeight: 600, color: "text.primary" }}>
                                            {formatDisplayName(item.title)}
                                        </Typography>
                                        <Typography noWrap sx={{ fontSize: 12, color: "text.secondary" }}>
                                            {formatDisplayName(item.artist)}
                                            {item.duration ? ` · ${formatDuration(item.duration)}` : ""}
                                        </Typography>
                                    </Box>
                                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
                                        <GraphicEqIcon sx={{ fontSize: 14, color: SP_GREEN }} />
                                        <Typography sx={{ fontSize: 12, color: SP_GREEN, fontWeight: 700 }}>
                                            {count}x
                                        </Typography>
                                    </Stack>
                                </Box>
                            ))}
                        </Box>
                    )}

                    {/* Top Artists */}
                    {tab === 1 && (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                            {topArtists.map(({ name, thumbnail, count }, i) => (
                                <Box
                                    key={name}
                                    sx={{
                                        display: "flex", alignItems: "center", gap: 1.5,
                                        px: 1.5, py: 1, borderRadius: 1,
                                    }}
                                >
                                    <Typography sx={{ width: 28, textAlign: "center", fontSize: 13, fontWeight: 700, color: rankColor(i + 1), flexShrink: 0 }}>
                                        {i + 1}
                                    </Typography>
                                    <Avatar src={thumbnail} sx={{ width: 40, height: 40, flexShrink: 0 }} />
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography noWrap sx={{ fontSize: 14, fontWeight: 600, color: "text.primary" }}>
                                            {formatDisplayName(name)}
                                        </Typography>
                                    </Box>
                                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
                                        <PersonIcon sx={{ fontSize: 14, color: SP_GREEN }} />
                                        <Typography sx={{ fontSize: 12, color: SP_GREEN, fontWeight: 700 }}>
                                            {count} bài
                                        </Typography>
                                    </Stack>
                                </Box>
                            ))}
                        </Box>
                    )}

                    {/* Top Genres */}
                    {tab === 2 && (
                        topGenres.length > 0 ? (
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                {topGenres.map(({ genre, count }, i) => {
                                    const total = topGenres.reduce((s, g) => s + g.count, 0);
                                    const pct = Math.round((count / total) * 100);
                                    return (
                                        <Box key={genre} sx={{ display: "flex", alignItems: "center", gap: 2, px: 1 }}>
                                            <Typography sx={{ width: 28, textAlign: "center", fontSize: 13, fontWeight: 700, color: rankColor(i + 1), flexShrink: 0 }}>
                                                {i + 1}
                                            </Typography>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography sx={{ fontSize: 14, fontWeight: 600, color: "text.primary", mb: 0.5 }}>
                                                    {genre}
                                                </Typography>
                                                <Box sx={{ height: 6, borderRadius: 3, bgcolor: "action.selected", overflow: "hidden" }}>
                                                    <Box sx={{ height: "100%", width: `${pct}%`, bgcolor: SP_GREEN, borderRadius: 3 }} />
                                                </Box>
                                            </Box>
                                            <Typography sx={{ fontSize: 12, color: "text.secondary", flexShrink: 0, minWidth: 40, textAlign: "right" }}>
                                                {pct}%
                                            </Typography>
                                        </Box>
                                    );
                                })}
                            </Box>
                        ) : (
                            <Typography sx={{ color: "text.disabled", fontSize: 14, textAlign: "center", py: 6 }}>
                                Chưa đủ dữ liệu thể loại. Nghe thêm nhạc từ Audius để xây dựng.
                            </Typography>
                        )
                    )}
                </>
            )}
        </Box>
    );
}
