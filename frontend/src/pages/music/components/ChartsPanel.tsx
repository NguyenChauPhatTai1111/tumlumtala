import { alpha, Box, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { CHART_MARKETS } from "@services/musicBackendService";
import { SP_GREEN } from "../constants";
import { useChartsQuery } from "../hooks/useMusicQueries";
import { MediaItemCard } from "./MediaItemCard";
import { HScrollSection } from "./HScrollSection";

export function ChartsPanel() {
    const [activeMarket, setActiveMarket] = useState(CHART_MARKETS[0].code);
    const chartsQuery = useChartsQuery(activeMarket);
    const activeConfig = CHART_MARKETS.find((m) => m.code === activeMarket);

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
                    `radial-gradient(circle at 92% 100%, ${alpha(
                        theme.palette.primary.main,
                        theme.palette.mode === "light" ? 0.1 : 0.07,
                    )}, transparent 36%)`,
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
                            fontSize: { xs: 20, md: 24 },
                            fontWeight: 900,
                            letterSpacing: "-0.03em",
                        }}
                    >
                        Theo quốc gia
                    </Typography>
                    <Typography sx={{ mt: 0.35, color: "text.secondary", fontSize: 13 }}>
                        Top nhạc đang phổ biến tại từng khu vực.
                    </Typography>
                </Box>
            </Box>

            <Stack direction="row" useFlexGap flexWrap="wrap" gap={1} sx={{ mb: 2.5 }}>
                {CHART_MARKETS.map((market) => {
                    const selected = market.code === activeMarket;
                    return (
                        <Chip
                            key={market.code}
                            label={`${market.name}`}
                            clickable
                            onClick={() => setActiveMarket(market.code)}
                            aria-pressed={selected}
                            sx={{
                                height: 36,
                                borderRadius: "18px",
                                border: "1px solid",
                                borderColor: selected ? SP_GREEN : alpha(SP_GREEN, 0.2),
                                bgcolor: selected ? SP_GREEN : "action.selected",
                                color: selected ? "#17120f" : "text.primary",
                                fontWeight: 750,
                                fontSize: 13,
                                transition:
                                    "transform 200ms ease, border-color 200ms ease, background-color 200ms ease",
                                "& .MuiChip-label": { px: 1.75 },
                                "&:hover": {
                                    transform: "translateY(-1px)",
                                    borderColor: SP_GREEN,
                                    bgcolor: selected ? "#fb923c" : alpha(SP_GREEN, 0.12),
                                },
                                "&:active": { transform: "translateY(0) scale(.97)" },
                            }}
                        />
                    );
                })}
            </Stack>

            <Box sx={{ pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
                {chartsQuery.isLoading ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 2 }}>
                        <CircularProgress size={18} sx={{ color: SP_GREEN }} />
                        <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                            Đang tải charts {activeConfig?.name}…
                        </Typography>
                    </Box>
                ) : (
                    <HScrollSection
                        title={`Top tại ${activeConfig?.name}`}
                        meta="Dữ liệu từ Spotify"
                        loading={false}
                        mb={0}
                    >
                        {(chartsQuery.data ?? []).map((item, i) => (
                            <Box key={item.id} sx={{ position: "relative" }}>
                                <Box
                                    sx={{
                                        position: "absolute",
                                        top: 6,
                                        left: 6,
                                        zIndex: 2,
                                        bgcolor: i < 3 ? SP_GREEN : "rgba(0,0,0,0.55)",
                                        color: i < 3 ? "#17120f" : "#fff",
                                        borderRadius: "6px",
                                        px: 0.75,
                                        py: 0.2,
                                        fontSize: 11,
                                        fontWeight: 800,
                                        lineHeight: 1.6,
                                        pointerEvents: "none",
                                    }}
                                >
                                    #{i + 1}
                                </Box>
                                <MediaItemCard item={item} queue={chartsQuery.data ?? []} />
                            </Box>
                        ))}
                    </HScrollSection>
                )}
                {!chartsQuery.isLoading && (chartsQuery.data ?? []).length === 0 && (
                    <Typography sx={{ py: 2, color: "text.disabled", fontSize: 13 }}>
                        Chưa có dữ liệu charts cho khu vực này.
                    </Typography>
                )}
            </Box>
        </Box>
    );
}
