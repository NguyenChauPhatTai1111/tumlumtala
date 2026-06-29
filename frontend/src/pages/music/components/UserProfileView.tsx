import FavoriteIcon from "@mui/icons-material/Favorite";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import PersonIcon from "@mui/icons-material/Person";
import { Avatar, Box, Chip, Divider, Stack, Typography } from "@mui/material";
import type { MediaItem } from "@pages/music/types";
import { formatDisplayName, formatDuration } from "@pages/music/utils";
import { usePlayerStore } from "@store/playerStore";

const SP_GREEN = "#f97316";

function computeProfile(recentItems: MediaItem[]) {
    const genreMap = new Map<string, number>();
    const artistMap = new Map<string, number>();

    for (const item of recentItems) {
        if (item.genre) genreMap.set(item.genre, (genreMap.get(item.genre) ?? 0) + 1);
        artistMap.set(item.artist, (artistMap.get(item.artist) ?? 0) + 1);
    }

    const topGenres = [...genreMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([g]) => g);

    const topArtists = [...artistMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);

    const recentSample = recentItems.slice(0, 3);

    // Total listening time (seconds)
    const totalSeconds = recentItems.reduce((s, i) => s + (i.duration ?? 0), 0);

    return { topGenres, topArtists, recentSample, totalSeconds };
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <Box sx={{ flex: 1, minWidth: 0, bgcolor: "action.hover", borderRadius: 2, p: 2, display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Box sx={{ color: SP_GREEN, display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
                {icon}
                <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "text.secondary" }}>
                    {label}
                </Typography>
            </Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: "text.primary" }}>
                {value}
            </Typography>
        </Box>
    );
}

export function UserProfileView() {
    const { recentItems, likedItems, play } = usePlayerStore();
    const { topGenres, topArtists, recentSample, totalSeconds } = computeProfile(recentItems);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const listeningTime = hours > 0 ? `${hours}h ${minutes}p` : `${minutes} phút`;

    const empty = recentItems.length === 0;

    return (
        <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
                <PersonIcon sx={{ color: SP_GREEN, fontSize: 28 }} />
                <Typography sx={{ fontWeight: 800, fontSize: 22, color: "text.primary" }}>
                    Hồ sơ âm nhạc của bạn
                </Typography>
            </Stack>

            {empty ? (
                <Box sx={{ py: 8, textAlign: "center" }}>
                    <PersonIcon sx={{ fontSize: 56, color: "text.disabled", mb: 2 }} />
                    <Typography sx={{ color: "text.disabled", fontSize: 15 }}>
                        Nghe nhạc để khám phá hồ sơ âm nhạc của bạn.
                    </Typography>
                </Box>
            ) : (
                <>
                    {/* Stats row */}
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 3 }}>
                        <StatCard
                            icon={<GraphicEqIcon sx={{ fontSize: 16 }} />}
                            label="Đã nghe"
                            value={`${recentItems.length} bài`}
                        />
                        <StatCard
                            icon={<GraphicEqIcon sx={{ fontSize: 16 }} />}
                            label="Thời gian nghe"
                            value={listeningTime}
                        />
                        <StatCard
                            icon={<FavoriteIcon sx={{ fontSize: 16 }} />}
                            label="Yêu thích"
                            value={`${likedItems.length} bài`}
                        />
                    </Stack>

                    {/* Top genres */}
                    {topGenres.length > 0 && (
                        <Box sx={{ mb: 3 }}>
                            <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "text.disabled", mb: 1.5 }}>
                                Thể loại bạn nghe nhiều
                            </Typography>
                            <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap>
                                {topGenres.map((g, i) => (
                                    <Chip
                                        key={g}
                                        label={g}
                                        size="small"
                                        sx={{
                                            bgcolor: i === 0 ? SP_GREEN : "action.selected",
                                            color: i === 0 ? "black" : "text.primary",
                                            fontWeight: i === 0 ? 700 : 500,
                                            fontSize: 12,
                                        }}
                                    />
                                ))}
                            </Stack>
                        </Box>
                    )}

                    {/* Top artists */}
                    {topArtists.length > 0 && (
                        <Box sx={{ mb: 3 }}>
                            <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "text.disabled", mb: 1.5 }}>
                                Nghệ sĩ bạn nghe nhiều nhất
                            </Typography>
                            <Stack direction="column" spacing={0.5}>
                                {topArtists.map((name, i) => {
                                    const thumb = recentItems.find((r) => r.artist === name)?.thumbnail;
                                    return (
                                        <Box key={name} sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 1, py: 0.75 }}>
                                            <Typography sx={{ width: 20, fontSize: 13, color: "text.disabled", fontWeight: 700 }}>
                                                {i + 1}
                                            </Typography>
                                            <Avatar src={thumb} sx={{ width: 36, height: 36 }} />
                                            <Typography sx={{ fontSize: 14, fontWeight: 600, color: "text.primary" }}>
                                                {formatDisplayName(name)}
                                            </Typography>
                                            {i === 0 && (
                                                <Chip label="Yêu thích nhất" size="small" sx={{ bgcolor: `${SP_GREEN}22`, color: SP_GREEN, fontSize: 11, fontWeight: 700, ml: "auto" }} />
                                            )}
                                        </Box>
                                    );
                                })}
                            </Stack>
                        </Box>
                    )}

                    <Divider sx={{ mb: 3 }} />

                    {/* Recently played sample */}
                    <Box>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "text.disabled", mb: 1.5 }}>
                            Nghe gần đây
                        </Typography>
                        <Stack spacing={0.5}>
                            {recentSample.map((item) => (
                                <Box
                                    key={item.id}
                                    onClick={() => play(item, recentItems)}
                                    sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 1, py: 0.75, borderRadius: 1, cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
                                >
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
                                </Box>
                            ))}
                        </Stack>
                    </Box>
                </>
            )}
        </Box>
    );
}
