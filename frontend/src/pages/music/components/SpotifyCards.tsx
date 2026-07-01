import { Avatar, Box, Typography } from "@mui/material";
import { SP_GREEN } from "../constants";
import type { SpotifyAlbumSummary, SpotifyArtistSummary, SpotifyCollectionSummary } from "@services/musicBackendService";

export function AlbumCard({ album }: { album: SpotifyAlbumSummary }) {
    const thumb = album.images?.[0] ?? "";
    const year = album.release_date?.slice(0, 4) ?? "";
    const handleClick = () => {
        window.dispatchEvent(
            new CustomEvent("music:navigate-entity", {
                detail: { type: "album", id: album.id, provider: "spotify" },
            }),
        );
    };
    return (
        <Box
            onClick={handleClick}
            sx={{
                display: "block",
                width: 140,
                flexShrink: 0,
                textDecoration: "none",
                cursor: "pointer",
                "&:hover .album-name": { color: SP_GREEN },
            }}
        >
            <Avatar
                variant="rounded"
                src={thumb}
                sx={{ width: 140, height: 140, borderRadius: 1.5, mb: 1, bgcolor: "action.hover" }}
            />
            <Typography className="album-name" noWrap sx={{ fontSize: 13, fontWeight: 600, color: "text.primary", transition: "color 0.15s" }}>
                {album.name}
            </Typography>
            <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                {year}{year && album.album_type ? " · " : ""}{album.album_type === "single" ? "Single" : album.album_type === "album" ? "Album" : album.album_type}
            </Typography>
        </Box>
    );
}

export function SpotifyCollectionCard({ item }: { item: SpotifyCollectionSummary }) {
    const handleClick = () => {
        window.dispatchEvent(
            new CustomEvent("music:navigate-entity", {
                detail: { type: item.type === "album" ? "album" : "playlist", id: item.id, provider: "spotify" },
            }),
        );
    };
    return (
        <Box
            onClick={handleClick}
            sx={{
                width: 160,
                flexShrink: 0,
                cursor: "pointer",
                "&:hover .collection-title": { color: SP_GREEN },
            }}
        >
            <Avatar
                variant="rounded"
                src={item.images?.[0] ?? ""}
                sx={{ width: 160, height: 160, borderRadius: 1.5, mb: 1 }}
            />
            <Typography className="collection-title" noWrap sx={{ fontSize: 13, fontWeight: 700 }}>
                {item.name}
            </Typography>
            <Typography noWrap sx={{ mt: 0.25, fontSize: 11, color: "text.secondary" }}>
                {item.owner?.name || "Nhạc"}
            </Typography>
        </Box>
    );
}

export function RelatedArtistCard({ artist }: { artist: SpotifyArtistSummary }) {
    return (
        <Box
            onClick={() =>
                window.dispatchEvent(
                    new CustomEvent("music:navigate-entity", {
                        detail: { type: "artist", id: artist.id, provider: "spotify" },
                    }),
                )
            }
            sx={{ width: 150, flexShrink: 0, cursor: "pointer", "&:hover .artist-name": { color: SP_GREEN } }}
        >
            <Avatar src={artist.images?.[0] ?? ""} sx={{ width: 150, height: 150, mb: 1 }} />
            <Typography className="artist-name" noWrap sx={{ fontSize: 13, fontWeight: 700 }}>
                {artist.name}
            </Typography>
            <Typography sx={{ fontSize: 11, color: "text.secondary" }}>Nghệ sĩ</Typography>
        </Box>
    );
}
