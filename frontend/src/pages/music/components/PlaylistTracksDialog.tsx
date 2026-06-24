import {
	Avatar,
	Box,
	Dialog,
	DialogContent,
	DialogTitle,
	LinearProgress,
	Stack,
	Typography,
} from "@mui/material";
import { LOAD_MORE_TRIGGER_INDEX } from "@pages/music/constants";
import type { AudiusPlaylist, AudiusTrack } from "@pages/music/types";
import { formatDisplayName } from "@pages/music/utils";
import { Fragment, useMemo } from "react";
import { getPlaylistArtwork, toAudioMediaItem } from "@services/musicService";
import { EmptyState } from "./EmptyState";
import { IntersectionSentinel } from "./IntersectionSentinel";
import { MediaRow } from "./MediaRow";

export const PlaylistTracksDialog = ({
	playlist,
	tracks,
	loading,
	hasNextPage,
	isFetchingNextPage,
	pageCount,
	onLoadMore,
	onClose,
}: {
	playlist: AudiusPlaylist | null;
	tracks: AudiusTrack[];
	loading: boolean;
	hasNextPage: boolean;
	isFetchingNextPage: boolean;
	pageCount: number;
	onLoadMore: () => void;
	onClose: () => void;
}) => {
	const queue = useMemo(() => tracks.map(toAudioMediaItem), [tracks]);

	return (
		<Dialog open={Boolean(playlist)} onClose={onClose} fullWidth maxWidth="md">
			<DialogTitle>
				<Stack direction="row" spacing={1.5} alignItems="center">
					<Avatar
						variant="rounded"
						src={playlist ? getPlaylistArtwork(playlist) : undefined}
						sx={{ width: 54, height: 54, borderRadius: 1 }}
					/>
					<Box sx={{ minWidth: 0 }}>
						<Typography noWrap sx={{ fontWeight: 900 }}>
							{formatDisplayName(playlist?.playlist_name ?? "Playlist")}
						</Typography>
						<Typography noWrap variant="body2" color="text.secondary">
							{formatDisplayName(playlist?.user.name)}
						</Typography>
					</Box>
				</Stack>
			</DialogTitle>
			<DialogContent dividers sx={{ maxHeight: { xs: "70vh", md: "68vh" } }}>
				{loading && !queue.length ? (
					<LinearProgress />
				) : queue.length ? (
					<Stack spacing={1}>
						{queue.map((item, index) => (
							<Fragment key={item.id}>
								<MediaRow item={item} queue={queue} />
								{index === LOAD_MORE_TRIGGER_INDEX &&
									hasNextPage &&
									!isFetchingNextPage && (
										<IntersectionSentinel onVisible={onLoadMore} />
									)}
							</Fragment>
						))}
						{isFetchingNextPage && <LinearProgress />}
						{!hasNextPage && pageCount > 1 && (
							<Typography
								variant="body2"
								color="text.secondary"
								textAlign="center"
								sx={{ py: 1 }}
							>
								Bạn đã xem hết toàn bộ kết quả
							</Typography>
						)}
					</Stack>
				) : (
					<EmptyState label="Playlist này chưa có bài hát hoặc Audius chưa trả tracks." />
				)}
			</DialogContent>
		</Dialog>
	);
};
