import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import { alpha, Box, CircularProgress, Stack, Tooltip, Typography, useTheme } from "@mui/material";
import type { SpotifyAudioFeatures } from "@services/musicBackendService";

const ACCENT = "#f97316";

interface FeatureBarProps {
    label: string;
    value: number;
    max?: number;
    description: string;
    color?: string;
}

function FeatureBar({ label, value, max = 1, description, color = ACCENT }: FeatureBarProps) {
    const pct = Math.round((value / max) * 100);
    return (
        <Tooltip title={description} placement="right" arrow>
            <Box sx={{ cursor: "default" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary" }}>
                        {label}
                    </Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.primary" }}>
                        {pct}%
                    </Typography>
                </Box>
                <Box
                    sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: (theme) => alpha(theme.palette.action.selected, 0.8),
                        overflow: "hidden",
                    }}
                >
                    <Box
                        sx={{
                            height: "100%",
                            width: `${pct}%`,
                            borderRadius: 3,
                            background: `linear-gradient(90deg, ${alpha(color, 0.7)}, ${color})`,
                            transition: "width 600ms cubic-bezier(0.34,1.56,0.64,1)",
                        }}
                    />
                </Box>
            </Box>
        </Tooltip>
    );
}

interface StatBadgeProps {
    label: string;
    value: string;
    sub?: string;
}

function StatBadge({ label, value, sub }: StatBadgeProps) {
    return (
        <Box
            sx={{
                flex: 1,
                minWidth: 72,
                p: 1.25,
                borderRadius: 2,
                bgcolor: (theme) => alpha(theme.palette.action.selected, 0.6),
                textAlign: "center",
            }}
        >
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: "text.primary", lineHeight: 1.2 }}>
                {value}
            </Typography>
            {sub && (
                <Typography sx={{ fontSize: 9, fontWeight: 600, color: ACCENT, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {sub}
                </Typography>
            )}
            <Typography sx={{ fontSize: 10, color: "text.secondary", mt: 0.25 }}>
                {label}
            </Typography>
        </Box>
    );
}

const KEY_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function keyLabel(key: number, mode: number): string {
    if (key === -1) return "N/A";
    return `${KEY_NAMES[key]} ${mode === 1 ? "major" : "minor"}`;
}

function formatTempo(bpm: number): string {
    return `${Math.round(bpm)}`;
}

function formatLoudness(db: number): string {
    return `${db.toFixed(1)} dB`;
}

interface Props {
    features: SpotifyAudioFeatures | null;
    loading?: boolean;
}

export function AudioDNAPanel({ features, loading }: Props) {
    const theme = useTheme();

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={24} sx={{ color: ACCENT }} />
            </Box>
        );
    }

    if (!features) {
        return (
            <Box sx={{ py: 3, textAlign: "center" }}>
                <Typography sx={{ color: "text.disabled", fontSize: 13 }}>
                    Không có dữ liệu âm thanh cho bài này.
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ py: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <GraphicEqIcon sx={{ color: ACCENT, fontSize: 18 }} />
                <Typography sx={{ fontWeight: 700, fontSize: 13, color: "text.primary" }}>
                    Sound Profile
                </Typography>
            </Stack>

            {/* Stat badges row */}
            <Stack direction="row" spacing={1} sx={{ mb: 2.5 }}>
                <StatBadge label="Tempo" value={formatTempo(features.tempo)} sub="BPM" />
                <StatBadge label="Giọng điệu" value={keyLabel(features.key, features.mode)} />
                <StatBadge label="Loudness" value={formatLoudness(features.loudness)} />
                <StatBadge
                    label="Nhịp"
                    value={`${features.time_signature}/4`}
                    sub="beat"
                />
            </Stack>

            {/* Feature bars */}
            <Stack spacing={1.5}>
                <FeatureBar
                    label="Danceability"
                    value={features.danceability}
                    description="Mức độ phù hợp để nhảy — kết hợp giữa tempo, nhịp và stability."
                    color={theme.palette.mode === "dark" ? "#f97316" : "#ea580c"}
                />
                <FeatureBar
                    label="Energy"
                    value={features.energy}
                    description="Cảm nhận về cường độ và hoạt động. Nhạc rock = cao, nhạc cổ điển = thấp."
                    color="#ef4444"
                />
                <FeatureBar
                    label="Valence (Tâm trạng)"
                    value={features.valence}
                    description="Cao = vui vẻ/hưng phấn. Thấp = buồn/u ám."
                    color="#22c55e"
                />
                <FeatureBar
                    label="Acousticness"
                    value={features.acousticness}
                    description="Xác suất bài hát là acoustic (không điện tử)."
                    color="#3b82f6"
                />
                <FeatureBar
                    label="Instrumentalness"
                    value={features.instrumentalness}
                    description="Cao (>0.5) = bài hát chủ yếu là nhạc cụ, ít giọng hát."
                    color="#8b5cf6"
                />
                <FeatureBar
                    label="Speechiness"
                    value={features.speechiness}
                    description="Tỉ lệ lời nói. >0.66 = podcast/rap, <0.33 = thuần nhạc."
                    color="#ec4899"
                />
                <FeatureBar
                    label="Liveness"
                    value={features.liveness}
                    description=">0.8 = rất có khả năng là live recording có khán giả."
                    color="#f59e0b"
                />
            </Stack>
        </Box>
    );
}
