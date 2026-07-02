import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { alpha, Box, IconButton, Skeleton, Stack, Typography } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";

export function HScrollSection({
    title,
    meta,
    headerContent,
    loading,
    children,
    mb = 4,
}: {
    title: React.ReactNode;
    meta?: React.ReactNode;
    headerContent?: React.ReactNode;
    loading?: boolean;
    children: React.ReactNode;
    mb?: number;
}) {
    const rowRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateControls = useCallback(() => {
        const row = rowRef.current;
        if (!row) return;
        const maxScrollLeft = row.scrollWidth - row.clientWidth;
        setCanScrollLeft(row.scrollLeft > 4);
        setCanScrollRight(maxScrollLeft - row.scrollLeft > 4);
    }, []);

    useEffect(() => {
        const row = rowRef.current;
        if (!row) return;

        updateControls();
        row.addEventListener("scroll", updateControls, { passive: true });
        const resizeObserver = new ResizeObserver(updateControls);
        resizeObserver.observe(row);
        Array.from(row.children).forEach((child) => resizeObserver.observe(child));

        return () => {
            row.removeEventListener("scroll", updateControls);
            resizeObserver.disconnect();
        };
    }, [children, loading, updateControls]);

    const scroll = (dir: "left" | "right") => {
        const row = rowRef.current;
        if (!row) return;
        const distance = Math.max(280, row.clientWidth * 0.82);
        row.scrollBy({ left: dir === "left" ? -distance : distance, behavior: "smooth" });
    };

    return (
        <Box component="section" sx={{ mb }}>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1.5,
                }}
            >
                <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 850, fontSize: 20, color: "text.primary" }}>
                        {title}
                    </Typography>
                    {meta && (
                        <Typography sx={{ mt: 0.25, fontSize: 12, color: "text.secondary" }}>
                            {meta}
                        </Typography>
                    )}
                </Box>
                <Stack direction="row" spacing={0.25}>
                    <IconButton
                        aria-label="Xem nội dung phía trước"
                        size="small"
                        onClick={() => scroll("left")}
                        disabled={!canScrollLeft}
                        sx={{
                            color: "text.secondary",
                            bgcolor: "action.hover",
                            border: "1px solid",
                            borderColor: "divider",
                            transition: "transform 180ms ease, background-color 180ms ease",
                            "&:hover": {
                                color: "text.primary",
                                bgcolor: "action.selected",
                                transform: "translateX(-1px)",
                            },
                            "&.Mui-disabled": { opacity: 0.28 },
                        }}
                    >
                        <ChevronLeftIcon />
                    </IconButton>
                    <IconButton
                        aria-label="Xem thêm nội dung phía sau"
                        size="small"
                        onClick={() => scroll("right")}
                        disabled={!canScrollRight}
                        sx={{
                            color: "text.secondary",
                            bgcolor: "action.hover",
                            border: "1px solid",
                            borderColor: "divider",
                            transition: "transform 180ms ease, background-color 180ms ease",
                            "&:hover": {
                                color: "text.primary",
                                bgcolor: "action.selected",
                                transform: "translateX(1px)",
                            },
                            "&.Mui-disabled": { opacity: 0.28 },
                        }}
                    >
                        <ChevronRightIcon />
                    </IconButton>
                </Stack>
            </Box>
            {headerContent}
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
                    role="region"
                    aria-label={typeof title === "string" ? title : "Danh sách nội dung"}
                    tabIndex={0}
                    sx={{
                        display: "flex",
                        gap: 1.5,
                        overflowX: "auto",
                        overscrollBehaviorInline: "contain",
                        scrollSnapType: "x mandatory",
                        scrollPaddingInline: 2,
                        pb: 0.5,
                        scrollbarWidth: "none",
                        "&::-webkit-scrollbar": { display: "none" },
                        "& > *": { scrollSnapAlign: "start" },
                        maskImage: canScrollRight
                            ? "linear-gradient(90deg, #000 0%, #000 95%, transparent 100%)"
                            : "none",
                        transition: "mask-image 180ms ease",
                        "&:focus-visible": {
                            outline: (theme) =>
                                `2px solid ${alpha(theme.palette.primary.main, 0.72)}`,
                            outlineOffset: 3,
                        },
                    }}
                >
                    {children}
                </Box>
            )}
        </Box>
    );
}
