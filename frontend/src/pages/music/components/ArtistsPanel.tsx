import AlbumIcon from "@mui/icons-material/Album";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RadioIcon from "@mui/icons-material/Radio";
import {
    Avatar,
    Box,
    Button,
    CircularProgress,
    IconButton,
    Stack,
    Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import type { AudiusPlaylist, AudiusTrack, AudiusUser, MediaItem } from "@pages/music/types";
import { formatDisplayName } from "@pages/music/utils";
import {
    getAudiusCoverPhoto,
    getAudiusProfileImage,
    getPlaylistArtwork,
    toAudioMediaItem,
} from "@services/musicService";
import { usePlayerStore } from "@store/playerStore";
import { MediaRow } from "./MediaRow";
import { LibraryToggleButton } from "./LibraryToggleButton";

const ACCENT = "#f97316";

export const ArtistsPanel = ({
    artists,
    selectedArtist,
    onSelectArtist,
    artistTracks,
    artistAlbums,
    artistPlaylists,
    artistRadioTracks,
    artistRadioLoading,
    onSelectPlaylist,
}: {
    artists: AudiusUser[];
    selectedArtist: AudiusUser | null;
    onSelectArtist: (artist: AudiusUser) => void;
    artistTracks: AudiusTrack[];
    artistAlbums: AudiusPlaylist[];
    artistPlaylists: AudiusPlaylist[];
    artistRadioTracks: MediaItem[];
    artistRadioLoading: boolean;
    onSelectPlaylist: (playlist: AudiusPlaylist) => void;
}) => {
    const [showAllTracks, setShowAllTracks] = useState(false);
    const { replaceQueue } = usePlayerStore();
    const trackQueue = useMemo(() => artistTracks.map(toAudioMediaItem), [artistTracks]);

    if (!selectedArtist) {
        return <ArtistDirectory artists={artists} onSelectArtist={onSelectArtist} />;
    }

    const coverPhoto = getAudiusCoverPhoto(selectedArtist) ?? getAudiusProfileImage(selectedArtist);
    const visibleTracks = showAllTracks ? trackQueue : trackQueue.slice(0, 5);
    const artistPick = artistAlbums[0] ?? artistPlaylists[0];

    return (
        <Box sx={{ mx: { xs: -2, md: -3 }, mt: -2 }}>
            <Box
                sx={{
                    position: "relative",
                    minHeight: { xs: 330, md: 410 },
                    display: "flex",
                    alignItems: "flex-end",
                    overflow: "hidden",
                    px: { xs: 2.5, md: 5 },
                    pb: { xs: 3, md: 4 },
                    backgroundImage: `url("${coverPhoto}")`,
                    backgroundSize: "cover",
                    backgroundPosition: "center 30%",
                }}
            >
                <Box
                    aria-hidden
                    sx={{
                        position: "absolute",
                        inset: 0,
                        background: (theme: import("@mui/material").Theme) => `linear-gradient(90deg, rgba(0,0,0,0.68), rgba(0,0,0,0.08) 72%), linear-gradient(0deg, ${theme.palette.background.default} 0%, transparent 62%)`,
                    }}
                />
                <Box sx={{ position: "relative", zIndex: 1, maxWidth: 900 }}>
                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.75 }}>
                        {selectedArtist.is_verified && (
                            <CheckCircleIcon sx={{ fontSize: 18, color: "#93c5a4" }} />
                        )}
                        <Typography sx={{ fontSize: 12, fontWeight: 750 }}>
                            {selectedArtist.is_verified ? "Nghệ sĩ đã xác minh" : "Nghệ sĩ Audius"}
                        </Typography>
                    </Stack>
                    <Typography
                        component="h2"
                        sx={{
                            fontSize: {
                                xs: "clamp(2.7rem, 14vw, 5rem)",
                                md: "clamp(4.5rem, 8vw, 7rem)",
                            },
                            fontWeight: 950,
                            lineHeight: 0.92,
                            letterSpacing: "-0.06em",
                            textShadow: "0 10px 34px rgba(0,0,0,0.42)",
                            textWrap: "balance",
                        }}
                    >
                        {formatDisplayName(selectedArtist.name)}
                    </Typography>
                    <Typography sx={{ mt: 1.5, fontSize: 13, color: "text.secondary" }}>
                        @{selectedArtist.handle}
                        {" · "}
                        {formatCount(selectedArtist.follower_count)} người theo dõi
                        {selectedArtist.track_count ? ` · ${selectedArtist.track_count} bài` : ""}
                    </Typography>
                </Box>
            </Box>

            <Box
                sx={{
                    px: { xs: 2, md: 5 },
                    pb: 7,
                    background: (theme: import("@mui/material").Theme) => `linear-gradient(180deg, rgba(50,31,22,0.64) 0%, ${theme.palette.background.default} 240px)`,
                }}
            >
                <Stack direction="row" alignItems="center" spacing={1.25} sx={{ py: 2.5 }}>
                    <IconButton
                        aria-label="Phát nhạc của nghệ sĩ"
                        onClick={() => replaceQueue(trackQueue, 0)}
                        disabled={!trackQueue.length}
                        sx={{
                            width: 56,
                            height: 56,
                            color: "background.default",
                            bgcolor: ACCENT,
                            "&:hover": { bgcolor: "#fb923c", transform: "scale(1.04)" },
                            transition: "transform 180ms ease",
                        }}
                    >
                        <PlayArrowIcon sx={{ fontSize: 31 }} />
                    </IconButton>
                    <Button
                        variant="outlined"
                        startIcon={
                            artistRadioLoading ? (
                                <CircularProgress size={14} color="inherit" />
                            ) : (
                                <RadioIcon />
                            )
                        }
                        disabled={artistRadioLoading || !artistRadioTracks.length}
                        onClick={() => replaceQueue(artistRadioTracks, 0)}
                        sx={{
                            color: "#fff",
                            borderColor: "divider",
                            borderRadius: 99,
                            textTransform: "none",
                            fontWeight: 700,
                            "&:hover": { borderColor: "text.primary", bgcolor: "action.hover" },
                        }}
                    >
                        Artist Radio
                    </Button>
                    <IconButton sx={{ color: "text.secondary" }}>
                        <MoreHorizIcon />
                    </IconButton>
                    <LibraryToggleButton
                        item={{
                            item_type: "artist",
                            source_id: selectedArtist.id,
                            title: selectedArtist.name,
                            subtitle: `Nghệ sĩ · @${selectedArtist.handle}`,
                            thumbnail: getAudiusProfileImage(selectedArtist),
                            metadata: { artist: selectedArtist },
                        }}
                    />
                </Stack>

                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: {
                            xs: "1fr",
                            lg: artistPick ? "minmax(0,1.7fr) minmax(280px,.8fr)" : "1fr",
                        },
                        gap: { xs: 4, lg: 6 },
                        alignItems: "start",
                    }}
                >
                    <Box>
                        <Typography sx={{ mb: 1.25, fontSize: 22, fontWeight: 850 }}>
                            Phổ biến
                        </Typography>
                        {visibleTracks.map((item, index) => (
                            <MediaRow
                                key={item.id}
                                item={item}
                                queue={trackQueue}
                                index={index + 1}
                            />
                        ))}
                        {trackQueue.length > 5 && (
                            <Button
                                onClick={() => setShowAllTracks((value) => !value)}
                                sx={{
                                    mt: 1,
                                    color: "text.secondary",
                                    textTransform: "none",
                                    fontWeight: 700,
                                }}
                            >
                                {showAllTracks ? "Thu gọn" : "Xem thêm"}
                            </Button>
                        )}
                    </Box>

                    {artistPick && (
                        <Box>
                            <Typography sx={{ mb: 1.25, fontSize: 22, fontWeight: 850 }}>
                                Lựa chọn của nghệ sĩ
                            </Typography>
                            <FeaturedCollection
                                playlist={artistPick}
                                onClick={() => onSelectPlaylist(artistPick)}
                            />
                        </Box>
                    )}
                </Box>

                {(artistAlbums.length > 0 || artistPlaylists.length > 0) && (
                    <Box sx={{ mt: 5 }}>
                        <Typography sx={{ mb: 1.5, fontSize: 22, fontWeight: 850 }}>
                            Đĩa nhạc và playlist
                        </Typography>
                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                                gap: 1.5,
                            }}
                        >
                            {[...artistAlbums, ...artistPlaylists].slice(0, 8).map((playlist) => (
                                <CollectionCard
                                    key={playlist.id}
                                    playlist={playlist}
                                    onClick={() => onSelectPlaylist(playlist)}
                                />
                            ))}
                        </Box>
                    </Box>
                )}

                {artists.length > 1 && (
                    <Box sx={{ mt: 5 }}>
                        <Typography sx={{ mb: 1.5, fontSize: 18, fontWeight: 800 }}>
                            Khám phá nghệ sĩ khác
                        </Typography>
                        <Stack direction="row" spacing={1.5} sx={{ overflowX: "auto", pb: 1 }}>
                            {artists
                                .filter((artist) => artist.id !== selectedArtist.id)
                                .slice(0, 10)
                                .map((artist) => (
                                    <Box
                                        key={artist.id}
                                        onClick={() => {
                                            setShowAllTracks(false);
                                            onSelectArtist(artist);
                                        }}
                                        sx={{
                                            width: 112,
                                            flexShrink: 0,
                                            cursor: "pointer",
                                            textAlign: "center",
                                        }}
                                    >
                                        <Avatar
                                            src={getAudiusProfileImage(artist)}
                                            sx={{ width: 96, height: 96, mx: "auto", mb: 1 }}
                                        />
                                        <Typography noWrap sx={{ fontSize: 12, fontWeight: 700 }}>
                                            {formatDisplayName(artist.name)}
                                        </Typography>
                                    </Box>
                                ))}
                        </Stack>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

function ArtistDirectory({
    artists,
    onSelectArtist,
}: {
    artists: AudiusUser[];
    onSelectArtist: (artist: AudiusUser) => void;
}) {
    if (!artists.length) {
        return (
            <Box sx={{ py: 8, textAlign: "center" }}>
                <AlbumIcon sx={{ fontSize: 52, color: "text.disabled", mb: 1.5 }} />
                <Typography sx={{ color: "text.disabled" }}>
                    Nhập từ khóa để tìm nghệ sĩ.
                </Typography>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                gap: 1.5,
            }}
        >
            {artists.map((artist) => (
                <Box
                    key={artist.id}
                    onClick={() => onSelectArtist(artist)}
                    sx={{
                        position: "relative",
                        p: 2,
                        borderRadius: 2,
                        cursor: "pointer",
                        bgcolor: "background.paper",
                        transition: "background-color 180ms ease, transform 180ms ease",
                        "&:hover": { bgcolor: "action.selected", transform: "translateY(-2px)" },
                    }}
                >
                    <Box sx={{ position: "absolute", zIndex: 1, top: 9, right: 9 }}>
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
                        src={getAudiusProfileImage(artist)}
                        sx={{ width: "100%", height: "auto", aspectRatio: "1", mb: 1.5 }}
                    />
                    <Typography noWrap fontWeight={750}>
                        {formatDisplayName(artist.name)}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
}

function FeaturedCollection({
    playlist,
    onClick,
}: {
    playlist: AudiusPlaylist;
    onClick: () => void;
}) {
    return (
        <Box
            onClick={onClick}
            sx={{
                position: "relative",
                minHeight: 230,
                borderRadius: 2,
                overflow: "hidden",
                cursor: "pointer",
                backgroundImage: `url("${getPlaylistArtwork(playlist)}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                "&:hover .collection-overlay": { bgcolor: "rgba(0,0,0,0.32)" },
            }}
        >
            <Box
                className="collection-overlay"
                sx={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "flex-end",
                    p: 2,
                    bgcolor: "rgba(0,0,0,0.18)",
                    backgroundImage: "linear-gradient(0deg, rgba(0,0,0,0.86), transparent 72%)",
                    transition: "background-color 180ms ease",
                }}
            >
                <Box>
                    <Typography fontWeight={850}>
                        {formatDisplayName(playlist.playlist_name)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {playlist.is_album ? "Album" : "Playlist"} · {playlist.track_count ?? 0} bài
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
}

function CollectionCard({ playlist, onClick }: { playlist: AudiusPlaylist; onClick: () => void }) {
    return (
        <Box
            onClick={onClick}
            sx={{
                p: 1.25,
                borderRadius: 1.5,
                cursor: "pointer",
                "&:hover": { bgcolor: "action.selected" },
            }}
        >
            <Avatar
                variant="rounded"
                src={getPlaylistArtwork(playlist)}
                sx={{ width: "100%", height: "auto", aspectRatio: "1", borderRadius: 1, mb: 1 }}
            />
            <Typography noWrap sx={{ fontSize: 13, fontWeight: 700 }}>
                {formatDisplayName(playlist.playlist_name)}
            </Typography>
            <Typography noWrap variant="caption" sx={{ color: "text.secondary" }}>
                {playlist.is_album ? "Album" : "Playlist"} · {playlist.track_count ?? 0} bài
            </Typography>
        </Box>
    );
}

function formatCount(value?: number) {
    if (!value) return "0";
    return new Intl.NumberFormat("vi-VN", {
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(value);
}
