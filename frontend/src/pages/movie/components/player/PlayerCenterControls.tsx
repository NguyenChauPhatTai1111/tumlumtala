import FastForwardIcon from "@mui/icons-material/FastForward";
import FastRewindIcon from "@mui/icons-material/FastRewind";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { IconButton, Stack, Tooltip } from "@mui/material";

interface PlayerCenterControlsProps {
	playing: boolean;
	buffering: boolean;
	controlsOpaque: boolean;
	onSeekBack: () => void;
	onSeekForward: () => void;
	onTogglePlay: () => void;
	seekSeconds: number;
}

export function PlayerCenterControls({
	playing,
	buffering,
	controlsOpaque,
	onSeekBack,
	onSeekForward,
	onTogglePlay,
	seekSeconds,
}: PlayerCenterControlsProps) {
	return (
		<Stack
			direction="row"
			alignItems="center"
			justifyContent="center"
			spacing={1}
			sx={{
				position: "absolute",
				top: "50%",
				left: "50%",
				transform: "translate(-50%, -50%)",
				pointerEvents: controlsOpaque ? "auto" : "none",
			}}
			onClick={(e) => e.stopPropagation()}
		>
			<Tooltip title={`Lùi ${seekSeconds}s`}>
				<IconButton
					onClick={onSeekBack}
					sx={{
						color: "white",
						bgcolor: "rgba(0,0,0,0.45)",
						backdropFilter: "blur(4px)",
						"&:hover": { bgcolor: "rgba(0,0,0,0.65)" },
						width: 48,
						height: 48,
					}}
				>
					<FastRewindIcon sx={{ fontSize: 26 }} />
				</IconButton>
			</Tooltip>

			<Tooltip title={buffering ? "" : playing ? "Dừng" : "Phát"}>
				<IconButton
					onClick={buffering ? undefined : onTogglePlay}
					sx={{
						color: buffering ? "transparent" : "white",
						bgcolor: "rgba(0,0,0,0.5)",
						backdropFilter: "blur(4px)",
						"&:hover": {
							bgcolor: buffering ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.7)",
						},
						width: 60,
						height: 60,
					}}
				>
					{playing ? (
						<PauseIcon sx={{ fontSize: 34 }} />
					) : (
						<PlayArrowIcon sx={{ fontSize: 34 }} />
					)}
				</IconButton>
			</Tooltip>

			<Tooltip title={`Tiến ${seekSeconds}s`}>
				<IconButton
					onClick={onSeekForward}
					sx={{
						color: "white",
						bgcolor: "rgba(0,0,0,0.45)",
						backdropFilter: "blur(4px)",
						"&:hover": { bgcolor: "rgba(0,0,0,0.65)" },
						width: 48,
						height: 48,
					}}
				>
					<FastForwardIcon sx={{ fontSize: 26 }} />
				</IconButton>
			</Tooltip>
		</Stack>
	);
}
