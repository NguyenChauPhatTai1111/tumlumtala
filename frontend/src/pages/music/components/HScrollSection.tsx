import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Box, IconButton, Skeleton, Stack, Typography } from "@mui/material";
import { useRef } from "react";

export function HScrollSection({
    title,
    loading,
    children,
}: {
    title: string;
    loading?: boolean;
    children: React.ReactNode;
}) {
    const rowRef = useRef<HTMLDivElement>(null);
    const scroll = (dir: "left" | "right") => {
        rowRef.current?.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
    };

    return (
        <Box sx={{ mb: 4 }}>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1.5,
                }}
            >
                <Typography sx={{ fontWeight: 800, fontSize: 20, color: "text.primary" }}>
                    {title}
                </Typography>
                <Stack direction="row" spacing={0.25}>
                    <IconButton
                        size="small"
                        onClick={() => scroll("left")}
                        sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
                    >
                        <ChevronLeftIcon />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => scroll("right")}
                        sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
                    >
                        <ChevronRightIcon />
                    </IconButton>
                </Stack>
            </Box>
            {loading ? (
                <Stack direction="row" spacing={1.5}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Box key={i} sx={{ flexShrink: 0, width: 160 }}>
                            <Skeleton
                                variant="rectangular"
                                sx={{
                                    borderRadius: 1,
                                    aspectRatio: "1",
                                    mb: 1,
                                    bgcolor: "action.selected",
                                }}
                            />
                            <Skeleton sx={{ bgcolor: "action.selected" }} width="80%" />
                            <Skeleton sx={{ bgcolor: "action.hover" }} width="60%" />
                        </Box>
                    ))}
                </Stack>
            ) : (
                <Box
                    ref={rowRef}
                    sx={{
                        display: "flex",
                        gap: 1.5,
                        overflowX: "auto",
                        pb: 1,
                        scrollbarWidth: "none",
                        "&::-webkit-scrollbar": { display: "none" },
                    }}
                >
                    {children}
                </Box>
            )}
        </Box>
    );
}
