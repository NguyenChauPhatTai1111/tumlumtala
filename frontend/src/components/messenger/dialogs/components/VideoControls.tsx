import { SPEED_OPTIONS } from "@components/messenger/dialogs/hooks/useVideoPlayer";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import Forward10Icon from "@mui/icons-material/Forward10";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ReplayIcon from "@mui/icons-material/Replay";
import Replay10Icon from "@mui/icons-material/Replay10";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import {
	Box,
	Button,
	IconButton,
	Menu,
	MenuItem,
	Slider,
	Tooltip,
	Typography,
} from "@mui/material";
import { useState } from "react";

const formatVideoTime = (sec: number) => {
	const s = Math.floor(sec);
	const hrs = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	if (hrs > 0) {
		return `${hrs}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
	}
	return `${m}:${String(s % 60).padStart(2, "0")}`;
};

type VideoControlsProps = {
	videoPlaying: boolean;
	videoSpeed: number;
	videoCurrentTime: number;
	videoDuration: number;
	videoMuted: boolean;
	videoVolume: number;
	videoRenderedWidth: number | null;
	isFullscreen: boolean;
	canSeek: boolean;
	selectedUrl: string;
	onPlayPause: () => void;
	onRestart: () => void;
	onToggleMute: () => void;
	onVolumeChange: (value: number) => void;
	onSpeedChange: (speed: number) => void;
	onSeekBackward: () => void;
	onSeekForward: () => void;
	onToggleFullscreen: () => void;
	onSeek: (time: number) => void;
};

export const VideoControls = ({
	videoPlaying,
	videoSpeed,
	videoCurrentTime,
	videoDuration,
	videoMuted,
	videoVolume,
	videoRenderedWidth,
	isFullscreen,
	canSeek,
	selectedUrl,
	onPlayPause,
	onRestart,
	onToggleMute,
	onVolumeChange,
	onSpeedChange,
	onSeekBackward,
	onSeekForward,
	onToggleFullscreen,
	onSeek,
}: VideoControlsProps) => {
	const [speedAnchorEl, setSpeedAnchorEl] = useState<null | HTMLElement>(null);

	return (
		<Box
			sx={{
				position: "absolute",
				bottom: isFullscreen ? 20 : 10,
				left: "50%",
				transform: "translateX(-50%)",
				width: videoRenderedWidth
					? `${videoRenderedWidth}px`
					: "calc(100% - 32px)",
				display: "flex",
				flexDirection: "column",
				gap: 0,
				backgroundColor: "rgba(0,0,0,0.55)",
				borderRadius: 1,
				px: 1.5,
				pt: 0.75,
				pb: 0.5,
				backdropFilter: "blur(8px)",
			}}
		>
			{/* Timeline */}
			<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
				<Slider
					size="small"
					min={0}
					max={videoDuration || 1}
					value={videoCurrentTime}
					onChange={(_, value) => onSeek(value as number)}
					sx={{
						flex: 1,
						color: "white",
						height: 3,
						py: 0.5,
						"& .MuiSlider-thumb": {
							width: 10,
							height: 10,
							"&:hover, &.Mui-focusVisible": {
								boxShadow: "0 0 0 6px rgba(255,255,255,0.16)",
							},
						},
						"& .MuiSlider-rail": { opacity: 0.35 },
					}}
				/>
				<Typography
					sx={{
						fontSize: 11,
						color: "rgba(255,255,255,0.85)",
						whiteSpace: "nowrap",
						fontVariantNumeric: "tabular-nums",
					}}
				>
					{formatVideoTime(videoCurrentTime)} / {formatVideoTime(videoDuration)}
				</Typography>
			</Box>

			{/* Controls */}
			<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
				{canSeek && (
					<Tooltip title="- 10 giây">
						<IconButton
							size="small"
							onClick={onSeekBackward}
							sx={{ color: "white" }}
						>
							<Replay10Icon fontSize="small" />
						</IconButton>
					</Tooltip>
				)}

				<Tooltip title={videoPlaying ? "Tạm dừng" : "Phát"}>
					<IconButton
						size="small"
						onClick={onPlayPause}
						disabled={!selectedUrl}
						sx={{ color: "white" }}
					>
						{videoPlaying ? (
							<PauseIcon fontSize="small" />
						) : (
							<PlayArrowIcon fontSize="small" />
						)}
					</IconButton>
				</Tooltip>

				{canSeek && (
					<Tooltip title="+ 10 giây">
						<IconButton
							size="small"
							onClick={onSeekForward}
							sx={{ color: "white" }}
						>
							<Forward10Icon fontSize="small" />
						</IconButton>
					</Tooltip>
				)}

				<Button
					size="small"
					onClick={(e) => setSpeedAnchorEl(e.currentTarget)}
					endIcon={<ArrowDropDownIcon />}
					sx={{
						color: "white",
						borderColor: "rgba(255,255,255,0.3)",
						minWidth: 70,
						height: 28,
						textTransform: "none",
					}}
					variant="outlined"
				>
					{videoSpeed}x
				</Button>

				<Menu
					anchorEl={speedAnchorEl}
					open={Boolean(speedAnchorEl)}
					onClose={() => setSpeedAnchorEl(null)}
					transformOrigin={{ vertical: "bottom", horizontal: "center" }}
					anchorOrigin={{ vertical: "top", horizontal: "center" }}
					PaperProps={{
						sx: {
							bgcolor: "rgba(30,30,30,.95)",
							backdropFilter: "blur(10px)",
							minWidth: 100,
						},
					}}
				>
					{SPEED_OPTIONS.map((speed) => (
						<MenuItem
							key={speed}
							selected={videoSpeed === speed}
							onClick={() => {
								onSpeedChange(speed);
								setSpeedAnchorEl(null);
							}}
							sx={{ fontSize: 13, color: "white" }}
						>
							{speed}x
						</MenuItem>
					))}
				</Menu>

				<Tooltip title="Bắt đầu lại">
					<IconButton
						size="small"
						onClick={onRestart}
						disabled={!selectedUrl}
						sx={{ color: "white" }}
					>
						<ReplayIcon fontSize="small" />
					</IconButton>
				</Tooltip>

				<Box
					sx={{ display: "flex", alignItems: "center", gap: 0.5, ml: "auto" }}
				>
					<Tooltip title={videoMuted ? "Bật âm" : "Tắt âm"}>
						<IconButton
							size="small"
							onClick={onToggleMute}
							sx={{ color: "white" }}
						>
							{videoMuted || videoVolume === 0 ? (
								<VolumeOffIcon fontSize="small" />
							) : (
								<VolumeUpIcon fontSize="small" />
							)}
						</IconButton>
					</Tooltip>

					<Slider
						size="small"
						min={0}
						max={1}
						step={0.05}
						value={videoMuted ? 0 : videoVolume}
						onChange={(_, value) => onVolumeChange(value as number)}
						sx={{
							width: 72,
							color: "white",
							height: 3,
							"& .MuiSlider-thumb": {
								width: 10,
								height: 10,
								"&:hover, &.Mui-focusVisible": {
									boxShadow: "0 0 0 6px rgba(255,255,255,0.16)",
								},
							},
							"& .MuiSlider-rail": { opacity: 0.35 },
						}}
					/>

					<Tooltip
						title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
					>
						<IconButton
							size="small"
							onClick={onToggleFullscreen}
							sx={{ color: "white" }}
						>
							{isFullscreen ? (
								<FullscreenExitIcon fontSize="small" />
							) : (
								<FullscreenIcon fontSize="small" />
							)}
						</IconButton>
					</Tooltip>
				</Box>
			</Box>
		</Box>
	);
};
