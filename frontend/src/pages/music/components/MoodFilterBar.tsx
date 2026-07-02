import { alpha, Box, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import type { MusicMood } from "@services/musicBackendService";
import { SP_GREEN } from "../constants";
import { useMoodRecommendationsQuery } from "../hooks/useMusicQueries";
import { MediaItemCard } from "./MediaItemCard";
import { HScrollSection } from "./HScrollSection";

interface MoodConfig {
    mood: MusicMood;
    label: string;
    gradient: string;
}

const MOODS: MoodConfig[] = [
    {
        mood: "happy",
        label: "Vui vẻ",
        gradient: "linear-gradient(135deg,#f97316,#fbbf24)",
    },
    {
        mood: "sad",
        label: "Buồn",
        gradient: "linear-gradient(135deg,#6366f1,#818cf8)",
    },
    {
        mood: "focus",
        label: "Tập trung",
        gradient: "linear-gradient(135deg,#0ea5e9,#38bdf8)",
    },
    {
        mood: "workout",
        label: "Tập thể dục",
        gradient: "linear-gradient(135deg,#ef4444,#f97316)",
    },
    {
        mood: "chill",
        label: "Thư giãn",
        gradient: "linear-gradient(135deg,#10b981,#34d399)",
    },
    {
        mood: "party",
        label: "Tiệc tùng",
        gradient: "linear-gradient(135deg,#ec4899,#f43f5e)",
    },
];

interface Props {
    activeMood: MusicMood | null;
    onMoodChange: (mood: MusicMood | null) => void;
}

export function MoodFilterBar({ activeMood, onMoodChange }: Props) {
    const moodQuery = useMoodRecommendationsQuery(activeMood);
    const activeConfig = MOODS.find((m) => m.mood === activeMood);

    return (
        <Box
            component="section"
            sx={{
                flexShrink: 0,
                mb: 4,
                p: { xs: 2, md: 2.5 },
                borderRadius: 3,
                border: "1px solid",
                borderColor: (theme) => alpha(theme.palette.primary.main, 0.16),
                bgcolor: (theme) =>
                    theme.palette.mode === "light"
                        ? alpha(theme.palette.primary.main, 0.03)
                        : alpha(theme.palette.common.white, 0.025),
                backgroundImage: (theme) =>
                    `radial-gradient(circle at 8% 100%, ${alpha(
                        theme.palette.primary.main,
                        theme.palette.mode === "light" ? 0.08 : 0.07,
                    )}, transparent 40%)`,
            }}
        >
            <Box sx={{ mb: 2 }}>
                <Typography
                    sx={{ fontSize: { xs: 20, md: 24 }, fontWeight: 900, letterSpacing: "-0.03em" }}
                >
                    Nghe theo cảm xúc
                </Typography>
                <Typography sx={{ mt: 0.35, color: "text.secondary", fontSize: 13 }}>
                    Chọn mood, nhạc phù hợp sẽ xuất hiện ngay.
                </Typography>
            </Box>

            <Stack
                direction="row"
                useFlexGap
                flexWrap="wrap"
                gap={1}
                sx={{ mb: activeMood ? 2.5 : 0 }}
            >
                {MOODS.map((cfg) => {
                    const selected = cfg.mood === activeMood;
                    return (
                        <Chip
                            key={cfg.mood}
                            label={cfg.label}
                            clickable
                            onClick={() => onMoodChange(selected ? null : cfg.mood)}
                            aria-pressed={selected}
                            sx={{
                                height: 38,
                                borderRadius: "19px",
                                border: "1px solid",
                                borderColor: selected ? "transparent" : alpha(SP_GREEN, 0.2),
                                background: selected ? cfg.gradient : "action.selected",
                                color: selected ? "#fff" : "text.primary",
                                fontWeight: 700,
                                fontSize: 13,
                                transition: "transform 200ms ease, box-shadow 200ms ease",
                                "& .MuiChip-label": { px: 1.75 },
                                "&:hover": {
                                    transform: "translateY(-2px)",
                                    boxShadow: selected ? "0 4px 16px rgba(0,0,0,0.25)" : "none",
                                    borderColor: SP_GREEN,
                                },
                                "&:active": { transform: "translateY(0) scale(.97)" },
                            }}
                        />
                    );
                })}
            </Stack>

            {activeMood && (
                <Box sx={{ pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
                    {moodQuery.isLoading ? (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 2 }}>
                            <CircularProgress size={18} sx={{ color: SP_GREEN }} />
                            <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                                Đang tìm nhạc {activeConfig?.label.toLowerCase()}…
                            </Typography>
                        </Box>
                    ) : (
                        <HScrollSection
                            title={`Nhạc ${activeConfig?.label}`}
                            loading={false}
                            mb={0}
                        >
                            {(moodQuery.data ?? []).map((item) => (
                                <MediaItemCard
                                    key={item.id}
                                    item={item}
                                    queue={moodQuery.data ?? []}
                                />
                            ))}
                        </HScrollSection>
                    )}
                    {!moodQuery.isLoading && (moodQuery.data ?? []).length === 0 && (
                        <Typography sx={{ py: 2, color: "text.disabled", fontSize: 13 }}>
                            Chưa tìm được nhạc phù hợp, thử lại sau nhé.
                        </Typography>
                    )}
                </Box>
            )}
        </Box>
    );
}
