import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import HeadphonesIcon from "@mui/icons-material/Headphones";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import {
    Box,
    Chip,
    CircularProgress,
    Divider,
    LinearProgress,
    Stack,
    Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { getUserDNA } from "@services/musicBackendService";
import type { UserDNAEntry } from "@services/musicBackendService";

const SP_GREEN = "#f97316";

function StatCard({
    icon,
    label,
    value,
    sub,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    sub?: string;
}) {
    return (
        <Box
            sx={{
                bgcolor: "rgba(255,255,255,0.05)",
                borderRadius: 2,
                p: 2.5,
                flex: 1,
                minWidth: 140,
            }}
        >
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <Box sx={{ color: SP_GREEN, display: "flex" }}>{icon}</Box>
                <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {label}
                </Typography>
            </Stack>
            <Typography sx={{ fontSize: 28, fontWeight: 800, color: "white", lineHeight: 1 }}>
                {value}
            </Typography>
            {sub && (
                <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.4)", mt: 0.5 }}>
                    {sub}
                </Typography>
            )}
        </Box>
    );
}

function GenreBar({ entry, max }: { entry: UserDNAEntry; max: number }) {
    const completionRate = entry.play_count > 0
        ? Math.round(entry.completion_sum / entry.play_count)
        : 0;
    const skipRate = entry.play_count > 0
        ? Math.round((entry.skip_count / entry.play_count) * 100)
        : 0;
    const progress = max > 0 ? (entry.play_count / max) * 100 : 0;

    return (
        <Box sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: "white" }}>
                        {entry.genre || "Unknown"}
                    </Typography>
                    {completionRate >= 70 && (
                        <Chip label="Yêu thích" size="small" sx={{ bgcolor: `${SP_GREEN}22`, color: SP_GREEN, fontSize: 10, height: 18 }} />
                    )}
                </Stack>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Stack direction="row" alignItems="center" spacing={0.4}>
                        <HeadphonesIcon sx={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }} />
                        <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                            {entry.play_count}
                        </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.4}>
                        <ThumbUpIcon sx={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }} />
                        <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                            {completionRate}%
                        </Typography>
                    </Stack>
                    {skipRate > 0 && (
                        <Stack direction="row" alignItems="center" spacing={0.4}>
                            <SkipNextIcon sx={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }} />
                            <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                                {skipRate}%
                            </Typography>
                        </Stack>
                    )}
                </Stack>
            </Stack>
            <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: "rgba(255,255,255,0.08)",
                    "& .MuiLinearProgress-bar": {
                        bgcolor: completionRate >= 70 ? SP_GREEN : "rgba(255,255,255,0.3)",
                        borderRadius: 3,
                    },
                }}
            />
        </Box>
    );
}

export function ListeningStatsView() {
    const { data: dna, isLoading } = useQuery<UserDNAEntry[]>({
        queryKey: ["user-dna"],
        queryFn: getUserDNA,
        staleTime: 60_000,
    });

    const totalPlays = dna?.reduce((s, d) => s + d.play_count, 0) ?? 0;
    const totalSkips = dna?.reduce((s, d) => s + d.skip_count, 0) ?? 0;
    const topGenre = dna?.[0];
    const avgCompletion = dna && dna.length > 0 && totalPlays > 0
        ? Math.round(dna.reduce((s, d) => s + d.completion_sum, 0) / totalPlays)
        : 0;
    const maxPlays = dna?.[0]?.play_count ?? 1;

    // top 3 genres for DNA badge
    const topThree = dna?.slice(0, 3) ?? [];

    return (
        <Box>
            <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
                <GraphicEqIcon sx={{ color: SP_GREEN, fontSize: 28 }} />
                <Box>
                    <Typography sx={{ fontSize: 24, fontWeight: 800, color: "white" }}>
                        Listening DNA
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                        Thói quen nghe nhạc của bạn
                    </Typography>
                </Box>
            </Stack>

            {isLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                    <CircularProgress sx={{ color: SP_GREEN }} />
                </Box>
            ) : !dna || dna.length === 0 ? (
                <Box
                    sx={{
                        textAlign: "center",
                        py: 10,
                        bgcolor: "rgba(255,255,255,0.03)",
                        borderRadius: 3,
                    }}
                >
                    <HeadphonesIcon sx={{ fontSize: 48, color: "rgba(255,255,255,0.15)", mb: 2 }} />
                    <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: 15 }}>
                        Chưa có dữ liệu
                    </Typography>
                    <Typography sx={{ color: "rgba(255,255,255,0.25)", fontSize: 13, mt: 0.5 }}>
                        Nghe vài bài để xem thống kê của bạn
                    </Typography>
                </Box>
            ) : (
                <>
                    {/* Summary cards */}
                    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap mb={4}>
                        <StatCard
                            icon={<HeadphonesIcon />}
                            label="Tổng lượt nghe"
                            value={totalPlays}
                            sub={`${dna.length} thể loại`}
                        />
                        <StatCard
                            icon={<ThumbUpIcon />}
                            label="Tỉ lệ nghe hết"
                            value={`${avgCompletion}%`}
                            sub="trung bình"
                        />
                        <StatCard
                            icon={<SkipNextIcon />}
                            label="Lượt skip"
                            value={totalSkips}
                            sub={totalPlays > 0 ? `${Math.round((totalSkips / totalPlays) * 100)}% tổng bài` : ""}
                        />
                    </Stack>

                    {/* Top genre highlight */}
                    {topGenre && (
                        <Box
                            sx={{
                                bgcolor: `${SP_GREEN}15`,
                                border: `1px solid ${SP_GREEN}40`,
                                borderRadius: 2,
                                p: 2,
                                mb: 3,
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                            }}
                        >
                            <GraphicEqIcon sx={{ color: SP_GREEN, fontSize: 32, flexShrink: 0 }} />
                            <Box>
                                <Typography sx={{ fontSize: 12, color: SP_GREEN, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                                    Thể loại yêu thích nhất
                                </Typography>
                                <Typography sx={{ fontSize: 20, fontWeight: 800, color: "white" }}>
                                    {topGenre.genre || "Unknown"}
                                </Typography>
                                <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                                    {topGenre.play_count} lượt · {topGenre.play_count > 0 ? Math.round(topGenre.completion_sum / topGenre.play_count) : 0}% nghe hết
                                </Typography>
                            </Box>
                            <Box sx={{ flex: 1 }} />
                            <Stack direction="row" spacing={0.75}>
                                {topThree.map((g) => (
                                    <Chip
                                        key={g.genre}
                                        label={g.genre || "?"}
                                        size="small"
                                        sx={{
                                            bgcolor: "rgba(255,255,255,0.08)",
                                            color: "rgba(255,255,255,0.7)",
                                            fontSize: 11,
                                        }}
                                    />
                                ))}
                            </Stack>
                        </Box>
                    )}

                    <Divider sx={{ borderColor: "rgba(255,255,255,0.08)", mb: 3 }} />

                    {/* Genre breakdown */}
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 0.5, mb: 2 }}>
                        Tất cả thể loại
                    </Typography>
                    {dna.map((entry) => (
                        <GenreBar key={entry.genre} entry={entry} max={maxPlays} />
                    ))}
                </>
            )}
        </Box>
    );
}
