import LibraryAddIcon from "@mui/icons-material/LibraryAdd";
import LibraryAddCheckIcon from "@mui/icons-material/LibraryAddCheck";
import { alpha, IconButton, Tooltip, useTheme } from "@mui/material";
import {
    useAddLibraryItemMutation,
    useMusicLibraryQuery,
    useRemoveLibraryItemMutation,
} from "@pages/music/hooks/useMusicQueries";
import type { AddMusicLibraryItem } from "@services/musicBackendService";

export function LibraryToggleButton({
    item,
    label,
    compact = false,
}: {
    item: AddMusicLibraryItem;
    label?: string;
    compact?: boolean;
}) {
    const theme = useTheme();
    const libraryQuery = useMusicLibraryQuery();
    const addMutation = useAddLibraryItemMutation();
    const removeMutation = useRemoveLibraryItemMutation();
    const saved = libraryQuery.data?.find(
        (entry) => entry.item_type === item.item_type && entry.source_id === item.source_id,
    );
    const pending = addMutation.isPending || removeMutation.isPending;

    return (
        <Tooltip
            title={saved ? "Xóa khỏi thư viện" : (label ?? "Thêm vào thư viện")}
            slotProps={{
                tooltip: {
                    sx: {
                        bgcolor:
                            theme.palette.mode === "light"
                                ? alpha(theme.palette.primary.main, 0.92)
                                : "grey.900",
                        color:
                            theme.palette.mode === "light"
                                ? theme.palette.primary.contrastText
                                : "common.white",
                        boxShadow:
                            theme.palette.mode === "light"
                                ? `0 10px 24px ${alpha(theme.palette.primary.main, 0.18)}`
                                : undefined,
                    },
                },
            }}
        >
            <IconButton
                disabled={pending}
                onClick={(event) => {
                    event.stopPropagation();
                    if (saved) {
                        removeMutation.mutate(saved.id);
                        return;
                    }
                    addMutation.mutate(item);
                }}
                sx={{
                    width: compact ? 30 : undefined,
                    height: compact ? 30 : undefined,
                    color: saved ? "#f97316" : "text.secondary",
                    border: compact ? "none" : "1px solid",
                    borderColor: saved ? "rgba(249,115,22,0.45)" : "divider",
                    "&:hover": {
                        color: saved ? "#fb923c" : "text.primary",
                        borderColor: "currentColor",
                    },
                }}
            >
                {saved ? (
                    <LibraryAddCheckIcon sx={{ fontSize: compact ? 17 : undefined }} />
                ) : (
                    <LibraryAddIcon sx={{ fontSize: compact ? 17 : undefined }} />
                )}
            </IconButton>
        </Tooltip>
    );
}
