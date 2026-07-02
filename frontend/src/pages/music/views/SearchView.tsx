import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SearchIcon from "@mui/icons-material/Search";
import { Box, Button, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Fragment } from "react";
import { usePlayerStore } from "@store/playerStore";
import { IntersectionSentinel } from "../components/IntersectionSentinel";
import { MediaRow } from "../components/MediaRow";
import { SP_GREEN } from "../constants";
import { useMusicContext } from "../MusicContext";
import {
    useBackendSearchHistoryQuery,
    useClearSearchHistoryMutation,
    useDeleteSearchHistoryMutation,
    useGenreTracksQuery,
    useTracksQuery,
} from "../hooks/useMusicQueries";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useMemo, useState } from "react";
import { toAudioMediaItem } from "@services/musicService";
import { getSpotifyCategories } from "@services/musicBackendService";
import { dedupeMediaItems } from "../utils";

export function SearchView() {
    const { keyword, setKeyword } = useMusicContext();
    const { recentItems } = usePlayerStore();
    const [tracksScrollEl, setTracksScrollEl] = useState<HTMLDivElement | null>(null);
    const [selectedGenre, setSelectedGenre] = useState("all");

    const debouncedKeyword = useDebouncedValue(keyword, 650);
    const searchKeyword = debouncedKeyword.trim();
    const hasSearchKeyword = searchKeyword.length >= 2;

    const backendSearchHistoryQuery = useBackendSearchHistoryQuery();
    const deleteSearchHistoryMutation = useDeleteSearchHistoryMutation();
    const clearSearchHistoryMutation = useClearSearchHistoryMutation();
    const categoriesQuery = useQuery({
        queryKey: ["spotify", "categories", 50],
        queryFn: () => getSpotifyCategories(50),
        staleTime: 60 * 60 * 1000,
    });
    const categories = categoriesQuery.data ?? [];
    const selectedCategory = categories.find((category) => category.id === selectedGenre);
    const tracksQuery = useTracksQuery(
        searchKeyword,
        hasSearchKeyword && selectedGenre === "all",
    );
    const genreTracksQuery = useGenreTracksQuery(
        hasSearchKeyword ? selectedCategory?.name : undefined,
        searchKeyword,
    );
    const activeTracksQuery = selectedGenre === "all" ? tracksQuery : genreTracksQuery;

    const searchTrackItems = useMemo(
        () =>
            dedupeMediaItems(
                (activeTracksQuery.data?.pages.flat() ?? []).map(toAudioMediaItem),
            ),
        [activeTracksQuery.data],
    );

    return (
        <Box
            sx={{
                flex: 1,
                minHeight: 0,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
            }}
        >
            {!hasSearchKeyword ? (
                <Box sx={{ p: { xs: 2, md: 3 }, overflow: "auto", flex: 1 }}>
                    {(backendSearchHistoryQuery.data?.length ?? 0) > 0 && (
                        <Box sx={{ mb: 4 }}>
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    mb: 2,
                                }}
                            >
                                <Typography sx={{ fontWeight: 800, fontSize: 20, color: "text.primary" }}>
                                    Tìm kiếm gần đây
                                </Typography>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<DeleteOutlineIcon fontSize="small" />}
                                    onClick={() => clearSearchHistoryMutation.mutate()}
                                    disabled={clearSearchHistoryMutation.isPending}
                                    sx={{
                                        color: "error.main",
                                        borderColor: "error.main",
                                        textTransform: "none",
                                        fontSize: 13,
                                        "&:hover": { bgcolor: "error.main", borderColor: "error.main", color: "#fff" },
                                    }}
                                >
                                    Xóa tất cả
                                </Button>
                            </Box>
                            <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap>
                                {(backendSearchHistoryQuery.data ?? [])
                                    .slice(0, 12)
                                    .map((row) => (
                                        <Chip
                                            key={row.id}
                                            label={row.keyword}
                                            icon={<SearchIcon />}
                                            onClick={() => setKeyword(row.keyword)}
                                            onDelete={() => deleteSearchHistoryMutation.mutate(row.id)}
                                            sx={{
                                                bgcolor: "action.hover",
                                                color: "text.primary",
                                                "& .MuiChip-icon": { color: "text.secondary" },
                                                "& .MuiChip-deleteIcon": { color: "text.disabled", "&:hover": { color: "error.main" } },
                                                "&:hover": { bgcolor: "action.selected" },
                                            }}
                                        />
                                    ))}
                            </Stack>
                        </Box>
                    )}

                    {recentItems.length > 0 && (
                        <Box>
                            <Typography sx={{ fontWeight: 800, fontSize: 20, color: "text.primary", mb: 2 }}>
                                Nghe gần đây
                            </Typography>
                            {recentItems.slice(0, 20).map((item, i) => (
                                <MediaRow key={item.id} item={item} queue={recentItems} index={i + 1} />
                            ))}
                        </Box>
                    )}

                    {!backendSearchHistoryQuery.data?.length && !recentItems.length && (
                        <Typography sx={{ color: "text.secondary", fontSize: 14, mt: 2 }}>
                            Nhập từ khóa để tìm bài hát, nghệ sĩ hoặc playlist.
                        </Typography>
                    )}
                </Box>
            ) : (
                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                    }}
                >
                    <Box
                        ref={setTracksScrollEl}
                        sx={{
                            overflow: "auto",
                            flex: 1,
                            minHeight: 0,
                            px: { xs: 2, md: 3 },
                            pb: { xs: 2, md: 3 },
                        }}
                    >
                        <Box
                            component="section"
                            aria-label="Lọc kết quả theo thể loại"
                            sx={{
                                position: "sticky",
                                top: 0,
                                zIndex: 2,
                                py: 1.5,
                                mb: 1,
                                bgcolor: "background.default",
                                borderBottom: "1px solid",
                                borderColor: "divider",
                            }}
                        >
                            <Typography
                                sx={{
                                    mb: 1,
                                    color: "text.secondary",
                                    fontSize: 12,
                                    fontWeight: 700,
                                }}
                            >
                                Lọc theo thể loại
                            </Typography>
                            <Stack direction="row" useFlexGap flexWrap="wrap" gap={0.75}>
                                {[
                                    { id: "all", name: "Tất cả", icon: "" },
                                    ...categories,
                                ].map((category) => {
                                    const selected = selectedGenre === category.id;
                                    return (
                                        <Chip
                                            key={category.id}
                                            label={category.name}
                                            clickable
                                            aria-pressed={selected}
                                            onClick={() => setSelectedGenre(category.id)}
                                            sx={{
                                                height: 32,
                                                border: "1px solid",
                                                borderColor: selected ? SP_GREEN : "divider",
                                                bgcolor: selected ? SP_GREEN : "action.hover",
                                                color: selected ? "#17120f" : "text.primary",
                                                fontWeight: 700,
                                                transition:
                                                    "transform 180ms ease, background-color 180ms ease, border-color 180ms ease",
                                                "&:hover": {
                                                    borderColor: SP_GREEN,
                                                    bgcolor: selected ? SP_GREEN : "action.selected",
                                                    transform: "translateY(-1px)",
                                                },
                                                "&:active": { transform: "scale(.97)" },
                                                "&:focus-visible": {
                                                    outline: `2px solid ${SP_GREEN}`,
                                                    outlineOffset: 2,
                                                },
                                            }}
                                        />
                                    );
                                })}
                            </Stack>
                        </Box>

                        {activeTracksQuery.isFetching && !searchTrackItems.length ? (
                            <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
                                <CircularProgress sx={{ color: SP_GREEN }} size={28} />
                            </Box>
                        ) : !searchTrackItems.length ? (
                            <Typography sx={{ color: "text.secondary", fontSize: 14, mt: 2 }}>
                                Không tìm thấy bài hát phù hợp.
                            </Typography>
                        ) : (
                            <>
                                {searchTrackItems.map((item, index) => (
                                    <Fragment key={item.id}>
                                        <MediaRow item={item} queue={searchTrackItems} index={index + 1} />
                                        {index === searchTrackItems.length - 8 &&
                                            activeTracksQuery.hasNextPage &&
                                            !activeTracksQuery.isFetchingNextPage && (
                                                <IntersectionSentinel
                                                    onVisible={() =>
                                                        void activeTracksQuery.fetchNextPage()
                                                    }
                                                    root={tracksScrollEl}
                                                />
                                            )}
                                    </Fragment>
                                ))}
                                {activeTracksQuery.isFetchingNextPage && (
                                    <Box sx={{ py: 2, display: "flex", justifyContent: "center" }}>
                                        <CircularProgress sx={{ color: SP_GREEN }} size={24} />
                                    </Box>
                                )}
                                {!activeTracksQuery.hasNextPage && searchTrackItems.length > 10 && (
                                    <Typography sx={{ textAlign: "center", py: 2, fontSize: 12, color: "text.disabled" }}>
                                        Đã hiển thị tất cả {searchTrackItems.length} bài
                                    </Typography>
                                )}
                            </>
                        )}
                    </Box>
                </Box>
            )}
        </Box>
    );
}
