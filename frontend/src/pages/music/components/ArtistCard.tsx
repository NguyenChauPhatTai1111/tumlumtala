import { Avatar, Box, Typography } from "@mui/material";
import { getAudiusProfileImage } from "@services/musicService";
import { LibraryToggleButton } from "./LibraryToggleButton";
import {
    MUSIC_3D_CARD_SX,
    MUSIC_CARD_HOVER_SX,
    MUSIC_CARD_SURFACE_SX,
} from "../constants";
import { formatDisplayName } from "../utils";
import type { AudiusUser } from "../types";

export function ArtistCard({ artist, onClick }: { artist: AudiusUser; onClick: () => void }) {
    return (
        <Box
            onClick={onClick}
            sx={{
                flexShrink: 0,
                width: 148,
                cursor: "pointer",
                textAlign: "center",
                ...MUSIC_3D_CARD_SX,
                "&:hover .card-bg": MUSIC_CARD_HOVER_SX,
            }}
        >
            <Box
                className="card-bg"
                sx={{ ...MUSIC_CARD_SURFACE_SX, position: "relative", borderRadius: 1.5, p: 1.5 }}
            >
                <Box sx={{ position: "absolute", zIndex: 1, top: 8, right: 8 }}>
                    <LibraryToggleButton
                        compact
                        item={{
                            item_type: "artist",
                            source_id: artist.id,
                            title: artist.name,
                            subtitle: `Nghệ sĩ · @${artist.handle}`,
                            thumbnail: getAudiusProfileImage(artist),
                            metadata: { artist },
                        }}
                    />
                </Box>
                <Avatar
                    className="card-cover"
                    src={getAudiusProfileImage(artist)}
                    sx={{
                        width: 116,
                        height: 116,
                        mx: "auto",
                        mb: 1.5,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                    }}
                />
                <Typography
                    className="card-title"
                    noWrap
                    sx={{ fontSize: 13, fontWeight: 600, color: "text.primary", mb: 0.25 }}
                >
                    {formatDisplayName(artist.name)}
                </Typography>
                <Typography
                    className="card-subtitle"
                    noWrap
                    sx={{ fontSize: 12, color: "text.secondary" }}
                >
                    Nghệ sĩ
                </Typography>
            </Box>
        </Box>
    );
}
