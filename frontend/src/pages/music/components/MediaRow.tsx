import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import {
	Avatar,
	alpha,
	Box,
	IconButton,
	Paper,
	Stack,
	Tooltip,
	Typography,
	useTheme,
} from "@mui/material";
import { useLikeMusicMutation } from "@pages/music/hooks/useMusicQueries";
import type { MediaItem } from "@pages/music/types";
import {
	formatCompactNumber,
	formatDisplayName,
	formatDuration,
} from "@pages/music/utils";
import { usePlayerStore } from "@store/playerStore";
import { formatRelativeTimeAgo } from "@utils/dateTime";

export const MediaRow = ({
	item,
	queue,
}: {
	item: MediaItem;
	queue: MediaItem[];
}) => {
	const theme = useTheme();
	const { currentItem, isPlaying, play, pause, resume, likedItems } =
		usePlayerStore();
	const active = currentItem?.id === item.id;
	const liked = likedItems.some((entry) => entry.id === item.id);
	const publishedDate = formatRelativeTimeAgo(item.publishedAt);

	const handlePlay = () => {
		if (active && isPlaying) {
			pause();
			return;
		}
		if (active) {
			resume();
			return;
		}
		play(item, queue);
	};

	const likeMutation = useLikeMusicMutation(item, liked);

	return (
		<Paper
			variant="outlined"
			onClick={handlePlay}
			sx={{
				display: "grid",
				gridTemplateColumns: "48px minmax(0, 1fr) auto auto",
				gap: 1.5,
				alignItems: "center",
				p: 1,
				borderColor: active ? "primary.main" : "divider",
				bgcolor: active
					? alpha(theme.palette.primary.main, 0.12)
					: "background.paper",
				cursor: "pointer",
				transition: "border-color 0.15s ease, background-color 0.15s ease",
				"&:hover": {
					borderColor: active ? "primary.main" : "text.secondary",
					bgcolor: active
						? alpha(theme.palette.primary.main, 0.16)
						: alpha(theme.palette.text.primary, 0.04),
				},
			}}
		>
			<Avatar
				variant="rounded"
				src={item.thumbnail}
				alt={formatDisplayName(item.title)}
				sx={{ width: 48, height: 48, borderRadius: 1 }}
			/>
			<Box sx={{ minWidth: 0, flex: 1 }}>
				<Typography noWrap sx={{ fontWeight: 700 }}>
					{formatDisplayName(item.title)}
				</Typography>
				<Typography variant="body2" color="text.secondary" noWrap>
					{formatDisplayName(item.artist)}
				</Typography>
				<Typography variant="caption" color="text.secondary" noWrap>
					{formatCompactNumber(item.viewCount)} lượt xem
					{publishedDate ? ` • ${publishedDate}` : ""}
				</Typography>
			</Box>
			<Typography variant="body2" color="text.secondary">
				{item.duration ? formatDuration(item.duration) : "Video"}
			</Typography>
			<Stack direction="row" spacing={0.5}>
				<Tooltip title={liked ? "Bỏ thích" : "Thích"}>
					<IconButton
						size="small"
						onClick={(event) => {
							event.stopPropagation();
							likeMutation.mutate();
						}}
						disabled={likeMutation.isPending}
					>
						{liked ? <FavoriteIcon color="primary" /> : <FavoriteBorderIcon />}
					</IconButton>
				</Tooltip>
				<Tooltip title={active && isPlaying ? "Tạm dừng" : "Phát"}>
					<IconButton
						size="small"
						color="primary"
						onClick={(event) => {
							event.stopPropagation();
							handlePlay();
						}}
					>
						{active && isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
					</IconButton>
				</Tooltip>
			</Stack>
		</Paper>
	);
};
