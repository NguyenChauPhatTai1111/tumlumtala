import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import { Avatar, Box, Chip, Paper, Typography } from "@mui/material";
import type { AudiusPlaylist } from "@pages/music/types";
import { formatDisplayName } from "@pages/music/utils";
import { getPlaylistArtwork } from "@services/musicService";
import { EmptyState } from "./EmptyState";

export const PlaylistGrid = ({
	playlists,
	onSelectPlaylist,
}: {
	playlists: AudiusPlaylist[];
	onSelectPlaylist: (playlist: AudiusPlaylist) => void;
}) => {
	if (!playlists.length)
		return <EmptyState label="Chưa có playlist phù hợp." />;

	return (
		<Box
			sx={{
				display: "grid",
				gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
				gap: 1.5,
			}}
		>
			{playlists.map((playlist) => (
				<Paper
					key={playlist.id}
					variant="outlined"
					onClick={() => onSelectPlaylist(playlist)}
					sx={{
						p: 1.25,
						cursor: "pointer",
						transition: "border-color 0.15s ease, transform 0.15s ease",
						"&:hover": {
							borderColor: "primary.main",
							transform: "translateY(-1px)",
						},
					}}
				>
					<Avatar
						variant="rounded"
						src={getPlaylistArtwork(playlist)}
						sx={{ width: "100%", height: "auto", aspectRatio: "1", mb: 1 }}
					/>
					<Typography noWrap sx={{ fontWeight: 800 }}>
						{formatDisplayName(playlist.playlist_name)}
					</Typography>
					<Typography noWrap variant="body2" color="text.secondary">
						{formatDisplayName(playlist.user.name)}
					</Typography>
					<Chip
						size="small"
						icon={<PlaylistPlayIcon />}
						label={`${playlist.track_count ?? 0} bài`}
						sx={{ mt: 1 }}
					/>
				</Paper>
			))}
		</Box>
	);
};
