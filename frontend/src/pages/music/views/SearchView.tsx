import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SearchIcon from "@mui/icons-material/Search";
import { Box, Button, Chip, CircularProgress, Stack, Typography } from "@mui/material";
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
    useTracksQuery,
} from "../hooks/useMusicQueries";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useMemo, useState } from "react";
import { toAudioMediaItem } from "@services/musicService";

export function SearchView() {
    const { keyword, setKeyword } = useMusicContext();
    const { recentItems } = usePlayerStore();
    const [tracksScrollEl, setTracksScrollEl] = useState<HTMLDivElement | null>(null);

    const debouncedKeyword = useDebouncedValue(keyword, 650);
    const searchKeyword = debouncedKeyword.trim();
    const hasSearchKeyword = searchKeyword.length >= 2;

    const backendSearchHistoryQuery = useBackendSearchHistoryQuery();
    const deleteSearchHistoryMutation = useDeleteSearchHistoryMutation();
    const clearSearchHistoryMutation = useClearSearchHistoryMutation();
    const tracksQuery = useTracksQuery(searchKeyword, hasSearchKeyword);

    const searchTrackItems = useMemo(
        () => (tracksQuery.data?.pages.flat() ?? []).map(toAudioMediaItem),
        [tracksQuery.data],
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
                        {tracksQuery.isFetching && !searchTrackItems.length ? (
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
                                            tracksQuery.hasNextPage &&
                                            !tracksQuery.isFetchingNextPage && (
                                                <IntersectionSentinel
                                                    onVisible={() => void tracksQuery.fetchNextPage()}
                                                    root={tracksScrollEl}
                                                />
                                            )}
                                    </Fragment>
                                ))}
                                {tracksQuery.isFetchingNextPage && (
                                    <Box sx={{ py: 2, display: "flex", justifyContent: "center" }}>
                                        <CircularProgress sx={{ color: SP_GREEN }} size={24} />
                                    </Box>
                                )}
                                {!tracksQuery.hasNextPage && searchTrackItems.length > 10 && (
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
