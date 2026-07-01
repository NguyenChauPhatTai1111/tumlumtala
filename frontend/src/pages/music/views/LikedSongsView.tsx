import FavoriteIcon from "@mui/icons-material/Favorite";
import { Box, Typography } from "@mui/material";
import { usePlayerStore } from "@store/playerStore";
import { MediaRow } from "../components/MediaRow";

export function LikedSongsView() {
    const { likedItems } = usePlayerStore();

    return (
        <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            <Box
                sx={{
                    p: { xs: 2, md: 3 },
                    background: (theme) =>
                        `linear-gradient(135deg, #4B0082 0%, ${theme.palette.background.default} 100%)`,
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 3,
                    minHeight: 200,
                }}
            >
                <Box
                    sx={{
                        width: 140,
                        height: 140,
                        borderRadius: 1,
                        bgcolor: "#4B0082",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                    }}
                >
                    <FavoriteIcon sx={{ fontSize: 64, color: "text.primary" }} />
                </Box>
                <Box>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: "text.primary", textTransform: "uppercase", letterSpacing: 1 }}>
                        Playlist
                    </Typography>
                    <Typography sx={{ fontWeight: 900, fontSize: { xs: 28, md: 48 }, color: "text.primary", lineHeight: 1.1 }}>
                        Liked Songs
                    </Typography>
                    <Typography sx={{ color: "text.secondary", fontSize: 14, mt: 1 }}>
                        {likedItems.length} bài hát
                    </Typography>
                </Box>
            </Box>
            <Box sx={{ p: { xs: 2, md: 3 } }}>
                {likedItems.length ? (
                    likedItems.map((item, i) => (
                        <MediaRow key={item.id} item={item} queue={likedItems} index={i + 1} />
                    ))
                ) : (
                    <Typography sx={{ color: "text.disabled", fontSize: 14, py: 4, textAlign: "center" }}>
                        Chưa có bài hát nào được thích.
                    </Typography>
                )}
            </Box>
        </Box>
    );
}
