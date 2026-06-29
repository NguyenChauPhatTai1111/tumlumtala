import MusicNoteIcon from "@mui/icons-material/MusicNote";
import { Box, Typography } from "@mui/material";
import type { AudiusTrack } from "@pages/music/types";
import { useMemo } from "react";
import { toAudioMediaItem } from "@services/musicService";
import { MediaRow } from "./MediaRow";

export const TrackList = ({ tracks }: { tracks: AudiusTrack[] }) => {
	const queue = useMemo(() => tracks.map(toAudioMediaItem), [tracks]);

	if (!tracks.length) {
		return (
			<Box sx={{ py: 6, textAlign: "center" }}>
				<MusicNoteIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1.5 }} />
				<Typography sx={{ color: "text.disabled", fontSize: 14 }}>
					Chưa có bài hát phù hợp.
				</Typography>
			</Box>
		);
	}

	return (
		<Box>
			{queue.map((item, index) => (
				<MediaRow key={item.id} item={item} queue={queue} index={index + 1} />
			))}
		</Box>
	);
};
