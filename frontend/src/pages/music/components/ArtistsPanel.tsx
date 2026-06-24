import { Avatar, Box, Paper, Stack, Typography } from "@mui/material";
import type { AudiusTrack, AudiusUser } from "@pages/music/types";
import { formatDisplayName } from "@pages/music/utils";
import { getAudiusProfileImage } from "@services/musicService";
import { SectionHeader } from "./SectionHeader";
import { TrackList } from "./TrackList";

export const ArtistsPanel = ({
	artists,
	selectedArtist,
	onSelectArtist,
	artistTracks,
}: {
	artists: AudiusUser[];
	selectedArtist: AudiusUser | null;
	onSelectArtist: (artist: AudiusUser) => void;
	artistTracks: AudiusTrack[];
}) => (
	<Box
		sx={{
			display: "grid",
			gridTemplateColumns: { xs: "1fr", lg: "320px minmax(0, 1fr)" },
			gap: 2,
		}}
	>
		<Stack spacing={1}>
			{artists.length ? (
				artists.map((artist) => (
					<Paper
						key={artist.id}
						variant="outlined"
						onClick={() => onSelectArtist(artist)}
						sx={{
							p: 1,
							display: "flex",
							gap: 1.25,
							alignItems: "center",
							cursor: "pointer",
							borderColor:
								selectedArtist?.id === artist.id ? "primary.main" : "divider",
						}}
					>
						<Avatar src={getAudiusProfileImage(artist)} />
						<Box sx={{ minWidth: 0 }}>
							<Typography noWrap sx={{ fontWeight: 700 }}>
								{formatDisplayName(artist.name)}
							</Typography>
							<Typography noWrap variant="body2" color="text.secondary">
								@{artist.handle}
							</Typography>
						</Box>
					</Paper>
				))
			) : (
				<Paper
					variant="outlined"
					sx={{ p: 3, textAlign: "center", borderStyle: "dashed" }}
				>
					<Typography color="text.secondary">
						Nhập từ khóa để tìm nghệ sĩ.
					</Typography>
				</Paper>
			)}
		</Stack>
		<Box>
			<SectionHeader
				title={
					selectedArtist
						? `Bài hát của ${formatDisplayName(selectedArtist.name)}`
						: "Artist Tracks"
				}
				subtitle="Nguồn từ MP3"
			/>
			<TrackList tracks={artistTracks} />
		</Box>
	</Box>
);
