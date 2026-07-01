import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import { Box, Divider, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { SP_GREEN } from "../constants";
import { formatDisplayName } from "../utils";
import type { MusicView } from "../MusicContext";
import type { MusicPlaylistRow } from "@services/musicBackendService";

export function MusicSidebar({
    view,
    navItems,
    libraryItems,
    playlists,
    collapsed = false,
    onToggleCollapse,
    onNavigate,
    onClose,
}: {
    view: MusicView;
    navItems: { id: MusicView; label: string; icon: React.ReactNode }[];
    libraryItems: { id: MusicView; label: string; icon: React.ReactNode; count?: number }[];
    playlists: MusicPlaylistRow[];
    collapsed?: boolean;
    onToggleCollapse?: () => void;
    onNavigate: (v: MusicView) => void;
    onClose?: () => void;
}) {
    return (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            <Box
                sx={{
                    px: 3,
                    pt: 3,
                    pb: 2,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    onClick={() => { window.location.href = "/"; }}
                    sx={{
                        cursor: "pointer",
                        minWidth: 0,
                        "&:hover .music-brand-text": { color: "primary.main" },
                    }}
                >
                    <MusicNoteIcon sx={{ color: SP_GREEN, fontSize: 28 }} />
                    {!collapsed && (
                        <Typography
                            className="music-brand-text"
                            sx={{ fontWeight: 900, fontSize: 18, color: "text.primary", letterSpacing: -0.5 }}
                        >
                            TÙM LUM NHẠC
                        </Typography>
                    )}
                </Stack>
                <Stack direction="row" spacing={0.5}>
                    {onToggleCollapse && !onClose && (
                        <Tooltip title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}>
                            <IconButton
                                size="small"
                                onClick={onToggleCollapse}
                                sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
                            >
                                {collapsed ? (
                                    <ChevronRightIcon fontSize="small" />
                                ) : (
                                    <ChevronLeftIcon fontSize="small" />
                                )}
                            </IconButton>
                        </Tooltip>
                    )}
                    {onClose && (
                        <IconButton
                            size="small"
                            onClick={onClose}
                            sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    )}
                </Stack>
            </Box>

            <Box sx={{ px: 1.5, mb: 2, flexShrink: 0 }}>
                {navItems.map((item) => (
                    <Tooltip key={item.id} title={collapsed ? item.label : ""} placement="right">
                        <Box
                            onClick={() => onNavigate(item.id)}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: collapsed ? "center" : "flex-start",
                                gap: collapsed ? 0 : 2,
                                px: 1.5,
                                py: 1.25,
                                borderRadius: 1,
                                cursor: "pointer",
                                color: view === item.id ? "text.primary" : "text.secondary",
                                fontWeight: view === item.id ? 700 : 500,
                                fontSize: 14,
                                "&:hover": { color: "text.primary" },
                            }}
                        >
                            <Box
                                sx={{
                                    color: view === item.id ? SP_GREEN : "inherit",
                                    display: "flex",
                                    "& svg": { fontSize: 22 },
                                }}
                            >
                                {item.icon}
                            </Box>
                            {!collapsed && item.label}
                        </Box>
                    </Tooltip>
                ))}
            </Box>

            <Divider sx={{ borderColor: "divider", mx: 1.5, flexShrink: 0 }} />

            <Box
                sx={{
                    px: 1.5,
                    pt: 2,
                    flex: 1,
                    minHeight: 0,
                    overflow: "auto",
                    pb: "var(--persistent-music-player-height, 90px)",
                }}
            >
                {!collapsed && (
                    <Typography
                        sx={{
                            px: 1.5,
                            mb: 1,
                            fontSize: 11,
                            fontWeight: 700,
                            color: "text.secondary",
                            letterSpacing: 1,
                            textTransform: "uppercase",
                        }}
                    >
                        Your Library
                    </Typography>
                )}
                {libraryItems.map((item) => (
                    <Tooltip key={item.id} title={collapsed ? item.label : ""} placement="right">
                        <Box
                            onClick={() => onNavigate(item.id)}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: collapsed ? "center" : "flex-start",
                                gap: collapsed ? 0 : 2,
                                px: 1.5,
                                py: 1,
                                borderRadius: 1,
                                cursor: "pointer",
                                color: view === item.id ? "text.primary" : "text.secondary",
                                bgcolor: view === item.id ? "action.selected" : "transparent",
                                "&:hover": { color: "text.primary", bgcolor: "action.hover" },
                            }}
                        >
                            <Box sx={{ display: "flex", "& svg": { fontSize: 20 } }}>
                                {item.icon}
                            </Box>
                            {!collapsed && (
                                <>
                                    <Typography
                                        noWrap
                                        sx={{ fontSize: 13, fontWeight: 500, color: "inherit", flex: 1 }}
                                    >
                                        {item.label}
                                    </Typography>
                                    {item.count !== undefined && (
                                        <Typography sx={{ fontSize: 11, color: "text.disabled" }}>
                                            {item.count}
                                        </Typography>
                                    )}
                                </>
                            )}
                        </Box>
                    </Tooltip>
                ))}

                {!collapsed && playlists.length > 0 && (
                    <>
                        <Divider sx={{ borderColor: "divider", my: 1.5 }} />
                        {playlists.map((playlist) => (
                            <Box
                                key={playlist.id}
                                onClick={() => onNavigate("my-playlists")}
                                sx={{
                                    px: 1.5,
                                    py: 0.75,
                                    borderRadius: 1,
                                    cursor: "pointer",
                                    "&:hover": { bgcolor: "action.hover" },
                                }}
                            >
                                <Typography noWrap sx={{ fontSize: 13, color: "text.secondary" }}>
                                    {formatDisplayName(playlist.name)}
                                </Typography>
                                <Typography noWrap sx={{ fontSize: 11, color: "text.disabled" }}>
                                    {playlist.tracks?.length ?? 0} bài
                                </Typography>
                            </Box>
                        ))}
                    </>
                )}
            </Box>
        </Box>
    );
}
