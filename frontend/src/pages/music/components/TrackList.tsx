import { Stack } from "@mui/material";
import type { AudiusTrack } from "@pages/music/types";
import { useMemo } from "react";
import { toAudioMediaItem } from "@services/musicService";
import { EmptyState } from "./EmptyState";
import { MediaRow } from "./MediaRow";

export const TrackList = ({ tracks }: { tracks: AudiusTrack[] }) => {
	const queue = useMemo(() => tracks.map(toAudioMediaItem), [tracks]);
	if (!tracks.length) return <EmptyState label="Chưa có bài hát phù hợp." />;

	return (
		<Stack spacing={1}>
			{queue.map((item) => (
				<MediaRow key={item.id} item={item} queue={queue} />
			))}
		</Stack>
	);
};
